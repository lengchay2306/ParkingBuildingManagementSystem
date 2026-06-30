import { createFileRoute } from "@tanstack/react-router";
import { ReservationListPanel } from "@/components/ReservationListPanel";
import { SiteHeader } from "@/components/SiteHeader";
import { UserDirectoryPanel } from "@/components/UserDirectoryPanel";
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
      <main className="mx-auto max-w-7xl space-y-3 px-6 py-12">
        <header className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tight">Admin dashboard</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Manage registered users and reservations.
          </p>
        </header>

        <UserDirectoryPanel />
        <ReservationListPanel />
      </main>
    </div>
  );
}
