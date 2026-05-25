import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const heroImage =
  'https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=2000&q=80';
const sectionImage =
  'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=1600&q=80';

const features = [
  { title: 'Nhanh chong', detail: 'Vao/ra duoi 5 giay' },
  { title: 'An toan', detail: 'Camera giam sat 24/7' },
  { title: 'Tien loi', detail: 'Dat cho truoc linh hoat' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const canSplit = width >= 560;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.topNav}>
              <View style={styles.navGhost} />
              <ThemedText style={styles.navTitle}>Parking Building System</ThemedText>
              <Pressable
                onPress={() => router.push('/login' as never)}
                style={({ pressed }) => [styles.signInButton, pressed && styles.buttonPressed]}>
                <ThemedText style={styles.signInButtonText}>Dang nhap</ThemedText>
              </Pressable>
            </View>

            <View
              style={[
                styles.heroCard,
                { minHeight: isCompact ? 430 : 500 },
              ]}>
              <ImageBackground source={{ uri: heroImage }} style={styles.heroImage} resizeMode="cover">
                <View style={styles.heroOverlay} />
                <View style={styles.heroBody}>
                  <View style={styles.heroEyebrow}>
                    <ThemedText style={styles.heroEyebrowText}>Smart Parking · 24/7</ThemedText>
                  </View>
                  <ThemedText style={[styles.heroTitle, isCompact && styles.heroTitleCompact]}>
                    Do xe thong minh,
                  </ThemedText>
                  <ThemedText style={[styles.heroTitleAccent, isCompact && styles.heroTitleCompact]}>
                    khong lo cho trong
                  </ThemedText>
                  <ThemedText style={styles.heroDescription}>
                    He thong toa nha do xe hien dai voi cong nghe AI nhan dien bien so, dat cho truc tuyen va
                    thanh toan khong tien mat.
                  </ThemedText>
                </View>
              </ImageBackground>
            </View>

            <View style={styles.sectionWrap}>
              <ThemedText style={styles.sectionEyebrow}>Gioi thieu du an</ThemedText>
              <View style={[styles.aboutBlock, canSplit && styles.aboutBlockSplit]}>
                <View style={styles.aboutTextColumn}>
                  <ThemedText style={styles.aboutTitle}>Toa nha do xe the he moi</ThemedText>
                  <ThemedText style={styles.aboutBody}>
                    Parking Building System la giai phap quan ly do xe toan dien voi 1.000+ cho tren 10 tang.
                    Tich hop camera AI, cam bien IoT va ung dung di dong giup tai xe tim cho trong chi trong vai
                    giay.
                  </ThemedText>
                  <View style={styles.featureGrid}>
                    {features.map((item) => (
                      <View key={item.title} style={styles.featureCard}>
                        <ThemedText style={styles.featureTitle}>{item.title}</ThemedText>
                        <ThemedText style={styles.featureDetail}>{item.detail}</ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
                <Image source={{ uri: sectionImage }} style={[styles.aboutImage, canSplit && styles.aboutImageSplit]} resizeMode="cover" />
              </View>
            </View>

            <View style={styles.ctaBanner}>
              <ThemedText style={styles.ctaTitle}>San sang dat cho do xe?</ThemedText>
              <ThemedText style={styles.ctaBody}>
                Dat cho truoc chi voi vai thao tac. Dam bao co cho ngay khi ban den.
              </ThemedText>
              <Pressable
                onPress={() => router.push('/login' as never)}
                style={({ pressed }) => [styles.reserveButton, pressed && styles.buttonPressed]}>
                <ThemedText style={styles.reserveButtonText}>Dat cho ngay</ThemedText>
              </Pressable>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerTop}>
                <View style={styles.footerCol}>
                  <ThemedText style={styles.footerBrand}>Parking Building System</ThemedText>
                  <ThemedText style={styles.footerMuted}>Giai phap do xe thong minh cho do thi hien dai.</ThemedText>
                </View>
                <View style={styles.footerCol}>
                  <ThemedText style={styles.footerLabel}>Dia chi</ThemedText>
                  <ThemedText style={styles.footerText}>123 Nguyen Van Linh, Q.7, TP.HCM</ThemedText>
                </View>
                <View style={styles.footerCol}>
                  <ThemedText style={styles.footerLabel}>Lien he</ThemedText>
                  <ThemedText style={styles.footerText}>Hotline: 1900 1234</ThemedText>
                  <ThemedText style={styles.footerText}>Email: contact@parkingbs.vn</ThemedText>
                </View>
              </View>
              <View style={styles.footerBottom}>
                <ThemedText style={styles.footerCopy}>© 2026 Parking Building System. All rights reserved.</ThemedText>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010102',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
  },
  topNav: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 8,
    backgroundColor: '#010102',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  navGhost: {
    width: 88,
  },
  navTitle: {
    color: '#f7f8f8',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  signInButton: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34343a',
    backgroundColor: '#0f1011',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#f7f8f8',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
  },
  heroCard: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f1011',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(1, 1, 2, 0.55)',
  },
  heroBody: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  heroEyebrow: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#34343a',
    borderRadius: 999,
    backgroundColor: '#141516',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroEyebrowText: {
    color: '#d0d6e0',
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: '#f7f8f8',
    fontSize: 43,
    lineHeight: 47,
    fontWeight: '600',
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: '#5e6ad2',
    fontSize: 43,
    lineHeight: 47,
    fontWeight: '600',
    letterSpacing: -1,
    marginTop: -6,
  },
  heroTitleCompact: {
    fontSize: 36,
    lineHeight: 40,
  },
  heroDescription: {
    color: '#d0d6e0',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 520,
  },
  sectionWrap: {
    gap: Spacing.two,
  },
  sectionEyebrow: {
    color: '#8a8f98',
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  aboutBlock: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 12,
    backgroundColor: '#0f1011',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  aboutBlockSplit: {
    flexDirection: 'row',
  },
  aboutTextColumn: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  aboutTitle: {
    color: '#f7f8f8',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  aboutBody: {
    color: '#d0d6e0',
    fontSize: 15,
    lineHeight: 23,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  featureCard: {
    minWidth: 114,
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 12,
    backgroundColor: '#141516',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  featureTitle: {
    color: '#f7f8f8',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  featureDetail: {
    color: '#8a8f98',
    fontSize: 12,
    lineHeight: 17,
  },
  aboutImage: {
    width: '100%',
    height: 220,
    borderTopWidth: 1,
    borderTopColor: '#23252a',
  },
  aboutImageSplit: {
    width: 220,
    minHeight: 260,
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: '#23252a',
  },
  ctaBanner: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 12,
    backgroundColor: '#0f1011',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  ctaTitle: {
    color: '#f7f8f8',
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '600',
    letterSpacing: -1,
    textAlign: 'center',
  },
  ctaBody: {
    color: '#d0d6e0',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  reserveButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#5e6ad2',
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  reserveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 8,
    backgroundColor: '#010102',
    overflow: 'hidden',
  },
  footerTop: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  footerCol: {
    gap: 4,
  },
  footerBrand: {
    color: '#f7f8f8',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  footerMuted: {
    color: '#8a8f98',
    fontSize: 14,
    lineHeight: 21,
  },
  footerLabel: {
    color: '#8a8f98',
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  footerText: {
    color: '#d0d6e0',
    fontSize: 14,
    lineHeight: 21,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#23252a',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  footerCopy: {
    color: '#8a8f98',
    fontFamily: Fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
