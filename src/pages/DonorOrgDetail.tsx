import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

// Donor-facing organization detail (read-only view with View Requests filter)
const DonorOrgDetail = ({ id }: { id: string }) => {
  const navigate = useNavigate();
  const [org, setOrg] = useState<any | null>(null);
  const [updates, setUpdates] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Prefer profile record for organization discovery; fall back to organizations table for extended metadata
      const { data: profile } = await supabase.from("profiles").select("*, profile_image as image_url").eq("id", id).maybeSingle();
      let merged: any = profile || null;
      if (merged) {
        // try to fetch organization row for richer fields if it exists
        const { data: orgMeta } = await supabase.from("organizations").select("work,impact,campaigns,description,website").eq("id", id).maybeSingle();
        merged = { ...merged, ...(orgMeta || {}) };
      } else {
        const { data: o } = await supabase.from("organizations").select("*").eq("id", id).maybeSingle();
        merged = o || null;
      }
      setOrg(merged || null);
      const { data: ups } = await supabase.from("organization_updates").select("*").eq("org_id", id).order("created_at", { ascending: false });
      setUpdates(ups || []);
    };
    fetch();
  }, [id]);

  if (!org) return <div className="p-4">Organization not found</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border p-6">
        <h2 className="font-heading text-2xl font-bold">{org.name}</h2>
        <p className="text-muted-foreground mt-2">{org.description}</p>
        {org.website && (
          <div className="mt-3">
            <a href={org.website} target="_blank" rel="noreferrer" className="text-primary underline">Visit Website</a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Our Work</h3>
          <Textarea value={org.work || ""} readOnly rows={4} />
        </div>

        <div className="bg-card rounded-xl border p-4">
          <h3 className="font-semibold mb-2">Impact</h3>
          <Textarea value={org.impact || ""} readOnly rows={4} />
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-semibold mb-2">Campaigns</h3>
        <Textarea value={org.campaigns || ""} readOnly rows={3} />
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h3 className="font-semibold mb-2">Gallery</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {updates.map((u) => (
            <img key={u.id} src={u.image_url} className="w-full h-28 object-cover rounded-md" />
          ))}
        </div>
      </div>

      <div>
        <Button onClick={() => navigate(`/dashboard/donor/requests?org=${id}`)}>View Requests</Button>
      </div>
    </div>
  );
};

export default DonorOrgDetail;
