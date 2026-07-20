import { useEffect, useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { StaffCorrectSessionSlotDialog } from "@/components/staff/StaffCorrectSessionSlotDialog";
import {
  StaffLotSlotFilterDialog,
  type LotSlotFilterSelection,
} from "@/components/staff/StaffLotSlotFilterDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DashboardClientPagination,
  DashboardEmptyState,
  DashboardLoadingState,
  paginateItems,
} from "@/components/dashboard-ui";
import {
  getFloorForParkingSlotId,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";

const pageSize = 10;

type StaffLotSessionsPanelProps = {
  sessions: ParkingSession[];
  parkingFloors: ParkingFloor[];
  isLoading?: boolean;
  onCheckoutSession: (session: ParkingSession) => void;
  isCheckingOut?: boolean;
  onCorrectSessionSlot: (payload: {
    sessionId: string;
    parkingSlotId: string;
  }) => void | Promise<void>;
  isCorrectingSlot?: boolean;
  correctingSessionId?: string | null;
};

export function StaffLotSessionsPanel({
  sessions,
  parkingFloors,
  isLoading = false,
  onCheckoutSession,
  isCheckingOut = false,
  onCorrectSessionSlot,
  isCorrectingSlot = false,
  correctingSessionId = null,
}: StaffLotSessionsPanelProps) {
  const [search, setSearch] = useState("");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<LotSlotFilterSelection | null>(null);
  const [isSlotFilterOpen, setIsSlotFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);
  const [correctingSession, setCorrectingSession] = useState<ParkingSession | null>(null);

  useEffect(() => {
    if (!viewingSession) {
      return;
    }
    const fresh = sessions.find((item) => item._id === viewingSession._id);
    if (fresh) {
      setViewingSession(fresh);
    }
  }, [sessions, viewingSession?._id]);

  const activeSessions = useMemo(
    () =>
      sortSessionsByCheckInAsc(
        sessions.filter(
          (session) => session.status === "ACTIVE" && !session.checkOutTime,
        ),
      ),
    [sessions],
  );

  const filtered = useMemo(() => {
    let list = activeSessions;

    if (selectedSlotFilter) {
      list = list.filter(
        (session) => getParkingSessionSlotId(session) === selectedSlotFilter.slotId,
      );
    }

    const query = search.trim().toUpperCase();
    if (query) {
      list = list.filter((session) => {
        const plate = getSessionLicensePlate(session)?.toUpperCase() ?? "";
        return plate.includes(query);
      });
    }

    return list;
  }, [activeSessions, search, selectedSlotFilter]);

  const pagination = paginateItems(filtered, page, pageSize);
  const viewingSlotId = viewingSession ? getParkingSessionSlotId(viewingSession) : null;
  const viewingFloor = viewingSlotId
    ? getFloorForParkingSlotId(viewingSlotId, parkingFloors)
    : null;

  if (isLoading) {
    return <DashboardLoadingState label="Đang tải xe trong bãi..." />;
  }

  return (
    <div className="api-section rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div className="w-full min-w-[200px] max-w-md flex-1 space-y-2">
          <Label htmlFor="lot-plate-search">Tìm biển số</Label>
          <Input
            id="lot-plate-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="rounded-xl font-mono"
          />
        </div>

        <div className="w-full min-w-[200px] max-w-md flex-1 space-y-2">
          <Label htmlFor="lot-slot-filter-trigger">Tìm theo ô</Label>
          <div className="flex items-center gap-2">
            <Button
              id="lot-slot-filter-trigger"
              type="button"
              variant="secondary"
              onClick={() => setIsSlotFilterOpen(true)}
              className="h-10 min-w-0 flex-1 justify-start rounded-xl px-3 font-normal"
            >
              <MapPin className="size-4 shrink-0 text-primary" />
              <span className="truncate font-mono text-sm">
                {selectedSlotFilter
                  ? `${selectedSlotFilter.slotNumber} · ${selectedSlotFilter.floor.floorName}`
                  : "Chọn ô đỗ"}
              </span>
            </Button>
            {selectedSlotFilter ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setSelectedSlotFilter(null);
                  setPage(1);
                }}
                className="size-10 shrink-0 rounded-xl"
                aria-label="Xóa lọc theo ô"
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <DashboardEmptyState>
          {search.trim() && selectedSlotFilter
            ? "Không tìm thấy xe khớp biển số tại ô đã chọn."
            : search.trim()
              ? "Không tìm thấy xe khớp biển số."
              : selectedSlotFilter
                ? `Không có xe ACTIVE tại ô ${selectedSlotFilter.slotNumber}.`
                : "Hiện không có xe trong bãi."}
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
                  <th className="px-4 py-3">Loại phiên</th>
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
                        {floor?.floorName ? ` · ${floor.floorName}` : ""}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {session.checkInTime ? formatDateTime(session.checkInTime) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {session.isGuest ? "Vãng lai" : session.sessionType}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => setCorrectingSession(session)}
                          >
                            Sửa chỗ
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-lg"
                            onClick={() => setViewingSession(session)}
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
            page={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      <StaffLotSlotFilterDialog
        open={isSlotFilterOpen}
        onOpenChange={setIsSlotFilterOpen}
        parkingFloors={parkingFloors}
        selectedSlotId={selectedSlotFilter?.slotId}
        onSelect={(selection) => {
          setSelectedSlotFilter(selection);
          setPage(1);
        }}
      />

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
        showCheckoutAction={viewingSession?.status === "ACTIVE"}
        showCorrectSlotAction={viewingSession?.status === "ACTIVE"}
        onCorrectSlot={() => {
          if (viewingSession) {
            setCorrectingSession(viewingSession);
          }
        }}
        onCheckout={() => {
          if (viewingSession) {
            onCheckoutSession(viewingSession);
          }
        }}
        isCheckingOut={isCheckingOut}
        open={viewingSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSession(null);
          }
        }}
      />

      <StaffCorrectSessionSlotDialog
        open={correctingSession !== null}
        onOpenChange={(open) => {
          if (!open && !isCorrectingSlot) {
            setCorrectingSession(null);
          }
        }}
        session={correctingSession}
        parkingFloors={parkingFloors}
        isSubmitting={isCorrectingSlot && correctingSession?._id === correctingSessionId}
        onConfirm={async (payload) => {
          await onCorrectSessionSlot(payload);
          setCorrectingSession(null);
        }}
      />
    </div>
  );
}

function sortSessionsByCheckInAsc(sessions: ParkingSession[]) {
  return [...sessions].sort((left, right) => {
    const leftTime = getSessionSortTime(left);
    const rightTime = getSessionSortTime(right);
    return leftTime - rightTime;
  });
}

function getSessionSortTime(session: ParkingSession) {
  if (!session.checkInTime) {
    return Number.MAX_SAFE_INTEGER;
  }
  const time = new Date(session.checkInTime).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
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
