"use client";
import { AlertTriangle, Loader2 } from "lucide-react";

export function Empty({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-3xl px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted justify-center">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-expense/10 px-4 py-3 text-sm text-expense">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-manager/12 px-4 py-2.5 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-manager" />
      <span>{children}</span>
    </div>
  );
}

export function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in oklab, ${color ?? "var(--muted)"} 16%, transparent)`, color: color ?? "var(--muted)" }}
    >
      {children}
    </span>
  );
}

/** Tiny inline trend line; colour flips to coral when the last point is a loss. */
export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const w = 96, h = 28;
  if (values.length < 2) return null;
  const max = Math.max(...values, 0), min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - ((v - min) / span) * (h - 4) - 2]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const zeroY = h - ((0 - min) / span) * (h - 4) - 2;
  const color = values[values.length - 1] < 0 ? "var(--expense)" : "var(--profit)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} width={w} height={h} aria-hidden>
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke="var(--line)" strokeWidth="1" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.5" fill={color} />
    </svg>
  );
}
