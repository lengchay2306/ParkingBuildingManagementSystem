export type PayOsCheckoutSessionResult =
  | { kind: 'paid'; orderCode?: number; url: string }
  | { kind: 'cancelled'; orderCode?: number; url: string }
  | { kind: 'dismissed' };

/**
 * PayOS redirects to BE-configured return/cancel URLs (currently FE web paths).
 * Treat those as "payment finished" signals for the in-app WebView — never render FE.
 */
export function isPayOsFinishUrl(url: string): boolean {
  if (!url || url === 'about:blank') {
    return false;
  }

  const lower = url.toLowerCase();

  // App deep links
  if (
    lower.startsWith('mobile://payment/return') ||
    lower.startsWith('mobile://payment/cancel') ||
    lower.includes('://payment/return') ||
    lower.includes('://payment/cancel')
  ) {
    return true;
  }

  // FE paths used by BE FE_RETURN_URL / FE_CANCEL_URL
  if (lower.includes('/payment/return') || lower.includes('/payment/cancel')) {
    return true;
  }

  // Some PayOS hosts bounce with cancel flags before hitting FE
  if (
    (lower.includes('pay.payos.vn') || lower.includes('payos.vn')) &&
    (lower.includes('cancel=true') ||
      lower.includes('status=cancelled') ||
      lower.includes('status=canceled') ||
      lower.includes('/cancel'))
  ) {
    return true;
  }

  return false;
}

export function parsePayOsRedirectUrl(url: string): 'paid' | 'cancelled' {
  const lower = url.toLowerCase();
  try {
    const normalized = url.replace(/^[a-z][a-z0-9+.-]*:/i, (scheme) =>
      scheme.toLowerCase() === 'http:' || scheme.toLowerCase() === 'https:' ? scheme : 'https:',
    );
    const parsed = new URL(normalized.includes('://') ? normalized : `https://app${normalized}`);
    const path = `${parsed.pathname}${parsed.search}`.toLowerCase();
    const cancelFlag = parsed.searchParams.get('cancel')?.toLowerCase() === 'true';
    const status = parsed.searchParams.get('status')?.toUpperCase();
    if (
      path.includes('/payment/cancel') ||
      path.includes('/cancel') ||
      cancelFlag ||
      status === 'CANCELLED' ||
      status === 'CANCELED'
    ) {
      return 'cancelled';
    }
  } catch {
    if (lower.includes('/payment/cancel') || lower.includes('cancel=true') || lower.includes('cancelled')) {
      return 'cancelled';
    }
  }
  return 'paid';
}

export function extractPayOsOrderCode(url: string): number | undefined {
  try {
    const normalized = url.replace(/^[a-z][a-z0-9+.-]*:/i, (scheme) =>
      scheme.toLowerCase() === 'http:' || scheme.toLowerCase() === 'https:' ? scheme : 'https:',
    );
    const parsed = new URL(normalized.includes('://') ? normalized : `https://app/${url}`);
    const raw = parsed.searchParams.get('orderCode') ?? parsed.searchParams.get('order_code');
    if (!raw) {
      return undefined;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function toPayOsSessionResult(url: string): PayOsCheckoutSessionResult {
  const outcome = parsePayOsRedirectUrl(url);
  const orderCode = extractPayOsOrderCode(url);
  if (outcome === 'cancelled') {
    return { kind: 'cancelled', orderCode, url };
  }
  return { kind: 'paid', orderCode, url };
}

/** Injected into PayOS WebView to catch FE return/cancel redirects and notify RN. */
export const PAYOS_FINISH_WATCHER_JS = `
(function () {
  if (window.__pbmsPayOsWatch) return;
  window.__pbmsPayOsWatch = true;

  function isFinish(url) {
    if (!url) return false;
    var u = String(url).toLowerCase();
    return (
      u.indexOf('/payment/return') !== -1 ||
      u.indexOf('/payment/cancel') !== -1 ||
      u.indexOf('mobile://payment/') === 0
    );
  }

  function notify(url) {
    try {
      window.ReactNativeWebView &&
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'payos-finish', url: url }));
    } catch (e) {}
  }

  function check() {
    try {
      var href = window.location.href;
      if (isFinish(href)) {
        notify(href);
        try { window.stop(); } catch (e) {}
        try { document.documentElement.innerHTML = ''; } catch (e) {}
      }
    } catch (e) {}
  }

  check();
  setInterval(check, 300);

  var _push = history.pushState;
  var _replace = history.replaceState;
  history.pushState = function () {
    var r = _push.apply(this, arguments);
    check();
    return r;
  };
  history.replaceState = function () {
    var r = _replace.apply(this, arguments);
    check();
    return r;
  };
  window.addEventListener('popstate', check);
  window.addEventListener('hashchange', check);
})();
true;
`;
