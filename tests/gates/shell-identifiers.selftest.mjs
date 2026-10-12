// 本门的**刀**（自检）：造两个装置，一该绿一该红 ⇒ ✗ 只跑一次不报错不算数。
//   A 合法 ASCII 名 ⇒ 须绿 ✓        B 另造**别个**非 ASCII 名 ⇒ 须红且**点名** ✓
// ★装置先断言（照 D 席的教训：✗ 不假定装置在场）：写前断言目录可建、写后断言读数**非空**、子进程退出码须取到。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
const GATE = path.join(import.meta.dirname, 'shell-identifiers.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shid-'));
let fails = 0;
const 记 = (ok, msg) => { if (!ok) { fails++; console.error('FAIL: ' + msg); } else console.log('  ✓ ' + msg); };

function fixture(tag, body) {
  const d = path.join(tmp, tag); fs.mkdirSync(path.join(d, '.github', 'workflows'), { recursive: true });
  const f = path.join(d, '.github', 'workflows', 'w.yml');
  fs.writeFileSync(f, body);
  if (!fs.existsSync(f) || fs.statSync(f).size === 0) throw new Error(`装置不在场：${f}`);   // ★装置先断言
  return d;
}
function run(d) {
  let rc = 0, out = '';
  try { out = execFileSync(process.execPath, [GATE, '--dir', d], { encoding: 'utf8' }); }
  catch (e) { rc = e.status ?? 99; out = String(e.stdout || '') + String(e.stderr || ''); }
  if (!out || !out.trim()) throw new Error('读数空 ⇒ ✗ 不得当绿/红（装置故障）');            // ★读数非空断言
  return { rc, out };
}

// A 该绿
const A = fixture('A', `name: t\njobs:\n  j:\n    steps:\n      - name: x\n        run: |\n          set -euo pipefail\n          run_one() {\n            local f="$1" GUARD="$2"\n            grep -qF "$GUARD" "/tmp/out"\n          }\n          run_one a '通过 1'\n`);
const a = run(A);
记(a.rc === 0, `A 合法 ASCII 名 ⇒ 须 rc=0（实 rc=${a.rc}）`);
记(/RESULT: PASS/.test(a.out), 'A 须印 RESULT: PASS');
记(/run 块 1 个 · 命中 0 处/.test(a.out), 'A 须报"扫到面且命中 0"（★非空洞 ✓）');

// B 该红（★另造别个非 ASCII 名，✗ 不用「守护」原文 ✓）
const B_fixture_text = `name: t\njobs:\n  j:\n    steps:\n      - name: x\n        run: |\n          set -euo pipefail\n          run_one() {\n            local f="$1" 观星="$2"\n            grep -qF "$观星" "/tmp/out"\n          }\n`;
const B = fixture('B', B_fixture_text);
const b = run(B);
记(b.rc === 1, `B 非 ASCII 名「观星」⇒ 须 rc=1（实 rc=${b.rc}）`);
记(/名「观星」/.test(b.out), 'B 须**点名**该名 ✓');
const wantLine = B_fixture_text.split('\n').findIndex(l => l.includes('$观星')) + 1;   // ★行号**按档现算** ✗ 不写死 ✓
记(new RegExp('w\\.yml:' + wantLine).test(b.out), `B 须报**文件:行**（期望 行${wantLine}）✓`);
记(!/RESULT: PASS/.test(b.out), 'B 不得印 PASS（✗ 双绿不许 ✓）');

// C 边界：中文标点紧接变量 ⇒ ✗ 不得误报（首版扫器正是在这里误报 ✓）
const C = fixture('C', `name: t\njobs:\n  j:\n    steps:\n      - name: x\n        run: |\n          set -euo pipefail\n          CH=/x/chrome\n          [ -x "$CH" ] || { echo "不在缺省路径 $CH（版本/路径见 tools）"; exit 1; }\n`);
const c = run(C);
记(c.rc === 0, `C 变量紧接中文标点 ⇒ 须 rc=0（实 rc=${c.rc}；★误报即本门不可用 ✓）`);

// D 边界：run 块为 0 ⇒ 须红（✗ 不得"什么都没扫也算绿"）
const D = fixture('D', `name: t\njobs:\n  j:\n    steps:\n      - name: x\n        uses: actions/checkout@v4\n`);
const d = run(D);
记(d.rc === 1 && /面死了/.test(d.out), `D 无 run 块 ⇒ 须红（实 rc=${d.rc}）`);

if (fails) { console.error(`RESULT: FAIL ⇒ ${fails} 条`); process.exit(1); }
console.log('RESULT: PASS ⇒ 刀四向皆如预期（A 绿／B 红且具名／C 不误报／D 空面红）✓');
