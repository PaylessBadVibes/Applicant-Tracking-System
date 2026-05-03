"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicantStatus } from "@ats/shared";
import { cn } from "@/lib/utils";

export function DeploymentActionDialog({
  open,
  onOpenChange,
  defaultStatus = "DEPLOYMENT",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultStatus?: Extract<ApplicantStatus, "DEPLOYMENT" | "REDEPLOYMENT">;
  onConfirm: (
    status: Extract<ApplicantStatus, "DEPLOYMENT" | "REDEPLOYMENT">,
    reason?: string
  ) => Promise<void>;
}) {
  const [target, setTarget] = useState<"DEPLOYMENT" | "REDEPLOYMENT">(defaultStatus);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update final status</DialogTitle>
          <DialogDescription>
            Use Redeployment if the applicant did not show at orientation or did not complete requirements.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={target} onValueChange={(v) => setTarget(v as typeof target)} className="grid grid-cols-2 gap-2">
            {([
              { value: "DEPLOYMENT", label: "Deployment", color: "bg-emerald-50 text-emerald-700" },
              { value: "REDEPLOYMENT", label: "Redeployment", color: "bg-orange-50 text-orange-700" },
            ] as const).map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
                  target === opt.value && "border-primary"
                )}
              >
                <RadioGroupItem value={opt.value} className="h-3.5 w-3.5" />
                <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", opt.color)}>
                  {opt.label}
                </span>
              </Label>
            ))}
          </RadioGroup>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(target, reason || undefined);
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
