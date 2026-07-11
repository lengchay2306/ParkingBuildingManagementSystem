import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountProfileBanner } from "@/components/AccountProfileBanner";
import { DashboardStatsPanel } from "@/components/DashboardStatsPanel";
import { ParkingSessionListPanel } from "@/components/ParkingSessionListPanel";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardHeader, DashboardMain, DashboardTabs } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

type ManagerTab = "stats" | "overview" | "reservations" | "sessions";

export const Route = createFileRoute("/manager")({
  beforeLoad: async () => {
    await requireRole("MANAGER");
  },
  head: () => ({
    meta: [
      { title: "Quản lý — PARKOS" },
      {
        name: "description",
        content: "Bảng điều khiển quản lý người dùng và đặt chỗ.",
      },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("stats");

  return (
    <div className="portal-shell portal-shell--manager min-h-screen">
      <SiteHeader />
      <DashboardMain>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <AccountProfileBanner
            fallbackName="Quản lý"
            dialogDescription="Thông tin tài khoản quản lý đang đăng nhập."
            className="sm:max-w-sm"
          />
        </div>

        <DashboardHeader
          title="Bảng điều khiển quản lý"
          description="Theo dõi thống kê, người dùng và quản lý đặt chỗ theo ngày."
        />

        <DashboardTabs
          tabs={[
            { id: "stats", label: "Thống kê" },
            { id: "overview", label: "Người dùng" },
            { id: "reservations", label: "Đặt chỗ" },
            { id: "sessions", label: "Phiên đỗ xe" },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === "stats" ? (
          <DashboardStatsPanel />
        ) : activeTab === "overview" ? (
          <UserDirectoryPanel compact />
        ) : activeTab === "reservations" ? (
          <ReservationListPanel tableOnly className="min-h-[640px]" />
        ) : (
          <ParkingSessionListPanel tableOnly allowDeleteError className="min-h-[640px]" />
        )}
      </DashboardMain>
    </div>
  );
}
