"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Save, RotateCcw } from "lucide-react";
import type { EmailTemplate } from "@ats/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { applyTemplateTokens } from "@/lib/markdown";

const PREVIEW_PAYLOAD: Record<string, string> = {
  applicantName: "Juan Dela Cruz",
  applicantEmail: "juan@example.com",
  departmentLabel: "Production",
  orientationDate: "Monday, May 5, 2026 at 9:00 AM",
};

export function MarkdownEditor({
  template,
  onSave,
}: {
  template: EmailTemplate;
  onSave: (subject: string, bodyMarkdown: string) => Promise<void>;
}) {
  const [subject, setSubject] = React.useState(template.subject);
  const [body, setBody] = React.useState(template.bodyMarkdown);
  const [busy, setBusy] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => `${b}{{${token}}}`);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = `${body.slice(0, start)}{{${token}}}${body.slice(end)}`;
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + 4 + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  const previewSubject = applyTemplateTokens(subject, PREVIEW_PAYLOAD);
  const previewBody = applyTemplateTokens(body, PREVIEW_PAYLOAD);

  const isDirty = subject !== template.subject || body !== template.bodyMarkdown;

  async function handleSave() {
    setBusy(true);
    try {
      await onSave(subject, body);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Edit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Variables
            </Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {template.availableVariables.map((v) => (
                <Button
                  key={v}
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 font-mono text-xs"
                  onClick={() => insertToken(v)}
                >
                  {`{{${v}}}`}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="body">Body (Markdown)</Label>
            <Textarea
              id="body"
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[360px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSubject(template.subject);
                setBody(template.bodyMarkdown);
              }}
              disabled={!isDirty || busy}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || busy} size="sm">
              <Save className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-border bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Subject</p>
            <p className="mt-0.5 text-base font-semibold">{previewSubject}</p>
          </div>
          <div className="prose prose-sm prose-stone mt-4 max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewBody}</ReactMarkdown>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Variables shown using sample data: applicantName=&quot;{PREVIEW_PAYLOAD.applicantName}&quot;, departmentLabel=&quot;{PREVIEW_PAYLOAD.departmentLabel}&quot;, orientationDate=&quot;{PREVIEW_PAYLOAD.orientationDate}&quot;.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
