"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { EmailTemplate } from "@ats/shared";
import { PageHeader } from "@/components/layout/page-header";
import { MarkdownEditor } from "@/components/email-templates/markdown-editor";
import { CenteredLoading } from "@/components/common/loading-state";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";

export default function EmailTemplatePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ template: EmailTemplate }>(`/api/email-templates/${id}`);
      setTemplate(res.template);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.body.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !template) return <CenteredLoading />;

  return (
    <>
      <PageHeader title={template.name} description={template.description} />
      <MarkdownEditor
        template={template}
        onSave={async (subject, bodyMarkdown) => {
          try {
            const res = await api.put<{ template: EmailTemplate }>(
              `/api/email-templates/${id}`,
              { subject, bodyMarkdown }
            );
            setTemplate(res.template);
            toast.success("Template saved.");
          } catch (err) {
            if (err instanceof ApiError) toast.error(err.body.message);
          }
        }}
      />
    </>
  );
}
