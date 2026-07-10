import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { BotSpeechBubble } from "@/components/bot-speech-bubble";
import { useThemePreference } from "@/hooks/theme-preference";
import {
  getMascotSpeechColor,
  type MascotSpeech,
  type MascotSpeechTone,
} from "@/lib/sign-mascot-utils";

/** Gap between bubble tail and the mascot circle (overlay only — no layout height). */
export const MASCOT_SPEECH_GAP = 8;
/** Max width of the speech bubble (wider than the mascot circle). */
export const MASCOT_SPEECH_MAX_WIDTH = 320;

const OPEN_MS = 220;
const CLOSE_MS = 180;

type MascotSpeechBubbleProps = {
  speech: MascotSpeech | null;
};

function getToneColor(isDark: boolean, tone?: MascotSpeechTone) {
  if (!tone) return getMascotSpeechColor("hint");
  const color = getMascotSpeechColor(tone);
  if (!isDark) return color;

  const darkToneColors: Record<MascotSpeechTone, string> = {
    idle: "#93c5fd",
    hint: "#7dd3fc",
    welcome: "#6ee7b7",
    password: "#c4b5fd",
    peek: "#fdba74",
    error: "#fca5a5",
    busy: "#a5b4fc",
  };
  return darkToneColors[tone];
}

export function MascotSpeechBubble({ speech }: MascotSpeechBubbleProps) {
  const { resolvedScheme } = useThemePreference();
  const isDark = resolvedScheme === "dark";
  const message = speech?.text ?? null;
  const textColor = getToneColor(isDark, speech?.tone);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    if (!message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: CLOSE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 4,
          duration: CLOSE_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, translateY]);

  return (
    <View style={styles.overlayHost} pointerEvents="none">
      {message ? (
        <Animated.View style={{ opacity, transform: [{ translateY }] }}>
          <BotSpeechBubble
            text={message}
            isDark={isDark}
            textColor={textColor}
            maxWidth={MASCOT_SPEECH_MAX_WIDTH}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: "100%",
    marginBottom: MASCOT_SPEECH_GAP,
    alignItems: "center",
    zIndex: 20,
    overflow: "visible",
  },
});
