type PayOsDeepLinkPayload = {
  outcome: 'paid' | 'cancelled';
  orderCode?: number;
  url: string;
};

type Listener = (payload: PayOsDeepLinkPayload) => void;

const listeners = new Set<Listener>();

export function subscribePayOsDeepLink(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPayOsDeepLink(payload: PayOsDeepLinkPayload) {
  listeners.forEach((listener) => listener(payload));
}
