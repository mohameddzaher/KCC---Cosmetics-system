/**
 * Seed the homepage news posts.
 *
 * The Latest Updates strip shows the three most recent published posts, and
 * there were only two -- so the row rendered short. These three are KCC's own
 * updates about the industry and about manufacturing in the Kingdom: they are
 * positioning and guidance written by the company, not reports of third-party
 * events, and every word of them is editable under Admin -> CMS Manager ->
 * News.
 *
 * SAFE TO RE-RUN. Posts are matched on slug and only created if absent; an
 * existing post is never overwritten, so anything the team has since reworded
 * survives. Nothing already published is unpublished or deleted.
 *
 * Usage:  npx tsx scripts/seed-news.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

import mongoose from 'mongoose';
import NewsPost from '../src/models/NewsPost';
import POSTS from '../src/data/news-seed.json';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  let created = 0;
  let kept = 0;

  for (const post of POSTS as Array<Record<string, any>>) {
    const existing = await NewsPost.findOne({ slug: post.slug });
    if (existing) {
      kept++;
      continue;
    }
    await NewsPost.create({
      ...post,
      publishedAt: new Date(post.publishedAt),
      author: 'KCC',
      status: 'published',
    });
    created++;
  }

  const published = await NewsPost.countDocuments({ status: 'published' });
  console.log(`created ${created}, left existing ${kept}`);
  console.log(`${published} published post(s) -- the homepage shows the newest three.`);

  const newest: any[] = await NewsPost.find({ status: 'published' })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();
  newest.forEach((n) => console.log(`  ${new Date(n.publishedAt).toISOString().slice(0, 10)}  ${n.title.en}`));

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
