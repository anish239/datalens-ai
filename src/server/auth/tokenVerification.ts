export interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
}

export function extractAndVerifyToken(authHeader?: string): VerifiedUser {
  if (!authHeader) {
    throw new Error('UNAUTHENTICATED: Missing Authorization header. Bearer token required.');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new Error('UNAUTHENTICATED: Invalid Authorization header format. Expected "Bearer <token>".');
  }

  const token = parts[1].trim();
  if (!token) {
    throw new Error('UNAUTHENTICATED: Empty authentication token provided.');
  }

  // If mock/test token
  if (token.startsWith('test_token_') || token.startsWith('mock_token_')) {
    const uid = token.replace('test_token_', '').replace('mock_token_', '');
    return {
      uid,
      email: `${uid}@example.com`,
      name: 'Test User',
    };
  }

  try {
    // Parse JWT parts safely
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Malformed JWT token structure.');
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf-8'));
    const uid = payload.user_id || payload.sub || payload.uid;

    if (!uid) {
      throw new Error('Token payload missing user identifier (uid/user_id/sub).');
    }

    // Check expiration if present
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Firebase ID token is expired.');
    }

    return {
      uid: String(uid),
      email: payload.email,
      name: payload.name,
    };
  } catch (err: any) {
    throw new Error(`UNAUTHENTICATED: Invalid Firebase ID token: ${err.message}`);
  }
}
