/* 真产物**驾驶层**（`#300` 条款⑤「两次法则」入册 · 本席在 `sgstory#1860`／`#1864`／`#1866`／`books#92`／`books#91` 五票用过的同族探针）
 *
 * 与 `tools/e2e-harness.mjs` 的分工（★**只 import，不复制**）：
 *   `e2e-harness.mjs` ＝ **引导 ＋ 点链接 ＋ 读面板**（已合的 10 刀件；★本笔**只动它一处**：`resolveEnv` 收 `env` 回落
 *     并优先 `--engine`（见 `#98` 的 RC 折单）—— 除此**未动**其它行；其余照旧）；
 *   本件 ＝ 其**上层驾驶**：**读档往返**（`Save.slots.save/load` ＋ `Engine.show()`）、**自环就地重绘**（`.choice-box` 按钮）、
 *     **正文行读数**、**State 直铺**。复用点只有 `resolveEnv`／`boot`／`currentPassage`／`playPassage`／`panels` ⇒ `import` 即得
 *     （✗ 重写一份 `boot` —— 两份会漂，`#300` ⑦/⑧ 同族）。
 *
 * 为什么值得入册（⑤ 判准＝**复核价值**，✗ 非难度）：下列面**只有真 DOM 层照得出**，静态/单测层看不见 ——
 *   · `#1860` 战斗收场出口落**页底**（页底 vs 段落顶部的**视口差**）· `#1864` 读档后 **State／实例／面板／屏幕** 四面不一
 *   · `#1866` 故事页点道具**抛穿 DOM**（玩家无可读反馈）· `books#92` **交付树** vs 上游副本的产物差
 *
 * 用法（★最小可复算集＝**一条命令 ＋ 一个夹具**；夹具＝按 pin 的引擎检出 ＋ 本仓故事）：
 *   git -C <engine> checkout "$(jq -r .ref <books>/.github/engine-ref.json)"
 *   python3 <engine>/build.py "$PWD/stories/babel" --out babel-trial.html
 *   node tools/e2e-drive.mjs --engine <engine>                 # 稳定面（见下）
 *   node tools/e2e-drive.mjs --engine <engine> --require <面>   # 把**明账面**升为硬判（该面所属票修好后用）
 *   node tools/e2e-drive.mjs --engine <engine> --selftest       # 刀：证明本件**判得了**（正例档＋反例档＋唯一变量）
 * ★引擎根两种给法都行（**参数优先、回落 `ENGINE`**，与姊妹件 `check-refs-recheck.mjs` 同约定）：
 *     `--engine <dir>` ｜ `ENGINE=<dir> …`
 * 退出码：0 全通过；1 有红；2 用法/环境错（缺引擎／缺产物／jsdom 不可得 ⇒ **具名**）。

 * ── 面的**状态**（★`#300` ② 「不可解析须成明账」：✗ 把「本 pin 没修」与「判据不成立」混为一谈）──
 *   **R 读档往返·导航形**：**硬判**。存档 → **导航到别段** → 读档 ⇒ 段落须回存档刻。此形在 pin 上成立（导航会写 `_history`）。
 *   **S 自环就地重绘·面板跟随**：**明账**（属 `sagitrs/sgstory#1859` ⇒ 修 `#1864`，**未合**）。`--require self-loop` 升硬判。
 *   **I 故事页点道具不穿 DOM**：**明账**（属 `sagitrs/sgstory#1857` ⇒ 修 `#1866`，**未合**）。`--require item-click` 升硬判。
 *   ⇒ ★明账面**每次运行都打印**（含归属票号）—— `#300` ⑧「非空≠存在」的同族：✗ 让「没跑」与「跑过且未修」同形。
 *
 * ⚠ **每个硬判面都必须带「两向断言」**（⑤ 对照档：**开跑前先断两臂可分辨**）：
 *   只断「读档后 = 存档刻」的话，**把 `loadAt` 写成空函数也会绿**（两边都停在存档刻）⇒ 必须先断「改过 ⇒ 确实变了」。
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveEnv, boot, currentPassage, playPassage, panels } from './e2e-harness.mjs';

const argOf = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);
const REQUIRE = new Set((argOf('--require') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 驾驶原语（★失败一律**抛**：静默返回 `[]`/`''` 会让「面板没了」被读成「面板是空的」） ── */

/** 末尾段落的**正文行**（`<p>` 文本；✗ 面板内 —— 面板内容另有 `panels()`）。 */
export function passageLines(session) {
	const box = [...session.doc.querySelectorAll('#passages .passage')].pop();
	if (!box) throw new Error('取不到末尾 `.passage`（产物未 boot／段落未挂载）');
	return [...box.querySelectorAll('p')].map((p) => (p.textContent ?? '').trim()).filter((s) => s !== '');
}

/** `.choice-box` 里的按钮文本（`choice()` 渲染：自环 action 与出口都走它）。 */
export function choiceButtons(session) {
	return [...session.doc.querySelectorAll('.choice-box button')].map((b) => (b.textContent ?? '').trim());
}

/** ★点一个按钮并断「**读数确实变了**」（✗ 返回 void —— 那会让调用方对着**未触达**的面下结论）。 */
export async function driveButton(session, re, { read, expectNavigate = null }) {
	const btns = [...session.doc.querySelectorAll('.choice-box button')].filter((b) => re.test(b.textContent ?? ''));
	if (btns.length === 0) throw new Error(`找不到匹配 ${re} 的按钮；当前可点 = ${JSON.stringify(choiceButtons(session))}`);
	const before = read(session), was = currentPassage(session);
	btns[0].click();
	await tick(150);
	const now = currentPassage(session);
	if (expectNavigate != null && now !== expectNavigate) throw new Error(`★期望导航到 ${expectNavigate}，实得 ${now}`);
	if (expectNavigate == null && now !== was) throw new Error(`★该按钮**导航**了（${was} → ${now}）⇒ 本条判的是**就地重绘**面（✗ 用 driveButton 测出口）`);
	const after = read(session);
	if (after === before) throw new Error(`★点了 ${JSON.stringify(btns[0].textContent)} 但读数**未变**（仍 ${JSON.stringify(before)}）⇒ 两向断言失败：该面**未触达**，本实验不成立`);
	return { before, after, passage: now };
}

/** 存档到 slot（引擎真路径）。 */
export async function saveAt(session, slot = 1) {
	if (session.SC.Save?.slots?.save == null) throw new Error('产物里无 `Save.slots.save`（引擎版本／装配不符）');
	const r = session.SC.Save.slots.save(slot);
	if (r?.then) await r;
	await tick(120);
}

/** ★读档：`slots.load` ⇒ **`Engine.show()`** —— 后者是引擎侧读档的**收尾**。
 *  ✗ 漏 `show()` ⇒ 段落与面板**不刷新**（实测 `#1864`：State 已回存档刻而**屏幕仍画旧值**）⇒ 该收尾是本面的**唯一变量**之一。 */
export async function loadAt(session, slot = 1) {
	if (session.SC.Save?.slots?.load == null) throw new Error('产物里无 `Save.slots.load`');
	const r = session.SC.Save.slots.load(slot);
	if (r?.then) await r;
	await tick(180);
	const s = session.engine.show();
	if (s?.then) await s;
	await tick(280);
}

/** 直接铺 `State.variables`（铺前置态）。⚠ `State.passage` **只有 getter** ⇒ ✗ 用赋值造读数（会 TypeError）。 */
export function setStateVars(session, patch) {
	const v = session.SC.State.variables;
	for (const [k, val] of Object.entries(patch)) v[k] = val;
}

/** 面板文本（缺宿主 ⇒ **抛**，与 `panels()` 同取向）。 */
export const panelText = (session, id) => panels(session, [id])[id];

/* ── CLI ── */
const bail = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };
if (has('--list')) {
	console.log('  硬判面：R 读档往返·导航形');
	console.log('  明账面（挂票号；`--require <self-loop|item-click>` 可升硬判）：S 自环就地重绘·面板跟随（sagitrs/sgstory#1859）｜I 故事页点道具不穿 DOM（sagitrs/sgstory#1857）');
	console.log('  原语：passageLines／choiceButtons／driveButton／saveAt／loadAt／setStateVars／panelText');
	process.exit(0);
}

let env;
try { env = resolveEnv(argOf('--engine'), process.env); } catch (e) { bail(e.message, 2); }
if (!fs.existsSync(env.htmlPath)) {
	bail(`缺产物：${env.htmlPath}\n  先构建：python3 ${path.join(env.root, 'build.py')} ${env.storyDir} --out ${path.basename(env.htmlPath)}`);
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const lines = (s) => passageLines(s).length;

if (has('--selftest')) {
	/* 刀：**正例档 ＋ 反例档 ＋ 唯一变量**（⑤ 对照档）。★开跑前先断「两臂可分辨」。 */
	const s = await boot(env);
	const F = (name, cond) => { ok(cond, name); console.log(`  ${cond ? '✓' : '✗'} ${name}`); };
	/* ★★两臂可分辨（**开跑前**自证）：真按钮 ⇒ 成功；不存在的按钮 ⇒ 必抛。二者皆须成立，否则本实验不成立。 */
	let pos = null, neg = null;
	await playPassage(s, '探索'); await tick(350);
	try { await driveButton(s, /翻找|采集|找采集点/, { read: lines }); pos = 'ok'; } catch (e) { pos = e.message; }
	try { await driveButton(s, /绝不存在的按钮-xyz/, { read: lines }); neg = 'ok'; } catch (e) { neg = e.message; }
	F('★两臂可分辨 · 正例臂：真按钮 ⇒ **不抛**（若抛，本夹具前提不成立）', pos === 'ok');
	F('★两臂可分辨 · 反例臂：不存在的按钮 ⇒ **抛**（✗ 静默返回空）', /找不到匹配/.test(neg ?? ''));
	/* 唯一变量：只把读数函数换成**恒值** ⇒ 必须因「读数未变」而抛。 */
	let constv = null;
	try { await driveButton(s, /翻找|采集|找采集点/, { read: () => '恒定' }); } catch (e) { constv = e.message; }
	F('★唯一变量：只换读数函数为**恒值** ⇒ 必抛「读数未变」（证明两向断言承重，✗ 是摆设）', /未变/.test(constv ?? ''));
	/* 唯一变量二：期望导航但按钮不导航 ⇒ 必抛（反向错用也要被抓）。 */
	let wrongNav = null;
	try { await driveButton(s, /翻找|采集|找采集点/, { read: () => Math.random(), expectNavigate: '绝不存在的段-xyz' }); } catch (e) { wrongNav = e.message; }
	F('★唯一变量二：只改 `expectNavigate` 为错值 ⇒ 必抛「期望导航到…」（✗ 静默放过）', /期望导航到/.test(wrongNav ?? ''));
	let missPanel = null;
	try { panelText(s, '不存在面板-xyz'); } catch (e) { missPanel = e.message; }
	F('缺面板 ⇒ **抛**（✗ 返回空串 —— 那会把「面板没了」读成「面板是空的」）', /面板宿主缺失/.test(missPanel ?? ''));
	s.dom.window.close();
} else {
	const s = await boot(env);

	/* ══ 面 R（**硬判**）：读档往返·**导航形** ══════════════════════════════════════
	 * 两向：①「存档刻 ≠ 改动后」须成立（✗ 否则「load 是空函数」也绿）②读档后须**回**存档刻。
	 * ⚠ 本条**只用导航**（✗ 就地改 State）—— 就地改的持久化属 `sgstory#1859`（修 `#1864`，未合）⇒ 见明账 S。 */
	await playPassage(s, '探索'); await tick(250);
	const P1 = currentPassage(s);
	await saveAt(s, 1);
	await playPassage(s, s.SC.Config.passages.start); await tick(250);
	const P2 = currentPassage(s);
	ok(P1 !== P2, `★面 R 两向①：存档刻(${P1}) 与 改动后(${P2}) **须不同**（✗ 同则本面**未触达**）`);
	await loadAt(s, 1);
	const P3 = currentPassage(s);
	ok(P3 === P1, `★面 R 两向②：读档后段落须回存档刻（期望 ${P1}，实得 ${P3}）`);
	if (P1 !== P2 && P3 === P1) console.log(`  面 R ✓ 读档往返：段落 ${P1} → ${P2} → **${P3}**（引擎真路径：slots.save/load ＋ Engine.show）`);

	/* ══ 面 S/I（**明账**，含归属票号；`--require` 升硬判）══════════════════════════ */
	const probe = async (face, ticket, fn) => {
		let verdict, why = '';
		try { verdict = await fn(); } catch (e) { verdict = false; why = e.message; }
		const hard = REQUIRE.has(face);
		if (verdict) console.log(`  面 ${face} ✓ 已成立（票 ${ticket} 的修在该 pin 上生效）`);
		else if (hard) fails.push(`面 ${face}（票 ${ticket}）未成立：${why}　★已 --require ⇒ 硬判；若该票未合请去掉 --require`);
		else console.log(`  面 ${face} — **明账·未成立**（属 ${ticket}，其修**未在本 pin**）⇒ ✗ 不判红；该票合后加 \`--require ${face}\` 升硬判${why ? `（探针说：${why}）` : ''}`);
	};
	/* S：自环就地重绘 ⇒ 面板跟随（只有**真按钮点击**走刷新点；直调 API 会绕过它 —— 本席实测踩过） */
	await probe('self-loop', 'sagitrs/sgstory#1859', async () => {
		await playPassage(s, '探索'); await tick(300);
		const inv = (x) => panelText(x, 'inventory');
		const { before, after } = await driveButton(s, /翻找|采集|找采集点/, { read: inv });
		return before !== after;
	});
	/* I：故事页点道具**不穿 DOM**（`itemClick` 把 `used()` 的抛错收成可读拒绝） */
	await probe('item-click', 'sagitrs/sgstory#1857', async () => {
		const R = s.SC.setup.RPG;
		await playPassage(s, '探索'); await tick(250);
		R.give('rock'); R.refreshPanels?.(['inventory']); await tick(150);
		const a = [...s.doc.querySelectorAll('[data-item="rock"]')].pop();
		if (!a) throw new Error('页面上找不到 `[data-item="rock"]` 链接（前置态未铺成）');
		let threw = null;
		try { a.click(); } catch (e) { threw = e.message; }
		await tick(300);
		const read = passageLines(s).some((t) => /不能直接使用|建设物资/.test(t));
		if (threw !== null) throw new Error(`点道具**抛出**了（${threw}）⇒ 异常仍在穿 DOM`);
		if (!read) throw new Error('点道具后正文**无可读文案** ⇒ `used()` 的抛错未被收成可读拒绝');
		return true;
	});
	s.dom.window.close();
}

console.log('');
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length === 0 ? '✓ e2e 驾驶层通过' : `✗ e2e 驾驶层失败 ${fails.length} 条`);
process.exit(fails.length === 0 ? 0 : 1);
