import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { ChatComposer } from '@/features/chatbot/components/chat-composer';
import { ChatMessageList } from '@/features/chatbot/components/chat-message-list';
import { ChatQuickPrompts } from '@/features/chatbot/components/chat-quick-prompts';
import { ChatSessionList } from '@/features/chatbot/components/chat-session-list';
import type { ChatMessage, ChatSession } from '@/features/chatbot/api/types';
import type { ChatbotRolePresentation } from '@/features/chatbot/lib/role-config';
import { useDesignColors } from '@/hooks/use-design-colors';

type PanelView = 'chat' | 'history';

type ChatbotPanelProps = {
  visible: boolean;
  onClose: () => void;
  presentation: ChatbotRolePresentation;
  t: (vi: string, en: string) => string;
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

const SHEET_HEIGHT_RATIO = 0.92;

export function ChatbotPanel({
  visible,
  onClose,
  presentation,
  t,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  messages,
  isLoadingSessions,
  isLoadingMessages,
  isCreatingSession,
  isSending,
  isDeleting,
  isUnavailable,
  unavailableMessage,
  onSendMessage,
}: ChatbotPanelProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [panelView, setPanelView] = useState<PanelView>('chat');

  useEffect(() => {
    if (!visible) {
      setPanelView('chat');
    }
  }, [visible]);

  const sheetHeight = windowHeight * SHEET_HEIGHT_RATIO;
  const activeSession = sessions.find((s) => s._id === activeSessionId);

  const composerDisabled =
    isUnavailable || !activeSessionId || isLoadingSessions || isCreatingSession || isDeleting;

  const hasUserMessages = messages.some((message) => message.role === 'user');
  const showQuickPrompts = !isUnavailable && !hasUserMessages;

  function handleClose() {
    setPanelView('chat');
    onClose();
  }

  function handleSelectSession(sessionId: string) {
    onSelectSession(sessionId);
    setPanelView('chat');
  }

  function handleNewSession() {
    onNewSession();
    setPanelView('chat');
  }

  return (
    <Modal animationType="slide" onRequestClose={handleClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: insets.bottom + Spacing.sm,
            },
          ]}>
          <View style={styles.handle} />

          {panelView === 'history' ? (
            <>
              <View style={styles.header}>
                <Pressable
                  onPress={() => setPanelView('chat')}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  <Ionicons color={DesignColors.ink} name="arrow-back" size={22} />
                </Pressable>
                <View style={styles.headerText}>
                  <ThemedText style={styles.title}>
                    {t('Lịch sử hội thoại', 'Conversation history')}
                  </ThemedText>
                  <ThemedText style={styles.subtitle}>
                    {t(
                      `${sessions.length} cuộc trò chuyện`,
                      `${sessions.length} conversation${sessions.length === 1 ? '' : 's'}`,
                    )}
                  </ThemedText>
                </View>
                <Pressable
                  disabled={isCreatingSession || isUnavailable}
                  onPress={handleNewSession}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  {isCreatingSession ? (
                    <ActivityIndicator color={DesignColors.primaryFocus} size="small" />
                  ) : (
                    <Ionicons color={DesignColors.primaryFocus} name="add" size={22} />
                  )}
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  <Ionicons color={DesignColors.ink} name="close" size={22} />
                </Pressable>
              </View>

              <View style={styles.body}>
                <ChatSessionList
                  activeSessionId={activeSessionId}
                  isCreatingSession={isCreatingSession}
                  isLoading={isLoadingSessions}
                  onNewSession={handleNewSession}
                  onSelectSession={handleSelectSession}
                  sessions={sessions}
                  t={t}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.header}>
                <Pressable
                  onPress={() => setPanelView('history')}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  <Ionicons color={DesignColors.ink} name="time-outline" size={22} />
                </Pressable>
                <View style={styles.headerText}>
                  <ThemedText style={styles.title}>{presentation.panelTitle}</ThemedText>
                  <ThemedText numberOfLines={1} style={styles.subtitle}>
                    {activeSession?.title
                      ? activeSession.title
                      : presentation.panelSubtitle}
                  </ThemedText>
                </View>
                <Pressable
                  disabled={isCreatingSession || isUnavailable}
                  onPress={handleNewSession}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  {isCreatingSession ? (
                    <ActivityIndicator color={DesignColors.primaryFocus} size="small" />
                  ) : (
                    <Ionicons color={DesignColors.primaryFocus} name="add" size={22} />
                  )}
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                  <Ionicons color={DesignColors.ink} name="close" size={22} />
                </Pressable>
              </View>

              {sessions.length > 0 ? (
                <Pressable
                  onPress={() => setPanelView('history')}
                  style={({ pressed }) => [styles.historyHint, pressed && styles.historyHintPressed]}>
                  <Ionicons color={DesignColors.primaryFocus} name="layers-outline" size={16} />
                  <ThemedText style={styles.historyHintText}>
                    {t(
                      `${sessions.length} hội thoại · Xem lịch sử`,
                      `${sessions.length} chat${sessions.length === 1 ? '' : 's'} · View history`,
                    )}
                  </ThemedText>
                  <Ionicons color={DesignColors.inkSubtle} name="chevron-forward" size={16} />
                </Pressable>
              ) : null}

              {isUnavailable ? (
                <View style={styles.errorBanner}>
                  <ThemedText style={styles.errorText}>
                    {unavailableMessage ?? t('Trợ lý AI chưa sẵn sàng.', 'AI assistant is unavailable.')}
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.body}>
                <ChatMessageList
                  isLoading={isLoadingMessages || isCreatingSession}
                  isSending={isSending}
                  messages={messages}
                />
              </View>

              <View style={styles.footer}>
                {showQuickPrompts ? (
                  <ChatQuickPrompts
                    disabled={composerDisabled || isSending}
                    onSelect={onSendMessage}
                    prompts={presentation.quickPrompts}
                    t={t}
                  />
                ) : null}

                <ChatComposer
                  disabled={composerDisabled}
                  isSending={isSending}
                  onSend={onSendMessage}
                  placeholder={t('Nhập câu hỏi…', 'Type a question…')}
                />

                {activeSessionId && !isUnavailable ? (
                  <Pressable
                    disabled={isDeleting}
                    onPress={onDeleteSession}
                    style={styles.deleteLink}>
                    <ThemedText style={styles.deleteText}>
                      {isDeleting
                        ? t('Đang xóa…', 'Deleting…')
                        : t('Xóa hội thoại', 'Delete conversation')}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheet: {
      backgroundColor: DesignColors.canvas,
      borderTopLeftRadius: Radius.xl,
      borderTopRightRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      overflow: 'hidden',
    },
    handle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 2,
      backgroundColor: DesignColors.hairlineStrong,
      marginTop: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
    },
    subtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
    },
    iconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    iconBtnPressed: {
      opacity: 0.88,
    },
    historyHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    historyHintPressed: {
      opacity: 0.92,
    },
    historyHintText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
      flex: 1,
      fontWeight: '500',
    },
    errorBanner: {
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
      padding: Spacing.sm,
      borderRadius: Radius.lg,
      backgroundColor: `${DesignColors.accentAmber}18`,
      borderWidth: 1,
      borderColor: `${DesignColors.accentAmber}44`,
    },
    errorText: {
      ...Typography.caption,
      color: DesignColors.accentAmber,
      fontSize: 12,
    },
    body: {
      flex: 1,
      minHeight: 0,
    },
    footer: {
      flexShrink: 0,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
    },
    deleteLink: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    deleteText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 11,
    },
  });
}
