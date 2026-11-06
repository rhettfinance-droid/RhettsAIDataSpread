declare module "d3-force-3d" {
  // Minimal typing for the subset of d3-force-3d that NEXUS uses.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceSimulation(nodes?: any[], numDimensions?: number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceLink(links?: any[]): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceManyBody(): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceCenter(x?: number, y?: number, z?: number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceRadial(r: number, x?: number, y?: number, z?: number): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function forceCollide(r?: number): any;
}
declare module "world-atlas/countries-110m.json" {
  import type { Topology } from "topojson-specification";
  const value: Topology;
  export default value;
}
