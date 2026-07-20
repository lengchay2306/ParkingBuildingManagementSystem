import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { resolveParkingSessionApiMessage } from '@/features/staff/lib/parking-session-api-message';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/design';
import { StaffCheckInConfirmSheet } from '@/features/staff/components/staff-check-in-confirm-sheet';
import { StaffCheckInManualSheet } from '@/features/staff/components/staff-check-in-manual-sheet';
import { StaffPlateScannerModal } from '@/features/staff/components/staff-plate-scanner-modal';
import {
  createStaffTabBarStyle,
  getStaffScanHudBottomPadding,
} from '@/features/staff/components/staff-tab-bar';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { useStaffCheckInFlow } from '@/features/staff/hooks/use-staff-check-in-flow';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { resolveStaffScanFlow } from '@/features/staff/lib/staff-scan-flow';
import { mapParkingSessionToRecord } from '@/features/staff/lib/utils';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useThemePreference } from '@/hooks/theme-preference';
import { staffSessionDetailPath } from '@/roles';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';

export default function StaffScanScreen() {
  useStaffRoleGuard();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(() => createStyles(DesignColors, isDark), [DesignColors, isDark]);
  const { loadParkingSessions, recordCheckIn } = useStaffWorkspace();

  const [isFocused, setIsFocused] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const resolvingRef = useRef(false);

  const checkInFlow = useStaffCheckInFlow({
    onComplete: () => {
      resolvingRef.current = false;
      setIsResolving(false);
    },
  });

  const { loadParkingSlots, resetFlow } = checkInFlow;

  const tabBarBottomInset = insets.bottom;
  const scannerBottomInset = getStaffScanHudBottomPadding(tabBarBottomInset);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      resolvingRef.current = false;
      setIsResolving(false);
      void loadParkingSlots();
      navigation.getParent()?.setOptions({ tabBarStyle: createStaffTabBarStyle(tabBarBottomInset) });

      return () => {
        setIsFocused(false);
        setManualSheetOpen(false);
        resetFlow();
        navigation.getParent()?.setOptions({ tabBarStyle: createStaffTabBarStyle(tabBarBottomInset) });
      };
    }, [loadParkingSlots, navigation, resetFlow, tabBarBottomInset]),
  );

  const beginCheckInLookup = useCallback(
    async (rawPlate: string, source: 'scan' | 'manual') => {
      if (resolvingRef.current) {
        return;
      }

      resolvingRef.current = true;
      setIsResolving(true);

      try {
        const flow = await resolveStaffScanFlow(rawPlate);

        if (flow.kind === 'invalid_plate') {
          showToast(
            t('Biển số phải đúng định dạng 51A-123.44', 'License plate must match format 51A-123.44'),
            'error',
          );
          resolvingRef.current = false;
          setIsResolving(false);
          return;
        }

        if (flow.kind === 'checkout') {
          const floors = await loadParkingSlots().catch(() => []);
          recordCheckIn(mapParkingSessionToRecord(flow.session, floors));
          await loadParkingSessions({ status: 'ACTIVE' }).catch(() => undefined);
          router.push(staffSessionDetailPath(flow.sessionId) as never);
          resolvingRef.current = false;
          setIsResolving(false);
          return;
        }

        if (source === 'scan') {
          showToast(t('Đã quét biển số', 'Plate scanned'), 'success');
        }

        const ready = await checkInFlow.resolveVehicle(flow.plate);
        if (ready) {
          setManualSheetOpen(false);
        }
        resolvingRef.current = false;
        setIsResolving(false);
      } catch (error) {
        showToast(
          resolveParkingSessionApiMessage(
            error,
            t,
            t('Không xử lý được biển số', 'Could not process plate'),
          ),
          'error',
        );
        resolvingRef.current = false;
        setIsResolving(false);
      }
    },
    [checkInFlow, loadParkingSessions, loadParkingSlots, recordCheckIn, router, showToast, t],
  );

  const handlePlateDetected = useCallback(
    (plate: string) => {
      void beginCheckInLookup(plate, 'scan');
    },
    [beginCheckInLookup],
  );

  const handleManualSearch = useCallback(() => {
    void beginCheckInLookup(checkInFlow.plateQuery, 'manual');
  }, [beginCheckInLookup, checkInFlow.plateQuery]);

  const scannerActive =
    isFocused && !isResolving && checkInFlow.step === 'idle' && !manualSheetOpen;

  return (
    <View style={styles.root}>
      <StaffPlateScannerModal
        embedded
        showCloseButton={false}
        bottomInsetExtra={scannerBottomInset}
        title={t('Quét QR', 'Scan QR')}
        visible={scannerActive}
        footer={
          <Pressable
            onPress={() => setManualSheetOpen(true)}
            style={({ pressed }) => [styles.manualBtn, pressed && { opacity: 0.88 }]}>
            <ThemedText style={styles.manualBtnText}>
              {t('Nhập biển số thủ công', 'Enter plate manually')}
            </ThemedText>
          </Pressable>
        }
        onClose={() => undefined}
        onPlateDetected={handlePlateDetected}
        t={t}
      />

      <StaffCheckInManualSheet
        isSearching={checkInFlow.isSearchingVehicle}
        plateQuery={checkInFlow.plateQuery}
        visible={manualSheetOpen}
        onClose={() => setManualSheetOpen(false)}
        onPlateChange={checkInFlow.setPlateQuery}
        onSearch={handleManualSearch}
        t={t}
      />

      <StaffCheckInConfirmSheet
        flow={checkInFlow}
        visible={checkInFlow.step === 'confirm'}
        onClose={() => {
          resolvingRef.current = false;
          setIsResolving(false);
        }}
        t={t}
      />

      {isResolving ? (
        <View style={styles.resolvingOverlay}>
          <ActivityIndicator color={DesignColors.primaryFocus} size="large" />
          <ThemedText style={styles.resolvingText}>{t('Đang xử lý…', 'Processing…')}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    manualBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    manualBtnText: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    resolvingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      backgroundColor: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(228,232,240,0.78)',
      zIndex: 40,
    },
    resolvingText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
  });
}
