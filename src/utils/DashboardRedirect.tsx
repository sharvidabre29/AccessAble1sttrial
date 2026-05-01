import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DashboardRedirect = () => {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    // If the profile is not yet loaded, attempt to refresh it and wait.
    if (user && !profile) {
      // refreshProfile will update context and re-trigger this effect
      refreshProfile().catch((e) => {
        console.error("Failed to refresh profile in DashboardRedirect:", e);
        // fallback to individual dashboard
        navigate(`/dashboard/individual`);
      });
      return;
    }

    // When profile is available, navigate to appropriate dashboard
    navigate(`/dashboard/${profile?.role || 'individual'}`);
  }, [user, profile, loading, navigate, refreshProfile]);

  return <div />;
};

export default DashboardRedirect;
