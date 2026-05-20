import { createFileRoute, Link } from "@tanstack/react-router";

import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview - PARKOS" },
      {
        name: "description",
        content:
          "PARKOS overview for occupancy, operations health, and real-time parking activity.",
      },
    ],
  }),
  component: Index,
});

const kpis = [
  { label: "Occupancy", value: "84%", hint: "482 / 574 slots", tone: "bg-status-empty" },
  { label: "Open Sessions", value: "311", hint: "21 ending soon", tone: "bg-status-reserved" },
  { label: "Gate Throughput", value: "71/hr", hint: "avg in last hour", tone: "bg-primary" },
  { label: "Active Alerts", value: "3", hint: "1 high priority", tone: "bg-status-full" },
];

const floors = [
  { floor: "B1", used: 168, total: 180 },
  { floor: "B2", used: 142, total: 160 },
  { floor: "B3", used: 88, total: 110 },
  { floor: "L1", used: 84, total: 124 },
];

const incidents = [
  { title: "Gate B sensor latency", detail: "response > 600ms for 4 minutes", level: "Monitor" },
  { title: "B2 nearing full", detail: "predicted 96% occupancy in 18 minutes", level: "High" },
  { title: "Payment queue normal", detail: "median checkout 23 seconds", level: "Info" },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl border border-border bg-card p-7 shadow-soft">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Parking Building OS
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Overview</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
            Single snapshot of live operations before each role enters its workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/login"
              className="rounded-full bg-primary px-4 py-2 text-[12px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              to="/flow"
              className="rounded-full border border-border bg-background px-4 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              View system flow
            </Link>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className={`size-1.5 rounded-full ${item.tone}`} />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</div>
              <p className="mt-1 text-[12px] text-muted-foreground">{item.hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
            <h2 className="text-[16px] font-semibold">Floor utilization</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Current load by floor</p>
            <div className="mt-4 space-y-3">
              {floors.map((item) => {
                const percent = Math.round((item.used / item.total) * 100);
                return (
                  <div key={item.floor}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="font-mono font-semibold">{item.floor}</span>
                      <span className="text-muted-foreground">
                        {item.used}/{item.total} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-[16px] font-semibold">Live incidents</h2>
            <p className="mt-1 text-[12px] text-muted-foreground">Ops notifications</p>
            <div className="mt-4 space-y-2">
              {incidents.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold">{item.title}</p>
                    <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {item.level}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
