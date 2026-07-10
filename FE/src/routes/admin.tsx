import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminResourcesPanel } from "@/components/AdminResourcesPanel";
import { DashboardStatsPanel } from "@/components/DashboardStatsPanel";
import { ParkingSessionListPanel } from "@/components/ParkingSessionListPanel";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardMain, DashboardTabs } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

type AdminTab = "stats" | "users" | "reservations" | "sessions" | "resources";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    await requireRole("ADMIN");
  },
  head: () => ({
    meta: [
      { title: "Quản trị — PARKOS" },
      {
        name: "description",
        content: "Bảng điều khiển quản trị viên để quản lý người dùng và đặt chỗ.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain>
        <DashboardTabs
          tabs={[
            { id: "stats", label: "Thống kê" },
            { id: "users", label: "Người dùng" },
            { id: "reservations", label: "Đặt chỗ" },
            { id: "sessions", label: "Phiên đỗ xe" },
            { id: "resources", label: "Cấu hình" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          className="mb-4"
        />

        {activeTab === "stats" ? (
          <DashboardStatsPanel className="min-h-[calc(100vh-12rem)]" />
        ) : activeTab === "users" ? (
          <UserDirectoryPanel tableOnly allowDelete allowCreate className="min-h-[calc(100vh-12rem)]" />
        ) : activeTab === "reservations" ? (
          <ReservationListPanel tableOnly className="min-h-[calc(100vh-12rem)]" />
        ) : activeTab === "sessions" ? (
          <ParkingSessionListPanel
            tableOnly
            allowDeleteError
            className="min-h-[calc(100vh-12rem)]"
          />
        ) : (
          <AdminResourcesPanel className="min-h-[calc(100vh-12rem)]" />
        )}
      </DashboardMain>
    </div>
  );
}
