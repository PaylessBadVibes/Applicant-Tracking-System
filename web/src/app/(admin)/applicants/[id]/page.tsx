"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  type Applicant,
  type ApplicantUpdateInput,
  type TradeTestAttempt,
  type TradeTestScheduleInput,
  type TradeTestOutcomeInput,
  type ApplicantStatus,
} from "@ats/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ApplicantDetailCard } from "@/components/applicants/applicant-detail-card";
import { ResumePreview } from "@/components/applicants/resume-preview";
import { ResumeDropzone } from "@/components/applicants/resume-dropzone";
import { TradeTestHistoryList } from "@/components/applicants/trade-test-history-list";
import { TradeTestScheduleDialog } from "@/components/applicants/trade-test-schedule-dialog";
import { TradeTestOutcomeDialog } from "@/components/applicants/trade-test-outcome-dialog";
import { DeploymentActionDialog } from "@/components/applicants/deployment-action-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

interface DetailResponse {
  applicant: Applicant;
  tradeTestAttempts: TradeTestAttempt[];
}

export default function ApplicantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deployDefault, setDeployDefault] = useState<"DEPLOYMENT" | "REDEPLOYMENT">("DEPLOYMENT");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<DetailResponse>(`/api/applicants/${id}`);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading || !data) return <CenteredLoading />;

  const applicant = data.applicant;
  const latestPending = data.tradeTestAttempts.find((a) => a.outcome === "PENDING") ?? null;

  async function handleEdit(values: ApplicantUpdateInput) {
    try {
      await api.patch<{ applicant: Applicant }>(`/api/applicants/${id}`, values);
      toast.success("Applicant updated.");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function handleSchedule(values: TradeTestScheduleInput) {
    try {
      await api.post<TradeTestAttempt>(`/api/applicants/${id}/trade-test-attempts`, values);
      toast.success("Trade test scheduled.");
      setScheduleOpen(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function handleOutcome(values: TradeTestOutcomeInput) {
    if (!latestPending) {
      toast.error("No pending trade test attempt.");
      return;
    }
    try {
      await api.patch(
        `/api/applicants/${id}/trade-test-attempts/${latestPending.id}`,
        values
      );
      toast.success(
        values.outcome === "PASS"
          ? "Marked Pass. Pre-orientation email queued."
          : "Outcome recorded."
      );
      setOutcomeOpen(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function handleDeploy(target: "DEPLOYMENT" | "REDEPLOYMENT", reason?: string) {
    try {
      await api.post<void>(`/api/applicants/${id}/status`, {
        targetStatus: target,
        reason,
      });
      toast.success("Status updated.");
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    }
  }

  async function handleDelete() {
    try {
      await api.delete<void>(`/api/applicants/${id}`);
      toast.success("Applicant deleted.");
      router.push("/applicants");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
      else toast.error("Could not delete applicant.");
      setDeleteOpen(false);
    }
  }

  return (
    <>
      <PageHeader title={applicant.name} description={applicant.email} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ApplicantDetailCard
            applicant={applicant}
            onEditSubmit={handleEdit}
            onScheduleTradeTest={() => setScheduleOpen(true)}
            onRecordOutcome={() => setOutcomeOpen(true)}
            onMarkDeployment={() => {
              setDeployDefault("DEPLOYMENT");
              setDeployOpen(true);
            }}
            onMarkRedeployment={() => {
              setDeployDefault("REDEPLOYMENT");
              setDeployOpen(true);
            }}
            onDelete={() => setDeleteOpen(true)}
            hasPendingAttempt={!!latestPending}
          />
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trade test history</CardTitle>
            </CardHeader>
            <CardContent>
              <TradeTestHistoryList attempts={data.tradeTestAttempts} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResumePreview
                  resumeUrl={applicant.resumeUrl}
                  resumeContentType={applicant.resumeContentType}
                  resumeSizeBytes={applicant.resumeSizeBytes}
                />
                <ResumeDropzone
                  applicantId={id}
                  hasResume={!!applicant.resumeUrl}
                  onUploaded={() => void refresh()}
                  onRemoved={() => void refresh()}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TradeTestScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onSubmit={handleSchedule}
      />
      <TradeTestOutcomeDialog
        open={outcomeOpen}
        onOpenChange={setOutcomeOpen}
        onSubmit={handleOutcome}
      />
      <DeploymentActionDialog
        open={deployOpen}
        onOpenChange={setDeployOpen}
        defaultStatus={deployDefault}
        onConfirm={async (target: "DEPLOYMENT" | "REDEPLOYMENT", reason?: string) => {
          await handleDeploy(target, reason);
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this applicant?"
        description={`This permanently removes ${applicant.name}, all their trade test attempts, and any uploaded resume. This action cannot be undone.`}
        confirmLabel="Delete applicant"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
