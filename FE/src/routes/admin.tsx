import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ParkingSessionListPanel } from "@/components/ParkingSessionListPanel";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardMain, DashboardTabs } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

type AdminTab = "users" | "reservations" | "sessions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    await requireRole("ADMIN");
  },
  head: () => ({
    meta: [
      { title: "Admin — PARKOS" },
      {
        name: "description",
        content: "Admin dashboard for user and reservation management.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain>
        <DashboardTabs
          tabs={[
            { id: "users", label: "Người dùng" },
            { id: "reservations", label: "Reservations" },
            { id: "sessions", label: "Sessions" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />

        {activeTab === "users" ? (
          <UserDirectoryPanel tableOnly className="min-h-[calc(100vh-12rem)]" />
        ) : activeTab === "reservations" ? (
          <ReservationListPanel tableOnly className="min-h-[calc(100vh-12rem)]" />
        ) : (
          <ParkingSessionListPanel tableOnly className="min-h-[calc(100vh-12rem)]" />
        )}
      </DashboardMain>
    </div>
  );
}
