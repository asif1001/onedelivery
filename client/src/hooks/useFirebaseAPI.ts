import { useState, useEffect } from 'react';

// Hook to fetch user profile data from backend API
export function useUserProfile(userId: string) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/firebase/user/${userId}`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserProfile(data);
        } else {
          setError('Failed to fetch user profile');
        }
      } catch (err) {
        setError('Error fetching user profile');
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  return { userProfile, loading, error };
}

// Hook to fetch transactions from backend API
export function useTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/firebase/transactions', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setTransactions(data);
        } else {
          setError('Failed to fetch transactions');
        }
      } catch (err) {
        setError('Error fetching transactions');
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  return { transactions, loading, error };
}