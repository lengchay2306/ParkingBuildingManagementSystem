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
