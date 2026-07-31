import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth, formatApiErrorDetail } from "../context/AuthContext";
import { PROFILE } from "../data";

const EASE = [0.85, 0, 0.15, 1];

const Auth = () => {
  const { user, login, requestSignupOtp, verifySignupOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && user.id) navigate("/profile");
  }, [user, navigate]);

  useEffect(() => {
    setMode(location.pathname === "/signup" ? "signup" : "login");
    setError("");
    setForm((f) => ({ ...f, password: "" }));
    setStep("form");
    setOtp("");
  }, [location.pathname]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      setLoading(true);
      try {
        await login(form.email.trim(), form.password);
        toast.success("Welcome back.");
        navigate("/profile");
      } catch (err) {
        const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const data = await requestSignupOtp(form.name.trim(), form.email.trim(), form.password);
      if (data.skip_otp) {
        await verifySignupOtp(form.name.trim(), form.email.trim(), form.password, "");
        toast.success("Account created. Welcome!");
        navigate("/profile");
        return;
      }
      if (data.dev_otp) toast.info(`Dev code: ${data.dev_otp}`);
      toast.success("Verification code sent to your email.");
      setStep("otp");
      setOtp("");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await verifySignupOtp(form.name.trim(), form.email.trim(), form.password, otp.trim());
      toast.success("Account created. Welcome!");
      navigate("/profile");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    setError("");
    try {
      const data = await requestSignupOtp(form.name.trim(), form.email.trim(), form.password);
      if (data.dev_otp) toast.info(`Dev code: ${data.dev_otp}`);
      toast.success("New code sent.");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || "Could not resend code.");
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

          {mode === "signup" && step === "otp" ? (
            <form onSubmit={onVerifyOtp} data-testid="otp-form" className="mt-10 flex flex-col gap-7">
              <div className="flex items-start gap-3 border border-white/15 px-4 py-3">
                <KeyRound size={16} className="mt-0.5 text-primary shrink-0" />
                <p className="text-sm font-light text-muted-foreground">
                  We sent a 6-digit verification code to{" "}
                  <span className="text-secondary">{form.email}</span>. It expires in 10 minutes.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Verification Code
                </span>
                <input
                  name="otp"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  data-testid="otp-input"
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
                data-testid="otp-submit"
                className="group inline-flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    Verify & Create Account
                    <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em]">
                <button
                  type="button"
                  onClick={onResendOtp}
                  data-testid="otp-resend"
                  className="text-secondary hover:text-primary transition-colors"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setError("");
                  }}
                  data-testid="otp-back"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <>
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

                {mode === "login" && (
                  <div className="-mt-2 flex justify-end">
                    <Link
                      to="/forgot-password"
                      data-testid="forgot-password-link"
                      className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

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
                      {mode === "signup" ? "Send Verification Code" : "Sign In"}
                      <ArrowUpRight size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-sm font-light text-muted-foreground">
                {mode === "signup" ? "Already have an account? " : "New here? "}
                <Link
                  to={mode === "signup" ? "/login" : "/signup"}
                  data-testid="auth-toggle"
                  className="text-secondary hover:text-primary transition-colors"
                >
                  {mode === "signup" ? "Sign in →" : "Create an account →"}
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
