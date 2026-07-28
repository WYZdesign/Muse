"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface MuseProfile {
  id: string;
  name: string;
  email: string;
  type: string;
  avatar: string;
  bio: string;
  loc: string;
  styles: string[];
  looking: string[];
  zodiac: string;
  chinese: string;
  mbti: string;
  life_path: number;
  show_nsfw: boolean;
}

interface MuseAuthContext {
  user: User | null;
  profile: MuseProfile | null;
  loading: boolean;
  register: (email: string, password: string, name?: string) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const MuseAuthCtx = createContext<MuseAuthContext>({
  user: null, profile: null, loading: true,
  register: async () => null, login: async () => null,
  logout: async () => {}, refreshProfile: async () => {},
});

export function MuseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MuseProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase.from("muse_profiles").select("*").eq("auth_id", uid).single();
    if (data) setProfile(data as MuseProfile);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchProfile(user.id);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const register = async (email: string, password: string, name?: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: { data: { name: name || email.split("@")[0] } },
    });
    if (error) return error.message;
    await fetch(`/api/muse?type=profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profile", name: name || email.split("@")[0] }),
    });
    return null;
  };

  const login = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error) return error.message;
    setUser(data.user);
    if (data.user) await fetchProfile(data.user.id);
    return null;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <MuseAuthCtx.Provider value={{ user, profile, loading, register, login, logout, refreshProfile: () => fetchProfile(user?.id || "") }}>
      {children}
    </MuseAuthCtx.Provider>
  );
}

export const useMuseAuth = () => useContext(MuseAuthCtx);
