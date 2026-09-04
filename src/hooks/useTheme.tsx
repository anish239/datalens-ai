import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/firestore';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('datalens_theme') as Theme;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return isDark ? 'dark' : 'light';
  });

  // Sync with user profile theme preference when user profile loads/changes
  useEffect(() => {
    if (
      userProfile?.themePreference &&
      (userProfile.themePreference === 'light' ||
        userProfile.themePreference === 'dark' ||
        userProfile.themePreference === 'system')
    ) {
      if (userProfile.themePreference !== theme) {
        setThemeState(userProfile.themePreference);
        localStorage.setItem('datalens_theme', userProfile.themePreference);
      }
    }
  }, [userProfile?.themePreference]);

  // Apply theme & listen to system changes
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const computeResolved = (): ResolvedTheme => {
      if (theme === 'dark') return 'dark';
      if (theme === 'light') return 'light';
      return mediaQuery.matches ? 'dark' : 'light';
    };

    const currentResolved = computeResolved();
    setResolvedTheme(currentResolved);

    if (currentResolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('datalens_theme', theme);

    const handleSystemChange = () => {
      if (theme === 'system') {
        const newResolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        if (newResolved === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('datalens_theme', newTheme);

    if (currentUser?.uid) {
      try {
        await updateUserProfile(currentUser.uid, { themePreference: newTheme });
        await refreshProfile();
      } catch (err) {
        console.warn('Failed to save theme preference to backend:', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
