import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Detects whether the device is in grayscale / "color inversion" accessibility mode.
 *
 * - Android: `isGrayscaleEnabled` (API 29+) maps to Settings → Accessibility → Color correction → Grayscale.
 * - iOS: `isGrayscaleEnabled` maps to Settings → Accessibility → Display → Color Filters → Grayscale.
 *
 * Falls back to false on web / older platforms where the API is unavailable.
 */
export function useGrayscale(): boolean {
  const [isGrayscale, setIsGrayscale] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof AccessibilityInfo.isGrayscaleEnabled === 'function') {
      AccessibilityInfo.isGrayscaleEnabled().then((enabled) => {
        setIsGrayscale(enabled);
      });
    }

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'grayscaleChanged' as any,
      (enabled: boolean) => {
        setIsGrayscale(enabled);
      },
    );

    // Also listen for invertColors changes — some devices route B&W through inversion
    const invertSubscription = AccessibilityInfo.addEventListener(
      'invertColorsChanged' as any,
      (_inverted: boolean) => {
        // Re-check grayscale when inversion toggles, since some UI overlays
        // combine the two accessibility settings.
        if (typeof AccessibilityInfo.isGrayscaleEnabled === 'function') {
          AccessibilityInfo.isGrayscaleEnabled().then(setIsGrayscale);
        }
      },
    );

    // For Android: also poll reduceMotion as a proxy signal when the
    // grayscale listener isn't available (pre-API 29).
    let reduceSubscription: ReturnType<typeof AccessibilityInfo.addEventListener> | null = null;
    if (Platform.OS === 'android') {
      reduceSubscription = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        () => {
          if (typeof AccessibilityInfo.isGrayscaleEnabled === 'function') {
            AccessibilityInfo.isGrayscaleEnabled().then(setIsGrayscale);
          }
        },
      );
    }

    return () => {
      subscription?.remove();
      invertSubscription?.remove();
      reduceSubscription?.remove();
    };
  }, []);

  return isGrayscale;
}
