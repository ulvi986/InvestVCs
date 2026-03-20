import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type AppRole = "admin" | "investor" | "startup";

interface RoleInfo {
  role: AppRole;
  approved: boolean;
}

export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role, approved")
        .eq("user_id", user.id);
      setRoles((data as any[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const isAdmin = roles.some((r) => r.role === "admin" && r.approved);
  const isInvestor = roles.some((r) => r.role === "investor" && r.approved);
  const isInvestorPending = roles.some((r) => r.role === "investor" && !r.approved);

  return { roles, isAdmin, isInvestor, isInvestorPending, loading };
};
