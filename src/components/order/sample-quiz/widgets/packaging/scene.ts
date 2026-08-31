'use client';

/**
 * The packaging renderer.
 *
 * Real geometry, real materials, real light. The pack is lathed from its
 * profile, given a physical material (a frosted bottle actually transmits light
 * and refracts what is behind it), lit by a studio environment map and shot
 * with a long lens against a curved cyclorama — the same way a product
 * photographer would set it up.
 *
 * Everything here is framework-free so it can be shared by the big stage and by
 * the option thumbnails, and so nothing three.js-shaped leaks into React.
 */

import * as THREE from 'three';
import { CAP_KIND, findProfile, type CapKind, type PackProfile } from './profiles';
import { findColor } from './shapes';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';

/* ------------------------------------------------------------------ */
/* Materials                                                           */
/* ------------------------------------------------------------------ */

interface FinishSpec {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  /** 0 = solid. Above 0 the material really transmits light. */
  transmission: number;
  ior: number;
}

const FINISH_SPEC: Record<string, FinishSpec> = {
  glossy: { roughness: 0.09, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.05, transmission: 0, ior: 1.5 },
  matte: { roughness: 0.72, metalness: 0.0, clearcoat: 0.18, clearcoatRoughness: 0.6, transmission: 0, ior: 1.5 },
  frosted: { roughness: 0.42, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.4, transmission: 0.82, ior: 1.46 },
  transparent: { roughness: 0.04, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.03, transmission: 1, ior: 1.5 },
  metallic: { roughness: 0.24, metalness: 1, clearcoat: 0.55, clearcoatRoughness: 0.18, transmission: 0, ior: 1.5 },
};

function finishSpec(v: string): FinishSpec {
  return FINISH_SPEC[v] || FINISH_SPEC.glossy;
}

/**
 * `cheap` drops transmission. A transmissive material forces three to render
 * the scene a second time into a buffer — worth it on the one big stage, waste
 * on a 200px thumbnail.
 */
function bodyMaterial(color: string, finish: string, cheap: boolean): THREE.MeshPhysicalMaterial {
  const f = finishSpec(finish);
  const transmission = cheap ? 0 : f.transmission;
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    roughness: f.roughness,
    metalness: f.metalness,
    clearcoat: f.clearcoat,
    clearcoatRoughness: f.clearcoatRoughness,
    transmission,
    thickness: transmission > 0 ? 1.6 : 0,
    ior: f.ior,
    // Without transmission a clear bottle has to fake it, or a "transparent"
    // pick would look identical to a glossy one.
    opacity: cheap && f.transmission > 0 ? 1 - f.transmission * 0.55 : 1,
    transparent: cheap && f.transmission > 0,
    envMapIntensity: 1.15,
    side: f.transmission > 0 ? THREE.DoubleSide : THREE.FrontSide,
  });
}

/** Closures are moulded, not blown — always solid, slightly softer sheen. */
function capMaterial(color: string, finish: string): THREE.MeshPhysicalMaterial {
  const f = finishSpec(finish);
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color).multiplyScalar(finish === 'metallic' ? 1 : 0.94),
    roughness: Math.min(f.roughness + 0.12, 0.9),
    metalness: f.metalness,
    clearcoat: f.clearcoat * 0.8,
    clearcoatRoughness: f.clearcoatRoughness,
    envMapIntensity: 1.05,
  });
}

/* ------------------------------------------------------------------ */
/* Label artwork                                                       */
/* ------------------------------------------------------------------ */

const labelTextures = new Map<string, THREE.CanvasTexture>();

/**
 * The label is a real texture with a real alpha channel, so "oval badge" is an
 * oval of paper on the bottle rather than a shape drawn over it.
 */
function labelTexture(kind: string, name: string | undefined): THREE.CanvasTexture | null {
  if (kind === 'none') return null;
  const key = `${kind}|${name || ''}`;
  const cached = labelTextures.get(key);
  if (cached) return cached;

  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  const paper = '#faf8f4';
  const ink = '#2b2119';
  const soft = 'rgba(43,33,25,0.45)';

  /*
   * A reminder about texture space: the width of this canvas is the whole 360°
   * of the pack, so a shape drawn 25% wide wraps a quarter of the way round and
   * ends up covering most of the face you can see. Anything meant to read as a
   * badge has to be drawn much narrower than it should look.
   */
  // Bands are drawn in texture space: y grows downward, the pack's top is y=0.
  const band = (y0: number, y1: number) => {
    g.fillStyle = paper;
    g.fillRect(0, y0 * H, W, (y1 - y0) * H);
  };

  if (kind === 'full-wrap') band(0.02, 0.98);
  else if (kind === 'band') band(0.3, 0.72);
  else if (kind === 'top-strip') band(0.06, 0.24);
  else if (kind === 'oval') {
    g.fillStyle = paper;
    g.beginPath();
    g.ellipse(W / 2, H / 2, W * 0.055, H * 0.34, 0, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'minimal') {
    g.fillStyle = soft;
    g.fillRect(W * 0.43, H * 0.62, W * 0.14, 2);
  }

  // Artwork sits at u = 0.5; the mesh is rotated so that lands facing front.
  const cx = W / 2;
  const cy = kind === 'top-strip' ? H * 0.15 : kind === 'minimal' ? H * 0.52 : H * 0.47;

  if (name) {
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `500 ${kind === 'oval' ? 26 : 54}px Georgia, "Times New Roman", serif`;
    g.fillText(name.slice(0, kind === 'oval' ? 10 : 18), cx, cy);
  }

  g.strokeStyle = soft;
  g.lineWidth = 2;
  g.beginPath();
  const ruleHalf = kind === 'oval' ? 26 : 70;
  const ruleY = cy + (kind === 'oval' ? 26 : 44);
  g.moveTo(cx - ruleHalf, ruleY);
  g.lineTo(cx + ruleHalf, ruleY);
  g.stroke();

  if (kind === 'full-wrap' || kind === 'band') {
    g.fillStyle = soft;
    g.font = '400 15px system-ui, sans-serif';
    g.fillText('SAUDI COMPANY FOR COSMETICS', cx, cy + 78);
    // A block of fine print, the detail that sells a label as printed.
    for (let i = 0; i < 5; i++) {
      const w = 150 - i * 14;
      g.fillRect(cx - w / 2, cy + 118 + i * 12, w, 3);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  labelTextures.set(key, tex);
  return tex;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** Quadratic bézier between two profile points — keeps mouldings smooth. */
function bez(a: [number, number], c: [number, number], b: [number, number], n = 12): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
    ]);
  }
  return out;
}

function latheFrom(points: Array<[number, number]>, segments = 96): THREE.LatheGeometry {
  const pts = points.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y));
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.computeVertexNormals();
  return geo;
}

/** Radius of the pack at a given height — where the label has to sit. */
function radiusAt(p: PackProfile, y: number): number {
  let best = 0;
  for (const [r, py] of p.points) if (Math.abs(py - y) < 1.2) best = Math.max(best, r);
  if (best === 0) for (const [r] of p.points) best = Math.max(best, r);
  return best;
}

function buildCap(kind: CapKind, neck: { r: number; y: number }, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  // Narrow necks take an overhanging closure; a wide-mouth jar's lid is flush.
  const r = neck.r * (neck.r > 2 ? 1.04 : 1.16);
  /** The mechanism above the collar is a stock part, whatever it screws into. */
  const m = Math.min(r, 1.5);
  const add = (geo: THREE.BufferGeometry, y = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    g.add(m);
    return m;
  };

  const collar = (h: number) =>
    latheFrom([
      [0, 0],
      [r - 0.1, 0],
      [r, 0.1],
      [r, h - 0.12],
      [r - 0.12, h],
      [0, h],
    ]);

  switch (kind) {
    case 'screw':
      add(collar(1.9));
      break;

    case 'dome': {
      // Domes are proportional: a tall dome on a wide jar looks like a toadstool.
      const h = Math.min(1.1, r * 0.42);
      const dome = Math.min(1.7, r * 0.62);
      const pts: Array<[number, number]> = [[0, 0], [r - 0.1, 0], [r, 0.1], [r, h]];
      for (let i = 1; i <= 20; i++) {
        const a = (Math.PI / 2) * (i / 20);
        pts.push([r * Math.cos(a), h + Math.sin(a) * dome]);
      }
      add(latheFrom(pts));
      break;
    }

    case 'pump': {
      add(collar(1.3));
      add(new THREE.CylinderGeometry(m * 0.26, m * 0.26, 2.3, 24), 1.3 + 1.15);
      const head = latheFrom([
        [0, 0],
        [m * 0.62, 0],
        [m * 0.66, 0.12],
        [m * 0.66, 0.72],
        [m * 0.5, 0.86],
        [0, 0.86],
      ]);
      add(head, 3.6);
      // The spout, angled the way a lotion pump's nozzle actually points.
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(m * 0.2, m * 0.24, m * 1.5, 20), mat);
      spout.rotation.z = Math.PI / 2;
      spout.position.set(m * 0.72, 3.96, 0);
      spout.castShadow = true;
      g.add(spout);
      break;
    }

    case 'sprayer': {
      add(collar(1.2));
      const head = new THREE.Mesh(new THREE.BoxGeometry(m * 1.3, 1.15, m * 1.6), mat);
      head.position.set(0, 1.2 + 0.58, m * 0.14);
      head.castShadow = true;
      g.add(head);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(m * 0.17, m * 0.17, m * 0.6, 16), mat);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.set(m * 0.85, 1.75, m * 0.14);
      g.add(nozzle);
      break;
    }

    case 'dropper': {
      add(collar(1.5));
      const bulb = latheFrom([
        [0, 0],
        [m * 0.55, 0.04],
        ...bez([m * 0.55, 0.04], [m * 0.78, 0.5], [m * 0.72, 1.25]),
        ...bez([m * 0.72, 1.25], [m * 0.66, 1.85], [0, 2.08]),
      ]);
      add(bulb, 1.55);
      // The pipette hanging down inside the bottle — visible through glass.
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(neck.r * 0.16, neck.r * 0.13, 5.4, 16),
        mat
      );
      tube.position.y = -2.9;
      g.add(tube);
      break;
    }

    case 'flip': {
      add(collar(1.5));
      const lid = latheFrom([
        [0, 0],
        [r, 0],
        [r * 0.96, 0.7],
        [r * 0.72, 0.92],
        [0, 0.92],
      ]);
      add(lid, 1.5);
      const nub = new THREE.Mesh(new THREE.BoxGeometry(m * 0.5, 0.22, m * 0.3), mat);
      nub.position.set(m * 0.6, 1.6, 0);
      g.add(nub);
      break;
    }

    case 'disc': {
      add(collar(1.5));
      const top = latheFrom([
        [0, 0],
        [r, 0],
        [r, 0.42],
        [r * 0.86, 0.56],
        [0, 0.56],
      ]);
      add(top, 1.5);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(m * 0.34, m * 0.34, 0.12, 24), mat);
      pad.scale.z = 0.62;
      pad.position.set(m * 0.34, 2.04, 0);
      g.add(pad);
      break;
    }
  }

  g.position.y = neck.y;
  return g;
}

/* ------------------------------------------------------------------ */
/* The pack                                                            */
/* ------------------------------------------------------------------ */

export interface BuildOptions {
  /** Skip the expensive bits — for thumbnails. */
  cheap?: boolean;
  /** Printed on the label. */
  name?: string;
}

export interface BuiltPack {
  group: THREE.Group;
  /** Overall height in centimetres, for framing the camera. */
  height: number;
  dispose: () => void;
}

export function buildPack(v: PackagingAnswer, opts: BuildOptions = {}): BuiltPack {
  const cheap = !!opts.cheap;
  const profile = findProfile(v.bottle);
  const color = findColor(v.color).hex;
  const finish = v.finish || 'glossy';
  const spec = finishSpec(finish);

  const group = new THREE.Group();
  const owned: Array<{ dispose: () => void }> = [];
  const keep = <T extends { dispose: () => void }>(x: T) => {
    owned.push(x);
    return x;
  };

  const bodyMat = keep(bodyMaterial(color, finish, cheap));
  const bodyGeo = keep(latheFrom(profile.points, cheap ? 48 : 112));
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // A see-through pack with nothing in it looks like an empty prop. Fill it.
  if (spec.transmission > 0.4 && !cheap) {
    const top = profile.label.y1 * 0.96;
    const inner = profile.points
      .filter(([, y]) => y <= top)
      .map(([r, y]) => [Math.max(r - 0.16, 0.001), y] as [number, number]);
    if (inner.length > 3) {
      inner.push([inner[inner.length - 1][0], top], [0, top]);
      const liquidGeo = keep(latheFrom(inner, 64));
      const liquidMat = keep(
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(color).multiplyScalar(0.85),
          roughness: 0.15,
          transmission: 0.55,
          thickness: 2.2,
          ior: 1.36,
        })
      );
      group.add(new THREE.Mesh(liquidGeo, liquidMat));
    }
  }

  if (!profile.noCap && v.cap) {
    const kind = CAP_KIND[v.cap] || 'screw';
    group.add(buildCap(kind, profile.neck, keep(capMaterial(color, finish))));
  }

  const tex = v.label && v.label !== 'none' ? labelTexture(v.label, opts.name) : null;
  if (tex) {
    const { y0, y1 } = profile.label;
    const r = radiusAt(profile, (y0 + y1) / 2) + 0.02;
    const geo = keep(
      new THREE.CylinderGeometry(r, r, y1 - y0, cheap ? 48 : 96, 1, true, -Math.PI, Math.PI * 2)
    );
    const mat = keep(
      new THREE.MeshPhysicalMaterial({
        map: tex,
        alphaMap: tex,
        transparent: true,
        roughness: 0.62,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
        // Stops the label z-fighting the body it is wrapped around.
        polygonOffset: true,
        polygonOffsetFactor: -2,
      })
    );
    const label = new THREE.Mesh(geo, mat);
    label.position.y = (y0 + y1) / 2;
    label.castShadow = false;
    group.add(label);
  }

  if (profile.squash) group.scale.set(profile.squash[0], 1, profile.squash[1]);

  const height = Math.max(...profile.points.map(([, y]) => y)) + (profile.noCap ? 0 : 2.4);

  return {
    group,
    height,
    dispose: () => owned.forEach((o) => o.dispose()),
  };
}

/* ------------------------------------------------------------------ */
/* The studio                                                          */
/* ------------------------------------------------------------------ */

export interface Studio {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Where the pack goes; spin this, not the camera. */
  pivot: THREE.Group;
  frame: (height: number) => void;
  dispose: () => void;
}

/**
 * The lighting rig, built as a room and then baked into an environment map.
 *
 * This is the part that separates a render from a photograph. A generic room
 * lights an object evenly and it comes out looking like grey plastic; a studio
 * has a small number of large, bright, rectangular sources, and it is the
 * long soft reflections of those panels running down the glass that the eye
 * reads as "this is a real bottle". So: a near-black room with three softboxes
 * in it — a tall key at front-left, a narrow rim strip behind-right, and a low
 * fill — exactly the set a product photographer would build.
 */
function studioEnvironment(): THREE.Scene {
  const env = new THREE.Scene();

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(60, 40, 60),
    new THREE.MeshStandardMaterial({ color: 0x1b1a1e, side: THREE.BackSide, roughness: 1 })
  );
  env.add(room);

  const panel = (
    w: number,
    h: number,
    intensity: number,
    pos: [number, number, number],
    look: [number, number, number] = [0, 0, 0]
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity) })
    );
    m.position.set(...pos);
    m.lookAt(...look);
    env.add(m);
  };

  // Key: a tall softbox close in on the left — the highlight that runs the
  // full height of the bottle.
  panel(11, 26, 5.2, [-13, 6, 9]);
  // Rim: a narrow strip behind and right, for the bright separating edge.
  panel(3.5, 24, 9.0, [14, 5, -7]);
  // Fill: broad and weak, low and to the front, to open up the shadow side.
  panel(22, 10, 1.1, [6, -4, 15]);
  // Overhead bounce, so the shoulder and the cap are not black.
  panel(26, 26, 1.5, [0, 19, 0], [0, 0, 0.001]);

  return env;
}

/**
 * The cyclorama: a wall that curves into the floor with no visible seam.
 *
 * Built from its own profile rather than by bending a plane, so the floor lands
 * exactly on y = 0. That matters — the first attempt bent a plane and its floor
 * ended up slightly above zero, which quietly clipped the pack's shadow in a
 * hard straight line.
 */
function cyclorama(): THREE.Mesh {
  const W = 90;
  const wall = 46;
  const floor = 44;
  const back = 22;
  const r = 13;

  // Profile in (z, y), from the top of the wall round to the front of the floor.
  const prof: Array<[number, number]> = [[-back, wall], [-back, r]];
  for (let i = 1; i <= 16; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / 16);
    prof.push([-back + r + Math.cos(a) * r, r + Math.sin(a) * r - r + r * 0 + Math.sin(a) * 0]);
  }
  // The arc above sweeps the corner; finish flat along the floor.
  prof.length = 2;
  for (let i = 1; i <= 16; i++) {
    const a = (Math.PI / 2) * (i / 16);
    prof.push([-back + r * (1 - Math.cos(a)), r * (1 - Math.sin(a))]);
  }
  prof.push([floor, 0]);

  const COLS = 10;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let j = 0; j < prof.length; j++) {
    const [z, y] = prof[j];
    for (let i = 0; i <= COLS; i++) {
      const x = -W / 2 + (W * i) / COLS;
      pos.push(x, y, z);
      uv.push(i / COLS, 1 - j / (prof.length - 1));
    }
  }
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < COLS; i++) {
      const a = j * (COLS + 1) + i;
      const b = a + 1;
      const c = a + COLS + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  // A pool of light behind the product falling off to the corners — the way a
  // lit backdrop actually reads, rather than a flat wash.
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9d8d7d';
  g.fillRect(0, 0, 256, 256);
  const grad = g.createRadialGradient(128, 74, 6, 128, 92, 132);
  grad.addColorStop(0, '#fbf7f1');
  grad.addColorStop(0.34, '#efe5d9');
  grad.addColorStop(0.74, '#c6b8a9');
  grad.addColorStop(1, '#9d8d7d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })
  );
  mesh.receiveShadow = true;
  return mesh;
}

export function createStudio(renderer: THREE.WebGLRenderer, opts: { cheap?: boolean } = {}): Studio {
  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = studioEnvironment();
  const env = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.9;
  pmrem.dispose();
  envScene.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });

  // Thumbnails sit on the tile's own background, so they get the lighting rig
  // without the cyclorama — a painted-in backdrop would box every tile.
  const bg = opts.cheap ? null : cyclorama();
  if (bg) scene.add(bg);

  // A dedicated catcher, because the contact shadow is what plants the pack on
  // a surface instead of leaving it hovering.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: opts.cheap ? 0 : 0.3 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.005;
  floor.receiveShadow = true;
  scene.add(floor);

  // Key light through a big softbox, high and to the left — the standard
  // three-quarter beauty setup.
  const key = new THREE.DirectionalLight(0xfff6ec, 2.1);
  key.position.set(-4, 30, 5);
  if (!opts.cheap) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 110;
    // Generous bounds: a shadow that runs past the edge of this box gets
    // sliced off in a dead-straight line, which is unmistakably CG.
    key.shadow.camera.left = -40;
    key.shadow.camera.right = 40;
    key.shadow.camera.top = 45;
    key.shadow.camera.bottom = -35;
    key.shadow.bias = -0.0015;
    key.shadow.radius = 5;
    key.shadow.blurSamples = 24;
  }
  scene.add(key);

  // Rim from behind-right: the bright edge that separates pack from backdrop.
  const rim = new THREE.DirectionalLight(0xffffff, 1.5);
  rim.position.set(11, 9, -12);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xf3e6da, 0.45);
  fill.position.set(7, 3, 14);
  scene.add(fill);

  // 32mm-equivalent: long enough that the pack does not bulge at the edges.
  const camera = new THREE.PerspectiveCamera(26, 1, 0.5, 200);
  const pivot = new THREE.Group();
  scene.add(pivot);

  return {
    scene,
    camera,
    pivot,
    frame: (height: number) => {
      const centre = height * 0.5;
      const dist = (height / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.5;
      // Slightly above the midline: the eye level of someone holding it.
      camera.position.set(0, centre + height * 0.05, dist);
      camera.lookAt(0, centre, 0);
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      env.dispose();
      bg?.geometry.dispose();
      if (bg) (bg.material as THREE.Material).dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
    },
  };
}

/** WebGL is not guaranteed — the SVG preview stays as the fallback. */
let webglSupport: boolean | null = null;

export function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement('canvas');
    webglSupport = !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/**
 * Support is a property of the browser, not of React state — so it is read
 * through useSyncExternalStore. The server snapshot is always `false`, which
 * makes the SVG fallback the markup that hydrates and keeps the two passes
 * identical; the canvas takes over on the client.
 */
export const webglStore = {
  subscribe: () => () => {},
  get: hasWebGL,
  server: () => false,
};
