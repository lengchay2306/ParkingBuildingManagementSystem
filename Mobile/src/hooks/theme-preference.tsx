import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemePreference = "system" | "light" | "dark";

type ThemePreferenceContextValue = {
  themePreference: ThemePreference;
  resolvedScheme: "light" | "dark";
  setThemePreference: (next: ThemePreference) => void;
};

const STORAGE_KEY = "mobile.themePreference";

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!alive) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemePreferenceState(stored);
        }
      })
      .catch(() => {
        // no-op: fallback to system mode
      });
    return () => {
      alive = false;
    };
  }, []);

  const setThemePreference = (next: ThemePreference) => {
    setThemePreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // no-op: keep runtime state even if persistence fails
    });
  };

  const resolvedScheme: "light" | "dark" =
    themePreference === "system" ? (systemScheme === "light" ? "light" : "dark") : themePreference;

  const value = useMemo(
    () => ({ themePreference, resolvedScheme, setThemePreference }),
    [themePreference, resolvedScheme],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) throw new Error("useThemePreference must be used within ThemePreferenceProvider");
  return ctx;
}
