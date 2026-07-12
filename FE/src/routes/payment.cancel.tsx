import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { XCircle } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { DashboardMain, DashboardSection } from "@/components/dashboard-ui";
import {
  cancelPendingSubscriptionCheckout,
  loadPendingSubscriptionCheckout,
} from "@/lib/pending-payment";
import { redirectMobilePayOsToApp } from "@/lib/mobile-payos-redirect";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/payment/cancel")({
  beforeLoad: async () => {
    await requireRole("CUSTOMER");
  },
  head: () => ({
    meta: [
      { title: "Hủy thanh toán - PARKOS" },
      {
        name: "description",
        content: "Thanh toán thẻ tháng đã bị hủy trên PayOS.",
      },
    ],
  }),
  component: PaymentCancelPage,
});

function PaymentCancelPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (redirectMobilePayOsToApp("cancel")) {
      return;
    }

    const pending = loadPendingSubscriptionCheckout();
    void cancelPendingSubscriptionCheckout(pending);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <DashboardMain>
        <DashboardSection className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-destructive/40 bg-destructive/10">
            <XCircle className="size-7 text-destructive" />
          </div>
          <p className="dashboard-kicker">PayOS</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Thanh toán đã hủy</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bạn đã hủy giao dịch trên PayOS. Thẻ tháng chưa được kích hoạt. Có thể thử mua lại từ
            danh sách xe.
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
