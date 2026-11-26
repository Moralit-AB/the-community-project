import { z } from "zod";
import { Constants } from "@/lib/database.types";

// Schemas for Server Action arguments. Bound arguments (`action.bind(null, id, "approved")`)
// come from the browser like any other input, so actions validate them too.

const enums = Constants.public.Enums;

export const idSchema = z.uuid();
export const memberStatusSchema = z.enum(enums.member_status);
export const memberRoleSchema = z.enum(enums.member_role);
export const paymentStatusSchema = z.enum(enums.payment_status);

/** Returns the parsed value, or throws (the action then fails like any other error). */
export function arg<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value);
}
