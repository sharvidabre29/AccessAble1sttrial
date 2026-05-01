import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StoryPage from "./pages/StoryPage";
import StoryDetail from "./pages/StoryDetail";
import DashboardRedirect from "./utils/DashboardRedirect";
import MissionPage from "./pages/MissionPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AccessibilityPolicy from "./pages/AccessibilityPolicy";
import TermsPage from "./pages/TermsPage";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import IndividualDashboard from "./pages/IndividualDashboard";
import DonorDashboard from "./pages/DonorDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/register" element={<Register />} />
            <Route path="/stories" element={<StoryPage />} />
            <Route path="/story/:id" element={<StoryDetail />} />
            <Route path="/story" element={<StoryPage />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/mission" element={<MissionPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/accessibility-policy" element={<AccessibilityPolicy />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dashboard/organization/*" element={
              <ProtectedRoute requiredRole="organization"><OrganizationDashboard /></ProtectedRoute>
            } />
            <Route path="/dashboard/volunteer/*" element={
              <ProtectedRoute requiredRole="volunteer"><VolunteerDashboard /></ProtectedRoute>
            } />
            <Route path="/dashboard/individual/*" element={
              <ProtectedRoute requiredRole="individual"><IndividualDashboard /></ProtectedRoute>
            } />
            <Route path="/dashboard/donor/*" element={
              <ProtectedRoute requiredRole="donor"><DonorDashboard /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
