import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SIGN_MASCOT_COLORS } from '@/components/sign-mascot';
import { getMascotSpeechColor, type MascotSpeech } from '@/lib/sign-mascot-utils';

/** Gap between bubble tail and the mascot circle (overlay only — no layout height). */
export const MASCOT_SPEECH_GAP = 8;
/** Max width of the speech bubble (wider than the mascot circle). */
export const MASCOT_SPEECH_MAX_WIDTH = 320;

type MascotSpeechBubbleProps = {
  speech: MascotSpeech | null;
};

export function MascotSpeechBubble({ speech }: MascotSpeechBubbleProps) {
  const message = speech?.text ?? null;
  const textColor = speech ? getMascotSpeechColor(speech.tone) : getMascotSpeechColor('hint');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;

  useEffect(() => {
    if (!message) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 4,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, translateY]);

  return (
    <View style={styles.overlayHost} pointerEvents="none">
      {message ? (
        <Animated.View
          style={[styles.bubble, { opacity, transform: [{ translateY }] }]}
          accessibilityRole="text"
          accessibilityLiveRegion="polite">
          <ThemedText style={[styles.text, { color: textColor }]} numberOfLines={3}>
            {message}
          </ThemedText>
          <View style={[styles.tail, { borderTopColor: SIGN_MASCOT_COLORS.body }]} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    marginBottom: MASCOT_SPEECH_GAP,
    alignItems: 'center',
    zIndex: 20,
    overflow: 'visible',
  },
  bubble: {
    maxWidth: MASCOT_SPEECH_MAX_WIDTH,
    minWidth: 248,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: SIGN_MASCOT_COLORS.body,
    borderWidth: 1,
    borderColor: SIGN_MASCOT_COLORS.accent,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  tail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -7,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
