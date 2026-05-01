import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface OrgCard {
  id: string;
  organization_name?: string;
  avatar_url?: string | null;
  is_verified?: boolean;
}

const DonorOrgsList = () => {
  const [orgs, setOrgs] = useState<OrgCard[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, organization_name, avatar_url, is_verified")
        .eq("role", "organization")
        .order("created_at", { ascending: false });

      setOrgs((data || []) as OrgCard[]);
    };

    fetchOrgs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold">Organizations</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {orgs.map((o) => (
          <div key={o.id} className="bg-card rounded-xl border p-4 hover:shadow-lg transition cursor-pointer" onClick={() => navigate(`/dashboard/donor/orgs/${o.id}`)}>
            <div className="flex items-center gap-3">
              {o.avatar_url ? (
                <img src={o.avatar_url} alt={o.organization_name} className="w-16 h-16 rounded-md object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-md bg-muted" />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{o.organization_name || "Organization"}</h3>
                  {o.is_verified && <Badge className="bg-success/10 text-success">Verified</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{o.organization_name || "No description"}</p>
              </div>

              <div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonorOrgsList;

