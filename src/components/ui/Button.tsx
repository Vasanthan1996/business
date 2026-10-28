"use client";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "ghost" | "danger" | "soft";

const styles: Record<Variant, string> = {
  primary:
    "bg-ink text-bg hover:opacity-90 shadow-[0_10px_24px_-12px_rgba(20,24,60,0.6)]",
  soft: "glass hover:bg-glass-strong",
  ghost: "hover:bg-line text-ink",
  danger: "bg-expense/12 text-expense hover:bg-expense/20",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean; size?: "sm" | "md" }
>(function Button({ variant = "primary", busy, size = "md", className = "", children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm"
      } ${styles[variant]} ${className}`}
      {...rest}
    >
      {busy && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
