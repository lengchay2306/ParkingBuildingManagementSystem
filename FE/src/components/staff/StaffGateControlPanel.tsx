import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CarFront,
  Keyboard,
  LoaderCircle,
  MapPin,
  Phone,
  ScanLine,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { StaffPlateCameraScanner } from "@/components/staff/StaffPlateCameraScanner";
import { StaffPaymentQrSection } from "@/components/staff/StaffPaymentQrSection";
import { StaffWalkInSlotPickerDialog, type WalkInSlotSelection } from "@/components/staff/StaffWalkInSlotPickerDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLoadingState } from "@/components/dashboard-ui";
import { getLicensePlateBlockReason } from "@/lib/parking-validation";
import {
  getManualPlateValidationError,
  normalizeManualPlateInput,
} from "@/lib/license-plate-ocr";
import {
  checkoutParkingSession,
  createGuestParkingSession,
  createParkingSession,
  findFirstAvailableSlotForVehicleType,
  getActiveSessionByPlate,
  getCheckoutPhoneForSession,
  getFloorForParkingSlotId,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";
import {
  cancelPendingPaymentIfAllowed,
  cancelPendingPaymentSafe,
  createStaffBillQrForSession,
  PaymentNotCancellableError,
  type StaffBillQrWithPayment,
} from "@/lib/pending-payment";
import {
  checkStaffPayment,
} from "@/services/payment.service";
import {
  buildReservationCheckInPayload,
  getCreateSessionDisabledReasonFromReservation,
  getReservationDriverName,
  getReservationsByPlate,
  type Reservation,
} from "@/services/reservation.service";
import { getVehicleTypes, type VehicleType } from "@/services/vehicle.service";

export type StaffGateMode = "checkin" | "checkout";

type StaffGateControlPanelProps = {
  parkingFloors: ParkingFloor[];
  allReservations: Reservation[];
  allParkingSessions: ParkingSession[];
  onCheckInSuccess: (session: ParkingSession) => void;
  onCheckoutSuccess: (session: ParkingSession) => void;
  onRefreshData: () => void | Promise<void>;
};

type PanelPhase = "choose-mode" | "scanning";

export function StaffGateControlPanel({
  parkingFloors,
  allReservations,
  allParkingSessions,
  onCheckInSuccess,
  onCheckoutSuccess,
  onRefreshData,
}: StaffGateControlPanelProps) {
  const [gateMode, setGateMode] = useState<StaffGateMode | null>(null);
  const [phase, setPhase] = useState<PanelPhase>("choose-mode");
  const [scannedPlate, setScannedPlate] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [walkInVehicleTypeId, setWalkInVehicleTypeId] = useState("");
  const [walkInSelectedSlot, setWalkInSelectedSlot] = useState<WalkInSlotSelection | null>(null);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState<StaffBillQrWithPayment | null>(null);

  const vehicleTypesQuery = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: getVehicleTypes,
  });

  const vehicleTypes = vehicleTypesQuery.data ?? [];

  useEffect(() => {
    if (vehicleTypes.length > 0 && !walkInVehicleTypeId) {
      setWalkInVehicleTypeId(vehicleTypes[0]._id);
    }
  }, [vehicleTypes, walkInVehicleTypeId]);

  const handleWalkInVehicleTypeChange = (vehicleTypeId: string) => {
    setWalkInVehicleTypeId(vehicleTypeId);
  };

  const lookupQuery = useQuery({
    queryKey: ["staff-gate-lookup", gateMode, scannedPlate],
    queryFn: async () => {
      const plate = scannedPlate.trim().toUpperCase();
      if (!plate || !gateMode) {
        return null;
      }

      if (gateMode === "checkout") {
        const session = await getActiveSessionByPlate(plate);
        return { kind: "checkout" as const, session, reservation: null };
      }

      const { reservations } = await getReservationsByPlate(plate);
      const pendingReservation =
        reservations.find((item) => item.status === "PENDING") ??
        reservations.find((item) => item.status === "CLAIMED") ??
        null;

      return { kind: "checkin" as const, session: null, reservation: pendingReservation };
    },
    enabled: Boolean(gateMode && scannedPlate.trim()),
  });

  const reservation = lookupQuery.data?.kind === "checkin" ? lookupQuery.data.reservation : null;
  const activeSession =
    lookupQuery.data?.kind === "checkout" ? lookupQuery.data.session : null;

  useEffect(() => {
    if (!walkInVehicleTypeId || gateMode !== "checkin" || reservation) {
      setWalkInSelectedSlot(null);
      return;
    }

    setWalkInSelectedSlot(findFirstAvailableSlotForVehicleType(parkingFloors, walkInVehicleTypeId));
  }, [walkInVehicleTypeId, gateMode, reservation, parkingFloors]);

  const walkInSlotPreview = walkInSelectedSlot;

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const plate = scannedPlate.trim().toUpperCase();
      if (!plate) {
        throw new Error("Chưa có biển số.");
      }

      const blockReason = getLicensePlateBlockReason(plate, allReservations, allParkingSessions, {
        allowPendingReservationId: reservation?._id,
      });
      if (blockReason) {
        throw new Error(blockReason);
      }

      if (reservation) {
        const disabledReason = getCreateSessionDisabledReasonFromReservation(reservation);
        if (disabledReason) {
          throw new Error(disabledReason);
        }
        return createParkingSession(buildReservationCheckInPayload(reservation));
      }

      if (!walkInVehicleTypeId) {
        throw new Error("Chọn loại xe.");
      }

      if (!walkInSelectedSlot) {
        throw new Error("Không còn chỗ trống cho loại xe này.");
      }

      return createGuestParkingSession({
        licensePlate: plate,
        parkingSlotId: walkInSelectedSlot.slot._id,
        vehicleTypeId: walkInVehicleTypeId,
      });
    },
    onSuccess: (session) => {
      toast.success("Check-in thành công", {
        description: `Xe ${getSessionLicensePlate(session) ?? scannedPlate} đã vào bãi.`,
      });
      onCheckInSuccess(session);
      resetFlow();
      onRefreshData();
    },
    onError: (error) => {
      toast.error("Không thể check-in", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?._id) {
        throw new Error("Không tìm thấy phiên đỗ xe.");
      }

      if (activeSession.sessionType === "MONTH") {
        const phone = getCheckoutPhoneForSession(activeSession);
        if (!phone) {
          throw new Error("Phiên thẻ tháng cần SĐT khách để checkout.");
        }
        return checkoutParkingSession({
          parkingSessionId: activeSession._id,
          phone,
        });
      }

      const bill = await createStaffBillQrForSession(activeSession._id);
      return { bill, session: activeSession };
    },
    onSuccess: (result) => {
      if (result && typeof result === "object" && "bill" in result && result.bill) {
        setPaymentBill(result.bill);
        toast.success("Đã tạo mã VietQR", {
          description: "Yêu cầu khách quét mã để thanh toán.",
        });
        return;
      }

      toast.success("Checkout thành công", {
        description: `Xe ${getSessionLicensePlate(result as ParkingSession) ?? scannedPlate} đã ra cổng.`,
      });
      onCheckoutSuccess(result as ParkingSession);
      resetFlow();
      onRefreshData();
    },
    onError: (error) => {
      toast.error("Không thể checkout", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const cancelPaymentBillMutation = useMutation({
    mutationFn: async (bill: StaffBillQrWithPayment) => {
      await cancelPendingPaymentIfAllowed(bill.paymentId);
    },
    onSuccess: () => {
      setPaymentBill(null);
      toast.success("Đã hủy QR thanh toán", {
        description: "Có thể tạo mã QR mới cho phiên này.",
      });
    },
    onError: (error) => {
      if (error instanceof PaymentNotCancellableError && error.status === "PAID") {
        toast.error("Không thể hủy QR", {
          description: error.message,
        });
        return;
      }
      toast.error("Không hủy được QR", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const handleCancelPaymentBill = () => {
    if (!paymentBill) {
      return;
    }
    cancelPaymentBillMutation.mutate(paymentBill);
  };

  const checkPaymentMutation = useMutation({
    mutationFn: (orderCode: number) => checkStaffPayment(orderCode),
    onSuccess: async (result) => {
      toast.success("Thanh toán thành công", { description: result.message });
      const completedSession = activeSession;
      setPaymentBill(null);
      setGateMode(null);
      setPhase("choose-mode");
      setScannedPlate("");
      setManualInput("");
      setManualError(null);
      setWalkInSelectedSlot(null);
      setSlotPickerOpen(false);
      if (completedSession) {
        onCheckoutSuccess({
          ...completedSession,
          status: "COMPLETED",
          checkOutTime: new Date().toISOString(),
        });
      }
      await Promise.resolve(onRefreshData());
    },
    onError: (error) => {
      toast.error("Chưa xác nhận được thanh toán", {
        description: error instanceof Error ? error.message : "Khách có thể chưa chuyển khoản xong.",
      });
    },
  });

  const resetFlow = () => {
    if (paymentBill) {
      void cancelPendingPaymentSafe(paymentBill.paymentId);
    }
    setGateMode(null);
    setPhase("choose-mode");
    setScannedPlate("");
    setManualInput("");
    setManualError(null);
    setPaymentBill(null);
    setWalkInSelectedSlot(null);
    setSlotPickerOpen(false);
  };

  const startMode = (mode: StaffGateMode) => {
    setGateMode(mode);
    setPhase("scanning");
    setScannedPlate("");
    setManualInput("");
    setManualError(null);
  };

  const handlePlateDetected = (plate: string) => {
    if (paymentBill) {
      void cancelPendingPaymentSafe(paymentBill.paymentId);
    }
    setPaymentBill(null);
    setScannedPlate(plate);
  };

  const handleManualConfirm = () => {
    const error = getManualPlateValidationError(manualInput);
    if (error) {
      setManualError(error);
      return;
    }
    const normalized = normalizeManualPlateInput(manualInput);
    if (!normalized) {
      setManualError("Nhập biển số hợp lệ (vd: 51A-123.45).");
      return;
    }
    setManualError(null);
    if (paymentBill) {
      void cancelPendingPaymentSafe(paymentBill.paymentId);
    }
    setPaymentBill(null);
    setScannedPlate(normalized);
  };

  const checkInDisabledReason = reservation
    ? getCreateSessionDisabledReasonFromReservation(reservation)
    : !walkInSlotPreview
      ? "Không còn chỗ trống cho loại xe đã chọn."
      : undefined;

  const sessionSlotId = activeSession ? getParkingSessionSlotId(activeSession) : null;
  const sessionFloor = sessionSlotId
    ? getFloorForParkingSlotId(sessionSlotId, parkingFloors)
    : null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="api-section rounded-2xl p-4 sm:p-5">
        <div className="api-header mb-4">
          <div className="flex items-center gap-2">
            <ScanLine className="size-5 text-primary" />
            <h2 className="text-base font-semibold">Kiểm soát số xe</h2>
          </div>
          {gateMode ? (
            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              {gateMode === "checkin" ? "Check-in" : "Check-out"}
            </span>
          ) : null}
        </div>

        {phase === "choose-mode" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Chọn thao tác ra/vào, sau đó quét biển số — camera nhận diện tự động.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => startMode("checkin")}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-status-empty/40 bg-status-empty/10 p-5 text-left transition hover:border-status-empty/70 hover:bg-status-empty/15"
              >
                <ArrowDownLeft className="size-8 text-status-empty" />
                <div>
                  <p className="font-semibold text-foreground">Check-in</p>
                  <p className="mt-1 text-xs text-muted-foreground">Xe vào bãi · có/không đặt chỗ</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => startMode("checkout")}
                className="group flex flex-col items-start gap-3 rounded-2xl border border-status-full/40 bg-status-full/10 p-5 text-left transition hover:border-status-full/70 hover:bg-status-full/15"
              >
                <ArrowUpRight className="size-8 text-status-full" />
                <div>
                  <p className="font-semibold text-foreground">Check-out</p>
                  <p className="mt-1 text-xs text-muted-foreground">Xe ra cổng · thanh toán nếu cần</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!scannedPlate ? (
              <StaffPlateCameraScanner
                autoScan
                onPlateDetected={handlePlateDetected}
                onCancel={resetFlow}
              />
            ) : null}

            <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/40 p-4">
              <Label htmlFor="staff-gate-manual-plate" className="text-xs uppercase tracking-wide">
                Nhập thủ công (dự phòng)
              </Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="staff-gate-manual-plate"
                  value={manualInput}
                  onChange={(event) => {
                    setManualInput(event.target.value.toUpperCase());
                    setManualError(null);
                  }}
                  placeholder="51A-123.45"
                  className="min-w-[180px] flex-1 rounded-xl font-mono"
                  autoComplete="off"
                />
                <Button type="button" className="rounded-xl" onClick={handleManualConfirm}>
                  <Keyboard className="size-4" />
                  Xác nhận
                </Button>
              </div>
              {manualError ? <p className="text-xs text-destructive">{manualError}</p> : null}
            </div>

            {scannedPlate ? (
              <div className="rounded-xl border border-status-full/50 bg-status-full/10 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-status-full">
                  Biển số AI
                </p>
                <p className="mt-1 font-mono text-xl font-bold tracking-wider text-status-full">
                  {scannedPlate}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-3 rounded-xl"
                  onClick={() => setScannedPlate("")}
                >
                  Quét lại
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="api-section rounded-2xl p-4 sm:p-5">
        <div className="api-header mb-4">
          <h2 className="text-base font-semibold">Kết quả &amp; xử lý</h2>
        </div>

        {!gateMode || !scannedPlate ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-secondary/30 px-6 py-10 text-center">
            <ScanLine className="mb-3 size-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              Chọn Check-in/Check-out và quét biển số để xem thông tin tại đây.
            </p>
          </div>
        ) : lookupQuery.isLoading ? (
          <DashboardLoadingState label="Đang tra cứu biển số..." />
        ) : gateMode === "checkin" ? (
          <CheckInResultPanel
            plate={scannedPlate}
            reservation={reservation}
            vehicleTypes={vehicleTypes}
            walkInVehicleTypeId={walkInVehicleTypeId}
            onWalkInVehicleTypeChange={handleWalkInVehicleTypeChange}
            walkInSlotPreview={walkInSlotPreview}
            checkInDisabledReason={checkInDisabledReason}
            isSubmitting={checkInMutation.isPending}
            onCheckIn={() => checkInMutation.mutate()}
            onOpenSlotPicker={() => setSlotPickerOpen(true)}
          />
        ) : activeSession ? (
          <CheckoutResultPanel
            session={activeSession}
            plate={scannedPlate}
            slotNumber={
              typeof activeSession.parkingSlotId === "object"
                ? activeSession.parkingSlotId.slotNumber
                : undefined
            }
            floorName={sessionFloor?.floorName}
            vehicleTypeLabel={getSessionVehicleTypeLabel(activeSession, parkingFloors)}
            paymentBill={paymentBill}
            isSubmitting={checkoutMutation.isPending}
            isConfirmingPayment={checkPaymentMutation.isPending}
            onCheckout={() => checkoutMutation.mutate()}
            onConfirmPayment={() => {
              if (paymentBill?.orderCode) {
                checkPaymentMutation.mutate(paymentBill.orderCode);
              }
            }}
            onCancelPayment={handleCancelPaymentBill}
            isCancellingPayment={cancelPaymentBillMutation.isPending}
          />
        ) : (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-6 text-center">
            <p className="font-medium text-destructive">Không tìm thấy xe trong bãi</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Biển {scannedPlate} chưa có phiên ACTIVE — kiểm tra lại hoặc thực hiện Check-in.
            </p>
          </div>
        )}
      </section>

      <StaffWalkInSlotPickerDialog
        open={slotPickerOpen}
        onOpenChange={setSlotPickerOpen}
        parkingFloors={parkingFloors}
        vehicleTypeId={walkInVehicleTypeId}
        selectedSlotId={walkInSelectedSlot?.slot._id}
        onSelect={setWalkInSelectedSlot}
      />
    </div>
  );
}

type CheckInResultPanelProps = {
  plate: string;
  reservation: Reservation | null;
  vehicleTypes: VehicleType[];
  walkInVehicleTypeId: string;
  onWalkInVehicleTypeChange: (value: string) => void;
  walkInSlotPreview: ReturnType<typeof findFirstAvailableSlotForVehicleType>;
  checkInDisabledReason?: string;
  isSubmitting: boolean;
  onCheckIn: () => void;
  onOpenSlotPicker: () => void;
};

function CheckInResultPanel({
  plate,
  reservation,
  vehicleTypes,
  walkInVehicleTypeId,
  onWalkInVehicleTypeChange,
  walkInSlotPreview,
  checkInDisabledReason,
  isSubmitting,
  onCheckIn,
  onOpenSlotPicker,
}: CheckInResultPanelProps) {
  if (reservation) {
    const driverName = getReservationDriverName(reservation) ?? "—";
    const phone =
      typeof reservation.driverId === "object" ? (reservation.driverId.phone ?? "—") : "—";
    const slotNumber =
      typeof reservation.parkingSlotId === "object"
        ? (reservation.parkingSlotId.slotNumber ?? "—")
        : "—";
    const floorName =
      typeof reservation.parkingSlotId === "object"
        ? (reservation.parkingSlotId.floorId?.floorName ?? "—")
        : "—";
    const vehicleType =
      typeof reservation.vehicleId === "object"
        ? (reservation.vehicleId.vehicleTypeId?.type ?? "—")
        : "—";

    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-status-reserved/40 bg-status-reserved/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-status-reserved">
          Có đặt chỗ · #{reservation._id.slice(-6).toUpperCase()}
        </div>

        <InfoRow icon={CarFront} label="Biển số" value={plate} highlight />
        <InfoRow icon={User} label="Khách hàng" value={driverName} />
        <InfoRow icon={Phone} label="Số điện thoại" value={phone} />
        <InfoRow icon={CarFront} label="Loại xe" value={vehicleType} />
        <InfoRow icon={MapPin} label="Chỗ đỗ" value={`${slotNumber} · ${floorName}`} />

        {reservation.expectedArrival ? (
          <InfoRow label="Giờ đến dự kiến" value={formatDateTime(reservation.expectedArrival)} />
        ) : null}

        <p className="text-xs text-muted-foreground">
          Trạng thái đặt chỗ: <strong>{reservation.status}</strong>
        </p>

        {checkInDisabledReason ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {checkInDisabledReason}
          </p>
        ) : null}

        <Button
          type="button"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={Boolean(checkInDisabledReason) || isSubmitting}
          onClick={onCheckIn}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Đang check-in...
            </>
          ) : (
            "Check-in"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-status-yours/40 bg-status-yours/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-status-yours">
        Khách vãng lai · chưa có đặt chỗ
      </div>

      <InfoRow icon={CarFront} label="Biển số" value={plate} highlight />

      <div className="space-y-2">
        <Label htmlFor="walkin-vehicle-type">Loại xe</Label>
        <Select value={walkInVehicleTypeId} onValueChange={onWalkInVehicleTypeChange}>
          <SelectTrigger id="walkin-vehicle-type" className="h-11 rounded-xl">
            <SelectValue placeholder="Chọn loại xe" />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypes.map((type) => (
              <SelectItem key={type._id} value={type._id}>
                {type.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {walkInSlotPreview ? (
        <button
          type="button"
          onClick={onOpenSlotPicker}
          className="flex w-full items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/10"
        >
          <div className="ui-field-icon size-9 shrink-0">
            <MapPin className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Chỗ tự gán · bấm để chọn
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {walkInSlotPreview.slot.slotNumber} · {walkInSlotPreview.floor.floorName}
            </p>
          </div>
        </button>
      ) : (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Không còn chỗ trống cho loại xe này.
        </p>
      )}

      <Button
        type="button"
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={!walkInSlotPreview || isSubmitting}
        onClick={onCheckIn}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Đang check-in...
          </>
        ) : (
          "Check-in"
        )}
      </Button>
    </div>
  );
}

type CheckoutResultPanelProps = {
  session: ParkingSession;
  plate: string;
  slotNumber?: string;
  floorName?: string;
  vehicleTypeLabel?: string;
  paymentBill: StaffBillQrWithPayment | null;
  isSubmitting: boolean;
  isConfirmingPayment: boolean;
  isCancellingPayment: boolean;
  onCheckout: () => void;
  onConfirmPayment: () => void;
  onCancelPayment: () => void;
};

function CheckoutResultPanel({
  session,
  plate,
  slotNumber,
  floorName,
  vehicleTypeLabel,
  paymentBill,
  isSubmitting,
  isConfirmingPayment,
  isCancellingPayment,
  onCheckout,
  onConfirmPayment,
  onCancelPayment,
}: CheckoutResultPanelProps) {
  const isMonthlySession = session.sessionType === "MONTH";
  const isGuest = session.isGuest || !session.checkInUserId;
  const customerName =
    session.checkInUserId && typeof session.checkInUserId === "object"
      ? (session.checkInUserId.fullName ?? "Khách vãng lai")
      : isGuest
        ? "Khách vãng lai"
        : "—";
  const phone = getCheckoutPhoneForSession(session) || session.phone || "—";
  const checkoutLabel = isMonthlySession
    ? "Kết thúc phiên (thẻ tháng)"
    : "Thanh toán VietQR & ra cổng";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-status-full/40 bg-status-full/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-status-full">
        Bước 1 · Thông tin phiên · #{session._id.slice(-6).toUpperCase()}
      </div>

      <InfoRow icon={CarFront} label="Biển số" value={plate} highlight />
      <InfoRow icon={User} label="Khách hàng" value={customerName} />
      <InfoRow icon={Phone} label="Số điện thoại" value={phone} />
      <InfoRow icon={CarFront} label="Loại xe" value={vehicleTypeLabel ?? "—"} />
      <InfoRow icon={MapPin} label="Chỗ đỗ" value={`${slotNumber ?? "—"} · ${floorName ?? "—"}`} />

      {session.checkInTime ? (
        <InfoRow label="Giờ vào" value={formatDateTime(session.checkInTime)} />
      ) : null}

      {isGuest ? (
        <p className="text-xs text-muted-foreground">Loại khách: Khách vãng lai</p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Loại phiên: <strong>{session.sessionType}</strong>
        {isMonthlySession
          ? " · Thẻ tháng — kết thúc phiên không cần VietQR"
          : " · Gửi ngày — tạo mã VietQR trước khi ra cổng"}
      </p>

      {!paymentBill ? (
        <Button
          type="button"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={isSubmitting}
          onClick={onCheckout}
        >
          {isSubmitting ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            checkoutLabel
          )}
        </Button>
      ) : (
        <StaffPaymentQrSection
          bill={paymentBill}
          licensePlate={plate}
          isConfirming={isConfirmingPayment}
          isCancelling={isCancellingPayment}
          onConfirmPayment={onConfirmPayment}
          onCancelPayment={onCancelPayment}
          embedded
        />
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon?: typeof CarFront;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/35 px-4 py-3">
      {Icon ? (
        <div className="ui-field-icon size-9 shrink-0">
          <Icon className="size-4" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm font-semibold ${highlight ? "font-mono text-lg text-status-full" : "text-foreground"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
