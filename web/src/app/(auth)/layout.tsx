export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-foreground px-12 py-14 text-background lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(158_50%_30%/0.18),transparent_60%)]" />
        <div className="relative flex items-center gap-2 font-mono text-sm tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          ATS
        </div>
        <div className="relative space-y-6">
          <h1 className="font-serif text-5xl font-light leading-[1.05] tracking-tight text-balance">
            A quiet place<br />
            for hiring,<br />
            kept in order.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-background/70 text-pretty">
            One operator console for trade tests, deployments, and the small
            decisions in between. No applicant chrome, no consumer frills —
            just the work.
          </p>
        </div>
        <div className="relative flex items-end justify-between text-xs text-background/50">
          <span>Recruitment & Time-Keeping</span>
          <span className="font-mono">v0.1</span>
        </div>
      </aside>
      <main className="flex items-center justify-center bg-background px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
