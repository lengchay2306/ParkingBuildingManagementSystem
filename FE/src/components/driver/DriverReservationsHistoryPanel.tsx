import { LoaderCircle } from "lucide-react";

import {
  findSessionForReservation,
  getReservationDisplayStatus,
  getReservationSlotLabel,
  getReservationStatusBadge,
  getReservationStatusLabel,
  getReservationVehicleLabel,
} from "@/lib/driver-reservation-display";
import { Button } from "@/components/ui/button";
import {
  DashboardClientPagination,
  DashboardEmptyState,
  DashboardLoadingState,
  paginateItems,
} from "@/components/dashboard-ui";
import type { ParkingSession } from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";
import { getReservationSlotId } from "@/services/reservation.service";

type DriverReservationsHistoryPanelProps = {
  reservations: Reservation[];
  reservationPagination: ReturnType<typeof paginateItems<Reservation>>;
  sessionsByVehicleId: Map<string, ParkingSession>;
  reservationBySlotId: Map<string, Reservation>;
  isLoading: boolean;
  error: string | null;
  isCancelPending: boolean;
  onReservationPageChange: (page: number) => void;
  onViewReservation: (reservation: Reservation) => void;
  onCancelReservation: (reservationId: string) => void;
};

export function DriverReservationsHistoryPanel({
  reservations,
  reservationPagination,
  sessionsByVehicleId,
  reservationBySlotId,
  isLoading,
  error,
  isCancelPending,
  onReservationPageChange,
  onViewReservation,
  onCancelReservation,
}: DriverReservationsHistoryPanelProps) {
  if (isLoading) {
    return <DashboardLoadingState label="Đang tải đặt chỗ..." />;
  }

  return (
    <div className="api-section rounded-2xl p-4 sm:p-5">
      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {reservations.length === 0 ? (
        <DashboardEmptyState>Bạn chưa có đặt chỗ nào.</DashboardEmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Chỗ / Tầng</th>
                  <th className="px-4 py-3">Xe</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {reservationPagination.items.map((reservation) => {
                  const reservationSlotId = getReservationSlotId(reservation);
                  const parkingSession = findSessionForReservation(
                    reservation,
                    sessionsByVehicleId,
                  );
                  const displayStatus = getReservationDisplayStatus(reservation, parkingSession);
                  const isPending = displayStatus === "PENDING";
                  const isSlotHeld =
                    Boolean(reservationSlotId) && reservationBySlotId.has(reservationSlotId!);

                  return (
                    <tr
                      key={reservation._id}
                      className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-secondary/30"
                      onClick={() => onViewReservation(reservation)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold">
                          {getReservationSlotLabel(reservation)}
                        </p>
                        {isSlotHeld ? (
                          <p className="mt-0.5 text-[10px] font-medium text-status-yours">
                            Đang giữ chỗ
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {getReservationVehicleLabel(reservation) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getReservationStatusBadge(displayStatus)}`}
                        >
                          {getReservationStatusLabel(displayStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {isPending ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={isCancelPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                onCancelReservation(reservation._id);
                              }}
                            >
                              {isCancelPending ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                              ) : (
                                "Hủy"
                              )}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-lg"
                            onClick={(event) => {
                              event.stopPropagation();
                              onViewReservation(reservation);
                            }}
                          >
                            Chi tiết
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DashboardClientPagination
            page={reservationPagination.page}
            totalPages={reservationPagination.totalPages}
            totalItems={reservationPagination.totalItems}
            onPageChange={onReservationPageChange}
            className="mt-4"
          />
        </>
      )}
    </div>
  );
}
