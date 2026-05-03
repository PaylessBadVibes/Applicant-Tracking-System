"use client";

import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  DEPARTMENT_LABELS,
  TRADE_TEST_OUTCOME_LABELS,
  type Department,
  type TradeTestOutcome,
} from "@ats/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export interface TradeTestRow {
  id: string;
  applicantId: string;
  applicant: {
    id: string;
    name: string;
    email: string;
    department: Department;
  };
  attemptNumber: number;
  scheduledAt: string;
  recordedAt: string | null;
  outcome: TradeTestOutcome;
}

const outcomeStyle: Record<TradeTestOutcome, string> = {
  PENDING: "bg-violet-50 text-violet-700",
  PASS: "bg-emerald-50 text-emerald-700",
  FAIL: "bg-rose-50 text-rose-700",
  NO_SHOW: "bg-amber-50 text-amber-700",
};

const columns: ColumnDef<TradeTestRow>[] = [
  {
    id: "name",
    header: "Applicant",
    cell: ({ row }) => (
      <Link
        href={`/applicants/${row.original.applicant.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.applicant.name}
      </Link>
    ),
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.applicant.email}</span>
    ),
  },
  {
    id: "department",
    header: "Department",
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {DEPARTMENT_LABELS[row.original.applicant.department]}
      </span>
    ),
  },
  {
    id: "attemptNumber",
    header: "Attempt #",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.attemptNumber}
      </span>
    ),
  },
  {
    id: "scheduledAt",
    header: "Scheduled",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDateTime(row.original.scheduledAt)}
      </span>
    ),
  },
  {
    id: "outcome",
    header: "Outcome",
    cell: ({ row }) => (
      <Badge variant="secondary" className={`border-transparent ${outcomeStyle[row.original.outcome]}`}>
        {TRADE_TEST_OUTCOME_LABELS[row.original.outcome]}
      </Badge>
    ),
  },
  {
    id: "recordedAt",
    header: "Recorded",
    cell: ({ row }) =>
      row.original.recordedAt ? (
        <span className="text-xs text-muted-foreground">
          {formatDateTime(row.original.recordedAt)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
];

export function TradeTestListTable({ data }: { data: TradeTestRow[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                No trade tests match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
