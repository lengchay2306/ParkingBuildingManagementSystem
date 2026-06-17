import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

type ManagerTab = "overview" | "reservations";

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

const sidebarItems: Array<{ id: ManagerTab | null; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: null, label: "Live Floors" },
  { id: null, label: "Revenue" },
  { id: "reservations", label: "Reservations" },
  { id: null, label: "Patrol" },
  { id: null, label: "AI Routing" },
  { id: null, label: "Devices" },
];

function ManagerPage() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
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
                    {sidebarItems.map(({ id, label }) => {
                      const isActive = id !== null && activeTab === id;
                      const isClickable = id !== null;

                      return (
                        <button
                          key={label}
                          type="button"
                          disabled={!isClickable}
                          onClick={() => {
                            if (id) {
                              setActiveTab(id);
                            }
                          }}
                          className={cn(
                            "w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors",
                            isActive
                              ? "bg-foreground text-background"
                              : isClickable
                                ? "text-muted-foreground hover:bg-muted"
                                : "cursor-default text-muted-foreground/60",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
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
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                  {activeTab === "overview" ? (
                    <div className="overflow-y-auto">
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

                      <UserDirectoryPanel className="mt-6" compact />
                    </div>
                  ) : (
                    <ReservationListPanel tableOnly className="min-h-0 flex-1" />
                  )}
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
