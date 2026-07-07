import { useState, type FormEvent, type KeyboardEvent } from "react";
import { LoaderCircle, SendHorizonal } from "lucide-react";

import { Button } from "@/components/ui/button";

const MAX_MESSAGE_LENGTH = 2000;

type ChatComposerProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  isSending?: boolean;
};

export function ChatComposer({ onSend, disabled = false, isSending = false }: ChatComposerProps) {
  const [draft, setDraft] = useState("");

  const trimmed = draft.trim();
  const canSend = Boolean(trimmed) && trimmed.length <= MAX_MESSAGE_LENGTH && !disabled && !isSending;

  const submit = () => {
    if (!canSend) {
      return;
    }
    onSend(trimmed);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border/80 bg-background p-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card pl-4 pr-1.5 py-1.5">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập câu hỏi..."
          disabled={disabled || isSending}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          className="max-h-24 min-h-[24px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          className="size-9 shrink-0 rounded-full"
          aria-label="Gửi"
        >
          {isSending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <SendHorizonal className="size-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
