import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="button"], [role="checkbox"], [role="switch"]';

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hidden, setHidden] = useState(true);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.6 });
  const ringY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.6 });

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;
    setEnabled(true);

    const onMove = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setHidden(false);
    };

    const onOver = (e) => {
      setHovering(!!e.target.closest?.(INTERACTIVE));
    };

    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        className="custom-cursor-dot"
        style={{ x, y }}
        animate={{
          scale: pressed ? 0.5 : hovering ? 0.4 : 1,
          opacity: hidden ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        className="custom-cursor-ring"
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: pressed ? 0.85 : hovering ? 1.6 : 1,
          opacity: hidden ? 0 : 1,
        }}
        transition={{ duration: 0.2 }}
      />
    </>
  );
};

export default CustomCursor;
