import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { emitPayOsDeepLink } from '@/features/payment/payos-return-bridge';
import {
  extractPayOsOrderCode,
  parsePayOsRedirectUrl,
} from '@/features/payment/payos-checkout-session';
import { CUSTOMER_ROUTES } from '@/roles';

/**
 * Handles `mobile://payment/return` (and universal-link equivalents).
 * FE payment return page bridges mobile browsers here after PayOS.
 */
export default function PaymentReturnScreen() {
  const params = useLocalSearchParams<{
    orderCode?: string;
    status?: string;
    cancel?: string;
    code?: string;
  }>();

  useEffect(() => {
    const query = new URLSearchParams();
    if (params.orderCode) query.set('orderCode', String(params.orderCode));
    if (params.status) query.set('status', String(params.status));
    if (params.cancel) query.set('cancel', String(params.cancel));
    if (params.code) query.set('code', String(params.code));
    const url = `mobile://payment/return?${query.toString()}`;
    const outcome = parsePayOsRedirectUrl(url);
    emitPayOsDeepLink({
      outcome,
      orderCode: extractPayOsOrderCode(url),
      url,
    });
  }, [params.cancel, params.code, params.orderCode, params.status]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <Redirect href={CUSTOMER_ROUTES.profile as never} />
    </View>
  );
}
