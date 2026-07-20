import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";

import {
  DashboardEmptyState,
  DashboardLoadingState,
} from "@/components/dashboard-ui";
import { formatDriverDateTime } from "@/lib/driver-reservation-display";
import { cn } from "@/lib/utils";
import {
  getSessionLicensePlate,
  getSessionSlotLabel,
  getMyParkingSessions,
  type ParkingSession,
} from "@/services/parking.service";

type SessionFilter = "ALL" | "ACTIVE" | "COMPLETED";

const STATUS_FILTERS: Array<{ value: SessionFilter; label: string }> = [
  { value: "ALL", label: "ALL" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "COMPLETED", label: "COMPLETED" },
];

const myParkingSessionsQueryKey = ["my-parking-sessions"] as const;

type DriverParkingSessionsPanelProps = {
  enabled?: boolean;
};

function sessionStatusTone(status: string | undefined) {
  const normalized = (status ?? "—").trim().toUpperCase() || "—";
  if (normalized === "ACTIVE") {
    return "border-status-empty/45 bg-status-empty/15 text-status-empty";
  }
  if (normalized === "COMPLETED") {
    return "border-border bg-muted text-muted-foreground";
  }
  return "border-border bg-muted text-muted-foreground";
}

function resolvePlate(session: ParkingSession) {
  return getSessionLicensePlate(session) ?? "—";
}

function resolveSlot(session: ParkingSession) {
  return getSessionSlotLabel(session) ?? "—";
}

/** Driver parking session history — DB status enums + optional ACTIVE/COMPLETED filter. */
export function DriverParkingSessionsPanel({ enabled = true }: DriverParkingSessionsPanelProps) {
  const [statusFilter, setStatusFilter] = useState<SessionFilter>("ALL");

  const sessionsQuery = useQuery({
    queryKey: [...myParkingSessionsQueryKey, statusFilter] as const,
    queryFn: () =>
      getMyParkingSessions({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        limit: 100,
      }),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const sessions = sessionsQuery.data?.parkingSessions ?? [];
  const errorMessage =
    sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : sessionsQuery.isError
        ? "Không tải được phiên gửi xe."
        : null;

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((left, right) => {
        const leftTime = left.checkInTime ? new Date(left.checkInTime).getTime() : 0;
        const rightTime = right.checkInTime ? new Date(right.checkInTime).getTime() : 0;
        return rightTime - leftTime;
      }),
    [sessions],
  );

  if (sessionsQuery.isLoading && sessions.length === 0) {
    return <DashboardLoadingState label="Đang tải phiên gửi xe..." />;
  }

  return (
    <div className="api-section rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] transition-colors",
                active
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/70 bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      {sessionsQuery.isFetching && !sessionsQuery.isLoading ? (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          Đang cập nhật...
        </div>
      ) : null}

      {sortedSessions.length === 0 ? (
        <DashboardEmptyState>Bạn chưa có phiên gửi xe nào.</DashboardEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border/70 bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Biển số</th>
                <th className="px-4 py-3">Chỗ / Tầng</th>
                <th className="px-4 py-3">Vào</th>
                <th className="px-4 py-3">Ra</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((session) => {
                const status = (session.status ?? "—").toUpperCase();
                return (
                  <tr key={session._id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono font-semibold">{resolvePlate(session)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{resolveSlot(session)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {session.checkInTime ? formatDriverDateTime(session.checkInTime) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {session.checkOutTime ? formatDriverDateTime(session.checkOutTime) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
                          sessionStatusTone(status),
                        )}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
