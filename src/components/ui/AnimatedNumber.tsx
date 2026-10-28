"use client";
import { useEffect, useRef } from "react";
import { animate, useInView } from "framer-motion";
import { inr } from "@/lib/format";

/** Counts up to `value` once when it scrolls into view. */
export function AnimatedNumber({ value, format = (n: number) => inr(n), className = "" }: {
  value: number; format?: (n: number) => string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const from = useRef(0);
  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = format(v)),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView, format]);
  return <span ref={ref} className={`num ${className}`}>{format(0)}</span>;
}
