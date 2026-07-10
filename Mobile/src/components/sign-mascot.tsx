import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export type SignMascotPose = "idle" | "watching" | "shy" | "busy" | "welcome";
export type EyeCoverMode = "open" | "covered" | "peek";

export const SIGN_MASCOT_COLORS = {
  accent: "#2563eb",
  body: "#eef2ff",
  pupil: "#1e3a8a",
  eye: "#ffffff",
} as const;

export const SIGN_MASCOT_FRAME = {
  border: SIGN_MASCOT_COLORS.accent,
  background: "#ffffff",
} as const;

export const SIGN_MASCOT_STAGE = {
  width: 144,
  height: 144,
} as const;

/** Layout size of the mascot artboard; rendered smaller on sign-in via scale. */
export const SIGN_MASCOT_LAYOUT_SIZE = SIGN_MASCOT_STAGE.width;
/** Outer logo circle diameter on sign-platform. */
export const SIGN_MASCOT_CIRCLE_SIZE = 112;
/** Drawable area inside the circle (inset for border + clip padding). */
export const SIGN_MASCOT_DISPLAY_SIZE = SIGN_MASCOT_CIRCLE_SIZE - 8;
export const SIGN_MASCOT_DISPLAY_SCALE = SIGN_MASCOT_DISPLAY_SIZE / SIGN_MASCOT_LAYOUT_SIZE;

const EYE_SIZE = 22;
const EYE_GAP = 16;
const HEAD_SIZE = 80;
const EYE_TOP = 12;
const HAND_SIZE = 30;
const ARM_W = 15;
const STAGE_W = 142;
const HEAD_TOP = 8;
const HEAD_LEFT = (STAGE_W - HEAD_SIZE) / 2;

const EYE_ROW_LEFT = HEAD_LEFT + (HEAD_SIZE - (EYE_SIZE * 2 + EYE_GAP)) / 2;
const LEFT_EYE = { x: EYE_ROW_LEFT + EYE_SIZE / 2, y: HEAD_TOP + EYE_TOP + EYE_SIZE / 2 };
const RIGHT_EYE = { x: EYE_ROW_LEFT + EYE_SIZE + EYE_GAP + EYE_SIZE / 2, y: LEFT_EYE.y };

/** Bottom edge of the eye circles (idle hands sit just below this). */
const EYE_BOTTOM_Y = HEAD_TOP + EYE_TOP + EYE_SIZE;
const HEAD_CENTER_X = HEAD_LEFT + HEAD_SIZE / 2;

/**
 * Symmetric arm layout — shoulders on outer lower torso (wide).
 * Idle: palms low (PALM_REST_BELOW_EYE). Cover: just under eyes (COVER_BELOW_EYE).
 * Inset X: toward nose (left +, right −).
 */
const TORSO_W = 136;
const TORSO_LEFT = (STAGE_W - TORSO_W) / 2;

/** Idle — hands lower (larger BELOW_EYE = further down). */
const PALM_REST_BELOW_EYE = 120;
const PALM_REST_Y_OFFSET = 0;
const PALM_REST_INSET_X = 4;

/** Cover — same pose as idle was before (just under the eyes). */
const COVER_BELOW_EYE = 10;
const COVER_INSET_X = 4;
const COVER_OFFSET_Y = 0;
/** Peek: shift both palms left (−X) and down (+Y) so eyes show between hands. */
const COVER_PEEK_SHIFT_X = 24;
const COVER_PEEK_SHIFT_Y = 10;

/** Shoulder X: outside head + slightly past torso side toward the circle edge. */
const SHOULDER_SIDE_GAP = 12;
const SHOULDER_BELOW_HEAD = 18;

const PALM_REST_Y = EYE_BOTTOM_Y + PALM_REST_BELOW_EYE;
const SHOULDER_Y = HEAD_TOP + HEAD_SIZE + SHOULDER_BELOW_HEAD;

const LEFT_SHOULDER = {
  x: Math.min(TORSO_LEFT + 6, HEAD_LEFT - SHOULDER_SIDE_GAP),
  y: SHOULDER_Y,
};
const RIGHT_SHOULDER = {
  x: Math.max(TORSO_LEFT + TORSO_W - 6, HEAD_LEFT + HEAD_SIZE + SHOULDER_SIDE_GAP),
  y: SHOULDER_Y,
};

const LEFT_PALM_REST = { x: LEFT_EYE.x + PALM_REST_INSET_X, y: PALM_REST_Y + PALM_REST_Y_OFFSET };
const RIGHT_PALM_REST = { x: RIGHT_EYE.x - PALM_REST_INSET_X, y: PALM_REST_Y + PALM_REST_Y_OFFSET };

const LEFT_PALM_COVER = {
  x: LEFT_EYE.x + COVER_INSET_X,
  y: EYE_BOTTOM_Y + COVER_BELOW_EYE + COVER_OFFSET_Y,
};
const RIGHT_PALM_COVER = {
  x: RIGHT_EYE.x - COVER_INSET_X,
  y: EYE_BOTTOM_Y + COVER_BELOW_EYE + COVER_OFFSET_Y,
};

const LEFT_PALM_PEEK = {
  x: LEFT_PALM_COVER.x - COVER_PEEK_SHIFT_X,
  y: LEFT_PALM_COVER.y + COVER_PEEK_SHIFT_Y,
};
const RIGHT_PALM_PEEK = {
  x: RIGHT_PALM_COVER.x - COVER_PEEK_SHIFT_X,
  y: RIGHT_PALM_COVER.y + COVER_PEEK_SHIFT_Y,
};

/** Signup welcome — raised hand sways left ↔ right (see waveRaised + wave). */
const RIGHT_WAVE_CENTER = { x: HEAD_LEFT + HEAD_SIZE + 8, y: HEAD_TOP + 12 };
const RIGHT_WAVE_SWING_X = 16;

const POSE_TIMING = 360;
const WAVE_RAISE_TIMING = 420;
const WAVE_SWAY_TIMING = 300;
const WAVE_LOWER_TIMING = 380;
const COVER_TIMING = 780;
const COVER_EASING = Easing.inOut(Easing.cubic);

type Point = { x: number; y: number };

type SignMascotProps = {
  pose: SignMascotPose;
  lookX?: number;
  lookY?: number;
  eyeCover?: EyeCoverMode;
};

/** Outward bend at the elbow (px); controls curve of the single arm stroke. */
const ARM_BULGE = 8;

function lerp(n0: number, n1: number, t: number) {
  return n0 + (n1 - n0) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function finite(n: number, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function finitePoint(p: Point, fallback: Point): Point {
  return { x: finite(p.x, fallback.x), y: finite(p.y, fallback.y) };
}

function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

function readAnimatedScalar(value: Animated.Value): number {
  const animated = value as Animated.Value & { __getValue?: () => number };
  return typeof animated.__getValue === "function" ? animated.__getValue() : 0;
}

function elbowPoint(shoulder: Point, palm: Point, side: "left" | "right"): Point {
  const t = 0.58;
  const mx = shoulder.x + (palm.x - shoulder.x) * t;
  const my = shoulder.y + (palm.y - shoulder.y) * t;
  const dx = palm.x - shoulder.x;
  const dy = palm.y - shoulder.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const sign = side === "left" ? -1 : 1;
  return { x: mx + sign * nx * ARM_BULGE, y: my + sign * ny * ARM_BULGE };
}

/** Fixed SVG space — do not shrink viewBox per frame or arms appear to scale instead of move. */
const ARM_SVG_VIEWBOX = `0 0 ${SIGN_MASCOT_STAGE.width} ${SIGN_MASCOT_STAGE.height}`;

type ArmGeom = {
  d: string;
  palmX: number;
  palmY: number;
};

function buildArmGeom(
  shoulder: Point,
  palm: Point,
  side: "left" | "right",
  fallback: { shoulder: Point; palm: Point },
): ArmGeom {
  const s = finitePoint(shoulder, fallback.shoulder);
  const p = finitePoint(palm, fallback.palm);
  const elbow = elbowPoint(s, p, side);
  return {
    d: `M ${s.x} ${s.y} Q ${elbow.x} ${elbow.y} ${p.x} ${p.y}`,
    palmX: p.x,
    palmY: p.y,
  };
}

type ArmProps = {
  shoulder: Point;
  restPalm: Point;
  coverPalm: Point;
  peekPalm: Point;
  side: "left" | "right";
  coverReach: Animated.Value;
  peekTilt: Animated.Value;
  wave?: Animated.Value;
  waveRaised?: Animated.Value;
  wavePalmCenter?: Point;
  waveSwingX?: number;
  bodyColor: string;
  accentColor: string;
};

/** One continuous curved stroke (shoulder → elbow → palm) + hand disc. */
function Arm({
  shoulder,
  restPalm,
  coverPalm,
  peekPalm,
  side,
  coverReach,
  peekTilt,
  wave,
  waveRaised,
  wavePalmCenter,
  waveSwingX = 14,
  bodyColor,
  accentColor,
}: ArmProps) {
  const [geom, setGeom] = useState(() =>
    buildArmGeom(shoulder, restPalm, side, { shoulder, palm: restPalm }),
  );

  useEffect(() => {
    const fallback = { shoulder, palm: restPalm };
    const applyPose = () => {
      const reach = clamp01(readAnimatedScalar(coverReach));
      const peek = clamp01(readAnimatedScalar(peekTilt));

      let waveBlended = restPalm;
      if (wavePalmCenter && wave && waveRaised) {
        const raised = clamp01(readAnimatedScalar(waveRaised));
        const sway = clamp01(readAnimatedScalar(wave));
        const wavePalm: Point = {
          x: wavePalmCenter.x + lerp(-waveSwingX, waveSwingX, sway),
          y: wavePalmCenter.y,
        };
        waveBlended = lerpPoint(restPalm, wavePalm, raised);
      }

      let palm: Point;
      if (reach > 0) {
        const covered = lerpPoint(waveBlended, coverPalm, reach);
        const peeking = lerpPoint(waveBlended, peekPalm, reach);
        palm = lerpPoint(covered, peeking, peek);
      } else {
        palm = waveBlended;
      }
      setGeom(buildArmGeom(shoulder, palm, side, fallback));
    };

    const coverId = coverReach.addListener(() => applyPose());
    const peekId = peekTilt.addListener(() => applyPose());
    const waveId = wave?.addListener(() => applyPose());
    const waveRaisedId = waveRaised?.addListener(() => applyPose());
    applyPose();
    return () => {
      coverReach.removeListener(coverId);
      peekTilt.removeListener(peekId);
      if (waveId !== undefined) wave?.removeListener(waveId);
      if (waveRaisedId !== undefined) waveRaised?.removeListener(waveRaisedId);
    };
  }, [
    coverReach,
    peekTilt,
    wave,
    waveRaised,
    coverPalm,
    peekPalm,
    wavePalmCenter,
    waveSwingX,
    restPalm,
    shoulder,
    side,
  ]);

  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox={ARM_SVG_VIEWBOX}>
      <Path
        d={geom.d}
        stroke={accentColor}
        strokeWidth={ARM_W + 2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={geom.d}
        stroke={bodyColor}
        strokeWidth={ARM_W - 1}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={geom.palmX}
        cy={geom.palmY}
        r={HAND_SIZE / 2}
        fill={bodyColor}
        stroke={accentColor}
        strokeWidth={2}
      />
    </Svg>
  );
}

/** Scaled mascot clipped to the sign-in logo circle. */
export function SignMascotDisplay(props: SignMascotProps) {
  return (
    <View style={displayStyles.clip}>
      <View style={displayStyles.scaleWrap}>
        <SignMascot {...props} />
      </View>
    </View>
  );
}

export function SignMascot({ pose, lookX = 0, lookY = 0, eyeCover = "open" }: SignMascotProps) {
  const {
    accent: accentColor,
    body: bodyColor,
    pupil: eyeColor,
    eye: eyeWhite,
  } = SIGN_MASCOT_COLORS;
  const bob = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const lookXAnim = useRef(new Animated.Value(0)).current;
  const lookYAnim = useRef(new Animated.Value(0)).current;
  const coverReach = useRef(new Animated.Value(0)).current;
  const peekTilt = useRef(new Animated.Value(0)).current;
  const eyeOpen = useRef(new Animated.Value(1)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const waveRaised = useRef(new Animated.Value(0)).current;

  const handsOnFace = eyeCover === "covered" || eyeCover === "peek";

  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          toValue: 1,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bob, {
          toValue: 0,
          duration: 1900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bob]);

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600 + Math.random() * 1000),
        Animated.timing(blink, { toValue: 0.14, duration: 90, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]),
    );
    blinkLoop.start();
    return () => blinkLoop.stop();
  }, [blink]);

  useEffect(() => {
    const poseLookX = pose === "watching" ? 5 : pose === "welcome" ? -3 : pose === "busy" ? 2 : 0;
    const targetX = eyeCover === "open" ? lookX : eyeCover === "peek" ? lookX * 0.15 : 0;
    const targetY = eyeCover === "peek" ? lookY : pose === "watching" ? 1 : 0;

    Animated.parallel([
      Animated.timing(lookXAnim, {
        toValue: handsOnFace && eyeCover !== "peek" ? 0 : targetX,
        duration: POSE_TIMING,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lookYAnim, {
        toValue: targetY,
        duration: POSE_TIMING,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [eyeCover, handsOnFace, lookX, lookY, lookXAnim, lookYAnim, pose]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(coverReach, {
        toValue: handsOnFace ? 1 : 0,
        duration: COVER_TIMING,
        easing: COVER_EASING,
        useNativeDriver: false,
      }),
      Animated.timing(peekTilt, {
        toValue: eyeCover === "peek" ? 1 : 0,
        duration: POSE_TIMING,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(eyeOpen, {
        toValue: eyeCover === "covered" ? 0.05 : 1,
        duration: POSE_TIMING,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [coverReach, eyeCover, eyeOpen, handsOnFace, peekTilt]);

  useEffect(() => {
    if (pose !== "welcome" || eyeCover !== "open") {
      wave.stopAnimation(() => {
        wave.setValue(0.5);
      });
      if (eyeCover !== "open") {
        return;
      }
      Animated.timing(waveRaised, {
        toValue: 0,
        duration: WAVE_LOWER_TIMING,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
      return;
    }

    const raiseArm = Animated.timing(waveRaised, {
      toValue: 1,
      duration: WAVE_RAISE_TIMING,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: WAVE_SWAY_TIMING,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration: WAVE_SWAY_TIMING,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    raiseArm.start(({ finished }) => {
      if (finished) waveLoop.start();
    });

    return () => {
      raiseArm.stop();
      waveLoop.stop();
    };
  }, [eyeCover, pose, wave, waveRaised]);

  const bodyTranslateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const peekRotate = peekTilt.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "12deg"],
  });

  const peekShiftX = peekTilt.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const eyeScaleY = Animated.multiply(blink, eyeOpen);

  return (
    <View style={styles.stage}>
      <Animated.View style={[styles.upperBody, { transform: [{ translateY: bodyTranslateY }] }]}>
        <Animated.View
          style={[
            styles.tiltLayer,
            { transform: [{ translateX: peekShiftX }, { rotate: peekRotate }] },
          ]}
        >
          <View
            style={[
              styles.torso,
              {
                backgroundColor: bodyColor,
                borderColor: accentColor,
                transform: [{ translateY: 6 }],
              },
            ]}
          />

          <View style={[styles.head, { backgroundColor: bodyColor, borderColor: accentColor }]}>
            <Svg
              width={HEAD_SIZE}
              height={28}
              viewBox="0 -10 80 28"
              style={styles.headHair}
              pointerEvents="none"
            >
              <Path
                d="M 30 18 Q 28 6 27 -6"
                stroke={accentColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M 40 18 L 40 -8"
                stroke={accentColor}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <Path
                d="M 50 18 Q 52 6 53 -6"
                stroke={accentColor}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>

            <View
              style={[
                styles.foreheadBadge,
                { borderColor: accentColor, backgroundColor: bodyColor },
              ]}
            >
              <Text style={[styles.foreheadBadgeText, { color: accentColor }]} numberOfLines={1}>
                ParBot
              </Text>
            </View>

            <View style={styles.face}>
              <Animated.View
                style={[
                  styles.eye,
                  {
                    backgroundColor: eyeWhite,
                    width: EYE_SIZE,
                    height: EYE_SIZE,
                    borderRadius: EYE_SIZE / 2,
                    transform: [{ scaleY: eyeScaleY }],
                  },
                ]}
              >
                <Animated.View
                  style={{ transform: [{ translateX: lookXAnim }, { translateY: lookYAnim }] }}
                >
                  <View style={[styles.pupil, { backgroundColor: eyeColor }]} />
                </Animated.View>
              </Animated.View>
              <Animated.View
                style={[
                  styles.eye,
                  {
                    backgroundColor: eyeWhite,
                    width: EYE_SIZE,
                    height: EYE_SIZE,
                    borderRadius: EYE_SIZE / 2,
                    transform: [{ scaleY: eyeScaleY }],
                  },
                ]}
              >
                <Animated.View
                  style={{ transform: [{ translateX: lookXAnim }, { translateY: lookYAnim }] }}
                >
                  <View style={[styles.pupil, { backgroundColor: eyeColor }]} />
                </Animated.View>
              </Animated.View>
            </View>

            <View
              style={[
                styles.cheek,
                styles.cheekLeft,
                { backgroundColor: accentColor, opacity: handsOnFace ? 0 : 0.35 },
              ]}
            />
            <View
              style={[
                styles.cheek,
                styles.cheekRight,
                { backgroundColor: accentColor, opacity: handsOnFace ? 0 : 0.35 },
              ]}
            />
            <View
              style={[
                styles.mouth,
                {
                  borderColor: accentColor,
                  opacity: handsOnFace && eyeCover !== "peek" ? 0.15 : 1,
                },
              ]}
            />
          </View>
        </Animated.View>

        <View style={styles.armsLayer} pointerEvents="none">
          <Arm
            shoulder={LEFT_SHOULDER}
            restPalm={LEFT_PALM_REST}
            coverPalm={LEFT_PALM_COVER}
            peekPalm={LEFT_PALM_PEEK}
            side="left"
            coverReach={coverReach}
            peekTilt={peekTilt}
            bodyColor={bodyColor}
            accentColor={accentColor}
          />
          <Arm
            shoulder={RIGHT_SHOULDER}
            restPalm={RIGHT_PALM_REST}
            coverPalm={RIGHT_PALM_COVER}
            peekPalm={RIGHT_PALM_PEEK}
            wavePalmCenter={RIGHT_WAVE_CENTER}
            waveSwingX={RIGHT_WAVE_SWING_X}
            wave={wave}
            waveRaised={waveRaised}
            side="right"
            coverReach={coverReach}
            peekTilt={peekTilt}
            bodyColor={bodyColor}
            accentColor={accentColor}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const displayStyles = StyleSheet.create({
  clip: {
    width: SIGN_MASCOT_DISPLAY_SIZE,
    height: SIGN_MASCOT_DISPLAY_SIZE,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleWrap: {
    width: SIGN_MASCOT_LAYOUT_SIZE,
    height: SIGN_MASCOT_LAYOUT_SIZE,
    transform: [{ scale: SIGN_MASCOT_DISPLAY_SCALE }, { translateY: -3 }],
  },
});

const styles = StyleSheet.create({
  stage: {
    width: SIGN_MASCOT_STAGE.width,
    height: SIGN_MASCOT_STAGE.height,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  upperBody: {
    position: "relative",
    width: STAGE_W,
    height: SIGN_MASCOT_STAGE.height - 4,
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },
  tiltLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  armsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  torso: {
    width: 136,
    height: 68,
    borderWidth: 2.5,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  head: {
    position: "absolute",
    top: HEAD_TOP,
    width: HEAD_SIZE,
    height: HEAD_SIZE,
    borderRadius: HEAD_SIZE / 2,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    overflow: "visible",
  },
  headHair: {
    position: "absolute",
    top: -12,
    left: 0,
    zIndex: 6,
  },
  foreheadBadge: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 2,
    zIndex: 5,
  },
  foreheadBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  face: {
    flexDirection: "row",
    gap: EYE_GAP,
    marginTop: EYE_TOP,
    zIndex: 2,
  },
  eye: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pupil: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  cheek: {
    position: "absolute",
    width: 12,
    height: 7,
    borderRadius: 6,
    bottom: 22,
  },
  cheekLeft: { left: 14 },
  cheekRight: { right: 14 },
  mouth: {
    position: "absolute",
    bottom: 18,
    width: 22,
    height: 11,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
});
