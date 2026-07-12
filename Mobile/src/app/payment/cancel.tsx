import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { emitPayOsDeepLink } from '@/features/payment/payos-return-bridge';
import { extractPayOsOrderCode } from '@/features/payment/payos-checkout-session';
import { CUSTOMER_ROUTES } from '@/roles';

/**
 * Handles `mobile:///payment/cancel` after PayOS cancel.
 */
export default function PaymentCancelScreen() {
  const params = useLocalSearchParams<{
    orderCode?: string;
    status?: string;
    cancel?: string;
    code?: string;
    id?: string;
  }>();

  useEffect(() => {
    const query = new URLSearchParams();
    if (params.orderCode) query.set('orderCode', String(params.orderCode));
    if (params.status) query.set('status', String(params.status));
    query.set('cancel', params.cancel ? String(params.cancel) : 'true');
    if (params.code) query.set('code', String(params.code));
    if (params.id) query.set('id', String(params.id));
    const url = `mobile:///payment/cancel?${query.toString()}`;
    emitPayOsDeepLink({
      outcome: 'cancelled',
      orderCode: extractPayOsOrderCode(url),
      url,
    });
  }, [params.cancel, params.code, params.id, params.orderCode, params.status]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
      <Redirect href={CUSTOMER_ROUTES.profile as never} />
    </View>
  );
}
