import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Check-in khách vãng lai</DialogTitle>
        </DialogHeader>

        <StaffWalkInCheckInPanel
          open={open}
          slotNumber={slotNumber}
          floorName={floorName}
          vehicleTypeLabel={vehicleTypeLabel}
          onCreateSession={onCreateSession}
          isSubmitting={isSubmitting}
          embedded
        />
      </DialogContent>
    </Dialog>
  );
}
