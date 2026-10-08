#!/usr/bin/env node
/* `books#471` 第 2 项 —— **W09 结账后重绘**的真浏览器臂（`#533` 那一味的机械化；`#531` 的呈现面同批）
 *
 * ## 断什么（两件，都在**自然路**上断 —— ✗ 无状态夹具）
 *   ① **可达**：由**正常 UI** 走到 W09-E4「借道浅湾」并点下「请教两处水灵」✓
 *      （步进式优先表 ⇒ 能过「（到达）」拍与态变；某步走岔 ⇒ **具名**报出，✗ 不静默当绿）
 *   ② **结账后重绘**（★`#533` 修的那一味）：点完之后**同一屏**须出现
 *      · 结算行（`★已处理：<成败> —— <文本>`）—— 即 `desc()` 的「已处理」支；
 *      · 摘要行（`收到补给：…`）—— ★**在结算行之后**（裁文「回答在前、物资另列在后」✓）；
 *      两者都**得在自然路上看得见** ⇒ 才证明「结账后重进段落」真发生 ✓。
 *      ⚠ 这正是**无头判据测不到**的那一面（`verify.mjs` 第 85 组直调 `desc()`、状态由人手摆 ✗）。
 *   ③ **换行/不截断**：桌面 1440×1000 与 390×844 各跑一次 ⇒ 每个可见钮 `scrollWidth<=clientWidth` 且不越右 ✓。
 *   ④ **流水行保留**（裁②「摘要另列」＝**增列非替换**）：引擎背包流水（`＋N <名>`）**允许共存** ✓（✗ 不判其为红）。
 *
 * ## 用法与退出码
 *   （先构建产物：`python3 <引擎>/build.py "$PWD/stories/babel" --out "$PWD/stories/babel/babel-trial.html"`）
 *     PW_DIR=<含 node_modules/playwright 的目录> CHROME_BIN=<exe> \
 *       node tools/e2e-471-w09-settle-redraw.mjs --books "$PWD" --engine <精确 pin 检出> [--selftest]
 *   退出码：0 全过；1 有红；2 装置错（浏览器/产物/引擎根，具名 ✗ 不当判据红）
 *
 * ## 刀（`--selftest`）
 *   把**产物**里「非战支结账后重进段落」那一味拆掉（字符串替换 ⇒ ✗ 改源码：改了不重建＝刀没落在被测物上）
 *   ⇒ ② 面须**具名红** ✓（证明这条判据真咬 `#533` 的修 ✓）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argOf = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const 自检 = process.argv.includes('--selftest');
let 用产物 = argOf('--art') ?? path.join(argOf('--books') ?? process.cwd(), 'stories/babel/babel-trial.html');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const PW = process.env.PW_DIR || process.cwd();
const 守护 = ['跳过教学', '向上', '走进七名河', '左：奖励·岸边系绳（推荐）', '重新系稳舟绳', '借道浅湾', '请教两处水灵'];

async function 跑一遍(b, 宽) {
	const 红 = [];
	const ok = (c, m) => { if (!c) 红.push(m); };
	const c = await b.newContext({ viewport: { width: 宽, height: 宽 < 500 ? 844 : 1000 } });
	const p = await c.newPage();
	await p.goto('file://' + 用产物); await p.waitForTimeout(2600);
	const 钮 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')].map((x) => x.textContent.trim()));
	const 轨 = [];
	for (let i = 0; i < 24; i++) {
		const 全 = await 钮();
		if (全.some((t) => t.includes('请教两处水灵'))) { 轨.push('★目标可见'); break; }
		const 命中 = 守护.find((t) => 全.some((x) => x.includes(t)));
		if (!命中) { 轨.push(`（无可点：${JSON.stringify(全.slice(0, 6))}）`); break; }
		const l = p.locator('#passages a,#passages button').filter({ hasText: 命中 }).first();
		try { await l.click({ timeout: 3000 }); 轨.push(命中); await p.waitForTimeout(650); }
		catch { 轨.push(`✗${命中}`); await p.waitForTimeout(300); }
	}
	ok(轨[轨.length - 1] === '★目标可见', `★【${宽}px ①可达】自然路未走到「请教两处水灵」（轨＝${JSON.stringify(轨)}）`);
	const l = p.locator('#passages a,#passages button').filter({ hasText: '请教两处水灵' }).first();
	if (await l.count()) { await l.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1100); }
	const 读 = await p.evaluate(() => {
		const 行 = [...document.querySelectorAll('#passages p')].map((x) => x.textContent.trim()).filter(Boolean);
		const i = 行.findIndex((x) => x.startsWith('收到补给'));
		const bs = [...document.querySelectorAll('#passages a,#passages button')].map((x) => ({ 溢: x.scrollWidth > x.clientWidth + 1, 右: Math.round(x.getBoundingClientRect().right) > innerWidth }));
		return { 行, i, 溢: bs.filter((x) => x.溢).length, 越右: bs.filter((x) => x.右).length, 钮数: bs.length };
	});
	const 结算行 = 读.行[读.i - 1] ?? '';
	ok(/已处理：/.test(结算行), `★【${宽}px ②结账后重绘】摘要行之前应有**结算行**（`+'`★已处理：…`'+`）—— ✗ 有它才证明结账后**重进了段落**（实得 ${JSON.stringify(结算行)}）`);
	ok(读.i > 0 && /左岸|没听懂/.test(结算行), `★【${宽}px ②】结算行须是**新分支**的文（回答在前 ✓；实得 ${JSON.stringify(结算行)}）`);
	ok(/收到补给：/.test(读.行[读.i] ?? ''), `★【${宽}px ②】须有**摘要行**（`+'`收到补给：…`'+`；实得 ${JSON.stringify(读.行[读.i] ?? '（无）')}）`);
	ok(读.溢 === 0 && 读.越右 === 0, `★【${宽}px ③换行/截断】${读.钮数} 钮 ⇒ 横溢出 ${读.溢}｜越右 ${读.越右}（应皆 0）`);
	await c.close();
	return { 红, 轨, 读: { 结算行, 摘要行: 读.行[读.i] ?? '（无）', 钮数: 读.钮数 } };
}

let chromium;
try { ({ chromium } = await import(path.join(PW, 'node_modules/playwright/index.mjs'))); }
catch (e) { console.error(`✗ 装置错（✗ 不当判据红）：加载 Playwright 失败（PW_DIR=${PW}）：${e?.message}`); process.exit(2); }
if (!fs.existsSync(用产物)) { console.error(`✗ 装置错：产物不在 ${用产物}`); process.exit(2); }
const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
	.catch((e) => { console.error(`✗ 装置错：浏览器起不来（${CHROME}）：${e?.message}`); process.exit(2); });

if (自检) {
	const 原 = fs.readFileSync(用产物, 'utf8');
	const 靶 = "SugarCube?.Engine?.play?.('探索')";
	if (!原.includes(靶)) { console.error(`✗ 刀：产物里找不到靶（${靶}）⇒ 刀没落在被测物上（产物形变就同步改刀 ✓）`); process.exit(1); }
	const 刀本 = 用产物.replace(/\.html$/, `.__knife-redraw-${process.pid}.html`);
	fs.writeFileSync(刀本, 原.replaceAll(靶, 'void 0 /* ★刀：拆掉结账后重进段落 */'));   // ★须 replaceAll：replace(字符串) 只换**第一处** ⇒ 刀会落在别人身上（本席首版即栽此 ✓）
	try {
		用产物 = 刀本;   // ★★刀须喂给臂（本席首版漏此 ⇒ 臂仍读**原件** ⇒ 零红＝假象 ✗）
		const r = await 跑一遍(b, 390);
		用产物 = argOf('--art') ?? path.join(argOf('--books') ?? process.cwd(), 'stories/babel/babel-trial.html');
		const 命中 = r.红.filter((f) => /②结账后重绘|②】/.test(f));
		if (命中.length) console.log(`✓ 刀（拆结账后重进段落）⇒ **② 面如期红** ${命中.length} 条（${命中[0].slice(0, 60)}…）`);
		else { console.error(`✗ 刀 ⇒ **② 面零红**（判据没牙）：${JSON.stringify(r.红.slice(0, 2))}`); process.exit(1); }
	} finally { try { fs.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	await b.close(); process.exit(0);
}

const 果 = [];
for (const 宽 of [1440, 390]) 果.push(await 跑一遍(b, 宽));
await b.close();
console.log('── 读数（`books#471` 第 2 项 · W09 结账后重绘 · 自然路）');
for (const g of 果) console.log(`  ${JSON.stringify({ 轨: g.轨, ...g.读 })}`);
const 全红 = 果.flatMap((g) => g.红);
if (全红.length) { console.error(`\n✗ e2e-471 未过 ${全红.length} 条`); for (const f of 全红) console.error(`  ✗ ${f}`); process.exit(1); }
console.log('\n✓ 两视口全过（自然路可达 ＋ 结账后重绘 ＋ 顺序 ＋ 换行/不截断）');
process.exit(0);
