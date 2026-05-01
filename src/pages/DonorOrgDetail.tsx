import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { getOrCreateConversation } from "@/pages/chatService";
import { useToast } from "@/hooks/use-toast";

interface OrgProfile {
  id: string;
  organization_name?: string;
  avatar_url?: string | null;
  website?: string;
}

interface RequestItem { id: string; title: string; description?: string; funding_goal?: number; funding_raised?: number }

const DonorOrgDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data: orgData } = await supabase.from("profiles").select("id, organization_name, avatar_url").eq("id", id).maybeSingle();
        setOrg(orgData || null);

        // Try fetching requests created by this profile id. Some org requests may be linked via an organization_id column.
        let { data: reqs, error } = await supabase
          .from<RequestItem>("service_requests")
          .select("id,title,description,funding_goal,funding_raised,created_at")
          .eq("created_by", id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[DonorOrgDetail] initial requests fetch error", error);
        }

        // No fallback: requests should be linked via created_by

        console.debug("[DonorOrgDetail] fetched requests count", { orgId: id, count: (reqs || []).length });
        setRequests(reqs || []);
      } catch (err) {
        console.error("[DonorOrgDetail] unexpected fetch error", err);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [id]);

  const handleOpenChat = async (requestId: string) => {
    if (!user) return;
    if (!id) return;

    // Reuse conversation model: store organization id into volunteer_id slot to represent the org.
    const { data, error } = await getOrCreateConversation(requestId, id, user.id);
    if (error || !data) {
      console.error(error);
      toast({ title: "Could not open chat", description: error?.message || "Failed to create conversation", variant: "destructive" });
      return;
    }

    // Navigate to messages with conversation selected
    navigate(`/dashboard/donor/messages?conversation=${data.id}`);
  };

  if (!id) return <div className="p-6">Invalid organization</div>;

  return (
    <div className="space-y-6 p-2">
      {org && (
        <div className="flex items-center gap-4">
          {org.avatar_url ? <img src={org.avatar_url} className="w-20 h-20 rounded-md" alt={org.organization_name} /> : <div className="w-20 h-20 bg-muted rounded-md" />}
          <div>
            <h2 className="font-heading text-2xl font-bold">{org.organization_name}</h2>
            {org.website && <a href={org.website} target="_blank" rel="noreferrer" className="text-primary underline">Visit website</a>}
            <p className="text-sm text-muted-foreground mt-1">{org.organization_name}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border">
        <div className="p-4">
          <h3 className="font-semibold">Requests</h3>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No requests from this organization.</div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex-1" onClick={() => navigate(`/dashboard/donor/requests/${r.id}`)}>
                  <p className="font-medium text-foreground">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.description?.substring(0, 120) || "No description"}</p>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/donor/requests/${r.id}`)}>View</Button>
                  <Button size="sm" onClick={() => navigate(`/dashboard/donor/requests/${r.id}`)}>Donate</Button>
                  <Button size="sm" onClick={() => handleOpenChat(r.id)}>Open Chat</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DonorOrgDetail;

