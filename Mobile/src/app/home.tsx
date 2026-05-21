import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { logout } from '@/lib/auth-api';
import { useAppToast } from '@/components/app-toast';

export default function HomeScreen() {
    const router = useRouter();
    const theme = useTheme();
    const { showToast } = useAppToast();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function handleLogout() {
        setIsLoggingOut(true);
        try {
            await logout();
            showToast('Logged out', 'success');
            router.replace('/login' as never);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Logout failed', 'error');
        } finally {
            setIsLoggingOut(false);
        }
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.content}>
                <ThemedText type="subtitle">Home</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                    This is the home screen after login.
                </ThemedText>

                <Pressable
                    onPress={handleLogout}
                    disabled={isLoggingOut}
                    style={({ pressed }) => [
                        styles.button,
                        { backgroundColor: theme.text, opacity: pressed || isLoggingOut ? 0.72 : 1 },
                    ]}>
                    {isLoggingOut ? (
                        <ActivityIndicator color={theme.background} />
                    ) : (
                        <ThemedText type="smallBold" style={[styles.buttonText, { color: theme.background }]}>
                            Logout
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.four,
    },
    content: {
        width: '100%',
        maxWidth: MaxContentWidth,
        gap: Spacing.three,
    },
    subtitle: {
        lineHeight: 22,
    },
    button: {
        minHeight: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.three,
        alignSelf: 'flex-start',
        minWidth: 140,
    },
    buttonText: {
        letterSpacing: 0.2,
    },
});