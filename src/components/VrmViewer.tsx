import { VRMLoaderPlugin, VRMUtils, VRM, MToonMaterialLoaderPlugin } from "@pixiv/three-vrm";
import { useEffect, useRef } from "react";
import { GLTFLoader, OrbitControls } from "three/examples/jsm/Addons.js";

import * as THREE from "three/webgpu";
import { MToonNodeMaterial } from "@pixiv/three-vrm/nodes";

export interface VrmViewerProps {
  vrmUrl: string | null;
  width?: string;
  height?: string;
}

export function VrmViewer({ vrmUrl, width = "100%", height = "100%" }: VrmViewerProps) {
  // コンポーネントで扱うインスタンス管理
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const loaderRef = useRef<GLTFLoader | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 各インスタンスの初期化
  useEffect(() => {
    const container = containerRef.current;
    if (container == null) return;

    // レンダラー
    const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // カメラ
    cameraRef.current = new THREE.PerspectiveCamera(30.0, container.clientWidth / container.clientHeight, 0.1, 100.0);
    cameraRef.current.position.set(0.0, 0.5, 3.0);

    // カメラコントロール
    controlsRef.current = new OrbitControls(cameraRef.current, renderer.domElement);
    controlsRef.current.screenSpacePanning = true;
    controlsRef.current.target.set(0.0, 0.5, 0.0);
    controlsRef.current.update();

    // Scene
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0xffffff);

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    sceneRef.current.add(ambientLight);

    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0).normalize();
    sceneRef.current.add(light);
    lightRef.current = light;

    // アニメーションループ
    const timer = new THREE.Timer();
    renderer.setAnimationLoop(() => {
      const delta = timer.getDelta();

      if (vrmRef.current) {
        vrmRef.current.update(delta);
      }

      if (sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current, cameraRef.current);
      }
    });

    // リサイズ対応
    const handleResize = () => {
      if (!container || !cameraRef.current) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };

    window.addEventListener("resize", handleResize);

    setTimeout(handleResize, 100);

    // vrm
    loaderRef.current = new GLTFLoader();
    loaderRef.current.crossOrigin = "anonymous";
    loaderRef.current.register((parser) => {
      const mtoonMaterialPlugin = new MToonMaterialLoaderPlugin(parser, {
        materialType: MToonNodeMaterial,
      });
      return new VRMLoaderPlugin(parser, { mtoonMaterialPlugin });
    });

    // クリーンアップ
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      controlsRef.current?.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // vrmUrlが変更->読み込むアバターを変更するごとに更新
  useEffect(() => {
    if (loaderRef.current == null || vrmUrl == null) {
      return;
    }

    loaderRef.current.load(
      vrmUrl,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) return;

        // パフォーマンスを上げるための設定
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.combineMorphs(vrm);

        // 以前のvrmモデルが存在する場合は削除
        if (vrmRef.current) {
          sceneRef.current?.remove(vrmRef.current.scene);
          VRMUtils.deepDispose(vrmRef.current.scene);
        }

        vrm.scene.traverse((obj: THREE.Object3D) => {
          obj.frustumCulled = false;
        });

        vrmRef.current = vrm;
        sceneRef.current?.add(vrm.scene);

        VRMUtils.rotateVRM0(vrm);
        console.log("VRM model loaded successfully:", vrm);
      },
      (progress) => console.log("loading model...", (progress.loaded / (progress.total || 1)) * 100, "%"),
      (error: any) => console.error("Error loading VRM:", error),
    );

    return () => {
      if (vrmRef.current) {
        sceneRef.current?.remove(vrmRef.current.scene);
        VRMUtils.deepDispose(vrmRef.current.scene);
        vrmRef.current = null;
      }
    };
  }, [vrmUrl]);

  return <div ref={containerRef} style={{ width, height }} />;
}
