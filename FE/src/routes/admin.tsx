import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountProfileBanner } from "@/components/AccountProfileBanner";
import { AdminResourcesPanel } from "@/components/AdminResourcesPanel";
import { DashboardStatsPanel } from "@/components/DashboardStatsPanel";
import { ParkingSessionListPanel } from "@/components/ParkingSessionListPanel";
import { PaymentListPanel } from "@/components/PaymentListPanel";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardHeader, DashboardMain, DashboardTabs } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

type AdminTab = "stats" | "users" | "reservations" | "sessions" | "payments" | "resources";

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
    <div className="portal-shell portal-shell--admin min-h-screen">
      <SiteHeader />
      <DashboardMain>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <AccountProfileBanner
            fallbackName="Quản trị viên"
            dialogDescription="Thông tin tài khoản quản trị viên đang đăng nhập."
            className="sm:max-w-sm"
          />
        </div>

        <DashboardHeader
          title="Bảng điều khiển quản trị"
          description="Giám sát dữ liệu vận hành và quản trị tài nguyên hệ thống theo thời gian thực."
        />
        <DashboardTabs
          tabs={[
            { id: "stats", label: "Thống kê" },
            { id: "users", label: "Người dùng" },
            { id: "reservations", label: "Đặt chỗ" },
            { id: "sessions", label: "Phiên đỗ xe" },
            { id: "payments", label: "Thanh toán" },
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
        ) : activeTab === "payments" ? (
          <PaymentListPanel
            tableOnly
            allowCancel
            allowDelete
            className="min-h-[calc(100vh-12rem)]"
          />
        ) : (
          <AdminResourcesPanel className="min-h-[calc(100vh-12rem)]" />
        )}
      </DashboardMain>
    </div>
  );
}
