/**
 * Pack silhouettes, as lathe profiles.
 *
 * The SVG version drew a flat outline and faked depth with gradients. This
 * describes the real thing: the curve you would spin on a lathe to make the
 * bottle. Three.js revolves it into actual geometry, so the shading, the
 * reflections and the way the light travels round the shoulder are computed
 * rather than painted — which is the difference between "a drawing of a bottle"
 * and a product shot.
 *
 * Units are centimetres, measured from the base at y = 0, so the packs sit next
 * to each other at honest relative sizes: a 6 cm vial really is half the height
 * of a 14 cm bottle.
 */

/** A point on the silhouette: [distance from the axis, height]. */
export type Pt = [number, number];

export interface PackProfile {
  value: string;
  /** Silhouette from the base up to the mouth. */
  points: Pt[];
  /** Where a closure sits — the radius of the neck and the height of its face. */
  neck: { r: number; y: number };
  /** The height band a label wraps around. */
  label: { y0: number; y1: number };
  /** Packs that are not round: [x, z] multipliers applied after lathing. */
  squash?: [number, number];
  /** Pouches and ampoules that take no separate closure. */
  noCap?: boolean;
}

/* ------------------------------------------------------------------ */
/* Curve helpers                                                       */
/* ------------------------------------------------------------------ */

/** Quadratic bézier from `a` to `b`, pulled toward `c`. Excludes `a`. */
function quad(a: Pt, c: Pt, b: Pt, n = 16): Pt[] {
  const out: Pt[] = [];
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

/** The rounded bottom edge — a hard corner here reads as a cartoon. */
function base(r: number, f = 0.3): Pt[] {
  const out: Pt[] = [[0, 0], [Math.max(r - f, 0), 0]];
  for (let i = 1; i <= 8; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 8);
    out.push([r - f + Math.cos(a) * f, f + Math.sin(a) * f]);
  }
  return out;
}

/** The thread lip and the closing point on the axis. */
function mouth(r: number, y: number, lip = 0.14): Pt[] {
  return [
    [r, y],
    [r + lip, y + 0.04],
    [r + lip, y + 0.26],
    [r, y + 0.32],
    [r - 0.06, y + 0.36],
    [0, y + 0.36],
  ];
}

/* ------------------------------------------------------------------ */
/* The packs                                                           */
/* ------------------------------------------------------------------ */

export const PROFILES: PackProfile[] = [
  {
    value: 'bottle',
    points: [
      ...base(2.6, 0.32),
      [2.6, 10.6],
      ...quad([2.6, 10.6], [2.6, 12.3], [1.15, 12.9]),
      [1.15, 14.0],
      ...mouth(1.15, 14.0),
    ],
    neck: { r: 1.15, y: 12.9 },
    label: { y0: 2.4, y1: 9.4 },
  },
  {
    value: 'tall-bottle',
    points: [
      ...base(2.0, 0.26),
      [2.0, 13.0],
      ...quad([2.0, 13.0], [2.0, 14.9], [0.95, 15.4]),
      [0.95, 16.6],
      ...mouth(0.95, 16.6),
    ],
    neck: { r: 0.95, y: 15.4 },
    label: { y0: 2.8, y1: 12.0 },
  },
  {
    value: 'jar',
    points: [
      ...base(3.5, 0.38),
      [3.5, 5.6],
      ...quad([3.5, 5.6], [3.5, 6.6], [3.05, 6.9]),
      [3.05, 7.2],
      ...mouth(3.05, 7.2, 0.18),
    ],
    neck: { r: 3.05, y: 6.9 },
    label: { y0: 1.4, y1: 4.9 },
  },
  {
    value: 'tube',
    // Oval in section, the way a squeeze tube actually is.
    points: [
      ...base(2.2, 0.45),
      [2.24, 5.0],
      [2.2, 9.2],
      ...quad([2.2, 9.2], [2.2, 11.3], [1.0, 11.9]),
      [1.0, 13.0],
      ...mouth(1.0, 13.0, 0.1),
    ],
    neck: { r: 1.0, y: 11.9 },
    label: { y0: 1.6, y1: 8.6 },
    squash: [1.06, 0.82],
  },
  {
    value: 'spray',
    points: [
      ...base(2.35, 0.3),
      [2.35, 10.8],
      ...quad([2.35, 10.8], [2.35, 12.2], [1.05, 12.6]),
      [1.05, 13.7],
      ...mouth(1.05, 13.7, 0.1),
    ],
    neck: { r: 1.05, y: 12.6 },
    label: { y0: 2.2, y1: 9.6 },
  },
  {
    value: 'gel-pump',
    // Square-shouldered — the giveaway of a moulded HDPE pump bottle.
    points: [
      ...base(2.75, 0.22),
      [2.75, 11.4],
      [2.72, 11.75],
      ...quad([2.72, 11.75], [2.55, 12.45], [1.25, 12.6]),
      [1.25, 13.7],
      ...mouth(1.25, 13.7, 0.12),
    ],
    neck: { r: 1.25, y: 12.6 },
    label: { y0: 2.4, y1: 10.2 },
  },
  {
    value: 'roll-on',
    points: [
      ...base(1.65, 0.32),
      [1.65, 6.4],
      ...quad([1.65, 6.4], [1.65, 7.9], [0.85, 8.3]),
      [0.85, 9.0],
      ...mouth(0.85, 9.0, 0.1),
    ],
    neck: { r: 0.85, y: 8.3 },
    label: { y0: 1.4, y1: 5.6 },
  },
  {
    value: 'dropper',
    points: [
      ...base(1.55, 0.24),
      [1.55, 6.2],
      ...quad([1.55, 6.2], [1.55, 7.5], [0.78, 7.9]),
      [0.78, 8.9],
      ...mouth(0.78, 8.9, 0.1),
    ],
    neck: { r: 0.78, y: 7.9 },
    label: { y0: 1.3, y1: 5.4 },
  },
  {
    value: 'vial',
    points: [
      ...base(1.05, 0.16),
      [1.05, 4.4],
      ...quad([1.05, 4.4], [1.05, 5.05], [0.62, 5.2]),
      [0.62, 5.85],
      ...mouth(0.62, 5.85, 0.14),
    ],
    neck: { r: 0.62, y: 5.2 },
    label: { y0: 0.9, y1: 3.9 },
  },
  {
    value: 'serum-pump',
    points: [
      ...base(1.75, 0.22),
      [1.75, 9.6],
      ...quad([1.75, 9.6], [1.75, 11.1], [0.9, 11.4]),
      [0.9, 12.4],
      ...mouth(0.9, 12.4, 0.1),
    ],
    neck: { r: 0.9, y: 11.4 },
    label: { y0: 2.0, y1: 8.6 },
  },
  {
    value: 'glass-ampoule',
    // A spindle: rounded at the foot, drawn out to a sealed tip.
    points: [
      [0, 0],
      ...quad([0, 0], [1.0, 0], [1.0, 0.95], 12),
      [1.0, 6.0],
      ...quad([1.0, 6.0], [1.0, 7.6], [0.34, 8.3]),
      [0.34, 9.4],
      ...quad([0.34, 9.4], [0.34, 9.95], [0, 9.95], 8),
    ],
    neck: { r: 0.34, y: 8.3 },
    label: { y0: 1.4, y1: 5.4 },
    noCap: true,
  },
  {
    value: 'pvc-ampoule',
    points: [
      [0, 0],
      ...quad([0, 0], [1.35, 0], [1.35, 1.45], 12),
      [1.35, 4.4],
      ...quad([1.35, 4.4], [1.35, 6.1], [0.5, 6.7]),
      [0.5, 7.5],
      ...quad([0.5, 7.5], [0.5, 8.0], [0, 8.0], 8),
    ],
    neck: { r: 0.5, y: 6.7 },
    label: { y0: 1.3, y1: 4.0 },
    noCap: true,
  },
  {
    value: 'sachet',
    // Lathed then flattened: a pillow pouch, not a bottle.
    points: [
      [0, 0],
      ...quad([0, 0], [2.9, 0], [2.9, 1.2], 10),
      [2.9, 10.2],
      ...quad([2.9, 10.2], [2.9, 11.4], [1.6, 11.6]),
      ...quad([1.6, 11.6], [0.8, 11.7], [0, 11.7], 8),
    ],
    neck: { r: 1.6, y: 11.6 },
    label: { y0: 1.6, y1: 9.6 },
    squash: [1.08, 0.3],
    noCap: true,
  },
];

export function findProfile(value: string): PackProfile {
  return PROFILES.find((p) => p.value === value) || PROFILES[0];
}

/* ------------------------------------------------------------------ */
/* Closures                                                            */
/* ------------------------------------------------------------------ */

export type CapKind = 'screw' | 'dome' | 'pump' | 'sprayer' | 'dropper' | 'flip' | 'disc';

export const CAP_KIND: Record<string, CapKind> = {
  'flat-cap': 'screw',
  'domed-cap': 'dome',
  pump: 'pump',
  sprayer: 'sprayer',
  'dropper-cap': 'dropper',
  'flip-top': 'flip',
  'disc-top': 'disc',
};
