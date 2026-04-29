import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatPage({ requestId }: { requestId: string }) {
  const { user } = useAuth();

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  const channelRef = useRef<any>(null);

  // 1. LOAD CONVERSATION
  useEffect(() => {
    const loadConversation = async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();

      if (error) {
        console.error("Conversation load error:", error);
        return;
      }

      setConversation(data);
    };

    loadConversation();
  }, [requestId]);

  // 2. LOAD + REALTIME MESSAGES
  useEffect(() => {
    if (!conversation?.id) return;

    const fetchMessages = async () => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Message fetch error:", error);
    return;
  }

  setMessages(data || []);
};

    fetchMessages();

    // cleanup old channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // REAL-TIME subscription
    const channel = supabase
      .channel(`chat-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversation?.id, requestId]);

  // 3. SEND MESSAGE
  const sendMessage = async () => {
    if (!text.trim() || !conversation || !user) return;

    const receiverId =
      user.id === conversation.individual_id
        ? conversation.volunteer_id
        : conversation.individual_id;

    const newMessage = {
  conversation_id: conversation.id,
  sender_id: user.id,
  receiver_id: receiverId,
  content: text,
};

    // optimistic UI update
    setMessages((prev) => [...prev, { ...newMessage, id: crypto.randomUUID() }]);

    setText("");

    const { error } = await supabase.from("messages").insert(newMessage);

    if (error) {
      console.error("Send message error:", error);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-2 rounded w-fit max-w-[70%] ${
              m.sender_id === user?.id
                ? "ml-auto bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="flex gap-2 mt-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}