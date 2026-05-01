import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ChatNotification {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  request_title: string;
  latest_message: string;
  created_at: string;
  unread_count: number;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Fetch unread messages
  useEffect(() => {
    if (!user) return;

    const fetchUnreadMessages = async () => {
      try {
        // Get all conversations for this user
        const { data: conversations } = await supabase
          .from("conversations")
          .select("*")
          .or(`volunteer_id.eq.${user.id},individual_id.eq.${user.id}`);

        if (!conversations || conversations.length === 0) {
          setNotifications([]);
          setUnreadTotal(0);
          return;
        }

        // Get unread message counts for each conversation
        const notifs: ChatNotification[] = [];
        let total = 0;

        for (const conv of conversations) {
          const { data: unreadMessages } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conv.id)
            .eq("receiver_id", user.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(1);

          if (unreadMessages && unreadMessages.length > 0) {
            const lastMessage = unreadMessages[0];

            // Get message count
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id)
              .eq("receiver_id", user.id)
              .eq("is_read", false);

            // Get sender and request info
            const senderId = lastMessage.sender_id;
            const { data: senderProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", senderId)
              .single();

            const { data: request } = await supabase
              .from("service_requests")
              .select("title")
              .eq("id", conv.request_id)
              .single();

            if (count && count > 0) {
              notifs.push({
                id: conv.id,
                conversation_id: conv.id,
                sender_id: senderId,
                sender_name: senderProfile?.full_name || "Unknown",
                request_title: request?.title || "Unknown Request",
                latest_message: lastMessage.content.substring(0, 50),
                created_at: lastMessage.created_at,
                unread_count: count,
              });
              total += count;
            }
          }
        }

        setNotifications(notifs);
        setUnreadTotal(total);
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };

    fetchUnreadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel("new-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          // Refetch when new message arrives
          fetchUnreadMessages();
        }
      )
      .subscribe();

    // Refetch every 5 seconds
    const interval = setInterval(fetchUnreadMessages, 5000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearNotification = async (conversationId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.conversation_id !== conversationId)
    );
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    // Mark all as read for current user
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    setNotifications([]);
    setUnreadTotal(0);
  };

  return (
    <div className="relative">
      {/* Bell Icon with Badge */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadTotal > 0 && (
          <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 text-xs bg-destructive">
            {unreadTotal > 9 ? "9+" : unreadTotal}
          </Badge>
        )}
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-96 bg-card border rounded-lg shadow-lg z-50 flex flex-col">
          {/* Header */}
          <div className="border-b p-3 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat Notifications
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No new messages
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.conversation_id}
                  className="border-b p-3 hover:bg-muted/50 transition-colors flex gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {notif.sender_name}
                      </p>
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        {notif.unread_count}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {notif.request_title}
                    </p>
                    <p className="text-xs text-foreground/70 line-clamp-2">
                      {notif.latest_message}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearNotification(notif.conversation_id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t p-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsOpen(false)}
              >
                Go to Messages
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={clearAllNotifications}
              >
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
