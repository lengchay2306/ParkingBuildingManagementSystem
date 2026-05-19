import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/flow")({
  head: () => ({
    meta: [
      { title: "Main Flow — PARKOS" },
      {
        name: "description",
        content:
          "End-to-end parking session: driver arrives, staff captures plate and opens a session, driver parks, exits, pays, slot releases.",
      },
    ],
  }),
  component: FlowPage,
});

const steps = [
  {
    n: "01",
    actor: "Driver",
    title: "Discover & (optionally) pre-book",
    body: "Driver opens the web portal — sees tariff, free slots per zone, building hours. Can pre-book a zone and time window.",
    surface: "Driver · Web / Mobile",
    icon: "🌐",
  },
  {
    n: "02",
    actor: "Driver",
    title: "Arrive at the gate",
    body: "Vehicle reaches entry. Plate is captured automatically; if recognition fails, staff takes over.",
    surface: "Gate · Camera",
    icon: "🚗",
  },
  {
    n: "03",
    actor: "Staff",
    title: "Enter / confirm plate, open session",
    body: "Staff POS confirms or types the plate, picks vehicle type. System records entry time + gate.",
    surface: "Staff · Tablet POS",
    icon: "🪪",
  },
  {
    n: "04",
    actor: "System",
    title: "Assign slot · mark IN-USE",
    body: "AI selects a slot matching vehicle type and floor policy. Slot flips from EMPTY → IN-USE. Driver receives session + slot ID.",
    surface: "AI Router",
    icon: "🧭",
  },
  {
    n: "05",
    actor: "Driver",
    title: "Park & track session",
    body: "Driver sees live timer, slot, zone, estimated fee. Indoor wayfinding to the assigned slot.",
    surface: "Driver · Mobile App",
    icon: "⏱️",
  },
  {
    n: "06",
    actor: "Staff",
    title: "Find session, confirm exit time",
    body: "At exit gate, staff searches by plate / session ID. System computes elapsed time & fee per tariff policy.",
    surface: "Staff · Handheld",
    icon: "🔎",
  },
  {
    n: "07",
    actor: "Driver",
    title: "Pay & leave",
    body: "Driver pays via wallet, card, QR or cash to staff. Receipt is issued. Gate opens.",
    surface: "Driver · Mobile / POS",
    icon: "💳",
  },
  {
    n: "08",
    actor: "System",
    title: "Release slot · mark AVAILABLE",
    body: "Slot flips back to EMPTY. Session closed. Manager dashboard + reports update in real time.",
    surface: "System",
    icon: "✓",
  },
];

const exceptions = [
  ["Lost ticket / card", "Staff verifies plate → recovers session → applies lost-card surcharge"],
  ["Plate mismatch", "Staff overrides plate on session; audit log records the change"],
  ["Over-stay", "Tariff escalates per policy; alert pushed to manager dashboard"],
  ["Wrong-zone parking", "Driver gets push; staff can reassign slot without closing session"],
  ["Unpaid exit", "Gate held; payment link sent to driver; ticket queued in finance"],
];

function FlowPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-10">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Reference · End-to-end
          </span>
          <h1 className="mt-2 text-5xl font-semibold tracking-tight">
            Main parking session flow
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-[1.55] text-muted-foreground">
            From the moment a driver arrives at the gate to the moment the slot
            is released back to inventory — eight steps across four actors.
          </p>
        </header>

        {/* Actor swimlane header */}
        <div className="mb-3 grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-border bg-border text-center">
          {["Driver", "Staff", "System", "Manager"].map((a, i) => (
            <div
              key={a}
              className="bg-card px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground"
            >
              <span className="mr-2 text-foreground">0{i + 1}</span>
              {a}
            </div>
          ))}
        </div>

        {/* Steps */}
        <ol className="relative space-y-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              className="group relative grid gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 md:grid-cols-[80px_1fr_200px]"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg border border-border bg-background text-[18px]">
                  {s.icon}
                </div>
                <span className="font-mono text-[20px] font-semibold tracking-tight text-muted-foreground">
                  {s.n}
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-primary">
                    {s.actor}
                  </span>
                  <h3 className="text-[18px] font-medium tracking-tight">
                    {s.title}
                  </h3>
                </div>
                <p className="mt-1.5 max-w-2xl text-[13.5px] leading-[1.55] text-muted-foreground">
                  {s.body}
                </p>
              </div>
              <div className="flex items-start justify-end">
                <span className="rounded-md border border-border bg-background px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.surface}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="absolute -bottom-3 left-9 h-3 w-px bg-border"
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>

        {/* Slot state machine */}
        <section className="mt-14 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Slot state machine
            </span>
            <h3 className="mt-2 text-xl font-medium">5 states · 1 source of truth</h3>
            <div className="mt-5 space-y-2 font-mono text-[12px]">
              {[
                ["EMPTY", "bg-status-empty", "Free, biddable by AI router"],
                ["RESERVED", "bg-status-reserved", "Held by pre-booking until grace expires"],
                ["IN-USE", "bg-status-full", "Active session, fee accruing"],
                ["MAINTENANCE", "bg-status-maintenance", "Hardware or cleaning hold"],
                ["LOCKED", "bg-status-error", "Manually blocked by manager"],
              ].map(([l, c, d]) => (
                <div
                  key={l}
                  className="flex items-center gap-3 rounded-md border border-border bg-background/40 px-3 py-2"
                >
                  <span className={`size-2 rounded-full ${c}`} />
                  <span className="w-32 font-semibold text-foreground">{l}</span>
                  <span className="text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Exception handling
            </span>
            <h3 className="mt-2 text-xl font-medium">Edge cases staff resolve</h3>
            <div className="mt-5 divide-y divide-border">
              {exceptions.map(([t, d]) => (
                <div key={t} className="grid grid-cols-[140px_1fr] gap-4 py-2.5">
                  <span className="text-[13px] font-medium">{t}</span>
                  <span className="text-[12.5px] text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
