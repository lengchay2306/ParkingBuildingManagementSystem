import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardClientPagination,
  DashboardEmptyState,
  DashboardLoadingState,
  paginateItems,
} from "@/components/dashboard-ui";
import { liveQueryOptions } from "@/lib/live-query";
import { cn } from "@/lib/utils";
import {
  fetchStaffCompletedHistorySessions,
  fetchStaffCompletedHistorySessionsForDate,
  getFloorForParkingSlotId,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";

const pageSize = 10;

type StaffParkingHistoryPanelProps = {
  parkingFloors: ParkingFloor[];
};

function formatFloorLabel(floorName: string) {
  return floorName.split(" - ")[0]?.trim() || floorName;
}

export function StaffParkingHistoryPanel({ parkingFloors }: StaffParkingHistoryPanelProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [sessionDate, setSessionDate] = useState(() => getLocalDateInputValue());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);

  const historyQuery = useQuery({
    queryKey: ["staff-parking-history", { isDateFilterActive, sessionDate }],
    queryFn: () =>
      isDateFilterActive
        ? fetchStaffCompletedHistorySessionsForDate(sessionDate)
        : fetchStaffCompletedHistorySessions(),
    ...liveQueryOptions,
  });

  const allSessions = historyQuery.data ?? [];
  const pagination = useMemo(
    () => paginateItems(allSessions, page, pageSize),
    [allSessions, page],
  );

  const viewingSlotId = viewingSession ? getParkingSessionSlotId(viewingSession) : null;
  const viewingFloor = viewingSlotId
    ? getFloorForParkingSlotId(viewingSlotId, parkingFloors)
    : null;

  const clearDateFilter = () => {
    setPage(1);
    setIsDateFilterActive(false);
    setSessionDate(getLocalDateInputValue());
  };

  const openDatePicker = () => {
    setPage(1);
    setIsDateFilterActive(true);
    dateInputRef.current?.showPicker?.();
  };

  return (
    <div className="api-section rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="staff-history-date" className="text-[10px] uppercase tracking-[0.14em]">
            Ngày check-in
          </Label>
          <div className="flex flex-wrap items-center gap-1.5">
            {isDateFilterActive ? (
              <Input
                ref={dateInputRef}
                id="staff-history-date"
                type="date"
                value={sessionDate}
                onChange={(event) => {
                  setSessionDate(event.target.value);
                  setPage(1);
                }}
                className="h-10 w-[160px] rounded-xl border-primary/60 ring-1 ring-primary/20"
              />
            ) : (
              <Input
                ref={dateInputRef}
                id="staff-history-date"
                type="date"
                value={sessionDate}
                onChange={(event) => {
                  setSessionDate(event.target.value);
                }}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden
              />
            )}
            <Button
              type="button"
              size={isDateFilterActive ? "icon" : "sm"}
              variant={isDateFilterActive ? "default" : "secondary"}
              onClick={openDatePicker}
              className={cn(
                "shrink-0 rounded-xl",
                isDateFilterActive ? "size-10" : "h-10 gap-2 px-3",
              )}
              aria-label="Lọc lịch sử theo ngày check-in"
              title="Lọc theo ngày"
            >
              <CalendarDays className="size-4" />
              {!isDateFilterActive ? "Lọc theo ngày" : null}
            </Button>
          </div>
        </div>

        {isDateFilterActive ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setPage(1);
                setSessionDate(getLocalDateInputValue());
              }}
              className="h-10 rounded-xl"
            >
              Hôm nay
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearDateFilter}
              className="h-10 rounded-xl"
            >
              Bỏ lọc ngày
            </Button>
          </>
        ) : null}
      </div>

      {historyQuery.isLoading ? (
        <DashboardLoadingState label="Đang tải lịch sử..." />
      ) : allSessions.length === 0 ? (
        <DashboardEmptyState>
          {isDateFilterActive
            ? `Không có phiên checkout ngày ${formatSessionDateLabel(sessionDate)}.`
            : "Chưa có phiên đã checkout."}
        </DashboardEmptyState>
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
                {pagination.items.map((session) => {
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
                        {floor?.floorName ? ` · ${formatFloorLabel(floor.floorName)}` : ""}
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
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
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

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatSessionDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
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
