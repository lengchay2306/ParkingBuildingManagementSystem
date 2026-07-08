export class ChatbotApiError extends Error {
  status: number;

  constructor(status: number, fallback?: string) {
    super(resolveChatbotErrorMessage(status, fallback));
    this.name = 'ChatbotApiError';
    this.status = status;
  }
}

export function resolveChatbotErrorMessage(status: number, fallback?: string): string {
  if (fallback?.trim()) {
    return fallback.trim();
  }
  switch (status) {
    case 400:
      return 'Tin nhắn không hợp lệ.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Bạn không có quyền sử dụng trợ lý AI.';
    case 404:
      return 'Không tìm thấy cuộc trò chuyện.';
    case 503:
      return 'Trợ lý AI chưa sẵn sàng. Vui lòng thử lại sau.';
    default:
      return 'Không thể kết nối trợ lý AI.';
  }
}

export function resolveUnknownChatbotError(error: unknown): string {
  if (error instanceof ChatbotApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Vui lòng thử lại.';
}

export function isChatbotUnavailable(error: unknown): boolean {
  return error instanceof ChatbotApiError && error.status === 503;
}
