'use client';

/**
 * Packaging shape library.
 *
 * Deliberately hand-drawn SVG rather than a WebGL/three.js scene: the whole
 * configurator stays a few kilobytes, renders instantly on a phone, and the
 * "3D" comes from a CSS perspective rotation plus a specular highlight layer.
 * Nothing here blocks the main thread.
 *
 * Every shape draws inside a 200×320 viewBox with the neck centred on x=100,
 * so bottles, caps and labels compose without per-shape offsets.
 */

import type { ReactNode } from 'react';

export interface ShapeDef {
  value: string;
  labelEn: string;
  labelAr: string;
  /** Body path drawn from the shoulder down. */
  body: ReactNode;
  /** Where the cap sits and how wide the neck is. */
  neck: { y: number; width: number };
  /** Rectangle available for the label. */
  labelArea: { x: number; y: number; w: number; h: number; rx?: number };
}

const R = (props: React.SVGProps<SVGRectElement>) => <rect {...props} />;

export const BOTTLES: ShapeDef[] = [
  {
    value: 'bottle',
    labelEn: 'Cylindrical bottle',
    labelAr: 'زجاجة أسطوانية',
    body: <path d="M62 96 Q62 84 74 78 L74 56 L126 56 L126 78 Q138 84 138 96 L138 288 Q138 302 124 302 L76 302 Q62 302 62 288 Z" />,
    neck: { y: 56, width: 52 },
    labelArea: { x: 68, y: 140, w: 64, h: 110, rx: 4 },
  },
  {
    value: 'tall-bottle',
    labelEn: 'Tall slim bottle',
    labelAr: 'زجاجة طويلة رفيعة',
    body: <path d="M72 96 Q72 82 82 76 L82 48 L118 48 L118 76 Q128 82 128 96 L128 292 Q128 304 116 304 L84 304 Q72 304 72 292 Z" />,
    neck: { y: 48, width: 36 },
    labelArea: { x: 78, y: 132, w: 44, h: 126, rx: 3 },
  },
  {
    value: 'jar',
    labelEn: 'Wide jar',
    labelAr: 'برطمان عريض',
    body: <path d="M52 132 Q52 118 66 118 L134 118 Q148 118 148 132 L148 282 Q148 298 132 298 L68 298 Q52 298 52 282 Z" />,
    neck: { y: 118, width: 96 },
    labelArea: { x: 62, y: 168, w: 76, h: 84, rx: 4 },
  },
  {
    value: 'tube',
    labelEn: 'Squeeze tube',
    labelAr: 'أنبوب ضاغط',
    body: <path d="M74 92 L74 74 L126 74 L126 92 L130 286 Q130 300 118 300 L82 300 Q70 300 70 286 Z" />,
    neck: { y: 74, width: 52 },
    labelArea: { x: 76, y: 130, w: 48, h: 128, rx: 2 },
  },
  {
    value: 'airless-pump',
    labelEn: 'Airless pump',
    labelAr: 'مضخة مفرغة',
    body: <path d="M66 104 Q66 92 78 88 L78 62 L122 62 L122 88 Q134 92 134 104 L134 286 Q134 300 120 300 L80 300 Q66 300 66 286 Z" />,
    neck: { y: 62, width: 44 },
    labelArea: { x: 72, y: 146, w: 56, h: 108, rx: 4 },
  },
  {
    value: 'dropper',
    labelEn: 'Dropper bottle',
    labelAr: 'زجاجة قطارة',
    body: <path d="M72 118 Q72 104 84 100 L84 70 L116 70 L116 100 Q128 104 128 118 L128 280 Q128 296 114 296 L86 296 Q72 296 72 280 Z" />,
    neck: { y: 70, width: 32 },
    labelArea: { x: 78, y: 156, w: 44, h: 96, rx: 3 },
  },
  {
    value: 'sachet',
    labelEn: 'Sachet',
    labelAr: 'ظرف',
    body: <path d="M58 70 L142 70 L142 296 Q142 302 136 302 L64 302 Q58 302 58 296 Z" />,
    neck: { y: 70, width: 84 },
    labelArea: { x: 66, y: 110, w: 68, h: 150, rx: 2 },
  },
  {
    value: 'gel-pump',
    labelEn: 'Gel pump',
    labelAr: 'مضخة جل',
    body: <path d="M64 118 Q64 106 76 102 L78 80 L122 80 L124 102 Q136 106 136 118 L136 292 Q136 302 126 302 L74 302 Q64 302 64 292 Z" />,
    neck: { y: 80, width: 44 },
    labelArea: { x: 72, y: 158, w: 56, h: 104, rx: 4 },
  },
  {
    value: 'roll-on',
    labelEn: 'Roll-on',
    labelAr: 'رول أون',
    body: <path d="M76 150 Q76 140 86 136 L86 112 L114 112 L114 136 Q124 140 124 150 L124 278 Q124 296 100 296 Q76 296 76 278 Z" />,
    neck: { y: 112, width: 28 },
    labelArea: { x: 82, y: 180, w: 36, h: 80, rx: 3 },
  },
  {
    value: 'vial',
    labelEn: 'Vial',
    labelAr: 'فيال',
    body: <path d="M78 178 Q78 170 88 166 L88 150 L112 150 L112 166 Q122 170 122 178 L122 286 Q122 296 112 296 L88 296 Q78 296 78 286 Z" />,
    neck: { y: 150, width: 24 },
    labelArea: { x: 83, y: 198, w: 34, h: 68, rx: 3 },
  },
  {
    value: 'serum-pump',
    labelEn: 'Serum pump',
    labelAr: 'مضخة سيروم',
    body: <path d="M78 116 Q78 102 86 96 L86 64 L114 64 L114 96 Q122 102 122 116 L122 292 Q122 302 112 302 L88 302 Q78 302 78 292 Z" />,
    neck: { y: 64, width: 28 },
    labelArea: { x: 83, y: 158, w: 34, h: 108, rx: 3 },
  },
  {
    value: 'glass-ampoule',
    labelEn: 'Glass ampoule',
    labelAr: 'أمبولة زجاجية',
    body: <path d="M100 58 L107 98 Q118 112 118 134 L118 270 Q118 290 100 290 Q82 290 82 270 L82 134 Q82 112 93 98 Z" />,
    neck: { y: 98, width: 14 },
    labelArea: { x: 86, y: 176, w: 28, h: 82, rx: 3 },
  },
  {
    value: 'pvc-ampoule',
    labelEn: 'PVC ampoule',
    labelAr: 'أمبولة بلاستيك',
    body: <path d="M100 74 Q92 90 92 104 Q78 122 78 150 L78 270 Q78 292 100 292 Q122 292 122 270 L122 150 Q122 122 108 104 Q108 90 100 74 Z" />,
    neck: { y: 104, width: 16 },
    labelArea: { x: 84, y: 180, w: 32, h: 80, rx: 3 },
  },
  {
    value: 'spray',
    labelEn: 'Spray bottle',
    labelAr: 'بخاخ',
    body: <path d="M68 108 Q68 94 80 90 L80 60 L120 60 L120 90 Q132 94 132 108 L132 288 Q132 302 118 302 L82 302 Q68 302 68 288 Z" />,
    neck: { y: 60, width: 40 },
    labelArea: { x: 74, y: 150, w: 52, h: 104, rx: 4 },
  },
];

export interface CapDef {
  value: string;
  labelEn: string;
  labelAr: string;
  /** Rendered above the neck; receives the neck geometry. */
  render: (neck: { y: number; width: number }) => ReactNode;
}

export const CAPS: CapDef[] = [
  {
    value: 'flat-cap',
    labelEn: 'Flat screw cap',
    labelAr: 'غطاء لولبي مسطح',
    render: (n) => <R x={100 - n.width / 2 - 6} y={n.y - 34} width={n.width + 12} height={36} rx={4} />,
  },
  {
    value: 'domed-cap',
    labelEn: 'Domed cap',
    labelAr: 'غطاء مقبب',
    render: (n) => (
      <path
        d={`M${100 - n.width / 2 - 6} ${n.y + 2} L${100 - n.width / 2 - 6} ${n.y - 22} Q100 ${n.y - 52} ${100 + n.width / 2 + 6} ${n.y - 22} L${100 + n.width / 2 + 6} ${n.y + 2} Z`}
      />
    ),
  },
  {
    value: 'pump',
    labelEn: 'Lotion pump',
    labelAr: 'مضخة لوشن',
    render: (n) => (
      <g>
        <R x={100 - n.width / 2 - 4} y={n.y - 26} width={n.width + 8} height={28} rx={3} />
        <R x={94} y={n.y - 62} width={12} height={38} rx={3} />
        <path d={`M78 ${n.y - 66} L112 ${n.y - 66} Q118 ${n.y - 66} 118 ${n.y - 58} L118 ${n.y - 52} L78 ${n.y - 52} Z`} />
      </g>
    ),
  },
  {
    value: 'sprayer',
    labelEn: 'Fine mist sprayer',
    labelAr: 'بخاخ رذاذ',
    render: (n) => (
      <g>
        <R x={100 - n.width / 2 - 4} y={n.y - 24} width={n.width + 8} height={26} rx={3} />
        <R x={88} y={n.y - 46} width={24} height={24} rx={4} />
        <R x={110} y={n.y - 40} width={12} height={7} rx={2} />
      </g>
    ),
  },
  {
    value: 'dropper-cap',
    labelEn: 'Dropper + bulb',
    labelAr: 'قطارة بكرة مطاطية',
    render: (n) => (
      <g>
        <R x={100 - n.width / 2 - 3} y={n.y - 24} width={n.width + 6} height={26} rx={3} />
        <path d={`M92 ${n.y - 56} Q100 ${n.y - 74} 108 ${n.y - 56} L108 ${n.y - 26} L92 ${n.y - 26} Z`} />
      </g>
    ),
  },
  {
    value: 'flip-top',
    labelEn: 'Flip-top',
    labelAr: 'غطاء قلاب',
    render: (n) => (
      <g>
        <R x={100 - n.width / 2 - 5} y={n.y - 30} width={n.width + 10} height={32} rx={4} />
        <R x={100 - n.width / 4} y={n.y - 40} width={n.width / 2} height={12} rx={3} />
      </g>
    ),
  },
  {
    value: 'disc-top',
    labelEn: 'Disc top',
    labelAr: 'غطاء قرصي',
    render: (n) => (
      <g>
        <R x={100 - n.width / 2 - 5} y={n.y - 28} width={n.width + 10} height={30} rx={5} />
        <circle cx={108} cy={n.y - 14} r={6} />
      </g>
    ),
  },
];

export interface LabelDef {
  value: string;
  labelEn: string;
  labelAr: string;
  /** Draws inside the bottle's label area. */
  render: (area: { x: number; y: number; w: number; h: number; rx?: number }) => ReactNode;
}

export const LABELS: LabelDef[] = [
  { value: 'none', labelEn: 'No label', labelAr: 'بدون ملصق', render: () => null },
  {
    value: 'full-wrap',
    labelEn: 'Full wrap',
    labelAr: 'ملصق كامل',
    render: (a) => <R x={a.x} y={a.y} width={a.w} height={a.h} rx={a.rx ?? 3} />,
  },
  {
    value: 'band',
    labelEn: 'Centre band',
    labelAr: 'شريط أوسط',
    render: (a) => <R x={a.x} y={a.y + a.h * 0.28} width={a.w} height={a.h * 0.44} rx={2} />,
  },
  {
    value: 'oval',
    labelEn: 'Oval badge',
    labelAr: 'ملصق بيضاوي',
    render: (a) => (
      <ellipse cx={a.x + a.w / 2} cy={a.y + a.h / 2} rx={a.w * 0.42} ry={a.h * 0.34} />
    ),
  },
  {
    value: 'top-strip',
    labelEn: 'Top strip',
    labelAr: 'شريط علوي',
    render: (a) => <R x={a.x} y={a.y} width={a.w} height={a.h * 0.32} rx={2} />,
  },
  {
    value: 'minimal',
    labelEn: 'Minimal line',
    labelAr: 'خط بسيط',
    render: (a) => (
      <g>
        <R x={a.x + a.w * 0.15} y={a.y + a.h * 0.42} width={a.w * 0.7} height={4} rx={2} />
        <R x={a.x + a.w * 0.3} y={a.y + a.h * 0.56} width={a.w * 0.4} height={3} rx={1.5} />
      </g>
    ),
  },
];

export interface FinishDef {
  value: string;
  labelEn: string;
  labelAr: string;
  /** 0 = fully transparent glass, 1 = fully opaque. */
  opacity: number;
  /** Strength of the specular highlight. */
  gloss: number;
}

export const FINISHES: FinishDef[] = [
  { value: 'glossy', labelEn: 'Glossy', labelAr: 'لامع', opacity: 0.95, gloss: 0.55 },
  { value: 'matte', labelEn: 'Matte', labelAr: 'مطفي', opacity: 0.97, gloss: 0.12 },
  { value: 'frosted', labelEn: 'Frosted', labelAr: 'مثلج', opacity: 0.62, gloss: 0.28 },
  { value: 'transparent', labelEn: 'Transparent', labelAr: 'شفاف', opacity: 0.28, gloss: 0.45 },
  { value: 'metallic', labelEn: 'Metallic', labelAr: 'معدني', opacity: 1, gloss: 0.8 },
];

export interface ColorDef {
  value: string;
  labelEn: string;
  labelAr: string;
  hex: string;
}

export const PACK_COLORS: ColorDef[] = [
  { value: 'pearl-white', labelEn: 'Pearl white', labelAr: 'أبيض لؤلؤي', hex: '#F7F3EE' },
  { value: 'blush', labelEn: 'Blush', labelAr: 'وردي فاتح', hex: '#E8B4BC' },
  { value: 'rose', labelEn: 'Deep rose', labelAr: 'وردي غامق', hex: '#C57E87' },
  { value: 'champagne', labelEn: 'Champagne', labelAr: 'شمبانيا', hex: '#D4A574' },
  { value: 'gold', labelEn: 'Gold', labelAr: 'ذهبي', hex: '#C9A84C' },
  { value: 'emerald', labelEn: 'Emerald', labelAr: 'زمردي', hex: '#2D6A4F' },
  { value: 'espresso', labelEn: 'Espresso', labelAr: 'بني داكن', hex: '#2F2014' },
  { value: 'onyx', labelEn: 'Onyx', labelAr: 'أسود', hex: '#1B1B24' },
  { value: 'sky', labelEn: 'Sky', labelAr: 'سماوي', hex: '#A8C8DE' },
  { value: 'sage', labelEn: 'Sage', labelAr: 'أخضر باهت', hex: '#A8B89A' },
];

export const DEFAULTS = {
  bottle: BOTTLES[0].value,
  cap: CAPS[0].value,
  label: LABELS[1].value,
  finish: FINISHES[0].value,
  color: PACK_COLORS[0].value,
};

/** Every option the admin can enable should resolve; unknown keys fall back to
 *  the plain cylindrical bottle so nothing ever renders blank. */
export function findBottle(v: string) {
  return BOTTLES.find((b) => b.value === v) || BOTTLES[0];
}

/** Values the shape library can actually draw — used to warn in the admin. */
export const KNOWN_BOTTLE_VALUES = BOTTLES.map((b) => b.value);
export function findCap(v: string) {
  return CAPS.find((c) => c.value === v) || CAPS[0];
}
export function findLabel(v: string) {
  return LABELS.find((l) => l.value === v) || LABELS[1];
}
export function findFinish(v: string) {
  return FINISHES.find((f) => f.value === v) || FINISHES[0];
}
export function findColor(v: string) {
  return PACK_COLORS.find((c) => c.value === v) || PACK_COLORS[0];
}
