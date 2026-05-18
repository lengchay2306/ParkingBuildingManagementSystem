import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "System Admin — PARKOS" },
      {
        name: "description",
        content:
          "Account management, RBAC matrix, AI sensitivity, gate hardware and tariff configuration.",
      },
    ],
  }),
  component: AdminPage,
});

const users = [
  ["M. Chen", "Staff", "Booth 03", "Active", "now"],
  ["Mara N.", "Manager", "North Plaza", "Active", "12m"],
  ["A. Tran", "Driver", "—", "Active", "1h"],
  ["K. Pham", "Staff", "Patrol L1", "On break", "3m"],
  ["V. Le", "Admin", "HQ", "Active", "now"],
  ["T. Nguyen", "Staff", "Booth 01", "Suspended", "2d"],
];

const perms = [
  "View dashboard",
  "Open session",
  "Close session",
  "Override slot",
  "Manage tariff",
  "Manage users",
  "AI tuning",
  "System config",
];

const roles = ["Driver", "Staff", "Manager", "Admin"];

const matrix: Record<string, boolean[]> = {
  "View dashboard": [true, true, true, true],
  "Open session": [false, true, true, true],
  "Close session": [false, true, true, true],
  "Override slot": [false, false, true, true],
  "Manage tariff": [false, false, true, true],
  "Manage users": [false, false, false, true],
  "AI tuning": [false, false, false, true],
  "System config": [false, false, false, true],
};

function AdminPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Role 04 · System Administrator
          </span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Control panel
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted-foreground">
            Accounts, role-based access, AI sensitivity, hardware and tariff
            policies. One responsive surface for desktop and mobile browsers.
          </p>
        </header>

        <div className="grid gap-3 lg:grid-cols-12">
          {/* Users */}
          <section className="lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-3">
                <div>
                  <div className="text-[13.5px] font-medium">User accounts</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    248 active · 12 suspended
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium hover:bg-secondary">
                    Invite
                  </button>
                  <button className="rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-primary-foreground">
                    + New user
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.6fr] gap-2 border-b border-border bg-background/30 px-5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                <span>User</span>
                <span>Role</span>
                <span>Assignment</span>
                <span>Status</span>
                <span className="text-right">Seen</span>
              </div>
              <div className="divide-y divide-border">
                {users.map(([n, r, a, s, t]) => (
                  <div
                    key={n}
                    className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.6fr] items-center gap-2 px-5 py-2.5 text-[13px] hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-7 place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold">
                        {n
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </div>
                      <span className="font-medium">{n}</span>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {r}
                    </span>
                    <span className="text-muted-foreground">{a}</span>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${
                        s === "Active"
                          ? "bg-status-empty/15 text-status-empty"
                          : s === "Suspended"
                          ? "bg-status-full/15 text-status-full"
                          : "bg-status-maintenance/15 text-status-maintenance"
                      }`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {s}
                    </span>
                    <span className="text-right font-mono text-[11px] text-muted-foreground">
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* RBAC matrix */}
            <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-background/40 px-5 py-3">
                <div>
                  <div className="text-[13.5px] font-medium">RBAC matrix</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    {perms.length} permissions · {roles.length} roles
                  </div>
                </div>
                <button className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium hover:bg-secondary">
                  Edit
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="bg-background/30 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                      <th className="px-5 py-2 text-left font-normal">Permission</th>
                      {roles.map((r) => (
                        <th key={r} className="px-3 py-2 text-center font-normal">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {perms.map((p) => (
                      <tr key={p}>
                        <td className="px-5 py-2.5 font-medium">{p}</td>
                        {matrix[p].map((v, i) => (
                          <td key={i} className="px-3 py-2.5 text-center">
                            {v ? (
                              <span className="inline-grid size-5 place-items-center rounded-sm bg-primary/15 text-[11px] text-primary">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-grid size-5 place-items-center rounded-sm border border-border text-[11px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Config */}
          <aside className="space-y-3 lg:col-span-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-medium">AI sensitivity</div>
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                    Slot routing · plate recognition
                  </div>
                </div>
                <span className="rounded-sm bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                  v2.4
                </span>
              </div>
              <div className="mt-5 space-y-5">
                <Slider label="Plate OCR threshold" val={92} unit="%" />
                <Slider label="Reroute aggressiveness" val={68} unit="%" />
                <Slider label="Overstay grace" val={15} unit="min" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[13.5px] font-medium">Buildings & zones</div>
              <div className="mt-3 divide-y divide-border">
                {[
                  ["North Plaza", "574 slots · 4 floors", true],
                  ["Riverside Tower", "318 slots · 3 floors", true],
                  ["Old Quarter Lot", "92 slots · L1", false],
                ].map(([n, d, on]) => (
                  <div
                    key={n as string}
                    className="flex items-center justify-between py-3"
                  >
                    <div>
                      <div className="text-[13px] font-medium">{n}</div>
                      <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
                        {d}
                      </div>
                    </div>
                    <div
                      className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                        on ? "bg-primary" : "bg-border"
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-background transition-transform ${
                          on ? "translate-x-4" : ""
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[13.5px] font-medium">Tariff policy</div>
              <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[12px]">
                {[
                  ["Sedan", "25k₫/h"],
                  ["SUV", "35k₫/h"],
                  ["EV", "30k₫/h"],
                  ["Bike", "10k₫/h"],
                  ["Lost-card", "+100k₫"],
                  ["Overstay", "×1.5"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                  >
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <div className="text-[13.5px] font-medium">System health</div>
                <span className="font-mono text-[10.5px] text-status-empty">
                  ● all green
                </span>
              </div>
              <div className="mt-3 space-y-2 text-[12px]">
                {[
                  ["Gate cameras", "12/12", "bg-status-empty"],
                  ["IoT slot sensors", "572/574", "bg-status-maintenance"],
                  ["Payment gateway", "OK · 184ms", "bg-status-empty"],
                  ["AI router", "OK · v2.4", "bg-status-empty"],
                ].map(([k, v, c]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full ${c}`} />
                      <span>{k}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Slider({ label, val, unit }: { label: string; val: number; unit: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[12px] font-semibold">
          {val}
          {unit}
        </span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(val / (unit === "min" ? 60 : 100)) * 100}%` }}
        />
      </div>
    </div>
  );
}
