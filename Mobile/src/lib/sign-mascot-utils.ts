const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed);
}

/** Map typed length to horizontal pupil offset (px). */
export function emailLengthToLookX(length: number): number {
  const clamped = Math.min(Math.max(length, 0), 32);
  return -6 + (clamped / 32) * 12;
}

export function pickRandomLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '';
}

export function getIdleMascotLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Chào bạn! Hôm nay tìm chỗ đỗ xe nhé?', 'Hi! Looking for parking today?'),
    t('ParkOS luôn sẵn sàng hỗ trợ bạn.', 'ParkOS is ready to help you.'),
    t('Nhớ kiểm tra email trước khi đăng nhập nhé.', 'Double-check your email before signing in.'),
    t('Bạn thích dark mode hay light mode?', 'Do you prefer dark or light mode?'),
    t('Mình là linh vật bãi đỗ, rất vui được gặp bạn!', 'I am the parking mascot, nice to meet you!'),
  ];
}

export function getWelcomeMascotLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Chào mừng đến ParkOS!', 'Welcome to ParkOS!'),
    t('Đăng nhập để tìm chỗ đỗ xe nhé.', 'Sign in to find parking.'),
  ];
}

export function getEmailFocusLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Mình đang theo dõi email của bạn...', 'I am following your email...'),
    t('Gõ chậm thôi, mình đọc được mà!', 'Type slowly, I can keep up!'),
    t('Email đúng format là có @ và dấu chấm nhé.', 'A valid email needs @ and a dot.'),
  ];
}

export function getSignupNameLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Tên đẹp đấy!', 'Nice name!'),
    t('Rất vui được làm quen!', 'Nice to meet you!'),
  ];
}

export function getPasswordCoverLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Mình che mắt rồi, yên tâm nhé!', 'Eyes covered — you are safe!'),
    t('Mật khẩu là bí mật, mình không nhìn!', 'Passwords are secret — I will not look!'),
    t('Cứ nhập đi, mình đứng ngoài cuộc!', 'Go ahead, I am staying out of it!'),
  ];
}

export function getPasswordPeekLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Hí hí, mình không nhìn đâu...', 'Hehe, I am not looking...'),
    t('Chỉ nhìn một chút thôi!', 'Just a tiny peek!'),
    t('Ối, suýt thấy mật khẩu rồi!', 'Oops, almost saw your password!'),
  ];
}

export function getBusyMascotLines(t: (vi: string, en: string) => string): string[] {
  return [
    t('Đợi chút nhé, đang xử lý...', 'Hang on, processing...'),
    t('Mình cũng hồi hộp lắm!', 'I am nervous too!'),
  ];
}
