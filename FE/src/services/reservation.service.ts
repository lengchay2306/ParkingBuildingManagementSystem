const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ReservationStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "CANCELLED";

export type ReservationDriver = {
  _id: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

export type Reservation = {
  _id: string;
  driverId: string | ReservationDriver;
  vehicleId:
    | string
    | {
        _id: string;
        licensePlate?: string;
        vehicleTypeId?: { _id?: string; type?: string };
      };
  parkingSlotId:
    | string
    | {
        _id: string;
        slotNumber?: string;
        status?: string;
        floorId?: {
          _id?: string;
          floorName?: string;
          vehicleTypeId?: { _id?: string; type?: string };
        };
      };
  reservedAt?: string;
  expectedArrival?: string;
  expiryAt?: string;
  status: ReservationStatus | string;
};

export type CreateReservationPayload = {
  vehicleId: string;
  parkingSlotId: string;
  expectedArrival: string;
};

export type SlotRecommendation = {
  parkingSlotId: string;
  slotNumber: string;
  status: string;
  floorId?: string;
  floorName?: string | null;
  vehicleType?: string | null;
  score: number;
  reasons: string[];
};

export type RecommendSlotsResult = {
  vehicle: {
    _id: string;
    licensePlate?: string;
    vehicleTypeId?: string | { _id?: string; type?: string };
  };
  expectedArrival: string;
  recommendations: SlotRecommendation[];
  meta?: {
    totalEligibleSlots?: number;
    floorOccupancyRate?: number;
    floorStats?: {
      available: number;
      reserved?: number;
      unavailable: number;
      inUsed: number;
      total: number;
    };
  };
};

export type RecommendSlotsPayload = {
  vehicleId: string;
  expectedArrival: string;
  limit?: number;
};

export type ReservationsPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type GetAllReservationsParams = {
  page?: number;
  limit?: number;
  status?: ReservationStatus;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class ReservationApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ReservationApiError";
    this.status = status;
  }
}

const parseJson = async <T>(response: Response): Promise<ApiEnvelope<T>> => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {};
  }
  return (await response.json()) as ApiEnvelope<T>;
};

const reservationErrorMessage = (status: number) => {
  switch (status) {
    case 400:
      return "Reservation data is invalid.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "Vehicle, parking slot, or reservation not found.";
    case 409:
      return "This slot already has an active reservation.";
    default:
      return "Không thể hoàn tất yêu cầu đặt chỗ.";
  }
};

export const getMyReservations = async (status?: ReservationStatus) => {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  const response = await fetch(`${API_BASE}/api/v1/reservations/my${query ? `?${query}` : ""}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{ reservations?: Reservation[] }>(response);

  if (!response.ok) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  return payload.data?.reservations ?? [];
};

/** ADMIN / MANAGER / STAFF — paginated list of all reservations. */
export const getAllReservations = async ({
  page = 1,
  limit = 10,
  status,
}: GetAllReservationsParams = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) {
    params.set("status", status);
  }

  const response = await fetch(`${API_BASE}/api/v1/reservations?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    reservations?: Reservation[];
    pagination?: ReservationsPagination;
  }>(response);

  if (!response.ok) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  return {
    reservations: payload.data?.reservations ?? [],
    pagination:
      payload.data?.pagination ??
      ({
        page,
        limit,
        totalCount: payload.data?.reservations?.length ?? 0,
        totalPages: 1,
      } satisfies ReservationsPagination),
    message: payload.message,
  };
};

export const createReservation = async (request: CreateReservationPayload) => {
  const response = await fetch(`${API_BASE}/api/v1/reservations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(request),
  });
  const payload = await parseJson<{ reservation?: Reservation }>(response);

  if (response.status !== 201) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  const reservation = payload.data?.reservation;
  if (!reservation) {
    throw new ReservationApiError(response.status, "Reservation response data is missing.");
  }

  return reservation;
};

export const recommendSlots = async ({
  vehicleId,
  expectedArrival,
  limit = 3,
}: RecommendSlotsPayload) => {
  const response = await fetch(`${API_BASE}/api/v1/reservations/recommend-slots`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ vehicleId, expectedArrival, limit }),
  });
  const payload = await parseJson<RecommendSlotsResult>(response);

  if (!response.ok) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  if (!payload.data?.recommendations) {
    throw new ReservationApiError(response.status, "Recommendation response data is missing.");
  }

  return payload.data;
};

export const cancelReservation = async (reservationId: string) => {
  const response = await fetch(
    `${API_BASE}/api/v1/reservations/${encodeURIComponent(reservationId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ cancelledReservation?: Reservation }>(response);

  if (!response.ok) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  return payload.data?.cancelledReservation ?? null;
};

/** ADMIN / MANAGER / STAFF — hard-delete a PENDING reservation. */
export const deleteReservationByManage = async (reservationId: string) => {
  const response = await fetch(
    `${API_BASE}/api/v1/reservations/manage/${encodeURIComponent(reservationId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ deletedReservation?: Reservation }>(response);

  if (!response.ok) {
    throw new ReservationApiError(
      response.status,
      payload.message || reservationErrorMessage(response.status),
    );
  }

  return payload.data?.deletedReservation ?? null;
};

/** @deprecated Use deleteReservationByManage */
export const cancelReservationByStaff = deleteReservationByManage;

export const getReservationSlotId = (reservation: {
  parkingSlotId: string | { _id: string };
}) => {
  if (typeof reservation.parkingSlotId === "string") {
    return reservation.parkingSlotId;
  }
  return reservation.parkingSlotId?._id ?? null;
};

/** Fetch every page until all reservations are loaded. */
export const fetchAllReservationsPages = async ({
  status,
  batchSize = 100,
}: {
  status?: ReservationStatus;
  batchSize?: number;
} = {}) => {
  let currentPage = 1;
  let totalPages = 1;
  const reservations: Reservation[] = [];

  do {
    const result = await getAllReservations({
      page: currentPage,
      limit: batchSize,
      status,
    });
    reservations.push(...result.reservations);
    totalPages = result.pagination.totalPages;
    currentPage += 1;
  } while (currentPage <= totalPages);

  return reservations;
};

const staffRelevantReservationStatuses: ReservationStatus[] = ["PENDING", "CLAIMED"];

export const isStaffRelevantReservation = (reservation: Reservation) => {
  if (!staffRelevantReservationStatuses.includes(reservation.status as ReservationStatus)) {
    return false;
  }
  if (reservation.status === "PENDING" && reservation.expiryAt) {
    return new Date(reservation.expiryAt).getTime() > Date.now();
  }
  return true;
};

/** Latest reservation per slot for staff (PENDING + CLAIMED, không lọc expiry). */
export const mapStaffSlotReservationsBySlotId = (reservations: Reservation[]) => {
  const sorted = [...reservations].sort((left, right) => {
    const leftTime = new Date(left.reservedAt ?? 0).getTime();
    const rightTime = new Date(right.reservedAt ?? 0).getTime();
    return rightTime - leftTime;
  });

  const bySlotId = new Map<string, Reservation>();
  for (const reservation of sorted) {
    if (reservation.status !== "PENDING" && reservation.status !== "CLAIMED") {
      continue;
    }
    const slotId = getReservationSlotId(reservation);
    if (!slotId || bySlotId.has(slotId)) {
      continue;
    }
    bySlotId.set(slotId, reservation);
  }

  return bySlotId;
};

export const getReservationDriverPhone = (reservation: Reservation) => {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.phone ?? null;
  }
  return null;
};

export const getReservationDriverName = (reservation: Reservation) => {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.fullName ?? null;
  }
  return null;
};

export const getReservationVehiclePlate = (reservation: Reservation) => {
  if (typeof reservation.vehicleId === "object") {
    return reservation.vehicleId.licensePlate ?? null;
  }
  return null;
};

export const buildCreateSessionPayloadFromReservation = (
  reservation: Reservation,
  parkingSlotId: string,
) => {
  const phone = normalizeStaffPhone(getReservationDriverPhone(reservation));
  const licensePlate = getReservationVehiclePlate(reservation)?.trim() ?? "";
  if (!phone || !licensePlate) {
    return null;
  }
  return { phone, licensePlate, parkingSlotId };
};

export const getCreateSessionDisabledReasonFromReservation = (reservation: Reservation) => {
  if (reservation.status !== "PENDING" && reservation.status !== "CLAIMED") {
    return "Chỉ tạo session từ reservation PENDING hoặc CLAIMED.";
  }

  const phone = normalizeStaffPhone(getReservationDriverPhone(reservation));
  const licensePlate = getReservationVehiclePlate(reservation);
  const parkingSlotId = getReservationSlotId(reservation);

  if (!parkingSlotId) {
    return "Không xác định được slot.";
  }
  if (!phone) {
    return "Reservation thiếu số điện thoại hợp lệ (03/05/07/08/09 + 8 số).";
  }
  if (!licensePlate?.trim()) {
    return "Reservation thiếu biển số xe.";
  }

  return undefined;
};

/** Chuẩn hóa SĐT VN cho API create parking session. */
export const normalizeStaffPhone = (phone?: string | null) => {
  if (!phone) {
    return null;
  }
  const digits = phone.replace(/\D/g, "");
  if (/^(03|05|07|08|09)\d{8}$/.test(digits)) {
    return digits;
  }
  if (/^84(3|5|7|8|9)\d{8}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }
  return null;
};

/** Latest relevant reservation per parking slot id. */
export const mapReservationsBySlotId = (reservations: Reservation[]) => {
  const sorted = [...reservations].sort((left, right) => {
    const leftTime = new Date(left.reservedAt ?? 0).getTime();
    const rightTime = new Date(right.reservedAt ?? 0).getTime();
    return rightTime - leftTime;
  });

  const bySlotId = new Map<string, Reservation>();
  for (const reservation of sorted) {
    if (!isStaffRelevantReservation(reservation)) {
      continue;
    }
    const slotId = getReservationSlotId(reservation);
    if (!slotId || bySlotId.has(slotId)) {
      continue;
    }
    bySlotId.set(slotId, reservation);
  }

  return bySlotId;
};
