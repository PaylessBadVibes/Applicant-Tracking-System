"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  tradeTestScheduleSchema,
  type TradeTestScheduleInput,
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

export function TradeTestScheduleDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: TradeTestScheduleInput) => Promise<void>;
}) {
  const form = useForm<TradeTestScheduleInput>({
    resolver: zodResolver(tradeTestScheduleSchema),
    defaultValues: {
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      notes: "",
    },
  });

  const [time, setTime] = useState("09:00");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule trade test</DialogTitle>
          <DialogDescription>
            Set a date and time. Outcome can be recorded after the test.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              const d = new Date(values.scheduledAt);
              const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
              if (!Number.isNaN(hh)) d.setHours(hh, mm ?? 0, 0, 0);
              await onSubmit({ ...values, scheduledAt: d.toISOString() });
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
                              className={cn("flex-1 justify-start font-normal", !date && "text-muted-foreground")}
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
                    <Textarea placeholder="Optional notes about location, equipment, etc." {...field} />
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
                {form.formState.isSubmitting ? "Scheduling…" : "Schedule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
