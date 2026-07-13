import React, { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { AUTH_ROUTES, STAFF_ROUTES } from '@/roles';

import { getStaffChatbotFabBottom } from '@/features/staff/components/staff-tab-bar';

export function MobileChatbotWidget() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { role, isAuthenticated, isLoading: isRoleLoading } = useSessionRole();
  const { t } = useLanguagePreference();
  const { showToast } = useAppToast();

  const isAuthScreen = pathname === AUTH_ROUTES.signIn || pathname === '/';
  const isStaffScanScreen = pathname === STAFF_ROUTES.scan;

  const audience = useMemo(() => resolveChatbotAudience(role), [role]);
  const presentation = useMemo(
    () => (audience ? getChatbotRolePresentation(audience, t) : null),
    [audience, t],
  );

  const chatbot = useMobileChatbot(audience ?? 'customer');

  useEffect(() => {
    if (isStaffScanScreen && chatbot.isOpen) {
      chatbot.setIsOpen(false);
    }
  }, [chatbot, isStaffScanScreen]);

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

  if (isRoleLoading || !isAuthenticated || isAuthScreen || isStaffScanScreen || !audience || !presentation) {
    return null;
  }

  const staffFabBottom = role === 'STAFF' ? getStaffChatbotFabBottom(insets.bottom) : undefined;

  return (
    <>
      <ChatbotFab
        collapseLabel={t('Thu gọn trợ lý AI', 'Collapse AI assistant')}
        expandLabel={t('Hiện trợ lý AI', 'Show AI assistant')}
        fixedBottom={staffFabBottom}
        isOpen={chatbot.isOpen}
        label={presentation.fabLabel}
        onPress={() => chatbot.setIsOpen(true)}
        tabBarOffset={role === 'STAFF' ? getStaffChatbotFabBottom(insets.bottom) : 64}
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
