import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

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
  isRefreshing?: boolean;
  onRefresh: () => void;
  onCheckoutSession: (session: ParkingSession) => void;
  isCheckingOut?: boolean;
};

export function StaffLotSessionsPanel({
  sessions,
  parkingFloors,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onCheckoutSession,
  isCheckingOut = false,
}: StaffLotSessionsPanelProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "ACTIVE"),
    [sessions],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase();
    if (!query) {
      return activeSessions;
    }
    return activeSessions.filter((session) => {
      const plate = getSessionLicensePlate(session)?.toUpperCase() ?? "";
      return plate.includes(query);
    });
  }, [activeSessions, search]);

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
      <div className="api-header mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Toàn bộ xe trong bãi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeSessions.length} xe đang ACTIVE
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="h-10 rounded-xl"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="mb-4 max-w-md space-y-2">
        <Label htmlFor="lot-plate-search">Tìm biển số</Label>
        <Input
          id="lot-plate-search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="51A-123.45"
          className="rounded-xl font-mono"
        />
      </div>

      {filtered.length === 0 ? (
        <DashboardEmptyState>
          {search.trim() ? "Không tìm thấy xe khớp biển số." : "Hiện không có xe trong bãi."}
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
            totalPages={pagination.totalPages}
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
        showCheckoutAction={viewingSession?.status === "ACTIVE"}
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
