import React from 'react';
import { StyleSheet, View } from 'react-native';

import { DisplaySettingsContent } from '@/components/display-settings-content';
import { Spacing } from '@/constants/design';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffSettingsScreen() {
  useStaffRoleGuard();
  const { t } = useLanguagePreference();

  return (
    <StaffPageShell
      eyebrow={t('Cài đặt', 'Settings')}
      title={t('Hiển thị & ngôn ngữ', 'Display & language')}
      subtitle={t(
        'Giao diện sáng/tối và ngôn ngữ áp dụng cho toàn bộ màn hình nhân viên.',
        'Light/dark theme and language apply across all staff screens.',
      )}>
      <View style={styles.panel}>
        <DisplaySettingsContent />
      </View>
    </StaffPageShell>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.md,
  },
});
