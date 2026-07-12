import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { SubscriptionCheckoutResult } from '@/features/payment/api';
import {
  isPayOsFinishUrl,
  PAYOS_FINISH_WATCHER_JS,
  toPayOsSessionResult,
  type PayOsCheckoutSessionResult,
} from '@/features/payment/payos-checkout-session';
import { useDesignColors } from '@/hooks/use-design-colors';

type SubscriptionPaymentModalProps = {
  visible: boolean;
  bill: SubscriptionCheckoutResult | null;
  plate?: string;
  isCheckingStatus?: boolean;
  onClose: () => void;
  onConfirmPaid: () => void;
  onCheckoutSessionResult?: (result: PayOsCheckoutSessionResult) => void;
  t: (vi: string, en: string) => string;
};

function isRncWebViewLinked(): boolean {
  try {
    // Avoid TurboModuleRegistry.getEnforcing — it throws when the native module
    // is missing from the current development build / Expo Go binary.
    return Boolean(
      NativeModules.RNCWebView ||
        NativeModules.RNCWebViewModule ||
        // New architecture export name used by some RN builds
        (NativeModules as { RNCWebViewModule?: unknown }).RNCWebViewModule,
    );
  } catch {
    return false;
  }
}

type WebViewComponent = typeof import('react-native-webview').WebView;

function loadWebViewComponent(): WebViewComponent | null {
  if (!isRncWebViewLinked()) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-webview') as { WebView?: WebViewComponent; default?: WebViewComponent };
    return mod.WebView ?? mod.default ?? null;
  } catch {
    return null;
  }
}

export function SubscriptionPaymentModal({
  visible,
  bill,
  plate,
  isCheckingStatus = false,
  onClose,
  onConfirmPaid,
  onCheckoutSessionResult,
  t,
}: SubscriptionPaymentModalProps) {
  const insets = useSafeAreaInsets();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const WebView = useMemo(() => loadWebViewComponent(), []);
  const canUseInAppWebView = Boolean(WebView);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [isOpeningFallback, setIsOpeningFallback] = useState(false);
  const finishedRef = useRef(false);
  const webViewRef = useRef<{ stopLoading?: () => void; injectJavaScript?: (js: string) => void } | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      finishedRef.current = false;
      setIsLoadingPage(true);
      setIsOpeningFallback(false);
    }
  }, [visible]);

  const handleFinishUrl = useCallback(
    (url: string) => {
      if (finishedRef.current) {
        return;
      }
      finishedRef.current = true;
      try {
        webViewRef.current?.stopLoading?.();
        webViewRef.current?.injectJavaScript?.(
          "try{window.stop();document.documentElement.innerHTML='';}catch(e){};true;",
        );
      } catch {
        // ignore
      }
      onCheckoutSessionResult?.(toPayOsSessionResult(url));
    },
    [onCheckoutSessionResult],
  );

  const maybeFinishFromUrl = useCallback(
    (url?: string | null) => {
      if (!url || !isPayOsFinishUrl(url)) {
        return false;
      }
      handleFinishUrl(url);
      return true;
    },
    [handleFinishUrl],
  );

  const openPayOsInSystemBrowser = useCallback(async () => {
    if (!bill?.checkoutUrl || isOpeningFallback) {
      return;
    }
    setIsOpeningFallback(true);
    try {
      await openBrowserAsync(bill.checkoutUrl, {
        presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
        createTask: false,
      });
      // User closed the browser sheet — verify activation / treat as returned to app.
      onCheckoutSessionResult?.({ kind: 'dismissed' });
    } finally {
      setIsOpeningFallback(false);
    }
  }, [bill?.checkoutUrl, isOpeningFallback, onCheckoutSessionResult]);

  useEffect(() => {
    if (!visible || !bill?.checkoutUrl || canUseInAppWebView) {
      return;
    }
    void openPayOsInSystemBrowser();
  }, [bill?.checkoutUrl, canUseInAppWebView, openPayOsInSystemBrowser, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText style={styles.title}>{t('Thanh toán PayOS', 'PayOS payment')}</ThemedText>
            <ThemedText style={styles.subtitle}>
              {canUseInAppWebView
                ? t('Thanh toán ngay trong app', 'Pay directly in the app')
                : t(
                    'Cần rebuild app để PayOS chạy trong WebView',
                    'Rebuild the app to run PayOS in WebView',
                  )}
              {plate ? ` · ${plate}` : ''}
            </ThemedText>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <ThemedText style={styles.close}>{t('Đóng', 'Close')}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.webviewWrap}>
          {!bill?.checkoutUrl ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={DesignColors.primary} />
            </View>
          ) : canUseInAppWebView && WebView ? (
            <>
              {isLoadingPage ? (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator color={DesignColors.primary} size="large" />
                  <ThemedText style={styles.loadingText}>
                    {t('Đang mở PayOS…', 'Opening PayOS…')}
                  </ThemedText>
                </View>
              ) : null}
              <WebView
                ref={webViewRef as never}
                source={{ uri: bill.checkoutUrl }}
                onLoadStart={(event) => {
                  setIsLoadingPage(true);
                  maybeFinishFromUrl(event.nativeEvent.url);
                }}
                onLoadEnd={() => setIsLoadingPage(false)}
                onNavigationStateChange={(nav) => {
                  maybeFinishFromUrl(nav.url);
                }}
                onShouldStartLoadWithRequest={(request) => {
                  if (maybeFinishFromUrl(request.url)) {
                    return false;
                  }
                  return true;
                }}
                onMessage={(event) => {
                  try {
                    const payload = JSON.parse(event.nativeEvent.data) as {
                      type?: string;
                      url?: string;
                    };
                    if (payload.type === 'payos-finish' && payload.url) {
                      maybeFinishFromUrl(payload.url);
                    }
                  } catch {
                    // ignore non-json messages
                  }
                }}
                injectedJavaScript={PAYOS_FINISH_WATCHER_JS}
                injectedJavaScriptBeforeContentLoaded={PAYOS_FINISH_WATCHER_JS}
                originWhitelist={['*']}
                startInLoadingState
                setSupportMultipleWindows={false}
                javaScriptEnabled
                domStorageEnabled
                style={styles.webview}
              />
            </>
          ) : (
            <View style={styles.fallbackBox}>
              <ThemedText style={styles.fallbackTitle}>
                {t('WebView chưa có trong bản build này', 'WebView is missing from this build')}
              </ThemedText>
              <ThemedText style={styles.fallbackBody}>
                {Platform.OS === 'android'
                  ? t(
                      'Chạy lại: npx expo run:android (cài native module RNCWebView).',
                      'Run: npx expo run:android (installs native RNCWebView).',
                    )
                  : t(
                      'Chạy lại: npx expo run:ios (cài native module RNCWebView).',
                      'Run: npx expo run:ios (installs native RNCWebView).',
                    )}
              </ThemedText>
              <Pressable
                disabled={isOpeningFallback}
                onPress={() => void openPayOsInSystemBrowser()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  isOpeningFallback && styles.btnDisabled,
                  pressed && !isOpeningFallback && styles.pressed,
                ]}>
                {isOpeningFallback ? (
                  <ActivityIndicator color={DesignColors.onPrimary} />
                ) : (
                  <ThemedText style={styles.primaryBtnText}>
                    {t('Mở PayOS (tạm thời)', 'Open PayOS (temporary)')}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.hint}>
            {t(
              'Sau khi thanh toán hoặc hủy, app sẽ tự quay lại. Nếu không, bấm nút bên dưới.',
              'After pay or cancel, the app returns automatically. If not, use the button below.',
            )}
          </ThemedText>
          <Pressable
            disabled={isCheckingStatus}
            onPress={onConfirmPaid}
            style={({ pressed }) => [
              styles.secondaryBtn,
              isCheckingStatus && styles.btnDisabled,
              pressed && !isCheckingStatus && styles.pressed,
            ]}>
            {isCheckingStatus ? (
              <ActivityIndicator color={DesignColors.primary} />
            ) : (
              <ThemedText style={styles.secondaryBtnText}>
                {t('Tôi đã thanh toán', 'I have paid')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(DesignColors: DesignColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: DesignColors.hairline,
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    subtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    closeBtn: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    close: {
      ...Typography.bodySm,
      color: DesignColors.primary,
      fontWeight: '600',
    },
    webviewWrap: {
      flex: 1,
      backgroundColor: DesignColors.surface1,
    },
    webview: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    loadingBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: DesignColors.canvas,
    },
    loadingText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    fallbackBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.md,
      paddingHorizontal: Spacing.lg,
    },
    fallbackTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      textAlign: 'center',
    },
    fallbackBody: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    primaryBtn: {
      minHeight: 48,
      minWidth: 220,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primaryFocus,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    primaryBtnText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    footer: {
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
    },
    hint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 11,
      lineHeight: 16,
    },
    secondaryBtn: {
      minHeight: 48,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.primaryFocus,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.md,
    },
    secondaryBtnText: {
      ...Typography.button,
      color: DesignColors.primaryFocus,
      fontWeight: '700',
    },
    btnDisabled: {
      opacity: 0.7,
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
