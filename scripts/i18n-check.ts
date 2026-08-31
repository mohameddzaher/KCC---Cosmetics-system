/**
 * Lists admin/account strings that are wrapped in tx() but have no Arabic
 * translation yet, so a gap is a one-line report instead of a surprise on
 * screen. Run: npm run i18n:check
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOTS = ['src/app', 'src/components'];
const IGNORE = /^(https?:|\/|#|\d|[a-z0-9._%+-]+@|image\/|auto-generated|value$|preview$)/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const used = new Set<string>();
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/tx\('((?:[^'\\]|\\.)*)'\)/g)) {
      used.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
    }
  }
}

const stringsSrc = fs.readFileSync('src/i18n/strings.ts', 'utf8');
const have = new Set<string>();
for (const m of stringsSrc.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)) have.add(m[1]);

const missing = [...used].filter((s) => !have.has(s) && !IGNORE.test(s)).sort();

console.log(`${used.size} string(s) used via tx(), ${missing.length} without an Arabic translation.`);
for (const s of missing) console.log('  •', s);
process.exit(missing.length > 0 ? 1 : 0);
