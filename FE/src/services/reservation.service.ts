const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ReservationStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "CANCELLED";

export type Reservation = {
  _id: string;
  driverId: string;
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
      return "Unable to complete reservation request.";
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

export const cancelReservationByStaff = async (reservationId: string) => {
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

export const getReservationSlotId = (reservation: Reservation) => {
  if (typeof reservation.parkingSlotId === "string") {
    return reservation.parkingSlotId;
  }
  return reservation.parkingSlotId?._id ?? null;
};
