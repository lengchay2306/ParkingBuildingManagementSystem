export const RESERVATION_ARRIVAL_MAX_MS = 2 * 60 * 60 * 1000;

export const VIETNAM_PHONE_PATTERN = /^(03|05|07|08|09)\d{8}$/;

export const isExpectedArrivalWithinWindow = (
  arrival: Date,
  now = Date.now(),
): boolean =>
  arrival.getTime() > now && arrival.getTime() <= now + RESERVATION_ARRIVAL_MAX_MS;

export const getExpectedArrivalValidationMessage = (
  arrival: Date | null,
  now = Date.now(),
): string | null => {
  if (!arrival) {
    return null;
  }
  if (arrival.getTime() <= now) {
    return "Thời gian đến phải ở tương lai.";
  }
  if (arrival.getTime() > now + RESERVATION_ARRIVAL_MAX_MS) {
    return "Thời gian đến phải trong vòng 2 giờ tới.";
  }
  return null;
};
