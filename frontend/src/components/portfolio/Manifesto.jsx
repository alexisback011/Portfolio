import { motion } from "framer-motion";
import { CHAPTERS } from "../../data";

const EASE = [0.85, 0, 0.15, 1];

export const Manifesto = () => {
  return (
    <section
      id="about"
      data-testid="about-section"
      className="relative py-24 md:py-40 px-6 md:px-10 border-t border-white/10"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex items-center gap-4 mb-16 md:mb-24">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            [ MANIFESTO ]
          </span>
          <span className="h-px flex-1 bg-white/15" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-16 md:gap-x-4">
          <div className="md:col-span-5">
            <motion.h2
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-display font-black uppercase tracking-tighter leading-[0.9] text-4xl md:text-6xl sticky top-28"
            >
              Not just <br />
              <span className="text-stroke-primary">code.</span> <br />
              A craft.
            </motion.h2>
          </div>

          <div className="md:col-span-7 md:col-start-6 flex flex-col gap-14">
            {CHAPTERS.map((c, i) => (
              <motion.div
                key={c.no}
                data-testid={`chapter-${c.no}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: EASE, delay: i * 0.05 }}
                className="group border-b border-white/10 pb-10"
              >
                <div className="flex items-baseline gap-6 mb-4">
                  <span className="font-display text-primary text-sm font-bold">
                    {c.no}
                  </span>
                  <h3 className="font-display text-xl md:text-2xl font-bold uppercase tracking-tight group-hover:text-primary transition-colors duration-200">
                    {c.title}
                  </h3>
                </div>
                <p className="text-sm md:text-base font-light leading-relaxed text-muted-foreground md:pl-12">
                  {c.body}
                </p>
              </motion.div>
            ))}
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground md:pl-12">
              Currently based in India
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
