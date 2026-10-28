"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble, BookOpenCheck, FileBarChart2, History, LayoutDashboard, LogOut, Menu,
  Pill, Building2, Users2, Store, X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { api } from "@/lib/client";
import { APP_NAME, ROLE_LABEL } from "@/lib/format";
import type { BusinessType, SessionUser } from "@/lib/types";

export interface NavBusiness { id: string; name: string; type: BusinessType; canEdit: boolean }

export const TYPE_ICON: Record<BusinessType, React.ComponentType<{ className?: string }>> = {
  RESORT: BedDouble,
  PHARMACY: Pill,
  INSTITUTE: BookOpenCheck,
  OTHER: Store,
};

export function AppShell({ user, businesses, children }: { user: SessionUser; businesses: NavBusiness[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setOpen(false);
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[1500px]">
      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 p-4 lg:block">
        <Nav user={user} businesses={businesses} />
      </aside>

      <AnimatePresence>
        {open && (
          <div className="no-print fixed inset-0 z-40 lg:hidden">
            <motion.div className="absolute inset-0 bg-[#0b0e26]/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              className="absolute inset-y-0 left-0 w-72 p-3"
            >
              <button onClick={() => setOpen(false)} className="absolute right-6 top-6 z-10 rounded-full p-1.5 text-muted hover:bg-line" aria-label="Close menu">
                <X className="size-5" />
              </button>
              <Nav user={user} businesses={businesses} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between px-4 py-3 lg:hidden">
          <button onClick={() => setOpen(true)} className="glass rounded-full p-2.5" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <span className="font-display text-base font-semibold">{APP_NAME}</span>
          <ThemeToggle />
        </header>
        <main className="print-full px-4 pb-16 pt-2 sm:px-6 lg:px-8 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}

function Nav({ user, businesses }: { user: SessionUser; businesses: NavBusiness[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = user.role === "ADMIN";

  async function signOut() {
    await api("POST", "/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="glass flex h-full flex-col rounded-[28px] p-3" aria-label="Main">
      <div className="flex items-center gap-2.5 px-2 pb-5 pt-2">
        <Logo />
        <span className="font-display text-lg font-semibold leading-none">{APP_NAME}</span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        <div className="space-y-0.5">
          <Item href="/dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"}>Overview</Item>
          <Item href="/reports" icon={FileBarChart2} active={pathname.startsWith("/reports")}>Monthly reports</Item>
        </div>

        <Group title="Businesses">
          {businesses.length === 0 && <p className="px-3 text-xs text-muted">Nothing assigned to you yet.</p>}
          {businesses.map((b) => (
            <Item key={b.id} href={`/business/${b.id}`} icon={TYPE_ICON[b.type]} active={pathname === `/business/${b.id}`}>
              <span className="truncate">{b.name}</span>
            </Item>
          ))}
        </Group>

        {isAdmin && (
          <Group title="Admin">
            <Item href="/admin/businesses" icon={Building2} active={pathname.startsWith("/admin/businesses")}>Businesses & shares</Item>
            <Item href="/admin/users" icon={Users2} active={pathname.startsWith("/admin/users")}>Accounts</Item>
            <Item href="/admin/audit" icon={History} active={pathname.startsWith("/admin/audit")}>Change log</Item>
          </Group>
        )}
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-center gap-2 px-2">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-revenue to-investor font-display text-sm font-semibold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
          <span className="hidden lg:block"><ThemeToggle /></span>
        </div>
        <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted hover:bg-line hover:text-ink">
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </nav>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-xs font-medium text-muted">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Item({ href, icon: Icon, active, children }: { href: string; icon: React.ComponentType<{ className?: string }>; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition ${active ? "font-medium text-ink" : "text-muted hover:text-ink"}`}
    >
      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-glass-strong shadow-sm" transition={{ type: "spring", stiffness: 450, damping: 36 }} />}
      <Icon className="relative size-4 shrink-0" />
      <span className="relative flex min-w-0 items-center">{children}</span>
    </Link>
  );
}

/** Three stacked slabs: the split of one month's profit. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="4" y="19" width="24" height="7" rx="3" fill="var(--profit)" />
      <rect x="4" y="12" width="17" height="7" rx="3" fill="var(--investor)" />
      <rect x="4" y="5" width="9" height="7" rx="3" fill="var(--manager)" />
    </svg>
  );
}
