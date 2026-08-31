'use client';

/**
 * The live pack — one WebGL canvas, driven by the angle the studio owns.
 *
 * It renders on demand, not on a loop: a frame is drawn when something
 * actually changed and then the GPU goes back to sleep, so leaving this step
 * open costs nothing. Everything is torn down on unmount, because a leaked
 * WebGL context is one of the few things a browser will not forgive.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildPack, createStudio, type Studio } from './scene';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';

export default function PackageStage({
  value,
  name,
  angle,
  className = '',
}: {
  value: PackagingAnswer;
  name?: string;
  /** Degrees. 0 faces the camera. */
  angle: number;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const rig = useRef<{
    renderer: THREE.WebGLRenderer;
    studio: Studio;
    pack?: { dispose: () => void };
    draw: () => void;
  } | null>(null);

  /* --- set up once --- */
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    // Variance shadows blur properly; PCF gave a hard-edged silhouette that
    // no softbox would ever cast.
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    el.appendChild(renderer.domElement);

    const studio = createStudio(renderer);

    let queued = false;
    const draw = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderer.render(studio.scene, studio.camera);
      });
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      studio.camera.aspect = w / h;
      studio.camera.updateProjectionMatrix();
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    rig.current = { renderer, studio, draw };

    return () => {
      ro.disconnect();
      rig.current?.pack?.dispose();
      studio.dispose();
      renderer.dispose();
      // Hand the context back rather than waiting for the GC.
      renderer.forceContextLoss();
      el.removeChild(renderer.domElement);
      rig.current = null;
    };
  }, []);

  /* --- rebuild whenever the pack itself changes --- */
  useEffect(() => {
    const r = rig.current;
    if (!r) return;

    r.studio.pivot.clear();
    r.pack?.dispose();

    const built = buildPack(value, { name });
    r.pack = built;
    r.studio.pivot.add(built.group);
    r.studio.frame(built.height);
    r.draw();
  }, [value.bottle, value.cap, value.label, value.finish, value.color, name]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --- spin --- */
  useEffect(() => {
    const r = rig.current;
    if (!r) return;
    r.studio.pivot.rotation.y = (angle * Math.PI) / 180;
    r.draw();
  }, [angle]);

  return <div ref={host} className={className} />;
}
