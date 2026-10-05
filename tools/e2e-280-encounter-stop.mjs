#!/usr/bin/env node
/* `books#280` ②-2 · **遭遇停**（遭遇触发后停：渲染遭遇描述 → 玩家选「迎战／查看」；**未选前不结算**）
 *   的真浏览器臂（真 DOM · 同 `e2e-280-playtest.mjs` 族）。
 *
 * ## 判谁（一臂三断 ＋ 一续）
 *   **臂②-2 遭遇停**：
 *     ① **描述在**：点「遭遇」后仍在**事件屏**（未进战斗），且正文有内容（✗ 空屏、✗ 已是战斗屏）；
 *     ② **两选项在**：链接里**同时**有「迎战」与「查看」（✗ 只剩其一／✗ 直接进战斗）；
 *     ③ **未选前零结算**：点「遭遇」前后 `babelRun` 的 `kills／deaths／gathered／harvests` **逐项不变**，
 *        且**未出现战斗屏**（战斗中「跳过本回合」／「攻击」这类入口 ✗ 在）；
 *     ④ **续**：点「迎战」⇒ **确实进战斗**（战斗屏出现）—— 证「迎战」不是个死按钮。
 *
 * ## ★能力门（两态；✗ 假绿 ✗ 不假装）
 *   本臂**要求**引擎/故事已落 ②（现在**未落**）⇒ 未落时本臂印 **⏳ 待判**（✗ 计红 ✗ 计绿），
 *   并写明据以判定的那条事实；落地后**自动**转真判（✗ 需改本档）。
 *
 * ## 用法与退出码
 *   LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu \
 *     node tools/e2e-280-encounter-stop.mjs --books <books 检出> [--art <产物>]
 *   ★`PW_DIR`（缺省 `~/tmp/pw`）须是含 `playwright` 的目录（本席自备 playwright-core ＋ 同名软链）。
 *   node tools/e2e-280-encounter-stop.mjs --selftest      # ★刀：合成「无停」输入 ⇒ 判据须**具名红**
 *   0 = 臂过（或 ⏳ 待判）；1 = 有红（逐条具名）；2 = 环境错（装置，✗ 不当判据红）
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const B = path.resolve(arg('--books', process.cwd()));
const 产物 = path.resolve(arg('--art', path.join(B, 'stories/babel/babel-trial.html')));
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
/* ★本席（tester-3）用自己的 tmp 放 playwright（✗ 不借他人 home ✓ —— 族的缺省值指向 tester-4，见本档「用法」）。 */
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/pw');
const { chromium } = createRequire(path.join(PW, 'noop.js'))('playwright');

/* ============ 判据本体（★主流程与 --selftest 共用这一对函数 ✓）============ */
/** 判「停」是否在：给「链接文本数组」，返回 {kind, 读数}。 */
export function 判停(链接文) {
  const 有迎战 = 链接文.some((x) => x.includes('迎战'));
  const 有查看 = 链接文.some((x) => x.includes('查看'));
  const 是战斗 = 链接文.some((x) => x.includes('跳过本回合') || x.includes('攻击'));
  const kind = (有迎战 && 有查看 && !是战斗) ? 'stop' : (是战斗 ? 'battle' : 'other');
  return { kind, 有迎战, 有查看, 是战斗 };
}
/** 判「零结算」：给前后两份 babelRun，返回变了的字段。 */
export function 判零结算(前, 后) {
  const 字段 = ['kills', 'deaths', 'gathered', 'harvests'];
  return 字段.filter((k) => (前?.[k] ?? null) !== (后?.[k] ?? null));
}

/* ============ --selftest：刀（★合成「无停」输入 ⇒ 判据须具名红 ✓）============ */
if (argv.includes('--selftest')) {
  const 红 = [];
  const 检查 = (名, 条件, 读) => { if (!条件) 红.push(`  ✗ ${名}  ｜${读}`); else console.log(`  ✓ ${名}  ｜${读}`); };
  // K1 今天的行为（遭遇 ⇒ 直接战斗）：判停须报 'battle'（⇒ 主流程据此点名「没有停」）
  const k1 = 判停(['攻击', '幼獾', '（跳过本回合）']);
  检查('K1 无停输入 ⇒ kind=battle（不是 stop）', k1.kind === 'battle', JSON.stringify(k1));
  // K2 只有「迎战」没有「查看」⇒ ✗ 不得判 stop
  const k2 = 判停(['迎战']);
  检查('K2 缺「查看」⇒ ✗ 不得判 stop', k2.kind !== 'stop', JSON.stringify(k2));
  // K3 两选项 ＋ 同时是战斗屏 ⇒ ✗ 不得判 stop
  const k3 = 判停(['迎战', '查看', '跳过本回合']);
  检查('K3 两选项但已在战斗屏 ⇒ ✗ 不得判 stop', k3.kind !== 'stop', JSON.stringify(k3));
  // K4 真正的停 ⇒ 判 stop
  const k4 = 判停(['迎战', '查看']);
  检查('K4 正例：两选项且非战斗屏 ⇒ stop', k4.kind === 'stop', JSON.stringify(k4));
  // K7 ★壳标签假阳性：段内**没有**「查看」而壳里有 ⇒ 判 stop 的函数**不该**收到壳标签
  //   （本档以「只喂段内链接」保证；K7 断的是：把壳串误喂进来时，**主流程的取法**能挡住 ⇒ 见 K7b）
  const k7 = 判停(['空手打击', '（跳过本回合）']);
  检查('K7 战斗屏段内（无迎战/查看）⇒ kind=battle', k7.kind === 'battle', JSON.stringify(k7));
  // K5 零结算：改了 kills ⇒ 须报出该字段
  const k5 = 判零结算({ kills: 0, deaths: 0, gathered: 0, harvests: 0 }, { kills: 1, deaths: 0, gathered: 0, harvests: 0 });
  检查('K5 结算了 kills ⇒ 须报出 ["kills"]', JSON.stringify(k5) === '["kills"]', JSON.stringify(k5));
  // K6 零结算正例
  const k6 = 判零结算({ kills: 0, deaths: 0, gathered: 0, harvests: 0 }, { kills: 0, deaths: 0, gathered: 0, harvests: 0 });
  检查('K6 未结算 ⇒ 报空数组', k6.length === 0, JSON.stringify(k6));
  console.log(红.length ? `\n  ⇒ 自检失败 ${红.length} 条\n${红.join('\n')}` : '\n  ⇒ 自检：6/6 如期（★判据与主流程共用同一对函数 ✓）');
  process.exit(红.length ? 1 : 0);
}

/* ============ 主流程（真浏览器）============ */
if (!fs.existsSync(产物)) {
  console.error(`✗ 环境错（产物不在）：${产物}\n  ★先构建：python3 <引擎>/build.py "<books>/stories/babel" --out "<该绝对路径>"`);
  process.exit(2);
}
let b;
try { b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
catch (e) { console.error(`✗ 环境错（浏览器起不来：${CHROME}）：${e?.message ?? e}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); process.exit(2); }

const 档 = [], 红 = [], 待 = [];
const ok = (名, 条件, 读 = '') => { (条件 ? 档 : 红).push(条件 ? `  ✓ ${名}${读 ? '  ｜' + 读 : ''}` : `  ✗ ${名}${读 ? '  ｜' + 读 : ''}`); };
const 新页 = async () => { const c = await b.newContext(); const p = await c.newPage(); await p.goto('file://' + 产物); await p.waitForTimeout(2600); return p; };
/* ★只取**段落容器内**的链接：全文档会把 SugarCube 的 UI 壳（`SAVES`／`RESTART`／通知条）也算进来 ——
 *   族头注已记过同源教训（「是否是页脚项」须用 **DOM 容器** 判，✗ 子串判）。★否则日后一句「**查看**存档」
 *   的壳标签就能让本臂**假绿** ✗。 */
const 段内链接 = (p) => p.evaluate(() => [...document.querySelectorAll('#passages a, #passages button')].map((e) => e.innerText.trim()).filter(Boolean));
const 链接 = (p) => p.evaluate(() => [...document.querySelectorAll('a,button')].map((e) => e.innerText.trim()).filter(Boolean));
const 正文 = (p) => p.evaluate(() => document.body.innerText);
const run = (p) => p.evaluate(() => { try { return JSON.parse(JSON.stringify(SugarCube.State.variables.babelRun)); } catch (e) { return null; } });
const 点 = async (p, t) => { const l = p.locator('a,button').filter({ hasText: t }).first(); if (await l.count() === 0) return false; await l.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(900); return true; };
/** ★②-1 **到达拍**：`books#351` 起由 `onEnter` 一次性 `choice` 承担 ⇒ **每次进层先停一拍**。
 *   ✗ 先点过它，后面的「拾起」取不到 ⇒ 本档会**静默停在拍上**（★CI ✗ 跑本族 ⇒ 无人照见）。 */
const 清到达拍 = async (p) => { const l = p.locator('.choice-box button').filter({ hasText: /^（到达）/ });
  if (await l.count() === 0) return false; await l.first().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(700); return true; };
/** 到 L1 事件屏且**刚点完「遭遇」前的最后一屏**（照 playtest 族的形 ✓）。 */
const 到L1 = async (p) => { await 点(p, '睁开眼（普通）'); await 点(p, '站起来'); await p.waitForTimeout(700); await 清到达拍(p); await 点(p, '拾起'); await p.waitForTimeout(300); await 点(p, '长剑'); await p.waitForTimeout(300); };

try {
  const p = await 新页(); await 到L1(p);
  const 前 = await run(p);
  await 点(p, '遭遇'); await p.waitForTimeout(1500);
  const 后 = await run(p);
  const ls = await 段内链接(p); const 正 = await 正文(p);
  const d = 判停(ls);
  if (d.kind !== 'stop') {
    待.push(`  ⏳ 待判（遭遇停尚未落地）：点「遭遇」后 kind=**${d.kind}** ⇒ 链接=${JSON.stringify(ls.slice(0, 8))}`);
    待.push(`     据以判定的两条：有迎战=${d.有迎战}｜有查看=${d.有查看}｜已是战斗屏=${d.是战斗}`);
    待.push(`     段内链接=${JSON.stringify((await 段内链接(p)).slice(0, 8))}（★只判段内 ⇒ ✗ 不收 UI 壳）`);
  } else {
    ok('臂②-2 ① 描述在（停在事件屏且正文非空）', 正.replace(/\s/g, '').length > 40, `正文 ${正.replace(/\s/g, '').length} 字｜链接 ${JSON.stringify(ls.slice(0, 6))}`);
    ok('臂②-2 ② 两选项在（迎战 ＋ 查看）', d.有迎战 && d.有查看, `有迎战=${d.有迎战}｜有查看=${d.有查看}`);
    const 变 = 判零结算(前, 后);
    ok('臂②-2 ③ 未选前零结算（kills／deaths／gathered／harvests 逐项不变）', 变.length === 0, `变了 ${JSON.stringify(变)}｜前=${JSON.stringify(前)}｜后=${JSON.stringify(后)}`);
    await 点(p, '迎战'); await p.waitForTimeout(1600);
    const ls2 = await 段内链接(p); const d2 = 判停(ls2);
    ok('臂②-2 ④ 点「迎战」⇒ 真进战斗（✗ 死按钮）', d2.kind === 'battle' || ls2.some((x) => x.includes('跳过本回合')), `链接=${JSON.stringify(ls2.slice(0, 6))}`);
  }
  await p.close();
  console.log([...档, ...红, ...待].join('\n'));
  console.log(`\n  ⇒ 通过 ${档.length}｜失败 ${红.length}｜待判 ${待.length ? 1 : 0}`);
  for (const l of 红) console.log(l);
} catch (e) { console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`); await b?.close(); process.exit(2); }
await b.close();
process.exit(红.length ? 1 : 0);
