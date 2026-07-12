import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { emitPayOsDeepLink } from '@/features/payment/payos-return-bridge';
import { extractPayOsOrderCode } from '@/features/payment/payos-checkout-session';
import { CUSTOMER_ROUTES } from '@/roles';

/**
 * Handles `mobile://payment/cancel` after PayOS cancel (via FE bridge).
 */
export default function PaymentCancelScreen() {
  const params = useLocalSearchParams<{ orderCode?: string }>();

  useEffect(() => {
    const query = new URLSearchParams();
    if (params.orderCode) query.set('orderCode', String(params.orderCode));
    query.set('cancel', 'true');
    const url = `mobile://payment/cancel?${query.toString()}`;
    emitPayOsDeepLink({
      outcome: 'cancelled',
      orderCode: extractPayOsOrderCode(url),
      url,
    });
  }, [params.orderCode]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <Redirect href={CUSTOMER_ROUTES.profile as never} />
    </View>
  );
}
