import { z } from "zod";
import {
  DEPARTMENTS,
  JOB_TITLES,
  STATUSES,
  TRADE_TEST_OUTCOMES,
} from "./enums";

const phoneRegex = /^\d{11}$/;

export const applicantCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Valid email required"),
  contactNumber: z
    .string()
    .trim()
    .regex(phoneRegex, "Mobile number must be exactly 11 digits (no spaces, dashes, or +)"),
  interviewerName: z.string().trim().min(1).max(120).optional(),
  department: z.enum(DEPARTMENTS),
  dateApplied: z.string().datetime({ offset: true }),
});

export const applicantUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    contactNumber: z.string().trim().regex(phoneRegex).optional(),
    interviewerName: z.string().trim().min(1).max(120).nullable().optional(),
    department: z.enum(DEPARTMENTS).optional(),
    dateApplied: z.string().datetime({ offset: true }).optional(),
    preOrientationDate: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field is required",
  });

export const statusChangeSchema = z.object({
  targetStatus: z.enum(STATUSES),
  preOrientationDate: z.string().datetime({ offset: true }).optional(),
  reason: z.string().max(500).optional(),
});

export const tradeTestScheduleSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).optional().default(""),
});

export const tradeTestBulkScheduleSchema = z.object({
  applicantIds: z.array(z.string().min(1)).min(1).max(200),
  scheduledAt: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).optional().default(""),
});

export const tradeTestOutcomeSchema = z
  .object({
    outcome: z.enum(["PASS", "FAIL", "NO_SHOW"] as const),
    notes: z.string().max(1000).optional(),
    preOrientationDate: z.string().datetime({ offset: true }).optional(),
  })
  .refine(
    (v) => v.outcome !== "PASS" || typeof v.preOrientationDate === "string",
    { message: "preOrientationDate is required when outcome is PASS", path: ["preOrientationDate"] }
  );

export const emailTemplateUpdateSchema = z.object({
  subject: z.string().trim().min(1).max(300),
  bodyMarkdown: z.string().min(1),
});

export const userInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  displayName: z.string().trim().min(1).max(120),
  jobTitle: z.enum(JOB_TITLES),
});

export const userUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120).optional(),
    jobTitle: z.enum(JOB_TITLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const listApplicantsQuerySchema = z.object({
  department: z.enum(DEPARTMENTS).optional(),
  status: z.enum(STATUSES).optional(),
  latestTradeTestOutcome: z.enum(TRADE_TEST_OUTCOMES).optional(),
  dateAppliedFrom: z.string().datetime({ offset: true }).optional(),
  dateAppliedTo: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  orderBy: z.enum(["dateApplied", "name", "updatedAt"]).default("dateApplied"),
  orderDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ApplicantCreateInput = z.infer<typeof applicantCreateSchema>;
export type ApplicantUpdateInput = z.infer<typeof applicantUpdateSchema>;
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;
export type TradeTestScheduleInput = z.infer<typeof tradeTestScheduleSchema>;
export type TradeTestBulkScheduleInput = z.infer<typeof tradeTestBulkScheduleSchema>;
export type TradeTestOutcomeInput = z.infer<typeof tradeTestOutcomeSchema>;
export type EmailTemplateUpdateInput = z.infer<typeof emailTemplateUpdateSchema>;
export type UserInviteInput = z.infer<typeof userInviteSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type ListApplicantsQuery = z.infer<typeof listApplicantsQuerySchema>;
