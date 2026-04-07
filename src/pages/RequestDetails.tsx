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
  preferred_contact_method: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

          // Check if current user has already accepted this request (for volunteers)
          if (role === "volunteer" && user) {
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
      } catch (error) {
        console.error("Error in RequestDetails:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, user, role]);

  const handleAccept = async () => {
    if (!user || !request) return;

    setIsAccepting(true);
    const { error } = await supabase.from("volunteer_assignments").insert({
      request_id: request.id,
      volunteer_id: user.id,
      status: "accepted",
    });

    setIsAccepting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "You've accepted this task." });
      setHasAccepted(true);
    }
  };

  const handleContact = async (preferredMethod?: "email" | "phone" | "chat") => {
    const contactInfo = requester || {
      id: request?.created_by,
      full_name: "User",
      email: "Not available",
      phone: null,
    };

    // Use preferred method from request or the passed method
    const contactMethod: "email" | "phone" | "chat" = preferredMethod || ((request?.preferred_contact_method as any) || "email");

    if (contactMethod === "email") {
      window.location.href = `mailto:${contactInfo.email}`;
    } else if (contactMethod === "phone" && contactInfo.phone) {
      window.location.href = `tel:${contactInfo.phone}`;
    } else if (contactMethod === "chat") {
      // Navigate to messages page with this requester
      toast({ title: "Redirecting to messages...", description: `Message conversation will be opened.` });
      navigate(`/dashboard/${role}/messages`);
    }
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
        preferred_contact_method: editData.preferred_contact_method,
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
    const { error } = await supabase
      .from("service_requests")
      .delete()
      .eq("id", request.id);

    setIsDeleting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success!", description: "Request deleted successfully." });
      // Redirect back to requests list
      navigate(`/dashboard/${role}/requests`);
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
                      variant={request.status === "open" ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {request.status === "open" ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-current" />
                          Open
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
                      ${request.funding_goal.toLocaleString()}
                    </p>
                    {request.funding_raised !== null && (
                      <p className="text-sm text-success mt-1">
                        ${request.funding_raised.toLocaleString()} raised
                      </p>
                    )}
                  </div>
                )}
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
                  disabled={hasAccepted || isAccepting || request.status !== "open"}
                  onClick={handleAccept}
                >
                  {isAccepting
                    ? "Accepting..."
                    : hasAccepted
                    ? "Already Accepted ✓"
                    : "Accept This Request"}
                </Button>
              )}

              {role === "donor" && request.funding_goal && (
                <Button variant="hero" className="w-full">
                  Donate to This Request
                </Button>
              )}

              {role === "organization" && (
                <Button variant="hero" className="w-full">
                  Assign Volunteer
                </Button>
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
    </div>
  );
};

export default RequestDetails;
