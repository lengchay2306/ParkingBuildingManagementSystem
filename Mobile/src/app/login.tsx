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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { login } from '@/lib/auth-api';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppToast } from '@/components/app-toast';

export default function LoginScreen() {
    const router = useRouter();
    const { showToast } = useAppToast();
    const theme = useTheme();
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
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.keyboardView}>
                        <View style={styles.header}>
                            <ThemedText type="subtitle" style={styles.title}>
                                Login form
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                                Sign in to manage your parking session from the mobile app.
                            </ThemedText>
                        </View>

                        <ThemedView type="backgroundElement" style={styles.card}>
                            <View style={styles.form}>
                                <View style={styles.field}>
                                    <ThemedText type="smallBold" style={styles.label} themeColor="textSecondary">
                                        Email
                                    </ThemedText>
                                    <TextInput
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="email-address"
                                        placeholder="Email"
                                        placeholderTextColor={theme.textSecondary}
                                        style={[
                                            styles.input,
                                            { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background },
                                        ]}
                                    />
                                </View>

                                <View style={styles.field}>
                                    <ThemedText type="smallBold" style={styles.label} themeColor="textSecondary">
                                        Password
                                    </ThemedText>
                                    <TextInput
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        placeholder="Password"
                                        placeholderTextColor={theme.textSecondary}
                                        style={[
                                            styles.input,
                                            { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background },
                                        ]}
                                    />
                                </View>
                            </View>

                            <Pressable
                                disabled={!canSubmit}
                                onPress={handleLogin}
                                style={({ pressed }) => [
                                    styles.button,
                                    { backgroundColor: theme.text, opacity: pressed || !canSubmit ? 0.72 : 1 },
                                ]}>
                                {isSubmitting ? (
                                    <ActivityIndicator color={theme.background} />
                                ) : (
                                    <ThemedText type="smallBold" style={[styles.buttonText, { color: theme.background }]}>
                                        Sign in
                                    </ThemedText>
                                )}
                            </Pressable>
                        </ThemedView>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        alignSelf: 'center',
        width: '100%',
        maxWidth: MaxContentWidth,
        paddingHorizontal: Spacing.four,
        paddingVertical: Spacing.five,
        gap: Spacing.four,
    },
    header: {
        gap: Spacing.two,
    },
    title: {
        textAlign: 'left',
    },
    subtitle: {
        textAlign: 'left',
        lineHeight: 22,
    },
    card: {
        gap: Spacing.three,
        padding: Spacing.four,
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.06)',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
    },
    form: {
        gap: Spacing.three,
    },
    field: {
        gap: Spacing.one,
    },
    label: {
        fontSize: 12,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
    },
    input: {
        minHeight: 52,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: Spacing.three,
        fontSize: 16,
        fontWeight: '500',
    },
    button: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.three,
    },
    buttonText: {
        letterSpacing: 0.2,
    },
});