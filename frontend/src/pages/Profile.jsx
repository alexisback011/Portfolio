import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { LogOut, Mail, Home, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { PROFILE } from "../data";
import { API } from "../lib/api";

const EASE = [0.85, 0, 0.15, 1];

const Profile = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/contact`, { withCredentials: true });
        if (!cancelled) setMessages(data);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const onLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/");
  };

  const onDelete = async (id) => {
    try {
      await axios.delete(`${API}/contact/${id}`, { withCredentials: true });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success("Message deleted.");
    } catch {
      toast.error("Could not delete message.");
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/review`, { withCredentials: true });
        if (!cancelled) setReviews(data);
      } catch {
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoadingReviews(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDeleteReview = async (id) => {
    try {
      await axios.delete(`${API}/review/${id}`, { withCredentials: true });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted.");
    } catch {
      toast.error("Could not delete review.");
    }
  };

  if (loading) return null;
  if (!user || !user.id) return null;

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="noise-overlay" />
      <div className="absolute inset-0 grid-bg opacity-25 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-[1400px] px-6 md:px-10 py-10">
        <div className="flex items-center justify-between">
          <button
            data-testid="profile-home"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
          >
            <Home size={14} /> {PROFILE.name}
          </button>
          <button
            data-testid="logout-btn"
            onClick={onLogout}
            className="group inline-flex items-center gap-2 border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-colors"
          >
            Logout <LogOut size={14} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-16"
        >
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            [ SIGNED IN ]
          </span>
          <h1
            data-testid="profile-name"
            className="mt-4 font-display text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none"
          >
            {user.name}
          </h1>
          <p data-testid="profile-email" className="mt-4 text-base font-light text-muted-foreground">
            {user.email} · <span className="text-primary uppercase">{user.role}</span>
          </p>
        </motion.div>

        <div className="mt-20 flex items-center gap-3">
          <Mail size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Message Inbox</span>
          <span className="h-px flex-1 bg-white/15" />
          <span className="text-xs font-bold text-muted-foreground">{messages.length}</span>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="inbox">
          {loadingMsgs ? (
            <p className="text-sm text-muted-foreground font-light">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground font-light">
              No messages yet. Submissions from the contact form appear here.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                data-testid={`message-${m.id}`}
                className="border border-white/15 p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase tracking-tight">{m.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </span>
                    <button
                      data-testid={`delete-${m.id}`}
                      onClick={() => onDelete(m.id)}
                      aria-label={`Delete message from ${m.name}`}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <a
                  href={`mailto:${m.email}`}
                  className="mt-1 block text-xs text-secondary hover:text-primary transition-colors"
                >
                  {m.email}
                </a>
                <p className="mt-4 text-sm font-light text-muted-foreground leading-relaxed">
                  {m.message}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-20 flex items-center gap-3">
          <Star size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Reviews</span>
          <span className="h-px flex-1 bg-white/15" />
          <span className="text-xs font-bold text-muted-foreground">{reviews.length}</span>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="reviews-inbox">
          {loadingReviews ? (
            <p className="text-sm text-muted-foreground font-light">Loading...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground font-light">
              No reviews yet. Viewer comments appear here.
            </p>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                data-testid={`admin-review-${r.id}`}
                className="border border-white/15 p-6 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold uppercase tracking-tight">{r.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <motion.span
                          key={n}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 16,
                            delay: n * 0.06,
                          }}
                        >
                          <Star
                            size={12}
                            strokeWidth={n <= r.rating ? 2 : 1}
                            className={`star-glitch ${
                              n <= r.rating
                                ? "fill-primary text-primary"
                                : "fill-transparent text-white/25"
                            }`}
                          />
                        </motion.span>
                      ))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                    <button
                      data-testid={`delete-review-${r.id}`}
                      onClick={() => onDeleteReview(r.id)}
                      aria-label={`Delete review from ${r.name}`}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-sm font-light text-muted-foreground leading-relaxed">
                  {r.comment}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
