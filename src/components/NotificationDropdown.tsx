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
  type: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
  related_request_id: string | null;
  related_user_id: string | null;
}

const NotificationDropdown = ({ role }: { role: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setIsLoading(true);
      const { data, error } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications((data || []) as Notification[]);
        setUnreadCount(((data || []) as Notification[]).filter((n) => !n.read_status).length);
      }
      setIsLoading(false);
    };

    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    // Subscribe to real-time updates
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
        (payload) => {
          setNotifications((prev) => [(payload.new as Notification), ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await (supabase as any)
      .from("notifications")
      .update({ read_status: true })
      .eq("id", notificationId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read_status: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleClearAll = async () => {
    const { error } = await (supabase as any)
      .from("notifications")
      .delete()
      .eq("user_id", user?.id);

    if (!error) {
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);
      toast({ title: "Notifications cleared" });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    await handleMarkAsRead(notification.id);

    if (notification.related_request_id) {
      navigate(`/dashboard/${role}/requests/${notification.related_request_id}`);
    } else if (notification.type.includes("message")) {
      navigate(`/dashboard/${role}/messages`);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("message"))
      return <MessageSquare className="w-4 h-4 text-primary" />;
    if (type.includes("accepted"))
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (type.includes("request"))
      return <FileText className="w-4 h-4 text-info" />;
    return <AlertCircle className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />

            {/* Notification Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-96 bg-card rounded-lg border shadow-lg z-40 max-h-96 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold text-foreground">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="overflow-y-auto flex-1">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {notifications.map((notification) => (
                      <motion.button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                          !notification.read_status ? "bg-primary/5" : ""
                        }`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex gap-3">
                          {getNotificationIcon(notification.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(notification.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
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
