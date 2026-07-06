import { LoaderCircle, Plus, X } from "lucide-react";

import { ChatComposer } from "@/components/chatbot/ChatComposer";
import { ChatMessageList } from "@/components/chatbot/ChatMessageList";
import { Button } from "@/components/ui/button";
import { DRIVER_CHAT_QUICK_PROMPTS } from "@/lib/chatbot-driver-context";
import type { ChatMessage, ChatSession } from "@/services/chatbot.service";

type DriverChatbotPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: () => void;
  messages: ChatMessage[];
  isLoadingSessions?: boolean;
  isLoadingMessages?: boolean;
  isCreatingSession?: boolean;
  isSending?: boolean;
  isDeleting?: boolean;
  isUnavailable?: boolean;
  unavailableMessage?: string;
  onSendMessage: (message: string) => void;
};

export function DriverChatbotPanel({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  messages,
  isLoadingSessions = false,
  isLoadingMessages = false,
  isCreatingSession = false,
  isSending = false,
  isDeleting = false,
  isUnavailable = false,
  unavailableMessage,
  onSendMessage,
}: DriverChatbotPanelProps) {
  if (!isOpen) {
    return null;
  }

  const composerDisabled =
    isUnavailable || !activeSessionId || isLoadingSessions || isCreatingSession || isDeleting;

  return (
    <div
      role="dialog"
      aria-label="Trợ lý đỗ xe"
      className="fixed inset-x-3 bottom-[4.5rem] z-[60] flex h-[min(72vh,520px)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-xl sm:inset-x-auto sm:right-5 sm:w-[360px]"
    >
      <header className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-foreground">Trợ lý đỗ xe</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-2 text-xs text-muted-foreground"
          onClick={onNewSession}
          disabled={isCreatingSession || isUnavailable}
        >
          {isCreatingSession ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <>
              <Plus className="mr-1 size-3.5" />
              Mới
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="size-4" />
        </Button>
      </header>

      {isUnavailable ? (
        <div className="px-4 py-3 text-sm text-destructive">
          {unavailableMessage ?? "Trợ lý AI chưa sẵn sàng."}
        </div>
      ) : null}

      {sessions.length > 1 ? (
        <div className="border-b border-border/80 px-4 py-2">
          <select
            value={activeSessionId ?? ""}
            onChange={(event) => onSelectSession(event.target.value)}
            disabled={isLoadingSessions}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm text-foreground outline-none"
          >
            {sessions.map((session) => (
              <option key={session._id} value={session._id}>
                {session.title || "Cuộc trò chuyện mới"}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ChatMessageList
        messages={messages}
        isLoading={isLoadingMessages || isCreatingSession}
        isSending={isSending}
      />

      {!isUnavailable ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-3 py-2">
          {DRIVER_CHAT_QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={composerDisabled || isSending}
              onClick={() => onSendMessage(prompt)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <ChatComposer onSend={onSendMessage} disabled={composerDisabled} isSending={isSending} />

      {activeSessionId && !isUnavailable ? (
        <div className="border-t border-border/50 px-4 py-2 text-center">
          <button
            type="button"
            onClick={onDeleteSession}
            disabled={isDeleting}
            className="text-xs text-muted-foreground transition hover:text-destructive disabled:opacity-50"
          >
            {isDeleting ? "Đang xóa..." : "Xóa hội thoại"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
