import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OrganizationsPage = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchOrgs = async () => {
      try {
        const { data } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
        if (!mounted) return;
        setOrgs(data || []);
      } catch (err) {
        setOrgs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchOrgs();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="container max-w-6xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-4">Organizations</h1>
        {loading && <p>Loading organizations…</p>}
        {!loading && orgs.length === 0 && <p>No organizations found.</p>}
        <div className="grid md:grid-cols-3 gap-6">
          {orgs.map((o) => (
            <div key={o.id} className="bg-card p-4 rounded-lg shadow-sm">
              {o.image_url && <img src={o.image_url} alt={o.name} className="w-full h-40 object-cover rounded-md mb-3" />}
              <h3 className="font-semibold text-lg">{o.name}</h3>
              <p className="text-sm text-muted-foreground">{o.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrganizationsPage;
