import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { MaxContentWidth } from '@/constants/theme';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const users = [
  ['M. Chen', 'Staff', 'Booth 03', 'Active', 'now'],
  ['Mara N.', 'Manager', 'North Plaza', 'Active', '12m'],
  ['A. Tran', 'Driver', '-', 'Active', '1h'],
  ['K. Pham', 'Staff', 'Patrol L1', 'On break', '3m'],
  ['V. Le', 'Admin', 'HQ', 'Active', 'now'],
  ['T. Nguyen', 'Staff', 'Booth 01', 'Suspended', '2d'],
];

const rbac = [
  ['View dashboard', 'Driver, Staff, Manager, Admin'],
  ['Open session', 'Staff, Manager, Admin'],
  ['Close session', 'Staff, Manager, Admin'],
  ['Override slot', 'Manager, Admin'],
  ['Manage tariff', 'Manager, Admin'],
  ['Manage users', 'Admin'],
  ['AI tuning', 'Admin'],
  ['System config', 'Admin'],
];

const sensitivity = [
  ['Plate OCR threshold', 92, '%'],
  ['Reroute aggressiveness', 68, '%'],
  ['Overstay grace', 15, 'min'],
];

const buildings: [string, string, boolean][] = [
  ['North Plaza', '574 slots - 4 floors', true],
  ['Riverside Tower', '318 slots - 3 floors', true],
  ['Old Quarter Lot', '92 slots - L1', false],
];

const tariffs = [
  ['Sedan', '25k VND/h'],
  ['SUV', '35k VND/h'],
  ['EV', '30k VND/h'],
  ['Bike', '10k VND/h'],
  ['Lost card', '+100k VND'],
  ['Overstay', 'x1.5'],
];

const getHealth = (DesignColors: DesignColorPalette) => [
  ['Gate cameras', '12/12', DesignColors.semanticSuccess],
  ['IoT slot sensors', '572/574', DesignColors.inkSubtle],
  ['Payment gateway', 'OK - 184ms', DesignColors.semanticSuccess],
  ['AI router', 'OK - v2.4', DesignColors.semanticSuccess],
];

export default function AdminScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const health = useMemo(() => getHealth(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>{t('Vai trò 04 - Quản trị hệ thống', 'Role 04 - System Administrator')}</ThemedText>
          <ThemedText style={styles.title}>{t('Bảng điều khiển', 'Control panel')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Quản lý tài khoản, phân quyền RBAC, độ nhạy AI, thiết bị và chính sách giá.',
              'Accounts, RBAC, AI sensitivity, hardware and tariff policies.',
            )}
          </ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <ThemedText style={styles.cardTitle}>{t('Tài khoản người dùng', 'User accounts')}</ThemedText>
              <ThemedText style={styles.caption}>{t('248 hoạt động - 12 tạm khóa', '248 active - 12 suspended')}</ThemedText>
            </View>
            <View style={styles.actionPill}>
              <ThemedText style={styles.actionPillText}>{t('Mời mới', 'Invite')}</ThemedText>
            </View>
          </View>
          <View style={styles.list}>
            {users.map(([name, role, assignment, status, lastSeen]) => (
              <View key={name} style={styles.userRow}>
                <View style={styles.userMeta}>
                  <View style={styles.userAvatar}>
                    <ThemedText style={styles.userAvatarText}>
                      {name
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </ThemedText>
                  </View>
                  <View>
                    <ThemedText style={styles.userName}>{name}</ThemedText>
                    <ThemedText style={styles.userDetail}>{assignment}</ThemedText>
                  </View>
                </View>
                <View style={styles.userStatusBlock}>
                  <ThemedText style={styles.userRole}>{role}</ThemedText>
                  <ThemedText style={styles.userStatus}>{status}</ThemedText>
                  <ThemedText style={styles.userSeen}>{lastSeen}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>{t('Ma trận RBAC', 'RBAC matrix')}</ThemedText>
          <ThemedText style={styles.caption}>{t('Quyền theo vai trò', 'Permissions by role')}</ThemedText>
          <View style={styles.list}>
            {rbac.map(([perm, roles]) => (
              <View key={perm} style={styles.rbacRow}>
                <ThemedText style={styles.rbacPerm}>{perm}</ThemedText>
                <ThemedText style={styles.rbacRoles}>{roles}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>{t('Độ nhạy AI', 'AI sensitivity')}</ThemedText>
          <ThemedText style={styles.caption}>{t('Điều phối ô và nhận diện biển số', 'Slot routing and plate recognition')}</ThemedText>
          <View style={styles.list}>
            {sensitivity.map(([label, value, unit]) => (
              <View key={label} style={styles.sliderRow}>
                <View style={styles.sliderHeader}>
                  <ThemedText style={styles.sliderLabel}>{label}</ThemedText>
                  <ThemedText style={styles.sliderValue}>
                    {value}
                    {unit}
                  </ThemedText>
                </View>
                <View style={styles.sliderTrack}>
                  <View
                    style={[styles.sliderFill, { width: `${Math.min(100, Number(value))}%` }]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>{t('Tòa nhà và khu vực', 'Buildings and zones')}</ThemedText>
          <View style={styles.list}>
            {buildings.map(([name, detail, enabled]) => (
              <View key={name} style={styles.buildingRow}>
                <View>
                  <ThemedText style={styles.userName}>{name}</ThemedText>
                  <ThemedText style={styles.caption}>{detail}</ThemedText>
                </View>
                <View style={enabled ? styles.toggleOn : styles.toggleOff}>
                  <View style={enabled ? styles.toggleKnobOn : styles.toggleKnobOff} />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>{t('Chính sách giá', 'Tariff policy')}</ThemedText>
          <View style={styles.tariffGrid}>
            {tariffs.map(([label, value]) => (
              <View key={label} style={styles.tariffRow}>
                <ThemedText style={styles.caption}>{label}</ThemedText>
                <ThemedText style={styles.tariffValue}>{value}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardTitle}>{t('Tình trạng hệ thống', 'System health')}</ThemedText>
            <ThemedText style={styles.caption}>{t('Tất cả ổn định', 'All green')}</ThemedText>
          </View>
          <View style={styles.list}>
            {health.map(([label, value, color]) => (
              <View key={label} style={styles.healthRow}>
                <View style={styles.healthLeft}>
                  <View style={[styles.healthDot, { backgroundColor: color }]} />
                  <ThemedText style={styles.userName}>{label}</ThemedText>
                </View>
                <ThemedText style={styles.healthValue}>{value}</ThemedText>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DesignColors.canvas,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.section,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Typography.eyebrow,
    textTransform: 'uppercase',
    color: DesignColors.inkSubtle,
  },
  title: {
    ...Typography.displayMd,
    color: DesignColors.ink,
  },
  subtitle: {
    ...Typography.body,
    color: DesignColors.inkMuted,
  },
  card: {
    backgroundColor: DesignColors.surface1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    ...Typography.cardTitle,
    color: DesignColors.ink,
  },
  caption: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  actionPill: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  actionPillText: {
    ...Typography.caption,
    color: DesignColors.ink,
  },
  list: {
    gap: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
  },
  userMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: DesignColors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    ...Typography.mono,
    color: DesignColors.ink,
  },
  userName: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  userDetail: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  userStatusBlock: {
    alignItems: 'flex-end',
    gap: 2,
  },
  userRole: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
    textTransform: 'uppercase',
  },
  userStatus: {
    ...Typography.caption,
    color: DesignColors.ink,
  },
  userSeen: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  rbacRow: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
    gap: 4,
  },
  rbacPerm: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  rbacRoles: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
  sliderRow: {
    gap: Spacing.xs,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    ...Typography.bodySm,
    color: DesignColors.ink,
  },
  sliderValue: {
    ...Typography.mono,
    color: DesignColors.inkSubtle,
  },
  sliderTrack: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.surface2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.primary,
  },
  buildingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleOn: {
    width: 36,
    height: 20,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.primary,
    padding: 2,
  },
  toggleOff: {
    width: 36,
    height: 20,
    borderRadius: Radius.pill,
    backgroundColor: DesignColors.hairline,
    padding: 2,
  },
  toggleKnobOn: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: DesignColors.surface1,
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: DesignColors.surface1,
  },
  tariffGrid: {
    gap: Spacing.sm,
  },
  tariffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
  },
  tariffValue: {
    ...Typography.bodySm,
    fontWeight: 600,
    color: DesignColors.ink,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface2,
    padding: Spacing.sm,
  },
  healthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  healthValue: {
    ...Typography.caption,
    color: DesignColors.inkSubtle,
  },
});
