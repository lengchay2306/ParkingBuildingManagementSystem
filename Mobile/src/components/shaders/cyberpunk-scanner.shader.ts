/**
 * SkSL shader — cyberpunk scanner overlay.
 * Skia uses SkSL (GLSL-like); compiled once via Skia.RuntimeEffect.Make().
 */
export const CYBERPUNK_SCANNER_SKSL = `
uniform vec2 resolution;
uniform float time;
uniform vec3 neonColor;
uniform float intensity;

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float gridLine(float axis, float scale, float thickness) {
  float g = abs(fract(axis * scale) - 0.5);
  return smoothstep(thickness, 0.0, g);
}

half4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / resolution;
  float aspect = resolution.x / max(resolution.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);

  // ── Digital grid (perspective fade toward horizon) ──
  float horizon = 0.42 + sin(time * 0.35) * 0.02;
  float depth = clamp((horizon - uv.y) / horizon, 0.0, 1.0);
  float gridScale = mix(8.0, 42.0, depth);
  float lineStrength = mix(0.04, 0.22, depth);

  float gx = gridLine(p.x, gridScale, 0.018);
  float gy = gridLine(p.y, gridScale * aspect, 0.018);
  float grid = max(gx, gy) * lineStrength;

  // Major grid every 4 cells
  float gxM = gridLine(p.x, gridScale / 4.0, 0.008);
  float gyM = gridLine(p.y, gridScale * aspect / 4.0, 0.008);
  grid = max(grid, max(gxM, gyM) * lineStrength * 1.6);

  // ── Primary neon laser beam (vertical sweep) ──
  float scanPhase = fract(time * 0.12);
  float beamY = scanPhase;
  float beamDist = abs(uv.y - beamY);
  float coreBeam = exp(-beamDist * 120.0);
  float beamGlow = exp(-beamDist * 18.0) * 0.45;

  // ── Secondary horizontal data sweep ──
  float scanX = fract(time * 0.07 + 0.33);
  float hDist = abs(uv.x - scanX);
  float hBeam = exp(-hDist * 90.0) * 0.35;

  // ── Chromatic aberration (strongest near active beams) ──
  float beamEnergy = coreBeam + beamGlow + hBeam;
  float ca = (0.002 + 0.006 * beamEnergy) * intensity;
  vec2 caDir = normalize(vec2(uv - vec2(0.5, beamY)) + vec2(0.0001));

  float r = grid + exp(-abs(uv.y - (beamY + caDir.y * ca * 8.0)) * 80.0) * coreBeam;
  float g = grid + exp(-abs(uv.y - beamY) * 100.0) * coreBeam * 0.95;
  float b = grid + exp(-abs(uv.y - (beamY - caDir.y * ca * 8.0)) * 80.0) * coreBeam;

  vec3 color = vec3(r, g, b) * neonColor;

  // Cyan/magenta fringe on horizontal sweep
  color.r += hBeam * neonColor.r * 1.2;
  color.b += hBeam * neonColor.b * 1.35;
  color.g += hBeam * neonColor.g * 0.4;

  // Subtle digital noise in beam path
  float noise = hash21(floor(fragCoord * 0.5 + time * 12.0)) * 0.08 * beamEnergy;
  color += noise * neonColor;

  // Vignette + top fade (keeps UI readable)
  float vignette = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.35;
  float topFade = smoothstep(0.0, 0.12, uv.y);
  float alpha = clamp((grid + coreBeam + beamGlow + hBeam) * intensity * vignette * topFade, 0.0, 0.88);

  return half4(color * alpha, alpha);
}
`;
