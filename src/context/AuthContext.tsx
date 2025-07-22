'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, getCurrentUser, signIn, signOut, signUp, resetPassword, refreshSession } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data?: any }>;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string; }) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any; }>;
  refreshUserSession: () => Promise<void>;
  userProject: {
    id: string;
    project_name: string;
    role: string;
    is_owner: boolean;
  } | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
  userProject: null,
  signIn: async () => ({ error: '', data: undefined }),
  signUp: async () => ({ error: '', data: undefined }),
  resetPassword: async () => ({ error: '' }),
  refreshUserSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProject, setUserProject] = useState<AuthContextType["userProject"]>(null);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUserSession = async () => {
    try {
      console.log('Attempting to refresh session...');
      const { data, error } = await refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        // If we can't refresh the token, sign the user out
        const authError = error as AuthError;
        if (authError.message && (authError.message.includes('Refresh Token') || authError.message.includes('token'))) {
          console.log('Invalid refresh token detected, signing out user');
          await handleSignOut();
          router.push('/auth');
        }
        return;
      }
      
      if (data?.session) {
        console.log('Session refreshed successfully');
        setUser(data.session.user || null);
      } else {
        console.log('No session returned after refresh');
        setUser(null);
      }
    } catch (err) {
      console.error('Unexpected error refreshing session:', err);
      // If there's an unexpected error, sign the user out as a precaution
      await handleSignOut();
    }
  };

  useEffect(() => {
    // Initialize auth and handle session persistence
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        if (session?.user && mounted) {
          console.log("Found existing session for:", session.user.email);
          setUser(session.user);

          // Check if we need to redirect from auth page
          if (pathname === '/auth') {
            const { data } = await supabase
              .from('user_projects')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (data) {
              router.push('/dashboard');
            } else {
              router.push('/project-setup');
            }
          }
        } else if (!session && mounted) {
          // Only redirect to auth if we're not on a public path
          const publicPaths = ['/auth', '/auth/forgot-password', '/auth/reset-password'];
          if (!publicPaths.includes(pathname)) {
            router.push('/auth');
          }
        }
      } catch (error) {
        console.error("Error in initializeAuth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        
        // Only handle redirects for specific auth events
        if (event === 'SIGNED_IN') {
          const { data } = await supabase
            .from('user_projects')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (data) {
            router.push('/dashboard');
          } else {
            router.push('/project-setup');
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        router.push('/auth');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await signIn(email, password);
    setIsLoading(false);
    return { data, error };
  };

  const handleSignUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string; }) => {
    setIsLoading(true);
    const { data, error } = await signUp(email, password, metadata);
    setIsLoading(false);
    return { data, error };
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setUser(null);
    setUserProject(null);
    setIsLoading(false);
  };

  const handleResetPassword = async (email: string) => {
    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);
    return { error };
  };

  const value = {
    user,
    isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    resetPassword: handleResetPassword,
    refreshUserSession,
    userProject,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 
