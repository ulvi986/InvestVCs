import { motion } from "framer-motion";

/**
 * Premium animated background with aurora blobs, music-wave lines,
 * glowing orbits, and connection lines.
 */
const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Base gradient mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(217_91%_60%/0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,hsl(172_66%_50%/0.1),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_20%_80%,hsl(280_70%_50%/0.08),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_60%_90%,hsl(45_90%_55%/0.06),transparent)]" />

      {/* Aurora blobs */}
      {[
        { color: "hsl(217 91% 60% / 0.18)", x: "15%", y: "20%", size: 400, dur: 18, dx: 60, dy: 40 },
        { color: "hsl(172 66% 50% / 0.15)", x: "70%", y: "30%", size: 350, dur: 22, dx: -50, dy: 50 },
        { color: "hsl(280 70% 55% / 0.12)", x: "50%", y: "60%", size: 300, dur: 20, dx: 40, dy: -30 },
        { color: "hsl(45 90% 55% / 0.10)", x: "80%", y: "70%", size: 280, dur: 25, dx: -40, dy: 40 },
        { color: "hsl(340 80% 55% / 0.08)", x: "30%", y: "80%", size: 250, dur: 16, dx: 30, dy: -50 },
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
            filter: "blur(60px)",
          }}
          animate={{
            x: [0, blob.dx, -blob.dx / 2, 0],
            y: [0, blob.dy, -blob.dy, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{
            duration: blob.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Glowing orbit rings */}
      {[
        { size: 600, x: "60%", y: "25%", dur: 30, color: "hsl(217 91% 60% / 0.08)" },
        { size: 450, x: "25%", y: "55%", dur: 25, color: "hsl(172 66% 50% / 0.06)" },
        { size: 350, x: "75%", y: "70%", dur: 20, color: "hsl(280 70% 55% / 0.07)" },
      ].map((orbit, i) => (
        <motion.div
          key={`orbit-${i}`}
          className="absolute rounded-full border"
          style={{
            width: orbit.size,
            height: orbit.size,
            left: orbit.x,
            top: orbit.y,
            transform: "translate(-50%, -50%)",
            borderColor: orbit.color,
            boxShadow: `0 0 40px 5px ${orbit.color}`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: orbit.dur,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}

      {/* Music wave / sound wave lines */}
      <svg
        className="absolute bottom-0 left-0 right-0 w-full opacity-60"
        style={{ height: "35vh" }}
        viewBox="0 0 1440 400"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="wave-g1" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity="0.3" />
            <stop offset="50%" stopColor="hsl(172 66% 50%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(280 70% 55%)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="wave-g2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(172 66% 50%)" stopOpacity="0.25" />
            <stop offset="50%" stopColor="hsl(45 90% 55%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="wave-g3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(280 70% 55%)" stopOpacity="0.2" />
            <stop offset="50%" stopColor="hsl(340 80% 55%)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(45 90% 55%)" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="wave-g4" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(45 90% 55%)" stopOpacity="0.15" />
            <stop offset="50%" stopColor="hsl(217 91% 60%)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="hsl(172 66% 50%)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Wave 1 - Blue to Teal to Purple */}
        <path fill="none" stroke="url(#wave-g1)" strokeWidth="2.5">
          <animate
            attributeName="d"
            dur="8s"
            repeatCount="indefinite"
            values="
              M0,200 Q180,120 360,200 T720,200 T1080,200 T1440,200;
              M0,200 Q180,280 360,200 T720,180 T1080,220 T1440,200;
              M0,200 Q180,120 360,200 T720,200 T1080,200 T1440,200
            "
          />
        </path>

        {/* Wave 2 - Teal to Gold */}
        <path fill="none" stroke="url(#wave-g2)" strokeWidth="2">
          <animate
            attributeName="d"
            dur="10s"
            repeatCount="indefinite"
            values="
              M0,220 Q200,160 400,240 T800,220 T1200,240 T1440,220;
              M0,220 Q200,300 400,200 T800,240 T1200,200 T1440,220;
              M0,220 Q200,160 400,240 T800,220 T1200,240 T1440,220
            "
          />
        </path>

        {/* Wave 3 - Purple to Pink to Gold */}
        <path fill="none" stroke="url(#wave-g3)" strokeWidth="1.5">
          <animate
            attributeName="d"
            dur="12s"
            repeatCount="indefinite"
            values="
              M0,250 Q240,180 480,260 T960,240 T1440,250;
              M0,250 Q240,320 480,230 T960,260 T1440,250;
              M0,250 Q240,180 480,260 T960,240 T1440,250
            "
          />
        </path>

        {/* Wave 4 - Gold subtle */}
        <path fill="none" stroke="url(#wave-g4)" strokeWidth="1">
          <animate
            attributeName="d"
            dur="14s"
            repeatCount="indefinite"
            values="
              M0,280 Q300,220 600,290 T1200,270 T1440,280;
              M0,280 Q300,340 600,260 T1200,290 T1440,280;
              M0,280 Q300,220 600,290 T1200,270 T1440,280
            "
          />
        </path>

        {/* Filled wave areas for depth */}
        <path fill="url(#wave-g1)" opacity="0.08">
          <animate
            attributeName="d"
            dur="9s"
            repeatCount="indefinite"
            values="
              M0,240 Q360,180 720,260 T1440,240 L1440,400 L0,400 Z;
              M0,240 Q360,300 720,220 T1440,260 L1440,400 L0,400 Z;
              M0,240 Q360,180 720,260 T1440,240 L1440,400 L0,400 Z
            "
          />
        </path>
        <path fill="url(#wave-g2)" opacity="0.06">
          <animate
            attributeName="d"
            dur="11s"
            repeatCount="indefinite"
            values="
              M0,280 Q400,220 800,300 T1440,280 L1440,400 L0,400 Z;
              M0,280 Q400,340 800,260 T1440,300 L1440,400 L0,400 Z;
              M0,280 Q400,220 800,300 T1440,280 L1440,400 L0,400 Z
            "
          />
        </path>
        <path fill="url(#wave-g3)" opacity="0.04">
          <animate
            attributeName="d"
            dur="13s"
            repeatCount="indefinite"
            values="
              M0,320 Q360,270 720,330 T1440,320 L1440,400 L0,400 Z;
              M0,320 Q360,370 720,300 T1440,330 L1440,400 L0,400 Z;
              M0,320 Q360,270 720,330 T1440,320 L1440,400 L0,400 Z
            "
          />
        </path>
      </svg>

      {/* Connection lines / network dots */}
      <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
        {[
          { x1: "10%", y1: "15%", x2: "30%", y2: "35%", color: "hsl(217 91% 60% / 0.15)" },
          { x1: "30%", y1: "35%", x2: "55%", y2: "20%", color: "hsl(172 66% 50% / 0.12)" },
          { x1: "55%", y1: "20%", x2: "80%", y2: "40%", color: "hsl(280 70% 55% / 0.1)" },
          { x1: "80%", y1: "40%", x2: "65%", y2: "65%", color: "hsl(45 90% 55% / 0.1)" },
          { x1: "65%", y1: "65%", x2: "35%", y2: "55%", color: "hsl(217 91% 60% / 0.1)" },
          { x1: "35%", y1: "55%", x2: "10%", y2: "15%", color: "hsl(172 66% 50% / 0.08)" },
        ].map((line, i) => (
          <motion.line
            key={`line-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.6, 0.3] }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.8,
            }}
          />
        ))}
        {/* Glowing dots at connection points */}
        {[
          { cx: "10%", cy: "15%", color: "hsl(217 91% 60%)" },
          { cx: "30%", cy: "35%", color: "hsl(172 66% 50%)" },
          { cx: "55%", cy: "20%", color: "hsl(280 70% 55%)" },
          { cx: "80%", cy: "40%", color: "hsl(45 90% 55%)" },
          { cx: "65%", cy: "65%", color: "hsl(340 80% 55%)" },
          { cx: "35%", cy: "55%", color: "hsl(217 91% 60%)" },
        ].map((dot, i) => (
          <motion.circle
            key={`dot-${i}`}
            cx={dot.cx}
            cy={dot.cy}
            r="3"
            fill={dot.color}
            animate={{
              r: [3, 5, 3],
              opacity: [0.4, 0.9, 0.4],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </svg>

      {/* Floating sparkle particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            width: 3 + (i % 4) * 2,
            height: 3 + (i % 4) * 2,
            left: `${5 + i * 8}%`,
            top: `${10 + (i % 5) * 18}%`,
            background: [
              "hsl(217 91% 60%)",
              "hsl(172 66% 50%)",
              "hsl(280 70% 55%)",
              "hsl(45 90% 55%)",
            ][i % 4],
            boxShadow: `0 0 8px 2px ${["hsl(217 91% 60% / 0.4)", "hsl(172 66% 50% / 0.4)", "hsl(280 70% 55% / 0.4)", "hsl(45 90% 55% / 0.4)"][i % 4]}`,
          }}
          animate={{
            y: [-30, 30, -30],
            x: [-15, 15, -15],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 5 + i * 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.4,
          }}
        />
      ))}

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
};

export default AuroraBackground;
