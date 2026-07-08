import React, { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { usePathname } from 'expo-router';

import { useAppToast } from '@/components/app-toast';
import { ChatbotFab } from '@/features/chatbot/components/chatbot-fab';
import { ChatbotPanel } from '@/features/chatbot/components/chatbot-panel';
import { useMobileChatbot } from '@/features/chatbot/hooks/use-mobile-chatbot';
import { resolveUnknownChatbotError } from '@/features/chatbot/lib/chatbot-errors';
import {
  getChatbotRolePresentation,
  resolveChatbotAudience,
} from '@/features/chatbot/lib/role-config';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useSessionRole } from '@/hooks/session-role';
import { AUTH_ROUTES } from '@/roles';

const TAB_BAR_CONTENT_HEIGHT = 52;
const TAB_BAR_VERTICAL_PADDING = 12;

export function MobileChatbotWidget() {
  const pathname = usePathname();
  const { role, isAuthenticated, isLoading: isRoleLoading } = useSessionRole();
  const { t } = useLanguagePreference();
  const { showToast } = useAppToast();

  const isAuthScreen = pathname === AUTH_ROUTES.signIn || pathname === '/';

  const audience = useMemo(() => resolveChatbotAudience(role), [role]);
  const presentation = useMemo(
    () => (audience ? getChatbotRolePresentation(audience, t) : null),
    [audience, t],
  );

  const chatbot = useMobileChatbot(audience ?? 'customer');

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        await chatbot.sendMessage(message);
      } catch (error) {
        showToast(resolveUnknownChatbotError(error), 'error');
      }
    },
    [chatbot, showToast],
  );

  const handleDeleteSession = useCallback(() => {
    Alert.alert(
      t('Xóa hội thoại?', 'Delete conversation?'),
      t('Toàn bộ tin nhắn trong hội thoại này sẽ bị xóa.', 'All messages in this chat will be removed.'),
      [
        { text: t('Hủy', 'Cancel'), style: 'cancel' },
        {
          text: t('Xóa', 'Delete'),
          style: 'destructive',
          onPress: () => {
            void chatbot.removeSession().catch((error) => {
              showToast(resolveUnknownChatbotError(error), 'error');
            });
          },
        },
      ],
    );
  }, [chatbot, showToast, t]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      void chatbot.selectSession(sessionId);
    },
    [chatbot],
  );

  if (isRoleLoading || !isAuthenticated || isAuthScreen || !audience || !presentation) {
    return null;
  }

  return (
    <>
      <ChatbotFab
        isOpen={chatbot.isOpen}
        label={presentation.fabLabel}
        onPress={() => chatbot.setIsOpen(true)}
        tabBarOffset={TAB_BAR_CONTENT_HEIGHT + TAB_BAR_VERTICAL_PADDING}
      />
      <ChatbotPanel
        activeSessionId={chatbot.activeSessionId}
        isCreatingSession={chatbot.isCreatingSession}
        isDeleting={chatbot.isDeleting}
        isLoadingMessages={chatbot.isLoadingMessages}
        isLoadingSessions={chatbot.isLoadingSessions}
        isSending={chatbot.isSending}
        isUnavailable={chatbot.isUnavailable}
        messages={chatbot.messages}
        onClose={() => chatbot.setIsOpen(false)}
        onDeleteSession={handleDeleteSession}
        onNewSession={() => {
          void chatbot.createSession().catch((error) => {
            showToast(resolveUnknownChatbotError(error), 'error');
          });
        }}
        onSelectSession={handleSelectSession}
        onSendMessage={(message) => void handleSendMessage(message)}
        presentation={presentation}
        sessions={chatbot.sessions}
        t={t}
        unavailableMessage={chatbot.unavailableMessage}
        visible={chatbot.isOpen}
      />
    </>
  );
}
