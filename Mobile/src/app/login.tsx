import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { login } from '@/lib/auth-api';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppToast } from '@/components/app-toast';

export default function LoginScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 8 && !isSubmitting,
    [email, password, isSubmitting],
  );

  async function handleLogin() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      showToast('Login successful', 'success');
      setPassword('');
      router.replace('/home' as never);
    } catch (loginError) {
      showToast(loginError instanceof Error ? loginError.message : 'Cannot login', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.topNav}>
              <Pressable
                onPress={() => router.replace('/home' as never)}
                style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}>
                <ThemedText style={styles.homeButtonText}>Trang chu</ThemedText>
              </Pressable>
              <ThemedText style={styles.navTitle}>Parking Building System</ThemedText>
              <View style={styles.navGhost} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.main}>
              <View style={[styles.loginCard, isCompact && styles.loginCardCompact]}>
                <ThemedText style={[styles.cardTitle, isCompact && styles.cardTitleCompact]}>
                  Account Login
                </ThemedText>
                <ThemedText style={styles.cardBody}>
                  Sign in to continue managing smart parking sessions.
                </ThemedText>

                <View style={styles.form}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Email</ThemedText>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      placeholder="Email"
                      placeholderTextColor="#8a8f98"
                      selectionColor="#5e6ad2"
                      style={[styles.input, isCompact && styles.inputCompact]}
                    />
                  </View>

                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Password</ThemedText>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      placeholder="Password"
                      placeholderTextColor="#8a8f98"
                      selectionColor="#5e6ad2"
                      style={[styles.input, isCompact && styles.inputCompact]}
                    />
                  </View>
                </View>

                <Pressable
                  disabled={!canSubmit}
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.signInButton,
                    (!canSubmit || pressed) && styles.buttonPressed,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.signInButtonText}>Dang nhap</ThemedText>
                  )}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    flex: 1,
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
  homeButton: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#34343a',
    backgroundColor: '#0f1011',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#f7f8f8',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  navTitle: {
    color: '#f7f8f8',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  navGhost: {
    width: 75,
  },
  main: {
    flex: 1,
    justifyContent: 'center',
  },
  loginCard: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 12,
    backgroundColor: '#0f1011',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  loginCardCompact: {
    paddingVertical: Spacing.three,
  },
  cardTitle: {
    color: '#f7f8f8',
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: -0.8,
  },
  cardTitleCompact: {
    fontSize: 30,
    lineHeight: 34,
  },
  cardBody: {
    color: '#d0d6e0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 2,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    color: '#8a8f98',
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#34343a',
    borderRadius: 8,
    backgroundColor: '#141516',
    color: '#f7f8f8',
    paddingHorizontal: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  inputCompact: {
    minHeight: 42,
  },
  signInButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#5e6ad2',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
