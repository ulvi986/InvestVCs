import { motion } from "framer-motion";

/**
 * Clean deep-gradient background with subtle floating orbs — 
 * inspired by premium fintech platforms. Not overwhelming.
 */
const AuroraBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Deep blue-to-teal base gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, hsl(220 35% 8%) 0%, hsl(215 45% 14%) 30%, hsl(200 50% 18%) 60%, hsl(180 45% 20%) 100%)",
        }}
      />

      {/* Soft radial highlights for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_20%,hsl(217_60%_30%/0.5),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_60%,hsl(180_50%_25%/0.3),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_30%_at_50%_90%,hsl(200_60%_20%/0.4),transparent)]" />

      {/* Subtle floating orbs — only 3 for elegance */}
      {[
        { color: "hsl(217 70% 45% / 0.12)", x: "20%", y: "25%", size: 350, dur: 20, dx: 30, dy: 20 },
        { color: "hsl(180 55% 40% / 0.10)", x: "70%", y: "40%", size: 300, dur: 25, dx: -25, dy: 30 },
        { color: "hsl(200 50% 35% / 0.08)", x: "45%", y: "70%", size: 280, dur: 22, dx: 20, dy: -25 },
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
          }}
          animate={{
            x: [0, blob.dx, -blob.dx / 2, 0],
            y: [0, blob.dy, -blob.dy, 0],
          }}
          transition={{
            duration: blob.dur,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Subtle grid pattern for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(200 50% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(200 50% 50% / 0.3) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Bottom fade to blend with content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default AuroraBackground;
