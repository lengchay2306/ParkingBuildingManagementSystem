import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
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

type UserDirectoryPanelProps = {
  className?: string;
  compact?: boolean;
};

type RoleOption = {
  _id: string;
  roleName: string;
};

const pageSize = 100;

export function UserDirectoryPanel({ className, compact = false }: UserDirectoryPanelProps) {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "LOCKED">("ACTIVE");
  const [editRoleId, setEditRoleId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
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

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const totalCount = pagination?.totalCount ?? users.length;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const roleOptions = useMemo<RoleOption[]>(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      if (typeof user.roleId === "object" && user.roleId?._id) {
        map.set(user.roleId._id, user.roleId.roleName);
      }
    }
    return Array.from(map, ([_id, roleName]) => ({ _id, roleName }));
  }, [users]);

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
      setEditError(
        error instanceof Error && error.message ? error.message : "Không thể cập nhật người dùng.",
      );
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

  const startEditing = () => {
    if (!selectedUser) {
      return;
    }
    setEditError(null);
    setEditFullName(selectedUser.fullName ?? "");
    setEditPhone(selectedUser.phone ?? "");
    setEditStatus(selectedUser.status === "LOCKED" ? "LOCKED" : "ACTIVE");
    setEditRoleId(getUserRoleId(selectedUser) ?? "");
    setIsEditing(true);
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

    const fullName = editFullName.trim();
    const phone = editPhone.trim();

    if (fullName.length < 2 || fullName.length > 30) {
      setEditError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setEditError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }

    const payload: { fullName?: string; phone?: string; status?: "ACTIVE" | "LOCKED"; roleId?: string } =
      {};
    if (fullName !== selectedUser.fullName) {
      payload.fullName = fullName;
    }
    if (phone !== selectedUser.phone) {
      payload.phone = phone;
    }
    if (editStatus !== selectedUser.status) {
      payload.status = editStatus;
    }
    const currentRoleId = getUserRoleId(selectedUser);
    if (editRoleId && editRoleId !== currentRoleId) {
      payload.roleId = editRoleId;
    }

    if (Object.keys(payload).length === 0) {
      setEditError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    updateUserMutation.mutate({ userId: selectedUser._id, payload });
  };

  const fieldsDisabled = !isEditing;

  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/40 px-5 py-3">
        <div>
          <div className="flex items-center gap-2 text-[13.5px] font-medium">
            <UsersRound className="size-4 text-primary" />
            Registered users
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
            {totalCount} accounts
          </div>
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

      <div className="grid grid-cols-[1.35fr_1.2fr_0.75fr_0.75fr_0.85fr] gap-2 border-b border-border bg-background/30 px-5 py-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>User</span>
        <span>Email</span>
        <span>Role</span>
        <span>Status</span>
        <span className="text-right">Joined</span>
      </div>

      <div className={cn("divide-y divide-border", compact ? "max-h-[320px] overflow-y-auto" : "")}>
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
            <UserRow key={user._id} user={user} onSelect={() => handleSelectUser(user)} />
          ))
        ) : (
          <div className="px-5 py-5 text-sm text-muted-foreground">No users found.</div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/30 px-5 py-3">
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
                : "Thông tin chi tiết của người dùng (chỉ xem)."}
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
                      value={selectedUser.email}
                      className="h-11 rounded-xl pl-9"
                      disabled
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

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="user-role">Role</Label>
                  {isEditing ? (
                    <Select value={editRoleId} onValueChange={setEditRoleId}>
                      <SelectTrigger id="user-role" className="h-11 rounded-xl">
                        <SelectValue placeholder="Chọn role" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role._id} value={role._id}>
                            {role.roleName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="user-role"
                      value={getUserRoleName(selectedUser)}
                      className="h-11 rounded-xl"
                      disabled
                    />
                  )}
                </div>

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
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={startEditing}
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
    </section>
  );
}

function UserRow({ user, onSelect }: { user: UserProfile; onSelect: () => void }) {
  const roleName = getUserRoleName(user);
  const status = user.status || "UNKNOWN";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="grid w-full grid-cols-[1.35fr_1.2fr_0.75fr_0.75fr_0.85fr] items-center gap-2 px-5 py-2.5 text-left text-[13px] transition-colors hover:bg-secondary/50 focus:bg-secondary/50 focus:outline-none"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary font-mono text-[11px] font-semibold">
          {getInitials(user.fullName)}
        </div>
        <span className="truncate font-medium">{user.fullName}</span>
      </div>
      <span className="truncate text-muted-foreground">{user.email}</span>
      <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
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
      <span className="truncate text-right font-mono text-[11px] text-muted-foreground">
        {formatDate(user.createdAt)}
      </span>
    </button>
  );
}

function getUserRoleName(user: UserProfile) {
  if (typeof user.roleId === "object" && user.roleId?.roleName) {
    return user.roleId.roleName;
  }
  return "UNKNOWN";
}

function getUserRoleId(user: UserProfile): string | null {
  if (typeof user.roleId === "object" && user.roleId?._id) {
    return user.roleId._id;
  }
  if (typeof user.roleId === "string") {
    return user.roleId;
  }
  return null;
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
