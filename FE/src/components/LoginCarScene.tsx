import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { cn } from "@/lib/utils";

const ASSET_URLS = {
  hdr: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/equirectangular/venice_sunset_1k.hdr",
  shadow: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari_ao.png",
  car: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb",
  draco: "/three/jsm/libs/draco/gltf/",
};

const TARGET_FPS = {
  normal: 45,
  lowPower: 30,
} as const;

const MAX_PIXEL_RATIO = {
  normal: 1.5,
  lowPower: 1,
} as const;

const sharedTextureLoader = new THREE.TextureLoader();
const sharedRgbeLoader = new RGBELoader();
const sharedDracoLoader = new DRACOLoader();
sharedDracoLoader.setDecoderPath(ASSET_URLS.draco);
const sharedGltfLoader = new GLTFLoader();
sharedGltfLoader.setDRACOLoader(sharedDracoLoader);

let environmentTexturePromise: Promise<THREE.Texture | null> | null = null;
let shadowTexturePromise: Promise<THREE.Texture | null> | null = null;
let carModelTemplatePromise: Promise<THREE.Object3D | null> | null = null;

function loadEnvironmentTexture() {
  if (!environmentTexturePromise) {
    environmentTexturePromise = new Promise((resolve) => {
      sharedRgbeLoader.load(
        ASSET_URLS.hdr,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          resolve(texture);
        },
        undefined,
        () => resolve(null),
      );
    });
  }
  return environmentTexturePromise;
}

function loadShadowTexture() {
  if (!shadowTexturePromise) {
    shadowTexturePromise = new Promise((resolve) => {
      sharedTextureLoader.load(ASSET_URLS.shadow, resolve, undefined, () => resolve(null));
    });
  }
  return shadowTexturePromise;
}

function loadCarTemplate() {
  if (!carModelTemplatePromise) {
    carModelTemplatePromise = new Promise((resolve) => {
      sharedGltfLoader.load(
        ASSET_URLS.car,
        (gltf) => {
          const root = gltf.scene.children[0];
          resolve(root ? root.clone(true) : null);
        },
        undefined,
        () => resolve(null),
      );
    });
  }
  return carModelTemplatePromise;
}

function getDeviceProfile() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const deviceMemory = nav.deviceMemory ?? 8;
  const lowCoreCount = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const lowPower = coarsePointer || lowCoreCount || deviceMemory <= 4;
  return { lowPower, prefersReducedMotion };
}

export function LoginCarScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const wheels: THREE.Object3D[] = [];
    const extraDisposables: THREE.Material[] = [];
    let frameId = 0;
    let isDisposed = false;
    let lastRenderTime = 0;
    let isDocumentVisible = document.visibilityState === "visible";
    const { lowPower, prefersReducedMotion } = getDeviceProfile();
    const targetFps = lowPower ? TARGET_FPS.lowPower : TARGET_FPS.normal;
    const frameInterval = 1000 / targetFps;
    const maxPixelRatio = lowPower ? MAX_PIXEL_RATIO.lowPower : MAX_PIXEL_RATIO.normal;

    const renderer = new THREE.WebGLRenderer({
      antialias: !lowPower,
      alpha: true,
      powerPreference: lowPower ? "low-power" : "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.25, 1.4, -4.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !lowPower;
    controls.maxDistance = 9;
    controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
    controls.target.set(0, 0.5, 0);
    controls.update();

    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      metalness: 1,
      roughness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });

    const detailsMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1,
      roughness: 0.5,
    });

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.25,
      roughness: 0,
      transmission: 1,
    });

    mount.appendChild(renderer.domElement);

    const sizeToMount = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width === 0 || height === 0) {
        return;
      }
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    sizeToMount();

    const resizeObserver = new ResizeObserver(() => sizeToMount());
    resizeObserver.observe(mount);

    const renderFrame = () => {
      if (controls.enableDamping) {
        controls.update();
      }
      renderer.render(scene, camera);
    };

    const onVisibilityChange = () => {
      isDocumentVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onControlsChange = () => {
      if (prefersReducedMotion && isDocumentVisible) {
        renderFrame();
      }
    };
    controls.addEventListener("change", onControlsChange);

    const animate = (now: number) => {
      frameId = window.requestAnimationFrame(animate);

      if (!isDocumentVisible) {
        return;
      }
      if (now - lastRenderTime < frameInterval) {
        return;
      }

      lastRenderTime = now;
      const time = -now / 1000;

      if (!prefersReducedMotion) {
        for (let i = 0; i < wheels.length; i += 1) {
          wheels[i].rotation.x = time * Math.PI * 2;
        }
      }

      renderFrame();
    };

    Promise.all([loadEnvironmentTexture(), loadShadowTexture(), loadCarTemplate()]).then(
      ([environmentTexture, shadowTexture, carTemplate]) => {
        if (isDisposed) {
          return;
        }

        if (environmentTexture) {
          scene.environment = environmentTexture;
        }

        if (carTemplate) {
          const carModel = carTemplate.clone(true) as THREE.Object3D & {
            getObjectByName: (name: string) => THREE.Object3D | undefined;
          };
          const body = carModel.getObjectByName("body") as THREE.Mesh | undefined;
          const rimFl = carModel.getObjectByName("rim_fl") as THREE.Mesh | undefined;
          const rimFr = carModel.getObjectByName("rim_fr") as THREE.Mesh | undefined;
          const rimRr = carModel.getObjectByName("rim_rr") as THREE.Mesh | undefined;
          const rimRl = carModel.getObjectByName("rim_rl") as THREE.Mesh | undefined;
          const trim = carModel.getObjectByName("trim") as THREE.Mesh | undefined;
          const glass = carModel.getObjectByName("glass") as THREE.Mesh | undefined;

          if (body) body.material = bodyMaterial;
          if (rimFl) rimFl.material = detailsMaterial;
          if (rimFr) rimFr.material = detailsMaterial;
          if (rimRr) rimRr.material = detailsMaterial;
          if (rimRl) rimRl.material = detailsMaterial;
          if (trim) trim.material = detailsMaterial;
          if (glass) glass.material = glassMaterial;

          const wheelFl = carModel.getObjectByName("wheel_fl");
          const wheelFr = carModel.getObjectByName("wheel_fr");
          const wheelRl = carModel.getObjectByName("wheel_rl");
          const wheelRr = carModel.getObjectByName("wheel_rr");

          [wheelFl, wheelFr, wheelRl, wheelRr].forEach((wheel) => {
            if (wheel) {
              wheels.push(wheel);
            }
          });

          if (shadowTexture) {
            const shadowMesh = new THREE.Mesh(
              new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4),
              new THREE.MeshBasicMaterial({
                map: shadowTexture,
                blending: THREE.MultiplyBlending,
                toneMapped: false,
                transparent: true,
                premultipliedAlpha: true,
              }),
            );
            shadowMesh.rotation.x = -Math.PI / 2;
            shadowMesh.renderOrder = 2;
            carModel.add(shadowMesh);
          }

          scene.add(carModel);
        } else {
          const fallback = createFallbackCar(bodyMaterial, detailsMaterial, extraDisposables);
          scene.add(fallback);
        }

        renderFrame();

        if (!prefersReducedMotion) {
          frameId = window.requestAnimationFrame(animate);
        }
      },
    );

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controls.removeEventListener("change", onControlsChange);
      controls.dispose();
      scene.environment = null;
      bodyMaterial.dispose();
      detailsMaterial.dispose();
      glassMaterial.dispose();
      extraDisposables.forEach((material) => material.dispose());
      renderer.dispose();

      mount.innerHTML = "";
    };
  }, []);

  return (
    <div className={cn("relative h-full min-h-[360px] w-full overflow-hidden bg-transparent", className)}>
      <div ref={mountRef} className="h-full min-h-[360px] w-full" />
    </div>
  );
}

function createFallbackCar(
  bodyMaterial: THREE.Material,
  detailsMaterial: THREE.Material,
  extraDisposables: THREE.Material[],
) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.55, 1), bodyMaterial);
  body.position.y = 0.55;
  group.add(body);

  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.35, 0.95), detailsMaterial);
  top.position.set(0.05, 0.95, 0);
  group.add(top);

  const wheelGeometry = new THREE.CylinderGeometry(0.23, 0.23, 0.18, 24);
  wheelGeometry.rotateZ(Math.PI / 2);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  extraDisposables.push(wheelMaterial);
  const wheelPositions = [
    [-0.72, 0.23, 0.54],
    [0.72, 0.23, 0.54],
    [-0.72, 0.23, -0.54],
    [0.72, 0.23, -0.54],
  ] as const;
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  return group;
}
