"use client";
import type { ReactNode } from "react";
import clsx from "./clsx";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  wrap,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
  wrap?: boolean;
}) {
  return (
    <div className={clsx("flex gap-px", wrap ? "flex-wrap" : "flex-nowrap", className)}>
      {options.map((o) => (
        <button key={o.value} title={o.title} className="nx-btn !px-2 !py-[3px]" data-active={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v: number) => String(v),
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="block" title={hint}>
      <div className="flex items-baseline justify-between">
        <span className="nx-label">{label}</span>
        <span className="text-[11px] text-a1">{format(value)}</span>
      </div>
      <input
        type="range"
        className="nx-range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ ["--fill" as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  className,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="nx-label">{label}</span>
      <div className="mt-0.5 flex items-center">
        <input
          type="number"
          className="nx-input w-full"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <span className="ml-1 text-dim">{suffix}</span>}
      </div>
    </label>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="flex w-full items-center justify-between py-1" onClick={() => onChange(!value)}>
      <span className="nx-label !text-ink/80">{label}</span>
      <span className={clsx("relative h-3 w-6 border transition", value ? "border-a1/70 bg-a1/15" : "border-line-2")}>
        <span className={clsx("absolute top-[1px] h-2 w-2 transition-all", value ? "left-[13px] bg-a1 shadow-[0_0_6px_var(--a1)]" : "left-[1px] bg-faint")} />
      </span>
    </button>
  );
}

export function Meter({ value, segments = 20, color = "var(--a1)", className }: { value: number; segments?: number; color?: string; className?: string }) {
  const on = Math.round(Math.max(0, Math.min(1, value)) * segments);
  return (
    <div className={clsx("flex gap-[2px]", className)}>
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="h-[6px] flex-1"
          style={{ background: i < on ? color : "var(--line)", boxShadow: i < on ? `0 0 4px ${color}` : undefined, opacity: i < on ? 0.55 + (0.45 * i) / segments : 1 }}
        />
      ))}
    </div>
  );
}
