import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  viewMode: 'simple' | 'complex';
  toggleViewMode: () => void;
  setViewMode: (mode: 'simple' | 'complex') => void;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, whatsapp?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VIEW_MODE_KEY = 'financeflow_view_mode';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewModeState] = useState<'simple' | 'complex'>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as 'simple' | 'complex') || 'simple';
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
      // Use preferred_mode from profile if available
      if (data.preferred_mode) {
        setViewModeState(data.preferred_mode);
      }
    }
    setLoading(false);
  }

  function setViewMode(mode: 'simple' | 'complex') {
    setViewModeState(mode);
    // Also save to profile in database
    if (profile) {
      supabase
        .from('profiles')
        .update({ preferred_mode: mode })
        .eq('id', profile.id)
        .then(() => {});
    }
  }

  function toggleViewMode() {
    const newMode = viewMode === 'simple' ? 'complex' : 'simple';
    setViewMode(newMode);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(
    email: string,
    password: string,
    name: string,
    whatsapp?: string
  ) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) return { error };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        user_id: data.user.id,
        name,
        preferred_mode: 'simple',
        whatsapp_number: whatsapp || null,
      });

      if (profileError) {
        return { error: profileError };
      }
    }

    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  }

  return (
    <AuthContext.Provider value={{
      user, profile, session, loading, viewMode, toggleViewMode, setViewMode, signIn, signUp, signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
