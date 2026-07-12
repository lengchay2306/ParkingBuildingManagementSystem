import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Mail, Phone, UserRound } from "lucide-react";

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
import { cn } from "@/lib/utils";
import { getMyProfile, type UserProfile } from "@/services/user.service";

export const myProfileQueryKey = ["my-profile"] as const;

type AccountProfileBannerProps = {
  fallbackName?: string;
  dialogDescription?: string;
  className?: string;
};

export function AccountProfileBanner({
  fallbackName = "Tài khoản",
  dialogDescription = "Thông tin tài khoản đang đăng nhập.",
  className,
}: AccountProfileBannerProps) {
  const [hasMounted, setHasMounted] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: hasMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const profile = profileQuery.data ?? null;
  const profileError = profileQuery.error
    ? getErrorMessage(profileQuery.error, "Không thể tải hồ sơ.")
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsProfileOpen(true)}
        className={cn(
          "ui-profile-hero flex min-h-[5.5rem] w-full cursor-pointer items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-w-[280px] sm:max-w-md",
          className,
        )}
        aria-label="Xem hồ sơ"
      >
        <div className="relative">
          <div className="ui-profile-avatar grid size-16 place-items-center">
            <UserRound className="size-8 text-muted-foreground" />
          </div>
          <span
            className={cn(
              "absolute bottom-1 right-1 size-3 rounded-full ring-2 ring-card",
              profile?.status === "ACTIVE" ? "bg-status-empty" : "bg-muted-foreground",
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Tài khoản
          </p>
          <h2 className="truncate text-lg font-semibold tracking-tight md:text-xl">
            {profile?.fullName ??
              (profileQuery.isLoading ? "Đang tải hồ sơ..." : fallbackName)}
          </h2>
          <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-primary">
            {profile ? getProfileRoleName(profile) : "—"}
            {profile?.status ? ` · ${profile.status}` : ""}
          </p>
        </div>
      </button>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-lg">
          <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>Hồ sơ của tôi</DialogTitle>
              <DialogDescription>{dialogDescription}</DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {profileQuery.isLoading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/45 px-3 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải hồ sơ...
              </div>
            ) : profileError ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {profileError}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void profileQuery.refetch()}
                  className="h-10 rounded-xl"
                >
                  Thử lại
                </Button>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="ui-dialog-summary">
                  <div className="ui-profile-avatar grid size-14 shrink-0 place-items-center">
                    <UserRound className="size-7 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold">{profile.fullName}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {getProfileRoleName(profile)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                          profile.status === "ACTIVE"
                            ? "border-status-empty/45 bg-status-empty/15 text-status-empty"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {profile.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="ui-detail-grid grid gap-4 p-4">
                  <div className="grid gap-2">
                    <Label htmlFor="account-profile-full-name">Họ tên</Label>
                    <Input
                      id="account-profile-full-name"
                      value={profile.fullName}
                      className="h-11 rounded-xl"
                      readOnly
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="account-profile-email">Email</Label>
                      <div className="relative min-w-0">
                        <div className="ui-field-icon pointer-events-none absolute left-2 top-1/2 size-7 -translate-y-1/2">
                          <Mail className="size-3.5" />
                        </div>
                        <div
                          id="account-profile-email"
                          className="flex min-h-11 w-full min-w-0 items-center rounded-xl border border-border/70 bg-secondary/45 py-2 pl-11 pr-3 text-sm break-all text-foreground"
                          title={profile.email}
                        >
                          {profile.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="account-profile-phone">Số điện thoại</Label>
                      <div className="relative">
                        <div className="ui-field-icon pointer-events-none absolute left-2 top-1/2 size-7 -translate-y-1/2">
                          <Phone className="size-3.5" />
                        </div>
                        <Input
                          id="account-profile-phone"
                          value={profile.phone}
                          className="h-11 rounded-xl pl-11"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="account-profile-created-at">Ngày tạo</Label>
                    <Input
                      id="account-profile-created-at"
                      value={formatProfileDate(profile.createdAt)}
                      className="h-11 rounded-xl"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getProfileRoleName(profile: UserProfile) {
  if (typeof profile.roleId === "object" && profile.roleId?.roleName) {
    return profile.roleId.roleName;
  }

  return "USER";
}

function formatProfileDate(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
