import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Must be a prefix of BE MOBILE_RETURN_URL / MOBILE_CANCEL_URL
 * (BE .env: mobile://payment/return | mobile://payment/cancel).
 */
function getMobilePayOsRedirectPrefix() {
  const fromEnv = process.env.EXPO_PUBLIC_MOBILE_PAYOS_REDIRECT_PREFIX?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // Prefer the same scheme PayOS is given by BE — do not use exp:// here.
  return 'mobile://payment';
}

export type SubscriptionCheckoutOutcome = 'paid' | 'cancelled' | 'dismissed';

export type SubscriptionCheckoutResult = {
  outcome: SubscriptionCheckoutOutcome;
  orderCode?: string;
  redirectUrl?: string;
};

function parseCheckoutRedirect(url: string): Omit<SubscriptionCheckoutResult, 'redirectUrl'> {
  const lower = url.toLowerCase();
  // Custom-scheme URLs are unreliable with URL() on some RN runtimes.
  const parsed = Linking.parse(url);
  const query = parsed.queryParams ?? {};
  const cancel = typeof query.cancel === 'string' ? query.cancel : undefined;
  const status = typeof query.status === 'string' ? query.status : undefined;
  const orderCode = typeof query.orderCode === 'string' ? query.orderCode : undefined;
  const path = `${parsed.hostname ?? ''}/${parsed.path ?? ''}`.toLowerCase();

  const looksCancelled =
    cancel === 'true' ||
    (status != null && status.toUpperCase() === 'CANCELLED') ||
    lower.includes('/payment/cancel') ||
    path.includes('cancel');

  return {
    outcome: looksCancelled ? 'cancelled' : 'paid',
    orderCode,
  };
}

/**
 * Opens PayOS checkout. With BE platform=mobile, PayOS redirects to
 * mobile://payment/return|cancel and the auth session closes back into the app.
 */
export async function openSubscriptionCheckout(
  checkoutUrl: string,
): Promise<SubscriptionCheckoutResult> {
  const redirectPrefix = getMobilePayOsRedirectPrefix();

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, redirectPrefix, {
    showInRecents: true,
    preferEphemeralSession: false,
    createTask: false,
  });

  if (result.type === 'success' && result.url) {
    return {
      ...parseCheckoutRedirect(result.url),
      redirectUrl: result.url,
    };
  }

  return { outcome: 'dismissed' };
}
