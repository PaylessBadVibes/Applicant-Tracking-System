"use client";

import * as React from "react";
import { Download, FileText, ImageIcon, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/common/empty-state";

export function ResumePreview({
  resumeUrl,
  resumeContentType,
  resumeSizeBytes,
}: {
  resumeUrl: string | null;
  resumeContentType: string | null;
  resumeSizeBytes: number | null;
}) {
  if (!resumeUrl) {
    return (
      <EmptyState
        title="No resume uploaded"
        description="Use the drop zone below to attach an image, PDF, or DOCX."
        icon={<FileText className="h-5 w-5" />}
      />
    );
  }

  const isImage = resumeContentType?.startsWith("image/");
  const isPdf = resumeContentType === "application/pdf";

  const sizeLabel =
    typeof resumeSizeBytes === "number"
      ? `${(resumeSizeBytes / 1024).toFixed(0)} KB`
      : "";

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-border bg-secondary/30">
        {isImage ? (
          <Dialog>
            <DialogTrigger asChild>
              <button className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resumeUrl}
                  alt="Resume preview"
                  className="h-48 w-full object-cover transition-opacity hover:opacity-90"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Resume</DialogTitle>
              </DialogHeader>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resumeUrl} alt="Resume" className="max-h-[70vh] w-full object-contain" />
            </DialogContent>
          </Dialog>
        ) : isPdf ? (
          <div className="flex h-48 items-center justify-center bg-secondary/50">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  <Maximize2 className="mr-1.5 h-3.5 w-3.5" /> Open PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Resume (PDF)</DialogTitle>
                </DialogHeader>
                <embed src={resumeUrl} type="application/pdf" className="h-[75vh] w-full rounded-md" />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-1 bg-secondary/50">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">DOCX preview not available</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          {isImage ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
          {resumeContentType ?? "Resume"} {sizeLabel ? `· ${sizeLabel}` : ""}
        </span>
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
    </div>
  );
}
