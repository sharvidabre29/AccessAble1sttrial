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

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<string | null>(null);

  const [contributionType, setContributionType] = useState<"labor" | "financial" | "other">("labor");
  const [hoursContributed, setHoursContributed] = useState<number | "">("");

  const [volunteersList, setVolunteersList] = useState<any[]>([]);

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

  const role = location.pathname.includes("/volunteer")
    ? "volunteer"
    : location.pathname.includes("/donor")
    ? "donor"
    : location.pathname.includes("/organization")
    ? "organization"
    : "individual";

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

        setEditData({
          title: requestData.title,
          description: requestData.description || "",
          location: requestData.location || "",
          category: requestData.category || "general",
          urgency: requestData.urgency || "medium",
          skills_needed: requestData.skills_needed || "",
          preferred_contact_method:
            (requestData as any).preferred_contact_method || "email",
        });

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", requestData.created_by)
          .maybeSingle();

        if (profileData) setRequester(profileData);

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

  return (
    <div className="min-h-screen bg-muted/30 p-4">
      {/* UI unchanged */}
      <Button onClick={handleStartChat}>
        Start Chat
      </Button>
    </div>
  );
};

export default RequestDetails;