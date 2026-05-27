import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/hooks/theme-preference';
import { login, register } from '@/lib/auth-api';

type AuthView = 'login' | 'signup';
type FocusField = 'loginEmail' | 'loginPassword' | 'signupFullName' | 'signupEmail' | 'signupPassword' | null;

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
  screenBg: '#151312',
  cardBg: '#161312',
  cardBorder: '#302b2a',
  text: '#ffffff',
  textMuted: '#d3c3c2',
  label: '#f0e2df',
  inputBorder: '#4b403f',
  inputFocusBorder: '#f97316',
  inputFocusBg: '#1e1a19',
  primary: '#f97316',
  primaryPressed: '#ea6a10',
  secondaryBg: '#343132',
  secondaryBorder: '#474141',
  divider: '#4b403f',
  logoBorder: '#f97316',
  logoFill: '#f97316',
  icon: '#f7b086',
  themeIcon: '#f97316',
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
const CAR_DRIVE_MS = 4000;

export default function SignPlatformScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { resolvedScheme, setThemePreference } = useThemePreference();
  const palette = resolvedScheme === 'dark' ? darkPalette : lightPalette;

  const [activeView, setActiveView] = useState<AuthView>('login');
  const [focusedField, setFocusedField] = useState<FocusField>(null);
  const [authWidth, setAuthWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(520);
  const didInitAuthLayout = useRef(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
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
  const carDrive = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(carDrive, {
          toValue: 1,
          duration: CAR_DRIVE_MS,
          easing: TRANSITION_EASING,
          useNativeDriver: true,
        }),
        Animated.timing(carDrive, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [carDrive]);

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
    return (
      trimmedName.length >= 2 &&
      trimmedName.length <= 30 &&
      signupEmail.trim().length > 0 &&
      signupPassword.length > 0 &&
      !isSigningUp
    );
  }, [signupFullName, signupEmail, signupPassword, isSigningUp]);

  const carTranslateX = carDrive.interpolate({
    inputRange: [0, 0.15, 0.4, 0.65, 0.85, 1],
    outputRange: [-52, -40, -4, -4, 18, 56],
  });

  const carOpacity = carDrive.interpolate({
    inputRange: [0, 0.15, 0.4, 0.65, 0.85, 1],
    outputRange: [0, 1, 1, 1, 1, 0],
  });

  const blobPrimary = resolvedScheme === 'dark' ? 'rgba(249, 115, 22, 0.1)' : 'rgba(59, 130, 246, 0.05)';
  const blobSecondary = resolvedScheme === 'dark' ? 'rgba(225, 190, 190, 0.05)' : 'rgba(99, 102, 241, 0.05)';

  async function handleSignIn() {
    if (!canSignInSubmit) return;
    setIsSigningIn(true);
    try {
      await login(loginEmail.trim(), loginPassword);
      showToast('Login successful', 'success');
      setLoginPassword('');
      router.replace('/dashboard' as never);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Cannot login', 'error');
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleSignUp() {
    if (!canSignUpSubmit) return;
    setIsSigningUp(true);
    try {
      await register({
        fullName: signupFullName.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
        phone: '',
      });
      showToast('Registration successful. Please sign in.', 'success');
      setLoginEmail(signupEmail.trim());
      setLoginPassword('');
      setSignupFullName('');
      setSignupEmail('');
      setSignupPassword('');
      animateToLogin();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Cannot register', 'error');
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
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.contentWrap}>
            <View style={styles.topTools}>
              <Pressable
                onPress={() => setThemePreference(resolvedScheme === 'dark' ? 'light' : 'dark')}
                style={({ pressed }) => [
                  styles.themeButton,
                  {
                    borderColor: palette.secondaryBorder,
                    backgroundColor: resolvedScheme === 'dark' ? '#1f1b1a' : '#f8f8f8',
                  },
                  pressed && styles.pressedScale,
                ]}>
                <Ionicons
                  name={resolvedScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                  size={18}
                  color={palette.themeIcon}
                />
              </Pressable>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.main}>
              <View
                style={[
                  styles.authCard,
                  {
                    backgroundColor: palette.cardBg,
                    borderColor: palette.cardBorder,
                    shadowColor: resolvedScheme === 'dark' ? '#000' : '#64748b',
                  },
                ]}>
                <View style={styles.branding}>
                  <View style={[styles.logoCircle, { borderColor: palette.logoBorder, backgroundColor: resolvedScheme === 'dark' ? '#373433' : '#fff' }]}>
                    <View style={[styles.logoSquare, { backgroundColor: palette.logoFill }]} />
                    <Animated.View style={[styles.logoCar, { opacity: carOpacity, transform: [{ translateX: carTranslateX }] }]}>
                      <Ionicons name="car-sport-outline" size={28} color={resolvedScheme === 'dark' ? '#f97316' : '#1d3aac'} />
                    </Animated.View>
                  </View>
                  <ThemedText style={[styles.brandText, { color: palette.primary }]}>ParkOs</ThemedText>
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
                      <ThemedText style={[styles.title, { color: palette.text }]}>Create Account</ThemedText>
                      <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>Join our parking network</ThemedText>
                      <View style={styles.formBlock}>
                        <FieldRow
                          icon="person-outline"
                          label="FULL NAME"
                          value={signupFullName}
                          focused={focusedField === 'signupFullName'}
                          palette={palette}>
                          <TextInput
                            value={signupFullName}
                            onChangeText={setSignupFullName}
                            onFocus={() => setFocusedField('signupFullName')}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="words"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          icon="mail-outline"
                          label="EMAIL"
                          value={signupEmail}
                          focused={focusedField === 'signupEmail'}
                          palette={palette}>
                          <TextInput
                            value={signupEmail}
                            onChangeText={setSignupEmail}
                            onFocus={() => setFocusedField('signupEmail')}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <FieldRow
                          icon="lock-closed-outline"
                          label="PASSWORD"
                          value={signupPassword}
                          focused={focusedField === 'signupPassword'}
                          palette={palette}>
                          <TextInput
                            value={signupPassword}
                            onChangeText={setSignupPassword}
                            onFocus={() => setFocusedField('signupPassword')}
                            onBlur={() => setFocusedField(null)}
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
                        disabled={!canSignUpSubmit}
                        onPress={handleSignUp}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          { backgroundColor: palette.primary },
                          (!canSignUpSubmit || pressed) && { backgroundColor: palette.primaryPressed },
                          pressed && styles.pressedScale,
                        ]}>
                        {isSigningUp ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={styles.buttonInner}>
                            <ThemedText style={styles.primaryButtonText}>Sign Up</ThemedText>
                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                      <Divider text="OR SIGN UP WITH" dividerColor={palette.divider} textColor={palette.label} />
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { backgroundColor: palette.secondaryBg, borderColor: palette.secondaryBorder },
                          pressed && styles.pressedScale,
                        ]}
                        onPress={() => showToast('Google sign-up is not available yet', 'error')}>
                        <Ionicons name="logo-google" size={16} color={resolvedScheme === 'dark' ? '#f5f5f5' : '#111827'} />
                        <ThemedText style={[styles.secondaryButtonText, { color: palette.text }]}>Google</ThemedText>
                      </Pressable>
                      <View style={styles.footerRow}>
                        <ThemedText style={[styles.footerText, { color: palette.textMuted }]}>Already have an account?</ThemedText>
                        <Pressable onPress={animateToLogin}>
                          <ThemedText style={[styles.footerLink, { color: palette.primary }]}>Sign in</ThemedText>
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
                      <ThemedText style={[styles.title, { color: palette.text }]}>Welcome Back</ThemedText>
                      <ThemedText style={[styles.subtitle, { color: palette.textMuted }]}>Sign in to your account</ThemedText>
                      <View style={styles.formBlock}>
                        <FieldRow
                          icon="mail-outline"
                          label="EMAIL"
                          value={loginEmail}
                          focused={focusedField === 'loginEmail'}
                          palette={palette}>
                          <TextInput
                            value={loginEmail}
                            onChangeText={setLoginEmail}
                            onFocus={() => setFocusedField('loginEmail')}
                            onBlur={() => setFocusedField(null)}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            placeholder=""
                            style={[styles.input, { color: palette.text }]}
                          />
                        </FieldRow>
                        <View style={styles.passwordTopRow}>
                          <Pressable onPress={() => showToast('Reset password is not available yet', 'error')}>
                            <ThemedText style={[styles.forgotText, { color: palette.primary }]}>Forgot password?</ThemedText>
                          </Pressable>
                        </View>
                        <FieldRow
                          icon="lock-closed-outline"
                          label="PASSWORD"
                          value={loginPassword}
                          focused={focusedField === 'loginPassword'}
                          palette={palette}>
                          <TextInput
                            value={loginPassword}
                            onChangeText={setLoginPassword}
                            onFocus={() => setFocusedField('loginPassword')}
                            onBlur={() => setFocusedField(null)}
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
                        disabled={!canSignInSubmit}
                        onPress={handleSignIn}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          { backgroundColor: palette.primary },
                          (!canSignInSubmit || pressed) && { backgroundColor: palette.primaryPressed },
                          pressed && styles.pressedScale,
                        ]}>
                        {isSigningIn ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <View style={styles.buttonInner}>
                            <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                      <Divider text="OR CONTINUE WITH" dividerColor={palette.divider} textColor={palette.label} />
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryButton,
                          { backgroundColor: palette.secondaryBg, borderColor: palette.secondaryBorder },
                          pressed && styles.pressedScale,
                        ]}
                        onPress={() => showToast('Google sign-in is not available yet', 'error')}>
                        <Ionicons name="logo-google" size={16} color={resolvedScheme === 'dark' ? '#f5f5f5' : '#111827'} />
                        <ThemedText style={[styles.secondaryButtonText, { color: palette.text }]}>Google</ThemedText>
                      </Pressable>
                      <View style={styles.footerRow}>
                        <ThemedText style={[styles.footerText, { color: palette.textMuted }]}>Don't have an account?</ThemedText>
                        <Pressable onPress={animateToSignup}>
                          <ThemedText style={[styles.footerLink, { color: palette.primary }]}>Sign up</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              </View>
            </KeyboardAvoidingView>
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
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [focused, value, floatValue]);

  const translateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -13],
  });

  const scale = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.84],
  });

  const focusRing = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(focusRing, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [focused, focusRing]);

  const ringOpacity = focusRing.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.fieldWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.inputFocusRing,
          {
            opacity: ringOpacity,
            borderColor: palette.inputFocusBorder,
          },
        ]}
      />
      <View
        style={[
          styles.inputRow,
          {
            borderBottomColor: focused ? palette.inputFocusBorder : palette.inputBorder,
            backgroundColor: focused ? palette.inputFocusBg : 'transparent',
          },
        ]}>
        <Ionicons name={icon} size={20} color={focused ? palette.primary : palette.icon} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingLabelWrap,
            {
              transform: [{ translateY }, { scale }],
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  contentWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flex: 1,
  },
  topTools: {
    minHeight: 56,
    alignItems: 'flex-end',
    justifyContent: 'center',
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
    flex: 1,
    justifyContent: 'center',
  },
  authCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 18,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  branding: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  logoSquare: {
    width: 52,
    height: 52,
  },
  logoCar: {
    position: 'absolute',
  },
  brandText: {
    fontSize: 30,
    lineHeight: 34,
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
  inputFocusRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 6,
    borderWidth: 2,
  },
  inputRow: {
    minHeight: 52,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  floatingLabelWrap: {
    position: 'absolute',
    left: 28,
    right: 32,
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
