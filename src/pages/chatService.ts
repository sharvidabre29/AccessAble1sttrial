import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all conversations for a user (volunteer / individual / donor etc.)
 */
export const fetchConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(
      `individual_id.eq.${userId},volunteer_id.eq.${userId}`
    )
    .order("created_at", { ascending: false });

  return { data, error };
};

/**
 * Create or get existing conversation for a request
 * Ensures both volunteer and individual IDs are provided
 * Only creates conversations for accepted tasks
 */
export const getOrCreateConversation = async (
  requestId: string,
  volunteerId: string,
  individualId: string
) => {
  if (!requestId || !volunteerId || !individualId) {
    const errMsg = `Missing required fields: requestId=${requestId}, volunteerId=${volunteerId}, individualId=${individualId}`;
    console.error(errMsg);
    return {
      data: null,
      error: new Error(errMsg),
    };
  }

  try {
    console.log("Creating/fetching conversation for:", {
      requestId,
      volunteerId,
      individualId,
    });

    // Check if conversation already exists
    const { data: existingConversation, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("request_id", requestId)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching existing conversation:", fetchError);
      return { data: null, error: fetchError };
    }

    if (existingConversation) {
      console.log("Conversation already exists:", existingConversation);
      return { data: existingConversation, error: null };
    }

    // Create new conversation
    console.log("Creating new conversation...");
    const { data: newConversation, error: createError } = await supabase
      .from("conversations")
      .insert([
        {
          request_id: requestId,
          individual_id: individualId,
          volunteer_id: volunteerId,
        },
      ])
      .select()
      .single();

    if (createError) {
      console.error("Error creating conversation:", createError);
      return { data: null, error: createError };
    }

    console.log("Conversation created successfully:", newConversation);
    return { data: newConversation, error: null };
  } catch (err) {
    console.error("Unexpected error in getOrCreateConversation:", err);
    return { data: null, error: err as Error };
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string,
  requestId?: string
) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          receiver_id: receiverId,
          content: content.trim(),
          is_read: false,
          request_id: requestId || null,
        },
      ]);

    return { data, error };
  } catch (err) {
    return { data: null, error: err as Error };
  }
};

/**
 * Fetch messages for a conversation
 */
export const fetchMessages = async (conversationId: string) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return { data, error };
  } catch (err) {
    return { data: null, error: err as Error };
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
) => {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("conversation_id", conversationId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    return { error };
  } catch (err) {
    return { error: err as Error };
  }
};