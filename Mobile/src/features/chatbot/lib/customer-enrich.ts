import type { ParkingFloor } from '@/features/customer/api/parking';
import type { Reservation } from '@/features/customer/api/reservations';
import type { SlotRecommendation } from '@/features/chatbot/api/types';
import { wrapMessageWithContext } from '@/features/chatbot/lib/message-wrap';
import type { UserVehicle } from '@/lib/auth-api';
import { authenticatedFetch } from '@/lib/auth-api';

export type CustomerChatIntent =
  | 'floorAvailability'
  | 'recommendSlot'
  | 'myReservation'
  | 'howTo'
  | 'general';

const VEHICLE_TYPES = ['SUV', 'SEDAN', 'MPV', 'PICKUP'] as const;

export function detectCustomerChatIntent(message: string): CustomerChatIntent {
  const text = message.toLowerCase();
  if (/tìm chỗ|gợi ý|chỗ đậu|chỗ đỗ|slot nào|đỗ xe ở đâu/.test(text)) {
    return 'recommendSlot';
  }
  if (/còn trống|tầng nào|available|bao nhiêu chỗ|chỗ trống/.test(text)) {
    return 'floorAvailability';
  }
  if (/cách đặt|làm sao đặt|hướng dẫn|quy trình đặt/.test(text)) {
    return 'howTo';
  }
  if (/reservation|đặt chỗ của tôi|hủy đặt|booking/.test(text)) {
    return 'myReservation';
  }
  return 'general';
}

function extractVehicleType(message: string): string | null {
  const upper = message.toUpperCase();
  return VEHICLE_TYPES.find((type) => upper.includes(type)) ?? null;
}

function vehicleTypeLabel(vehicle: UserVehicle): string {
  if (typeof vehicle.vehicleTypeId === 'object' && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }
  return 'UNKNOWN';
}

function pickVehicle(vehicles: UserVehicle[], message: string): UserVehicle | null {
  const active = vehicles.filter((v) => v.status?.toUpperCase() !== 'INACTIVE');
  if (active.length === 0) {
    return null;
  }
  const keyword = extractVehicleType(message);
  if (keyword) {
    const matched = active.find((v) => vehicleTypeLabel(v).toUpperCase() === keyword);
    if (matched) {
      return matched;
    }
  }
  return active[0] ?? null;
}

function summarizeFloors(floors: ParkingFloor[], typeFilter?: string | null): string {
  const filtered = typeFilter
    ? floors.filter((f) => f.vehicleType?.type?.toUpperCase() === typeFilter.toUpperCase())
    : floors;
  if (filtered.length === 0) {
    return '- Không có dữ liệu tầng phù hợp';
  }
  return filtered
    .slice(0, 6)
    .map((floor) => {
      const stats = floor.slotStats;
      const type = floor.vehicleType?.type ?? '?';
      if (stats) {
        return `- ${floor.floorName} (${type}): ${stats.available} trống / ${stats.total} tổng`;
      }
      const available = floor.slots?.filter((s) => s.status === 'AVAILABLE').length ?? 0;
      return `- ${floor.floorName} (${type}): ${available} trống`;
    })
    .join('\n');
}

function summarizeReservations(reservations: Reservation[]): string {
  const active = reservations.filter((r) => r.status === 'PENDING' || r.status === 'CLAIMED');
  if (active.length === 0) {
    return '- Reservation đang active: không có';
  }
  return active
    .slice(0, 5)
    .map((r) => {
      const slot =
        typeof r.parkingSlotId === 'object' ? (r.parkingSlotId.slotNumber ?? '?') : '?';
      const plate =
        typeof r.vehicleId === 'object' ? (r.vehicleId.licensePlate ?? '?') : '?';
      return `- ${r.status}: slot ${slot}, xe ${plate}`;
    })
    .join('\n');
}

function summarizeRecommendations(items: SlotRecommendation[]): string {
  if (items.length === 0) {
    return '- Gợi ý slot: không có slot khả dụng';
  }
  return items
    .slice(0, 3)
    .map((item) => {
      const reason = item.reasons[0] ?? 'phù hợp';
      return `- ${item.slotNumber} (${item.floorName ?? 'tầng ?'}): ${reason}`;
    })
    .join('\n');
}

export async function recommendParkingSlots(payload: {
  vehicleId: string;
  expectedArrival: string;
  limit?: number;
}): Promise<SlotRecommendation[]> {
  const response = await authenticatedFetch('/reservations/recommend-slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vehicleId: payload.vehicleId,
      expectedArrival: payload.expectedArrival,
      limit: payload.limit ?? 3,
    }),
  });
  const result = (await response.json().catch(() => null)) as {
    data?: { recommendations?: SlotRecommendation[] };
    message?: string;
  } | null;
  if (!response.ok) {
    throw new Error(result?.message ?? 'Recommendation request failed');
  }
  return result?.data?.recommendations ?? [];
}

export async function buildCustomerEnrichedMessage({
  userQuestion,
  vehicles,
  floors,
  reservations,
}: {
  userQuestion: string;
  vehicles: UserVehicle[];
  floors: ParkingFloor[];
  reservations: Reservation[];
}): Promise<string> {
  const intent = detectCustomerChatIntent(userQuestion);
  const typeKeyword = extractVehicleType(userQuestion);
  const lines = [
    'Bạn đang hỗ trợ KHÁCH (CUSTOMER). Chỉ dùng số liệu dưới đây, không bịa.',
    'Xe của khách:',
    vehicles.length
      ? vehicles
          .slice(0, 5)
          .map((v) => `- ${v.licensePlate} (${vehicleTypeLabel(v)})`)
          .join('\n')
      : '- Chưa đăng ký xe',
  ];

  if (intent === 'floorAvailability' || intent === 'recommendSlot' || intent === 'general') {
    lines.push('Tầng bãi:', summarizeFloors(floors, typeKeyword));
  }

  if (intent === 'recommendSlot' || intent === 'general') {
    const vehicle = pickVehicle(vehicles, userQuestion);
    let recommendations: SlotRecommendation[] = [];
    if (vehicle) {
      try {
        recommendations = await recommendParkingSlots({
          vehicleId: vehicle._id,
          expectedArrival: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          limit: 3,
        });
      } catch {
        recommendations = [];
      }
    }
    lines.push('Gợi ý slot:', summarizeRecommendations(recommendations));
  }

  if (intent === 'myReservation' || intent === 'general') {
    lines.push('Reservation của khách:', summarizeReservations(reservations));
  }

  if (intent === 'howTo') {
    lines.push(
      'Quy trình đặt chỗ:',
      '- Chọn xe → slot AVAILABLE đúng loại → giờ đến → xác nhận',
      '- Hủy: chỉ PENDING, trước giờ hẹn >15 phút',
    );
  }

  return wrapMessageWithContext(lines.join('\n'), userQuestion);
}
