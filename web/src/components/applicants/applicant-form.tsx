"use client";

import * as React from "react";
import { useForm, type Control, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  applicantCreateSchema,
  applicantUpdateSchema,
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  type ApplicantCreateInput,
  type ApplicantUpdateInput,
  type Applicant,
} from "@ats/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CreateProps {
  mode: "create";
  onSubmit: (values: ApplicantCreateInput) => Promise<void>;
  onCancel?: () => void;
  defaults?: Partial<ApplicantCreateInput>;
}

interface EditProps {
  mode: "edit";
  applicant: Applicant;
  onSubmit: (values: ApplicantUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

export function ApplicantForm(props: CreateProps | EditProps) {
  if (props.mode === "create") return <CreateForm {...props} />;
  return <EditForm {...props} />;
}

function CreateForm({ onSubmit, onCancel, defaults }: CreateProps) {
  const form = useForm<ApplicantCreateInput>({
    resolver: zodResolver(applicantCreateSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      email: defaults?.email ?? "",
      contactNumber: defaults?.contactNumber ?? "",
      interviewerName: defaults?.interviewerName ?? "",
      department: defaults?.department ?? "PRODUCTION",
      dateApplied: defaults?.dateApplied ?? new Date().toISOString(),
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <FormFields control={form.control} />
        <div className="flex justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Create applicant"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditForm({ applicant, onSubmit, onCancel }: EditProps) {
  const form = useForm<ApplicantUpdateInput>({
    resolver: zodResolver(applicantUpdateSchema),
    defaultValues: {
      name: applicant.name,
      email: applicant.email,
      contactNumber: applicant.contactNumber,
      interviewerName: applicant.interviewerName ?? "",
      department: applicant.department,
      dateApplied: applicant.dateApplied,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values);
        })}
        className="space-y-4"
      >
        <FormFields control={form.control} />
        <div className="flex justify-end gap-2 pt-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function FormFields<T extends FieldValues>({ control }: { control: Control<T> }) {
  const nameField = "name" as Path<T>;
  const emailField = "email" as Path<T>;
  const contactField = "contactNumber" as Path<T>;
  const interviewerField = "interviewerName" as Path<T>;
  const departmentField = "department" as Path<T>;
  const dateAppliedField = "dateApplied" as Path<T>;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={nameField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Juan Dela Cruz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={emailField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="juan@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name={contactField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input placeholder="+63 912 345 6789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={departmentField}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string | undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {DEPARTMENT_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name={interviewerField}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Interviewer</FormLabel>
            <FormControl>
              <Input
                placeholder="Name of person who interviewed the applicant"
                {...field}
                value={(field.value as string | null | undefined) ?? ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={dateAppliedField}
        render={({ field }) => {
          const date = field.value ? new Date(field.value as string) : undefined;
          return (
            <FormItem className="flex flex-col">
              <FormLabel>Date Applied</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => field.onChange((d ?? new Date()).toISOString())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </>
  );
}
