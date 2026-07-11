import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PaymentDetailDialog } from "@/components/PaymentDetailDialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  cancelAdminPayment,
  deleteAdminPayment,
  getAdminPayments,
  getPaymentKindLabel,
  getPaymentLicensePlate,
  type AdminPayment,
  type PaymentStatus,
} from "@/services/adminPayment.service";
import { formatVnd } from "@/services/payment.service";

type PaymentListPanelProps = {
  className?: string;
  compact?: boolean;
  tableOnly?: boolean;
  allowDelete?: boolean;
  allowCancel?: boolean;
};

const pageSize = 12;
const statusFilterLabels: Record<PaymentStatus | "ALL", string> = {
  ALL: "Tất cả",
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã hủy",
};
const statusFilterOptions = Object.keys(statusFilterLabels) as Array<PaymentStatus | "ALL">;
const licensePlatePattern = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/;

export function PaymentListPanel({
  className,
  compact = false,
  tableOnly = false,
  allowDelete = false,
  allowCancel = false,
}: PaymentListPanelProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL");
  const [plateInput, setPlateInput] = useState("");
  const [plateQuery, setPlateQuery] = useState("");
  const [viewingPaymentId, setViewingPaymentId] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<AdminPayment | null>(null);
  const [cancellingPayment, setCancellingPayment] = useState<AdminPayment | null>(null);

  const showActions = allowDelete || allowCancel;

  const paymentsQuery = useQuery({
    queryKey: ["admin-payments", { page, statusFilter, plateQuery }],
    queryFn: () =>
      getAdminPayments({
        page,
        limit: pageSize,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        licensePlate: plateQuery || undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const payments = paymentsQuery.data?.payments ?? [];
  const pagination = paymentsQuery.data?.pagination;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const totalCount = pagination?.totalCount ?? payments.length;
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) => deleteAdminPayment(paymentId),
    onSuccess: async () => {
      setDeletingPayment(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-detail"] });
      toast.success("Đã xóa giao dịch thanh toán.");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Không xóa được giao dịch thanh toán.";
      toast.error("Xóa thất bại", { description: message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (paymentId: string) => cancelAdminPayment(paymentId),
    onSuccess: async () => {
      setCancellingPayment(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-payment-detail"] });
      toast.success("Đã hủy hóa đơn chờ thanh toán.");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Không hủy được hóa đơn chờ thanh toán.";
      toast.error("Hủy thất bại", { description: message });
    },
  });

  const headerMeta = plateQuery
    ? `${totalCount} giao dịch · biển số ${plateQuery}`
    : `${totalCount} giao dịch`;

  const filterToolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[220px] flex-1 items-end gap-2 sm:max-w-xs">
        <div className="flex-1 space-y-1">
          <Label htmlFor="payment-plate-filter" className="text-[10px] uppercase tracking-wider">
            Biển số
          </Label>
          <Input
            id="payment-plate-filter"
            value={plateInput}
            onChange={(event) => setPlateInput(event.target.value.toUpperCase())}
            placeholder="51A-123.45"
            className="h-9 rounded-xl font-mono text-[12px]"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitPlateSearch();
              }
            }}
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-9 shrink-0 rounded-xl"
          aria-label="Tìm theo biển số"
          onClick={submitPlateSearch}
        >
          <Search className="size-4" />
        </Button>
      </div>
      {plateQuery ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 rounded-xl"
          onClick={() => {
            setPlateInput("");
            setPlateQuery("");
            setPage(1);
          }}
        >
          Bỏ lọc biển số
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
            "api-tab px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-colors",
            statusFilter === option ? "" : "hover:bg-secondary",
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
        onClick={() => void paymentsQuery.refetch()}
        disabled={paymentsQuery.isFetching}
        aria-label="Làm mới danh sách thanh toán"
      >
        <RefreshCw className={cn("size-4", paymentsQuery.isFetching && "animate-spin")} />
      </Button>
    </div>
  );

  function submitPlateSearch() {
    const normalized = plateInput.trim().replace(/\s+/g, " ").toUpperCase();
    if (!normalized) {
      setPlateQuery("");
      setPage(1);
      return;
    }
    if (!licensePlatePattern.test(normalized)) {
      toast.error("Biển số không hợp lệ", {
        description: "Định dạng: 51A-123.45",
      });
      return;
    }
    setPlateQuery(normalized);
    setPage(1);
  }

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
            <h3 className="text-lg font-semibold text-foreground">Thanh toán</h3>
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
            "api-table-head grid gap-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
            showActions
              ? "grid-cols-[1fr_1fr_1fr_0.9fr_0.8fr_auto]"
              : "grid-cols-[1fr_1fr_1fr_0.9fr_0.8fr]",
            tableOnly ? "px-1" : "px-6",
          )}
        >
          <span>Mã đơn</span>
          <span>Biển số · Loại</span>
          <span>Số tiền</span>
          <span>Phương thức</span>
          <span>Trạng thái</span>
          {showActions ? <span className="w-9" /> : null}
        </div>

        <div className={cn("space-y-2 pb-4", tableOnly ? "px-0" : "px-4")}>
          {paymentsQuery.isLoading ? (
            <div className="api-empty flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Đang tải danh sách thanh toán...
            </div>
          ) : paymentsQuery.error ? (
            <div className="rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
              {paymentsQuery.error instanceof Error
                ? paymentsQuery.error.message
                : "Không thể tải danh sách thanh toán."}
            </div>
          ) : payments.length > 0 ? (
            payments.map((payment) => (
              <div
                key={payment._id}
                className={cn(
                  "api-row grid w-full items-center gap-4 rounded-xl px-5 py-4",
                  showActions
                    ? "grid-cols-[1fr_1fr_1fr_0.9fr_0.8fr_auto]"
                    : "grid-cols-[1fr_1fr_1fr_0.9fr_0.8fr]",
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewingPaymentId(payment._id)}
                  className="contents text-left hover:opacity-90 focus-visible:outline-none"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[12px] font-medium">
                      {payment.orderCode}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {formatDateTime(payment.createdAt)}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="truncate font-mono text-[12px] font-medium">
                      {getPaymentLicensePlate(payment) ?? "—"}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {getPaymentKindLabel(payment)}
                    </div>
                  </div>

                  <div className="truncate text-[12px] font-medium">
                    {formatVnd(payment.amount)}
                  </div>

                  <div className="truncate text-[12px] text-muted-foreground">
                    {getMethodLabel(payment.paymentMethod)}
                  </div>

                  <div>
                    <Badge
                      className={cn("border", getStatusBadgeClass(payment.status))}
                      variant="outline"
                    >
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </div>
                </button>

                {showActions && allowCancel && canCancelPayment(payment) ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-amber-600"
                    disabled={cancelMutation.isPending}
                    title="Hủy hóa đơn chờ thanh toán"
                    onClick={() => setCancellingPayment(payment)}
                  >
                    <XCircle className="size-4" />
                  </Button>
                ) : showActions && allowDelete && canDeletePayment(payment) ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={deleteMutation.isPending}
                    title="Xóa giao dịch"
                    onClick={() => setDeletingPayment(payment)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : showActions ? (
                  <span className="w-9" />
                ) : null}
              </div>
            ))
          ) : (
            <div className="api-empty px-4 py-6 text-sm text-muted-foreground">
              {plateQuery
                ? `Không có giao dịch nào cho biển số ${plateQuery}.`
                : statusFilter === "ALL"
                  ? "Không có giao dịch thanh toán nào."
                  : `Không có giao dịch với trạng thái ${statusFilterLabels[statusFilter]}.`}
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
            disabled={!canGoBack || paymentsQuery.isFetching}
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
            disabled={!canGoNext || paymentsQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Sau
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <PaymentDetailDialog
        paymentId={viewingPaymentId}
        open={viewingPaymentId !== null}
        allowCancel={allowCancel}
        onOpenChange={(open) => {
          if (!open) {
            setViewingPaymentId(null);
          }
        }}
      />

      <AlertDialog
        open={cancellingPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCancellingPayment(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hủy hóa đơn chờ thanh toán?</AlertDialogTitle>
            <AlertDialogDescription>
              Hóa đơn mã đơn <span className="font-mono">{cancellingPayment?.orderCode}</span> (
              {cancellingPayment ? formatVnd(cancellingPayment.amount) : ""}) sẽ chuyển sang trạng
              thái <strong>Đã hủy</strong>. Khách sẽ không thể thanh toán bằng mã QR này nữa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Đóng</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-600/90"
              onClick={(event) => {
                event.preventDefault();
                if (cancellingPayment) {
                  cancelMutation.mutate(cancellingPayment._id);
                }
              }}
            >
              {cancelMutation.isPending ? "Đang hủy..." : "Hủy hóa đơn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deletingPayment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPayment(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giao dịch thanh toán?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này sẽ xóa vĩnh viễn giao dịch mã đơn{" "}
              <span className="font-mono">{deletingPayment?.orderCode}</span> (
              {deletingPayment ? formatVnd(deletingPayment.amount) : ""}). Không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (deletingPayment) {
                  deleteMutation.mutate(deletingPayment._id);
                }
              }}
            >
              {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function canCancelPayment(payment: AdminPayment) {
  return payment.status === "PENDING";
}

function canDeletePayment(payment: AdminPayment) {
  return payment.status === "PAID" || payment.status === "CANCELLED";
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

function getStatusLabel(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "Chờ TT";
    case "PAID":
      return "Đã TT";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
}

function getMethodLabel(method: AdminPayment["paymentMethod"]) {
  switch (method) {
    case "CASH":
      return "Tiền mặt";
    case "CARD":
      return "Thẻ";
    case "TRANSFER":
      return "CK";
    default:
      return method;
  }
}

function getStatusBadgeClass(status: PaymentStatus) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/40 bg-amber-500/10 text-amber-600";
    case "PAID":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "CANCELLED":
      return "border-border bg-secondary/40 text-muted-foreground";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
