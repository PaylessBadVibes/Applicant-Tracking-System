"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  DEPARTMENT_LABELS,
  TRADE_TEST_OUTCOME_LABELS,
  type Applicant,
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
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/applicants/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatRelative } from "@/lib/format";

const outcomeStyle: Record<TradeTestOutcome, string> = {
  PENDING: "bg-violet-50 text-violet-700",
  PASS: "bg-emerald-50 text-emerald-700",
  FAIL: "bg-rose-50 text-rose-700",
  NO_SHOW: "bg-amber-50 text-amber-700",
};

const baseColumns: ColumnDef<Applicant>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <Link
        href={`/applicants/${row.original.id}`}
        className="font-medium text-foreground hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "contactNumber",
    header: "Contact",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.contactNumber}
      </span>
    ),
  },
  {
    accessorKey: "department",
    header: "Department",
    cell: ({ row }) => (
      <span className="text-sm text-foreground">
        {DEPARTMENT_LABELS[row.original.department]}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "dateApplied",
    header: "Applied",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.dateApplied)}
      </span>
    ),
  },
  {
    accessorKey: "latestTradeTestOutcome",
    header: "Latest Test",
    cell: ({ row }) => {
      const o = row.original.latestTradeTestOutcome;
      if (!o)
        return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <Badge
          variant="secondary"
          className={`border-transparent ${outcomeStyle[o]}`}
        >
          {TRADE_TEST_OUTCOME_LABELS[o]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {formatRelative(row.original.updatedAt)}
      </span>
    ),
  },
];

const selectionColumn: ColumnDef<Applicant> = {
  id: "select",
  header: ({ table }) => (
    <Checkbox
      aria-label="Select all rows on this page"
      checked={
        table.getIsAllPageRowsSelected()
          ? true
          : table.getIsSomePageRowsSelected()
            ? "indeterminate"
            : false
      }
      onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
    />
  ),
  cell: ({ row }) => (
    <Checkbox
      aria-label={`Select ${row.original.name}`}
      checked={row.getIsSelected()}
      onCheckedChange={(v) => row.toggleSelected(!!v)}
    />
  ),
  enableSorting: false,
  enableHiding: false,
};

export function ApplicantTable({
  data,
  selection,
  onSelectionChange,
  selectable = false,
}: {
  data: Applicant[];
  selection?: RowSelectionState;
  onSelectionChange?: (next: RowSelectionState) => void;
  selectable?: boolean;
}) {
  const columns = React.useMemo<ColumnDef<Applicant>[]>(() => {
    return selectable ? [selectionColumn, ...baseColumns] : baseColumns;
  }, [selectable]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: selectable,
    state: selectable && selection ? { rowSelection: selection } : undefined,
    onRowSelectionChange: selectable && onSelectionChange
      ? (updater) => {
          const next = typeof updater === "function" ? updater(selection ?? {}) : updater;
          onSelectionChange(next);
        }
      : undefined,
    getRowId: (row) => row.id,
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
                No applicants match the current filters.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
