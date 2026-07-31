import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PROJECTS, YOUTUBE_URL } from "../../data";

const EASE = [0.85, 0, 0.15, 1];

const ProjectCard = ({ project, i }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <motion.a
      href={YOUTUBE_URL}
      target="_blank"
      rel="noopener noreferrer"
      ref={ref}
      data-testid={`project-card-${project.id}`}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: EASE }}
      className={`group relative block ${
        i % 2 === 1 ? "md:mt-32" : ""
      }`}
    >
      <div className="relative overflow-hidden border border-white/15 aspect-[4/3]">
        <motion.img
          style={{ y: imgY, scale: 1.2 }}
          src={project.gif}
          alt={project.title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-500"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300" />
        <div className="absolute top-4 left-4 font-display text-xs font-bold text-white/70">
          {project.index}
        </div>
        <div className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-primary text-black translate-y-[-120%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <ArrowUpRight size={18} />
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl md:text-3xl font-black uppercase tracking-tight glitch group-hover:text-primary transition-colors duration-200">
            {project.title}
          </h3>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {project.category}
          </p>
        </div>
        <span className="font-display text-sm text-muted-foreground">
          {project.year}
        </span>
      </div>
      <p className="mt-3 max-w-lg text-sm font-light text-muted-foreground leading-relaxed">
        {project.description}
      </p>
    </motion.a>
  );
};

export const Projects = () => {
  return (
    <section
      id="work"
      data-testid="projects-section"
      className="relative py-24 md:py-40 px-6 md:px-10 border-t border-white/10"
    >
      <div className="mx-auto max-w-[1600px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 md:mb-24">
          <h2 className="font-display font-black uppercase tracking-tighter leading-none text-5xl md:text-7xl">
            Selected
            <br />
            <span className="text-primary">Works</span>
          </h2>
          <p className="max-w-xs text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Code, content and gameplay — a mix of what I build and what I create. Tap any card to watch on YouTube.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16 md:gap-y-24">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} i={i} />
          ))}
        </div>
      </div>
    </section>
  );
};
