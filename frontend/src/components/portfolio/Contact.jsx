import { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PROFILE } from "../../data";
import { API } from "../../lib/api";

const EASE = [0.85, 0, 0.15, 1];

const Field = ({ label, ...props }) => (
  <label className="block">
    <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </span>
    <input
      {...props}
      className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base md:text-lg font-light transition-colors duration-200"
    />
  </label>
);

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in every field.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, form);
      toast.success("Message sent. I'll be in touch soon.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="relative py-24 md:py-40 px-6 md:px-10 border-t border-white/10"
    >
      <div className="mx-auto max-w-[1600px] grid grid-cols-1 md:grid-cols-12 gap-16">
        <div className="md:col-span-5">
          <motion.h2
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
            className="font-display font-black uppercase tracking-tighter leading-[0.85] text-5xl md:text-7xl"
          >
            Let&apos;s
            <br />
            <span className="text-stroke-primary">build.</span>
          </motion.h2>

          <div className="mt-10 space-y-2">
            <a
              href={`mailto:${PROFILE.email}`}
              data-testid="contact-email"
              className="inline-block text-lg font-light hover:text-primary transition-colors duration-200"
            >
              {PROFILE.email}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {PROFILE.socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`social-${s.label.toLowerCase()}`}
                className="group inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-secondary transition-colors duration-200"
              >
                {s.label}
                <ArrowUpRight
                  size={14}
                  className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
                />
              </a>
            ))}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          data-testid="contact-form"
          className="md:col-span-6 md:col-start-7 flex flex-col gap-8"
        >
          <Field
            label="01 / Your Name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder=""
            data-testid="contact-name"
          />
          <Field
            label="02 / Email"
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            placeholder=""
            data-testid="contact-email-input"
          />
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              03 / Message
            </span>
            <textarea
              name="message"
              value={form.message}
              onChange={onChange}
              rows={4}
              placeholder="Tell me about the project..."
              data-testid="contact-message"
              className="mt-3 w-full bg-transparent border-b-2 border-white/20 focus:border-primary outline-none py-3 text-base md:text-lg font-light resize-none transition-colors duration-200"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            data-testid="contact-submit"
            className="group inline-flex items-center justify-center gap-3 bg-primary text-black px-8 py-5 text-xs font-bold uppercase tracking-[0.25em] hover:bg-secondary disabled:opacity-60 transition-colors duration-200"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                Send Transmission
                <ArrowUpRight
                  size={16}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-200"
                />
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
};
