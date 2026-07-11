import { LoaderCircle, QrCode } from "lucide-react";

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
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Thanh toán VietQR</DialogTitle>
            <DialogDescription>
              Quét mã để thanh toán phí gửi xe
              {licensePlate ? ` · ${licensePlate}` : ""}. Sau khi khách chuyển khoản, bấm xác nhận.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <div className="ui-detail-grid grid grid-cols-2 gap-3 p-4">
            <div>
              <p className="ui-section-kicker">Số tiền</p>
              <p className="mt-1 text-lg font-semibold text-primary">{formatVnd(bill.amount)}</p>
            </div>
            <div>
              <p className="ui-section-kicker">Thời gian</p>
              <p className="mt-1 text-lg font-semibold">
                {Number.isFinite(bill.totalHours) ? `${bill.totalHours.toFixed(1)} giờ` : "—"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="ui-section-kicker">Mã đơn</p>
              <p className="mt-1 font-mono text-sm font-medium">{bill.orderCode}</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="ui-field-icon size-10">
              <QrCode className="size-5" />
            </div>
            <VietQrImage qrCode={bill.qrCode} size={280} className="size-[280px] rounded-xl" />
            <p className="text-center text-xs text-muted-foreground">
              Khách quét bằng app ngân hàng. Không đóng hộp thoại trước khi xác nhận.
            </p>
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-xl text-[13px] font-semibold"
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
