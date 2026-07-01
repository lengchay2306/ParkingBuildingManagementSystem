import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  deleteReservationByManage,
  getAllReservations,
  type Reservation,
  type ReservationStatus,
} from "@/services/reservation.service";

type ReservationListPanelProps = {
  className?: string;
  compact?: boolean;
  tableOnly?: boolean;
};

const pageSize = 12;
const statusFilterOptions: Array<ReservationStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CLAIMED",
  "EXPIRED",
  "CANCELLED",
];

export function ReservationListPanel({
  className,
  compact = false,
  tableOnly = false,
}: ReservationListPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [reservationDate, setReservationDate] = useState(() => getLocalDateInputValue());
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ["reservations-manage", { statusFilter }],
    queryFn: () => fetchAllReservations(statusFilter),
  });

  const allReservations = reservationsQuery.data ?? [];
  const filteredReservations = useMemo(
    () =>
      allReservations.filter((reservation) =>
        reservationMatchesDateFilter(reservation, reservationDate),
      ),
    [allReservations, reservationDate],
  );
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
      await queryClient.invalidateQueries({ queryKey: ["reservations-manage"] });
      toast.success("Đã xóa đặt chỗ", {
        description: "Bản ghi reservation đã được xóa thành công.",
      });
    },
    onError: (error) => {
      toast.error("Không thể xóa đặt chỗ", {
        description:
          error instanceof Error ? error.message : "Vui lòng thử lại hoặc kiểm tra quyền truy cập.",
      });
    },
  });

  const headerMeta = useMemo(
    () => `${filteredReservations.length} reservations`,
    [filteredReservations.length],
  );

  const filterToolbar = (
    <div
      className={cn(
        "flex flex-wrap items-end gap-2",
        tableOnly ? "px-1 py-1" : "justify-end",
      )}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reservation-manage-date" className="text-[10px] uppercase tracking-[0.14em]">
          Ngày
        </Label>
        <Input
          id="reservation-manage-date"
          type="date"
          value={reservationDate}
          onChange={(event) => {
            setPage(1);
            setReservationDate(event.target.value);
          }}
          className="h-9 w-[160px] rounded-xl"
        />
      </div>
      {reservationDate !== getLocalDateInputValue() ? (
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
          {option}
        </button>
      ))}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => void reservationsQuery.refetch()}
        disabled={reservationsQuery.isFetching}
        aria-label="Refresh reservations"
      >
        <RefreshCw className={cn("size-4", reservationsQuery.isFetching && "animate-spin")} />
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
            <h3 className="text-lg font-semibold text-foreground">Reservation List</h3>
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
            "grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.7fr] gap-4 border-b border-border bg-card py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            tableOnly ? "px-1" : "px-6",
          )}
        >
          <span>Driver</span>
          <span>Vehicle · Slot</span>
          <span>Expected Arrival</span>
          <span>Status</span>
          <span className="text-right">Action</span>
        </div>

        <div className={cn("space-y-2 pb-4", tableOnly ? "px-0" : "px-4")}>
          {reservationsQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading reservations...
            </div>
          ) : reservationsQuery.error ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {reservationsQuery.error instanceof Error
                ? reservationsQuery.error.message
                : "Unable to load reservations."}
            </div>
          ) : reservations.length > 0 ? (
            reservations.map((reservation) => (
              <article
                key={reservation._id}
                className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.7fr] items-center gap-4 rounded-xl border border-border bg-secondary px-5 py-4 transition-colors hover:bg-secondary/80"
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
                  {formatDateTime(reservation.expectedArrival)}
                </div>

                <div>
                  <Badge className={cn("border", getStatusBadgeClass(reservation.status))} variant="outline">
                    {reservation.status}
                  </Badge>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeletingReservation(reservation)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    aria-label={`Delete reservation ${getSlotLabel(reservation)}`}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl bg-background/40 px-4 py-6 text-sm text-muted-foreground">
              Không có reservation nào vào ngày {formatReservationDateLabel(reservationDate)}.
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
          Page {page} / {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoBack || reservationsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="h-8 rounded-xl px-3"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoNext || reservationsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={!!deletingReservation}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingReservation(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
            <AlertDialogDescription>
              Reservation này sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
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
    return reservation.driverId.fullName ?? "Unknown";
  }
  return reservation.driverId;
}

function getDriverSubLabel(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.email ?? reservation.driverId.phone ?? "N/A";
  }
  return "N/A";
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

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/40 bg-amber-500/10 text-amber-500";
    case "CLAIMED":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "EXPIRED":
      return "border-slate-400/40 bg-slate-500/10 text-slate-300";
    case "CANCELLED":
      return "border-rose-400/40 bg-rose-500/10 text-rose-500";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
