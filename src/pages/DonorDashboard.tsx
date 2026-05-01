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
import DonorOrgsList from "./DonorOrgsList";
import DonorOrgDetail from "./DonorOrgDetail";
import RequestDetails from "./RequestDetails";

// Donor-only nav items: STRICT — donor sees only these items
const navItems = [
  { label: "Dashboard", to: "/dashboard/donor", icon: BarChart3 },
  { label: "Browse Organizations", to: "/dashboard/donor/orgs", icon: Building2 },
  { label: "My Donations", to: "/dashboard/donor/donations", icon: History },
  { label: "Chats", to: "/dashboard/donor/messages", icon: MessageSquare },
  { label: "Profile", to: "/dashboard/donor/profile", icon: User },
];

// Dashboard home for donors: shows organization browsing summary
interface Org {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_verified?: boolean;
}

const DashboardHome = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<Org[]>([]);

  useEffect(() => {
    // Fetch organizations for donor dashboard
    const fetch = async () => {
      // Use profiles where role = 'organization' as canonical organization source
      const { data } = await supabase.from<Org>("profiles").select("id,organization_name:name,avatar_url:image_url,is_verified").eq('role', 'organization').order("created_at", { ascending: false }).limit(6);
      // map organization_name -> name to match Org interface
      const mapped = (data || []).map((p: any) => ({ id: p.id, name: p.name || p.organization_name || 'Organization', description: null, image_url: p.image_url || p.avatar_url || null, is_verified: p.is_verified }));
      setOrgs(mapped);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">Explore Organizations</h2>
        <Button variant="outline" onClick={() => navigate('/dashboard/donor/orgs')}>View all</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgs.map((o) => (
          <div key={o.id} className="bg-card rounded-xl border p-4 hover:shadow-lg transition cursor-pointer" onClick={() => navigate(`/dashboard/donor/orgs/${o.id}`)}>
            <div className="flex items-center gap-3">
              {o.image_url ? <img src={o.image_url} className="w-16 h-16 rounded-md object-cover" alt={o.name} /> : <div className="w-16 h-16 rounded-md bg-muted" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{o.name}</h3>
                  {o.is_verified && <Badge className="bg-success/10 text-success">Verified</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{o.description || "No description"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Browse and donate to requests. Opens donation modal and ensures funding consistency.
const BrowseRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  interface RequestItem {
    id: string;
    title: string;
    description?: string;
    created_by?: string;
    funding_goal?: number | string;
    funding_raised?: number | string;
  }
  interface ProfileSummary { id: string; full_name?: string; organization_name?: string; role?: string; website?: string; name?: string }

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileSummary | Org>>({});

  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationRequest, setDonationRequest] = useState<any | null>(null);
  const [donationAmount, setDonationAmount] = useState<number | string>("");
  const [donationType, setDonationType] = useState<string>("money");
  const [isDonating, setIsDonating] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      // donors only see money/items requests
      const { data } = await supabase.from<RequestItem>("service_requests").select("*").in('request_type', ['money','items']).order("created_at", { ascending: false });
      setRequests(data || []);
         // fetch creator profiles
      const ids = Array.from(new Set((data || []).map((r: RequestItem) => r.created_by)));
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from<ProfileSummary>("profiles").select("id,full_name,organization_name,role,website,name").in("id", ids);
        const map: Record<string, ProfileSummary> = {};
        (profiles || []).forEach((p: ProfileSummary) => (map[p.id] = p));
        setProfilesById(map);
      }
         // fetch organizations matching creators (if any)
         const creatorIds = Array.from(new Set((data || []).map((r: RequestItem) => r.created_by)));
         if (creatorIds.length > 0) {
           const { data: profiles } = await supabase.from<any>("profiles").select("id,full_name,organization_name,role,website,avatar_url").in("id", creatorIds);
           const map: Record<string, any> = {};
           (profiles || []).forEach((p: any) => (map[p.id] = { id: p.id, full_name: p.full_name, organization_name: p.organization_name, role: p.role, website: p.website, image_url: p.avatar_url }));
           setProfilesById((prev) => ({ ...prev, ...map }));
         }
    };
    fetch();
  }, []);

  // open modal for request
  const openDonateModal = (r: RequestItem) => {
    setDonationRequest(r);
    setDonationAmount("");
    setDonationType("money");
    setShowDonationModal(true);
  };

  // donation logic: insert donation, then recompute funding reliably
  const handleDonate = async () => {
    if (!user || !donationRequest) return;
    const amount = Number(donationAmount) || null;
    setIsDonating(true);

    try {
      // Prevent rapid duplicate inserts: check recent identical donation
      // Insert donation record only. Organizations control funding_raised updates.
      type DonationInsert = { donor_id: string; request_id: string; amount?: number | null; donation_type?: string };
      const { error: insertErr } = await supabase.from<DonationInsert>("donations").insert({ donor_id: user.id, request_id: donationRequest.id, amount: amount ?? undefined, donation_type: donationType });
      if (insertErr) throw insertErr;

      toast({ title: `Thanks — donation recorded!` });
      setShowDonationModal(false);
      // refresh requests list
      const { data } = await supabase.from<RequestItem>("service_requests").select("*").in('request_type', ['money','items']).order("created_at", { ascending: false });
      setRequests(data || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Donation failed", description: err.message || String(err), variant: "destructive" });
    } finally {
      setIsDonating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Funding Requests</h2>
      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No funding requests available.</div>
          ) : requests.map((r) => {
            const creator = profilesById[r.created_by];
            const percent = r.funding_goal > 0 ? Math.min(100, (Number(r.funding_raised || 0) / Number(r.funding_goal)) * 100) : 0;
            const goalReached = r.funding_goal > 0 && Number(r.funding_raised || 0) >= Number(r.funding_goal);
            return (
              <div key={r.id} className="p-5 hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => navigate(`/dashboard/donor/requests/${r.id}`)}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.description?.substring(0, 80) || "No description"}</p>
                    {creator && (
                      <div className="text-sm text-muted-foreground mt-1">
                        By: {creator.website ? (
                          <a href={creator.website} target="_blank" rel="noreferrer" className="text-primary underline">{creator.name || creator.organization_name || creator.full_name}</a>
                        ) : creator.organization_name || creator.name ? (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/donor/orgs/${r.created_by}`); }} className="text-primary underline">{creator.organization_name || creator.name}</button>
                        ) : (
                          creator.full_name
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDonateModal(r); }} disabled={goalReached}>
                      <DollarSign className="w-4 h-4 mr-1" /> Donate
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">₹{Number(r.funding_raised || 0).toLocaleString('en-IN')} raised</span>
                    <span className="text-foreground font-medium">₹{Number(r.funding_goal || 0).toLocaleString('en-IN')} goal</span>
                  </div>
                  <Progress value={percent} className="h-2" />
                  {goalReached && <div className="text-sm text-success font-medium mt-2">Goal Reached</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Donation Modal */}
      {showDonationModal && donationRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Donate to: {donationRequest.title}</h3>
            <div className="space-y-3">
              {donationRequest.qr_code_url ? (
                <div>
                  <Label>QR Code</Label>
                  <img src={donationRequest.qr_code_url} alt="QR code" className="w-48 h-48 object-contain" />
                </div>
              ) : donationRequest.bank_details ? (
                <div>
                  <Label>Bank Details</Label>
                  <pre className="p-2 bg-muted rounded text-sm">{donationRequest.bank_details}</pre>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No payment details provided by the organization.</div>
              )}
              <div>
                <Label>Amount (optional)</Label>
                <Input type="number" value={donationAmount as any} onChange={(e) => setDonationAmount(e.target.value)} min={0} placeholder="Optional: enter amount you transferred" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setShowDonationModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleDonate} className="ml-auto" disabled={isDonating}>{isDonating ? 'Recording...' : 'I have donated'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DonationHistory = () => {
  const { user } = useAuth();
  interface DonationWithRequest { id: string; amount: number; created_at: string; service_requests?: { title?: string } }
  const [donations, setDonations] = useState<DonationWithRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from<DonationWithRequest>("donations").select("*, service_requests(title)").eq("donor_id", user.id).order("created_at", { ascending: false });
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
              <span className="text-lg font-heading font-bold text-primary">₹{Number(d.amount).toLocaleString('en-IN')}</span>
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
const DonorOverviewDashboard = () => {
  const { user } = useAuth();
  const [totalDonated, setTotalDonated] = useState(0);
  const [donationCount, setDonationCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("donations")
        .select("amount")
        .eq("donor_id", user.id);

      const total = (data || []).reduce((sum, d) => sum + Number(d.amount || 0), 0);

      setTotalDonated(total);
      setDonationCount(data?.length || 0);
    };

    fetch();
  }, [user]);

  return (
    <div className="space-y-6">

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-card border rounded-xl">
          <p className="text-sm text-muted-foreground">Total Donated</p>
          <h2 className="text-2xl font-bold">₹{totalDonated.toLocaleString("en-IN")}</h2>
        </div>

        <div className="p-4 bg-card border rounded-xl">
          <p className="text-sm text-muted-foreground">Total Donations</p>
          <h2 className="text-2xl font-bold">{donationCount}</h2>
        </div>

        <div className="p-4 bg-card border rounded-xl">
          <p className="text-sm text-muted-foreground">Impact Level</p>
          <h2 className="text-2xl font-bold text-green-600">
            {totalDonated > 5000 ? "High Impact" : "Growing"}
          </h2>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-3">Donation Progress</h3>
        <Progress value={Math.min((totalDonated / 10000) * 100, 100)} />
        <p className="text-sm text-muted-foreground mt-2">
          ₹10,000 milestone goal for impact badge
        </p>
      </div>

    </div>
  );
};
const DonorDashboard = () => {
  return (
    <DashboardLayout title="Donor Dashboard" navItems={navItems} roleBadge="Donor" roleBadgeColor="bg-primary/10 text-primary">
      <Routes>
  <Route index element={<DonorOverviewDashboard />} />
  <Route path="orgs" element={<DonorOrgsList />} />
  <Route path="orgs/:id" element={<DonorOrgDetail />} />
  <Route path="donations" element={<DonationHistory />} />
  <Route path="profile" element={<ProfilePage />} />
  <Route path="messages" element={<MessagesPage />} />
  <Route path="requests" element={<RequestsListPage />} />
  <Route path="requests/:id" element={<RequestDetails />} />
</Routes>
    </DashboardLayout>
  );
};

export default DonorDashboard; 
