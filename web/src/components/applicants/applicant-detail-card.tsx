"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DEPARTMENT_LABELS,
  type Applicant,
  type ApplicantUpdateInput,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/applicants/status-badge";
import { ApplicantForm } from "@/components/applicants/applicant-form";
import { formatDate, formatDateTime } from "@/lib/format";

export function ApplicantDetailCard({
  applicant,
  onEditSubmit,
  onScheduleTradeTest,
  onRecordOutcome,
  onMarkDeployment,
  onMarkRedeployment,
  onDelete,
  hasPendingAttempt,
}: {
  applicant: Applicant;
  onEditSubmit: (values: ApplicantUpdateInput) => Promise<void>;
  onScheduleTradeTest: () => void;
  onRecordOutcome: () => void;
  onMarkDeployment: () => void;
  onMarkRedeployment: () => void;
  onDelete: () => void;
  hasPendingAttempt: boolean;
}) {
  const [editing, setEditing] = useState(false);

  const canSchedule =
    applicant.status === "APPLIED" ||
    applicant.status === "NEEDS_RESCHEDULE" ||
    applicant.status === "FAILED_RE_TRADE_TEST";
  const canRecord = hasPendingAttempt && applicant.status === "TRADE_TEST_SCHEDULED";
  const canDeploy =
    applicant.status === "PRE_ORIENTATION" ||
    applicant.status === "REDEPLOYMENT" ||
    applicant.status === "DEPLOYMENT";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{applicant.name}</h2>
          <p className="text-sm text-muted-foreground">
            {DEPARTMENT_LABELS[applicant.department]} · Applied {formatDate(applicant.dateApplied)}
          </p>
          <div className="mt-2">
            <StatusBadge status={applicant.status} />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="mr-1.5 h-3.5 w-3.5" /> Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {canSchedule ? (
              <DropdownMenuItem onSelect={onScheduleTradeTest}>
                Schedule trade test
              </DropdownMenuItem>
            ) : null}
            {canRecord ? (
              <DropdownMenuItem onSelect={onRecordOutcome}>
                Record outcome
              </DropdownMenuItem>
            ) : null}
            {canDeploy ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onMarkDeployment}>
                  Mark Deployment
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onMarkRedeployment}>
                  Mark Redeployment
                </DropdownMenuItem>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setEditing((v) => !v)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {editing ? "Cancel edit" : "Edit details"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete applicant
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {editing ? (
          <ApplicantForm
            mode="edit"
            applicant={applicant}
            onSubmit={async (v) => {
              await onEditSubmit(v);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Email" value={applicant.email} mono />
            <Field label="Contact Number" value={applicant.contactNumber} mono />
            <Field label="Interviewer" value={applicant.interviewerName ?? "—"} />
            <Field label="Department" value={DEPARTMENT_LABELS[applicant.department]} />
            <Field label="Date Applied" value={formatDate(applicant.dateApplied)} />
            <Field
              label="Pre-Orientation"
              value={
                applicant.preOrientationDate
                  ? formatDateTime(applicant.preOrientationDate)
                  : "—"
              }
            />
            <Field label="Last Update" value={formatDateTime(applicant.updatedAt)} />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={mono ? "font-mono text-sm text-foreground" : "text-sm text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
