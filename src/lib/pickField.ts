/** Read one language out of a bilingual `{ en, ar }` field from the database. */
export function pickField(value: unknown, locale: string): string {
  if (value && typeof value === 'object') {
    const v = value as Record<string, string>;
    return v[locale] || v.en || v.ar || '';
  }
  return typeof value === 'string' ? value : '';
}
