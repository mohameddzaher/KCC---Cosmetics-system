/**
 * Every public page at every screen size, in both languages, for a
 * before/after look and an automatic check of what goes wrong at the edges.
 *
 *   npx tsx scripts/screenshots.ts [--base http://127.0.0.1:3000] [--out qa-screenshots/after]
 *                                  [--pages /,/about] [--widths 375,1920 | --sizes 375x812,3840x2160] [--dark] [--no-images]
 *
 * Needs a running server (`next start`, pointed at a throwaway database).
 * Images go to qa-screenshots/ (git-ignored). Alongside them, report.json
 * lists, per page and size:
 *   - overflowX: the page scrolls sideways (it never should)
 *   - smallTargets: links and buttons under 44 px on a phone
 *   - fontPx: the root font size, to see the big-screen scaling at work
 *   - shellPx: how wide the main content column actually is
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright';

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const BASE = arg('base', 'http://127.0.0.1:3000')!;
const OUT = arg('out', 'qa-screenshots/latest')!;
const PAGES = (arg('pages') ||
  '/,/about,/production,/factories,/portfolio,/certificates,/news,/contact,/order,/order/sample,/order/bulk,/login,/policies').split(',');
const SIZES: Array<[number, number]> = arg('sizes')
  ? arg('sizes')!.split(',').map((x) => x.split('x').map(Number) as [number, number])
  : (arg('widths')
  ? arg('widths')!.split(',').map((w) => [Number(w), 900] as [number, number])
  : [[320, 640], [375, 812], [414, 896], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440], [3840, 2160], [5760, 1080], [1080, 1920]]);
const THEMES = flag('dark') ? ['light', 'dark'] : ['light'];
const SAVE_IMAGES = !flag('no-images');

interface Row {
  page: string; size: string; locale: string; theme: string;
  overflowX: number; smallTargets: number; fontPx: number; shellPx: number; errors: string[];
}

async function measure(page: Page, mobile: boolean) {
  return page.evaluate((isMobile) => {
    const doc = document.documentElement;
    const overflowX = Math.max(0, doc.scrollWidth - window.innerWidth);
    let smallTargets = 0;
    if (isMobile) {
      for (const el of Array.from(document.querySelectorAll('a[href], button, [role="button"], input, select'))) {
        const r = (el as HTMLElement).getBoundingClientRect();
        const style = getComputedStyle(el as HTMLElement);
        if (r.width === 0 || r.height === 0 || style.visibility === 'hidden') continue;
        // Small to the eye, with an invisible 44 px hit area drawn around it.
        if ((el as HTMLElement).dataset.hitArea === '44') continue;
        if (r.height < 44 && r.width < 44) smallTargets++;
      }
    }
    const shell = document.querySelector('.page-shell') as HTMLElement | null;
    return {
      overflowX,
      smallTargets,
      fontPx: parseFloat(getComputedStyle(doc).fontSize),
      shellPx: shell ? Math.round(shell.getBoundingClientRect().width) : 0,
    };
  }, mobile);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const rows: Row[] = [];
  for (const theme of THEMES) {
    for (const locale of ['en', 'ar']) {
      for (const [w, h] of SIZES) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
        await ctx.addCookies([{ name: 'kcc-locale', value: locale, url: BASE }]);
        await ctx.addInitScript((t) => { try { localStorage.setItem('kcc-theme', t); } catch { /* */ } }, theme);
        const page = await ctx.newPage();
        for (const p of PAGES) {
          const errors: string[] = [];
          page.removeAllListeners('pageerror');
          page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
          await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch((e) => errors.push(String(e).slice(0, 160)));
          await page.waitForTimeout(400);
          const m = await measure(page, w < 768);
          rows.push({ page: p, size: `${w}x${h}`, locale, theme, ...m, errors });
          if (SAVE_IMAGES) {
            const name = `${p === '/' ? 'home' : p.slice(1).replace(/\//g, '_')}-${w}x${h}-${locale}-${theme}.png`;
            await page.screenshot({ path: path.join(OUT, name), fullPage: w <= 1920 });
          }
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 1));
  const bad = rows.filter((r) => r.overflowX > 0 || r.errors.length);
  console.log(`${rows.length} captures, ${bad.length} with sideways scroll or errors`);
  for (const r of bad) console.log(`  ${r.page} ${r.size} ${r.locale}: overflow ${r.overflowX}px ${r.errors.join(' | ')}`);
  const small = rows.filter((r) => r.smallTargets > 0);
  if (small.length) console.log(`small tap targets on phones: ${small.map((r) => `${r.page} ${r.size} ${r.locale}=${r.smallTargets}`).join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
