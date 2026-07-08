import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  Save,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getAllUsers, updateUserById, type UserProfile } from "@/services/user.service";
import {
  adminUpdateVehicle,
  getVehicleTypes,
  type Vehicle,
  type VehicleType,
} from "@/services/vehicle.service";

type UserDirectoryPanelProps = {
  className?: string;
  compact?: boolean;
  tableOnly?: boolean;
};

const pageSize = 100;
const licensePlatePattern = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/;

export function UserDirectoryPanel({
  className,
  compact = false,
  tableOnly = false,
}: UserDirectoryPanelProps) {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "LOCKED">("ACTIVE");
  const [editError, setEditError] = useState<string | null>(null);
  const [vehiclesUser, setVehiclesUser] = useState<UserProfile | null>(null);
  const [isVehiclesOpen, setIsVehiclesOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isVehicleEditOpen, setIsVehicleEditOpen] = useState(false);
  const [editVehiclePlate, setEditVehiclePlate] = useState("");
  const [editVehicleTypeId, setEditVehicleTypeId] = useState("");
  const [editVehicleStatus, setEditVehicleStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const usersQuery = useQuery({
    queryKey: ["users", { page, search }],
    queryFn: () =>
      getAllUsers({
        page,
        limit: pageSize,
        search,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
    enabled: hasMounted,
  });

  const vehicleTypesQuery = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: getVehicleTypes,
    enabled: hasMounted && (isVehiclesOpen || isVehicleEditOpen),
  });
  const vehicleTypes = vehicleTypesQuery.data ?? [];

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const totalCount = pagination?.totalCount ?? users.length;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: Parameters<typeof updateUserById>[1] }) =>
      updateUserById(userId, payload),
    onSuccess: async (updatedUser) => {
      setEditError(null);
      setIsEditing(false);
      setSelectedUser(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Cập nhật thành công", {
        description: `Thông tin của ${updatedUser.fullName} đã được cập nhật.`,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message ? error.message : "Không thể cập nhật người dùng.";
      setEditError(message);
      toast.error("Cập nhật thất bại", { description: message });
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: string;
      payload: Parameters<typeof adminUpdateVehicle>[1];
    }) => adminUpdateVehicle(vehicleId, payload),
    onSuccess: async (updatedVehicle) => {
      setEditVehicleError(null);
      setIsVehicleEditOpen(false);
      setEditingVehicle(null);

      const mergeVehicles = (user: UserProfile | null) => {
        if (!user) {
          return user;
        }
        const vehicles = (user.vehicles ?? []).map((vehicle) =>
          vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle,
        );
        return { ...user, vehicles };
      };

      setVehiclesUser((current) => mergeVehicles(current));
      setSelectedUser((current) => mergeVehicles(current));

      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Cập nhật xe thành công", {
        description: `${updatedVehicle.licensePlate} đã được cập nhật.`,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message ? error.message : "Không thể cập nhật xe.";
      setEditVehicleError(message);
      toast.error("Cập nhật xe thất bại", { description: message });
    },
  });

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleSelectUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsEditing(false);
    setEditError(null);
    setIsDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setIsEditing(false);
      setEditError(null);
    }
  };

  const startEditing = (user?: UserProfile) => {
    const targetUser = user ?? selectedUser;
    if (!targetUser) {
      return;
    }
    setEditError(null);
    setEditEmail(targetUser.email ?? "");
    setEditFullName(targetUser.fullName ?? "");
    setEditPhone(targetUser.phone ?? "");
    setEditStatus(targetUser.status === "LOCKED" ? "LOCKED" : "ACTIVE");
    setSelectedUser(targetUser);
    setIsEditing(true);
    setIsDetailOpen(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) {
      return;
    }
    setEditError(null);

    const email = editEmail.trim().toLowerCase();
    const fullName = editFullName.trim();
    const phone = editPhone.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEditError("Email không hợp lệ.");
      return;
    }
    if (fullName.length < 2 || fullName.length > 30) {
      setEditError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setEditError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }

    const payload: { email?: string; fullName?: string; phone?: string; status?: "ACTIVE" | "LOCKED" } = {};
    if (email !== selectedUser.email) {
      payload.email = email;
    }
    if (fullName !== selectedUser.fullName) {
      payload.fullName = fullName;
    }
    if (phone !== selectedUser.phone) {
      payload.phone = phone;
    }
    if (editStatus !== selectedUser.status) {
      payload.status = editStatus;
    }

    if (Object.keys(payload).length === 0) {
      setEditError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    updateUserMutation.mutate({ userId: selectedUser._id, payload });
  };

  const openVehiclesDialog = () => {
    if (!selectedUser) {
      return;
    }
    setVehiclesUser(selectedUser);
    setIsVehiclesOpen(true);
  };

  const handleVehiclesOpenChange = (open: boolean) => {
    setIsVehiclesOpen(open);
    if (!open) {
      setVehiclesUser(null);
    }
  };

  const startVehicleEditing = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditVehiclePlate(vehicle.licensePlate ?? "");
    setEditVehicleTypeId(getVehicleTypeId(vehicle) ?? "");
    setEditVehicleStatus(vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setEditVehicleError(null);
    setIsVehicleEditOpen(true);
  };

  const handleVehicleEditOpenChange = (open: boolean) => {
    setIsVehicleEditOpen(open);
    if (!open) {
      setEditingVehicle(null);
      setEditVehicleError(null);
    }
  };

  const handleVehicleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingVehicle) {
      return;
    }

    setEditVehicleError(null);
    const normalizedPlate = editVehiclePlate.trim().toUpperCase();
    if (!licensePlatePattern.test(normalizedPlate)) {
      setEditVehicleError("Biển số phải đúng định dạng 51A-123.45");
      return;
    }
    if (!editVehicleTypeId) {
      setEditVehicleError("Chọn loại xe.");
      return;
    }

    const payload: Parameters<typeof adminUpdateVehicle>[1] = {};
    if (normalizedPlate !== editingVehicle.licensePlate) {
      payload.licensePlate = normalizedPlate;
    }
    const currentTypeId = getVehicleTypeId(editingVehicle);
    if (editVehicleTypeId !== currentTypeId) {
      payload.vehicleTypeId = editVehicleTypeId;
    }
    const currentStatus = editingVehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE";
    if (editVehicleStatus !== currentStatus) {
      payload.status = editVehicleStatus;
    }

    if (Object.keys(payload).length === 0) {
      setEditVehicleError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    updateVehicleMutation.mutate({ vehicleId: editingVehicle._id, payload });
  };

  const fieldsDisabled = !isEditing;

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
            {totalCount} users
          </p>
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative w-48 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search"
                className="h-9 rounded-xl pl-8 text-sm"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={usersQuery.isFetching}
              onClick={() => void usersQuery.refetch()}
              aria-label="Refresh users"
            >
              <RefreshCw className={cn("size-4", usersQuery.isFetching && "animate-spin")} />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UsersRound className="size-4 text-primary" />
              Registered users
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{totalCount} accounts</div>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="flex min-w-0 flex-1 justify-end gap-2 sm:flex-none"
          >
            <div className="relative min-w-0 sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search users"
                className="h-9 rounded-xl pl-8 text-sm"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9 rounded-xl px-3">
              <Search className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={usersQuery.isFetching}
              onClick={() => void usersQuery.refetch()}
              className="h-9 rounded-xl px-3"
              aria-label="Refresh users"
            >
              <RefreshCw className={`size-3.5 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </form>
        </div>
      )}

      <div
        className={cn(
          "grid grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr_72px] gap-2 border-b border-border bg-card py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          tableOnly ? "px-1" : "px-5",
        )}
      >
        <span>User</span>
        <span>Email</span>
        <span>Role</span>
        <span>Status</span>
        <span>Joined</span>
        <span className="text-right">Edit</span>
      </div>

      <div
        className={cn(
          "divide-y divide-border",
          compact ? "max-h-[320px] overflow-y-auto" : "",
          tableOnly ? "min-h-0 flex-1 overflow-y-auto" : "",
        )}
      >
        {usersQuery.isLoading ? (
          <div className="flex items-center gap-2 px-5 py-5 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading users...
          </div>
        ) : usersQuery.error ? (
          <div className="px-5 py-5 text-sm text-destructive">
            {usersQuery.error instanceof Error ? usersQuery.error.message : "Unable to load users."}
          </div>
        ) : users.length > 0 ? (
          users.map((user) => (
            <UserRow
              key={user._id}
              user={user}
              onSelect={() => handleSelectUser(user)}
              onEdit={() => startEditing(user)}
            />
          ))
        ) : (
          <div className="px-5 py-5 text-sm text-muted-foreground">No users found.</div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-border py-3",
          tableOnly ? "mt-auto px-1" : "bg-background/30 px-5",
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
            disabled={!canGoBack || usersQuery.isFetching}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="h-8 rounded-xl px-3"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoNext || usersQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="rounded-2xl border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit user" : "User details"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Chỉnh sửa thông tin rồi bấm Save để lưu."
                : "Thông tin chi tiết của người dùng."}
            </DialogDescription>
          </DialogHeader>

          {selectedUser ? (
            <form onSubmit={handleEditSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="user-full-name">Họ tên</Label>
                <Input
                  id="user-full-name"
                  value={isEditing ? editFullName : selectedUser.fullName}
                  onChange={(event) => setEditFullName(event.target.value)}
                  className="h-11 rounded-xl"
                  disabled={fieldsDisabled}
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="user-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="user-email"
                      value={isEditing ? editEmail : selectedUser.email}
                      onChange={(event) => setEditEmail(event.target.value)}
                      type="email"
                      className="h-11 rounded-xl pl-9"
                      disabled={fieldsDisabled}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="user-phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="user-phone"
                      value={isEditing ? editPhone : selectedUser.phone}
                      onChange={(event) => setEditPhone(event.target.value.replace(/[^0-9]/g, ""))}
                      className="h-11 rounded-xl pl-9"
                      disabled={fieldsDisabled}
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="user-status">Status</Label>
                  {isEditing ? (
                    <Select
                      value={editStatus}
                      onValueChange={(value) => setEditStatus(value as "ACTIVE" | "LOCKED")}
                    >
                      <SelectTrigger id="user-status" className="h-11 rounded-xl">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                        <SelectItem value="LOCKED">LOCKED</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="user-status"
                      value={selectedUser.status}
                      className="h-11 rounded-xl"
                      disabled
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="user-joined">Joined</Label>
                <Input
                  id="user-joined"
                  value={formatDate(selectedUser.createdAt)}
                  className="h-11 rounded-xl"
                  disabled
                />
              </div>

              {editError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editError}
                </div>
              ) : null}

              {isEditing ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelEditing}
                    disabled={updateUserMutation.isPending}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    {updateUserMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={openVehiclesDialog}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    <Car className="size-4" />
                    View vehicles
                  </Button>
                  <Button
                    type="button"
                    onClick={() => startEditing()}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    <Pencil className="size-4" />
                    Edit profile
                  </Button>
                </div>
              )}
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isVehiclesOpen} onOpenChange={handleVehiclesOpenChange}>
        <DialogContent className="rounded-2xl border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>User vehicles</DialogTitle>
            <DialogDescription>
              {vehiclesUser
                ? `Danh sách xe của ${vehiclesUser.fullName}`
                : "Danh sách xe đã đăng ký"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-border">
            {(vehiclesUser?.vehicles ?? []).length > 0 ? (
              <div className="divide-y divide-border">
                {(vehiclesUser?.vehicles ?? []).map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold tracking-wide">
                        {vehicle.licensePlate}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {getVehicleTypeName(vehicle)} · {vehicle.status ?? "ACTIVE"}
                      </div>
                      <div className="mt-1">
                        <MonthlyCardDetails vehicle={vehicle} />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-9 rounded-xl px-3"
                      onClick={() => startVehicleEditing(vehicle)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Người dùng này chưa có xe đăng ký.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isVehicleEditOpen} onOpenChange={handleVehicleEditOpenChange}>
        <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit vehicle</DialogTitle>
            <DialogDescription>
              Cập nhật biển số, loại xe hoặc trạng thái xe.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVehicleEditSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="admin-vehicle-plate">Biển số</Label>
              <Input
                id="admin-vehicle-plate"
                value={editVehiclePlate}
                onChange={(event) => setEditVehiclePlate(event.target.value.toUpperCase())}
                className="h-11 rounded-xl font-mono tracking-wide"
                placeholder="51A-123.45"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-vehicle-type">Loại xe</Label>
              <Select value={editVehicleTypeId} onValueChange={setEditVehicleTypeId}>
                <SelectTrigger id="admin-vehicle-type" className="h-11 rounded-xl">
                  <SelectValue placeholder="Chọn loại xe" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map((type: VehicleType) => (
                    <SelectItem key={type._id} value={type._id}>
                      {type.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="admin-vehicle-status">Vehicle status</Label>
              <Select
                value={editVehicleStatus}
                onValueChange={(value) => setEditVehicleStatus(value as "ACTIVE" | "INACTIVE")}
              >
                <SelectTrigger id="admin-vehicle-status" className="h-11 rounded-xl">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 rounded-xl border border-border bg-background/40 p-3">
              <Label>Monthly card</Label>
              {editingVehicle ? <MonthlyCardDetails vehicle={editingVehicle} detailed /> : null}
            </div>

            {editVehicleError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editVehicleError}
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleVehicleEditOpenChange(false)}
                disabled={updateVehicleMutation.isPending}
                className="h-11 rounded-xl px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateVehicleMutation.isPending}
                className="h-11 rounded-xl px-4 text-[13px] font-semibold"
              >
                {updateVehicleMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function UserRow({
  user,
  onSelect,
  onEdit,
}: {
  user: UserProfile;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const roleName = getUserRoleName(user);
  const status = user.status || "UNKNOWN";

  return (
    <div className="grid grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr_72px] items-center gap-2 px-5 py-3.5 text-sm transition-colors hover:bg-secondary/60">
      <button
        type="button"
        onClick={onSelect}
        className="contents text-left focus:outline-none"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold">
            {getInitials(user.fullName)}
          </div>
          <span className="truncate font-medium">{user.fullName}</span>
        </div>
        <span className="truncate text-muted-foreground">{user.email}</span>
        <span className="truncate font-mono text-xs uppercase tracking-wide text-muted-foreground">
          {roleName}
        </span>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
            status === "ACTIVE"
              ? "bg-status-empty/15 text-status-empty"
              : "bg-status-full/15 text-status-full",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" />
          {status}
        </span>
        <span className="truncate font-mono text-xs text-muted-foreground">
          {formatDate(user.createdAt)}
        </span>
      </button>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onEdit}
          className="h-8 rounded-xl px-2.5"
          aria-label={`Edit ${user.fullName}`}
        >
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function getUserRoleName(user: UserProfile) {
  if (typeof user.roleId === "object" && user.roleId?.roleName) {
    return user.roleId.roleName;
  }
  return "UNKNOWN";
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "U";
}

function formatDate(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getVehicleTypeName(vehicle: Vehicle) {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }
  return "UNKNOWN";
}

function getVehicleTypeId(vehicle: Vehicle): string | null {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?._id) {
    return vehicle.vehicleTypeId._id;
  }
  if (typeof vehicle.vehicleTypeId === "string") {
    return vehicle.vehicleTypeId;
  }
  return null;
}

function MonthlyCardDetails({
  vehicle,
  detailed = false,
}: {
  vehicle: Vehicle;
  detailed?: boolean;
}) {
  if (!vehicle.monthlyCardId) {
    return (
      <div className="text-[11px] text-muted-foreground">Không có monthly card</div>
    );
  }

  if (typeof vehicle.monthlyCardId === "string") {
    return (
      <div className="font-mono text-[11px] text-muted-foreground">
        cardId: <span className="text-foreground">{vehicle.monthlyCardId}</span>
      </div>
    );
  }

  const { cardCode, status, createdAt, updatedAt } = vehicle.monthlyCardId;

  return (
    <div className="space-y-0.5 font-mono text-[11px] text-muted-foreground">
      <div>
        cardCode: <span className="text-foreground">{cardCode ?? "—"}</span>
      </div>
      <div>
        status: <span className="text-foreground">{status ?? "—"}</span>
      </div>
      {detailed ? (
        <>
          <div>
            createdAt:{" "}
            <span className="text-foreground">{formatDateTime(createdAt)}</span>
          </div>
          <div>
            updatedAt:{" "}
            <span className="text-foreground">{formatDateTime(updatedAt)}</span>
          </div>
        </>
      ) : null}
    </div>
  );
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
