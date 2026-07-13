import { LoaderCircle, QrCode } from "lucide-react";

import { VietQrImage } from "@/components/VietQrImage";
import { Button } from "@/components/ui/button";
import { formatVnd, type StaffBillQrResult } from "@/services/payment.service";

type StaffPaymentQrSectionProps = {
  bill: StaffBillQrResult;
  licensePlate?: string;
  isConfirming?: boolean;
  isCancelling?: boolean;
  onConfirmPayment: () => void;
  onCancelPayment?: () => void;
  embedded?: boolean;
};

export function StaffPaymentQrSection({
  bill,
  licensePlate,
  isConfirming = false,
  isCancelling = false,
  onConfirmPayment,
  onCancelPayment,
  embedded = false,
}: StaffPaymentQrSectionProps) {
  return (
    <div className={embedded ? "space-y-4" : "space-y-5"}>
      <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
        Bước 2 · Thanh toán VietQR
        {licensePlate ? ` · ${licensePlate}` : ""}
      </div>

      <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-4 text-center">
        <p className="ui-section-kicker">Số tiền phải trả</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
          {formatVnd(bill.amount)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-secondary/35 p-4">
        <div>
          <p className="ui-section-kicker">Thời gian</p>
          <p className="mt-1 text-lg font-semibold">
            {Number.isFinite(bill.totalHours) ? `${bill.totalHours.toFixed(1)} giờ` : "—"}
          </p>
        </div>
        <div>
          <p className="ui-section-kicker">Mã đơn</p>
          <p className="mt-1 font-mono text-sm font-medium">{bill.orderCode}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
        <div className="ui-field-icon size-10">
          <QrCode className="size-5" />
        </div>
        <VietQrImage
          qrCode={bill.qrCode}
          size={embedded ? 240 : 280}
          className={embedded ? "size-[240px] rounded-xl" : "size-[280px] rounded-xl"}
        />
        <p className="text-center text-xs text-muted-foreground">
          Khách quét bằng app ngân hàng. Sau khi chuyển khoản, bấm xác nhận ra cổng.
        </p>
      </div>

      <Button
        type="button"
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={isConfirming || isCancelling}
        onClick={onConfirmPayment}
      >
        {isConfirming ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Đang xác nhận thanh toán...
          </>
        ) : (
          "Đã thanh toán — xác nhận ra cổng"
        )}
      </Button>

      {onCancelPayment ? (
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full rounded-xl text-sm font-semibold text-destructive hover:text-destructive"
          disabled={isConfirming || isCancelling}
          onClick={onCancelPayment}
        >
          {isCancelling ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Đang hủy QR...
            </>
          ) : (
            "Hủy QR và tạo lại"
          )}
        </Button>
      ) : null}
    </div>
  );
}
