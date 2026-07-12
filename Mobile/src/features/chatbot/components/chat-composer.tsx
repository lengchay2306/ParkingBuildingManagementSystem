import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';

type ChatComposerProps = {
  disabled?: boolean;
  isSending?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onSend: (message: string) => void;
  placeholder: string;
};

export function ChatComposer({
  disabled,
  isSending,
  onBlur,
  onFocus,
  onSend,
  placeholder,
}: ChatComposerProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const canSend = !disabled && !isSending && text.trim().length > 0;

  return (
    <View style={styles.row}>
      <TextInput
        blurOnSubmit={false}
        editable={!disabled && !isSending}
        multiline
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        onChangeText={setText}
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onSubmitEditing={() => {
          if (!canSend) {
            return;
          }
          const value = text.trim();
          setText('');
          onSend(value);
        }}
        placeholder={placeholder}
        placeholderTextColor={DesignColors.placeholder}
        returnKeyType="send"
        style={[styles.input, isFocused && styles.inputFocused]}
        value={text}
      />
      <Pressable
        disabled={!canSend}
        onPress={() => {
          const value = text.trim();
          setText('');
          onSend(value);
        }}
        style={({ pressed }) => [
          styles.sendBtn,
          !canSend && styles.sendBtnDisabled,
          pressed && canSend && styles.sendBtnPressed,
        ]}>
        <Ionicons color={DesignColors.onPrimary} name="send" size={18} />
      </Pressable>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      backgroundColor: DesignColors.surface1,
    },
    input: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      ...Typography.bodySm,
      color: DesignColors.ink,
      backgroundColor: DesignColors.surface3,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
      textAlignVertical: 'center',
    },
    inputFocused: {
      borderColor: DesignColors.primaryFocus,
      backgroundColor: DesignColors.canvas,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.primaryFocus,
    },
    sendBtnDisabled: {
      opacity: 0.45,
    },
    sendBtnPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
  });
}
