/**
 * The CRM's own vocabulary: the sectors accounts belong to, and the cities they
 * sit in.
 *
 * It exists because the source sheets do not agree with themselves. The visited
 * list says "Pharmacy chain" and "Distributer/ agency"; the upcoming list says
 * "Pharmacies chain" and "company / agency / distributer" for the same two
 * things. Cities are worse — "جدة", "Jeddah", and "جدة (مقر رئيسي) / الرياض /
 * الدمام" all name a company in Jeddah. Left alone, a dashboard would show one
 * sector twice and one city four times.
 *
 * Aliases are matched loosely, so a spelling nobody anticipated still lands on
 * the right key rather than inventing a sector.
 */

export interface CrmCategory {
  key: string;
  labelEn: string;
  labelAr: string;
  /** Which share of the visit mix this sector counts towards. */
  mixGroup: 'companies' | 'brands-pharmacies' | 'scattered';
  aliases: string[];
}

export const CRM_CATEGORIES: CrmCategory[] = [
  {
    key: 'pharmacy-chain',
    labelEn: 'Pharmacy chain',
    labelAr: 'سلسلة صيدليات',
    mixGroup: 'brands-pharmacies',
    aliases: ['pharmacy chain', 'pharmacies chain', 'pharmacy chains', 'صيدليات'],
  },
  {
    key: 'distributor-agency',
    labelEn: 'Distributor / agency',
    labelAr: 'موزّع / وكيل',
    mixGroup: 'companies',
    aliases: [
      'distributer/ agency', 'distributor / agency', 'distributer agency',
      'company / agency / distributer', 'company agency distributer', 'موزع', 'وكيل',
    ],
  },
  {
    key: 'saudi-brand',
    labelEn: 'Saudi local brand',
    labelAr: 'علامة سعودية',
    mixGroup: 'brands-pharmacies',
    aliases: ['saudi local brand', 'saudi local brands', 'saudi brand', 'علامة سعودية'],
  },
  {
    key: 'hospital-clinic',
    labelEn: 'Hospital / clinic',
    labelAr: 'مستشفى / عيادة',
    mixGroup: 'companies',
    aliases: ['hospital / clinic', 'hospital clinic', 'hospitals', 'clinics', 'مستشفى', 'عيادة'],
  },
  {
    key: 'ecommerce',
    labelEn: 'E-commerce platform',
    labelAr: 'منصة تجارة إلكترونية',
    mixGroup: 'companies',
    aliases: ['e-commerce platform', 'ecommerce platform', 'e commerce', 'منصة'],
  },
  {
    key: 'makeup-artist',
    labelEn: 'Makeup artist',
    labelAr: 'خبيرة تجميل',
    mixGroup: 'scattered',
    aliases: ['makeup artist', 'make up artist', 'خبيرة تجميل'],
  },
  {
    key: 'other',
    labelEn: 'Other',
    labelAr: 'أخرى',
    mixGroup: 'scattered',
    aliases: [],
  },
];

export interface CrmCity {
  key: string;
  labelEn: string;
  labelAr: string;
  aliases: string[];
}

export const CRM_CITIES: CrmCity[] = [
  { key: 'riyadh', labelEn: 'Riyadh', labelAr: 'الرياض', aliases: ['ryiadh', 'riyad', 'riyadh', 'الرياض', 'الخرج'] },
  { key: 'jeddah', labelEn: 'Jeddah', labelAr: 'جدة', aliases: ['jeddah', 'jedah', 'جدة', 'جده'] },
  { key: 'makkah', labelEn: 'Makkah', labelAr: 'مكة المكرمة', aliases: ['makkah', 'mecca', 'مكة', 'مكه'] },
  { key: 'madinah', labelEn: 'Madinah', labelAr: 'المدينة المنورة', aliases: ['madina', 'madinah', 'المدينة', 'المدينه'] },
  { key: 'dammam', labelEn: 'Dammam & Eastern', labelAr: 'الدمام والشرقية', aliases: ['damam', 'dammam', 'الدمام', 'الخبر', 'الشرقية', 'الشرقيه', 'الأحساء', 'الاحساء'] },
  { key: 'taif', labelEn: 'Taif', labelAr: 'الطائف', aliases: ['taif', 'الطائف', 'الطايف'] },
  { key: 'abha', labelEn: 'Abha & South', labelAr: 'أبها والجنوب', aliases: ['abha', 'أبها', 'ابها', 'الجنوبية', 'الجنوب'] },
  { key: 'jazan', labelEn: 'Jazan', labelAr: 'جازان', aliases: ['gizan', 'jazan', 'jizan', 'جازان', 'جيزان'] },
  { key: 'najran', labelEn: 'Najran', labelAr: 'نجران', aliases: ['nagran', 'najran', 'نجران'] },
  { key: 'qassim', labelEn: 'Qassim', labelAr: 'القصيم', aliases: ['qassim', 'القصيم'] },
  { key: 'other', labelEn: 'Other', labelAr: 'أخرى', aliases: [] },
];

function loose(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[ً-ٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** The sector key for whatever the sheet (or a person) wrote. */
export function canonicalCategory(raw: string | undefined | null): string {
  const q = loose(raw || '');
  if (!q) return 'other';
  for (const c of CRM_CATEGORIES) {
    if (c.key === 'other') continue;
    if (loose(c.labelEn) === q || loose(c.labelAr) === q) return c.key;
    if (c.aliases.some((a) => loose(a) === q)) return c.key;
  }
  // Nothing matched exactly: fall back to a contained alias, so an unforeseen
  // spelling still lands on a real sector instead of creating one.
  for (const c of CRM_CATEGORIES) {
    if (c.key === 'other') continue;
    if (c.aliases.some((a) => a && q.includes(loose(a)))) return c.key;
  }
  return 'other';
}

/**
 * The city key. A cell may name several ("جدة (مقر رئيسي) / الرياض / الدمام"):
 * the first recognised one is the account's base, which is what a visit plan
 * needs, and the raw text is kept alongside it.
 */
export function canonicalCity(raw: string | undefined | null): string {
  const q = loose(raw || '');
  if (!q) return 'other';
  let best: { key: string; at: number } | null = null;
  for (const c of CRM_CITIES) {
    if (c.key === 'other') continue;
    for (const a of [c.labelEn, c.labelAr, ...c.aliases]) {
      const at = q.indexOf(loose(a));
      if (at >= 0 && (!best || at < best.at)) best = { key: c.key, at };
    }
  }
  return best?.key || 'other';
}

export const categoryMeta = (key: string) =>
  CRM_CATEGORIES.find((c) => c.key === key) || CRM_CATEGORIES[CRM_CATEGORIES.length - 1];
export const cityMeta = (key: string) =>
  CRM_CITIES.find((c) => c.key === key) || CRM_CITIES[CRM_CITIES.length - 1];
