"use client";
import { useEffect, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const QUERY = "(min-width: 768px)";
function subscribe(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const useDesktop = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => true);

/** Side drawer on desktop, bottom sheet on mobile. Content renders once. */
export function Drawer({ open, onClose, title, subtitle, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode;
}) {
  const desktop = useDesktop();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const hidden = desktop ? { x: "100%" } : { y: "100%" };

  return (
    <AnimatePresence>
      {open && (
        <div className="no-print fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-[#0b0e26]/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={hidden} animate={{ x: 0, y: 0 }} exit={hidden}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="glass-strong absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-l-3xl md:rounded-tr-none"
          >
            <header className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
              <div>
                <h2 className="font-display text-xl font-semibold">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-line">
                <X className="size-5" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
            {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
