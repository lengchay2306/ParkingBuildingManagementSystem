import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  deleteErrorParkingSession,
  getParkingSessionsSafe,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingSession,
} from "@/services/parking.service";
import { getMyProfile } from "@/services/user.service";

type ParkingSessionListPanelProps = {
  className?: string;
  compact?: boolean;
  tableOnly?: boolean;
  allowDeleteError?: boolean;
};

const pageSize = 12;
const statusFilterLabels = {
  ALL: "Tất cả",
  ACTIVE: "Đang hoạt động",
  COMPLETED: "Hoàn tất",
} as const;
type SessionStatusFilter = keyof typeof statusFilterLabels;
const statusFilterOptions = Object.keys(statusFilterLabels) as SessionStatusFilter[];

export function ParkingSessionListPanel({
  className,
  compact = false,
  tableOnly = false,
  allowDeleteError = false,
}: ParkingSessionListPanelProps) {
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>("ALL");
  const [sessionDate, setSessionDate] = useState(() => getLocalDateInputValue());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);

  const sessionsQuery = useQuery({
    queryKey: [
      "parking-sessions-manage",
      { page, statusFilter, sessionDate, isDateFilterActive },
    ],
    queryFn: () =>
      getParkingSessionsSafe({
        page,
        limit: pageSize,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        date: isDateFilterActive ? sessionDate : undefined,
      }),
  });

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
    enabled: allowDeleteError,
  });

  const deleteErrorMutation = useMutation({
    mutationFn: (parkingSessionId: string) => {
      const userId = profileQuery.data?._id;
      if (!userId) {
        throw new Error("Không lấy được thông tin nhân viên hiện tại.");
      }
      return deleteErrorParkingSession({ parkingSessionId, userId });
    },
    onSuccess: async () => {
      setViewingSession(null);
      await queryClient.invalidateQueries({ queryKey: ["parking-sessions-manage"] });
      toast.success("Đã xóa phiên lỗi");
    },
    onError: (error) => {
      toast.error("Không xóa được phiên lỗi", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const sessions = sessionsQuery.data?.parkingSessions ?? [];
  const pagination = sessionsQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPage ?? 1, 1);
  const totalItems = pagination?.totalItems ?? sessions.length;
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const headerMeta = useMemo(() => {
    const countLabel = `${totalItems} phiên đỗ xe`;
    if (!isDateFilterActive) {
      return countLabel;
    }
    return `${countLabel} · ${formatSessionDateLabel(sessionDate)}`;
  }, [totalItems, isDateFilterActive, sessionDate]);

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

  const filterToolbar = (
    <div
      className={cn(
        "flex flex-wrap items-end gap-2",
        tableOnly ? "px-1 py-1" : "justify-end",
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="session-manage-date" className="text-[10px] uppercase tracking-[0.14em]">
          Ngày check-in
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            ref={dateInputRef}
            id="session-manage-date"
            type="date"
            value={sessionDate}
            onChange={(event) => {
              setSessionDate(event.target.value);
              if (isDateFilterActive) {
                setPage(1);
              }
            }}
            className={cn(
              "h-9 w-[160px] rounded-xl",
              isDateFilterActive && "border-primary/60 ring-1 ring-primary/20",
            )}
          />
          <Button
            type="button"
            size="icon"
            variant={isDateFilterActive ? "default" : "secondary"}
            onClick={openDatePicker}
            className="size-9 shrink-0 rounded-xl"
            aria-label="Lọc session theo ngày check-in"
            title="Lọc theo ngày"
          >
            <CalendarDays className="size-4" />
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
            className="h-9 rounded-xl"
          >
            Hôm nay
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={clearDateFilter}
            className="h-9 rounded-xl"
          >
            Bỏ lọc ngày
          </Button>
        </>
      ) : null}
      {statusFilterOptions.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => {
            setPage(1);
            setStatusFilter(option);
          }}
          className={cn(
            "rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
            statusFilter === option
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:bg-secondary",
          )}
        >
          {statusFilterLabels[option]}
        </button>
      ))}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => void sessionsQuery.refetch()}
        disabled={sessionsQuery.isFetching}
        aria-label="Làm mới danh sách phiên đỗ xe"
      >
        <RefreshCw className={cn("size-4", sessionsQuery.isFetching && "animate-spin")} />
      </Button>
    </div>
  );

  return (
    <section
      className={cn(
        tableOnly ? "flex h-full min-h-0 flex-col" : "dashboard-section overflow-hidden p-0",
        className,
      )}
    >
      {tableOnly ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {headerMeta}
          </p>
          {filterToolbar}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Phiên đỗ xe</h3>
            <p className="mt-1 text-sm text-muted-foreground">{headerMeta}</p>
          </div>
          {filterToolbar}
        </div>
      )}

      <div
        className={cn(
          tableOnly ? "min-h-0 flex-1 overflow-y-auto" : compact ? "max-h-[420px] overflow-y-auto" : "",
        )}
      >
        <div
          className={cn(
            "grid gap-4 border-b border-border bg-card py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            allowDeleteError
              ? "grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_auto]"
              : "grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr]",
            tableOnly ? "px-1" : "px-6",
          )}
        >
          <span>Biển số</span>
          <span>Slot · Tầng</span>
          <span>Check-in</span>
          <span>Check-out</span>
          <span>Trạng thái</span>
          {allowDeleteError ? <span className="w-9" /> : null}
        </div>

        <div className={cn("space-y-2 pb-4", tableOnly ? "px-0" : "px-4")}>
          {sessionsQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải phiên đỗ xe...
            </div>
          ) : sessionsQuery.error ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {sessionsQuery.error instanceof Error
                ? sessionsQuery.error.message
                : "Không thể tải danh sách phiên đỗ xe."}
            </div>
          ) : sessions.length > 0 ? (
            sessions.map((session) => (
              <div
                key={session._id}
                className={cn(
                  "grid w-full items-center gap-4 rounded-xl border border-border bg-secondary px-5 py-4",
                  allowDeleteError
                    ? "grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_auto]"
                    : "grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewingSession(session)}
                  className="contents text-left hover:opacity-90 focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[12px] font-medium">
                      {getSessionLicensePlate(session) ?? "—"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {session.isGuest ? "Khách vãng lai" : getUserLabel(session.checkInUserId)}
                    </div>
                  </div>

                  <div className="min-w-0 truncate text-[12px] text-muted-foreground">
                    {getSlotLabel(session)}
                  </div>

                  <div className="text-[12px] text-muted-foreground">
                    {formatDateTime(session.checkInTime)}
                  </div>

                  <div className="text-[12px] text-muted-foreground">
                    {formatDateTime(session.checkOutTime ?? undefined)}
                  </div>

                  <div>
                    <Badge
                      className={cn("border", getSessionStatusBadgeClass(session.status))}
                      variant="outline"
                    >
                      {getSessionStatusLabel(session.status)}
                    </Badge>
                  </div>
                </button>
                {allowDeleteError ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleteErrorMutation.isPending}
                    title="Xóa phiên lỗi"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Xóa phiên lỗi ${getSessionLicensePlate(session) ?? session._id}?`,
                        )
                      ) {
                        deleteErrorMutation.mutate(session._id);
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              {isDateFilterActive
                ? `Không có phiên đỗ xe nào check-in ngày ${formatSessionDateLabel(sessionDate)}.`
                : statusFilter === "ALL"
                  ? "Không có phiên đỗ xe nào."
                  : `Không có phiên với trạng thái ${statusFilterLabels[statusFilter]}.`}
            </div>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between border-t border-border py-4",
          tableOnly ? "mt-auto px-1" : "px-6",
        )}
      >
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
          Trang {page} / {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoBack || sessionsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="h-8 rounded-xl px-3"
          >
            <ChevronLeft className="size-3.5" />
            Trước
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoNext || sessionsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Sau
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <ParkingSessionDetailDialog
        session={viewingSession}
        slotNumber={
          viewingSession && typeof viewingSession.parkingSlotId === "object"
            ? viewingSession.parkingSlotId.slotNumber
            : undefined
        }
        floorName={
          viewingSession && typeof viewingSession.parkingSlotId === "object"
            ? viewingSession.parkingSlotId.floorId?.floorName
            : undefined
        }
        vehicleTypeLabel={viewingSession ? getSessionVehicleTypeLabel(viewingSession) : undefined}
        licensePlateLabel={viewingSession ? getSessionLicensePlate(viewingSession) : undefined}
        open={viewingSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSession(null);
          }
        }}
      />
    </section>
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

function getSlotLabel(session: ParkingSession) {
  const slotId = getParkingSessionSlotId(session);
  if (typeof session.parkingSlotId === "object") {
    const slotNumber = session.parkingSlotId.slotNumber ?? slotId ?? "—";
    const floorName = session.parkingSlotId.floorId?.floorName;
    return floorName ? `${slotNumber} · ${floorName}` : slotNumber;
  }
  return slotId ?? "—";
}

function getUserLabel(
  user: ParkingSession["checkInUserId"],
) {
  if (!user || typeof user !== "object") {
    return "—";
  }
  return user.fullName ?? user.phone ?? "—";
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSessionStatusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "COMPLETED":
      return "Hoàn tất";
    default:
      return status;
  }
}

function getSessionStatusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "COMPLETED":
      return "border-primary/40 bg-primary/10 text-primary";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
