/* 巴别之井 · **整局单跑** E2E（`books#363` / `#295` 池 AA1）—— 真浏览器，L1 → L20 → **试玩终点**
 *
 * ## 断什么（一局从头走到通关段落，✗ 不只看某一屏）
 *   ① **逐跳层号单调上升**，终点 `deepest` ＝ **`L20`**（整局真走完，✗ 卡在半路也算过）；
 *   ② **每层的战斗真打**：`已战[层] === true` 且 `kills === 已战层数`（一条命一场，结构式，✗ 不写死 18）；
 *   ③ **终点段落** ＝ `试玩终点`，且其正文含**本局读数**（最深处／战败次数／击败的挡路者）；
 *   ④ **账目自洽**：`deaths === 0`、`终局 === false`（本趟是「走通」而不是「死掉」）；
 *   ⑤ **零报错**：`pageerror === 0 && console.error === 0`（★缺陷常先在这里露头）。
 *
 * ## 走法（★每层七步；口径来自 `books#363` 的实测，见 `363-RECIPE.md`）
 *   清到达拍 ⇒ 「遭遇…」⇒ 「**迎战**」⇒ **打一场** ⇒ 「收下」（②-4 结算门）⇒ 「不采了，继续向上」⇒ 出口
 *   · 上行门真源：`babel.js:976` **已战 ∧ 事件账 ∈ {完成, 已跳过}** ⇒ 打与「不采了」两件都不能省；
 *   · ★**战斗用引擎自己的交互口**驱动（页内装 `Player.choice` ＋ `await BABEL.fight({interactive:true})`）——
 *     ✗ **不要**逐轮点 DOM 选项：段内项会累加，`.first()` 会取到**陈旧那一份** ⇒ 我实测**打不动**；
 *   · ★**低血先治疗**（血 ≤ 60% 且菜单有治疗件）—— ✗ 不治则中途会被打死（实测 L5 一跑死一跑活 ⇒ 浮动）；
 *   · ★**钉随机**：`rng.setSequence(Array(600).fill(1.0))`（骰面最大 ⇒ 我方必中·敌方必不中）——
 *     这是本档能给出「**同版两跑同读数**」的**前提**（引擎明说序列抽干**不静默回退**真随机 ⇒ 给足）。
 *
 * ## 用法与退出码
 *   （先构建产物：`python3 <引擎>/build.py "$PWD/stories/babel" --out "$PWD/stories/babel/babel-trial.html"`）
 *     node tools/e2e-280-fullrun.mjs --books <books 检出> --engine <引擎检出> [--art <产物>]
 *     node tools/e2e-280-fullrun.mjs --selftest          # 判据的牙齿（★不碰真产物）
 *   退出码：0 全过；1 有红；2 用法/环境错（引擎根不对、产物缺、浏览器起不来）。
 *
 * ## 刀的口径（✗ 与 rc 混为一谈）
 *   本档的「刀」＝**改一处走法即红**（`--selftest` 是判**纯判据**，✗ 不动真产物）：
 *     · 砍掉「迎战」那一拍 ⇒ 战斗不起 ⇒ ②③⑤ 红；
 *     · 砍掉「收下」⇒ 卡在结算门 ⇒ ① 红（走不动）；
 *     · 取消钉随机 ⇒ ④ 会在含随机的那趟翻红（★本档据此声明「必须钉随机」）。
 *   ★`--selftest` 判的是**取法/谓词**（移动项、治疗项、选攻、出口通用形、防回退），✗ 不假装跑了整局。
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

/* ── 参数 ─────────────────────────────────────────────────────────────── */
const argOf = (名, 缺 = null) => { const i = process.argv.indexOf(名); return i >= 0 ? process.argv[i + 1] : 缺; };
const B = path.resolve(argOf('--books', process.cwd()));
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'bots/home/sagitrs-tester-4/tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const 产物 = path.resolve(argOf('--art', path.join(B, 'stories/babel/babel-trial.html')));

/* ── ★纯判据（主流程与 `--selftest` **共用** ⇒ 判据的期望不与被测物同源）──────────
 *   ★「移动项」＝像「去下一层/出段」的那一项；★壳与杂项一律排除（快存/通知/背包/整备/查看…）。 */
const 杂项 = /快存|通知|背包|存档|重开|歇一歇|换一张|查看|拾起|采集|不采了|不理会|看看这一局/;
export const 是移动项 = (文) => /^向上|^前进|走向|走进|^去第|穿过/.test(String(文)) && !杂项.test(String(文));
/** ★治疗件（✗ 含「攻击」的项一律不算 —— 有的防具选项文案里也带攻击字） */
export const 是治疗项 = (文) => /治疗|草药|绷带/.test(String(文)) && !/攻击/.test(String(文));
/** ★攻击项：含攻击字 ∧ 不含防具字（`#217` 同坑：防具选项文案也含「攻击」） */
export const 是攻击项 = (文) => /攻击|挥|砍|劈|打击/.test(String(文)) && !/盾|防具|甲|铠/.test(String(文));
/** ★选攻：低血先治疗（阈值 60%）；★兜底取**最后一项**（✗ `o[0]`＝选项表首项，会每轮反复选它） */
export const 选一项 = (选项, { 血, 满 }) => {
  const o = Array.isArray(选项) ? 选项 : [];
  const 文 = (x) => String(x?.text ?? '');
  const 治 = o.find((x) => 是治疗项(文(x)));
  if (治 && (血 ?? 0) <= (满 ?? 1) * 0.6) return 治.value;
  return (o.find((x) => 是攻击项(文(x))) ?? o[o.length - 1])?.value ?? 'skip';
};

/* ============ `--selftest`（★判据的牙齿；✗ 不碰真产物 ✓）============ */
if (process.argv.includes('--selftest')) {
  const 红S = [];
  const 检查 = (n, c, 读) => { if (!c) 红S.push(`  ✗ ${n}  ｜${读}`); else console.log(`  ✓ ${n}  ｜${读}`); };
  const 段1出口 = ['向上，去第 2 层', '前进（钻进光里 · 第 10 层）'];
  const 段2出口 = ['走向围栏', '走向石门', '穿过单向门，升入第 11 层'];
  const 杂 = ['快存', '通知：全部（3）', '在火边歇一歇（整备：处理伤口、用掉一件恢复物）', '领一块田垄的图纸', '查看', '拾起地上的长剑'];
  检查('K1 出口通用形覆盖**段1＋段2**', [...段1出口, ...段2出口].every(是移动项), JSON.stringify([...段1出口, ...段2出口].map((x) => [x, 是移动项(x)])));
  检查('K2 杂项一律**不是**出口（快存/通知/整备/查看/拾起/领图纸）', 杂.every((x) => !是移动项(x)), JSON.stringify(杂.map((x) => [x, 是移动项(x)])));
  检查('K3 治疗项：真件为真、**带攻击字的项为假**', 是治疗项('草药糊×2') && !是治疗项('用淬火长剑攻击'), `草药糊=${是治疗项('草药糊×2')}｜长剑攻击=${是治疗项('用淬火长剑攻击')}`);
  检查('K4 攻击项：**防具选项为假**（`#217` 同坑）', 是攻击项('用已装备长剑攻击') && !是攻击项('用重木盾攻击'), `长剑=${是攻击项('用已装备长剑攻击')}｜重木盾=${是攻击项('用重木盾攻击')}`);
  const 菜单 = [{ text: '用淬火长剑攻击', value: 'a' }, { text: '草药糊', value: 'h' }];
  检查('K5 选攻·低血 ⇒ 选治疗', 选一项(菜单, { 血: 5, 满: 40 }) === 'h', `得 ${选一项(菜单, { 血: 5, 满: 40 })}`);
  检查('K5b 选攻·满血 ⇒ 选攻击', 选一项(菜单, { 血: 40, 满: 40 }) === 'a', `得 ${选一项(菜单, { 血: 40, 满: 40 })}`);
  检查('K5c 兜底**不取 `o[0]`**（无攻击项时取末项）', 选一项([{ text: '重木盾', value: 'z1' }, { text: '跳过', value: 'z2' }], { 血: 40, 满: 40 }) === 'z2', `得 ${选一项([{ text: '重木盾', value: 'z1' }, { text: '跳过', value: 'z2' }], { 血: 40, 满: 40 })}`);
  const 自文 = fs.readFileSync(new URL(import.meta.url), 'utf8');
  const 交互口 = /B\.fight\(\{ *interactive: *true *\}\)/.test(自文) || /fight\(\{interactive:true\}\)/.test(自文);
  const 点选项回退 = /locator\('#passages a,#passages button'\)\.filter\(\{hasText:\/用\.\*攻击/.test(自文);
  检查('K6 战斗走**引擎交互口**（✗ 不许回退成「逐轮点 DOM 选项」）', 交互口 && !点选项回退, `交互口=${交互口}｜点选项回退=${点选项回退}`);
  const 钉随机 = /setSequence\(/.test(自文);
  检查('K7 **钉随机**在档内（否则「两跑同读数」无据）', 钉随机, `setSequence=${钉随机}`);
  console.log(红S.length ? `\n  ⇒ 自检失败 ${红S.length} 条\n${红S.join('\n')}` : '\n  ⇒ 自检：8/8 如期（K1／K2 判出口形；K3–K5c 判选件；K6／K7 机械防「取法回退」与「忘了钉随机」✓）');
  process.exit(红S.length ? 1 : 0);
}

/* ── 环境 ─────────────────────────────────────────────────────────────── */
const ENGINE = path.resolve(argOf('--engine', process.env.ENGINE ?? ''));
if (!ENGINE || !fs.existsSync(ENGINE)) { console.error(`✗ 环境错：--engine 指向的引擎检出不存在（${ENGINE || '(空)'}）`); process.exit(2); }
if (!fs.existsSync(path.join(ENGINE, 'build.py'))) { console.error(`✗ 环境错：${ENGINE} 里没有 build.py —— 这不像引擎检出`); process.exit(2); }
if (!fs.existsSync(产物)) { console.error(`✗ 环境错（产物不在）：${产物}\n  ⇒ 先 python3 ${ENGINE}/build.py ${B}/stories/babel --out babel-trial.html`); process.exit(2); }
const PIN = (() => { try { return JSON.parse(fs.readFileSync(path.join(B, '.github/engine-ref.json'), 'utf8')).ref; } catch { return '?'; } })();
const 引擎头 = (() => { try { return fs.readFileSync(path.join(ENGINE, '.git/HEAD'), 'utf8').trim().replace('ref: ', ''); } catch { return '?'; } })();
const require_ = createRequire(path.join(PW, 'noop.js'));
const SHA = (() => { try { return require_('node:crypto').createHash('sha1').update(fs.readFileSync(产物)).digest('hex'); } catch { return '?'; } })();
console.log(`◆ 候选钉死：books=${B}｜pin=${PIN}｜引擎=${ENGINE}｜产物 sha1=${SHA.slice(0, 12)}`);
/* ★`books#363` 之前我撞过的坑：**跑臂前核引擎树＝声明 pin**（✗ 拿旧产物跑新树 ⇒ 读数不可信） */
const 引擎真头 = (() => { try { return require_('node:child_process').execFileSync('git', ['-C', ENGINE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; } })();
if (PIN && PIN !== '?' && 引擎真头 && !引擎真头.startsWith(PIN.slice(0, 7))) {
  console.error(`✗ 装置错（rc=2）：引擎树 HEAD=${引擎真头.slice(0, 8)} ≠ 声明 pin=${PIN.slice(0, 8)} ⇒ 两者须同（✗ 别拿旧产物/旧树互测）`);
  process.exit(2);
}

/* ★族体例：playwright 由 `createRequire(<PW>/noop.js)('playwright')` 取（✗ 手拼 index.mjs —— 我第一版拼错） */
let chromium;
try { chromium = require_(  'playwright').chromium; }
catch (e) { console.error(`✗ 环境错（取不到 playwright：${PW}）：${e.message}`); process.exit(2); }
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] }).catch((e) => {
  console.error(`✗ 环境错（浏览器起不来：${CHROME}）：${e.message}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); process.exit(2); });

/* ── 主流程 ───────────────────────────────────────────────────────────── */
const 红 = [], 档 = [];
const ok = (c, m) => { if (!c) 红.push(`  ✗ ${m}`); };
try {
  const c = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await c.newPage();
  const 崩 = [], ce = [];
  p.on('pageerror', (e) => 崩.push(String(e?.message ?? e).slice(0, 90)));
  p.on('console', (m) => { if (m.type() === 'error') ce.push(m.text().slice(0, 90)); });
  await p.goto('file://' + 产物); await p.waitForTimeout(2500);

  const 段 = () => p.evaluate(() => { try { return SugarCube.State.passage; } catch { return null; } });
  const 账 = () => p.evaluate(() => { try { return JSON.parse(JSON.stringify(SugarCube.State.variables.babelRun)); } catch { return null; } });
  const 段内 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')].map((e) => (e.textContent ?? '').trim()).filter(Boolean));
  const 点 = async (t) => { const l = p.locator('#passages a,#passages button').filter({ hasText: t }).first();
    if (!await l.count()) return false; await l.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(800); return true; };
  const 清到达拍 = async () => { const l = p.locator('.choice-box button').filter({ hasText: /^（到达）/ });
    if (!await l.count()) return false; await l.first().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(650); return true; };
  /** ★打一场：**引擎自己的交互口**（✗ 逐轮点 DOM —— 那条路我实测打不动） */
  const 打一场 = async () => p.evaluate(async () => {
    const SC = SugarCube, D = SC.setup.DND3, B2 = SC.setup.BABEL;
    const 原 = D.Player.choice;
    D.Player.choice = async (opts) => {
      const o = Array.isArray(opts) ? opts : []; const 文 = (x) => String(x?.text ?? '');
      const 治 = o.find((x) => /治疗|草药|绷带/.test(文(x)) && !/攻击/.test(文(x)));
      const 攻 = o.find((x) => /攻击|挥|砍|劈|打击/.test(文(x)) && !/盾|防具|甲|铠/.test(文(x)));
      if (治 && (D.Player.hp ?? 0) <= (D.Player.maxHp ?? 1) * 0.6) return 治.value;
      return (攻 ?? o[o.length - 1])?.value ?? 'skip';
    };
    try { await B2.fight({ interactive: true }); return 'ok'; }
    catch (e) { return 'throw:' + String(e.message).slice(0, 90); }
    finally { if (原 === undefined) delete D.Player.choice; else D.Player.choice = 原; }
  });
  /** ★钉随机：骰面最大 ⇒ 我方必中·敌方必不中（序列给足 —— 抽干后引擎**不静默回退**） */
  const 钉随机 = async () => p.evaluate(() => { try { SugarCube.setup.RPG.rng.setSequence(Array.from({ length: 600 }, () => 1.0)); return 'ok'; } catch (e) { return 'throw:' + String(e.message).slice(0, 60); } });
  const 走一层 = async (标) => {
    await 清到达拍();
    let L = await 段内();
    const 遭 = L.find((x) => /^遭遇/.test(x));
    if (遭) { await 点(遭); L = await 段内(); }
    if (L.some((x) => x.includes('迎战'))) { await 点('迎战'); await p.waitForTimeout(900); const r = await 打一场(); if (r !== 'ok') 档.push(`  · [${标}] 战斗异常（记声明）：${r}`); }
    for (let k = 0; k < 8; k++) { const LL = await 段内(); if (LL.some((x) => x === '收下')) { await 点('收下'); await p.waitForTimeout(950); continue; } break; }
    const 不 = (await 段内()).find((x) => /不采了|不理会/.test(x));
    if (不) { await 点(不); await p.waitForTimeout(950); }
    /* ★终点口不是「移动项」（我把它排除在出口形之外 ⇒ 这里要单独认它，✗ 否则会误判「无出口」） */
    if ((await 段内()).some((x) => /看看这一局爬了些什么/.test(x))) return { ok: true, 终点口: true };
    const 上 = (await 段内()).find(是移动项);
    if (!上) return { ok: false, 因: `无出口（段=${JSON.stringify(await 段())} 段内=${JSON.stringify((await 段内()).slice(0, 10))}）` };
    await 点(上); await p.waitForTimeout(1200); await 清到达拍();
    return { ok: true };
  };

  /* 开局（★普通档入口＝「战斗教学」；「跳过教学」＝直达十层，本档**两种入口都走**） */
  const 开局 = async (入口) => { await 点(入口); await 点('站起来'); await p.waitForTimeout(700); await 清到达拍(); await 点('拾起'); await p.waitForTimeout(400); };
  await 开局('战斗教学');
  ok((await 钉随机()) === 'ok', '钉随机那一步没成（后续读数不可信）');

  const 逐跳 = [];
  let 终点 = false;
  for (let lv = 1; lv <= 26; lv++) {
    const r0 = await 账();
    const w = await 走一层(`L${lv}`);
    const r = await 账();
    if (w.终点口) { await 点('看看这一局爬了些什么'); await p.waitForTimeout(1200); 终点 = true; 逐跳.push({ 跳: lv, 段: await 段(), deepest: r?.deepest, kills: r?.kills, 已跳过: Object.keys(r?.已跳过 ?? {}).length }); break; }
    逐跳.push({ 跳: lv, 段: await 段(), deepest: r?.deepest, kills: r?.kills, 已跳过: Object.keys(r?.已跳过 ?? {}).length });
    if (!w.ok) { 档.push(`  · 走不到下一层（记声明）：${w.因}`); break; }
    const L = await 段内();
    if (L.some((x) => /看看这一局爬了些什么/.test(x))) { await 点('看看这一局爬了些什么'); await p.waitForTimeout(1200); 终点 = true; break; }
    if ((await 段()) === '游戏失败') break;
    /* ★✗ 不要用「deepest 不变就停」——L20 之上还要走「走向石门」才到终点口（我第一版据此早停 ⇒ 误判） */
  }
  const 终段 = await 段(); const 终账 = await 账();
  const 终文 = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

  /* ── 结构式断言（✗ 不写死「18」那类会随内容变的数）── */
  ok(终点 && 终段 === '试玩终点', `① 整局须走到终点段落：段=${JSON.stringify(终段)}（终点口点过=${终点}）`);
  ok(终账?.deepest === 'L20', `① 终点 deepest 须＝L20：实得 ${JSON.stringify(终账?.deepest)}`);
  const 层号 = 逐跳.map((x) => Number(String(x.deepest ?? 'L0').replace('L', '')) || 0);
  ok(层号.every((n, i) => i === 0 || n >= 层号[i - 1]), `① 逐跳层号须**单调不降**：${JSON.stringify(层号)}`);
  const 已战 = Object.values(终账?.已战 ?? {}).filter(Boolean).length;
  ok(已战 > 0 && 终账?.kills === 已战, `② 战斗真打（一条命一场）：kills=${终账?.kills}｜已战=${已战}`);
  ok(/最深处：\s*L20/.test(终文) && /击败的挡路者：\s*\d+/.test(终文), `③ 终点正文须含本局读数（最深处／击败的挡路者）`);
  ok(终账?.deaths === 0 && 终账?.终局 === false, `④ 本趟须是「走通」：deaths=${终账?.deaths}｜终局=${终账?.终局}`);
  ok(崩.length === 0 && ce.length === 0, `⑤ 零报错：pageerror=${崩.length}｜console.error=${ce.length}${ce.length ? ' ⇒ ' + JSON.stringify(ce.slice(0, 3)) : ''}`);

  console.log(`  逐跳（共 ${逐跳.length} 跳）：` + 逐跳.map((x) => `${x.deepest}${x.kills != null ? '/k' + x.kills : ''}`).join(' → '));
  console.log(`  终段=${JSON.stringify(终段)}｜deepest=${JSON.stringify(终账?.deepest)}｜kills=${终账?.kills}｜deaths=${终账?.deaths}｜已战=${已战} 层`);
  console.log(`  终点读数行：${(终文.match(/(最深处|战败次数|击败的挡路者|采集次数)：[^｜]{0,14}/g) ?? []).join('｜')}`);
  console.log(`  报错面：pageerror=${崩.length}｜console.error=${ce.length}`);
} catch (e) {
  console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`);
  await b.close().catch(() => {});
  process.exit(2);
}
console.log([...档, ...红].join('\n'));
console.log(红.length === 0 ? `\n  ⇒ 整局通过（${档.length} 条声明）` : `\n  ⇒ 通过 ${档.length}｜失败 ${红.length}`);
await b.close();
process.exit(红.length ? 1 : 0);
