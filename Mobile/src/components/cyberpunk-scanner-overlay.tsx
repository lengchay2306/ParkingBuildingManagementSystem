import {
  Canvas,
  Fill,
  Group,
  Shader,
  Skia,
  type SkRuntimeEffect,
} from "@shopify/react-native-skia";
import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  LayoutChangeEvent,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useDerivedValue, useFrameCallback, useSharedValue } from "react-native-reanimated";

import { CYBERPUNK_SCANNER_SKSL } from "@/components/shaders/cyberpunk-scanner.shader";

export type CyberpunkScannerOverlayProps = {
  style?: StyleProp<ViewStyle>;
  /** Overall brightness / opacity multiplier (0–1). */
  intensity?: number;
  /** Neon accent as #RRGGBB — defaults to design lavender. */
  neonHex?: string;
  /** Pause animation (e.g. backgrounded screen). */
  paused?: boolean;
};

function compileScannerShader(): SkRuntimeEffect | null {
  const effect = Skia.RuntimeEffect.Make(CYBERPUNK_SCANNER_SKSL);
  if (!effect) {
    console.warn("[CyberpunkScannerOverlay] SkSL compile failed");
  }
  return effect;
}

function hexToUnitRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : normalized;
  const int = Number.parseInt(value, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((channel) => channel / 255) as [
    number,
    number,
    number,
  ];
}

/**
 * Full-screen cyberpunk scanner overlay (grid + laser + chromatic aberration).
 *
 * ## Animating `time`
 * `time` is a Reanimated shared value (seconds) advanced each frame via
 * `useFrameCallback`. Skia reads it directly in shader `uniforms` — no React
 * re-renders per frame. Pass the shared value as `time: clock` in uniforms.
 */
export function CyberpunkScannerOverlay({
  style,
  intensity = 0.85,
  neonHex = "#5e6ad2",
  paused = false,
}: CyberpunkScannerOverlayProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [reduceMotion, setReduceMotion] = useState(false);

  /** Elapsed time in seconds — fed to the SkSL `uniform float time`. */
  const clock = useSharedValue(0);
  const neon = useMemo(() => hexToUnitRgb(neonHex), [neonHex]);
  const shader = useMemo(() => compileScannerShader(), []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

  const isPaused = paused || reduceMotion;
  const pausedFlag = useSharedValue(isPaused);

  useEffect(() => {
    pausedFlag.value = isPaused;
  }, [isPaused, pausedFlag]);

  useFrameCallback((frame) => {
    "worklet";
    if (pausedFlag.value) {
      return;
    }
    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    clock.value += dt;
  });

  const uniforms = useDerivedValue(() => ({
    resolution: [size.width, size.height] as const,
    time: clock.value,
    neonColor: neon,
    intensity: pausedFlag.value ? intensity * 0.25 : intensity,
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  if (!shader) {
    return null;
  }

  return (
    <View style={[styles.host, style]} onLayout={onLayout} pointerEvents="none">
      {size.width > 0 && size.height > 0 ? (
        <Canvas style={{ width: size.width, height: size.height }}>
          <Group blendMode="screen">
            <Fill>
              <Shader source={shader} uniforms={uniforms} />
            </Fill>
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
