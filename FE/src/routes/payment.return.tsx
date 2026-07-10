import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { DashboardMain, DashboardSection } from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";
import { getMyVehicles } from "@/services/vehicle.service";

const myVehiclesQueryKey = ["my-vehicles"] as const;

type PaymentReturnSearch = {
  orderCode?: number;
  status?: string;
  code?: string;
  cancel?: string;
};

export const Route = createFileRoute("/payment/return")({
  validateSearch: (search: Record<string, unknown>): PaymentReturnSearch => {
    const rawOrder = search.orderCode;
    const orderCode =
      typeof rawOrder === "number"
        ? rawOrder
        : typeof rawOrder === "string" && rawOrder.trim()
          ? Number(rawOrder)
          : undefined;

    return {
      orderCode: Number.isFinite(orderCode) ? orderCode : undefined,
      status: typeof search.status === "string" ? search.status : undefined,
      code: typeof search.code === "string" ? search.code : undefined,
      cancel: typeof search.cancel === "string" ? search.cancel : undefined,
    };
  },
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
  const queryClient = useQueryClient();
  const { orderCode, status, code, cancel } = Route.useSearch();
  const [statusText, setStatusText] = useState("Đang kiểm tra kích hoạt thẻ tháng...");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const looksCancelled = cancel === "true" || status?.toUpperCase() === "CANCELLED";
    if (looksCancelled) {
      setStatusText("Giao dịch đã bị hủy trên PayOS.");
      toast.message("Thanh toán đã hủy");
      return;
    }

    toast.success("Đã quay lại từ PayOS", {
      description: orderCode
        ? `Đơn #${orderCode}. Đang chờ webhook kích hoạt thẻ tháng.`
        : "Đang chờ webhook PayOS kích hoạt thẻ tháng.",
    });

    const poll = async () => {
      attempts += 1;
      try {
        const vehicles = await getMyVehicles();
        queryClient.setQueryData(myVehiclesQueryKey, vehicles);
        await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });

        const activated = vehicles.some((vehicle) => Boolean(vehicle.monthlyCardId));
        if (activated) {
          if (!cancelled) {
            setStatusText("Thẻ tháng đã được kích hoạt.");
            toast.success("Thẻ tháng đã kích hoạt");
            void navigate({ to: "/driver" });
          }
          return;
        }
      } catch {
        // keep polling while webhook may still arrive
      }

      if (cancelled) {
        return;
      }

      if (attempts >= maxAttempts) {
        setStatusText(
          "Chưa thấy thẻ tháng được kích hoạt. Webhook PayOS có thể chưa tới BE — thử tải lại trang hoặc kiểm tra lại sau vài giây.",
        );
        toast.message("Chưa thấy thẻ tháng", {
          description: "Webhook chưa tới BE, hoặc đang xử lý chậm.",
        });
        return;
      }

      setStatusText(`Đang chờ webhook PayOS... (${attempts}/${maxAttempts})`);
      window.setTimeout(() => {
        void poll();
      }, 2000);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [cancel, code, navigate, orderCode, queryClient, status]);

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
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {statusText.startsWith("Đang") ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {statusText}
          </p>
          {orderCode != null ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">Mã đơn: {orderCode}</p>
          ) : null}
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
