import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MessageSquare, MapPin, Clock, Tag, AlertCircle, Check, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import requestService from "@/services/requestService";

interface RequestData {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  urgency: string | null;
  location: string | null;
  skills_needed: string | null;
  status: string;
  funding_goal: number | null;
  funding_raised: number | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  preferred_contact_method: string | null;
  deadline?: string | null;
  volunteers_required?: number | null;
  qr_code_url?: string | null;
  bank_details?: string | null;
}
interface AccepterProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}
interface RequesterProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  organization_name: string | null;
  address: string | null;
  avatar_url: string | null;
}

const urgencyColors: Record<string, { bg: string; text: string; icon: string }> = {
  low: { bg: "bg-muted", text: "text-muted-foreground", icon: "Low Priority" },
  medium: { bg: "bg-warning/10", text: "text-warning", icon: "Medium Priority" },
  high: { bg: "bg-destructive/10", text: "text-destructive", icon: "High Priority" },
  critical: { bg: "bg-destructive", text: "text-destructive-foreground", icon: "Critical" },
};

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [requester, setRequester] = useState<RequesterProfile | null>(null);
  const [accepter, setAccepter] = useState<AccepterProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [assignedCount, setAssignedCount] = useState<number>(0);
  const [assignedVolunteers, setAssignedVolunteers] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null);
  const [contributionType, setContributionType] = useState<"labor" | "financial" | "other">("labor");
  const [hoursContributed, setHoursContributed] = useState<number | "">("");
  const [volunteersList, setVolunteersList] = useState<any[]>([]);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [donationsList, setDonationsList] = useState<any[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    location: "",
    category: "",
    urgency: "",
    skills_needed: "",
    preferred_contact_method: "email",
  });
const handleStartChat = async () => {
  if (!user || !request) return;

  try {
    const { data: convo, error } = await supabase
      .from("conversations")
      .upsert(
        {
          request_id: request.id,
          individual_id: request.created_by,
          volunteer_id: user.id,
        },
        { onConflict: "request_id" }
      )
      .select()
      .single();

    if (error) throw error;

    navigate(`/dashboard/${role}/messages?conversation=${convo.id}`);

  } catch (err) {
    toast({
      title: "Error",
      description: "Unable to start chat",
      variant: "destructive",
    });
  }
};

  const role = location.pathname.includes("/volunteer") ? "volunteer" : 
              location.pathname.includes("/donor") ? "donor" :
              location.pathname.includes("/organization") ? "organization" : "individual";

  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch request
        const { data: requestData, error: requestError } = await supabase
          .from("service_requests")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (requestError) {
          console.error("Error fetching request:", requestError);
          setIsLoading(false);
          return;
        }

        if (requestData) {
          const requestWithDefaults = {
            ...requestData,
            preferred_contact_method: (requestData as any).preferred_contact_method || "email",
          };
          setRequest(requestWithDefaults as RequestData);
          // Initialize edit form with request data
          setEditData({
            title: requestData.title,
            description: requestData.description || "",
            location: requestData.location || "",
            category: requestData.category || "general",
            urgency: requestData.urgency || "medium",
            skills_needed: requestData.skills_needed || "",
            preferred_contact_method: (requestData as any).preferred_contact_method || "email",
          });

          // Fetch requester profile
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", requestData.created_by)
            .maybeSingle();

          if (profileError) {
            console.error("Error fetching requester profile:", profileError);
          } else if (profileData) {
            setRequester(profileData);
          }

          // Fetch single accepter if the request has an accepter_id column
          try {
            const accepterId = (requestData as any).assigned_to || (requestData as any).accepter_id || null;
            if (accepterId) {
              const { data: acc, error: accErr } = await supabase.from("profiles").select("*").eq("id", accepterId).maybeSingle();
              if (!accErr && acc) setAccepter(acc);
            } else {
              // fallback: find a single assigned volunteer (first)
              const { data: assignedRows } = await supabase.from("volunteer_assignments").select("volunteer_id").eq("request_id", id).limit(1);
              if (assignedRows && assignedRows.length > 0) {
                const vid = assignedRows[0].volunteer_id;
                const { data: acc2 } = await supabase.from("profiles").select("*").eq("id", vid).maybeSingle();
                if (acc2) setAccepter(acc2);
              }
            }
          } catch (e) {
            // ignore
          }

          // Count assigned volunteers from volunteer_assignments and load details
          const { data: assignedRows, count: assignedCnt } = await supabase.from("volunteer_assignments").select("id,request_id,volunteer_id", { count: "exact", head: false }).eq("request_id", id);
          setAssignedCount((assignedRows || []).length || 0);

          if (assignedRows && assignedRows.length > 0) {
            const volunteerIds = assignedRows.map((a: any) => a.volunteer_id);
            const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", volunteerIds);
            const profilesById: Record<string, any> = {};
            (profiles || []).forEach((p: any) => { profilesById[p.id] = p; });
            const enriched = (assignedRows || []).map((r: any) => ({
              id: r.id,
              volunteer_id: r.volunteer_id,
              full_name: profilesById[r.volunteer_id]?.full_name || "Volunteer",
              hours_contributed: null,
              contribution_type: null,
            }));
            setAssignedVolunteers(enriched || []);
          }

          // Check if current user has already accepted this request (for volunteers)
          if (role === "volunteer" && user) {
            // Consider assigned_to and legacy request_volunteers table
            const assignedTo = (requestData as any).assigned_to || (requestData as any).accepter_id || null;
            if (assignedTo === user.id) {
              setHasAccepted(true);
            } else {
              const { data: assignment, error: assignmentError } = await supabase
                .from("volunteer_assignments")
                .select("id")
                .eq("request_id", id)
                .eq("volunteer_id", user.id)
                .maybeSingle();

              if (!assignmentError && assignment) {
                setHasAccepted(true);
              }
            }
          }

          // If current user is the creator, fetch donations for management
          if (user && user.id === requestData.created_by) {
            try {
              const { data: dons } = await supabase.from("donations").select("id,donor_id,amount,status,created_at").eq("request_id", id).order("created_at", { ascending: false });
              setDonationsList(dons || []);
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error("Error in RequestDetails:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user, role]);

  useEffect(() => {
    if (!showAssignModal) return;
    const fetchVols = async () => {
      const { data } = await supabase.from("profiles").select("id,full_name").eq("role", "volunteer").order("full_name", { ascending: true });
      setVolunteersList(data || []);
    };
    fetchVols();
  }, [showAssignModal]);

const handleAccept = async () => {
  if (!user || !request) return;

  if (request.volunteers_required && assignedCount >= request.volunteers_required) {
    toast({
      title: "Limit reached",
      description: "This request already has enough volunteers.",
      variant: "destructive"
    });
    return;
  }

  setIsAccepting(true);

  try {
    const res = await requestService.acceptRequest(request.id, user.id);

    if ((res as any).error) {
      toast({
        title: "Error",
        description: (res as any).error.message || "Failed to accept request",
        variant: "destructive"
      });
      return;
    }

    // ✅ GET OR CREATE CONVERSATION
    const { data: convo, error: convoError } = await supabase
      .from("conversations")
      .upsert(
        {
          request_id: request.id,
          individual_id: request.created_by,
          volunteer_id: user.id,
        },
        { onConflict: "request_id" }
      )
      .select()
      .single();

    if (convoError) throw convoError;

    setHasAccepted(true);

    const { data: newAssignedRows } = await supabase
      .from("volunteer_assignments")
      .select("id")
      .eq("request_id", request.id);

    setAssignedCount((newAssignedRows || []).length || 0);

    toast({
      title: "Success!",
      description: "You've accepted this task."
    });

    // ✅ THIS IS THE KEY FIX → OPEN CHAT
    navigate(`/dashboard/volunteer/messages?conversation=${convo.id}`);

  } catch (err: any) {
    toast({
      title: "Error",
      description: err.message || String(err),
      variant: "destructive"
    });
  } finally {
    setIsAccepting(false);
  }
};
  const handleAssign = async () => {
    if (!request || !selectedVolunteer) return;
    // Enforce limit
    if (request.volunteers_required && assignedCount >= (request.volunteers_required || 0)) {
      toast({ title: "Limit reached", description: "Cannot assign more volunteers.", variant: "destructive" });
      return;
    }

    const payload: any = {
      request_id: request.id,
      volunteer_id: selectedVolunteer,
      contribution_type: contributionType,
      hours_contributed: contributionType === "labor" ? (hoursContributed === "" ? null : Number(hoursContributed)) : null,
    };

    const { error } = await supabase.from("volunteer_assignments").insert({ request_id: payload.request_id, volunteer_id: payload.volunteer_id });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assigned", description: "Volunteer assigned successfully." });
      setShowAssignModal(false);
      setSelectedVolunteer(null);
      setHoursContributed("");
      // refresh assigned list
      const { data: assignedRows } = await supabase.from("volunteer_assignments").select("id,request_id,volunteer_id").eq("request_id", request.id);
      setAssignedCount((assignedRows || []).length || 0);
      if (assignedRows && assignedRows.length > 0) {
        const volunteerIds = assignedRows.map((a: any) => a.volunteer_id);
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", volunteerIds);
        const profilesById: Record<string, any> = {};
        (profiles || []).forEach((p: any) => { profilesById[p.id] = p; });
        const enriched = (assignedRows || []).map((r: any) => ({
          id: r.id,
          volunteer_id: r.volunteer_id,
          full_name: profilesById[r.volunteer_id]?.full_name || "Volunteer",
          hours_contributed: r.hours_contributed,
          contribution_type: r.contribution_type,
        }));
        setAssignedVolunteers(enriched || []);
      }
    }
  };

  const handleMarkCompleted = async () => {
    if (!request) return;
    // Mark completed and keep assigned_to unchanged
    const { error } = await supabase.from("service_requests").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", request.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Success", description: "Request marked completed." }); setRequest({ ...request, status: "completed" }); }
  };

  const verifyDonation = async (donationId: string) => {
    if (!user || !request) return;
    try {
      const { error } = await supabase.from('donations').update({ status: 'verified' }).eq('id', donationId);
      if (error) throw error;
      // refresh donations list
      const { data: dons } = await supabase.from("donations").select("id,donor_id,amount,status,created_at").eq("request_id", request.id).order("created_at", { ascending: false });
      setDonationsList(dons || []);
      // refresh request to pick up updated funding_raised (trigger will update)
      const { data: refreshed } = await supabase.from('service_requests').select('*').eq('id', request.id).maybeSingle();
      if (refreshed) {
  const normalized: RequestData = {
    ...refreshed,
    preferred_contact_method:
      (refreshed as any).preferred_contact_method || "email",
  };

  setRequest(normalized);
}
      toast({ title: 'Donation verified', description: 'Funding totals updated.' });
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message || String(err), variant: 'destructive' });
    }
  };

 const handleContact = async (preferredMethod?: "email" | "phone" | "chat") => {
  if (!request || !user) return;

  const contactInfo = requester || {
    id: request.created_by,
    full_name: "User",
    email: "Not available",
    phone: null,
  };

  const contactMethod: "email" | "phone" | "chat" =
    preferredMethod || (request?.preferred_contact_method as any) || "email";

  if (contactMethod === "chat") {
    try {
      const { data: convo, error } = await supabase
        .from("conversations")
        .upsert(
          {
            request_id: request.id,
            individual_id: request.created_by,
            volunteer_id: user.id,
          },
          { onConflict: "request_id" }
        )
        .select()
        .single();

      if (error) throw error;

      navigate(`/dashboard/${role}/messages?conversation=${convo.id}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Chat error",
        description: "Unable to start conversation",
        variant: "destructive",
      });
    }
    return;
  }

  if (contactMethod === "email") {
    window.location.href = `mailto:${contactInfo.email}`;
  }

  if (contactMethod === "phone" && contactInfo.phone) {
    window.location.href = `tel:${contactInfo.phone}`;
  }
};
  // Donation modal state and logic for donors
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | string>("");
  const [donationType, setDonationType] = useState<string>("money");
  const [isDonating, setIsDonating] = useState(false);

  const openDonation = () => { setDonationAmount(""); setDonationType("money"); setShowDonationModal(true); };

  const handleDonateModal = async () => {
    if (!user || !request) return;
    const amount = Number(donationAmount) || null;
    setIsDonating(true);
    try {
      // Insert donation record only; organizations control funding updates
      const { error: insertErr } = await supabase.from("donations").insert({ donor_id: user.id, request_id: request.id, amount: amount ?? undefined, donation_type: donationType });
      if (insertErr) throw insertErr;
      toast({ title: `Thanks — donation recorded!` });
      setShowDonationModal(false);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Donation failed", description: err.message || String(err), variant: "destructive" });
    } finally { setIsDonating(false); }
  };

  const handleSaveEdit = async () => {
    if (!request || !editData.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("service_requests")
      .update({
        title: editData.title.trim(),
        description: editData.description.trim() || null,
        location: editData.location.trim() || null,
        category: editData.category,
        urgency: editData.urgency,
        skills_needed: editData.skills_needed.trim() || null,
        preferred_contact_method: editData.preferred_contact_method as any,
      })
      .eq("id", request.id);

    setIsSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Request updated successfully." });
      setRequest({
        ...request,
        title: editData.title,
        description: editData.description || null,
        location: editData.location || null,
        category: editData.category,
        urgency: editData.urgency,
        skills_needed: editData.skills_needed || null,
        preferred_contact_method: editData.preferred_contact_method,
      });
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    setIsDeleting(true);
    try {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await requestService.deleteRequest(request.id, user.id as string);
      setIsDeleting(false);
      if (error) {
        toast({ title: "Error", description: (error as any).message || String(error), variant: "destructive" });
      } else {
        // Immediately update UI by navigating and rely on realtime subscriptions elsewhere to refresh lists
        toast({ title: "Success!", description: "Request deleted successfully." });
        navigate(`/dashboard/${role}/requests`);
      }
    } catch (err: any) {
      setIsDeleting(false);
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-2">Request not found</p>
          <p className="text-xs text-muted-foreground mb-4">The request ID "{id}" could not be found in the database.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  // Use fallback requester if profile fetch failed
  const displayRequester = requester || {
    id: request.created_by,
    full_name: "User",
    email: "Not available",
    phone: null,
    role: "unknown" as any,
    organization_name: null,
    address: null,
    avatar_url: null,
  };

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Edit Form or Request Header Card */}
            {isEditing ? (
              <div className="bg-card rounded-xl border shadow-sm p-8 space-y-4">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Edit Request</h2>
                
                <div className="space-y-2">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="Request title"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Describe the request in detail"
                    rows={4}
                    maxLength={1000}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={editData.location}
                      onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      placeholder="Location"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Skills Needed</Label>
                    <Input
                      value={editData.skills_needed}
                      onChange={(e) => setEditData({ ...editData, skills_needed: e.target.value })}
                      placeholder="e.g. Teaching, Medical"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editData.category} onValueChange={(v) => setEditData({ ...editData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    <Select value={editData.urgency} onValueChange={(v) => setEditData({ ...editData, urgency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Contact Method</Label>
                    <Select value={editData.preferred_contact_method} onValueChange={(v) => setEditData({ ...editData, preferred_contact_method: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="hero" onClick={handleSaveEdit} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
            {/* Request Header Card */}
            <div className="bg-card rounded-xl border shadow-sm p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                    {request.title}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {request.category && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {request.category}
                      </Badge>
                    )}
                    {request.urgency && (
                      <Badge
                        className={`${
                          urgencyColors[request.urgency]?.bg || "bg-muted"
                        } ${urgencyColors[request.urgency]?.text || "text-muted-foreground"}`}
                      >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {urgencyColors[request.urgency]?.icon || request.urgency}
                      </Badge>
                    )}
                    <Badge
                      variant={request.status === "pending" ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {request.status === "pending" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          Pending
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          {request.status}
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="space-y-4 pt-6 border-t">
                {request.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="text-foreground">{request.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Posted On</p>
                    <p className="text-foreground">{new Date(request.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {request.deadline && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Deadline</p>
                      <p className="text-foreground">{new Date(request.deadline).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Preferred Contact</p>
                    <p className="text-foreground capitalize">
                      {request.preferred_contact_method === "chat" ? "Chat / Message" : 
                       request.preferred_contact_method === "phone" ? "Phone Call" : "Email"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons for Creator */}
            {user?.id === request.created_by && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Request
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Request
                </Button>
              </div>
            )}

            {/* Donations management for organization (creator) */}
            {user?.id === request.created_by && (
              <div className="bg-card rounded-xl border shadow-sm p-6 mt-4">
                <h3 className="font-heading font-bold text-foreground mb-3">Donations</h3>
                {donationsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No donations recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {donationsList.map((d) => (
                      <div key={d.id} className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">{d.amount ? `₹${Number(d.amount).toLocaleString('en-IN')}` : 'Amount not provided'}</div>
                          <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{d.status}</div>
                          {d.status !== 'verified' && (
                            <Button size="sm" onClick={() => verifyDonation(d.id)}>Mark as Verified</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Accepted By (if available) */}
            {accepter && (
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-bold text-foreground mb-4">Accepted By</h3>
                {accepter.avatar_url && (
                  <img src={accepter.avatar_url} alt={accepter.full_name} className="w-16 h-16 rounded-lg mb-3 object-cover" />
                )}
                <h4 className="font-semibold text-foreground mb-1">{accepter.full_name}</h4>
                <p className="text-sm text-muted-foreground mb-3">{accepter.email}</p>
              </div>
            )}

            {assignedCount > 0 && (
              <div className="bg-card rounded-xl border shadow-sm p-4">
                <h4 className="font-heading font-semibold text-foreground mb-2">Assigned Volunteers</h4>
                <div className="space-y-2">
                  {assignedVolunteers.map((v) => (
                    <div key={v.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">{v.full_name?.charAt(0) || "U"}</div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{v.full_name}</div>
                        <div className="text-xs text-muted-foreground">{v.contribution_type}{v.hours_contributed ? ` • ${v.hours_contributed} hrs` : ""}</div>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground">{assignedCount} volunteers assigned</div>
                </div>
              </div>
            )}

            {/* Description Card */}
            {request.description && (
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h2 className="font-heading text-lg font-bold text-foreground mb-3">
                  Description
                </h2>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {request.description}
                </p>
              </div>
            )}

            {/* Request Details Card */}
            <div className="bg-card rounded-xl border shadow-sm p-6">
              <h2 className="font-heading text-lg font-bold text-foreground mb-4">
                Request Details
              </h2>
              <div className="space-y-4">
                {request.skills_needed && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Skills Needed</p>
                    <div className="flex flex-wrap gap-2">
                      {request.skills_needed.split(",").map((skill) => (
                        <Badge key={skill.trim()} variant="outline">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {request.category && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="text-foreground">{request.category}</p>
                  </div>
                )}

                {request.funding_goal && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Funding Goal</p>
                    <p className="text-foreground font-semibold text-lg">
                      ₹{request.funding_goal.toLocaleString('en-IN')}
                    </p>
                    {request.funding_raised !== null && (
                      <p className="text-sm text-success mt-1">
                        ₹{request.funding_raised.toLocaleString('en-IN')} raised
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Volunteers Required</p>
                  <p className="text-foreground">{request.volunteers_required || 0} required • {assignedCount} assigned</p>
                </div>
              </div>
            </div>
              </>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Requester Card - Only show if user is not the creator */}
            {user?.id !== request?.created_by && (
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h3 className="font-heading font-bold text-foreground mb-4">
                  {displayRequester.role === "organization" ? "Organization" : "Requester"}
                </h3>

                {displayRequester?.avatar_url && (
                  <img
                    src={displayRequester.avatar_url}
                    alt={displayRequester.full_name}
                    className="w-16 h-16 rounded-lg mb-3 object-cover"
                  />
                )}

                <h4 className="font-semibold text-foreground mb-1">
                  {displayRequester.full_name}
                </h4>
                {displayRequester.organization_name && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {displayRequester.organization_name}
                  </p>
                )}

                {displayRequester.address && (
                  <p className="text-sm text-muted-foreground mb-4 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{displayRequester.address}</span>
                  </p>
                )}

                {/* Preferred Contact Method */}
                <div className="bg-muted p-3 rounded-lg mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Preferred Contact</p>
                  <p className="text-sm font-medium text-foreground capitalize">
                    {request?.preferred_contact_method === "chat" ? "Chat / Message" : 
                     request?.preferred_contact_method === "phone" ? "Phone Call" : "Email"}
                  </p>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <button
                    onClick={() => handleContact("email")}
                    className="w-full flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors p-2 rounded hover:bg-muted"
                  >
                    <Mail className="w-4 h-4" />
                    {displayRequester.email}
                  </button>

                  {displayRequester.phone && (
                    <button
                      onClick={() => handleContact("phone")}
                      className="w-full flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors p-2 rounded hover:bg-muted"
                    >
                      <Phone className="w-4 h-4" />
                      {displayRequester.phone}
                    </button>
                  )}

                  <button
                    onClick={() => handleContact("chat")}
                    className="w-full flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors p-2 rounded hover:bg-muted"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </button>
                </div>
              </div>
            )}

            {/* Actions Card */}
            <div className="bg-card rounded-xl border shadow-sm p-6 space-y-3">
              {role === "volunteer" && (
                <Button
                  variant="hero"
                  className="w-full"
                  disabled={hasAccepted || isAccepting || (request.volunteers_required ? assignedCount >= (request.volunteers_required || 0) : false)}
                  onClick={handleAccept}
                >
                  {isAccepting
                    ? "Accepting..."
                    : hasAccepted
                    ? "Already Accepted ✓"
                    : "Accept This Request"}
                </Button>
              )}

              {/* Start Chat when accepted */}
              {request.status === "accepted" && (user?.id === request.created_by || user?.id === (request as any).accepter_id) && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={handleStartChat}
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Start Chat
                </Button>
              )}

              {role === "donor" && request.funding_goal && (
                <Button variant="hero" className="w-full" onClick={openDonation} disabled={request.funding_goal && Number(request.funding_raised || 0) >= Number(request.funding_goal)}>
                  {request.funding_goal && Number(request.funding_raised || 0) >= Number(request.funding_goal) ? 'Goal Reached' : 'Donate to This Request'}
                </Button>
              )}

              {role === "organization" && (
                <>
                  <Button variant="hero" className="w-full" onClick={() => setShowAssignModal(true)}>
                    Assign Volunteer
                  </Button>
                  {user?.id === request.created_by && request.status !== "completed" && (
                    <Button variant="secondary" className="w-full mt-2" onClick={handleMarkCompleted}>
                      Mark as Completed
                    </Button>
                  )}
                </>
              )}

              {user?.id !== request?.created_by && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleContact()}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contact Requester
                </Button>
              )}
            </div>

            {/* Status Info */}
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-4">
              <p className="text-sm font-medium text-foreground mb-2">Request Status</p>
              <p className="text-sm text-muted-foreground">
                {request.status === "open"
                  ? "This request is open and accepting volunteers."
                  : "This request is no longer accepting volunteers."}
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-muted-foreground font-medium">Request: {request?.title}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      {/* Assign Volunteer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-4">Assign Volunteer</h3>
            <div className="space-y-3">
              <div>
                <Label>Volunteer</Label>
                <select className="w-full p-2 border rounded" value={selectedVolunteer || ""} onChange={(e) => setSelectedVolunteer(e.target.value)}>
                  <option value="">Select volunteer</option>
                  {volunteersList.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
                </select>
              </div>

              <div>
                <Label>Contribution Type</Label>
                <select className="w-full p-2 border rounded" value={contributionType} onChange={(e) => setContributionType(e.target.value as any)}>
                  <option value="labor">Labor</option>
                  <option value="financial">Financial</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {contributionType === "labor" && (
                <div>
                  <Label>Hours Contributed</Label>
                  <Input type="number" value={hoursContributed as any} onChange={(e) => setHoursContributed(e.target.value === "" ? "" : Number(e.target.value))} min={0} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => setShowAssignModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleAssign} disabled={!selectedVolunteer} className="ml-auto">Assign</Button>
            </div>
          </div>
        </div>
      )}
      {/* Donation Modal for Donors */}
      {showDonationModal && request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">Donate to: {request.title}</h3>
            <div className="space-y-3">
              {request.qr_code_url ? (
                <div>
                  <Label>QR Code</Label>
                  <img src={request.qr_code_url} alt="QR code" className="w-48 h-48 object-contain" />
                </div>
              ) : request.bank_details ? (
                <div>
                  <Label>Bank Details</Label>
                  <pre className="p-2 bg-muted rounded text-sm">{request.bank_details}</pre>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No payment details provided by the organization.</div>
              )}
              <div>
                <Label>Amount (optional)</Label>
                <Input type="number" value={donationAmount as any} onChange={(e) => setDonationAmount(e.target.value)} min={0} placeholder="Optional: amount you transferred" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setShowDonationModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleDonateModal} className="ml-auto" disabled={isDonating}>{isDonating ? 'Recording...' : 'I have donated'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;
