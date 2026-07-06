import { useEffect, useState } from "react";
import { Bot, X } from "lucide-react";

import { cn } from "@/lib/utils";

type DriverChatbotToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
};

const GREETING_VISIBLE_MS = 3500;
const GREETING_INTERVAL_MS = 9000;

export function DriverChatbotToggle({ isOpen, onToggle }: DriverChatbotToggleProps) {
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowGreeting(false);
      return;
    }

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let cycleTimer: ReturnType<typeof setInterval> | undefined;

    const showBriefly = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
      }
      setShowGreeting(true);
      hideTimer = setTimeout(() => setShowGreeting(false), GREETING_VISIBLE_MS);
    };

    const startTimer = setTimeout(showBriefly, 800);
    cycleTimer = setInterval(showBriefly, GREETING_INTERVAL_MS);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(hideTimer);
      clearInterval(cycleTimer);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex items-end gap-2">
      {!isOpen ? (
        <div
          className={cn(
            "relative mb-1 max-w-[200px] rounded-2xl rounded-br-sm border border-border/80 bg-card px-3.5 py-2.5 text-sm leading-snug text-foreground shadow-md transition-all duration-300",
            showGreeting
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-1 opacity-0",
          )}
          role="note"
          aria-hidden={!showGreeting}
        >
          Xin chào, mình là trợ lý AI
          <span
            className="absolute -bottom-1.5 right-3 size-3 rotate-45 border-b border-r border-border/80 bg-card"
            aria-hidden
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={onToggle}
        aria-label={isOpen ? "Đóng trợ lý" : "Mở trợ lý AI"}
        aria-expanded={isOpen}
        className="grid size-12 shrink-0 place-items-center rounded-full bg-foreground text-background shadow-md transition hover:opacity-90"
      >
        {isOpen ? <X className="size-5" /> : <Bot className="size-5" />}
      </button>
    </div>
  );
}
