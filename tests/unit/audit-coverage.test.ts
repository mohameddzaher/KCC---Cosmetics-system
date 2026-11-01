import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * The audit log is only worth anything if it is complete, and the next route
 * written will not remember it. These fail the moment something is added
 * outside it.
 */

const walk = (d: string): string[] =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

/** Each with its reason. Adding to this should be a decision. */
const NOT_AUDITED: Record<string, string> = {
  'src/app/api/knowledge/chat/route.ts': 'a question to the assistant, changes nothing',
  'src/app/api/promos/validate/route.ts': 'checks a code, changes nothing',
  'src/app/api/notifications/route.ts': 'marking a notification read is not a business event',
  'src/app/api/seed/route.ts': 'refuses to run in production',
};

const routes = walk('src/app/api').filter((f) => f.endsWith('route.ts'));

test('every route that writes goes through audited()', () => {
  const missing = routes.filter((f) => {
    if (NOT_AUDITED[f]) return false;
    const src = readFileSync(f, 'utf8');
    return /export (async function|const) (POST|PUT|PATCH|DELETE)\b/.test(src)
      && /export async function (POST|PUT|PATCH|DELETE)\b/.test(src);
  });
  assert.deepEqual(missing, []);
});

test('taking data out of the system is audited', () => {
  for (const f of routes.filter((r) => /buildXlsx|buildPdf/.test(readFileSync(r, 'utf8')))) {
    assert.match(readFileSync(f, 'utf8'), /audited\(async function GET/, f);
  }
});

test('nothing bypasses the model hooks', () => {
  const offenders = [...walk('src/app'), ...walk('src/lib')]
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => /\.bulkWrite\(|\.collection\.(insert|update|delete|replace|drop)/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});

test('every model is watched', () => {
  const skip = new Set(['AuditLog.ts', 'Notification.ts']);
  const unwatched = readdirSync('src/models')
    .filter((f) => !skip.has(f))
    .filter((f) => !readFileSync(`src/models/${f}`, 'utf8').includes('.plugin(auditTrail)'));
  assert.deepEqual(unwatched, []);
});

test('the audit log has no route that writes to it', () => {
  for (const f of routes.filter((r) => r.startsWith(path.join('src/app/api/audit')))) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /(POST|PUT|PATCH|DELETE)\b.*(function|=)/, f);
  }
});
