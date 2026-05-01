import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "organization" | "volunteer" | "individual" | "donor";
  avatar_url: string | null;
  address: string | null;
  organization_name: string | null;
  registration_id: string | null;
  is_verified: boolean;
  skills: string | null;
  availability: string | null;
  individual_type: "normal" | "differently_abled" | null;
  accessibility_needs: string | null;
  preferred_donation_type: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.debug("[AuthContext] fetching profile for userId", userId);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        console.error("Failed fetching profile", error);
        setProfile(null);
      } else {
        setProfile(data as Profile | null);
      }
    } catch (err) {
      console.error("Unexpected fetchProfile error", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;
    const onChange = async (_event: string, session: Session | null) => {
      console.debug("[AuthContext] onAuthStateChange", { event: _event, userId: session?.user?.id });
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    const sub = supabase.auth.onAuthStateChange((evt, sess) => { onChange(evt, sess); });

    // restore session on mount
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        console.debug("[AuthContext] restored session", { userId: data.session?.user?.id });
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
        if (data.session?.user) await fetchProfile(data.session.user.id);
      } catch (e) {
        console.error("Auth restore error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Listen to storage changes (multi-tab sign-in/out)
    const onStorage = () => {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      });
    };
    window.addEventListener("storage", onStorage);

    return () => { mounted = false; sub.data?.subscription?.unsubscribe(); window.removeEventListener("storage", onStorage); };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
      {!loading ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
