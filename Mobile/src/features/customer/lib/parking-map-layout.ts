import type { ParkingFloor, ParkingSlot } from '@/features/customer/api/parking';

/** Fine-grained class so stall size tracks vehicle type on each floor. */
export type MapParkingClass = 'bike' | 'motorcycle' | 'car' | 'car-large';

export type MapSlotVisualStatus = 'available' | 'reserved' | 'in-use' | 'unavailable';

export type Floor3DSlotPlacement = {
  slot: ParkingSlot;
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type Floor3DRoad = {
  cx: number;
  cz: number;
  width: number;
  depth: number;
  kind: 'lane' | 'cross-in' | 'cross-out';
  flow: 'pz' | 'nz' | 'px' | 'nx';
};

export type Floor3DLayout = {
  slots: Floor3DSlotPlacement[];
  lanes: Array<{ x: number; width: number }>;
  roads: Floor3DRoad[];
  stallW: number;
  stallD: number;
  aisleW: number;
  parkingClass: MapParkingClass;
  /** Content block size (parking + aisles), before building pad. */
  totalWidth: number;
  totalDepth: number;
  /** Shared building slab — same for every floor. */
  platformWidth: number;
  platformDepth: number;
};

type StallStandard = {
  stallW: number;
  stallD: number;
  aisleW: number;
  gap: number;
  crossW: number;
};

/** Physical stall sizes (meters) — bikes tiny, 4-wheel larger. */
const STANDARDS_3D: Record<MapParkingClass, StallStandard> = {
  bike: { stallW: 0.55, stallD: 1.35, aisleW: 1.9, gap: 0.08, crossW: 2.2 },
  motorcycle: { stallW: 0.85, stallD: 2.0, aisleW: 2.6, gap: 0.1, crossW: 2.8 },
  car: { stallW: 2.45, stallD: 5.0, aisleW: 5.6, gap: 0.14, crossW: 5.4 },
  'car-large': { stallW: 2.85, stallD: 5.6, aisleW: 6.2, gap: 0.16, crossW: 6.0 },
};

const BUILDING_PAD = 0.55;

export function resolveMapParkingClass(vehicleType?: string | null): MapParkingClass {
  switch (vehicleType?.toUpperCase()) {
    case 'BIKE':
      return 'bike';
    case 'MOTORBIKE':
    case 'EBIKE':
      return 'motorcycle';
    case 'SUV':
    case 'MPV':
    case 'PICKUP':
      return 'car-large';
    case 'SEDAN':
    case 'HATCHBACK':
    case 'CUV':
    case 'ECAR':
    default:
      return 'car';
  }
}

export function mapApiSlotStatus(status: string | undefined): MapSlotVisualStatus {
  switch (String(status ?? '').toUpperCase()) {
    case 'AVAILABLE':
      return 'available';
    case 'RESERVED':
      return 'reserved';
    case 'CURRENTLY-IN-USED':
      return 'in-use';
    default:
      return 'unavailable';
  }
}

function naturalSlotSort(a: ParkingSlot, b: ParkingSlot): number {
  return a.slotNumber.localeCompare(b.slotNumber, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function pickGrid(n: number, parkingClass: MapParkingClass): { aisleCount: number; stallsAlongAisle: number } {
  if (n <= 0) {
    return { aisleCount: 1, stallsAlongAisle: 4 };
  }
  // Smaller vehicles pack denser (more aisles / shorter rows feel).
  const targetRows =
    parkingClass === 'bike' ? 12 : parkingClass === 'motorcycle' ? 10 : parkingClass === 'car' ? 7 : 6;
  const maxAisles = parkingClass === 'bike' || parkingClass === 'motorcycle' ? 4 : 3;
  const aisleCount = Math.max(1, Math.min(maxAisles, Math.ceil(n / (targetRows * 2))));
  const stallsAlongAisle = Math.max(1, Math.ceil(n / (aisleCount * 2)));
  return { aisleCount, stallsAlongAisle };
}

type ContentLayout = Omit<Floor3DLayout, 'platformWidth' | 'platformDepth'>;

function computeContentLayout(floor: ParkingFloor): ContentLayout {
  const parkingClass = resolveMapParkingClass(floor.vehicleType?.type);
  const std = STANDARDS_3D[parkingClass];
  const ordered = [...floor.slots].sort(naturalSlotSort);
  const n = ordered.length;

  const stallW = std.stallW;
  const stallD = std.stallD;
  const aisleW = std.aisleW;
  const pitchZ = stallW + std.gap;
  const { aisleCount, stallsAlongAisle } = pickGrid(n, parkingClass);

  const moduleW = stallD * 2 + aisleW;
  const totalWidth = aisleCount * moduleW;
  const totalDepth = Math.max(stallsAlongAisle * pitchZ - std.gap, stallW * 2);

  const lanes: Floor3DLayout['lanes'] = [];
  const slots: Floor3DSlotPlacement[] = [];
  let moduleX = -totalWidth / 2;
  let slotIndex = 0;

  for (let aisle = 0; aisle < aisleCount; aisle += 1) {
    const aisleCx = moduleX + stallD + aisleW / 2;
    lanes.push({ x: aisleCx, width: aisleW });

    for (let row = 0; row < stallsAlongAisle; row += 1) {
      const z = -totalDepth / 2 + row * pitchZ + stallW / 2;
      for (const side of ['L', 'R'] as const) {
        if (slotIndex >= n) {
          break;
        }
        const slot = ordered[slotIndex];
        slotIndex += 1;
        const x = side === 'L' ? moduleX + stallD / 2 : moduleX + stallD + aisleW + stallD / 2;
        slots.push({
          slot,
          x,
          z,
          width: stallD,
          depth: stallW,
        });
      }
    }
    moduleX += moduleW;
  }

  const cw = std.crossW;
  const laneRun = Math.max(totalDepth - cw * 1.02, stallW);
  const zSouth = -totalDepth / 2 + cw * 0.51;
  const zNorth = totalDepth / 2 - cw * 0.51;

  const roads: Floor3DRoad[] = [
    {
      cx: 0,
      cz: zSouth,
      width: totalWidth * 0.97,
      depth: cw,
      flow: 'px',
      kind: 'cross-in',
    },
    {
      cx: 0,
      cz: zNorth,
      width: totalWidth * 0.97,
      depth: cw,
      flow: 'nx',
      kind: 'cross-out',
    },
  ];

  lanes.forEach((lane, index) => {
    roads.push({
      cx: lane.x,
      cz: 0,
      width: lane.width,
      depth: laneRun,
      flow: index % 2 === 0 ? 'pz' : 'nz',
      kind: 'lane',
    });
  });

  return {
    slots,
    lanes,
    roads,
    stallW,
    stallD,
    aisleW,
    parkingClass,
    totalWidth,
    totalDepth,
  };
}

/**
 * One shared building footprint for every floor (same width × depth slab),
 * while stall sizes stay true to each floor's vehicle type.
 */
export function computeBuildingFloorLayouts(floors: ParkingFloor[]): Floor3DLayout[] {
  const contents = floors.map((floor) => computeContentLayout(floor));

  let maxWidth = 12;
  let maxDepth = 12;
  for (const content of contents) {
    maxWidth = Math.max(maxWidth, content.totalWidth);
    maxDepth = Math.max(maxDepth, content.totalDepth);
  }

  const platformWidth = maxWidth + BUILDING_PAD * 2;
  const platformDepth = maxDepth + BUILDING_PAD * 2;

  return contents.map((content) => ({
    ...content,
    platformWidth,
    platformDepth,
  }));
}

/** Single-floor helper (uses that floor's natural size as the platform). */
export function computeFloor3DLayout(floor: ParkingFloor): Floor3DLayout {
  return computeBuildingFloorLayouts([floor])[0];
}
