import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

// Hook to centralize permission logic across the app.
export const useUserPermissions = () => {
  const { profile } = useAuth();

  const role = profile?.role || null;
  const subtype = profile?.individual_type || null; // 'normal' | 'differently_abled' | null

  const can = useMemo(() => ({
    isOrganization: role === "organization",
    isVolunteer: role === "volunteer",
    isIndividual: role === "individual",
    isDonor: role === "donor",
    isDisabledIndividual: role === "individual" && subtype === "differently_abled",
    canCreateRequest: role === "organization" || role === "individual",
    canVolunteer: role === "volunteer" || role === "individual",
    canDonate: role === "donor" || role === "individual",
  }), [role, subtype]);

  return { role, subtype, can };
};

export default useUserPermissions;
