import { supabase } from "@/src/lib/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

type UserRole = "super_admin" | "client" | "worker";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  company_id: string | null;
  worker_code: string | null;
  is_active: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_location_at: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithCode: (code: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from DB
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Email + password sign in (admin, client)
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  // Client registration
  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };

    // Create company for new client
    if (data.user) {
      const { error: compErr } = await supabase.from("companies").insert({
        name: fullName,
        email,
        owner_id: data.user.id,
      });
      if (compErr) return { error: compErr.message };

      // Update profile with company
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", data.user.id)
        .single();

      if (company) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName, company_id: company.id })
          .eq("id", data.user.id);
      }
    }
    return { error: null };
  };

  // Worker sign in with invite code
  const signInWithCode = async (code: string) => {
    // Look up worker by code
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("worker_code", code.toUpperCase().trim())
      .single();

    if (!profile) return { error: "Nieprawidlowy kod" };

    // Workers use their code as password (set during creation)
    const email = profile.email;
    if (!email) return { error: "Brak emaila pracownika" };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: code.toUpperCase().trim(),
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, session, loading, signIn, signUp, signInWithCode, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
