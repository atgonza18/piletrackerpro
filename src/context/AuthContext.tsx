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
        const authError = error as AuthError;
        if (authError.message && (authError.message.includes('Refresh Token') || authError.message.includes('token'))) {
          console.log('Invalid refresh token detected, signing out user');
          await handleSignOut();
          if (pathname !== '/auth') {
            router.push('/auth');
          }
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
      await handleSignOut();
    }
  };

  useEffect(() => {
    let mounted = true;
    let redirectTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) setIsLoading(false);
          return;
        }

        if (session?.user && mounted) {
          console.log("Found existing session for:", session.user.email);
          setUser(session.user);

          // Only redirect from auth page if user is on auth page
          if (pathname === '/auth') {
            redirectTimeout = setTimeout(async () => {
              try {
                // First check if user is a super admin
                const { data: isSuperAdmin } = await supabase.rpc('is_current_user_super_admin');

                if (isSuperAdmin) {
                  // Super admins bypass project onboarding - go directly to admin
                  router.push('/admin');
                  return;
                }

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
              } catch (err) {
                console.error('Error checking user projects:', err);
              }
            }, 100);
          }
        } else if (!session && mounted) {
          // Only redirect to auth if we're on a protected route
          const publicPaths = ['/auth', '/auth/forgot-password', '/auth/reset-password', '/', '/field-entry'];
          const isProtectedRoute = !publicPaths.includes(pathname) &&
                                 !pathname.startsWith('/auth/') &&
                                 pathname !== '/';

          if (isProtectedRoute) {
            redirectTimeout = setTimeout(() => {
              router.push('/auth');
            }, 100);
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
        
        // Only handle redirects for sign in events and if we're on auth page
        if (event === 'SIGNED_IN' && pathname === '/auth') {
          try {
            // First check if user is a super admin
            const { data: isSuperAdmin } = await supabase.rpc('is_current_user_super_admin');

            if (isSuperAdmin) {
              // Super admins bypass project onboarding - go directly to admin
              redirectTimeout = setTimeout(() => {
                router.push('/admin');
              }, 100);
              return;
            }

            const { data } = await supabase
              .from('user_projects')
              .select('id')
              .eq('user_id', session.user.id)
              .maybeSingle();

            redirectTimeout = setTimeout(() => {
              if (data) {
                router.push('/dashboard');
              } else {
                router.push('/project-setup');
              }
            }, 100);
          } catch (err) {
            console.error('Error checking user projects on sign in:', err);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserProject(null);
        // Only redirect to auth if not already there
        if (pathname !== '/auth') {
          redirectTimeout = setTimeout(() => {
            router.push('/auth');
          }, 100);
        }
      }
    });

    return () => {
      mounted = false;
      if (redirectTimeout) {
        clearTimeout(redirectTimeout);
      }
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
