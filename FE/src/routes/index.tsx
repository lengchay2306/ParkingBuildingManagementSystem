import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PARKOS — Parking Building Management System" },
      {
        name: "description",
        content:
          "A command-center OS for parking buildings. Real-time occupancy, AI routing, driver pre-booking, staff POS and RBAC across web and mobile.",
      },
      { property: "og:title", content: "PARKOS — Parking Building Management System" },
      {
        property: "og:description",
        content:
          "Cross-platform UI for managers, staff, drivers and admins. Linear-grade dark interface.",
      },
    ],
  }),
  component: Index,
});

const roles = [
  {
    to: "/manager",
    eyebrow: "Role 01",
    title: "Facility Manager",
    desc: "Web command center with live floor grid, revenue, AI routing. Pocket app for priority alerts.",
    chips: ["Web Dashboard", "Mobile App"],
  },
  {
    to: "/staff",
    eyebrow: "Role 02",
    title: "Parking Staff",
    desc: "Booth POS for plate entry & session creation. Patrol handheld for exits, payments and exceptions.",
    chips: ["Tablet POS", "Mobile Patrol"],
  },
  {
    to: "/driver",
    eyebrow: "Role 03",
    title: "Driver / Customer",
    desc: "Live session, indoor wayfinding to the assigned slot, QR exit, and a web portal for pre-booking.",
    chips: ["Mobile App", "Web Portal"],
  },
  {
    to: "/admin",
    eyebrow: "Role 04",
    title: "System Administrator",
    desc: "Account management, RBAC matrix, AI sensitivity, gate hardware and tariff configuration.",
    chips: ["Responsive Web"],
  },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 pt-20 pb-24">
        {/* HERO */}
        <section className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-status-empty" /> v4.2 · 574 spots live
          </span>
          <h1 className="mt-6 max-w-4xl text-[64px] font-semibold leading-[1.05] tracking-[-0.04em] md:text-[80px]">
            The operating system
            <br />
            for parking buildings.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-[1.5] text-muted-foreground">
            PARKOS unifies plate recognition, AI slot routing, payments and
            patrols into one quiet, dense command surface. Built for the four
            roles that keep a building moving.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              to="/manager"
              className="rounded-md bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Open Manager Dashboard →
            </Link>
            <Link
              to="/flow"
              className="rounded-md border border-border bg-card px-3.5 py-2 text-[13px] font-medium hover:bg-secondary"
            >
              View Main Flow
            </Link>
          </div>

          {/* Hero panel: live snapshot */}
          <div className="relative mt-14 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-empty" />
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  North Plaza · Realtime
                </span>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                15:42:08 ICT
              </span>
            </div>
            <div className="grid divide-border md:grid-cols-4 md:divide-x">
              {[
                { l: "Occupancy", v: "84%", d: "482 / 574", c: "bg-status-empty" },
                { l: "Today Revenue", v: "$14,204", d: "+12% MoM", c: "bg-primary" },
                { l: "Avg. Stay", v: "1h 42m", d: "−6m vs week", c: "bg-status-reserved" },
                { l: "AI Reroutes", v: "127", d: "today", c: "bg-status-maintenance" },
              ].map((k) => (
                <div key={k.l} className="p-5">
                  <div className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${k.c}`} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {k.l}
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-semibold tracking-tight">
                    {k.v}
                  </div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    {k.d}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ROLES */}
        <section className="mt-24">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Surfaces
              </span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Four roles. One canvas.
              </h2>
            </div>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:inline">
              Choose a surface →
            </span>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
            {roles.map((r) => (
              <Link
                key={r.title}
                to={r.to}
                className="group relative bg-card p-7 transition-colors hover:bg-secondary"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {r.eyebrow}
                    </span>
                    <h3 className="mt-2 text-[22px] font-medium tracking-tight">
                      {r.title}
                    </h3>
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
                    →
                  </span>
                </div>
                <p className="mt-3 max-w-md text-[14px] leading-[1.55] text-muted-foreground">
                  {r.desc}
                </p>
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {r.chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <section className="mt-24 border-t border-border pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px] text-muted-foreground">
            <span className="font-mono uppercase tracking-[0.18em]">
              © 2026 PARKOS · Building OS
            </span>
            <span className="font-mono uppercase tracking-[0.18em]">
              Design system · Linear-grade dark canvas
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
