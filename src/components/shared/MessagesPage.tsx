import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  user_id: string;
  user_name: string;
  last_message: string;
  last_time: string;
  unread: number;
}

const MessagesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [showNewConvo, setShowNewConvo] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) return;

    const convos: Record<string, Conversation> = {};
    for (const msg of data) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      if (!convos[otherId]) {
        convos[otherId] = {
          user_id: otherId,
          user_name: otherId.substring(0, 8) + "...",
          last_message: msg.content,
          last_time: msg.created_at,
          unread: 0,
        };
      }
      if (msg.receiver_id === user.id && !msg.is_read) convos[otherId].unread++;
    }

    // Fetch names
    const userIds = Object.keys(convos);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          if (convos[p.id]) convos[p.id].user_name = p.full_name;
        }
      }
    }

    setConversations(Object.values(convos));
  };

  const fetchMessages = async (otherId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark as read
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", otherId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  useEffect(() => { fetchConversations(); }, [user]);

  useEffect(() => {
    if (selectedUser) fetchMessages(selectedUser);
  }, [selectedUser]);

  const handleSend = async () => {
    if (!user || !selectedUser || !newMessage.trim()) return;
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUser,
      content: newMessage.trim(),
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      setNewMessage("");
      await fetchMessages(selectedUser);
      await fetchConversations();
    }
  };

  const handleNewConvo = async () => {
    if (!newRecipientEmail.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", newRecipientEmail.trim())
      .single();
    if (!data) {
      toast({ title: "User not found", variant: "destructive" });
      return;
    }
    setSelectedUser(data.id);
    setShowNewConvo(false);
    setNewRecipientEmail("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">Messages</h2>
        <Button variant="hero" size="sm" onClick={() => setShowNewConvo(!showNewConvo)}>
          <MessageSquare className="w-4 h-4 mr-1" /> New Message
        </Button>
      </div>

      {showNewConvo && (
        <div className="bg-card rounded-xl border p-4 flex gap-2">
          <Input placeholder="Recipient email" value={newRecipientEmail} onChange={(e) => setNewRecipientEmail(e.target.value)} />
          <Button variant="hero" onClick={handleNewConvo}>Start</Button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 min-h-[400px]">
        {/* Conversations list */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="p-3 border-b font-heading font-semibold text-sm text-foreground">Conversations</div>
          <div className="divide-y max-h-[500px] overflow-auto">
            {conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No conversations yet.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.user_id}
                  onClick={() => setSelectedUser(c.user_id)}
                  className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${selectedUser === c.user_id ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm truncate">{c.user_name}</p>
                    {c.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{c.unread}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs truncate">{c.last_message}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="md:col-span-2 bg-card rounded-xl border flex flex-col">
          {selectedUser ? (
            <>
              <div className="p-3 border-b font-heading font-semibold text-sm text-foreground">
                {conversations.find((c) => c.user_id === selectedUser)?.user_name || "Chat"}
              </div>
              <div className="flex-1 p-4 overflow-auto space-y-3 max-h-[400px]">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                      {m.content}
                      <p className={`text-[10px] mt-1 ${m.sender_id === user?.id ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === "Enter" && handleSend()} />
                <Button variant="hero" size="icon" onClick={handleSend}><Send className="w-4 h-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation or start a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
