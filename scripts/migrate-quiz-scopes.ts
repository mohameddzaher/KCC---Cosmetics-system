/**
 * Migration — scoped brief questions.
 *
 * 1. Backfills `scope: 'general'` / `scopeKey: ''` on every existing question.
 * 2. Drops the old GLOBAL unique index on `questionKey` and lets Mongoose build
 *    the new compound unique index `{ scope, scopeKey, questionKey }`, so the
 *    same key may now exist once per category.
 *
 * Idempotent and additive — it never deletes a question.
 *
 * Usage:
 *   npx tsx scripts/migrate-quiz-scopes.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import BriefQuestion from '../src/models/BriefQuestion';

async function run() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);

  const coll = BriefQuestion.collection;

  // 1 — backfill
  const res = await coll.updateMany(
    { $or: [{ scope: { $exists: false } }, { scope: null }] },
    { $set: { scope: 'general', scopeKey: '' } }
  );
  console.log(`backfilled scope on ${res.modifiedCount} question(s)`);

  await coll.updateMany({ scopeKey: { $exists: false } }, { $set: { scopeKey: '' } });

  // 2 — drop the stale global unique index
  const indexes = await coll.indexes();
  for (const ix of indexes) {
    const keys = Object.keys(ix.key || {});
    if (ix.unique && keys.length === 1 && keys[0] === 'questionKey') {
      console.log(`dropping stale unique index "${ix.name}"`);
      await coll.dropIndex(ix.name as string);
    }
  }

  // 3 — build the new indexes
  await BriefQuestion.syncIndexes();
  console.log('indexes after migration:');
  for (const ix of await coll.indexes()) {
    console.log('  ', ix.name, JSON.stringify(ix.key), ix.unique ? '(unique)' : '');
  }

  const counts = await coll
    .aggregate([{ $group: { _id: { scope: '$scope', scopeKey: '$scopeKey' }, n: { $sum: 1 } } }])
    .toArray();
  console.log('question counts by scope:', JSON.stringify(counts));

  await mongoose.disconnect();
  console.log('done.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
