import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Dynamic wave background with aurora blobs — adapts to light/dark mode.
 * Inspired by music-wave / fintech aesthetic.
 */
const AuroraBackground = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const baseGradient = isDark
    ? "linear-gradient(160deg, hsl(220 35% 6%) 0%, hsl(215 45% 12%) 30%, hsl(200 50% 16%) 60%, hsl(180 40% 14%) 100%)"
    : "linear-gradient(160deg, hsl(210 25% 96%) 0%, hsl(215 35% 92%) 30%, hsl(200 30% 94%) 60%, hsl(180 25% 95%) 100%)";

  const blobOpacity = isDark ? 1 : 0.5;
  const gridOpacity = isDark ? 0.04 : 0.06;
  const waveStrokeOpacity = isDark ? 0.5 : 0.3;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0" style={{ background: baseGradient }} />

      {/* Radial highlights */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 70% 50% at 25% 20%, hsl(217 60% 25% / 0.4), transparent)"
            : "radial-gradient(ellipse 70% 50% at 25% 20%, hsl(217 60% 60% / 0.08), transparent)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 60% 40% at 75% 60%, hsl(172 50% 30% / 0.3), transparent)"
            : "radial-gradient(ellipse 60% 40% at 75% 60%, hsl(172 50% 50% / 0.06), transparent)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 50% 35% at 50% 85%, hsl(280 50% 25% / 0.2), transparent)"
            : "radial-gradient(ellipse 50% 35% at 50% 85%, hsl(280 50% 55% / 0.04), transparent)",
        }}
      />

      {/* Aurora blobs — subtle, organic */}
      {[
        { color: isDark ? "hsl(200 70% 40% / 0.15)" : "hsl(200 70% 60% / 0.08)", x: "18%", y: "22%", size: 380, dur: 22, dx: 35, dy: 25 },
        { color: isDark ? "hsl(160 55% 35% / 0.12)" : "hsl(160 55% 55% / 0.06)", x: "72%", y: "35%", size: 320, dur: 28, dx: -30, dy: 35 },
        { color: isDark ? "hsl(270 50% 40% / 0.10)" : "hsl(270 50% 60% / 0.05)", x: "50%", y: "65%", size: 300, dur: 24, dx: 25, dy: -30 },
        { color: isDark ? "hsl(45 70% 45% / 0.06)" : "hsl(45 70% 55% / 0.03)", x: "35%", y: "80%", size: 250, dur: 30, dx: -20, dy: 20 },
      ].map((blob, i) => (
        <motion.div
          key={`blob-${i}`}
          className="absolute rounded-full"
          style={{
            width: blob.size,
            height: blob.size,
            left: blob.x,
            top: blob.y,
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            filter: "blur(80px)",
            opacity: blobOpacity,
          }}
          animate={{
            x: [0, blob.dx, -blob.dx / 2, 0],
            y: [0, blob.dy, -blob.dy, 0],
          }}
          transition={{ duration: blob.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Music wave lines — flowing across the bottom */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ height: "40vh", opacity: waveStrokeOpacity }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(217 80% 60%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(172 60% 50%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(280 60% 55%)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(172 60% 50%)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(45 80% 55%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(217 80% 60%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="wg3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(280 60% 55%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(45 80% 55%)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="wgf" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(217 80% 60%)" stopOpacity="0.1" />
            <stop offset="50%" stopColor="hsl(172 60% 50%)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="hsl(280 60% 55%)" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Flowing line 1 */}
        <path fill="none" stroke="url(#wg1)" strokeWidth="2">
          <animate attributeName="d" dur="10s" repeatCount="indefinite" values="
            M0,200 Q180,140 360,200 T720,190 T1080,210 T1440,200;
            M0,200 Q180,260 360,190 T720,210 T1080,180 T1440,200;
            M0,200 Q180,140 360,200 T720,190 T1080,210 T1440,200
          " />
        </path>
        {/* Line 2 */}
        <path fill="none" stroke="url(#wg2)" strokeWidth="1.5">
          <animate attributeName="d" dur="13s" repeatCount="indefinite" values="
            M0,230 Q200,170 400,240 T800,220 T1200,240 T1440,230;
            M0,230 Q200,290 400,210 T800,240 T1200,210 T1440,230;
            M0,230 Q200,170 400,240 T800,220 T1200,240 T1440,230
          " />
        </path>
        {/* Line 3 */}
        <path fill="none" stroke="url(#wg3)" strokeWidth="1">
          <animate attributeName="d" dur="16s" repeatCount="indefinite" values="
            M0,260 Q240,200 480,270 T960,250 T1440,260;
            M0,260 Q240,320 480,240 T960,270 T1440,260;
            M0,260 Q240,200 480,270 T960,250 T1440,260
          " />
        </path>
        {/* Filled area for depth */}
        <path fill="url(#wgf)">
          <animate attributeName="d" dur="11s" repeatCount="indefinite" values="
            M0,260 Q360,200 720,280 T1440,260 L1440,400 L0,400 Z;
            M0,260 Q360,320 720,240 T1440,270 L1440,400 L0,400 Z;
            M0,260 Q360,200 720,280 T1440,260 L1440,400 L0,400 Z
          " />
        </path>
      </svg>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          opacity: gridOpacity,
          backgroundImage: isDark
            ? "linear-gradient(hsl(200 50% 50% / 0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(200 50% 50% / 0.2) 1px, transparent 1px)"
            : "linear-gradient(hsl(200 50% 50% / 0.15) 1px, transparent 1px), linear-gradient(90deg, hsl(200 50% 50% / 0.15) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />
    </div>
  );
};

export default AuroraBackground;
