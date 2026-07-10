import { authFetch } from "@/lib/auth-fetch";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export type ChatMessageRole = "user" | "assistant";

export type ChatSession = {
  _id: string;
  userId: string;
  title: string;
  model?: string;
  lastMessageAt?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatMessage = {
  _id: string;
  sessionId: string;
  userId: string;
  role: ChatMessageRole;
  content: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type SendMessageResult = {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  reply: string;
  model: string;
};

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export class ChatbotApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ChatbotApiError";
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

const chatbotErrorMessage = (status: number, fallback?: string) => {
  if (fallback) {
    return fallback;
  }
  switch (status) {
    case 400:
      return "Tin nhắn không hợp lệ.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền sử dụng trợ lý AI.";
    case 404:
      return "Không tìm thấy cuộc trò chuyện.";
    case 503:
      return "Trợ lý AI chưa sẵn sàng. Vui lòng thử lại sau.";
    default:
      return "Không thể kết nối trợ lý AI.";
  }
};

export const createChatSession = async (title?: string) => {
  const response = await authFetch(`${API_BASE}/api/v1/chatbot/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(title ? { title } : {}),
  });
  const payload = await parseJson<{ session?: ChatSession; messages?: ChatMessage[] }>(response);

  if (response.status !== 201) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  const session = payload.data?.session;
  const messages = payload.data?.messages ?? [];
  if (!session) {
    throw new ChatbotApiError(response.status, "Phản hồi tạo hội thoại thiếu dữ liệu.");
  }

  return { session, messages };
};

export const getMyChatSessions = async ({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await authFetch(`${API_BASE}/api/v1/chatbot/sessions?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  const payload = await parseJson<{
    sessions?: ChatSession[];
    pagination?: ChatPagination;
  }>(response);

  if (!response.ok) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  return {
    sessions: payload.data?.sessions ?? [],
    pagination:
      payload.data?.pagination ??
      ({
        page,
        limit,
        totalCount: payload.data?.sessions?.length ?? 0,
        totalPages: 1,
      } satisfies ChatPagination),
  };
};

export const getChatSession = async (sessionId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/chatbot/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "GET",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ session?: ChatSession; messages?: ChatMessage[] }>(response);

  if (!response.ok) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  const session = payload.data?.session;
  if (!session) {
    throw new ChatbotApiError(response.status, "Phản hồi hội thoại thiếu dữ liệu.");
  }

  return {
    session,
    messages: payload.data?.messages ?? [],
  };
};

export const sendChatMessage = async (sessionId: string, message: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/chatbot/sessions/${encodeURIComponent(sessionId)}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: message.trim() }),
    },
  );
  const payload = await parseJson<SendMessageResult>(response);

  if (!response.ok) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  if (!payload.data?.session || !payload.data.userMessage || !payload.data.assistantMessage) {
    throw new ChatbotApiError(response.status, "Phản hồi gửi tin nhắn thiếu dữ liệu.");
  }

  return payload.data;
};

export const deleteChatSession = async (sessionId: string) => {
  const response = await authFetch(
    `${API_BASE}/api/v1/chatbot/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  const payload = await parseJson<{ session?: ChatSession }>(response);

  if (!response.ok) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  return payload.data?.session ?? null;
};

export type StatelessChatHistoryEntry = {
  role: ChatMessageRole;
  content: string;
};

/** POST /api/v1/chatbot/message — legacy stateless chat */
export const sendStatelessChatMessage = async (
  message: string,
  history: StatelessChatHistoryEntry[] = [],
) => {
  const response = await authFetch(`${API_BASE}/api/v1/chatbot/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      message: message.trim(),
      history,
    }),
  });
  const payload = await parseJson<{ reply?: string; model?: string }>(response);

  if (!response.ok) {
    throw new ChatbotApiError(
      response.status,
      payload.message || chatbotErrorMessage(response.status),
    );
  }

  if (typeof payload.data?.reply !== "string") {
    throw new ChatbotApiError(response.status, "Phản hồi chatbot thiếu reply.");
  }

  return {
    reply: payload.data.reply,
    model: payload.data.model ?? "",
  };
};
