import type { View } from "react-native";

import type { HeroBounds } from "@/features/staff/motion/hero-transition-context";

export function measureHeroBounds(ref: View, borderRadius: number): Promise<HeroBounds> {
  return new Promise((resolve, reject) => {
    if (!ref?.measureInWindow) {
      reject(new Error("Unable to measure hero bounds"));
      return;
    }

    ref.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        reject(new Error("Hero bounds are empty"));
        return;
      }
      resolve({ x, y, width, height, borderRadius });
    });
  });
}
