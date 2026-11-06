export function mean(a: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return a.length ? s / a.length : 0;
}

export function std(a: ArrayLike<number>, m = mean(a)): number {
  if (a.length < 2) return 0;
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / (a.length - 1));
}

export function covariance(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}

export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const sa = std(a);
  const sb = std(b);
  if (!sa || !sb) return 0;
  return covariance(a, b) / (sa * sb);
}

export function quantile(sorted: ArrayLike<number>, q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function logReturns(prices: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(Math.log(prices[i] / prices[i - 1]));
  return out;
}

export function simpleReturns(prices: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) out.push(prices[i] / prices[i - 1] - 1);
  return out;
}

/** Max drawdown (negative number) and drawdown series. */
export function drawdown(values: ArrayLike<number>): { maxDD: number; series: number[] } {
  let peak = -Infinity;
  let maxDD = 0;
  const series: number[] = [];
  for (let i = 0; i < values.length; i++) {
    peak = Math.max(peak, values[i]);
    const dd = values[i] / peak - 1;
    series.push(dd);
    if (dd < maxDD) maxDD = dd;
  }
  return { maxDD, series };
}

export function linreg(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length);
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  const slope = sxx ? sxy / sxx : 0;
  const intercept = my - slope * mx;
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { slope, intercept, r2 };
}

/** Cholesky decomposition of a symmetric positive (semi)definite matrix. */
export function cholesky(m: number[][]): number[][] {
  const n = m.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = m[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(Math.max(s, 1e-12));
      else L[i][j] = s / L[j][j];
    }
  }
  return L;
}
