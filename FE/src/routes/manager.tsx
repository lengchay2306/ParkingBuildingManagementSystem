import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ParkingSessionListPanel } from "@/components/ParkingSessionListPanel";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardHeader, DashboardMain, DashboardTabs } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

type ManagerTab = "overview" | "reservations" | "sessions";

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
      <DashboardMain>
        <DashboardHeader
          title="Manager dashboard"
          description="Theo dõi người dùng và quản lý reservation theo ngày."
        />

        <DashboardTabs
          tabs={[
            { id: "overview", label: "Người dùng" },
            { id: "reservations", label: "Reservations" },
            { id: "sessions", label: "Sessions" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "overview" ? (
          <UserDirectoryPanel compact />
        ) : activeTab === "reservations" ? (
          <ReservationListPanel tableOnly className="min-h-[640px]" />
        ) : (
          <ParkingSessionListPanel tableOnly className="min-h-[640px]" />
        )}
      </DashboardMain>
    </div>
  );
}
