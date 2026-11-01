/**
 * Recognising the same company under different names.
 *
 * The two sheets the CRM was seeded from name accounts differently: one lists
 * "DeLile", the other "مؤسسة دي لايل التجارية" with DeLile as its brand. Later
 * an order arrives with a company name typed by the customer. All three have to
 * land on one account, or the dashboard counts one company as three.
 *
 * Shared by the import and by the order link, so a match made at seeding and a
 * match made at checkout follow the same rule.
 */

/** Arabic diacritics and the tatweel, which carry no identity. */
const ARABIC_MARKS = /[ً-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

/**
 * Words that say what kind of company it is, not which one.
 *
 * Folded through the same substitutions as the names themselves, or the Arabic
 * entries would never match: by the time a name is compared, its "ة" has
 * already become "ه" and its "أ" an "ا".
 */
const NOISE_RAW = [
  'شركة', 'مؤسسة', 'مجموعة', 'التجارية', 'للتجارة', 'التجاره', 'العالمية', 'الطبية', 'الطبيه',
  'company', 'co', 'est', 'establishment', 'trading', 'group', 'llc', 'ltd', 'inc',
  'للتجميل', 'للعناية', 'cosmetics', 'beauty', 'pharma',
];

/** Alef, yeh and teh-marbuta are written inconsistently; fold them. */
function fold(input: string): string {
  return input
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

const NOISE = new Set(NOISE_RAW.map(fold));

/**
 * One comparable key for a name: lower-cased, unpunctuated, with the
 * company-type words taken out, so "Asteri Beauty LLC" and
 * "شركة أستيري للتجميل" both reduce to something that can be compared.
 */
export function normaliseName(input: string | undefined | null): string {
  if (!input) return '';
  let s = fold(String(input).trim());
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const words = s.split(/\s+/).filter((w) => w && !NOISE.has(w));
  return words.join(' ').trim();
}

/**
 * Every key an account may be recognised by: its names and its brands, each
 * normalised. A match on any one of them is a match on the account.
 */
export function matchKeysFor(parts: {
  name?: string | null;
  nameAr?: string | null;
  brands?: Array<string | null | undefined>;
}): string[] {
  const keys = new Set<string>();
  for (const raw of [parts.name, parts.nameAr, ...(parts.brands || [])]) {
    const key = normaliseName(raw);
    if (key.length >= 3) keys.add(key);
  }
  return [...keys];
}

/** The key an account is filed under — its English name, or its Arabic one. */
export function primaryKey(parts: { name?: string | null; nameAr?: string | null }): string {
  return normaliseName(parts.name) || normaliseName(parts.nameAr);
}
