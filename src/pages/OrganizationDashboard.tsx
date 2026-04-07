import { useEffect, useState } from "react";
import { Building2, FileText, Users, PlusCircle, BarChart3, Settings, User, MessageSquare, ClipboardList, DollarSign } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Routes, Route, useNavigate } from "react-router-dom";
import MessagesPage from "@/components/shared/MessagesPage";
import SettingsPage from "@/components/shared/SettingsPage";
import RequestsListPage from "@/components/shared/RequestsListPage";
import RequestDetails from "./RequestDetails";

const navItems = [
  { label: "Dashboard", to: "/dashboard/organization", icon: BarChart3 },
  { label: "Requests", to: "/dashboard/organization/requests", icon: FileText },
  { label: "Tasks", to: "/dashboard/organization/tasks", icon: ClipboardList },
  { label: "Organizations", to: "/dashboard/organization/orgs", icon: Building2 },
  { label: "Donations", to: "/dashboard/organization/donations", icon: DollarSign },
  { label: "Messages", to: "/dashboard/organization/messages", icon: MessageSquare },
  { label: "Profile", to: "/dashboard/organization/profile", icon: User },
  { label: "Settings", to: "/dashboard/organization/settings", icon: Settings },
];

const statusColors: Record<string, string> = {
  open: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const DashboardHome = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, volunteers: 0, completed: 0, donations: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: reqs } = await supabase.from("service_requests").select("*").eq("created_by", user.id).order("created_at", { ascending: false }).limit(5);
      setRequests(reqs || []);

      const { count: activeCount } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("created_by", user.id).neq("status", "completed");
      const { count: completedCount } = await supabase.from("service_requests").select("*", { count: "exact", head: true }).eq("created_by", user.id).eq("status", "completed");

      setStats({ active: activeCount || 0, volunteers: 0, completed: completedCount || 0, donations: 0 });
    };
    fetchData();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Requests", value: stats.active, color: "text-primary" },
          { label: "Volunteers Engaged", value: stats.volunteers, color: "text-success" },
          { label: "Completed", value: stats.completed, color: "text-info" },
          { label: "Donations Received", value: `$${stats.donations}`, color: "text-warning" },
        ].map((s, i) => (
          <motion.div key={s.label} className="bg-card rounded-xl border p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-3xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </motion.div>
        ))}
      </div>
      <div className="bg-card rounded-xl border">
        <div className="p-5 border-b"><h2 className="font-heading font-semibold text-foreground">Recent Requests</h2></div>
        <div className="divide-y">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests yet.</div>
          ) : requests.map((r) => (
            <div key={r.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{r.title}</p>
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

const CreateRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState("");
  const [category, setCategory] = useState("general");
  const [urgency, setUrgency] = useState("medium");
  const [fundingGoal, setFundingGoal] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState("email");
  const [isLoading, setIsLoading] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from("service_requests").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
    setMyRequests(data || []);
  };

  useEffect(() => { fetchRequests(); }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    setIsLoading(true);
    const { error } = await supabase.from("service_requests").insert({
      created_by: user!.id, title: title.trim(), description: description.trim() || null,
      location: location.trim() || null, skills_needed: skillsNeeded.trim() || null,
      category, urgency, funding_goal: fundingGoal ? parseFloat(fundingGoal) : 0, preferred_contact_method: preferredContactMethod,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Request created!" }); setTitle(""); setDescription(""); setLocation(""); setSkillsNeeded(""); setFundingGoal(""); setPreferredContactMethod("email"); await fetchRequests(); }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Create & Manage Requests</h2>
      <form onSubmit={handleCreate} className="bg-card rounded-xl border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you need help with?" maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where?" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the request in detail" rows={3} maxLength={1000} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <div className="space-y-2">
            <Label>Skills Needed</Label>
            <Input value={skillsNeeded} onChange={(e) => setSkillsNeeded(e.target.value)} placeholder="e.g. Teaching" />
          </div>
          <div className="space-y-2">
            <Label>Funding Goal ($)</Label>
            <Input type="number" value={fundingGoal} onChange={(e) => setFundingGoal(e.target.value)} placeholder="0" min="0" />
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
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" variant="hero" disabled={isLoading}>{isLoading ? "Creating..." : "Create Request"}</Button>
      </form>

      <div className="bg-card rounded-xl border">
        <div className="p-5 border-b"><h3 className="font-heading font-semibold text-foreground">My Requests</h3></div>
        <div className="divide-y">
          {myRequests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests yet.</div>
          ) : myRequests.map((r) => (
            <div key={r.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dashboard/organization/requests/${r.id}`)}>
              <div className="flex-1">
                <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">{r.location || "No location"}</span>
                  {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TasksPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: myRequests } = await supabase.from("service_requests").select("id").eq("created_by", user.id);
      if (!myRequests || myRequests.length === 0) { setAssignments([]); return; }
      const requestIds = myRequests.map((r) => r.id);
      const { data } = await supabase.from("volunteer_assignments").select("*, service_requests(title, location)").in("request_id", requestIds).order("created_at", { ascending: false });
      setAssignments(data || []);
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Volunteer Assignments</h2>
      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {assignments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No volunteer assignments yet.</div>
          ) : assignments.map((a) => (
            <div key={a.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{a.service_requests?.title || "Untitled"}</p>
                <p className="text-sm text-muted-foreground">{a.service_requests?.location || "No location"}</p>
              </div>
              <Badge className={a.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{a.status}</Badge>
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
  const [name, setName] = useState(profile?.organization_name || profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim(), address: address.trim(), organization_name: name.trim() }).eq("id", profile.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated!" }); await refreshProfile(); }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-xl font-bold text-foreground mb-6">Organization Profile</h2>
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="space-y-2"><Label>Organization Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ""} disabled className="opacity-60" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="space-y-2"><Label>Address</Label><Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} /></div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Registration ID:</span>
          <Badge variant="secondary">{profile?.registration_id || "N/A"}</Badge>
        </div>
        <Button variant="hero" onClick={handleSave} disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
};

const OrganizationDashboard = () => {
  return (
    <DashboardLayout title="Organization Dashboard" navItems={navItems} roleBadge="Organization" roleBadgeColor="bg-primary/10 text-primary">
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="requests" element={<CreateRequest />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="tasks" element={<TasksPage role="organization" />} />
        <Route path="orgs" element={<RequestsListPage />} />
        <Route path="donations" element={<div className="text-muted-foreground">Donation tracking for your requests coming soon.</div>} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default OrganizationDashboard;
