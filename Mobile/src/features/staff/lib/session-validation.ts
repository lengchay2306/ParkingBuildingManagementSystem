/** Matches BE `parking.validator.js` — VN mobile numbers (10 digits). */
export const STAFF_PHONE_PATTERN = /^(03|05|07|08|09)\d{8}$/;

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

export function normalizeStaffPhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidStaffPhone(value: string): boolean {
  return STAFF_PHONE_PATTERN.test(normalizeStaffPhone(value));
}

export function isValidObjectId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value.trim());
}

export type StaffPhoneValidation = { ok: true; phone: string } | { ok: false; messageKey: 'empty' | 'invalid' };

export function validateStaffPhoneInput(
  value: string,
  t: (vi: string, en: string) => string,
): StaffPhoneValidation {
  const phone = normalizeStaffPhone(value);
  if (!phone) {
    return { ok: false, messageKey: 'empty' };
  }
  if (!STAFF_PHONE_PATTERN.test(phone)) {
    return { ok: false, messageKey: 'invalid' };
  }
  return { ok: true, phone };
}

/** Optional phone for guest walk-in — validates only when non-empty. */
export function validateOptionalStaffPhone(value: string): { ok: true; phone?: string } | StaffPhoneValidation {
  const phone = normalizeStaffPhone(value);
  if (!phone) {
    return { ok: true, phone: undefined };
  }
  if (!STAFF_PHONE_PATTERN.test(phone)) {
    return { ok: false, messageKey: 'invalid' };
  }
  return { ok: true, phone };
}

export function staffPhoneErrorMessage(
  key: 'empty' | 'invalid',
  t: (vi: string, en: string) => string,
): string {
  if (key === 'empty') {
    return t('Nhập số điện thoại khách', 'Enter customer phone number');
  }
  return t(
    'Số điện thoại phải đúng 10 số (03, 05, 07, 08, 09)',
    'Phone must be 10 digits starting with 03, 05, 07, 08, or 09',
  );
}

export function validateObjectIdInput(
  value: string,
  t: (vi: string, en: string) => string,
): { ok: true; id: string } | { ok: false; message: string } {
  const id = value.trim();
  if (!id) {
    return { ok: false, message: t('Nhập mã phiên / đặt chỗ', 'Enter a session or reservation ID') };
  }
  if (!isValidObjectId(id)) {
    return {
      ok: false,
      message: t('Mã không hợp lệ (ObjectId 24 ký tự)', 'Invalid ID (24-character ObjectId)'),
    };
  }
  return { ok: true, id };
}
