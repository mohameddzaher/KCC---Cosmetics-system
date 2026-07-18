/**
 * Replace broken local image paths on seeded content with working image URLs,
 * and top up the portfolio with more items so the public pages look complete.
 * Safe: only updates image fields + upserts portfolio by slug. Idempotent.
 *
 *   npx tsx scripts/enrich-content.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import Service from '../src/models/Service';
import Certificate from '../src/models/Certificate';
import Factory from '../src/models/Factory';
import NewsPost from '../src/models/NewsPost';
import PortfolioItem from '../src/models/PortfolioItem';

const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=1000&q=80`;

const SERVICE_IMGS = [
  U('1504328345606-18bbc8c9d7d1'), U('1556228578-0d85b1a4d571'),
  U('1532187863486-abf9dbad1b69'), U('1608248543803-ba4f8c70ae0b'),
  U('1581093450021-4a7360e9a6b5'), U('1454165804606-c3d57bc86b40'),
];
const CERT_IMGS = [
  U('1450101499163-c8848c66ca85'), U('1532187863486-abf9dbad1b69'),
  U('1586281380349-632531db7ed4'), U('1542601906990-b4d3fb778b09'),
];
const FACTORY_IMGS = [U('1581093458791-9f3c3250a8b0'), U('1567113463300-102a7eb3cb26'), U('1565043666747-69f6646db940')];
const NEWS_IMGS = [U('1504711434969-e33886168f5c'), U('1450101499163-c8848c66ca85'), U('1596462502278-27bfdc403348')];

const PORTFOLIO = [
  { slug: 'vitamin-c-brightening-serum', title: { en: 'Vitamin C Brightening Serum', ar: 'سيروم فيتامين سي للتفتيح' }, category: { en: 'Skincare', ar: 'العناية بالبشرة' }, client: 'GlowUp Beauty', description: { en: 'A high-potency 20% Vitamin C serum for brightening and anti-aging.', ar: 'سيروم فيتامين سي 20% للتفتيح ومكافحة التقدم في السن.' }, imageUrl: U('1620916566398-39f1143ab7be') },
  { slug: 'hydrating-gel-moisturizer', title: { en: 'Hydrating Gel Moisturizer', ar: 'مرطب جل مائي' }, category: { en: 'Skincare', ar: 'العناية بالبشرة' }, client: 'PureGlow', description: { en: 'Lightweight gel moisturizer with hyaluronic acid.', ar: 'مرطب جل خفيف بحمض الهيالورونيك.' }, imageUrl: U('1611930022073-b7a4ba5fcccd') },
  { slug: 'keratin-repair-shampoo', title: { en: 'Keratin Repair Shampoo', ar: 'شامبو كيراتين للإصلاح' }, category: { en: 'Haircare', ar: 'العناية بالشعر' }, client: 'SilkStrand', description: { en: 'Professional keratin shampoo for damaged hair.', ar: 'شامبو كيراتين احترافي للشعر التالف.' }, imageUrl: U('1527799820374-dcf8d9d4a388') },
  { slug: 'spf-50-sunscreen-cream', title: { en: 'SPF 50+ Sunscreen Cream', ar: 'كريم واقي شمس SPF 50+' }, category: { en: 'Suncare', ar: 'العناية من الشمس' }, client: 'SunShield Arabia', description: { en: 'Broad-spectrum SPF 50+ for the Gulf climate.', ar: 'حماية واسعة SPF 50+ لمناخ الخليج.' }, imageUrl: U('1556227834-09f1de7a7d14') },
  { slug: 'matte-liquid-foundation', title: { en: 'Matte Liquid Foundation', ar: 'كريم أساس مطفي' }, category: { en: 'Makeup', ar: 'المكياج' }, client: 'Dalal Cosmetics', description: { en: 'Long-wear matte foundation in 24 shades.', ar: 'كريم أساس مطفي طويل الثبات بـ24 درجة.' }, imageUrl: U('1512496015851-a90fb38ba796') },
  { slug: 'retinol-night-cream', title: { en: 'Retinol Night Cream', ar: 'كريم ليلي بالريتينول' }, category: { en: 'Skincare', ar: 'العناية بالبشرة' }, client: 'NightRevive', description: { en: 'Anti-aging night cream with encapsulated retinol.', ar: 'كريم ليلي لمكافحة الشيخوخة بريتينول مغلّف.' }, imageUrl: U('1556228720-195a672e8a03') },
  { slug: 'argan-oil-hair-mask', title: { en: 'Argan Oil Hair Mask', ar: 'ماسك شعر بزيت الأرغان' }, category: { en: 'Haircare', ar: 'العناية بالشعر' }, client: 'Moroccan Essence', description: { en: 'Deep conditioning mask with pure argan oil.', ar: 'ماسك ترطيب عميق بزيت الأرغان النقي.' }, imageUrl: U('1522335789203-aabd1fc54bc9') },
  { slug: 'shea-butter-body-lotion', title: { en: 'Shea Butter Body Lotion', ar: 'لوشن جسم بزبدة الشيا' }, category: { en: 'Body Care', ar: 'العناية بالجسم' }, client: 'Nourish Arabia', description: { en: 'Rich body lotion with organic shea butter.', ar: 'لوشن غني بزبدة الشيا العضوية.' }, imageUrl: U('1608248543803-ba4f8c70ae0b') },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('Connected.\n');

  const services = await Service.find().sort({ order: 1 });
  for (let i = 0; i < services.length; i++) {
    services[i].image = SERVICE_IMGS[i % SERVICE_IMGS.length];
    await services[i].save();
  }
  console.log(`Updated ${services.length} service images.`);

  const certs = await Certificate.find().sort({ order: 1 });
  for (let i = 0; i < certs.length; i++) { certs[i].imageUrl = CERT_IMGS[i % CERT_IMGS.length]; await certs[i].save(); }
  console.log(`Updated ${certs.length} certificate images.`);

  const facs = await Factory.find().sort({ order: 1 });
  for (let i = 0; i < facs.length; i++) { facs[i].imageUrl = FACTORY_IMGS[i % FACTORY_IMGS.length]; await facs[i].save(); }
  console.log(`Updated ${facs.length} factory images.`);

  const news = await NewsPost.find();
  for (let i = 0; i < news.length; i++) { news[i].imageUrl = NEWS_IMGS[i % NEWS_IMGS.length]; await news[i].save(); }
  console.log(`Updated ${news.length} news images.`);

  let added = 0;
  for (let i = 0; i < PORTFOLIO.length; i++) {
    const p = PORTFOLIO[i];
    const res = await PortfolioItem.findOneAndUpdate(
      { slug: p.slug },
      { $set: { ...p, tags: [], enabled: true, order: i } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (res) added++;
  }
  console.log(`Upserted ${added} portfolio items.`);

  console.log('\nDone.');
  await mongoose.disconnect();
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
