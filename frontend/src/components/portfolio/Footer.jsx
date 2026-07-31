import { PROFILE } from "../../data";

export const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer
      data-testid="footer"
      className="relative border-t border-white/10 px-6 md:px-10 py-10"
    >
      <div className="mx-auto max-w-[1600px] flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-display text-sm font-black tracking-tighter">
          {PROFILE.name}
          <span className="text-primary">.</span>
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          © {year} — Designed & Built by 𝙰𝚕𝚎𝚡シ
        </span>
        <a
          href="#top"
          data-testid="footer-back-to-top"
          className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors duration-200"
        >
          Back to top ↑
        </a>
      </div>
    </footer>
  );
};
