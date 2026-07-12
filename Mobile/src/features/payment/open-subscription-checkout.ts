import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Must match MOBILE_RETURN_URL / MOBILE_CANCEL_URL path prefix on the BE
 * (default scheme from app.json: mobile://payment/...).
 */
function getMobilePayOsRedirectPrefix() {
  const fromEnv = process.env.EXPO_PUBLIC_MOBILE_PAYOS_REDIRECT_PREFIX?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  // Linking.createURL('payment') → mobile://payment (dev may use exp://...)
  return Linking.createURL('payment');
}

export type SubscriptionCheckoutOutcome = 'paid' | 'cancelled' | 'dismissed';

export type SubscriptionCheckoutResult = {
  outcome: SubscriptionCheckoutOutcome;
  orderCode?: string;
  redirectUrl?: string;
};

function parseCheckoutRedirect(url: string): Omit<SubscriptionCheckoutResult, 'redirectUrl'> {
  try {
    const parsed = new URL(url);
    const cancel = parsed.searchParams.get('cancel');
    const status = parsed.searchParams.get('status');
    const orderCode = parsed.searchParams.get('orderCode') ?? undefined;
    const path = parsed.pathname.toLowerCase();
    const looksCancelled =
      cancel === 'true' ||
      (status != null && status.toUpperCase() === 'CANCELLED') ||
      path.includes('cancel');

    return {
      outcome: looksCancelled ? 'cancelled' : 'paid',
      orderCode: orderCode ?? undefined,
    };
  } catch {
    const parsed = Linking.parse(url);
    const query = parsed.queryParams ?? {};
    const cancel = typeof query.cancel === 'string' ? query.cancel : undefined;
    const status = typeof query.status === 'string' ? query.status : undefined;
    const orderCode = typeof query.orderCode === 'string' ? query.orderCode : undefined;
    const path = (parsed.path ?? '').toLowerCase();
    const looksCancelled =
      cancel === 'true' ||
      (status != null && status.toUpperCase() === 'CANCELLED') ||
      path.includes('cancel');

    return {
      outcome: looksCancelled ? 'cancelled' : 'paid',
      orderCode,
    };
  }
}

/**
 * Opens PayOS checkout. BE sets return/cancel to mobile deep links when
 * platform=mobile, so the in-app browser closes back into the app.
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
