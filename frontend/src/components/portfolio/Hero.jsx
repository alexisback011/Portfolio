import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDownRight } from "lucide-react";
import { PROFILE } from "../../data";

const EASE = [0.85, 0, 0.15, 1];

const Line = ({ children, delay = 0, className = "" }) => (
  <span className="reveal-mask">
    <motion.span
      className={`block ${className}`}
      initial={{ y: "110%" }}
      animate={{ y: "0%" }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </motion.span>
  </span>
);

export const Hero = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.1, 1.3]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);

  return (
    <section
      id="top"
      ref={ref}
      data-testid="hero-section"
      className="relative min-h-[100vh] min-h-[100dvh] w-full overflow-hidden flex flex-col justify-end"
    >
      {/* Parallax background */}
      <motion.div
        style={{ y: bgY, scale: bgScale }}
        className="absolute inset-0 z-0"
      >
        <img
          src="/anime-hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className="md:hidden w-full h-full object-cover"
        />
        <video
          src="/anime-hero.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/anime-hero-poster.jpg"
          aria-label="Anime hero animation"
          className="hidden md:block w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 grid-bg opacity-40" />
      </motion.div>

      {/* Top label */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute top-24 md:top-28 left-6 md:left-10 z-10 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-secondary"
      >
        <span className="w-2 h-2 bg-secondary animate-pulse" />
        AVAILABLE FOR WORK
      </motion.div>

      {/* Main kinetic type */}
      <motion.div
        style={{ y: textY }}
        className="relative z-10 px-6 md:px-10 pb-16 md:pb-20 mx-auto max-w-[1600px] w-full"
      >
        <h1 className="font-display font-black uppercase tracking-tighter leading-[0.82] text-[15vw] md:text-[13vw] whitespace-nowrap">
          <Line delay={0.2}>{PROFILE.roles[0]}</Line>
          <Line delay={0.35} className="text-stroke-primary">
            {PROFILE.roles[1]}
          </Line>
        </h1>

        <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            data-testid="hero-tagline"
            className="max-w-md text-sm md:text-base font-light text-muted-foreground"
          >
            {PROFILE.tagline}
          </motion.p>

          <motion.a
            href="#work"
            data-testid="hero-cta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.8 }}
            className="group inline-flex items-center gap-3 border border-white/30 px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-primary hover:text-black hover:border-primary transition-colors duration-200"
          >
            MY WORKS
            <ArrowDownRight
              size={16}
              className="group-hover:translate-x-1 group-hover:translate-y-1 transition-transform duration-200"
            />
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
};
