import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { PROFILE } from "../../data";
import { useAuth } from "../../context/AuthContext";

const LINKS = [
  { label: "WORK", href: "#work" },
  { label: "ABOUT", href: "#about" },
  { label: "SKILLS", href: "#skills" },
  { label: "REVIEWS", href: "#reviews" },
  { label: "CONTACT", href: "#contact" },
];

const authLinkCls =
  "text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-200";

const avatarUrl = (u) =>
  u?.profile_image ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || "?")}&background=0a0a0a&color=ff004d&bold=true&font-size=0.4`;

export const Nav = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      data-testid="main-nav"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ delay: 1.6, duration: 0.6, ease: [0.85, 0, 0.15, 1] }}
      className={`fixed top-0 left-0 right-0 z-[100] border-b transition-colors duration-300 ${
        scrolled
          ? "bg-black/60 backdrop-blur-xl border-white/10"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1600px] px-6 md:px-10 h-16 md:h-20 flex items-center justify-between">
        <a
          href="#top"
          data-testid="nav-logo"
          className="font-display text-lg md:text-xl font-black tracking-tighter glitch"
        >
          {PROFILE.name}
          <span className="text-primary">.</span>
        </a>

        <div className="hidden md:flex items-center gap-10">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-testid={`nav-link-${l.label.toLowerCase()}`}
              className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
          {user && user.id ? (
            <Link
              to="/profile"
              data-testid="nav-account"
              className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              <img
                src={avatarUrl(user)}
                alt=""
                className="h-7 w-7 rounded-full border border-white/20 object-cover"
              />
              {user.name}
            </Link>
          ) : (
            <Link
              to="/login"
              data-testid="nav-login"
              className="text-xs font-bold uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors duration-200"
            >
              Sign In
            </Link>
          )}
        </div>

        <button
          data-testid="nav-menu-toggle"
          onClick={() => setOpen((v) => !v)}
          className="md:hidden text-foreground"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-black/90 backdrop-blur-xl border-t border-white/10"
          >
            <div className="flex flex-col px-6 py-6 gap-5">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  data-testid={`mobile-link-${l.label.toLowerCase()}`}
                  className="text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors"
                >
                  {l.label}
                </a>
              ))}
              {user && user.id ? (
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-account"
                  className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors"
                >
                  <img
                    src={avatarUrl(user)}
                    alt=""
                    className="h-6 w-6 rounded-full border border-white/20 object-cover"
                  />
                  {user.name}
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-login"
                  className="text-sm font-bold uppercase tracking-[0.2em] text-secondary hover:text-primary transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
