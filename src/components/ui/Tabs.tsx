"use client";
import { motion } from "framer-motion";

export function Tabs<T extends string>({ value, onChange, items, id }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: string; icon?: React.ReactNode }[]; id: string;
}) {
  return (
    <div className="glass inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={`relative flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition ${value === it.value ? "text-bg" : "text-muted hover:text-ink"}`}
        >
          {value === it.value && (
            <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
          )}
          <span className="relative flex items-center gap-1.5">{it.icon}{it.label}</span>
        </button>
      ))}
    </div>
  );
}
