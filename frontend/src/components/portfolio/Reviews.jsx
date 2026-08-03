import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";
import { Star, BadgeCheck, Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { API } from "../../lib/api";

const EASE = [0.85, 0, 0.15, 1];

const Stars = ({ value, size = 14 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <motion.span
        key={n}
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: n * 0.06 }}
      >
        <Star
          size={size}
          strokeWidth={n <= value ? 2 : 1}
          className={`star-glitch ${
            n <= value ? "fill-primary text-primary" : "fill-transparent text-white/25"
          }`}
        />
      </motion.span>
    ))}
  </div>
);

export const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/review`, { withCredentials: true });
        if (!cancelled) setReviews(data);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const toggleLike = async (r) => {
    if (!user) {
      toast.info("Sign in to like reviews.");
      navigate("/login");
      return;
    }
    const target = !r.liked;
    const delta = target ? 1 : -1;
    setReviews((prev) =>
      prev.map((x) =>
        x.id === r.id ? { ...x, liked: target, likes: Math.max(0, (x.likes || 0) + delta) } : x
      )
    );
    try {
      await axios({
        method: target ? "post" : "delete",
        url: `${API}/review/${r.id}/like`,
        withCredentials: true,
      });
    } catch {
      setReviews((prev) => prev.map((x) => (x.id === r.id ? { ...x, liked: r.liked, likes: r.likes || 0 } : x)));
      toast.error("Could not update like.");
    }
  };

  return (
    <section
      id="reviews"
      data-testid="reviews-section"
      className="relative py-16 md:py-24 px-6 md:px-10 border-t border-white/10"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            [ REVIEWS ]
          </span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-12">
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-display font-black uppercase tracking-tighter leading-[0.85] text-4xl md:text-5xl"
            >
              Word
              <br />
              <span className="text-stroke-primary">on the</span>
              <br />
              street.
            </motion.h2>

            {reviews.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
                className="mt-8 inline-flex items-start gap-3 border border-white/20 px-4 py-3 hover:border-primary transition-colors"
              >
                <span className="pt-0.5 font-display text-sm md:text-base font-medium leading-none text-foreground">
                  {reviews.length}
                </span>
                <div className="space-y-1">
                  <span className="block text-xs font-bold uppercase leading-none tracking-[0.3em] text-foreground">
                    {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    from the community
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="mt-12" data-testid="reviews-list">
          {loading ? (
            <p className="text-sm text-muted-foreground font-light">
              Loading reviews...
            </p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground font-light">
              No reviews yet. Be the first to leave one.
            </p>
          ) : (
            <Marquee speed={35} gradient={false} pauseOnHover>
              {reviews.map((r) => (
                <div
                  key={r.id}
                  data-testid={`review-${r.id}`}
                  className="mx-3 w-[300px] md:w-[340px] shrink-0 border border-white/15 p-5 hover:border-primary transition-colors flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <Stars value={r.rating} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="flex-1 text-sm font-light text-muted-foreground leading-relaxed">
                    "{r.comment}"
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full border border-white/20 overflow-hidden bg-white/5 shrink-0">
                        {r.profile_image ? (
                          <img
                            src={r.profile_image}
                            alt={`${r.name} avatar`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] font-black text-primary">
                            {r.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-display font-bold uppercase tracking-tight text-sm">
                          {r.name}
                        </span>
                        {r.is_verified && (
                          <BadgeCheck size={14} className="text-primary shrink-0" aria-label="Verified member" />
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleLike(r)}
                      aria-label={r.liked ? "Unlike this review" : "Like this review"}
                      className="relative inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] transition-colors hover:text-primary"
                    >
                      <Heart
                        size={14}
                        className={r.liked ? "fill-primary text-primary" : "text-white/40 hover:text-primary"}
                      />
                      {r.liked && user && (
                        <span className="absolute -top-1 -right-1.5 h-4 w-4 overflow-hidden rounded-full border border-white/40 bg-white/10 ring-2 ring-background">
                          {user.profile_image ? (
                            <img
                              src={user.profile_image}
                              alt={`${user.name} avatar`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[7px] font-black text-primary">
                              {user.name?.[0]?.toUpperCase()}
                            </span>
                          )}
                        </span>
                      )}
                      <span className={r.liked ? "text-primary" : "text-white/40"}>
                        {r.likes || 0}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </Marquee>
          )}
        </div>
      </div>
    </section>
  );
};
