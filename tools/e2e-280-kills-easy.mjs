#!/usr/bin/env node
/* `books#280` ⑭/⑩ · **「主线可通关」的最小真读数**：真打一场 ⇒ `kills` 由 0 变 1。
 *   （真浏览器臂 · CDP · 同 `e2e-280-battle-bag.mjs` 族形；★本档由 `tester-3` 立，`dev-9` 于 `#326` 交接档勘定机制。）
 *
 * ## 为什么要有这一档（⑭ 的病灶与它的最小真读数）
 *   `books#280` ⑩ 的开关把**武器项**一起扫走 ⇒ 战斗菜单只剩「空手打击／（跳过本回合）」
 *   ⇒ 玩家顺手点第一项＝**非致命** ⇒ `kills` **恒 0** ⇒ **首战门永闭 ⇒ 主线不可通关**。
 *   `sgstory#2011`（合 `de54f554`）修了引擎侧；本仓 `#327` 抬了 pin。★本档判的是**产物级/真浏览器级**的成效。
 *
 * ## 四断（★读数一律取真 DOM 与游戏状态，✗ 不靠推断）
 *   ① **菜单须有致命一手**：进战斗后，段内须出现**手上那件武器的一键项**（⑩ 口径＝手上武器属**战斗行动**面）。
 *      ★判法**✗ 不靠「攻击」二字** —— 见「驱动的坑」。
 *   ② **真打 ⇒ `kills` 由 0 变 1**：用**武器项**出手（✗ 不靠「攻击」文本）；★`kills` 读 `State.variables.babelRun.kills`
 *      （`world/encounters.js` 的 `run().kills += foes.length`，**只在胜利支**）。
 *   ②b **胜后「遭遇」已消耗**：能读到就判（具名）；★读不到 ⇒ **明账**一行（✗ 不静默跳过 ✗ 不假装判过）。
 *   ③ **刀**（`--knife`）：★打在**产物文本**上（✗ 改源码 —— 改了不重建 ⇒ 刀没落在被测物上，本舰队栽过两次）：
 *      把产物内 `itemsInBag` 那一处置为 `false`／摘掉 ⇒ ★本档须**判据红**、形＝**`kills` 恒 0**（★**✗ 不是崩**）。
 *   ④ **反例**（`--counter`）：按声明在/不在各烘一次 ⇒ 印「只装／全装」与产物字节（★这是**另一件**的读数，✗ 本档的刀）。
 *
 * ## ★驱动的坑（`dev-9` 勘定，本席采纳）
 *   `tools/e2e-280-playtest.mjs:79-83` 的战斗驱动靠**文本「攻击」**出手 ⇒ ⑩ 之后菜单**没有**「攻击」
 *   ⇒ 该循环只会「跳过」⇒ 读数形正是「每战必晕 ✗ 杀」⇒ ★本档**不靠那两个字**，按**一键项／武器项**取靶 ✓。
 *
 * ## 装置与退出码（★三分，✗ 不把装置错读成判据红）
 *   LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu \
 *     node tools/e2e-280-kills-easy.mjs --books <books 检出> --engine <引擎检出> [--art <产物>] [--knife] [--counter]
 *   node tools/e2e-280-kills-easy.mjs --selftest      # ★纯函数自证（✗ 不碰真产物）
 *   0 = 全过（或明账）；1 = 有红（逐条具名）；2 = **装置错**（引擎树 ≠ 声明 pin／产物缺／浏览器起不来 —— ★✗ 不当判据红）
 *   ★起手必印：books HEAD ／ 声明 pin ／ **引擎树 HEAD** ／ 产物 sha1 —— 换候选重跑先核这四项 ✓
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const B = path.resolve(arg('--books', process.cwd()));
const ENG = path.resolve(arg('--engine', ''));
const 产物 = path.resolve(arg('--art', path.join(B, 'stories/babel/babel-trial.html')));
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

/* ============ 判据本体（★主流程与 --selftest 共用；✗ 不写两套 ✓）============ */
/** ① 菜单须有**致命一手**：段内须有一项**武器项**。
 *  形（引擎口径）：`用已装备<名>攻击` 一类；★判法**✗ 不靠「攻击」二字** —— 见下。 */
export function 判菜单有致命一手(链接) {
  const L = (链接 || []).map((x) => String(x));
  const 排除 = /^(空手打击|（跳过本回合）|跳过本回合|查看|快存|迎战|拾起|通知)/;
  const 武器项 = L.filter((x) => !排除.test(x.trim()) && /攻击|打击/.test(x) && !/空手打击/.test(x));
  /* ★「只有空手／跳过」＝病灶形（⑩ 的后果）⇒ 不合格 ✓ */
  const 只剩空手 = L.length > 0 && L.every((x) => 排除.test(x.trim()));
  return { 武器项, 只剩空手, 合格: 武器项.length > 0, 菜单: L };
}
/** ② `kills` 由 0 变 1。入形 {前, 后}；★任一读不到 ⇒ 不成立（装置不足 ✗ 红 ✗ 绿）。 */
export function 判真打拿下({ 前, 后 } = {}) {
  if (!Number.isFinite(前) || !Number.isFinite(后)) return { 不成立: true, 合格: null, 说明: `kills 读数缺失（前=${JSON.stringify(前)} 后=${JSON.stringify(后)}）` };
  return { 不成立: false, 合格: 前 === 0 && 后 >= 1, 说明: `kills ${前} ⇒ ${后}` };
}

/* ============ --selftest ============ */
if (has('--selftest')) {
  const 红 = [];
  const 检查 = (n, c, 读) => { if (!c) 红.push(`  ✗ ${n}  ｜${读}`); else console.log(`  ✓ ${n}  ｜${读}`); };
  // K1 正例：菜单里有「用已装备长剑攻击」⇒ 合格
  const 好 = ['用已装备长剑攻击', '空手打击', '（跳过本回合）'];
  检查('K1 菜单有武器项 ⇒ ① 合格', 判菜单有致命一手(好).合格 === true, JSON.stringify(判菜单有致命一手(好).武器项));
  // K2 ★刀形：只剩空手／跳过（⑩ 的后果）⇒ ① 不合格
  const 病灶 = ['空手打击', '（跳过本回合）'];
  检查('K2 刀：只剩「空手打击／跳过」⇒ ① 不合格', 判菜单有致命一手(病灶).合格 === false, JSON.stringify(判菜单有致命一手(病灶)));
  // K3 空菜单 ⇒ 不合格（✗ 不留死角）
  检查('K3 空菜单 ⇒ ① 不合格', 判菜单有致命一手([]).合格 === false, '菜单 []');
  // K4 「查看／快存」等壳词 ✗ 不得被当成武器项
  const 壳 = ['空手打击', '（跳过本回合）', '查看', '快存'];
  检查('K4 只有壳词 ⇒ ① 不合格（✗ 把 UI 壳当武器项）', 判菜单有致命一手(壳).合格 === false, JSON.stringify(判菜单有致命一手(壳)));
  // K5 kills 0⇒1 ⇒ 合格；K6 0⇒0 ⇒ 不合格（★这正是刀要咬的形）
  检查('K5 kills 0⇒1 ⇒ ② 合格', 判真打拿下({ 前: 0, 后: 1 }).合格 === true, 判真打拿下({ 前: 0, 后: 1 }).说明);
  检查('K6 刀：kills 0⇒0（恒 0）⇒ ② 不合格', 判真打拿下({ 前: 0, 后: 0 }).合格 === false, 判真打拿下({ 前: 0, 后: 0 }).说明);
  // K7 读数缺失 ⇒ **不成立**（装置不足 ✗ 不当红 ✗ 当绿）
  检查('K7 kills 读不到 ⇒ ② **不成立**（✗ 不当红 ✗ 当绿）', 判真打拿下({ 前: null, 后: 1 }).不成立 === true, 判真打拿下({ 前: null, 后: 1 }).说明);
  console.log(红.length ? `\n  ⇒ 自检失败 ${红.length} 条\n${红.join('\n')}` : '\n  ⇒ 自检：7/7 如期（★两判据的函数与主流程共用 ✓）');
  process.exit(红.length ? 1 : 0);
}

/* ============ 装置自证（★四项起手必印；不符 ⇒ rc=2 ✗ 不当判据红）============ */
const sh = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
let BOOKS_HEAD = '(非 git)', PIN = '(无声明)', ENG_HEAD = '(非 git)';
try { BOOKS_HEAD = execSync('git rev-parse HEAD', { cwd: B }).toString().trim(); } catch (e) {}
try { PIN = JSON.parse(fs.readFileSync(path.join(B, '.github/engine-ref.json'), 'utf8')).ref; } catch (e) {}
try { ENG_HEAD = execSync('git rev-parse HEAD', { cwd: ENG }).toString().trim(); } catch (e) {}
if (!ENG || !fs.existsSync(path.join(ENG, 'build.py'))) { console.error(`✗ 装置错（✗ 不当判据红）：--engine 指向的不是引擎检出：${ENG}`); process.exit(2); }
if (PIN !== '(无声明)' && ENG_HEAD !== '(非 git)' && ENG_HEAD !== PIN) {
  console.error(`✗ 装置错（✗ 不当判据红）：★引擎树 HEAD ≠ 声明 pin（防「pin 产物跑新树 ⇒ 假待判」）\n  --engine HEAD=${ENG_HEAD}\n  声明 pin   =${PIN}`);
  process.exit(2);
}
const 刀 = has('--knife');
const 真产物 = 产物;
let 用产物 = 产物;
if (刀) {
  /* ★刀打在**产物文本**上（✗ 源码）：拆掉引擎侧 ⑭ 的例外 —— 即把
   *   `if (道具在包里 && !是手上的武器攻击(item)) continue;` 还原成 ⑭ 之前的 `if (道具在包里) continue;`
   *   ⇒ 开关置位（本故事 `babel.js` 里就置位）时**所有道具都被滤掉** ⇒ 菜单只剩「空手打击／跳过」
   *   ⇒ 本档应报 ①✗ ＋ ②✗（`kills` 恒 0）、★**而✗不是崩** ✓
   * ★为何以前那把（改 `itemsInBag = true ⇒ false`）不咬：`false` 是**缺省老形**（逐件列道具）⇒ **照样含武器** ✗（本席实测两态都绿 ⇒ 已弃）。
   *   ★引擎原文（`src/core/40-battle.js`）：`false`＝逐件列道具；`true`＝只留战斗行动 ⇒ ★**是 `true` 才扣掉武器** ⇒
   *   要拆的是 **⑭ 那个例外**，✗ 不是开关本身 ✓ */
  const t = fs.readFileSync(产物, 'utf8');
  const 靶 = /if\s*\(道具在包里\s*&&\s*!是手上的武器攻击\(item\)\)\s*continue;/g;
  const m = t.match(靶) || [];
  if (!m.length) { console.error('✗ 装置错（✗ 不当判据红）：产物文本里找不到 ⑭ 例外的靶行 ⇒ 本产物可能不是带 ⑭ 的形（或引擎代码已被压缩）'); process.exit(2); }
  用产物 = 产物.replace(/\.html$/, '') + '.刀.html';
  const t2 = t.replace(靶, 'if (道具在包里) continue;   /* ★刀：拆 ⑭ 例外 */');
  const 改掉 = t.length - t2.length;
  fs.writeFileSync(用产物, t2);
  console.log(`◆ ★刀（打在产物文本上）：拆 ⑭ 例外共 ${m.length} 处（字节差 ${改掉}）⇒ ${path.basename(用产物)}`);
}
if (!fs.existsSync(用产物)) { console.error(`✗ 装置错（✗ 不当判据红）：缺产物 ${用产物}`); process.exit(2); }
console.log(`◆ 候选钉死：books HEAD=${BOOKS_HEAD.slice(0, 8)} ｜ 声明 pin=${PIN.slice(0, 8)} ｜ 引擎树 HEAD=${ENG_HEAD.slice(0, 8)} ｜ 产物 sha1=${sh(用产物).slice(0, 12)}`);

if (has('--counter')) {
  /* ④ 反例读数：按声明在/不在各烘一次（★这是**另一件**的读数 —— 本档的刀是上面那把 ✓） */
  const sj = path.join(B, 'stories/babel/story.json');
  const 原 = fs.readFileSync(sj, 'utf8');
  const 烘 = (标) => {
    /* ★烘到**临时路径**（✗ 不许覆盖 --art：`--counter` 只读，✗ 不得改动真产物 ✓）*/
    const 临 = path.join(process.env.TMPDIR || '/tmp', `kills-counter-${标}.html`);
    const log = execSync(`python3 ${path.join(ENG, 'build.py')} ${path.join(B, 'stories/babel')} --out ${临} --version v0.0.1·counter 2>&1 || true`, { encoding: 'utf8', maxBuffer: 1 << 28 });
    const 线 = log.split('\n').filter((l) => /只装|全装|packs/.test(l)).slice(-2).join(' ⏎ ');
    console.log(`  · ${标}｜声明=${(JSON.parse(原).packs ? JSON.stringify(JSON.parse(原).packs) : '(无)')}｜产物字节=${fs.statSync(临).size}｜${线}`);
  };
  烘('带声明');
  fs.writeFileSync(sj, JSON.stringify({}, null, 2).replace(/\n$/, ''));
  烘('摘声明');
  fs.writeFileSync(sj, 原);
  console.log(`  · story.json 已复原（md5=${crypto.createHash('md5').update(fs.readFileSync(sj)).digest('hex')}）`);
  console.log(`  · ★真产物未被本跑改动（sha1=${sh(真产物).slice(0, 12)}）`);
  console.log('  ★明账：本节读数**不是**本档的刀 —— 「加回 packs 声明」实测**不改变战斗面**（两态 `kills` 都 0⇒1）✓');
  process.exit(0);
}

let chromium;
try { ({ chromium } = await import(path.join(PW, 'node_modules/playwright/index.mjs'))); }
catch (e) { console.error(`✗ 装置错（✗ 不当判据红）：加载 Playwright 失败（PW_DIR=${PW}）：${e?.message}`); process.exit(2); }
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] }).catch((e) => {
  console.error(`✗ 装置错（✗ 不当判据红）：浏览器起不来（${CHROME}）：${e?.message}`); process.exit(2);
});

const 档 = [], 红 = [], 待 = [], 崩 = [];
const ok = (n, c, 读 = '') => { (c ? 档 : 红).push(`${c ? '  ✓' : '  ✗'} ${n}${读 ? '  ｜' + 读 : ''}`); };
try {
  const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); const p = await c.newPage();
  p.on('pageerror', (e) => 崩.push(String(e?.message ?? e).slice(0, 100)));
  await p.goto('file://' + 用产物); await p.waitForTimeout(2600);
  const 链接 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')].map((e) => e.textContent.trim()));
  const 点 = async (t) => { const l = p.locator('#passages a,#passages button').filter({ hasText: t }).first();
    if (await l.count() === 0) return false; try { await l.click({ timeout: 3500 }); await p.waitForTimeout(800); } catch (e) {} return true; };
  const 读kills = () => p.evaluate(() => { try { const k = SugarCube.State.variables.babelRun?.kills; return Number.isFinite(k) ? k : null; } catch (e) { return null; } });
  /* ★②-1 **到达拍**：`books#351` 起它改由 `onEnter` 的一次性 `choice` 包装承担 ⇒ **每次进层都先停一拍**
   *   （`.choice-box` 里一枚 `^（到达）` 的钮）。★✗ 先点过它，后面的「拾起／遭遇」**一个都取不到** ——
   *   本档自 `#351` 起就因此**静默双红**（臂① 菜单=[]、臂② kills 0⇒0），而 ★**CI ✗ 跑本族** ⇒ 无人照见。
   *   ★取法照 `tools/e2e-drive.mjs` 的 `清到达拍`（同一语义：点拍 ⇒ 回到本层选项面）。 */
  const 清到达拍 = async () => {
    const l = p.locator('.choice-box button').filter({ hasText: /^（到达）/ });
    if (await l.count() === 0) return false;
    await l.first().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(700); return true;
  };
  /* 起手（★只拾起，✗ 不点武器名 —— 那是卸装；见 `books#280` ⑭ 的 `#328` 更正）*/
  await 点('战斗教学'); await 点('站起来'); await p.waitForTimeout(600);
  await 清到达拍(); await p.waitForTimeout(400);   // ★②-1：✗ 漏这一步 ⇒ 下面全落空
  await 点('拾起'); await p.waitForTimeout(300);
  await 点('遭遇'); await p.waitForTimeout(1400);
  const 停屏 = await 链接();
  if (停屏.some((x) => x.includes('迎战'))) { await 点('迎战'); await p.waitForTimeout(1500); }   // ★②-2 停屏 ⇒ 先迎战（✗ 否则「找不到目标」会像 ⑧ 的病）
  const 前 = await 读kills();
  /* ── ① 菜单须有致命一手 ── */
  const 菜单 = await 链接();
  const v = 判菜单有致命一手(菜单);
  ok('臂① 战斗菜单须有**致命一手**（手上武器的一键项）', v.合格 === true,
    `武器项=${JSON.stringify(v.武器项)}｜只剩空手/跳过=${v.只剩空手}｜菜单=${JSON.stringify(菜单.filter((x) => /攻击|打击|跳过|迎战|查看/.test(x)))}`);
  /* ── ② 真打 ⇒ kills 0→1（★用武器项出手，✗ 不靠「攻击」二字）── */
  let 轮 = 0;
  while (轮++ < 25) {
    if ((await 读kills() ?? 0) > (前 ?? 0)) break;
    const L = await 链接();
    const 武 = v.武器项.find((x) => L.includes(x)) ?? L.find((x) => !/^(空手打击|（跳过本回合）|查看|快存|迎战)/.test(x.trim()) && /攻击|打击/.test(x) && !/空手打击/.test(x)) ?? L.find((x) => /空手打击|跳过/.test(x));
    if (!武) break;
    await 点(武);
    const L2 = await 链接();
    const 靶 = L2.find((x) => /幼獾|无名者|不眠者|獾|敌/.test(x)); if (靶) await 点(靶);
    await p.waitForTimeout(400);
  }
  const 后 = await 读kills();
  const w = 判真打拿下({ 前, 后 });
  if (w.不成立) 待.push(`  ⏳ 待判（臂② 读数缺失）：${w.说明}`);
  else ok('臂② 真打一场 ⇒ `kills` 由 0 变 1（★首战门开＝「主线可通关」的最小真读数）', w.合格 === true, `${w.说明}｜轮=${轮}`);
  /* ── ②b 胜后「遭遇」已消耗（★读得到就判；读不到 ⇒ 明账 ✗ 不静默跳过）── */
  const 已战 = await p.evaluate(() => { try { const e = SugarCube.State.variables.BABEL?.已战 ?? SugarCube.setup?.BABEL?.已战; return e ? JSON.stringify(e).slice(0, 80) : null; } catch (err) { return null; } });
  if (已战) 档.push(`  ✓ 臂②b 胜后遭遇状态（可读）：${已战}`);
  else 待.push('  ⏳ 明账：胜后「已战」面读不到（本档未判它）⇒ ★后续若要判，须先在故事侧暴露该面 ✓');
} catch (e) {
  console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`);
  await b.close(); process.exit(2);
}
await b.close();
/* ★崩溃**单列**（✗ 不当判据红 —— 本席在 `#340` 那把刀上栽过一次 ✓）*/
if (崩.length) 待.push(`  ⏳ 装置可疑（页面报错 ${崩.length} 条，✗ 不当判据红）：${JSON.stringify(崩.slice(0, 2))}`);
console.log([...档, ...红, ...待].join('\n'));
console.log(`\n  ⇒ 通过 ${档.length}｜失败 ${红.length}｜待判/明账 ${待.length}${刀 ? '｜★本跑为刀' : ''}`);
process.exit(红.length ? 1 : 0);
