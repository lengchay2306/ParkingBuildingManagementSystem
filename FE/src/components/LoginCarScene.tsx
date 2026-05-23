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

const HIGH_DETAIL_LOAD_DELAY_MS = 150;

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
    const extraMaterials: THREE.Material[] = [];
    const extraGeometries: THREE.BufferGeometry[] = [];
    let frameId = 0;
    let isDisposed = false;
    let lastRenderTime = 0;
    let isDocumentVisible = document.visibilityState === "visible";
    let activeCar: THREE.Object3D | null = null;
    const { lowPower, prefersReducedMotion } = getDeviceProfile();
    const targetFps = lowPower ? TARGET_FPS.lowPower : TARGET_FPS.normal;
    const frameInterval = 1000 / targetFps;
    const maxPixelRatio = lowPower ? MAX_PIXEL_RATIO.lowPower : MAX_PIXEL_RATIO.normal;
    const shouldUpgradeToHighDetail = !lowPower;

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
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x111122, 0.9);
    scene.add(hemiLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.4);
    keyLight.position.set(3, 4, -2);
    scene.add(keyLight);

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

    const setWheelTargets = (nextWheels: THREE.Object3D[]) => {
      wheels.length = 0;
      for (let i = 0; i < nextWheels.length; i += 1) {
        wheels.push(nextWheels[i]);
      }
    };

    const fallbackCar = createFallbackCar(
      bodyMaterial,
      detailsMaterial,
      extraMaterials,
      extraGeometries,
    );
    scene.add(fallbackCar);
    activeCar = fallbackCar;
    setWheelTargets(collectWheels(fallbackCar));
    renderFrame();

    if (!prefersReducedMotion) {
      frameId = window.requestAnimationFrame(animate);
    }

    if (shouldUpgradeToHighDetail) {
      window.setTimeout(() => {
        if (isDisposed) {
          return;
        }

        Promise.all([loadEnvironmentTexture(), loadShadowTexture(), loadCarTemplate()]).then(
          ([environmentTexture, shadowTexture, carTemplate]) => {
            if (isDisposed || !carTemplate) {
              return;
            }

            if (environmentTexture) {
              scene.environment = environmentTexture;
            }

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

            if (shadowTexture) {
              const shadowGeometry = new THREE.PlaneGeometry(0.655 * 4, 1.3 * 4);
              const shadowMaterial = new THREE.MeshBasicMaterial({
                map: shadowTexture,
                blending: THREE.MultiplyBlending,
                toneMapped: false,
                transparent: true,
                premultipliedAlpha: true,
              });
              extraGeometries.push(shadowGeometry);
              extraMaterials.push(shadowMaterial);

              const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
              shadowMesh.rotation.x = -Math.PI / 2;
              shadowMesh.renderOrder = 2;
              carModel.add(shadowMesh);
            }

            scene.add(carModel);
            if (activeCar) {
              scene.remove(activeCar);
            }
            activeCar = carModel;
            setWheelTargets(collectWheels(carModel));
            renderFrame();
          },
        );
      }, HIGH_DETAIL_LOAD_DELAY_MS);
    }

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
      extraMaterials.forEach((material) => material.dispose());
      extraGeometries.forEach((geometry) => geometry.dispose());
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
  extraMaterials: THREE.Material[],
  extraGeometries: THREE.BufferGeometry[],
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
  extraMaterials.push(wheelMaterial);
  extraGeometries.push(wheelGeometry);
  const wheelPositions = [
    [-0.72, 0.23, 0.54],
    [0.72, 0.23, 0.54],
    [-0.72, 0.23, -0.54],
    [0.72, 0.23, -0.54],
  ] as const;
  wheelPositions.forEach(([x, y, z], index) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.name = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"][index];
    wheel.position.set(x, y, z);
    group.add(wheel);
  });

  return group;
}

function collectWheels(root: THREE.Object3D) {
  const names = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"];
  const collected: THREE.Object3D[] = [];
  for (let i = 0; i < names.length; i += 1) {
    const wheel = root.getObjectByName(names[i]);
    if (wheel) {
      collected.push(wheel);
    }
  }
  return collected;
}
