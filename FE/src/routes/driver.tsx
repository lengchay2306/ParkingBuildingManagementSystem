import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { PhoneFrame } from "@/components/PhoneFrame";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "Driver Experience — PARKOS" },
      {
        name: "description",
        content:
          "Mobile-first parking session with indoor wayfinding, QR exit, and a web pre-booking portal.",
      },
      { property: "og:title", content: "Driver Experience — PARKOS" },
      {
        property: "og:description",
        content:
          "Live availability, AI-assigned slot, in-app payments, and pre-book from desktop.",
      },
    ],
  }),
  component: DriverPage,
});

function DriverPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Role 03 · Driver
          </span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Mobile App{" "}
            <span className="text-muted-foreground">vs.</span> Web Pre-booking
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            The phone runs the live session — wayfinding, timer, QR. The desktop
            handles planning — booking days ahead, downloading invoices.
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* MOBILE */}
          <section className="order-2 lg:order-1 lg:col-span-4">
            <div className="sticky top-24 flex flex-col items-center">
              <PhoneFrame label="Driver Mobile App">
                <div className="flex h-full flex-col bg-gradient-to-b from-background to-pastel-lavender/30">
                  <div className="px-5 pt-12 pb-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                        Welcome back
                      </div>
                      <div className="text-base font-bold">Alex Tran</div>
                    </div>
                    <div className="rounded-full border border-border bg-card px-3 py-1 text-[10px] font-bold">
                      $24.50 · Wallet
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-3">
                    {/* Active session */}
                    <div className="relative overflow-hidden rounded-3xl bg-foreground p-5 text-background shadow-pop">
                      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-pastel-pink opacity-30 blur-2xl" />
                      <div className="absolute -bottom-12 -left-10 size-40 rounded-full bg-pastel-lavender opacity-30 blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-status-empty/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-status-empty">
                            ● Active
                          </span>
                          <span className="font-mono text-[10px] opacity-70">
                            Slot B2-047
                          </span>
                        </div>
                        <div className="mt-3 font-mono text-4xl font-bold tracking-tight">
                          01:42:15
                        </div>
                        <div className="mt-1 text-[11px] opacity-70">
                          Estimated fee · $8.50
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button className="rounded-xl bg-background py-2 text-[11px] font-bold text-foreground">
                            Directions
                          </button>
                          <button className="rounded-xl border border-background/30 py-2 text-[11px] font-bold">
                            Extend
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Mini map */}
                    <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
                      <div className="relative h-32 bg-gradient-to-br from-pastel-sky/60 to-pastel-mint/40">
                        <svg viewBox="0 0 200 100" className="absolute inset-0 size-full">
                          <path
                            d="M10 80 Q 60 80 80 50 T 160 30"
                            stroke="var(--foreground)"
                            strokeWidth="3"
                            strokeDasharray="4 4"
                            fill="none"
                          />
                          <circle cx="10" cy="80" r="5" fill="var(--foreground)" />
                          <circle cx="160" cy="30" r="6" fill="var(--color-status-empty)" stroke="var(--foreground)" strokeWidth="2" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-3 p-3">
                        <div className="grid size-8 place-items-center rounded-lg bg-pastel-mint">
                          📍
                        </div>
                        <div>
                          <div className="text-xs font-bold">AI Route → B2-047</div>
                          <div className="text-[10px] text-muted-foreground">
                            4 min walk · Elevator B
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR */}
                    <div className="mt-3 rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="grid size-20 place-items-center rounded-xl bg-foreground">
                          <div
                            className="size-16 bg-background"
                            style={{
                              backgroundImage:
                                "repeating-conic-gradient(var(--foreground) 0% 25%, var(--background) 0% 50%)",
                              backgroundSize: "8px 8px",
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold">Exit QR</div>
                          <div className="text-[10px] text-muted-foreground">
                            Tap at gate · valid until 22:00
                          </div>
                          <button className="mt-2 rounded-lg bg-foreground px-3 py-1 text-[10px] font-bold text-background">
                            Apple Pay
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mx-5 mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-card p-1 shadow-soft">
                    {["Home", "Map", "Wallet", "Help"].map((l, i) => (
                      <div
                        key={l}
                        className={`grid place-items-center rounded-xl py-2 text-[10px] font-bold ${
                          i === 0
                            ? "bg-foreground text-background"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </section>

          {/* WEB PORTAL */}
          <section className="order-1 lg:order-2 lg:col-span-8">
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              {/* Top nav */}
              <div className="flex items-center justify-between border-b border-border bg-background/50 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid size-7 place-items-center rounded-lg bg-foreground text-background font-black text-xs">
                    P
                  </div>
                  <span className="text-sm font-bold">PARKOS Portal</span>
                </div>
                <nav className="hidden gap-6 text-xs font-semibold text-muted-foreground md:flex">
                  <span className="text-foreground">Pre-book</span>
                  <span>My Sessions</span>
                  <span>Invoices</span>
                  <span>Support</span>
                </nav>
                <button className="rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background">
                  Sign in
                </button>
              </div>

              <div className="grid lg:grid-cols-5">
                {/* Left: hero + form */}
                <div className="p-8 lg:col-span-3 lg:border-r lg:border-border">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    North Plaza · 574 spots
                  </div>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight">
                    Reserve your spot,{" "}
                    <span className="bg-gradient-to-r from-pastel-lavender to-pastel-peach bg-clip-text text-transparent">
                      skip the line
                    </span>
                    .
                  </h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Pre-book a floor and zone up to 30 days in advance. Your
                    plate gets recognised at the gate — no ticket needed.
                  </p>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field label="Vehicle plate" value="KSR-9204" />
                    <Field label="Building">North Plaza</Field>
                    <Field label="Date">Nov 24, 2026</Field>
                    <Field label="Time">08:00 → 18:00</Field>
                  </div>

                  <div className="mt-5">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Preferred floor
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[
                        ["B1 · Premium", true],
                        ["B2 · Standard", false],
                        ["B3 · EV Charging", false],
                        ["L1 · Outdoor", false],
                      ].map(([l, a]) => (
                        <div
                          key={l as string}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            a
                              ? "bg-foreground text-background"
                              : "border border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between rounded-2xl bg-gradient-to-br from-pastel-mint/60 to-pastel-sky/40 p-5">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        Estimated total
                      </div>
                      <div className="text-3xl font-bold">$24.00</div>
                      <div className="text-[10px] text-muted-foreground">
                        Includes 15% PARKSAFE26 discount
                      </div>
                    </div>
                    <button className="rounded-2xl bg-foreground px-6 py-3 text-sm font-bold text-background shadow-pop">
                      Confirm booking
                    </button>
                  </div>
                </div>

                {/* Right: building info / invoices */}
                <div className="space-y-5 p-8 lg:col-span-2">
                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold">Live availability</div>
                      <span className="font-mono text-[10px] text-status-empty">
                        ● 92 free
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        ["B1 Premium", 12, 60],
                        ["B2 Standard", 38, 120],
                        ["B3 EV", 32, 40],
                        ["L1 Outdoor", 10, 354],
                      ].map(([l, free, total]) => {
                        const pct =
                          ((Number(total) - Number(free)) / Number(total)) * 100;
                        return (
                          <div key={l as string}>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold">{l}</span>
                              <span className="text-muted-foreground">
                                {free}/{total}
                              </span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-pastel-lavender to-pastel-pink"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold">Recent invoices</div>
                      <button className="text-[10px] font-bold text-muted-foreground underline">
                        Download all
                      </button>
                    </div>
                    <div className="mt-3 divide-y divide-border">
                      {[
                        ["#INV-8921", "Nov 14", "$12.00"],
                        ["#INV-8910", "Nov 09", "$45.50"],
                        ["#INV-8898", "Nov 03", "$18.20"],
                      ].map(([id, d, v]) => (
                        <div
                          key={id}
                          className="flex items-center justify-between py-2"
                        >
                          <div>
                            <div className="font-mono text-[11px] font-bold">
                              {id}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {d}
                            </div>
                          </div>
                          <div className="text-xs font-bold">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-pastel-peach/40 p-4">
                    <div className="text-xs font-bold">Lost your card?</div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Open a ticket — staff can validate your plate and release
                      the gate within 60 seconds.
                    </p>
                    <button className="mt-2 rounded-lg bg-foreground px-3 py-1.5 text-[10px] font-bold text-background">
                      Report issue
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-border bg-background/40 p-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Driver Web Portal · Responsive
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  value,
}: {
  label: string;
  children?: React.ReactNode;
  value?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold">
        {value ?? children}
      </div>
    </label>
  );
}
