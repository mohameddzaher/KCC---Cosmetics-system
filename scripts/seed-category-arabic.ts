/**
 * Fill in the Arabic side of the product catalogue.
 *
 * WHY
 * ---
 * `Category` has carried `nameAr` and `itemsAr` from the start, but every one
 * of them was empty: 10 main categories, 56 sub-families and 208 product names
 * with no Arabic at all. So an Arabic customer went through a fully Arabic
 * quiz and then picked their product from an English-only list -- the one
 * place where the translation stopped.
 *
 * The wording lives in src/data/category-names-ar.json so the team can adjust
 * a term without touching code, and so this script can verify up front that
 * every name is covered rather than filling in half of them.
 *
 * SAFE TO RE-RUN. Only empty fields are written; anything already translated,
 * whether by this script or by hand in /admin/categories, is left alone.
 * Pass --force to overwrite with the file's wording.
 *
 * Usage:  npx tsx scripts/seed-category-arabic.ts [--force]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import Category from '../src/models/Category';
import NAMES from '../src/data/category-names-ar.json';

const force = process.argv.includes('--force');

interface Names {
  mains: Record<string, string>;
  subs: Record<string, string>;
  items: Record<string, string>;
}

const names = NAMES as Names;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const cats: any[] = await Category.find({});

  /*
   * Check everything is translatable BEFORE writing anything. A partial pass
   * would leave the catalogue half-Arabic, which reads as a bug rather than
   * as a gap.
   */
  const missing: string[] = [];
  for (const cat of cats) {
    if (!names.mains[cat.slug]) missing.push(`main:${cat.slug}`);
    for (const sub of cat.subcategories || []) {
      if (!names.subs[sub.slug]) missing.push(`sub:${sub.slug}`);
      for (const item of sub.items || []) {
        if (!names.items[item]) missing.push(`item:${item}`);
      }
    }
  }
  if (missing.length > 0) {
    console.error(`Missing Arabic for ${missing.length} entr(ies) -- nothing written:`);
    missing.slice(0, 25).forEach((m) => console.error('  ' + m));
    process.exit(1);
  }

  let mains = 0;
  let subs = 0;
  let items = 0;

  for (const cat of cats) {
    let touched = false;

    if (force || !cat.nameAr) {
      cat.nameAr = names.mains[cat.slug];
      mains++;
      touched = true;
    }

    for (const sub of cat.subcategories || []) {
      if (force || !sub.nameAr) {
        sub.nameAr = names.subs[sub.slug];
        subs++;
        touched = true;
      }

      // itemsAr is index-aligned with items, so it is rebuilt in step rather
      // than appended to -- a shorter array would silently mistranslate.
      const current: string[] = sub.itemsAr || [];
      const next = (sub.items || []).map((item: string, i: number) => {
        if (!force && current[i]) return current[i];
        items++;
        return names.items[item];
      });
      if (next.join(' ') !== current.join(' ')) {
        sub.itemsAr = next;
        touched = true;
      }
    }

    if (touched) {
      cat.markModified('subcategories');
      await cat.save();
    }
  }

  console.log(
    `translated ${mains} main categor(ies), ${subs} sub-famil(ies), ${items} product name(s)`
  );

  // Report what is left, so the result is verified rather than assumed.
  const after: any[] = await Category.find({}).lean();
  let gaps = 0;
  for (const cat of after) {
    if (!cat.nameAr) gaps++;
    for (const sub of cat.subcategories || []) {
      if (!sub.nameAr) gaps++;
      (sub.items || []).forEach((_: string, i: number) => {
        if (!(sub.itemsAr || [])[i]) gaps++;
      });
    }
  }
  console.log(gaps === 0 ? 'every name now has Arabic.' : `${gaps} name(s) still without Arabic.`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
