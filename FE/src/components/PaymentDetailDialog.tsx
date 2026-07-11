import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  cancelAdminPayment,
  getAdminPaymentById,
  getPaymentKindLabel,
  getPaymentLicensePlate,
  type AdminPayment,
  type PaymentMethod,
  type PaymentStatus,
} from "@/services/adminPayment.service";
import { formatVnd } from "@/services/payment.service";

type PaymentDetailDialogProps = {
  paymentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowCancel?: boolean;
};

export function PaymentDetailDialog({
  paymentId,
  open,
  onOpenChange,
  allowCancel = false,
}: PaymentDetailDialogProps) {
  const queryClient = useQueryClient();

  const paymentQuery = useQuery({
    queryKey: ["admin-payment-detail", paymentId],
    queryFn: () => getAdminPaymentById(paymentId!),
    enabled: open && Boolean(paymentId),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelAdminPayment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-detail", paymentId] });
      toast.success("Đã hủy hóa đơn chờ thanh toán.");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Không hủy được hóa đơn chờ thanh toán.";
      toast.error("Hủy thất bại", { description: message });
    },
  });

  const payment = paymentQuery.data ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Chi tiết thanh toán</DialogTitle>
            <DialogDescription>
              {payment
                ? `Mã đơn ${payment.orderCode} · ${getPaymentKindLabel(payment)}`
                : "Đang tải thông tin giao dịch..."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {paymentQuery.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải chi tiết...
            </div>
          ) : paymentQuery.error ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {paymentQuery.error instanceof Error
                ? paymentQuery.error.message
                : "Không thể tải chi tiết thanh toán."}
            </div>
          ) : payment ? (
            <>
              <section className="space-y-3">
                <SectionHeading>Trạng thái</SectionHeading>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn("border", getStatusBadgeClass(payment.status))}
                    variant="outline"
                  >
                    {getStatusLabel(payment.status)}
                  </Badge>
                  <Badge className="border border-border bg-secondary/40" variant="outline">
                    {getMethodLabel(payment.paymentMethod)}
                  </Badge>
                </div>
              </section>

              <section className="space-y-3">
                <SectionHeading>Giao dịch</SectionHeading>
                <DetailGrid>
                  <DetailRow label="Mã đơn PayOS" value={String(payment.orderCode)} mono />
                  <DetailRow label="Số tiền" value={formatVnd(payment.amount)} />
                  <DetailRow label="Loại" value={getPaymentKindLabel(payment)} />
                  <DetailRow label="Tạo lúc" value={formatDateTime(payment.createdAt)} />
                  <DetailRow label="Cập nhật" value={formatDateTime(payment.updatedAt)} />
                </DetailGrid>
              </section>

              <section className="space-y-3">
                <SectionHeading>Xe</SectionHeading>
                <DetailGrid>
                  <DetailRow
                    label="Biển số"
                    value={getPaymentLicensePlate(payment) ?? "—"}
                    mono
                  />
                  <DetailRow label="Loại xe" value={getVehicleTypeLabel(payment)} />
                </DetailGrid>
              </section>

              {payment.parkingSessionId && typeof payment.parkingSessionId === "object" ? (
                <section className="space-y-3">
                  <SectionHeading>Phiên gửi xe</SectionHeading>
                  <DetailGrid>
                    <DetailRow label="Trạng thái phiên" value={payment.parkingSessionId.status ?? "—"} />
                    <DetailRow
                      label="Loại phiên"
                      value={payment.parkingSessionId.sessionType ?? "—"}
                    />
                    <DetailRow
                      label="Khách vãng lai"
                      value={payment.parkingSessionId.isGuest ? "Có" : "Không"}
                    />
                    <DetailRow
                      label="Check-in"
                      value={formatDateTime(payment.parkingSessionId.checkInTime)}
                    />
                    <DetailRow
                      label="Check-out"
                      value={formatDateTime(payment.parkingSessionId.checkOutTime)}
                    />
                    <DetailRow label="Slot" value={getSlotLabel(payment.parkingSessionId)} />
                  </DetailGrid>
                </section>
              ) : null}

              {allowCancel && payment.status === "PENDING" ? (
                <section className="space-y-3 border-t border-border pt-4">
                  <SectionHeading>Hủy hóa đơn</SectionHeading>
                  <p className="text-xs text-muted-foreground">
                    Hủy hóa đơn đang chờ thanh toán. Mã QR PayOS sẽ không còn hiệu lực.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-xl border-amber-400/40 text-amber-700 hover:bg-amber-500/10"
                    disabled={cancelMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Hủy hóa đơn mã đơn ${payment.orderCode} (${formatVnd(payment.amount)})?`,
                        )
                      ) {
                        cancelMutation.mutate(payment._id);
                      }
                    }}
                  >
                    {cancelMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang hủy...
                      </>
                    ) : (
                      "Hủy hóa đơn chờ thanh toán"
                    )}
                  </Button>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h3 className="ui-section-kicker">{children}</h3>;
}

function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="ui-detail-grid grid grid-cols-1 gap-x-3 gap-y-2.5 p-4 sm:grid-cols-[120px_1fr]">
      {children}
    </dl>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("break-all text-sm font-medium", mono && "font-mono text-[12px]")}>
        {value || "—"}
      </dd>
    </>
  );
}

function getVehicleTypeLabel(payment: AdminPayment) {
  if (payment.vehicleId && typeof payment.vehicleId === "object") {
    const type = payment.vehicleId.vehicleTypeId;
    if (type && typeof type === "object") {
      return type.type ?? "—";
    }
  }
  if (payment.parkingSessionId && typeof payment.parkingSessionId === "object") {
    const vehicle = payment.parkingSessionId.vehicleId;
    if (vehicle && typeof vehicle === "object") {
      const type = vehicle.vehicleTypeId;
      if (type && typeof type === "object") {
        return type.type ?? "—";
      }
    }
  }
  return "—";
}

function getSlotLabel(session: NonNullable<AdminPayment["parkingSessionId"]>) {
  if (typeof session === "string") {
    return "—";
  }
  const slot = session.parkingSlotId;
  if (!slot || typeof slot === "string") {
    return "—";
  }
  const slotNumber = slot.slotNumber ?? "—";
  const floorName = slot.floorId?.floorName;
  return floorName ? `${slotNumber} · ${floorName}` : slotNumber;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "Chờ thanh toán";
    case "PAID":
      return "Đã thanh toán";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function getMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "CASH":
      return "Tiền mặt";
    case "CARD":
      return "Thẻ";
    case "TRANSFER":
      return "Chuyển khoản";
    default:
      return method;
  }
}

function getStatusBadgeClass(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/40 bg-amber-500/10 text-amber-600";
    case "PAID":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "CANCELLED":
      return "border-border bg-secondary/40 text-muted-foreground";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
