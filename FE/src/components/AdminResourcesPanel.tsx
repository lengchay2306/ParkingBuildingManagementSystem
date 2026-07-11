import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
import { DashboardClientPagination } from "@/components/dashboard-ui";
import { cn } from "@/lib/utils";
import {
  createFloor,
  deleteFloor,
  getAllFloors,
  getFloorById,
  updateFloor,
  type Floor,
} from "@/services/floor.service";
import {
  createAdminPricePolicy,
  deleteAdminPricePolicy,
  getAdminPricePolicies,
  getAdminPricePolicyById,
  updateAdminPricePolicy,
  type AdminPricePolicy,
} from "@/services/adminPricePolicy.service";
import {
  createAdminParkingSlot,
  deleteAdminParkingSlot,
  getAdminParkingSlotById,
  getAdminParkingSlots,
  updateAdminParkingSlot,
  type AdminParkingSlot,
  type AdminParkingSlotStatus,
} from "@/services/adminParkingSlot.service";
import {
  createAdminParkingSession,
  deleteAdminParkingSession,
  getAdminParkingSessionById,
  getAdminParkingSessions,
  updateAdminParkingSession,
  type AdminParkingSession,
} from "@/services/adminParkingSession.service";
import { getMyProfile } from "@/services/user.service";
import { getVehicleTypes } from "@/services/vehicle.service";

type AdminResourcesPanelProps = {
  className?: string;
};

type ResourceTab = "floors" | "prices" | "slots" | "sessions";

const ADMIN_LIST_PAGE_SIZE = 10;

const slotStatuses: AdminParkingSlotStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "UNAVAILABLE",
  "CURRENTLY-IN-USED",
];

export function AdminResourcesPanel({ className }: AdminResourcesPanelProps) {
  const [tab, setTab] = useState<ResourceTab>("floors");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="api-toolbar flex flex-wrap gap-2">
        {(
          [
            ["floors", "Tầng"],
            ["prices", "Bảng giá"],
            ["slots", "Chỗ đỗ"],
            ["sessions", "Phiên (admin)"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant="ghost"
            className="api-tab rounded-xl"
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "floors" ? <FloorsAdmin /> : null}
      {tab === "prices" ? <PricePoliciesAdmin /> : null}
      {tab === "slots" ? <SlotsAdmin /> : null}
      {tab === "sessions" ? <SessionsAdmin /> : null}
    </div>
  );
}

function FloorsAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const floorsQuery = useQuery({
    queryKey: ["admin-floors", page],
    queryFn: () => getAllFloors({ page, limit: ADMIN_LIST_PAGE_SIZE }),
  });
  const typesQuery = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: getVehicleTypes,
  });

  const [floorName, setFloorName] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [totalSlot, setTotalSlot] = useState("20");

  const createMutation = useMutation({
    mutationFn: createFloor,
    onSuccess: async () => {
      setFloorName("");
      setTotalSlot("20");
      await queryClient.invalidateQueries({ queryKey: ["admin-floors"] });
      toast.success("Đã tạo tầng");
    },
    onError: (error) => {
      toast.error("Không tạo được tầng", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-floors"] });
      toast.success("Đã xóa tầng");
    },
    onError: (error) => {
      toast.error("Không xóa được tầng", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!floorName.trim() || !vehicleTypeId) return;
    createMutation.mutate({
      floorName: floorName.trim(),
      vehicleTypeId,
      totalSlot: Number(totalSlot) || 0,
    });
  };

  return (
    <AdminCrudShell
      title="Quản lý tầng"
      onRefresh={() => void floorsQuery.refetch()}
      form={
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onCreate}>
          <Field label="Tên tầng">
            <Input
              value={floorName}
              onChange={(e) => setFloorName(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Loại xe">
            <Select value={vehicleTypeId} onValueChange={setVehicleTypeId}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Chọn loại" />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? []).map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Số chỗ">
            <Input
              type="number"
              min={0}
              value={totalSlot}
              onChange={(e) => setTotalSlot(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="h-9 rounded-xl" disabled={createMutation.isPending}>
              <Plus className="size-3.5" />
              Tạo
            </Button>
          </div>
        </form>
      }
    >
      <PaginatedResourceList
        loading={floorsQuery.isLoading}
        error={floorsQuery.error}
        empty="Chưa có tầng."
        items={floorsQuery.data?.floors ?? []}
        page={page}
        totalPages={Math.max(floorsQuery.data?.pagination?.totalPages ?? 1, 1)}
        totalItems={floorsQuery.data?.pagination?.totalCount}
        onPageChange={setPage}
        isFetching={floorsQuery.isFetching}
        renderItem={(floor: Floor) => (
          <div className="api-row flex items-center justify-between gap-3 rounded-xl px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                void getFloorById(floor._id)
                  .then((fresh) => {
                    toast.message(fresh.floorName, {
                      description: `${vehicleTypeLabel(fresh.vehicleTypeId)} · ${fresh.totalSlot} chỗ`,
                    });
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "Không tải được tầng.");
                  });
              }}
            >
              <p className="font-medium">{floor.floorName}</p>
              <p className="text-xs text-muted-foreground">
                {vehicleTypeLabel(floor.vehicleTypeId)} · {floor.totalSlot} chỗ · {floor._id}
              </p>
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const nextName = window.prompt("Tên tầng mới", floor.floorName);
                  if (!nextName?.trim()) return;
                  void updateFloor(floor._id, { floorName: nextName.trim() })
                    .then(async () => {
                      await queryClient.invalidateQueries({ queryKey: ["admin-floors"] });
                      toast.success("Đã cập nhật tầng");
                    })
                    .catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Không cập nhật được.");
                    });
                }}
              >
                Sửa
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Xóa tầng ${floor.floorName}?`)) {
                    deleteMutation.mutate(floor._id);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )}
      />
    </AdminCrudShell>
  );
}

function PricePoliciesAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const policiesQuery = useQuery({
    queryKey: ["admin-price-policies", page],
    queryFn: () => getAdminPricePolicies({ page, limit: ADMIN_LIST_PAGE_SIZE }),
  });
  const typesQuery = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: getVehicleTypes,
  });

  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [policyName, setPolicyName] = useState("");
  const [fromHour, setFromHour] = useState("0");
  const [toHour, setToHour] = useState("4");
  const [ratePerHour, setRatePerHour] = useState("10000");
  const [monthlyRate, setMonthlyRate] = useState("");

  const createMutation = useMutation({
    mutationFn: createAdminPricePolicy,
    onSuccess: async () => {
      setPolicyName("");
      await queryClient.invalidateQueries({ queryKey: ["admin-price-policies"] });
      toast.success("Đã tạo bảng giá");
    },
    onError: (error) => {
      toast.error("Không tạo được bảng giá", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminPricePolicy,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-price-policies"] });
      toast.success("Đã xóa bảng giá");
    },
    onError: (error) => {
      toast.error("Không xóa được bảng giá", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const onCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!vehicleTypeId || !policyName.trim()) return;
    createMutation.mutate({
      vehicleTypeId,
      policyName: policyName.trim(),
      fromHour: Number(fromHour),
      toHour: Number(toHour),
      ratePerHour: Number(ratePerHour),
      monthlyRate: monthlyRate.trim() ? Number(monthlyRate) : null,
    });
  };

  return (
    <AdminCrudShell
      title="Quản lý bảng giá"
      onRefresh={() => void policiesQuery.refetch()}
      form={
        <form className="grid gap-3 md:grid-cols-3 lg:grid-cols-6" onSubmit={onCreate}>
          <Field label="Loại xe">
            <Select value={vehicleTypeId} onValueChange={setVehicleTypeId}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                {(typesQuery.data ?? []).map((type) => (
                  <SelectItem key={type._id} value={type._id}>
                    {type.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tên policy">
            <Input
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Từ giờ">
            <Input
              type="number"
              min={0}
              value={fromHour}
              onChange={(e) => setFromHour(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Đến giờ">
            <Input
              type="number"
              min={0}
              value={toHour}
              onChange={(e) => setToHour(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Giá/giờ">
            <Input
              type="number"
              min={1}
              value={ratePerHour}
              onChange={(e) => setRatePerHour(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Giá tháng">
            <Input
              type="number"
              min={1}
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(e.target.value)}
              className="h-9 rounded-xl"
              placeholder="optional"
            />
          </Field>
          <div className="md:col-span-3 lg:col-span-6">
            <Button type="submit" className="h-9 rounded-xl" disabled={createMutation.isPending}>
              <Plus className="size-3.5" />
              Tạo bảng giá
            </Button>
          </div>
        </form>
      }
    >
      <PaginatedResourceList
        loading={policiesQuery.isLoading}
        error={policiesQuery.error}
        empty="Chưa có bảng giá."
        items={policiesQuery.data?.pricePolicies ?? []}
        page={page}
        totalPages={Math.max(policiesQuery.data?.pagination?.totalPages ?? 1, 1)}
        totalItems={policiesQuery.data?.pagination?.totalCount}
        onPageChange={setPage}
        isFetching={policiesQuery.isFetching}
        renderItem={(policy: AdminPricePolicy) => (
          <div className="api-row flex items-center justify-between gap-3 rounded-xl px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                void getAdminPricePolicyById(policy._id)
                  .then((fresh) => {
                    toast.message(fresh.policyName, {
                      description: `${fresh.ratePerHour.toLocaleString("vi-VN")}đ/h`,
                    });
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "Không tải được bảng giá.");
                  });
              }}
            >
              <p className="font-medium">{policy.policyName}</p>
              <p className="text-xs text-muted-foreground">
                {vehicleTypeLabel(policy.vehicleTypeId)} · {policy.fromHour}-{policy.toHour}h ·{" "}
                {policy.ratePerHour.toLocaleString("vi-VN")}đ/h
                {policy.monthlyRate != null
                  ? ` · tháng ${policy.monthlyRate.toLocaleString("vi-VN")}đ`
                  : ""}
              </p>
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const nextRate = window.prompt(
                    "Giá/giờ mới",
                    String(policy.ratePerHour),
                  );
                  if (!nextRate?.trim()) return;
                  void updateAdminPricePolicy(policy._id, {
                    ratePerHour: Number(nextRate),
                  })
                    .then(async () => {
                      await queryClient.invalidateQueries({ queryKey: ["admin-price-policies"] });
                      toast.success("Đã cập nhật bảng giá");
                    })
                    .catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Không cập nhật được.");
                    });
                }}
              >
                Sửa
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(`Xóa ${policy.policyName}?`)) {
                    deleteMutation.mutate(policy._id);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )}
      />
    </AdminCrudShell>
  );
}

function SlotsAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const floorsQuery = useQuery({
    queryKey: ["admin-floors", "options"],
    queryFn: () => getAllFloors({ page: 1, limit: 100 }),
  });
  const slotsQuery = useQuery({
    queryKey: ["admin-parking-slots", page],
    queryFn: () => getAdminParkingSlots({ page, limit: ADMIN_LIST_PAGE_SIZE }),
  });

  const [floorId, setFloorId] = useState("");
  const [slotNumber, setSlotNumber] = useState("");
  const [status, setStatus] = useState<AdminParkingSlotStatus>("AVAILABLE");

  const createMutation = useMutation({
    mutationFn: createAdminParkingSlot,
    onSuccess: async () => {
      setSlotNumber("");
      await queryClient.invalidateQueries({ queryKey: ["admin-parking-slots"] });
      toast.success("Đã tạo chỗ đỗ");
    },
    onError: (error) => {
      toast.error("Không tạo được chỗ đỗ", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      nextStatus,
    }: {
      id: string;
      nextStatus: AdminParkingSlotStatus;
    }) => updateAdminParkingSlot(id, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-parking-slots"] });
      toast.success("Đã cập nhật chỗ đỗ");
    },
    onError: (error) => {
      toast.error("Không cập nhật được chỗ đỗ", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminParkingSlot,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-parking-slots"] });
      toast.success("Đã xóa chỗ đỗ");
    },
    onError: (error) => {
      toast.error("Không xóa được chỗ đỗ", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const floorNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const floor of floorsQuery.data?.floors ?? []) {
      map.set(floor._id, floor.floorName);
    }
    return map;
  }, [floorsQuery.data]);

  return (
    <AdminCrudShell
      title="Quản lý chỗ đỗ"
      onRefresh={() => void slotsQuery.refetch()}
      form={
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!floorId || !slotNumber.trim()) return;
            createMutation.mutate({
              floorId,
              slotNumber: slotNumber.trim(),
              status,
            });
          }}
        >
          <Field label="Tầng">
            <Select value={floorId} onValueChange={setFloorId}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Chọn tầng" />
              </SelectTrigger>
              <SelectContent>
                {(floorsQuery.data?.floors ?? []).map((floor) => (
                  <SelectItem key={floor._id} value={floor._id}>
                    {floor.floorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Số chỗ">
            <Input
              value={slotNumber}
              onChange={(e) => setSlotNumber(e.target.value)}
              className="h-9 rounded-xl"
              required
            />
          </Field>
          <Field label="Trạng thái">
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as AdminParkingSlotStatus)}
            >
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slotStatuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="h-9 rounded-xl" disabled={createMutation.isPending}>
              <Plus className="size-3.5" />
              Tạo
            </Button>
          </div>
        </form>
      }
    >
      <PaginatedResourceList
        loading={slotsQuery.isLoading}
        error={slotsQuery.error}
        empty="Chưa có chỗ đỗ."
        items={slotsQuery.data?.parkingSlots ?? []}
        page={page}
        totalPages={Math.max(slotsQuery.data?.pagination?.totalPages ?? 1, 1)}
        totalItems={slotsQuery.data?.pagination?.totalCount}
        onPageChange={setPage}
        isFetching={slotsQuery.isFetching}
        renderItem={(slot: AdminParkingSlot) => {
          const floorKey =
            typeof slot.floorId === "string" ? slot.floorId : slot.floorId?._id ?? "";
          const floorLabel =
            typeof slot.floorId === "object" && slot.floorId?.floorName
              ? slot.floorId.floorName
              : floorNameById.get(floorKey) ?? floorKey;
          return (
            <div className="api-row flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => {
                  void getAdminParkingSlotById(slot._id)
                    .then((fresh) => {
                      toast.message(fresh.slotNumber, { description: fresh.status });
                    })
                    .catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Không tải được chỗ đỗ.");
                    });
                }}
              >
                <p className="font-medium">{slot.slotNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {floorLabel} · {slot.status}
                </p>
              </button>
              <div className="flex items-center gap-2">
                <Select
                  value={slot.status}
                  onValueChange={(value) =>
                    updateMutation.mutate({
                      id: slot._id,
                      nextStatus: value as AdminParkingSlotStatus,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-44 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {slotStatuses.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm(`Xóa chỗ ${slot.slotNumber}?`)) {
                      deleteMutation.mutate(slot._id);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        }}
      />
    </AdminCrudShell>
  );
}

function SessionsAdmin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });
  const slotsQuery = useQuery({
    queryKey: ["admin-parking-slots", "options"],
    queryFn: () => getAdminParkingSlots({ page: 1, limit: 100 }),
  });
  const sessionsQuery = useQuery({
    queryKey: ["admin-parking-sessions", page],
    queryFn: () => getAdminParkingSessions({ page, limit: ADMIN_LIST_PAGE_SIZE }),
  });

  const [parkingSlotId, setParkingSlotId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [sessionType, setSessionType] = useState<"DAILY" | "MONTH">("DAILY");

  const createMutation = useMutation({
    mutationFn: createAdminParkingSession,
    onSuccess: async () => {
      setLicensePlate("");
      await queryClient.invalidateQueries({ queryKey: ["admin-parking-sessions"] });
      toast.success("Đã tạo phiên admin");
    },
    onError: (error) => {
      toast.error("Không tạo được phiên", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminParkingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-parking-sessions"] });
      toast.success("Đã xóa phiên");
    },
    onError: (error) => {
      toast.error("Không xóa được phiên", {
        description: error instanceof Error ? error.message : "Thử lại.",
      });
    },
  });

  return (
    <AdminCrudShell
      title="Quản lý phiên (CRUD admin)"
      onRefresh={() => void sessionsQuery.refetch()}
      form={
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const staffId = profileQuery.data?._id;
            if (!staffId || !parkingSlotId) {
              toast.error("Thiếu profile hoặc chỗ đỗ.");
              return;
            }
            createMutation.mutate({
              parkingSlotId,
              sessionType,
              checkInStaffId: staffId,
              status: "ACTIVE",
              licensePlate: licensePlate.trim() || null,
              isGuest: true,
            });
          }}
        >
          <Field label="Chỗ đỗ">
            <Select value={parkingSlotId} onValueChange={setParkingSlotId}>
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue placeholder="Chọn slot" />
              </SelectTrigger>
              <SelectContent>
                {(slotsQuery.data?.parkingSlots ?? []).map((slot) => (
                  <SelectItem key={slot._id} value={slot._id}>
                    {slot.slotNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Loại phiên">
            <Select
              value={sessionType}
              onValueChange={(value) => setSessionType(value as "DAILY" | "MONTH")}
            >
              <SelectTrigger className="h-9 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">DAILY</SelectItem>
                <SelectItem value="MONTH">MONTH</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Biển số (optional)">
            <Input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              className="h-9 rounded-xl"
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" className="h-9 rounded-xl" disabled={createMutation.isPending}>
              <Plus className="size-3.5" />
              Tạo
            </Button>
          </div>
        </form>
      }
    >
      <PaginatedResourceList
        loading={sessionsQuery.isLoading}
        error={sessionsQuery.error}
        empty="Chưa có phiên admin."
        items={sessionsQuery.data?.parkingSessions ?? []}
        page={page}
        totalPages={Math.max(sessionsQuery.data?.pagination?.totalPages ?? 1, 1)}
        totalItems={sessionsQuery.data?.pagination?.totalCount}
        onPageChange={setPage}
        isFetching={sessionsQuery.isFetching}
        renderItem={(session: AdminParkingSession) => (
          <div className="api-row flex items-center justify-between gap-3 rounded-xl px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                void getAdminParkingSessionById(session._id)
                  .then((fresh) => {
                    toast.message(fresh.licensePlate || fresh._id, {
                      description: `${fresh.sessionType} · ${fresh.status}`,
                    });
                  })
                  .catch((error) => {
                    toast.error(error instanceof Error ? error.message : "Không tải được phiên.");
                  });
              }}
            >
              <p className="font-medium">
                {session.licensePlate ||
                  (typeof session.vehicleId === "object"
                    ? session.vehicleId?.licensePlate
                    : null) ||
                  session._id}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.sessionType} · {session.status}
              </p>
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  void updateAdminParkingSession(session._id, {
                    status: session.status === "ACTIVE" ? "COMPLETED" : "ACTIVE",
                  })
                    .then(async () => {
                      await queryClient.invalidateQueries({ queryKey: ["admin-parking-sessions"] });
                      toast.success("Đã cập nhật trạng thái phiên");
                    })
                    .catch((error) => {
                      toast.error(error instanceof Error ? error.message : "Không cập nhật được.");
                    });
                }}
              >
                Đổi TT
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (window.confirm("Xóa phiên admin này?")) {
                    deleteMutation.mutate(session._id);
                  }
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        )}
      />
    </AdminCrudShell>
  );
}

function AdminCrudShell({
  title,
  onRefresh,
  form,
  children,
}: {
  title: string;
  onRefresh: () => void;
  form: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="api-section space-y-4 p-4 md:p-5">
      <div className="api-header -mx-4 -mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:-mx-5 md:-mt-5 md:px-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={onRefresh}>
          <RefreshCw className="size-3.5" />
          Làm mới
        </Button>
      </div>
      {form}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase tracking-[0.14em]">{label}</Label>
      {children}
    </div>
  );
}

function PaginatedResourceList<T extends { _id: string }>({
  loading,
  error,
  empty,
  items,
  renderItem,
  page,
  totalPages,
  totalItems,
  onPageChange,
  isFetching = false,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  isFetching?: boolean;
}) {
  return (
    <div className="space-y-3">
      <ResourceList
        loading={loading}
        error={error}
        empty={empty}
        items={items}
        renderItem={renderItem}
      />
      <DashboardClientPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={onPageChange}
        disabled={loading || isFetching}
      />
    </div>
  );
}

function ResourceList<T extends { _id: string }>({
  loading,
  error,
  empty,
  items,
  renderItem,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        Đang tải...
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        {error instanceof Error ? error.message : "Không tải được dữ liệu."}
      </p>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return <div className="space-y-2">{items.map((item) => <div key={item._id}>{renderItem(item)}</div>)}</div>;
}

function vehicleTypeLabel(value?: string | { _id?: string; type?: string }) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.type ?? value._id ?? "—";
}
