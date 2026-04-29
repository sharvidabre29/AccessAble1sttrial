import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const StoryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [story, setStory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStory = async () => {
      try {
        const { data } = await supabase.from('stories').select('*').eq('id', id).maybeSingle();
        if (!mounted) return;
        setStory(data || null);
      } catch (err) {
        console.error(err);
        setStory(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStory();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!story) return <div className="min-h-screen flex items-center justify-center">Story not found</div>;

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <button className="text-sm text-primary underline mb-4" onClick={() => navigate(-1)}>← Back</button>
        {story.imageurl && <img src={story.imageurl} className="w-full h-64 object-cover rounded-md mb-4" />}
        <h1 className="text-3xl font-heading font-bold mb-2">{story.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{new Date(story.createdat).toLocaleString()}</p>
        <div className="prose max-w-none text-foreground whitespace-pre-wrap">{story.content}</div>
      </div>
    </div>
  );
};

export default StoryDetail;
