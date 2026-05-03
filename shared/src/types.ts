import type {
  ApplicantStatus,
  AuditAction,
  AuditEntityType,
  Department,
  JobTitle,
  TradeTestOutcome,
} from "./enums";

export interface IsoTimestamp {
  iso: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  jobTitle: JobTitle;
  role: "admin";
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  lastLoginAt: string | null;
}

export interface Applicant {
  id: string;
  name: string;
  nameLower: string;
  email: string;
  contactNumber: string;
  interviewerName: string | null;
  department: Department;
  dateApplied: string;
  status: ApplicantStatus;
  preOrientationDate: string | null;
  resumeUrl: string | null;
  resumePath: string | null;
  resumeContentType: string | null;
  resumeSizeBytes: number | null;
  resumeUploadedAt: string | null;
  latestTradeTestAttemptId: string | null;
  latestTradeTestOutcome: TradeTestOutcome | null;
  tradeTestAttemptCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TradeTestAttempt {
  id: string;
  applicantId: string;
  attemptNumber: number;
  scheduledAt: string;
  outcome: TradeTestOutcome;
  notes: string;
  recordedAt: string | null;
  recordedBy: string | null;
  createdAt: string;
  createdBy: string;
}

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  parentEntityId: string | null;
  action: AuditAction;
  actorUid: string;
  actorEmail: string;
  actorJobTitle: JobTitle;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  snapshot: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  at: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  bodyMarkdown: string;
  availableVariables: string[];
  updatedAt: string;
  updatedBy: string | null;
}

export interface EmailLog {
  id: string;
  templateId: string;
  to: string;
  cc: string[] | null;
  subject: string;
  bodyHtml: string;
  applicantId: string;
  triggerSource: "STATUS_PASS";
  messageId: string | null;
  status: "SENT" | "FAILED";
  error: string | null;
  sentAt: string;
}

export interface DashboardMetrics {
  totalApplicants: number;
  applicantsByDepartment: Record<Department, number>;
  applicantsByStatus: Record<ApplicantStatus, number>;
  tradeTest: {
    pass: number;
    fail: number;
    noShow: number;
    pending: number;
    upcoming: Array<{
      attemptId: string;
      applicantId: string;
      applicantName: string;
      scheduledAt: string;
    }>;
    recentOutcomes: Array<{
      attemptId: string;
      applicantId: string;
      applicantName: string;
      scheduledAt: string;
      outcome: "PASS" | "FAIL" | "NO_SHOW";
    }>;
  };
  deployment: {
    deployed: number;
    redeployed: number;
  };
  appliedOverTime: Array<{ date: string; count: number }>;
  truncated: boolean;
}
