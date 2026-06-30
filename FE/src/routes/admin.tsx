import { createFileRoute } from "@tanstack/react-router";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
import { DashboardHeader, DashboardMain } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    await requireRole("ADMIN");
  },
  head: () => ({
    meta: [
      { title: "System Admin — PARKOS" },
      {
        name: "description",
        content: "Admin dashboard for user and reservation management.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain className="space-y-6">
        <DashboardHeader
          title="Admin dashboard"
          description="Quản lý người dùng và reservation trong hệ thống bãi xe."
        />

        <UserDirectoryPanel />
        <ReservationListPanel />
      </DashboardMain>
    </div>
  );
}
