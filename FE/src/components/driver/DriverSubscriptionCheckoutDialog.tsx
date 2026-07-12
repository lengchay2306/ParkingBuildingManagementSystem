import { ExternalLink, LoaderCircle, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PendingSubscriptionCheckout } from "@/lib/pending-payment";

type DriverSubscriptionCheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkout: PendingSubscriptionCheckout | null;
  isCancelling?: boolean;
  onOpenPayOs: () => void;
  onCancelCheckout: () => void;
};

export function DriverSubscriptionCheckoutDialog({
  open,
  onOpenChange,
  checkout,
  isCancelling = false,
  onOpenPayOs,
  onCancelCheckout,
}: DriverSubscriptionCheckoutDialogProps) {
  if (!checkout) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Thanh toán thẻ tháng</DialogTitle>
            <DialogDescription>
              Xe <span className="font-mono font-semibold">{checkout.licensePlate}</span> · hoàn tất
              thanh toán trên PayOS để kích hoạt thẻ tháng.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            Bạn có thể đóng cửa sổ này và mở lại thanh toán bất cứ lúc nào từ nút{" "}
            <strong className="text-foreground">Mua thẻ tháng</strong> trước khi hoàn tất.
          </div>

          <Button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold"
            onClick={onOpenPayOs}
          >
            <ExternalLink className="size-4" />
            Mở trang PayOS
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full rounded-xl text-sm font-semibold text-destructive hover:text-destructive"
            disabled={isCancelling}
            onClick={onCancelCheckout}
          >
            {isCancelling ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang hủy...
              </>
            ) : (
              <>
                <XCircle className="size-4" />
                Hủy và đặt lại
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
