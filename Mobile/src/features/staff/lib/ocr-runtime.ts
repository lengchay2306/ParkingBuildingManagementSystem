import Constants from "expo-constants";
import { Platform } from "react-native";

export type OcrRecognitionResult = {
  text: string;
};

export type OcrScanErrorCode =
  "unavailable" | "network" | "empty" | "api_error" | "rate_limited" | "native_error";

export type OcrScanResult =
  { ok: true; text: string } | { ok: false; code: OcrScanErrorCode; message: string };

export type OcrMode = "native" | "cloud" | "none";

type OcrModule = {
  isSupported: () => boolean;
  recognizeText: (uri: string) => Promise<OcrRecognitionResult>;
};

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const DEFAULT_CLOUD_KEY = "337599973a88957";

/** Shared free key: ~1 req/s and easily hits 429 when auto-scanning. */
const CLOUD_MIN_INTERVAL_MS = {
  default: 8000,
  custom: 2500,
} as const;

const CLOUD_COOLDOWN_INITIAL_MS = 20_000;
const CLOUD_COOLDOWN_MAX_MS = 90_000;

let nativeLoadState: "idle" | "loaded" | "unavailable" = "idle";
let nativeModuleRef: OcrModule | null = null;

let lastCloudRequestAt = 0;
let cloudCooldownUntil = 0;
let cloudBackoffMs = CLOUD_COOLDOWN_INITIAL_MS;

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

function tryLoadNativeOcrModule(): OcrModule | null {
  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }
  if (nativeLoadState === "loaded") {
    return nativeModuleRef;
  }
  if (nativeLoadState === "unavailable") {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-mlkit-ocr") as OcrModule;
    nativeModuleRef = mod;
    nativeLoadState = "loaded";
    return mod;
  } catch {
    nativeLoadState = "unavailable";
    nativeModuleRef = null;
    return null;
  }
}

function nativeIsSupported(): boolean {
  const mod = tryLoadNativeOcrModule();
  if (!mod) {
    return false;
  }
  try {
    return mod.isSupported();
  } catch {
    return false;
  }
}

function getCloudApiKey(): string {
  return process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY?.trim() || DEFAULT_CLOUD_KEY;
}

/** True when using the shared OCR.space demo key (strict rate limits). */
export function usesDefaultCloudOcrKey(): boolean {
  return getCloudApiKey() === DEFAULT_CLOUD_KEY;
}

/** Expo Go + default key: auto-scan will spam 429 — manual scan only. */
export function isCloudOcrManualOnly(): boolean {
  return getOcrMode() === "cloud" && usesDefaultCloudOcrKey();
}

export function getCloudOcrCooldownRemainingMs(): number {
  return Math.max(0, cloudCooldownUntil - Date.now());
}

function getCloudMinIntervalMs(): number {
  return usesDefaultCloudOcrKey() ? CLOUD_MIN_INTERVAL_MS.default : CLOUD_MIN_INTERVAL_MS.custom;
}

export function canRunCloudOcrNow(): boolean {
  const now = Date.now();
  if (now < cloudCooldownUntil) {
    return false;
  }
  return now - lastCloudRequestAt >= getCloudMinIntervalMs();
}

function waitSeconds(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}

function normalizeFileUri(uri: string): string {
  if (Platform.OS === "android" && !uri.startsWith("file://")) {
    return `file://${uri}`;
  }
  if (Platform.OS === "ios") {
    return uri.replace("file://", "");
  }
  return uri;
}

function registerCloudRateLimitHit(): OcrScanResult {
  cloudBackoffMs = Math.min(Math.round(cloudBackoffMs * 1.5), CLOUD_COOLDOWN_MAX_MS);
  cloudCooldownUntil = Date.now() + cloudBackoffMs;
  const seconds = waitSeconds(cloudBackoffMs);
  return {
    ok: false,
    code: "rate_limited",
    message: `HTTP 429 — đợi ${seconds}s`,
  };
}

async function recognizeCloud(uri: string): Promise<OcrScanResult> {
  const now = Date.now();
  const cooldownRemaining = cloudCooldownUntil - now;
  if (cooldownRemaining > 0) {
    return {
      ok: false,
      code: "rate_limited",
      message: `Đợi ${waitSeconds(cooldownRemaining)}s`,
    };
  }

  const sinceLast = now - lastCloudRequestAt;
  const minInterval = getCloudMinIntervalMs();
  if (sinceLast < minInterval) {
    return {
      ok: false,
      code: "rate_limited",
      message: `Đợi ${waitSeconds(minInterval - sinceLast)}s`,
    };
  }

  lastCloudRequestAt = Date.now();

  try {
    const formData = new FormData();
    formData.append("apikey", getCloudApiKey());
    formData.append("language", "eng");
    formData.append("OCREngine", "2");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("file", {
      uri: normalizeFileUri(uri),
      type: "image/jpeg",
      name: "plate.jpg",
    } as unknown as Blob);

    const response = await fetch(OCR_SPACE_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (response.status === 429) {
      return registerCloudRateLimitHit();
    }

    if (!response.ok) {
      return {
        ok: false,
        code: "network",
        message: `HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (payload.IsErroredOnProcessing) {
      const message = Array.isArray(payload.ErrorMessage)
        ? payload.ErrorMessage.join(", ")
        : (payload.ErrorMessage ?? "Cloud OCR failed");

      if (/429|rate|limit|maximum/i.test(message)) {
        return registerCloudRateLimitHit();
      }

      return { ok: false, code: "api_error", message };
    }

    const text =
      payload.ParsedResults?.map((item) => item.ParsedText ?? "")
        .join("\n")
        .trim() ?? "";

    if (!text) {
      return { ok: false, code: "empty", message: "Empty OCR result" };
    }

    cloudBackoffMs = CLOUD_COOLDOWN_INITIAL_MS;
    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      code: "network",
      message: error instanceof Error ? error.message : "Network error",
    };
  }
}

async function recognizeNative(uri: string): Promise<OcrScanResult> {
  const mod = tryLoadNativeOcrModule();
  if (!mod || !nativeIsSupported()) {
    return { ok: false, code: "native_error", message: "Native OCR unavailable" };
  }

  try {
    const result = await mod.recognizeText(uri);
    if (!result.text?.trim()) {
      return { ok: false, code: "empty", message: "Empty OCR result" };
    }
    return { ok: true, text: result.text };
  } catch (error) {
    return {
      ok: false,
      code: "native_error",
      message: error instanceof Error ? error.message : "Native OCR failed",
    };
  }
}

export function getOcrMode(): OcrMode {
  if (Platform.OS === "web") {
    return "none";
  }
  if (isExpoGo()) {
    return "cloud";
  }
  if (tryLoadNativeOcrModule() && nativeIsSupported()) {
    return "native";
  }
  return "cloud";
}

export function isOcrReady(): boolean {
  return getOcrMode() !== "none";
}

export function isRunningInExpoGo(): boolean {
  return isExpoGo();
}

export async function recognizePlateText(uri: string): Promise<OcrScanResult> {
  const mode = getOcrMode();
  if (mode === "none") {
    return { ok: false, code: "unavailable", message: "OCR unavailable" };
  }

  if (mode === "native") {
    return recognizeNative(uri);
  }
  return recognizeCloud(uri);
}
