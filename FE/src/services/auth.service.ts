const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
};

type RegisterResponse = {
  status?: string;
  message?: string;
  data?: unknown;
};

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

const parseJson = async (response: Response): Promise<RegisterResponse> => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {};
  }
  return (await response.json()) as RegisterResponse;
};

export const registerUser = async (payload: RegisterRequest) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await parseJson(response);

  if (response.status === 201) {
    return data;
  }

  const fallback = response.status === 400 ? "Invalid register data." : "Register failed.";
  throw new AuthApiError(response.status, data.message || fallback);
};

/** POST /api/v1/auth/forgot-password — public */
export const forgotPassword = async (email: string) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      data.message || (response.status === 400 ? "Email không hợp lệ hoặc không tồn tại." : "Không gửi được email đặt lại mật khẩu."),
    );
  }

  const message =
    (data.data as { message?: string } | undefined)?.message ||
    data.message ||
    "Password reset email sent successfully";
  return { message };
};

/** POST /api/v1/auth/reset-password — public */
export const resetPassword = async (token: string, newPassword: string) => {
  const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await parseJson(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      data.message ||
        (response.status === 400
          ? "Token không hợp lệ hoặc đã hết hạn."
          : "Không đặt lại được mật khẩu."),
    );
  }

  const message =
    (data.data as { message?: string } | undefined)?.message ||
    data.message ||
    "Password reset successfully";
  return { message };
};
