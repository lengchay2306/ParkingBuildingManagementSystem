import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";

import { getStoredRole, logout, type RoleName } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Overview" },
  { to: "/flow", label: "Flow" },
  { to: "/manager", label: "Manager" },
  { to: "/staff", label: "Staff" },
  { to: "/driver", label: "Driver" },
  { to: "/admin", label: "Admin" },
] as const;

const THEME_STORAGE_KEY = "parkos-theme";

export function SiteHeader() {
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [role, setRole] = useState<RoleName | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isLoginPage = path === "/login";
  const isLoggedIn = !!role;
  const showNav = !isLoggedIn && !isLoginPage;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    setRole(getStoredRole());
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
    <header className="sticky top-0 z-40 glass">
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

        {showNav ? (
          <nav className="flex items-center gap-0.5">
            {links.map((l) => {
              const active = path === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`rounded-md px-2.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div />
        )}

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
              <Link to="/login">Sign in</Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" size="sm" className="h-8 rounded-full px-4 text-[12px]">
              <Link to="/">Back to overview</Link>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 px-2 text-[12px]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
          </Button>

          <div className="hidden items-center gap-2 md:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-status-empty" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Live · v4.2
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
