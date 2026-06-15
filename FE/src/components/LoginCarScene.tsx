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
  draco: "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/jsm/libs/draco/gltf/",
};

export function LoginCarScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    const wheels: THREE.Object3D[] = [];
    let frameId = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(4.25, 1.4, -4.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxDistance = 9;
    controls.maxPolarAngle = THREE.MathUtils.degToRad(90);
    controls.target.set(0, 0.5, 0);

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
      renderer.setSize(width, height);
    };

    sizeToMount();

    const resizeObserver = new ResizeObserver(() => sizeToMount());
    resizeObserver.observe(mount);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(ASSET_URLS.draco);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    new RGBELoader().load(ASSET_URLS.hdr, (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = texture;
    });

    const shadowTexture = new THREE.TextureLoader().load(ASSET_URLS.shadow);

    gltfLoader.load(
      ASSET_URLS.car,
      (gltf) => {
        const carModel = gltf.scene.children[0] as THREE.Object3D & {
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

        scene.add(carModel);
      },
      undefined,
      () => {
        const fallback = createFallbackCar(bodyMaterial, detailsMaterial);
        scene.add(fallback);
      },
    );

    const animate = () => {
      controls.update();
      const time = -performance.now() / 1000;

      for (let i = 0; i < wheels.length; i += 1) {
        wheels[i].rotation.x = time * Math.PI * 2;
      }
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frameId);
      controls.dispose();
      dracoLoader.dispose();
      shadowTexture.dispose();
      bodyMaterial.dispose();
      detailsMaterial.dispose();
      glassMaterial.dispose();
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

function createFallbackCar(bodyMaterial: THREE.Material, detailsMaterial: THREE.Material) {
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