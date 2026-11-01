/**
 * Brings the sales team's CRM spreadsheet into the database.
 *
 *   npx tsx scripts/import-crm.ts <path-to-json> [--dry]
 *
 * The JSON is produced from "CRM data.xlsx" and deliberately lives outside the
 * repository: it is a list of 300-odd companies with contact names and phone
 * numbers, and the git remote and the deployed bundle are both the wrong place
 * for it. The database is where the rest of the business's data already is.
 *
 * Safe to re-run. Accounts are matched on their names and their brands, so the
 * same company appearing in both sheets becomes one account, and a second run
 * merges rather than duplicates.
 *
 * Two honesty rules it follows:
 *   • The sheet records that a meeting happened, never when. Those activities
 *     are marked `backfilled`, and every count-over-time leaves them out — a
 *     day's import must not read as the best sales day on record.
 *   • A row in the "Visited" sheet with no meeting ticked has not been visited.
 *     It is a target like any other, so it lands in `upcoming`.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as fs from 'fs';
import CrmAccount from '../src/models/CrmAccount';
import CrmActivity from '../src/models/CrmActivity';
import CrmTarget from '../src/models/CrmTarget';
import User from '../src/models/User';
import { matchKeysFor, primaryKey } from '../src/lib/crmMatch';
import { canonicalCategory, canonicalCity } from '../src/lib/crmVocab';

dotenv.config({ path: '.env.local' });
dotenv.config();

const file = process.argv[2];
const dry = process.argv.includes('--dry');
/**
 * Who made the visits the sheet records. The sheet names nobody, but somebody
 * made them, and a KPI screen that credits them to "the import" tells the
 * commercial manager nothing. Pass --credit <email> to attribute them.
 */
const creditEmail = (() => {
  const i = process.argv.indexOf('--credit');
  return i > -1 ? process.argv[i + 1] : undefined;
})();

if (!file) {
  console.error('Usage: npx tsx scripts/import-crm.ts <path-to-json> [--dry]');
  process.exit(1);
}

interface VisitedRow {
  name: string; category: string; city: string;
  meetings: string[]; feedback: string; finalStatus: string; requirement: string;
}
interface UpcomingRow {
  name: string; category: string; brands: string[];
  keyPerson: string; position: string; phone: string;
  segment: string; source: string; city: string; links: string[];
}

const hasArabic = (s: string) => /[؀-ۿ]/.test(s || '');

/** Fill a blank; never overwrite something a person has already written. */
function fill<T>(current: T | undefined | null, incoming: T | undefined | null): T | undefined {
  const empty =
    current === undefined || current === null || (typeof current === 'string' && !current.trim());
  return empty && incoming ? incoming : (current as T | undefined);
}

const stats = {
  created: 0, merged: 0, meetings: 0, skipped: 0, credited: 0,
  byStage: {} as Record<string, number>,
};

async function upsertAccount(row: {
  name: string; category?: string; city?: string; segment?: string; source?: string;
  brands?: string[]; links?: string[];
  keyPerson?: { name?: string; position?: string; phone?: string };
  stage?: string; feedback?: string; finalStatus?: string; requirement?: string;
  targetList?: boolean;
}) {
  // An Arabic-named company is filed under its brand when it has one, with the
  // Arabic kept alongside. With no brand the Arabic name IS the name, and
  // repeating it in both fields would just read as a duplicate on screen.
  const arabic = hasArabic(row.name);
  const brand = row.brands?.find((b) => b && !hasArabic(b));
  const name = arabic ? brand || row.name : row.name;
  const nameAr = arabic && brand ? row.name : undefined;

  const keys = matchKeysFor({ name, nameAr, brands: row.brands });
  if (keys.length === 0) {
    stats.skipped++;
    return null;
  }

  const existing = await CrmAccount.findOne({ matchKeys: { $in: keys } });

  if (existing) {
    existing.name = fill(existing.name, name) || existing.name;
    existing.nameAr = fill(existing.nameAr, nameAr);
    existing.category = fill(existing.category, row.category);
    existing.city = fill(existing.city, row.city);
    existing.segment = fill(existing.segment, row.segment);
    existing.source = fill(existing.source, row.source);
    existing.feedback = fill(existing.feedback, row.feedback);
    existing.finalStatus = fill(existing.finalStatus, row.finalStatus);
    existing.requirement = fill(existing.requirement, row.requirement);
    existing.brands = [...new Set([...(existing.brands || []), ...(row.brands || [])])];
    existing.links = [...new Set([...(existing.links || []), ...(row.links || [])])];
    existing.keyPerson = {
      name: fill(existing.keyPerson?.name, row.keyPerson?.name),
      position: fill(existing.keyPerson?.position, row.keyPerson?.position),
      phone: fill(existing.keyPerson?.phone, row.keyPerson?.phone),
      email: existing.keyPerson?.email,
    };
    // Appearing on the target list is a fact about the account that the
    // prospect list cannot take away.
    if (row.targetList) existing.targetList = true;
    // A sheet never demotes an account that has been worked.
    if (row.stage && existing.stage === 'upcoming' && row.stage !== 'upcoming') {
      existing.stage = row.stage;
    }
    existing.matchKeys = [...new Set([...(existing.matchKeys || []), ...keys])];
    existing.nameKey = existing.nameKey || primaryKey({ name, nameAr });
    if (!dry) await existing.save();
    stats.merged++;
    return existing;
  }

  const doc = {
    name,
    nameAr,
    category: row.category,
    city: row.city,
    segment: row.segment,
    source: row.source,
    brands: row.brands || [],
    links: row.links || [],
    keyPerson: row.keyPerson,
    stage: row.stage || 'upcoming',
    targetList: !!row.targetList,
    feedback: row.feedback,
    finalStatus: row.finalStatus,
    requirement: row.requirement,
    steps: {},
    nameKey: primaryKey({ name, nameAr }),
    matchKeys: keys,
  };
  stats.created++;
  if (dry) return { ...doc, _id: 'dry' } as never;
  return CrmAccount.create(doc);
}

/** One row per meeting the sheet ticked, written once however often this runs. */
async function backfillMeetings(
  accountId: unknown,
  meetings: string[],
  credit?: { id: unknown; name: string }
) {
  for (let i = 0; i < meetings.length; i++) {
    const word = meetings[i].trim().toLowerCase();
    const index = i + 1;
    if (dry) { stats.meetings++; continue; }

    const existing = await CrmActivity.findOne({
      accountId, type: 'meeting', meetingIndex: index, backfilled: true,
    });
    if (existing) {
      // Already recorded. If it was imported before anyone was credited, the
      // attribution can still be filled in without writing the row twice.
      if (credit && !existing.byId) {
        existing.byId = credit.id as never;
        existing.byName = credit.name;
        await existing.save();
        stats.credited++;
      }
      continue;
    }

    await CrmActivity.create({
      accountId,
      type: 'meeting',
      meetingIndex: index,
      body: `Meeting ${index}: ${meetings[i]} (from the sales sheet; date not recorded)`,
      outcome: word === 'hold' ? 'hold' : 'done',
      backfilled: true,
      byId: credit?.id,
      byName: credit?.name || 'Imported from CRM sheet',
      meta: { source: 'CRM data.xlsx', sheet: 'Visited' },
    });
    stats.meetings++;
  }
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as {
    visited: VisitedRow[]; upcoming: UpcomingRow[]; targets: Record<string, unknown>;
  };

  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(`database: ${mongoose.connection.db?.databaseName}${dry ? '  (DRY RUN)' : ''}\n`);

  let credit: { id: unknown; name: string } | undefined;
  if (creditEmail) {
    const who = await User.findOne({ email: creditEmail.toLowerCase() }).select('name').lean();
    if (!who) throw new Error(`No user with the email ${creditEmail}`);
    credit = { id: (who as { _id: unknown })._id, name: (who as { name: string }).name };
    console.log(`crediting the sheet's visits to ${credit.name}`);
  }

  /* ---- the targets and the process, from the KPIs sheet ---- */
  if (!dry) {
    await CrmTarget.findOneAndUpdate(
      { key: 'main' },
      { $set: { ...raw.targets, key: 'main' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  console.log('targets: daily visits, weekly clients, the sector mix and the six steps');

  /* ---- the visited list first: it is the one that carries progress ---- */
  for (const v of raw.visited) {
    const meetings = v.meetings.filter(Boolean);
    const anyDone = meetings.some((m) => m.trim().toLowerCase() === 'done');
    const anyHold = meetings.some((m) => m.trim().toLowerCase() === 'hold');
    // Nothing ticked means nobody has been yet, whatever the sheet is called.
    const stage = anyDone ? 'current' : anyHold ? 'hold' : 'upcoming';

    const account = await upsertAccount({
      name: v.name,
      category: canonicalCategory(v.category),
      city: canonicalCity(v.city),
      stage,
      targetList: true,
      feedback: v.feedback,
      finalStatus: v.finalStatus,
      requirement: v.requirement,
    });
    if (!account) continue;

    if (meetings.length > 0) {
      await backfillMeetings((account as { _id: unknown })._id, meetings, credit);
      if (!dry) {
        await CrmAccount.findByIdAndUpdate((account as { _id: unknown })._id, {
          $set: {
            meetingCount: meetings.length,
            activityCount: meetings.length,
            'steps.scheduled': new Date(),
          },
        });
      }
    }
  }

  /* ---- then the upcoming list, which fills in the richer profile ---- */
  for (const u of raw.upcoming) {
    await upsertAccount({
      name: u.name,
      category: canonicalCategory(u.category),
      city: canonicalCity(u.city),
      segment: u.segment,
      source: u.source,
      brands: u.brands,
      links: u.links,
      keyPerson: { name: u.keyPerson, position: u.position, phone: u.phone },
    });
  }

  if (!dry) {
    for (const s of await CrmAccount.distinct('stage')) {
      stats.byStage[s] = await CrmAccount.countDocuments({ stage: s });
    }
  }

  console.log(`\naccounts created : ${stats.created}`);
  console.log(`accounts merged  : ${stats.merged}   (the same company in both sheets)`);
  console.log(`meetings recorded: ${stats.meetings}   (marked undated)`);
  if (creditEmail) console.log(`meetings credited  : ${stats.credited}`);
  console.log(`rows skipped     : ${stats.skipped}`);
  if (!dry) {
    console.log(`\ntotal accounts   : ${await CrmAccount.countDocuments()}`);
    console.log('by stage         :', stats.byStage);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
