import { Alert, Linking, Platform } from 'react-native';

export type PaymentAppShortcut = {
  id: string;
  label: string;
  /** VietQR.io app id for https://dl.vietqr.io/pay?app= */
  vietQrAppId?: string;
  /** Native schemes tried before HTTPS fallback */
  schemes?: string[];
  accent: string;
};

/** Popular VN wallets / banks for quick open from subscription payment sheet. */
export const PAYMENT_APP_SHORTCUTS: PaymentAppShortcut[] = [
  {
    id: 'momo',
    label: 'MoMo',
    vietQrAppId: 'momo',
    schemes: ['momo://', 'momo://app'],
    accent: '#A50064',
  },
  {
    id: 'vcb',
    label: 'Vietcombank',
    vietQrAppId: 'vcb',
    schemes: ['vietcombank://', 'vcb://'],
    accent: '#007A33',
  },
  {
    id: 'tcb',
    label: 'Techcombank',
    vietQrAppId: 'tcb',
    schemes: ['tcb://', 'techcombankmobile://'],
    accent: '#E5470A',
  },
  {
    id: 'mb',
    label: 'MB Bank',
    vietQrAppId: 'mb',
    schemes: ['mbbank://', 'mb://'],
    accent: '#1E4598',
  },
  {
    id: 'bidv',
    label: 'BIDV',
    vietQrAppId: 'bidv',
    schemes: ['bidv://'],
    accent: '#1A4B9C',
  },
  {
    id: 'vtb',
    label: 'VietinBank',
    vietQrAppId: 'vtb',
    schemes: ['vietinbank://', 'vtb://'],
    accent: '#00529C',
  },
  {
    id: 'acb',
    label: 'ACB',
    vietQrAppId: 'acb',
    schemes: ['acb://'],
    accent: '#003B70',
  },
  {
    id: 'vpb',
    label: 'VPBank',
    vietQrAppId: 'vpb',
    schemes: ['vpbankneo://', 'vpbank://'],
    accent: '#00A651',
  },
];

function buildVietQrDeeplink(appId: string): string {
  return `https://dl.vietqr.io/pay?app=${encodeURIComponent(appId)}`;
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    const can = await Linking.canOpenURL(url);
    if (!can && !url.startsWith('https://') && !url.startsWith('http://')) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens MoMo / bank app so the user can scan the PayOS VietQR
 * shown on the PayOS checkout page (BE only returns checkoutUrl).
 */
export async function openPaymentApp(
  shortcut: PaymentAppShortcut,
  t: (vi: string, en: string) => string,
): Promise<void> {
  if (shortcut.schemes?.length) {
    for (const scheme of shortcut.schemes) {
      if (await tryOpenUrl(scheme)) {
        return;
      }
    }
  }

  if (shortcut.vietQrAppId) {
    if (await tryOpenUrl(buildVietQrDeeplink(shortcut.vietQrAppId))) {
      return;
    }
  }

  Alert.alert(
    t('Không mở được ứng dụng', 'Could not open app'),
    t(
      `Hãy cài ${shortcut.label}, rồi quét mã QR trên trang PayOS.`,
      `Install ${shortcut.label}, then scan the QR on the PayOS page.`,
    ),
  );
}

export async function openPayOsCheckout(
  checkoutUrl: string,
  t: (vi: string, en: string) => string,
): Promise<void> {
  const opened = await tryOpenUrl(checkoutUrl);
  if (!opened) {
    Alert.alert(
      t('Không mở được PayOS', 'Could not open PayOS'),
      Platform.OS === 'ios'
        ? t('Thử lại hoặc mở link thanh toán trong trình duyệt.', 'Retry or open the payment link in a browser.')
        : t('Thử lại hoặc mở link thanh toán trong trình duyệt.', 'Retry or open the payment link in a browser.'),
    );
  }
}
