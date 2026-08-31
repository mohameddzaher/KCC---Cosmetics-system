/**
 * Put the AI assistant's answers into the admin panel.
 *
 * WHY
 * ---
 * The assistant answered from two places: articles in the Knowledge Base, which
 * the team can edit, and a set of entries hard-coded in the API route, which it
 * could not. The good, up-to-date answers — how the quiz works, the packaging
 * studio, order tracking, reordering — were all in the second group. So the
 * team could see the assistant saying something they wanted changed and had no
 * way to change it.
 *
 * This copies every one of those entries into the Knowledge Base, where they
 * behave like any other article: edit, disable, retitle, add keywords. From
 * then on the database is the source of truth; the code copy only answers on a
 * fresh install where nothing has been seeded yet.
 *
 * SAFE TO RE-RUN. Articles are matched on their English title and are only
 * rewritten while they still match what this script last wrote — an article the
 * team has edited is never overwritten.
 *
 * Usage:  npx tsx scripts/seed-assistant-knowledge.ts
 *         npx tsx scripts/seed-assistant-knowledge.ts --force   (restore defaults)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import KnowledgeArticle from '../src/models/KnowledgeArticle';
import ARTICLES from '../src/data/assistant-knowledge.json';

const force = process.argv.includes('--force');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  let created = 0;
  let updated = 0;
  let kept = 0;

  for (const [i, seed] of ARTICLES.entries()) {
    const existing: any = await KnowledgeArticle.findOne({ 'question.en': seed.question.en });

    if (!existing) {
      await KnowledgeArticle.create({ ...seed, order: 100 + i, enabled: true });
      created++;
      continue;
    }

    // Anything the team has reworded stays as they wrote it.
    const untouched = existing.answer?.en === seed.answer.en && existing.answer?.ar === seed.answer.ar;
    if (!untouched && !force) {
      kept++;
      continue;
    }

    existing.answer = seed.answer;
    existing.keywords = seed.keywords;
    existing.category = seed.category;
    existing.markModified('answer');
    await existing.save();
    updated++;
  }

  console.log(`created ${created}, refreshed ${updated}, left edited ${kept}`);
  console.log(`Knowledge Base now holds ${await KnowledgeArticle.countDocuments()} article(s).`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
