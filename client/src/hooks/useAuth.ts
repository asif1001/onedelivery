import { useState, useEffect } from 'react';
import { AppUser } from '@shared/schema';

interface AuthUser extends Partial<AppUser> {
  uid?: string;
  displayName?: string | null;
  photoURL?: string | null;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
}

// Extended AppUser type with displayName for compatibility
export interface ExtendedAppUser extends AppUser {
  displayName?: string | null;
  uid?: string;
}

export interface AuthHookResult {
  userData: AuthUser | null;
  user: AuthUser | null; // Alias for backward compatibility
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export function useAuth() {
  const [userData, setUserData] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored user session first
    const checkStoredUser = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('Using stored user session:', parsedUser);
          setUserData(parsedUser as AuthUser);
          setIsLoading(false);
          return true;
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('currentUser');
        }
      }
      return false;
    };

    // Use stored session if available
    if (checkStoredUser()) {
      return;
    }

    // Check for Replit Auth session
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status with Firebase...');
      // For GitHub Pages, we only rely on localStorage session
      console.log('❌ No authenticated user found');
      setUserData(null);
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUserData(null);
      localStorage.removeItem('currentUser');
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // Stay within the app path
    window.location.reload();
  };

  const logout = () => {
    console.log('🔓 Logging out user...');
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    setUserData(null);
    
    // Stay within the app - just reload to trigger login page
    window.location.reload();
  };

  return {
    userData,
    user: userData, // Alias for backward compatibility
    isLoading,
    isAuthenticated: !!userData,
    login,
    logout
  };
}