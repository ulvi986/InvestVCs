import { motion } from "framer-motion";

/**
 * Origin Financial backdrop — deep Midnight Ink with two large, very slow,
 * soft glow pools. Calm and atmospheric: no grid, no mesh, no neon.
 */
const OriginBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[hsl(216,12%,6%)]">
      {/* Base atmospheric gradient — ink easing toward a deep blue at the foot */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, hsl(216 12% 5%) 0%, hsl(215 16% 7%) 40%, hsl(214 22% 9%) 78%, hsl(213 26% 8%) 100%)",
        }}
      />

      {/* Soft violet glow, upper area */}
      <motion.div
        className="absolute"
        style={{
          left: "50%",
          top: "-18%",
          width: "70vw",
          height: "55vw",
          transform: "translateX(-50%)",
          background: "radial-gradient(ellipse at center, hsla(244, 80%, 66%, 0.14), transparent 62%)",
          filter: "blur(50px)",
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Soft ocean glow, lower-right */}
      <motion.div
        className="absolute"
        style={{
          right: "-14%",
          bottom: "-18%",
          width: "55vw",
          height: "55vw",
          background: "radial-gradient(circle, hsla(193, 90%, 45%, 0.10), transparent 62%)",
          filter: "blur(55px)",
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Faint rose glow, lower-left for warmth balance */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 40% 35% at 12% 88%, hsla(312, 55%, 60%, 0.07), transparent 70%)",
        }}
      />

      {/* Gentle vignette */}
      <div
        className="absolute inset-x-0 top-0 h-44"
        style={{ background: "linear-gradient(180deg, hsla(216,12%,4%,0.85), transparent)" }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{ background: "linear-gradient(0deg, hsla(216,12%,4%,0.7), transparent)" }}
      />
    </div>
  );
};

export default OriginBackground;
