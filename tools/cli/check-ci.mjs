#!/usr/bin/env node
// Deliberately bounded approved-shape checker, not a general YAML parser.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
const ROOT = path.resolve(import.meta.dirname, '../..');
const WF = '.github/workflows/hof-cli-tests.yml';
const LEGACY = ['.github/engine-ref.json', '.github/workflows/babel-tests.yml', '.github/workflows/trial.yml', '.github/workflows/e2e-window.yml'];
const PATHS = [WF, 'stories/hof-cli/**', 'tools/**', 'tests/hof-cli/**', 'README.md', 'docs/plans/hof-cli/**'];
const PIN = String.raw`set -euo pipefail
ref="$(node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --print-ref)"
[ -n "$ref" ] || { printf 'APPARATUS HOF_PIN empty ref\n' >&2; exit 2; }
printf 'ref=%s\n' "$ref" >> "$GITHUB_OUTPUT"`;
const SHELL = String.raw`set -euo pipefail
readonly_() {
local bad=0
for tree in books engine; do
if ! git -C "$GITHUB_WORKSPACE/$tree" status --porcelain=v1 --untracked-files=all > "$RUNNER_TEMP/hof-$tree-status"; then
printf 'APPARATUS READONLY unavailable: %s\n' "$tree" >&2
bad=2
elif [ -s "$RUNNER_TEMP/hof-$tree-status" ]; then
printf 'APPARATUS READONLY dirty: %s\n' "$tree" >&2
bad=2
fi
done
printf 'READONLY books+engine: prior=%s apparatus=%s\n' "$rc" "$bad"
return "$bad"
}
trap 'rc=$?; trap - EXIT; readonly_ || rc=2; exit "$rc"' EXIT`;
const COMMANDS = [
  'node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --engine "$GITHUB_WORKSPACE/engine"',
  'node tools/cli/check-ci.mjs', 'node tools/check-tool-registry.mjs',
  'node tools/check-readme-tables.mjs tools/README.md tools/cli/README.md',
  ...['unit', 'e2e', 'unit --selftest', 'e2e --selftest'].map(s => `node tools/cli/test.mjs --engine "$GITHUB_WORKSPACE/engine" --suite ${s}`),
];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const table = s => [...s.matchAll(/^\|\s*`(tools\/cli\/[^`]+\.mjs)`\s*\|/gm)].map(m => m[1]).sort();
export function blocks(wf) {
  const result = [], lines = wf.split('\n');
  for (let i = 0; i < lines.length; i++) if (/^        run: \|$/.test(lines[i])) {
    const block = []; while (++i < lines.length && (/^          /.test(lines[i]) || !lines[i].trim())) block.push(lines[i].slice(10));
    i--; result.push(block.join('\n').trimEnd());
  }
  return result;
}
function check(d) {
  const need = (ok, code) => { if (!ok) throw new Error(`HOF_CI ${code}`); };
  const w = d.workflow, runs = blocks(w), trimmed = s => s.split('\n').map(x => x.trim()).join('\n');
  need(!/^  push:/m.test(w) && /^  pull_request:/m.test(w) && /^  workflow_dispatch:$/m.test(w) && /^    - cron: '17 7 \* \* \*'$/m.test(w), 'trigger');
  need(eq([...w.matchAll(/^      - '([^']+)'$/gm)].map(m => m[1]), PATHS), 'paths');
  need(w.match(/permissions:\n([\s\S]*?)(?=^\S)/m)?.[1] === '  contents: read\n', 'permissions');
  need(/^    runs-on: ubuntu-latest$/m.test(w) && /^    timeout-minutes: 3$/m.test(w) && /^          node-version: '22'$/m.test(w), 'runtime-budget');
  need(!/^    env:\n(?:.*\n)*?\s+TMPDIR: \$\{\{ runner.temp \}\}/m.test(w), 'runner-context-at-job-env');
  need((w.match(/TMPDIR: \$\{\{ runner.temp \}\}/g) || []).length === 1 && !/^\s+if:/m.test(w) && !/continue-on-error|pull_request_target/.test(w), 'unconditional');
  const sections = w.split(/^    steps:\n/m);
  need(sections.length === 2, 'single-step-section');
  const steps = sections[1].split(/^      - /m).slice(1);
  need(steps.length === 5 && runs.length === 2 && eq([...w.matchAll(/^        uses: (.+)$/gm)].map(m => m[1]), ['actions/checkout@v4', 'actions/setup-node@v4', 'actions/checkout@v4']), 'five-steps');
  need(steps[0].includes('path: books') && steps[0].includes('fetch-depth: 0') && steps[2].includes('id: pin') && steps[3].includes('repository: sagitrs/sgstory') && steps[3].includes('ref: ${{ steps.pin.outputs.ref }}') && steps[3].includes('path: engine') && [steps[0], steps[3]].every(x => x.includes('persist-credentials: false')), 'checkout-chain');
  need((w.match(/^        working-directory: books$/gm) || []).length === 2 && (w.match(/^        shell: bash$/gm) || []).length === 2, 'working-directory');
  need(runs[0] === PIN, 'pin-failure-propagation');
  const lines = runs[1].split('\n'), calls = lines.filter(x => x.startsWith('node '));
  need(eq(calls, COMMANDS), 'registered-command-order');
  need(trimmed(lines.filter(x => !x.startsWith('node ')).join('\n')) === SHELL, 'readonly-propagation');
  need(d.contract.match(/```yaml\n([\s\S]*?)```/)?.[1] === w, 'contract');
  need(eq(table(d.toolsReadme), d.tools) && eq(table(d.cliReadme), d.tools), 'tool-tables');
  const called = [...new Set(calls.flatMap(s => [...s.matchAll(/node (tools\/cli\/\S+\.mjs)/g)].map(m => m[1])))].sort();
  need(eq(called, d.tools.filter(x => x !== 'tools/cli/player.mjs')) && /^import \{ playCase \} from '\.\.\/\.\.\/\.\.\/tools\/cli\/player.mjs';$/m.test(d.e2eSource), 'tool-import');
  need(eq(Object.keys(d.registry).sort(), ['e2e', 'unit']), 'registry-families');
  for (const suite of ['unit', 'e2e']) {
    const r = d.registry[suite], actual = d.actual[suite];
    need(r.cases.length > 0 && new Set(r.cases).size === r.cases.length && eq(r.files, actual.files) && eq([...r.cases].sort(), actual.names.sort()), `registry-${suite}`);
    const k = r.knife;
    need(k.name === (suite === 'unit' ? 'H1' : 'H2') && k.path === 'stories/hof-cli/game.mjs' && r.cases.includes(k.target) && k.anchor !== k.replacement && d.game.split(k.anchor).length === 2, `knife-${suite}`);
  }
  need(d.legacy.every(x => x.current === x.base), 'legacy-isolation');
}
function load() {
  const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
  const git = (...args) => { const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', timeout: 10000 }); if (r.error || r.status) throw new Error(`APPARATUS HOF_BASE ${args[0]}`); return r.stdout; };
  let base;
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')); base = event.pull_request?.base?.sha;
    if (!/^[a-f0-9]{40}$/.test(base || '')) throw new Error('APPARATUS missing PR base SHA');
  } else base = git('merge-base', 'HEAD', 'origin/main').trim();
  const actual = {};
  for (const suite of ['unit', 'e2e']) {
    const files = fs.readdirSync(path.join(ROOT, `tests/hof-cli/${suite}`)).filter(x => x.endsWith('.test.mjs')).sort().map(x => `tests/hof-cli/${suite}/${x}`);
    actual[suite] = { files, names: files.flatMap(f => [...read(f).matchAll(/\btest\('([^']+)'/g)].map(m => m[1])) };
  }
  return { workflow: read(WF), contract: read('docs/plans/hof-cli/test-contract.md'), toolsReadme: read('tools/README.md'), cliReadme: read('tools/cli/README.md'), tools: fs.readdirSync(path.join(ROOT, 'tools/cli')).filter(x => x.endsWith('.mjs')).sort().map(x => `tools/cli/${x}`), registry: JSON.parse(read('tests/hof-cli/registry.json')), actual, game: read('stories/hof-cli/game.mjs'), e2eSource: read('tests/hof-cli/e2e/player.test.mjs'), legacy: LEGACY.map(p => ({ path: p, base: git('show', `${base}:${p}`), current: read(p) })), base };
}
function controls(data) {
  const paired = (d, change) => { const prior = d.workflow; d.workflow = change(prior); d.contract = d.contract.replace(prior, d.workflow); };
  const cases = [
    ['push-main', d => paired(d, w => w.replace('on:\n', 'on:\n  push:\n    branches: [main]\n'))],
    ['missing-path', d => paired(d, w => w.replace("      - 'tools/**'\n", ''))],
    ['write-permission', d => paired(d, w => w.replace('contents: read', 'contents: write'))],
    ['sixth-step', d => paired(d, w => w + '      - name: extra\n        run: true\n')],
    ['runner-context-at-job-env', d => paired(d, w => w.replace('        env:\n          TMPDIR: ${{ runner.temp }}\n', '').replace('    timeout-minutes: 3\n', '    timeout-minutes: 3\n    env:\n      TMPDIR: ${{ runner.temp }}\n'))],
    ['empty-ref-guard', d => paired(d, w => w.replace('          [ -n "$ref" ] || { printf \'APPARATUS HOF_PIN empty ref\\n\' >&2; exit 2; }\n', ''))],
    ['omit-unit-call', d => paired(d, w => w.replace('          ' + COMMANDS[4] + '\n', ''))],
    ['unknown-command', d => paired(d, w => w + '          node tools/cli/unknown.mjs\n')],
    ['trap-loses-rc', d => paired(d, w => w.replace('rc=$?;', 'rc=0;'))],
    ['empty-e2e-registry', d => { d.registry.e2e.cases = []; }],
    ['omit-README-tool', d => { d.toolsReadme = d.toolsReadme.split('\n').filter(x => !x.startsWith('| `tools/cli/test.mjs`')).join('\n'); }],
    ['legacy-pin-change', d => { d.legacy[0].current += ' '; }],
  ];
  for (const [name, mutate] of cases) {
    const d = structuredClone(data); mutate(d); let rejected = false;
    try { check(d); } catch (e) { rejected = e.message.startsWith('HOF_CI '); }
    if (!rejected) throw new Error(`HOF_CI_SELFTEST ${name} false green`);
    console.log(`HOF_CI_SELFTEST ${name}: rejected`);
  }
  console.log(`HOF_CI_SELFTEST ${cases.length}/${cases.length}; memory controls only`);
}
function shellControls(workflow) {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || path.join(os.homedir(), 'tmp'), 'hof-ci-shell-'));
  try {
    const bin = path.join(dir, 'bin'), workspace = path.join(dir, 'workspace'), temp = path.join(dir, 'temp');
    for (const p of [bin, workspace, temp]) fs.mkdirSync(p);
    for (const tree of ['books', 'engine']) {
      const cwd = path.join(workspace, tree); fs.mkdirSync(cwd); fs.writeFileSync(path.join(cwd, 'tracked'), tree);
      for (const args of [['init', '-q', '-b', 'fixture'], ['add', '--', 'tracked'], ['-c', 'user.name=fixture', '-c', 'user.email=fixture@local', 'commit', '-qm', 'fixture']]) {
        const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 5000 }); if (r.status || r.error) throw new Error('APPARATUS shell fixture git');
      }
    }
    fs.writeFileSync(path.join(bin, 'node'), `#!${process.execPath}\nconst fs=require('fs'),p=require('path'),a=process.argv.slice(2),mode=process.env.HOF_FAKE;\nif(a.includes('--print-ref')) { if(mode==='pin-error')process.exit(2); if(mode!=='pin-empty')console.log('a'.repeat(40)); }\nelse if(a[0]==='tools/cli/test.mjs' && a.includes('unit')) { if(mode==='dirty-books'||mode==='dirty-engine') { fs.writeFileSync(p.join(process.env.GITHUB_WORKSPACE,mode.slice(6),'dirty'),'fault');process.exit(1); } if(mode==='product-error')process.exit(1);if(mode==='apparatus-error')process.exit(2); }\n`, { mode: 0o700 });
    const [pin, final] = blocks(workflow), out = path.join(temp, 'output');
    const cases = [['pin-ok', pin, 0], ['pin-empty', pin, 2], ['pin-error', pin, 2], ['clean', final, 0], ['product-error', final, 1], ['apparatus-error', final, 2], ['dirty-books', final, 2], ['dirty-engine', final, 2], ['missing-git', final, 2]];
    for (const [name, script, expected] of cases) {
      for (const tree of ['books', 'engine']) fs.rmSync(path.join(workspace, tree, 'dirty'), { force: true });
      fs.writeFileSync(out, ''); if (name === 'missing-git') fs.renameSync(path.join(workspace, 'books/.git'), path.join(dir, 'saved-git'));
      const env = { ...process.env, PATH: bin + path.delimiter + process.env.PATH, GITHUB_WORKSPACE: workspace, RUNNER_TEMP: temp, GITHUB_OUTPUT: out, HOF_FAKE: name }; delete env.GH_TOKEN; delete env.GITHUB_TOKEN;
      const r = spawnSync('bash', ['-c', script], { cwd: path.join(workspace, 'books'), env, encoding: 'utf8', timeout: 5000, maxBuffer: 262144 });
      if (name === 'missing-git') fs.renameSync(path.join(dir, 'saved-git'), path.join(workspace, 'books/.git'));
      const output = fs.readFileSync(out, 'utf8'), readonly = script === final;
      const original = name.startsWith('dirty-') || name === 'product-error' ? 1 : name === 'apparatus-error' ? 2 : 0;
      if (r.error || r.status !== expected || (!readonly && (name === 'pin-ok' ? output !== 'ref=' + 'a'.repeat(40) + '\n' : output !== '')) || (readonly && !r.stdout.includes(`READONLY books+engine: prior=${original} apparatus=${expected === 2 && name !== 'apparatus-error' ? 2 : 0}`))) throw new Error(`HOF_CI_SHELL ${name} expected=${expected} got=${r.status}: ${r.stdout}${r.stderr}`);
      console.log(`HOF_CI_SHELL ${name}: rc=${r.status}; ${readonly ? r.stdout.trim() : 'output guarded'}`);
    }
    console.log(`HOF_CI_SHELL ${cases.length}/${cases.length}; fake-node/owned-Git apparatus only`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
try {
  if (process.argv.length !== 2) throw new Error('APPARATUS check-ci takes no arguments');
  const data = load(); check(data); controls(data); shellControls(data.workflow);
  console.log(`HOF_CI: workflow/contract, tools ${data.tools.length}, unit ${data.registry.unit.cases.length}, e2e ${data.registry.e2e.cases.length}, legacy base ${data.base}: green`);
} catch (e) { console.error(e.message); process.exitCode = e.message.startsWith('HOF_') ? 1 : 2; }
