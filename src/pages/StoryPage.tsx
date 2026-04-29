import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const StoryPage = () => {
  const [story, setStory] = useState<any | null>(null);
  const [allStories, setAllStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  useEffect(() => {
    let mounted = true;
    const fetchStories = async () => {
      try {
        const { data } = await supabase
          .from("stories")
          .select("*")
          .order("createdat", { ascending: false });

        if (!mounted) return;

        setStory(data?.[0] || null);
        setAllStories(data || []);
      } catch (err) {
        console.error(err);
        setStory(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStories();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">

      {/* 🔹 HERO SECTION */}
      <div className="relative h-[60vh] flex items-center justify-center text-center text-white">
        <img
          src="/images/community-help.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 px-6">
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
            Our Story
          </h1>
          <p className="max-w-2xl mx-auto text-lg opacity-90">
            Connecting people who need help with those who care enough to give it.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-6 py-12">

        {/* 🔹 BACK BUTTON */}
        <button
          className="text-sm text-primary underline mb-8 hover:opacity-80"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        {/* 🔹 LOADING */}
        {loading && <p>Loading story…</p>}

        {/* 🔹 DEFAULT STORY (MISSION SECTION) */}
        {!loading && !story && (
          <section className="text-center space-y-6 fade-in">
            <h2 className="text-3xl font-bold">Why We Started</h2>
            <p className="text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              It started with a simple realization — help exists, but it often
              doesn’t reach the people who need it most.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {["Need", "Gap", "Solution"].map((step, i) => (
                <div
                  key={i}
                  className="p-6 rounded-lg shadow-md bg-gradient-to-br from-blue-50 to-white hover:scale-105 transition"
                >
                  <h3 className="font-bold text-lg mb-2">{step}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step === "Need" && "People require timely help"}
                    {step === "Gap" && "But support doesn't reach them"}
                    {step === "Solution" && "AccessAble bridges that gap"}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🔹 FEATURED STORY */}
        {story && (
          <article className="mt-10 space-y-6 fade-in">
            {story.imageurl && (
              <img
                src={story.imageurl}
                alt={story.title}
                className="w-full h-[400px] object-cover rounded-xl shadow-lg"
              />
            )}

            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">{story.title}</h1>
              <p className="text-xs text-gray-500">
                {new Date(story.createdat).toLocaleString()}
              </p>
            </div>

            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-lg">
              {story.content}
            </p>
          </article>
        )}

        {/* 🔹 TIMELINE / IMPACT FLOW */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            How It Works
          </h2>

          <div className="space-y-6">
            {[
              "User requests help",
              "Request reaches community",
              "Donor/volunteer responds",
              "Impact is created",
            ].map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg shadow-sm"
              >
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white font-bold">
                  {i + 1}
                </div>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 🔹 MORE STORIES */}
        {allStories.length > 1 && (
          <>
            <h2 className="text-xl font-bold mt-16 mb-6 text-center">
              More Stories
            </h2>

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {allStories.slice(1).map((s) => (
                <div
                  key={s.id}
                  onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setStory(s); }}
                  className="cursor-pointer bg-white rounded-xl shadow hover:shadow-lg transition hover:-translate-y-1"
                >
                  {s.imageurl && (
                    <img
                      src={s.imageurl}
                      className="w-full h-40 object-cover rounded-t-xl"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-primary mb-2">
                      {s.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {s.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 🔹 CTA SECTION */}
        <div className="mt-20 text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-10 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-3">
            Be a Part of the Story
          </h2>
          <p className="mb-6 opacity-90">
            Every action counts. Join us in making a difference.
          </p>
          <button
            className="bg-white text-primary px-6 py-2 rounded-md font-semibold hover:scale-105 transition"
            onClick={() => {
              if (!user) navigate('/signup');
              else navigate(`/dashboard/${profile?.role || 'individual'}`);
            }}
          >
            Get Involved
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoryPage;