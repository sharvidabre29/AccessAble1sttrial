import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MissionPage = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchTeam = async () => {
      try {
        const { data } = await supabase.from("team_members").select("*").order("created_at", { ascending: false });
        if (!mounted) return;
        setTeam(data || []);
      } catch (err) {
        setTeam([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTeam();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="container max-w-5xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-4">Our Mission</h1>
        <p className="text-muted-foreground mb-8">AccessAble empowers communities by connecting people who need help with volunteers, donors, and organizations. We build tools that scale support with trust, accessibility, and transparency.</p>

        <h2 className="font-heading text-2xl font-bold mb-4">Team</h2>
        {loading && <p>Loading team...</p>}
        {!loading && team.length === 0 && <p>No team members found.</p>}
        <div className="grid md:grid-cols-3 gap-6">
          {team.map((m) => (
            <div key={m.id} className="bg-card p-4 rounded-lg shadow-sm">
              {m.image_url && <img src={m.image_url} alt={m.name} className="w-full h-40 object-cover rounded-md mb-3" />}
              <h3 className="font-semibold text-lg">{m.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">{m.role}</p>
              <p className="text-sm text-muted-foreground">{m.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MissionPage;
