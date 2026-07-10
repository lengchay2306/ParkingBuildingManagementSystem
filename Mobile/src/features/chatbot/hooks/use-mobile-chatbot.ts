import { getParkingSlots } from "@/features/customer/api/parking";
import { getMyReservations } from "@/features/customer/api/reservations";
import {
  createChatSession,
  deleteChatSession,
  getChatSession,
  listChatSessions,
  sendChatSessionMessage,
} from "@/features/chatbot/api/chatbot";
import type { ChatMessage, ChatSession } from "@/features/chatbot/api/types";
import { buildCustomerEnrichedMessage } from "@/features/chatbot/lib/customer-enrich";
import {
  ChatbotApiError,
  isChatbotUnavailable,
  resolveUnknownChatbotError,
} from "@/features/chatbot/lib/chatbot-errors";
import type { ChatbotAudience } from "@/features/chatbot/lib/role-config";
import {
  buildStaffEnrichedMessage,
  listStaffReservationsForChat,
} from "@/features/chatbot/lib/staff-enrich";
import { getParkingSessions, getParkingSlots as getStaffParkingSlots } from "@/features/staff/api";
import { getMyProfile } from "@/lib/auth-api";
import { useCallback, useEffect, useRef, useState } from "react";

export function useMobileChatbot(audience: ChatbotAudience) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [unavailableMessage, setUnavailableMessage] = useState<string | undefined>();
  const initRef = useRef(false);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const result = await listChatSessions({ page: 1, limit: 20 });
      setSessions(result.sessions);
      setIsUnavailable(false);
      setUnavailableMessage(undefined);
      return result.sessions;
    } catch (error) {
      if (isChatbotUnavailable(error)) {
        setIsUnavailable(true);
        setUnavailableMessage(resolveUnknownChatbotError(error));
      }
      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    setIsLoadingMessages(true);
    try {
      const result = await getChatSession(sessionId);
      setMessages(result.messages);
      setIsUnavailable(false);
    } catch (error) {
      if (isChatbotUnavailable(error)) {
        setIsUnavailable(true);
        setUnavailableMessage(resolveUnknownChatbotError(error));
      }
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const createSession = useCallback(async () => {
    setIsCreatingSession(true);
    try {
      const { session, messages: initialMessages } = await createChatSession();
      setActiveSessionId(session._id);
      setMessages(initialMessages);
      await loadSessions();
      setIsUnavailable(false);
      return session;
    } catch (error) {
      if (isChatbotUnavailable(error)) {
        setIsUnavailable(true);
        setUnavailableMessage(resolveUnknownChatbotError(error));
      }
      throw error;
    } finally {
      setIsCreatingSession(false);
    }
  }, [loadSessions]);

  useEffect(() => {
    if (!isOpen) {
      initRef.current = false;
      return;
    }

    if (initRef.current) {
      return;
    }

    initRef.current = true;
    void (async () => {
      const existing = await loadSessions();
      if (existing.length > 0) {
        const firstId = existing[0]._id;
        setActiveSessionId(firstId);
        await loadSessionMessages(firstId);
        return;
      }
      try {
        await createSession();
      } catch {
        // surfaced via isUnavailable / toast in widget
      }
    })();
  }, [isOpen, loadSessions, loadSessionMessages, createSession]);

  const selectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      await loadSessionMessages(sessionId);
    },
    [loadSessionMessages],
  );

  const enrichMessage = useCallback(
    async (userQuestion: string): Promise<string> => {
      if (audience === "customer") {
        const profile = await getMyProfile();
        const vehicles = (profile.vehicles ?? []).filter(
          (v) => v.status?.toUpperCase() !== "INACTIVE",
        );
        const [floors, reservations] = await Promise.all([
          getParkingSlots().catch(() => []),
          getMyReservations().catch(() => []),
        ]);
        return buildCustomerEnrichedMessage({
          userQuestion,
          vehicles,
          floors,
          reservations,
        });
      }

      const [floors, reservations, sessionsResult] = await Promise.all([
        getStaffParkingSlots().catch(() => []),
        listStaffReservationsForChat().catch(() => []),
        getParkingSessions({ status: "ACTIVE", limit: 30 }).catch(() => ({
          sessions: [],
          pagination: { currentPage: 1, totalPage: 0, totalItems: 0, itemsPerPage: 30 },
        })),
      ]);

      return buildStaffEnrichedMessage({
        userQuestion,
        floors,
        reservations,
        sessions: sessionsResult.sessions,
      });
    },
    [audience],
  );

  const sendMessage = useCallback(
    async (rawMessage: string) => {
      if (!activeSessionId || isSending) {
        return;
      }
      const trimmed = rawMessage.trim();
      if (!trimmed) {
        return;
      }

      setIsSending(true);
      try {
        let messageToSend = trimmed;
        try {
          messageToSend = await enrichMessage(trimmed);
        } catch {
          messageToSend = trimmed;
        }

        const result = await sendChatSessionMessage(activeSessionId, messageToSend);
        setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
        setSessions((prev) => prev.map((s) => (s._id === result.session._id ? result.session : s)));
      } catch (error) {
        if (error instanceof ChatbotApiError && isChatbotUnavailable(error)) {
          setIsUnavailable(true);
          setUnavailableMessage(error.message);
        }
        throw error;
      } finally {
        setIsSending(false);
      }
    },
    [activeSessionId, enrichMessage, isSending],
  );

  const removeSession = useCallback(async () => {
    if (!activeSessionId || isDeleting) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteChatSession(activeSessionId);
      setActiveSessionId(null);
      setMessages([]);
      const remaining = await loadSessions();
      if (remaining.length > 0) {
        await selectSession(remaining[0]._id);
      } else {
        await createSession();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [activeSessionId, createSession, isDeleting, loadSessions, selectSession]);

  return {
    isOpen,
    setIsOpen,
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    isLoadingSessions,
    isLoadingMessages,
    isCreatingSession,
    isSending,
    isDeleting,
    isUnavailable,
    unavailableMessage,
    createSession,
    sendMessage,
    removeSession,
    selectSession,
  };
}
