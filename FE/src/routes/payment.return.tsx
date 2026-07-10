import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { DashboardMain, DashboardSection } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/payment/return")({
  beforeLoad: async () => {
    await requireRole("CUSTOMER");
  },
  head: () => ({
    meta: [
      { title: "Thanh toán thành công - PARKOS" },
      {
        name: "description",
        content: "Kết quả thanh toán thẻ tháng PayOS.",
      },
    ],
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.success("Thanh toán đã gửi", {
      description:
        "Nếu thanh toán thành công, thẻ tháng sẽ được kích hoạt sau khi PayOS gửi webhook về hệ thống.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <DashboardMain>
        <DashboardSection className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-status-empty/35 bg-status-empty/10">
            <CheckCircle2 className="size-7 text-status-empty" />
          </div>
          <p className="dashboard-kicker">PayOS</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Đã quay lại từ thanh toán</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Hệ thống sẽ kích hoạt thẻ tháng sau khi nhận webhook từ PayOS. Bạn có thể kiểm tra lại
            danh sách xe trên cổng tài xế.
          </p>
          <Button
            type="button"
            className="mt-6 rounded-xl"
            onClick={() => void navigate({ to: "/driver" })}
          >
            Về cổng tài xế
          </Button>
        </DashboardSection>
      </DashboardMain>
    </div>
  );
}
