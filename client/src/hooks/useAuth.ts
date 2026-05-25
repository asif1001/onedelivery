import { useState, useEffect } from 'react';
import { AppUser } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

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
  logout: (reason?: string) => void;
  sessionInfo: { remainingTime: string; isExpiringSoon: boolean } | null;
}

// Roles that require weekly logout
const WEEKLY_LOGOUT_ROLES = ['driver', 'warehouse'];
const SESSION_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export function useAuth() {
  const [userData, setUserData] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if session has expired (weekly logout for driver/warehouse)
  const checkSessionExpiry = (user: AuthUser): boolean => {
    const loginTime = localStorage.getItem('loginTimestamp');
    
    if (!loginTime || !user.role) {
      return false;
    }
    
    // Only check for driver and warehouse roles
    if (!WEEKLY_LOGOUT_ROLES.includes(user.role)) {
      return false;
    }
    
    const loginDate = new Date(loginTime);
    const now = new Date();
    const elapsedMs = now.getTime() - loginDate.getTime();
    
    if (elapsedMs >= SESSION_TIMEOUT_MS) {
      console.log(`🔒 Weekly logout triggered for ${user.role} user. Session expired after ${Math.floor(elapsedMs / (24 * 60 * 60 * 1000))} days`);
      return true;
    }
    
    return false;
  };

  // Format remaining time for display
  const getRemainingTime = (user: AuthUser): string => {
    const loginTime = localStorage.getItem('loginTimestamp');
    if (!loginTime || !user.role || !WEEKLY_LOGOUT_ROLES.includes(user.role)) {
      return '';
    }
    
    const loginDate = new Date(loginTime);
    const now = new Date();
    const elapsedMs = now.getTime() - loginDate.getTime();
    const remainingMs = SESSION_TIMEOUT_MS - elapsedMs;
    
    if (remainingMs <= 0) {
      return 'Session expired';
    }
    
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    return `${remainingDays}d ${remainingHours}h remaining`;
  };

  useEffect(() => {
    // Check for stored user session first
    const checkStoredUser = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          // Check if session has expired for driver/warehouse users
          if (checkSessionExpiry(parsedUser)) {
            console.log('🚫 Session expired - forcing logout');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('loginTimestamp');
            setUserData(null);
            setIsLoading(false);
            // Show toast notification about weekly logout
            alert('Your session has expired for security reasons. Please log in again.');
            return true;
          }
          
          console.log('Using stored user session:', parsedUser);
          setUserData(parsedUser as AuthUser);
          setIsLoading(false);
          return true;
        } catch (error) {
          console.error('Error parsing stored user:', error);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTimestamp');
        }
      }
      return false;
    };

    // Use stored session if available
    if (checkStoredUser()) {
      // Set up periodic session check for driver/warehouse users (every hour)
      const intervalId = setInterval(() => {
        if (userData && checkSessionExpiry(userData)) {
          logout('weekly_session_expired');
        }
      }, 60 * 60 * 1000); // Check every hour

      return () => clearInterval(intervalId);
    }

    // Check for Replit Auth session
    checkAuthStatus();
  }, []);
  
  // Also check when userData changes
  useEffect(() => {
    if (userData && checkSessionExpiry(userData)) {
      logout('weekly_session_expired');
    }
  }, [userData]);

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

  const logout = (reason?: string) => {
    console.log('🔓 Logging out user...', reason ? `Reason: ${reason}` : '');
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTimestamp');
    setUserData(null);
    
    // Stay within the app - just reload to trigger login page
    window.location.reload();
  };
  
  // Get remaining session time (for display in UI)
  const getSessionInfo = () => {
    if (!userData || !userData.role || !WEEKLY_LOGOUT_ROLES.includes(userData.role)) {
      return null;
    }
    return {
      remainingTime: getRemainingTime(userData),
      isExpiringSoon: getRemainingTime(userData).includes('0d') || getRemainingTime(userData).includes('1d')
    };
  };

  return {
    userData,
    user: userData, // Alias for backward compatibility
    isLoading,
    isAuthenticated: !!userData,
    login,
    logout,
    sessionInfo: getSessionInfo()
  };
}