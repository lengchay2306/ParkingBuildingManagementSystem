import { LoaderCircle, QrCode } from "lucide-react";

import { StaffPaymentQrSection } from "@/components/staff/StaffPaymentQrSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type StaffBillQrResult } from "@/services/payment.service";

type StaffPaymentQrDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: StaffBillQrResult | null;
  licensePlate?: string;
  isConfirming?: boolean;
  isCancelling?: boolean;
  onConfirmPayment: () => void;
  onCancelPayment: () => void;
};

export function StaffPaymentQrDialog({
  open,
  onOpenChange,
  bill,
  licensePlate,
  isConfirming = false,
  isCancelling = false,
  onConfirmPayment,
  onCancelPayment,
}: StaffPaymentQrDialogProps) {
  if (!bill) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5" />
              Thanh toán VietQR
            </DialogTitle>
            <DialogDescription>
              Quét mã để thanh toán phí gửi xe
              {licensePlate ? ` · ${licensePlate}` : ""}. Sau khi khách chuyển khoản, bấm xác nhận.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <StaffPaymentQrSection
            bill={bill}
            licensePlate={licensePlate}
            isConfirming={isConfirming}
            isCancelling={isCancelling}
            onConfirmPayment={onConfirmPayment}
            onCancelPayment={onCancelPayment}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
