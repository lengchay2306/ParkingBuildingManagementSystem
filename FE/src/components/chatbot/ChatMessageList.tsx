import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";

import { getUserMessageDisplayText } from "@/lib/chatbot-driver-context";
import type { ChatMessage } from "@/services/chatbot.service";
import { cn } from "@/lib/utils";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
  isSending?: boolean;
};

export function ChatMessageList({ messages, isLoading, isSending }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
        <LoaderCircle className="mr-2 size-4 animate-spin" />
        Đang tải...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8 text-center text-sm text-muted-foreground">
        Hỏi về đặt chỗ, xe hoặc gửi xe.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.map((message) => {
        const isUser = message.role === "user";
        return (
          <div
            key={message._id}
            className={cn("flex", isUser ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] text-[15px] leading-6",
                isUser
                  ? "rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-background"
                  : "text-foreground",
              )}
            >
              <p className="whitespace-pre-wrap break-words">
                {isUser ? getUserMessageDisplayText(message.content) : message.content}
              </p>
            </div>
          </div>
        );
      })}

      {isSending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          Đang trả lời...
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
