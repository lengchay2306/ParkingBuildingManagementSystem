import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppToast, useSuppressErrorToasts } from '@/components/app-toast';
import { MascotSpeechBubble } from '@/components/mascot-speech-bubble';
import {
  SIGN_MASCOT_CIRCLE_SIZE,
  SIGN_MASCOT_FRAME,
  SignMascotDisplay,
  type SignMascotPose,
} from '@/components/sign-mascot';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useLanguagePreference } from '@/hooks/language-preference';
import { useSessionRole } from '@/hooks/session-role';
import { useSignMascotInteraction } from '@/hooks/use-sign-mascot-interaction';
import { useThemePreference } from '@/hooks/theme-preference';
import {
  login,
  register,
  resolvePostLoginRoute,
  resolveRoleAfterLogin,
  setStoredPostLoginRoute,
} from '@/lib/auth-api';

type AuthView = 'login' | 'signup';
type FocusField =
  | 'loginEmail'
  | 'loginPassword'
  | 'signupFullName'
  | 'signupEmail'
  | 'signupPhone'
  | 'signupPassword'
  | null;

const SIGNUP_PHONE_PATTERN = /^[0-9]{10}$/;

type Palette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  label: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputFocusBg: string;
  inputBg: string;
  primary: string;
  primaryPressed: string;
  secondaryBg: string;
  secondaryBorder: string;
  divider: string;
  logoBorder: string;
  logoFill: string;
  icon: string;
  themeIcon: string;
};

const darkPalette: Palette = {
  screenBg: '#000000',
  cardBg: '#000000',
  cardBorder: '#1a1a1a',
  text: '#ffffff',
  textMuted: '#9ca3af',
  label: '#6b7280',
  inputBorder: '#2a2a2a',
  inputFocusBorder: '#6366f1',
  inputFocusBg: '#1a1a1a',
  inputBg: '#1a1a1a',
  primary: '#6366f1',
  primaryPressed: '#4f46e5',
  secondaryBg: '#ffffff',
  secondaryBorder: '#e5e7eb',
  divider: '#374151',
  logoBorder: '#6366f1',
  logoFill: '#1d3aac',
  icon: '#6b7280',
  themeIcon: '#6366f1',
};

const lightPalette: Palette = {
  screenBg: '#f3f4fb',
  cardBg: '#f3f4fb',
  cardBorder: '#d5dae7',
  text: '#0f172a',
  textMuted: '#475569',
  label: '#0f172a',
  inputBorder: '#d5dae7',
  inputFocusBorder: '#2563eb',
  inputFocusBg: '#eef3ff',
  inputBg: '#ffffff',
  primary: '#2563eb',
  primaryPressed: '#1d4ed8',
  secondaryBg: '#f8fafc',
  secondaryBorder: '#dbe2ef',
  divider: '#d5dae7',
  logoBorder: '#2563eb',
  logoFill: '#1d3aac',
  icon: '#0f172a',
  themeIcon: '#0f172a',
};

const TRANSITION_MS = 600;
const TRANSITION_EASING = Easing.bezier(0.4, 0, 0.2, 1);
export default function SignPlatformScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { refreshRole } = useSessionRole();
  useSuppressErrorToasts();
  const { t, language, setLanguage } = useLanguagePreference();
  const { resolvedScheme, setThemePreference } = useThemePreference();
  const palette = resolvedScheme === 'dark' ? darkPalette : lightPalette;
  const isDark = resolvedScheme === 'dark';

  const [activeView, setActiveView] = useState<AuthView>('login');
  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [authWidth, setAuthWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(520);
  const didInitAuthLayout = useRef(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const themeFade = useRef(new Animated.Value(1)).current;
  const themeScale = useRef(new Animated.Value(1)).current;
  const loginTranslate = useRef(new Animated.Value(0)).current;
  const signupTranslate = useRef(new Animated.Value(0)).current;
  const loginOpacity = useRef(new Animated.Value(1)).current;
  const signupOpacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    themeFade.setValue(0.88);
    themeScale.setValue(0.985);
    Animated.parallel([
      Animated.timing(themeFade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(themeScale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [resolvedScheme, themeFade, themeScale]);

  useEffect(() => {
    if (authWidth <= 0 || didInitAuthLayout.current) return;
    didInitAuthLayout.current = true;
    loginTranslate.setValue(0);
    loginOpacity.setValue(1);
    signupTranslate.setValue(-authWidth);
    signupOpacity.setValue(0);
  }, [authWidth, loginOpacity, loginTranslate, signupOpacity, signupTranslate]);

  function updateStageHeight(height: number) {
    setStageHeight((prev) => (height > prev ? height : prev));
  }

  function animateToLogin() {
    if (activeView === 'login') return;
    setActiveView('login');
    if (authWidth <= 0) return;

    loginTranslate.setValue(authWidth);
    loginOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(signupTranslate, {
        toValue: -authWidth,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(signupOpacity, {
        toValue: 0,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(loginTranslate, {
        toValue: 0,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(loginOpacity, {
        toValue: 1,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function animateToSignup() {
    if (activeView === 'signup') return;
    setActiveView('signup');
    if (authWidth <= 0) return;

    signupTranslate.setValue(authWidth);
    signupOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(loginTranslate, {
        toValue: -authWidth,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(loginOpacity, {
        toValue: 0,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(signupTranslate, {
        toValue: 0,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
      Animated.timing(signupOpacity, {
        toValue: 1,
        duration: TRANSITION_MS,
        easing: TRANSITION_EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const canSignInSubmit = useMemo(
    () => loginEmail.trim().length > 0 && loginPassword.length >= 8 && !isSigningIn,
    [loginEmail, loginPassword, isSigningIn],
  );

  const canSignUpSubmit = useMemo(() => {
    const trimmedName = signupFullName.trim();
    const trimmedPhone = signupPhone.trim();
    return (
      trimmedName.length >= 2 &&
      trimmedName.length <= 30 &&
      signupEmail.trim().length > 0 &&
      SIGNUP_PHONE_PATTERN.test(trimmedPhone) &&
      signupPassword.length >= 8 &&
      !isSigningUp
    );
  }, [signupFullName, signupEmail, signupPhone, signupPassword, isSigningUp]);

  const mascot = useSignMascotInteraction({
    t,
    focusedField,
    activeView,
    loginEmail,
    loginPassword,
    signupEmail,
    signupPhone,
    signupPassword,
    signupFullName,
    isSigningIn,
    isSigningUp,
  });

  const mascotPose = useMemo((): SignMascotPose => {
    if (isSigningIn || isSigningUp) return 'busy';
    if (
      focusedField === 'loginEmail' ||
      focusedField === 'signupEmail' ||
      focusedField === 'signupFullName' ||
      focusedField === 'signupPhone'
    ) {
      return 'watching';
    }
    if (activeView === 'signup') return 'welcome';
    return 'idle';
  }, [activeView, focusedField, isSigningIn, isSigningUp]);

  const blobPrimary = isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(59, 130, 246, 0.05)';
  const blobSecondary = isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.05)';

  async function handleSignIn() {
    if (!mascot.validateSignInForm()) return;
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      const roleName = await resolveRoleAfterLogin();
      const route = resolvePostLoginRoute(roleName);
      await setStoredPostLoginRoute(route);
      await refreshRole();
      showToast(t('Đăng nhập thành công', 'Login successful'), 'success');
      setLoginPassword('');
      router.replace(route as never);
    } catch (error) {
      mascot.speakAuthError(error);
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignUp() {
    if (!mascot.validateSignUpForm()) return;
    if (isSigningUp) return;
    setIsSigningUp(true);
    try {
      await register({
        fullName: signupFullName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        phone: signupPhone.trim(),
      });
      showToast(t('Đăng ký thành công. Vui lòng đăng nhập.', 'Registration successful. Please sign in.'), 'success');
      setLoginEmail(signupEmail.trim());
      setLoginPassword('');
      setSignupFullName('');
      setSignupEmail('');
      setSignupPhone('');
      setSignupPassword('');
      animateToLogin();
    } catch (error) {
      mascot.speakRegisterError(error);
    } finally {
      setIsSigningUp(false);
    }
  }

  return (
    <Animated.View
      style={[
        styles.screen,
        {
          backgroundColor: palette.screenBg,
          opacity: themeFade,
          transform: [{ scale: themeScale }],
        },
      ]}>
      <View pointerEvents="none" style={styles.backgroundDecor}>
        <View style={[styles.blobTopRight, { backgroundColor: blobPrimary }]} />
        <View style={[styles.blobBottomLeft, { backgroundColor: blobSecondary }]} />
      </View>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets>
          <View style={styles.contentWrap}>
            <View style={styles.topTools}>
              <View style={styles.topToolsRow}>
                <View
                  style={[
                    styles.langToggle,
                    {
                      borderColor: isDark ? '#2a2a2a' : palette.secondaryBorder,
                      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                    },
                  ]}>
                  <Pressable
                    onPress={() => setLanguage('en')}
                    style={({ pressed }) => [styles.langOption, pressed && styles.pressedScale]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === 'en' }}>
                    <ThemedText
                      style={[
                        styles.langOptionText,
                        { color: language === 'en' ? palette.primary : palette.textMuted },
                        language === 'en' && styles.langOptionTextActive,
                      ]}>
                      EN
                    </ThemedText>
                  </Pressable>
                  <ThemedText style={[styles.langDivider, { color: palette.divider }]}>|</ThemedText>
                  <Pressable
                    onPress={() => setLanguage('vi')}
                    style={({ pressed }) => [styles.langOption, pressed && styles.pressedScale]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: language === 'vi' }}>
                    <ThemedText
                      style={[
                        styles.langOptionText,
                        { color: language === 'vi' ? palette.primary : palette.textMuted },
                        language === 'vi' && styles.langOptionTextActive,
                      ]}>
                      VN
                    </ThemedText>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => setThemePreference(isDark ? 'light' : 'dark')}
                  style={({ pressed }) => [
                    styles.themeButton,
                    {
                      borderColor: isDark ? '#2a2a2a' : palette.secondaryBorder,
                      backgroundColor: isDark ? '#1a1a1a' : '#f8f8f8',
                    },
                    pressed && styles.pressedScale,
                  ]}>
                  <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color={palette.themeIcon} />
                </Pressable>
              </View>
            </View>

            <View style={styles.main}>
              <View
                style={[
                  styles.authCard,
                  {
                    backgroundColor: palette.cardBg,
                    borderColor: palette.cardBorder,
                    shadowColor: isDark ? '#000' : '#64748b',
                    shadowOpacity: isDark ? 0 : 0.12,
                    elevation: isDark ? 0 : 6,
                  },
                ]}>
                <View style={styles.branding}>
                  <View style={styles.mascotCluster}>
                    <MascotSpeechBubble speech={mascot.mascotSpeech} />
                    <View
                      style={[
                        styles.logoCircle,
                        {
                          borderColor: SIGN_MASCOT_FRAME.border,
                          backgroundColor: SIGN_MASCOT_FRAME.background,
                        },
                      ]}>
                      <SignMascotDisplay
                        pose={mascotPose}
                        lookX={mascot.lookX}
                        lookY={mascot.lookY}
                        eyeCover={mascot.eyeCover}
                      />
                    </View>
                  </View>
                  <ThemedText style={[styles.brandText, { color: palette.primary }]}>PARKOS</ThemedText>
                </View>

                <View
                  style={[styles.authStage, { minHeight: stageHeight }]}
                  onLayout={(e) => setAuthWidth(e.nativeEvent.layout.width)}>
                  <Animated.View
                    pointerEvents={activeView === 'signup' ? 'auto' : 'none'}
                    onLayout={(e) => updateStageHeight(e.nativeEvent.layout.height)}
                    style={[
                      styles.authPane,
                      authWidth > 0 && { width: authWidth },
                      {
                        opacity: signupOpacity,
                        transform: [{ translateX: signupTranslate }],
                        zIndex: activeView === 'signup' ? 2 : 1,
                      },
                    ]}>
                    <View style={styles.formPane}>
                      <ThemedText style={[styles.title, { color: palette.text }]}>{t('Tạo tài khoản', 'Create Account')}</ThemedText>
                      <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
                        {t('Tham gia mạng lưới bãi đỗ xe', 'Join our parking network')}
                      </ThemedText>
                      <View style={styles.formBlock}>
                        <FieldRow
                          icon="person-outline"
                          label={t('HỌ TÊN', 'FULL NAME')}
                          value={signupFullName}
                          focused={focusedField === 'signupFullName'}
                          palette={palette}>
                          <TextInput
                            value={signupFullName}
                            onChangeText={setSignupFullName}
                            onFocus={() => {
                              setFocusedField('signupFullName');
                              mascot.handleSignupNameFocus();
                            }}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="words"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          icon="mail-outline"
                          label={t('EMAIL', 'EMAIL')}
                          value={signupEmail}
                          focused={focusedField === 'signupEmail'}
                          palette={palette}>
                          <TextInput
                            value={signupEmail}
                            onChangeText={(text) => {
                              setSignupEmail(text);
                              mascot.handleSignupEmailChange(text);
                            }}
                            onFocus={() => {
                              setFocusedField('signupEmail');
                              mascot.handleSignupEmailFocus();
                            }}
                            onBlur={() => {
                              mascot.handleSignupEmailBlur();
                              setFocusedField(null);
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          icon="call-outline"
                          label={t('SỐ ĐIỆN THOẠI', 'PHONE')}
                          value={signupPhone}
                          focused={focusedField === 'signupPhone'}
                          palette={palette}>
                          <TextInput
                            value={signupPhone}
                            onChangeText={(text) =>
                              setSignupPhone(text.replace(/\D/g, '').slice(0, 10))
                            }
                            onFocus={() => {
                              setFocusedField('signupPhone');
                              mascot.handleSignupPhoneFocus();
                            }}
                            onBlur={() => {
                              mascot.handleSignupPhoneBlur();
                              setFocusedField(null);
                            }}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          icon="lock-closed-outline"
                          label={t('MẬT KHẨU', 'PASSWORD')}
                          value={signupPassword}
                          focused={focusedField === 'signupPassword'}
                          palette={palette}>
                          <TextInput
                            value={signupPassword}
                            onChangeText={(text) => mascot.handlePasswordChange(text, setSignupPassword)}
                            onFocus={() => {
                              setFocusedField('signupPassword');
                              mascot.handlePasswordFocus('signupPassword');
                            }}
                            onBlur={() => {
                              mascot.handlePasswordBlur();
                              setFocusedField(null);
                            }}
                            secureTextEntry={!showSignupPassword}
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                          <Pressable onPress={() => setShowSignupPassword((p) => !p)} style={styles.eyeButton}>
                            <Ionicons name={showSignupPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.icon} />
                          </Pressable>
                        </FieldRow>
                      </View>
                      <Pressable
                        disabled={isSigningUp}
                        onPress={() => void handleSignUp()}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          {
                            backgroundColor: palette.primary,
                            opacity: canSignUpSubmit ? 1 : 0.55,
                          },
                          (canSignUpSubmit && pressed) && { backgroundColor: palette.primaryPressed },
                          pressed && styles.pressedScale,
                        ]}>
                        {isSigningUp ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={styles.buttonInner}>
                            <ThemedText style={styles.primaryButtonText}>{t('ĐĂNG KÝ', 'SIGN UP')}</ThemedText>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                      <Divider
                        text={t('HOẶC ĐĂNG KÝ BẰNG', 'OR SIGN UP WITH')}
                        dividerColor={palette.divider}
                        textColor={palette.label}
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { backgroundColor: palette.secondaryBg, borderColor: palette.secondaryBorder },
                          pressed && styles.pressedScale,
                        ]}
                        onPress={mascot.speakGoogleUnavailable}>
                        <Ionicons name="logo-google" size={16} color="#111827" />
                        <ThemedText style={[styles.secondaryButtonText, { color: isDark ? '#111827' : palette.text }]}>
                          Google
                        </ThemedText>
                      </Pressable>
                      <View style={styles.footerRow}>
                        <ThemedText style={[styles.footerText, { color: palette.textMuted }]}>
                          {t('Đã có tài khoản?', 'Already have an account?')}
                        </ThemedText>
                        <Pressable onPress={animateToLogin}>
                          <ThemedText style={[styles.footerLink, { color: palette.primary }]}>{t('Đăng nhập', 'Sign in')}</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>

                  <Animated.View
                    pointerEvents={activeView === 'login' ? 'auto' : 'none'}
                    onLayout={(e) => updateStageHeight(e.nativeEvent.layout.height)}
                    style={[
                      styles.authPane,
                      authWidth > 0 && { width: authWidth },
                      {
                        opacity: loginOpacity,
                        transform: [{ translateX: loginTranslate }],
                        zIndex: activeView === 'login' ? 2 : 1,
                      },
                    ]}>
                    <View style={styles.formPane}>
                      <ThemedText style={[styles.title, { color: palette.text }]}>{t('Chào mừng trở lại', 'Welcome Back')}</ThemedText>
                      <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>
                        {t('Đăng nhập vào tài khoản của bạn', 'Sign in to your account')}
                      </ThemedText>
                      <View style={styles.formBlock}>
                        <FieldRow
                          icon="mail-outline"
                          label={t('EMAIL', 'EMAIL')}
                          value={loginEmail}
                          focused={focusedField === 'loginEmail'}
                          palette={palette}>
                          <TextInput
                            value={loginEmail}
                            onChangeText={(text) => {
                              setLoginEmail(text);
                              mascot.handleLoginEmailChange(text);
                            }}
                            onFocus={() => {
                              setFocusedField('loginEmail');
                              mascot.handleLoginEmailFocus();
                            }}
                            onBlur={() => {
                              mascot.handleLoginEmailBlur();
                              setFocusedField(null);
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <View style={styles.passwordTopRow}>
                          <Pressable onPress={mascot.speakForgotPasswordUnavailable}>
                            <ThemedText style={[styles.forgotText, { color: palette.primary }]}>
                              {t('Quên mật khẩu?', 'Forgot password?')}
                            </ThemedText>
                          </Pressable>
                        </View>
                        <FieldRow
                          icon="lock-closed-outline"
                          label={t('MẬT KHẨU', 'PASSWORD')}
                          value={loginPassword}
                          focused={focusedField === 'loginPassword'}
                          palette={palette}>
                          <TextInput
                            value={loginPassword}
                            onChangeText={(text) => mascot.handlePasswordChange(text, setLoginPassword)}
                            onFocus={() => {
                              setFocusedField('loginPassword');
                              mascot.handlePasswordFocus('loginPassword');
                            }}
                            onBlur={() => {
                              mascot.handlePasswordBlur();
                              setFocusedField(null);
                            }}
                            secureTextEntry={!showLoginPassword}
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                          <Pressable onPress={() => setShowLoginPassword((p) => !p)} style={styles.eyeButton}>
                            <Ionicons name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={palette.icon} />
                          </Pressable>
                        </FieldRow>
                      </View>
                      <Pressable
                        disabled={isSigningIn}
                        onPress={() => void handleSignIn()}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          {
                            backgroundColor: palette.primary,
                            opacity: canSignInSubmit ? 1 : 0.55,
                          },
                          (canSignInSubmit && pressed) && { backgroundColor: palette.primaryPressed },
                          pressed && styles.pressedScale,
                        ]}>
                        {isSigningIn ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={styles.buttonInner}>
                            <ThemedText style={styles.primaryButtonText}>{t('ĐĂNG NHẬP', 'SIGN IN')}</ThemedText>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                      <Divider
                        text={t('HOẶC TIẾP TỤC BẰNG', 'OR CONTINUE WITH')}
                        dividerColor={palette.divider}
                        textColor={palette.label}
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { backgroundColor: palette.secondaryBg, borderColor: palette.secondaryBorder },
                          pressed && styles.pressedScale,
                        ]}
                        onPress={mascot.speakGoogleUnavailable}>
                        <Ionicons name="logo-google" size={16} color="#111827" />
                        <ThemedText style={[styles.secondaryButtonText, { color: isDark ? '#111827' : palette.text }]}>
                          Google
                        </ThemedText>
                      </Pressable>
                      <View style={styles.footerRow}>
                        <ThemedText style={[styles.footerText, { color: palette.textMuted }]}>
                          {t('Chưa có tài khoản?', "Don't have an account?")}
                        </ThemedText>
                        <Pressable onPress={animateToSignup}>
                          <ThemedText style={[styles.footerLink, { color: palette.primary }]}>{t('Đăng ký', 'Sign up')}</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

function FieldRow({
  icon,
  label,
  value,
  focused,
  palette,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  focused: boolean;
  palette: Palette;
  children: React.ReactNode;
}) {
  const floatValue = useRef(new Animated.Value(value.trim().length > 0 ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(floatValue, {
      toValue: focused || value.trim().length > 0 ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, value, floatValue]);

  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });

  return (
    <View style={styles.fieldWrap}>
      <View
        style={[
          styles.inputRow,
          {
            borderBottomColor: focused ? palette.inputFocusBorder : palette.inputBorder,
          },
        ]}>
        <Ionicons name={icon} size={20} color={focused ? palette.primary : palette.icon} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingLabelWrap,
            {
              transform: [{ translateY }],
            },
          ]}>
          <ThemedText
            numberOfLines={1}
            style={[styles.floatingLabelText, { color: focused ? palette.primary : palette.label }]}>
            {label}
          </ThemedText>
        </Animated.View>
        {children}
      </View>
    </View>
  );
}

function Divider({ text, dividerColor, textColor }: { text: string; dividerColor: string; textColor: string }) {
  return (
    <View style={styles.dividerWrap}>
      <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
      <ThemedText style={[styles.dividerText, { color: textColor }]}>{text}</ThemedText>
      <View style={[styles.dividerLine, { backgroundColor: dividerColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundDecor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: '80%',
    height: '55%',
    borderRadius: 9999,
    opacity: 0.9,
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: '60%',
    height: '45%',
    borderRadius: 9999,
    opacity: 0.9,
  },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  contentWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    overflow: 'visible',
  },
  topTools: {
    minHeight: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  topToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    borderWidth: 1,
  },
  langOption: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  langOptionText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  langOptionTextActive: {
    fontWeight: '700',
  },
  langDivider: {
    fontSize: 13,
    lineHeight: 16,
    marginHorizontal: 2,
    opacity: 0.6,
  },
  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  main: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  authCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
    overflow: 'visible',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
    overflow: 'visible',
    zIndex: 2,
  },
  mascotCluster: {
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 332,
    overflow: 'visible',
  },
  logoCircle: {
    width: SIGN_MASCOT_CIRCLE_SIZE,
    height: SIGN_MASCOT_CIRCLE_SIZE,
    borderRadius: SIGN_MASCOT_CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  brandText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  authStage: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  authPane: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  formPane: {
    gap: 8,
  },
  title: {
    fontSize: 46,
    lineHeight: 50,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 10,
  },
  formBlock: {
    gap: 12,
  },
  passwordTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: -4,
    marginTop: 2,
  },
  forgotText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  fieldWrap: {
    position: 'relative',
  },
  inputRow: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  floatingLabelWrap: {
    position: 'absolute',
    left: 32,
    right: 36,
    top: 17,
  },
  floatingLabelText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    paddingTop: 19,
    paddingBottom: 5,
    paddingHorizontal: 8,
  },
  eyeButton: {
    paddingHorizontal: 4,
  },
  primaryButton: {
    minHeight: 46,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    lineHeight: 12,
    fontFamily: Fonts.mono,
    letterSpacing: 1.6,
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 14,
    marginBottom: 2,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerLink: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
