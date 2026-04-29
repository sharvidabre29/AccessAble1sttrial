import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import requestService from "@/services/requestService";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// VolunteerTasks: shows My Tasks (assigned + in_progress) and Completed Tasks
const VolunteerTasks = ({ initialTab }: { initialTab?: "my" | "completed" } = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"my" | "completed">(initialTab || "my");
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try {
        if (tab === "my") {
          // Fetch tasks assigned to current user
          const { data: myTasks, error } = await requestService.fetchRequests({ status: ["accepted", "in_progress"], assigned_to: user.id });
          if (error) throw error;
          // Fetch requester profiles
          const requesterIds = (myTasks || []).map((t: any) => t.created_by).filter(Boolean);
          const profilesMap: Record<string, any> = {};
          if (requesterIds.length > 0) {
            const { data: profiles } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", requesterIds);
            (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
          }
          const enriched = (myTasks || []).map((r: any) => ({
            request: r,
            requester: profilesMap[r.created_by] || null,
          }));
          setTasks(enriched || []);
        } else {
          // completed tasks for this volunteer
          const { data: completedTasks, error } = await requestService.fetchRequests({ status: "completed", assigned_to: user.id });
          if (error) throw error;
          const requesterIds = (completedTasks || []).map((t: any) => t.created_by).filter(Boolean);
          const profilesMap: Record<string, any> = {};
          if (requesterIds.length > 0) {
            const { data: profiles } = await supabase.from("profiles").select("id,full_name,avatar_url").in("id", requesterIds);
            (profiles || []).forEach((p: any) => { profilesMap[p.id] = p; });
          }
          const enriched = (completedTasks || []).map((r: any) => ({
            request: r,
            requester: profilesMap[r.created_by] || null,
          }));
          setTasks(enriched || []);
        }
      } catch (err: any) {
        toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, tab, initialTab]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={tab === "my" ? "default" : "outline"} onClick={() => setTab("my")}>My Tasks</Button>
        <Button variant={tab === "completed" ? "default" : "outline"} onClick={() => setTab("completed")}>Completed Tasks</Button>
      </div>

      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No tasks to show.</div>
          ) : tasks.map((t: any) => (
              <div key={t.request?.id || Math.random().toString(36).slice(2)} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(`/dashboard/volunteer/requests/${t.request.id}`)}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm">{t.requester?.full_name?.charAt(0) || "U"}</div>
                  <div>
                    <p className="font-medium text-foreground">{t.request?.title}</p>
                    <p className="text-sm text-muted-foreground">{t.requester?.full_name || "Requester"}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-2"><Badge className={t.request?.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>{t.request?.status}</Badge></div>
                <div className="text-xs text-muted-foreground">{t.request?.deadline ? new Date(t.request.deadline).toLocaleString() : "No deadline"}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VolunteerTasks;
