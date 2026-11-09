/**
 * Build and run the end-to-end suite without ever reaching the live database.
 *
 *   npm run test:e2e [-- tests/e2e/one.test.ts]
 *
 * `next build` prerenders pages whose metadata is read from MongoDB, and
 * `.env.local` points at production. A plain build would read the live data
 * every time the tests run. Here the build gets a throwaway MongoDB of its
 * own, and each test file starts its own (tests/helpers.ts).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { hasMongod, startMongod } from '../tests/helpers';

async function main() {
  if (!hasMongod()) {
    console.error('mongod is not installed: brew tap mongodb/brew && brew install mongodb-community');
    process.exit(1);
  }
  const files = process.argv.slice(2);
  const all = readdirSync('tests/e2e').filter((f) => f.endsWith('.test.ts')).sort().map((f) => `tests/e2e/${f}`);
  const db = await startMongod(27190);
  const env = { ...process.env, MONGODB_URI: db.uri };
  let code = 0;
  try {
    const build = spawnSync('npx', ['next', 'build'], { stdio: 'inherit', env });
    if (build.status !== 0) {
      code = build.status ?? 1;
      return;
    }
    const run = spawnSync(
      'npx',
      ['tsx', '--test', '--test-concurrency=1', ...(files.length ? files : all)],
      { stdio: 'inherit', env }
    );
    code = run.status ?? 1;
  } finally {
    await db.stop();
    process.exit(code);
  }
}

main();
