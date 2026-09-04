import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../services/firebase';
import {
  loginWithEmail as authLogin,
  signupWithEmail as authSignup,
  loginWithGoogle as authLoginWithGoogle,
  logoutUser as authLogout,
  resetPassword as authResetPassword,
} from '../services/auth';
import { getUserProfile, syncUserProfile } from '../services/firestore';
import { AuthContextType, UserProfile } from '../types/user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync profile when authentication state changes
  const fetchAndSyncProfile = async (user: FirebaseUser, overrideName?: string) => {
    try {
      if (isFirebaseConfigured) {
        const profile = await syncUserProfile(user, overrideName);
        setUserProfile(profile);
      } else {
        // Fallback local representation if Firebase env is offline
        setUserProfile({
          uid: user.uid,
          displayName: user.displayName || overrideName || 'Data Analyst',
          email: user.email,
          photoURL: user.photoURL,
          provider: 'password',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.warn('Error syncing user profile to Firestore:', error);
      // Fallback local profile state so user is not blocked
      setUserProfile({
        uid: user.uid,
        displayName: user.displayName || overrideName || 'Data Analyst',
        email: user.email,
        photoURL: user.photoURL,
        provider: 'password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchAndSyncProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const user = await authLogin(email, password);
    await fetchAndSyncProfile(user);
  };

  const signup = async (email: string, password: string, name: string) => {
    const user = await authSignup(email, password, name);
    await fetchAndSyncProfile(user, name);
  };

  const loginWithGoogle = async () => {
    const user = await authLoginWithGoogle();
    await fetchAndSyncProfile(user);
  };

  const logout = async () => {
    await authLogout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    await authResetPassword(email);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) {
        setUserProfile(profile);
      }
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    isAuthenticated: Boolean(currentUser),
    isFirebaseConfigured,
    login,
    signup,
    loginWithGoogle,
    logout,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
