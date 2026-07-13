import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { useGuestOnlySession } from '@/hooks/use-guest-only-session';
import { useSessionRole } from '@/hooks/session-role';
import { useSignMascotInteraction } from '@/hooks/use-sign-mascot-interaction';
import { useThemePreference } from '@/hooks/theme-preference';
import {
  forgotPassword,
  getWebForgotPasswordUrl,
  login,
  register,
  resolvePostLoginRoute,
  resolveRoleAfterLogin,
  setStoredPostLoginRoute,
} from '@/lib/auth-api';
import * as Linking from 'expo-linking';

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
  useGuestOnlySession();
  useSuppressErrorToasts();
  const { t, language, setLanguage } = useLanguagePreference();
  const { resolvedScheme, setThemePreference } = useThemePreference();
  const palette = resolvedScheme === 'dark' ? darkPalette : lightPalette;
  const isDark = resolvedScheme === 'dark';

  const [activeView, setActiveView] = useState<AuthView>('login');
  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [authWidth, setAuthWidth] = useState(0);
  const [loginHeight, setLoginHeight] = useState(520);
  const [signupHeight, setSignupHeight] = useState(520);
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
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const wasKeyboardOpenRef = useRef(false);
  const fieldRefs = useRef<Record<string, View | null>>({});

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

  const stageHeight = activeView === 'login' ? loginHeight : signupHeight;

  function updateStageHeight(height: number, view: AuthView) {
    // Extra buffer so button/footer glyphs are not clipped by authStage overflow.
    const next = Math.max(360, Math.ceil(height) + 12);
    if (view === 'login') {
      setLoginHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    } else {
      setSignupHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    }
  }

  useEffect(() => {
    if (!forgotOpen) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [forgotOpen]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      const next = event.endCoordinates.height;
      keyboardHeightRef.current = next;
      setKeyboardHeight(next);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  function ensureFieldVisible(fieldKey: string) {
    const run = () => {
      const node = fieldRefs.current[fieldKey];
      if (!node || !scrollRef.current) {
        return;
      }
      node.measureInWindow((_x, y, _w, h) => {
        const windowH = Dimensions.get('window').height;
        const kb = keyboardHeightRef.current;
        // Keep focused field in the upper visible band above the keyboard.
        const safeTop = 56;
        // Android resize already shrinks the window; iOS needs keyboard subtracted.
        const safeBottom =
          Platform.OS === 'ios' ? windowH - Math.max(kb, 0) - 20 : windowH - 20;
        const fieldTop = y;
        const fieldBottom = y + h;
        let delta = 0;
        if (fieldBottom > safeBottom) {
          delta = fieldBottom - safeBottom + 24;
        } else if (fieldTop < safeTop) {
          delta = fieldTop - safeTop;
        }
        if (Math.abs(delta) > 2) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + delta),
            animated: true,
          });
        }
      });
    };
    // Run twice: once quickly, once after keyboard animation settles.
    setTimeout(run, 50);
    setTimeout(run, 320);
  }

  useEffect(() => {
    const open = keyboardHeight > 0;
    if (open && !wasKeyboardOpenRef.current) {
      // Collapse mascot frees space — start from top so fields sit above keyboard.
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
    wasKeyboardOpenRef.current = open;
    if (open && focusedField) {
      ensureFieldVisible(focusedField);
    }
  }, [keyboardHeight, focusedField]);

  function animateToLogin() {
    if (activeView === 'login') return;
    setForgotOpen(false);
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
    setForgotOpen(false);
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

  async function handleForgotPasswordSubmit() {
    const email = forgotEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showToast(t('Vui lòng nhập email hợp lệ', 'Please enter a valid email'), 'error');
      return;
    }
    if (isSendingForgot) return;
    setIsSendingForgot(true);
    try {
      await forgotPassword(email);
      showToast(
        t(
          'Đã gửi email. Mở liên kết trên web để đặt lại mật khẩu (trong 15 phút).',
          'Email sent. Open the web link to reset your password (within 15 minutes).',
        ),
        'success',
      );
      setForgotOpen(false);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : t('Không gửi được email đặt lại mật khẩu', 'Could not send reset email'),
        'error',
      );
    } finally {
      setIsSendingForgot(false);
    }
  }

  async function openWebForgotPassword() {
    try {
      await Linking.openURL(getWebForgotPasswordUrl());
    } catch {
      showToast(t('Không mở được trang web', 'Could not open web page'), 'error');
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

  // Extra bottom space so user can drag the form above the keyboard.
  // Android already resizes the window; keep moderate pad. iOS needs full keyboard pad.
  const isKeyboardOpen = keyboardHeight > 0;
  const scrollBottomPad = isKeyboardOpen
    ? Platform.OS === 'ios'
      ? keyboardHeight + 48
      : Math.max(180, Math.round(keyboardHeight * 0.45))
    : 48;

  return (
    <View style={[styles.screen, { backgroundColor: palette.screenBg }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backgroundDecor,
          {
            opacity: themeFade,
            transform: [{ scale: themeScale }],
          },
        ]}>
        <View style={[styles.blobTopRight, { backgroundColor: blobPrimary }]} />
        <View style={[styles.blobBottomLeft, { backgroundColor: blobSecondary }]} />
      </Animated.View>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPad }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator
          bounces
          alwaysBounceVertical
          nestedScrollEnabled
          scrollEventThrottle={16}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Animated.View style={[styles.contentWrap, { opacity: themeFade }]}>
            {!isKeyboardOpen ? (
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
            ) : null}

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
                {isKeyboardOpen ? (
                  <View style={styles.brandingCompact}>
                    <ThemedText style={[styles.brandTextCompact, { color: palette.primary }]}>PARKOS</ThemedText>
                  </View>
                ) : (
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
                )}

                <View
                  style={[styles.authStage, { height: stageHeight }]}
                  onLayout={(e) => setAuthWidth(e.nativeEvent.layout.width)}>
                  <Animated.View
                    pointerEvents={activeView === 'signup' ? 'auto' : 'none'}
                    onLayout={(e) => updateStageHeight(e.nativeEvent.layout.height, 'signup')}
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
                      <Text style={[styles.title, isKeyboardOpen && styles.titleCompact, { color: palette.text }]}>
                        {t('Tạo tài khoản', 'Create Account')}
                      </Text>
                      {!isKeyboardOpen ? (
                        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                          {t('Tham gia mạng lưới bãi đỗ xe', 'Join our parking network')}
                        </Text>
                      ) : null}
                      <View style={styles.formBlock}>
                        <FieldRow
                          fieldKey="signupFullName"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('signupFullName');
                            }}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="words"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          fieldKey="signupEmail"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('signupEmail');
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
                          fieldKey="signupPhone"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('signupPhone');
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
                          fieldKey="signupPassword"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('signupPassword');
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
                          <Text numberOfLines={1} style={styles.primaryButtonText}>
                            {t('Đăng ký', 'Sign up')}
                          </Text>
                        )}
                      </Pressable>
                      <View style={styles.footerRow}>
                        <Text style={[styles.footerText, { color: palette.textMuted }]}>
                          {t('Đã có tài khoản? ', 'Already have an account? ')}
                          <Text onPress={animateToLogin} style={[styles.footerLink, { color: palette.primary }]}>
                            {t('Đăng nhập', 'Sign in')}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  </Animated.View>

                  <Animated.View
                    pointerEvents={activeView === 'login' ? 'auto' : 'none'}
                    onLayout={(e) => updateStageHeight(e.nativeEvent.layout.height, 'login')}
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
                      <Text style={[styles.title, isKeyboardOpen && styles.titleCompact, { color: palette.text }]}>
                        {t('Chào mừng trở lại', 'Welcome Back')}
                      </Text>
                      {!isKeyboardOpen ? (
                        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
                          {t('Đăng nhập vào tài khoản của bạn', 'Sign in to your account')}
                        </Text>
                      ) : null}
                      <View style={styles.formBlock}>
                        <FieldRow
                          fieldKey="loginEmail"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('loginEmail');
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
                        <FieldRow
                          fieldKey="loginPassword"
                          fieldRefs={fieldRefs}
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
                              ensureFieldVisible('loginPassword');
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
                        <View style={styles.passwordTopRow}>
                          <Pressable
                            onPress={() => {
                              setForgotEmail(loginEmail.trim());
                              setForgotOpen((open) => !open);
                              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                            }}
                          >
                            <Text style={[styles.forgotText, { color: palette.primary }]}>
                              {t('Quên mật khẩu?', 'Forgot password?')}
                            </Text>
                          </Pressable>
                        </View>
                        {forgotOpen ? (
                          <View
                            style={[
                              styles.forgotBox,
                              {
                                borderColor: palette.inputBorder,
                                backgroundColor: isDark ? palette.inputBg : palette.inputFocusBg,
                              },
                            ]}
                          >
                            <Text style={[styles.forgotHint, { color: palette.textMuted }]}>
                              {t(
                                'Nhập email để nhận liên kết. Đặt lại mật khẩu trên trang web.',
                                'Enter your email for a reset link. Password reset opens on the web.',
                              )}
                            </Text>
                            <TextInput
                              value={forgotEmail}
                              onChangeText={setForgotEmail}
                              autoCapitalize="none"
                              autoCorrect={false}
                              keyboardType="email-address"
                              placeholder={t('Email tài khoản', 'Account email')}
                              placeholderTextColor={palette.label}
                              onFocus={() => {
                                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
                              }}
                              style={[
                                styles.forgotInput,
                                {
                                  color: palette.text,
                                  borderColor: palette.inputFocusBorder,
                                  backgroundColor: palette.inputBg,
                                },
                              ]}
                            />
                            <Pressable
                              disabled={isSendingForgot}
                              onPress={() => void handleForgotPasswordSubmit()}
                              style={({ pressed }) => [
                                styles.forgotSubmit,
                                { backgroundColor: palette.primary, opacity: isSendingForgot ? 0.6 : 1 },
                                pressed && styles.pressedScale,
                              ]}
                            >
                              {isSendingForgot ? (
                                <ActivityIndicator color="#fff" />
                              ) : (
                                <Text numberOfLines={1} style={styles.forgotSubmitText}>
                                  {t('Gửi email đặt lại', 'Send reset email')}
                                </Text>
                              )}
                            </Pressable>
                            <Pressable onPress={() => void openWebForgotPassword()}>
                              <Text style={[styles.forgotWebLink, { color: palette.primary }]}>
                                {t('Mở trang quên mật khẩu trên web', 'Open forgot-password on web')}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
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
                          <Text numberOfLines={1} style={styles.primaryButtonText}>
                            {t('Đăng nhập', 'Sign in')}
                          </Text>
                        )}
                      </Pressable>
                      <View style={styles.footerRow}>
                        <Text style={[styles.footerText, { color: palette.textMuted }]}>
                          {t('Chưa có tài khoản? ', "Don't have an account? ")}
                          <Text onPress={animateToSignup} style={[styles.footerLink, { color: palette.primary }]}>
                            {t('Đăng ký', 'Sign up')}
                          </Text>
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FieldRow({
  fieldKey,
  fieldRefs,
  icon,
  label,
  value,
  focused,
  palette,
  children,
}: {
  fieldKey: string;
  fieldRefs: React.MutableRefObject<Record<string, View | null>>;
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
    <View
      ref={(node) => {
        fieldRefs.current[fieldKey] = node;
      }}
      collapsable={false}
      style={styles.fieldWrap}>
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
          <Text
            numberOfLines={1}
            style={[styles.floatingLabelText, { color: focused ? palette.primary : palette.label }]}>
            {label}
          </Text>
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
  scrollView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
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
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  langOptionTextActive: {
    fontWeight: '600',
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
  brandingCompact: {
    alignItems: 'center',
    marginBottom: Spacing.two,
    paddingTop: Spacing.one,
  },
  brandTextCompact: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleCompact: {
    fontSize: 22,
    marginBottom: Spacing.two,
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
    lineHeight: 34,
    fontWeight: '600',
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
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 2,
    includeFontPadding: false,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 10,
    includeFontPadding: false,
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
    lineHeight: 18,
    fontWeight: '600',
    includeFontPadding: false,
  },
  forgotBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 4,
  },
  forgotHint: {
    fontSize: 12,
    lineHeight: 18,
    includeFontPadding: false,
  },
  forgotInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  forgotSubmit: {
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotSubmitText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    includeFontPadding: false,
  },
  forgotWebLink: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
  fieldWrap: {
    position: 'relative',
  },
  inputRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  floatingLabelWrap: {
    position: 'absolute',
    left: 32,
    right: 36,
    top: 18,
    zIndex: 1,
  },
  floatingLabelText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    paddingTop: 18,
    paddingBottom: 6,
    paddingHorizontal: 8,
  },
  eyeButton: {
    paddingHorizontal: 4,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
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
    fontWeight: '600',
  },
  footerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  footerLink: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    includeFontPadding: false,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
});
