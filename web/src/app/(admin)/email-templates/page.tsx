"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { EmailTemplate } from "@ats/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { CenteredLoading } from "@/components/common/loading-state";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";

interface ListResponse {
  items: EmailTemplate[];
}

export default function EmailTemplatesPage() {
  const [items, setItems] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ListResponse>("/api/email-templates")
      .then((res) => setItems(res.items))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CenteredLoading />;

  return (
    <>
      <PageHeader
        title="Email templates"
        description="Edit subject and body for transactional emails sent by ATS."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((t) => (
          <Link key={t.id} href={`/email-templates/${t.id}`} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base group-hover:text-primary">{t.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Updated {formatRelative(t.updatedAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
