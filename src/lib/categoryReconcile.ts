import ProductSpecConfig from '@/models/ProductSpecConfig';
import { buildDefaultSpecs } from '@/lib/defaultSpecs';
import { makeProductKey } from '@/lib/categories';

interface SubLike { name: string; slug: string; items: string[] }
interface CatLike { slug: string; subcategories: SubLike[] }

/**
 * Keep ProductSpecConfig in sync with a category's current item list:
 *  - create a default config for any item that doesn't have one yet
 *  - delete configs (for this main category) whose product no longer exists
 * This is what makes the admin tree and the customer quiz/specs stay aligned.
 */
export async function reconcileCategoryConfigs(category: CatLike) {
  const validKeys = new Set<string>();
  const toEnsure: Array<{ productKey: string; subSlug: string; itemName: string }> = [];

  for (const sub of category.subcategories || []) {
    for (const item of sub.items || []) {
      if (!item || !item.trim()) continue;
      const key = makeProductKey(category.slug, sub.slug, item);
      validKeys.add(key);
      toEnsure.push({ productKey: key, subSlug: sub.slug, itemName: item });
    }
  }

  // Prune orphan configs that belong to this main category
  await ProductSpecConfig.deleteMany({
    mainSlug: category.slug,
    productKey: { $nin: Array.from(validKeys) },
  });

  // Ensure every current item has a config
  const existing = new Set(
    (await ProductSpecConfig.find({ mainSlug: category.slug }, 'productKey')).map((d: any) => d.productKey)
  );
  const missing = toEnsure.filter((p) => !existing.has(p.productKey));
  if (missing.length === 0) return { created: 0, pruned: true };

  const defaults = await buildDefaultSpecs();
  const docs = missing.map((p) => ({
    productKey: p.productKey,
    mainSlug: category.slug,
    subSlug: p.subSlug,
    itemName: p.itemName,
    specs: defaults,
    active: true,
  }));

  // insertMany with ordered:false so a stray duplicate never aborts the batch
  try {
    await ProductSpecConfig.insertMany(docs, { ordered: false });
  } catch (e: any) {
    if (e.code !== 11000) throw e; // ignore duplicate-key races
  }
  return { created: docs.length, pruned: true };
}

/** Remove all spec configs belonging to a deleted main category. */
export async function pruneCategoryConfigs(mainSlug: string) {
  await ProductSpecConfig.deleteMany({ mainSlug });
}
