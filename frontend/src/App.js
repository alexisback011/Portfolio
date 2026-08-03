import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import useLenis from "@/hooks/useLenis";
import { Nav } from "@/components/portfolio/Nav";
import CustomCursor from "@/components/CustomCursor";
import { Hero } from "@/components/portfolio/Hero";
import { Manifesto } from "@/components/portfolio/Manifesto";
import { MarqueeStrip } from "@/components/portfolio/MarqueeStrip";
import { Projects } from "@/components/portfolio/Projects";
import { Skills } from "@/components/portfolio/Skills";
import { Reviews } from "@/components/portfolio/Reviews";
import { Contact } from "@/components/portfolio/Contact";
import { Footer } from "@/components/portfolio/Footer";
import Auth from "@/pages/Auth";
import ForgotPassword from "@/pages/ForgotPassword";
import Profile from "@/pages/Profile";
import { PROFILE } from "@/data";

const Preloader = ({ done }) => (
  <motion.div
    animate={{ y: done ? "-100%" : "0%" }}
    transition={{ duration: 0.8, ease: [0.85, 0, 0.15, 1] }}
    className="fixed inset-0 z-[200] bg-black flex items-center justify-center pointer-events-none"
    data-testid="preloader"
  >
    <motion.span
      initial={{ opacity: 0, letterSpacing: "0.5em" }}
      animate={{ opacity: 1, letterSpacing: "0.1em" }}
      transition={{ duration: 0.7 }}
      className="font-display text-4xl md:text-6xl font-black uppercase"
    >
      {PROFILE.name}
      <span className="text-primary">.</span>
    </motion.span>
  </motion.div>
);

const HomePage = () => {
  const [done, setDone] = useState(false);
  useLenis();
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1300);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="relative bg-background text-foreground">
      <div className="noise-overlay" />
      <Preloader done={done} />
      <Nav />
      <main>
        <Hero />
        <Manifesto />
        <MarqueeStrip />
        <Projects />
        <Skills />
        <Reviews />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <CustomCursor />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 0,
            fontFamily: "JetBrains Mono, monospace",
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
