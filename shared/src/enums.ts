export const DEPARTMENTS = [
  "PRODUCTION",
  "HOUSEKEEPING",
  "IT",
  "COMP_AND_BEN",
  "ENGINEERING",
  "SHE",
  "FGW",
  "CREATIVES",
  "FINANCE",
  "ADMIN",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<Department, string> = {
  PRODUCTION: "Production",
  HOUSEKEEPING: "Housekeeping",
  IT: "IT",
  COMP_AND_BEN: "Comp & Ben",
  ENGINEERING: "Engineering",
  SHE: "SHE",
  FGW: "FGW",
  CREATIVES: "Creatives",
  FINANCE: "Finance",
  ADMIN: "Admin",
};

export const STATUSES = [
  "APPLIED",
  "TRADE_TEST_SCHEDULED",
  "NEEDS_RESCHEDULE",
  "FAILED_RE_TRADE_TEST",
  "PRE_ORIENTATION",
  "DEPLOYMENT",
  "REDEPLOYMENT",
] as const;

export type ApplicantStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<ApplicantStatus, string> = {
  APPLIED: "Applied",
  TRADE_TEST_SCHEDULED: "Trade Test Scheduled",
  NEEDS_RESCHEDULE: "Needs Reschedule",
  FAILED_RE_TRADE_TEST: "Failed — Re-Test",
  PRE_ORIENTATION: "Pre-Orientation",
  DEPLOYMENT: "Deployment",
  REDEPLOYMENT: "Redeployment",
};

export const STATUS_BADGE_COLORS: Record<
  ApplicantStatus,
  { bg: string; text: string; ring: string }
> = {
  APPLIED: { bg: "bg-zinc-100", text: "text-zinc-700", ring: "ring-zinc-200" },
  TRADE_TEST_SCHEDULED: { bg: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200" },
  NEEDS_RESCHEDULE: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  FAILED_RE_TRADE_TEST: { bg: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200" },
  PRE_ORIENTATION: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  DEPLOYMENT: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  REDEPLOYMENT: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
};

export const TRADE_TEST_OUTCOMES = ["PENDING", "PASS", "FAIL", "NO_SHOW"] as const;
export type TradeTestOutcome = (typeof TRADE_TEST_OUTCOMES)[number];

export const TRADE_TEST_OUTCOME_LABELS: Record<TradeTestOutcome, string> = {
  PENDING: "Pending",
  PASS: "Pass",
  FAIL: "Fail",
  NO_SHOW: "No Show",
};

export const JOB_TITLES = ["HR_RECRUITMENT", "HR_TIMEKEEPER"] as const;
export type JobTitle = (typeof JOB_TITLES)[number];

export const JOB_TITLE_LABELS: Record<JobTitle, string> = {
  HR_RECRUITMENT: "HR Recruitment",
  HR_TIMEKEEPER: "HR Timekeeper",
};

export const AUDIT_ACTIONS = [
  "CREATED",
  "UPDATED",
  "DELETED",
  "STATUS_CHANGED",
  "RESUME_UPLOADED",
  "RESUME_REMOVED",
  "TRADE_TEST_SCHEDULED",
  "TRADE_TEST_OUTCOME_RECORDED",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "EMAIL_SKIPPED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  "applicant",
  "tradeTestAttempt",
  "emailTemplate",
  "user",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export const RESUME_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const RESUME_MAX_SIZE_BYTES = 10 * 1024 * 1024;
