export type AuthScreenPalette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  label: string;
  inputBorder: string;
  inputFocusBorder: string;
  inputBg: string;
  primary: string;
  primaryPressed: string;
  icon: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  successBg: string;
  successBorder: string;
  successText: string;
};

export const authDarkPalette: AuthScreenPalette = {
  screenBg: "#000000",
  cardBg: "#000000",
  cardBorder: "#1a1a1a",
  text: "#ffffff",
  textMuted: "#9ca3af",
  label: "#6b7280",
  inputBorder: "#2a2a2a",
  inputFocusBorder: "#6366f1",
  inputBg: "#1a1a1a",
  primary: "#6366f1",
  primaryPressed: "#4f46e5",
  icon: "#6b7280",
  errorBg: "rgba(239, 68, 68, 0.12)",
  errorBorder: "rgba(239, 68, 68, 0.4)",
  errorText: "#f87171",
  successBg: "rgba(34, 197, 94, 0.12)",
  successBorder: "rgba(34, 197, 94, 0.35)",
  successText: "#4ade80",
};

export const authLightPalette: AuthScreenPalette = {
  screenBg: "#f3f4fb",
  cardBg: "#ffffff",
  cardBorder: "#d5dae7",
  text: "#0f172a",
  textMuted: "#475569",
  label: "#0f172a",
  inputBorder: "#d5dae7",
  inputFocusBorder: "#2563eb",
  inputBg: "#ffffff",
  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  icon: "#0f172a",
  errorBg: "rgba(220, 38, 38, 0.08)",
  errorBorder: "rgba(220, 38, 38, 0.35)",
  errorText: "#dc2626",
  successBg: "rgba(22, 163, 74, 0.08)",
  successBorder: "rgba(22, 163, 74, 0.3)",
  successText: "#15803d",
};
