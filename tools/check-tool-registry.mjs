/* 工具清单 ⇄ CI 步骤 —— **互为具名子集**核（`books#295` 池 B 首笔批 · `#7` 同族的对账面）
 *
 * ## 为什么要有这一件
 *   `tools/README.md` 的**工具清单**与 workflow 的**步骤清单**是两份各自维护的名单。
 *   两边一旦不同步，症状都是**静默**的：
 *     · 工具只入册、✗ 没接线 ⇒ 「写了装置没人跑」（本舰队真栽过：`e2e-280-*` 四档静默红无人照见）；
 *     · 步骤跑了、✗ 没入册 ⇒ 「门是装饰还是判据」无从查，读者以为它已被登记为常驻面。
 *   ⇒ 判据：**两份名单互为具名子集** —— 任一侧多出的项，要么补另一侧，要么进**具名豁免表**（附一句理由）。
 *
 * ## ⚠ 本件的**边界**（✗ 别把「本件绿」读成「门真在跑」）
 *   它判的是**名单对账**，✗ 不判「那一步真的会执行」：`if:` 条件、被注释掉的步骤、
 *   或在 workflow 里出现但落在 `run:` 之外的提及（注释）都不由本件负责 —— 后者本件**主动排除**（只扫 `run:` 块）。
 *
 * ## 用法与退出码
 *   node tools/check-tool-registry.mjs [--books <仓根>]     # 缺省＝本档所在仓根
 *   node tools/check-tool-registry.mjs --selftest           # 判据的牙齿（★纯字符串，✗ 不碰真仓）
 *   exit 0 对账通过；1 有具名不符；2 用法/环境错（仓根不对、缺清单或 workflow）
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/* ── ★具名豁免表（任一侧多出而不打算补另一侧的，逐条写理由；✗ 留空即静默漏项）──
 *   ★key ＝ 文件名（不含 `tools/`）；value ＝ 一句理由。 */
export const 豁免 = Object.freeze({
    /* ★S5 e2e 臂（`books#399`）四支：★需**先构建产物**（真 jsdom／真浏览器）⇒ 由 `e2e-window` 窗口式跑，✗ 不进逐 PR 的 `babel` 步。 */
    'e2e-397-fixed-encounter-no-lootroll.mjs': 'S5 臂 A1：待接窗口式跑（需先建产物）',
    'e2e-397-scout-flee-branch.mjs': 'S5 臂 A2：待接窗口式跑（需先建产物）',
  'e2e-401-map-toggle.mjs': 'books#401 S7-3b 探针 71-b：地图开关三路一致性（真浏览器）；★须含 S7 3b 面板的产物 ⇒ 本地手跑体例，CI 接线候 T 域确认承载/编号',
  'e2e-401-map-a11y.mjs': 'books#401 S7-3b 探针 71-c：窄屏几何＋等价文字三类（真浏览器）；★同上，本地手跑体例',
  'e2e-469-e6-battle-handoff.mjs': 'books#469 承重臂（T 面）：真浏览器走**真玩家探索路**验「应战 ⇒ 战斗交接」＋导航闸两向；★须含 #469 修的产物 ⇒ 本地手跑体例，CI 接线候该臂稳定后评估',
  /* ★逐条**具名理由**（✗ 留空即静默漏项）。新增工具时：要么接线、要么在这里补一行。 */
  'run-l10-checks.py': 'L10 本地步序复现器（16+1 组；发布窗手跑体例）',
  'verify-l10-city.mjs': 'L10 无头装配判据模块（随故事主 verify 执行，✗ 不是独立 CLI 步骤）',
  'e2e-413-test-mode.mjs': 'T 席测试模式验收包（A2）的真浏览器臂：须真页 reload 才能验 `babelTest/` 跨刷新，CI 无浏览器 ⇒ 本地手跑体例，候接线评估',
  'e2e-314-l10-city.mjs': 'L10 真浏览器臂（由 writer 侧 run-l10-checks.py 在本地/发布窗手跑；候接线评估）',
  /* ★`books#136` F4「载入后场景头须重印」（`#497` 判据的独立旁证 · 真浏览器单臂甲）：
   *   ★须**先有产物** ＋ `PW_DIR`／`CHROME_BIN`（真浏览器）⇒ 与 `e2e-280-*` 一族同属**本地手跑／窗口式**体例；
   *   ★本笔先只落**装置**（领队裁「只留甲一臂」），接线另笔评估（✗ 免在窗口里多压一步）。 */
  'e2e-136-l2-load-reprint.mjs': 'books#136 F4 载入重印的独立旁证（真浏览器单臂甲）：须产物＋PW_DIR/CHROME_BIN，本地手跑体例；接线另笔',
  'e2e-311-visual.mjs': '视觉专项臂（#373 刚合：本地手跑体例，CI 接线候 #388 语义票后评估）',
  'e2e-311-layout.mjs': '同上（两视口几何臂，候评估）',
  'e2e-161-restart.mjs': '重开事件臂（真浏览器，候下一批接线）',
  'check-twee-tags.mjs': 'twee 配平门（babel-tests 成对步刚接——若对账仍报，说明步名提取差；见下）',
  'e2e-harness.mjs': '被其它装置 import 的**共享件**（✗ 不是独立臂）：由 import 它的那些步骤代表',
  'rehearse-workflow.py': '**仓内演练器**（本地/门测用；✗ 不经 CI 运行 —— 它的用途正是**在没有 CI 时**演练 workflow）',
  'rehearse-workflow.knives.sh': '同上（演练器的刀）',
  'e2e-210-reserved-slots.mjs': '既有臂，**候接线**（本轮 `#295` 池 B 首笔批只写死三支 smoke ＋ playtest）',
  'e2e-259-footer-save.mjs': '既有臂，**候接线**（同上）',
  'e2e-280-fullrun.mjs': '整局单跑（约 4 分钟）★**候议**是否进夜窗（`#295` 池 B 首笔批明示「候议」）',
  'e2e-280-firstload.mjs': '冒烟候选之外（jsdom 面另有 `e2e-harness` 产物级冒烟）⇒ 候下一批接线',
  'e2e-280-heal-feedback.mjs': '同上（候下一批接线）',
  'e2e-280-battle-bag.mjs': '同上（候下一批接线）',
  'e2e-280-narrow-sticky.mjs': '同上（窄屏面；候下一批接线）',
  'check-refs-recheck.mjs': '**独立复算器**（第二双眼睛）：与 `check-refs` 对账用，✗ 不是门本身（候接线或留人工）',
  'check-refs.knives.sh': '引用核的**刀脚本**：由本地/门测手跑（CI 里 `check-refs --require-symbols` 已含注入即红的自证）',
  'check-refs-docs.knives.sh': 'docs 报告态的刀脚本（同上，手跑）；CI 里 `check-refs` 那一步已含注入自证',
  'check-premerge.mjs': '**合前检查**：在本地/评审时手跑（它的输入是两棵树，✗ 不是 CI 里的单树门）',
  'check-norms-symbols.py': '**规范用词核**：手跑（候接线 —— 本轮池 B 首笔批只收三项，✗ 不顺手扩面）',
  'e2e-161-restart.mjs': '既有臂，**候接线**（同 `e2e-210`／`e2e-259` 一族）',
  'e2e-178-slots.mjs': '既有臂，**候接线**（同上）',
});

/* ── ★只扫 `run:` 块（✗ 不扫注释）：注释里提到某工具 ≠ 那一步在跑它 —— 这正是「门是装饰」的伪装形。 ── */
export function 扫run里的工具(yml文本) {
  const 出 = new Set();
  const 行 = String(yml文本).split('\n');
  let 在run = false, 缩进 = null;
  for (const 原 of 行) {
    const 空 = 原.trim() === '';
    const m = 原.match(/^(\s*)run:\s*(.*)$/);
    if (m && !在run) {
      const 列 = m[1].length;
      if (m[2].trim() !== '' && m[2].trim() !== '|' && m[2].trim() !== '>') { 收(m[2]); }
      在run = true; 缩进 = 列; continue;
    }
    if (在run) {
      if (空) continue;
      const 现列 = 原.match(/^(\s*)/)[1].length;
      if (现列 <= 缩进) { 在run = false; 缩进 = null; continue; }
      收(原);
    }
  }
  function 收(文) {
    for (const t of String(文).matchAll(/tools\/([A-Za-z0-9._-]+\.(?:mjs|py|sh))/g)) 出.add(t[1]);
  }
  return 出;
}

/* ── ★只认**清单表**里的行（`| \`tools/<档>\` | …`）：散文里提一句不算入册。 ── */
export function 扫README清单表(md文本) {
  const 出 = new Set();
  for (const 行 of String(md文本).split('\n')) {
    const m = 行.match(/^\|\s*`tools\/([A-Za-z0-9._-]+\.(?:mjs|py|sh))`\s*\|/);
    if (m) 出.add(m[1]);
  }
  return 出;
}

/** ★纯判据：两份名单互为具名子集（豁免表可补一侧）。返回 { 只册无步, 只步无册 } 两组具名项。 */
export function 对账(册, 步, 豁免表 = {}) {
  const 免 = new Set(Object.keys(豁免表));
  const 只册无步 = [...册].filter((x) => !步.has(x) && !免.has(x)).sort();
  const 只步无册 = [...步].filter((x) => !册.has(x) && !免.has(x)).sort();
  return { 只册无步, 只步无册 };
}

const argOf = (名, 缺 = null) => { const i = process.argv.indexOf(名); return i >= 0 ? process.argv[i + 1] : 缺; };

/* ============ `--selftest`（★判据的牙齿；✗ 不碰真仓）============ */
if (process.argv.includes('--selftest')) {
  const 红S = [];
  const 检查 = (n, c, 读) => { if (!c) 红S.push(`  ✗ ${n} ｜${读}`); else console.log(`  ✓ ${n} ｜${读}`); };
  const YML = [
    'jobs:', '  j:', '    steps:',
    '      - name: 跑一支', '        run: node tools/e2e-280-kills-easy.mjs --books .',
    '      # ★注释里提 tools/e2e-280-fullrun.mjs —— **不算跑它**（本件只扫 run: 块）',
    '      - name: 多行', '        run: |', '          node tools/check-refs.mjs --engine e',
    '          node tools/check-readme-tables.mjs',
    '      - name: 收尾', '        run: echo done',
  ].join('\n');
  const 步 = 扫run里的工具(YML);
  检查('K1 只扫 `run:` 块：注释里提到的**不入**', !步.has('e2e-280-fullrun.mjs') && 步.has('e2e-280-kills-easy.mjs'), Array.from(步).join('／'));
  检查('K2 多行 `run: |` 里的两支都入', 步.has('check-refs.mjs') && 步.has('check-readme-tables.mjs'), Array.from(步).join('／'));
  const MD = ['| `tools/a.mjs` | x |', '散文里提到 `tools/b.mjs`（不算入册）', '| `tools/c.py` | y |'].join('\n');
  const 册 = 扫README清单表(MD);
  检查('K3 只认清单表行：散文提及**不入册**', 册.has('a.mjs') && 册.has('c.py') && !册.has('b.mjs'), Array.from(册).join('／'));
  const r1 = 对账(new Set(['a.mjs']), new Set(['a.mjs']));
  检查('K4 两侧齐 ⇒ 无不符', r1.只册无步.length === 0 && r1.只步无册.length === 0, JSON.stringify(r1));
  const r2 = 对账(new Set(['a.mjs', 'b.mjs']), new Set(['a.mjs', 'x.mjs']));
  检查('K5 两侧各缺一项 ⇒ **双向具名**', r2.只册无步.join() === 'b.mjs' && r2.只步无册.join() === 'x.mjs', JSON.stringify(r2));
  const r3 = 对账(new Set(['a.mjs', 'b.mjs']), new Set(['a.mjs']), { 'b.mjs': '理由' });
  检查('K6 豁免生效（具名理由项放行）', r3.只册无步.length === 0, JSON.stringify(r3));
  检查('K7 本件自己也在豁免表里有名（✗ 别让自己成漏项）', Object.keys(豁免).length > 0, `豁免 ${Object.keys(豁免).length} 条`);
  console.log(红S.length ? `\n  ⇒ 自检失败 ${红S.length} 条\n${红S.join('\n')}` : '\n  ⇒ 自检：7/7 如期（K1/K3 判**扫法**；K4–K6 判**对账**双向；K7 判豁免表非空 ✓）');
  process.exit(红S.length ? 1 : 0);
}

/* ── 真跑 ─────────────────────────────────────────────────────────── */
const 仓 = path.resolve(argOf('--books', path.resolve(import.meta.dirname, '..')));
const README = path.join(仓, 'tools/README.md');
const WF目录 = path.join(仓, '.github/workflows');
if (!fs.existsSync(README)) { console.error(`✗ 环境错：找不到 ${README}`); process.exit(2); }
if (!fs.existsSync(WF目录)) { console.error(`✗ 环境错：找不到 ${WF目录}`); process.exit(2); }
const ymls = fs.readdirSync(WF目录).filter((f) => /\.ya?ml$/.test(f));
if (ymls.length === 0) { console.error(`✗ 环境错：${WF目录} 里没有 workflow`); process.exit(2); }

const 册 = 扫README清单表(fs.readFileSync(README, 'utf8'));
const 步 = new Set();
for (const f of ymls) for (const t of 扫run里的工具(fs.readFileSync(path.join(WF目录, f), 'utf8'))) 步.add(t);
const { 只册无步, 只步无册 } = 对账(册, 步, 豁免);

console.log(`  工具清单（tools/README 清单表）= ${册.size} 支｜CI 步骤（run: 块）里跑的 = ${步.size} 支｜具名豁免 = ${Object.keys(豁免).length} 条`);
for (const x of 只册无步) console.log(`  ✗ 只在**清单**里、**没有** CI 步骤跑它：tools/${x} —— 补接线，或进「具名豁免表」写明理由`);
for (const x of 只步无册) console.log(`  ✗ 有 CI 步骤跑它、却**不在清单**里：tools/${x} —— 补入册，或进「具名豁免表」写明理由`);
if (只册无步.length === 0 && 只步无册.length === 0) console.log('  ✓ 两份名单互为具名子集（多出的项都有具名理由）');
process.exit(只册无步.length || 只步无册.length ? 1 : 0);
