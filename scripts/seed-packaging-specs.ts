/**
 * Seed — make every part of the packaging studio admin-editable.
 *
 * WHY
 * ---
 * The bottle shape came from a master list the admin could edit, but the cap,
 * label, finish and pack colour were hard-coded in the React component. So the
 * one screen customers spend the most time on was the one screen the business
 * could not control. This registers each of those as an ordinary
 * SpecOptionMaster, seeded from the shape library so every value shown is a
 * value the studio can actually draw, and adds the matching spec to every
 * existing product config.
 *
 * `package-color` is migrated too: it was titled "Package Color" but its
 * options were opaque / translucent / transparent — a transparency question,
 * which is now what `package-finish` answers. It only migrates while those
 * three untouched seed options are still in place, so an admin who has already
 * customised the list keeps their work.
 *
 * SAFE TO RE-RUN. Masters are upserted by categoryKey and never lose
 * admin-authored labels; product configs only gain specs they are missing.
 *
 * Usage:  npx tsx scripts/seed-packaging-specs.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import SpecOptionMaster from '../src/models/SpecOptionMaster';
import ProductSpecConfig from '../src/models/ProductSpecConfig';

/* The option sets below mirror src/components/order/sample-quiz/widgets/
   packaging/shapes.tsx. They are duplicated rather than imported because that
   module is a client component full of JSX. Values MUST stay in sync — the
   studio silently drops any value it cannot draw. */

const CAPS = [
  ['flat-cap', 'Flat screw cap', 'غطاء لولبي مسطح'],
  ['domed-cap', 'Domed cap', 'غطاء مقبب'],
  ['pump', 'Lotion pump', 'مضخة لوشن'],
  ['sprayer', 'Fine mist sprayer', 'بخاخ رذاذ'],
  ['dropper-cap', 'Dropper + bulb', 'قطارة بكرة مطاطية'],
  ['flip-top', 'Flip-top', 'غطاء قلاب'],
  ['disc-top', 'Disc top', 'غطاء قرصي'],
];

const LABELS = [
  ['none', 'No label', 'بدون ملصق'],
  ['full-wrap', 'Full wrap', 'ملصق كامل'],
  ['band', 'Centre band', 'شريط أوسط'],
  ['oval', 'Oval badge', 'ملصق بيضاوي'],
  ['top-strip', 'Top strip', 'شريط علوي'],
  ['minimal', 'Minimal line', 'خط بسيط'],
];

const FINISHES = [
  ['glossy', 'Glossy', 'لامع'],
  ['matte', 'Matte', 'مطفي'],
  ['frosted', 'Frosted', 'مثلج'],
  ['transparent', 'Transparent', 'شفاف'],
  ['metallic', 'Metallic', 'معدني'],
];

const COLORS = [
  ['pearl-white', 'Pearl white', 'أبيض لؤلؤي', '#F7F3EE'],
  ['blush', 'Blush', 'وردي فاتح', '#E8B4BC'],
  ['rose', 'Deep rose', 'وردي غامق', '#C57E87'],
  ['champagne', 'Champagne', 'شمبانيا', '#D4A574'],
  ['gold', 'Gold', 'ذهبي', '#C9A84C'],
  ['emerald', 'Emerald', 'زمردي', '#2D6A4F'],
  ['espresso', 'Espresso', 'بني داكن', '#2F2014'],
  ['onyx', 'Onyx', 'أسود', '#1B1B24'],
  ['sky', 'Sky', 'سماوي', '#A8C8DE'],
  ['sage', 'Sage', 'أخضر باهت', '#A8B89A'],
];

interface MasterSeed {
  categoryKey: string;
  defaultTitleEn: string;
  defaultTitleAr: string;
  defaultSubtitleEn: string;
  defaultSubtitleAr: string;
  widget: string;
  options: Array<{ value: string; labelEn: string; labelAr: string; meta?: Record<string, unknown> }>;
}

const SEEDS: MasterSeed[] = [
  {
    categoryKey: 'package-cap',
    defaultTitleEn: 'Cap & dispenser',
    defaultTitleAr: 'الغطاء وطريقة الصرف',
    defaultSubtitleEn: 'How the product comes out of the pack.',
    defaultSubtitleAr: 'كيف يخرج المنتج من العبوة.',
    widget: 'icon-cards',
    options: CAPS.map(([value, labelEn, labelAr]) => ({ value, labelEn, labelAr })),
  },
  {
    categoryKey: 'package-label',
    defaultTitleEn: 'Label style',
    defaultTitleAr: 'شكل الملصق',
    defaultSubtitleEn: 'How much of the pack the artwork covers.',
    defaultSubtitleAr: 'المساحة التي يغطيها التصميم على العبوة.',
    widget: 'icon-cards',
    options: LABELS.map(([value, labelEn, labelAr]) => ({ value, labelEn, labelAr })),
  },
  {
    categoryKey: 'package-finish',
    defaultTitleEn: 'Surface finish',
    defaultTitleAr: 'لمسة السطح',
    defaultSubtitleEn: 'Glossy, matte, frosted — and how much of the product shows through.',
    defaultSubtitleAr: 'لامع أو مطفي أو مثلج — وكم يظهر المنتج من خلال العبوة.',
    widget: 'icon-cards',
    options: FINISHES.map(([value, labelEn, labelAr]) => ({ value, labelEn, labelAr })),
  },
];

/** Options the `package-color` master shipped with before it became a colour. */
const LEGACY_PACKAGE_COLOR = ['opaque', 'translucent', 'transparent'];

async function upsertMasters() {
  for (const seed of SEEDS) {
    const existing: any = await SpecOptionMaster.findOne({ categoryKey: seed.categoryKey });
    if (!existing) {
      await SpecOptionMaster.create({ ...seed, active: true });
      console.log(`  + created master ${seed.categoryKey} (${seed.options.length} options)`);
      continue;
    }
    // Only add values the studio can draw but the master is missing. Existing
    // entries — including any label the admin rewrote — are left alone.
    const have = new Set(existing.options.map((o: any) => o.value));
    const missing = seed.options.filter((o) => !have.has(o.value));
    if (missing.length === 0) {
      console.log(`  = master ${seed.categoryKey} already complete`);
      continue;
    }
    existing.options.push(...missing);
    await existing.save();
    console.log(`  ~ master ${seed.categoryKey} += ${missing.map((o) => o.value).join(', ')}`);
  }
}

async function migratePackageColor() {
  const m: any = await SpecOptionMaster.findOne({ categoryKey: 'package-color' });
  if (!m) {
    await SpecOptionMaster.create({
      categoryKey: 'package-color',
      defaultTitleEn: 'Pack colour',
      defaultTitleAr: 'لون العبوة',
      defaultSubtitleEn: 'The colour of the pack itself.',
      defaultSubtitleAr: 'لون العبوة نفسها.',
      widget: 'color-swatches',
      options: COLORS.map(([value, labelEn, labelAr, hex]) => ({ value, labelEn, labelAr, meta: { hex } })),
      active: true,
    });
    console.log('  + created master package-color');
    return;
  }

  const values = m.options.map((o: any) => o.value).sort();
  const untouched =
    values.length === LEGACY_PACKAGE_COLOR.length &&
    values.every((v: string, i: number) => v === [...LEGACY_PACKAGE_COLOR].sort()[i]);

  if (!untouched) {
    const have = new Set(m.options.map((o: any) => o.value));
    const missing = COLORS.filter(([v]) => !have.has(v)).map(([value, labelEn, labelAr, hex]) => ({
      value,
      labelEn,
      labelAr,
      meta: { hex },
    }));
    if (missing.length === 0) return console.log('  = master package-color already complete');
    m.options.push(...missing);
    await m.save();
    return console.log(`  ~ master package-color += ${missing.length} colour(s), admin edits kept`);
  }

  m.defaultTitleEn = 'Pack colour';
  m.defaultTitleAr = 'لون العبوة';
  m.defaultSubtitleEn = 'The colour of the pack itself.';
  m.defaultSubtitleAr = 'لون العبوة نفسها.';
  m.widget = 'color-swatches';
  m.options = COLORS.map(([value, labelEn, labelAr, hex]) => ({ value, labelEn, labelAr, meta: { hex } }));
  await m.save();
  console.log('  ~ migrated package-color from transparency options to real colours');
}

/** Where each packaging part sits, so the admin list reads in studio-tab order. */
const AFTER = 'product-packaging';
const PART_ORDER = ['package-cap', 'package-label', 'package-finish', 'package-color'];

async function backfillProductConfigs() {
  const masters: any[] = await SpecOptionMaster.find({ categoryKey: { $in: PART_ORDER } }).lean();
  const byKey = new Map(masters.map((m) => [m.categoryKey, m]));

  const configs: any[] = await ProductSpecConfig.find({});
  let touched = 0;

  for (const cfg of configs) {
    const have = new Set(cfg.specs.map((s: any) => s.specKey));
    const missing = PART_ORDER.filter((k) => !have.has(k) && byKey.has(k));
    if (missing.length === 0) continue;

    const anchor = cfg.specs.findIndex((s: any) => s.specKey === AFTER);
    const insertAt = anchor === -1 ? cfg.specs.length : anchor + 1;

    const added = missing.map((key) => {
      const master: any = byKey.get(key);
      return {
        specKey: key,
        enabled: true,
        titleEn: master.defaultTitleEn,
        titleAr: master.defaultTitleAr,
        subtitleEn: master.defaultSubtitleEn,
        subtitleAr: master.defaultSubtitleAr,
        maxSelect: 1,
        // The studio always has something selected, so nothing to enforce.
        isRequired: false,
        sortOrder: 0,
        allowedOptions: (master.options || []).map((o: any) => o.value),
      };
    });

    cfg.specs.splice(insertAt, 0, ...added);
    // Re-number so sortOrder still matches the visible order.
    cfg.specs.forEach((s: any, i: number) => {
      s.sortOrder = i;
    });
    cfg.markModified('specs');
    await cfg.save();
    touched++;
  }

  console.log(`  ~ backfilled ${touched}/${configs.length} product config(s)`);
}

/**
 * Configs written before the package-color migration still allow only the old
 * opaque / translucent / transparent values, which no longer exist in the
 * master — leaving the studio's colour tab with nothing to show. Any config
 * whose allowed list has drifted entirely out of the master is reopened to the
 * full list; a config that still allows at least one live value is a
 * deliberate admin choice and is left alone.
 */
async function repairStaleAllowedOptions() {
  const masters: any[] = await SpecOptionMaster.find({ categoryKey: { $in: PART_ORDER } }).lean();
  let fixed = 0;

  for (const master of masters) {
    const live = new Set((master.options || []).map((o: any) => o.value));
    const configs: any[] = await ProductSpecConfig.find({ 'specs.specKey': master.categoryKey });

    for (const cfg of configs) {
      const spec = cfg.specs.find((s: any) => s.specKey === master.categoryKey);
      if (!spec || spec.allowedOptions.length === 0) continue;
      if (spec.allowedOptions.some((v: string) => live.has(v))) continue;

      spec.allowedOptions = [...live] as string[];
      cfg.markModified('specs');
      await cfg.save();
      fixed++;
    }
  }

  console.log(`  ~ reopened ${fixed} stale allowed-option list(s)`);
}

/**
 * The per-product config keeps its own copy of each spec's title and helper so
 * an admin can word a question differently for one product. Those copies were
 * stamped from the OLD package-color wording, so the studio's colour tab was
 * still called "Package Color / Should your packaging show the product or hide
 * it?". Only copies that still match that seed text are refreshed — anything an
 * admin has rewritten is left exactly as they wrote it.
 */
const LEGACY_COLOR_TITLES = ['Package Color', 'لون العلبة'];
const LEGACY_COLOR_SUBTITLE = 'Should your packaging show the product or hide it?';

async function refreshLegacyColorWording() {
  const master: any = await SpecOptionMaster.findOne({ categoryKey: 'package-color' }).lean();
  if (!master) return;

  const configs: any[] = await ProductSpecConfig.find({ 'specs.specKey': 'package-color' });
  let fixed = 0;

  for (const cfg of configs) {
    const spec = cfg.specs.find((s: any) => s.specKey === 'package-color');
    if (!spec) continue;

    let touched = false;
    if (!spec.titleEn || LEGACY_COLOR_TITLES.includes(spec.titleEn)) {
      spec.titleEn = master.defaultTitleEn;
      touched = true;
    }
    if (!spec.titleAr || LEGACY_COLOR_TITLES.includes(spec.titleAr)) {
      spec.titleAr = master.defaultTitleAr;
      touched = true;
    }
    if (!spec.subtitleEn || spec.subtitleEn === LEGACY_COLOR_SUBTITLE) {
      spec.subtitleEn = master.defaultSubtitleEn;
      touched = true;
    }
    if (!spec.subtitleAr) {
      spec.subtitleAr = master.defaultSubtitleAr;
      touched = true;
    }
    if (!touched) continue;

    cfg.markModified('specs');
    await cfg.save();
    fixed++;
  }

  console.log(`  ~ refreshed package-color wording on ${fixed} config(s)`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);
  console.log('connected');

  console.log('masters:');
  await upsertMasters();
  await migratePackageColor();

  console.log('product configs:');
  await backfillProductConfigs();
  await repairStaleAllowedOptions();
  await refreshLegacyColorWording();

  await mongoose.disconnect();
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
