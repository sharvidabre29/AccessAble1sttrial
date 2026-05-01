import { useEffect, useState } from "react";
import { Bell, X, MessageSquare, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
  related_request_id?: string | null;
  related_user_id?: string | null;
  request_title?: string | null;
}

const NotificationDropdown = ({ role }: { role: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading] = useState(false);

  /**
   * FETCH NOTIFICATIONS (FIXED)
   */
  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("fetch error:", error);
      return;
    }

    const requestIds = (data || [])
      .map(n => n.related_request_id)
      .filter(Boolean);

    let requests: any[] = [];

    if (requestIds.length > 0) {
      const { data: reqData } = await supabase
        .from("service_requests")
        .select("id, title")
        .in("id", requestIds);

      requests = reqData || [];
    }

    const enriched = (data || []).map(n => ({
      ...n,
      request_title:
        requests.find(r => r.id === n.related_request_id)?.title || null
    }));

    setNotifications(enriched);
    setUnreadCount(enriched.filter(n => !n.read_status).length);
  };

  /**
   * INITIAL LOAD + REALTIME (FIXED)
   */
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const newNotification = payload?.new as Notification;
          if (!newNotification) return;

          setNotifications(prev => {
            if (prev.some(n => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });

          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  /**
   * MARK AS READ
   */
  const handleMarkAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ read_status: true })
      .eq("id", id);

    setNotifications(prev =>
      prev.map(n =>
        n.id === id ? { ...n, read_status: true } : n
      )
    );

    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  /**
   * CLEAR ALL (kept same behavior: mark read)
   */
  const handleClearAll = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ read_status: true })
      .eq("user_id", user.id);

    if (error) {
      console.error("Clear failed:", error);
      return;
    }

    setNotifications(prev =>
      prev.map(n => ({ ...n, read_status: true }))
    );

    setUnreadCount(0);
    setIsOpen(false);

    toast({ title: "Notifications cleared" });
  };

  /**
   * CLICK HANDLER
   */
  const handleNotificationClick = async (n: Notification) => {
    await handleMarkAsRead(n.id);

    if (n.type.includes("message") && n.related_user_id) {
      const { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(individual_id.eq.${user?.id},volunteer_id.eq.${n.related_user_id}),
           and(individual_id.eq.${n.related_user_id},volunteer_id.eq.${user?.id})`
        )
        .maybeSingle();

      if (convo) {
        navigate(`/dashboard/${role}/messages?conversation=${convo.id}`);
      } else {
        navigate(`/dashboard/${role}/messages`);
      }
    } else if (n.related_request_id) {
      navigate(`/dashboard/${role}/requests/${n.related_request_id}`);
    }

    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    if (type.includes("message")) return <MessageSquare className="w-4 h-4 text-primary" />;
    if (type.includes("accepted")) return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (type.includes("request")) return <FileText className="w-4 h-4 text-info" />;
    return <AlertCircle className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-card rounded-lg border shadow-lg z-40 max-h-96 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleClearAll} className="text-xs">
                      Clear
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="p-4 text-center">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left p-4 border-b hover:bg-muted/50 ${
                        !n.read_status ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        {getIcon(n.type)}
                        <div>
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground">{n.message}</p>

                          {n.request_title && (
                            <p className="text-xs text-muted-foreground">
                              📌 {n.request_title}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationDropdown;