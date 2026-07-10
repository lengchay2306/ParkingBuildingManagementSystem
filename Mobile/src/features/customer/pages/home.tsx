import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { AnimatedLoaderCard } from "@/components/animated-loader";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DesignColorPalette, Radius, Spacing, Typography } from "@/constants/design";
import { MaxContentWidth } from "@/constants/theme";
import {
  getActiveUserParkingSession,
  getParkingSlots,
  type CustomerParkingSession,
  type ParkingFloor,
} from "@/features/customer/api/parking";
import { getMyReservations, type Reservation } from "@/features/customer/api/reservations";
import { CustomerHomeBottomSection } from "@/features/customer/components/customer-home-bottom-section";
import { CustomerHomeOverviewCard } from "@/features/customer/components/customer-home-overview-card";
import { CustomerHomeQrButton } from "@/features/customer/components/customer-home-qr-button";
import { CustomerHomeSlotsSection } from "@/features/customer/components/customer-home-slots-section";
import { StaggeredEnter } from "@/features/customer/components/staggered-enter";
import { useDesignColors } from "@/hooks/use-design-colors";
import { useLanguagePreference } from "@/hooks/language-preference";
import { useProtectedSession } from "@/hooks/use-protected-session";
import { getMyProfile, type UserProfile, type UserVehicle } from "@/lib/auth-api";
import { CUSTOMER_ROUTES } from "@/roles";

/** Trang chủ dành riêng cho khách gửi xe (Customer). */
export default function CustomerHomeScreen() {
  const router = useRouter();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  useProtectedSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [defaultVehicle, setDefaultVehicle] = useState<UserVehicle | null>(null);
  const [activeSession, setActiveSession] = useState<CustomerParkingSession | null>(null);
  const [floors, setFloors] = useState<ParkingFloor[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const userProfile = await getMyProfile();
        setProfile(userProfile);

        const vehicles = (userProfile.vehicles ?? []).filter(
          (vehicle) => vehicle.status?.toUpperCase() !== "INACTIVE",
        );
        const primaryVehicle = vehicles[0] ?? null;
        setDefaultVehicle(primaryVehicle);

        const [slotFloors, reservationList, session] = await Promise.all([
          getParkingSlots(),
          getMyReservations(),
          primaryVehicle ? getActiveUserParkingSession(primaryVehicle._id) : Promise.resolve(null),
        ]);

        setFloors(slotFloors);
        setReservations(reservationList);
        setActiveSession(session);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : t("Không tải được dữ liệu", "Could not load data");
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [t],
  );

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingScreen}>
        <AnimatedLoaderCard
          color={DesignColors.primary}
          label={t("Đang tải...", "Loading...")}
          cardStyle={styles.loadingCard}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadData(true)}
            tintColor={DesignColors.primary}
          />
        }
      >
        <View style={styles.pageHeader}>
          <ThemedText style={styles.eyebrow}>PARKASE</ThemedText>
          <ThemedText style={styles.pageTitle}>{t("Trang chủ", "Home")}</ThemedText>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        <StaggeredEnter index={0}>
          <CustomerHomeOverviewCard
            fullName={profile?.fullName ?? t("Khách hàng", "Customer")}
            defaultVehicle={defaultVehicle}
            activeSession={activeSession}
            t={t}
            DesignColors={DesignColors}
          />
        </StaggeredEnter>

        <StaggeredEnter index={1}>
          <CustomerHomeSlotsSection
            floors={floors}
            isLoading={isRefreshing}
            t={t}
            DesignColors={DesignColors}
          />
        </StaggeredEnter>

        <StaggeredEnter index={2}>
          <CustomerHomeQrButton
            onPress={() => router.push(CUSTOMER_ROUTES.driver as never)}
            t={t}
            DesignColors={DesignColors}
          />
        </StaggeredEnter>

        <StaggeredEnter index={3}>
          <CustomerHomeBottomSection
            reservations={reservations}
            t={t}
            DesignColors={DesignColors}
          />
        </StaggeredEnter>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.section,
      paddingBottom: Spacing.section,
      gap: Spacing.md,
      width: "100%",
      maxWidth: MaxContentWidth,
      alignSelf: "center",
    },
    pageHeader: {
      gap: 2,
    },
    eyebrow: {
      ...Typography.eyebrow,
      textTransform: "uppercase",
      color: DesignColors.inkSubtle,
    },
    pageTitle: {
      ...Typography.headline,
      color: DesignColors.ink,
    },
    errorBanner: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: "#ef4444",
      backgroundColor: "#ef444414",
      padding: Spacing.sm,
    },
    errorText: {
      ...Typography.bodySm,
      color: "#ef4444",
    },
    loadingScreen: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: DesignColors.canvas,
    },
    loadingCard: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
    },
  });
