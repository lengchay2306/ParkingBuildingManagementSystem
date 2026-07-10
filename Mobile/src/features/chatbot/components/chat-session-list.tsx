import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import type { ChatSession } from "@/features/chatbot/api/types";
import { useDesignColors } from "@/hooks/use-design-colors";

type ChatSessionListProps = {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoading?: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  isCreatingSession?: boolean;
  t: (vi: string, en: string) => string;
};

function formatSessionTime(iso: string | undefined, t: (vi: string, en: string) => string): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return t("Vừa xong", "Just now");
  }
  if (diffMins < 60) {
    return t(`${diffMins} phút trước`, `${diffMins}m ago`);
  }
  if (diffHours < 24) {
    return t(`${diffHours} giờ trước`, `${diffHours}h ago`);
  }
  if (diffDays < 7) {
    return t(`${diffDays} ngày trước`, `${diffDays}d ago`);
  }

  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function ChatSessionList({
  sessions,
  activeSessionId,
  isLoading,
  onSelectSession,
  onNewSession,
  isCreatingSession,
  t,
}: ChatSessionListProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const aTime = new Date(a.lastMessageAt ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bTime = new Date(b.lastMessageAt ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bTime - aTime;
      }),
    [sessions],
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DesignColors.primaryFocus} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={sortedSessions}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons color={DesignColors.inkSubtle} name="chatbubbles-outline" size={40} />
          <ThemedText style={styles.emptyTitle}>
            {t("Chưa có hội thoại", "No conversations yet")}
          </ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            {t("Bắt đầu cuộc trò chuyện mới với trợ lý AI", "Start a new chat with the assistant")}
          </ThemedText>
          <Pressable
            disabled={isCreatingSession}
            onPress={onNewSession}
            style={({ pressed }) => [styles.emptyBtn, pressed && styles.emptyBtnPressed]}
          >
            {isCreatingSession ? (
              <ActivityIndicator color={DesignColors.onPrimary} size="small" />
            ) : (
              <>
                <Ionicons color={DesignColors.onPrimary} name="add" size={18} />
                <ThemedText style={styles.emptyBtnText}>
                  {t("Hội thoại mới", "New chat")}
                </ThemedText>
              </>
            )}
          </Pressable>
        </View>
      }
      renderItem={({ item }) => {
        const active = item._id === activeSessionId;
        const timeLabel = formatSessionTime(item.lastMessageAt ?? item.updatedAt, t);
        const count = item.messageCount ?? 0;

        return (
          <Pressable
            onPress={() => onSelectSession(item._id)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={[styles.cardIcon, active && styles.cardIconActive]}>
              <Ionicons
                color={active ? DesignColors.primaryFocus : DesignColors.inkMuted}
                name="chatbubble-ellipses-outline"
                size={20}
              />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTopRow}>
                <ThemedText
                  numberOfLines={1}
                  style={[styles.cardTitle, active && styles.cardTitleActive]}
                >
                  {item.title || t("Hội thoại mới", "New chat")}
                </ThemedText>
                {timeLabel ? <ThemedText style={styles.cardTime}>{timeLabel}</ThemedText> : null}
              </View>
              <View style={styles.cardMetaRow}>
                {count > 0 ? (
                  <ThemedText style={styles.cardMeta}>
                    {t(`${count} tin nhắn`, `${count} messages`)}
                  </ThemedText>
                ) : (
                  <ThemedText style={styles.cardMeta}>
                    {t("Chưa có tin nhắn", "No messages yet")}
                  </ThemedText>
                )}
                {active ? (
                  <View style={styles.activeBadge}>
                    <ThemedText style={styles.activeBadgeText}>{t("Đang mở", "Active")}</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons color={DesignColors.inkSubtle} name="chevron-forward" size={18} />
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.xs,
      paddingBottom: Spacing.lg,
      gap: Spacing.sm,
      flexGrow: 1,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xl,
      gap: Spacing.sm,
    },
    emptyTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontSize: 16,
      marginTop: Spacing.sm,
    },
    emptySubtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textAlign: "center",
      paddingHorizontal: Spacing.xl,
    },
    emptyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: 10,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.primaryFocus,
    },
    emptyBtnPressed: {
      opacity: 0.9,
    },
    emptyBtnText: {
      ...Typography.bodySm,
      color: DesignColors.onPrimary,
      fontWeight: "600",
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    cardActive: {
      borderColor: DesignColors.primaryFocus,
      backgroundColor: `${DesignColors.primaryFocus}10`,
    },
    cardPressed: {
      opacity: 0.92,
    },
    cardIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    cardIconActive: {
      borderColor: `${DesignColors.primaryFocus}55`,
      backgroundColor: `${DesignColors.primaryFocus}18`,
    },
    cardBody: {
      flex: 1,
      gap: 4,
    },
    cardTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    cardTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: "600",
      flex: 1,
    },
    cardTitleActive: {
      color: DesignColors.primaryFocus,
    },
    cardTime: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 10,
    },
    cardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
    },
    cardMeta: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 11,
      flex: 1,
    },
    activeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.pill,
      backgroundColor: `${DesignColors.primaryFocus}22`,
    },
    activeBadgeText: {
      ...Typography.caption,
      color: DesignColors.primaryFocus,
      fontSize: 10,
      fontWeight: "700",
    },
  });
}
