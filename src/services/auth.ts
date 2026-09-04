import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, FIREBASE_PROJECT_ID } from './firebase';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Maps Firebase Auth error codes into human-readable, friendly error messages.
 */
export function mapAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  let code = error.code || '';
  const message = error.message || '';

  // Extract auth code if embedded in message (e.g., "Firebase: Error (auth/user-not-found).")
  if (!code && message) {
    const match = message.match(/\((auth\/[^)]+)\)/);
    if (match) {
      code = match[1];
    }
  }

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'current domain';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long and include numbers or symbols.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Access temporarily blocked for security. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to perform this sensitive action.';
    case 'auth/unauthorized-domain':
      return `Domain "${currentHostname}" is not authorized for OAuth operations. In Firebase Console (project: ${FIREBASE_PROJECT_ID}), go to Authentication > Settings > Authorized domains and add "${currentHostname}".`;
    default:
      if (message.includes('API key not valid')) {
        return 'Firebase API key is not valid. Please check your environment variables.';
      }
      return 'An unexpected authentication error occurred. Please try again.';
  }
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

export async function signupWithEmail(email: string, password: string, name: string): Promise<FirebaseUser> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const user = credential.user;

  if (name.trim()) {
    await updateProfile(user, {
      displayName: name.trim(),
    });
  }

  return user;
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
