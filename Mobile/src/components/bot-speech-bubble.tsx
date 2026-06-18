import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Fonts } from '@/constants/theme';

const TYPE_INTERVAL_MS = 28;
const RADIUS = 14;
const TAIL_HALF = 9;
const TAIL_H = 10;

export type BotSpeechBubbleTheme = {
  fill: string;
  stroke: string;
  text: string;
  borderWidth: number;
  shadow: boolean;
};

export const BOT_SPEECH_BUBBLE_LIGHT: BotSpeechBubbleTheme = {
  fill: '#ffffff',
  stroke: '#3b82f6',
  text: '#0f172a',
  borderWidth: 2,
  shadow: true,
};

export const BOT_SPEECH_BUBBLE_DARK: BotSpeechBubbleTheme = {
  fill: '#16182a',
  stroke: '#6366f1',
  text: '#e2e8f0',
  borderWidth: 2,
  shadow: false,
};

export type BotSpeechBubbleProps = {
  text: string;
  isDark: boolean;
  textColor?: string;
  maxWidth?: number;
  minWidth?: number;
  style?: StyleProp<ViewStyle>;
};

function buildBubblePath(width: number, bodyHeight: number): string {
  const r = RADIUS;
  const cx = width / 2;
  const bottom = bodyHeight;

  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `Q ${width} 0 ${width} ${r}`,
    `V ${bottom - r}`,
    `Q ${width} ${bottom} ${width - r} ${bottom}`,
    `H ${cx + TAIL_HALF}`,
    `L ${cx} ${bottom + TAIL_H}`,
    `L ${cx - TAIL_HALF} ${bottom}`,
    `H ${r}`,
    `Q 0 ${bottom} 0 ${bottom - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

export function BotSpeechBubble({
  text,
  isDark,
  textColor,
  maxWidth = 320,
  minWidth = 248,
  style,
}: BotSpeechBubbleProps) {
  const theme = isDark ? BOT_SPEECH_BUBBLE_DARK : BOT_SPEECH_BUBBLE_LIGHT;
  const resolvedTextColor = textColor ?? theme.text;
  const [displayedText, setDisplayedText] = useState('');
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  const bubblePath = useMemo(
    () =>
      frame.width > 0 && frame.height > 0
        ? buildBubblePath(frame.width, frame.height)
        : '',
    [frame.height, frame.width],
  );

  const svgHeight = frame.height + TAIL_H;

  useEffect(() => {
    setDisplayedText('');
    if (!text) return;

    let charIndex = 0;
    const timer = setInterval(() => {
      charIndex += 1;
      setDisplayedText(text.slice(0, charIndex));
      if (charIndex >= text.length) {
        clearInterval(timer);
      }
    }, TYPE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [text]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setFrame((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  };

  return (
    <View
      style={[
        styles.shell,
        { maxWidth, minWidth, width: '100%', paddingBottom: TAIL_H },
        theme.shadow && styles.lightShadow,
        style,
      ]}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={text}>
      <View style={styles.frame} onLayout={onFrameLayout}>
        {bubblePath ? (
          <Svg
            pointerEvents="none"
            style={styles.svgLayer}
            width={frame.width}
            height={svgHeight}
            viewBox={`0 0 ${frame.width} ${svgHeight}`}>
            <Path
              d={bubblePath}
              fill={theme.fill}
              stroke={theme.stroke}
              strokeWidth={theme.borderWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        ) : null}

        <View style={styles.content}>
          <Text
            numberOfLines={3}
            style={[styles.text, { color: resolvedTextColor, fontFamily: Fonts.sans }]}>
            {displayedText}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    alignSelf: 'center',
    overflow: 'visible',
  },
  frame: {
    position: 'relative',
    overflow: 'visible',
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
  },
  content: {
    zIndex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  lightShadow: {
    shadowColor: '#2563eb',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
