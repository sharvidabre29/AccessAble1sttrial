import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type RequestRow = Database["public"]["Tables"]["service_requests"]["Row"];

/* ---------------------------
   FETCH REQUESTS
----------------------------*/
export const fetchRequests = async (opts: {
  status?: string | string[];
  assigned_to?: string;
  created_by?: string;
} = {}) => {
  let query = supabase
    .from("service_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (opts.status) {
    query = Array.isArray(opts.status)
      ? query.in("status", opts.status)
      : query.eq("status", opts.status);
  }

  if (opts.assigned_to) {
    query = query.eq("assigned_to", opts.assigned_to);
  }

  if (opts.created_by) {
    query = query.eq("created_by", opts.created_by);
  }

  return query;
};

/* ---------------------------
   ACCEPT REQUEST + AUTO CHAT
----------------------------*/
export const acceptRequest = async (requestId: string, volunteerId: string) => {
  try {
    // 1. Update request
    const { error: updateError } = await supabase
      .from("service_requests")
      .update({
        assigned_to: volunteerId,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) return { error: updateError };

    // 1b. Track the volunteer assignment so the task can show real volunteer counts/names
    const { error: assignmentError } = await supabase
      .from("volunteer_assignments")
      .upsert(
        {
          request_id: requestId,
          volunteer_id: volunteerId,
          status: "accepted",
        },
        { onConflict: "request_id,volunteer_id" }
      );

    if (assignmentError) return { error: assignmentError };

    // 2. Get request creator
    const { data: request, error: reqError } = await supabase
      .from("service_requests")
      .select("created_by")
      .eq("id", requestId)
      .single();

    if (reqError || !request) return { error: reqError };

    // 3. CHECK IF CONVERSATION ALREADY EXISTS (KEY FIX)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("request_id", requestId)
      .maybeSingle();

    let conversation;

    if (existing) {
      conversation = existing;
    } else {
      const { data, error: convoError } = await supabase
        .from("conversations")
        .insert({
          request_id: requestId,
          individual_id: request.created_by,
          volunteer_id: volunteerId,
        })
        .select()
        .single();

      if (convoError) return { error: convoError };

      conversation = data;
    }

    // 4. Notification
    await supabase.from("notifications").insert({
      user_id: request.created_by,
      title: "Request Accepted",
      message: "A volunteer has accepted your request",
      type: "accepted",
      related_request_id: requestId,
      related_user_id: volunteerId,
    });

    return {
      success: true,
      conversationId: conversation.id,
    };

  } catch (err: any) {
    console.error(err);
    return { error: err };
  }
};

/* ---------------------------
   DELETE REQUEST
----------------------------*/
export const deleteRequest = async (
  requestId: string,
  userId: string
) => {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .delete()
      .select("id")
      .eq("id", requestId)
      .eq("created_by", userId)
      .maybeSingle();

    if (error) return { error };

    if (!data) {
      return {
        error: new Error("Delete affected 0 rows (RLS or permission issue)"),
      };
    }

    return { data };
  } catch (err: any) {
    return { error: err };
  }
};
export const subscribeToRequests = (callback: (payload: any) => void) => {
  const channel = supabase
    .channel("service_requests_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "service_requests",
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
};

/* ---------------------------
   UPDATE REQUEST
----------------------------*/
export const updateRequest = async (
  requestId: string,
  userId: string,
  updates: Partial<RequestRow>
) => {
  try {
    const { data, error } = await supabase
      .from("service_requests")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("created_by", userId)
      .select()
      .single();

    if (error) return { error };

    return { data };
  } catch (err: any) {
    return { error: err };
  }
};

/* ---------------------------
   EXPORT ALL
----------------------------*/
export default {
  fetchRequests,
  acceptRequest,
  subscribeToRequests,
  deleteRequest,
  updateRequest,
};