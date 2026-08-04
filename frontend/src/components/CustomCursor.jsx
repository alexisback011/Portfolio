import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Plus } from "lucide-react";

const INTERACTIVE =
  'a, button, input, textarea, select, label, [role="button"], [role="checkbox"], [role="switch"]';

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [ripples, setRipples] = useState([]);

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

    const onDown = (e) => {
      setPressed(true);
      const id = Date.now() + Math.random();
      setRipples((prev) =>
        [...prev, { id, x: e.clientX, y: e.clientY }].slice(-6)
      );
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 550);
    };
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
      {ripples.map((r) => (
        <motion.div
          key={r.id}
          className="custom-cursor-ripple"
          style={{ left: r.x, top: r.y }}
          initial={{ scale: 0.3, opacity: 0.9 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
      <motion.div
        className="custom-cursor-icon"
        style={{ x: ringX, y: ringY }}
        animate={{
          scale: pressed ? 0.7 : hovering ? 1.5 : 1,
          opacity: hidden ? 0 : 1,
          rotate: hovering ? 18 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <Plus size={20} strokeWidth={1.75} />
      </motion.div>
    </>
  );
};

export default CustomCursor;
