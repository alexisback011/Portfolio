import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { API } from "../../lib/api";

const EASE = [0.85, 0, 0.15, 1];

const Stars = ({ value, size = 14 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <motion.span
        key={n}
        className={n <= value ? "star-glow" : ""}
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: n * 0.06 }}
      >
        <Star
          size={size}
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
  const [form, setForm] = useState({ name: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/review`);
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

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.comment.trim()) {
      toast.error("Please add your name and a comment.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/review`, {
        name: form.name,
        rating: form.rating,
        comment: form.comment,
      });
      setReviews((prev) => [data, ...prev]);
      setForm({ name: "", rating: 5, comment: "" });
      toast.success("Review posted. Thanks for the feedback!");
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
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
          <div className="md:col-span-5">
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
                className="mt-8 inline-flex items-center gap-3 border border-white/20 px-4 py-3 hover:border-primary transition-colors"
              >
                <span className="font-display text-sm md:text-base font-medium leading-none text-foreground">
                  {reviews.length}
                </span>
                <div className="space-y-1">
                  <span className="block text-xs font-bold uppercase tracking-[0.3em] text-foreground">
                    {reviews.length === 1 ? "review" : "reviews"}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    from the community
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <form
            onSubmit={onSubmit}
            data-testid="review-form"
            className="md:col-span-6 md:col-start-7 flex flex-col gap-6"
          >
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                01 / Your Name
              </span>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder=""
                data-testid="review-name"
                className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base md:text-lg font-light transition-colors duration-200"
              />
            </label>

            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                02 / Rating
              </span>
              <div className="mt-3 flex items-center gap-2" data-testid="review-rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? "s" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, rating: n }))}
                    className={n <= form.rating ? "star-glow" : ""}
                    whileHover={{ scale: 1.25, rotate: n <= form.rating ? 12 : 0 }}
                    whileTap={{ scale: 0.85 }}
                    animate={{ scale: n <= form.rating ? 1.15 : 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Star
                      size={28}
                      className={`star-glitch ${
                        n <= form.rating
                          ? "fill-primary text-primary"
                          : "fill-transparent text-white/25"
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                03 / Comment
              </span>
              <textarea
                name="comment"
                value={form.comment}
                onChange={onChange}
                rows={3}
                placeholder="What did you think?"
                data-testid="review-comment"
                className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base md:text-lg font-light resize-none transition-colors duration-200"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              data-testid="review-submit"
              className="group inline-flex items-center justify-center gap-3 bg-primary text-black px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Post Review"
              )}
            </button>
          </form>
        </div>

        <div
          className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="reviews-list"
        >
          {loading ? (
            <p className="text-sm text-muted-foreground font-light">
              Loading reviews...
            </p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground font-light">
              No reviews yet. Be the first to leave one.
            </p>
          ) : (
            reviews.map((r, i) => (
              <motion.div
                key={r.id}
                data-testid={`review-${r.id}`}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE, delay: (i % 3) * 0.06 }}
                className="border border-white/15 p-5 hover:border-primary transition-colors flex flex-col gap-3"
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
                <span className="font-display font-bold uppercase tracking-tight text-sm">
                  — {r.name}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
