import Marquee from "react-fast-marquee";

const WORDS = ["GAMER", "DEVELOPER", "CREATOR"];

export const MarqueeStrip = () => {
  return (
    <section
      data-testid="marquee-section"
      className="relative py-10 md:py-14 border-y border-white/10 bg-black overflow-hidden"
    >
      <Marquee speed={40} gradient={false}>
        {WORDS.concat(WORDS).map((w, i) => (
          <span
            key={i}
            className="font-display text-6xl md:text-8xl font-black uppercase tracking-tighter text-stroke mx-8 flex items-center gap-8"
          >
            {w}
            <span className="text-primary text-4xl md:text-6xl">✳</span>
          </span>
        ))}
      </Marquee>
    </section>
  );
};
