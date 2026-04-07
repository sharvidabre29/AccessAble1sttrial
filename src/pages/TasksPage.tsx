import { useEffect, useState } from "react";
import { Check, Clock, MapPin, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  urgency: string | null;
  category: string | null;
  status: string;
  created_at: string;
  created_by: string;
  requested_skills?: string | null;
}

const urgencyColors: Record<string, { bg: string; text: string; icon: string }> = {
  low: { bg: "bg-muted", text: "text-muted-foreground", icon: "Low Priority" },
  medium: { bg: "bg-warning/10", text: "text-warning", icon: "Medium Priority" },
  high: { bg: "bg-destructive/10", text: "text-destructive", icon: "High Priority" },
  critical: { bg: "bg-destructive", text: "text-destructive-foreground", icon: "Critical" },
};

const TasksPage = ({ role, filterByOrganizationOnly = role === "organization" }: { role: "volunteer" | "individual" | "organization"; filterByOrganizationOnly?: boolean }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "accepted" | "completed">("open");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        console.log("❌ No user found in TasksPage");
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      console.log(`🔄 Fetching ${role} tasks with filter: ${filter}, filterByOrg: ${filterByOrganizationOnly}`);

      try {
        let tasksToDisplay: Task[] = [];

        if (filter === "accepted" && role === "volunteer") {
          console.log("📋 Fetching volunteer's accepted tasks...");
          // Fetch accepted tasks for volunteers
          const { data: assignments, error: assignError } = await supabase
            .from("volunteer_assignments")
            .select("request_id")
            .eq("volunteer_id", user.id)
            .eq("status", "accepted");

          if (assignError) {
            throw new Error(`Assignment query failed: ${assignError.message}`);
          }

          console.log("✅ Assignments found:", assignments?.length || 0);

          if (assignments && assignments.length > 0) {
            const ids = assignments.map((a) => a.request_id);
            const { data: acceptedTasks, error: taskError } = await supabase
              .from("service_requests")
              .select("*")
              .in("id", ids)
              .order("created_at", { ascending: false });
            
            if (taskError) {
              throw new Error(`Task query failed: ${taskError.message}`);
            }

            console.log("✅ Accepted tasks fetched:", acceptedTasks?.length || 0);
            tasksToDisplay = acceptedTasks || [];
          } else {
            console.log("ℹ️ No assignments found");
            tasksToDisplay = [];
          }
        } else {
          // Fetch open or completed requests
          const statusValue = filter === "completed" ? "completed" : "open";
          console.log(`📋 Fetching requests with status: ${statusValue}`);
          
          let query = supabase
            .from("service_requests")
            .select("*")
            .eq("status", statusValue)
            .order("created_at", { ascending: false });

          const { data, error: queryError } = await query;
          
          if (queryError) {
            throw new Error(`Request query failed: ${queryError.message}`);
          }

          console.log("✅ Requests fetched:", data?.length || 0);
          tasksToDisplay = data || [];

          // If filtering for organization-only requests, join with profiles to filter
          if (filterByOrganizationOnly && tasksToDisplay.length > 0) {
            console.log("🔍 Filtering for organization-created requests...");
            const creatorIds = [...new Set(tasksToDisplay.map((t) => t.created_by))];
            console.log("📊 Unique creators:", creatorIds.length);
            
            const { data: profiles, error: profileError } = await supabase
              .from("profiles")
              .select("id, role")
              .in("id", creatorIds)
              .eq("role", "organization");

            if (profileError) {
              console.error("❌ Profile query error:", profileError);
            } else {
              console.log("✅ Organization profiles found:", profiles?.length || 0);
            }

            if (profiles) {
              const orgIds = new Set(profiles.map((p) => p.id));
              tasksToDisplay = tasksToDisplay.filter((t) => orgIds.has(t.created_by));
              console.log("✅ Filtered to organization requests:", tasksToDisplay.length);
            }
          }
        }

        setTasks(tasksToDisplay);
        setError(null);
      } catch (error: any) {
        const errorMsg = error?.message || "Unknown error occurred";
        console.error("❌ Error:", errorMsg);
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [user, role, filter, filterByOrganizationOnly, toast]);

  const handleNavigateToTask = (taskId: string) => {
    navigate(`/dashboard/${role}/requests/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Tasks</h2>
        <p className="text-sm text-muted-foreground">
          {role === "volunteer"
            ? "Browse help requests and accept tasks you can help with"
            : role === "organization"
            ? "View help requests from organizations"
            : "View help requests from others"}
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-destructive"><strong>Error:</strong> {error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["open", "accepted", "completed"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "accepted" && role === "volunteer"
              ? "My Tasks"
              : f === "completed"
              ? "Completed"
              : "Available"}
          </Button>
        ))}
      </div>

      {/* Tasks Grid/List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-2">
              {filter === "open"
                ? "No open tasks available"
                : filter === "accepted"
                ? `You haven't accepted any tasks yet`
                : "No completed tasks"}
            </p>
            {filter === "open" && (
              <Button variant="outline" onClick={() => setFilter("open")}>
                Browse Available Tasks
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleNavigateToTask(task.id)}
              className="bg-card rounded-lg border p-4 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {task.status === "completed" ? (
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {task.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-3">
                    {task.category && (
                      <Badge variant="secondary" className="text-xs">
                        {task.category}
                      </Badge>
                    )}
                    {task.urgency && (
                      <Badge
                        className={`text-xs ${urgencyColors[task.urgency]?.bg} ${urgencyColors[task.urgency]?.text}`}
                      >
                        {urgencyColors[task.urgency]?.icon}
                      </Badge>
                    )}
                    <Badge
                      variant={task.status === "open" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {task.status === "open" ? "Available" : task.status}
                    </Badge>
                  </div>

                  {task.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                      <MapPin className="w-3 h-3" />
                      {task.location}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default TasksPage;
