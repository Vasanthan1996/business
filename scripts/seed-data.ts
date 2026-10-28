/**
 * Starting data, migrated from "AURA VASANTH OCT 26.xlsx".
 *
 * The old sheet had one column group per floor (Ground / First / Second),
 * the guest name repeated on every night of the stay, and the amount on the
 * first night only. Each run of rows becomes one booking here:
 *   check_in  = first night, check_out = morning after the last night,
 *   amount    = the amount on the first row, channel = REMARKS column.
 * Blank remarks are recorded as "Direct"; "Contact" as "Referral / contact";
 * "Owner brother" as "Owner / family" with the original note kept in remarks.
 */

export const SEED_BUSINESSES = [
  {
    id: "BIZ-AURA",
    name: "THE AURA COMFORT STAY",
    type: "RESORT",
    location: "",
    status: "ACTIVE",
    manager_share_pct: 30,
    currency: "INR",
    notes: "Leased guest stay. 3 floors, 1 room per floor.",
  },
  {
    id: "BIZ-GENERIC-ADHAAR",
    name: "Generic Adhaar",
    type: "PHARMACY",
    location: "Villupuram",
    status: "ACTIVE",
    manager_share_pct: 30,
    currency: "INR",
    notes: "Manager share is a placeholder — confirm the agreed percentage.",
  },
  {
    id: "BIZ-ARIVU",
    name: "ARIVU Institute of AI & Analytics",
    type: "INSTITUTE",
    location: "Villupuram",
    status: "ACTIVE",
    manager_share_pct: 30,
    currency: "INR",
    notes: "Manager share is a placeholder — confirm the agreed percentage.",
  },
] as const;

export const SEED_UNITS = [
  { id: "U-AURA-G", business_id: "BIZ-AURA", floor: 0, floor_label: "Ground floor", name: "Ground room", base_rate: 0, status: "ACTIVE", sort: 0 },
  { id: "U-AURA-F", business_id: "BIZ-AURA", floor: 1, floor_label: "First floor", name: "First room", base_rate: 0, status: "ACTIVE", sort: 1 },
  { id: "U-AURA-S", business_id: "BIZ-AURA", floor: 2, floor_label: "Second floor", name: "Second room", base_rate: 0, status: "ACTIVE", sort: 2 },
] as const;

type B = [unit: string, guest: string, checkIn: string, checkOut: string, amount: number, channel: string, remarks: string];

// prettier-ignore
const OCT_2026: B[] = [
  // Ground floor — total 45,856
  ["U-AURA-G", "MADHUMITHA", "2026-10-01", "2026-10-03",  5144, "Airbnb", ""],
  ["U-AURA-G", "PREM",       "2026-10-03", "2026-10-04",  7000, "Direct", ""],
  ["U-AURA-G", "RAJ",        "2026-10-10", "2026-10-12",  6500, "Direct", ""],
  ["U-AURA-G", "PRIYANKA",   "2026-10-13", "2026-10-19", 14212, "Airbnb", ""],
  ["U-AURA-G", "MANASA",     "2026-10-19", "2026-10-21",  7000, "Direct", ""],
  ["U-AURA-G", "ANU",        "2026-10-24", "2026-10-27",  6000, "Referral / contact", "Contact"],
  // First floor — total 20,725
  ["U-AURA-F", "KASHYAP",    "2026-10-02", "2026-10-04",  6725, "Direct", ""],
  ["U-AURA-F", "ANURAG",     "2026-10-10", "2026-10-11",  3000, "Airbnb", ""],
  ["U-AURA-F", "UTHAYA",     "2026-10-17", "2026-10-21",  7000, "Owner / family", "Owner brother"],
  ["U-AURA-F", "SHEEBA",     "2026-10-24", "2026-10-25",  4000, "Referral / contact", "Contact"],
  // Second floor — total 33,356
  ["U-AURA-S", "SURENDHAR",  "2026-10-01", "2026-10-03",  8000, "Direct", ""],
  ["U-AURA-S", "PARADISE",   "2026-10-03", "2026-10-04",  6000, "Direct", ""],
  ["U-AURA-S", "MARIMUTHU",  "2026-10-10", "2026-10-11",  3500, "Booking.com", ""],
  ["U-AURA-S", "HABASUKI",   "2026-10-17", "2026-10-19",  7500, "Airbnb", ""],
  ["U-AURA-S", "ARAVIND",    "2026-10-19", "2026-10-20",  2356, "Airbnb", ""],
  ["U-AURA-S", "CATHY",      "2026-10-24", "2026-10-27",  6000, "Direct", ""],
];

export const SEED_BOOKINGS = OCT_2026.map(([unit_id, guest_name, check_in, check_out, amount, channel, remarks], i) => ({
  id: `BK-OCT26-${String(i + 1).padStart(2, "0")}`,
  business_id: "BIZ-AURA",
  unit_id,
  guest_name,
  guest_phone: "",
  check_in,
  check_out,
  nights: Math.round((Date.parse(check_out) - Date.parse(check_in)) / 86400000),
  amount,
  channel,
  remarks: remarks ? `${remarks} (migrated from Oct-26 sheet)` : "Migrated from Oct-26 sheet",
  is_deleted: false,
}));

export const OCT_2026_EXPECTED_TOTAL = 99937;
