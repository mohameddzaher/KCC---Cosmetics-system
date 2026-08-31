'use client';

/**
 * An option tile's picture — the same renderer as the big stage, taken once and
 * cached as an image.
 *
 * A live canvas per option would mean thirty WebGL contexts on one screen,
 * which browsers cap and phones hate. Instead one hidden renderer draws each
 * combination once, hands back a PNG, and the tiles are plain <img>s from then
 * on. Renders are queued one per frame so a tab full of options never blocks
 * the interaction.
 */

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { buildPack, createStudio, type Studio } from './scene';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';

const W = 220;
const H = 300;

const cache = new Map<string, string>();
const waiting = new Map<string, Array<(url: string) => void>>();
let queue: string[] = [];
let running = false;

let renderer: THREE.WebGLRenderer | null = null;
let studio: Studio | null = null;

function lab(): { renderer: THREE.WebGLRenderer; studio: Studio } {
  if (!renderer || !studio) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    studio = createStudio(renderer, { cheap: true });
    studio.camera.aspect = W / H;
  }
  return { renderer, studio };
}

const keyOf = (v: PackagingAnswer, name?: string) =>
  `${v.bottle}|${v.cap}|${v.label}|${v.finish}|${v.color}|${name || ''}`;

function drawNext() {
  const key = queue.shift();
  if (!key) {
    running = false;
    return;
  }

  const [bottle, cap, label, finish, color, name] = key.split('|');
  const { renderer: r, studio: s } = lab();

  s.pivot.clear();
  const built = buildPack({ bottle, cap, label, finish, color }, { cheap: true, name: name || undefined });
  s.pivot.add(built.group);
  // A three-quarter view reads as a solid object; dead-on reads as a sticker.
  s.pivot.rotation.y = -0.42;
  s.frame(built.height);
  r.render(s.scene, s.camera);

  const url = r.domElement.toDataURL('image/png');
  built.dispose();
  s.pivot.clear();

  cache.set(key, url);
  waiting.get(key)?.forEach((fn) => fn(url));
  waiting.delete(key);

  requestAnimationFrame(drawNext);
}

function request(key: string, done: (url: string) => void) {
  const hit = cache.get(key);
  if (hit) return done(hit);

  const list = waiting.get(key);
  if (list) {
    list.push(done);
    return;
  }
  waiting.set(key, [done]);
  queue.push(key);
  if (!running) {
    running = true;
    requestAnimationFrame(drawNext);
  }
}

export default function PackageThumb({
  value,
  name,
  alt,
  className = '',
}: {
  value: PackagingAnswer;
  name?: string;
  alt?: string;
  className?: string;
}) {
  const key = keyOf(value, name);
  const [rendered, setRendered] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    request(key, (url) => {
      // Only a completed render writes state, and only if it is not already
      // the one being shown.
      if (alive) setRendered((prev) => (prev[key] === url ? prev : { [key]: url }));
    });
    return () => {
      alive = false;
      // Drop anything still queued for a tile that has gone away.
      queue = queue.filter((k) => k !== key || waiting.has(k));
    };
  }, [key]);

  // The cache is the source of truth; state only exists to trigger a re-render
  // once an async render lands.
  const src = cache.get(key) || rendered[key] || null;

  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt || ''} className={className} draggable={false} />
  ) : (
    <span className={`block animate-pulse rounded-lg bg-cream-200/60 ${className}`} aria-hidden />
  );
}
