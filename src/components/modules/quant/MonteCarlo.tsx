"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "../../ui/Panel";
import { Slider, Toggle } from "../../ui/Controls";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { monteCarlo, type MCInput, type MCResult } from "@/lib/finance/quant";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import { usePalette } from "@/lib/store/settings";

function FanCanvas({ res, target }: { res: MCResult; target: number }) {
  const [ref, { w, h }] = useSize();
  const canvas = useRef<HTMLCanvasElement>(null);
  const pal = usePalette();
  const m = { t: 10, r: 60, b: 20, l: 56 };
  const ymax = Math.max(res.bands.p95[res.bands.p95.length - 1] * 1.05, target * 1.1);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const T = res.times[res.times.length - 1];
    const X = (t: number) => m.l + (t / T) * (w - m.l - m.r);
    const Y = (v: number) => h - m.b - (Math.min(v, ymax) / ymax) * (h - m.t - m.b);
    // grid
    ctx.strokeStyle = "rgba(130,160,200,0.09)";
    ctx.fillStyle = "rgba(124,135,152,0.8)";
    ctx.font = "9px JetBrains Mono Variable, monospace";
    for (let k = 0; k <= 5; k++) {
      const v = (ymax / 5) * k;
      ctx.beginPath();
      ctx.moveTo(m.l, Y(v));
      ctx.lineTo(w - m.r, Y(v));
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(fmtCompact(v, "$"), m.l - 6, Y(v) + 3);
    }
    ctx.textAlign = "center";
    for (let k = 0; k <= 6; k++) {
      const t = (T / 6) * k;
      ctx.fillText(`Y${t.toFixed(0)}`, X(t), h - 6);
    }
    // sample paths (additive glow)
    ctx.globalCompositeOperation = "lighter";
    for (const p of res.samples) {
      const end = p[p.length - 1];
      const good = end >= target;
      ctx.strokeStyle = good ? `${pal.a1}22` : "rgba(255,61,100,0.13)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < p.length; i++) {
        const x = X(res.times[i]);
        const y = Y(p[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    // bands
    const band = (lo: number[], hi: number[], color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      lo.forEach((v, i) => (i ? ctx.lineTo(X(res.times[i]), Y(v)) : ctx.moveTo(X(res.times[i]), Y(v))));
      for (let i = hi.length - 1; i >= 0; i--) ctx.lineTo(X(res.times[i]), Y(hi[i]));
      ctx.closePath();
      ctx.fill();
    };
    band(res.bands.p5, res.bands.p95, `${pal.a3}1c`);
    band(res.bands.p25, res.bands.p75, `${pal.a1}26`);
    const line = (arr: number[], color: string, width: number, dash: number[] = []) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.shadowColor = color;
      ctx.shadowBlur = width > 1.5 ? 8 : 0;
      ctx.beginPath();
      arr.forEach((v, i) => (i ? ctx.lineTo(X(res.times[i]), Y(v)) : ctx.moveTo(X(res.times[i]), Y(v))));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([]);
    };
    line(res.bands.p5, "rgba(255,61,100,0.8)", 1, [3, 3]);
    line(res.bands.p95, "rgba(61,255,154,0.8)", 1, [3, 3]);
    line(res.bands.p50, pal.a1, 2);
    // target
    ctx.strokeStyle = "rgba(255,181,71,0.7)";
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(m.l, Y(target));
    ctx.lineTo(w - m.r, Y(target));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,181,71,0.9)";
    ctx.textAlign = "left";
    ctx.fillText("TARGET", w - m.r + 4, Y(target) + 3);
    const lab = (v: number, t: string, col: string) => {
      ctx.fillStyle = col;
      ctx.fillText(`${t} ${fmtCompact(v, "$")}`, w - m.r + 4, Y(v) + 3);
    };
    const n = res.times.length - 1;
    lab(res.bands.p95[n], "P95", "rgba(61,255,154,0.9)");
    lab(res.bands.p50[n], "P50", pal.a1);
    lab(res.bands.p5[n], "P5", "rgba(255,61,100,0.9)");
  }, [res, w, h, ymax, target, pal, m.l, m.r, m.t, m.b]);
  return (
    <div ref={ref} className="h-full w-full">
      <canvas ref={canvas} style={{ width: w, height: h }} />
    </div>
  );
}

function Histogram({ res, target }: { res: MCResult; target: number }) {
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const bins = useMemo(() => {
    const t = res.terminal;
    const lo = Math.log(Math.max(1, t[Math.floor(t.length * 0.005)]));
    const hi = Math.log(t[Math.floor(t.length * 0.995)]);
    const N = 48;
    const b = Array.from({ length: N }, (_, i) => ({ x0: Math.exp(lo + ((hi - lo) * i) / N), x1: Math.exp(lo + ((hi - lo) * (i + 1)) / N), n: 0 }));
    for (const v of t) {
      const k = Math.floor(((Math.log(Math.max(1, v)) - lo) / (hi - lo)) * N);
      if (k >= 0 && k < N) b[k].n++;
    }
    return { b, lo, hi };
  }, [res]);
  const mx = Math.max(...bins.b.map((x) => x.n));
  const bw = w / bins.b.length;
  const tx = ((Math.log(target) - bins.lo) / (bins.hi - bins.lo)) * w;
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && (
        <svg width={w} height={h}>
          {bins.b.map((b, i) => {
            const bh = (b.n / mx) * (h - 16);
            const good = b.x0 >= target;
            return (
              <rect
                key={i}
                x={i * bw + 0.5}
                width={bw - 1}
                y={h - 14 - bh}
                height={bh}
                fill={good ? "var(--a1)" : "var(--neg)"}
                opacity={0.7}
                onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div>{fmtCompact(b.x0, "$")} – {fmtCompact(b.x1, "$")}</div><div className="text-dim">{b.n} paths ({((b.n / res.terminal.length) * 100).toFixed(1)}%)</div></div>)}
                onMouseLeave={() => tip.hide()}
              />
            );
          })}
          {tx > 0 && tx < w && <line x1={tx} x2={tx} y1={0} y2={h - 14} stroke="var(--warn)" strokeDasharray="3 3" />}
          <text x={2} y={h - 3} fontSize={8} fill="var(--text-faint)">
            {fmtCompact(Math.exp(bins.lo), "$")}
          </text>
          <text x={w - 2} y={h - 3} fontSize={8} textAnchor="end" fill="var(--text-faint)">
            {fmtCompact(Math.exp(bins.hi), "$")} (log scale)
          </text>
        </svg>
      )}
    </div>
  );
}

export function MonteCarloTab() {
  const [inp, setInp] = useState<MCInput>({ initial: 100000, contribution: 12000, mu: 0.07, sigma: 0.15, years: 30, paths: 10000, fatTails: false, inflation: 0, target: 1500000, seed: 42 });
  const [res, setRes] = useState<MCResult | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<MCInput>) => setInp((s) => ({ ...s, ...p }));
  useEffect(() => {
    setBusy(true);
    const id = setTimeout(() => {
      setRes(monteCarlo(inp));
      setBusy(false);
    }, 30);
    return () => clearTimeout(id);
  }, [inp]);
  return (
    <div className="grid h-full grid-cols-[250px_minmax(0,1fr)_280px] gap-2">
      <Panel title="Simulation Inputs" code="07.MC" source="MODEL" bodyClassName="space-y-3 overflow-y-auto p-3">
        <Slider label="Initial capital" value={inp.initial} min={0} max={2000000} step={10000} onChange={(v) => set({ initial: v })} format={(v) => fmtMoney(v)} />
        <Slider label="Annual contribution" value={inp.contribution} min={0} max={100000} step={1000} onChange={(v) => set({ contribution: v })} format={(v) => fmtMoney(v)} />
        <Slider label="Expected return μ" value={inp.mu} min={0} max={0.15} step={0.0025} onChange={(v) => set({ mu: v })} format={(v) => fmtPct(v, 2, false)} />
        <Slider label="Volatility σ" value={inp.sigma} min={0.02} max={0.45} step={0.005} onChange={(v) => set({ sigma: v })} format={(v) => fmtPct(v, 1, false)} />
        <Slider label="Horizon (years)" value={inp.years} min={1} max={50} step={1} onChange={(v) => set({ years: v })} />
        <Slider label="Inflation (real terms)" value={inp.inflation} min={0} max={0.06} step={0.0025} onChange={(v) => set({ inflation: v })} format={(v) => (v ? fmtPct(v, 2, false) : "nominal")} />
        <Slider label="Target wealth" value={inp.target} min={100000} max={10000000} step={50000} onChange={(v) => set({ target: v })} format={(v) => fmtCompact(v, "$")} />
        <Slider label="Paths" value={inp.paths} min={1000} max={20000} step={1000} onChange={(v) => set({ paths: v })} format={(v) => v.toLocaleString()} />
        <Toggle label="Fat tails (Student-t, ν=4)" value={inp.fatTails} onChange={(v) => set({ fatTails: v })} />
        <button className="nx-btn w-full !justify-center !py-1.5" onClick={() => set({ seed: Math.floor(Math.random() * 1e9) })}>
          ↻ Re-sample paths
        </button>
        <div className="border-t border-line pt-2 text-[9px] leading-relaxed text-faint">
          Monthly geometric Brownian motion: V<sub>t+1</sub> = V<sub>t</sub>·exp((μ−π−σ²/2)Δt + σ√Δt·Z) + c. Contributions paid monthly.
        </div>
      </Panel>
      <Panel
        title={`Wealth Fan · ${inp.paths.toLocaleString()} paths`}
        code="07.MC.A"
        source="MODEL"
        expandId="mc-fan"
        right={<span className={`text-[9px] ${busy ? "text-a1 nx-blink" : "text-faint"}`}>{busy ? "SIMULATING…" : res ? `${res.ms.toFixed(0)} ms` : ""}</span>}
        bodyClassName="flex flex-col"
      >
        <div className="flex gap-4 px-3 pt-1.5 text-[9px] text-dim">
          <span>
            <span className="text-a3">▓</span> P5–P95
          </span>
          <span>
            <span className="text-a1">▓</span> P25–P75
          </span>
          <span>
            <span className="text-a1">━</span> median
          </span>
          <span>
            <span className="text-a1">⋯</span> paths ending above target · <span className="text-neg">⋯</span> below
          </span>
        </div>
        <div className="min-h-0 flex-1">{res && <FanCanvas res={res} target={inp.target} />}</div>
      </Panel>
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <Panel title="Outcome Statistics" code="07.MC.B" source="MODEL" bodyClassName="p-3">
          {res && (
            <div className="space-y-2">
              <div className="text-center">
                <div className="nx-label">P(reach target)</div>
                <div className="font-display text-[32px] leading-tight text-a1 nx-glow-text">{(res.probTarget * 100).toFixed(1)}%</div>
              </div>
              {[
                ["Median terminal", fmtMoney(res.bands.p50[res.bands.p50.length - 1])],
                ["Mean terminal", fmtMoney(res.mean)],
                ["5th percentile", fmtMoney(res.bands.p5[res.bands.p5.length - 1])],
                ["95th percentile", fmtMoney(res.bands.p95[res.bands.p95.length - 1])],
                ["Total contributed", fmtMoney(res.contributed)],
                ["P(end < contributed)", fmtPct(res.probLoss, 1, false)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-line/50 pb-1 text-[10px]">
                  <span className="text-dim">{k}</span>
                  <span className="text-ink">{v}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Terminal Distribution" code="07.MC.C" source="MODEL" bodyClassName="p-2">
          {res && <Histogram res={res} target={inp.target} />}
        </Panel>
      </div>
    </div>
  );
}
