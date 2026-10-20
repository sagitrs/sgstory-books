#!/usr/bin/env node
// Registered family runner. Linux process groups/time budgets and TAP accounting
// follow the proven sgstory CLI runner pattern at engine pin f4f5fafc; no runtime
// is copied. The engine checkout is read-only even during game fault injections.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const ROOT = path.resolve(import.meta.dirname, '../..');
const TEMP = process.env.TMPDIR || path.join(os.homedir(), 'tmp');
const BUDGET = { unit: 30000, e2e: 75000 };
const git = (root, ...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8', timeout: 10000 });
// 接口版本门只认数据：声明的接口版本必须等于引擎实际导出的那个。写成字面量（如 `!== 1`）
// 会在接口升级时静默失效，所以这里比对两个运行期取值，读不到即拒绝（装置错 rc=2）。
export const interfaceAgrees = (declared, exported) => Number.isSafeInteger(declared) && Number.isSafeInteger(exported) && declared === exported;
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
  let exported;
  try { ({ CLI_INTERFACE_VERSION: exported } = await import(pathToFileURL(path.join(engine, 'src/cli/session.mjs')).href)); }
  catch (error) { throw new Error(`APPARATUS CLI interface unreadable: ${error.message}`); }
  if (!interfaceAgrees(pin.interfaceVersion, exported)) throw new Error(`APPARATUS CLI interface mismatch: declared ${pin.interfaceVersion}, engine exports ${exported}`);
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
    const controls = await gateControls(root, engine, suite, data);
    if (controls) return controls;
    return suite === 'unit' ? await apparatus(root, engine) : 0;
  } finally {
    await fs.rm(owned, { recursive: true, force: true });
    try { await fs.access(owned); throw new Error('APPARATUS RESIDUE knife directory'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}
// 可复跑的**门控负控**（承 books#581 领队初审：一次性现场自证重跑不了 ⇒ 做成装置）。
//
// 与 H1/H2 的分工：H1/H2 刀的是**产品源码** stories/hof-cli/game.mjs；本函数刀的是
// **引擎**（pin 树）或产品源码的其它面，验的是「某一支用例对某类缺陷**确实会红**」。
// 每条 controls 声明 anchor/replacement/target/**expectAssertion**，正文在 tests/hof-cli/registry.json：
//   · 在**私有引擎与之字串唯一的锚点**上注入 ⇒
//   · 该 suite 必须 rc=1，且 target 用例具名红 ⇒
//   · **且失败消息里必须出现 expectAssertion**（★断言级，✗ 到用例级就停）⇒
//   · 字节复原后必须 rc=0（证明复原是真的）。
//
// ★为何必须判到断言级（承 PR#641 的 B1，tester-4 反证）：只判 `not ok N - <用例名>` 时，
//   把某条判据整条改成 `assert.equal(true, true)` ⇒ 该用例依然红/绿如常，controls 照样全绿。
//   声明写断言级、实现停在用例级，等于装置为它没验的东西背书。
//
// ★未可达的断言必须**显式登记**在 `unreachableAssertions`（`covered: false` ＋ why）：
//   只让少数几条变精确，剩下的不可达仍会被「controls N/N 全绿」盖住 —— 那是把「用例级」
//   收窄成「几条规定断言的用例级」，根问题不变。✗ 不补 control 去凑 N/N：造不出失败形时
//   硬凑就是造假绿。
// 引擎不是产品源码：正式引擎树**从未被植刀**，这里动的是私有副本。
// 无 controls 声明 ⇒ 跳过（不是静默通过：打印 no-controls 并计 0 条）。
async function gateControls(root, engine, suite, data) {
  const controls = data?.controls;
  if (controls === undefined) return 0;
  if (!Array.isArray(controls)) throw new Error('APPARATUS controls must be an array');
  if (!controls.length) { console.log(`${suite} controls: none declared`); return 0; }
  const unreachable = data?.unreachableAssertions;
  if (!Array.isArray(unreachable)) throw new Error('APPARATUS unreachableAssertions must be declared (may be empty array)');
  for (const u of unreachable) {
    for (const k of ['case', 'assertion', 'why']) if (typeof u[k] !== 'string' || !u[k]) throw new Error('APPARATUS unreachableAssertions entry missing ' + k);
    if (u.covered !== false) throw new Error(`APPARATUS unreachableAssertions ${u.assertion} must be marked covered:false, got ${JSON.stringify(u.covered)}`);
    if (!data.cases.includes(u.case)) throw new Error(`APPARATUS unreachableAssertions ${u.assertion} names unknown case`);
  }
  await fs.mkdir(TEMP, { recursive: true });
  const owned = await fs.mkdtemp(path.join(TEMP, 'hof-cli-controls-'));
  const pinRoot = path.join(owned, 'engine');
  try {
    // 私有**引擎**副本：必须是 Git 树（pin 门会查），故复制后 init + 单次提交。
    await fs.cp(path.join(engine, 'src'), path.join(pinRoot, 'src'), { recursive: true });
    for (const f of ['package.json', 'package-lock.json']) {
      try { await fs.copyFile(path.join(engine, f), path.join(pinRoot, f)); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    for (const args of [['init', '--quiet', '-b', 'fixture'], ['add', '-A'], ['-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-m', 'engine fixture']]) {
      const r = git(pinRoot, ...args);
      if (r.error || r.status) throw new Error(`APPARATUS cannot build engine fixture: ${r.stderr}`);
    }
    // 夹具 pin 树的 HEAD 与声明 pin 不同 ⇒ pin 门会判红。故把它登记成该夹具自己的 ref。
    const pinFile = path.join(root, 'stories/hof-cli/engine-ref.json');
    const savedPin = await fs.readFile(pinFile);
    const fixtureHead = git(pinRoot, 'rev-parse', 'HEAD').stdout.trim();
    let failed = 0;
    try {
      for (const c of controls) {
        for (const k of ['id', 'why', 'anchor', 'replacement', 'target', 'expectAssertion']) if (typeof c[k] !== 'string' || !c[k]) throw new Error(`APPARATUS control ${c.id || '?'} missing ${k}`);
        if (c.anchor === c.replacement) throw new Error(`APPARATUS control ${c.id} anchor equals replacement`);
        if (!c.file) throw new Error(`APPARATUS control ${c.id} missing file`);
        const targetFile = resolveControlFile(c.file, root, pinRoot);
        const bytes = await fs.readFile(targetFile);
        const text = bytes.toString();
        if (text.split(c.anchor).length !== 2) throw new Error(`APPARATUS control ${c.id} anchor not unique in ${c.file}`);
        // 夹具 pin 指向夹具引擎，使 pin 门在这一层不干扰。
        // ★破刀必须**提交**：pin 门对引擎判 `git status` 脏 ⇒ rc=2，
        //   而一次性现场注入恰好就是这个「脏」形 —— 这正是把它做成装置要解决的事。
        //   提交后 HEAD 变了 ⇒ pin.ref 必须同步指向新 HEAD，否则又会被判「检出不等于声明」。
        const pin = JSON.parse(savedPin.toString());
        const syncPin = async (msg) => {
          pin.ref = git(pinRoot, 'rev-parse', 'HEAD').stdout.trim();
          await fs.writeFile(pinFile, JSON.stringify(pin) + '\n');
          const pc = git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-am', msg);
          if (pc.error || pc.status) throw new Error(`APPARATUS cannot commit control fixture pin: ${pc.stderr}`);
        };
        try {
          await fs.writeFile(targetFile, text.replace(c.anchor, c.replacement));
          if (!(await fs.readFile(targetFile, 'utf8')).includes(c.replacement)) throw new Error(`APPARATUS control ${c.id} readback failed`);
          const ec = git(pinRoot, '-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-am', `control ${c.id}: cut`);
          if (ec.error || ec.status) throw new Error(`APPARATUS cannot commit engine control cut: ${ec.stderr}`);
          await syncPin(`control ${c.id}: pin -> cut`);
          const evidence = {}, mutant = await runSuite(root, pinRoot, suite, evidence);
          const escaped = c.target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const output = evidence.output || '';
          const namedCase = new RegExp(`^not ok \\d+ - ${escaped}$`, 'm').test(output);
          // ★断言级：失败消息里必须出现 expectAssertion。
          //   只判用例名会漏掉「该用例红在别的断言上」与「该断言被改成恒真仍不报」两种（见函数头注）。
          //   ⚠ 实现是扫**整段 TAP 输出**，不是只截 `^  error:` 块 —— 比本注释原写的窄一格。
          //     当前取值恰好安全（短串串味已实测可抓），但属「恰好安全」非「结构安全」；
          //     收紧形（先截 error: 块再 includes）记为未覆盖面，见 tools/cli/README.md。
          const namedAssertion = output.includes(c.expectAssertion);
          const hit = mutant === 1 && namedCase && namedAssertion && !evidence.problem;
          await fs.writeFile(targetFile, bytes);
          if (!(await fs.readFile(targetFile)).equals(bytes)) throw new Error(`APPARATUS control ${c.id} engine restore failed`);
          const rc2 = git(pinRoot, '-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-am', `control ${c.id}: restore`);
          if (rc2.error || rc2.status) throw new Error(`APPARATUS cannot commit engine control restore: ${rc2.stderr}`);
          await syncPin(`control ${c.id}: pin -> restore`);
          const restored = await runSuite(root, pinRoot, suite);
          // ★判据三层，各自对应一种真失败：
          //   ① 破刀文件**字节**回到注入前（注入确实被撤销，不是只改了 marker）；
          //   ② 破刀所在的**引擎树**工作区干净（pin 门要吃这个，脏了下一轮就是 rc=2）；
          //   ③ 复原后该 suite **重新全绿**（恢复的不只是字节，而是真的又能跑）。
          //   ✗ 不判 books 夹具树干净：它只提交过 pin 文件，`stories/`、`tests/`、`tools/` 是
          //   cp 进来的未跟踪面（`??`），恒非空 —— 拿它判干净会永假（本装置初版即踩此坑）。
          const same = (await fs.readFile(targetFile)).equals(bytes)
            && git(pinRoot, 'status', '--porcelain=v1').stdout === ''
            && restored === 0;
          const ok = hit && same;
          console.log(`${suite} control ${c.id}: mutant=${mutant} caseNamed=${namedCase} assertionNamed=${namedAssertion} restored=${restored} byteSame=${same}`);
          if (!ok) failed++;
        } finally {
          // 兜底复原（异常路径也走到）：先还原两处字节，再各提交一次提交把工作区恢复干净。
          await fs.writeFile(targetFile, bytes);
          await fs.writeFile(pinFile, savedPin);
          git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-am', `control ${c.id}: finally`);
        }
      }
    } finally {
      await fs.writeFile(pinFile, savedPin);
      git(root, '-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '--quiet', '-am', 'control: finally pin');
    }
    console.log(`${suite} controls: ${controls.length - failed}/${controls.length} (assertion-level); unreachable(case-internal, not covered)=${unreachable.length}; engine fixture is a private copy, formal pin tree never cut`);
    return failed ? 1 : 0;
  } finally {
    await fs.rm(owned, { recursive: true, force: true });
    try { await fs.access(owned); throw new Error('APPARATUS RESIDUE controls directory'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
}

// controls 的 file 字段：`engine:<模块名>` 指私有引擎副本的 src/cli/<模块>.mjs（如 engine:session）。
// 只认这一种前缀 —— 其余形态一律具名拒，✗ 不猜路径（猜错会把刀下到错的树上）。
function resolveControlFile(file, root, pinRoot) {
  const m = /^engine:([a-z][a-z0-9-]*)$/.exec(file || '');
  if (!m) throw new Error(`APPARATUS control unknown file ${file}`);
  return path.join(pinRoot, 'src/cli', `${m[1]}.mjs`);
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
        console.log('HOF_APPARATUS hung-cli: temporary one-case apparatus; formal e2e registry unchanged');
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
