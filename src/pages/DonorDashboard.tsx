import { useEffect, useState } from "react";
import { DollarSign, Eye, History, User, BarChart3, Settings, MessageSquare, FileText, Building2, ClipboardList } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  { label: "Dashboard", to: "/dashboard/donor", icon: BarChart3 },
  { label: "Requests", to: "/dashboard/donor/requests", icon: FileText },
  { label: "Tasks", to: "/dashboard/donor/tasks", icon: ClipboardList },
  { label: "Organizations", to: "/dashboard/donor/orgs", icon: Building2 },
  { label: "Donations", to: "/dashboard/donor/donations", icon: DollarSign },
  { label: "Messages", to: "/dashboard/donor/messages", icon: MessageSquare },
  { label: "Profile", to: "/dashboard/donor/profile", icon: User },
  { label: "Settings", to: "/dashboard/donor/settings", icon: Settings },
];

const DashboardHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalDonated: 0, campaigns: 0 });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("donations").select("amount").eq("donor_id", user.id);
      const total = (data || []).reduce((sum, d) => sum + Number(d.amount), 0);
      setStats({ totalDonated: total, campaigns: (data || []).length });
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: "Total Donated", value: `$${stats.totalDonated.toLocaleString()}`, color: "text-primary" },
          { label: "Campaigns Supported", value: stats.campaigns, color: "text-success" },
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
  const [donateAmounts, setDonateAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("service_requests").select("*").gt("funding_goal", 0).order("created_at", { ascending: false });
      setRequests(data || []);
    };
    fetch();
  }, []);

  const handleDonate = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation();
    if (!user) return;
    const amount = parseFloat(donateAmounts[requestId] || "0");
    if (amount <= 0) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const { error } = await supabase.from("donations").insert({ donor_id: user.id, request_id: requestId, amount });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Donated $${amount}!` });
      setDonateAmounts((prev) => ({ ...prev, [requestId]: "" }));
      const req = requests.find((r) => r.id === requestId);
      if (req) await supabase.from("service_requests").update({ funding_raised: Number(req.funding_raised) + amount }).eq("id", requestId);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Funding Requests</h2>
      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No funding requests available.</div>
          ) : requests.map((r) => (
            <div key={r.id} className="p-5 hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dashboard/donor/requests/${r.id}`)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.description?.substring(0, 80) || "No description"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Amount" className="w-24" value={donateAmounts[r.id] || ""} onChange={(e) => setDonateAmounts((prev) => ({ ...prev, [r.id]: e.target.value }))} min="1" />
                  <Button variant="hero" size="sm" onClick={(e) => handleDonate(e, r.id)}><DollarSign className="w-4 h-4 mr-1" /> Donate</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">${Number(r.funding_raised).toLocaleString()} raised</span>
                  <span className="text-foreground font-medium">${Number(r.funding_goal).toLocaleString()} goal</span>
                </div>
                <Progress value={r.funding_goal > 0 ? (Number(r.funding_raised) / Number(r.funding_goal)) * 100 : 0} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DonationHistory = () => {
  const { user } = useAuth();
  const [donations, setDonations] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("donations").select("*, service_requests(title)").eq("donor_id", user.id).order("created_at", { ascending: false });
      setDonations(data || []);
    };
    fetch();
  }, [user]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Donation History</h2>
      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {donations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No donations yet.</div>
          ) : donations.map((d) => (
            <div key={d.id} className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium text-foreground">{d.service_requests?.title || "Unknown request"}</p>
                <p className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <span className="text-lg font-heading font-bold text-primary">${Number(d.amount).toLocaleString()}</span>
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
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setIsLoading(true);
    const { error } = await supabase.from("profiles").update({ full_name: name.trim(), phone: phone.trim() }).eq("id", profile.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated!" }); await refreshProfile(); }
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="font-heading text-xl font-bold text-foreground mb-6">Donor Profile</h2>
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="space-y-2"><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Email</Label><Input value={profile?.email || ""} disabled className="opacity-60" /></div>
        <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Donation Preference:</span>
          <Badge className="bg-primary/10 text-primary">{profile?.preferred_donation_type || "Not set"}</Badge>
        </div>
        <Button variant="hero" onClick={handleSave} disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
      </div>
    </div>
  );
};

const DonorDashboard = () => {
  return (
    <DashboardLayout title="Donor Dashboard" navItems={navItems} roleBadge="Donor" roleBadgeColor="bg-primary/10 text-primary">
      <Routes>
        <Route index element={<DashboardHome />} />
        <Route path="requests" element={<BrowseRequests />} />
        <Route path="requests/:id" element={<RequestDetails />} />
        <Route path="tasks" element={<RequestsListPage />} />
        <Route path="orgs" element={<RequestsListPage />} />
        <Route path="donations" element={<DonationHistory />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default DonorDashboard;
