import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  CircleDashed,
  Clock3,
  CreditCard,
  MapPin,
  MessageSquareWarning,
  NotebookPen,
  ShieldCheck,
  Timer,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SlotAvailabilityFilter } from "@/components/SlotAvailabilityFilter";
import { requireRole } from "@/lib/auth";

export const Route = createFileRoute("/driver")({
  beforeLoad: async () => {
    await requireRole("CUSTOMER");
  },
  head: () => ({
    meta: [
      { title: "Driver Portal - PARKOS" },
      {
        name: "description",
        content:
          "Driver portal to view parking information, reserve slots, track active sessions, make payments, and submit feedback or incident reports.",
      },
      { property: "og:title", content: "Driver Portal - PARKOS" },
      {
        property: "og:description",
        content:
          "View parking status in real time, reserve supported slots, track active parking sessions, pay, and report issues.",
      },
    ],
  }),
  component: DriverPage,
});

type SpotStatus = "available" | "occupied" | "reserved";

type ParkingSpot = {
  id: string;
  status: SpotStatus;
  ev?: boolean;
  activeSession?: boolean;
  holdUntil?: string;
};

type ParkingRow = {
  label: string;
  spots: ParkingSpot[];
};

type QuickAction = {
  title: string;
  description: string;
  cta: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

const quickActions: QuickAction[] = [
  {
    title: "Reserve Parking Slot",
    description: "Book in advance when reservation is supported at this facility.",
    cta: "Open reservation",
    icon: MapPin,
    highlighted: true,
  },
  {
    title: "Track Active Session",
    description: "Monitor timer, fee estimate, and current level in real time.",
    cta: "View live session",
    icon: Timer,
  },
  {
    title: "Make Payment",
    description: "Pay with wallet or card and download parking receipts.",
    cta: "Pay now",
    icon: CreditCard,
  },
  {
    title: "Feedback and Incident",
    description: "Submit issue reports for wrong-slot, gate, or billing incidents.",
    cta: "Create report",
    icon: MessageSquareWarning,
  },
];

const parkingRows: ParkingRow[] = [
  {
    label: "ROW-A",
    spots: [
      { id: "A01", status: "available", ev: true },
      { id: "A02", status: "occupied" },
      { id: "A03", status: "available", ev: true },
      { id: "A04", status: "available", ev: true },
      { id: "A05", status: "occupied" },
      { id: "A06", status: "available" },
    ],
  },
  {
    label: "ROW-B",
    spots: [
      { id: "B07", status: "available" },
      { id: "B08", status: "occupied" },
      { id: "B09", status: "occupied" },
      { id: "B10", status: "available" },
      { id: "B11", status: "available" },
      { id: "B12", status: "occupied" },
    ],
  },
  {
    label: "ROW-C",
    spots: [
      { id: "C13", status: "available" },
      { id: "C14", status: "available" },
      { id: "C15", status: "occupied" },
      { id: "C16", status: "available" },
      { id: "C17", status: "available" },
      { id: "C18", status: "reserved", holdUntil: "08:42 PM", activeSession: true },
    ],
  },
];

const spotStyles: Record<SpotStatus, string> = {
  available:
    "border-status-empty/40 bg-status-empty/10 text-status-empty hover:border-status-empty/70",
  occupied: "border-border bg-background/55 text-muted-foreground hover:border-border/90",
  reserved:
    "border-status-reserved/45 bg-status-reserved/12 text-status-reserved hover:border-status-reserved/70",
};

const statusText: Record<SpotStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
};

const statusBadge: Record<SpotStatus, string> = {
  available: "bg-status-empty/20 text-status-empty border-status-empty/40",
  occupied: "bg-muted text-muted-foreground border-border",
  reserved: "bg-status-reserved/20 text-status-reserved border-status-reserved/45",
};

function DriverPage() {
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const allSpots = useMemo(() => parkingRows.flatMap((row) => row.spots), []);
  const selectedSpot = useMemo(
    () => allSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [allSpots, selectedSpotId],
  );

  const availableCount = allSpots.filter((spot) => spot.status === "available").length;
  const occupiedCount = allSpots.filter((spot) => spot.status === "occupied").length;
  const reservedCount = allSpots.filter((spot) => spot.status === "reserved").length;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-6 md:px-6">
        <section className="rounded-3xl border border-border/75 bg-card/75 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="grid size-20 place-items-center rounded-full border border-border bg-background/80">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-background" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">TAOTENVINH</h1>
                  <span className="rounded-md border border-primary/40 bg-primary/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    Driver active
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">taotenvinh@icloud.com</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CarFront className="size-4" />
                    SUV Sports Standard
                  </span>
                  <span className="text-border">|</span>
                  <span className="font-mono tracking-wide">Plate: 53535</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <NotebookPen className="size-4" />
              Edit profile
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoStat label="Available spots" value={`${availableCount}`} tone="text-status-empty" />
            <InfoStat label="Active parking session" value="01:42:15" tone="text-foreground" />
            <InfoStat label="Estimated fee" value="$8.50" tone="text-primary" />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/70 bg-card/65 p-2 shadow-soft">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    action.highlighted
                      ? "border-primary/45 bg-primary/10"
                      : "border-border bg-background/35 hover:bg-background/60"
                  }`}
                >
                  <div className="mb-3 inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background/65">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{action.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
                  <span className="mt-3 inline-block text-xs font-medium text-primary">{action.cta}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  View parking information
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Level L1 layout</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose an available slot to reserve. Supported reservations are held for up to 15 minutes.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <Legend label={`Available ${availableCount}`} tone="bg-status-empty" />
                <Legend label={`Occupied ${occupiedCount}`} tone="bg-status-full" />
                <Legend label={`Reserved ${reservedCount}`} tone="bg-status-reserved" />
              </div>
            </div>

            <SlotAvailabilityFilter />

          </div>

          <aside className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft">
            {selectedSpot ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold tracking-tight">{selectedSpot.id}</h4>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadge[selectedSpot.status]}`}>
                      {statusText[selectedSpot.status]}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p className="inline-flex items-center gap-2">
                      <CircleDashed className="size-4" />
                      Zone C - Level L1
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Clock3 className="size-4" />
                      Hold limit: 15 minutes
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <ShieldCheck className="size-4" />
                      Camera monitored 24/7
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Session and payment
                  </p>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active timer</span>
                      <span className="font-semibold">01:42:15</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Current fee</span>
                      <span className="font-semibold">$8.50</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Wallet balance</span>
                      <span className="font-semibold">$24.50</span>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    >
                      <Wallet className="size-4" />
                      Make payment
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-sm font-medium"
                    >
                      <MapPin className="size-4" />
                      Reserve this slot
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/40 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Feedback and incident reports
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Report wrong assignment, faulty scanner, payment issues, or safety incidents.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-background/55 px-3 py-2 text-sm font-medium"
                  >
                    <MessageSquareWarning className="size-4" />
                    Submit report
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border bg-background/35 p-6 text-center">
                <div>
                  <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-background">
                    <MapPin className="size-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight">No spot selected</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click an available green slot to reserve parking, track session, or continue to payment.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function Legend({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function InfoStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-2 text-xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}
