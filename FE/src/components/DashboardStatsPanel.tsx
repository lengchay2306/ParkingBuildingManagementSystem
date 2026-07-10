import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getDashboardStats,
  getRevenueStats,
  type DashboardStats,
} from "@/services/dashboard.service";

type DashboardStatsPanelProps = {
  className?: string;
};

const formatVnd = (amount: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export function DashboardStatsPanel({ className }: DashboardStatsPanelProps) {
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [groupBy, setGroupBy] = useState<"none" | "day" | "month">("day");

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const revenueQuery = useQuery({
    queryKey: ["dashboard-revenue", year, month, groupBy],
    queryFn: () =>
      getRevenueStats({
        year: Number(year) || undefined,
        month: groupBy === "month" ? undefined : Number(month) || undefined,
        groupBy: groupBy === "none" ? undefined : groupBy,
        status: "PAID",
      }),
  });

  const modelCards = useMemo(() => {
    const stats = dashboardQuery.data;
    if (!stats) return [];
    return buildModelCards(stats);
  }, [dashboardQuery.data]);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            Tổng quan hệ thống
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">Thống kê & doanh thu</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => {
            void dashboardQuery.refetch();
            void revenueQuery.refetch();
          }}
        >
          <RefreshCw className="size-3.5" />
          Làm mới
        </Button>
      </div>

      {dashboardQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Đang tải thống kê...
        </div>
      ) : dashboardQuery.error ? (
        <p className="text-sm text-destructive">
          {dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Không tải được dashboard."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modelCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-border bg-secondary/40 px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</p>
              {card.hint ? (
                <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="revenue-year">Năm</Label>
            <Input
              id="revenue-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="h-9 w-28 rounded-xl"
            />
          </div>
          {groupBy !== "month" ? (
            <div className="space-y-1.5">
              <Label htmlFor="revenue-month">Tháng</Label>
              <Input
                id="revenue-month"
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-9 w-24 rounded-xl"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Nhóm theo</Label>
            <Select
              value={groupBy}
              onValueChange={(value) => setGroupBy(value as "none" | "day" | "month")}
            >
              <SelectTrigger className="h-9 w-40 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tổng</SelectItem>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {revenueQuery.isLoading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Đang tải doanh thu...
          </div>
        ) : revenueQuery.error ? (
          <p className="mt-4 text-sm text-destructive">
            {revenueQuery.error instanceof Error
              ? revenueQuery.error.message
              : "Không tải được doanh thu."}
          </p>
        ) : revenueQuery.data ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Tổng doanh thu
                </p>
                <p className="text-xl font-semibold">{formatVnd(revenueQuery.data.totalAmount)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Số giao dịch
                </p>
                <p className="text-xl font-semibold tabular-nums">
                  {revenueQuery.data.transactionCount}
                </p>
              </div>
            </div>
            {revenueQuery.data.breakdown && revenueQuery.data.breakdown.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead className="bg-secondary/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">
                        {revenueQuery.data.groupBy === "month" ? "Tháng" : "Ngày"}
                      </th>
                      <th className="px-3 py-2 font-semibold">Doanh thu</th>
                      <th className="px-3 py-2 font-semibold">GD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueQuery.data.breakdown.map((row) => (
                      <tr key={`${row.day ?? row.month}`} className="border-t border-border">
                        <td className="px-3 py-2 tabular-nums">{row.day ?? row.month}</td>
                        <td className="px-3 py-2">{formatVnd(row.totalAmount)}</td>
                        <td className="px-3 py-2 tabular-nums">{row.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildModelCards(stats: DashboardStats) {
  const modelStats = (stats.modelStats ?? stats) as Record<
    string,
    { total?: number; totalRevenue?: number; byStatus?: Record<string, number> }
  >;

  const pick = (key: string, label: string, hintKey?: string) => {
    const item = modelStats[key];
    if (!item || typeof item.total !== "number") return null;
    let hint: string | undefined;
    if (hintKey && item.byStatus && typeof item.byStatus[hintKey] === "number") {
      hint = `${hintKey}: ${item.byStatus[hintKey]}`;
    }
    if (key === "payments" && typeof item.totalRevenue === "number") {
      hint = `PAID: ${formatVnd(item.totalRevenue)}`;
    }
    return { label, value: item.total, hint };
  };

  return [
    pick("users", "Người dùng", "ACTIVE"),
    pick("vehicles", "Xe", "ACTIVE"),
    pick("parkingSlots", "Chỗ đỗ", "AVAILABLE"),
    pick("parkingSessions", "Phiên đỗ", "ACTIVE"),
    pick("reservations", "Đặt chỗ", "PENDING"),
    pick("payments", "Thanh toán"),
    pick("monthlyCards", "Thẻ tháng", "ACTIVE"),
    pick("floors", "Tầng"),
  ].filter(Boolean) as Array<{ label: string; value: number; hint?: string }>;
}
