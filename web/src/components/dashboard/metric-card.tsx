import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function MetricCard({ label, value, hint, icon, accentClassName }: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  accentClassName?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-5 pb-2 pt-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        {icon ? <div className={accentClassName ?? "text-muted-foreground"}>{icon}</div> : null}
      </CardHeader>
      <CardContent className="px-5 pb-5">
        <div className="font-serif text-4xl font-light tabular-nums tracking-tight text-foreground">
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
