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