import { authenticatedFetch } from '@/lib/auth-api';
import { parseApiEnvelope, type ApiEnvelope } from '@/lib/api-error';

import type {
  ChatMessage,
  ChatPagination,
  ChatSession,
  SendChatMessageResult,
} from '@/features/chatbot/api/types';
import { ChatbotApiError } from '@/features/chatbot/lib/chatbot-errors';

async function parseChatbotResponse<T>(response: Response, expectedStatus?: number) {
  try {
    return await parseApiEnvelope<T>(response, 'Chatbot request failed', expectedStatus);
  } catch (error) {
    throw new ChatbotApiError(
      response.status,
      error instanceof Error ? error.message : undefined,
    );
  }
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

  const payload = await parseChatbotResponse<{
    session?: ChatSession;
    messages?: ChatMessage[];
  }>(response, 201);

  const session = payload.data?.session;
  if (!session) {
    throw new ChatbotApiError(response.status, 'Chat session response is missing data');
  }
  return { session, messages: payload.data?.messages ?? [] };
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
