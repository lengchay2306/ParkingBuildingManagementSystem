import React, { useMemo, useState } from "react";
import { StyleSheet, TextInput, type TextInputProps } from "react-native";

import { Radius, Spacing, Typography } from "@/constants/design";
import { useDesignColors } from "@/hooks/use-design-colors";

type StaffTextInputProps = TextInputProps & {
  mono?: boolean;
};

export function StaffTextInput({ style, mono, onFocus, onBlur, ...rest }: StaffTextInputProps) {
  const DesignColors = useDesignColors();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => createInputStyles(DesignColors), [DesignColors]);

  return (
    <TextInput
      placeholderTextColor={DesignColors.placeholder}
      style={[styles.input, mono && styles.inputMono, focused && styles.inputFocused, style]}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      {...rest}
    />
  );
}

function createInputStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    input: {
      ...Typography.body,
      color: DesignColors.ink,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface3,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minHeight: 48,
    },
    inputMono: {
      ...Typography.mono,
      letterSpacing: 0.6,
    },
    inputFocused: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface2,
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
  });
}
