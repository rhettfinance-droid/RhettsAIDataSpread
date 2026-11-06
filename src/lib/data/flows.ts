/**
 * Illustrative capital-allocation model for the Flow Intelligence module.
 * Magnitudes are stylized annual allocation flows in $T (MODEL), built to be
 * directionally reasonable — they are not measured data.
 */

export type FlowNode = { id: string; label: string; col: 0 | 1 | 2; color: string; desc: string };
export type FlowLink = { s: string; t: string; v: number };

export const FLOW_NODES: FlowNode[] = [
  { id: "hh", label: "Households & Retail", col: 0, color: "#35e7ff", desc: "Direct savers, brokerage & retirement accounts" },
  { id: "pen", label: "Pension Funds", col: 0, color: "#4d8bff", desc: "Defined-benefit and defined-contribution plans" },
  { id: "ins", label: "Insurers", col: 0, color: "#9fd4ff", desc: "Life & P&C general accounts (liability-matched)" },
  { id: "swf", label: "Sovereign Wealth", col: 0, color: "#a77bff", desc: "Commodity- and surplus-funded state investors" },
  { id: "cb", label: "Central Bank Reserves", col: 0, color: "#ffd166", desc: "FX reserve managers" },
  { id: "hf", label: "Hedge Funds", col: 0, color: "#ff3d8b", desc: "Leveraged active strategies" },
  { id: "corp", label: "Corporate Treasuries", col: 0, color: "#3dff9a", desc: "Buybacks, M&A and corporate cash" },

  { id: "etf", label: "Passive ETFs & Index", col: 1, color: "#35e7ff", desc: "Index funds and ETFs" },
  { id: "mf", label: "Active Mutual Funds", col: 1, color: "#4d8bff", desc: "Actively managed pooled funds" },
  { id: "dir", label: "Direct & Mandates", col: 1, color: "#9fd4ff", desc: "Segregated accounts and direct holdings" },
  { id: "pvt", label: "Private Funds", col: 1, color: "#a77bff", desc: "Private equity, private credit, infrastructure" },
  { id: "mmf", label: "Money Market Funds", col: 1, color: "#ffd166", desc: "Short-term liquidity vehicles" },

  { id: "useq", label: "US Equities", col: 2, color: "#35e7ff", desc: "" },
  { id: "intleq", label: "Intl & EM Equities", col: 2, color: "#3d7bff", desc: "" },
  { id: "govt", label: "Government Bonds", col: 2, color: "#e8f0ff", desc: "" },
  { id: "credit", label: "Corporate Credit", col: 2, color: "#9fd4ff", desc: "" },
  { id: "pm", label: "Private Markets", col: 2, color: "#a77bff", desc: "" },
  { id: "re", label: "Real Estate", col: 2, color: "#ff8ad0", desc: "" },
  { id: "cmd", label: "Commodities & Gold", col: 2, color: "#ff9f43", desc: "" },
  { id: "crypto", label: "Digital Assets", col: 2, color: "#ff3d64", desc: "" },
  { id: "cash", label: "Cash & T-Bills", col: 2, color: "#ffd166", desc: "" },
];

const BASE: FlowLink[] = [
  // sources → vehicles
  { s: "hh", t: "etf", v: 1.6 }, { s: "hh", t: "mf", v: 0.8 }, { s: "hh", t: "dir", v: 0.9 }, { s: "hh", t: "mmf", v: 0.9 }, { s: "hh", t: "pvt", v: 0.15 },
  { s: "pen", t: "etf", v: 0.6 }, { s: "pen", t: "mf", v: 0.4 }, { s: "pen", t: "dir", v: 0.9 }, { s: "pen", t: "pvt", v: 0.7 },
  { s: "ins", t: "dir", v: 1.1 }, { s: "ins", t: "pvt", v: 0.35 }, { s: "ins", t: "mmf", v: 0.15 },
  { s: "swf", t: "dir", v: 0.5 }, { s: "swf", t: "pvt", v: 0.35 }, { s: "swf", t: "etf", v: 0.15 },
  { s: "cb", t: "dir", v: 0.7 }, { s: "cb", t: "mmf", v: 0.15 },
  { s: "hf", t: "dir", v: 0.6 }, { s: "hf", t: "etf", v: 0.2 },
  { s: "corp", t: "dir", v: 0.9 }, { s: "corp", t: "mmf", v: 0.5 },
  // vehicles → assets
  { s: "etf", t: "useq", v: 1.45 }, { s: "etf", t: "intleq", v: 0.45 }, { s: "etf", t: "govt", v: 0.25 }, { s: "etf", t: "credit", v: 0.25 }, { s: "etf", t: "cmd", v: 0.08 }, { s: "etf", t: "crypto", v: 0.07 },
  { s: "mf", t: "useq", v: 0.45 }, { s: "mf", t: "intleq", v: 0.25 }, { s: "mf", t: "credit", v: 0.3 }, { s: "mf", t: "govt", v: 0.2 },
  { s: "dir", t: "useq", v: 1.2 }, { s: "dir", t: "govt", v: 1.6 }, { s: "dir", t: "credit", v: 0.9 }, { s: "dir", t: "intleq", v: 0.4 }, { s: "dir", t: "re", v: 0.45 }, { s: "dir", t: "cmd", v: 0.25 }, { s: "dir", t: "crypto", v: 0.08 },
  { s: "pvt", t: "pm", v: 1.25 }, { s: "pvt", t: "re", v: 0.2 }, { s: "pvt", t: "credit", v: 0.1 },
  { s: "mmf", t: "cash", v: 1.55 }, { s: "mmf", t: "govt", v: 0.25 },
];

export type FlowScenario = { id: string; label: string; desc: string; mult: Partial<Record<string, number>>; vehicle?: Partial<Record<string, number>> };

export const FLOW_SCENARIOS: FlowScenario[] = [
  { id: "base", label: "Baseline", desc: "Structural allocation mix in a calm, positive-growth regime.", mult: {} },
  { id: "riskon", label: "Risk-On", desc: "Equity and credit inflows, cash drawdown, crypto bid.", mult: { useq: 1.45, intleq: 1.35, credit: 1.25, crypto: 2.2, cash: 0.45, govt: 0.75, pm: 1.15 }, vehicle: { mmf: 0.5, etf: 1.3 } },
  { id: "riskoff", label: "Risk-Off", desc: "Flight to quality: Treasuries and money funds absorb capital.", mult: { useq: 0.45, intleq: 0.35, credit: 0.6, crypto: 0.2, govt: 1.6, cash: 1.9, cmd: 1.2, pm: 0.7 }, vehicle: { mmf: 1.9, etf: 0.7, pvt: 0.7 } },
  { id: "infl", label: "Inflation Shock", desc: "Real assets and commodities over nominal bonds.", mult: { cmd: 2.6, re: 1.4, govt: 0.55, credit: 0.7, useq: 0.85, cash: 1.3 } },
  { id: "cuts", label: "Easing Cycle", desc: "Falling rates push cash into duration and risk assets.", mult: { cash: 0.55, govt: 1.35, credit: 1.3, useq: 1.2, re: 1.3, pm: 1.2 }, vehicle: { mmf: 0.55 } },
];

export function scenarioLinks(s: FlowScenario): FlowLink[] {
  // apply asset multipliers on vehicle→asset links, then rescale source→vehicle links to conserve vehicle throughput
  const out = BASE.map((l) => ({ ...l }));
  const vehOut: Record<string, number> = {};
  for (const l of out) {
    const tcol = FLOW_NODES.find((n) => n.id === l.t)!.col;
    if (tcol === 2) {
      l.v *= s.mult[l.t] ?? 1;
      vehOut[l.s] = (vehOut[l.s] ?? 0) + l.v;
    }
  }
  const vehIn: Record<string, number> = {};
  for (const l of out) if (FLOW_NODES.find((n) => n.id === l.t)!.col === 1) {
    l.v *= s.vehicle?.[l.t] ?? 1;
    vehIn[l.t] = (vehIn[l.t] ?? 0) + l.v;
  }
  // balance: scale vehicle→asset to match inflows
  for (const l of out) {
    const tcol = FLOW_NODES.find((n) => n.id === l.t)!.col;
    if (tcol === 2 && vehOut[l.s]) l.v *= (vehIn[l.s] ?? vehOut[l.s]) / vehOut[l.s];
  }
  return out;
}
