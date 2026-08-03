import { motion } from "framer-motion";
import { Crown } from "lucide-react";

const CROWN_STYLES = {
  1: "text-[#FFE55C] [filter:drop-shadow(0_0_5px_rgba(255,229,92,0.9))]",
  2: "text-[#EAEAEA] [filter:drop-shadow(0_0_5px_rgba(234,234,234,0.8))]",
  3: "text-[#F0A35E] [filter:drop-shadow(0_0_5px_rgba(240,163,94,0.85))]",
};

export default function ReviewCrown({ rank, size = 16, className = "" }) {
  return (
    <motion.span
      aria-label={`Rank ${rank} crown`}
      className={`inline-block ${CROWN_STYLES[rank] || ""} ${className}`}
      animate={{ rotate: [-8, -2, -8], y: [0, -1.5, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <Crown size={size} strokeWidth={1.5} className="fill-transparent" />
    </motion.span>
  );
}
