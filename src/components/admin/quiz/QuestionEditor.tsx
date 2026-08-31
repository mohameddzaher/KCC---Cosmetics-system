'use client';

/**
 * Question editor.
 *
 * Replaces the old one-long-column form. The work is split into four labelled
 * sections down the left, with a live customer-eye preview pinned to the right
 * on wide screens (it drops below the form on narrow ones). Every label comes
 * from the dictionary, so the whole editor flips to Arabic with the UI.
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, Copy, Image as ImageIcon, Type, ListChecks, SlidersHorizontal, Eye } from 'lucide-react';
import { SortableList } from '@/components/admin/SortableList';
import {
  ArabicInput, ArabicTextArea, Badge, Button, Field, Modal, SectionTitle,
  Select, TextArea, TextInput, Toggle, ErrorNote,
} from '@/components/admin/ui';
import {
  WIDGET_ORDER, WIDGETS_WITH_OPTIONS, autoOptionValue,
  type AdminBriefOption, type AdminBriefQuestion, type BriefQuestionWidget,
} from './types';
import QuestionPreview from './QuestionPreview';
import { useLanguage } from '@/contexts/LanguageContext';

type EditableOption = AdminBriefOption & { __rid: string };

const rid = () => Math.random().toString(36).slice(2, 10);

type TabKey = 'content' | 'answer' | 'choices' | 'logic';

export default function QuestionEditor({
  open,
  initial,
  siblings,
  onClose,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  initial: AdminBriefQuestion;
  /** Other questions in the same scope (+ the general brief) — used for conditions. */
  siblings: AdminBriefQuestion[];
  onClose: () => void;
  onSave: (q: AdminBriefQuestion) => void;
  saving: boolean;
  error: string | null;
}) {
  const { t, locale, tx } = useLanguage();
  const [tab, setTab] = useState<TabKey>('content');
  const [q, setQ] = useState<Omit<AdminBriefQuestion, 'options'> & { options: EditableOption[] }>(() => ({
    ...initial,
    conditions: initial.conditions || [],
    options: (initial.options || []).map((o) => ({ ...o, __rid: rid() })),
  }));

  function update<K extends keyof typeof q>(key: K, value: (typeof q)[K]) {
    setQ((prev) => ({ ...prev, [key]: value }));
  }

  function addOption() {
    update('options', [...q.options, { value: '', labelEn: '', __rid: rid() }]);
    setTab('choices');
  }
  function patchOption(idx: number, patch: Partial<AdminBriefOption>) {
    const next = [...q.options];
    next[idx] = { ...next[idx], ...patch };
    update('options', next);
  }
  function removeOption(idx: number) {
    update('options', q.options.filter((_, i) => i !== idx));
  }
  function duplicateOption(idx: number) {
    const src = q.options[idx];
    const next = [...q.options];
    next.splice(idx + 1, 0, { ...src, __rid: rid(), value: '' });
    update('options', next);
  }

  const showOptions = WIDGETS_WITH_OPTIONS.includes(q.widget);
  const isUpload = q.widget === 'upload';
  const isCheckList = q.widget === 'checkbox-list';
  const showMaxSelect = q.widget === 'chips-multi' || isCheckList;
  const showDescription = q.widget === 'cards' || q.widget === 'checkbox-list' || isUpload;
  const showImage = q.widget === 'image-cards';

  const canSave = q.titleEn.trim().length > 0 && !saving;

  function handleSave() {
    if (!canSave) return;
    const seen: string[] = [];
    const cleanOptions: AdminBriefOption[] = q.options.map((opt) => {
      const { __rid, ...rest } = opt;
      void __rid;
      const value = rest.value || autoOptionValue(rest.labelEn, seen);
      seen.push(value);
      return { ...rest, value };
    });
    onSave({ ...q, options: cleanOptions, conditions: q.conditions || [] });
  }

  const previewQuestion: AdminBriefQuestion = useMemo(
    () => ({ ...q, options: q.options.map(({ __rid, ...o }) => { void __rid; return o; }) }),
    [q]
  );

  const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: string }> = [
    { key: 'content', label: t('admin.questionEn').split('(')[0].trim(), icon: Type },
    { key: 'answer', label: t('admin.answerType'), icon: SlidersHorizontal },
    ...(showOptions
      ? [{ key: 'choices' as TabKey, label: t('admin.choices'), icon: ListChecks, badge: String(q.options.length) }]
      : []),
    { key: 'logic', label: t('admin.conditions'), icon: Eye },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={initial._id ? t('admin.editQuestion') : t('admin.addQuestion')}
      subtitle={q.questionKey ? `${t('admin.questionKeyLabel')}: ${q.questionKey}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('ui.cancel')}
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!canSave}>
            {saving ? t('admin.saving') : t('ui.save')}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-7">
        {/* ------------------------------- Form ------------------------------ */}
        <div className="min-w-0">
          {/* Section rail */}
          <div className="scroll-thin mb-4 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1">
            {TABS.map((tb) => {
              const Icon = tb.icon;
              const active = tab === tb.key;
              return (
                <button
                  key={tb.key}
                  type="button"
                  onClick={() => setTab(tb.key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    active ? 'bg-surface text-fg shadow-soft' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon size={14} />
                  {tb.label}
                  {tb.badge && (
                    <span className="rounded-full bg-surface-3 px-1.5 text-[10px] text-fg-muted">{tb.badge}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ---- Content ---- */}
          {tab === 'content' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('admin.questionEn')} required>
                  <TextInput
                    autoFocus
                    value={q.titleEn}
                    onChange={(e) => update('titleEn', e.target.value)}
                    placeholder={tx('What are you looking to develop?')}
                  />
                </Field>
                <Field label={t('admin.questionAr')}>
                  <ArabicInput
                    value={q.titleAr || ''}
                    onChange={(e) => update('titleAr', e.target.value)}
                    placeholder="ما الذي تريد تطويره؟"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('admin.helperEn')} hint={t('admin.optional')}>
                  <TextArea
                    rows={2}
                    value={q.subtitleEn || ''}
                    onChange={(e) => update('subtitleEn', e.target.value)}
                    placeholder={tx('Positioning shapes everything — from price to packaging.')}
                  />
                </Field>
                <Field label={t('admin.helperAr')} hint={t('admin.optional')}>
                  <ArabicTextArea
                    rows={2}
                    value={q.subtitleAr || ''}
                    onChange={(e) => update('subtitleAr', e.target.value)}
                    placeholder="التموضع بيحدّد كل حاجة — من السعر للتغليف."
                  />
                </Field>
              </div>
            </div>
          )}

          {/* ---- Answer type ---- */}
          {tab === 'answer' && (
            <div className="space-y-4">
              <div
                role="radiogroup"
                aria-label={t('admin.answerType')}
                className="grid gap-2 sm:grid-cols-2"
              >
                {WIDGET_ORDER.map((w) => {
                  const active = q.widget === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => update('widget', w as BriefQuestionWidget)}
                      className={`rounded-xl border p-3 text-start transition-colors ${
                        active
                          ? 'border-brand bg-brand-soft'
                          : 'border-line bg-surface hover:border-line-strong'
                      }`}
                    >
                      <p className={`text-sm font-semibold leading-tight ${active ? 'text-brand-soft-fg' : 'text-fg'}`}>
                        {t(`admin.widget.${w}`)}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">
                        {t(`admin.widget.${w}Desc`)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {showMaxSelect && (
                <Field label={t('admin.maxSelect')} hint={t('admin.optional')}>
                  <TextInput
                    type="number"
                    min={1}
                    className="max-w-[10rem]"
                    value={q.maxSelect ?? ''}
                    onChange={(e) =>
                      update('maxSelect', e.target.value ? parseInt(e.target.value, 10) : undefined)
                    }
                    placeholder="3"
                  />
                </Field>
              )}

              {isUpload && (
                <Field
                  label={tx('Accepted file types')}
                  hint="Comma-separated, e.g. image/*,.pdf,.docx — leave blank to accept anything."
                >
                  <TextInput
                    value={q.accept || ''}
                    onChange={(e) => update('accept', e.target.value)}
                    placeholder={tx('image/*,.pdf')}
                  />
                </Field>
              )}
            </div>
          )}

          {/* ---- Choices ---- */}
          {tab === 'choices' && showOptions && (
            <div>
              <SectionTitle
                title={t('admin.choices')}
                hint={isUpload ? t('admin.widget.uploadDesc') : t('admin.choicesHint')}
                actions={
                  <Button size="sm" variant="outline" icon={Plus} onClick={addOption}>
                    {t('admin.addChoice')}
                  </Button>
                }
              />

              {q.options.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-fg-muted">
                  {t('admin.noData')}
                </div>
              ) : (
                <SortableList
                  items={q.options}
                  onReorder={(next) => update('options', next)}
                  getKey={(o) => o.__rid}
                  className="space-y-2"
                  renderItem={(opt, idx, handle) => (
                    <div className="rounded-xl border border-line bg-surface-2 p-3">
                      <div className="flex items-start gap-2">
                        <div className="pt-1 text-fg-subtle">{handle}</div>

                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <TextInput
                              value={opt.labelEn}
                              onChange={(e) => patchOption(idx, { labelEn: e.target.value })}
                              placeholder={t('admin.choiceTitleEn')}
                            />
                            <ArabicInput
                              value={opt.labelAr || ''}
                              onChange={(e) => patchOption(idx, { labelAr: e.target.value })}
                              placeholder={t('admin.choiceTitleAr')}
                            />
                          </div>

                          {showDescription && (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <TextInput
                                value={opt.description || ''}
                                onChange={(e) => patchOption(idx, { description: e.target.value })}
                                placeholder={`${t('admin.choiceDesc')} — ${t('admin.english')}`}
                              />
                              <ArabicInput
                                value={opt.descriptionAr || ''}
                                onChange={(e) => patchOption(idx, { descriptionAr: e.target.value })}
                                placeholder={`${t('admin.choiceDesc')} — ${t('admin.arabic')}`}
                              />
                            </div>
                          )}

                          {showImage && (
                            <div className="flex items-center gap-2">
                              <ImageIcon size={14} className="shrink-0 text-fg-subtle" />
                              <TextInput
                                value={opt.imageUrl || ''}
                                onChange={(e) => patchOption(idx, { imageUrl: e.target.value })}
                                placeholder="https://…"
                              />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5">
                            <label
                              className="flex items-center gap-1.5 text-[11px] text-fg-muted"
                              title={t('admin.choiceValueHint')}
                            >
                              <span className="text-fg-subtle">{t('admin.choiceValue')}</span>
                              <input
                                value={opt.value}
                                onChange={(e) => patchOption(idx, { value: e.target.value })}
                                placeholder={autoOptionValue(opt.labelEn, [])}
                                aria-describedby={`choice-value-hint-${idx}`}
                                className="w-40 rounded-md border border-line bg-surface px-2 py-1 font-mono text-[11px] text-fg-muted focus:border-brand focus:outline-none"
                              />
                              <span id={`choice-value-hint-${idx}`} className="sr-only">
                                {t('admin.choiceValueHint')}
                              </span>
                            </label>

                            {isCheckList && (
                              <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                <input
                                  type="checkbox"
                                  checked={!!opt.allowNote}
                                  onChange={(e) => patchOption(idx, { allowNote: e.target.checked })}
                                  className="accent-brand"
                                />
                                {t('admin.allowNote')}
                              </label>
                            )}

                            {isUpload && (
                              <label className="flex items-center gap-1.5 text-[11px] text-fg-muted">
                                <input
                                  type="checkbox"
                                  checked={!!opt.slotRequired}
                                  onChange={(e) => patchOption(idx, { slotRequired: e.target.checked })}
                                  className="accent-brand"
                                />
                                {t('admin.required')}
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateOption(idx)}
                            title={t('admin.duplicate')}
                            aria-label={t('admin.duplicate')}
                            className="rounded-lg p-1.5 text-fg-subtle hover:bg-surface-3 hover:text-fg"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            title={t('ui.remove')}
                            aria-label={t('ui.remove')}
                            className="rounded-lg p-1.5 text-fg-subtle hover:bg-danger-soft hover:text-danger"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                />
              )}

              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-subtle">
                <GripVertical size={12} /> {t('admin.reorderHint')}
              </p>
            </div>
          )}

          {/* ---- Logic ---- */}
          {tab === 'logic' && (
            <div className="space-y-5">
              <div className="grid gap-4 rounded-xl border border-line bg-surface-2 p-4 sm:grid-cols-3">
                <Toggle
                  label={t('admin.required')}
                  hint={t('admin.requiredHint')}
                  value={q.required}
                  onChange={(v) => update('required', v)}
                />
                <Toggle
                  label={t('admin.showOnQuiz')}
                  hint={t('admin.showOnQuizHint')}
                  value={q.active}
                  onChange={(v) => update('active', v)}
                />
                <Toggle
                  label={t('admin.allowNote')}
                  hint={t('admin.allowNoteHint')}
                  value={q.allowNote}
                  onChange={(v) => update('allowNote', v)}
                />
              </div>

              <ConditionsEditor
                conditions={q.conditions || []}
                siblings={siblings.filter((s) => s.questionKey && s.questionKey !== q.questionKey)}
                onChange={(c) => update('conditions', c)}
              />

              <details className="rounded-xl border border-line bg-surface-2 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-fg">
                  {t('admin.advancedSection')}
                </summary>
                <div className="mt-3">
                  <Field label={t('admin.questionKeyLabel')} hint={t('admin.questionKeyHint')}>
                    <TextInput
                      value={q.questionKey}
                      onChange={(e) => update('questionKey', e.target.value.trim())}
                      placeholder="developmentType"
                      className="max-w-sm font-mono text-xs"
                    />
                  </Field>
                </div>
              </details>
            </div>
          )}
        </div>

        {/* ------------------------------ Preview ---------------------------- */}
        <div className="min-w-0">
          <div className="lg:sticky lg:top-0">
            <SectionTitle
              title={t('admin.questionPreview')}
              hint={locale === 'ar' ? 'كما سيراه العميل' : 'Exactly what the customer sees'}
            />
            <div className="rounded-xl border border-line bg-bg p-4">
              <QuestionPreview question={previewQuestion} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone={q.active ? 'ok' : 'neutral'}>
                {q.active ? t('admin.active') : t('admin.inactive')}
              </Badge>
              {q.required && <Badge tone="warn">{t('admin.required')}</Badge>}
              {q.maxSelect ? <Badge tone="info">{`${t('admin.maxSelect')}: ${q.maxSelect}`}</Badge> : null}
              {(q.conditions?.length ?? 0) > 0 && (
                <Badge tone="accent">{`${t('admin.conditions')} ${q.conditions!.length}`}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Conditions                                                          */
/* ------------------------------------------------------------------ */

function ConditionsEditor({
  conditions,
  siblings,
  onChange,
}: {
  conditions: Array<{ questionKey: string; value: string | string[] }>;
  siblings: AdminBriefQuestion[];
  onChange: (c: Array<{ questionKey: string; value: string | string[] }>) => void;
}) {
  const { t, pick, tx } = useLanguage();

  function add() {
    onChange([...conditions, { questionKey: siblings[0]?.questionKey || '', value: '' }]);
  }
  function patch(idx: number, next: { questionKey: string; value: string | string[] }) {
    const copy = [...conditions];
    copy[idx] = next;
    onChange(copy);
  }
  function remove(idx: number) {
    onChange(conditions.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <SectionTitle
        title={t('admin.conditions')}
        hint={t('admin.branchingHint')}
        actions={
          <Button size="sm" variant="outline" icon={Plus} onClick={add} disabled={siblings.length === 0}>
            {t('admin.addCondition')}
          </Button>
        }
      />

      {conditions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-fg-muted">
          {t('admin.conditionsHint')}
        </p>
      ) : (
        <div className="space-y-2">
          {conditions.map((c, idx) => {
            const source = siblings.find((s) => s.questionKey === c.questionKey);
            const selectedValues = Array.isArray(c.value) ? c.value : c.value ? [c.value] : [];
            return (
              <div key={idx} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    value={c.questionKey}
                    onChange={(e) => patch(idx, { questionKey: e.target.value, value: '' })}
                    aria-label={t('admin.conditions')}
                  >
                    {siblings.map((s) => (
                      <option key={s.questionKey} value={s.questionKey}>
                        {pick(s.titleEn, s.titleAr)}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => remove(idx)}
                    aria-label={t('ui.remove')}
                  >
                    <span className="sr-only">{t('ui.remove')}</span>
                  </Button>
                </div>

                {source && source.options.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {source.options.map((o) => {
                      const on = selectedValues.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            const next = on
                              ? selectedValues.filter((v) => v !== o.value)
                              : [...selectedValues, o.value];
                            patch(idx, { questionKey: c.questionKey, value: next });
                          }}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                            on
                              ? 'border-brand bg-brand-soft text-brand-soft-fg'
                              : 'border-line bg-surface text-fg-muted hover:border-line-strong'
                          }`}
                        >
                          {pick(o.labelEn, o.labelAr)}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <TextInput
                    className="mt-2"
                    value={Array.isArray(c.value) ? c.value.join(', ') : c.value}
                    onChange={(e) => patch(idx, { questionKey: c.questionKey, value: e.target.value })}
                    placeholder={tx('value')}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
