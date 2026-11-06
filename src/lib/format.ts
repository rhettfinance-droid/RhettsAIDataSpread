export function fmtNum(v: number | null | undefined, d = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function fmtPrice(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const d = a >= 1000 ? 2 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
  return fmtNum(v, d);
}

export function fmtPct(v: number | null | undefined, d = 2, sign = true): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const s = (v * 100).toFixed(d);
  return `${sign && v > 0 ? "+" : ""}${s}%`;
}

/** Billions in → compact string ("$2.41T", "$812.0B", "$45.2M"). */
export function fmtBn(v: number | null | undefined, prefix = "$"): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1000) return `${s}${prefix}${(a / 1000).toFixed(2)}T`;
  if (a >= 1) return `${s}${prefix}${a.toFixed(a >= 100 ? 1 : 2)}B`;
  return `${s}${prefix}${(a * 1000).toFixed(1)}M`;
}

export function fmtCompact(v: number | null | undefined, prefix = ""): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e12) return `${s}${prefix}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}${prefix}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${prefix}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${prefix}${(a / 1e3).toFixed(1)}K`;
  return `${s}${prefix}${a.toFixed(0)}`;
}

export function fmtMoney(v: number | null | undefined, d = 0): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return (v < 0 ? "-$" : "$") + fmtNum(Math.abs(v), d);
}

export function fmtX(v: number | null | undefined, d = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return `${v.toFixed(d)}×`;
}

export function signClass(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v) || v === 0) return "text-dim";
  return v > 0 ? "text-pos" : "text-neg";
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
