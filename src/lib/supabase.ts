import { createClient } from '@supabase/supabase-js';

// Use environment variables for Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihuubvmotrbjvetgqyhp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlodXVidm1vdHJianZldGdxeWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0MDAxMTUsImV4cCI6MjA2NDk3NjExNX0.LhwVoQBQ25hzLOrZ79-E4gpR7RHZUE1XbsjYHz2nEzQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-my-custom-header': 'PileTrackerPro'
    },
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'piletracker-auth-token',
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});

// Auth helper functions
export const signUp = async (email: string, password: string, metadata?: { first_name?: string, last_name?: string }) => {
  console.log(`Attempting to sign up user with email: ${email} and metadata:`, metadata);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth?confirm=true`,
    },
  });
  
  if (error) {
    console.error('Sign up error:', error);
  } else {
    console.log('Sign up successful, data:', data);
    // Check if email confirmation is needed
    if (data?.user?.identities?.length === 0) {
      console.log('User already exists but may need to confirm email');
    } else if (data?.user?.confirmed_at) {
      console.log('User already confirmed email');
    } else {
      console.log('User needs to confirm email');
    }
  }
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  console.log(`Attempting to sign in user with email: ${email}`);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Sign in error:', error);
    } else {
      console.log('Sign in successful, session:', data.session?.user?.id);
    }
    
    return { data, error };
  } catch (e) {
    console.error('Unexpected error during sign in:', e);
    return { data: null, error: e };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (e) {
    console.error('Error during sign out:', e);
    return { error: e };
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    return { data, error };
  } catch (e) {
    console.error('Error during password reset:', e);
    return { data: null, error: e };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (e) {
    console.error('Error getting current user:', e);
    return null;
  }
};

export const getSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (e) {
    console.error('Error getting session:', e);
    return null;
  }
};

export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Error refreshing session:', error);
    }
    return { data, error };
  } catch (e) {
    console.error('Unexpected error refreshing session:', e);
    return { data: null, error: e };
  }
};

export const hasCompletedProjectSetup = async (userId: string) => {
  if (!userId) return false;

  try {
    // Check if the user is associated with any projects
    const { data, error } = await supabase
      .from('user_projects')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking project setup:', error);
      return false;
    }

    return !!data;
  } catch (e) {
    console.error('Unexpected error checking project setup:', e);
    return false;
  }
}; 