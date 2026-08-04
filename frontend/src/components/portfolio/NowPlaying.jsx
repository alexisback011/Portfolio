import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Music, ExternalLink, ChevronRight } from "lucide-react";
import { API } from "../../lib/api";

const POLL_MS = 30000;
const POSITION_KEY = "nowPlayingPos";

const loadPos = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(POSITION_KEY) || "[0,0]");
    if (Array.isArray(raw) && raw.length === 2 && raw.every(Number.isFinite)) {
      return raw;
    }
  } catch {}
  return [0, 0];
};

const formatMs = (ms) => {
  if (!ms) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
};

const Equalizer = ({ playing }) => (
  <span
    className={playing ? "eq eq-playing" : "eq eq-idle"}
    aria-hidden="true"
  >
    <i />
    <i />
    <i />
    <i />
  </span>
);

const NowPlaying = () => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [savedPos] = useState(loadPos);
  const dragX = useMotionValue(savedPos[0]);
  const dragY = useMotionValue(savedPos[1]);
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const mounted = useRef(false);

  const clampDrag = (write) => {
    const el = wrapRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(el.offsetWidth, cardRef.current?.offsetWidth || 0, 280);
    const h = Math.max(el.offsetHeight, cardRef.current?.offsetHeight || 0, 420);
    const m = 20;
    const nx = Math.min(m, Math.max(-(vw - w - m), dragX.get()));
    const ny = Math.min(m, Math.max(-(vh - h - m), dragY.get()));
    dragX.set(nx);
    dragY.set(ny);
    if (write) {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify([nx, ny]));
      } catch {}
    }
  };

  useEffect(() => {
    if (!data || data.configured === false) return;
    if (!mounted.current) {
      mounted.current = true;
      clampDrag(false);
    }
  }, [data]);

  useEffect(() => {
    clampDrag(false);
  }, [open]);

  useEffect(() => {
    const onResize = () => clampDrag(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API}/now-playing`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // transient network failure - keep previous state
      }
    };

    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  if (!data || data.configured === false) return null;

  const playing = !!data.playing;
  const title = data.title || "";
  const artist = data.artist || "";
  const cover = data.cover || "";
  const url = data.url || "";
  const pct = data.duration_ms
    ? Math.min(100, Math.round((data.progress_ms / data.duration_ms) * 100))
    : 0;

  return (
    <motion.div
      ref={wrapRef}
      style={{ x: dragX, y: dragY }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={() => clampDrag(true)}
      className="fixed bottom-5 right-5 z-[90] flex cursor-grab flex-col items-end gap-2 active:cursor-grabbing"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.85, 0, 0.15, 1] }}
            className="w-64 overflow-hidden rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl"
          >
            {cover ? (
              <div className="relative aspect-square w-full overflow-hidden">
                <img
                  src={cover}
                  alt={`${title} album art`}
                  className={`h-full w-full object-cover ${playing ? "album-spin" : ""}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    {playing ? (
                      <>
                        <Equalizer playing /> now playing
                      </>
                    ) : (
                      <>
                        <Music size={10} /> last played
                      </>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 font-display text-sm font-bold leading-tight">
                    {title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{artist}</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {playing ? (
                    <>
                      <Equalizer playing /> now playing
                    </>
                  ) : (
                    <>
                      <Music size={10} /> not playing
                    </>
                  )}
                </div>
                {title && (
                  <>
                    <p className="mt-2 font-display text-sm font-bold">{title}</p>
                    {artist && <p className="truncate text-xs text-muted-foreground">{artist}</p>}
                  </>
                )}
              </div>
            )}
            {title && data.duration_ms > 0 && (
              <div className="flex items-center gap-3 px-4 pb-4 pt-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      playing ? "bg-primary" : "bg-white/30"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatMs(playing ? data.progress_ms : data.duration_ms)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {playing ? "last.fm" : "via last.fm"}
              </span>
              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.15em] text-primary hover:underline"
                >
                  Open <ExternalLink size={11} />
                </a>
              ) : (
                <span className="text-[11px] text-white/40">—</span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide now playing" : "Show now playing"}
        className="group flex max-w-[260px] items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-4 py-2.5 backdrop-blur-xl transition-colors hover:border-primary"
      >
        <span className="shrink-0">
          <Equalizer playing={playing} />
        </span>
        <span className="flex min-w-0 flex-col items-start">
          <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {playing ? "now playing" : data.from_recently_played ? "last played" : "music"}
          </span>
          <span className="max-w-[160px] truncate text-xs font-bold">
            {title || "not playing"}
          </span>
        </span>
        <ChevronRight
          size={13}
          className={`shrink-0 text-muted-foreground transition-transform group-hover:text-primary ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
    </motion.div>
  );
};

export default NowPlaying;
