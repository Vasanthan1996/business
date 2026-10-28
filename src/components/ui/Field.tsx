"use client";
import { forwardRef } from "react";

const base =
  "rounded-xl border border-line bg-glass-strong px-3 h-10 text-sm text-ink placeholder:text-muted/70 outline-none transition focus:border-investor focus:ring-2 focus:ring-investor/25";

/** Full width unless the caller sets its own width. */
const width = (cls: string) => (/(^|\s)w-/.test(cls) ? "" : "w-full");

export function Field({ label, hint, error, children, className = "" }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-expense">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...p }, ref) {
    return <input ref={ref} className={`${base} ${width(className)} ${className}`} {...p} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", ...p }, ref) {
    return <select ref={ref} className={`${base} pr-8 ${width(className)} ${className}`} {...p} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...p }, ref) {
    return <textarea ref={ref} className={`${base} h-auto min-h-20 py-2 ${width(className)} ${className}`} {...p} />;
  },
);
