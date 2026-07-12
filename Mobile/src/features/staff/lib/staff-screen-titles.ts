import { useMemo } from 'react';

import { useLanguagePreference } from '@/hooks/language-preference';

/** Localized main titles for staff tab screens — use with `StaffScreenHeader`. */
export function useStaffScreenTitles() {
  const { t } = useLanguagePreference();

  return useMemo(
    () => ({
      dashboard: t('Tổng quan bãi xe', 'Parking Overview'),
      spots: t('Ô gửi xe', 'Spots'),
      sessions: t('Phiên gửi xe', 'Sessions'),
      staff: t('Nhân viên', 'Staff'),
      account: t('Tài khoản', 'Account'),
      settings: t('Cài đặt', 'Settings'),
      checkout: t('Ra cổng', 'Checkout'),
      scanQr: t('Quét QR', 'Scan QR'),
      checkIn: t('Check-in', 'Check-in'),
    }),
    [t],
  );
}
