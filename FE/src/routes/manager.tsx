import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { requireRole } from "@/lib/auth";

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

function ManagerPage() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("overview");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8">
          {/* WEB DASHBOARD */}
          <section>
            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="h-[820px]">
                <div className="flex min-h-0 h-full flex-1 flex-col overflow-hidden p-6">
                  <div className="mb-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("overview")}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        activeTab === "overview"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("reservations")}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        activeTab === "reservations"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Reservations
                    </button>
                  </div>

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
