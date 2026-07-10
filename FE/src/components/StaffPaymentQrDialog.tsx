import { LoaderCircle } from "lucide-react";

import { VietQrImage } from "@/components/VietQrImage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatVnd, type StaffBillQrResult } from "@/services/payment.service";

type StaffPaymentQrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: StaffBillQrResult | null;
  licensePlate?: string;
  isConfirming?: boolean;
  onConfirmPayment: () => void;
};

export function StaffPaymentQrDialog({
  open,
  onOpenChange,
  bill,
  licensePlate,
  isConfirming = false,
  onConfirmPayment,
}: StaffPaymentQrDialogProps) {
  if (!bill) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Thanh toán VietQR</DialogTitle>
          <DialogDescription>
            Quét mã để thanh toán phí gửi xe
            {licensePlate ? ` · ${licensePlate}` : ""}. Sau khi khách chuyển khoản, bấm xác nhận.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-secondary/50 p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Số tiền
              </p>
              <p className="mt-1 text-lg font-semibold text-primary">{formatVnd(bill.amount)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Thời gian
              </p>
              <p className="mt-1 text-lg font-semibold">
                {Number.isFinite(bill.totalHours) ? `${bill.totalHours.toFixed(1)} giờ` : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Mã đơn
              </p>
              <p className="mt-1 font-mono text-sm font-medium">{bill.orderCode}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4">
            <VietQrImage qrCode={bill.qrCode} size={280} className="size-[280px]" />
            <p className="text-center text-xs text-muted-foreground">
              Khách quét bằng app ngân hàng. Không đóng hộp thoại trước khi xác nhận.
            </p>
          </div>

          <Button
            type="button"
            className="w-full rounded-xl"
            disabled={isConfirming}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
