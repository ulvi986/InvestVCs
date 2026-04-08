import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
    : "linear-gradient(160deg, hsl(210 25% 97%) 0%, hsl(215 30% 94%) 40%, hsl(200 25% 96%) 100%)";

  const bo = isDark ? 1 : 0.45;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ background: baseGradient }} />

      {/* Radial color pools */}
      <div className="absolute inset-0" style={{
        background: isDark
          ? "radial-gradient(ellipse 70% 50% at 25% 20%, hsl(217 60% 25% / 0.45), transparent)"
          : "radial-gradient(ellipse 70% 50% at 25% 20%, hsl(217 60% 60% / 0.06), transparent)",
      }} />
      <div className="absolute inset-0" style={{
        background: isDark
          ? "radial-gradient(ellipse 55% 40% at 80% 55%, hsl(172 55% 30% / 0.35), transparent)"
          : "radial-gradient(ellipse 55% 40% at 80% 55%, hsl(172 55% 50% / 0.05), transparent)",
      }} />
      <div className="absolute inset-0" style={{
        background: isDark
          ? "radial-gradient(ellipse 45% 35% at 55% 85%, hsl(280 50% 30% / 0.25), transparent)"
          : "radial-gradient(ellipse 45% 35% at 55% 85%, hsl(280 50% 55% / 0.04), transparent)",
      }} />
      <div className="absolute inset-0" style={{
        background: isDark
          ? "radial-gradient(ellipse 35% 25% at 15% 70%, hsl(45 70% 40% / 0.12), transparent)"
          : "radial-gradient(ellipse 35% 25% at 15% 70%, hsl(45 70% 55% / 0.03), transparent)",
      }} />

      {/* Aurora blobs */}
      {[
        { color: isDark ? "hsl(200 70% 40% / 0.18)" : "hsl(200 70% 60% / 0.07)", x: "15%", y: "20%", size: 400, dur: 20, dx: 40, dy: 25 },
        { color: isDark ? "hsl(160 60% 35% / 0.15)" : "hsl(160 60% 55% / 0.05)", x: "75%", y: "30%", size: 350, dur: 26, dx: -35, dy: 40 },
        { color: isDark ? "hsl(270 55% 40% / 0.12)" : "hsl(270 55% 60% / 0.04)", x: "55%", y: "65%", size: 320, dur: 23, dx: 30, dy: -35 },
        { color: isDark ? "hsl(45 70% 45% / 0.08)" : "hsl(45 70% 55% / 0.03)", x: "30%", y: "80%", size: 280, dur: 28, dx: -25, dy: 25 },
      ].map((blob, i) => (
        <motion.div
          key={`blob-${i}`}
          className="absolute rounded-full"
          style={{
            width: blob.size, height: blob.size,
            left: blob.x, top: blob.y,
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            filter: "blur(70px)",
            opacity: bo,
          }}
          animate={{ x: [0, blob.dx, -blob.dx / 2, 0], y: [0, blob.dy, -blob.dy, 0] }}
          transition={{ duration: blob.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Glowing orbit rings */}
      {[
        { size: 500, x: "65%", y: "30%", dur: 35, color: isDark ? "hsl(217 70% 50% / 0.08)" : "hsl(217 70% 50% / 0.04)" },
        { size: 380, x: "30%", y: "55%", dur: 28, color: isDark ? "hsl(172 60% 45% / 0.06)" : "hsl(172 60% 45% / 0.03)" },
        { size: 300, x: "75%", y: "70%", dur: 22, color: isDark ? "hsl(280 55% 50% / 0.07)" : "hsl(280 55% 50% / 0.035)" },
      ].map((orbit, i) => (
        <motion.div
          key={`orbit-${i}`}
          className="absolute rounded-full"
          style={{
            width: orbit.size, height: orbit.size,
            left: orbit.x, top: orbit.y,
            transform: "translate(-50%, -50%)",
            border: `1px solid ${orbit.color}`,
            boxShadow: `0 0 30px 3px ${orbit.color}`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: orbit.dur, repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Connection lines SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: isDark ? 0.25 : 0.12 }} xmlns="http://www.w3.org/2000/svg">
        {[
          { x1: "12%", y1: "18%", x2: "35%", y2: "38%", c: "hsl(217 70% 55%)" },
          { x1: "35%", y1: "38%", x2: "60%", y2: "22%", c: "hsl(172 60% 50%)" },
          { x1: "60%", y1: "22%", x2: "82%", y2: "42%", c: "hsl(280 55% 55%)" },
          { x1: "82%", y1: "42%", x2: "68%", y2: "68%", c: "hsl(45 70% 55%)" },
          { x1: "68%", y1: "68%", x2: "38%", y2: "58%", c: "hsl(217 70% 55%)" },
          { x1: "38%", y1: "58%", x2: "12%", y2: "18%", c: "hsl(172 60% 50%)" },
        ].map((l, i) => (
          <motion.line
            key={`cl-${i}`}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke={l.c} strokeWidth="0.8"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.5, 0.25] }}
            transition={{ duration: 5 + i, repeat: Infinity, repeatType: "reverse", delay: i * 0.6 }}
          />
        ))}
        {/* Glowing dots at nodes */}
        {[
          { cx: "12%", cy: "18%", c: "hsl(217 70% 55%)" },
          { cx: "35%", cy: "38%", c: "hsl(172 60% 50%)" },
          { cx: "60%", cy: "22%", c: "hsl(280 55% 55%)" },
          { cx: "82%", cy: "42%", c: "hsl(45 70% 55%)" },
          { cx: "68%", cy: "68%", c: "hsl(340 65% 55%)" },
          { cx: "38%", cy: "58%", c: "hsl(217 70% 55%)" },
        ].map((d, i) => (
          <motion.circle
            key={`nd-${i}`}
            cx={d.cx} cy={d.cy} r="2.5" fill={d.c}
            animate={{ r: [2.5, 4, 2.5], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </svg>

      {/* Music wave lines — multi-color, intense */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ height: "35vh", opacity: isDark ? 0.6 : 0.3 }}
        viewBox="0 0 1440 400" preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wg1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(217 80% 60%)" stopOpacity="0.7" />
            <stop offset="40%" stopColor="hsl(172 65% 50%)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="hsl(280 60% 55%)" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="wg2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(172 65% 50%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(45 80% 55%)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(217 80% 60%)" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="wg3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(280 60% 55%)" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(340 65% 55%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(45 80% 55%)" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="wg4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(45 80% 55%)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(160 60% 50%)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="wgf1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(217 80% 60%)" stopOpacity="0.12" />
            <stop offset="50%" stopColor="hsl(172 65% 50%)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="hsl(280 60% 55%)" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        <path fill="none" stroke="url(#wg1)" strokeWidth="2.5">
          <animate attributeName="d" dur="8s" repeatCount="indefinite" values="
            M0,200 Q180,130 360,200 T720,185 T1080,215 T1440,200;
            M0,200 Q180,270 360,185 T720,215 T1080,175 T1440,200;
            M0,200 Q180,130 360,200 T720,185 T1080,215 T1440,200
          " />
        </path>
        <path fill="none" stroke="url(#wg2)" strokeWidth="2">
          <animate attributeName="d" dur="11s" repeatCount="indefinite" values="
            M0,225 Q200,165 400,240 T800,215 T1200,245 T1440,225;
            M0,225 Q200,295 400,205 T800,245 T1200,200 T1440,225;
            M0,225 Q200,165 400,240 T800,215 T1200,245 T1440,225
          " />
        </path>
        <path fill="none" stroke="url(#wg3)" strokeWidth="1.5">
          <animate attributeName="d" dur="14s" repeatCount="indefinite" values="
            M0,255 Q240,195 480,265 T960,245 T1440,255;
            M0,255 Q240,315 480,235 T960,265 T1440,255;
            M0,255 Q240,195 480,265 T960,245 T1440,255
          " />
        </path>
        <path fill="none" stroke="url(#wg4)" strokeWidth="1">
          <animate attributeName="d" dur="17s" repeatCount="indefinite" values="
            M0,285 Q300,230 600,295 T1200,275 T1440,285;
            M0,285 Q300,340 600,265 T1200,295 T1440,285;
            M0,285 Q300,230 600,295 T1200,275 T1440,285
          " />
        </path>
        <path fill="url(#wgf1)">
          <animate attributeName="d" dur="9s" repeatCount="indefinite" values="
            M0,260 Q360,200 720,280 T1440,260 L1440,400 L0,400 Z;
            M0,260 Q360,320 720,240 T1440,270 L1440,400 L0,400 Z;
            M0,260 Q360,200 720,280 T1440,260 L1440,400 L0,400 Z
          " />
        </path>
      </svg>

      {/* Floating sparkle particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`sp-${i}`}
          className="absolute rounded-full"
          style={{
            width: 3 + (i % 3) * 2,
            height: 3 + (i % 3) * 2,
            left: `${8 + i * 11}%`,
            top: `${15 + (i % 4) * 20}%`,
            background: [
              "hsl(217 80% 60%)", "hsl(172 65% 50%)",
              "hsl(280 60% 55%)", "hsl(45 80% 55%)",
            ][i % 4],
            boxShadow: `0 0 6px 2px ${[
              "hsl(217 80% 60% / 0.3)", "hsl(172 65% 50% / 0.3)",
              "hsl(280 60% 55% / 0.3)", "hsl(45 80% 55% / 0.3)",
            ][i % 4]}`,
            opacity: isDark ? 0.7 : 0.35,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: isDark ? [0.3, 0.7, 0.3] : [0.15, 0.35, 0.15],
          }}
          transition={{ duration: 5 + i * 1.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        />
      ))}

      {/* Subtle grid */}
      <div className="absolute inset-0" style={{
        opacity: isDark ? 0.03 : 0.04,
        backgroundImage:
          "linear-gradient(hsl(200 50% 50% / 0.2) 1px, transparent 1px), linear-gradient(90deg, hsl(200 50% 50% / 0.2) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />
    </div>
  );
};

export default AuroraBackground;
