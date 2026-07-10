/** Chuyển màu CSS (kể cả rgba) sang dạng THREE.js hiểu — alpha dùng cho material.opacity. */
export function resolveThreeColor(input: string): { color: string; opacity: number } {
  const trimmed = input.trim();
  const rgbaMatch = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/.exec(
    trimmed,
  );
  if (rgbaMatch) {
    const r = Number(rgbaMatch[1]);
    const g = Number(rgbaMatch[2]);
    const b = Number(rgbaMatch[3]);
    const opacity = rgbaMatch[4] !== undefined ? Number(rgbaMatch[4]) : 1;
    const color = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    return { color, opacity };
  }
  return { color: trimmed, opacity: 1 };
}
