/**
 * Read-only health check on the live database.
 *
 * Several things this system now depends on live in data rather than in code:
 * the Arabic catalogue, the assistant's answers, the packaging specs, the site
 * identity. A deploy carries the code but not the data, so this reports what is
 * actually there rather than what is assumed to be.
 *
 * Writes nothing. Exits non-zero if anything is missing, so it can gate a
 * deploy.
 *
 * Usage:  npx tsx scripts/verify-data.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import Category from '../src/models/Category';
import KnowledgeArticle from '../src/models/KnowledgeArticle';
import SpecOptionMaster from '../src/models/SpecOptionMaster';
import ProductSpecConfig from '../src/models/ProductSpecConfig';
import SiteSettings from '../src/models/SiteSettings';
import User from '../src/models/User';

const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
const check = (name: string, ok: boolean, detail: string) => checks.push({ name, ok, detail });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const db = mongoose.connection.name;
  const host = mongoose.connection.host;

  /* --- Catalogue: every name translated --- */
  const cats: any[] = await Category.find({}).lean();
  let mains = 0;
  let subs = 0;
  let items = 0;
  let gaps = 0;
  for (const c of cats) {
    mains++;
    if (!c.nameAr) gaps++;
    for (const s of c.subcategories || []) {
      subs++;
      if (!s.nameAr) gaps++;
      (s.items || []).forEach((_: string, i: number) => {
        items++;
        if (!(s.itemsAr || [])[i]) gaps++;
      });
    }
  }
  check('Catalogue Arabic', gaps === 0, `${mains} categories, ${subs} sub-families, ${items} products, ${gaps} untranslated`);

  /* --- Assistant answers --- */
  const articles = await KnowledgeArticle.countDocuments({ enabled: true });
  const quiz = await KnowledgeArticle.findOne({ 'question.en': 'How does the Sample Quiz work?' }).lean();
  check('AI knowledge base', articles >= 30 && !!quiz, `${articles} enabled article(s)`);

  /* --- Packaging parts are editable specs --- */
  const parts = ['package-cap', 'package-label', 'package-finish', 'package-color'];
  const masters = await SpecOptionMaster.countDocuments({ categoryKey: { $in: parts } });
  const configs = await ProductSpecConfig.countDocuments();
  const withParts = await ProductSpecConfig.countDocuments({ 'specs.specKey': 'package-cap' });
  check('Packaging masters', masters === parts.length, `${masters}/${parts.length} present`);
  check('Packaging on products', withParts === configs, `${withParts}/${configs} product configs carry the packaging specs`);

  /* --- Site identity --- */
  const settings: any = await SiteSettings.findOne({ key: 'main' }).lean();
  const name = settings?.general?.siteName?.en || '';
  check('Site name', name.includes('Saudi'), name || '(not set)');

  /* --- Staff accounts --- */
  const staff = await User.countDocuments({ role: { $ne: 'CUSTOMER' } });
  check('Staff accounts', staff > 0, `${staff} non-customer account(s)`);

  console.log(`database: ${db} @ ${host}\n`);
  let failed = 0;
  for (const c of checks) {
    if (!c.ok) failed++;
    console.log(`${c.ok ? 'OK  ' : 'FAIL'}  ${c.name.padEnd(22)} ${c.detail}`);
  }
  console.log(failed === 0 ? '\nAll data checks passed.' : `\n${failed} check(s) failed.`);

  await mongoose.disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
