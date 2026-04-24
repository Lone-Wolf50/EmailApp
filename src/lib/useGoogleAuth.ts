import { useState, useEffect } from 'react';

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

export function useGoogleAuth() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Wait for the GSI script to load, but give up after 10 seconds
    const checkGSI = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkGSI);
        clearTimeout(timeout);
        setIsInitializing(false);
      }
    }, 100);

    // Failsafe: stop showing loading state after 10s even if GSI doesn't load
    const timeout = setTimeout(() => {
      clearInterval(checkGSI);
      setIsInitializing(false);
    }, 10000);

    return () => {
      clearInterval(checkGSI);
      clearTimeout(timeout);
    };
  }, []);

  const login = () => {
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Sign-In is not ready yet. Please wait a moment and try again.');
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new Error('Google authentication is not configured. Please check your .env file.');
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.send',
      callback: async (response: any) => {
        if (response.error) {
          console.error('OAuth error:', response.error);
          return;
        }

        const token = response.access_token;
        setAccessToken(token);

        try {
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const profile = await res.json();

          setUser({
            name: profile.name || 'User',
            email: profile.email || '',
            picture: profile.picture || ''
          });
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
        }
      },
    });

    client.requestAccessToken();
  };

  const logout = () => {
    if (accessToken && window.google) {
      window.google.accounts.oauth2.revoke(accessToken, () => {
        setAccessToken(null);
        setUser(null);
      });
    } else {
      setAccessToken(null);
      setUser(null);
    }
  };

  return { user, accessToken, login, logout, isInitializing };
}
