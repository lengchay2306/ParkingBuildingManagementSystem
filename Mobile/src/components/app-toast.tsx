import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';

type ToastKind = 'success' | 'error';

type ToastState = {
    id: number;
    message: string;
    kind: ToastKind;
} | null;

type ToastContextValue = {
    showToast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function AppToastProvider({ children }: { children: React.ReactNode }) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const [toast, setToast] = useState<ToastState>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        const id = Date.now();
        setToast({ id, message, kind });

        timerRef.current = setTimeout(() => {
            setToast((current) => (current?.id === id ? null : current));
        }, 2400);
    }, []);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const contextValue = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            {toast ? (
                <View
                    pointerEvents="none"
                    style={[
                        styles.toastWrap,
                        {
                            top: insets.top + Spacing.three,
                            backgroundColor:
                                toast.kind === 'success' ? 'rgba(22, 163, 74, 0.96)' : 'rgba(220, 38, 38, 0.96)',
                        },
                    ]}>
                    <ThemedText type="smallBold" style={[styles.toastText, { color: theme.background }]}>
                        {toast.message}
                    </ThemedText>
                </View>
            ) : null}
        </ToastContext.Provider>
    );
}

export function useAppToast() {
    const value = useContext(ToastContext);

    if (!value) {
        throw new Error('useAppToast must be used within AppToastProvider');
    }

    return value;
}

const styles = StyleSheet.create({
    toastWrap: {
        position: 'absolute',
        left: Spacing.four,
        right: Spacing.four,
        zIndex: 50,
        alignSelf: 'center',
        maxWidth: 520,
        borderRadius: 18,
        paddingHorizontal: Spacing.three,
        paddingVertical: Spacing.two,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
    },
    toastText: {
        textAlign: 'center',
    },
});