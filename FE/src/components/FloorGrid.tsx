type Status = "empty" | "full" | "reserved" | "maintenance" | "error";

const statusBg: Record<Status, string> = {
  empty: "bg-status-empty/15 text-status-empty ring-status-empty/30",
  full: "bg-status-full/15 text-status-full ring-status-full/30",
  reserved: "bg-status-reserved/15 text-status-reserved ring-status-reserved/30",
  maintenance:
    "bg-status-maintenance/20 text-status-maintenance ring-status-maintenance/40",
  error: "bg-status-error/20 text-status-error ring-status-error/40",
};

// Deterministic pseudo-random pattern so SSR matches client
function seedStatus(i: number): Status {
  const r = (i * 9301 + 49297) % 233280;
  const v = r / 233280;
  if (v < 0.45) return "full";
  if (v < 0.78) return "empty";
  if (v < 0.88) return "reserved";
  if (v < 0.95) return "maintenance";
  return "error";
}

export function FloorGrid({
  prefix = "B2",
  count = 60,
  highlightId,
}: {
  prefix?: string;
  count?: number;
  highlightId?: string;
}) {
  const slots = Array.from({ length: count }, (_, i) => {
    const id = `${prefix}-${String(i + 1).padStart(3, "0")}`;
    return { id, status: seedStatus(i) };
  });
  return (
    <div className="grid grid-cols-10 gap-2">
      {slots.map((s) => {
        const highlight = s.id === highlightId;
        return (
          <div
            key={s.id}
            className={`group relative aspect-square rounded-lg ring-1 ${
              statusBg[s.status]
            } ${highlight ? "ring-2 ring-foreground" : ""} flex items-end justify-start p-1.5 transition-transform hover:-translate-y-0.5`}
          >
            <span className="font-mono text-[9px] font-bold tracking-tight">
              {s.id.split("-")[1]}
            </span>
            {highlight && (
              <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-foreground text-[8px] font-bold text-background">
                ★
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
