// Session state for the app.
//
// The subtlety here is tab refocus. supabase-js refreshes the access token when
// the tab becomes visible again and emits an event carrying a brand-new session
// object. Storing that object as-is gives every consumer a new `user` identity
// several times a session, which re-creates every useCallback keyed on it —
// including the one that starts an analysis — and re-runs the effects that
// depend on those. A long-running analysis does not survive that quietly.
//
// So the session is only replaced when something a consumer could act on has
// actually changed: a different user, or a token that is genuinely new. A
// refresh that returns the same user keeps the same object, and the tree does
// not re-render.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

/** Whether replacing `prev` with `next` is a change any consumer would act on. */
const isMeaningfulChange = (prev: Session | null, next: Session | null): boolean => {
  if (prev === next) return false;
  if (!prev || !next) return true;
  return prev.user.id !== next.user.id || prev.access_token !== next.access_token;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef<Session | null>(null);

  const applySession = useCallback((next: Session | null) => {
    if (!isMeaningfulChange(sessionRef.current, next)) {
      setLoading(false);
      return;
    }
    sessionRef.current = next;
    setSession(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => applySession(nextSession),
    );

    supabase.auth.getSession().then(({ data: { session: current } }) => applySession(current));

    return () => subscription.unsubscribe();
  }, [applySession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Without this the value object is new on every render of the provider, which
  // defeats the stability the session handling above is there to provide.
  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signOut }),
    [session, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
