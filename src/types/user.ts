import { User as FirebaseUser } from 'firebase/auth';

export type AuthProviderType = 'password' | 'google.com' | 'github.com' | 'custom';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: AuthProviderType;
  themePreference?: 'light' | 'dark' | 'system';
  createdAt: any; // Firestore Timestamp or string
  updatedAt: any; // Firestore Timestamp or string
}

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
