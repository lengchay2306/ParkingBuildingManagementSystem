import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StaffWalkInCheckInPanel } from "@/components/staff/StaffWalkInCheckInPanel";

type StaffWalkInCheckInDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotNumber?: string;
  floorName?: string;
  vehicleTypeLabel?: string;
  onCreateSession: (licensePlate: string) => void;
  isSubmitting?: boolean;
};

export function StaffWalkInCheckInDialog({
  open,
  onOpenChange,
  slotNumber,
  floorName,
  vehicleTypeLabel,
  onCreateSession,
  isSubmitting = false,
}: StaffWalkInCheckInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Check-in khách vãng lai</DialogTitle>
            <DialogDescription>
              Chỗ {slotNumber ?? "—"}
              {floorName ? ` · ${floorName}` : ""}
              {vehicleTypeLabel ? ` · ${vehicleTypeLabel}` : ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <StaffWalkInCheckInPanel
            open={open}
            slotNumber={slotNumber}
            floorName={floorName}
            vehicleTypeLabel={vehicleTypeLabel}
            onCreateSession={onCreateSession}
            isSubmitting={isSubmitting}
            embedded
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
