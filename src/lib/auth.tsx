import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  town_id: string | null;
};
type AuthCtx = {
  user: User | null;
  roles: string[];
  isStaff: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isEditor: boolean;
  isModerator: boolean;
  isReporter: boolean;
  primaryRole: string;
  loading: boolean;
  profile: Profile | null;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>({
  user: null,
  roles: [],
  isStaff: false,
  isAdmin: false,
  isSuperAdmin: false,
  isEditor: false,
  isModerator: false,
  isReporter: false,
  primaryRole: "user",
  loading: true,
  profile: null,
  needsOnboarding: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, email, town_id")
      .eq("id", uid)
      .maybeSingle();
    setProfile(data ?? { full_name: null, phone: null, email: null, town_id: null });
  }, []);

  useEffect(() => {
    const load = async (u: User | null) => {
      setUser(u);
      if (u) {
        const [{ data }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", u.id),
          fetchProfile(u.id),
        ]);
        setRoles((data ?? []).map((r) => r.role));
      } else {
        setRoles([]);
        setProfile(null);
      }
      setLoading(false);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));

    // Safety valve: if Supabase doesn't respond within 5 s (e.g. Android cold start
    // before network is ready), force loading=false so the UI becomes interactive.
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isEditor = isAdmin || roles.includes("editor");
  const isModerator = isAdmin || roles.includes("moderator");
  const isReporter = isAdmin || isEditor || roles.includes("reporter");
  const isStaff = roles.some((r) =>
    ["super_admin", "admin", "editor", "moderator", "reporter"].includes(r),
  );

  const primaryRole = isSuperAdmin
    ? "super_admin"
    : roles.includes("admin")
    ? "admin"
    : roles.includes("editor")
    ? "editor"
    : roles.includes("moderator")
    ? "moderator"
    : roles.includes("reporter")
    ? "reporter"
    : "user";

  const needsOnboarding =
    !!user && !!profile && (!profile.full_name || !profile.phone);
  return (
    <Ctx.Provider
      value={{
        user,
        roles,
        isStaff,
        isAdmin,
        isSuperAdmin,
        isEditor,
        isModerator,
        isReporter,
        primaryRole,
        loading,
        profile,
        needsOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
