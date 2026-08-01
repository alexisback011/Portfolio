import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import {
  LogOut,
  Mail,
  Home,
  Trash2,
  Star,
  Camera,
  Users,
  Copy,
  Ban,
  ShieldCheck,
  Settings,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, formatApiErrorDetail } from "../context/AuthContext";
import { PROFILE } from "../data";
import { API } from "../lib/api";

const EASE = [0.85, 0, 0.15, 1];

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const resizeImage = (dataUrl, maxSize = 512) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const Profile = () => {
  const { user, loading, logout, updateProfileImage, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [expandedUser, setExpandedUser] = useState({});
  const [tab, setTab] = useState("profiles");
  const [uploading, setUploading] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [pForm, setPForm] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get(`${API}/admin/users`, { withCredentials: true });
        if (!cancelled) setUsers(data);
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    load();
    if (tab === "profiles") {
      const interval = setInterval(load, 10000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [isAdmin, tab]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const toggleUserLogins = (id) => {
    setExpandedUser((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const replaceUser = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const onBanUser = async (u) => {
    if (!window.confirm(`Ban ${u.name} (${u.email})? They will be locked out immediately.`)) return;
    try {
      const { data } = await axios.patch(
        `${API}/admin/users/${u.id}/ban`,
        {},
        { withCredentials: true }
      );
      replaceUser(data);
      toast.success(`${u.name} banned.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not ban user.");
    }
  };

  const onUnbanUser = async (u) => {
    if (!window.confirm(`Unban ${u.name}? They will be able to log in again.`)) return;
    try {
      const { data } = await axios.patch(
        `${API}/admin/users/${u.id}/unban`,
        {},
        { withCredentials: true }
      );
      replaceUser(data);
      toast.success(`${u.name} unbanned.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not unban user.");
    }
  };

  const onDeleteUser = async (u) => {
    if (
      !window.confirm(
        `Delete ${u.name} (${u.email}) permanently? Their reviews and login history will be removed too.`
      )
    )
      return;
    try {
      await axios.delete(`${API}/admin/users/${u.id}`, { withCredentials: true });
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`${u.name} deleted.`);
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not delete user.");
    }
  };

  useEffect(() => {
    if (user) {
      setPForm((f) => ({ ...f, name: user.name || "", email: user.email || "" }));
    }
  }, [user]);

  const onSaveProfile = async (e) => {
    e.preventDefault();
    const fields = { name: pForm.name.trim(), email: pForm.email.trim() };
    if (pForm.newPassword) {
      if (pForm.newPassword.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
      fields.password = pForm.newPassword;
    }
    if (pForm.currentPassword || fields.password || pForm.email.trim() !== user?.email) {
      fields.current_password = pForm.currentPassword;
    }
    setSavingProfile(true);
    try {
      await updateProfile(fields);
      setPForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onLogout = async () => {
    await logout();
    toast.success("Signed out.");
    navigate("/");
  };

  const onSubmitReview = async (e) => {
    e.preventDefault();
    if (!review.comment.trim()) {
      toast.error("Please add a comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      await axios.post(
        `${API}/review`,
        { rating: review.rating, comment: review.comment },
        { withCredentials: true }
      );
      setReview({ rating: 5, comment: "" });
      toast.success("Review posted. Thanks for the feedback!");
    } catch {
      toast.error("Could not post review.");
    } finally {
      setSubmittingReview(false);
    }
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
    if (!isAdmin || tab !== "reviews") return;
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
  }, [tab, isAdmin]);

  const onDeleteReview = async (id) => {
    try {
      await axios.delete(`${API}/review/${id}`, { withCredentials: true });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted.");
    } catch {
      toast.error("Could not delete review.");
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const raw = await readAsDataUrl(file);
      const small = await resizeImage(raw);
      await updateProfileImage(small);
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not update profile picture.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
          <div className="flex items-center gap-3">
            <button
              data-testid="manage-profile-btn"
              onClick={() => setManageOpen((v) => !v)}
              className={`inline-flex items-center gap-2 border px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                manageOpen
                  ? "border-secondary bg-secondary text-black"
                  : "border-white/20 hover:border-secondary hover:text-secondary"
              }`}
            >
              <Settings size={14} /> Manage Profile
            </button>
            <button
              data-testid="logout-btn"
              onClick={onLogout}
              className="group inline-flex items-center gap-2 border border-white/20 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-colors"
            >
              Logout <LogOut size={14} />
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-16 flex flex-col md:flex-row md:items-center gap-8"
        >
          <div className="relative shrink-0">
            <div className="h-28 w-28 md:h-32 md:w-32 rounded-full border border-white/20 overflow-hidden bg-white/5">
              {user.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={`${user.name} profile`}
                  data-testid="profile-avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  data-testid="profile-avatar"
                  className="h-full w-full flex items-center justify-center font-display text-4xl font-black text-primary"
                >
                  {user.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="profile-avatar-input"
              onChange={onFileChange}
            />
            <button
              data-testid="profile-avatar-upload"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-primary text-black flex items-center justify-center border-2 border-background hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {uploading ? (
                <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <Camera size={16} />
              )}
            </button>
          </div>

          <div>
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
          </div>
        </motion.div>

        {manageOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="mt-10 border border-white/15 p-8"
            data-testid="manage-profile-panel"
          >
            <div className="flex items-center gap-3">
              <Settings size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Manage Profile</span>
              <span className="h-px flex-1 bg-white/15" />
            </div>

            <form
              onSubmit={onSaveProfile}
              data-testid="manage-profile-form"
              className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7"
            >
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Name
                </span>
                <input
                  name="name"
                  value={pForm.name}
                  onChange={(e) => setPForm((f) => ({ ...f, name: e.target.value }))}
                  data-testid="manage-name"
                  className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base font-light transition-colors duration-200"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Email
                </span>
                <input
                  type="email"
                  name="email"
                  value={pForm.email}
                  onChange={(e) => setPForm((f) => ({ ...f, email: e.target.value }))}
                  data-testid="manage-email"
                  className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base font-light transition-colors duration-200"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Current Password
                </span>
                <input
                  type="password"
                  name="currentPassword"
                  value={pForm.currentPassword}
                  onChange={(e) => setPForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Required to change email or password"
                  data-testid="manage-current-password"
                  className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base font-light transition-colors duration-200"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  New Password
                </span>
                <input
                  type="password"
                  name="newPassword"
                  value={pForm.newPassword}
                  onChange={(e) => setPForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current"
                  data-testid="manage-new-password"
                  className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base font-light transition-colors duration-200"
                />
              </label>

              <div className="md:col-span-2 flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  data-testid="manage-save"
                  className="inline-flex items-center gap-3 bg-primary text-black px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
                >
                  <Save size={14} />
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setManageOpen(false)}
                  className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mt-10 border border-white/15 p-8"
          data-testid="dashboard-review-section"
        >
            <div className="flex items-center gap-3">
              <Star size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Submit Review</span>
              <span className="h-px flex-1 bg-white/15" />
            </div>

            <form
              onSubmit={onSubmitReview}
              data-testid="dashboard-review-form"
              className="mt-6 flex flex-col gap-5"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Rating
                </span>
                <div className="mt-3 flex items-center gap-2" data-testid="dashboard-review-rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      onClick={() => setReview((f) => ({ ...f, rating: n }))}
                      className="transition-transform hover:scale-125"
                    >
                      <Star
                        size={26}
                        strokeWidth={n <= review.rating ? 2 : 1}
                        className={
                          n <= review.rating
                            ? "fill-primary text-primary"
                            : "fill-transparent text-white/25"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Comment
                </span>
                <textarea
                  value={review.comment}
                  onChange={(e) => setReview((f) => ({ ...f, comment: e.target.value }))}
                  rows={3}
                  placeholder="What did you think?"
                  data-testid="dashboard-review-comment"
                  className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base font-light resize-none transition-colors duration-200"
                />
              </label>

              <button
                type="submit"
                disabled={submittingReview}
                data-testid="dashboard-review-submit"
                className="inline-flex items-center justify-center gap-3 bg-primary text-black px-6 py-4 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
              >
                {submittingReview ? (
                  <span className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  "Post Review"
                )}
              </button>
            </form>
        </motion.div>

        {isAdmin && (
          <div className="mt-16 flex flex-wrap items-center gap-4">
            {[
              { key: "profiles", label: "Profiles", icon: Users, count: users.length },
              { key: "messages", label: "Messages", icon: Mail, count: messages.length },
              { key: "reviews", label: "Reviews", icon: Star, count: reviews.length },
            ].map((t) => (
              <button
                key={t.key}
                data-testid={`tab-${t.key}`}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 border px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                  tab === t.key
                    ? "border-primary bg-primary text-black"
                    : "border-white/20 text-muted-foreground hover:border-white/40 hover:text-foreground"
                }`}
              >
                <t.icon size={14} />
                {t.label}
                <span className={tab === t.key ? "text-black/70" : "text-muted-foreground"}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {isAdmin && tab === "messages" && (
          <div className="mt-10">
            <div className="flex items-center gap-3">
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
          </div>
        )}

        {isAdmin && tab === "reviews" && (
          <div className="mt-10">
            <div className="flex items-center gap-3">
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
                            <Star
                              key={n}
                              size={12}
                              strokeWidth={n <= r.rating ? 2 : 1}
                              className={
                                n <= r.rating
                                  ? "fill-primary text-primary"
                                  : "fill-transparent text-white/25"
                              }
                            />
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
        )}

        {isAdmin && tab === "profiles" && (
          <div className="mt-10">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">Registered Profiles</span>
              <span className="h-px flex-1 bg-white/15" />
              <span className="text-xs font-bold text-muted-foreground">{users.length}</span>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="profiles-inbox">
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground font-light">Loading...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground font-light">
                  No registered users yet. Signups appear here.
                </p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    data-testid={`profile-card-${u.id}`}
                    className="border border-white/15 hover:border-primary transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-full border border-white/20 overflow-hidden bg-white/5 shrink-0">
                          {u.profile_image ? (
                            <img
                              src={u.profile_image}
                              alt={`${u.name} avatar`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-display text-lg font-black text-primary">
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-display font-bold uppercase tracking-tight">
                              {u.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                                u.role === "admin" ? "text-primary" : "text-secondary"
                              }`}
                            >
                              {u.role}
                            </span>
                            {u.is_banned && (
                              <span className="border border-destructive/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">
                                Banned
                              </span>
                            )}
                          </div>
                          <a
                            href={`mailto:${u.email}`}
                            className="mt-1 block text-xs text-secondary hover:text-primary transition-colors"
                          >
                            {u.email}
                          </a>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </span>
                        {u.role === "admin" ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                            Protected
                          </span>
                        ) : (
                          <button
                            data-testid={`delete-user-${u.id}`}
                            onClick={() => onDeleteUser(u)}
                            aria-label={`Delete ${u.name}`}
                            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                        {u.role !== "admin" &&
                          (u.is_banned ? (
                            <button
                              data-testid={`unban-${u.id}`}
                              onClick={() => onUnbanUser(u)}
                              className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-secondary hover:border-secondary hover:text-foreground transition-colors"
                            >
                              <ShieldCheck size={12} /> Unban
                            </button>
                          ) : (
                            <button
                              data-testid={`ban-${u.id}`}
                              onClick={() => onBanUser(u)}
                              className="inline-flex items-center gap-1.5 border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
                            >
                              <Ban size={12} /> Ban
                            </button>
                          ))}
                      </div>
                    </div>

                    <div className="border-t border-white/10 px-6 py-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                          ID
                        </span>
                        <code className="truncate font-mono text-[11px] text-foreground/70">
                          {u.id}
                        </code>
                        <button
                          data-testid={`copy-id-${u.id}`}
                          onClick={() => copyToClipboard(u.id, "User ID")}
                          aria-label="Copy user ID"
                          className="ml-auto text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-14 shrink-0 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                          Hash
                        </span>
                        <code className="truncate font-mono text-[11px] text-foreground/70">
                          {u.password_hash}
                        </code>
                        <button
                          data-testid={`copy-hash-${u.id}`}
                          onClick={() => copyToClipboard(u.password_hash, "Password hash")}
                          aria-label="Copy password hash"
                          className="ml-auto text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="flex gap-2 pt-1 text-xs font-light text-muted-foreground">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
                          logins
                        </span>
                        <span>
                          {u.login_count} · last{" "}
                          {u.last_login ? new Date(u.last_login).toLocaleString() : "never"}
                        </span>
                      </div>
                    </div>

                    <button
                      data-testid={`toggle-logins-${u.id}`}
                      onClick={() => toggleUserLogins(u.id)}
                      className="w-full border-t border-white/10 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                    >
                      {expandedUser[u.id]
                        ? "Hide login history"
                        : `View login history (${u.logins.length})`}
                    </button>
                    {expandedUser[u.id] && (
                      <div className="border-t border-white/10 px-6 py-4 space-y-4 max-h-64 overflow-y-auto">
                        {u.logins.length === 0 ? (
                          <p className="text-xs font-light text-muted-foreground">
                            No recorded logins.
                          </p>
                        ) : (
                          u.logins.map((l) => (
                            <div key={l.id} className="text-xs">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-secondary">
                                  {l.ip_address || "unknown ip"}
                                </span>
                                <span className="shrink-0 text-muted-foreground/60">
                                  {new Date(l.created_at).toLocaleString()}
                                </span>
                              </div>
                              {l.device && (
                                <p className="mt-1 truncate font-light text-muted-foreground/80">
                                  {l.device}
                                </p>
                              )}
                              {l.user_agent && (
                                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/50">
                                  {l.user_agent}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
