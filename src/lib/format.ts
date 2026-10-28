export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Partner Ledger";

const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrFmt2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

/** ₹1,23,456 — Indian digit grouping. */
export const inr = (n: number, decimals = false) => (decimals ? inrFmt2 : inrFmt).format(n || 0);

/** ₹1.2L / ₹3.4Cr for tight spaces. */
export function inrShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(1)}Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1)}L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(1)}k`;
  return `${sign}₹${Math.round(a)}`;
}

export const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

export function shortDate(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", timeZone: "UTC",
  });
}

export function dateTime(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
}

export const BUSINESS_TYPE_LABEL = {
  RESORT: "Guest stay",
  PHARMACY: "Pharmacy",
  INSTITUTE: "Institute",
  OTHER: "Business",
} as const;

export const ROLE_LABEL = { ADMIN: "Admin", PROPERTY: "Property manager", USER: "Shareholder" } as const;

export const CATEGORY_LABEL: Record<string, string> = {
  RENT: "Rent",
  SALARY: "Staff salary",
  MAINTENANCE: "Maintenance materials",
  OTHERS: "Others",
};

export const CHANNEL_COLOR: Record<string, string> = {
  Direct: "var(--profit)",
  Airbnb: "var(--revenue)",
  "Booking.com": "var(--investor)",
  MakeMyTrip: "#e0702b",
  Goibibo: "#e0702b",
  "Referral / contact": "var(--manager)",
  "Owner / family": "#9b7be8",
  Other: "var(--muted)",
};
