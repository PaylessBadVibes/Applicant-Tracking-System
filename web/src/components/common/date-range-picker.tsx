"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { addDays, endOfMonth, endOfYear, format, startOfMonth, startOfWeek, startOfYear } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type DatePreset =
  | "TODAY"
  | "WEEK"
  | "MONTH"
  | "YEAR"
  | "ALL"
  | "CUSTOM";

const PRESET_LABEL: Record<DatePreset, string> = {
  TODAY: "Today",
  WEEK: "This Week",
  MONTH: "This Month",
  YEAR: "This Year",
  ALL: "All time",
  CUSTOM: "Custom",
};

export function presetToRange(preset: DatePreset, now = new Date()): DateRange | undefined {
  switch (preset) {
    case "TODAY":
      return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: now };
    case "WEEK":
      return { from: startOfWeek(now), to: now };
    case "MONTH":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "YEAR":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "ALL":
    case "CUSTOM":
    default:
      return undefined;
  }
}

export function DateRangePicker({
  value,
  preset,
  onChange,
  className,
}: {
  value?: DateRange;
  preset: DatePreset;
  onChange: (preset: DatePreset, range?: DateRange) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const presets: DatePreset[] = ["TODAY", "WEEK", "MONTH", "YEAR", "ALL", "CUSTOM"];

  const label =
    preset === "CUSTOM" && value?.from
      ? value.to
        ? `${format(value.from, "MMM d")} – ${format(value.to, "MMM d")}`
        : format(value.from, "MMM d, yyyy")
      : PRESET_LABEL[preset];

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-background p-1">
        {presets
          .filter((p) => p !== "CUSTOM")
          .map((p) => (
            <Button
              key={p}
              variant={preset === p ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => onChange(p, presetToRange(p))}
            >
              {PRESET_LABEL[p]}
            </Button>
          ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={preset === "CUSTOM" ? "secondary" : "outline"}
            size="sm"
            className="h-8"
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {preset === "CUSTOM" ? label : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(r) => {
              onChange("CUSTOM", r);
              if (r?.from && r?.to) setOpen(false);
            }}
            numberOfMonths={2}
          />
          <div className="flex justify-between border-t p-2 text-xs text-muted-foreground">
            <span>{value?.from ? format(value.from, "PP") : "Start"}</span>
            <span>{value?.to ? format(value.to, "PP") : "End"}</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
