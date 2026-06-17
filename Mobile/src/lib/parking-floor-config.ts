import type { ParkingFloor } from '@/features/customer/api/parking';

export type ParkingClass = 'motorcycle' | 'car' | 'car-large';

export type ParkingFloorConfig = {
  id: string;
  label: string;
  tabLabel: string;
  vehicleType: string;
  parkingClass: ParkingClass;
  aisleCount: number;
  stallsAlongAisle: number;
};

/**
 * Cấu hình tầng đồng bộ với bản đồ 3D (`parking-map.tsx`).
 * Số ô thiết kế = aisleCount × stallsAlongAisle × 2 (hai bên mỗi làn).
 */
export const PARKING_FLOORS: ParkingFloorConfig[] = [
  {
    id: 'B1',
    label: 'Tầng hầm',
    tabLabel: 'Hầm',
    vehicleType: 'Xe máy',
    parkingClass: 'motorcycle',
    aisleCount: 5,
    stallsAlongAisle: 44,
  },
  {
    id: '1',
    label: 'Tầng 1',
    tabLabel: 'T1',
    vehicleType: 'Xe máy điện',
    parkingClass: 'motorcycle',
    aisleCount: 4,
    stallsAlongAisle: 40,
  },
  {
    id: '2',
    label: 'Tầng 2',
    tabLabel: 'T2',
    vehicleType: 'Ô tô điện',
    parkingClass: 'car',
    aisleCount: 2,
    stallsAlongAisle: 14,
  },
  {
    id: '3',
    label: 'Tầng 3',
    tabLabel: 'T3',
    vehicleType: 'Sedan',
    parkingClass: 'car',
    aisleCount: 2,
    stallsAlongAisle: 13,
  },
  {
    id: '4',
    label: 'Tầng 4',
    tabLabel: 'T4',
    vehicleType: 'SUV',
    parkingClass: 'car-large',
    aisleCount: 2,
    stallsAlongAisle: 12,
  },
  {
    id: '5',
    label: 'Tầng 5',
    tabLabel: 'T5',
    vehicleType: 'Bán tải',
    parkingClass: 'car-large',
    aisleCount: 2,
    stallsAlongAisle: 11,
  },
];

export function floorLabel(
  floor: ParkingFloorConfig,
  t: (vi: string, en: string) => string,
): string {
  switch (floor.id) {
    case 'B1':
      return t('Tầng hầm', 'Basement');
    case '1':
      return t('Tầng 1', 'Level 1');
    case '2':
      return t('Tầng 2', 'Level 2');
    case '3':
      return t('Tầng 3', 'Level 3');
    case '4':
      return t('Tầng 4', 'Level 4');
    case '5':
      return t('Tầng 5', 'Level 5');
    default:
      return floor.label;
  }
}

export function floorTabLabel(
  floor: ParkingFloorConfig,
  t: (vi: string, en: string) => string,
): string {
  if (floor.id === 'B1') {
    return t('Hầm', 'B1');
  }
  return floor.tabLabel;
}

export function vehicleTypeLabel(
  floor: ParkingFloorConfig,
  t: (vi: string, en: string) => string,
): string {
  switch (floor.id) {
    case 'B1':
      return t('Xe máy', 'Motorbike');
    case '1':
      return t('Xe máy điện', 'Electric motorbike');
    case '2':
      return t('Ô tô điện', 'Electric car');
    case '3':
      return t('Sedan', 'Sedan');
    case '4':
      return t('SUV', 'SUV');
    case '5':
      return t('Bán tải', 'Pickup');
    default:
      return floor.vehicleType;
  }
}

/** Số ô lý thuyết trên bản đồ (trước khi trừ vùng ramp/làn). */
export function roughDesignSlotCount(floor: ParkingFloorConfig): number {
  return floor.aisleCount * floor.stallsAlongAisle * 2;
}

export function parseParkingFloorId(floorName: string): string | null {
  const normalized = floorName.trim();
  if (/hầm|basement|^b1$/i.test(normalized)) {
    return 'B1';
  }
  const levelMatch = normalized.match(/Tầng\s*(\d+)/i) ?? normalized.match(/^T(\d+)\b/i);
  if (levelMatch) {
    return levelMatch[1];
  }
  return null;
}

export function findParkingFloorConfig(floorName: string): ParkingFloorConfig | undefined {
  const id = parseParkingFloorId(floorName);
  if (!id) {
    return undefined;
  }
  return PARKING_FLOORS.find((floor) => floor.id === id);
}

export function sortFloorsLikeParkingMap<T extends { floorName: string }>(floors: T[]): T[] {
  return [...floors].sort((left, right) => {
    const sortKey = (name: string) => {
      const id = parseParkingFloorId(name);
      if (!id) {
        return 999;
      }
      if (id === 'B1') {
        return -1;
      }
      return Number(id);
    };
    return sortKey(left.floorName) - sortKey(right.floorName);
  });
}

function resolveApiVehicleLabel(
  vehicleType: string | undefined,
  t: (vi: string, en: string) => string,
): string {
  switch (vehicleType?.toUpperCase()) {
    case 'SEDAN':
      return t('Sedan', 'Sedan');
    case 'SUV':
      return t('SUV', 'SUV');
    case 'MPV':
      return t('MPV', 'MPV');
    case 'PICKUP':
      return t('Bán tải', 'Pickup');
    default:
      return vehicleType ?? '—';
  }
}

export type ResolvedFloorPresentation = {
  tabLabel: string;
  metaTitle: string;
  available: number;
  total: number;
  inUsed: number;
  designSlotCount: number | null;
};

export function resolveFloorPresentation(
  floor: ParkingFloor,
  t: (vi: string, en: string) => string,
): ResolvedFloorPresentation {
  const config = findParkingFloorConfig(floor.floorName);
  const total = floor.slotStats?.total ?? floor.slots.length;
  const available =
    floor.slotStats?.available ??
    floor.slots.filter((slot) => slot.status === 'AVAILABLE').length;
  const inUsed =
    floor.slotStats?.inUsed ??
    floor.slots.filter((slot) => slot.status === 'CURRENTLY-IN-USED').length;

  const floorTitle = config
    ? floorLabel(config, t)
    : (floor.floorName.split(' - ')[0] ?? floor.floorName);
  const vehicleTitle = config
    ? vehicleTypeLabel(config, t)
    : resolveApiVehicleLabel(floor.vehicleType?.type, t);

  let tabLabel: string;
  if (config) {
    tabLabel = floorTabLabel(config, t);
  } else {
    const parsedId = parseParkingFloorId(floor.floorName);
    tabLabel = parsedId ? (parsedId === 'B1' ? 'B1' : `T${parsedId}`) : floor.floorName.slice(0, 6);
  }

  const metaTitle = `${floorTitle} · ${vehicleTitle} · ${total} ${t('ô', 'slots')}`;

  return {
    tabLabel,
    metaTitle,
    available,
    total,
    inUsed,
    designSlotCount: config ? roughDesignSlotCount(config) : null,
  };
}
