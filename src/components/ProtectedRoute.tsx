import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If user is authenticated but profile hasn't been loaded yet,
  // show a loading state instead of redirecting to avoid incorrect routes.
  if (user && !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="text-muted-foreground">Loading profile...</div>
        <div className="flex gap-2">
          <Button onClick={() => refreshProfile()} variant="ghost">Retry</Button>
          <Button onClick={() => signOut()} variant="secondary">Sign out</Button>
        </div>
      </div>
    );
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={`/dashboard/${profile?.role || "individual"}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
