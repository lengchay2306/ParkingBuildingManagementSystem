import { resolveApiErrorMessage } from '@/lib/api-error';

type Translate = (vi: string, en: string) => string;

/** Known BE parking-session error strings → localized staff-facing copy. */
const SESSION_API_MESSAGE_MAP: Array<{
  match: RegExp;
  message: (t: Translate) => string;
}> = [
  {
    match: /not exist or already checkout/i,
    message: (t) =>
      t('Phiên không tồn tại hoặc đã checkout', 'Session not found or already checked out'),
  },
  {
    match: /does not register yet|phone number is not registered/i,
    message: (t) => t('Số điện thoại chưa đăng ký', 'Phone number is not registered'),
  },
  {
    match: /monthlycard|monthly.?card/i,
    message: (t) =>
      t(
        'Checkout thẻ tháng cần thẻ tháng còn hiệu lực',
        'Monthly-card checkout requires an active monthly card',
      ),
  },
  {
    match: /cannot check out|unable to checkout/i,
    message: (t) => t('Không checkout được phiên', 'Unable to checkout parking session'),
  },
  {
    match: /reservation not found/i,
    message: (t) => t('Không tìm thấy đặt chỗ', 'Reservation not found'),
  },
  {
    match: /not active pending|is not PENDING/i,
    message: (t) => t('Đặt chỗ không còn PENDING', 'Reservation is not PENDING'),
  },
  {
    match: /reservation has expired/i,
    message: (t) => t('Đặt chỗ đã hết hạn', 'Reservation has expired'),
  },
  {
    match: /wrong phone number|driver not found/i,
    message: (t) => t('Không tìm thấy chủ đặt chỗ', 'Reservation driver not found'),
  },
  {
    match: /doesn't register yet|vehicle not found/i,
    message: (t) => t('Không tìm thấy xe', 'Vehicle not found'),
  },
  {
    match: /doesn't belong to this customer|does not belong to the reservation driver/i,
    message: (t) =>
      t('Xe không thuộc chủ đặt chỗ', 'Vehicle does not belong to the reservation driver'),
  },
  {
    match: /already in parking building|already has an active parking session/i,
    message: (t) =>
      t('Xe đang có phiên ACTIVE trong bãi', 'Vehicle already has an active parking session'),
  },
  {
    match: /reserved parking slot not found/i,
    message: (t) => t('Không tìm thấy ô đã đặt', 'Reserved parking slot not found'),
  },
  {
    match: /not in RESERVED status/i,
    message: (t) => t('Ô đặt chỗ không còn trạng thái RESERVED', 'Reserved slot is not RESERVED'),
  },
  {
    match: /cannot create new parking session|unable to create parking session/i,
    message: (t) => t('Không tạo được phiên gửi xe', 'Unable to create parking session'),
  },
  {
    match: /license plate is registered/i,
    message: (t) =>
      t(
        'Biển số đã đăng ký — dùng check-in walk-in, không dùng guest',
        'Plate is registered — use walk-in check-in, not guest',
      ),
  },
  {
    match: /parking slot is not available/i,
    message: (t) => t('Ô gửi không trống', 'Parking slot is not available'),
  },
  {
    match: /not fit with this type|vehicle type does not match/i,
    message: (t) =>
      t('Ô không khớp loại xe', 'Parking slot vehicle type does not match'),
  },
  {
    match: /use guest check-in/i,
    message: (t) =>
      t(
        'Xe chưa đăng ký — dùng check-in khách vãng lai',
        'Vehicle not registered — use guest check-in',
      ),
  },
  {
    match: /vehicle is not active/i,
    message: (t) => t('Xe không còn ACTIVE', 'Vehicle is not active'),
  },
  {
    match: /owner of this vehicle|vehicle owner not found/i,
    message: (t) => t('Không tìm thấy chủ xe', 'Vehicle owner not found'),
  },
  {
    match: /PENDING reservation/i,
    message: (t) =>
      t(
        'Xe đang có đặt chỗ PENDING — check-in bằng reservation',
        'Vehicle has a PENDING reservation — use reservation check-in',
      ),
  },
  {
    match: /you cant delete|only ACTIVE parking sessions can be deleted/i,
    message: (t) =>
      t('Chỉ xóa được phiên ACTIVE', 'Only ACTIVE parking sessions can be deleted'),
  },
  {
    match: /cannot delete this parking session|unable to delete parking session/i,
    message: (t) => t('Không xóa được phiên', 'Unable to delete parking session'),
  },
  {
    match: /no data!|cannot get all parking session/i,
    message: (t) => t('Không có phiên gửi xe', 'No parking sessions'),
  },
  {
    match: /no active parking session/i,
    message: (t) => t('Không có phiên ACTIVE', 'No active parking session'),
  },
  {
    match: /parking session not found|this parking session does not exist/i,
    message: (t) => t('Không tìm thấy phiên gửi xe', 'Parking session not found'),
  },
  {
    match: /new parking slot is the same/i,
    message: (t) => t('Ô mới phải khác ô hiện tại', 'New spot must differ from the current one'),
  },
  {
    match: /only ACTIVE parking sessions can change/i,
    message: (t) =>
      t('Chỉ phiên ACTIVE mới đổi được ô', 'Only ACTIVE sessions can change parking slot'),
  },
  {
    match: /new parking slot not found/i,
    message: (t) => t('Không tìm thấy ô mới', 'New parking slot not found'),
  },
  {
    match: /new parking slot is not available/i,
    message: (t) => t('Ô mới không trống', 'New parking slot is not available'),
  },
  {
    match: /vehicle type does not match the session floor/i,
    message: (t) =>
      t('Ô mới không khớp loại xe của phiên', 'New spot vehicle type does not match session'),
  },
];

/**
 * Localize BE parking-session API errors for staff UI.
 * Falls back to raw message / provided fallback when unknown.
 */
export function resolveParkingSessionApiMessage(
  error: unknown,
  t: Translate,
  fallback: string,
): string {
  const raw = resolveApiErrorMessage(error, fallback);
  for (const entry of SESSION_API_MESSAGE_MAP) {
    if (entry.match.test(raw)) {
      return entry.message(t);
    }
  }
  return raw || fallback;
}
