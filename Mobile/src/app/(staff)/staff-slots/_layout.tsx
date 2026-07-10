import { Stack } from "expo-router";
import React from "react";

import { HeroTransitionProvider } from "@/features/staff/motion/hero-transition-context";

export default function StaffSlotsLayout() {
  return (
    <HeroTransitionProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "none",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </HeroTransitionProvider>
  );
}
