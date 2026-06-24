/**
 * Safe Brief-Questions sync.
 *
 * Upserts every question in src/data/brief-questions.json into the
 * BriefQuestion collection BY questionKey. It NEVER drops collections and
 * never touches orders, customers, users, or any other data — so it is safe
 * to run against the live database.
 *
 * Usage:
 *   npx tsx scripts/sync-brief-questions.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import BriefQuestion from '../src/models/BriefQuestion';
import briefQuestionsData from '../src/data/brief-questions.json';

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.\n');

  const questions = (briefQuestionsData as any).questions as any[];
  let created = 0;
  let updated = 0;

  for (const q of questions) {
    const doc = {
      questionKey: q.questionKey,
      order: q.order,
      widget: q.widget,
      titleEn: q.titleEn,
      titleAr: q.titleAr,
      subtitleEn: q.subtitleEn,
      subtitleAr: q.subtitleAr,
      helperEn: q.helperEn,
      helperAr: q.helperAr,
      options: q.options || [],
      maxSelect: q.maxSelect,
      required: q.required ?? true,
      active: q.active ?? true,
      allowNote: q.allowNote ?? true,
      conditions: q.conditions || [],
      category: q.category || 'general',
    };

    const existing = await BriefQuestion.findOne({ questionKey: q.questionKey });
    await BriefQuestion.findOneAndUpdate(
      { questionKey: q.questionKey },
      { $set: doc },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    if (existing) {
      updated++;
      console.log(`  ↻ updated: ${q.questionKey}`);
    } else {
      created++;
      console.log(`  + created: ${q.questionKey}`);
    }
  }

  const total = await BriefQuestion.countDocuments();
  console.log('\n========================================');
  console.log(`  Sync complete: ${created} created, ${updated} updated.`);
  console.log(`  Total brief questions in DB: ${total}`);
  console.log('========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
