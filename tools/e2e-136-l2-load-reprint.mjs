#!/usr/bin/env node
/* `books#136` F4 —— ★**载入后场景头须重印**：`#497` 那条判据的**独立旁证**（**真浏览器**臂 · 单臂甲）
 *
 * ## 为什么单开一档（✗ 并进 `e2e-drive.mjs` 的 jsdom 夹具）
 *   本面＝「**玩家点页脚『载入快存』链** ⇒ 段落层**重印**」。★我实测：★**jsdom 夹具点那条链 ⇒ 屏不重画** ✗
 *   （两种可能：夹具 DOM 接法不同／链的 handler 不经故事侧收尾）⇒ ★**夹具不是这条面的支点** ✗
 *   ⇒ ★挪真浏览器：★页脚链是**真入口** ✓（writer-2 在真机上点得动 ✓）。
 *
 * ## 一臂 ＋ 三条前提（★把本席栽过的两处内建进来）
 *   前提①：★页脚须有**可点的「快存」链**（★先走**故事自己的**写档口 ⇒ 「载入快存」链才出现 ✓；
 *           ★`Save.slots.save` 直口 ⇒ `快存有位()` 不认 ⇒ 链**不出现** ✓，我小样实测）
 *   前提②：★摘除那一行头之后，★**须用与判据同一个读数函数**断「确实摘掉了」（★断不过 ⇒ **具名红** ＋
 *           ★**不再往下跑**）—— ★否则「重现」**恒真** ✗（本席实测：该串**在多个元素都有** ⇒ 删「最深」那个后
 *           ★祖先 `textContent` **仍含该串** ✗）
 *   前提③：★点之前断 ★`document.body.contains(链)` ✓ —— ★脱离文档的节点 `click()` **静默空操作** ✗
 *           （本席实测：`[data-footer]` **就在 `#passages` 里** ⇒ 我曾整块清 `#passages` ⇒ 把链一起删了 ✗）
 *   **甲（本臂的判据）**：清掉那一行头 ⇒ 点页脚「载入快存」⇒ ★头**须重现** ✓
 *
 * ## ★★本臂的自证**只到「前件级」**（如实具名 · 领队裁「只留甲一臂」）
 *   我试过两把想让**本结果翻转**的刀：①把故事侧收尾（`ui.twee:14` 的 `<<run setup.BABEL.快读()>>`）换成
 *   「✗ 调收尾」版；②换成「✗ 不载入」版 —— ★**两把都没让结果翻转** ✗：★因人还停在 L2 ⇒ ★**任何**重画
 *   （哪怕没载入）都会画出该头 ⇒ ★这条结果**被当前状态蕴含** ✗。
 *   ⇒ 要「唯一变量级」自证，须**先把状态挪开**（写档在 L2 ⇒ 走到 L3 ⇒ 载入须回 L2）；★我试过
 *   `map.moveTo('L3')` ＋ `Engine.show()`／＋ `Engine.play(当前段)`，★**都没能把屏上的头换成 L3** ✗ ⇒ 留作后续。
 *
 * ## 用法与退出码
 *   `PW_DIR=<含 node_modules/playwright> CHROME_BIN=<Chrome> node tools/e2e-136-l2-load-reprint.mjs <产物绝对路径>`
 *   0 全过｜1 有红（逐条具名）｜2 环境错（缺 `PW_DIR`／`CHROME_BIN`／产物 ⇒ ★✗ 不当判据红 ✓）
 *   `--selftest`：★**前件自证**（★同样跑三条前提 ＋ 甲；★不含「唯一变量级」刀 —— 见上「具名」）
 *
 * ## 具名边界（✗ 声称的）
 *   - 立态用 `B.map.moveTo('L2') ＋ Engine.show()`（本面判「同地点读档 ⇒ 头须重印」，✗ 判「会不会走路」；
 *     「走上去」那半在 `tools/e2e-drive.mjs` 的面 L 里）。
 *   - ✗ 判「通知面／页脚内容」；✗ 判真机与 jsdom 的次序差异（jsdom 侧另有 `verify.mjs` 第 81 组的同族判据）。 */
import fs from 'node:fs';
const 产物 = process.argv[2];
const SELFTEST = process.argv.includes('--selftest');
if (!process.env.CHROME_BIN || !process.env.PW_DIR || !产物 || !fs.existsSync(产物))
	{ console.error('✗ 环境错：须 `PW_DIR` ＋ `CHROME_BIN` ＋ 存在的产物路径'); process.exit(2); }
const { chromium } = await import(`${process.env.PW_DIR}/node_modules/playwright/index.mjs`);
const 头串 = '【第 2 层 · 倒木坡】';
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
const 错 = []; p.on('pageerror', (e) => 错.push(String(e.message).slice(0, 100)));
const tick = (ms) => p.waitForTimeout(ms);
const 重渲 = async () => { await p.evaluate(async () => { const s = SugarCube.Engine.show(); if (s?.then) await s; }); await tick(500); };
const 点段内 = (t) => p.evaluate((tt) => { const els = [...document.querySelectorAll('#passages a, #passages button')];
	const e = els.find((x) => (x.textContent || '').trim() === tt); if (!e) return false; e.click(); return true; }, t);
/** ★判据用的读数（★摘除与判「重现」**同一个**函数 ✓）。 */
const 屏含头 = () => p.evaluate((ts) => (document.querySelector('#passages')?.textContent ?? '').includes(ts), 头串);
/** ★摘除：★只改**文本节点**的文本（★保留 DOM 结构 ⇒ 页脚与链**不被删** ✓）。 */
const 摘头 = () => p.evaluate((ts) => {
	const 段 = document.querySelector('#passages'); if (!段) return 0;
	const 走 = document.createTreeWalker(段, NodeFilter.SHOW_TEXT); let 改 = 0;
	while (走.nextNode()) { const n = 走.currentNode;
		if ((n.nodeValue ?? '').includes(ts)) { n.nodeValue = n.nodeValue.split(ts).join(''); 改++; } }
	return 改;
}, 头串);
/** 页脚上那条链（★同时给出「在不在文档里」✓）。 */
const 链 = (t) => p.evaluate((tt) => {
	const f = document.querySelector('[data-footer]');
	const e = [...(f?.querySelectorAll('a,button') ?? [])].find((x) => (x.textContent ?? '').trim() === tt);
	return e ? { 有: true, 在文档: document.body.contains(e) } : { 有: false, 在文档: false };
}, t);
const 点链 = (t) => p.evaluate((tt) => {
	const f = document.querySelector('[data-footer]');
	const e = [...(f?.querySelectorAll('a,button') ?? [])].find((x) => (x.textContent ?? '').trim() === tt);
	if (!e || !document.body.contains(e)) return false; e.click(); return true;
}, t);
try {
	await p.goto(`file://${产物}`, { waitUntil: 'load' }); await tick(3500);
	await 点段内('跳过教学'); await tick(900);
	/* ★立态（具名边界）：人已在 L2 且头已渲染 */
	await p.evaluate(async () => { SugarCube.setup.BABEL?.map?.moveTo?.('L2'); const s = SugarCube.Engine.show(); if (s?.then) await s; });
	await tick(800);
	ok(await 屏含头(), '★前件：走到 L2 后**头须看得见**（✗ 则本臂判不了）');
	/* ★前提①：先走**故事自己的**写档口 ⇒ 「载入快存」链才出现 */
	ok((await 链('快存')).有, '★前件①：页脚须有「快存」链（★须走故事自己的写档口）');
	await 点链('快存'); await tick(700); await 重渲();
	const 载入 = await 链('载入快存');
	ok(载入.有, '★前件①：写档后页脚须出现「载入快存」链');
	/* ★前提②：摘除 ＋ ★用**同一个**读数函数断「确实摘掉了」 */
	const 摘数 = await 摘头();
	ok(摘数 > 0 && !(await 屏含头()), `★前件②：摘除须**真的摘掉**（★摘到 ${摘数} 处文本节点 ⇒ 头须**看不见**；✗ 否则「重现」恒真 ✗）`);
	/* ★前提③：点之前断「链在文档里」 */
	ok(载入.在文档, '★前件③：那条链须**在文档里**（✗ 脱离文档的节点 `click()` 是**静默空操作**）');
	/* ── 甲（前件全过才跑 —— ★断不过就别往下跑 ✓） ── */
	if (fails.length === 0) {
		await 点链('载入快存'); await tick(900);
		const 甲 = await 屏含头();
		ok(甲, `★甲：清掉那一行头 ⇒ 点页脚「载入快存」⇒ ★头**须重现**（实得 ${甲}）`);
	}
	ok(错.length === 0, `全程不得有 pageerror（实得 ${JSON.stringify(错.slice(0, 2))}）`);
} catch (e) { fails.push(`★脚本异常：${String(e?.message ?? e).slice(0, 140)}`); }
await ctx.close(); await b.close();
console.log(`  ${SELFTEST ? '前件自证（＋甲）' : '真浏览器臂（甲）'}：${fails.length === 0 ? '✓ 全过' : '✗ ' + fails.length + ' 条'}`);
console.log('  ★自证只到**前件级**（摘除真摘掉／链真在文档）；★「唯一变量级」刀两试未成立 —— 见档头具名。');
for (const f of fails) console.log('    ✗ ' + f);
process.exit(fails.length === 0 ? 0 : 1);
