import { motion } from "framer-motion";
import { SKILLS } from "../../data";

const EASE = [0.85, 0, 0.15, 1];

export const Skills = () => {
  return (
    <section
      id="skills"
      data-testid="skills-section"
      className="relative py-24 md:py-32 px-6 md:px-10"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-secondary">
            [ TOOLKIT ]
          </span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="flex flex-wrap gap-3 md:gap-4">
          {SKILLS.map((s, i) => (
            <motion.span
              key={s}
              data-testid={`skill-${i}`}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.03 }}
              className="border border-white/20 px-5 py-3 text-sm md:text-base font-bold uppercase tracking-tight hover:bg-secondary hover:text-black hover:border-secondary transition-colors duration-200 cursor-default"
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
};
