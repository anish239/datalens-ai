interface RateLimitEntry {
  minuteCount: number;
  minuteResetTime: number;
  dayCount: number;
  dayResetTime: number;
}

const userRateLimits = new Map<string, RateLimitEntry>();

const MAX_PER_MINUTE = parseInt(process.env.AI_REQUESTS_PER_MINUTE || '30', 10);
const MAX_PER_DAY = parseInt(process.env.AI_REQUESTS_PER_DAY || '500', 10);

let geminiQuotaCooldownUntil = 0;
let geminiQuotaReason = '';

/**
 * Records that Gemini 429 (RESOURCE_EXHAUSTED) occurred and activates a cooldown
 * to prevent retry storms, redundant failing requests, and latency spikes.
 */
export function recordGeminiQuotaExceeded(retryDelaySeconds = 30, reason?: string) {
  const safeSeconds = Math.max(5, Math.min(retryDelaySeconds, 300));
  geminiQuotaCooldownUntil = Date.now() + safeSeconds * 1000;
  geminiQuotaReason = reason || `Gemini quota limit reached. Cooldown active for ${safeSeconds}s.`;
  console.log(`[DataLens AI] Gemini 429 quota recorded. Cooldown active for ${safeSeconds}s.`);
}

/**
 * Checks if Gemini is currently in a 429 quota exhaustion cooldown window.
 */
export function isGeminiQuotaInCooldown(): { inCooldown: boolean; remainingSeconds: number; reason: string } {
  const now = Date.now();
  if (now < geminiQuotaCooldownUntil) {
    const remaining = Math.ceil((geminiQuotaCooldownUntil - now) / 1000);
    return {
      inCooldown: true,
      remainingSeconds: remaining,
      reason: geminiQuotaReason || `Gemini free tier quota exhausted. Seamless deterministic fallback active (${remaining}s remaining).`,
    };
  }
  return { inCooldown: false, remainingSeconds: 0, reason: '' };
}

/**
 * Per-user rate limiter to prevent abuse.
 */
export function checkAiRateLimit(userId: string): {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  let entry = userRateLimits.get(userId);

  if (!entry) {
    entry = {
      minuteCount: 1,
      minuteResetTime: now + 60_000,
      dayCount: 1,
      dayResetTime: now + 86_400_000,
    };
    userRateLimits.set(userId, entry);
    return { allowed: true };
  }

  // Reset minute bucket if elapsed
  if (now > entry.minuteResetTime) {
    entry.minuteCount = 0;
    entry.minuteResetTime = now + 60_000;
  }

  // Reset day bucket if elapsed
  if (now > entry.dayResetTime) {
    entry.dayCount = 0;
    entry.dayResetTime = now + 86_400_000;
  }

  // Check limits
  if (entry.minuteCount >= MAX_PER_MINUTE) {
    const retryAfter = Math.ceil((entry.minuteResetTime - now) / 1000);
    return {
      allowed: false,
      reason: `AI Analyst rate limit exceeded (${MAX_PER_MINUTE} requests/min). Please wait ${retryAfter}s.`,
      retryAfterSeconds: retryAfter,
    };
  }

  if (entry.dayCount >= MAX_PER_DAY) {
    const retryAfter = Math.ceil((entry.dayResetTime - now) / 1000);
    return {
      allowed: false,
      reason: `Daily AI Analyst quota reached (${MAX_PER_DAY} requests/day).`,
      retryAfterSeconds: retryAfter,
    };
  }

  entry.minuteCount += 1;
  entry.dayCount += 1;

  return { allowed: true };
}
