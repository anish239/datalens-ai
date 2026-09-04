import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in your server environment.'
    );
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}
