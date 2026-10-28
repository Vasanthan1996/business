export type Role = "ADMIN" | "PROPERTY" | "USER";
export type BusinessType = "RESORT" | "PHARMACY" | "INSTITUTE" | "OTHER";
export type Access = "MANAGE" | "VIEW";
export type ExpenseCategory = "RENT" | "SALARY" | "MAINTENANCE" | "OTHERS";
export type EntryKind = "bookings" | "income" | "expenses";

export const ROLES: Role[] = ["ADMIN", "PROPERTY", "USER"];
export const BUSINESS_TYPES: BusinessType[] = ["RESORT", "PHARMACY", "INSTITUTE", "OTHER"];
export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Staff salary" },
  { value: "MAINTENANCE", label: "Maintenance materials" },
  { value: "OTHERS", label: "Others" },
];
export const BOOKING_CHANNELS = [
  "Direct", "Airbnb", "Booking.com", "MakeMyTrip", "Goibibo",
  "Referral / contact", "Owner / family", "Other",
] as const;
export const INCOME_CATEGORIES: Record<BusinessType, string[]> = {
  RESORT: ["Extra services", "Food", "Other"],
  PHARMACY: ["Counter sales", "Online orders", "Other"],
  INSTITUTE: ["Course fees", "Registration", "Workshop", "Other"],
  OTHER: ["Sales", "Other"],
};

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  status: "ACTIVE" | "DISABLED";
  phone: string;
  created_at: string;
  updated_at: string;
  last_login_at: string;
}
export type PublicUser = Omit<User, "password_hash">;

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  location: string;
  status: "ACTIVE" | "ARCHIVED";
  manager_share_pct: number;
  currency: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Unit {
  id: string;
  business_id: string;
  floor: number;
  floor_label: string;
  name: string;
  base_rate: number;
  status: "ACTIVE" | "INACTIVE";
  sort: number;
  created_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  business_id: string;
  access: Access;
  created_at: string;
  created_by: string;
}

export interface Shareholder {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  share_pct: number;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  updated_at: string;
}

interface Tracked {
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
}

export interface Booking extends Tracked {
  id: string;
  business_id: string;
  unit_id: string;
  guest_name: string;
  guest_phone: string;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD, exclusive (departure day)
  nights: number;
  amount: number;
  channel: string;
  remarks: string;
}

export interface Income extends Tracked {
  id: string;
  business_id: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface Expense extends Tracked {
  id: string;
  business_id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  paid_to: string;
}

export interface Period {
  id: string;
  business_id: string;
  month: string; // YYYY-MM
  status: "OPEN" | "LOCKED";
  locked_by: string;
  locked_at: string;
  note: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  role: Role;
  business_id: string;
  entity: string;
  entity_id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOCK" | "UNLOCK" | "LOGIN";
  summary: string;
  before_json: string;
  after_json: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
