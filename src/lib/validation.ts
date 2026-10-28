import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD");
const money = z.coerce.number().min(0, "can't be negative").max(100_000_000);
const text = (max = 200) => z.string().trim().max(max).default("");

export const bookingInput = z
  .object({
    business_id: z.string().min(1),
    unit_id: z.string().min(1, "choose a room"),
    guest_name: z.string().trim().min(1, "enter the guest name").max(120),
    guest_phone: text(30),
    check_in: isoDate,
    check_out: isoDate,
    amount: money,
    channel: text(60),
    remarks: text(300),
  })
  .refine((b) => b.check_out > b.check_in, {
    message: "check-out must be after check-in",
    path: ["check_out"],
  });

export const incomeInput = z.object({
  business_id: z.string().min(1),
  date: isoDate,
  category: z.string().trim().min(1).max(60),
  amount: money,
  description: text(300),
});

export const expenseInput = z.object({
  business_id: z.string().min(1),
  date: isoDate,
  category: z.enum(["RENT", "SALARY", "MAINTENANCE", "OTHERS"]),
  amount: money,
  description: text(300),
  paid_to: text(120),
});

export const userInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "use at least 8 characters").optional(),
  role: z.enum(["ADMIN", "PROPERTY", "USER"]),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
  phone: text(30),
  business_ids: z.array(z.string()).default([]),
});

export const businessInput = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["RESORT", "PHARMACY", "INSTITUTE", "OTHER"]),
  location: text(120),
  status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  manager_share_pct: z.coerce.number().min(0).max(100),
  notes: text(500),
});

export const unitInput = z.object({
  id: z.string().optional(),
  floor: z.coerce.number().int().min(-2).max(100),
  floor_label: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(60),
  base_rate: money.default(0),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const shareholdersInput = z
  .array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      user_id: z.string().default(""),
      share_pct: z.coerce.number().gt(0).max(100),
    }),
  )
  .refine((list) => Math.abs(list.reduce((s, x) => s + x.share_pct, 0) - 100) < 0.01, {
    message: "investor shares must add up to 100%",
  });

export const monthParam = z.string().regex(/^\d{4}-\d{2}$/, "use YYYY-MM");
