import type { ParkingFloor, ParkingSession } from '@/features/staff/api';
import type { Reservation } from '@/features/customer/api/reservations';
import { wrapMessageWithContext } from '@/features/chatbot/lib/message-wrap';
import { authenticatedFetch } from '@/lib/auth-api';

export type StaffChatIntent =
  | 'checkInFlow'
  | 'reservationLookup'
  | 'lotStatus'
  | 'activeSessions'
  | 'general';

const VEHICLE_TYPES = ['SUV', 'SEDAN', 'MPV', 'PICKUP'] as const;

export function detectStaffChatIntent(message: string): StaffChatIntent {
  const text = message.toLowerCase();
  if (/check-in|check in|vào bãi|quét biển|nhập biển/.test(text)) {
    return 'checkInFlow';
  }
  if (/reservation|đặt chỗ|biển số|license plate|by-plate|pending/.test(text)) {
    return 'reservationLookup';
  }
  if (/phiên|session|đang gửi|checkout|ra cổng/.test(text)) {
    return 'activeSessions';
  }
  if (/còn trống|tầng|slot|ô trống|available/.test(text)) {
    return 'lotStatus';
  }
  return 'general';
}

function extractVehicleType(message: string): string | null {
  const upper = message.toUpperCase();
  return VEHICLE_TYPES.find((type) => upper.includes(type)) ?? null;
}

function summarizeFloors(floors: ParkingFloor[], typeFilter?: string | null): string {
  const filtered = typeFilter
    ? floors.filter((f) => f.vehicleType?.type?.toUpperCase() === typeFilter.toUpperCase())
    : floors;
  if (filtered.length === 0) {
    return '- Không có dữ liệu tầng phù hợp';
  }
  return filtered
    .slice(0, 8)
    .map((floor) => {
      const stats = floor.slotStats;
      const type = floor.vehicleType?.type ?? '?';
      if (stats) {
        return `- ${floor.floorName} (${type}): ${stats.available} trống, ${stats.inUsed} đang gửi, ${stats.reserved ?? 0} đặt`;
      }
      return `- ${floor.floorName} (${type})`;
    })
    .join('\n');
}

function summarizeReservations(reservations: Reservation[]): string {
  const relevant = reservations.filter(
    (r) => r.status === 'PENDING' || r.status === 'CLAIMED',
  );
  if (relevant.length === 0) {
    return '- Không có reservation PENDING/CLAIMED trong trang hiện tại';
  }
  return relevant
    .slice(0, 8)
    .map((r) => {
      const slot =
        typeof r.parkingSlotId === 'object' ? (r.parkingSlotId.slotNumber ?? '?') : '?';
      const plate =
        typeof r.vehicleId === 'object' ? (r.vehicleId.licensePlate ?? '?') : '?';
      const driver =
        typeof r.driverId === 'object' ? (r.driverId.fullName ?? r.driverId.phone ?? '') : '';
      return `- ${r.status}: ${plate} → slot ${slot}${driver ? ` (${driver})` : ''}`;
    })
    .join('\n');
}

function summarizeActiveSessions(sessions: ParkingSession[]): string {
  const active = sessions.filter((s) => s.status === 'ACTIVE');
  if (active.length === 0) {
    return '- Không có phiên ACTIVE trong danh sách hôm nay';
  }
  return active
    .slice(0, 8)
    .map((s) => {
      const plate =
        s.licensePlate ??
        (typeof s.vehicleId === 'object' && s.vehicleId ? (s.vehicleId.licensePlate ?? '?') : '?');
      const slot =
        typeof s.parkingSlotId === 'object' ? (s.parkingSlotId.slotNumber ?? '?') : '?';
      return `- ${plate} tại slot ${slot}`;
    })
    .join('\n');
}

export async function listStaffReservationsForChat(
  limit = 20,
): Promise<Reservation[]> {
  const response = await authenticatedFetch(`/reservations?page=1&limit=${limit}`);
  const payload = (await response.json().catch(() => null)) as {
    data?: { reservations?: Reservation[] };
  } | null;
  if (!response.ok) {
    return [];
  }
  return payload?.data?.reservations ?? [];
}

export async function buildStaffEnrichedMessage({
  userQuestion,
  floors,
  reservations,
  sessions,
}: {
  userQuestion: string;
  floors: ParkingFloor[];
  reservations: Reservation[];
  sessions: ParkingSession[];
}): Promise<string> {
  const intent = detectStaffChatIntent(userQuestion);
  const typeKeyword = extractVehicleType(userQuestion);

  const lines = [
    'Bạn đang hỗ trợ NHÂN VIÊN (STAFF). Ưu tiên quy trình vận hành bãi, không hướng dẫn đặt chỗ như khách.',
    'Tóm tắt bãi hiện tại:',
    summarizeFloors(floors, typeKeyword),
  ];

  if (intent === 'reservationLookup' || intent === 'checkInFlow' || intent === 'general') {
    lines.push('Reservation PENDING (mẫu):', summarizeReservations(reservations));
    lines.push(
      'Quy trình staff:',
      '- Quét/nhập biển → GET by-plate → có PENDING thì check-in đúng slot đã đặt',
      '- Không có reservation → chọn ô AVAILABLE và tạo phiên walk-in',
    );
  }

  if (intent === 'checkInFlow') {
    lines.push(
      'Check-in:',
      '- Xác nhận SĐT khách (10 số VN)',
      '- Không check-in nếu xe đang có phiên ACTIVE',
    );
  }

  if (intent === 'activeSessions' || intent === 'general') {
    lines.push('Phiên ACTIVE (mẫu hôm nay):', summarizeActiveSessions(sessions));
  }

  if (intent === 'lotStatus') {
    lines.push('Gợi ý: dùng màn Spots để xem chi tiết từng ô trên sơ đồ tầng.');
  }

  return wrapMessageWithContext(lines.join('\n'), userQuestion);
}
