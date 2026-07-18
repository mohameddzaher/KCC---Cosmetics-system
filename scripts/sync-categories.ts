/**
 * Seed the Category collection from src/data/categories.json.
 *
 * Safe: it only seeds when the Category collection is EMPTY, so it never
 * overwrites edits the admin has made in the panel. It touches no other data.
 *
 * Usage:
 *   npx tsx scripts/sync-categories.ts
 *   npx tsx scripts/sync-categories.ts --force   (re-seed even if not empty — upsert by slug)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import Category from '../src/models/Category';
import categoriesData from '../src/data/categories.json';

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }
  const force = process.argv.includes('--force');

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const existing = await Category.countDocuments();
  if (existing > 0 && !force) {
    console.log(`Category collection already has ${existing} docs — skipping (use --force to re-seed).`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const cats = (categoriesData as any).categories as any[];
  let count = 0;
  for (const c of cats) {
    const doc = {
      name: c.name,
      slug: c.slug,
      order: c.id ?? count,
      active: true,
      subcategories: (c.subcategories || []).map((s: any, idx: number) => ({
        name: s.name,
        slug: s.slug,
        items: s.items || [],
        order: idx,
      })),
    };
    await Category.findOneAndUpdate({ slug: c.slug }, { $set: doc }, { upsert: true, new: true });
    count++;
    console.log(`  ✓ ${c.name} (${(c.subcategories || []).length} sub-families)`);
  }

  console.log(`\nSeeded ${count} categories into the Category collection.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
