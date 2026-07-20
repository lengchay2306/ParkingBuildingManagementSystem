import type { QueryClient } from "@tanstack/react-query";

import { getParkingFloors, type ParkingFloor } from "@/services/parking.service";
import {
  getMyReservations,
  type RecommendSlotsResult,
  type Reservation,
} from "@/services/reservation.service";
import { getMyVehicles, type Vehicle } from "@/services/vehicle.service";

export const DRIVER_MY_VEHICLES_QUERY_KEY = ["my-vehicles"] as const;
export const DRIVER_PARKING_FLOORS_QUERY_KEY = ["parking-floors"] as const;
export const DRIVER_MY_RESERVATIONS_QUERY_KEY = ["my-reservations"] as const;

export type DriverChatIntent =
  | "howTo"
  | "floorAvailability"
  | "recommendSlot"
  | "myReservation"
  | "general";

export const USER_QUESTION_MARKER = "[CÂU HỎI]";
export const CONTEXT_BLOCK_MARKER = "[DỮ LIỆU THỰC TẾ";

const VEHICLE_TYPE_KEYWORDS = ["SUV", "SEDAN", "BIKE", "MOTORBIKE", "MPV", "PICKUP"] as const;
const MAX_CONTEXT_CHARS = 1200;
const MAX_MESSAGE_CHARS = 2000;

export function detectDriverChatIntent(message: string): DriverChatIntent {
  const text = message.toLowerCase();

  if (/tìm chỗ|gợi ý|chỗ đậu|chỗ đỗ|slot nào|đỗ xe ở đâu|chỗ trống nào/.test(text)) {
    return "recommendSlot";
  }
  if (/còn trống|tầng nào|available|bao nhiêu chỗ|chỗ trống/.test(text)) {
    return "floorAvailability";
  }
  if (/cách đặt|làm sao đặt|hướng dẫn|quy trình đặt|đặt chỗ thế nào/.test(text)) {
    return "howTo";
  }
  if (/reservation|đặt chỗ của tôi|hủy đặt|booking của tôi|lịch đặt/.test(text)) {
    return "myReservation";
  }

  return "general";
}

export function extractVehicleTypeKeyword(message: string): string | null {
  const upper = message.toUpperCase();
  for (const type of VEHICLE_TYPE_KEYWORDS) {
    if (upper.includes(type)) {
      return type;
    }
  }
  return null;
}

export function getVehicleTypeLabel(vehicle: Vehicle): string {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }
  return "UNKNOWN";
}

export function pickVehicleForQuestion(
  vehicles: Vehicle[],
  message: string,
): Vehicle | null {
  const active = vehicles.filter((vehicle) => vehicle.status !== "INACTIVE");
  if (active.length === 0) {
    return null;
  }

  const typeKeyword = extractVehicleTypeKeyword(message);
  if (typeKeyword) {
    const matched = active.find(
      (vehicle) => getVehicleTypeLabel(vehicle).toUpperCase() === typeKeyword,
    );
    if (matched) {
      return matched;
    }
  }

  return active[0] ?? null;
}

function summarizeVehicles(vehicles: Vehicle[]): string {
  const active = vehicles.filter((vehicle) => vehicle.status !== "INACTIVE");
  if (active.length === 0) {
    return "- Xe: chưa đăng ký xe nào";
  }
  return active
    .slice(0, 5)
    .map((vehicle) => `- ${vehicle.licensePlate} (${getVehicleTypeLabel(vehicle)})`)
    .join("\n");
}

function summarizeFloors(floors: ParkingFloor[], vehicleTypeFilter?: string | null): string {
  const filtered = vehicleTypeFilter
    ? floors.filter(
        (floor) => floor.vehicleType?.type?.toUpperCase() === vehicleTypeFilter.toUpperCase(),
      )
    : floors;

  if (filtered.length === 0) {
    return "- Không có dữ liệu tầng phù hợp";
  }

  return filtered
    .slice(0, 6)
    .map((floor) => {
      const stats = floor.slotStats;
      const type = floor.vehicleType?.type ?? "?";
      if (stats) {
        return `- ${floor.floorName} (${type}): ${stats.available} trống / ${stats.total} tổng (đang dùng ${stats.inUsed}, đặt ${stats.reserved ?? 0})`;
      }
      const available = floor.slots?.filter((slot) => slot.status === "AVAILABLE").length ?? 0;
      const total = floor.slots?.length ?? 0;
      return `- ${floor.floorName} (${type}): ${available} trống / ${total} tổng`;
    })
    .join("\n");
}

function summarizeRecommendations(result: RecommendSlotsResult | null): string {
  if (!result || result.recommendations.length === 0) {
    return "- Gợi ý slot: không có slot khả dụng";
  }

  return result.recommendations
    .slice(0, 3)
    .map((item) => {
      const reason = item.reasons[0] ?? "phù hợp";
      return `- ${item.slotNumber} (${item.floorName ?? "tầng ?"}): ${reason}`;
    })
    .join("\n");
}

function summarizeReservations(reservations: Reservation[]): string {
  const active = reservations.filter(
    (reservation) => reservation.status === "PENDING" || reservation.status === "CLAIMED",
  );
  if (active.length === 0) {
    return "- Reservation đang active: không có";
  }

  return active
    .slice(0, 5)
    .map((reservation) => {
      const slot =
        typeof reservation.parkingSlotId === "object"
          ? (reservation.parkingSlotId.slotNumber ?? "?")
          : "?";
      const plate =
        typeof reservation.vehicleId === "object"
          ? (reservation.vehicleId.licensePlate ?? "?")
          : "?";
      return `- ${reservation.status}: slot ${slot}, xe ${plate}`;
    })
    .join("\n");
}

function howToSnippet(): string {
  return [
    "- Cách đặt: Reserve Parking Slot → chọn tầng/xe → slot AVAILABLE → giờ đến (trong 2 giờ tới) → Reserve",
    "- Hủy: My Reservations → chỉ PENDING, trước giờ hẹn >15 phút",
  ].join("\n");
}

export type DriverContextInput = {
  intent: DriverChatIntent;
  userQuestion: string;
  vehicles: Vehicle[];
  floors: ParkingFloor[];
  reservations: Reservation[];
  recommendations: RecommendSlotsResult | null;
};

export function buildDriverContextSnapshot(input: DriverContextInput): string {
  const { intent, userQuestion, vehicles, floors, reservations, recommendations } = input;
  const typeKeyword = extractVehicleTypeKeyword(userQuestion);

  const lines = [
    "Chỉ dùng số liệu dưới đây. Không bịa slot/tầng. Thiếu dữ liệu thì nói rõ.",
    summarizeVehicles(vehicles),
  ];

  if (intent === "floorAvailability" || intent === "recommendSlot" || intent === "general") {
    lines.push("Tầng:");
    lines.push(summarizeFloors(floors, typeKeyword));
  }

  if (intent === "recommendSlot" || intent === "general") {
    lines.push("Gợi ý:");
    lines.push(summarizeRecommendations(recommendations));
  }

  if (intent === "myReservation" || intent === "general") {
    lines.push("Reservation:");
    lines.push(summarizeReservations(reservations));
  }

  if (intent === "howTo") {
    lines.push(howToSnippet());
  }

  let context = lines.join("\n");
  if (context.length > MAX_CONTEXT_CHARS) {
    context = `${context.slice(0, MAX_CONTEXT_CHARS - 1)}…`;
  }

  return context;
}

export function wrapMessageWithContext(context: string, userQuestion: string): string {
  const question = userQuestion.trim();
  let wrapped = `${CONTEXT_BLOCK_MARKER} — dùng để trả lời, không copy nguyên khối]\n${context}\n${USER_QUESTION_MARKER}\n${question}`;

  if (wrapped.length > MAX_MESSAGE_CHARS) {
    const budget = MAX_MESSAGE_CHARS - question.length - USER_QUESTION_MARKER.length - 80;
    const trimmedContext =
      budget > 200 ? context.slice(0, budget) : "Dữ liệu quá dài, trả lời theo câu hỏi chung.";
    wrapped = `${CONTEXT_BLOCK_MARKER}]\n${trimmedContext}\n${USER_QUESTION_MARKER}\n${question}`;
  }

  return wrapped.slice(0, MAX_MESSAGE_CHARS);
}

export function getUserMessageDisplayText(content: string): string {
  const markerIndex = content.indexOf(USER_QUESTION_MARKER);
  if (markerIndex === -1) {
    return content;
  }
  return content.slice(markerIndex + USER_QUESTION_MARKER.length).trim() || content;
}

export function defaultExpectedArrivalIso(offsetMs = 60 * 60 * 1000): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

export type FetchDriverChatContextParams = {
  intent: DriverChatIntent;
  userQuestion: string;
  vehicles: Vehicle[];
  floors: ParkingFloor[];
  reservations: Reservation[];
  recommendSlots: (payload: {
    vehicleId: string;
    expectedArrival: string;
    limit?: number;
  }) => Promise<RecommendSlotsResult>;
};

async function fetchForChatContext<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    const data = await fetcher();
    queryClient.setQueryData(queryKey, data);
    return data;
  } catch {
    return queryClient.getQueryData<T>(queryKey) ?? fallback;
  }
}

/** Fetch driver APIs without polluting React Query error state on the driver page. */
export async function fetchDriverDataForChat(queryClient: QueryClient) {
  const [vehicles, floors, reservations] = await Promise.all([
    fetchForChatContext(queryClient, DRIVER_MY_VEHICLES_QUERY_KEY, getMyVehicles, []),
    fetchForChatContext(queryClient, DRIVER_PARKING_FLOORS_QUERY_KEY, () => getParkingFloors(), []),
    fetchForChatContext(
      queryClient,
      DRIVER_MY_RESERVATIONS_QUERY_KEY,
      () => getMyReservations(),
      [],
    ),
  ]);

  return { vehicles, floors, reservations };
}

export async function buildEnrichedChatMessage({
  intent,
  userQuestion,
  vehicles,
  floors,
  reservations,
  recommendSlots,
}: FetchDriverChatContextParams): Promise<string> {
  let recommendations: RecommendSlotsResult | null = null;

  const needsRecommend = intent === "recommendSlot" || intent === "general";
  const vehicle = pickVehicleForQuestion(vehicles, userQuestion);

  if (needsRecommend && vehicle) {
    try {
      recommendations = await recommendSlots({
        vehicleId: vehicle._id,
        expectedArrival: defaultExpectedArrivalIso(),
        limit: 3,
      });
    } catch {
      recommendations = null;
    }
  }

  const context = buildDriverContextSnapshot({
    intent,
    userQuestion,
    vehicles,
    floors,
    reservations,
    recommendations,
  });

  return wrapMessageWithContext(context, userQuestion);
}

export const DRIVER_CHAT_QUICK_PROMPTS = [
  "Tầng SUV còn trống không?",
  "Gợi ý slot cho xe của tôi",
  "Cách đặt chỗ trên app?",
] as const;
