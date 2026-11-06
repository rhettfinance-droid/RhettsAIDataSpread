"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { moduleForPath } from "@/lib/modules";
import { useMarket } from "@/lib/store/market";
import { useUI } from "@/lib/store/ui";
import { SIM_SPEED } from "@/lib/sim/engine";

const CLOCKS = [
  { id: "NYC", tz: "America/New_York" },
  { id: "LDN", tz: "Europe/London" },
  { id: "FRA", tz: "Europe/Berlin" },
  { id: "TYO", tz: "Asia/Tokyo" },
  { id: "HKG", tz: "Asia/Hong_Kong" },
];

const SESSIONS = [
  { id: "NYSE", tz: "America/New_York", open: 9.5, close: 16 },
  { id: "LSE", tz: "Europe/London", open: 8, close: 16.5 },
  { id: "TSE", tz: "Asia/Tokyo", open: 9, close: 15.5 },
];

function zoned(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, weekday: "short" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { h: Number(get("hour")) % 24, m: Number(get("minute")), s: get("second"), wd: get("weekday"), text: `${get("hour")}:${get("minute")}` };
}

export function TopBar() {
  const path = usePathname();
  const mod = moduleForPath(path);
  const [now, setNow] = useState<Date | null>(null);
  const tick = useMarket((s) => s.tick);
  const live = useMarket((s) => s.liveSymbols.length);
  const status = useUI((s) => s.dataStatus);
  const set = useUI((s) => s.set);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-20 flex h-[38px] shrink-0 items-center gap-4 whitespace-nowrap border-b border-line bg-bg-1/80 px-3 backdrop-blur">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[15px] font-semibold tracking-[0.32em] text-ink nx-glow-text">NEXUS</span>
        <span className="hidden text-[8.5px] tracking-[0.22em] text-dim xl:inline">GLOBAL FINANCIAL INTELLIGENCE SYSTEM</span>
      </div>
      <div className="h-4 w-px bg-line-2" />
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-a1">{mod.code}</span>
        <span className="tracking-[0.18em] text-ink/90 uppercase">{mod.title}</span>
      </div>

      <button
        onClick={() => set({ paletteOpen: true })}
        className="ml-4 hidden h-[24px] w-[300px] items-center gap-2 border border-line-2 bg-bg/70 px-2 text-left text-[10px] text-faint transition hover:border-line-3 hover:text-dim lg:flex"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3.5 3.5" /></svg>
        Search entities, tickers, modules…
        <span className="ml-auto border border-line-2 px-1 text-[8.5px]">CTRL K</span>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <div className="hidden items-center gap-3 2xl:flex">
          {SESSIONS.map((s) => {
            const z = now ? zoned(now, s.tz) : null;
            const hh = z ? z.h + z.m / 60 : 0;
            const open = !!z && z.wd !== "Sat" && z.wd !== "Sun" && hh >= s.open && hh < s.close;
            return (
              <span key={s.id} className="flex items-center gap-1 text-[9px] tracking-[0.12em]" title={`${s.id} regular session (local exchange time). Holidays not modeled.`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-pos shadow-[0_0_6px_var(--pos)]" : "bg-faint"}`} />
                <span className={open ? "text-ink/80" : "text-faint"}>{s.id}</span>
              </span>
            );
          })}
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {CLOCKS.map((c) => (
            <span key={c.id} className="text-[9.5px]">
              <span className="text-faint">{c.id} </span>
              <span className="text-ink/80">{now ? zoned(now, c.tz).text : "--:--"}</span>
            </span>
          ))}
          <span className="text-[9.5px]">
            <span className="text-faint">UTC </span>
            <span className="text-a1">{now ? now.toISOString().slice(11, 19) : "--:--:--"}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-line-2" />
        <button onClick={() => set({ settingsOpen: true })} className="flex items-center gap-2 text-[9px] tracking-[0.14em]" title="Data sources — open settings">
          {live > 0 ? (
            <span className="flex items-center gap-1 text-pos"><span className="h-1.5 w-1.5 rounded-full bg-pos nx-blink" />LIVE {live}</span>
          ) : null}
          <span className="flex items-center gap-1 text-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-warn nx-blink" />
            SIM ×{SIM_SPEED}
          </span>
          <span className="text-faint">T{String(tick).padStart(5, "0")}</span>
          {status.checked && (
            <span className="text-faint">
              {[status.finnhub && "FINNHUB", status.fred && "FRED", status.sec && "SEC"].filter(Boolean).join("·") || "NO KEYS"}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
