import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={`/dashboard/${profile?.role || "individual"}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
