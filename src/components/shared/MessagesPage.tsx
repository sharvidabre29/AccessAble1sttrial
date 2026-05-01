import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";

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
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // =========================
  // FETCH CONVERSATIONS
  // =========================
  const fetchConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        request_id,
        volunteer_id,
        individual_id,
        service_requests(title),
        volunteer:profiles!conversations_volunteer_id_fkey(full_name),
        individual:profiles!conversations_individual_id_fkey(full_name)
      `)
      .or(`volunteer_id.eq.${user.id},individual_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    const formatted = (data || []).map((c: any) => ({
      id: c.id,
      request_id: c.request_id,
      volunteer_id: c.volunteer_id,
      individual_id: c.individual_id,
      request_title: c.service_requests?.title,
      volunteer_name: c.volunteer?.full_name,
      individual_name: c.individual?.full_name,
    }));

    setConversations(formatted);
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
  // FETCH MESSAGES (FIXED SAFE)
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
  };

  // =========================
  // LOAD CONVERSATIONS
  // =========================
  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        await fetchConversations();
      } catch (err) {
        console.error(err);
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
  // LOAD MESSAGES ON CHANGE
  // =========================
  useEffect(() => {
    if (!selectedConversation) return;

    setMessages([]); // FIX: prevent chat mixing
    fetchMessages(selectedConversation);
  }, [selectedConversation]);

  // =========================
  // MARK AS READ (FIXED USING DB FIELD is_read)
  // =========================
  useEffect(() => {
    const markAsRead = async () => {
      if (!selectedConversation || !user) return;

      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("conversation_id", selectedConversation)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };

    markAsRead();
  }, [selectedConversation, user]);

  // =========================
  // SEND MESSAGE (FIXED DB ALIGNMENT)
  // =========================
  const sendMessage = async () => {
    if (!user || !selectedConversation || !text.trim() || !activeConversation) return;

    const receiverId =
      user.id === activeConversation.volunteer_id
        ? activeConversation.individual_id
        : activeConversation.volunteer_id;

    if (!receiverId) return;

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        receiver_id: receiverId,
        content: text,
        is_read: false,
        request_id: activeConversation.request_id || null,
      });

    if (error) {
      console.error("Send message error:", error);
      return;
    }

    setText("");
    fetchMessages(selectedConversation);
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[80vh]">

      {/* LEFT: conversations */}
      <div className="border rounded p-2 space-y-2">
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => {
              setSelectedConversation(c.id);
              setActiveConversation(c);
            }}
            className={`p-2 border-b cursor-pointer hover:bg-gray-100 ${
              selectedConversation === c.id ? "bg-gray-200" : ""
            }`}
          >
            <p className="font-medium">{c.request_title}</p>

            <p className="text-sm text-muted-foreground">
              {user?.id === c.volunteer_id
                ? c.individual_name || "Unknown User"
                : c.volunteer_name || "Unknown User"}
            </p>
          </div>
        ))}
      </div>

      {/* RIGHT: chat */}
      <div className="col-span-2 border rounded flex flex-col">

        <div className="flex-1 p-3 overflow-auto space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.sender_id === user?.id ? "text-right" : "text-left"}
            >
              <div className="inline-block px-3 py-1 bg-gray-200 rounded">
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {/* input */}
        <div className="p-2 flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type message..."
          />
          <Button onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};

export default MessagesPage;