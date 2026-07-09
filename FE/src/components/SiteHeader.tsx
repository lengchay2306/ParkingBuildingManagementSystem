import { useEffect, useState } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { getSessionRole, getStoredRole, logout, type RoleName } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [role, setRole] = useState<RoleName | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isLoginPage = path === "/login";
  const isLoggedIn = !!role;

  useEffect(() => {
    document.documentElement.classList.remove("light");
    window.localStorage.removeItem("parkos-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hasAccessCookie = document.cookie.includes("accessToken=");
    const storedRole = getStoredRole();

    if (!hasAccessCookie && !storedRole) {
      setRole(null);
      return () => {
        cancelled = true;
      };
    }

    void getSessionRole().then((sessionRole) => {
      if (!cancelled) {
        setRole(sessionRole);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setRole(null);
      await router.navigate({ to: "/" });
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={
        isLoginPage
          ? "sticky top-0 z-40 border-b border-border bg-background"
          : "sticky top-0 z-40 glass"
      }
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            P
          </div>
          <span className="text-[13px] font-semibold tracking-tight">PARKOS</span>
          <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            / Building OS
          </span>
        </Link>
        <div />

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-8 rounded-full px-4 text-[12px] font-semibold"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          ) : !isLoginPage ? (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-full bg-primary px-4 text-[12px] font-semibold shadow-pop hover:bg-primary/90"
            >
              <Link to="/login" preload="intent">Sign in</Link>
            </Button>
          ) : (
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-8 rounded-full px-4 text-[12px]"
            >
              <Link to="/">Back to overview</Link>
            </Button>
          )}

          {!isLoginPage ? (
            <div className="hidden items-center gap-2 md:flex">
              <span className="size-1.5 animate-pulse rounded-full bg-status-empty" />
             
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
