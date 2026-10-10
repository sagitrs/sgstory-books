#!/usr/bin/env node
// Registered family runner. Linux process groups/time budgets and TAP accounting
// follow the proven sgstory CLI runner pattern at engine pin f4f5fafc; no runtime
// is copied. The engine checkout is read-only even during game fault injections.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '../..');
const TEMP = process.env.TMPDIR || path.join(os.homedir(), 'tmp');
const BUDGET = { unit: 30000, e2e: 75000 };
const git = (root, ...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 10000 });
async function registry(root) { return JSON.parse(await fs.readFile(path.join(root, 'tests/hof-cli/registry.json'), 'utf8')); }
function kill(pid) { try { process.kill(-pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') throw e; } }
function alive(pid) { try { process.kill(-pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; } }
async function fingerprint(root, areas) {
  const status = git(root, 'status', '--porcelain=v1', '--untracked-files=all');
  if (status.error || status.status) throw new Error('APPARATUS unreadable git tree');
  const hash = createHash('sha256');
  async function visit(relative) {
    const full = path.join(root, relative), stat = await fs.lstat(full);
    if (stat.isDirectory()) for (const name of (await fs.readdir(full)).sort()) await visit(path.join(relative, name));
    else if (stat.isFile()) { hash.update(relative); hash.update(await fs.readFile(full)); }
    else throw new Error('APPARATUS unsupported source entry');
  }
  for (const area of areas) await visit(area);
  return { status: status.stdout, hash: hash.digest('hex') };
}
async function preflight(root, engine) {
  if (process.platform !== 'linux') throw new Error('APPARATUS family runner requires Linux groups');
  try { await fs.access(path.join(root, '.git')); } catch { throw new Error('APPARATUS HOF_BOOKS missing books git root'); }
  const checked = spawnSync(process.execPath, [path.join(root, 'tools/check-engine-pin.mjs'), '--ref-file', 'stories/hof-cli/engine-ref.json', '--engine', engine, '--quiet'], { cwd: root, encoding: 'utf8', timeout: 15000 });
  if (checked.error || checked.status !== 0) throw new Error(`APPARATUS HOF_PIN ${checked.error?.message || checked.stdout + checked.stderr}`);
  const pin = JSON.parse(await fs.readFile(path.join(root, 'stories/hof-cli/engine-ref.json'), 'utf8'));
  if (pin.interfaceVersion !== 1) throw new Error('APPARATUS unsupported CLI interface declaration');
  for (const file of ['main', 'session', 'storage', 'rng', 'json']) await fs.access(path.join(engine, `src/cli/${file}.mjs`));
  const status = git(engine, 'status', '--porcelain=v1', '--untracked-files=all');
  if (status.error || status.status || status.stdout) throw new Error('APPARATUS dirty/unreadable engine pin tree');
}
async function execute(root, engine, files, temp, suite) {
  const child = spawn(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=25000', ...files], { cwd: root, detached: true, env: { ...process.env, HOF_ENGINE: engine, HOF_TEST_ROOT: temp }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '', problem = '', timer;
  const read = data => { output += data; if (Buffer.byteLength(output) > 4 * 1024 * 1024 && !problem) { problem = 'APPARATUS test output >4MiB'; kill(child.pid); } };
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8'); child.stdout.on('data', read); child.stderr.on('data', read);
  const result = await new Promise(resolve => {
    child.once('error', e => { problem = `APPARATUS launch ${e.code}`; });
    child.once('close', (code, signal) => { clearTimeout(timer); resolve({ code, signal }); });
    timer = setTimeout(() => { problem = `TIMEOUT ${suite} ${BUDGET[suite]}ms`; kill(child.pid); }, BUDGET[suite]);
  });
  if (child.pid && alive(child.pid)) { kill(child.pid); problem ||= 'APPARATUS residual owned process group'; }
  return { ...result, output, problem };
}
const count = (text, key) => { const m = text.match(new RegExp(`^# ${key} (\\d+)$`, 'm')); return m ? Number(m[1]) : null; };
export async function runSuite(root, engine, suite, evidence = {}) {
  let temp, data;
  try {
    data = (await registry(root))[suite];
    if (!data || !Array.isArray(data.cases) || !data.cases.length || data.cases.some(x => typeof x !== 'string') || new Set(data.cases).size !== data.cases.length) throw new Error('APPARATUS empty/invalid case registry');
    const actual = (await fs.readdir(path.join(root, `tests/hof-cli/${suite}`))).filter(x => x.endsWith('.test.mjs')).sort().map(x => `tests/hof-cli/${suite}/${x}`);
    if (!actual.length || JSON.stringify(actual) !== JSON.stringify(data.files)) throw new Error('APPARATUS missing/unregistered test file');
    await preflight(root, engine);
    const before = [await fingerprint(root, ['stories/hof-cli', 'tests/hof-cli', 'tools/cli']), await fingerprint(engine, ['src/cli'])];
    await fs.mkdir(TEMP, { recursive: true }); temp = await fs.mkdtemp(path.join(TEMP, `hof-cli-${suite}-`));
    const result = await execute(root, engine, actual, temp, suite); process.stdout.write(result.output); Object.assign(evidence, result);
    if ((await fs.readdir(temp)).length) result.problem ||= 'APPARATUS RESIDUE family directory';
    const after = [await fingerprint(root, ['stories/hof-cli', 'tests/hof-cli', 'tools/cli']), await fingerprint(engine, ['src/cli'])];
    if (JSON.stringify(before) !== JSON.stringify(after)) result.problem ||= 'APPARATUS READONLY books/engine changed';
    const names = [...result.output.matchAll(/^# Subtest: (.+)$/gm)].map(m => m[1]);
    const [n, pass, fail, skipped, cancelled, todo] = ['tests', 'pass', 'fail', 'skipped', 'cancelled', 'todo'].map(k => count(result.output, k));
    if (!n || n !== data.cases.length || names.length !== n || JSON.stringify([...names].sort()) !== JSON.stringify([...data.cases].sort()) || [pass, fail, skipped, cancelled, todo].includes(null) || pass + fail + skipped + cancelled + todo !== n) result.problem ||= 'APPARATUS nonempty count/name registry mismatch';
    if (/testTimeoutFailure/.test(result.output)) result.problem ||= 'TIMEOUT named test >25000ms';
    if (result.signal || ![0, 1].includes(result.code) || (result.code !== 0 && fail === 0) || (result.code === 0 && fail > 0)) result.problem ||= 'APPARATUS child exit and named verdicts disagree';
    Object.assign(evidence, result);
    if (result.problem) {
      console.error(result.problem); console.log(`${suite}: 通过=0 产品失败=0 环境作废=${data.cases.length} 未覆盖=0 问题总数=${data.cases.length} 套件计划总数=${data.cases.length}`); return 2;
    }
    const environment = result.output.split(/^# Subtest: /m).slice(1).filter(x => /^not ok /m.test(x) && /APPARATUS|TIMEOUT|testTimeoutFailure/.test(x)).length;
    const product = fail - environment, uncovered = skipped + cancelled + todo, problems = product + environment + uncovered;
    console.log(`${suite}: 通过=${pass} 产品失败=${product} 环境作废=${environment} 未覆盖=${uncovered} 问题总数=${problems} 套件计划总数=${pass + problems}`);
    return environment || cancelled ? 2 : problems || result.code !== 0 ? 1 : 0;
  } catch (e) {
    evidence.problem = e.message;
    console.error(`APPARATUS ${suite}: ${e.message}`);
    if (data?.cases?.length) console.log(`${suite}: 通过=0 产品失败=0 环境作废=${data.cases.length} 未覆盖=0 问题总数=${data.cases.length} 套件计划总数=${data.cases.length}`);
    else console.log(`${suite}: 套件计划总数未知，登记不可核；不得判绿`);
    return 2;
  } finally { if (temp) await fs.rm(temp, { recursive: true, force: true }); }
}
async function selftest(engine, suite) {
  const data = (await registry(ROOT))[suite], knife = data?.knife;
  if (!knife || knife.path !== 'stories/hof-cli/game.mjs' || knife.name !== (suite === 'unit' ? 'H1' : 'H2') || ['anchor', 'replacement', 'target'].some(k => typeof knife[k] !== 'string' || !knife[k]) || knife.anchor === knife.replacement || !data.cases.includes(knife.target)) throw new Error('APPARATUS invalid isolated game knife');
  await fs.mkdir(TEMP, { recursive: true }); const owned = await fs.mkdtemp(path.join(TEMP, 'hof-cli-knife-')), root = path.join(owned, 'books');
  try {
    for (const area of ['stories/hof-cli', 'tests/hof-cli', 'tools/cli']) await fs.cp(path.join(ROOT, area), path.join(root, area), { recursive: true });
    await fs.copyFile(path.join(ROOT, 'tools/check-engine-pin.mjs'), path.join(root, 'tools/check-engine-pin.mjs'));
    for (const args of [['init', '--quiet', '-b', 'fixture'], ['add', '--', 'stories/hof-cli/engine-ref.json'], ['-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-m', 'pin fixture']]) {
      const r = git(root, ...args); if (r.error || r.status) throw new Error('APPARATUS cannot commit knife pin fixture');
    }
    const target = path.join(root, knife.path), bytes = await fs.readFile(target), text = bytes.toString();
    if (text.split(knife.anchor).length !== 2) throw new Error('APPARATUS knife anchor not unique');
    const baseline = await runSuite(root, engine, suite);
    await fs.writeFile(target, text.replace(knife.anchor, knife.replacement));
    if (!(await fs.readFile(target, 'utf8')).includes(knife.replacement)) throw new Error('APPARATUS knife readback failed');
    const evidence = {}, mutant = await runSuite(root, engine, suite, evidence);
    const escaped = knife.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hit = mutant === 1 && new RegExp(`^not ok \\d+ - ${escaped}$`, 'm').test(evidence.output || '') && !evidence.problem;
    await fs.writeFile(target, bytes); const restored = await runSuite(root, engine, suite), same = (await fs.readFile(target)).equals(bytes);
    const ok = baseline === 0 && hit && restored === 0 && same;
    console.log(`${suite} knife ${knife.name}: baseline=${baseline} mutant=${mutant} named=${hit} restored=${restored} byteSame=${same}; selftest=${ok ? '4/4' : 'red'}`);
    if (!ok) return [baseline, mutant, restored].includes(2) ? 2 : 1;
    return suite === 'unit' ? await apparatus(root, engine) : 0;
  } finally {
    await fs.rm(owned, { recursive: true, force: true });
    try { await fs.access(owned); throw new Error('APPARATUS RESIDUE knife directory'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}
// Four registered-apparatus controls live here, not in a private evidence script.
// Invoked by unit --selftest in the real five-step job. No product denominator.
async function apparatus(root, engine) {
  const paths = ['tests/hof-cli/unit/rules.test.mjs', 'tests/hof-cli/e2e/player.test.mjs', 'tests/hof-cli/registry.json', 'stories/hof-cli/play.mjs'];
  const saved = new Map(await Promise.all(paths.map(async p => [p, await fs.readFile(path.join(root, p))])));
  for (const name of ['missing-file', 'empty-registry', 'non-git', 'hung-cli']) {
    const data = JSON.parse(saved.get(paths[2]).toString());
    let suite = 'unit', needle;
    try {
      if (name === 'missing-file') { await fs.unlink(path.join(root, paths[0])); needle = 'APPARATUS missing/unregistered test file'; }
      else if (name === 'empty-registry') { data.unit.cases = []; await fs.writeFile(path.join(root, paths[2]), JSON.stringify(data)); needle = 'APPARATUS empty/invalid case registry'; }
      else if (name === 'non-git') { await fs.rename(path.join(root, '.git'), path.join(root, '.git-owned-backup')); needle = 'APPARATUS HOF_BOOKS missing books git root'; }
      else {
        suite = 'e2e'; needle = 'TIMEOUT CLI 10000ms';
        const title = 'HOF-APP hung normal CLI must be environment failure';
        console.log('HOF_APPARATUS hung-cli: temporary one-case apparatus; formal e2e registry stays 8');
        await fs.writeFile(path.join(root, paths[3]), 'setInterval(() => {}, 1000);\n');
        await fs.writeFile(path.join(root, paths[1]), `import test from 'node:test';\nimport { playCase } from '../../../tools/cli/player.mjs';\ntest(${JSON.stringify(title)}, async () => playCase(async make => { await make().frame(); }));\n`);
        data.e2e.cases = [title]; await fs.writeFile(path.join(root, paths[2]), JSON.stringify(data));
      }
      const evidence = {}, rc = await runSuite(root, engine, suite, evidence);
      if (rc !== 2 || !(String(evidence.problem || '') + String(evidence.output || '')).includes(needle)) throw new Error(`APPARATUS control ${name} expected named 2, got ${rc}`);
      console.log(`HOF_APPARATUS ${name}: rc=2 named=true`);
    } finally {
      if (name === 'non-git') await fs.rename(path.join(root, '.git-owned-backup'), path.join(root, '.git'));
      for (const [p, bytes] of saved) await fs.writeFile(path.join(root, p), bytes);
    }
  }
  for (const [p, bytes] of saved) if (!(await fs.readFile(path.join(root, p))).equals(bytes)) throw new Error('APPARATUS control source restore failed');
  console.log('HOF_APPARATUS 4/4; bytes restored; owned fixture cleanup follows; not product cases');
  return 0;
}
if (process.argv[1] === import.meta.filename) {
  try {
    const opts = {}, args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
      const flag = args[i];
      if (!['--engine', '--suite', '--selftest'].includes(flag) || Object.hasOwn(opts, flag)) throw new Error('APPARATUS unknown/duplicate flag');
      if (flag === '--selftest') opts[flag] = true;
      else { if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('APPARATUS missing argument'); opts[flag] = args[++i]; }
    }
    if (!opts['--engine'] || !Object.hasOwn(BUDGET, opts['--suite'])) throw new Error('APPARATUS usage: --engine <pin tree> --suite unit|e2e [--selftest]');
    const engine = path.resolve(opts['--engine']), suite = opts['--suite'];
    process.exitCode = opts['--selftest'] ? await selftest(engine, suite) : await runSuite(ROOT, engine, suite);
  } catch (e) { console.error(`APPARATUS entry: ${e.message}`); process.exitCode = 2; }
}
