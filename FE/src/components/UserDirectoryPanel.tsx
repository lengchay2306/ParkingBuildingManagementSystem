import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  Trash2,
  UsersRound,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { getUserDeletionBlockers } from "@/lib/user-deletion";
import { fetchActiveParkingSessions } from "@/services/parking.service";
import { fetchAllReservationsPages } from "@/services/reservation.service";
import {
  createUser,
  deleteUserById,
  getAllUsers,
  getUserById,
  updateUserById,
  type UserProfile,
  type UserRole,
} from "@/services/user.service";
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
  allowDelete?: boolean;
  allowCreate?: boolean;
};

const pageSize = 100;
const licensePlatePattern = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/;

export function UserDirectoryPanel({
  className,
  compact = false,
  tableOnly = false,
  allowDelete = false,
  allowCreate = false,
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
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehiclePlate, setEditVehiclePlate] = useState("");
  const [editVehicleTypeId, setEditVehicleTypeId] = useState("");
  const [editVehicleStatus, setEditVehicleStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createRoleId, setCreateRoleId] = useState("");
  const [createStatus, setCreateStatus] = useState<"ACTIVE" | "LOCKED">("ACTIVE");
  const [createError, setCreateError] = useState<string | null>(null);
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

  const deletionBlockerDataQuery = useQuery({
    queryKey: ["user-deletion-blocker-data"],
    queryFn: async () => {
      const [activeSessions, pendingReservations] = await Promise.all([
        fetchActiveParkingSessions(),
        fetchAllReservationsPages({ status: "PENDING" }),
      ]);
      return { activeSessions, pendingReservations };
    },
    enabled: hasMounted && allowDelete,
    staleTime: 30_000,
  });

  const vehicleTypesQuery = useQuery({
    queryKey: ["vehicle-types"],
    queryFn: getVehicleTypes,
    enabled: hasMounted && (isDetailOpen || editingVehicle !== null),
  });
  const vehicleTypes = vehicleTypesQuery.data ?? [];

  const users = usersQuery.data?.users ?? [];
  const roleOptions = useMemo(() => getRoleOptions(users), [users]);
  const pagination = usersQuery.data?.pagination;
  const activeSessions = deletionBlockerDataQuery.data?.activeSessions ?? [];
  const pendingReservations = deletionBlockerDataQuery.data?.pendingReservations ?? [];

  const getDeletionBlockersForUser = (user: UserProfile) =>
    getUserDeletionBlockers(user, activeSessions, pendingReservations);

  const selectedUserDeletionBlockers = selectedUser
    ? getDeletionBlockersForUser(selectedUser)
    : null;
  const deletingUserDeletionBlockers = deletingUser
    ? getDeletionBlockersForUser(deletingUser)
    : null;

  useEffect(() => {
    if (isCreateOpen && !createRoleId && roleOptions.length > 0) {
      const defaultRole =
        roleOptions.find((role) => role.roleName === "CUSTOMER") ?? roleOptions[0];
      setCreateRoleId(defaultRole._id);
    }
  }, [isCreateOpen, createRoleId, roleOptions]);

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
      setEditingVehicle(null);

      setSelectedUser((current) => {
        if (!current) {
          return current;
        }
        const vehicles = (current.vehicles ?? []).map((vehicle) =>
          vehicle._id === updatedVehicle._id ? updatedVehicle : vehicle,
        );
        return { ...current, vehicles };
      });

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

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUserById(userId),
    onSuccess: async (deletedUser) => {
      setDeletingUser(null);
      setIsDetailOpen(false);
      setSelectedUser(null);
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Xóa thành công", {
        description: `${deletedUser.fullName} và toàn bộ xe đã được xóa.`,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message ? error.message : "Không thể xóa người dùng.";
      toast.error("Xóa thất bại", { description: message });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createUser>[0]) => createUser(payload),
    onSuccess: async (createdUser) => {
      setCreateError(null);
      setIsCreateOpen(false);
      resetCreateForm();
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Tạo tài khoản thành công", {
        description: `${createdUser.fullName} đã được tạo.`,
      });
    },
    onError: (error) => {
      const message =
        error instanceof Error && error.message ? error.message : "Không thể tạo tài khoản.";
      setCreateError(message);
      toast.error("Tạo tài khoản thất bại", { description: message });
    },
  });

  const resetCreateForm = () => {
    setCreateEmail("");
    setCreatePassword("");
    setCreateFullName("");
    setCreatePhone("");
    setCreateRoleId("");
    setCreateStatus("ACTIVE");
    setCreateError(null);
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      resetCreateForm();
    } else if (!createRoleId) {
      const defaultRole =
        roleOptions.find((role) => role.roleName === "CUSTOMER") ?? roleOptions[0];
      if (defaultRole) {
        setCreateRoleId(defaultRole._id);
      }
    }
  };

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);

    const email = createEmail.trim().toLowerCase();
    const fullName = createFullName.trim();
    const phone = createPhone.trim();
    const password = createPassword;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCreateError("Email không hợp lệ.");
      return;
    }
    if (password.length < 8) {
      setCreateError("Mật khẩu phải có ít nhất 8 kí tự.");
      return;
    }
    if (fullName.length < 2 || fullName.length > 30) {
      setCreateError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setCreateError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }
    if (!createRoleId) {
      setCreateError("Chọn vai trò cho tài khoản.");
      return;
    }

    createUserMutation.mutate({
      email,
      password,
      fullName,
      phone,
      roleId: createRoleId,
      status: createStatus,
    });
  };

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
    void getUserById(user._id)
      .then((fresh) => {
        setSelectedUser(fresh);
      })
      .catch(() => {
        // keep list payload if detail fetch fails
      });
  };

  const handleDeleteRequest = (user: UserProfile) => {
    const blockers = getDeletionBlockersForUser(user);
    if (!blockers.canDelete) {
      toast.error("Không thể xóa người dùng", {
        description: blockers.message ?? "Người dùng đang có xe trong bãi hoặc đặt chỗ.",
      });
      return;
    }
    setDeletingUser(user);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setIsDetailOpen(open);
    if (!open) {
      setIsEditing(false);
      setEditError(null);
      cancelVehicleEditing();
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

  const startVehicleEditing = (vehicle: Vehicle) => {
    if (editingVehicle?._id === vehicle._id) {
      return;
    }
    setEditingVehicle(vehicle);
    setEditVehiclePlate(vehicle.licensePlate ?? "");
    setEditVehicleTypeId(getVehicleTypeId(vehicle) ?? "");
    setEditVehicleStatus(vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE");
    setEditVehicleError(null);
  };

  const cancelVehicleEditing = () => {
    setEditingVehicle(null);
    setEditVehicleError(null);
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
        tableOnly ? "flex h-full min-h-0 flex-col" : "api-section overflow-hidden p-0",
        className,
      )}
    >
      {tableOnly ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {totalCount} người dùng
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {allowCreate ? (
              <Button
                type="button"
                size="sm"
                onClick={() => handleCreateOpenChange(true)}
                className="h-9 rounded-xl px-3 text-[13px] font-semibold"
              >
                <UserPlus className="size-3.5" />
                Tạo tài khoản
              </Button>
            ) : null}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative w-48 sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm kiếm"
                  className="h-9 rounded-xl pl-8 text-sm"
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={usersQuery.isFetching}
                onClick={() => void usersQuery.refetch()}
                aria-label="Làm mới danh sách người dùng"
              >
                <RefreshCw className={cn("size-4", usersQuery.isFetching && "animate-spin")} />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="api-header flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-foreground">
              <UsersRound className="size-4 text-primary" />
              Người dùng đã đăng ký
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{totalCount} tài khoản</div>
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
                placeholder="Tìm người dùng"
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
              aria-label="Làm mới danh sách người dùng"
            >
              <RefreshCw className={`size-3.5 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </form>
        </div>
      )}

      <div
        className={cn(
          "api-table-head grid gap-2 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
          allowDelete
            ? "grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr_48px]"
            : "grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr]",
          tableOnly ? "px-1" : "px-5",
        )}
      >
        <span>Người dùng</span>
        <span>Email</span>
        <span>Vai trò</span>
        <span>Trạng thái</span>
        <span>Tham gia</span>
        {allowDelete ? <span className="text-right">Xóa</span> : null}
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
            Đang tải người dùng...
          </div>
        ) : usersQuery.error ? (
          <div className="px-5 py-5 text-sm text-destructive">
            {usersQuery.error instanceof Error ? usersQuery.error.message : "Không thể tải danh sách người dùng."}
          </div>
        ) : users.length > 0 ? (
          users.map((user) => {
            const deletionBlockers = getDeletionBlockersForUser(user);
            return (
            <UserRow
              key={user._id}
              user={user}
              allowDelete={allowDelete}
              deleteDisabled={!deletionBlockers.canDelete}
              deleteDisabledReason={deletionBlockers.message}
              onSelect={() => handleSelectUser(user)}
              onDelete={() => handleDeleteRequest(user)}
            />
            );
          })
        ) : (
          <div className="px-5 py-5 text-sm text-muted-foreground">Không tìm thấy người dùng.</div>
        )}
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-t border-border py-3",
          tableOnly ? "mt-auto px-1" : "bg-background/30 px-5",
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
            disabled={!canGoBack || usersQuery.isFetching}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="h-8 rounded-xl px-3"
          >
            <ChevronLeft className="size-3.5" />
            Trước
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canGoNext || usersQuery.isFetching}
            onClick={() => setPage((current) => current + 1)}
            className="h-8 rounded-xl px-3"
          >
            Sau
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={isDetailOpen} onOpenChange={handleDetailOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-2xl">
          <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>{isEditing ? "Sửa người dùng" : "Chi tiết người dùng"}</DialogTitle>
              <DialogDescription>
                {isEditing
                  ? "Chỉnh sửa thông tin rồi bấm Lưu để lưu."
                  : "Thông tin chi tiết và danh sách xe của người dùng."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {selectedUser ? (
            <form onSubmit={handleEditSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {allowDelete && selectedUserDeletionBlockers && !selectedUserDeletionBlockers.canDelete ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <p className="font-medium text-amber-50">Không thể xóa tài khoản này</p>
                  <p className="mt-1 text-amber-100/90">
                    {selectedUserDeletionBlockers.message}
                  </p>
                </div>
              ) : null}
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
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="user-email">Email</Label>
                  <div className="relative min-w-0">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    {isEditing ? (
                      <Input
                        id="user-email"
                        value={editEmail}
                        onChange={(event) => setEditEmail(event.target.value)}
                        type="email"
                        className="h-11 rounded-xl pl-9"
                        disabled={fieldsDisabled}
                        autoComplete="email"
                      />
                    ) : (
                      <div
                        id="user-email"
                        className="flex min-h-11 w-full min-w-0 items-center rounded-xl border border-border/70 bg-secondary/45 py-2 pl-9 pr-3 text-sm break-all text-foreground"
                        title={selectedUser.email}
                      >
                        {selectedUser.email}
                      </div>
                    )}
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

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Vai trò</Label>
                  <Input
                    id="user-role"
                    value={getUserRoleName(selectedUser)}
                    className="h-11 rounded-xl"
                    disabled
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="user-status">Trạng thái</Label>
                  {isEditing ? (
                    <Select
                      value={editStatus}
                      onValueChange={(value) => setEditStatus(value as "ACTIVE" | "LOCKED")}
                    >
                      <SelectTrigger id="user-status" className="h-11 rounded-xl">
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                        <SelectItem value="LOCKED">Đã khóa</SelectItem>
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
                <Label htmlFor="user-joined">Ngày tham gia</Label>
                <Input
                  id="user-joined"
                  value={formatDate(selectedUser.createdAt)}
                  className="h-11 rounded-xl"
                  disabled
                />
              </div>

              {!isEditing ? (
                <div className="grid gap-2">
                  <Label>
                    <span className="inline-flex items-center gap-1.5">
                      <Car className="size-3.5" />
                      Xe đã đăng ký ({selectedUser.vehicles?.length ?? 0})
                    </span>
                  </Label>
                  <div className="rounded-xl border border-border/70 bg-card/60">
                    {(selectedUser.vehicles ?? []).length > 0 ? (
                      <div className="divide-y divide-border">
                        {(selectedUser.vehicles ?? []).map((vehicle) => (
                          <div key={vehicle._id} className="px-4 py-3">
                            {editingVehicle?._id === vehicle._id ? (
                              <form onSubmit={handleVehicleEditSubmit} className="grid gap-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label htmlFor={`vehicle-plate-${vehicle._id}`}>Biển số</Label>
                                    <Input
                                      id={`vehicle-plate-${vehicle._id}`}
                                      value={editVehiclePlate}
                                      onChange={(event) =>
                                        setEditVehiclePlate(event.target.value.toUpperCase())
                                      }
                                      className="h-10 rounded-xl font-mono tracking-wide"
                                      placeholder="51A-123.45"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor={`vehicle-type-${vehicle._id}`}>Loại xe</Label>
                                    <Select
                                      value={editVehicleTypeId}
                                      onValueChange={setEditVehicleTypeId}
                                    >
                                      <SelectTrigger
                                        id={`vehicle-type-${vehicle._id}`}
                                        className="h-10 rounded-xl"
                                      >
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
                                </div>

                                <div className="grid gap-2">
                                  <Label htmlFor={`vehicle-status-${vehicle._id}`}>Trạng thái xe</Label>
                                  <Select
                                    value={editVehicleStatus}
                                    onValueChange={(value) =>
                                      setEditVehicleStatus(value as "ACTIVE" | "INACTIVE")
                                    }
                                  >
                                    <SelectTrigger
                                      id={`vehicle-status-${vehicle._id}`}
                                      className="h-10 rounded-xl"
                                    >
                                      <SelectValue placeholder="Chọn trạng thái" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                                      <SelectItem value="INACTIVE">Ngừng hoạt động</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                                  <Label className="text-xs">Thẻ tháng</Label>
                                  <div className="mt-1">
                                    <MonthlyCardDetails vehicle={vehicle} detailed />
                                  </div>
                                </div>

                                {editVehicleError ? (
                                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                    {editVehicleError}
                                  </div>
                                ) : null}

                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    onClick={cancelVehicleEditing}
                                    disabled={updateVehicleMutation.isPending}
                                    className="h-9 rounded-xl px-3"
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    type="submit"
                                    size="sm"
                                    disabled={updateVehicleMutation.isPending}
                                    className="h-9 rounded-xl px-3"
                                  >
                                    {updateVehicleMutation.isPending ? (
                                      <>
                                        <LoaderCircle className="size-3.5 animate-spin" />
                                        Đang lưu...
                                      </>
                                    ) : (
                                      <>
                                        <Save className="size-3.5" />
                                        Lưu
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-3">
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
                                  disabled={editingVehicle !== null}
                                >
                                  <Pencil className="size-3.5" />
                                  Sửa
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Người dùng này chưa có xe đăng ký.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {editError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {editError}
                </div>
              ) : null}
              </div>

              {isEditing ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelEditing}
                    disabled={updateUserMutation.isPending}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    <X className="size-4" />
                    Hủy
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
                        Lưu
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
                  <Button
                    type="button"
                    onClick={() => startEditing()}
                    className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                  >
                    <Pencil className="size-4" />
                    Sửa hồ sơ
                  </Button>
                  {allowDelete ? (
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={selectedUserDeletionBlockers ? !selectedUserDeletionBlockers.canDelete : false}
                      title={
                        selectedUserDeletionBlockers && !selectedUserDeletionBlockers.canDelete
                          ? (selectedUserDeletionBlockers.message ?? undefined)
                          : undefined
                      }
                      onClick={() => handleDeleteRequest(selectedUser)}
                      className="h-11 rounded-xl px-4 text-[13px] font-semibold"
                    >
                      <Trash2 className="size-4" />
                      Xóa
                    </Button>
                  ) : null}
                </div>
              )}
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-2xl">
          <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>Tạo tài khoản</DialogTitle>
              <DialogDescription>
                Tạo tài khoản người dùng mới.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleCreateSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-full-name">Họ tên</Label>
                <Input
                  id="create-full-name"
                  value={createFullName}
                  onChange={(event) => setCreateFullName(event.target.value)}
                  className="h-11 rounded-xl"
                  placeholder="Nguyễn Văn A"
                  autoComplete="name"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="create-email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="create-email"
                      value={createEmail}
                      onChange={(event) => setCreateEmail(event.target.value)}
                      type="email"
                      className="h-11 rounded-xl pl-9"
                      placeholder="user@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="create-phone">Số điện thoại</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="create-phone"
                      value={createPhone}
                      onChange={(event) => setCreatePhone(event.target.value.replace(/[^0-9]/g, ""))}
                      className="h-11 rounded-xl pl-9"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="0901234567"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="create-password">Mật khẩu</Label>
                <Input
                  id="create-password"
                  value={createPassword}
                  onChange={(event) => setCreatePassword(event.target.value)}
                  type="password"
                  className="h-11 rounded-xl"
                  placeholder="Tối thiểu 8 kí tự"
                  autoComplete="new-password"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="create-role">Vai trò</Label>
                  <Select value={createRoleId} onValueChange={setCreateRoleId}>
                    <SelectTrigger id="create-role" className="h-11 rounded-xl">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((role) => (
                        <SelectItem key={role._id} value={role._id}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="create-status">Trạng thái</Label>
                  <Select
                    value={createStatus}
                    onValueChange={(value) => setCreateStatus(value as "ACTIVE" | "LOCKED")}
                  >
                    <SelectTrigger id="create-status" className="h-11 rounded-xl">
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                      <SelectItem value="LOCKED">Đã khóa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {createError ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createError}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleCreateOpenChange(false)}
                disabled={createUserMutation.isPending}
                className="h-11 rounded-xl px-4 text-[13px] font-semibold"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending || roleOptions.length === 0}
                className="h-11 rounded-xl px-4 text-[13px] font-semibold"
              >
                {createUserMutation.isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    Tạo tài khoản
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingUser(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/70 bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deletingUserDeletionBlockers && !deletingUserDeletionBlockers.canDelete
                ? "Không thể xóa người dùng"
                : "Bạn có chắc chắn muốn xóa?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUserDeletionBlockers && !deletingUserDeletionBlockers.canDelete
                ? deletingUserDeletionBlockers.message
                : deletingUser
                  ? `Người dùng "${deletingUser.fullName}" và toàn bộ ${deletingUser.vehicles?.length ?? 0} xe sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
                  : "Người dùng và toàn bộ xe sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {deletingUserDeletionBlockers && !deletingUserDeletionBlockers.canDelete
                ? "Đóng"
                : "Hủy"}
            </AlertDialogCancel>
            {deletingUserDeletionBlockers?.canDelete !== false ? (
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                if (!deletingUser || deleteUserMutation.isPending) {
                  return;
                }
                deleteUserMutation.mutate(deletingUser._id);
              }}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function UserRow({
  user,
  allowDelete,
  deleteDisabled = false,
  deleteDisabledReason,
  onSelect,
  onDelete,
}: {
  user: UserProfile;
  allowDelete?: boolean;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string | null;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const roleName = getUserRoleName(user);
  const status = user.status || "UNKNOWN";

  const rowContent = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/15 font-mono text-[11px] font-semibold text-primary">
          {getInitials(user.fullName)}
        </div>
        <span className="truncate font-medium">{user.fullName}</span>
      </div>
      <span className="min-w-0 break-all text-muted-foreground" title={user.email}>
        {user.email}
      </span>
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
    </>
  );

  if (allowDelete) {
    return (
      <div
        className={cn(
          "api-row grid items-center gap-2 px-5 py-3.5 text-sm transition-colors",
          "grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr_48px]",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          className="col-span-5 grid cursor-pointer grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr] items-center gap-2 rounded-lg text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Xem hồ sơ ${user.fullName}`}
        >
          {rowContent}
        </button>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={deleteDisabled}
            title={deleteDisabled ? (deleteDisabledReason ?? "Không thể xóa người dùng này") : undefined}
            onClick={onDelete}
            className="h-8 rounded-xl px-2.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
            aria-label={
              deleteDisabled
                ? `Không thể xóa ${user.fullName}`
                : `Xóa ${user.fullName}`
            }
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "api-row grid w-full grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr_0.75fr] items-center gap-2 px-5 py-3.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
      aria-label={`Xem hồ sơ ${user.fullName}`}
    >
      {rowContent}
    </button>
  );
}

function getRoleOptions(users: UserProfile[]): UserRole[] {
  const map = new Map<string, string>();
  for (const user of users) {
    if (typeof user.roleId === "object" && user.roleId?._id && user.roleId?.roleName) {
      map.set(user.roleId._id, user.roleId.roleName);
    }
  }
  return Array.from(map.entries())
    .map(([id, roleName]) => ({ _id: id, roleName }))
    .sort((a, b) => a.roleName.localeCompare(b.roleName));
}

function getUserRoleName(user: UserProfile) {
  if (typeof user.roleId === "object" && user.roleId?.roleName) {
    return user.roleId.roleName;
  }
  return "Không xác định";
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
    return "Không có";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Không có";
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
  return "Không xác định";
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
      <div className="text-[11px] text-muted-foreground">Không có thẻ tháng</div>
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
