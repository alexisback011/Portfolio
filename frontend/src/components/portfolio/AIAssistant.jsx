import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { API } from "../../lib/api";

const HISTORY_KEY = "aiChatHistory";

const greeting = {
  role: "assistant",
  content:
    "Hey! I'm ALEXA — Alex's AI concierge. Ask me anything about Alex, his projects, skills or this site.",
};

const loadHistory = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    if (Array.isArray(raw) && raw.length) return raw.slice(-30);
  } catch {}
  return [greeting];
};

const AIAssistant = () => {
  const [enabled, setEnabled] = useState(true);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/ai/chat`, { credentials: "include" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.configured === false) setEnabled(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-30)));
    } catch {}
  }, [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || typing) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setTyping(true);
    setError(null);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: next.slice(-20) }),
      });
      const json = await res.json();
      if (json.configured === false) {
        setEnabled(false);
        return;
      }
      if (!res.ok) {
        setError(
          json.error === "rate_limited"
            ? "Too many messages — give it a moment and try again."
            : "Something went wrong. Try again in a bit."
        );
        return;
      }
      setMessages([...next, { role: "assistant", content: json.reply }]);
    } catch {
      setError("Network hiccup — try again.");
    } finally {
      setTyping(false);
    }
  };

  if (!enabled) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-2"
      data-testid="ai-assistant"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.85, 0, 0.15, 1] }}
            className="flex h-[460px] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl md:w-[380px]"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-black">
                  <Bot size={15} />
                </span>
                <div>
                  <p className="font-display text-xs font-black uppercase tracking-[0.15em]">
                    Alexa
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {typing ? "typing..." : "AI assistant · online"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-[13px] font-medium text-black"
                      : "mr-auto max-w-[85%] rounded-lg rounded-bl-sm border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-foreground"
                  }
                >
                  {m.content}
                </div>
              ))}
              {typing && (
                <div className="mr-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                  <span className="ai-typing">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
              {error && (
                <p className="text-[11px] text-amber-400/90">{error}</p>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                  }}
                  placeholder="Ask about Alex..."
                  aria-label="Message the assistant"
                  className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                />
                <button
                  type="button"
                  onClick={send}
                  aria-label="Send message"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-black transition-transform hover:scale-105 disabled:opacity-50"
                  disabled={!input.trim() || typing}
                >
                  <Send size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Hide assistant" : "Ask Alex"}
        className="group flex items-center gap-2.5 rounded-full border border-white/15 bg-black/70 px-4 py-2.5 backdrop-blur-xl transition-colors hover:border-primary"
      >
        <span className="shrink-0 text-primary">
          <Bot size={15} />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          ask me
        </span>
      </button>
    </div>
  );
};

export default AIAssistant;
