import SpecOptionMaster from '@/models/SpecOptionMaster';

// Canonical spec categories (must match ProductSpecConfig.specKey enum)
const SPEC_ORDER = [
  'oils-extracts',
  'actives',
  'fine-actives',
  'product-color',
  'product-packaging',
  'package-color',
  'fragrances',
] as const;

const MAX_SELECT: Record<string, number> = {
  'oils-extracts': 8,
  'actives': 5,
  'fine-actives': 3,
  'product-color': 1,
  'product-packaging': 1,
  'package-color': 1,
  'fragrances': 99,
};

const REQUIRED = ['product-color', 'product-packaging', 'package-color', 'fragrances'];

/**
 * Builds a default specs[] array (all categories enabled, all options allowed)
 * for a brand-new product, sourced live from the SpecOptionMaster collection.
 * Mirrors the defaults the seed script uses.
 */
export async function buildDefaultSpecs() {
  const masters = await SpecOptionMaster.find();
  const byKey = new Map(masters.map((m: any) => [m.categoryKey, m]));

  return SPEC_ORDER.filter((key) => byKey.has(key)).map((key, idx) => {
    const cat: any = byKey.get(key);
    return {
      specKey: key,
      enabled: true,
      titleEn: cat.defaultTitleEn,
      titleAr: cat.defaultTitleAr,
      subtitleEn: cat.defaultSubtitleEn,
      subtitleAr: cat.defaultSubtitleAr,
      maxSelect: MAX_SELECT[key] ?? 5,
      isRequired: REQUIRED.includes(key),
      sortOrder: idx,
      allowedOptions: (cat.options || []).map((o: { value: string }) => o.value),
    };
  });
}
