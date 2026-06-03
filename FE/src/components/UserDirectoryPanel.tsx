import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getAllUsers, type UserProfile } from "@/services/user.service";

type UserDirectoryPanelProps = {
  className?: string;
  compact?: boolean;
};

const pageSize = 100;

export function UserDirectoryPanel({ className, compact = false }: UserDirectoryPanelProps) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const canFetchUsers = typeof window !== "undefined";

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
    enabled: canFetchUsers,
  });

  const users = usersQuery.data?.users ?? [];
  const pagination = usersQuery.data?.pagination;
  const totalCount = pagination?.totalCount ?? users.length;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

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
          users.map((user) => <UserRow key={user._id} user={user} />)
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
    </section>
  );
}

function UserRow({ user }: { user: UserProfile }) {
  const roleName = getUserRoleName(user);
  const status = user.status || "UNKNOWN";

  return (
    <div className="grid grid-cols-[1.35fr_1.2fr_0.75fr_0.75fr_0.85fr] items-center gap-2 px-5 py-2.5 text-[13px] hover:bg-secondary/50">
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
