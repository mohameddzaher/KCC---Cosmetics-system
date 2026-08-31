'use client';

import { useId } from 'react';
import { findBottle, findCap, findColor, findFinish, findLabel } from './shapes';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';

/**
 * Photoreal-ish package render, built entirely from SVG.
 *
 * Why not three.js: a WebGL scene costs ~600 KB, a GPU context and a model per
 * bottle. This gets the same read for a few kB and repaints instantly on every
 * click, which is what makes the configurator feel live.
 *
 * The realism comes from stacking the things a studio photo actually has:
 *   1. a soft gradient backdrop with a horizon line (seamless sweep)
 *   2. a contact shadow plus a cast shadow that leans with the rotation
 *   3. a body gradient with a darker rim on the far side (curvature)
 *   4. a wide vertical specular band and a thin hot highlight, both of which
 *      travel across the surface as the object turns
 *   5. a bounce-light strip on the shadow side
 *   6. glass depth: the far wall showing through on translucent finishes
 *   7. a printed label with a subtle inner shadow where it wraps
 */
export default function PackagePreview({
  value,
  name,
  className = '',
  spin = 0,
  scene = false,
}: {
  value: PackagingAnswer;
  name?: string;
  className?: string;
  /** -1 … 1 — how far the viewer has turned the object. */
  spin?: number;
  /** Draw the studio backdrop and cast shadow (off for small thumbnails). */
  scene?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const bottle = findBottle(value.bottle);
  const cap = findCap(value.cap);
  const label = findLabel(value.label);
  const finish = findFinish(value.finish);
  const color = findColor(value.color);

  const id = (n: string) => `${n}-${uid}`;

  // Light stays fixed; the object turns beneath it. Everything below is driven
  // by `t`, so the whole render reacts coherently to the drag.
  const t = Math.max(-1, Math.min(1, spin));
  const highlight = 0.42 - t * 0.3;          // specular band centre (0…1)
  const rimDark = 0.5 + t * 0.42;            // where the curvature darkens
  const shadowSkew = -t * 26;                // cast shadow leans away from light
  const shadowWidth = 1 + Math.abs(t) * 0.22;

  const opaque = finish.opacity;
  const gloss = finish.gloss;

  return (
    <svg
      viewBox="0 0 200 340"
      className={className}
      role="img"
      aria-label={`${bottle.labelEn}, ${cap.labelEn}, ${label.labelEn}, ${finish.labelEn}, ${color.labelEn}`}
    >
      <defs>
        {/* ---------- body ---------- */}
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color.hex} stopOpacity={opaque * 0.55} />
          <stop offset={`${Math.max(6, highlight * 100 - 18)}%`} stopColor={color.hex} stopOpacity={opaque * 0.9} />
          <stop offset={`${highlight * 100}%`} stopColor={color.hex} stopOpacity={opaque} />
          <stop offset={`${rimDark * 100}%`} stopColor={color.hex} stopOpacity={opaque * 0.82} />
          <stop offset="100%" stopColor="#000000" stopOpacity={opaque * 0.28} />
        </linearGradient>

        {/* far wall seen through a translucent body */}
        <linearGradient id={id('inner')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000000" stopOpacity={(1 - opaque) * 0.22} />
          <stop offset="55%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity={(1 - opaque) * 0.3} />
        </linearGradient>

        {/* wide specular band */}
        <linearGradient id={id('spec')} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${Math.max(0, highlight * 100 - 20)}%`} stopColor="#fff" stopOpacity="0" />
          <stop offset={`${highlight * 100}%`} stopColor="#fff" stopOpacity={gloss * 0.85} />
          <stop offset={`${Math.min(100, highlight * 100 + 20)}%`} stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* thin hot line inside the band */}
        <linearGradient id={id('hot')} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${Math.max(0, highlight * 100 - 4)}%`} stopColor="#fff" stopOpacity="0" />
          <stop offset={`${highlight * 100}%`} stopColor="#fff" stopOpacity={gloss} />
          <stop offset={`${Math.min(100, highlight * 100 + 4)}%`} stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* bounce light on the shadow side */}
        <linearGradient id={id('bounce')} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${Math.max(0, rimDark * 100 + 4)}%`} stopColor="#fff" stopOpacity="0" />
          <stop offset={`${Math.min(100, rimDark * 100 + 16)}%`} stopColor="#fff" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>

        {/* vertical falloff: shoulder catches light, base sits in shadow */}
        <linearGradient id={id('vert')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="24%" stopColor="#fff" stopOpacity="0" />
          <stop offset="78%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id={id('cap')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color.hex} stopOpacity="0.62" />
          <stop offset={`${highlight * 100}%`} stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset={`${rimDark * 100}%`} stopColor={color.hex} stopOpacity="1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </linearGradient>

        <linearGradient id={id('labelShade')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#000" stopOpacity="0.14" />
          <stop offset={`${highlight * 100}%`} stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>

        <filter id={id('blur')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id={id('softblur')} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        <clipPath id={id('clip')}>{bottle.body}</clipPath>
      </defs>

      {/* Cast shadow on the stage floor — leans away from the light as the
          object turns. The sweep itself is painted by `.pkg-stage` in CSS so
          it fills the whole panel rather than the SVG's aspect-fitted box. */}
      {scene && (
        <ellipse
          cx="100"
          cy="309"
          rx={54 * shadowWidth}
          ry="11"
          fill="#3A2E24"
          opacity="0.22"
          filter={`url(#${id('blur')})`}
          transform={`skewX(${shadowSkew})`}
          style={{ transformOrigin: '100px 309px' }}
        />
      )}

      {/* tight contact shadow keeps the object grounded */}
      <ellipse
        cx="100"
        cy="306"
        rx="40"
        ry="5.5"
        fill="#2F2014"
        opacity="0.32"
        filter={`url(#${id('softblur')})`}
      />

      {/* ---------------- cap ---------------- */}
      <g fill={`url(#${id('cap')})`} stroke="#2F2014" strokeOpacity="0.32" strokeWidth="0.9">
        {cap.render(bottle.neck)}
      </g>

      {/* ---------------- body ---------------- */}
      <g>
        <g fill={`url(#${id('body')})`} stroke="#2F2014" strokeOpacity="0.34" strokeWidth="1.1">
          {bottle.body}
        </g>

        <g clipPath={`url(#${id('clip')})`}>
          {/* liquid / far wall visible through translucent walls */}
          <rect x="0" y="0" width="200" height="340" fill={`url(#${id('inner')})`} />
          <rect x="0" y="0" width="200" height="340" fill={`url(#${id('vert')})`} />

          {/* ---------------- label ---------------- */}
          {label.value !== 'none' && (
            <g>
              <g fill="#FFFDF9" opacity="0.97" stroke="#2F2014" strokeOpacity="0.16" strokeWidth="0.7">
                {label.render(bottle.labelArea)}
              </g>
              {name && (
                <text
                  x={bottle.labelArea.x + bottle.labelArea.w / 2}
                  y={bottle.labelArea.y + bottle.labelArea.h / 2 + 3}
                  textAnchor="middle"
                  className="font-serif"
                  fontSize="12"
                  letterSpacing="0.5"
                  fill="#2F2014"
                  opacity="0.85"
                >
                  {name.slice(0, 14)}
                </text>
              )}
              {/* the label wraps with the bottle, so it picks up the same shading */}
              <g opacity="0.9">
                <rect
                  x={bottle.labelArea.x}
                  y={bottle.labelArea.y}
                  width={bottle.labelArea.w}
                  height={bottle.labelArea.h}
                  fill={`url(#${id('labelShade')})`}
                />
              </g>
            </g>
          )}

          {/* ---------------- light ---------------- */}
          <rect x="0" y="0" width="200" height="340" fill={`url(#${id('spec')})`} />
          <rect x="0" y="0" width="200" height="340" fill={`url(#${id('hot')})`} />
          <rect x="0" y="0" width="200" height="340" fill={`url(#${id('bounce')})`} />
        </g>
      </g>
    </svg>
  );
}
