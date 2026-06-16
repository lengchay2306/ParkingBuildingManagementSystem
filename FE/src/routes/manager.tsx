import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusLegend } from "@/components/StatusLegend";
import { SlotAvailabilityFilter } from "@/components/SlotAvailabilityFilter";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { PastelBars, PastelDonut, SparkArea } from "@/components/charts";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/manager")({
  beforeLoad: async () => {
    await requireRole("MANAGER");
  },
  head: () => ({
    meta: [
      { title: "Manager Dashboard — PARKOS" },
      {
        name: "description",
        content:
          "Real-time occupancy, revenue trends, AI routing recommendations and pocket alerts for parking facility managers.",
      },
      { property: "og:title", content: "Manager Dashboard — PARKOS" },
      {
        property: "og:description",
        content: "Web command center and mobile alerts for parking facility managers.",
      },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Role 01 · Facility Manager
            </span>
            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Web Command Center <span className="text-muted-foreground">vs.</span> Pocket Alerts
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              The web view goes wide and dense. The mobile view distills everything into the next
              decision the manager has to make.
            </p>
          </div>
          <StatusLegend />
        </header>

        <div className="grid gap-8">
          {/* WEB DASHBOARD */}
          <section>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="flex h-[820px]">
                {/* Sidebar */}
                <aside className="hidden w-56 flex-col gap-6 border-r border-border bg-background/50 p-5 md:flex">
                  <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-xl bg-foreground text-background font-black">
                      P
                    </div>
                    <div>
                      <div className="text-xs font-bold">PARKOS</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        North Plaza
                      </div>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    {[
                      ["Overview", true],
                      ["Live Floors", false],
                      ["Revenue", false],
                      ["Patrol", false],
                      ["AI Routing", false],
                      ["Devices", false],
                    ].map(([l, a]) => (
                      <div
                        key={l as string}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                          a
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {l}
                      </div>
                    ))}
                  </nav>
                  <div className="mt-auto rounded-2xl bg-gradient-to-br from-pastel-lavender to-pastel-pink p-4 text-foreground">
                    <div className="font-mono text-[9px] uppercase tracking-widest opacity-70">
                      Shift
                    </div>
                    <div className="mt-1 text-sm font-bold">M. Chen</div>
                    <div className="text-[10px] opacity-70">14:00 → 22:00 · L1-L4</div>
                  </div>
                </aside>

                {/* Main */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* KPIs */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      {
                        l: "Occupancy",
                        v: "84%",
                        d: "+3.2% vs avg",
                        bg: "bg-pastel-mint",
                      },
                      {
                        l: "Revenue (Today)",
                        v: "$14,204",
                        d: "+12% MoM",
                        bg: "bg-pastel-peach",
                      },
                      {
                        l: "Avg. Stay",
                        v: "1h 42m",
                        d: "-6m vs week",
                        bg: "bg-pastel-sky",
                      },
                      {
                        l: "AI Reroutes",
                        v: "127",
                        d: "today",
                        bg: "bg-pastel-lavender",
                      },
                    ].map((k) => (
                      <div
                        key={k.l}
                        className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
                      >
                        <div
                          className={`absolute -right-6 -top-6 size-20 rounded-full ${k.bg} opacity-80 blur-xl`}
                        />
                        <div className="relative">
                          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {k.l}
                          </div>
                          <div className="mt-1 text-2xl font-bold tracking-tight">{k.v}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">{k.d}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <SlotAvailabilityFilter />

                  <UserDirectoryPanel className="mt-6" compact />

                  {/* Charts row */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-2xl border border-border bg-gradient-to-br from-pastel-sky/40 to-pastel-lavender/30 p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold">Peak Hours</div>
                          <div className="text-[10px] text-muted-foreground">
                            Today · entries per hour
                          </div>
                        </div>
                        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold">
                          peak 18h
                        </span>
                      </div>
                      <PastelBars />
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5">
                      <div className="text-sm font-bold">Vehicle Mix</div>
                      <div className="text-[10px] text-muted-foreground">Last 24h</div>
                      <div className="mt-3 flex items-center justify-center">
                        <PastelDonut
                          segments={[
                            { value: 58, color: "var(--color-pastel-lavender)", label: "Sedan" },
                            { value: 22, color: "var(--color-pastel-peach)", label: "SUV" },
                            { value: 12, color: "var(--color-pastel-mint)", label: "EV" },
                            { value: 8, color: "var(--color-pastel-pink)", label: "Bike" },
                          ]}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-1.5">
                        {[
                          ["Sedan", "var(--color-pastel-lavender)", "58%"],
                          ["SUV", "var(--color-pastel-peach)", "22%"],
                          ["EV", "var(--color-pastel-mint)", "12%"],
                          ["Bike", "var(--color-pastel-pink)", "8%"],
                        ].map(([l, c, v]) => (
                          <div key={l} className="flex items-center gap-1.5 text-[10px]">
                            <span
                              className="size-2 rounded-full"
                              style={{ background: c as string }}
                            />
                            <span className="font-semibold">{l}</span>
                            <span className="ml-auto text-muted-foreground">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue + AI Insight */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-2xl border border-border bg-card p-5">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-sm font-bold">Revenue Trend</div>
                          <div className="text-[10px] text-muted-foreground">14-day rolling</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">$182,940</div>
                          <div className="text-[10px] font-bold text-status-empty">↑ 18.2%</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <SparkArea />
                      </div>
                    </div>
                    <div className="relative overflow-hidden rounded-2xl bg-foreground p-5 text-background">
                      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-pastel-pink opacity-30 blur-2xl" />
                      <div className="font-mono text-[10px] uppercase tracking-widest opacity-60">
                        AI Insight
                      </div>
                      <p className="mt-2 text-sm leading-snug">
                        Reroute incoming sedans to <span className="font-bold">B3 (Zone C)</span>.
                        B2 predicted 96% by 17:15.
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button className="rounded-lg bg-background px-3 py-1.5 text-[11px] font-bold text-foreground">
                          Apply
                        </button>
                        <button className="rounded-lg border border-background/30 px-3 py-1.5 text-[11px] font-semibold opacity-70">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background/40 p-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Web Dashboard · 1440px
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
