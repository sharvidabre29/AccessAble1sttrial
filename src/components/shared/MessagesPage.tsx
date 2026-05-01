import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Check, CheckCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { sendMessage, markMessagesAsRead } from "@/pages/chatService";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  request_id: string;
  volunteer_id: string;
  individual_id: string;
  request_title?: string;
  volunteer_name?: string;
  individual_name?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
  conversation_id?: string;
}

const MessagesPage = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // =========================
  // FETCH CONVERSATIONS
  // =========================
  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Fetch conversations with related data
      const { data: conversations, error: convoError } = await supabase
        .from("conversations")
        .select("*")
        .or(`volunteer_id.eq.${user.id},individual_id.eq.${user.id}`);

      if (convoError) {
        console.error("Error fetching conversations:", convoError);
        return;
      }

      if (!conversations || conversations.length === 0) {
        console.log("No conversations found for user:", user.id);
        setConversations([]);
        return;
      }

      console.log("Fetched conversations:", conversations);

      // Get all unique request IDs, volunteer IDs, and individual IDs
      const requestIds = conversations.map((c: any) => c.request_id);
      const volunteerIds = conversations.map((c: any) => c.volunteer_id);
      const individualIds = conversations.map((c: any) => c.individual_id);

      // Fetch request titles
      const { data: requests } = await supabase
        .from("service_requests")
        .select("id, title")
        .in("id", requestIds);

      // Fetch volunteer profiles
      const { data: volunteerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", volunteerIds);

      // Fetch individual profiles
      const { data: individualProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", individualIds);

      // Create lookup maps
      const requestMap = new Map(requests?.map((r: any) => [r.id, r.title]) || []);
      const volunteerMap = new Map(volunteerProfiles?.map((p: any) => [p.id, p.full_name]) || []);
      const individualMap = new Map(individualProfiles?.map((p: any) => [p.id, p.full_name]) || []);

      // Format conversations with all details
      const formatted = (conversations || []).map((c: any) => ({
        id: c.id,
        request_id: c.request_id,
        volunteer_id: c.volunteer_id,
        individual_id: c.individual_id,
        request_title: requestMap.get(c.request_id) || "Unknown Request",
        volunteer_name: volunteerMap.get(c.volunteer_id) || "Unknown Volunteer",
        individual_name: individualMap.get(c.individual_id) || "Unknown Individual",
      }));

      console.log("Formatted conversations:", formatted);
      setConversations(formatted);
    } catch (err) {
      console.error("Error in fetchConversations:", err);
    }
  };

  // =========================
  // AUTO OPEN FROM URL (FIXED SAFE)
  // =========================
  useEffect(() => {
    if (!conversations.length) return;

    const conversationId = searchParams.get("conversation");

    if (conversationId) {
      const convo = conversations.find(c => c.id === conversationId);
      if (convo) {
        setSelectedConversation(convo.id);
        setActiveConversation(convo);
        return;
      }
    }

    if (!selectedConversation) {
      setSelectedConversation(conversations[0]?.id || null);
      setActiveConversation(conversations[0] || null);
    }
  }, [searchParams, conversations]);

  // =========================
  // FETCH MESSAGES (WITH REALTIME)
  // =========================
  const fetchMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Fetch messages error:", error);
      return;
    }

    setMessages(data || []);
    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // =========================
  // LOAD CONVERSATIONS
  // =========================
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        setIsLoading(true);
        await fetchConversations();
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [user?.id]);

  // =========================
  // SYNC ACTIVE CONVERSATION
  // =========================
  useEffect(() => {
    if (!selectedConversation) return;

    const convo = conversations.find(c => c.id === selectedConversation);
    if (convo) setActiveConversation(convo);
  }, [selectedConversation, conversations]);

  // =========================
  // GLOBAL REALTIME: REFRESH CONVERSATIONS ON NEW MESSAGES
  // =========================
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`messages-user-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          // Refresh conversation list so previews/unread counts update
          fetchConversations();

          // If user is currently viewing that conversation, ensure message appears
          if (selectedConversation === newMessage.conversation_id) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          } else {
            // Show toast for background messages
            toast({
              title: "New message",
              description: `New message received`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, selectedConversation]);

  // =========================
  // LOAD MESSAGES ON CHANGE + REALTIME
  // =========================
  useEffect(() => {
    if (!selectedConversation) return;

    setMessages([]);
    fetchMessages(selectedConversation);

    // Cleanup old subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to new messages in real-time
    const channel = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
          
          // Show toast if message is from other person
          if (newMessage.sender_id !== user?.id && activeConversation) {
            toast({
              title: "New message",
              description: `From ${activeConversation.volunteer_id === user?.id ? activeConversation.individual_name : activeConversation.volunteer_name}`,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedConversation]);

  // =========================
  // MARK AS READ (USING CHAT SERVICE)
  // =========================
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation || !user) return;
      await markMessagesAsRead(selectedConversation, user.id);
    };

    markAsRead();
  }, [selectedConversation, user, messages]);

  // =========================
  // SEND MESSAGE (USING CHAT SERVICE)
  // =========================
  const handleSendMessage = async () => {
    if (!user || !selectedConversation || !text.trim() || !activeConversation) return;

    const receiverId =
      user.id === activeConversation.volunteer_id
        ? activeConversation.individual_id
        : activeConversation.volunteer_id;

    if (!receiverId) {
      console.error("No receiver ID found");
      toast({
        title: "Error",
        description: "Could not find message recipient",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const { error } = await sendMessage(
        selectedConversation,
        user.id,
        receiverId,
        text,
        activeConversation.request_id
      );

      if (error) {
        console.error("Send message error:", error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return;
      }

      setText("");
      toast({
        title: "Message sent",
        description: "Your message was delivered",
      });
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* LEFT: Conversations List */}
      <div className="w-80 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No conversations yet
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedConversation(c.id);
                  setActiveConversation(c);
                }}
                className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                  selectedConversation === c.id ? "bg-muted" : ""
                }`}
              >
                <p className="font-medium text-foreground truncate">{c.request_title}</p>
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {user?.id === c.volunteer_id
                    ? c.individual_name || "Unknown User"
                    : c.volunteer_name || "Unknown User"}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="border-b bg-card p-4">
              <h2 className="font-semibold text-lg text-foreground">{activeConversation.request_title}</h2>
              <p className="text-sm text-muted-foreground">
                {user?.id === activeConversation.volunteer_id
                  ? activeConversation.individual_name || "Unknown User"
                  : activeConversation.volunteer_name || "Unknown User"}
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3 bg-background">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        m.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="break-words text-sm">{m.content}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-xs opacity-70">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {m.sender_id === user?.id && (
                          m.is_read ? (
                            <CheckCheck className="w-3 h-3 opacity-70" />
                          ) : (
                            <Check className="w-3 h-3 opacity-70" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t bg-card p-4">
              <div className="flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !text.trim()}
                  size="sm"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;