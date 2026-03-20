'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const isRefreshTokenError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = String(error.code || (error as any)?.error_code || '').toLowerCase();
  return (
    msg.includes('refresh token not found') ||
    msg.includes('invalid refresh token') ||
    msg.includes('refresh_token_not_found') ||
    code === 'refresh_token_not_found'
  );
};

const isRateLimitError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = String(error.code || (error as any)?.error_code || error.status || '').toLowerCase();
  return (
    msg.includes('request rate limit') ||
    msg.includes('over_request_rate_limit') ||
    msg.includes('email rate limit exceeded') ||
    code === '429' ||
    code === 'over_request_rate_limit' ||
    error.status === 429
  );
};

const isLockError = (error: any): boolean => {
  if (!error) return false;
  const name = (error.name || '').toLowerCase();
  const msg = (error.message || '').toLowerCase();
  return (
    name === 'aborterror' || (msg.includes('lock broken') && msg.includes('steal')) ||
    (msg.includes('lock') && msg.includes('steal'))
  );
};

/**
 * Purge ALL Supabase auth tokens from localStorage and cookies.
 * Only called when we have a confirmed stale/invalid token error.
 */
const purgeStaleTokens = () => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.startsWith('sb_') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}

  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.trim().split('=')[0];
      if (name && (name.startsWith('sb-') || name.startsWith('sb_') || name.includes('supabase'))) {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=None; Secure`;
        document.cookie = `${name}=; Path=/; Max-Age=0`;
      }
    });
  } catch {}
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const staleHandledRef = useRef(false);
  const mountedRef = useRef(true);
  const signInInFlightRef = useRef(false);

  // Memoize the supabase client in a ref so it's never recreated on re-renders
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  const handleStaleToken = useCallback(async () => {
    if (staleHandledRef.current) return;
    staleHandledRef.current = true;
    purgeStaleTokens();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Ignore errors — we just want the local session cleared
    }
    if (mountedRef.current) {
      setSession(null);
      setUser(null);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    staleHandledRef.current = false;

    // Suppress known noisy errors from console
    if (typeof window !== 'undefined') {
      const originalError = console.error.bind(console);
      if (!(console as any).__sb_patched__) {
        (console as any).__sb_patched__ = true;
        console.error = (...args: any[]) => {
          const msg = args.join(' ');
          if (
            msg.includes('Invalid Refresh Token') ||
            msg.includes('Refresh Token Not Found') ||
            msg.includes('refresh_token_not_found') ||
            msg.includes('Request rate limit reached') ||
            msg.includes('over_request_rate_limit') ||
            msg.includes('Lock broken') ||
            msg.includes('AbortError') ||
            msg.includes('steal')
          ) {
            return;
          }
          originalError(...args);
        };
      }
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mountedRef.current) return;
      if (error) {
        if (isRefreshTokenError(error)) {
          handleStaleToken();
          return;
        }
        if (isLockError(error)) {
          setLoading(false);
          return;
        }
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((err) => {
      if (!mountedRef.current) return;
      if (isLockError(err)) {
        setLoading(false);
        return;
      }
      if (isRefreshTokenError(err)) {
        handleStaleToken();
        return;
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        handleStaleToken();
        return;
      }

      if ((event as string) === 'TOKEN_REFRESH_FAILED') {
        handleStaleToken();
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isLockError(event.reason)) {
        event.preventDefault();
        return;
      }
      if (isRefreshTokenError(event.reason)) {
        event.preventDefault();
        if (mountedRef.current) {
          handleStaleToken();
        }
      } else if (isRateLimitError(event.reason)) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata as any)?.fullName || '',
          avatar_url: (metadata as any)?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;

    if (data?.user && !data.user.email_confirmed_at) {
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        await fetch(`${supabaseUrl}/functions/v1/send-verification-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            confirmationUrl: `${window.location.origin}/auth/callback`,
            fullName: (metadata as any)?.fullName || ''
          })
        });
      } catch {
        // Non-fatal
      }
    }

    return data;
  };

  const signIn = async (email: string, password: string) => {
    // Prevent concurrent sign-in requests which cause lock contention
    if (signInInFlightRef.current) {
      throw new Error('A sign-in request is already in progress. Please wait.');
    }
    signInInFlightRef.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        throw error;
      }
      if (data?.user && !data.user.email_confirmed_at) {
        throw new Error('Email not confirmed');
      }
      return data;
    } finally {
      signInInFlightRef.current = false;
    }
  };

  const signInWithGoogle = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=/timetable-view`
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error && !isLockError(error)) throw error;
    purgeStaleTokens();
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const updateUserProfile = async (updates: Record<string, any>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
