"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { getHistory, type Bar } from "@/lib/sim/engine";
import { useQuote } from "@/lib/store/market";
import { INSTRUMENT_MAP } from "@/lib/data/universe";
import { usePalette } from "@/lib/store/settings";

export type ChartStyle = "candles" | "line" | "area";

function sma(v: number[], n: number) {
  const out: (number | null)[] = [];
  let s = 0;
  for (let i = 0; i < v.length; i++) {
    s += v[i];
    if (i >= n) s -= v[i - n];
    out.push(i >= n - 1 ? s / n : null);
  }
  return out;
}

function rsi(v: number[], n = 14) {
  const out: (number | null)[] = [null];
  let g = 0;
  let l = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    const up = Math.max(0, d);
    const dn = Math.max(0, -d);
    if (i <= n) {
      g += up / n;
      l += dn / n;
      out.push(i === n ? 100 - 100 / (1 + g / (l || 1e-9)) : null);
    } else {
      g = (g * (n - 1) + up) / n;
      l = (l * (n - 1) + dn) / n;
      out.push(100 - 100 / (1 + g / (l || 1e-9)));
    }
  }
  return out;
}

function nextBusinessDay(t: number) {
  const d = new Date(t * 1000);
  do d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return Math.floor(d.getTime() / 1000);
}

export function CandleChart({ symbol, range, style, showBands, showProfile }: { symbol: string; range: number; style: ChartStyle; showBands: boolean; showProfile: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area"> | null>(null);
  const volRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [profile, setProfile] = useState<{ y: number; h: number; v: number; up: number }[]>([]);
  const q = useQuote(symbol);
  const pal = usePalette();
  const inst = INSTRUMENT_MAP[symbol];
  const bars = useMemo(() => getHistory(symbol).slice(-range), [symbol, range]);
  const todayTime = useMemo(() => (bars.length ? nextBusinessDay(bars[bars.length - 1].time) : 0), [bars]);
  const lastBar = bars[bars.length - 1];
  const decimals = inst?.decimals ?? (lastBar && lastBar.close < 10 ? 4 : 2);

  useEffect(() => {
    if (!el.current) return;
    const chart = createChart(el.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#6f7a8c",
        fontFamily: "JetBrains Mono Variable, monospace",
        fontSize: 9,
        attributionLogo: false,
        panes: { separatorColor: "rgba(130,160,200,0.14)", separatorHoverColor: "rgba(130,160,200,0.3)" },
      },
      grid: { vertLines: { color: "rgba(130,160,200,0.05)" }, horzLines: { color: "rgba(130,160,200,0.05)" } },
      rightPriceScale: { borderColor: "rgba(130,160,200,0.15)" },
      timeScale: { borderColor: "rgba(130,160,200,0.15)", rightOffset: 4, barSpacing: 6 },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(160,200,255,0.35)", labelBackgroundColor: "#0b1018" },
        horzLine: { color: "rgba(160,200,255,0.35)", labelBackgroundColor: "#0b1018" },
      },
    });
    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // (re)build series when inputs change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !bars.length) return;
    // clear existing series
    for (const p of chart.panes()) for (const s of p.getSeries()) chart.removeSeries(s);
    const up = "#22f5a0";
    const dn = "#ff3d64";
    const fmt = { type: "price" as const, precision: decimals, minMove: 1 / 10 ** decimals };
    let main: ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | ISeriesApi<"Area">;
    const closes = bars.map((b) => b.close);
    const t = (b: Bar) => b.time as UTCTimestamp;
    if (style === "candles") {
      const s = chart.addSeries(CandlestickSeries, { upColor: up, downColor: dn, borderVisible: false, wickUpColor: up, wickDownColor: dn, priceFormat: fmt });
      s.setData(bars.map((b) => ({ time: t(b), open: b.open, high: b.high, low: b.low, close: b.close })));
      main = s;
    } else if (style === "line") {
      const s = chart.addSeries(LineSeries, { color: pal.a1, lineWidth: 2, priceFormat: fmt });
      s.setData(bars.map((b) => ({ time: t(b), value: b.close })));
      main = s;
    } else {
      const s = chart.addSeries(AreaSeries, { lineColor: pal.a1, topColor: pal.a1 + "55", bottomColor: pal.a1 + "00", lineWidth: 2, priceFormat: fmt });
      s.setData(bars.map((b) => ({ time: t(b), value: b.close })));
      main = s;
    }
    mainRef.current = main;
    const ma20 = sma(closes, 20);
    const ma50 = sma(closes, 50);
    const l20 = chart.addSeries(LineSeries, { color: pal.a3, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    l20.setData(bars.flatMap((b, i) => (ma20[i] === null ? [] : [{ time: t(b), value: ma20[i] as number }])));
    const l50 = chart.addSeries(LineSeries, { color: "#ffb547", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    l50.setData(bars.flatMap((b, i) => (ma50[i] === null ? [] : [{ time: t(b), value: ma50[i] as number }])));
    if (showBands) {
      const sd: (number | null)[] = closes.map((_, i) => {
        if (i < 19) return null;
        const w = closes.slice(i - 19, i + 1);
        const m = w.reduce((a, b) => a + b, 0) / 20;
        return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / 20);
      });
      for (const k of [2, -2]) {
        const s = chart.addSeries(LineSeries, { color: "rgba(154,107,255,0.45)", lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
        s.setData(bars.flatMap((b, i) => (ma20[i] === null || sd[i] === null ? [] : [{ time: t(b), value: (ma20[i] as number) + k * (sd[i] as number) }])));
      }
    }
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    vol.setData(bars.map((b) => ({ time: t(b), value: b.volume, color: b.close >= b.open ? "rgba(34,245,160,0.28)" : "rgba(255,61,100,0.28)" })));
    volRef.current = vol;
    // RSI pane
    const r = rsi(closes);
    const rs = chart.addSeries(LineSeries, { color: pal.a1, lineWidth: 1, priceLineVisible: false, lastValueVisible: true, priceFormat: { type: "price", precision: 0, minMove: 1 } }, 1);
    rs.setData(bars.flatMap((b, i) => (r[i] === null ? [] : [{ time: t(b), value: r[i] as number }])));
    rs.createPriceLine({ price: 70, color: "rgba(255,61,100,0.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
    rs.createPriceLine({ price: 30, color: "rgba(34,245,160,0.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
    // keep the RSI pane compact regardless of rebuilds or resizes
    const panes = chart.panes();
    if (panes[1]) {
      panes[0].setStretchFactor(0.82);
      panes[1].setStretchFactor(0.18);
    }
    chart.timeScale().fitContent();
  }, [bars, style, showBands, decimals, pal]);

  // live update of today's bar
  useEffect(() => {
    const main = mainRef.current;
    if (!main || !q || !lastBar) return;
    const time = todayTime as UTCTimestamp;
    try {
      if (style === "candles") {
        (main as ISeriesApi<"Candlestick">).update({ time, open: q.prevClose, high: Math.max(q.high, q.prevClose, q.price), low: Math.min(q.low, q.prevClose, q.price), close: q.price });
      } else {
        (main as ISeriesApi<"Line">).update({ time, value: q.price });
      }
      volRef.current?.update({ time, value: q.volume, color: q.price >= q.prevClose ? "rgba(34,245,160,0.4)" : "rgba(255,61,100,0.4)" });
    } catch {
      /* series replaced between renders */
    }
  }, [q, style, todayTime, lastBar]);

  // volume profile overlay
  useEffect(() => {
    if (!showProfile) {
      setProfile([]);
      return;
    }
    const chart = chartRef.current;
    let raf = 0;
    const compute = () => {
      const main = mainRef.current;
      if (!chart || !main || !bars.length) return;
      const lr = chart.timeScale().getVisibleLogicalRange();
      const from = Math.max(0, Math.floor(lr?.from ?? 0));
      const to = Math.min(bars.length - 1, Math.ceil(lr?.to ?? bars.length - 1));
      const vis = bars.slice(from, to + 1);
      if (!vis.length) return;
      const lo = Math.min(...vis.map((b) => b.low));
      const hi = Math.max(...vis.map((b) => b.high));
      const N = 28;
      const step = (hi - lo) / N || 1;
      const buckets = Array.from({ length: N }, () => ({ v: 0, up: 0 }));
      for (const b of vis) {
        const mid = (b.high + b.low + b.close) / 3;
        const k = Math.min(N - 1, Math.max(0, Math.floor((mid - lo) / step)));
        buckets[k].v += b.volume;
        if (b.close >= b.open) buckets[k].up += b.volume;
      }
      const mx = Math.max(...buckets.map((b) => b.v)) || 1;
      const out = buckets.map((b, k) => {
        const y0 = main.priceToCoordinate(lo + (k + 1) * step);
        const y1 = main.priceToCoordinate(lo + k * step);
        return { y: y0 ?? 0, h: Math.max(1, (y1 ?? 0) - (y0 ?? 0) - 1), v: b.v / mx, up: b.v ? b.up / b.v : 0 };
      });
      setProfile(out);
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    const t = setTimeout(schedule, 60);
    chart?.timeScale().subscribeVisibleLogicalRangeChange(schedule);
    const ro = new ResizeObserver(schedule);
    if (el.current) ro.observe(el.current);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      chart?.timeScale().unsubscribeVisibleLogicalRangeChange(schedule);
      ro.disconnect();
    };
  }, [showProfile, bars, style, showBands]);

  return (
    <div className="relative h-full w-full">
      <div ref={el} className="absolute inset-0" />
      {showProfile && (
        <div className="pointer-events-none absolute bottom-[96px] right-[64px] top-0 w-[120px]">
          {profile.map((p, i) => (
            <div key={i} className="absolute right-0 flex" style={{ top: p.y, height: p.h, width: `${p.v * 100}%` }}>
              <div style={{ width: `${p.up * 100}%`, background: "rgba(34,245,160,0.16)" }} />
              <div style={{ width: `${(1 - p.up) * 100}%`, background: "rgba(255,61,100,0.16)" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
