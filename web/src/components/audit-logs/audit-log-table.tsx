"use client";

import { Eye } from "lucide-react";
import type { AuditLog } from "@ats/shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatRelative } from "@/lib/format";

const ACTION_BADGE: Record<string, string> = {
  CREATED: "bg-emerald-50 text-emerald-700",
  UPDATED: "bg-sky-50 text-sky-700",
  STATUS_CHANGED: "bg-violet-50 text-violet-700",
  RESUME_UPLOADED: "bg-emerald-50 text-emerald-700",
  RESUME_REMOVED: "bg-rose-50 text-rose-700",
  TRADE_TEST_SCHEDULED: "bg-sky-50 text-sky-700",
  TRADE_TEST_OUTCOME_RECORDED: "bg-violet-50 text-violet-700",
  EMAIL_SENT: "bg-emerald-50 text-emerald-700",
  EMAIL_FAILED: "bg-rose-50 text-rose-700",
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function AuditLogTable({ items }: { items: AuditLog[] }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Changes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                No audit log entries.
              </TableCell>
            </TableRow>
          ) : (
            items.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-sm font-medium">{formatRelative(log.at)}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(log.at)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{log.actorEmail}</div>
                  <div className="text-xs text-muted-foreground">{log.actorJobTitle}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm capitalize">{log.entityType}</div>
                  <div className="font-mono text-xs text-muted-foreground">{log.entityId.slice(0, 12)}…</div>
                </TableCell>
                <TableCell>
                  <Badge className={`border-transparent ${ACTION_BADGE[log.action] ?? "bg-secondary text-secondary-foreground"}`}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> Details
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="end">
                      {log.changes && Object.keys(log.changes).length > 0 ? (
                        <ul className="space-y-2">
                          {Object.entries(log.changes).map(([k, v]) => (
                            <li key={k}>
                              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {k}
                              </p>
                              <p className="text-xs">
                                <span className="text-rose-700">{formatValue(v.from)}</span>
                                <span className="mx-1.5 text-muted-foreground">→</span>
                                <span className="text-emerald-700">{formatValue(v.to)}</span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : log.snapshot ? (
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">
                          {JSON.stringify(log.snapshot, null, 2)}
                        </pre>
                      ) : log.metadata ? (
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-xs text-muted-foreground">No additional details.</p>
                      )}
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
