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
        content: "Manager dashboard for users and reservations.",
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
        <header className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tight">Manager dashboard</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            View users and manage reservations.
          </p>
        </header>

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
          <UserDirectoryPanel compact />
        ) : (
          <ReservationListPanel tableOnly className="min-h-[640px]" />
        )}
      </main>
    </div>
  );
}
