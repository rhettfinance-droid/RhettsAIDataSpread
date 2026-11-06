"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import clsx from "./clsx";
import { SourceTag, type Source } from "./SourceTag";
import { useUI } from "@/lib/store/ui";

type PanelProps = {
  title: ReactNode;
  code?: string;
  source?: Source;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** unique id enables full-screen expansion */
  expandId?: string;
  delay?: number;
};

function PanelInner({ title, code, source, right, children, bodyClassName, expandId, full }: PanelProps & { full?: boolean }) {
  const set = useUI((s) => s.set);
  return (
    <>
      <div className="flex h-[26px] shrink-0 items-center gap-2 border-b border-line px-2.5">
        {code && <span className="text-[9px] text-a1/80">{code}</span>}
        <span className="nx-label truncate !text-ink/85">/ {title}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {right}
          {source && <SourceTag source={source} />}
          {expandId && (
            <button
              onClick={() => set({ fullscreenId: full ? null : expandId })}
              className="ml-0.5 flex h-4 w-4 items-center justify-center text-faint transition hover:text-a1"
              title={full ? "Exit full-screen (Esc)" : "Expand to full-screen"}
              aria-label={full ? "Exit full-screen" : "Expand panel"}
            >
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                {full ? <path d="M4 1v3H1M6 9V6h3M1 6h3v3M9 4H6V1" /> : <path d="M1 4V1h3M9 6v3H6M6 1h3v3M4 9H1V6" />}
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className={clsx("relative min-h-0 flex-1", bodyClassName)}>{children}</div>
    </>
  );
}

export function Panel(props: PanelProps) {
  const fullscreenId = useUI((s) => s.fullscreenId);
  const set = useUI((s) => s.set);
  const isFull = !!props.expandId && fullscreenId === props.expandId;

  useEffect(() => {
    if (!isFull) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && set({ fullscreenId: null });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFull, set]);

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
        transition={{ duration: 0.5, delay: props.delay ?? 0, ease: [0.2, 0.7, 0.2, 1] }}
        className={clsx("nx-panel flex min-h-0 flex-col", props.className)}
      >
        {isFull ? (
          <div className="flex flex-1 items-center justify-center text-faint nx-label">— expanded —</div>
        ) : (
          <PanelInner {...props} />
        )}
      </motion.section>
      {isFull &&
        typeof document !== "undefined" &&
        createPortal(
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="nx-panel fixed inset-3 z-[150] flex flex-col bg-bg/95 shadow-[0_0_80px_rgba(0,0,0,0.9)]"
          >
            <PanelInner {...props} full />
          </motion.div>,
          document.body,
        )}
    </>
  );
}
