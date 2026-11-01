import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** A throwaway MongoDB, so no test can ever touch the live data. */
export function hasMongod(): boolean {
  return spawnSync('mongod', ['--version']).status === 0;
}

export async function startMongod(port: number) {
  const dir = mkdtempSync(path.join(tmpdir(), 'kcc-test-'));
  const proc: ChildProcess = spawn('mongod', ['--dbpath', dir, '--port', String(port), '--bind_ip', '127.0.0.1', '--quiet'], { stdio: 'ignore' });
  const { default: mongoose } = await import('mongoose');
  for (let i = 0; i < 100; i++) {
    try {
      const c = await mongoose.createConnection(`mongodb://127.0.0.1:${port}/ping`, { serverSelectionTimeoutMS: 300 }).asPromise();
      await c.close();
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return {
    uri: `mongodb://127.0.0.1:${port}/kcc_test`,
    async stop() {
      const exited = new Promise((r) => proc.once('exit', r));
      proc.kill();
      await exited;
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    },
  };
}
