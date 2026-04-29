import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Donor-facing organizations list (read-only)
const DonorOrgsList = () => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Prefer profiles where role = 'organization' as canonical org discovery
      const { data } = await supabase.from("profiles").select("id,organization_name as name,profile_image as image_url,is_verified,website").eq('role', 'organization').order("created_at", { ascending: false });
      const mapped = (data || []).map((p: any) => ({ id: p.id, name: p.name || p.organization_name || 'Organization', description: p.work || null, image_url: p.image_url || p.profile_image || null, is_verified: p.is_verified, website: p.website }));
      setOrgs(mapped || []);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="font-heading text-xl font-bold text-foreground">Organizations</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgs.map((o) => (
          <div key={o.id} className="bg-card rounded-xl border p-4 hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/dashboard/donor/orgs/${o.id}`)}>
            <div className="flex items-center gap-3">
              {o.image_url ? <img src={o.image_url} className="w-16 h-16 rounded-md object-cover" alt={o.name} /> : <div className="w-16 h-16 rounded-md bg-muted" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{o.name}</h3>
                  {o.is_verified && <Badge className="bg-success/10 text-success">Verified</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{o.description || "No description"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonorOrgsList;
