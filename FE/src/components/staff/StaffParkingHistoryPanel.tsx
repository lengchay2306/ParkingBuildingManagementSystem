import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardClientPagination,
  DashboardEmptyState,
  DashboardLoadingState,
} from "@/components/dashboard-ui";
import {
  getFloorForParkingSlotId,
  getParkingSessionSlotId,
  getParkingSessionsSafe,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";

const pageSize = 10;

type StaffParkingHistoryPanelProps = {
  parkingFloors: ParkingFloor[];
};

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function StaffParkingHistoryPanel({ parkingFloors }: StaffParkingHistoryPanelProps) {
  const [page, setPage] = useState(1);
  const [sessionDate, setSessionDate] = useState(() => getLocalDateInputValue());
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);

  const historyQuery = useQuery({
    queryKey: ["staff-parking-history", page, sessionDate],
    queryFn: () =>
      getParkingSessionsSafe({
        page,
        limit: pageSize,
        status: "COMPLETED",
        date: sessionDate,
      }),
  });

  const sessions = historyQuery.data?.parkingSessions ?? [];
  const pagination = historyQuery.data?.pagination;
  const totalPages = pagination?.totalPage ?? 1;

  const viewingSlotId = viewingSession ? getParkingSessionSlotId(viewingSession) : null;
  const viewingFloor = viewingSlotId
    ? getFloorForParkingSlotId(viewingSlotId, parkingFloors)
    : null;

  return (
    <div className="api-section rounded-2xl p-4 sm:p-5">
      <div className="api-header mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Lịch sử phiên đỗ xe</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Các phiên đã checkout theo ngày check-in
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl"
          onClick={() => historyQuery.refetch()}
          disabled={historyQuery.isFetching}
        >
          <RefreshCw className={`size-4 ${historyQuery.isFetching ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="mb-4 max-w-xs space-y-2">
        <Label htmlFor="history-date">Ngày check-in</Label>
        <Input
          id="history-date"
          type="date"
          value={sessionDate}
          onChange={(event) => {
            setSessionDate(event.target.value);
            setPage(1);
          }}
          className="rounded-xl"
        />
      </div>

      {historyQuery.isLoading ? (
        <DashboardLoadingState label="Đang tải lịch sử..." />
      ) : sessions.length === 0 ? (
        <DashboardEmptyState>Không có phiên hoàn tất trong ngày này.</DashboardEmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border/70 bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Biển số</th>
                  <th className="px-4 py-3">Loại xe</th>
                  <th className="px-4 py-3">Chỗ / Tầng</th>
                  <th className="px-4 py-3">Giờ vào</th>
                  <th className="px-4 py-3">Giờ ra</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const slotId = getParkingSessionSlotId(session);
                  const floor = slotId ? getFloorForParkingSlotId(slotId, parkingFloors) : null;
                  const slotNumber =
                    typeof session.parkingSlotId === "object"
                      ? session.parkingSlotId.slotNumber
                      : "—";

                  return (
                    <tr key={session._id} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 font-mono font-semibold">
                        {getSessionLicensePlate(session) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {getSessionVehicleTypeLabel(session, parkingFloors) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {slotNumber}
                        {floor?.floorName ? ` · ${floor.floorName}` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session.checkInTime ? formatDateTime(session.checkInTime) : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session.checkOutTime ? formatDateTime(session.checkOutTime) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="rounded-lg"
                          onClick={() => setViewingSession(session)}
                        >
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <DashboardClientPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      <ParkingSessionDetailDialog
        session={viewingSession}
        slotNumber={
          viewingSession && typeof viewingSession.parkingSlotId === "object"
            ? viewingSession.parkingSlotId.slotNumber
            : undefined
        }
        floorName={viewingFloor?.floorName}
        vehicleTypeLabel={
          viewingSession ? getSessionVehicleTypeLabel(viewingSession, parkingFloors) : undefined
        }
        licensePlateLabel={
          viewingSession ? (getSessionLicensePlate(viewingSession) ?? undefined) : undefined
        }
        showCheckoutAction={false}
        open={viewingSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSession(null);
          }
        }}
      />
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
