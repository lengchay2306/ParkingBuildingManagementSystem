import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import type { ChatMessage } from '@/features/chatbot/api/types';
import { getUserMessageDisplayText } from '@/features/chatbot/lib/message-wrap';
import { useDesignColors } from '@/hooks/use-design-colors';

type ChatMessageListProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
  isSending?: boolean;
};

export function ChatMessageList({ messages, isLoading, isSending }: ChatMessageListProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages.length, isSending]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DesignColors.primaryFocus} />
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={messages}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => {
        const isUser = item.role === 'user';
        const text = isUser ? getUserMessageDisplayText(item.content) : item.content;
        return (
          <View style={[styles.bubbleWrap, isUser ? styles.userWrap : styles.assistantWrap]}>
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
              <ThemedText style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                {text}
              </ThemedText>
            </View>
          </View>
        );
      }}
      ListFooterComponent={
        isSending ? (
          <View style={styles.typingRow}>
            <ActivityIndicator color={DesignColors.primaryFocus} size="small" />
            <ThemedText style={styles.typingText}>…</ThemedText>
          </View>
        ) : null
      }
    />
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      gap: Spacing.md,
      flexGrow: 1,
    },
    bubbleWrap: {
      width: '100%',
    },
    userWrap: {
      alignItems: 'flex-end',
    },
    assistantWrap: {
      alignItems: 'flex-start',
    },
    bubble: {
      maxWidth: '85%',
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    userBubble: {
      backgroundColor: DesignColors.primaryFocus,
      borderBottomRightRadius: 4,
    },
    assistantBubble: {
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderBottomLeftRadius: 4,
    },
    bubbleText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontSize: 14,
      lineHeight: 21,
    },
    userBubbleText: {
      color: DesignColors.onPrimary,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingVertical: Spacing.xs,
    },
    typingText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
  });
}
