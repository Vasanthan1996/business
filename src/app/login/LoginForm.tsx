"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Misc";
import { Logo } from "@/components/shell/AppShell";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { api } from "@/lib/client";
import { APP_NAME } from "@/lib/format";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("POST", "/api/auth/login", { email, password });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in");
      setBusy(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="grid w-full max-w-4xl items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden md:block">
          <SplitIllustration />
          <h1 className="mt-8 font-display text-4xl font-semibold leading-[1.05] tracking-tight">
            Every month, every business, split fairly.
          </h1>
          <p className="mt-3 max-w-sm text-muted">
            Managers record bookings, income and expenses. Investors see the profit and their share as soon as it&apos;s entered.
          </p>
        </div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong rounded-[32px] p-7 sm:p-9"
        >
          <div className="flex items-center gap-2.5">
            <Logo size={34} />
            <span className="font-display text-xl font-semibold">{APP_NAME}</span>
          </div>
          <h2 className="mt-7 font-display text-2xl font-semibold">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use the account your admin created for you.</p>

          <div className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" busy={busy} className="w-full">Sign in</Button>
          </div>
          <p className="mt-6 text-xs text-muted">Forgot your password? Ask your admin to reset it from Accounts.</p>
        </motion.form>
      </div>
    </div>
  );
}

/** Revenue slab breaking into manager and investor slabs — the product in one picture. */
function SplitIllustration() {
  const slab = (x: number, y: number, w: number, c: string, delay: number) => (
    <motion.g initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
      <rect x={x} y={y + 9} width={w} height={26} rx={10} fill={c} opacity={0.35} />
      <rect x={x} y={y} width={w} height={26} rx={10} fill={c} />
    </motion.g>
  );
  return (
    <svg viewBox="0 0 360 150" className="w-full max-w-md" aria-hidden>
      {slab(0, 6, 360, "var(--revenue)", 0.05)}
      {slab(0, 56, 250, "var(--profit)", 0.2)}
      {slab(0, 106, 75, "var(--manager)", 0.35)}
      {slab(85, 106, 165, "var(--investor)", 0.45)}
    </svg>
  );
}
