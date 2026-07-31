import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth, formatApiErrorDetail } from "../context/AuthContext";
import { PROFILE } from "../data";

const EASE = [0.85, 0, 0.15, 1];

const ForgotPassword = () => {
  const { user, requestResetOtp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user && user.id) navigate("/profile");
  }, [user, navigate]);

  const onRequest = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await requestResetOtp(email.trim());
      if (data.dev_otp) toast.info(`Dev code: ${data.dev_otp}`);
      toast.success("Reset code sent to your email.");
      setStep("reset");
    } catch (err) {
      const msg = formatApiErrorDetail(err.response?.data?.detail) || err.message;
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onReset = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setDone(true);
      toast.success("Password updated. You can now sign in.");
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
          to="/login"
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
            data-testid="reset-title"
            className="mt-6 font-display text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none"
          >
            Reset Password
          </h1>

          {done ? (
            <div className="mt-10 flex flex-col items-start gap-5">
              <span className="flex h-12 w-12 items-center justify-center border border-white/20">
                <ShieldCheck size={18} className="text-secondary" />
              </span>
              <p className="text-sm font-light text-muted-foreground">
                Your password has been updated. You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                data-testid="reset-to-login"
                className="bg-primary text-black px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary transition-colors duration-200"
              >
                Sign In
              </Link>
            </div>
          ) : step === "request" ? (
            <form onSubmit={onRequest} data-testid="reset-request-form" className="mt-10 flex flex-col gap-7">
              <p className="text-sm font-light text-muted-foreground">
                Enter the email for your account and we&apos;ll send a reset code.
              </p>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  data-testid="reset-email"
                  className={inputCls}
                  required
                />
              </label>

              {error && (
                <p data-testid="reset-error" className="text-sm text-destructive font-light">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="reset-request-submit"
                className="inline-flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={onReset} data-testid="reset-form" className="mt-10 flex flex-col gap-7">
              <div className="flex items-start gap-3 border border-white/15 px-4 py-3">
                <KeyRound size={16} className="mt-0.5 text-primary shrink-0" />
                <p className="text-sm font-light text-muted-foreground">
                  We sent a 6-digit code to{" "}
                  <span className="text-secondary">{email}</span>. It expires in 10 minutes.
                </p>
              </div>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Reset Code
                </span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  data-testid="reset-otp"
                  className={inputCls}
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  New Password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  data-testid="reset-password"
                  className={inputCls}
                  required
                />
              </label>

              {error && (
                <p data-testid="reset-error" className="text-sm text-destructive font-light">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                data-testid="reset-submit"
                className="inline-flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("request");
                  setError("");
                }}
                className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Change email
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
