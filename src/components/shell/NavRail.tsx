"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { MODULES, moduleForPath } from "@/lib/modules";
import { Icon } from "../ui/Icon";
import { useUI } from "@/lib/store/ui";
import clsx from "../ui/clsx";

export function NavRail() {
  const path = usePathname();
  const active = moduleForPath(path);
  const set = useUI((s) => s.set);
  return (
    <nav className="relative z-20 flex w-[54px] shrink-0 flex-col items-center border-r border-line bg-bg-1/90 py-2">
      <Link href="/" className="mb-3 flex h-9 w-9 items-center justify-center" title="NEXUS">
        <svg viewBox="0 0 32 32" width="26" height="26" className="drop-shadow-[0_0_6px_var(--a1)]">
          <g fill="none" stroke="var(--a1)" strokeWidth="1.3">
            <path d="M16 2 29 9.5v13L16 30 3 22.5v-13z" opacity="0.5" />
            <path d="M9 22V10l14 12V10" />
            <circle cx="16" cy="16" r="1.6" fill="var(--a1)" />
          </g>
        </svg>
      </Link>
      <div className="flex flex-1 flex-col gap-0.5">
        {MODULES.map((m) => {
          const on = m.id === active.id;
          return (
            <Link
              key={m.id}
              href={m.path}
              className={clsx("group relative flex h-[42px] w-[54px] flex-col items-center justify-center gap-0.5 transition", on ? "text-a1" : "text-faint hover:text-ink")}
            >
              {on && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute inset-y-1 left-0 w-[2px] bg-a1 shadow-[0_0_10px_var(--a1)]"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <Icon d={m.icon} size={15} />
              <span className="text-[7.5px] tracking-[0.12em]">{m.code}</span>
              <span className="pointer-events-none absolute left-[58px] z-50 hidden whitespace-nowrap border border-line-2 bg-bg-1 px-2 py-1 text-[10px] text-ink shadow-xl group-hover:block">
                <span className="text-a1">{m.code}</span> {m.title}
                <span className="block text-[9px] text-dim">{m.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <button onClick={() => set({ paletteOpen: true })} className="mb-1 flex h-9 w-9 items-center justify-center text-faint hover:text-a1" title="Command palette (Ctrl/⌘ K)">
        <Icon d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3.5 3.5" size={14} />
      </button>
      <button onClick={() => set({ settingsOpen: true })} className="flex h-9 w-9 items-center justify-center text-faint hover:text-a1" title="System settings">
        <Icon d="M8 10.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" size={14} />
      </button>
    </nav>
  );
}
