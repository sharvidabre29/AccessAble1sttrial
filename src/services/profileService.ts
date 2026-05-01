import { supabase } from "@/integrations/supabase/client";

export const uploadAvatar = async (profileId: string, file: File) => {
  try {
    const bucket = "avatars";
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${profileId}/profile_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: true });
    if (uploadErr) {
      console.error("Avatar upload error", uploadErr);
      if ((uploadErr.message || '').toLowerCase().includes('bucket')) {
        return { error: new Error(`Storage bucket '${bucket}' not found. Create the bucket in Supabase storage or configure the correct bucket name.`) };
      }
      return { error: uploadErr };
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = (data as any).publicUrl || null;

    if (publicUrl) {
      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profileId);
      if (error) {
        console.error("Failed to update profiles.avatar_url", error);
        return { error };
      }
    }

    return { url: publicUrl };
  } catch (err: any) {
    console.error("uploadAvatar failed", err);
    return { error: err };
  }
};

export default { uploadAvatar };
