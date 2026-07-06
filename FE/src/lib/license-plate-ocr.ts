/** Matches backend validation: `51A-123.45` */
export const LICENSE_PLATE_PATTERN = /^[0-9]{2}[A-Z]-[0-9]{3}\.[0-9]{2}$/;

const LOOSE_PLATE_PATTERN = /[0-9OIlBZSGB]{2}[A-Z]-[0-9OIlBZSGB]{3}\.[0-9OIlBZSGB]{2}/gi;
const COMPACT_PLATE_PATTERN = /[0-9OIlBZSGB]{2}[A-Z][0-9OIlBZSGB]{5}/gi;

const DIGIT_POSITIONS = new Set([0, 1, 4, 5, 6, 8, 9]);

function normalizeOcrPlateCandidate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .split("")
    .map((char, index) => {
      if (!DIGIT_POSITIONS.has(index)) {
        return char;
      }
      switch (char) {
        case "O":
        case "Q":
        case "D":
          return "0";
        case "I":
        case "L":
        case "|":
          return "1";
        case "Z":
          return "2";
        case "S":
          return "5";
        case "G":
          return "6";
        case "B":
          return "8";
        default:
          return char;
      }
    })
    .join("");
}

function formatCompactPlate(raw: string): string {
  const chars = normalizeOcrPlateCandidate(raw.replace(/[^0-9A-Z]/gi, ""));
  if (chars.length < 8) {
    return chars;
  }
  return `${chars.slice(0, 3)}-${chars.slice(3, 6)}.${chars.slice(6, 8)}`;
}

function tryNormalizePlate(raw: string): string | null {
  const normalized = normalizeOcrPlateCandidate(raw);
  if (LICENSE_PLATE_PATTERN.test(normalized)) {
    return normalized;
  }

  const compact = formatCompactPlate(raw);
  return LICENSE_PLATE_PATTERN.test(compact) ? compact : null;
}

export function extractLicensePlateFromOcrText(text: string): string | null {
  const compact = text.replace(/\s+/g, "").toUpperCase();

  for (const match of compact.matchAll(LOOSE_PLATE_PATTERN)) {
    const plate = tryNormalizePlate(match[0]);
    if (plate) {
      return plate;
    }
  }

  const hyphenJoined = text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("")
    .replace(/\s+/g, "")
    .toUpperCase();

  const joinedPlate = tryNormalizePlate(hyphenJoined);
  if (joinedPlate) {
    return joinedPlate;
  }

  for (const match of compact.matchAll(COMPACT_PLATE_PATTERN)) {
    const plate = tryNormalizePlate(match[0]);
    if (plate) {
      return plate;
    }
  }

  const stripped = text.replace(/[^0-9A-Za-z.\-]/g, "").toUpperCase();
  for (const match of stripped.matchAll(LOOSE_PLATE_PATTERN)) {
    const plate = tryNormalizePlate(match[0]);
    if (plate) {
      return plate;
    }
  }
  for (const match of stripped.matchAll(COMPACT_PLATE_PATTERN)) {
    const plate = tryNormalizePlate(match[0]);
    if (plate) {
      return plate;
    }
  }

  return null;
}

export function normalizeLicensePlate(plate: string): string {
  return plate.trim().toUpperCase();
}

export function getManualPlateValidationError(plate: string): string | undefined {
  const trimmed = plate.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = normalizeLicensePlate(trimmed);
  if (LICENSE_PLATE_PATTERN.test(normalized)) {
    return undefined;
  }
  const formatted = tryNormalizePlate(trimmed);
  if (formatted) {
    return undefined;
  }
  return "Định dạng: 51A-123.45";
}

export function normalizeManualPlateInput(plate: string): string | null {
  const trimmed = plate.trim();
  if (!trimmed) {
    return null;
  }
  const direct = normalizeLicensePlate(trimmed);
  if (LICENSE_PLATE_PATTERN.test(direct)) {
    return direct;
  }
  return tryNormalizePlate(trimmed);
}
