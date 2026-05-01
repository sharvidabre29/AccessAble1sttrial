import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Clock,
  HandHelping,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import requestService from "@/services/requestService";

/* ---------------- types unchanged ---------------- */

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
  assigned_to?: string | null;
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
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  address: string | null;
  avatar_url: string | null;
  individual_type?: string | null;
  accessibility_needs?: string | null;
}

/* ---------------- component ---------------- */

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

  const role = location.pathname.includes("/volunteer")
    ? "volunteer"
    : location.pathname.includes("/donor")
    ? "donor"
    : location.pathname.includes("/organization")
    ? "organization"
    : "individual";

  const isVolunteer = role === "volunteer";
  const isAssignedToMe = Boolean(request?.assigned_to && user?.id && request.assigned_to === user.id) || hasAccepted;
  const canAcceptTask = Boolean(isVolunteer && request && !request.assigned_to && request.status !== "completed");
  const backPath =
    role === "volunteer"
      ? "/dashboard/volunteer/tasks/my"
      : role === "organization"
      ? "/dashboard/organization/requests"
      : role === "donor"
      ? "/dashboard/donor/requests"
      : "/dashboard/individual/requests";

  /* ---------------- CHAT FIX ---------------- */

  const handleStartChat = async () => {
  if (!user || !id) return;

  try {
    // 1. Get request info
    const { data: request, error } = await supabase
      .from("service_requests")
      .select("created_by, assigned_to")
      .eq("id", id)
      .single();

    if (error || !request) {
      console.error("Fetch error:", error);
      return;
    }

    const individualId = request.created_by;
    const volunteerId = request.assigned_to;

    if (!individualId || !volunteerId) {
      alert("Chat unavailable until request is accepted.");
      return;
    }

    // 2. CHECK if conversation exists
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .eq("request_id", id)
      .maybeSingle();

    // 3. CREATE if not exists
    if (!conversation) {
      const { data: newConversation, error: createError } = await supabase
        .from("conversations")
        .insert({
          request_id: id,
          individual_id: individualId,
          volunteer_id: volunteerId,
        })
        .select()
        .single();

      if (createError) {
        console.error("Create error:", createError);
        return;
      }

      conversation = newConversation;
    }

    // 4. REDIRECT correctly
    navigate(`/dashboard/${role}/messages?conversation=${conversation.id}`);

  } catch (err) {
    console.error("Chat start error:", err);
  }
};
  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return setIsLoading(false);

      try {
        const { data: requestData, error } = await supabase
          .from("service_requests")
          .select("*")
          .eq("id", id)
           .maybeSingle<RequestData>();

        if (error || !requestData) {
          setIsLoading(false);
          return;
        }

        const normalized: RequestData = {
          ...requestData,
          preferred_contact_method:
            (requestData as any).preferred_contact_method || "email",
        };

        setRequest(normalized);
        setHasAccepted(Boolean(normalized.assigned_to && user?.id && normalized.assigned_to === user.id));

        const { data: profileData, error: profileError } = await supabase.rpc("get_requester_profile_for_request", {
          request_id: id,
        });

        if (profileError) {
          console.error("Requester profile fetch error:", profileError);
        }

        if (profileData && Array.isArray(profileData) && profileData.length > 0) {
          const requesterRow = profileData[0] as any;
          setRequester({
            id: requestData.created_by,
            full_name: requesterRow.full_name ?? null,
            email: requesterRow.email ?? null,
            phone: requesterRow.phone ?? null,
            role: requesterRow.role ?? null,
            address: requesterRow.address ?? null,
            avatar_url: requesterRow.avatar_url ?? null,
            individual_type: requesterRow.individual_type ?? null,
            accessibility_needs: requesterRow.accessibility_needs ?? null,
          });
        }

        const { data: assignedRows } = await supabase
          .from("volunteer_assignments")
          .select("id, volunteer_id")
          .eq("request_id", id);

        setAssignedCount(assignedRows?.length || 0);

        setAssignedVolunteers(assignedRows || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user, role]);

  /* ---------------- ACCEPT FIX ---------------- */

  const handleAccept = async () => {
    if (!user || !request) return;

    setIsAccepting(true);

    try {
      const res = await requestService.acceptRequest(request.id, user.id);

      if ((res as any)?.error) {
        toast({
          title: "Error",
          description: (res as any).error.message,
          variant: "destructive",
        });
        return;
      }

      if (res.success) {
        setHasAccepted(true);
      }

      setHasAccepted(true);

      const { data: newRows } = await supabase
        .from("volunteer_assignments")
        .select("id")
        .eq("request_id", request.id);

      setAssignedCount(newRows?.length || 0);

      toast({
        title: "Success!",
        description: "You've accepted this task.",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  /* ---------------- UI SAFE RETURN ---------------- */

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (!request) return <p className="p-6">Request not found</p>;

  const statusTone =
    request.status === "completed"
      ? "bg-success/10 text-success"
      : request.status === "in_progress"
      ? "bg-warning/10 text-warning"
      : "bg-muted text-muted-foreground";

  const detailRows = [
    { label: "Category", value: request.category || "General", icon: Tag },
    { label: "Urgency", value: request.urgency || "Not set", icon: AlertCircle },
    { label: "Location", value: request.location || "Not provided", icon: MapPin },
    {
      label: "Deadline",
      value: request.deadline ? new Date(request.deadline).toLocaleString() : "No deadline",
      icon: Clock,
    },
    {
      label: "Preferred contact",
      value: request.preferred_contact_method || "Email",
      icon: Mail,
    },
  ];

  const requesterDisplayName =
    requester?.full_name || "Requester";
  const requesterSubtitle = requester?.role === "individual" ? "Individual requester" : requester?.role || "Requester profile";

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Badge className={statusTone}>{request.status}</Badge>
        </div>

        <motion.div
          className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Volunteer Task Details</p>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    {request.title}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                  {request.category && <Badge variant="secondary">{request.category}</Badge>}
                  {request.urgency && <Badge variant="outline">{request.urgency}</Badge>}
                  {isAssignedToMe && <Badge className="bg-success/10 text-success">Assigned to you</Badge>}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {detailRows.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border bg-muted/20 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </div>
                      <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                {request.description ? (
                  <p className="whitespace-pre-wrap text-foreground/90">{request.description}</p>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg border border-dashed p-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>No description was provided for this task.</span>
                  </div>
                )}

                {request.skills_needed ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Skills needed
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {request.skills_needed.split(",").map((skill) => (
                        <Badge key={skill.trim()} variant="outline">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Requester</h2>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                  {requesterDisplayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{requesterDisplayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{requesterSubtitle}</p>
                </div>
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{requester?.email || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{requester?.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{requester?.address || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{requester?.individual_type || "Individual"}</span>
                </div>
                {requester?.accessibility_needs ? <p className="rounded-lg border border-dashed p-3 text-xs leading-5 text-muted-foreground">{requester.accessibility_needs}</p> : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Assignment</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                  <span>Volunteers assigned</span>
                  <span className="font-medium text-foreground">{assignedCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                  <span>Status</span>
                  <span className="font-medium text-foreground capitalize">{request.status}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                  <span>Accepted by you</span>
                  <span className="font-medium text-foreground">{isAssignedToMe ? "Yes" : "No"}</span>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {canAcceptTask ? (
                  <Button variant="hero" className="w-full gap-2" onClick={handleAccept} disabled={isAccepting}>
                    <HandHelping className="h-4 w-4" />
                    {isAccepting ? "Accepting..." : "Accept Task"}
                  </Button>
                ) : null}

                {isAssignedToMe ? (
                  <Button className="w-full gap-2" onClick={handleStartChat}>
                    <MessageSquare className="h-4 w-4" />
                    Start Chat
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 text-success" />
                <span>
                  You now get the full task summary here. Chat is only shown when the task is assigned to you.
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RequestDetails;