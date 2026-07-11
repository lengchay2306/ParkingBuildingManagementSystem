import { forwardRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardMainProps = {
  children: ReactNode;
  className?: string;
  wide?: boolean;
};

export function DashboardMain({ children, className, wide = false }: DashboardMainProps) {
  return (
    <main
      className={cn(
        "dashboard-main mx-auto w-full px-4 pb-14 pt-8 md:px-6",
        wide ? "max-w-[1320px]" : "max-w-7xl",
        className,
      )}
    >
      {children}
    </main>
  );
}

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  return (
    <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

type DashboardTabsProps<T extends string> = {
  tabs: Array<{ id: T; label: string }>;
  activeTab: T;
  onChange: (tab: T) => void;
  className?: string;
};

export function DashboardTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: DashboardTabsProps<T>) {
  return (
    <div className={cn("dashboard-tabs mb-6", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            data-active={isActive}
            className={cn(
              "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
              isActive
                ? "border-primary/50 bg-primary/15 text-primary shadow-[0_8px_22px_-14px_hsl(var(--primary))]"
                : "border-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type DashboardSectionProps = {
  children: ReactNode;
  className?: string;
  compact?: boolean;
};

export const DashboardSection = forwardRef<
  HTMLElement,
  DashboardSectionProps
>(function DashboardSection({ children, className, compact = false }, ref) {
  return (
    <section
      ref={ref}
      className={cn(
        "dashboard-section",
        compact ? "p-4 md:p-5" : "p-5 md:p-7",
        className,
      )}
    >
      {children}
    </section>
  );
});

type DashboardSectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function DashboardSectionHeader({
  kicker,
  title,
  description,
  actions,
}: DashboardSectionHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        {kicker ? <p className="dashboard-kicker">{kicker}</p> : null}
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{title}</h2>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DashboardLegend({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="dashboard-legend">
      <span className={cn("size-2.5 shrink-0 rounded-full", tone)} />
      <span>{label}</span>
    </span>
  );
}

export function DashboardStat({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="dashboard-stat">
      <p className="dashboard-stat-label">{label}</p>
      <p className={cn("dashboard-stat-value", tone)}>{value}</p>
    </div>
  );
}

export function DashboardPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("dashboard-panel", className)}>{children}</div>;
}

export function DashboardEmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("dashboard-empty", className)}>{children}</div>;
}

export function DashboardLoadingState({ label }: { label: string }) {
  return (
    <div className="dashboard-loading">
      <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      {label}
    </div>
  );
}

type DashboardClientPaginationProps = {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export function DashboardClientPagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
  className,
}: DashboardClientPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const canGoBack = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-border pt-4",
        className,
      )}
    >
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
        Trang {page} / {totalPages}
        {totalItems !== undefined ? ` · ${totalItems} mục` : ""}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canGoBack || disabled}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="h-8 rounded-xl px-3"
        >
          <ChevronLeft className="size-3.5" />
          Trước
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canGoNext || disabled}
          onClick={() => onPageChange(page + 1)}
          className="h-8 rounded-xl px-3"
        >
          Sau
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    page: safePage,
    totalItems: items.length,
  };
}
