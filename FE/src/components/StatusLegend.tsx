const items = [
  { label: "Empty", color: "bg-status-empty" },
  { label: "Full", color: "bg-status-full" },
  { label: "Reserved", color: "bg-status-reserved" },
  { label: "Maintenance", color: "bg-status-maintenance" },
  { label: "Error", color: "bg-status-error" },
];

export function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((i) => (
        <div
          key={i.label}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <span className={`size-2 rounded-full ${i.color}`} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
