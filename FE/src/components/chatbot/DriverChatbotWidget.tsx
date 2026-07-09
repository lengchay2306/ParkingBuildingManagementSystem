import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DriverChatbotPanel } from "@/components/chatbot/DriverChatbotPanel";
import { DriverChatbotToggle } from "@/components/chatbot/DriverChatbotToggle";
import {
  buildEnrichedChatMessage,
  detectDriverChatIntent,
  fetchDriverDataForChat,
} from "@/lib/chatbot-driver-context";
import {
  ChatbotApiError,
  createChatSession,
  deleteChatSession,
  getChatSession,
  getMyChatSessions,
  sendChatMessage,
  type ChatMessage,
  type ChatSession,
} from "@/services/chatbot.service";
import { recommendSlots } from "@/services/reservation.service";

const driverChatSessionsQueryKey = ["driver-chat-sessions"] as const;
const driverChatSessionQueryKey = (sessionId: string) => ["driver-chat-session", sessionId] as const;

export function DriverChatbotWidget() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasInitializedSession, setHasInitializedSession] = useState(false);
  const [isPreparingContext, setIsPreparingContext] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleteSuccessOpen, setIsDeleteSuccessOpen] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: driverChatSessionsQueryKey,
    queryFn: () => getMyChatSessions({ page: 1, limit: 20 }),
    enabled: isOpen,
    retry: (failureCount, error) => {
      if (error instanceof ChatbotApiError && error.status === 503) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const sessionQuery = useQuery({
    queryKey: activeSessionId ? driverChatSessionQueryKey(activeSessionId) : ["driver-chat-session", "none"],
    queryFn: () => getChatSession(activeSessionId!),
    enabled: isOpen && Boolean(activeSessionId),
    retry: (failureCount, error) => {
      if (error instanceof ChatbotApiError && (error.status === 503 || error.status === 404)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: () => createChatSession(),
    onSuccess: async ({ session, messages }) => {
      setActiveSessionId(session._id);
      queryClient.setQueryData(driverChatSessionQueryKey(session._id), { session, messages });
      await queryClient.invalidateQueries({ queryKey: driverChatSessionsQueryKey });
    },
    onError: (error) => {
      toast.error("Không thể tạo hội thoại", {
        description: getChatbotErrorMessage(error),
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      sendChatMessage(sessionId, message),
    onSuccess: async (result, variables) => {
      queryClient.setQueryData(
        driverChatSessionQueryKey(variables.sessionId),
        (current: { session: ChatSession; messages: ChatMessage[] } | undefined) => {
          if (!current) {
            return {
              session: result.session,
              messages: [result.userMessage, result.assistantMessage],
            };
          }
          return {
            session: result.session,
            messages: [...current.messages, result.userMessage, result.assistantMessage],
          };
        },
      );
      await queryClient.invalidateQueries({ queryKey: driverChatSessionsQueryKey });
    },
    onError: (error) => {
      toast.error("Không thể gửi tin nhắn", {
        description: getChatbotErrorMessage(error),
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => deleteChatSession(sessionId),
    onSuccess: async (_deleted, sessionId) => {
      queryClient.removeQueries({ queryKey: driverChatSessionQueryKey(sessionId) });
      setActiveSessionId(null);
      setHasInitializedSession(false);
      await queryClient.invalidateQueries({ queryKey: driverChatSessionsQueryKey });
      setIsDeleteSuccessOpen(true);
    },
    onError: (error) => {
      toast.error("Không thể xóa hội thoại", {
        description: getChatbotErrorMessage(error),
      });
    },
  });

  const sessions = sessionsQuery.data?.sessions ?? [];
  const messages = sessionQuery.data?.messages ?? [];

  const isUnavailable = useMemo(() => {
    const sessionError = sessionsQuery.error;
    const messageError = sessionQuery.error;
    if (sessionError instanceof ChatbotApiError && sessionError.status === 503) {
      return true;
    }
    if (messageError instanceof ChatbotApiError && messageError.status === 503) {
      return true;
    }
    return false;
  }, [sessionsQuery.error, sessionQuery.error]);

  const unavailableMessage = useMemo(() => {
    const error = sessionsQuery.error ?? sessionQuery.error;
    if (error instanceof ChatbotApiError) {
      return error.message;
    }
    return undefined;
  }, [sessionsQuery.error, sessionQuery.error]);

  useEffect(() => {
    if (!isOpen || hasInitializedSession || sessionsQuery.isLoading || sessionsQuery.isError) {
      return;
    }

    if (sessions.length > 0) {
      setActiveSessionId((current) => current ?? sessions[0]._id);
      setHasInitializedSession(true);
      return;
    }

    setHasInitializedSession(true);
    createSessionMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutate once when panel opens with no sessions
  }, [isOpen, hasInitializedSession, sessions, sessionsQuery.isLoading, sessionsQuery.isError]);

  useEffect(() => {
    if (!isOpen) {
      setHasInitializedSession(false);
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((current) => !current);
  };

  const handleNewSession = () => {
    createSessionMutation.mutate();
  };

  const handleDeleteSession = () => {
    if (!activeSessionId) {
      return;
    }
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteSession = () => {
    if (!activeSessionId || deleteSessionMutation.isPending) {
      return;
    }
    deleteSessionMutation.mutate(activeSessionId);
  };

  const handleSendMessage = async (message: string) => {
    if (!activeSessionId || sendMessageMutation.isPending || isPreparingContext) {
      return;
    }

    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setIsPreparingContext(true);
    try {
      const intent = detectDriverChatIntent(trimmed);
      const { vehicles, floors, reservations } = await fetchDriverDataForChat(queryClient);

      let messageToSend = trimmed;
      try {
        messageToSend = await buildEnrichedChatMessage({
          intent,
          userQuestion: trimmed,
          vehicles,
          floors,
          reservations,
          recommendSlots,
        });
      } catch {
        messageToSend = trimmed;
      }

      await sendMessageMutation.mutateAsync({
        sessionId: activeSessionId,
        message: messageToSend,
      });
    } catch (error) {
      if (!(error instanceof ChatbotApiError)) {
        toast.error("Không thể gửi tin nhắn", {
          description: getChatbotErrorMessage(error),
        });
      }
    } finally {
      setIsPreparingContext(false);
    }
  };

  return (
    <>
      <DriverChatbotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        messages={messages}
        isLoadingSessions={sessionsQuery.isLoading}
        isLoadingMessages={sessionQuery.isLoading}
        isCreatingSession={createSessionMutation.isPending}
        isSending={sendMessageMutation.isPending || isPreparingContext}
        isDeleting={deleteSessionMutation.isPending}
        isUnavailable={isUnavailable}
        unavailableMessage={unavailableMessage}
        onSendMessage={handleSendMessage}
      />
      <DriverChatbotToggle isOpen={isOpen} onToggle={handleToggle} />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa hội thoại với AI?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ tin nhắn trong cuộc trò chuyện này sẽ bị xóa vĩnh viễn. Hành động này không thể
              hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                setIsDeleteConfirmOpen(false);
                confirmDeleteSession();
              }}
            >
              {deleteSessionMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteSuccessOpen} onOpenChange={setIsDeleteSuccessOpen}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Đã xóa hội thoại</AlertDialogTitle>
            <AlertDialogDescription>
              Cuộc trò chuyện với AI đã được xóa thành công.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction className="rounded-xl">Đã hiểu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getChatbotErrorMessage(error: unknown) {
  if (error instanceof ChatbotApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Vui lòng thử lại.";
}
