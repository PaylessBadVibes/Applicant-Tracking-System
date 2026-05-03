import { Skeleton } from "@/components/ui/skeleton";

export function LoadingRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-3">
          {Array.from({ length: cols }).map((__, j) => (
            <Skeleton key={j} className={`h-8 ${j === 0 ? "col-span-3" : "col-span-2"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CenteredLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
