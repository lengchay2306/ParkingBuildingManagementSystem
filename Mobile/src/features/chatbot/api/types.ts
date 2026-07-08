export type ChatMessageRole = 'user' | 'assistant';

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

export type SendChatMessageResult = {
  session: ChatSession;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  reply: string;
  model: string;
};

export type SlotRecommendation = {
  parkingSlotId: string;
  slotNumber: string;
  status: string;
  floorName?: string | null;
  score: number;
  reasons: string[];
};
