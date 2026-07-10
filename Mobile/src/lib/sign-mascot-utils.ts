const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9]{10}$/;

export type MascotSpeechTone = "idle" | "hint" | "welcome" | "password" | "peek" | "error" | "busy";

export type MascotSpeech = {
  text: string;
  tone: MascotSpeechTone;
};

/** Text colors for mascot dialogue bubbles by interaction type. */
export const SIGN_MASCOT_SPEECH_COLORS: Record<MascotSpeechTone, string> = {
  idle: "#1d4ed8",
  hint: "#0369a1",
  welcome: "#047857",
  password: "#6d28d9",
  peek: "#c2410c",
  error: "#b91c1c",
  busy: "#4338ca",
};

export function mascotLine(text: string, tone: MascotSpeechTone): MascotSpeech {
  return { text, tone };
}

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return EMAIL_RE.test(trimmed);
}

export function isValidPhone(value: string): boolean {
  return PHONE_RE.test(value.trim());
}

/** Map typed length to horizontal pupil offset (px). */
export function emailLengthToLookX(length: number): number {
  const clamped = Math.min(Math.max(length, 0), 32);
  return -6 + (clamped / 32) * 12;
}

export function pickRandomLine(lines: MascotSpeech[]): MascotSpeech {
  return lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? mascotLine("", "hint");
}

export function getIdleMascotLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Chào bạn! Hôm nay mình đồng hành tìm chỗ đỗ xe nhé?",
        "Hi! I am here to help you find parking today!",
      ),
      "idle",
    ),
    mascotLine(t("ParkOS luôn sẵn sàng, mình cũng vậy!", "ParkOS is ready — and so am I!"), "idle"),
    mascotLine(
      t(
        "Mình là linh vật ParkOS, rất vui được gặp bạn!",
        "I am the ParkOS mascot — nice to meet you!",
      ),
      "idle",
    ),
    mascotLine(
      t(
        "Bạn thích dark mode hay light mode? Mình thích cả hai!",
        "Dark or light mode? I like both!",
      ),
      "idle",
    ),
    mascotLine(
      t(
        "Nhớ kiểm tra email kỹ trước khi đăng nhập nha!",
        "Double-check your email before signing in!",
      ),
      "idle",
    ),
  ];
}

export function getLoginWelcomeLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Chào bạn quay lại! Mình chờ bạn đăng nhập nè~",
        "Welcome back! I have been waiting for you to sign in~",
      ),
      "welcome",
    ),
    mascotLine(
      t(
        "Mình sẽ giúp bạn vào tài khoản nhanh thôi!",
        "I will help you get into your account in no time!",
      ),
      "welcome",
    ),
    mascotLine(
      t(
        "Nhập email và mật khẩu đi, mình ở đây hỗ trợ!",
        "Enter your email and password — I am right here!",
      ),
      "welcome",
    ),
    mascotLine(
      t("Rất vui gặp lại bạn! Đăng nhập thôi nào!", "Good to see you again! Let us sign in!"),
      "welcome",
    ),
  ];
}

export function getSignupWelcomeLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Ồ, bạn mới à? Mình rất vui được làm quen!",
        "Oh, a new friend? I am so happy to meet you!",
      ),
      "welcome",
    ),
    mascotLine(
      t(
        "Chào mừng đến ParkOS! Mình sẽ hướng dẫn bạn đăng ký nhé!",
        "Welcome to ParkOS! I will guide you through sign-up!",
      ),
      "welcome",
    ),
    mascotLine(
      t(
        "Điền thông tin bên dưới đi, mình theo dõi giúp bạn!",
        "Fill in the form below — I will watch over you!",
      ),
      "welcome",
    ),
    mascotLine(
      t(
        "Tạo tài khoản xong là mình cùng bạn tìm chỗ đỗ xe luôn!",
        "Once you sign up, we can find parking together!",
      ),
      "welcome",
    ),
  ];
}

export function getEmailFocusLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t("Mình đang theo dõi email của bạn nè...", "I am following your email right now..."),
      "hint",
    ),
    mascotLine(t("Gõ chậm thôi, mình đọc được mà!", "Type slowly — I can keep up!"), "hint"),
    mascotLine(
      t(
        "Email đúng thì có @ và dấu chấm nhé, mình nhắc cho!",
        "A valid email needs @ and a dot — just a friendly tip!",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Email dài cũng không sao, mình không bị mỏi mắt đâu!",
        "Even a long email is fine — my eyes are strong!",
      ),
      "hint",
    ),
  ];
}

export function getInvalidEmailLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Ối, email này sai rồi! Thử kiểm tra lại @ và dấu chấm nhé.",
        "Oops, this email looks wrong! Double-check the @ and dot.",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Ối, email này hình như thiếu @ hay dấu chấm rồi! Mình đọc lại giúp bạn nhé.",
        "Oops, this email seems to miss @ or a dot! Let me help you double-check.",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Hmm, mình chưa nhận ra đây là email hợp lệ đâu... thử lại nha!",
        "Hmm, I do not think this is a valid email yet... try again!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Email hơi lạ đấy! Kiểu name@domain.com mới đúng nè.",
        "That email looks a bit odd! Something like name@domain.com works best.",
      ),
      "error",
    ),
  ];
}

export function getSignupNameLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t("Tên hay quá! Mình sẽ nhớ tên bạn luôn~", "What a nice name! I will remember it~"),
      "hint",
    ),
    mascotLine(
      t(
        "Rất vui được làm quen! Bạn tên gì cũng đẹp hết!",
        "So nice to meet you! Any name looks great!",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Tên này sẽ hiện trên hồ sơ của bạn đó, mình biết mà!",
        "This name will show on your profile — I know the drill!",
      ),
      "hint",
    ),
  ];
}

export function getSignupPhoneLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Số điện thoại 10 chữ số thôi nha, mình đếm giúp được không?",
        "Just 10 digits for your phone — want me to count along?",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Nhập số điện thoại đi, mình giữ bí mật cho bạn!",
        "Type your phone number — I will keep it safe!",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Mình đang lắng nghe... à không, đang đọc số điện thoại bạn gõ!",
        "I am listening... well, reading your phone digits!",
      ),
      "hint",
    ),
  ];
}

export function getInvalidPhoneLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Ối, số điện thoại phải đủ 10 số nha! Mình đếm lại giúp bạn.",
        "Oops, the phone number needs exactly 10 digits! Let me count with you.",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Hmm, số này chưa đủ 10 chữ số đâu... thử nhập lại nhé!",
        "Hmm, this number is not 10 digits yet... try again!",
      ),
      "error",
    ),
  ];
}

export function getPasswordCoverLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Mình che mắt rồi, yên tâm nhập mật khẩu nhé!",
        "Eyes covered — type your password safely!",
      ),
      "password",
    ),
    mascotLine(
      t(
        "Mật khẩu là bí mật, mình tuyệt đối không nhìn!",
        "Passwords are secret — I will not peek!",
      ),
      "password",
    ),
    mascotLine(
      t(
        "Cứ nhập đi, mình đứng ngoài cuộc hoàn toàn!",
        "Go ahead, I am staying completely out of it!",
      ),
      "password",
    ),
    mascotLine(
      t("Mình tin bạn sẽ nhập đúng mật khẩu!", "I trust you to enter the right password!"),
      "password",
    ),
  ];
}

export function getPasswordPeekLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t("Hí hí, mình không nhìn đâu... có đâu...", "Hehe, I am not looking... not at all..."),
      "peek",
    ),
    mascotLine(t("Chỉ liếc một chút xíu thôi mà!", "Just a tiny little peek!"), "peek"),
    mascotLine(
      t(
        "Ối, suýt thấy mật khẩu rồi! May mà mình che kịp!",
        "Oops, almost saw your password! Good thing I covered up!",
      ),
      "peek",
    ),
    mascotLine(
      t(
        "Mình biết bạn đang gõ gì đấy, nhưng mình giữ bí mật nhé!",
        "I know you are typing something, but my lips are sealed!",
      ),
      "peek",
    ),
    mascotLine(
      t("Đừng lo, mình sẽ không mách lẻo với ai đâu!", "Do not worry, I will not tell anyone!"),
      "peek",
    ),
  ];
}

export function getBusyMascotLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t("Đợi chút nhé, mình đang xử lý giúp bạn...", "Hang on, I am processing this for you..."),
      "busy",
    ),
    mascotLine(
      t("Mình cũng hồi hộp lắm, đừng rời mắt nhé!", "I am nervous too — do not look away!"),
      "busy",
    ),
    mascotLine(
      t(
        "Sắp xong rồi, mình hy vọng mọi thứ suôn sẻ!",
        "Almost there — I hope everything goes smoothly!",
      ),
      "busy",
    ),
    mascotLine(
      t("Cảm ơn bạn đã kiên nhẫn chờ mình nhé!", "Thank you for patiently waiting with me!"),
      "busy",
    ),
    mascotLine(
      t(
        "Hơi lâu một chút? Có thể do mạng hoặc máy chủ bận đó!",
        "Taking a while? Maybe the network or server is busy!",
      ),
      "busy",
    ),
  ];
}

export function getPasswordTooShortLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Mật khẩu cần ít nhất 8 ký tự nha, mình đếm giúp được không?",
        "Password needs at least 8 characters — want me to count along?",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Hơi ngắn quá! Mình nghĩ mật khẩu nên dài hơn một chút.",
        "A bit too short! I think your password should be longer.",
      ),
      "error",
    ),
  ];
}

export function getEmptyEmailLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Bạn chưa nhập email kìa! Mình đang chờ đó~",
        "You have not entered an email yet! I am waiting~",
      ),
      "error",
    ),
    mascotLine(
      t("Email đâu rồi? Gõ giúp mình một cái nhé!", "Where is your email? Type one in for me!"),
      "error",
    ),
  ];
}

export function getInvalidNameLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Họ tên nên từ 2–30 ký tự nha, mình nhắc cho!",
        "Full name should be 2–30 characters — just a tip!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Tên hơi ngắn hoặc dài quá rồi, thử lại nhé!",
        "That name is a bit too short or too long — try again!",
      ),
      "error",
    ),
  ];
}

export function getGoogleUnavailableLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Đăng nhập Google chưa sẵn sàng đâu, mình báo với bạn trước nhé!",
        "Google sign-in is not ready yet — heads up from me!",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Tính năng Google đang được mình chuẩn bị, bạn dùng email trước nha!",
        "Google sign-in is on the way — use email for now!",
      ),
      "hint",
    ),
  ];
}

export function getForgotPasswordLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Đặt lại mật khẩu chưa có đâu, mình nhớ giúp bạn sau nhé!",
        "Password reset is not available yet — I will remind you later!",
      ),
      "hint",
    ),
    mascotLine(
      t(
        "Tính năng quên mật khẩu đang được làm, tạm thời thử lại email nhé!",
        "Forgot-password is coming soon — try your email for now!",
      ),
      "hint",
    ),
  ];
}

export function getEmailNotFoundLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Ối, mình không tìm thấy email này trong hệ thống đâu... kiểm tra lại nhé!",
        "Oops, I cannot find this email in our system... double-check it!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Email này có vẻ chưa được đăng ký, thử email khác hoặc tạo tài khoản mới nhé!",
        "This email may not be registered yet — try another one or sign up!",
      ),
      "error",
    ),
  ];
}

export function getLoginFailedLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Hmm, email hoặc mật khẩu chưa khớp đâu... mình tin bạn thử lại được!",
        "Hmm, email or password did not match... you can try again!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Ối, đăng nhập chưa thành công! Kiểm tra lại thông tin nhé.",
        "Oops, sign-in failed! Please double-check your details.",
      ),
      "error",
    ),
  ];
}

export function getRegisterFailedLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Đăng ký chưa thành công rồi... thử lại hoặc đổi email khác nhé!",
        "Sign-up did not work... try again or use another email!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Ối, có gì đó chưa ổn khi đăng ký! Mình nghĩ bạn nên kiểm tra lại form.",
        "Something went wrong signing up! Maybe review the form again.",
      ),
      "error",
    ),
  ];
}

export function getInvalidPasswordLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Mật khẩu chưa đúng rồi! Mình tin bạn nhớ ra sau một chút thôi~",
        "That password is not right! I bet you will remember in a moment~",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Hmm, mật khẩu hình như không khớp đâu... thử lại nhé!",
        "Hmm, the password does not seem to match... try again!",
      ),
      "error",
    ),
  ];
}

export function getAccountBannedLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Tài khoản này đang bị khóa rồi, mình không cho đăng nhập được đâu!",
        "This account is locked — I cannot let you sign in!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Ối, tài khoản bị khóa mất rồi! Bạn liên hệ hỗ trợ nhé.",
        "Oops, this account is banned! Please contact support.",
      ),
      "error",
    ),
  ];
}

export function getAccountAlreadyExistsLines(
  t: (vi: string, en: string) => string,
): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Email này có vẻ đã có người dùng rồi, thử email khác nhé!",
        "This email seems taken already — try another one!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Tài khoản với email này đã tồn tại! Đăng nhập hoặc đổi email khác nha.",
        "An account with this email already exists! Sign in or use another email.",
      ),
      "error",
    ),
  ];
}

export function getNetworkErrorLines(t: (vi: string, en: string) => string): MascotSpeech[] {
  return [
    mascotLine(
      t(
        "Mình không kết nối được máy chủ... kiểm tra mạng rồi thử lại nhé!",
        "I cannot reach the server... check your network and try again!",
      ),
      "error",
    ),
    mascotLine(
      t(
        "Có vẻ mạng đang trục trặc, mình cũng không gọi API được đâu!",
        "Looks like a network hiccup — I cannot call the API either!",
      ),
      "error",
    ),
  ];
}

type AuthErrorContext = "login" | "register";

function normalizeApiErrorText(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function isJoiFieldError(lower: string, field: string): boolean {
  return (
    lower.includes(`"${field}"`) || lower.startsWith(`${field} `) || lower.includes(` ${field} `)
  );
}

function isNetworkError(lower: string): boolean {
  return (
    lower.includes("network") ||
    lower.includes("fetch") ||
    lower.includes("cannot reach") ||
    lower.includes("request failed") ||
    lower.includes("server error") ||
    lower.includes("expo_public_api_url")
  );
}

function isEmailNotFoundError(lower: string): boolean {
  return (
    lower.includes("doesn't exit") ||
    lower.includes("doesn't exist") ||
    (lower.includes("email") && lower.includes("not found"))
  );
}

function isAccountAlreadyExistsError(lower: string): boolean {
  return (
    lower.includes("already exist") ||
    lower.includes("already exists") ||
    (lower.includes("already") && (lower.includes("account") || lower.includes("email")))
  );
}

/**
 * Map backend / Joi validation text to mascot dialogue.
 * Covers all known messages from BE auth.service.js + auth.validator.js (Joi).
 * Never returns raw API strings.
 */
function mapKnownAuthApiMessage(
  message: string,
  t: (vi: string, en: string) => string,
  context: AuthErrorContext,
): MascotSpeech | null {
  const lower = normalizeApiErrorText(message);
  if (!lower) return null;

  if (isNetworkError(lower)) {
    return pickRandomLine(getNetworkErrorLines(t));
  }

  if (isEmailNotFoundError(lower)) {
    return pickRandomLine(getEmailNotFoundLines(t));
  }

  if (lower.includes("banned") || lower.includes("locked")) {
    return pickRandomLine(getAccountBannedLines(t));
  }

  if (
    lower.includes("invalid password") ||
    (lower.includes("invalid") && lower.includes("password"))
  ) {
    return pickRandomLine(getInvalidPasswordLines(t));
  }

  if (isAccountAlreadyExistsError(lower)) {
    return pickRandomLine(getAccountAlreadyExistsLines(t));
  }

  if (lower.includes("cannot create")) {
    return pickRandomLine(getRegisterFailedLines(t));
  }

  if (isJoiFieldError(lower, "email")) {
    if (lower.includes("required")) return pickRandomLine(getEmptyEmailLines(t));
    if (lower.includes("valid") || lower.includes("format"))
      return pickRandomLine(getInvalidEmailLines(t));
  }

  if (isJoiFieldError(lower, "password")) {
    if (lower.includes("required") || lower.includes("at least") || lower.includes("length")) {
      return pickRandomLine(getPasswordTooShortLines(t));
    }
  }

  if (context === "register" && isJoiFieldError(lower, "fullname")) {
    return pickRandomLine(getInvalidNameLines(t));
  }

  if (context === "register" && isJoiFieldError(lower, "phone")) {
    return pickRandomLine(getInvalidPhoneLines(t));
  }

  if (lower.includes("missing") || lower.includes("mising")) {
    return context === "register"
      ? pickRandomLine(getRegisterFailedLines(t))
      : pickRandomLine(getLoginFailedLines(t));
  }

  return null;
}

/** Map login API errors to mascot dialogue (never plain API text). */
export function mapAuthErrorToMascotSpeech(
  message: string,
  t: (vi: string, en: string) => string,
): MascotSpeech {
  return mapKnownAuthApiMessage(message, t, "login") ?? pickRandomLine(getLoginFailedLines(t));
}

/** Map register API errors to mascot dialogue (never plain API text). */
export function mapRegisterErrorToMascotSpeech(
  message: string,
  t: (vi: string, en: string) => string,
): MascotSpeech {
  return (
    mapKnownAuthApiMessage(message, t, "register") ?? pickRandomLine(getRegisterFailedLines(t))
  );
}

export function getMascotSpeechColor(tone: MascotSpeechTone): string {
  return SIGN_MASCOT_SPEECH_COLORS[tone];
}
