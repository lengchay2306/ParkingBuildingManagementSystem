import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { PhoneFrame } from "@/components/PhoneFrame";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff Console — PARKOS" },
      {
        name: "description",
        content:
          "Booth POS for entry + handheld patrol mobile app: plate capture, session create, exit confirm, payment and exception handling.",
      },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Role 02 · Parking Staff
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Booth POS{" "}
            <span className="text-muted-foreground">vs.</span> Handheld Patrol
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
            The booth is action-dense: plate capture, slot assignment, exit
            settlement, payment. The patrol app is one-handed: scan, mark, fix.
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* WEB POS */}
          <section className="lg:col-span-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-empty" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Booth 03 · Staff #41 (M. Chen) · Shift 14:00–22:00
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  15:42:08
                </span>
              </div>

              {/* Mode tabs */}
              <div className="flex border-b border-border bg-background/40 px-5">
                {["Entry", "Exit & Payment", "Exceptions", "Slot Override"].map(
                  (t, i) => (
                    <button
                      key={t}
                      className={`-mb-px border-b-2 px-3 py-2.5 text-[12.5px] font-medium ${
                        i === 0
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t}
                    </button>
                  ),
                )}
              </div>

              <div className="grid lg:grid-cols-5">
                {/* Left: plate capture */}
                <div className="space-y-5 p-6 lg:col-span-3 lg:border-r lg:border-border">
                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Step 01 · License plate
                    </span>
                    <div className="mt-2 flex items-stretch gap-2">
                      <div className="relative flex-1 overflow-hidden rounded-md border border-border bg-background">
                        <div className="absolute inset-x-3 top-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Detected · 99.2% conf.
                        </div>
                        <div className="px-4 pt-7 pb-3 font-mono text-3xl font-semibold tracking-[0.08em]">
                          51K-298.74
                        </div>
                      </div>
                      <button className="rounded-md border border-border bg-card px-3 text-[12px] font-medium hover:bg-secondary">
                        Manual
                      </button>
                      <button className="rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground">
                        Rescan
                      </button>
                    </div>
                  </div>

                  {/* Camera preview */}
                  <div className="relative h-40 overflow-hidden rounded-xl border border-border bg-background grid-bg">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80" />
                    <div className="absolute left-1/2 top-1/2 h-16 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-primary">
                      <div className="absolute -top-5 left-0 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                        Plate ROI
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      Cam · Gate-A · 1080p · 28 fps
                    </div>
                  </div>

                  {/* Vehicle + zone */}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Vehicle type">
                      <div className="flex gap-1">
                        {["Sedan", "SUV", "EV", "Bike"].map((v, i) => (
                          <span
                            key={v}
                            className={`flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium ${
                              i === 0
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-background text-muted-foreground"
                            }`}
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </Field>
                    <Field label="Tariff">
                      <span className="text-[13px] font-medium">
                        Standard · 25k₫/h
                      </span>
                    </Field>
                    <Field label="Gate">
                      <span className="text-[13px] font-medium">Gate-A · IN</span>
                    </Field>
                    <Field label="Entry time">
                      <span className="font-mono text-[13px] font-medium">
                        15:42:08
                      </span>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border bg-background/50 p-4">
                    <div>
                      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        AI assigned slot
                      </div>
                      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                        B2-047
                      </div>
                      <div className="text-[11.5px] text-muted-foreground">
                        Zone C · 32m from Elevator B
                      </div>
                    </div>
                    <button className="rounded-md bg-primary px-4 py-2.5 text-[13px] font-medium text-primary-foreground">
                      Open session →
                    </button>
                  </div>
                </div>

                {/* Right: live queue + recent sessions */}
                <div className="space-y-5 p-6 lg:col-span-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        Queue · 3 waiting
                      </span>
                      <span className="font-mono text-[11px] text-status-empty">
                        ● live
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {[
                        ["51K-298.74", "Sedan", "now"],
                        ["29A-114.02", "SUV", "+18s"],
                        ["51F-882.91", "EV", "+42s"],
                      ].map(([p, t, w]) => (
                        <div
                          key={p}
                          className="flex items-center justify-between rounded-md border border-border bg-background/50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[13px] font-semibold">
                              {p}
                            </span>
                            <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                              {t}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {w}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      My recent sessions · Booth 03
                    </span>
                    <div className="mt-2 divide-y divide-border rounded-md border border-border bg-background/40">
                      {[
                        ["#SES-19204", "30A-771.23", "B1-012", "IN-USE", "00:42"],
                        ["#SES-19201", "51H-204.81", "B2-031", "CLOSED", "01:18"],
                        ["#SES-19199", "29C-009.55", "B3-007", "CLOSED", "02:46"],
                        ["#SES-19198", "51K-887.40", "L1-082", "CLOSED", "00:21"],
                      ].map(([id, plate, slot, status, dur]) => (
                        <div
                          key={id}
                          className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 text-[12px]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {id}
                            </span>
                            <span className="font-mono font-semibold">{plate}</span>
                            <span className="font-mono text-muted-foreground">
                              → {slot}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                                status === "IN-USE"
                                  ? "bg-status-empty/15 text-status-empty"
                                  : "bg-secondary text-muted-foreground"
                              }`}
                            >
                              {status}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {dur}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/50 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Shift summary
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <Mini l="Entries" v="48" />
                      <Mini l="Exits" v="41" />
                      <Mini l="Collected" v="1.2M₫" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border bg-background/40 p-2 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-muted-foreground">
                Booth POS · Tablet / Web · 1440px
              </div>
            </div>
          </section>

          {/* MOBILE PATROL */}
          <section className="lg:col-span-4">
            <div className="sticky top-20 flex flex-col items-center">
              <PhoneFrame label="Patrol App · Exit & Payment">
                <div className="flex h-full flex-col bg-background">
                  <div className="px-5 pb-3 pt-12">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Patrol · Booth 03
                    </div>
                    <div className="text-[15px] font-semibold">Exit gate · B</div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
                    {/* Search */}
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Find session
                      </div>
                      <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                        <span className="text-muted-foreground">🔎</span>
                        <span className="font-mono text-[13px] font-semibold">
                          51K-298.74
                        </span>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button className="flex-1 rounded-md bg-secondary py-1.5 text-[11px] font-medium">
                          📷 Scan plate
                        </button>
                        <button className="flex-1 rounded-md bg-secondary py-1.5 text-[11px] font-medium">
                          QR code
                        </button>
                      </div>
                    </div>

                    {/* Session match */}
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-sm bg-status-empty/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-status-empty">
                          MATCH · IN-USE
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          #SES-19204
                        </span>
                      </div>
                      <div className="mt-3 font-mono text-2xl font-semibold tracking-[0.04em]">
                        51K-298.74
                      </div>
                      <div className="mt-1 text-[11.5px] text-muted-foreground">
                        Sedan · Slot B2-047 · in 13:54:12
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/50 p-3 text-center">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Duration
                          </div>
                          <div className="mt-0.5 font-mono text-[14px] font-semibold">
                            01:48
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Rate
                          </div>
                          <div className="mt-0.5 font-mono text-[14px] font-semibold">
                            25k/h
                          </div>
                        </div>
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                            Total
                          </div>
                          <div className="mt-0.5 font-mono text-[14px] font-semibold text-primary">
                            45k₫
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button className="rounded-md bg-secondary py-2 text-[11.5px] font-medium">
                          Cash
                        </button>
                        <button className="rounded-md bg-primary py-2 text-[11.5px] font-medium text-primary-foreground">
                          Driver paid →
                        </button>
                      </div>
                    </div>

                    {/* Exceptions */}
                    <div className="rounded-xl border border-border bg-card p-3">
                      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Quick actions
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {[
                          "Lost card",
                          "Plate fix",
                          "Wrong zone",
                          "Slot status",
                        ].map((a) => (
                          <button
                            key={a}
                            className="rounded-md border border-border bg-background/50 py-2 text-[11px] font-medium"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mx-4 mb-4 grid grid-cols-4 gap-1 rounded-xl border border-border bg-card p-1">
                    {["Entry", "Exit", "Patrol", "Me"].map((l, i) => (
                      <div
                        key={l}
                        className={`grid place-items-center rounded-md py-2 text-[10.5px] font-medium ${
                          i === 1
                            ? "bg-primary text-primary-foreground"
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
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Mini({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-md border border-border bg-card py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {l}
      </div>
      <div className="mt-0.5 text-[14px] font-semibold">{v}</div>
    </div>
  );
}
