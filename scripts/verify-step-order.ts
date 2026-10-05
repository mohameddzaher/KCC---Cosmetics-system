/**
 * The step-order rules, checked on their own.
 *
 * This is the one piece of pure logic in the quiz admin that could scramble the
 * step order of every product at once, so it is worth a check that does not
 * need a browser, a database or a login.
 *
 *   npm run verify:step-order
 */
import { buildStepSequence } from '../src/lib/sample-quiz/packagingParts';

const CARRIED = [
  'oils-extracts', 'actives', 'fine-actives', 'product-color', 'fragrances',
  'product-packaging', 'package-cap', 'package-label', 'package-finish', 'package-color',
];
/** A library exists for this one, but no product asks it — so it is not a step. */
const known = new Set([...CARRIED, 'fragrance-intensity']);
const current = new Map(CARRIED.map((k, i) => [k, i]));
const PARTS = ['package-cap', 'package-label', 'package-finish', 'package-color'];
const STEPS = ['oils-extracts', 'actives', 'fine-actives', 'product-color', 'fragrances', 'product-packaging'];

let fails = 0;
function check(name: string, got: string[], holds: (g: string[]) => boolean) {
  const ok = holds(got);
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}`);
  if (!ok) console.log('        ' + got.join(' > '));
}

/** The studio's tabs must sit immediately behind it, in order. */
const partsPinned = (g: string[]) => {
  const i = g.indexOf('product-packaging');
  return i >= 0 && PARTS.every((p, n) => g[i + 1 + n] === p);
};
const complete = (g: string[]) => g.length === CARRIED.length;

check('canonical order keeps the tabs behind the studio',
  buildStepSequence(STEPS, known, current),
  (g) => partsPinned(g) && complete(g) && g[4] === 'fragrances' && g[5] === 'product-packaging');

check('the studio dragged to the front takes its tabs with it',
  buildStepSequence(['product-packaging', ...STEPS.filter((k) => k !== 'product-packaging')], known, current),
  (g) => partsPinned(g) && complete(g) && g[0] === 'product-packaging');

check('a step the client left out keeps its place instead of being lost',
  buildStepSequence(STEPS.filter((k) => k !== 'actives'), known, current),
  (g) => g.includes('actives') && partsPinned(g) && complete(g));

check('a tab sent as though it were a step is ignored, and stays pinned',
  buildStepSequence(['package-cap', ...STEPS], known, current),
  (g) => partsPinned(g) && complete(g) && g.filter((k) => k === 'package-cap').length === 1);

check('duplicates and unknown keys are dropped',
  buildStepSequence(['oils-extracts', 'oils-extracts', 'not-a-library', ...STEPS], known, current),
  (g) => complete(g) && !g.includes('not-a-library') && g.filter((k) => k === 'oils-extracts').length === 1);

check('a library no product carries never becomes a step',
  buildStepSequence(['fragrance-intensity', ...STEPS], known, current),
  (g) => !g.includes('fragrance-intensity') && complete(g) && g[0] === 'oils-extracts');

console.log(fails === 0 ? '\nAll step-order rules hold.' : `\n${fails} rule(s) broken.`);
process.exit(fails === 0 ? 0 : 1);
