import { useEffect, useState } from "react";
import { Camera, Keyboard, LoaderCircle } from "lucide-react";

import { StaffPlateCameraScanner } from "@/components/staff/StaffPlateCameraScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getManualPlateValidationError,
  normalizeManualPlateInput,
} from "@/lib/license-plate-ocr";

type WalkInMode = "choose" | "manual" | "camera" | "confirmed";

type StaffWalkInCheckInPanelProps = {
  slotNumber?: string;
  floorName?: string;
  vehicleTypeLabel?: string;
  onCreateSession: (licensePlate: string) => void;
  isSubmitting?: boolean;
  onReset?: () => void;
  embedded?: boolean;
  open?: boolean;
};

export function StaffWalkInCheckInPanel({
  slotNumber,
  floorName,
  vehicleTypeLabel,
  onCreateSession,
  isSubmitting = false,
  onReset,
  embedded = false,
  open = true,
}: StaffWalkInCheckInPanelProps) {
  const [mode, setMode] = useState<WalkInMode>("choose");
  const [manualInput, setManualInput] = useState("");
  const [confirmedPlate, setConfirmedPlate] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setMode("choose");
    setManualInput("");
    setConfirmedPlate("");
    setInputError(null);
  }, [open, slotNumber]);

  const handleConfirmManual = () => {
    const error = getManualPlateValidationError(manualInput);
    if (error) {
      setInputError(error);
      return;
    }
    const normalized = normalizeManualPlateInput(manualInput);
    if (!normalized) {
      setInputError("Nhập biển số hợp lệ (vd: 51A-123.45).");
      return;
    }
    setInputError(null);
    setConfirmedPlate(normalized);
    setMode("confirmed");
  };

  const handlePlateDetected = (plate: string) => {
    setConfirmedPlate(plate);
    setMode("confirmed");
  };

  const handleReset = () => {
    setMode("choose");
    setManualInput("");
    setConfirmedPlate("");
    setInputError(null);
    onReset?.();
  };

  if (mode === "choose") {
    return (
      <div className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
        {!embedded ? null : (
          <p className="text-sm text-muted-foreground">Chọn cách nhập biển số xe.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl justify-start gap-2"
            onClick={() => setMode("manual")}
          >
            <Keyboard className="size-4" />
            Nhập biển số
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl justify-start gap-2"
            onClick={() => setMode("camera")}
          >
            <Camera className="size-4" />
            Quét biển số bằng Camera
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
        <div className="space-y-2">
          <Label htmlFor="walkin-plate-input">Biển số xe</Label>
          <Input
            id="walkin-plate-input"
            value={manualInput}
            onChange={(event) => {
              setManualInput(event.target.value.toUpperCase());
              setInputError(null);
            }}
            placeholder="51A-123.45"
            className="rounded-xl font-mono"
            autoComplete="off"
          />
          {inputError ? <p className="text-xs text-destructive">{inputError}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="rounded-xl" onClick={handleConfirmManual}>
            Xác nhận biển số
          </Button>
          <Button type="button" variant="secondary" className="rounded-xl" onClick={handleReset}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "camera") {
    return (
      <div className={embedded ? undefined : "mt-4"}>
        <StaffPlateCameraScanner
          onPlateDetected={handlePlateDetected}
          onCancel={() => setMode("choose")}
        />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
      <div className="rounded-xl border border-status-empty/40 bg-status-empty/10 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-status-empty">
          Biển số đã nhận diện
        </p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wide">{confirmedPlate}</p>
      </div>

      <Button
        type="button"
        className="w-full rounded-xl"
        disabled={isSubmitting}
        onClick={() => onCreateSession(confirmedPlate)}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Đang tạo parking session...
          </>
        ) : (
          "Tạo parking session"
        )}
      </Button>

      <Button
        type="button"
        variant="secondary"
        className="w-full rounded-xl"
        disabled={isSubmitting}
        onClick={handleReset}
      >
        Nhập lại biển số
      </Button>
    </div>
  );
}
