/**
 * Fills in the Arabic name of every sample-quiz option that has none.
 *
 * The libraries were seeded from the company's English spec sheets, so 180 of
 * them — every oil, every active, every colour — reached the Arabic customer as
 * English text. Typing those in by hand through the admin panel was the only
 * option; this applies them in one pass instead.
 *
 * Safe to re-run: by default it only writes where the Arabic name is missing,
 * so an admin's own wording is never overwritten. Pass --force to replace.
 *
 *   npx tsx scripts/seed-option-arabic.ts [--force] [--dry]
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SpecOptionMaster from '../src/models/SpecOptionMaster';
import data from '../src/data/spec-options-ar.json';

dotenv.config({ path: '.env.local' });
dotenv.config();

const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry');

interface SubNote {
  value: string;
  labelEn: string;
  labelAr?: string;
}

const dict = data as unknown as Record<string, Record<string, string>>;
const subNoteDict = dict._subNotes || {};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  console.log(`database: ${mongoose.connection.db?.databaseName}\n`);

  let optionsWritten = 0;
  let notesWritten = 0;
  const unknown: string[] = [];

  for (const [categoryKey, names] of Object.entries(dict)) {
    if (categoryKey.startsWith('_')) continue;

    const master = await SpecOptionMaster.findOne({ categoryKey });
    if (!master) {
      console.log(`SKIP  ${categoryKey} — no such library`);
      continue;
    }

    let touched = 0;
    for (const opt of master.options) {
      const ar = names[opt.value];
      if (!ar) {
        if (!opt.labelAr) unknown.push(`${categoryKey} / ${opt.value} — ${opt.labelEn}`);
        continue;
      }
      if (opt.labelAr && !force) continue;
      opt.labelAr = ar;
      touched++;
    }

    // Fragrance families carry their own note lists, which were English too.
    for (const opt of master.options) {
      const notes = (opt.meta as { subNotes?: SubNote[] } | undefined)?.subNotes;
      if (!Array.isArray(notes)) continue;
      let noteTouched = false;
      for (const n of notes) {
        const ar = subNoteDict[n.value];
        if (!ar) {
          if (!n.labelAr) unknown.push(`${categoryKey} / ${opt.value} > ${n.value} — ${n.labelEn}`);
          continue;
        }
        if (n.labelAr && !force) continue;
        n.labelAr = ar;
        noteTouched = true;
        notesWritten++;
      }
      if (noteTouched) opt.meta = { ...(opt.meta || {}), subNotes: notes };
    }

    optionsWritten += touched;
    if (!dry) {
      master.markModified('options');
      await master.save();
    }
    console.log(
      `OK    ${categoryKey.padEnd(20)} ${touched} name(s)${touched === 0 ? ' — already complete' : ''}`
    );
  }

  console.log(
    `\n${dry ? 'would write' : 'wrote'} ${optionsWritten} option name(s) and ${notesWritten} sub-note(s).`
  );

  if (unknown.length) {
    console.log(`\n${unknown.length} option(s) still without an Arabic name:`);
    for (const u of unknown) console.log('  •', u);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
