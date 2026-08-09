"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const fallbackBeads = [
  { color: "#9b86c8", x: "50%", y: "7%" },
  { color: "#8b9d91", x: "87%", y: "29%" },
  { color: "#b58f98", x: "87%", y: "71%" },
  { color: "#a47e53", x: "50%", y: "93%" },
  { color: "#343239", x: "13%", y: "71%" },
  { color: "#9b9087", x: "13%", y: "29%" },
] as const;

type RenderState = "loading" | "ready" | "fallback";

export function MineralOrbit() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderState, setRenderState] = useState<RenderState>("loading");

  useEffect(() => {
    const host = hostRef.current as HTMLDivElement;
    const canvas = canvasRef.current as HTMLCanvasElement;

    if (!host || !canvas) return;

    let cancelled = false;
    let frame: number | undefined;
    let inView = true;
    let disposeThree = () => undefined;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function initialiseScene() {
      try {
        const THREE = await import("@/lib/three-mineral-runtime");
        if (cancelled) return;

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          canvas,
          powerPreference: "high-performance",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
        camera.position.z = 10.3;

        const orbitGroup = new THREE.Group();
        orbitGroup.rotation.x = -0.08;
        scene.add(orbitGroup);

        scene.add(new THREE.HemisphereLight(0xf2f1ec, 0x17131d, 1.8));
        const keyLight = new THREE.PointLight(0xffffff, 28, 20);
        keyLight.position.set(-3.5, 4.5, 5.5);
        scene.add(keyLight);
        const accentLight = new THREE.PointLight(0x8d6fc1, 20, 15);
        accentLight.position.set(4, -3, 3);
        scene.add(accentLight);

        const trackMaterial = new THREE.MeshBasicMaterial({
          color: 0x6f6d70,
          opacity: 0.38,
          transparent: true,
        });
        const outerTrack = new THREE.Mesh(
          new THREE.TorusGeometry(2.55, 0.012, 6, 128),
          trackMaterial,
        );
        const innerTrack = new THREE.Mesh(
          new THREE.TorusGeometry(1.84, 0.008, 6, 112),
          trackMaterial.clone(),
        );
        orbitGroup.add(outerTrack, innerTrack);

        const beadGeometries = [
          new THREE.IcosahedronGeometry(0.34, 2),
          new THREE.SphereGeometry(0.31, 24, 18),
          new THREE.OctahedronGeometry(0.34, 2),
          new THREE.SphereGeometry(0.33, 18, 14),
          new THREE.DodecahedronGeometry(0.32, 1),
          new THREE.IcosahedronGeometry(0.32, 3),
        ];
        const beadColours = [0x9b86c8, 0x81968b, 0xb58f98, 0xa47e53, 0x343239, 0x9b9087];
        const beadMeshes = beadGeometries.map((geometry, index) => {
          const material = new THREE.MeshPhysicalMaterial({
            clearcoat: index === 4 ? 0.9 : 0.55,
            clearcoatRoughness: 0.22,
            color: beadColours[index],
            metalness: index === 4 ? 0.2 : 0.03,
            roughness: 0.24 + index * 0.07,
          });
          const bead = new THREE.Mesh(geometry, material);
          const angle = (index / beadGeometries.length) * Math.PI * 2 + Math.PI / 2;
          bead.position.set(Math.cos(angle) * 2.55, Math.sin(angle) * 2.55, index % 2 ? 0.12 : -0.08);
          bead.rotation.set(index * 0.38, index * 0.52, index * 0.24);
          orbitGroup.add(bead);
          return bead;
        });

        const core = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.72, 1),
          new THREE.MeshPhysicalMaterial({
            clearcoat: 0.75,
            color: 0x8b73b5,
            flatShading: true,
            metalness: 0.06,
            roughness: 0.18,
          }),
        );
        core.scale.y = 1.18;
        orbitGroup.add(core);

        let targetTiltX = 0;
        let targetTiltY = 0;
        const onPointerMove = (event: PointerEvent) => {
          if (reduceMotion) return;
          const bounds = host.getBoundingClientRect();
          targetTiltY = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.22;
          targetTiltX = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.16;
        };
        const onPointerLeave = () => {
          targetTiltX = 0;
          targetTiltY = 0;
        };
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerleave", onPointerLeave);

        const resize = () => {
          const width = host.clientWidth;
          const height = host.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.position.z = 10.3 / Math.min(camera.aspect, 1);
          camera.updateProjectionMatrix();
          renderer.render(scene, camera);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(host);
        resize();

        const renderFrame = (now: number) => {
          frame = undefined;
          if (cancelled || !inView) return;

          const elapsed = now * 0.001;
          orbitGroup.rotation.z = elapsed * 0.105;
          orbitGroup.rotation.x += (targetTiltX - orbitGroup.rotation.x) * 0.035;
          orbitGroup.rotation.y += (targetTiltY - orbitGroup.rotation.y) * 0.035;
          beadMeshes.forEach((bead, index) => {
            bead.rotation.x = elapsed * (0.16 + index * 0.025);
            bead.rotation.y = elapsed * (0.2 + index * 0.018);
          });
          core.rotation.x = elapsed * 0.18;
          core.rotation.y = elapsed * 0.26;
          renderer.render(scene, camera);
          frame = window.requestAnimationFrame(renderFrame);
        };

        const intersectionObserver = new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting;
          if (inView && !reduceMotion && frame === undefined) {
            frame = window.requestAnimationFrame(renderFrame);
          } else if (!inView && frame !== undefined) {
            window.cancelAnimationFrame(frame);
            frame = undefined;
          }
        });
        intersectionObserver.observe(host);

        if (reduceMotion) {
          renderer.render(scene, camera);
        } else {
          frame = window.requestAnimationFrame(renderFrame);
        }

        disposeThree = () => {
          intersectionObserver.disconnect();
          resizeObserver.disconnect();
          host.removeEventListener("pointermove", onPointerMove);
          host.removeEventListener("pointerleave", onPointerLeave);
          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          });
          renderer.dispose();
        };

        if (!cancelled) setRenderState("ready");
      } catch {
        if (!cancelled) setRenderState("fallback");
      }
    }

    void initialiseScene();

    return () => {
      cancelled = true;
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      disposeThree();
    };
  }, []);

  return (
    <div className="mineral-orbit" data-render-state={renderState} ref={hostRef}>
      <div className="mineral-orbit-fallback" aria-hidden="true">
        <span className="mineral-track mineral-track-outer" />
        <span className="mineral-track mineral-track-inner" />
        {fallbackBeads.map((bead, index) => (
          <span
            className="mineral-fallback-bead"
            key={bead.color}
            style={
              {
                "--bead-color": bead.color,
                "--bead-x": bead.x,
                "--bead-y": bead.y,
                "--bead-rotation": `${index * 17}deg`,
              } as CSSProperties
            }
          />
        ))}
        <span className="mineral-fallback-core" />
      </div>
      <canvas className="mineral-orbit-canvas" ref={canvasRef} aria-hidden="true" />
      <p>MINERAL SIGNAL / 06</p>
    </div>
  );
}
