import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, eyebrow, className }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-serif text-3xl font-light leading-tight tracking-tight text-foreground text-balance">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
