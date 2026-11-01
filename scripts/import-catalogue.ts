/**
 * Brings the code catalogue — the sales team's price book — into the database.
 *
 *   npx tsx scripts/import-catalogue.ts <path-to-json>
 *
 * The JSON comes from "KCC code Catalogue.xlsx" and stays outside the
 * repository: it holds factory costs and recommended prices, which belong in
 * the database and not in a public git remote or a deployed bundle.
 *
 * Safe to re-run. Matched on the ECC code where there is one, otherwise on the
 * category and product name, so a second run updates rather than duplicates.
 * Values a person has edited in the admin panel are not overwritten by a blank
 * cell in the sheet.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as fs from 'fs';
import ProductCode from '../src/models/ProductCode';

dotenv.config({ path: '.env.local' });
dotenv.config();

const file = process.argv[2];
const dry = process.argv.includes('--dry');
if (!file) {
  console.error('Usage: npx tsx scripts/import-catalogue.ts <path-to-json> [--dry]');
  process.exit(1);
}

type Row = Record<string, string | number | null>;

/** "Bottle/ Tube", "tube" and "Tube" are one package, not three. */
function tidyPackage(v: unknown): string {
  const s = String(v || '').trim();
  if (!s) return '';
  return s
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' / ');
}

async function main() {
  const { items } = JSON.parse(fs.readFileSync(file, 'utf8')) as { items: Row[] };
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(`database: ${mongoose.connection.db?.databaseName}${dry ? '  (DRY RUN)' : ''}\n`);

  let created = 0;
  let updated = 0;

  for (const row of items) {
    const code = String(row.code || '').trim();
    const where = code
      ? { code }
      : { category: String(row.category || ''), product: String(row.product || '') };

    const doc: Record<string, unknown> = {
      category: String(row.category || '').trim(),
      product: String(row.product || '').trim(),
      sizeCode: String(row.sizeCode || '').trim() || undefined,
      code: code || undefined,
      status: String(row.status || '').trim() || undefined,
      package: tidyPackage(row.package) || undefined,
      form: String(row.form || '').trim() || undefined,
      ingredients: String(row.ingredients || '').trim() || undefined,
      benchmarkIntl: String(row.benchmarkIntl || '').trim() || undefined,
      benchmarkEgypt: String(row.benchmarkEgypt || '').trim() || undefined,
      benchmarkSaudi: String(row.benchmarkSaudi || '').trim() || undefined,
      active: true,
    };
    // Numbers only when the sheet actually has one: a blank cost is a cost
    // nobody has worked out, which is not the same as zero.
    for (const k of ['volume', 'rspSaudi', 'priceEccEgp', 'bonnSar', 'alKamalUae', 'cost', 'rsp', 'costRatio', 'kccRecommendedSar']) {
      if (row[k] !== null && row[k] !== undefined && row[k] !== '') doc[k] = Number(row[k]);
    }

    if (dry) { created++; continue; }

    const existing = await ProductCode.findOne(where);
    if (existing) {
      // Only fill what the sheet knows; never blank out an admin's edit.
      for (const [k, v] of Object.entries(doc)) {
        if (v !== undefined) (existing as unknown as Record<string, unknown>)[k] = v;
      }
      await existing.save();
      updated++;
    } else {
      await ProductCode.create(doc);
      created++;
    }
  }

  console.log(`created: ${created}`);
  console.log(`updated: ${updated}`);
  if (!dry) {
    console.log(`\ntotal in the catalogue: ${await ProductCode.countDocuments()}`);
    const byCat = await ProductCode.aggregate([
      { $group: { _id: '$category', n: { $sum: 1 }, confirmed: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } } } },
      { $sort: { n: -1 } },
    ]);
    for (const c of byCat) console.log(`  ${String(c.n).padStart(3)}  ${c._id}  (${c.confirmed} confirmed)`);
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
