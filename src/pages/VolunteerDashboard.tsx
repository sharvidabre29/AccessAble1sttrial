import { useEffect, useState } from "react";
import { HandHelping, Search, ClipboardList, User, BarChart3, Settings, MessageSquare, FileText, Building2, DollarSign } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import dashboardService from "@/services/dashboardService";
import requestService from "@/services/requestService";
import profileService from "@/services/profileService";
import { Routes, Route, useNavigate } from "react-router-dom";
import MessagesPage from "@/components/shared/MessagesPage";
import SettingsPage from "@/components/shared/SettingsPage";
import RequestsListPage from "@/components/shared/RequestsListPage";
import RequestDetails from "./RequestDetails";
import TasksPage from "./TasksPage";
import VolunteerTasks from "./VolunteerTasks";

// Volunteer nav: STRICT — only Dashboard, My Tasks, Completed Tasks, Profile
const navItems = [
  { label: "Dashboard", to: "/dashboard/volunteer", icon: BarChart3 },
  { label: "Profile", to: "/dashboard/volunteer/profile", icon: User },
  { label: "Chats", to: "/dashboard/volunteer/messages", icon: MessageSquare },
  { label: "My Tasks", to: "/dashboard/volunteer/tasks/my", icon: ClipboardList },
  { label: "Available Requests", to: "/dashboard/volunteer/requests", icon: Search },
  { label: "Completed Tasks", to: "/dashboard/volunteer/tasks/completed", icon: ClipboardList },
  
];

const urgencyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ completed: 0, active: 0, totalHours: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Active/completed counts for current volunteer
      const { data: myAccepted } = await requestService.fetchRequests({ assigned_to: user.id, status: ["accepted", "in_progress"] });
      const { data: myCompleted } = await requestService.fetchRequests({ assigned_to: user.id, status: "completed" });
      const activeCount = (myAccepted || []).length;
      const completedCount = (myCompleted || []).length;
      setStats({ completed: completedCount || 0, active: activeCount || 0, totalHours: (completedCount || 0) * 4 });
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active Tasks", value: stats.active, color: "text-warning" },
          { label: "Tasks Completed", value: stats.completed, color: "text-success" },
          { label: "Est. Hours Contributed", value: stats.totalHours, color: "text-primary" },
        ].map((s, i) => (
          <motion.div key={s.label} className="bg-card rounded-xl border p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const BrowseRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        console.log("🔄 Starting to fetch requests...");
        setIsLoading(true);
        setError(null);

          const { data, error: supabaseError } = await requestService.fetchRequests({ status: ["open", "pending"] });

        console.log("📊 Query result:", { data, error: supabaseError });

        if (supabaseError) {
          const errorMsg = `Supabase Error: ${supabaseError.message}`;
          console.error("❌", errorMsg);
          setError(errorMsg);
          toast({ title: "Error", description: supabaseError.message, variant: "destructive" });
          setRequests([]);
        } else {
          console.log("✅ Requests loaded:", data?.length || 0, "items");
          setRequests(data || []);
          setError(null);
        }
      } catch (error: any) {
        const errorMsg = error?.message || "Unknown error occurred";
        console.error("❌ Unexpected error:", error);
        setError(errorMsg);
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      console.log("👤 User found, fetching requests...");
      fetchRequests();
    } else {
      console.log("❌ No user found");
      setError("Not authenticated");
      setIsLoading(false);
    }
    // subscribe to requests changes and refetch
    const channel = requestService.subscribeToRequests(() => fetchRequests());
    return () => { channel?.unsubscribe?.(); };
  }, [user, toast]);

  const handleAccept = async (e: React.MouseEvent, requestId: string) => {
  e.stopPropagation();
  if (!user) return;

  try {
    const res = await requestService.acceptRequest(requestId, user.id);

    console.log("accept result:", res);

    if ((res as any).error) {
      toast({
        title: "Error",
        description: (res as any).error.message,
        variant: "destructive",
      });
      return;
    }

    const conversationId = (res as any).conversationId;

    if (!conversationId) {
      toast({
        title: "Error",
        description: "Conversation not created",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Task accepted!" });
    // fetch request info (needed for notification)
const { data: request } = await supabase
  .from("service_requests")
  .select("id, title, created_by")
  .eq("id", requestId)
  .single();

if (request) {
  await supabase.from("notifications").insert({
    user_id: request.created_by,
    type: "request_accepted",
    title: "Request Accepted",
    message: `Your request "${request.title}" has been accepted`,
    related_request_id: request.id,
    related_user_id: user.id,
  });
}
    // ✅ navigate ONLY if valid
    navigate(`/dashboard/volunteer/messages?conversation=${conversationId}`);

  } catch (err: any) {
    toast({
      title: "Error",
      description: err.message || String(err),
      variant: "destructive",
    });
  }
};
  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Available Requests</h2>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-destructive"><strong>Error:</strong> {error}</p>
        </div>
      )}

      {isLoading && (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      )}

      {!isLoading && requests.length === 0 && !error && (
        <div className="bg-card rounded-xl border p-8 text-center">
          <p className="text-muted-foreground">No open requests available.</p>
        </div>
      )}

      {!isLoading && requests.length > 0 && (
        <div className="bg-card rounded-xl border">
          <div className="divide-y">
            {requests.map((r) => (
              
              <div key={r.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dashboard/volunteer/requests/${r.id}`)}>
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.location || "No location"} • {new Date(r.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-1.5 mt-2">
                    {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                    {r.urgency && <Badge className={`text-xs ${urgencyColors[r.urgency] || ""}`}>{r.urgency}</Badge>}
                    {r.skills_needed && r.skills_needed.split(",").map((s: string) => (
                      <Badge key={s.trim()} variant="outline" className="text-xs">{s.trim()}</Badge>
                    ))}
                    
                  </div>
                </div>
                <Button variant="hero" size="sm" onClick={(e) => handleAccept(e, r.id)}><HandHelping className="w-4 h-4 mr-1" /> Accept</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const ProfilePage = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [skills, setSkills] = useState(profile?.skills || "");
  const [availability, setAvailability] = useState(profile?.availability || "");
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(profile?.avatar_url || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!profile || !selectedFile) return;
    setIsLoading(true);
    const res = await profileService.uploadAvatar(profile.id, selectedFile);
    setIsLoading(false);
    if (res?.error) {
      toast({ title: "Upload error", description: res.error.message || String(res.error), variant: "destructive" });
    } else {
      setPreview(res.url || null);
      toast({ title: "Profile image updated" });
      await refreshProfile();
    }
  };

  const handleFileChange = (f: File | null) => {
    setSelectedFile(f);
    if (f) setPreview(URL.createObjectURL(f));
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setIsLoading(true);
    // Delete profile row locally; actual auth user deletion requires server-side service role
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    setIsLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // sign out
      await supabase.auth.signOut();
      window.location.href = "/login";
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim(), skills: skills.trim(), availability }).eq("id", profile.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated!" }); await refreshProfile(); }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-xl font-bold text-foreground mb-6">Volunteer Profile</h2>
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ""} disabled className="opacity-60" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Profile Image</Label>
          <div className="flex items-center gap-3">
            {preview ? <img src={preview} alt="preview" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-muted" />}
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} />
            <Button onClick={handleUpload} disabled={!selectedFile || isLoading}>Upload</Button>
          </div>
        </div>
        <div className="space-y-2"><Label>Skills</Label><Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Teaching, Medical" /></div>
        <div className="space-y-2"><Label>Availability</Label><Input value={availability} onChange={(e) => setAvailability(e.target.value)} /></div>
        <div className="flex gap-2">
          <Button variant="hero" onClick={handleSave} disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
          <Button variant="destructive" onClick={handleDeleteAccount} disabled={isLoading}>Delete Account</Button>
        </div>
      </div>
    </div>
  );
};

const VolunteerDashboard = () => {
  return (
    <DashboardLayout title="Volunteer Dashboard" navItems={navItems} roleBadge="Volunteer" roleBadgeColor="bg-success/10 text-success">
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="requests" element={<BrowseRequests />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="tasks" element={<BrowseRequests />} />
        <Route path="tasks/my" element={<VolunteerTasks initialTab="my" />} />
        <Route path="tasks/completed" element={<VolunteerTasks initialTab="completed" />} />
        <Route path="tasks/:id" element={<RequestDetails />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="messages" element={<MessagesPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default VolunteerDashboard;
