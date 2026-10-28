/**
 * Google Sheets "database" schema.
 *
 * One spreadsheet = one database. Each key below is a tab; the array is the
 * header row (row 1). Every tab has an `id` column in column A so rows can be
 * located and updated. Column order matters only for new sheets — the data
 * layer maps by header name, so you may add columns to the right later.
 */
export const TABS = {
  Users: [
    "id", "name", "email", "password_hash", "role", "status",
    "phone", "created_at", "updated_at", "last_login_at",
  ],
  Businesses: [
    "id", "name", "type", "location", "status", "manager_share_pct",
    "currency", "notes", "created_at", "updated_at",
  ],
  Units: [
    "id", "business_id", "floor", "floor_label", "name", "base_rate",
    "status", "sort", "created_at",
  ],
  Assignments: [
    "id", "user_id", "business_id", "access", "created_at", "created_by",
  ],
  Shareholders: [
    "id", "business_id", "user_id", "name", "share_pct", "status",
    "created_at", "updated_at",
  ],
  Bookings: [
    "id", "business_id", "unit_id", "guest_name", "guest_phone", "check_in",
    "check_out", "nights", "amount", "channel", "remarks", "is_deleted",
    "created_by", "created_at", "updated_by", "updated_at",
  ],
  Income: [
    "id", "business_id", "date", "category", "amount", "description",
    "is_deleted", "created_by", "created_at", "updated_by", "updated_at",
  ],
  Expenses: [
    "id", "business_id", "date", "category", "amount", "description",
    "paid_to", "is_deleted", "created_by", "created_at", "updated_by",
    "updated_at",
  ],
  Periods: [
    "id", "business_id", "month", "status", "locked_by", "locked_at", "note",
  ],
  AuditLog: [
    "id", "timestamp", "user_id", "user_name", "role", "business_id",
    "entity", "entity_id", "action", "summary", "before_json", "after_json",
  ],
} as const;

export type TabName = keyof typeof TABS;
