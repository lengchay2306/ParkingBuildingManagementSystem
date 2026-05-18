import { Link, useRouterState } from "@tanstack/react-router";

const links = [
  { to: "/", label: "Overview" },
  { to: "/flow", label: "Flow" },
  { to: "/manager", label: "Manager" },
  { to: "/staff", label: "Staff" },
  { to: "/driver", label: "Driver" },
  { to: "/admin", label: "Admin" },
];

export function SiteHeader() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-md bg-primary text-primary-foreground text-[11px] font-bold">
            P
          </div>
          <span className="text-[13px] font-semibold tracking-tight">PARKOS</span>
          <span className="ml-1 hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            / Building OS
          </span>
        </Link>
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
        <div className="hidden items-center gap-2 md:flex">
          <span className="size-1.5 animate-pulse rounded-full bg-status-empty" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Live · v4.2
          </span>
        </div>
      </div>
    </header>
  );
}
