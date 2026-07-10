import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, PanResponder, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, THREE } from "expo-three";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DesignColorPalette, DesignColors, Radius, Spacing, Typography } from "@/constants/design";
import { MaxContentWidth } from "@/constants/theme";
import { useDesignColors } from "@/hooks/use-design-colors";
import { useGrayscale } from "@/hooks/use-grayscale";
import { useLanguagePreference } from "@/hooks/language-preference";
import { useThemePreference } from "@/hooks/theme-preference";
import { resolveThreeColor } from "@/lib/three-color";
import {
  floorLabel,
  floorTabLabel,
  PARKING_FLOORS,
  vehicleTypeLabel,
  type ParkingFloorConfig,
} from "@/lib/parking-floor-config";

/* ── Map palette — realistic parking garage tones ───────────── */
type MapPalette = {
  lane: string;
  laneMark: string;
  ramp: string;
  rampUpHead: string;
  rampDownHead: string;
  rampMark: string;
  flowIn: string;
  flowOut: string;
  entry: string;
  platform: string;
  stallLine: string;
};

const MAP_COLORS_DARK: MapPalette = {
  lane: "#3f444a",
  laneMark: "#d8dce1",
  ramp: "#5a5448",
  rampUpHead: "#756745",
  rampDownHead: "#5e5850",
  rampMark: "#e3c463",
  flowIn: "#4a4f56",
  flowOut: "#57534a",
  entry: "#454a52",
  platform: DesignColors.surface2,
  stallLine: "#8f96a3",
};

const MAP_COLORS_LIGHT: MapPalette = {
  lane: "#667d9b",
  laneMark: "#ffffff",
  ramp: "#876f46",
  rampUpHead: "#745810",
  rampDownHead: "#74624a",
  rampMark: "#ba912f",
  flowIn: "#5f7593",
  flowOut: "#756a5b",
  entry: "#566f92",
  platform: "#b7c7db",
  stallLine: "#4d607f",
};

let MapColors: MapPalette = MAP_COLORS_DARK;

/* ── Slot status — muted but readable in dark mode ─────────── */
const SlotStatusColors = {
  empty: "#365741",
  "in-use": "#4d5360",
  reserved: "#665e4a",
  maintenance: "#6b4c4c",
  locked: "#454951",
} as const;

const SlotStatusColorsLight = {
  empty: "#2f9b53",
  "in-use": "#4e5f76",
  reserved: "#9a7a35",
  maintenance: "#b35d4f",
  locked: "#6c7482",
} as const;

const GrayscaleStatusColors = {
  empty: "#383838",
  "in-use": "#525252",
  reserved: "#484848",
  maintenance: "#444444",
  locked: "#2e2e2e",
} as const;

type SlotStatus = keyof typeof SlotStatusColors;

const statusLabel = (status: SlotStatus, t: (vi: string, en: string) => string): string => {
  const labels: Record<SlotStatus, string> = {
    empty: t("Trống", "Empty"),
    "in-use": t("Đang sử dụng", "In use"),
    reserved: t("Đã đặt trước", "Reserved"),
    maintenance: t("Bảo trì", "Maintenance"),
    locked: t("Tạm khóa", "Locked"),
  };
  return labels[status];
};

const selectionAccentColor = (resolvedScheme: "light" | "dark", grayscale: boolean): string => {
  if (grayscale) return "#9a9a9a";
  return resolvedScheme === "light" ? "#3f5f8a" : "#8aa6d9";
};

type ParkingClass = "motorcycle" | "car" | "car-large";

type ParkingStandard = {
  stallW: number;
  stallD: number;
  aisleW: number;
  gap: number;
  rampW: number;
  crossW: number;
};

const PARKING_STANDARDS: Record<ParkingClass, ParkingStandard> = {
  motorcycle: { stallW: 0.9, stallD: 2.0, aisleW: 2.8, gap: 0.1, rampW: 0.35, crossW: 3.0 },
  car: { stallW: 2.5, stallD: 4.8, aisleW: 5.5, gap: 0.14, rampW: 0.42, crossW: 5.5 },
  "car-large": { stallW: 2.8, stallD: 5.4, aisleW: 6.0, gap: 0.16, rampW: 0.45, crossW: 6.0 },
};

type FloorConfig = ParkingFloorConfig;

const FLOORS = PARKING_FLOORS;

const FLOOR_COUNT = FLOORS.length;
const PLATFORM_PAD = 0.28;
const FLOOR_GAP = 1.05;
const SLOT_LIFT = 0.035;
const FOCUS_OFFSET = 0.1;
const FLOOR_VISIBLE_THRESHOLD = 0.12;
const SELECTION_PAD = 0.08;
const ALL_MODE_EXPLODE_GAP = 2.25;
const ALL_MODE_SPREAD_X = 0.42;
const ALL_MODE_SPREAD_Z = 0.18;
const DASH_MARK_HEIGHT = 0.006;
const STOP_MARK_HEIGHT = 0.008;
const ROAD_THICKNESS = 0.022;

/** Explicit Y layers — prevents z-fighting on expo-gl mobile. */
const MAP_LAYER = {
  platform: 0.02,
  road: 0.048,
  roadMark: 0.062,
  slot: 0.078,
  wall: 0.09,
} as const;

const RENDER_LAYER = {
  platform: 0,
  road: 1,
  roadMark: 2,
  slot: 3,
  wall: 4,
  selection: 5,
} as const;

function createMapMaterial(
  color: string,
  renderLayer: number,
  options?: { transparent?: boolean; opacity?: number },
): THREE.MeshBasicMaterial {
  const resolved = resolveThreeColor(color);
  const materialOpacity =
    options?.opacity !== undefined ? resolved.opacity * options.opacity : resolved.opacity;
  const transparent = options?.transparent ?? materialOpacity < 1;
  return new THREE.MeshBasicMaterial({
    color: resolved.color,
    toneMapped: false,
    depthTest: true,
    depthWrite: !transparent,
    transparent,
    opacity: materialOpacity,
    polygonOffset: renderLayer > 0,
    polygonOffsetFactor: -renderLayer * 2,
    polygonOffsetUnits: -renderLayer * 2,
  });
}

function createToneMappedBasicMaterial(color: string): THREE.MeshBasicMaterial {
  const resolved = resolveThreeColor(color);
  return new THREE.MeshBasicMaterial({
    color: resolved.color,
    toneMapped: false,
    transparent: resolved.opacity < 1,
    opacity: resolved.opacity,
  });
}

function applyMeshLayer(mesh: THREE.Mesh, renderLayer: number) {
  mesh.renderOrder = renderLayer;
}

type SlotInfo = {
  id: string;
  floor: number;
  row: number;
  aisle: number;
  side: "L" | "R";
  status: SlotStatus;
};

type SlotPlacement = {
  x: number;
  z: number;
  row: number;
  aisle: number;
  side: "L" | "R";
};

type RoadFlow = "pz" | "nz" | "px" | "nx";

type RoadKind =
  | "entry-in"
  | "entry-out"
  | "cross-in"
  | "cross-out"
  | "lane"
  | "ramp-up"
  | "ramp-down"
  | "ramp-side";

type RoadSegment = {
  cx: number;
  cz: number;
  width: number;
  depth: number;
  flow: RoadFlow;
  kind: RoadKind;
};

type FloorLayout = {
  slots: SlotPlacement[];
  lanes: { x: number; width: number }[];
  roads: RoadSegment[];
  stallW: number;
  stallD: number;
  aisleW: number;
  totalWidth: number;
  totalDepth: number;
};

type FloorTarget = { x: number; y: number; z: number; opacity: number; scale: number };

type FloorMeshSet = {
  group: THREE.Group;
  slotGroup: THREE.Group;
  slotMeshes: THREE.Mesh[];
  slotMap: SlotInfo[];
  base: THREE.Mesh;
  baseMaterial: THREE.MeshBasicMaterial;
  slotDims: { width: number; depth: number; height: number };
};

type SelectionAnchor = {
  floorIndex: number;
  slotIndex: number;
};

function getStd(config: FloorConfig): ParkingStandard {
  return PARKING_STANDARDS[config.parkingClass];
}

function hashSlotStatus(floor: number, row: number, aisle: number, side: number): SlotStatus {
  const n = (floor * 19 + row * 13 + aisle * 7 + side * 3) % 24;
  if (n < 9) return "empty";
  if (n < 15) return "in-use";
  if (n < 19) return "reserved";
  if (n < 22) return "maintenance";
  return "locked";
}

function statusColor(
  status: SlotStatus,
  grayscale: boolean,
  resolvedScheme: "light" | "dark",
): string {
  if (grayscale) return GrayscaleStatusColors[status];
  return resolvedScheme === "light" ? SlotStatusColorsLight[status] : SlotStatusColors[status];
}

function countSlots(config: FloorConfig): number {
  return computeFloorLayout(config).slots.length;
}

/** Module double-loaded: [ô trái][làn][ô phải] × N, đỗ vuông góc 90° */
function computeFloorLayout(config: FloorConfig): FloorLayout {
  const std = getStd(config);
  const carLike = config.parkingClass !== "motorcycle";
  const stallW = std.stallW;
  const stallD = std.stallD * (carLike ? 1.06 : 1);
  const aisleW = std.aisleW * (carLike ? 1.16 : 1);
  const pitchZ = stallW + std.gap;
  const moduleW = stallD * 2 + aisleW;
  const totalWidth = config.aisleCount * moduleW;
  const totalDepth = config.stallsAlongAisle * pitchZ - std.gap;

  const slots: SlotPlacement[] = [];
  const lanes: { x: number; width: number }[] = [];
  let moduleX = -totalWidth / 2;

  for (let aisle = 0; aisle < config.aisleCount; aisle += 1) {
    const aisleCx = moduleX + stallD + aisleW / 2;
    lanes.push({ x: aisleCx, width: aisleW });

    for (let row = 0; row < config.stallsAlongAisle; row += 1) {
      const z = -totalDepth / 2 + row * pitchZ + stallW / 2;
      const xLeft = moduleX + stallD / 2;
      const xRight = moduleX + stallD + aisleW + stallD / 2;
      slots.push({ x: xLeft, z, row, aisle, side: "L" });
      slots.push({ x: xRight, z, row, aisle, side: "R" });
    }
    moduleX += moduleW;
  }

  const roads = computeRoadNetwork(config, std, { lanes, totalWidth, totalDepth });
  const noParkingKinds = new Set<RoadKind>([
    "entry-in",
    "entry-out",
    "cross-in",
    "cross-out",
    "lane",
    "ramp-up",
    "ramp-down",
    "ramp-side",
  ]);
  const centerClearanceX = Math.max(0.04, stallD * 0.08);
  const centerClearanceZ = Math.max(0.04, stallW * 0.08);
  const filteredSlots = slots.filter((slot) => {
    return !roads.some((road) => {
      if (!noParkingKinds.has(road.kind)) return false;
      const overlapX = Math.abs(slot.x - road.cx) <= road.width / 2 + centerClearanceX;
      const overlapZ = Math.abs(slot.z - road.cz) <= road.depth / 2 + centerClearanceZ;
      return overlapX && overlapZ;
    });
  });

  const numberedSlots = renumberSlotRows(filteredSlots);

  return { slots: numberedSlots, lanes, roads, stallW, stallD, aisleW, totalWidth, totalDepth };
}

/** After road overlap filtering, label rows L1..Ln per aisle/side (not grid index). */
function renumberSlotRows(slots: SlotPlacement[]): SlotPlacement[] {
  const byGroup = new Map<string, SlotPlacement[]>();
  for (const slot of slots) {
    const key = `${slot.aisle}:${slot.side}`;
    const group = byGroup.get(key) ?? [];
    group.push(slot);
    byGroup.set(key, group);
  }

  const renumbered: SlotPlacement[] = [];
  const sortedKeys = [...byGroup.keys()].sort((a, b) => a.localeCompare(b));
  for (const key of sortedKeys) {
    const group = byGroup.get(key) ?? [];
    group.sort((a, b) => a.z - b.z || a.x - b.x);
    group.forEach((slot, index) => {
      renumbered.push({ ...slot, row: index });
    });
  }

  return renumbered;
}

/** Lộ trình chuẩn: cổng Nam → ngang phân luồng → làn một chiều Bắc → ramp */
function computeRoadNetwork(
  config: FloorConfig,
  std: ParkingStandard,
  layout: Pick<FloorLayout, "lanes" | "totalWidth" | "totalDepth">,
): RoadSegment[] {
  const tw = layout.totalWidth;
  const td = layout.totalDepth;
  const carLike = config.parkingClass !== "motorcycle";
  // Sơ đồ tượng trưng theo sketch: 2 dải ngang + nhiều dải dọc.
  const cw = std.crossW * (carLike ? 0.9 : 0.82);
  const laneRun = td - cw * 1.02;
  const zSouth = -td / 2 + cw * 0.51;
  const zNorth = td / 2 - cw * 0.51;

  const roads: RoadSegment[] = [
    {
      cx: 0,
      cz: zSouth,
      width: tw * 0.97,
      depth: cw,
      flow: "px",
      kind: "cross-in",
    },
    {
      cx: 0,
      cz: zNorth,
      width: tw * 0.97,
      depth: cw,
      flow: "nx",
      kind: "cross-out",
    },
  ];

  layout.lanes.forEach((lane, index) => {
    roads.push({
      cx: lane.x,
      cz: 0,
      width: lane.width,
      depth: laneRun,
      flow: index % 2 === 0 ? "pz" : "nz",
      kind: "lane",
    });
  });

  return roads;
}

function floorFootprint(config: FloorConfig) {
  const layout = computeFloorLayout(config);
  const roadHalfWidth = layout.roads.reduce(
    (max, road) => Math.max(max, Math.abs(road.cx) + road.width / 2),
    0,
  );
  const roadHalfDepth = layout.roads.reduce(
    (max, road) => Math.max(max, Math.abs(road.cz) + road.depth / 2),
    0,
  );
  const halfWidth = Math.max(layout.totalWidth / 2, roadHalfWidth);
  const halfDepth = Math.max(layout.totalDepth / 2, roadHalfDepth);
  return {
    width: halfWidth * 2 + PLATFORM_PAD * 2,
    depth: halfDepth * 2 + PLATFORM_PAD * 2,
    slotCount: layout.slots.length,
  };
}

/** Khoảng cách camera để tầng chiếm phần lớn khung nhìn khi focus 1 tầng */
function cameraRadiusForFootprint(
  width: number,
  depth: number,
  mode: "all" | "single",
  fovDeg = 40,
) {
  const span = Math.max(width, depth);
  const fovRad = (fovDeg * Math.PI) / 180;
  const fitDistance = span / (2 * Math.tan(fovRad / 2));
  if (mode === "single") {
    return fitDistance * 0.48;
  }
  return fitDistance * 1.9 + FLOOR_COUNT * ALL_MODE_EXPLODE_GAP * 0.35;
}

type ZoomLimits = { min: number; max: number; default: number };

function getZoomLimits(mode: "all" | "single", floorIndex: number): ZoomLimits {
  const footprint = floorFootprint(FLOORS[floorIndex]);
  const fov = mode === "single" ? 36 : 48;
  const defaultRadius = cameraRadiusForFootprint(footprint.width, footprint.depth, mode, fov);
  return {
    default: defaultRadius,
    min: defaultRadius * 0.28,
    max: defaultRadius * 3.2,
  };
}

function clampRadius(radius: number, limits: ZoomLimits) {
  return Math.min(limits.max, Math.max(limits.min, radius));
}

function roadBaseColor(road: RoadSegment): string {
  if (road.kind === "lane" || road.kind === "cross-in" || road.kind === "cross-out") {
    return MapColors.lane;
  }
  if (road.kind === "entry-in") {
    return MapColors.flowIn;
  }
  if (road.kind === "entry-out") {
    return MapColors.flowOut;
  }
  if (road.kind === "ramp-up") {
    return MapColors.rampUpHead;
  }
  if (road.kind === "ramp-down") {
    return MapColors.rampDownHead;
  }
  if (road.kind === "ramp-side") {
    return MapColors.ramp;
  }
  return MapColors.lane;
}

function buildRoadMeshes(group: THREE.Group, roads: RoadSegment[]) {
  const laneMarkMat = createMapMaterial(MapColors.laneMark, RENDER_LAYER.roadMark);
  const stopMarkMat = createMapMaterial("#f4f5f7", RENDER_LAYER.roadMark);

  const laneRoads = roads.filter((r) => r.kind === "lane");
  const crossRoads = roads.filter((r) => r.kind === "cross-in" || r.kind === "cross-out");

  const addDashedCenterLine = (
    road: RoadSegment,
    skipZones: Array<{ center: number; half: number }> = [],
  ) => {
    const axisLength = road.flow === "pz" || road.flow === "nz" ? road.depth : road.width;
    const dashLen = Math.max(0.22, Math.min(0.62, axisLength * 0.12));
    const gapLen = dashLen * 0.7;
    const half = axisLength / 2;
    const stripeW = Math.max(0.03, Math.min(0.08, Math.min(road.width, road.depth) * 0.08));
    let cursor = -half + gapLen;

    while (cursor + dashLen < half - gapLen) {
      const sample =
        road.flow === "pz" || road.flow === "nz"
          ? road.cz + cursor + dashLen / 2
          : road.cx + cursor + dashLen / 2;
      const isSkipped = skipZones.some((zone) => Math.abs(sample - zone.center) <= zone.half);
      if (isSkipped) {
        cursor += dashLen + gapLen;
        continue;
      }

      const mark =
        road.flow === "pz" || road.flow === "nz"
          ? new THREE.Mesh(new THREE.BoxGeometry(stripeW, DASH_MARK_HEIGHT, dashLen), laneMarkMat)
          : new THREE.Mesh(new THREE.BoxGeometry(dashLen, DASH_MARK_HEIGHT, stripeW), laneMarkMat);
      applyMeshLayer(mark, RENDER_LAYER.roadMark);
      if (road.flow === "pz" || road.flow === "nz") {
        mark.position.set(road.cx, MAP_LAYER.roadMark, road.cz + cursor + dashLen / 2);
      } else {
        mark.position.set(road.cx + cursor + dashLen / 2, MAP_LAYER.roadMark, road.cz);
      }
      group.add(mark);
      cursor += dashLen + gapLen;
    }
  };

  const addStopLine = (road: RoadSegment) => {
    const lineDepth = Math.max(0.08, Math.min(0.2, road.depth * 0.1));
    const stop = new THREE.Mesh(
      new THREE.BoxGeometry(road.width * 0.9, STOP_MARK_HEIGHT, lineDepth),
      stopMarkMat,
    );
    const z = road.flow === "nz" ? road.cz + road.depth * 0.33 : road.cz - road.depth * 0.33;
    stop.position.set(road.cx, MAP_LAYER.roadMark, z);
    applyMeshLayer(stop, RENDER_LAYER.roadMark);
    group.add(stop);
  };

  roads.forEach((road) => {
    const mat = createMapMaterial(roadBaseColor(road), RENDER_LAYER.road);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(road.width, ROAD_THICKNESS, road.depth), mat);
    mesh.position.set(road.cx, MAP_LAYER.road + ROAD_THICKNESS / 2, road.cz);
    applyMeshLayer(mesh, RENDER_LAYER.road);
    group.add(mesh);

    if (
      road.kind === "lane" ||
      road.kind === "cross-in" ||
      road.kind === "cross-out" ||
      road.kind === "entry-in" ||
      road.kind === "entry-out"
    ) {
      if (road.kind === "cross-in" || road.kind === "cross-out") {
        const skipZones = laneRoads.map((lane) => ({
          center: lane.cx,
          half: Math.max(lane.width * 0.55, 0.22),
        }));
        addDashedCenterLine(road, skipZones);
      } else if (road.kind === "lane") {
        const skipZones = crossRoads.map((cross) => ({
          center: cross.cz,
          half: Math.max(cross.depth * 0.55, 0.34),
        }));
        addDashedCenterLine(road, skipZones);
      } else {
        addDashedCenterLine(road);
      }
    }
    if (road.kind === "entry-out") {
      addStopLine(road);
    }
  });
}

function buildRoundedIntersections(group: THREE.Group, roads: RoadSegment[], config: FloorConfig) {
  if (config.parkingClass === "motorcycle") return;
  const crossIn = roads.find((r) => r.kind === "cross-in");
  const crossOut = roads.find((r) => r.kind === "cross-out");
  const entryIn = roads.find((r) => r.kind === "entry-in");
  const entryOut = roads.find((r) => r.kind === "entry-out");
  const rampUp = roads.find((r) => r.kind === "ramp-up");
  if (!crossIn || !crossOut) return;

  const circleMat = new THREE.MeshBasicMaterial({ color: MapColors.lane, toneMapped: false });

  // Bo cong nút vào bãi.
  if (entryIn) {
    const bulb = new THREE.Mesh(
      new THREE.CylinderGeometry(crossIn.depth * 0.36, crossIn.depth * 0.36, 0.02, 20),
      circleMat,
    );
    bulb.rotation.x = Math.PI / 2;
    bulb.position.set(entryIn.cx, 0.013, crossIn.cz - crossIn.depth * 0.1);
    group.add(bulb);
  }

  if (entryOut) {
    const outBulb = new THREE.Mesh(
      new THREE.CylinderGeometry(crossOut.depth * 0.34, crossOut.depth * 0.34, 0.02, 18),
      new THREE.MeshBasicMaterial({ color: MapColors.flowOut, toneMapped: false }),
    );
    outBulb.rotation.x = Math.PI / 2;
    outBulb.position.set(entryOut.cx, 0.013, crossOut.cz - crossOut.depth * 0.05);
    group.add(outBulb);
  }

  if (entryIn && entryOut) {
    const median = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.03, crossIn.depth * 0.95),
      createToneMappedBasicMaterial(DesignColors.hairlineStrong),
    );
    median.position.set(0, 0.03, entryIn.cz);
    group.add(median);
  }

  // Bo cong khu gom vào ramp lên.
  if (rampUp) {
    const merge = new THREE.Mesh(
      new THREE.CylinderGeometry(crossOut.depth * 0.38, crossOut.depth * 0.38, 0.02, 18),
      new THREE.MeshBasicMaterial({ color: MapColors.rampMark, toneMapped: false }),
    );
    merge.rotation.x = Math.PI / 2;
    merge.position.set(rampUp.cx, 0.014, crossOut.cz + crossOut.depth * 0.2);
    group.add(merge);
  }
}

function buildFloorEnvelope(group: THREE.Group, width: number, depth: number) {
  const wallMat = createMapMaterial(DesignColors.hairline, RENDER_LAYER.wall, {
    transparent: true,
    opacity: 0.9,
  });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, 0.06), wallMat);
  applyMeshLayer(rail, RENDER_LAYER.wall);
  rail.position.set(0, MAP_LAYER.wall, depth / 2 + 0.03);
  group.add(rail);
  const rail2 = rail.clone();
  rail2.position.z = -depth / 2 - 0.03;
  group.add(rail2);
  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, depth + 0.12), wallMat);
  applyMeshLayer(sideRail, RENDER_LAYER.wall);
  sideRail.position.set(width / 2 + 0.03, MAP_LAYER.wall, 0);
  group.add(sideRail);
  const sideRail2 = sideRail.clone();
  sideRail2.position.x = -width / 2 - 0.03;
  group.add(sideRail2);
}

function buildCurvedRampGuides(group: THREE.Group, roads: RoadSegment[]) {
  const rampSide = roads.find((r) => r.kind === "ramp-side");
  const crossIn = roads.find((r) => r.kind === "cross-in");
  const crossOut = roads.find((r) => r.kind === "cross-out");
  if (!rampSide || !crossIn || !crossOut) return;

  const makeCurve = (startZ: number, endZ: number, rise: number, color: string) => {
    const start = new THREE.Vector3(rampSide.cx - 0.6, MAP_LAYER.roadMark, startZ);
    const control = new THREE.Vector3(rampSide.cx + 0.8, rise * 0.6, (startZ + endZ) / 2);
    const end = new THREE.Vector3(rampSide.cx, rise, endZ);
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 22, 0.06, 6, false),
      createMapMaterial(color, RENDER_LAYER.roadMark),
    );
    applyMeshLayer(tube, RENDER_LAYER.roadMark);
    group.add(tube);
  };

  makeCurve(crossOut.cz + 0.35, crossOut.cz + 1.3, MAP_LAYER.roadMark + 0.02, MapColors.rampMark);
  makeCurve(crossIn.cz - 0.35, crossIn.cz - 1.1, MAP_LAYER.roadMark, MapColors.laneMark);
}

function buildHelicalInterFloorRamp(
  building: THREE.Group,
  anchors: Array<{ x: number; z: number; y: number }>,
) {
  if (anchors.length < 2) return;
  const deckMat = new THREE.MeshBasicMaterial({ color: MapColors.rampMark, toneMapped: false });
  const railMat = createToneMappedBasicMaterial(DesignColors.hairlineStrong);

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const from = anchors[i];
    const to = anchors[i + 1];
    const centerX = (from.x + to.x) / 2 + 0.65;
    const centerZ = (from.z + to.z) / 2;
    const radius = 0.8;
    const segments = 28;
    const points: THREE.Vector3[] = [];
    const leftRailPoints: THREE.Vector3[] = [];
    const rightRailPoints: THREE.Vector3[] = [];

    for (let s = 0; s <= segments; s += 1) {
      const t = s / segments;
      const angle = -Math.PI * 0.7 + t * Math.PI * 1.25;
      const px = centerX + Math.cos(angle) * radius;
      const py = from.y + (to.y - from.y) * t;
      const pz = centerZ + Math.sin(angle) * radius;
      points.push(new THREE.Vector3(px, py, pz));
      leftRailPoints.push(
        new THREE.Vector3(px + Math.cos(angle) * 0.18, py + 0.16, pz + Math.sin(angle) * 0.18),
      );
      rightRailPoints.push(
        new THREE.Vector3(px - Math.cos(angle) * 0.18, py + 0.16, pz - Math.sin(angle) * 0.18),
      );
    }

    const deck = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 42, 0.16, 14, false),
      deckMat,
    );
    building.add(deck);
    const leftRail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftRailPoints), 38, 0.03, 10, false),
      railMat,
    );
    building.add(leftRail);
    const rightRail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightRailPoints), 38, 0.03, 10, false),
      railMat,
    );
    building.add(rightRail);
  }
}

/** 3D text labels removed — TextGeometry breaks expo-gl on mobile (vertex spikes). */
function buildFloorAnnotations(
  _group: THREE.Group,
  _config?: FloorConfig,
  _layout?: FloorLayout,
  _floorIndex?: number,
  _roads?: RoadSegment[],
) {
  // Floor info is shown in the 2D header above the canvas.
}

export default function ParkingMapScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t, language } = useLanguagePreference();
  const { resolvedScheme } = useThemePreference();
  MapColors = resolvedScheme === "light" ? MAP_COLORS_LIGHT : MAP_COLORS_DARK;
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [activeFloor, setActiveFloor] = useState(0);
  const [viewMode, setViewMode] = useState<"all" | "single">("all");
  const [interactionMode, setInteractionMode] = useState<"rotate" | "pan">("rotate");
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [slotStatusOverrides, setSlotStatusOverrides] = useState<Record<string, SlotStatus>>({});
  const uniformLayoutBounds = useMemo(() => {
    let width = 0;
    let depth = 0;
    FLOORS.forEach((floor) => {
      const footprint = floorFootprint(floor);
      width = Math.max(width, footprint.width - PLATFORM_PAD * 2);
      depth = Math.max(depth, footprint.depth - PLATFORM_PAD * 2);
    });
    return { width, depth };
  }, []);
  const animationRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isGrayscale = useGrayscale();
  const targetCamera = useRef(new THREE.Vector3(6, 6, 8));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const panOffsetRef = useRef(new THREE.Vector3());
  const orbitRef = useRef({ theta: Math.PI * 0.75, phi: 0.85, radius: 11 });
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const panRef = useRef({ lastX: 0, lastY: 0, lastDistance: 0, moved: false });
  const viewportRef = useRef({ width: 1, height: 1 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerNdcRef = useRef(new THREE.Vector2());
  const floorMeshesRef = useRef<FloorMeshSet[]>([]);
  const floorTargetsRef = useRef<FloorTarget[]>([]);
  const selectionFillRef = useRef<THREE.Mesh | null>(null);
  const selectionAnchorRef = useRef<SelectionAnchor | null>(null);
  const viewModeRef = useRef<"all" | "single">("all");
  const interactionModeRef = useRef<"rotate" | "pan">("rotate");
  const activeFloorRef = useRef(0);
  const buildingRef = useRef<THREE.Group | null>(null);
  const zoomLimitsRef = useRef<ZoomLimits>({ min: 2, max: 30, default: 10 });
  const tempColor = useRef(new THREE.Color());
  const tempPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const applyOrbitToCamera = useCallback(() => {
    const mode = viewModeRef.current;
    const focusY =
      mode === "all" ? ((FLOOR_COUNT - 1) * ALL_MODE_EXPLODE_GAP) / 2 + FOCUS_OFFSET : FOCUS_OFFSET;
    const { radius, phi, theta } = orbitRef.current;
    const lift = mode === "single" ? 0.4 : 2.1;
    targetCamera.current.set(
      radius * Math.cos(theta) * Math.sin(phi),
      radius * Math.cos(phi) + focusY + lift,
      radius * Math.sin(theta) * Math.sin(phi),
    );
    targetCamera.current.add(panOffsetRef.current);
    targetLookAt.current.set(0, focusY, 0).add(panOffsetRef.current);
  }, []);

  const applyPanByScreenDelta = useCallback(
    (dx: number, dy: number) => {
      const forward = new THREE.Vector3()
        .subVectors(targetLookAt.current, targetCamera.current)
        .normalize();
      const worldUp = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      const panScale = Math.max(0.005, orbitRef.current.radius * 0.0018);

      panOffsetRef.current.add(right.multiplyScalar(-dx * panScale));
      panOffsetRef.current.add(up.multiplyScalar(dy * panScale));
      applyOrbitToCamera();
    },
    [applyOrbitToCamera],
  );

  const setOrbitForMode = (mode: "all" | "single", floorIndex = 0) => {
    const limits = getZoomLimits(mode, floorIndex);
    zoomLimitsRef.current = limits;

    if (mode === "single") {
      orbitRef.current.phi = 0.28;
      orbitRef.current.radius = limits.default;
    } else {
      const widest = FLOORS.reduce((max, floor) => Math.max(max, floorFootprint(floor).width), 0);
      orbitRef.current.phi = 0.56;
      orbitRef.current.theta = Math.PI * 0.85;
      orbitRef.current.radius = cameraRadiusForFootprint(
        widest,
        FLOOR_COUNT * ALL_MODE_EXPLODE_GAP,
        "all",
        48,
      );
      zoomLimitsRef.current = getZoomLimits("all", floorIndex);
    }
  };

  const adjustZoom = useCallback(
    (multiplier: number) => {
      orbitRef.current.radius = clampRadius(
        orbitRef.current.radius * multiplier,
        zoomLimitsRef.current,
      );
      applyOrbitToCamera();
    },
    [applyOrbitToCamera],
  );

  const resetZoom = useCallback(() => {
    orbitRef.current.radius = zoomLimitsRef.current.default;
    applyOrbitToCamera();
  }, [applyOrbitToCamera]);

  const clearSelection = useCallback(() => {
    selectionAnchorRef.current = null;
    if (selectionFillRef.current) {
      selectionFillRef.current.visible = false;
    }
    setSelectedSlot(null);
  }, []);

  const updateFocus = useCallback(
    (mode: "all" | "single", floorIndex: number) => {
      viewModeRef.current = mode;
      activeFloorRef.current = floorIndex;
      setOrbitForMode(mode, floorIndex);

      if (cameraRef.current) {
        cameraRef.current.fov = mode === "single" ? 36 : 48;
        cameraRef.current.updateProjectionMatrix();
      }

      const focusY =
        mode === "all" ? ((FLOOR_COUNT - 1) * FLOOR_GAP) / 2 + FOCUS_OFFSET : FOCUS_OFFSET;
      targetLookAt.current.set(0, focusY, 0);
      applyOrbitToCamera();

      floorTargetsRef.current = Array.from({ length: FLOOR_COUNT }, (_, floor) => {
        if (mode === "all") {
          const center = (FLOOR_COUNT - 1) / 2;
          const n = floor - center;
          return {
            x: n * ALL_MODE_SPREAD_X,
            y: floor * ALL_MODE_EXPLODE_GAP,
            z: -n * ALL_MODE_SPREAD_Z,
            opacity: 0.96,
            scale: 1,
          };
        }
        if (floor === floorIndex) {
          return { x: 0, y: 0, z: 0, opacity: 1, scale: 1 };
        }
        return { x: 0, y: floor * FLOOR_GAP - 1.9, z: 0, opacity: 0, scale: 1 };
      });
    },
    [applyOrbitToCamera],
  );

  const syncSelectionHighlight = useCallback(() => {
    const anchor = selectionAnchorRef.current;
    const selectionFill = selectionFillRef.current;
    if (!anchor || !selectionFill) return;

    const floorMesh = floorMeshesRef.current[anchor.floorIndex];
    const target = floorTargetsRef.current[anchor.floorIndex];
    if (!floorMesh || !target || target.opacity < FLOOR_VISIBLE_THRESHOLD) {
      selectionFill.visible = false;
      return;
    }

    if (viewModeRef.current === "single" && anchor.floorIndex !== activeFloorRef.current) {
      selectionFill.visible = false;
      return;
    }

    const { width, depth, height } = floorMesh.slotDims;
    selectionFill.scale.set(
      width + SELECTION_PAD * 0.82,
      height * 1.3,
      depth + SELECTION_PAD * 0.82,
    );

    floorMesh.slotMeshes[anchor.slotIndex].getWorldPosition(tempPosition.current);
    selectionFill.position.copy(tempPosition.current);
    selectionFill.position.y += height / 2 + 0.02;
    selectionFill.visible = true;
  }, []);

  const syncSelectionHighlightRef = useRef(syncSelectionHighlight);
  syncSelectionHighlightRef.current = syncSelectionHighlight;

  const applySlotColors = useCallback(
    (grayscale: boolean) => {
      floorMeshesRef.current.forEach((floorMesh) => {
        floorMesh.slotMeshes.forEach((mesh, index) => {
          const slot = floorMesh.slotMap[index];
          if (!slot) return;
          const effectiveStatus = slotStatusOverrides[slot.id] ?? slot.status;
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.color.set(statusColor(effectiveStatus, grayscale, resolvedScheme));
        });
      });
    },
    [slotStatusOverrides, resolvedScheme],
  );

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;

    const renderer = new Renderer({
      gl,
      logarithmicDepthBuffer: false,
      alpha: false,
      antialias: true,
      precision: "highp",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.setClearColor(DesignColors.canvas, 1);
    renderer.autoClear = true;
    renderer.sortObjects = true;
    renderer.toneMapping = THREE.NoToneMapping;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DesignColors.canvas);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.15, 400);
    cameraRef.current = camera;
    updateFocus("all", 0);
    camera.position.copy(targetCamera.current);
    camera.lookAt(targetLookAt.current);

    const building = new THREE.Group();
    buildingRef.current = building;
    scene.add(building);

    floorMeshesRef.current = [];
    floorTargetsRef.current = [];

    FLOORS.forEach((config, floorIndex) => {
      const group = new THREE.Group();
      group.position.y = floorIndex * FLOOR_GAP;
      building.add(group);

      const layout = computeFloorLayout(config);
      const platformW = uniformLayoutBounds.width + PLATFORM_PAD * 2;
      const platformD = uniformLayoutBounds.depth + PLATFORM_PAD * 2;

      const baseMaterial = createMapMaterial(MapColors.platform, RENDER_LAYER.platform, {
        transparent: true,
        opacity: 1,
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(platformW, 0.08, platformD), baseMaterial);
      applyMeshLayer(base, RENDER_LAYER.platform);
      base.position.y = MAP_LAYER.platform;
      group.add(base);

      buildRoadMeshes(group, layout.roads);
      buildFloorEnvelope(group, platformW, platformD);
      buildCurvedRampGuides(group, layout.roads);

      const slotGroup = new THREE.Group();
      const slotMeshes: THREE.Mesh[] = [];
      const slotMap: SlotInfo[] = [];

      layout.slots.forEach((placement, slotIndex) => {
        const { x, z, row, aisle, side } = placement;
        const sideIdx = side === "L" ? 0 : 1;
        const status = hashSlotStatus(floorIndex, row, aisle, sideIdx);
        const id = `${config.id}-A${aisle + 1}-${side}${row + 1}`;

        const slotMaterial = createMapMaterial(
          statusColor(status, false, resolvedScheme),
          RENDER_LAYER.slot,
        );
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(layout.stallD, SLOT_LIFT, layout.stallW),
          slotMaterial,
        );
        mesh.position.set(x, MAP_LAYER.slot + SLOT_LIFT / 2, z);
        mesh.userData.slotIndex = slotIndex;
        applyMeshLayer(mesh, RENDER_LAYER.slot);
        slotGroup.add(mesh);
        slotMeshes.push(mesh);

        slotMap[slotIndex] = {
          id,
          floor: floorIndex,
          row,
          aisle,
          side,
          status,
        };
      });

      group.add(slotGroup);

      const localizedConfig: FloorConfig = {
        ...config,
        tabLabel: floorTabLabel(config, t),
        vehicleType: vehicleTypeLabel(config, t),
      };
      buildFloorAnnotations(group, localizedConfig, layout, floorIndex, layout.roads);

      floorMeshesRef.current.push({
        group,
        slotGroup,
        slotMeshes,
        slotMap,
        base,
        baseMaterial,
        slotDims: {
          width: layout.stallD,
          depth: layout.stallW,
          height: SLOT_LIFT,
        },
      });
      floorTargetsRef.current.push({
        x: 0,
        y: floorIndex * ALL_MODE_EXPLODE_GAP,
        z: 0,
        opacity: 1,
        scale: 1,
      });
    });

    const bounds = new THREE.Box3().setFromObject(building);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    building.position.sub(center);

    const selectionFill = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      createMapMaterial(selectionAccentColor(resolvedScheme, isGrayscale), RENDER_LAYER.selection, {
        transparent: true,
        opacity: 0.32,
      }),
    );
    selectionFill.visible = false;
    applyMeshLayer(selectionFill, RENDER_LAYER.selection);
    scene.add(selectionFill);
    selectionFillRef.current = selectionFill;

    const animate = () => {
      if (!isMounted.current) return;

      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamera.current, 0.08);
        cameraRef.current.lookAt(targetLookAt.current);
      }

      floorMeshesRef.current.forEach((floorMesh, index) => {
        const target = floorTargetsRef.current[index];
        if (!target) return;

        floorMesh.group.position.x += (target.x - floorMesh.group.position.x) * 0.12;
        floorMesh.group.position.y += (target.y - floorMesh.group.position.y) * 0.12;
        floorMesh.group.position.z += (target.z - floorMesh.group.position.z) * 0.12;
        const nextOpacity =
          floorMesh.baseMaterial.opacity + (target.opacity - floorMesh.baseMaterial.opacity) * 0.12;
        floorMesh.baseMaterial.opacity = nextOpacity;
        floorMesh.group.visible = nextOpacity > FLOOR_VISIBLE_THRESHOLD;
      });

      syncSelectionHighlightRef.current();

      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.render(scene, camera);
      gl.endFrameEXP();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(DesignColors.canvas);
    }
    floorMeshesRef.current.forEach((floorMesh) => {
      floorMesh.baseMaterial.color.set(MapColors.platform);
    });
    applySlotColors(isGrayscale);

    if (selectionFillRef.current) {
      const mat = selectionFillRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(selectionAccentColor(resolvedScheme, isGrayscale));
    }
  }, [isGrayscale, applySlotColors, resolvedScheme, DesignColors.canvas]);

  const focusFloor = (index: number) => {
    clearSelection();
    setActiveFloor(index);
    setViewMode("single");
    updateFocus("single", index);
  };

  const focusAll = () => {
    clearSelection();
    setViewMode("all");
    updateFocus("all", activeFloor);
  };

  const toggleInteractionMode = () => {
    const nextMode = interactionModeRef.current === "rotate" ? "pan" : "rotate";
    interactionModeRef.current = nextMode;
    setInteractionMode(nextMode);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const touch = event.nativeEvent.touches[0];
          panRef.current.lastX = touch?.pageX ?? 0;
          panRef.current.lastY = touch?.pageY ?? 0;
          panRef.current.lastDistance = 0;
          panRef.current.moved = false;
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            const dx = touches[0].pageX - touches[1].pageX;
            const dy = touches[0].pageY - touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (panRef.current.lastDistance > 0) {
              const scale = distance / panRef.current.lastDistance;
              orbitRef.current.radius = clampRadius(
                orbitRef.current.radius / scale,
                zoomLimitsRef.current,
              );
              applyOrbitToCamera();
            }
            panRef.current.lastDistance = distance;
            panRef.current.moved = true;
            return;
          }

          const touch = touches[0];
          if (!touch) return;

          const dx = touch.pageX - panRef.current.lastX;
          const dy = touch.pageY - panRef.current.lastY;
          panRef.current.lastX = touch.pageX;
          panRef.current.lastY = touch.pageY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            panRef.current.moved = true;
          }

          if (interactionModeRef.current === "pan") {
            applyPanByScreenDelta(dx, dy);
          } else {
            orbitRef.current.theta += dx * 0.005;
            orbitRef.current.phi -= dy * 0.005;
            applyOrbitToCamera();
          }
        },
        onPanResponderRelease: (event) => {
          panRef.current.lastDistance = 0;
          if (panRef.current.moved) return;

          const touch = event.nativeEvent.changedTouches[0];
          if (!touch || !cameraRef.current) return;

          const { width, height } = viewportRef.current;
          if (!width || !height) return;

          const x = (touch.locationX / width) * 2 - 1;
          const y = -(touch.locationY / height) * 2 + 1;
          pointerNdcRef.current.set(x, y);
          raycasterRef.current.setFromCamera(pointerNdcRef.current, cameraRef.current);

          const intersects: THREE.Intersection[] = [];
          floorMeshesRef.current.forEach((floorMesh, floorIndex) => {
            if (!floorMesh.group.visible) return;
            if (viewModeRef.current === "single" && floorIndex !== activeFloorRef.current) {
              return;
            }
            intersects.push(
              ...raycasterRef.current.intersectObjects(floorMesh.slotGroup.children, false),
            );
          });

          if (!intersects.length) {
            clearSelection();
            return;
          }

          intersects.sort((a, b) => a.distance - b.distance);
          const [hit] = intersects;
          const hitMesh = hit.object as THREE.Mesh;
          const slotIndex = hitMesh.userData.slotIndex as number;
          const floorIndex = floorMeshesRef.current.findIndex(
            (item) => item.slotGroup === hitMesh.parent,
          );
          const floorMesh = floorMeshesRef.current[floorIndex];
          if (!floorMesh || slotIndex < 0) return;

          const slotInfo = floorMesh.slotMap[slotIndex];
          if (!slotInfo) return;

          selectionAnchorRef.current = { floorIndex, slotIndex };
          syncSelectionHighlight();
          setSelectedSlot(slotInfo);
        },
      }),
    [applyOrbitToCamera, applyPanByScreenDelta, clearSelection, syncSelectionHighlight],
  );

  const selectedSlotStatus = selectedSlot
    ? (slotStatusOverrides[selectedSlot.id] ?? selectedSlot.status)
    : null;
  const legendStatuses: SlotStatus[] = ["empty", "reserved", "in-use", "maintenance", "locked"];

  const handleBookSlot = useCallback(() => {
    if (!selectedSlot) return;
    const effectiveStatus = slotStatusOverrides[selectedSlot.id] ?? selectedSlot.status;
    if (effectiveStatus !== "empty") return;

    setSlotStatusOverrides((prev) => ({
      ...prev,
      [selectedSlot.id]: "reserved",
    }));
  }, [selectedSlot, slotStatusOverrides]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>
            {t("Bản đồ hướng dẫn theo tầng", "Floor guidance map")}
          </ThemedText>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorTabs}
        >
          <Pressable
            onPress={focusAll}
            style={({ pressed }) => [
              styles.floorTab,
              viewMode === "all" && styles.floorTabActive,
              pressed && styles.floorTabPressed,
            ]}
          >
            <ThemedText
              style={viewMode === "all" ? styles.floorTabTextActive : styles.floorTabText}
            >
              {t("Tất cả", "All")}
            </ThemedText>
          </Pressable>
          {FLOORS.map((floor, floorIndex) => (
            <Pressable
              key={floor.id}
              onPress={() => focusFloor(floorIndex)}
              style={({ pressed }) => [
                styles.floorTab,
                viewMode === "single" && activeFloor === floorIndex && styles.floorTabActive,
                pressed && styles.floorTabPressed,
              ]}
            >
              <ThemedText
                style={
                  viewMode === "single" && activeFloor === floorIndex
                    ? styles.floorTabTextActive
                    : styles.floorTabText
                }
              >
                {floorTabLabel(floor, t)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {viewMode === "single" && (
          <View style={styles.floorMeta}>
            <ThemedText style={styles.floorMetaTitle}>
              {floorLabel(FLOORS[activeFloor], t)} · {vehicleTypeLabel(FLOORS[activeFloor], t)} ·{" "}
              {countSlots(FLOORS[activeFloor])} {t("ô", "slots")}
            </ThemedText>
          </View>
        )}

        <View style={styles.canvasCard}>
          <View
            style={styles.glTouchArea}
            onLayout={(event) => {
              viewportRef.current = {
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              };
            }}
            {...panResponder.panHandlers}
          >
            <GLView
              key={`parking-map-${resolvedScheme}-${language}`}
              style={styles.glView}
              onContextCreate={onContextCreate}
            />
          </View>

          <View style={styles.zoomControls} pointerEvents="box-none">
            <Pressable
              onPress={toggleInteractionMode}
              style={({ pressed }) => [
                styles.modeBtn,
                interactionMode === "pan" && styles.modeBtnActive,
                pressed && styles.zoomBtnPressed,
              ]}
              accessibilityLabel={t(
                "Chuyển chế độ điều khiển camera",
                "Toggle camera control mode",
              )}
            >
              <ThemedText style={styles.modeBtnText}>
                {interactionMode === "rotate" ? t("Xoay", "Rotate") : t("Dời", "Pan")}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => adjustZoom(0.82)}
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
              accessibilityLabel={t("Phóng to", "Zoom in")}
            >
              <ThemedText style={styles.zoomBtnText}>+</ThemedText>
            </Pressable>
            <Pressable
              onPress={resetZoom}
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
              accessibilityLabel={t("Đặt lại mức zoom", "Reset zoom")}
            >
              <ThemedText style={styles.zoomBtnTextReset}>◎</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => adjustZoom(1.22)}
              style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
              accessibilityLabel={t("Thu nhỏ", "Zoom out")}
            >
              <ThemedText style={styles.zoomBtnText}>−</ThemedText>
            </Pressable>
          </View>
          <View style={styles.legendSection}>
            <ThemedText style={styles.legendTitle}>
              {t("Chú thích màu trạng thái ô", "Slot status color legend")}
            </ThemedText>
            <ThemedText style={styles.legendHint}>
              {t(
                "Mỗi màu tương ứng với trạng thái hiện tại của ô đỗ trong bãi.",
                "Each color represents the current parking slot status.",
              )}
            </ThemedText>
            <View style={styles.legendWrap}>
              {legendStatuses.map((status) => (
                <View key={status} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendStatusDot,
                      { backgroundColor: statusColor(status, isGrayscale, resolvedScheme) },
                    ]}
                  />
                  <ThemedText style={styles.legendStatusLabel}>{statusLabel(status, t)}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          {selectedSlot && selectedSlotStatus && (
            <View style={styles.slotPopup}>
              <View style={styles.slotPopupHeader}>
                <ThemedText style={styles.slotPopupTitle}>
                  {t("Chi tiết ô đỗ", "Slot details")}
                </ThemedText>
                <Pressable
                  onPress={clearSelection}
                  style={({ pressed }) => [
                    styles.slotPopupClose,
                    pressed && styles.slotPopupClosePressed,
                  ]}
                  accessibilityLabel={t("Đóng chi tiết ô đỗ", "Close slot details")}
                >
                  <ThemedText style={styles.slotPopupCloseText}>X</ThemedText>
                </Pressable>
              </View>

              <ThemedText style={styles.slotPopupId}>{selectedSlot.id}</ThemedText>
              <ThemedText style={styles.slotPopupMeta}>
                {t("Tầng", "Floor")}: {floorLabel(FLOORS[selectedSlot.floor], t)}
              </ThemedText>
              <ThemedText style={styles.slotPopupMeta}>
                {t("Loại xe", "Vehicle")}: {vehicleTypeLabel(FLOORS[selectedSlot.floor], t)}
              </ThemedText>
              <ThemedText style={styles.slotPopupMeta}>
                {t("Trạng thái", "Status")}: {statusLabel(selectedSlotStatus, t)}
              </ThemedText>

              {selectedSlotStatus === "empty" ? (
                <Pressable
                  onPress={handleBookSlot}
                  style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
                  accessibilityLabel={t("Đặt lịch ô đỗ", "Book slot")}
                >
                  <ThemedText style={styles.bookButtonText}>{t("Đặt lịch", "Book")}</ThemedText>
                </Pressable>
              ) : (
                <View style={styles.slotStatusBadge}>
                  <ThemedText style={styles.slotStatusBadgeText}>
                    {statusLabel(selectedSlotStatus, t)}
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.lg,
      gap: Spacing.md,
      width: "100%",
      maxWidth: MaxContentWidth,
      alignSelf: "center",
    },
    header: {
      gap: Spacing.xs,
    },
    backButton: {
      alignSelf: "flex-start",
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    backButtonPressed: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface2,
    },
    backButtonText: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    eyebrow: {
      ...Typography.eyebrow,
      textTransform: "uppercase",
      color: DesignColors.inkSubtle,
    },
    title: {
      ...Typography.displayMd,
      color: DesignColors.ink,
    },
    subtitle: {
      ...Typography.body,
      color: DesignColors.inkMuted,
    },
    floorTabs: {
      flexDirection: "row",
      gap: Spacing.xs,
      paddingVertical: Spacing.xxs,
    },
    floorTab: {
      minWidth: 52,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      alignItems: "center",
    },
    floorTabActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface2,
    },
    floorTabPressed: {
      borderColor: DesignColors.hairlineStrong,
    },
    floorTabText: {
      ...Typography.button,
      color: DesignColors.inkSubtle,
    },
    floorTabTextActive: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    floorMeta: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.xs,
    },
    floorMetaTitle: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    canvasCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.xs,
      overflow: "hidden",
      alignItems: "center",
      gap: Spacing.xs,
      position: "relative",
    },
    zoomControls: {
      flexDirection: "row",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: Spacing.xs,
      marginTop: Spacing.xs,
      marginBottom: Spacing.xxs,
    },
    modeBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 0,
    },
    modeBtnActive: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    modeBtnText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 10,
      lineHeight: 12,
      textAlign: "center",
    },
    zoomBtn: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    zoomBtnPressed: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    zoomBtnText: {
      ...Typography.button,
      fontSize: 20,
      lineHeight: 22,
      color: DesignColors.ink,
    },
    zoomBtnTextReset: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    legendSection: {
      width: "100%",
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      gap: Spacing.xs,
    },
    legendTitle: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    legendHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    legendWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xxs,
    },
    legendStatusDot: {
      width: 10,
      height: 10,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    legendStatusLabel: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    slotPopup: {
      position: "absolute",
      left: Spacing.sm,
      right: Spacing.sm,
      bottom: Spacing.sm,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      padding: Spacing.md,
      gap: Spacing.xs,
      zIndex: 3,
    },
    slotPopupHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    slotPopupTitle: {
      ...Typography.eyebrow,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    slotPopupClose: {
      width: 28,
      height: 28,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      alignItems: "center",
      justifyContent: "center",
    },
    slotPopupClosePressed: {
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.surface3,
    },
    slotPopupCloseText: {
      ...Typography.button,
      color: DesignColors.inkMuted,
    },
    slotPopupId: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    slotPopupMeta: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
    bookButton: {
      marginTop: Spacing.xs,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.primary,
      backgroundColor: DesignColors.primary,
      paddingVertical: Spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    bookButtonPressed: {
      opacity: 0.88,
    },
    bookButtonText: {
      ...Typography.button,
      color: DesignColors.canvas,
    },
    slotStatusBadge: {
      marginTop: Spacing.xs,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      paddingVertical: Spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    slotStatusBadgeText: {
      ...Typography.button,
      color: DesignColors.ink,
    },
    guideCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    guideTitle: {
      ...Typography.eyebrow,
      textTransform: "uppercase",
      color: DesignColors.inkSubtle,
    },
    guideRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: Spacing.sm,
    },
    guideSymbol: {
      ...Typography.button,
      color: DesignColors.primary,
      width: 28,
      textAlign: "center",
    },
    guideCopy: {
      flex: 1,
      gap: 2,
    },
    guideRowTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
    },
    guideRowDesc: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    glTouchArea: {
      width: "100%",
    },
    glView: {
      height: Math.min(Dimensions.get("window").width - Spacing.sm * 2 - Spacing.xs * 2, 420),
      width: "100%",
      minHeight: 320,
      aspectRatio: 1,
    },
    legendBar: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      paddingVertical: Spacing.xxs,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    legendChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xxs,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: Radius.pill,
    },
    legendChipText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    selectionCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.xs,
    },
    selectionTitle: {
      ...Typography.eyebrow,
      textTransform: "uppercase",
      color: DesignColors.inkSubtle,
    },
    selectionBody: {
      gap: Spacing.xxs,
    },
    selectionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.sm,
    },
    selectionId: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      flexShrink: 1,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    statusPillText: {
      ...Typography.caption,
    },
    selectionMeta: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    selectionEmpty: {
      ...Typography.bodySm,
      color: DesignColors.inkSubtle,
    },
  });
