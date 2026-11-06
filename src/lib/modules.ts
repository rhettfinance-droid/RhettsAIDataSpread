export type ModuleDef = {
  id: string;
  path: string;
  code: string;
  label: string;
  title: string;
  description: string;
  icon: string; // svg path data, 16x16 viewBox, stroke-based
};

export const MODULES: ModuleDef[] = [
  {
    id: "command",
    path: "/",
    code: "00",
    label: "Command",
    title: "Global Command",
    description: "System overview — capital network, cross-asset pulse, macro vitals",
    icon: "M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z",
  },
  {
    id: "network",
    path: "/network",
    code: "01",
    label: "Network",
    title: "Global Financial Network",
    description: "3D map of capital flows, exposures and dependencies between institutions",
    icon: "M8 2.5a1.5 1.5 0 1 1 0 .01M3 12a1.5 1.5 0 1 1 0 .01M13 12a1.5 1.5 0 1 1 0 .01M8 4v3M8 7l-4 4M8 7l4 4M4.5 12h7",
  },
  {
    id: "markets",
    path: "/markets",
    code: "02",
    label: "Markets",
    title: "Global Markets",
    description: "Indices, rates, FX, commodities, crypto, heatmap, breadth and volatility",
    icon: "M2 13l3-4 3 2 3-6 3 3M2 2v12h12",
  },
  {
    id: "flows",
    path: "/flows",
    code: "03",
    label: "Flows",
    title: "Capital Flow Intelligence",
    description: "Sankey of capital from allocators through vehicles into asset classes",
    icon: "M2 4c5 0 5 8 12 8M2 8c5 0 6-4 12-4M2 12h4c3 0 4-4 8-4",
  },
  {
    id: "macro",
    path: "/macro",
    code: "04",
    label: "Macro",
    title: "Macroeconomic Command",
    description: "Rates, inflation, labor, growth, yield curve surface and business cycle",
    icon: "M2 12c2-6 4-8 6-4s4 2 6-4M2 14h12M4 2v2M8 2v2M12 2v2",
  },
  {
    id: "company",
    path: "/company",
    code: "05",
    label: "Company",
    title: "Company Intelligence",
    description: "Financial statements, ratios, DuPont, valuation and peers",
    icon: "M3 14V5l5-3 5 3v9M6 14v-3h4v3M6 7h1M9 7h1M6 9h1M9 9h1",
  },
  {
    id: "portfolio",
    path: "/portfolio",
    code: "06",
    label: "Portfolio",
    title: "Portfolio Intelligence",
    description: "Allocation, performance, drawdown, risk decomposition and correlations",
    icon: "M8 2v6h6A6 6 0 1 1 8 2zM10 1a5 5 0 0 1 5 5h-5z",
  },
  {
    id: "quant",
    path: "/quant",
    code: "07",
    label: "Quant Lab",
    title: "Quantitative Lab",
    description: "Monte Carlo, efficient frontier, DCF, compounding, stress scenarios",
    icon: "M5 2v4L2 13h12L11 6V2M4 2h8M4 10h8",
  },
  {
    id: "globe",
    path: "/globe",
    code: "08",
    label: "Globe",
    title: "Global Economic Map",
    description: "3D globe of financial centers, trade routes, commodities and country data",
    icon: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zM2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12",
  },
];

export function moduleForPath(path: string): ModuleDef {
  return MODULES.find((m) => (m.path === "/" ? path === "/" : path.startsWith(m.path))) ?? MODULES[0];
}
