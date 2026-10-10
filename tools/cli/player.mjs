// Black-box player. Only stdin/stdout/stderr; never import runtime or inspect saves.
import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
const ROOT = path.resolve(import.meta.dirname, '../..');
export const CLI_PROCESS_MS = 10000;
const PROMPT = '等待输入>\n';
export async function playCase(fn) {
  const base = process.env.HOF_TEST_ROOT || process.env.TMPDIR || path.join(os.homedir(), 'tmp');
  await fs.mkdir(base, { recursive: true }); const dir = await fs.mkdtemp(path.join(base, 'player-'));
  const players = [];
  try { await fn((seed = 42) => { const p = new Player(dir, seed); players.push(p); return p; }); }
  finally {
    await Promise.all(players.map(p => p.dispose())); await fs.rm(dir, { recursive: true, force: true });
    try { await fs.access(dir); throw new Error('APPARATUS RESIDUE player directory'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}
class Player {
  #child; #offset = 0; #waiters = new Set(); #closed = false; #close; #timer; #problem;
  stdout = ''; stderr = '';
  constructor(dir, seed) {
    this.#child = spawn(process.execPath, [path.join(ROOT, 'stories/hof-cli/play.mjs'), '--engine', process.env.HOF_ENGINE, '--seed', String(seed), '--save-dir', path.join(dir, 'slots')], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    this.#child.stdout.setEncoding('utf8'); this.#child.stderr.setEncoding('utf8');
    const read = (key, data) => { this[key] += data; if (Buffer.byteLength(this.stdout + this.stderr) > 256 * 1024) { this.#problem = 'APPARATUS CLI output >256KiB'; this.#child.kill('SIGKILL'); } this.#notify(); };
    this.#child.stdout.on('data', data => read('stdout', data)); this.#child.stderr.on('data', data => read('stderr', data));
    this.#child.on('error', e => { this.#problem = `APPARATUS CLI spawn ${e.code}`; this.#notify(); });
    this.#child.stdin.on('error', () => this.#notify());
    this.#close = new Promise(resolve => this.#child.once('close', (code, signal) => { this.#closed = true; clearTimeout(this.#timer); this.#notify(); resolve({ code, signal }); }));
    this.#timer = setTimeout(() => { this.#problem = `TIMEOUT CLI ${CLI_PROCESS_MS}ms`; this.#child.kill('SIGKILL'); this.#notify(); }, CLI_PROCESS_MS);
  }
  #notify() { for (const wake of this.#waiters) wake(); this.#waiters.clear(); }
  async frame() {
    for (;;) {
      if (this.#problem) throw new Error(this.#problem);
      const end = this.stdout.indexOf(PROMPT, this.#offset);
      if (end !== -1) { const text = this.stdout.slice(this.#offset, end); this.#offset = end + PROMPT.length; return text; }
      if (this.#closed) throw new Error(`${this.stderr.includes('APPARATUS') ? 'APPARATUS' : 'CLI_EXIT'} before wait boundary: ${this.stdout}\n${this.stderr}`);
      await new Promise(resolve => this.#waiters.add(resolve));
    }
  }
  async command(line) {
    if (this.#closed) throw new Error('CLI_EXIT command after close');
    this.#child.stdin.write(line + '\n'); return this.frame();
  }
  async select(frame, label) {
    const choices = [...frame.matchAll(/^(\d+)\. (.+)$/gm)].filter(m => m[2].startsWith(label));
    if (choices.length !== 1 || choices[0][2].includes('不可选')) throw new Error(`PLAYER_CHOICE expected one enabled ${label}: ${frame}`);
    return this.command(choices[0][1]);
  }
  async quit() {
    this.#child.stdin.write('quit\n'); const result = await this.#close;
    if (this.#problem) throw new Error(this.#problem);
    if (result.code !== 0 || this.stderr) throw new Error(`CLI_EXIT quit ${result.code}: ${this.stderr}`);
  }
  async dispose() { if (!this.#closed) this.#child.kill('SIGKILL'); await this.#close; clearTimeout(this.#timer); }
}
