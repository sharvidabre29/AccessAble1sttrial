import { supabase } from "@/integrations/supabase/client";

export const getActiveVolunteerCount = async () => {
  try {
    const { data, error } = await supabase.from("service_requests").select("accepter_id").eq("status", "accepted");
    if (error) return { error };
    const ids = (data || []).map((r: any) => r.accepter_id).filter(Boolean);
    const unique = Array.from(new Set(ids));
    return { count: unique.length };
  } catch (err: any) {
    console.error("getActiveVolunteerCount failed", err);
    return { error: err };
  }
};

export default { getActiveVolunteerCount };
