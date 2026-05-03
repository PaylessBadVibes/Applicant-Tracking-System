"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  tradeTestOutcomeSchema,
  type TradeTestOutcomeInput,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function TradeTestOutcomeDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: TradeTestOutcomeInput) => Promise<void>;
}) {
  const form = useForm<TradeTestOutcomeInput>({
    resolver: zodResolver(tradeTestOutcomeSchema),
    defaultValues: {
      outcome: "PASS",
      notes: "",
      preOrientationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  const [time, setTime] = useState("09:00");
  const outcome = form.watch("outcome");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record trade test outcome</DialogTitle>
          <DialogDescription>
            A pass triggers the pre-orientation email automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (values) => {
              if (values.outcome === "PASS" && values.preOrientationDate) {
                const d = new Date(values.preOrientationDate);
                const [hh, mm] = time.split(":").map((n) => parseInt(n, 10));
                if (!Number.isNaN(hh)) d.setHours(hh, mm ?? 0, 0, 0);
                await onSubmit({ ...values, preOrientationDate: d.toISOString() });
              } else {
                await onSubmit(values);
              }
            })}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      {(["PASS", "FAIL", "NO_SHOW"] as const).map((o) => (
                        <Label
                          key={o}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors",
                            field.value === o && "border-primary bg-primary/5"
                          )}
                        >
                          <RadioGroupItem value={o} className="h-3.5 w-3.5" />
                          {o === "PASS" ? "Pass" : o === "FAIL" ? "Fail" : "No Show"}
                        </Label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {outcome === "PASS" ? (
              <FormField
                control={form.control}
                name="preOrientationDate"
                render={({ field }) => {
                  const date = field.value ? new Date(field.value) : undefined;
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pre-Orientation date</FormLabel>
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
            ) : null}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
                {form.formState.isSubmitting ? "Saving…" : "Save outcome"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
