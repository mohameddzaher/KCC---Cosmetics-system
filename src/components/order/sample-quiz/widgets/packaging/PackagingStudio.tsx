'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PackagingAnswer } from '@/lib/sample-quiz/types';
import type { PackagingParts, PackagingPart } from '@/lib/sample-quiz/flow';
import PackagePreview from './PackagePreview';
import PackageStage from './PackageStage';
import PackageThumb from './PackageThumb';
import { webglStore } from './scene';
import { BOTTLES, CAPS, LABELS, FINISHES, PACK_COLORS, DEFAULTS } from './shapes';

type TabKey = 'bottle' | 'cap' | 'label' | 'finish' | 'color';

/**
 * Packaging configurator — a product shot the customer can turn in their hands.
 *
 * Rotation is a real 360°: drag (or arrow-key) past a quarter turn and the
 * render shows the back of the pack, where the label is not printed. The
 * lighting in PackagePreview is driven by the same angle, so the specular band
 * sweeps across the surface as it turns instead of the whole thing just
 * skewing.
 *
 * All SVG — no WebGL — so it stays instant on a phone and adds nothing to the
 * bundle beyond this file.
 */
export default function PackagingStudio({
  value,
  onChange,
  customerName,
  restrictBottles,
  parts,
}: {
  value: PackagingAnswer;
  onChange: (patch: Partial<PackagingAnswer>) => void;
  customerName?: string;
  /** Option values the admin allowed for this product; empty = all. */
  restrictBottles?: string[];
  /**
   * Admin configuration for the cap / label / finish / colour tabs. Each is a
   * normal spec in the admin panel; a spec that is disabled there loses its tab
   * here, and its allowed options are the only ones offered.
   */
  parts?: PackagingParts;
}) {
  const { t, pick } = useLanguage();
  const [tab, setTab] = useState<TabKey>('bottle');
  /** Degrees, 0 = facing the viewer. Wraps at 360. */
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const webgl = useSyncExternalStore(webglStore.subscribe, webglStore.get, webglStore.server);
  const drag = useRef<{ startX: number; startAngle: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);


  const bottles = useMemo(
    () => (restrictBottles?.length ? BOTTLES.filter((b) => restrictBottles.includes(b.value)) : BOTTLES),
    [restrictBottles]
  );
  const caps = useMemo(() => applyPart(CAPS, parts?.cap), [parts?.cap]);
  const labels = useMemo(() => applyPart(LABELS, parts?.label), [parts?.label]);
  const finishes = useMemo(() => applyPart(FINISHES, parts?.finish), [parts?.finish]);
  const colors = useMemo(() => applyPart(PACK_COLORS, parts?.color), [parts?.color]);

  /* Never show a part the admin switched off: fall back to the default while it
     is still allowed, otherwise to the first option that survived. */
  const current: PackagingAnswer = {
    bottle: settle(value.bottle, DEFAULTS.bottle, bottles),
    cap: settle(value.cap, DEFAULTS.cap, caps),
    label: settle(value.label, DEFAULTS.label, labels),
    finish: settle(value.finish, DEFAULTS.finish, finishes),
    color: settle(value.color, DEFAULTS.color, colors),
  };

  const norm = ((angle % 360) + 360) % 360;
  /** Past a quarter turn the far side faces us — the print is not visible. */
  const showingBack = norm > 100 && norm < 260;
  /** −1 … 1 across a half turn; drives where the highlight sits. */
  const lightPhase = Math.sin((norm * Math.PI) / 180);
  /** Perspective yaw; mirrored past 90° so the silhouette reads correctly. */
  const yaw = Math.sin((norm * Math.PI) / 180) * 34;
  const flipped = norm > 90 && norm < 270;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drag.current = { startX: e.clientX, startAngle: angle };
      setIsDragging(true);
    },
    [angle]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    setAngle(drag.current.startAngle + dx * 0.9); // ≈400px of travel per turn
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
    setIsDragging(false);
  }, []);

  // Keyboard rotation, so the preview is not mouse-only.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setAngle((a) => a - 15);
      else if (e.key === 'ArrowRight') setAngle((a) => a + 15);
      else return;
      e.preventDefault();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, []);

  /* A tab exists only if the admin left something to choose in it. The bottle
     is the pack, so it is always offered. */
  const TABS = [
    { key: 'bottle' as TabKey, label: t('quiz.packaging.bottle'), count: bottles.length },
    { key: 'cap' as TabKey, label: partLabel(parts?.cap, t('quiz.packaging.cap'), pick), count: caps.length },
    { key: 'label' as TabKey, label: partLabel(parts?.label, t('quiz.packaging.label'), pick), count: labels.length },
    { key: 'finish' as TabKey, label: partLabel(parts?.finish, t('quiz.packaging.finish'), pick), count: finishes.length },
    { key: 'color' as TabKey, label: partLabel(parts?.color, t('quiz.packaging.color'), pick), count: colors.length },
  ].filter((tb) => tb.key === 'bottle' || tb.count > 0);

  // If the admin disables the tab the customer is standing on, fall back to the
  // bottle rather than showing them an empty panel. Derived, not stored — the
  // tab they picked stays picked in case the option comes back.
  const activeTab: TabKey = TABS.some((tb) => tb.key === tab) ? tab : 'bottle';

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8">
      {/* ------------------------------ Stage ------------------------------ */}
      <div className="lg:sticky lg:top-40 lg:self-start">
        <div
          ref={stageRef}
          tabIndex={0}
          role="img"
          aria-label={`${t('quiz.packaging.title')} — ${Math.round(norm)}°`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="pkg-stage relative flex h-[24rem] touch-none select-none items-center justify-center overflow-hidden rounded-3xl border border-cream-300 shadow-soft-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kcc-rose-dark sm:h-[30rem]"
          style={{ perspective: '1100px', cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {webgl ? (
            <PackageStage
              value={current}
              name={showingBack ? undefined : customerName}
              angle={angle}
              className="h-full w-full"
            />
          ) : (
            // No WebGL — the hand-drawn preview still answers the question.
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                transform: `rotateY(${yaw}deg) scaleX(${flipped ? -1 : 1})`,
                transformStyle: 'preserve-3d',
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <PackagePreview
                scene
                value={{ ...current, label: showingBack ? 'none' : current.label }}
                name={showingBack ? undefined : customerName}
                spin={lightPhase}
                className="h-full w-auto max-w-full"
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-3">
            <span className="rounded-full bg-black/35 px-2.5 py-1 font-mono text-[10px] text-white backdrop-blur-sm">
              {Math.round(norm)}°
            </span>
          </div>

          <div className="absolute end-3 top-3 flex flex-col gap-1.5">
            <StageButton onClick={() => setAngle((a) => a - 45)} label={t('quiz.packaging.rotateLeft')}>
              <RotateCcw size={14} />
            </StageButton>
            <StageButton onClick={() => setAngle((a) => a + 45)} label={t('quiz.packaging.rotateRight')}>
              <RotateCw size={14} />
            </StageButton>
          </div>
        </div>

        <p className="mt-2.5 text-center text-xs text-cream-700">{t('quiz.packaging.rotateHint')}</p>
      </div>

      {/* ----------------------------- Pickers ----------------------------- */}
      <div className="min-w-0">
        <div
          role="tablist"
          aria-label={t('quiz.packaging.title')}
          className="scroll-thin mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-cream-300 bg-surface p-1"
        >
          {TABS.map((tb) => {
            const active = activeTab === tb.key;
            return (
              <button
                key={tb.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setTab(tb.key)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-surface-inverse text-fg-inverse' : 'text-cream-800 hover:bg-cream-100'
                }`}
              >
                {tb.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'bottle' && (
          <ThumbGrid>
            {bottles.map((b) => (
              <Thumb
                key={b.value}
                active={current.bottle === b.value}
                label={pick(b.labelEn, b.labelAr)}
                onClick={() => onChange({ bottle: b.value })}
              >
                <PackageThumb
                  value={{ ...current, bottle: b.value, label: 'none' }}
                  alt=""
                  className="h-24 w-full object-contain"
                />
              </Thumb>
            ))}
          </ThumbGrid>
        )}

        {activeTab === 'cap' && (
          <ThumbGrid>
            {caps.map((c) => (
              <Thumb
                key={c.value}
                active={current.cap === c.value}
                label={pick(c.labelEn, c.labelAr)}
                onClick={() => onChange({ cap: c.value })}
              >
                <PackageThumb
                  value={{ ...current, cap: c.value, label: 'none' }}
                  alt=""
                  className="h-24 w-full object-contain"
                />
              </Thumb>
            ))}
          </ThumbGrid>
        )}

        {activeTab === 'label' && (
          <ThumbGrid>
            {labels.map((l) => (
              <Thumb
                key={l.value}
                active={current.label === l.value}
                label={pick(l.labelEn, l.labelAr)}
                onClick={() => onChange({ label: l.value })}
              >
                <PackageThumb
                  value={{ ...current, label: l.value }}
                  name={customerName}
                  alt=""
                  className="h-24 w-full object-contain"
                />
              </Thumb>
            ))}
          </ThumbGrid>
        )}

        {activeTab === 'finish' && (
          <ThumbGrid>
            {finishes.map((f) => (
              <Thumb
                key={f.value}
                active={current.finish === f.value}
                label={pick(f.labelEn, f.labelAr)}
                onClick={() => onChange({ finish: f.value })}
              >
                <PackageThumb
                  value={{ ...current, finish: f.value }}
                  alt=""
                  className="h-24 w-full object-contain"
                />
              </Thumb>
            ))}
          </ThumbGrid>
        )}

        {activeTab === 'color' && (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(6rem, 100%), 1fr))' }}
          >
            {colors.map((c) => {
              const active = current.color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ color: c.value })}
                  className="flex flex-col items-center gap-2"
                >
                  <span
                    className={`h-14 w-14 rounded-full shadow-soft transition-all ${
                      active ? 'ring-[3px] ring-fg ring-offset-4 ring-offset-cream-50' : 'ring-1 ring-cream-400'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.8), transparent 46%), ${c.hex}`,
                    }}
                  />
                  <span
                    className={`text-center text-[11px] leading-tight ${
                      active ? 'font-semibold text-ink-800' : 'text-cream-800'
                    }`}
                  >
                    {pick(c.labelEn, c.labelAr)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Narrows a code-level shape list to what the admin enabled, and lets an
 * admin-authored label win over the built-in one. An empty `allowed` means
 * "everything", matching how every other spec reads its allowedOptions.
 */
function applyPart<T extends { value: string; labelEn: string; labelAr: string }>(
  defs: T[],
  part: PackagingPart | undefined
): T[] {
  if (!part) return [];
  const allowed = part.allowed?.length ? new Set(part.allowed) : null;
  return defs
    .filter((d) => !allowed || allowed.has(d.value))
    .map((d) => {
      const authored = part.options.find((o) => o.value === d.value);
      if (!authored) return d;
      return { ...d, labelEn: authored.labelEn || d.labelEn, labelAr: authored.labelAr || d.labelAr };
    });
}

/** The admin's question title doubles as the tab name when they set one. */
function partLabel(
  part: PackagingPart | undefined,
  fallback: string,
  pick: (en?: string, ar?: string) => string
): string {
  const authored = pick(part?.title, part?.titleAr);
  return authored || fallback;
}

function settle(
  chosen: string | undefined,
  fallback: string,
  list: Array<{ value: string }>
): string {
  if (list.length === 0) return chosen || fallback;
  if (chosen && list.some((d) => d.value === chosen)) return chosen;
  if (list.some((d) => d.value === fallback)) return fallback;
  return list[0].value;
}

function StageButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="rounded-full border border-white/40 bg-white/70 p-2 text-espresso-700 backdrop-blur-sm transition-colors hover:bg-white"
    >
      {children}
    </button>
  );
}

function ThumbGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-2.5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(8rem, 100%), 1fr))' }}
    >
      {children}
    </div>
  );
}

function Thumb({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-2.5 transition-all hover:-translate-y-0.5 ${
        active
          ? 'border-fg bg-cream-100 shadow-soft-lg'
          : 'border-cream-300 bg-surface shadow-soft hover:border-ink-700'
      }`}
    >
      <span className="w-full rounded-lg bg-cream-100 py-1">{children}</span>
      <span
        className={`text-center text-[11px] leading-tight ${
          active ? 'font-semibold text-ink-800' : 'text-cream-800'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
