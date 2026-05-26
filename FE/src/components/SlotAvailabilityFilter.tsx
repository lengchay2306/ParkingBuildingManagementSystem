import { useMemo, useState } from "react";

type SlotStatus = "AVAILABLE" | "UNAVAILABLE" | "CURRENTLY-IN-USED";

type FloorCode = "B1" | "T1" | "T2" | "T3" | "T4" | "T5";

type FloorPlan = {
  code: FloorCode;
  label: string;
  capacity: number;
  vehicleType: string;
  slotPrefix: string;
  availabilityRatio: number;
};

type Slot = {
  code: string;
  floorCode: FloorCode;
  floorLabel: string;
  vehicleType: string;
  status: SlotStatus;
};

const floorPlans: FloorPlan[] = [
  {
    code: "B1",
    label: "B1 - Ham",
    capacity: 380,
    vehicleType: "Xe may",
    slotPrefix: "M",
    availabilityRatio: 0.24,
  },
  {
    code: "T1",
    label: "T1",
    capacity: 272,
    vehicleType: "Xe dien",
    slotPrefix: "E",
    availabilityRatio: 0.28,
  },
  {
    code: "T2",
    label: "T2",
    capacity: 40,
    vehicleType: "O to dien",
    slotPrefix: "EC",
    availabilityRatio: 0.34,
  },
  {
    code: "T3",
    label: "T3",
    capacity: 36,
    vehicleType: "Sedan",
    slotPrefix: "S",
    availabilityRatio: 0.32,
  },
  {
    code: "T4",
    label: "T4",
    capacity: 32,
    vehicleType: "SUV",
    slotPrefix: "SU",
    availabilityRatio: 0.3,
  },
  {
    code: "T5",
    label: "T5",
    capacity: 28,
    vehicleType: "Ban tai",
    slotPrefix: "PU",
    availabilityRatio: 0.27,
  },
];

const pickStatus = (floorIndex: number, slotIndex: number, availabilityRatio: number): SlotStatus => {
  const seed = ((floorIndex + 1) * 7919 + (slotIndex + 1) * 104_729) % 1000;
  const normalized = seed / 1000;

  if (normalized < availabilityRatio) {
    return "AVAILABLE";
  }

  if (normalized < availabilityRatio + 0.55) {
    return "CURRENTLY-IN-USED";
  }

  return "UNAVAILABLE";
};

const allSlots: Slot[] = floorPlans.flatMap((floor, floorIndex) =>
  Array.from({ length: floor.capacity }, (_, slotIndex) => ({
    code: `${floor.code}-${floor.slotPrefix}${String(slotIndex + 1).padStart(3, "0")}`,
    floorCode: floor.code,
    floorLabel: floor.label,
    vehicleType: floor.vehicleType,
    status: pickStatus(floorIndex, slotIndex, floor.availabilityRatio),
  })),
);

export function SlotAvailabilityFilter() {
  const [floorFilter, setFloorFilter] = useState<"ALL" | FloorCode>("ALL");
  const [vehicleFilter, setVehicleFilter] = useState("ALL");
  const [codeFilter, setCodeFilter] = useState("");

  const vehicleOptions = useMemo(
    () => Array.from(new Set(floorPlans.map((floor) => floor.vehicleType))),
    [],
  );

  const emptySlots = useMemo(() => {
    const normalizedCode = codeFilter.trim().toUpperCase();

    return allSlots.filter((slot) => {
      if (slot.status !== "AVAILABLE") {
        return false;
      }
      if (floorFilter !== "ALL" && slot.floorCode !== floorFilter) {
        return false;
      }
      if (vehicleFilter !== "ALL" && slot.vehicleType !== vehicleFilter) {
        return false;
      }
      if (normalizedCode && !slot.code.toUpperCase().includes(normalizedCode)) {
        return false;
      }
      return true;
    });
  }, [codeFilter, floorFilter, vehicleFilter]);

  const availableByFloor = useMemo(
    () =>
      floorPlans.map((floor) => ({
        floorCode: floor.code,
        floorLabel: floor.label,
        capacity: floor.capacity,
        vehicleType: floor.vehicleType,
        available: allSlots.filter(
          (slot) => slot.floorCode === floor.code && slot.status === "AVAILABLE",
        ).length,
      })),
    [],
  );

  return (
    <section className="mt-6 rounded-2xl border border-border bg-background/50 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">Phan tang & bo loc o trong</h3>
          <p className="text-xs text-muted-foreground">
            Filter theo tang, ma code, loai xe. Ket qua chi hien thi o con trong.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Tong o trong: <span className="text-status-empty">{emptySlots.length}</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Vi tri (Tang)
          </span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={floorFilter}
            onChange={(event) => setFloorFilter(event.target.value as "ALL" | FloorCode)}
          >
            <option value="ALL">Tat ca tang</option>
            {floorPlans.map((floor) => (
              <option key={floor.code} value={floor.code}>
                {floor.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Loai xe
          </span>
          <select
            className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={vehicleFilter}
            onChange={(event) => setVehicleFilter(event.target.value)}
          >
            <option value="ALL">Tat ca loai xe</option>
            {vehicleOptions.map((vehicleType) => (
              <option key={vehicleType} value={vehicleType}>
                {vehicleType}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Ma code
          </span>
          <input
            className="mt-1 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            placeholder="Vi du: T3-S0 hoac B1-M120"
            value={codeFilter}
            onChange={(event) => setCodeFilter(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {availableByFloor.map((row) => (
          <div
            key={row.floorCode}
            className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs"
          >
            <div>
              <div className="font-semibold">{row.floorLabel}</div>
              <div className="text-muted-foreground">{row.vehicleType}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-status-empty">
                {row.available}/{row.capacity}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                available
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 max-h-[380px] overflow-y-auto rounded-xl border border-border bg-card/40 p-3">
        {emptySlots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-sm text-muted-foreground">
            Khong co o trong phu hop bo loc hien tai.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {emptySlots.map((slot) => (
              <div
                key={slot.code}
                className="flex items-center justify-between rounded-lg border border-status-empty/30 bg-status-empty/10 px-3 py-2"
              >
                <div>
                  <div className="font-mono text-sm font-semibold text-status-empty">
                    {slot.code}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {slot.floorLabel} - {slot.vehicleType}
                  </div>
                </div>
                <span className="rounded-sm bg-status-empty/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-status-empty">
                  Empty
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
