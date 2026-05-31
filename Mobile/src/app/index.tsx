import { Redirect } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { getRoleHome } from '@/lib/auth';
import { refreshSession } from '@/lib/auth-api';

export default function IndexRoute() {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [redirectHref, setRedirectHref] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapSession() {
      try {
        const role = await refreshSession();
        if (isMounted) {
          setRedirectHref(role ? getRoleHome(role) : '/sign-platform');
        }
      } catch {
        if (isMounted) {
          setRedirectHref('/sign-platform');
        }
      }
    }

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!redirectHref) {
    return (
      <ThemedView style={styles.loadingScreen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#5e6ad2" />
        </View>
      </ThemedView>
    );
  }

  return <Redirect href={redirectHref as never} />;
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
