import { Redirect } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import {
  getStoredPostLoginRoute,
  refreshSession,
  resolveRoleAfterLogin,
} from '@/lib/auth-api';
import {
  AUTH_ROUTES,
  CUSTOMER_ROUTES,
  type PostLoginRoute,
  resolvePostLoginRoute,
} from '@/roles';

export default function IndexRoute() {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'guest'>('loading');
  const [postLoginRoute, setPostLoginRoute] = useState<PostLoginRoute>(CUSTOMER_ROUTES.home);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const isValid = await refreshSession();
        if (isMounted) {
          if (isValid) {
            try {
              const role = await resolveRoleAfterLogin();
              setPostLoginRoute(resolvePostLoginRoute(role));
            } catch {
              setPostLoginRoute(await getStoredPostLoginRoute());
            }
          }
          setStatus(isValid ? 'authenticated' : 'guest');
        }
      } catch {
        if (isMounted) {
          setStatus('guest');
        }
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <ThemedView style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#5e6ad2" />
        </View>
      </ThemedView>
    );
  }

  return <Redirect href={status === 'authenticated' ? postLoginRoute : AUTH_ROUTES.signIn} />;
}

const createStyles = (DesignColors: DesignColorPalette) => StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: DesignColors.canvas,
  },
  loadingCard: {
    height: 56,
    width: 56,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: DesignColors.hairline,
    backgroundColor: DesignColors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
