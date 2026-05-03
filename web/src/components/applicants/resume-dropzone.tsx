"use client";

import * as React from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import {
  RESUME_ALLOWED_MIME_TYPES,
  RESUME_MAX_SIZE_BYTES,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

const ALLOWED = new Set<string>(RESUME_ALLOWED_MIME_TYPES);
const ACCEPT_ATTR = ".png,.jpg,.jpeg,.pdf,.docx,image/png,image/jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface UploadResponse {
  resumeUrl: string;
  resumePath: string;
}

export function ResumeDropzone({
  applicantId,
  hasResume,
  onUploaded,
  onRemoved,
}: {
  applicantId: string;
  hasResume: boolean;
  onUploaded: (res: UploadResponse) => void;
  onRemoved: () => void;
}) {
  const [dragOver, setDragOver] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function validate(file: File): string | null {
    if (!ALLOWED.has(file.type)) return `Unsupported file type: ${file.type || "unknown"}`;
    if (file.size > RESUME_MAX_SIZE_BYTES) return "File exceeds 10 MB.";
    return null;
  }

  async function handleFile(file: File) {
    setError(null);
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.postFormData<UploadResponse>(
        `/api/applicants/${applicantId}/resume`,
        fd
      );
      onUploaded(res);
      toast.success("Resume uploaded.");
    } catch (err2) {
      if (err2 instanceof ApiError) setError(err2.body.message);
      else setError("Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm("Remove the current resume?")) return;
    setBusy(true);
    try {
      await api.delete<void>(`/api/applicants/${applicantId}/resume`);
      onRemoved();
      toast.success("Resume removed.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.body.message);
      else setError("Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-6 py-10 text-center transition-colors",
          dragOver && "border-primary bg-primary/5",
          busy && "pointer-events-none opacity-60"
        )}
      >
        <div className="rounded-full bg-background p-3 shadow-sm">
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {hasResume ? "Replace resume" : "Drop a resume here"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, JPEG, PDF, or DOCX • up to 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {hasResume ? (
        <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={handleRemove} disabled={busy}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Remove resume
        </Button>
      ) : null}
    </div>
  );
}
