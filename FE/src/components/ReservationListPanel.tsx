import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  fetchStaffOccupancySessions,
  findSessionForReservation,
  getManageReservationDisplayStatus,
  type ManageReservationDisplayStatus,
  type ParkingSession,
} from "@/services/parking.service";
import {
  deleteReservationByManage,
  getAllReservations,
  getReservationSlotId,
  getReservationsByPlate,
  type Reservation,
  type ReservationStatus,
} from "@/services/reservation.service";

type ReservationListPanelProps = {
  className?: string;
  compact?: boolean;
  tableOnly?: boolean;
};

const pageSize = 12;
const statusFilterLabels: Record<ReservationStatus | "ALL", string> = {
  ALL: "Tất cả",
  PENDING: "Chờ xử lý",
  CLAIMED: "Đã nhận",
  EXPIRED: "Hết hạn",
  CANCELLED: "Đã hủy",
};
const statusFilterOptions = Object.keys(statusFilterLabels) as Array<ReservationStatus | "ALL">;

export function ReservationListPanel({
  className,
  compact = false,
  tableOnly = false,
}: ReservationListPanelProps) {
  const queryClient = useQueryClient();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [reservationDate, setReservationDate] = useState(() => getLocalDateInputValue());
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null);
  const [plateInput, setPlateInput] = useState("");
  const [plateQuery, setPlateQuery] = useState("");

  const reservationsQuery = useQuery({
    queryKey: ["reservations-manage", { statusFilter }],
    queryFn: () => fetchAllReservations(statusFilter),
    enabled: !plateQuery,
  });

  const plateReservationsQuery = useQuery({
    queryKey: ["reservations-by-plate", plateQuery, statusFilter],
    queryFn: () =>
      getReservationsByPlate(
        plateQuery,
        statusFilter === "ALL" ? undefined : statusFilter,
      ),
    enabled: Boolean(plateQuery),
  });

  const parkingSessionsQuery = useQuery({
    queryKey: ["parking-sessions-manage-reservations"],
    queryFn: () => fetchStaffOccupancySessions(),
  });

  const parkingSessions = parkingSessionsQuery.data ?? [];
  const sourceReservations = plateQuery
    ? (plateReservationsQuery.data?.reservations ?? [])
    : (reservationsQuery.data ?? []);
  const sessionByReservationId = useMemo(() => {
    const map = new Map<string, ParkingSession>();
    for (const reservation of sourceReservations) {
      const session = findSessionForReservation(
        reservation,
        parkingSessions,
        getReservationSlotId,
      );
      if (session) {
        map.set(reservation._id, session);
      }
    }
    return map;
  }, [sourceReservations, parkingSessions]);

  const viewingParkingSession = viewingReservation
    ? (sessionByReservationId.get(viewingReservation._id) ?? null)
    : null;
  const viewingDisplayStatus = viewingReservation
    ? getManageReservationDisplayStatus(viewingReservation, viewingParkingSession)
    : null;

  const allReservations = sourceReservations;
  const listLoading = plateQuery ? plateReservationsQuery.isLoading : reservationsQuery.isLoading;
  const listError = plateQuery ? plateReservationsQuery.error : reservationsQuery.error;
  const filteredReservations = useMemo(() => {
    if (!isDateFilterActive) {
      return allReservations;
    }
    return allReservations.filter((reservation) =>
      reservationMatchesDateFilter(reservation, reservationDate),
    );
  }, [allReservations, isDateFilterActive, reservationDate]);
  const totalPages = Math.max(Math.ceil(filteredReservations.length / pageSize), 1);
  const reservations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReservations.slice(start, start + pageSize);
  }, [filteredReservations, page]);
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const deleteMutation = useMutation({
    mutationFn: (reservationId: string) => deleteReservationByManage(reservationId),
    onSuccess: async () => {
      setDeletingReservation(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["reservations-manage"] }),
        queryClient.invalidateQueries({ queryKey: ["reservations-by-plate"] }),
        queryClient.invalidateQueries({ queryKey: ["parking-sessions-manage-reservations"] }),
        queryClient.invalidateQueries({ queryKey: ["parking-sessions-manage"] }),
      ]);
      toast.success("Đã xóa đặt chỗ", {
        description: "Bản ghi đặt chỗ đã được xóa thành công.",
      });
    },
    onError: (error) => {
      toast.error("Không thể xóa đặt chỗ", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại hoặc kiểm tra quyền truy cập.",
      });
    },
  });

  const headerMeta = useMemo(() => {
    const countLabel = `${filteredReservations.length} đặt chỗ`;
    if (!isDateFilterActive) {
      return countLabel;
    }
    return `${countLabel} · ${formatReservationDateLabel(reservationDate)}`;
  }, [filteredReservations.length, isDateFilterActive, reservationDate]);

  const clearDateFilter = () => {
    setPage(1);
    setIsDateFilterActive(false);
    setReservationDate(getLocalDateInputValue());
  };

  const applyDateFilter = () => {
    setPage(1);
    setIsDateFilterActive(true);
  };

  const openDatePicker = () => {
    applyDateFilter();
    dateInputRef.current?.showPicker?.();
  };

  const filterToolbar = (
    <div
      className={cn(
        "api-toolbar flex flex-wrap items-end gap-2",
        tableOnly ? "px-1 py-1" : "justify-end",
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reservation-plate-search" className="text-[10px] uppercase tracking-[0.14em]">
          Biển số
        </Label>
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setPlateQuery(plateInput.trim().toUpperCase());
          }}
        >
          <Input
            id="reservation-plate-search"
            value={plateInput}
            onChange={(event) => setPlateInput(event.target.value.toUpperCase())}
            placeholder="51A-123.45"
            className={cn(
              "h-9 w-[140px] rounded-xl font-mono text-xs",
              plateQuery && "border-primary/60 ring-1 ring-primary/20",
            )}
          />
          <Button type="submit" size="sm" className="h-9 rounded-xl">
            Tra
          </Button>
          {plateQuery ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-9 rounded-xl"
              onClick={() => {
                setPlateInput("");
                setPlateQuery("");
                setPage(1);
              }}
            >
              Xóa
            </Button>
          ) : null}
        </form>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reservation-manage-date" className="text-[10px] uppercase tracking-[0.14em]">
          Ngày
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            ref={dateInputRef}
            id="reservation-manage-date"
            type="date"
            value={reservationDate}
            onChange={(event) => {
              setReservationDate(event.target.value);
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
            aria-label="Lọc reservation theo ngày"
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
              setReservationDate(getLocalDateInputValue());
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
            if (option === "ALL") {
              setIsDateFilterActive(false);
              setReservationDate(getLocalDateInputValue());
            }
          }}
          className={cn(
            "api-tab px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
            statusFilter === option
              ? ""
              : "hover:bg-secondary",
          )}
          data-active={statusFilter === option}
        >
          {statusFilterLabels[option]}
        </button>
      ))}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() =>
          void Promise.all([
            plateQuery ? plateReservationsQuery.refetch() : reservationsQuery.refetch(),
            parkingSessionsQuery.refetch(),
          ])
        }
        disabled={
          (plateQuery ? plateReservationsQuery.isFetching : reservationsQuery.isFetching) ||
          parkingSessionsQuery.isFetching
        }
        aria-label="Làm mới danh sách đặt chỗ"
      >
        <RefreshCw
          className={cn(
            "size-4",
            ((plateQuery ? plateReservationsQuery.isFetching : reservationsQuery.isFetching) ||
              parkingSessionsQuery.isFetching) &&
              "animate-spin",
          )}
        />
      </Button>
    </div>
  );

  return (
    <section
      className={cn(
        tableOnly ? "flex h-full min-h-0 flex-col" : "api-section overflow-hidden p-0",
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
        <div className="api-header flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Danh sách đặt chỗ</h3>
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
            "api-table-head grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.7fr] gap-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            tableOnly ? "px-1" : "px-6",
          )}
        >
          <span>Tài xế</span>
          <span>Xe · Chỗ</span>
          <span>Thời gian đến</span>
          <span>Trạng thái</span>
          <span className="text-right">Thao tác</span>
        </div>

        <div className={cn("space-y-2 pb-4", tableOnly ? "px-0" : "px-4")}>
          {listLoading ? (
            <div className="api-empty flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải đặt chỗ...
            </div>
          ) : listError ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {listError instanceof Error
                ? listError.message
                : "Không thể tải danh sách đặt chỗ."}
            </div>
          ) : reservations.length > 0 ? (
            reservations.map((reservation) => {
              const parkingSession = sessionByReservationId.get(reservation._id) ?? null;
              const displayStatus = getManageReservationDisplayStatus(reservation, parkingSession);

              return (
              <article
                key={reservation._id}
                className="api-row grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.7fr] items-center gap-4 rounded-xl px-5 py-4 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setViewingReservation(reservation)}
                  className="col-span-4 grid cursor-pointer grid-cols-[1.4fr_1.2fr_1fr_0.8fr] items-center gap-4 rounded-lg text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Xem chi tiết đặt chỗ ${getSlotLabel(reservation)}`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{getDriverLabel(reservation)}</div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {getDriverSubLabel(reservation)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-mono text-[12px]">{getVehicleLabel(reservation)}</div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {getSlotLabel(reservation)}
                    </div>
                  </div>

                  <div className="text-[12px] text-muted-foreground">
                    <p>{formatDateTime(reservation.expectedArrival)}</p>
                    {parkingSession?.checkInTime ? (
                      <p className="mt-0.5 text-[11px] text-emerald-500">
                        Vào: {formatDateTime(parkingSession.checkInTime)}
                      </p>
                    ) : null}
                    {parkingSession?.checkOutTime ? (
                      <p className="mt-0.5 text-[11px] text-primary">
                        Ra: {formatDateTime(parkingSession.checkOutTime)}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Badge
                      className={cn("border", getStatusBadgeClass(displayStatus))}
                      variant="outline"
                    >
                      {getManageStatusLabel(displayStatus)}
                    </Badge>
                  </div>
                </button>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeletingReservation(reservation)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    aria-label={`Xóa đặt chỗ ${getSlotLabel(reservation)}`}
                  >
                    <Trash2 className="size-3.5" />
                    Xóa
                  </button>
                </div>
              </article>
            );
            })
          ) : (
            <div className="api-empty px-4 py-6 text-sm text-muted-foreground">
              {isDateFilterActive
                ? `Không có đặt chỗ nào vào ngày ${formatReservationDateLabel(reservationDate)}.`
                : statusFilter === "ALL"
                  ? "Không có đặt chỗ nào."
                  : `Không có đặt chỗ với trạng thái ${statusFilterLabels[statusFilter]}.`}
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
            disabled={!canGoBack || (plateQuery ? plateReservationsQuery.isFetching : reservationsQuery.isFetching)}
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
            disabled={!canGoNext || (plateQuery ? plateReservationsQuery.isFetching : reservationsQuery.isFetching)}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Sau
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <ReservationDetailDialog
        reservation={viewingReservation}
        parkingSession={viewingParkingSession}
        open={viewingReservation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingReservation(null);
          }
        }}
        statusLabel={viewingDisplayStatus ? getManageStatusLabel(viewingDisplayStatus) : undefined}
      />

      <AlertDialog
        open={!!deletingReservation}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingReservation(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Đặt chỗ này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deletingReservation || deleteMutation.isPending) {
                  return;
                }
                deleteMutation.mutate(deletingReservation._id);
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reservationMatchesDateFilter(reservation: Reservation, dateKey: string) {
  const source = reservation.expectedArrival ?? reservation.reservedAt;
  if (!source) {
    return false;
  }
  return getLocalDateInputValue(new Date(source)) === dateKey;
}

async function fetchAllReservations(statusFilter: ReservationStatus | "ALL") {
  const batchSize = 100;
  let currentPage = 1;
  let totalPages = 1;
  const reservations: Reservation[] = [];

  do {
    const result = await getAllReservations({
      page: currentPage,
      limit: batchSize,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    });
    reservations.push(...result.reservations);
    totalPages = result.pagination.totalPages;
    currentPage += 1;
  } while (currentPage <= totalPages);

  return reservations;
}

function formatReservationDateLabel(dateKey: string) {
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

function getDriverLabel(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.fullName ?? "Không xác định";
  }
  return reservation.driverId;
}

function getDriverSubLabel(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.email ?? reservation.driverId.phone ?? "Không có";
  }
  return "Không có";
}

function getVehicleLabel(reservation: Reservation) {
  if (typeof reservation.vehicleId === "string") {
    return reservation.vehicleId;
  }
  return reservation.vehicleId.licensePlate ?? reservation.vehicleId._id;
}

function getSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "string") {
    return reservation.parkingSlotId;
  }
  const slotNumber = reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
  const floorName = reservation.parkingSlotId.floorId?.floorName;
  return floorName ? `${slotNumber} · ${floorName}` : slotNumber;
}

function formatDateTime(value?: string) {
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

function getManageStatusLabel(status: ManageReservationDisplayStatus) {
  switch (status) {
    case "PENDING":
      return "Chờ xử lý";
    case "CLAIMED":
      return "Đã nhận";
    case "CHECKED IN":
      return "Đã check-in";
    case "CHECKED OUT":
      return "Đã check-out";
    case "EXPIRED":
      return "Hết hạn";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: ManageReservationDisplayStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/40 bg-amber-500/10 text-amber-500";
    case "CLAIMED":
    case "CHECKED IN":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "CHECKED OUT":
      return "border-primary/40 bg-primary/10 text-primary";
    case "EXPIRED":
      return "border-slate-400/40 bg-slate-500/10 text-slate-300";
    case "CANCELLED":
      return "border-rose-400/40 bg-rose-500/10 text-rose-500";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
