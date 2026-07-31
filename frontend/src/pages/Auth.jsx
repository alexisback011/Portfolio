import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth, formatApiErrorDetail } from "../context/AuthContext";
import { PROFILE } from "../data";

const EASE = [0.85, 0, 0.15, 1];

const Auth = () => {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.id) navigate("/profile");
  }, [user, navigate]);

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setForm((f) => ({ ...f, password: "" }));
  };

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "signup" && form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await register(form.name.trim(), form.email.trim(), form.password);
        toast.success("Account created. Welcome!");
      } else {
        await login(form.email.trim(), form.password);
        toast.success("Welcome back.");
      }
      navigate("/profile");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base md:text-lg font-light transition-colors duration-200";

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col">
      <div className="noise-overlay" />
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />

      <div className="px-6 md:px-10 pt-8">
        <Link
          to="/"
          data-testid="back-home"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="w-full max-w-md relative z-10"
        >
          <span className="font-display text-2xl font-black tracking-tighter">
            {PROFILE.name}
            <span className="text-primary">.</span>
          </span>
          <h1
            data-testid="auth-title"
            className="mt-6 font-display text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none"
          >
            {mode === "signup" ? "Create Account" : "Sign In"}
          </h1>
          <p className="mt-3 text-sm font-light text-muted-foreground">
            {mode === "signup" ? "Join the community. Get your own profile." : "Access your space."}
          </p>

          <div className="mt-8 flex gap-3">
            {[
              { key: "login", label: "Sign In" },
              { key: "signup", label: "Sign Up" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                data-testid={`auth-mode-${t.key}`}
                onClick={() => switchMode(t.key)}
                className={`border px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                  mode === t.key
                    ? "border-primary bg-primary text-black"
                    : "border-white/20 text-muted-foreground hover:border-white/40 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} data-testid="auth-form" className="mt-10 flex flex-col gap-7">
            {mode === "signup" && (
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Name
                </span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={onChange}
                  placeholder="Your name"
                  data-testid="auth-name"
                  className={inputCls}
                  required
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@email.com"
                data-testid="auth-email"
                className={inputCls}
                required
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                placeholder={mode === "signup" ? "Minimum 6 characters" : "••••••••"}
                data-testid="auth-password"
                className={inputCls}
                required
              />
            </label>

            {error && (
              <p data-testid="auth-error" className="text-sm text-destructive font-light">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="auth-submit"
              className="group inline-flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Create Account" : "Sign In"}
                  <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm font-light text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              type="button"
              data-testid="auth-toggle"
              onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
              className="text-secondary hover:text-primary transition-colors"
            >
              {mode === "signup" ? "Sign in →" : "Create an account →"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
