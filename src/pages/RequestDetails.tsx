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
import { getOrCreateConversation } from "./chatService";

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
  organization_name?: string | null;
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
  const [assignedVolunteer, setAssignedVolunteer] = useState<AccepterProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RequestData>>({});

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Not provided";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Not provided" : date.toLocaleString();
  };

  const toDatetimeLocalValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60_000);
    return local.toISOString().slice(0, 16);
  };

  const fromDatetimeLocalValue = (value?: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  };

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
    if (!user || !id || !request) return;

    try {
      // Check if volunteer has accepted this task
      if (!isVolunteer) {
        toast({
          title: "Error",
          description: "Only volunteers can start chats",
          variant: "destructive",
        });
        return;
      }

      if (request.assigned_to !== user.id) {
        toast({
          title: "Cannot Start Chat",
          description: "You must accept this task first to start a chat",
          variant: "destructive",
        });
        return;
      }

      const individualId = request.created_by;
      const volunteerId = request.assigned_to;

      if (!individualId || !volunteerId) {
        toast({
          title: "Chat Unavailable",
          description: "This task needs to be properly assigned",
          variant: "destructive",
        });
        return;
      }

      console.log("Starting chat with:", { requestId: id, individualId, volunteerId });

      // Use the service function to get or create conversation
      const { data: conversation, error } = await getOrCreateConversation(
        id,
        volunteerId,
        individualId
      );

      if (error || !conversation) {
        console.error("Conversation error:", error);
        toast({
          title: "Error Creating Chat",
          description: error?.message || "Could not create or load conversation",
          variant: "destructive",
        });
        return;
      }

      console.log("Conversation created/loaded:", conversation);

      // Navigate to messages page with conversation ID
      navigate(`/dashboard/${role}/messages?conversation=${conversation.id}`);
      
      toast({
        title: "Chat Started",
        description: "You can now message with the requester",
      });
    } catch (err) {
      console.error("Chat start error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while starting chat",
        variant: "destructive",
      });
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
            organization_name: requesterRow.organization_name ?? null,
          });
        }
        const { data: assignedRows } = await supabase
          .from("volunteer_assignments")
          .select("id, volunteer_id, status")
          .eq("request_id", id);

        const assignmentRows = assignedRows || [];

        const volunteerIds = assignmentRows.map((row: any) => row.volunteer_id);
        const assignedVolunteerId = normalized.assigned_to || null;
        const profileIds = Array.from(new Set([...volunteerIds, ...(assignedVolunteerId ? [assignedVolunteerId] : [])]));

        if (profileIds.length > 0) {
          const { data: volunteerProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url")
            .in("id", profileIds);

          const profileMap = new Map(
            (volunteerProfiles || []).map((profile: any) => [profile.id, profile])
          );

          const volunteersWithNames = assignmentRows.map((row: any) => ({
            id: row.id,
            volunteer_id: row.volunteer_id,
            status: row.status,
            full_name: profileMap.get(row.volunteer_id)?.full_name || "Volunteer",
            email: profileMap.get(row.volunteer_id)?.email || null,
            avatar_url: profileMap.get(row.volunteer_id)?.avatar_url || null,
          }));

          setAssignedVolunteers(volunteersWithNames);

          // Set assignedVolunteer and accepter based on assignedVolunteerId if present
          const matchedAssigned = assignedVolunteerId ? profileMap.get(assignedVolunteerId) : null;

          if (matchedAssigned) {
            setAssignedVolunteer({
              id: assignedVolunteerId as string,
              full_name: matchedAssigned.full_name || "Volunteer",
              email: matchedAssigned.email || "",
              avatar_url: matchedAssigned.avatar_url || null,
            });

            setAccepter({
              id: assignedVolunteerId as string,
              full_name: matchedAssigned.full_name || "Volunteer",
              email: matchedAssigned.email || "",
              avatar_url: matchedAssigned.avatar_url || null,
            });
          } else if (volunteersWithNames.length > 0) {
            const firstVolunteer = volunteersWithNames[0];
            setAccepter({
              id: firstVolunteer.volunteer_id,
              full_name: firstVolunteer.full_name || "Volunteer",
              email: firstVolunteer.email || "",
              avatar_url: firstVolunteer.avatar_url || null,
            });
            setAssignedVolunteer(null);
          } else {
            setAssignedVolunteer(null);
            setAccepter(null);
          }

          setAssignedCount(
            volunteersWithNames.filter((row: any) => row.status === "accepted" || !row.status).length
          );
        } else {
          setAssignedVolunteers([]);
          setAssignedVolunteer(null);
          setAccepter(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user, role]);

  useEffect(() => {
    if (!request?.assigned_to) {
      setAssignedVolunteer(null);
      setAccepter(null);
      return;
    }

    let cancelled = false;

    const loadAccepter = async () => {
      const { data: accepterProfile, error: accepterError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", request.assigned_to)
        .maybeSingle<AccepterProfile>();

      if (cancelled) return;

      if (accepterError) {
        console.error("Error fetching assigned volunteer profile:", accepterError);
        return;
      }

      setAssignedVolunteer(
        accepterProfile
          ? {
              id: accepterProfile.id,
              full_name: accepterProfile.full_name || "Volunteer",
              email: accepterProfile.email || "",
              avatar_url: accepterProfile.avatar_url || null,
            }
          : null
      );
      setAccepter(accepterProfile ? (accepterProfile as AccepterProfile) : null);
    };

    loadAccepter();

    return () => {
      cancelled = true;
    };
  }, [request?.assigned_to]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`service-request-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updatedRequest = payload.new as RequestData;
          setRequest((prev) => ({ ...(prev as RequestData), ...updatedRequest }));
          setHasAccepted(Boolean(updatedRequest.assigned_to && user?.id && updatedRequest.assigned_to === user.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

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

      // Update request state with assigned_to
      setRequest({
        ...request,
        assigned_to: user.id,
      });

      setHasAccepted(true);

      const { data: newRows } = await supabase
        .from("volunteer_assignments")
        .select("id, volunteer_id, status")
        .eq("request_id", request.id);

      const acceptedRows = newRows || [];
      const volunteerIds = acceptedRows.map((row: any) => row.volunteer_id);
      const profileIds = Array.from(new Set([...volunteerIds, user.id]));

      const { data: volunteerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", profileIds);

      const profileMap = new Map(
        (volunteerProfiles || []).map((profile: any) => [profile.id, profile])
      );

      const volunteersWithNames = acceptedRows
        .filter((row: any) => row.status === "accepted" || !row.status)
        .map((row: any) => ({
          ...row,
          full_name: profileMap.get(row.volunteer_id)?.full_name || "Volunteer",
          email: profileMap.get(row.volunteer_id)?.email || null,
          avatar_url: profileMap.get(row.volunteer_id)?.avatar_url || null,
        }));

      const fallbackVolunteer = profileMap.get(user.id);

      if (volunteersWithNames.length > 0) {
        setAssignedVolunteers(volunteersWithNames);
        setAssignedCount(volunteersWithNames.filter((row: any) => row.status === "accepted" || !row.status).length);
      } else if (request.assigned_to) {
        setAssignedVolunteers(
          fallbackVolunteer
            ? [
                {
                  id: request.assigned_to,
                  volunteer_id: request.assigned_to,
                  email: fallbackVolunteer.email || null,
                  avatar_url: fallbackVolunteer.avatar_url || null,
                  status: "accepted",
                },
              ]
            : []
        );
        setAssignedCount(1);
      } else {
        setAssignedVolunteers([]);
        setAssignedCount(0);
      }

      if (fallbackVolunteer) {
        setAccepter({
          id: user.id,
          full_name: fallbackVolunteer.full_name || "Volunteer",
          email: fallbackVolunteer.email || "",
          avatar_url: fallbackVolunteer.avatar_url || null,
        });
      }

      toast({
        title: "Success!",
        description: "You've accepted this task. You can now start a chat.",
      });
    } finally {
      setIsAccepting(false);
    }
  };

  /* ---------------- EDIT / DELETE ---------------- */

  const isCreator = Boolean(user && request && user.id === request.created_by);

  const handleStartEdit = () => {
    if (!request) return;
    setEditForm({
      title: request.title,
      description: request.description || "",
      category: request.category || "",
      urgency: request.urgency || "",
      location: request.location || "",
      skills_needed: request.skills_needed || "",
      deadline: toDatetimeLocalValue(request.deadline),
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!request || !user) return;
    if (!editForm.title || editForm.title.trim() === "") {
      toast({ title: "Validation", description: "Title is required", variant: "destructive" });
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await requestService.updateRequest(request.id, user.id, {
        ...editForm,
        deadline: fromDatetimeLocalValue(editForm.deadline || ""),
      } as any);
      if ((res as any).error) {
        toast({ title: "Error", description: (res as any).error.message || "Failed to update", variant: "destructive" });
        return;
      }

      // Update local request state with returned data
      setRequest((prev) => ({ ...(prev as RequestData), ...(res.data as RequestData) }));
      toast({ title: "Saved", description: "Request updated" });
      setIsEditing(false);
      setEditForm({});
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!request || !user) return;
    const ok = window.confirm("Are you sure you want to delete this request? This cannot be undone.");
    if (!ok) return;

    try {
      const res = await requestService.deleteRequest(request.id, user.id);
      if ((res as any).error) {
        toast({ title: "Error", description: (res as any).error.message || "Failed to delete", variant: "destructive" });
        return;
      }

      toast({ title: "Deleted", description: "Request removed" });
      navigate(backPath);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
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
      label: "Created",
      value: formatDateTime(request.created_at),
      icon: Clock,
    },
    {
      label: "Last updated",
      value: formatDateTime(request.updated_at),
      icon: Clock,
    },
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
    requester?.full_name || requester?.organization_name || "Requester";
  const requesterSubtitle = requester?.role === "individual" ? "Individual requester" : requester?.role || "Requester profile";

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(backPath)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {isCreator && !isEditing && (
              <Button onClick={handleStartEdit} className="gap-2">
                Edit
              </Button>
            )}
            {isCreator && (
              <Button variant="destructive" onClick={handleDeleteRequest} className="gap-2">
                Delete
              </Button>
            )}
          </div>
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
                  {!isEditing ? (
                    <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {request.title}
                    </h1>
                  ) : (
                    <div className="space-y-3">
                      <input
                        className="w-full rounded-md border px-3 py-2"
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
                        placeholder="Title"
                      />
                      <input
                        className="w-full rounded-md border px-3 py-2"
                        value={editForm.category || ""}
                        onChange={(e) => setEditForm((s) => ({ ...s, category: e.target.value }))}
                        placeholder="Category"
                      />
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md border px-3 py-2"
                          value={editForm.urgency || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, urgency: e.target.value }))}
                          placeholder="Urgency"
                        />
                        <input
                          className="flex-1 rounded-md border px-3 py-2"
                          value={editForm.location || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, location: e.target.value }))}
                          placeholder="Location"
                        />
                      </div>
                    </div>
                  )}
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
                      {isEditing && item.label === "Deadline" ? (
                        <input
                          type="datetime-local"
                          className="mt-2 w-full rounded-md border px-3 py-2"
                          value={editForm.deadline || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, deadline: e.target.value }))}
                        />
                      ) : isEditing && item.label === "Preferred contact" ? (
                        <input
                          className="mt-2 w-full rounded-md border px-3 py-2"
                          value={editForm.preferred_contact_method || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, preferred_contact_method: e.target.value }))}
                        />
                      ) : (
                        <p className="mt-2 text-sm font-medium text-foreground">{item.value}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <div className="mt-4 space-y-4 text-sm leading-6 text-muted-foreground">
                {!isEditing ? (
                  request.description ? (
                    <p className="whitespace-pre-wrap text-foreground/90">{request.description}</p>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-dashed p-4">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                      <span>No description was provided for this task.</span>
                    </div>
                  )
                ) : (
                  <textarea
                    className="w-full min-h-[120px] rounded-md border px-3 py-2 text-sm"
                    value={editForm.description || ""}
                    onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                  />
                )}

                {isEditing ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills needed</p>
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      value={editForm.skills_needed || ""}
                      onChange={(e) => setEditForm((s) => ({ ...s, skills_needed: e.target.value }))}
                      placeholder="Comma separated skills"
                    />
                  </div>
                ) : (
                  request.skills_needed ? (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills needed</p>
                      <div className="flex flex-wrap gap-2">
                        {request.skills_needed.split(",").map((skill) => (
                          <Badge key={skill.trim()} variant="outline">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}

                {!isEditing && assignedVolunteers.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Volunteer names</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedVolunteers.map((volunteer) => (
                        <Badge key={volunteer.id} variant="secondary">
                          {volunteer.full_name || "Volunteer"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isEditing && (
                  <div className="flex gap-2 pt-3">
                    <Button onClick={handleSaveEdit} disabled={isSavingEdit} variant="hero">
                      {isSavingEdit ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={handleCancelEdit} variant="ghost">Cancel</Button>
                  </div>
                )}
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
                  <span>Volunteers on task</span>
                  <span className="font-medium text-foreground">{assignedVolunteers.filter((volunteer) => volunteer.status === "accepted" || !volunteer.status).length || assignedCount || (request.assigned_to ? 1 : 0)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                  <span>Status</span>
                  <span className="font-medium text-foreground capitalize">{request.status}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/20 p-3">
                  <span>Assigned to</span>
                  <span className="font-medium text-foreground">
                    {request.assigned_to ? (
                      assignedVolunteer?.full_name || accepter?.full_name || assignedVolunteers[0]?.full_name ? (
                        <span className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                            {(assignedVolunteer?.full_name || accepter?.full_name || assignedVolunteers[0]?.full_name || "V").charAt(0).toUpperCase()}
                          </div>
                          <span>{assignedVolunteer?.full_name || accepter?.full_name || assignedVolunteers[0]?.full_name || "Assigned volunteer"}</span>
                        </span>
                      ) : assignedVolunteers.length > 0 ? (
                        <span className="flex flex-col items-end gap-1">
                          {assignedVolunteers.map((volunteer) => (
                            <span key={volunteer.id} className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                                {(volunteer.full_name || "V").charAt(0).toUpperCase()}
                              </div>
                              <span>{volunteer.full_name || "Volunteer"}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span>{assignedVolunteer?.full_name || "Assigned volunteer"}</span>
                      )
                    ) : (
                      <span>Not assigned</span>
                    )}
                  </span>
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

              {isVolunteer ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 text-success" />
                  <span>
                    You now get the full task summary here. Chat is only shown when the task is assigned to you.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default RequestDetails;