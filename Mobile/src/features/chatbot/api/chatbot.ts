import { authenticatedFetch } from '@/lib/auth-api';

import type {
  ChatMessage,
  ChatPagination,
  ChatSession,
  SendChatMessageResult,
} from '@/features/chatbot/api/types';
import { ChatbotApiError } from '@/features/chatbot/lib/chatbot-errors';

type ApiEnvelope<T> = {
  status?: string;
  message?: string;
  data?: T;
};

async function parseChatbotResponse<T>(response: Response): Promise<ApiEnvelope<T>> {
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok) {
    throw new ChatbotApiError(response.status, payload?.message);
  }
  return payload ?? {};
}

export async function createChatSession(title?: string): Promise<{
  session: ChatSession;
  messages: ChatMessage[];
}> {
  const response = await authenticatedFetch('/chatbot/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(title?.trim() ? { title: title.trim() } : {}),
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
    session?: ChatSession;
    messages?: ChatMessage[];
  }> | null;

  if (response.status !== 201) {
    throw new ChatbotApiError(response.status, payload?.message);
  }

  const session = payload?.data?.session;
  if (!session) {
    throw new ChatbotApiError(response.status, 'Chat session response is missing data');
  }
  return { session, messages: payload?.data?.messages ?? [] };
}

export async function listChatSessions({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<{ sessions: ChatSession[]; pagination: ChatPagination }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const response = await authenticatedFetch(`/chatbot/sessions?${params.toString()}`);
  const result = await parseChatbotResponse<{
    sessions?: ChatSession[];
    pagination?: ChatPagination;
  }>(response);

  return {
    sessions: result.data?.sessions ?? [],
    pagination:
      result.data?.pagination ??
      ({
        page,
        limit,
        totalCount: result.data?.sessions?.length ?? 0,
        totalPages: 1,
      } satisfies ChatPagination),
  };
}

export async function getChatSession(sessionId: string): Promise<{
  session: ChatSession;
  messages: ChatMessage[];
}> {
  const response = await authenticatedFetch(
    `/chatbot/sessions/${encodeURIComponent(sessionId.trim())}`,
  );
  const result = await parseChatbotResponse<{ session?: ChatSession; messages?: ChatMessage[] }>(
    response,
  );
  const session = result.data?.session;
  if (!session) {
    throw new ChatbotApiError(response.status, 'Chat session response is missing data');
  }
  return { session, messages: result.data?.messages ?? [] };
}

export async function sendChatSessionMessage(
  sessionId: string,
  message: string,
): Promise<SendChatMessageResult> {
  const response = await authenticatedFetch(
    `/chatbot/sessions/${encodeURIComponent(sessionId.trim())}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.trim() }),
    },
  );
  const result = await parseChatbotResponse<SendChatMessageResult>(response);
  if (!result.data?.session || !result.data.userMessage || !result.data.assistantMessage) {
    throw new ChatbotApiError(response.status, 'Send message response is missing data');
  }
  return result.data;
}

export async function deleteChatSession(sessionId: string): Promise<ChatSession | null> {
  const response = await authenticatedFetch(
    `/chatbot/sessions/${encodeURIComponent(sessionId.trim())}`,
    { method: 'DELETE' },
  );
  const result = await parseChatbotResponse<{ session?: ChatSession }>(response);
  return result.data?.session ?? null;
}
