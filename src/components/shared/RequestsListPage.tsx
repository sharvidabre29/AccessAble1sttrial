import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import requestService from "@/services/requestService";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  open: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const urgencyColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/10 text-warning",
  high: "bg-destructive/10 text-destructive",
  critical: "bg-destructive text-destructive-foreground",
};

interface RequestItem {
  id: string;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  skills_needed?: string;
  status?: string;
  urgency?: string;
  created_at?: string;
  funding_goal?: number;
  funding_raised?: number;
  org_id?: string;
}

const RequestsListPage = () => {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [filtered, setFiltered] = useState<RequestItem[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
  .from("service_requests")
  .select("*")
  .order("created_at", { ascending: false });

if (error) {
  console.error(error);
  return;
}

setRequests((data as RequestItem[]) || []);}
    fetch();
    // subscribe to changes; refetch on non-delete events, remove locally on delete for snappy UI
    const channel = requestService.subscribeToRequests((p) => {
      try {
        const event = (p as any).eventType || (p as any).event || (p as any).type;
        if (event === "DELETE" || event === "delete") {
          const old = (p as any).old || (p as any).record || (p as any).oldRecord;
          if (old && old.id) setRequests((prev) => prev.filter((r) => r.id !== old.id));
          else fetch();
        } else {
          // for INSERT/UPDATE/TRUNCATE/etc, refetch to keep in sync
          fetch();
        }
      } catch (e) {
        fetch();
      }
    });
    return () => { channel?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    let result = [...requests];
    if (categoryFilter !== "all") result = result.filter((r) => r.category === categoryFilter);
    if (urgencyFilter !== "all") result = result.filter((r) => r.urgency === urgencyFilter);
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.location?.toLowerCase().includes(q));
    }
    setFiltered(result);
  }, [requests, categoryFilter, urgencyFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">All Requests</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search requests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-xs" />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="medical">Medical</SelectItem>
            <SelectItem value="education">Education</SelectItem>
            <SelectItem value="housing">Housing</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
          </SelectContent>
        </Select>
        <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Urgency" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      <div className="bg-card rounded-xl border">
        <div className="divide-y">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No requests found.</div>
          ) : (
            filtered.map((r, i) => (
              <motion.div
                key={r.id}
                className="p-5 hover:bg-muted/50 transition-colors"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{r.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{r.description?.substring(0, 120) || "No description"}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {r.location && <span className="text-xs text-muted-foreground">📍 {r.location}</span>}
                      {r.category && <Badge variant="secondary" className="text-xs">{r.category}</Badge>}
                      {r.skills_needed && r.skills_needed.split(",").map((s: string) => (
                        <Badge key={s.trim()} variant="outline" className="text-xs">{s.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                    {r.urgency && <Badge className={urgencyColors[r.urgency] || ""}>{r.urgency}</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestsListPage;
