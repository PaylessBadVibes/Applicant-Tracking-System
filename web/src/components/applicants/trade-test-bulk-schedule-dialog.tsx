"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  tradeTestBulkScheduleSchema,
  type TradeTestBulkScheduleInput,
} from "@ats/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface BulkScheduleResult {
  scheduled: Array<{ applicantId: string; attemptId: string }>;
  skipped: Array<{ applicantId: string; reason: string }>;
}

export function TradeTestBulkScheduleDialog({
  open,
  onOpenChange,
  applicantIds,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  applicantIds: string[];
  onSubmit: (values: TradeTestBulkScheduleInput) => Promise<void>;
}) {
  const form = useForm<TradeTestBulkScheduleInput>({
    resolver: zodResolver(tradeTestBulkScheduleSchema),
    defaultValues: {
      applicantIds,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "",
    },
    values: {
      applicantIds,
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "",
    },
  });

  const [time, setTime] = useState("09:00");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Schedule trade test for {applicantIds.length} applicant
            {applicantIds.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            All selected applicants will be scheduled at the same date and time.
            Applicants whose status doesn&apos;t allow scheduling will be skipped automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              const d = new Date(values.scheduledAt);
              const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
              if (!Number.isNaN(hh)) d.setHours(hh, mm ?? 0, 0, 0);
              await onSubmit({ ...values, scheduledAt: d.toISOString(), applicantIds });
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => {
                const date = field.value ? new Date(field.value) : undefined;
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "flex-1 justify-start font-normal",
                                !date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {date ? format(date, "PPP") : "Pick a date"}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => field.onChange((d ?? new Date()).toISOString())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <Input
                        type="time"
                        className="w-28"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional notes — applied to every scheduled attempt."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Scheduling…"
                  : `Schedule ${applicantIds.length}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
