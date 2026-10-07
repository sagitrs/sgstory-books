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

/* ── ★S8（`books#402`）②：W09 相位的**入场战力基准**（★逐字照 `writer-2` 终裁 `6028039152` ✓）─────
 * ★乙（主基准）＝**完整玩家侧**：★真实穿戴 `mail`（铁环甲，AC+3）＋ `heavy-wooden-shield`（重木盾，AC+2）
 *   ＋ ★**`sword-quenched`（淬火长剑，真实装备并实际用于攻击）** —— ✗ 基础 `sword` ✓；
 *   ★基础能力**沿正式角色**（✗ 另加 BAB／属性／祝福／测试专用加值 ✓）；核对点：有效 AC17／攻击 +4／伤害 `2d6+3`／重击 19–20×2 走正式规则 ✓
 *   ★★**场上创伤／擒抱／侦察等真实修正照常计算** —— ✗ 为维持「+4／AC17」屏蔽它们 ✓。
 * ★甲（对照）＝★**基础 `sword` 单装**（无甲无盾）⇒ ★**不承担产品承诺** ✓（✗ 因胜率低判「产品不可玩」✓）。
 * ★★**相位 ✗ 在 W09 入口暗补**（✗ 补满血／✗ 清负面／✗ 刷药 ✓）⇒ ★一切**继承到城那一刻的真实状态** ✓。 */
const 基准表 = Object.freeze({
	乙: Object.freeze({ 身: 'mail', 盾: 'heavy-wooden-shield', 武: 'sword-quenched' }),
	甲: Object.freeze({ 身: null,  盾: null,                武: 'sword' }),
});
const 基准 = argOf('基准', '乙');
if (!基准表[基准]) { console.error(`✗ 用法错：--基准 只取 乙|甲（实得 ${JSON.stringify(基准)}）`); process.exit(2); }

/** ★「六路选一·互斥」判据（**纯** ⇒ 可自证 ✓）：★给定 `可达`／`走过`／`同层可选`。
 *  ★要成立**两件**：★①**六路都可达且都走过**（✗ 只走一条也算「互斥」—— ★那是**恒真式** ✗）；★②**选一后其余不可再选**（逐层 ≤ 1 ✓）。 */
const 六路互斥判据 = ({ 可达, 走过, 同层可选 }) =>
	走过.length === 可达.length && 走过.every((x) => 可达.includes(x)) && 同层可选.every((n) => n <= 1);

/** ★「入口 ✗ 暗补」判据（**纯**）：★入口前后，★生命**不得上升**、★负面不消失、★药品不增加（★终裁明文 ✓）。 */
const 入口未暗补判据 = ({ 入口前, 入口后 }) =>
	!(入口后.hp > 入口前.hp) && !(入口后.负面数 < 入口前.负面数) && !(入口后.药 > 入口前.药);

/** ★六路驱动（**纯** ⇒ 可自证 ✓）：★给定状态机接口 `{ 可走, 走, 重开 }`（★名字**从接口现取**，✗ 写死 ✓）。
 *  ★做法：★从入口起，★**每层先取全部可选**（记 `同层可选`＝那一层当时的分支数 ⇒ 供「选一后其余不可再选」判 ✓）
 *  ⇒ ★**逐支走到底**（★每支走完后 `重开()` ⇒ ★**六路都可达且都被走过** ✓ ⇒ ★✗ 只走一条 ✓）。
 *  ★返回 `{ 可达, 走过, 同层可选, 步数, 越界 }`；★`越界`＝走到接口未给的分支（★那头是**具名红** ✓ ✗ 静默 ✓）。 */
const 走六路 = ({ 可走, 走, 重开 }, 上限 = 64) => {
	const 可达 = [...new Set(可走())];
	const 走过 = []; const 同层可选 = []; const 越界 = []; let 步数 = 0;
	for (const 支 of 可达) {
		重开();
		const L = 可走(); 同层可选.push(L.length);
		if (!L.includes(支)) { 越界.push({ 支, 该层可选: [...L] }); continue; }
		const r = 走(支);
		if (r === false || r?.ok === false) { 越界.push({ 支, 拒: r?.code ?? r }); continue; }
		走过.push(支);
		if (++步数 > 上限) { 越界.push({ 支, 因: `步数超 ${上限}` }); break; }
	}
	重开();
	return { 可达, 走过, 同层可选, 步数, 越界 };
};
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
    /* ★S8（`books#402`）②：W09 相位 —— 基准与两条判据的**牙齿**（★纯 ✓ 不碰真产物 ✓） */
    检查('K8 基准表须与终裁**逐字**一致（乙＝mail／heavy-wooden-shield／sword-quenched；甲＝基础 sword 单装）',
      基准表.乙.身 === 'mail' && 基准表.乙.盾 === 'heavy-wooden-shield' && 基准表.乙.武 === 'sword-quenched'
      && 基准表.甲.身 === null && 基准表.甲.盾 === null && 基准表.甲.武 === 'sword',
      `乙=${JSON.stringify(基准表.乙)}｜甲=${JSON.stringify(基准表.甲)}`);
    检查('K9 ★「六路互斥」判据**须能区分「只走了一条」**（✗ 恒真式 —— ★本笔最承重的一格）',
      六路互斥判据({ 可达: ['a','b','c'], 走过: ['a'], 同层可选: [1,1,1] }) === false
      && 六路互斥判据({ 可达: ['a','b','c'], 走过: ['a','b','c'], 同层可选: [1,1,1] }) === true
      && 六路互斥判据({ 可达: ['a','b','c'], 走过: ['a','b','c'], 同层可选: [1,2,1] }) === false,
      `只走一条=${六路互斥判据({ 可达: ['a','b','c'], 走过: ['a'], 同层可选: [1,1,1] })}（须 false）｜走全=${六路互斥判据({ 可达: ['a','b','c'], 走过: ['a','b','c'], 同层可选: [1,1,1] })}（须 true）｜某层可选2=${六路互斥判据({ 可达: ['a','b','c'], 走过: ['a','b','c'], 同层可选: [1,2,1] })}（须 false）`);
    检查('K10 ★「入口 ✗ 暗补」判据**须能判出补了血**（✗ 恒真式）',
      入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 5, 负面数: 2, 药: 1 } }) === true
      && 入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 40, 负面数: 2, 药: 1 } }) === false
      && 入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 5, 负面数: 0, 药: 1 } }) === false,
      `不增=${入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 5, 负面数: 2, 药: 1 } })}（须 true）｜补血=${入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 40, 负面数: 2, 药: 1 } })}（须 false）｜清负面=${入口未暗补判据({ 入口前: { hp: 5, 负面数: 2, 药: 1 }, 入口后: { hp: 5, 负面数: 0, 药: 1 } })}（须 false）`);
    /* ★K11：★六路驱动**须真走全**（✗ 只走一条 ✓）＋ ★**越界／被拒须具名报出**（✗ 静默跳过 ✓）—— 用**假状态机**自证 ✓ */
    {
      const 造假 = (分支集) => ({ 可走: () => 分支集, 走: (b) => ({ ok: true, 支: b }), 重开: () => {} });
      const 全 = 走六路(造假(['r1','r2','r3','r4','r5','r6']));
      const 半 = 走六路(造假(['r1','r2','r3','r4','r5']));
      const 坏 = 走六路({ 可走: () => ['r1','r2'], 走: (b) => (b === 'r2' ? { ok: false, code: 'SEVEN_BATTLE_LOCKED' } : { ok: true }), 重开: () => {} });
      检查('K11 ★六路驱动**须走全全部分支**（✗ 只走一条）＋ **越界／被拒须具名报出**（✗ 静默）',
        全.走过.length === 6 && 全.越界.length === 0 && 全.同层可选.every((n) => n === 6)
        && 半.走过.length === 5
        && 坏.越界.length === 1 && 坏.越界[0].拒 === 'SEVEN_BATTLE_LOCKED',
        `走全=${JSON.stringify(全.走过)}｜全·越界=${全.越界.length}（须 0）｜5 支接口=${半.走过.length}（须 5）｜被拒支报法=${JSON.stringify(坏.越界)}`);
    }
  console.log(红S.length ? `\n  ⇒ 自检失败 ${红S.length} 条\n${红S.join('\n')}` : '\n  ⇒ 自检：12/12 如期（K1／K2 判出口形；K3–K5c 判选件；K6／K7 机械防「取法回退」与「忘了钉随机」✓；K8–K10 判基准与两条判据的牙齿；K11 判六路驱动会走全且越界具名 ✓）');
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
  /* ── ★S8 ②（`books#402`）：**W09 相位 · 页内驱动**（★接在**主线中途** ✓）──────────────
   * ★实测因（决定性那条）：★主线在 L10 出城后**就落在 W09** ✓，旧工具认不出它的选项
   *   （★段＝「探索」，段内＝「左：奖励·岸边系绳（推荐）」「右：奖励·失落水图」「提前结束本次出城…」✓）
   *   ⇒ ★旧工具判「**无出口**」收场 ✗ ⇒ ★**这就是 `fullrun` 在现 main 上红的原因** ✓（★与本次改动无关 ✓）。
   * ★照 `writer-2` 终裁：★乙／甲基准 ✓｜★**✗ 在 W09 入口暗补**（✗ 补血／✗ 清负面／✗ 刷药）✓｜★「六路互斥」须「**六路都可达**」✓。
   * ★只用**故事自己的口**（`SugarCube.setup.BABEL.七名河` ✓）。 */
  const W09记录 = [];
  const 在W09 = () => p.evaluate(() => {
    const B = (typeof SugarCube !== 'undefined') ? SugarCube.setup.BABEL : null;
    return !!(B?.七名河 && B.七名河.读?.().态 === '进行中');
  });
  const W09走一层到底 = () => p.evaluate(() => {
    const SC = SugarCube, B = SC.setup.BABEL, 七 = B.七名河, 结 = B.返程结算;
    const 药数 = () => (SC.State.variables.inventory ?? []).filter((x) => /herb|bandage|poultice/.test(String(x?.id ?? ''))).reduce((a, x) => a + Number(x?.charges ?? 0), 0);
    const 入口前 = { hp: SC.setup.DND3.Player.hp, 药: 药数() };
    /* ★取「本节点可走」：★用 **`读().可走`** ✓（★`七.可走()` 这个口在本上下文里返回**空** ✗ —— 实测 ✓） */
    const 可走列 = () => { try { return [...new Set(七.读().可走 ?? [])]; } catch { return []; } };
    const 走支 = (支) => { if (typeof 七.走 === 'function') return 七.走(支); if (typeof 七.选行动 === 'function') return 七.选行动(支); throw new Error('七名河没给「走」的口'); };
    const 可达 = 可走列();
    const 走过 = []; const 越界 = []; const 轨迹 = [];
    for (const 支 of 可达) {
      try { 走支(支); 走过.push(支); } catch (e) { 越界.push({ 支, 因: String(e?.message ?? e).slice(0, 60) }); continue; }
      轨迹.push(JSON.parse(JSON.stringify(七.读())));
    }
    const 入口后 = { hp: SC.setup.DND3.Player.hp, 药: 药数() };
    const 末 = 七.读();
    return { 入口前, 入口后, 可达, 走过, 越界, 轨迹, 当前: 末.当前, 态: 末.态, 路径: 末.路径, 出口: 末.出口 ?? null,
      可走: 可走列(), 返程口键: 结 ? Object.keys(结) : null };
  });
  const 接手W09 = async () => {
    let 最后一 = null;
    for (let i = 0; i < 8; i++) {
      const r = await W09走一层到底();
      W09记录.push(r); 最后一 = r;
      console.log(`  ★W09 相位[${i}]：态=${r.态}｜当前=${r.当前}｜可达=${JSON.stringify(r.可达)}｜走过=${JSON.stringify(r.走过)}｜越界=${JSON.stringify(r.越界)}｜路径=${JSON.stringify(r.路径)}`);
      if (r.态 !== '进行中' || r.可走.length === 0) break;
    }
    return 最后一;
  };

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
      /* ★S8 ②：★已进 W09（首次出城）⇒ ★先把它走完再继续上行 ✓
       *   ★✗ 记入 `逐跳` —— W09 是**独立区域**、不记层号 ✓ ⇒ ★「逐跳单调」的**来源**由此保住 ✓ */
      if (await 在W09()) {
        await 接手W09();
          /* ── ★S8 ② 第五片（`books#402`）：★两件**零写探针**（★✗ 扰动主线 ✓）────────────────
           *   ③ **死亡支**：`七.死()` 是**刻意的零写** —— 保留「进行中（未完成）」✓ ✗ 写完成 ✗ 写成没来过 ✓
           *   ② **重访不重掷**：再进教程（`开始()`）须**不重置**「已处理」⇒ 同一节点**不再重掷** ✓
           *   ★两件都只**页内读 ＋ 调零写口** ⇒ **域 JSON 前后逐字比**＝它们**自证未扰动** ✓（✗ 靠我相信 ✓） */
          const 零写读数 = await p.evaluate(() => {
            const B = (typeof SugarCube !== 'undefined') ? SugarCube.setup.BABEL : null;
            const 七 = B?.七名河;
            if (!七) return { 略: '页内无七名河' };
            const 键 = 七.域键 ?? 'sevenNames';
            const 域JSON = () => JSON.stringify(SugarCube.State.variables[键] ?? null);
            const 前 = 域JSON(); const r0 = 七.读();
            let 死 = null;
            try { 死 = 七.死(); } catch (e) { return { 具名红: `死() 抛错：${String(e?.message ?? e).slice(0, 120)}` }; }
            const 后死 = 域JSON(); const r1 = 七.读();
            let 重 = null;
            try { 重 = (typeof 七.开始 === 'function') ? 七.开始() : { 无口: true }; } catch (e) { 重 = { 抛: String(e?.message ?? e).slice(0, 80) }; }
            const 后重 = 域JSON(); const r2 = 七.读();
            return { 死, 死前后同: 前 === 后死, 态前: r0.态, 态后死: r1.态, 未完成: 死?.未完成 ?? null,
                     当前前: r0.当前, 已处理前: r0.已处理 ?? [],
                     重, 重前后同: 后死 === 后重, 重后当前: r2.当前, 重后已处理: r2.已处理 ?? [] };
          });
          console.log(`  ★零写探针（死／重访）：${JSON.stringify(零写读数)}`);
          if (零写读数.略) 档.push(`  · 零写探针未跑：${零写读数.略}`);
          if (零写读数.具名红) 档.push(`  · ${零写读数.具名红}`);
          if (零写读数.死 && !(零写读数.死.ok === true && 零写读数.未完成 === true))
            档.push(`  · ★S8 ② ③死亡支：「七.死()」须**具名成功且标「未完成」**（实得 ${JSON.stringify(零写读数.死)}）`);
          if (零写读数.死 && 零写读数.死前后同 !== true)
            档.push('  · ★S8 ② ③死亡支：「死()」须**零写**（域 JSON 前后逐字同 —— ✗ 写完成 ✗ 写成没来过）');
          if (零写读数.死 && 零写读数.态后死 !== '进行中')
            档.push(`  · ★S8 ② ③死亡支：死后态须仍为「进行中（未完成）」（实得 ${JSON.stringify(零写读数.态后死)}）`);
          if (零写读数.重前后同 !== true)
            档.push('  · ★S8 ② ②重访：再进教程（「开始()」）须**不改档**（重访 ✗ 重置）');
          /* ★★「判据凭什么一定成立」自检（★本席当日口径）：★已处理集**为空** ⇒ ★上面那条「保留」**恒真** ✗
           *   ⇒ ★**如实登记为「本轮空转·未判」** ✓（✗ 冒充已判 ✓；根因＝六路驱动只走 `走()`、✗ 选过行动 ✓）。 */
          if (零写读数.已处理前 && 零写读数.已处理前.length === 0)
            档.push('  · ★S8 ② ②重访不重掷：**前置未满足 ⇒ 本轮该断言空转（未判）** —— 已处理集为空（六路驱动只走 `走()`，✗ 选过行动）⇒ 「保留」恒真 ✗；下一步须**先真选一次行动**再断');
          if (零写读数.已处理前 && JSON.stringify(零写读数.重后已处理) !== JSON.stringify(零写读数.已处理前))
            档.push(`  · ★S8 ② ②重访不重掷：已处理集须**保留**（前 ${JSON.stringify(零写读数.已处理前)} ⇒ 后 ${JSON.stringify(零写读数.重后已处理)}）`);
          if (零写读数.重后当前 !== 零写读数.当前前)
            档.push(`  · ★S8 ② ②重访：位置须**保留**（前 ${JSON.stringify(零写读数.当前前)} ⇒ 后 ${JSON.stringify(零写读数.重后当前)}）`);
        /* ★走到 `E9`（出口）之后：★**点返城把这一局收掉** ✓ —— ✗ 让主线继续在 W09 里打转 ✓
         *   ★优先点「**提前结束本次出城**」（唯一现成的返城口 ✓）；★若已消失 ⇒ 退回（主线自会处理 ✓）。 */
        /* ★走到 `E9`（出口）⇒ ★**触发「完成」** ✓（★E9 是 portal：`走(E9)` 只把它置为当前 ⇒ 还须 `完成()` ✓
         *   —— ★✗ 让 态 停在「进行中」✓；★那是**提前返程**才有的事 ✓）。 */
        const 完成读数 = await p.evaluate(() => {
          const B = (typeof SugarCube !== 'undefined') ? SugarCube.setup.BABEL : null;
          const 七 = B?.七名河;
          if (!七) return { 略: '页内无七名河' };
          const r0 = 七.读();
          if (r0.当前 !== (r0.出口 ?? 'E9')) return { 略: `当前(${r0.当前}) ≠ 出口(${r0.出口})`, 态: r0.态 };
          if (typeof 七.完成 !== 'function') return { 具名: '七名河没给「完成」的口' };
          try { const rc = 七.完成(); return { 成: rc?.ok ?? null, code: rc?.code ?? null, 态后: 七.读().态 }; }
          catch (e) { return { 具名红: `完成() 抛错：${String(e?.message ?? e).slice(0, 120)}` }; }   // ★✗ 静默吞 ✓
        });
        console.log(`  ★W09 完成()：${JSON.stringify(完成读数)}`);
        if (完成读数.具名 || 完成读数.具名红) 档.push(`  · W09 完成() 出声：${JSON.stringify(完成读数)}`);
        await p.waitForTimeout(600);
        let 返城路 = null;
        if (await 在W09()) {
          /* ★先点 **E9 完成路**的具名出口（`确认回城 · 用掉本次传送机会（E9）`）；★无它才退回「提前返程」路
           *   —— ★两条路**只差「是否完成」**（`teleport.js` ③ vs ③b）⇒ ★判据须**知道点了哪条**（✗ 混着断）。 */
          const E9口 = p.locator('#passages a,#passages button').filter({ hasText: /确认回城/ });
          const 退口 = p.locator('#passages a,#passages button').filter({ hasText: /提前结束本次出城|回到|返城|回城/ });
          if (await E9口.count() > 0) { 返城路 = 'E9'; await E9口.first().click(); }
          else if (await 退口.count() > 0) { 返城路 = '提前'; await 退口.first().click(); }
          if (返城路) await p.waitForTimeout(1400);
          await 清到达拍();
        }
        await p.waitForTimeout(800);
        console.log(`  ★返城后：段=${JSON.stringify(await 段())}｜出口=${JSON.stringify((await 段内()).slice(0, 14))}`);
        /* ★返城之后**回到城里**：★若当前段**没有向上类出口** ⇒ ★先点「回共炉，再作准备」（回到探索面 ✓）
         *   ⇒ ★再让主线点「走向上行门」✓ —— ★实测：★第二次返城落在一个**只有「回共炉」**的面 ✓（✗ 探索面 ✓）。 */
        for (let k = 0; k < 3; k++) {
          const L = await 段内();
          /* ★判据（★实测得来）：★「**向上类**出口」才算回到正路 ✗ 泛 `是移动项` ✓
           *   —— ★因为 `穿过单向门，走进七名河（首次出城教程）` **也**是移动项 ✗，★但它会**再回 W09** ✓。 */
          if (L.some((x) => /^走向上行门|^向上|^前进|^去第/.test(x))) break;
          const 回 = p.locator('#passages a,#passages button').filter({ hasText: /回共炉|再作准备|歇一歇|了解这座城/ });
          if (await 回.count() === 0) break;
          await 回.first().click(); await p.waitForTimeout(1200); await 清到达拍();
          console.log(`  ★返城后·回合${k}：段=${JSON.stringify(await 段())}｜出口=${JSON.stringify((await 段内()).slice(0, 12))}`);
        }
          /* ── ★S8 ② 第五片：**① E9 结算「恰一次」**（故事自持键闸 ＋ 二次调用**零副作用**）──────────
           *   判据形（✗ 只断「第一次成功」✓）：**二次调用须具名拒**（`RETURN_ALREADY_SETTLED` ✓）
           *     ＋ **二次调用前后域 JSON 逐字同**（⇒ 「恰一次」的**实质**＝✗ 二次损毁 ✓）。 */
          const 恰一次读数 = await p.evaluate(() => {
            const B = (typeof SugarCube !== 'undefined') ? SugarCube.setup.BABEL : null;
            const 结 = B?.返程结算, 七 = B?.七名河;
            if (!结 || typeof 结.返程事务 !== 'function') return { 略: '页内无 `返程结算.返程事务`' };
            const 键 = 结.域键 ?? 七?.域键 ?? 'sevenNames';
            const 域 = () => SugarCube.State.variables[键] ?? null;
            const 域JSON = () => JSON.stringify(域() ?? null);
            const d0 = 域JSON();
            let 再 = null;
            try { 再 = 结.返程事务({}); } catch (e) { return { 具名红: `返程事务() 二次抛错：${String(e?.message ?? e).slice(0, 120)}` }; }
            const d1 = 域JSON();
            const 本域 = 域() ?? {};
            return { 已结: 本域.返程已结 ?? null, 机会实例: 本域.机会?.实例 ?? null, 态: 本域.态 ?? null,
                     结果栏: 本域.返程结果?.栏 ? Object.keys(本域.返程结果.栏) : null,
                     再, 二次后域同: d0 === d1 };
          });
          console.log(`  ★恰一次探针（E9 结算）：${JSON.stringify(恰一次读数)}`);
          if (恰一次读数.略) 档.push(`  · 恰一次探针未跑：${恰一次读数.略}`);
          if (恰一次读数.具名红) 档.push(`  · ${恰一次读数.具名红}`);
          if (!恰一次读数.已结)
            档.push('  · ★S8 ② ①恰一次：返城后 `返程已结` 须已写（✗ 空 ⇒ 结算没发生）');
          if (恰一次读数.已结 && 恰一次读数.机会实例 && 恰一次读数.已结 !== 恰一次读数.机会实例)
            档.push(`  · ★S8 ② ①恰一次：「返程已结」须 ＝ 本次实例（已结 ${JSON.stringify(恰一次读数.已结)} ≠ 实例 ${JSON.stringify(恰一次读数.机会实例)}）`);
          if (返城路 === 'E9' && 恰一次读数.态 !== '完成')
            档.push(`  · ★S8 ② ①恰一次：走 **E9 完成路** ⇒ 态须为「完成」（实得 ${JSON.stringify(恰一次读数.态)}）`);
          if (返城路 === '提前' && 恰一次读数.态 === '完成')
            档.push('  · ★S8 ② ①恰一次：走**提前返程路** ⇒ 态须**仍为进行中**（设计 §6「提前回城不算完成」✗ 被算成完成）');
          if (返城路 && 恰一次读数.已结 !== 恰一次读数.机会实例)
            档.push(`  · ★S8 ② ①恰一次：两条路**共用同一幂等键空间** ⇒ 已结须 ＝ 本次实例（路=${返城路}｜已结 ${JSON.stringify(恰一次读数.已结)} ≠ 实例 ${JSON.stringify(恰一次读数.机会实例)}）`);
          if (!恰一次读数.结果栏 || !恰一次读数.结果栏.includes('消失'))
            档.push(`  · ★S8 ② ①恰一次：「返程结果.栏」须在册（实得 ${JSON.stringify(恰一次读数.结果栏)}）`);
          if (恰一次读数.再 && 恰一次读数.再.ok !== false)
            档.push(`  · ★S8 ② ①恰一次：**二次**结算须**被拒**（✗ 成功 ⇒ 「恰一次」不成立；实得 ${JSON.stringify(恰一次读数.再)}）`);
          if (恰一次读数.再 && 恰一次读数.再.code !== 'RETURN_ALREADY_SETTLED')
            档.push(`  · ★S8 ② ①恰一次：二次拒绝的 code 须具名「RETURN_ALREADY_SETTLED」（实得 ${JSON.stringify(恰一次读数.再.code)}）`);
          if (恰一次读数.二次后域同 !== true)
            档.push('  · ★S8 ② ①恰一次：二次结算前后**域 JSON 须逐字同**（⇒ ✗ 二次损毁）');
      }
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
  /* ── ★S8 ②（`books#402`）：**W09 相位** —— ★放在**主跑之后**（✗ 打断主线的逐跳断言 ✓）──
   * ★照 `writer-2` 终裁：★乙／甲基准 ✓｜★**✗ 在 W09 入口暗补** ✓｜★「六路互斥」须「**六路都可达**」✓（✗ 只走一条 ✓）。
   * ★本片先做**接口探测**（★读数 ⇒ `console.log` 印出 ✓）—— ★✗ 猜接口名 ✓；
   *   ★下一片据此接线：出城 ⇒ 记入口状态 ⇒ 走六路 ⇒ E9 结算恰一次 ⇒ 重访不重掷 ⇒ 死亡支 ✓。 */
  const W09接口 = await p.evaluate(() => {
    /* ★取法：★`SugarCube.setup.BABEL` ✓（✗ 裸 `setup` —— 它是 SugarCube 内部名 ⇒ 全局取不到 ✓；承本档 `:201` 既有取法 ✓） */
    const SC = (typeof SugarCube !== 'undefined') ? SugarCube : null;
    const B = SC?.setup?.BABEL ?? null;
    if (!B) return { 装置错: '页内取不到 SugarCube.setup.BABEL' };
    const 七 = B.七名河 ?? null, 结 = B.返程结算 ?? null;
    return { 有七名河: !!七, 有返程结算: !!结, 有地图: !!B.地图, 聚落: B.聚落 ?? null,
      段: SC?.State?.passage ?? null,
      出口: [...document.querySelectorAll('#passages a,#passages button')].map((e) => (e.textContent ?? '').trim()).filter(Boolean),
      七名河键: 七 ? Object.keys(七) : null, 返程键: 结 ? Object.keys(结) : null,
      七名河读: (() => { try { return JSON.parse(JSON.stringify(七.读?.() ?? null)); } catch (e) { return 'throw:' + String(e.message).slice(0, 60); } })(),
      地图点: (() => { try { return [...(B.地图?.点 ?? B.map?.locations?.keys?.() ?? [])]; } catch { return null; } })(),
    };
  });
  console.log(`  ★W09 相位·接口探测：${JSON.stringify(W09接口)}`);

  const 终段 = await 段(); const 终账 = await 账();
  const 终文 = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ');

  /* ── 结构式断言（✗ 不写死「18」那类会随内容变的数）── */
  ok(终点 && 终段 === '试玩终点', `① 整局须走到终点段落：段=${JSON.stringify(终段)}（终点口点过=${终点}）`);
  ok(终账?.deepest === 'L20', `① 终点 deepest 须＝L20：实得 ${JSON.stringify(终账?.deepest)}`);
  const 层号 = 逐跳.map((x) => Number(String(x.deepest ?? 'L0').replace('L', '')) || 0);
  ok(层号.every((n, i) => i === 0 || n >= 层号[i - 1]), `① 逐跳层号须**单调不降**：${JSON.stringify(层号)}`);
    /* ★S8 ②（`books#402`）：★★**「逐跳单调」的来源须在格内钉死** ✗ 只在注释里说 ✓
     *   ★判据：★①真进过 W09（记录 > 0 且每层可达非空 ✓）★②`逐跳.deepest` **一律形如 `L<n>`**（★W09 不记层号 ✓）。 */
    /* ★放宽：★`E9`（出口）**本就无可走** ✓ ⇒ 只要求「**入口层可达 ≥ 2**」（★＝真进了七名河、且真有分岔 ✓）
     *   ＋ ★`走过` 非空（★真走过支 ✓）＋ ★`越界` 全空（★没有走不动就跳过的支 ✓）。 */
    ok(W09记录.length > 0 && W09记录.some((x) => x.可达.length >= 2)
      && W09记录.some((x) => x.走过.length > 0) && W09记录.every((x) => x.越界.length === 0),
      `★② W09 相位须真被接手并走通：记录 ${W09记录.length} 次｜入口层可达=${JSON.stringify(W09记录.map((x) => x.可达.length))}｜走过合计=${W09记录.reduce((a, x) => a + x.走过.length, 0)}｜越界累计=${W09记录.reduce((a, x) => a + x.越界.length, 0)}（须 0）`);
    ok(逐跳.every((x) => /^L\d+$/.test(String(x.deepest ?? ''))),
      `★★「逐跳单调」的来源：★W09 **不记层号** ✓（逐跳 deepest 一律形如 \`L<n>\`：${JSON.stringify(逐跳.map((x) => x.deepest))}）`);
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
