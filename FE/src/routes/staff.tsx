import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AccountProfileBanner } from "@/components/AccountProfileBanner";
import { StaffGateControlPanel } from "@/components/staff/StaffGateControlPanel";
import { StaffLotSessionsPanel } from "@/components/staff/StaffLotSessionsPanel";
import { StaffParkingHistoryPanel } from "@/components/staff/StaffParkingHistoryPanel";
import { StaffPaymentQrDialog } from "@/components/StaffPaymentQrDialog";
import { SiteHeader } from "@/components/SiteHeader";
import {
  DashboardMain,
  DashboardSection,
  DashboardTabs,
} from "@/components/dashboard-ui";
import {
  cancelPendingPaymentIfAllowed,
  cancelPendingPaymentSafe,
  createStaffBillQrForSession,
  PaymentNotCancellableError,
  type StaffBillQrWithPayment,
} from "@/lib/pending-payment";
import { requireRole } from "@/lib/auth";
import {
  checkoutParkingSession,
  fetchStaffOccupancySessions,
  getCheckoutPhoneForSession,
  getParkingFloors,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";
import {
  checkStaffPayment,
} from "@/services/payment.service";
import { fetchAllReservationsPages, type Reservation } from "@/services/reservation.service";
import { liveQueryOptions } from "@/lib/live-query";

export const Route = createFileRoute("/staff")({
  beforeLoad: async () => {
    await requireRole("STAFF");
  },
  head: () => ({
    meta: [
      { title: "Bàn làm việc nhân viên — PARKOS" },
      {
        name: "description",
        content: "Kiểm soát ra/vào, danh sách xe trong bãi và lịch sử phiên đỗ xe.",
      },
    ],
  }),
  component: StaffPage,
});

const parkingFloorsQueryKey = ["staff-parking-floors"] as const;
const staffReservationsQueryKey = ["staff-reservations"] as const;
const staffParkingSessionsQueryKey = ["staff-parking-sessions"] as const;
const emptyParkingFloors: ParkingFloor[] = [];

type StaffTab = "gate" | "lot" | "history";

const staffTabs: Array<{ id: StaffTab; label: string }> = [
  { id: "gate", label: "Check-in / Check-out" },
  { id: "lot", label: "Toàn bộ xe trong bãi" },
  { id: "history", label: "Lịch sử" },
];

function StaffPage() {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<StaffTab>("gate");
  const [paymentBill, setPaymentBill] = useState<StaffBillQrWithPayment | null>(null);
  const [paymentBillPlate, setPaymentBillPlate] = useState<string | undefined>();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    enabled: hasMounted,
  });

  const reservationsQuery = useQuery({
    queryKey: staffReservationsQueryKey,
    queryFn: () => fetchAllReservationsPages(),
    enabled: hasMounted,
  });

  const parkingSessionsQuery = useQuery({
    queryKey: staffParkingSessionsQueryKey,
    queryFn: () => fetchStaffOccupancySessions(),
    enabled: hasMounted,
    ...liveQueryOptions,
  });

  const parkingFloors = parkingFloorsQuery.data ?? emptyParkingFloors;
  const allReservations = reservationsQuery.data ?? [];
  const allParkingSessions = parkingSessionsQuery.data ?? [];

  const handleRefresh = async () => {
    await Promise.all([
      parkingFloorsQuery.refetch(),
      reservationsQuery.refetch(),
      parkingSessionsQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ["staff-parking-history"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-gate-lookup"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-checkout-payment"] }),
    ]);
  };

  const invalidateStaffData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      queryClient.invalidateQueries({ queryKey: staffReservationsQueryKey }),
      queryClient.invalidateQueries({ queryKey: staffParkingSessionsQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["staff-parking-history"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-gate-lookup"] }),
      queryClient.invalidateQueries({ queryKey: ["staff-checkout-payment"] }),
    ]);
    await handleRefresh();
  };

  const upsertSessionInCache = (session: ParkingSession) => {
    if (session.status !== "ACTIVE" || session.checkOutTime) {
      queryClient.setQueryData(
        staffParkingSessionsQueryKey,
        (current: ParkingSession[] | undefined) =>
          (current ?? []).filter((item) => item._id !== session._id),
      );
      return;
    }

    queryClient.setQueryData(
      staffParkingSessionsQueryKey,
      (current: ParkingSession[] | undefined) => {
        const list = current ?? [];
        const sessionSlotId = getParkingSessionSlotId(session);
        if (!sessionSlotId) {
          return [...list, session];
        }
        return [
          ...list.filter((item) => getParkingSessionSlotId(item) !== sessionSlotId),
          session,
        ];
      },
    );
  };

  const checkoutSessionMutation = useMutation({
    mutationFn: async (session: ParkingSession) => {
      if (!session._id || session.status !== "ACTIVE") {
        throw new Error("Phiên không hợp lệ.");
      }

      if (session.sessionType === "MONTH") {
        const phone = getCheckoutPhoneForSession(session);
        if (!phone) {
          throw new Error("Phiên thẻ tháng cần SĐT khách để checkout.");
        }
        return checkoutParkingSession({
          parkingSessionId: session._id,
          phone,
        });
      }

      const bill = await createStaffBillQrForSession(session._id);
      return { bill, session };
    },
    onSuccess: (result) => {
      if (result && typeof result === "object" && "bill" in result && result.bill) {
        setPaymentBillPlate(getSessionLicensePlate(result.session) ?? undefined);
        setPaymentBill(result.bill);
        return;
      }

      toast.success("Kết thúc phiên thành công", {
        description: `Xe ${getSessionLicensePlate(result as ParkingSession) ?? "—"} đã checkout.`,
      });
      void invalidateStaffData();
    },
    onError: (error) => {
      toast.error("Không thể kết thúc phiên", {
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
      setPaymentBillPlate(undefined);
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
      setPaymentBill(null);
      setPaymentBillPlate(undefined);
      return;
    }
    cancelPaymentBillMutation.mutate(paymentBill);
  };

  const checkPaymentMutation = useMutation({
    mutationFn: checkStaffPayment,
    onSuccess: async (result) => {
      const completedSessionId = paymentBill?.parkingSessionId;
      setPaymentBill(null);
      setPaymentBillPlate(undefined);
      if (completedSessionId) {
        queryClient.setQueryData(
          staffParkingSessionsQueryKey,
          (current: ParkingSession[] | undefined) =>
            (current ?? []).filter((item) => item._id !== completedSessionId),
        );
      }
      await invalidateStaffData();
      toast.success("Thanh toán thành công", { description: result.message });
    },
    onError: (error) => {
      toast.error("Chưa xác nhận được thanh toán", {
        description: error instanceof Error ? error.message : "Khách có thể chưa chuyển khoản xong.",
      });
    },
  });

  const handleCheckInSuccess = (session: ParkingSession) => {
    upsertSessionInCache(session);
  };

  const handleCheckoutSuccess = (session: ParkingSession) => {
    upsertSessionInCache({
      ...session,
      status: "COMPLETED",
      checkOutTime: session.checkOutTime ?? new Date().toISOString(),
    });
    void invalidateStaffData();
  };

  const occupancyDataError =
    reservationsQuery.error || parkingSessionsQuery.error
      ? getErrorMessage(
          reservationsQuery.error ?? parkingSessionsQuery.error,
          "Không thể tải dữ liệu phiên / đặt chỗ.",
        )
      : null;

  const parkingFloorsError = parkingFloorsQuery.error
    ? getErrorMessage(parkingFloorsQuery.error, "Không thể tải danh sách tầng.")
    : null;

  return (
    <div className="portal-shell portal-shell--staff min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <div className="mb-5">
          <AccountProfileBanner
            fallbackName="Nhân viên"
            dialogDescription="Thông tin tài khoản nhân viên đang đăng nhập."
          />
        </div>

        <DashboardSection>
          <DashboardTabs tabs={staffTabs} activeTab={activeTab} onChange={setActiveTab} />

          {occupancyDataError ? (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {occupancyDataError}
            </div>
          ) : null}

          {parkingFloorsError ? (
            <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {parkingFloorsError}
            </div>
          ) : null}

          {activeTab === "gate" ? (
            <StaffGateControlPanel
              parkingFloors={parkingFloors}
              allReservations={allReservations as Reservation[]}
              allParkingSessions={allParkingSessions}
              onCheckInSuccess={handleCheckInSuccess}
              onCheckoutSuccess={handleCheckoutSuccess}
              onRefreshData={handleRefresh}
            />
          ) : null}

          {activeTab === "lot" ? (
            <StaffLotSessionsPanel
              sessions={allParkingSessions}
              parkingFloors={parkingFloors}
              isLoading={parkingSessionsQuery.isLoading}
              onCheckoutSession={(session) => checkoutSessionMutation.mutate(session)}
              isCheckingOut={checkoutSessionMutation.isPending}
            />
          ) : null}

          {activeTab === "history" ? (
            <StaffParkingHistoryPanel parkingFloors={parkingFloors} />
          ) : null}
        </DashboardSection>
      </DashboardMain>

      <StaffPaymentQrDialog
        open={paymentBill !== null}
        onOpenChange={(open) => {
          if (!open && paymentBill && !checkPaymentMutation.isPending) {
            handleCancelPaymentBill();
          }
        }}
        bill={paymentBill}
        licensePlate={paymentBillPlate}
        isConfirming={checkPaymentMutation.isPending}
        isCancelling={cancelPaymentBillMutation.isPending}
        onConfirmPayment={() => {
          if (paymentBill?.orderCode) {
            checkPaymentMutation.mutate(paymentBill.orderCode);
          }
        }}
        onCancelPayment={handleCancelPaymentBill}
      />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
