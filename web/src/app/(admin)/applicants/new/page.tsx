"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ApplicantForm } from "@/components/applicants/applicant-form";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "@/hooks/use-toast";
import type { ApplicantCreateInput, Applicant } from "@ats/shared";

export default function NewApplicantPage() {
  const router = useRouter();
  return (
    <>
      <PageHeader title="New applicant" description="Add a new applicant profile to the pipeline." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Applicant details</CardTitle>
          <CardDescription>
            Required: name, email, contact number, department, date applied.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplicantForm
            mode="create"
            onSubmit={async (values: ApplicantCreateInput) => {
              try {
                const created = await api.post<Applicant>("/api/applicants", values);
                toast.success("Applicant created.");
                router.replace(`/applicants/${created.id}`);
              } catch (err) {
                if (err instanceof ApiError) toast.error(err.body.message);
                else toast.error("Could not create applicant.");
              }
            }}
            onCancel={() => router.push("/applicants")}
          />
        </CardContent>
      </Card>
    </>
  );
}
