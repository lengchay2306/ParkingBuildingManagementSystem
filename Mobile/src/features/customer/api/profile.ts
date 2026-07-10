import {
  getMyProfile,
  updateMyProfile,
  type UpdateMyProfilePayload,
  type UserProfile,
} from "@/lib/auth-api";

export type { UpdateMyProfilePayload, UserProfile };

export { getMyProfile, updateMyProfile };

const PHONE_PATTERN = /^[0-9]{10}$/;

export function validateProfileUpdate(
  payload: UpdateMyProfilePayload,
  t: (vi: string, en: string) => string,
): string | null {
  if (!payload.fullName && !payload.phone) {
    return t("Chưa có thay đổi nào", "No changes to save");
  }

  if (payload.fullName !== undefined) {
    const name = payload.fullName.trim();
    if (name.length < 2 || name.length > 30) {
      return t("Họ tên phải từ 2–30 ký tự", "Full name must be 2–30 characters");
    }
  }

  if (payload.phone !== undefined) {
    const phone = payload.phone.trim();
    if (!PHONE_PATTERN.test(phone)) {
      return t("Số điện thoại phải đúng 10 chữ số", "Phone must be exactly 10 digits");
    }
  }

  return null;
}

export function buildProfileUpdatePayload(
  current: UserProfile,
  fullName: string,
  phone: string,
): UpdateMyProfilePayload {
  const payload: UpdateMyProfilePayload = {};
  const trimmedName = fullName.trim();
  const trimmedPhone = phone.trim();

  if (trimmedName !== current.fullName.trim()) {
    payload.fullName = trimmedName;
  }
  if (trimmedPhone !== (current.phone ?? "").trim()) {
    payload.phone = trimmedPhone;
  }

  return payload;
}
