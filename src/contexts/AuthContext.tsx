import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/auth';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  accountId: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializationStarted = useRef(false);

  // Fast profile fetch without blocking the entire UI
  const fetchUserData = async (sessionUser: any) => {
    if (!sessionUser) return null;
    try {
      // Fetch only what's necessary
      const { data: profile } = await supabase
        .from('users')
        .select('*, accounts(plan)')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (profile) {
        return {
          id: sessionUser.id,
          email: sessionUser.email || '',
          name: profile.name,
          role: (profile.role as UserRole) || 'admin',
          accountId: profile.account_id,
          plan: (profile.accounts as any)?.plan || 'free',
          createdAt: new Date(sessionUser.created_at),
        };
      }

      // Fallback to basic session info if profile doesn't exist yet
      return {
        id: sessionUser.id,
        email: sessionUser.email || '',
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0],
        role: 'admin' as UserRole,
        accountId: null,
        plan: 'free' as const,
        createdAt: new Date(sessionUser.created_at),
      };
    } catch (err) {
      console.error('Quiet profile fetch error:', err);
      return null;
    }
  };

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await fetchUserData(session.user);
      setUser(userData);
    }
  };

  useEffect(() => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;

    const startTime = Date.now();
    const log = (msg: string) => console.log(`[Auth ${Date.now() - startTime}ms] ${msg}`);

    log('🚀 Starting auth initialization...');

    // Safety: Always unlock UI after 1.5 seconds
    const safetyTimer = setTimeout(() => {
      log('⏰ Safety timer triggered - FORCE unlocking UI');
      setIsLoading(false);
    }, 1500);

    const init = async () => {
      try {
        log('📡 Calling supabase.auth.getSession()...');
        const { data: { session }, error } = await supabase.auth.getSession();
        log(`📡 getSession complete. Has session: ${!!session}, Has error: ${!!error}`);

        // Handle invalid refresh token gracefully (non-blocking)
        if (error) {
          log(`❌ Session error: ${error.message}`);
          setUser(null);
          setIsLoading(false);
          clearTimeout(safetyTimer);
          log('🧹 Clearing stale session in background...');
          supabase.auth.signOut().catch(() => { });
          log('✅ Init complete (with error)');
          return;
        }

        if (session?.user) {
          log(`👤 Session found for: ${session.user.email}`);
          // Set a minimal user immediately to avoid auth limbo while profile loads
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            role: 'admin' as UserRole,
            accountId: null,
            plan: 'free' as const,
            createdAt: new Date(session.user.created_at),
          });

          log('📊 Fetching user profile data...');
          fetchUserData(session.user)
            .then((userData) => {
              log(`📊 Profile fetch complete. Got data: ${!!userData}`);
              if (userData) {
                setUser(userData);
                log('✅ User updated with profile data');
              }
            })
            .catch((e) => {
              log(`⚠️ Profile fetch failed (non-blocking): ${e?.message || e}`);
            });
        } else {
          log('👻 No session found - user not logged in');
        }
      } catch (e: any) {
        log(`💥 Init error: ${e?.message || e}`);
        setUser(null);
        supabase.auth.signOut().catch(() => { });
      } finally {
        log('🏁 Setting isLoading = false');
        setIsLoading(false);
        clearTimeout(safetyTimer);
        log('✅ Auth initialization COMPLETE');
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth state changed:', event, !!session);

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Handle token refresh failure (will show as no session)
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('[Auth] Token refresh failed, clearing session...');
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Handle valid session
      if (session?.user) {
        // Always set a fallback user immediately so routing can proceed
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          role: 'admin' as UserRole,
          accountId: null,
          plan: 'free' as const,
          createdAt: new Date(session.user.created_at),
        });
        setIsLoading(false);

        // Upgrade user info in background
        fetchUserData(session.user)
          .then((userData) => {
            if (userData) setUser(userData);
          })
          .catch(() => { });
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('[Auth] Attempting login for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('[Auth] Login error:', error.message, error);
        throw error;
      }

      console.log('[Auth] Login successful, session:', !!data.session);

      if (data.user) {
        const userData = await fetchUserData(data.user);
        // Even if profile fetch fails, set basic user data to prevent auth limbo
        if (userData) {
          setUser(userData);
          console.log('[Auth] User data loaded:', userData.email);
        } else {
          // Fallback: set minimal user from session
          const fallbackUser = {
            id: data.user.id,
            email: data.user.email || '',
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
            role: 'admin' as UserRole,
            accountId: null,
            plan: 'free' as const,
            createdAt: new Date(data.user.created_at),
          };
          setUser(fallbackUser);
          console.log('[Auth] Using fallback user data');
        }
      }
    } catch (err) {
      console.error('[Auth] Login failed:', err);
      throw err; // Re-throw so Login.tsx can catch and show toast
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;

      if (data.user) {
        const userData = await fetchUserData(data.user);
        setUser(userData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// NOTE: Import useAuth from '@/hooks/useAuth' instead of from this file

