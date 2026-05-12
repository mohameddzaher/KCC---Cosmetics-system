import categoriesData from '@/data/categories.json';

export interface SubCategory {
  name: string;
  slug: string;
  level: 2;
  items: string[];
}

export interface MainCategory {
  id: number;
  name: string;
  slug: string;
  level: 1;
  subcategories: SubCategory[];
}

const cats = categoriesData.categories as MainCategory[];

export function getAllCategories(): MainCategory[] {
  return cats;
}

export function getMainCategoryBySlug(slug: string): MainCategory | null {
  return cats.find((c) => c.slug === slug) || null;
}

export function getSubCategoryBySlug(mainSlug: string, subSlug: string): SubCategory | null {
  const main = getMainCategoryBySlug(mainSlug);
  return main?.subcategories.find((s) => s.slug === subSlug) || null;
}

/**
 * Build a stable productKey from main/sub/item
 * Used as the unique identifier for ProductSpecConfig
 */
export function makeProductKey(mainSlug: string, subSlug: string, itemName: string): string {
  const itemSlug = itemName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${mainSlug}__${subSlug}__${itemSlug}`;
}

export function getProductByKey(productKey: string): {
  main: MainCategory;
  sub: SubCategory;
  item: string;
} | null {
  const [mainSlug, subSlug] = productKey.split('__');
  if (!mainSlug || !subSlug) return null;

  const main = getMainCategoryBySlug(mainSlug);
  if (!main) return null;

  const sub = main.subcategories.find((s) => s.slug === subSlug);
  if (!sub) return null;

  const itemSlug = productKey.split('__')[2];
  const item = sub.items.find((it) =>
    it.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === itemSlug
  );
  if (!item) return null;

  return { main, sub, item };
}

/**
 * Flat list of every product (level-3 item) with its keys.
 * Used by admin to enumerate every configurable product.
 */
export function getAllProducts(): Array<{
  productKey: string;
  mainSlug: string;
  mainName: string;
  subSlug: string;
  subName: string;
  itemName: string;
}> {
  const out: Array<{
    productKey: string;
    mainSlug: string;
    mainName: string;
    subSlug: string;
    subName: string;
    itemName: string;
  }> = [];

  for (const main of cats) {
    for (const sub of main.subcategories) {
      if (sub.items.length === 0) {
        out.push({
          productKey: `${main.slug}__${sub.slug}___blank`,
          mainSlug: main.slug,
          mainName: main.name,
          subSlug: sub.slug,
          subName: sub.name,
          itemName: '(no level-3 items)',
        });
        continue;
      }
      for (const item of sub.items) {
        out.push({
          productKey: makeProductKey(main.slug, sub.slug, item),
          mainSlug: main.slug,
          mainName: main.name,
          subSlug: sub.slug,
          subName: sub.name,
          itemName: item,
        });
      }
    }
  }

  return out;
}
