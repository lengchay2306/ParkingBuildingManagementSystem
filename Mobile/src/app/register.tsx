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

import { register } from '@/lib/auth-api';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppToast } from '@/components/app-toast';

export default function RegisterScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    return (
      trimmedName.length >= 2 &&
      trimmedName.length <= 30 &&
      email.trim().length > 0 &&
      /^[0-9]+$/.test(trimmedPhone) &&
      trimmedPhone.length > 0 &&
      trimmedPhone.length <= 10 &&
      password.length > 0 &&
      !isSubmitting
    );
  }, [fullName, email, phone, password, isSubmitting]);

  async function handleRegister() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      showToast('Registration successful. Please sign in.', 'success');
      router.replace('/login' as never);
    } catch (registerError) {
      showToast(
        registerError instanceof Error ? registerError.message : 'Cannot register',
        'error',
      );
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
                onPress={() => router.replace('/home_check1' as never)}
                style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}>
                <ThemedText style={styles.homeButtonText}>Home</ThemedText>
              </Pressable>
              <ThemedText style={styles.navTitle}>Parking Building System</ThemedText>
              <View style={styles.navGhost} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.main}>
              <View style={[styles.card, isCompact && styles.cardCompact]}>
                <ThemedText style={[styles.cardTitle, isCompact && styles.cardTitleCompact]}>
                  Create Account
                </ThemedText>
                <ThemedText style={styles.cardBody}>
                  Register a customer account to use smart parking services.
                </ThemedText>

                <View style={styles.form}>
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Full name</ThemedText>
                    <TextInput
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      placeholder="Full name"
                      placeholderTextColor="#8a8f98"
                      selectionColor="#5e6ad2"
                      style={[styles.input, isCompact && styles.inputCompact]}
                    />
                  </View>

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
                    <ThemedText style={styles.label}>Phone</ThemedText>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="Phone number"
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
                  onPress={handleRegister}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (!canSubmit || pressed) && styles.buttonPressed,
                  ]}>
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>Sign up</ThemedText>
                  )}
                </Pressable>

                <View style={styles.footer}>
                  <ThemedText style={styles.footerText}>Already have an account? </ThemedText>
                  <Pressable onPress={() => router.replace('/login' as never)}>
                    <ThemedText style={styles.footerLink}>Sign in</ThemedText>
                  </Pressable>
                </View>
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
  card: {
    borderWidth: 1,
    borderColor: '#23252a',
    borderRadius: 12,
    backgroundColor: '#0f1011',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  cardCompact: {
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
  primaryButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#5e6ad2',
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerText: {
    color: '#8a8f98',
    fontSize: 14,
    lineHeight: 20,
  },
  footerLink: {
    color: '#5e6ad2',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
  },
});
