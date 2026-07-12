import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';

import { ThemedText } from '@/components/themed-text';
import type { DesignColorPalette } from '@/constants/design';
import { Radius, Spacing, Typography } from '@/constants/design';
import type { ParkingFloor, ParkingSlot } from '@/features/customer/api/parking';
import {
  computeBuildingFloorLayouts,
  mapApiSlotStatus,
  type Floor3DLayout,
  type Floor3DRoad,
  type MapSlotVisualStatus,
} from '@/features/customer/lib/parking-map-layout';
import { resolveThreeColor } from '@/lib/three-color';

const FLOOR_GAP = 1.15;
const ALL_MODE_EXPLODE_GAP = 2.35;
/** Keep X/Z aligned so All-mode still reads as one building shaft. */
const ALL_MODE_SPREAD_X = 0.06;
const ALL_MODE_SPREAD_Z = 0.03;
const FOCUS_OFFSET = 0.1;
const FLOOR_VISIBLE_THRESHOLD = 0.12;
const SLOT_LIFT = 0.035;
const SLOT_HEIGHT = 0.12;
const ROAD_THICKNESS = 0.022;
const DASH_MARK_HEIGHT = 0.006;
const SELECTION_PAD = 0.08;

const MAP_LAYER = {
  platform: 0.02,
  road: 0.048,
  roadMark: 0.062,
  slot: 0.078,
} as const;

const RENDER_LAYER = {
  platform: 0,
  road: 1,
  roadMark: 2,
  slot: 3,
  selection: 5,
} as const;

type MapPalette = {
  lane: string;
  laneMark: string;
  platform: string;
};

const MAP_COLORS_DARK: MapPalette = {
  lane: '#3f444a',
  laneMark: '#d8dce1',
  platform: '#1A1A1A',
};

const MAP_COLORS_LIGHT: MapPalette = {
  lane: '#667d9b',
  laneMark: '#ffffff',
  platform: '#b7c7db',
};

const STATUS_COLORS_DARK: Record<MapSlotVisualStatus, string> = {
  available: '#2d6a45',
  'in-use': '#4d5360',
  reserved: '#a67c2a',
  unavailable: '#6b4c4c',
};

const STATUS_COLORS_LIGHT: Record<MapSlotVisualStatus, string> = {
  available: '#2f9b53',
  'in-use': '#4e5f76',
  reserved: '#c9921a',
  unavailable: '#b35d4f',
};

const MY_RESERVED_COLOR_DARK = '#5C6BC0';
const MY_RESERVED_COLOR_LIGHT = '#4338CA';

function resolveSlotMeshColor(
  slot: ParkingSlot,
  scheme: 'light' | 'dark',
  myReservedSlotIds: Set<string>,
): string {
  if (myReservedSlotIds.has(slot._id)) {
    return scheme === 'light' ? MY_RESERVED_COLOR_LIGHT : MY_RESERVED_COLOR_DARK;
  }
  return statusColor(mapApiSlotStatus(slot.status), scheme);
}

type FloorMeshSet = {
  floorId: string;
  group: THREE.Group;
  slotGroup: THREE.Group;
  slotMeshes: THREE.Mesh[];
  slots: ParkingSlot[];
  baseMaterial: THREE.MeshBasicMaterial;
  layout: Floor3DLayout;
};

type OrbitState = { theta: number; phi: number; radius: number };
type ZoomLimits = { min: number; max: number; default: number };
type FloorTarget = { x: number; y: number; z: number; opacity: number };

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

function applyMeshLayer(mesh: THREE.Mesh, renderLayer: number) {
  mesh.renderOrder = renderLayer;
}

function statusColor(
  status: MapSlotVisualStatus,
  scheme: 'light' | 'dark',
): string {
  return scheme === 'light' ? STATUS_COLORS_LIGHT[status] : STATUS_COLORS_DARK[status];
}

function selectionAccent(scheme: 'light' | 'dark'): string {
  return scheme === 'light' ? '#3f5f8a' : '#8aa6d9';
}

function clampRadius(radius: number, limits: ZoomLimits) {
  return Math.min(limits.max, Math.max(limits.min, radius));
}

function cameraRadiusForFootprint(
  width: number,
  depth: number,
  mode: 'all' | 'single',
  floorCount: number,
  fovDeg = 40,
) {
  const span = Math.max(width, depth, 8);
  const fovRad = (fovDeg * Math.PI) / 180;
  const fitDistance = span / (2 * Math.tan(fovRad / 2));
  if (mode === 'single') {
    return fitDistance * 0.55;
  }
  return fitDistance * 1.7 + Math.max(floorCount, 1) * ALL_MODE_EXPLODE_GAP * 0.35;
}

function buildRoadMeshes(group: THREE.Group, roads: Floor3DRoad[], mapColors: MapPalette) {
  const laneMarkMat = createMapMaterial(mapColors.laneMark, RENDER_LAYER.roadMark);
  const laneRoads = roads.filter((r) => r.kind === 'lane');
  const crossRoads = roads.filter((r) => r.kind === 'cross-in' || r.kind === 'cross-out');

  const addDashedCenterLine = (
    road: Floor3DRoad,
    skipZones: Array<{ center: number; half: number }> = [],
  ) => {
    const axisLength = road.flow === 'pz' || road.flow === 'nz' ? road.depth : road.width;
    const dashLen = Math.max(0.22, Math.min(0.62, axisLength * 0.12));
    const gapLen = dashLen * 0.7;
    const half = axisLength / 2;
    const stripeW = Math.max(0.03, Math.min(0.08, Math.min(road.width, road.depth) * 0.08));
    let cursor = -half + gapLen;

    while (cursor + dashLen < half - gapLen) {
      const sample =
        road.flow === 'pz' || road.flow === 'nz'
          ? road.cz + cursor + dashLen / 2
          : road.cx + cursor + dashLen / 2;
      const isSkipped = skipZones.some((zone) => Math.abs(sample - zone.center) <= zone.half);
      if (!isSkipped) {
        const mark =
          road.flow === 'pz' || road.flow === 'nz'
            ? new THREE.Mesh(new THREE.BoxGeometry(stripeW, DASH_MARK_HEIGHT, dashLen), laneMarkMat)
            : new THREE.Mesh(new THREE.BoxGeometry(dashLen, DASH_MARK_HEIGHT, stripeW), laneMarkMat);
        applyMeshLayer(mark, RENDER_LAYER.roadMark);
        if (road.flow === 'pz' || road.flow === 'nz') {
          mark.position.set(road.cx, MAP_LAYER.roadMark, road.cz + cursor + dashLen / 2);
        } else {
          mark.position.set(road.cx + cursor + dashLen / 2, MAP_LAYER.roadMark, road.cz);
        }
        group.add(mark);
      }
      cursor += dashLen + gapLen;
    }
  };

  roads.forEach((road) => {
    const mat = createMapMaterial(mapColors.lane, RENDER_LAYER.road);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(road.width, ROAD_THICKNESS, road.depth),
      mat,
    );
    mesh.position.set(road.cx, MAP_LAYER.road + ROAD_THICKNESS / 2, road.cz);
    applyMeshLayer(mesh, RENDER_LAYER.road);
    group.add(mesh);

    if (road.kind === 'cross-in' || road.kind === 'cross-out') {
      addDashedCenterLine(
        road,
        laneRoads.map((lane) => ({ center: lane.cx, half: Math.max(lane.width * 0.55, 0.22) })),
      );
    } else if (road.kind === 'lane') {
      addDashedCenterLine(
        road,
        crossRoads.map((cross) => ({
          center: cross.cz,
          half: Math.max(cross.depth * 0.55, 0.34),
        })),
      );
    }
  });
}

function buildFloorGroup(
  floor: ParkingFloor,
  layout: Floor3DLayout,
  scheme: 'light' | 'dark',
  mapColors: MapPalette,
  myReservedSlotIds: Set<string>,
): FloorMeshSet {
  const group = new THREE.Group();
  const slotGroup = new THREE.Group();
  const baseMaterial = createMapMaterial(mapColors.platform, RENDER_LAYER.platform, {
    transparent: true,
    opacity: 1,
  });
  // Shared building slab — identical W×D on every floor.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(layout.platformWidth, 0.1, layout.platformDepth),
    baseMaterial,
  );
  base.position.y = MAP_LAYER.platform;
  applyMeshLayer(base, RENDER_LAYER.platform);
  group.add(base);

  // Light edge ring so stacked floors read as one tower shaft.
  const rimMat = createMapMaterial(
    scheme === 'light' ? '#8fa0b5' : '#2a2e34',
    RENDER_LAYER.platform,
    { transparent: true, opacity: 0.55 },
  );
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(layout.platformWidth + 0.12, 0.04, layout.platformDepth + 0.12),
    rimMat,
  );
  rim.position.y = MAP_LAYER.platform - 0.02;
  applyMeshLayer(rim, RENDER_LAYER.platform);
  group.add(rim);

  buildRoadMeshes(group, layout.roads, mapColors);

  // Slightly taller boxes for larger vehicles so scale difference is readable in 3D.
  const heightScale =
    layout.parkingClass === 'bike'
      ? 0.72
      : layout.parkingClass === 'motorcycle'
        ? 0.85
        : layout.parkingClass === 'car-large'
          ? 1.18
          : 1;

  const slotMeshes: THREE.Mesh[] = [];
  layout.slots.forEach((placement, index) => {
    const mat = createMapMaterial(
      resolveSlotMeshColor(placement.slot, scheme, myReservedSlotIds),
      RENDER_LAYER.slot,
    );
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(
        placement.width * 0.92,
        SLOT_HEIGHT * heightScale,
        placement.depth * 0.9,
      ),
      mat,
    );
    mesh.position.set(placement.x, MAP_LAYER.slot + SLOT_LIFT, placement.z);
    mesh.userData.slotIndex = index;
    mesh.userData.slotId = placement.slot._id;
    applyMeshLayer(mesh, RENDER_LAYER.slot);
    slotGroup.add(mesh);
    slotMeshes.push(mesh);
  });
  group.add(slotGroup);

  return {
    floorId: floor._id,
    group,
    slotGroup,
    slotMeshes,
    slots: layout.slots.map((item) => item.slot),
    baseMaterial,
    layout,
  };
}

export type ParkingMapGlCanvasProps = {
  floors: ParkingFloor[];
  activeFloorId: string | 'all';
  selectedSlotId: string | null;
  myReservedSlotIds: Set<string>;
  onSelectSlot: (slot: ParkingSlot, floor: ParkingFloor) => void;
  onClearSelection: () => void;
  DesignColors: DesignColorPalette;
  resolvedScheme: 'light' | 'dark';
  t: (vi: string, en: string) => string;
};

export function ParkingMapGlCanvas({
  floors,
  activeFloorId,
  selectedSlotId,
  myReservedSlotIds,
  onSelectSlot,
  onClearSelection,
  DesignColors,
  resolvedScheme,
  t,
}: ParkingMapGlCanvasProps) {
  const [interactionMode, setInteractionMode] = useState<'rotate' | 'pan'>('rotate');
  const interactionModeRef = useRef<'rotate' | 'pan'>('rotate');

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const buildingRef = useRef<THREE.Group | null>(null);
  const floorMeshesRef = useRef<FloorMeshSet[]>([]);
  const floorTargetsRef = useRef<FloorTarget[]>([]);
  const floorsDataRef = useRef(floors);
  const selectionFillRef = useRef<THREE.Mesh | null>(null);
  const selectionAnchorRef = useRef<{ floorIndex: number; slotIndex: number } | null>(null);
  const orbitRef = useRef<OrbitState>({ theta: 0.75, phi: 0.95, radius: 28 });
  const panOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  const targetCamera = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const zoomLimitsRef = useRef<ZoomLimits>({ min: 6, max: 80, default: 28 });
  const viewportRef = useRef({ width: 1, height: 1 });
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerNdcRef = useRef(new THREE.Vector2());
  const panRef = useRef({ lastX: 0, lastY: 0, lastDistance: 0, moved: false });
  const isMounted = useRef(true);
  const animationRef = useRef<number | null>(null);
  const viewModeRef = useRef<'all' | 'single'>(activeFloorId === 'all' ? 'all' : 'single');
  const activeFloorIndexRef = useRef(0);
  const onSelectSlotRef = useRef(onSelectSlot);
  const onClearSelectionRef = useRef(onClearSelection);

  floorsDataRef.current = floors;
  onSelectSlotRef.current = onSelectSlot;
  onClearSelectionRef.current = onClearSelection;
  const myReservedRef = useRef(myReservedSlotIds);
  myReservedRef.current = myReservedSlotIds;

  const mapColors = resolvedScheme === 'light' ? MAP_COLORS_LIGHT : MAP_COLORS_DARK;
  const statusSignature = useMemo(
    () =>
      floors
        .map(
          (floor) =>
            `${floor._id}:${floor.slots.map((slot) => `${slot._id}:${slot.status}`).join(',')}`,
        )
        .join('|'),
    [floors],
  );
  const myReservedSignature = useMemo(
    () => [...myReservedSlotIds].sort().join(','),
    [myReservedSlotIds],
  );
  // Structure-only key: status updates recolor meshes without remounting the whole scene.
  const sceneKey = useMemo(
    () =>
      `${resolvedScheme}:${floors
        .map((floor) => `${floor._id}:${floor.slots.map((slot) => slot._id).join(',')}`)
        .join('|')}`,
    [floors, resolvedScheme],
  );

  const hasInitializedFocusRef = useRef(false);

  const applyOrbitToCamera = useCallback(() => {
    const orbit = orbitRef.current;
    orbit.phi = Math.min(Math.PI * 0.48, Math.max(0.18, orbit.phi));
    const offset = panOffsetRef.current;
    const x = offset.x + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);
    const y = offset.y + orbit.radius * Math.cos(orbit.phi);
    const z = offset.z + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
    targetCamera.current.set(x, y, z);
    targetLookAt.current.copy(offset);
  }, []);

  const applyPanByScreenDelta = useCallback((dx: number, dy: number) => {
    const orbit = orbitRef.current;
    const panSpeed = orbit.radius * 0.0018;
    const rightX = -Math.sin(orbit.theta);
    const rightZ = Math.cos(orbit.theta);
    const upX = -Math.cos(orbit.theta) * Math.cos(orbit.phi);
    const upY = Math.sin(orbit.phi);
    const upZ = -Math.sin(orbit.theta) * Math.cos(orbit.phi);
    panOffsetRef.current.x += rightX * dx * panSpeed + upX * -dy * panSpeed;
    panOffsetRef.current.y += upY * -dy * panSpeed;
    panOffsetRef.current.z += rightZ * dx * panSpeed + upZ * -dy * panSpeed;
    applyOrbitToCamera();
  }, [applyOrbitToCamera]);

  const computeZoomLimits = useCallback(
    (mode: 'all' | 'single', floorIndex: number): ZoomLimits => {
      const floorMesh = floorMeshesRef.current[floorIndex] ?? floorMeshesRef.current[0];
      const width = floorMesh?.layout.platformWidth ?? 20;
      const depth = floorMesh?.layout.platformDepth ?? 20;
      const defaultRadius = cameraRadiusForFootprint(
        width,
        depth,
        mode,
        floorMeshesRef.current.length,
        mode === 'single' ? 36 : 48,
      );
      return {
        default: defaultRadius,
        min: defaultRadius * 0.28,
        max: defaultRadius * 3.2,
      };
    },
    [],
  );

  const updateFocus = useCallback(
    (mode: 'all' | 'single', floorIndex: number, animateCamera = true) => {
      viewModeRef.current = mode;
      activeFloorIndexRef.current = floorIndex;
      const count = floorMeshesRef.current.length;
      floorTargetsRef.current = floorMeshesRef.current.map((_, index) => {
        if (mode === 'all') {
          const centered = index - (count - 1) / 2;
          return {
            x: centered * ALL_MODE_SPREAD_X,
            y: centered * ALL_MODE_EXPLODE_GAP,
            z: centered * ALL_MODE_SPREAD_Z,
            opacity: 1,
          };
        }
        const isActive = index === floorIndex;
        return {
          x: 0,
          y: isActive ? FOCUS_OFFSET : (index - floorIndex) * FLOOR_GAP * 0.35,
          z: 0,
          opacity: isActive ? 1 : 0.08,
        };
      });

      const limits = computeZoomLimits(mode, floorIndex);
      zoomLimitsRef.current = limits;
      if (animateCamera) {
        orbitRef.current.radius = limits.default;
        panOffsetRef.current.set(0, 0, 0);
        applyOrbitToCamera();
      }
    },
    [applyOrbitToCamera, computeZoomLimits],
  );

  const syncSelectionHighlight = useCallback(() => {
    const fill = selectionFillRef.current;
    const anchor = selectionAnchorRef.current;
    if (!fill || !anchor) {
      if (fill) {
        fill.visible = false;
      }
      return;
    }
    const floorMesh = floorMeshesRef.current[anchor.floorIndex];
    const slotMesh = floorMesh?.slotMeshes[anchor.slotIndex];
    if (!floorMesh || !slotMesh || !floorMesh.group.visible) {
      fill.visible = false;
      return;
    }
    const worldPos = new THREE.Vector3();
    slotMesh.getWorldPosition(worldPos);
    const dims = floorMesh.layout.slots[anchor.slotIndex];
    const heightScale =
      floorMesh.layout.parkingClass === 'bike'
        ? 0.72
        : floorMesh.layout.parkingClass === 'motorcycle'
          ? 0.85
          : floorMesh.layout.parkingClass === 'car-large'
            ? 1.18
            : 1;
    fill.scale.set(
      (dims?.width ?? 2) + SELECTION_PAD,
      SLOT_HEIGHT * heightScale + 0.04,
      (dims?.depth ?? 1) + SELECTION_PAD,
    );
    fill.position.copy(worldPos);
    fill.position.y += 0.02;
    fill.visible = true;
  }, []);

  const clearSelectionVisual = useCallback(() => {
    selectionAnchorRef.current = null;
    if (selectionFillRef.current) {
      selectionFillRef.current.visible = false;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (animationRef.current != null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  useEffect(() => {
    if (floorMeshesRef.current.length === 0) {
      return;
    }
    if (activeFloorId === 'all') {
      updateFocus('all', activeFloorIndexRef.current);
      return;
    }
    const index = floorMeshesRef.current.findIndex((item) => item.floorId === activeFloorId);
    if (index >= 0) {
      updateFocus('single', index);
    }
  }, [activeFloorId, updateFocus, sceneKey]);

  useEffect(() => {
    // Sync status / "my reservation" colors without full remount.
    const mine = myReservedRef.current;
    floorMeshesRef.current.forEach((floorMesh) => {
      const floor = floors.find((item) => item._id === floorMesh.floorId);
      if (!floor) {
        return;
      }
      const byId = new Map(floor.slots.map((slot) => [slot._id, slot]));
      floorMesh.slots = floorMesh.slots.map((slot) => byId.get(slot._id) ?? slot);
      floorMesh.slotMeshes.forEach((mesh, index) => {
        const slot = floorMesh.slots[index];
        if (!slot) {
          return;
        }
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.color.set(resolveSlotMeshColor(slot, resolvedScheme, mine));
        mat.needsUpdate = true;
      });
    });
  }, [floors, resolvedScheme, statusSignature, myReservedSignature]);

  useEffect(() => {
    if (!selectedSlotId) {
      clearSelectionVisual();
      return;
    }
    for (let floorIndex = 0; floorIndex < floorMeshesRef.current.length; floorIndex += 1) {
      const floorMesh = floorMeshesRef.current[floorIndex];
      const slotIndex = floorMesh.slots.findIndex((slot) => slot._id === selectedSlotId);
      if (slotIndex >= 0) {
        selectionAnchorRef.current = { floorIndex, slotIndex };
        syncSelectionHighlight();
        return;
      }
    }
  }, [selectedSlotId, clearSelectionVisual, syncSelectionHighlight, sceneKey]);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(width, height);
    renderer.setClearColor(DesignColors.canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DesignColors.canvas);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 500);
    cameraRef.current = camera;

    const building = new THREE.Group();
    buildingRef.current = building;
    scene.add(building);

    const currentFloors = floorsDataRef.current;
    const layouts = computeBuildingFloorLayouts(currentFloors);
    const mine = myReservedRef.current;
    const floorMeshes = currentFloors.map((floor, index) =>
      buildFloorGroup(floor, layouts[index], resolvedScheme, mapColors, mine),
    );
    floorMeshes.forEach((floorMesh, index) => {
      // Stack on a shared vertical shaft — same XZ footprint each level.
      floorMesh.group.position.set(0, index * FLOOR_GAP, 0);
      building.add(floorMesh.group);
    });
    floorMeshesRef.current = floorMeshes;

    const bounds = new THREE.Box3().setFromObject(building);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    building.position.sub(center);

    const selectionFill = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      createMapMaterial(selectionAccent(resolvedScheme), RENDER_LAYER.selection, {
        transparent: true,
        opacity: 0.32,
      }),
    );
    selectionFill.visible = false;
    applyMeshLayer(selectionFill, RENDER_LAYER.selection);
    scene.add(selectionFill);
    selectionFillRef.current = selectionFill;

    if (activeFloorId === 'all' || floorMeshes.length === 0) {
      updateFocus('all', 0, !hasInitializedFocusRef.current);
    } else {
      const index = Math.max(
        0,
        floorMeshes.findIndex((item) => item.floorId === activeFloorId),
      );
      updateFocus('single', index, !hasInitializedFocusRef.current);
    }
    hasInitializedFocusRef.current = true;

    const animate = () => {
      if (!isMounted.current) {
        return;
      }
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamera.current, 0.08);
        cameraRef.current.lookAt(targetLookAt.current);
      }

      floorMeshesRef.current.forEach((floorMesh, index) => {
        const target = floorTargetsRef.current[index];
        if (!target) {
          return;
        }
        floorMesh.group.position.x += (target.x - floorMesh.group.position.x) * 0.12;
        floorMesh.group.position.y += (target.y - floorMesh.group.position.y) * 0.12;
        floorMesh.group.position.z += (target.z - floorMesh.group.position.z) * 0.12;
        const nextOpacity =
          floorMesh.baseMaterial.opacity +
          (target.opacity - floorMesh.baseMaterial.opacity) * 0.12;
        floorMesh.baseMaterial.opacity = nextOpacity;
        floorMesh.group.visible = nextOpacity > FLOOR_VISIBLE_THRESHOLD;
        floorMesh.slotMeshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0.15, nextOpacity);
          mat.transparent = mat.opacity < 1;
        });
      });

      syncSelectionHighlight();
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.render(scene, camera);
      gl.endFrameEXP();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  const adjustZoom = (factor: number) => {
    orbitRef.current.radius = clampRadius(
      orbitRef.current.radius * factor,
      zoomLimitsRef.current,
    );
    applyOrbitToCamera();
  };

  const resetZoom = () => {
    orbitRef.current.radius = zoomLimitsRef.current.default;
    panOffsetRef.current.set(0, 0, 0);
    orbitRef.current.theta = 0.75;
    orbitRef.current.phi = 0.95;
    applyOrbitToCamera();
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
          if (!touch) {
            return;
          }
          const dx = touch.pageX - panRef.current.lastX;
          const dy = touch.pageY - panRef.current.lastY;
          panRef.current.lastX = touch.pageX;
          panRef.current.lastY = touch.pageY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            panRef.current.moved = true;
          }

          if (interactionModeRef.current === 'pan') {
            applyPanByScreenDelta(dx, dy);
          } else {
            orbitRef.current.theta += dx * 0.005;
            orbitRef.current.phi -= dy * 0.005;
            applyOrbitToCamera();
          }
        },
        onPanResponderRelease: (event) => {
          panRef.current.lastDistance = 0;
          if (panRef.current.moved) {
            return;
          }

          const touch = event.nativeEvent.changedTouches[0];
          if (!touch || !cameraRef.current) {
            return;
          }
          const { width, height } = viewportRef.current;
          if (!width || !height) {
            return;
          }

          const x = (touch.locationX / width) * 2 - 1;
          const y = -(touch.locationY / height) * 2 + 1;
          pointerNdcRef.current.set(x, y);
          raycasterRef.current.setFromCamera(pointerNdcRef.current, cameraRef.current);

          const intersects: THREE.Intersection[] = [];
          floorMeshesRef.current.forEach((floorMesh, floorIndex) => {
            if (!floorMesh.group.visible) {
              return;
            }
            if (
              viewModeRef.current === 'single' &&
              floorIndex !== activeFloorIndexRef.current
            ) {
              return;
            }
            intersects.push(
              ...raycasterRef.current.intersectObjects(floorMesh.slotGroup.children, false),
            );
          });

          if (!intersects.length) {
            clearSelectionVisual();
            onClearSelectionRef.current();
            return;
          }

          intersects.sort((a, b) => a.distance - b.distance);
          const hitMesh = intersects[0].object as THREE.Mesh;
          const slotId = String(hitMesh.userData.slotId ?? '');
          const floorIndex = floorMeshesRef.current.findIndex(
            (item) => item.slotGroup === hitMesh.parent,
          );
          const floorMesh = floorMeshesRef.current[floorIndex];
          const liveFloor = floorsDataRef.current.find((item) => item._id === floorMesh?.floorId);
          // Always resolve from latest API floors — never trust stale mesh-cached slot copies.
          const liveSlot =
            liveFloor?.slots.find((item) => item._id === slotId) ??
            floorMesh?.slots.find((item) => item._id === slotId) ??
            null;
          if (!floorMesh || !liveFloor || !liveSlot) {
            return;
          }

          const slotIndex = floorMesh.slots.findIndex((item) => item._id === liveSlot._id);
          selectionAnchorRef.current = {
            floorIndex,
            slotIndex: slotIndex >= 0 ? slotIndex : (hitMesh.userData.slotIndex as number) ?? 0,
          };
          syncSelectionHighlight();
          onSelectSlotRef.current(liveSlot, liveFloor);
        },
      }),
    [applyOrbitToCamera, applyPanByScreenDelta, clearSelectionVisual, syncSelectionHighlight],
  );

  return (
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
        <GLView key={sceneKey} style={styles.glView} onContextCreate={onContextCreate} />
      </View>

      <View style={styles.zoomControls} pointerEvents="box-none">
        <Pressable
          onPress={() =>
            setInteractionMode((mode) => (mode === 'rotate' ? 'pan' : 'rotate'))
          }
          style={[styles.modeBtn, interactionMode === 'pan' && styles.modeBtnActive]}
        >
          <ThemedText style={styles.modeBtnText}>
            {interactionMode === 'rotate' ? t('Xoay', 'Rotate') : t('Dời', 'Pan')}
          </ThemedText>
        </Pressable>
        <Pressable onPress={() => adjustZoom(0.82)} style={styles.zoomBtn}>
          <ThemedText style={styles.zoomBtnText}>+</ThemedText>
        </Pressable>
        <Pressable onPress={resetZoom} style={styles.zoomBtn}>
          <ThemedText style={styles.zoomBtnTextReset}>◎</ThemedText>
        </Pressable>
        <Pressable onPress={() => adjustZoom(1.22)} style={styles.zoomBtn}>
          <ThemedText style={styles.zoomBtnText}>−</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasCard: {
    flex: 1,
    minHeight: 320,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  glTouchArea: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
  zoomControls: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
    gap: 6,
    alignItems: 'stretch',
  },
  modeBtn: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(20,20,20,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: 'rgba(92,107,192,0.85)',
  },
  modeBtnText: {
    ...Typography.caption,
    color: '#fff',
    fontWeight: '700',
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(20,20,20,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    ...Typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  zoomBtnTextReset: {
    ...Typography.caption,
    color: '#fff',
  },
});
