
import { useEffect, useState } from "react";
import { Heart, PlusCircle, User, BarChart3, Settings, MessageSquare, FileText, Building2, DollarSign, ClipboardList } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import profileService from "@/services/profileService";
import { Routes, Route, useNavigate } from "react-router-dom";
import MessagesPage from "@/components/shared/MessagesPage";
import SettingsPage from "@/components/shared/SettingsPage";
import RequestsListPage from "@/components/shared/RequestsListPage";
import RequestDetails from "./RequestDetails";
import TasksPage from "./TasksPage";

const navItems = [
  { label: "Dashboard", to: "/dashboard/individual", icon: BarChart3 },
  { label: "Requests", to: "/dashboard/individual/requests", icon: FileText },

  // ✅ NEW: Chats (clean UX name for MessagesPage)
  { label: "Chats", to: "/dashboard/individual/messages", icon: MessageSquare },

  { label: "Tasks", to: "/dashboard/individual/tasks", icon: ClipboardList },
  { label: "Organizations", to: "/dashboard/individual/orgs", icon: Building2 },

  // (optional keep or remove Messages — but YOU asked not to change logic,
  // so safest is we REMOVE duplication instead of breaking UI)
  
  { label: "Profile", to: "/dashboard/individual/profile", icon: User },
  { label: "Settings", to: "/dashboard/individual/settings", icon: Settings },
];

const statusColors: Record<string, string> = {
  pending: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const DashboardHome = () => {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({ active: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count: activeCount } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("created_by", user.id).neq("status", "completed");
      const { count: completedCount } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "completed");
      setStats({ active: activeCount || 0, completed: completedCount || 0 });
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      {profile?.individual_type === "differently_abled" && (
        <div className="bg-accent border border-accent-foreground/20 rounded-xl p-4">
          <p className="text-sm text-accent-foreground font-medium">🌟 Accessibility features are enabled. Your requests are prioritized.</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div className="bg-card rounded-xl border p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm text-muted-foreground mb-1">Active Requests</p>
          <p className="text-3xl font-heading font-bold text-primary">{stats.active}</p>
        </motion.div>
        <motion.div className="bg-card rounded-xl border p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="text-sm text-muted-foreground mb-1">Completed</p>
          <p className="text-3xl font-heading font-bold text-success">{stats.completed}</p>
        </motion.div>
      </div>
    </div>
  );
};

const MyRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [urgency, setUrgency] = useState("medium");
  const [location, setLocation] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("email");
  const [deadline, setDeadline] = useState("");
  const [volunteersRequired, setVolunteersRequired] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from("service_requests").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
    setRequests(data || []);
  };

  useEffect(() => { fetchRequests(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsCreating(true);
    const payload = {
  created_by: user!.id,
  title: title.trim(),
  description: description.trim() || null,
  category,
  urgency,
  location: location.trim() || null,
  preferred_contact_method: preferredContactMethod,
  deadline,
};

const { error } = await supabase
  .from("service_requests")
  .insert(payload as any);
  
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request created!" }); setTitle(""); setDescription(""); setLocation(""); setPreferredContactMethod("email"); setShowForm(false); await fetchRequests(); }
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">My Requests</h2>
        <Button variant="hero" size="sm" onClick={() => setShowForm(!showForm)}><PlusCircle className="w-4 h-4 mr-1" /> New Request</Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-card rounded-xl border p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need help with?" maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Your location" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide more details" rows={3} maxLength={1000} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="housing">Housing</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="transport">Transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={setUrgency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Preferred Contact Method</Label>
            <Select value={preferredContactMethod} onValueChange={setPreferredContactMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="chat">Chat / Message</SelectItem>
                <SelectItem value="video_call">Video Call</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Volunteers Required</Label>
              <Input type="number" min={1} value={String(volunteersRequired)} onChange={(e) => setVolunteersRequired(Number(e.target.value) || 1)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" variant="hero" disabled={isCreating}>{isCreating ? "Creating..." : "Submit"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests yet.</div>
          ) : requests.map((r) => (
            <div key={r.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dashboard/individual/requests/${r.id}`)}>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                <p className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(profile?.accessibility_needs || "");
  const [disabilityId, setDisabilityId] = useState(
  (profile as any)?.disability_id_number || ""
);
const [disabilityType, setDisabilityType] = useState(
  (profile as any)?.disability_type || ""
);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(profile?.avatar_url || null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    const updates = {
  full_name: name.trim(),
  phone: phone.trim(),
  address: address.trim(),
  accessibility_needs: accessibilityNeeds.trim() || null,
  disability_id_number: disabilityId || null,
  disability_type: disabilityType || null,
};

const { error } = await supabase
  .from("profiles")
  .update(updates as any)
  .eq("id", profile.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated!" }); await refreshProfile(); }
    setIsLoading(false);
  };

  // Handle profile image upload
  const handleUpload = async (file?: File) => {
    if (!profile || !file) return;
    setUploading(true);
    try {
      const res = await profileService.uploadAvatar(profile.id, file);
      if (res?.error) throw res.error;
      setProfileImagePreview(res.url || null);
      await refreshProfile();
      toast({ title: "Uploaded", description: "Profile image uploaded." });
    } catch (err: any) {
  console.error("FULL ERROR:", err);
  toast({
    title: "Upload error",
    description: err?.message || JSON.stringify(err),
    variant: "destructive"
  });
}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // preview locally
    const url = URL.createObjectURL(f);
    setProfileImagePreview(url);
    handleUpload(f);
  };

  // Delete account: delete profile row and sign out. Admin deletion of auth user requires service role.
  const navigate = useNavigate();
  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (!confirm("Delete your account? This cannot be undone.")) return;
    try {
      // delete profile row
      const { error: delError } = await supabase.from("profiles").delete().eq("id", profile.id);
      if (delError) throw delError;
      // Attempt to delete auth user (requires service key / admin privileges). May fail on client.
      try {
        // @ts-ignore - admin may not be available in client
        if (supabase.auth && (supabase.auth as any).admin && (supabase.auth as any).admin.deleteUser) {
          // ignore result; this may require server-side call
          await (supabase.auth as any).admin.deleteUser(profile.id);
        }
      } catch (e) {
        // ignore admin delete errors on client
      }
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error deleting account", description: err?.message || String(err), variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-xl font-bold text-foreground mb-6">My Profile</h2>
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="space-y-2">
          <Label>Profile Image</Label>
          {profileImagePreview ? (
            <img src={profileImagePreview} alt="Profile" className="w-28 h-28 rounded-lg object-cover mb-2" />
          ) : null}
          <Input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ""} disabled className="opacity-60" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Disability ID Number</Label><Input value={disabilityId} onChange={(e) => setDisabilityId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Disability Type</Label><Select value={disabilityType || ""} onValueChange={(value) => setDisabilityType(value)}>
    <SelectTrigger>
      <SelectValue placeholder="Select disability type" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="visual">Visual</SelectItem>
      <SelectItem value="hearing">Hearing</SelectItem>
      <SelectItem value="mobility">Mobility</SelectItem>
      <SelectItem value="cognitive">Cognitive</SelectItem>
      <SelectItem value="none">None</SelectItem>
      <SelectItem value="other">Other</SelectItem>
    </SelectContent>
  </Select>
</div>        </div>
        {profile?.individual_type === "differently_abled" && (
          <div className="space-y-2"><Label>Accessibility Needs</Label><Textarea value={accessibilityNeeds} onChange={(e) => setAccessibilityNeeds(e.target.value)} rows={3} /></div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Account Type:</span>
          <Badge className="bg-info/10 text-info">{profile?.individual_type === "differently_abled" ? "Differently Abled" : "Normal"}</Badge>
        </div>
        <Button variant="hero" onClick={handleSave} disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
        <Button variant="destructive" onClick={handleDeleteAccount} className="w-full">Delete Account</Button>
      </div>
    </div>
  );
};

const IndividualDashboard = () => {
  const { profile } = useAuth();
  return (
    <DashboardLayout title="My Dashboard" navItems={navItems} roleBadge={profile?.individual_type === "differently_abled" ? "Differently Abled" : "Individual"} roleBadgeColor="bg-info/10 text-info">
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="tasks" element={<TasksPage role="individual" filterByOrganizationOnly={false} />} />
        <Route path="orgs" element={<RequestsListPage />} />
        {/* Donations removed for individuals per RBAC */}
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default IndividualDashboard;
