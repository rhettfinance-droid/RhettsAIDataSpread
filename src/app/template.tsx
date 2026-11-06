"use client";
import { motion } from "framer-motion";

/** Cinematic module transition: blur-in with a scanning light bar. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ opacity: 0, filter: "blur(10px) brightness(1.6)", scale: 1.012 }}
      animate={{ opacity: 1, filter: "blur(0px) brightness(1)", scale: 1, transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.55, ease: [0.16, 0.8, 0.24, 1] }}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 z-50 h-[2px] bg-a1 shadow-[0_0_24px_6px_var(--a1)]"
        initial={{ top: "0%", opacity: 0.9 }}
        animate={{ top: "100%", opacity: 0 }}
        transition={{ duration: 0.65, ease: "easeIn" }}
      />
      {children}
    </motion.div>
  );
}
