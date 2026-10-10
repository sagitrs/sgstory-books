/* 巴别之井 · **测试模式（A2）端到端** —— 操作者 2026-10-07 令派 T 席
 *   `books#413`（A2）；基线 main `19462db`（`#462`＋`#463` 合后）；pin 按该件 `.github/engine-ref.json`。
 *
 * ## 这条 e2e 验的链（★与令逐段对齐）
 *   ①入场 ②两卡真跑（战斗／奖励）③骰三账 ④纯查看（✗ 抽）⑤结束口 ⑥**跨刷新 `babelTest/`** ⑦正控＋异步还原
 *
 * ## 为什么必须真浏览器（✗ jsdom）
 *   ★⑥跨刷新要 localStorage 真的过 process 边界 ⇒ ★只有真页 reload() 才算数 ✓。
 *
 * ## 装置
 *   ★取法＝`SugarCube.setup.BABEL.*`（★✗ globalThis.setup —— 那是**空**的 ✓ 本席实测）
 *   ★goto 后须等 ≥3s（★装置时机：1.2s 时 setup.BABEL 还没挂上 ✓）
 *   ★CHROME＋LD_LIBRARY_PATH 见文件头 ④；缺则**具名**报环境错（rc=2），✗ 崩在 import 上。
 *
 * ## 退出码
 *   0 全过；1 有红（★含「刀」模式下**期望**的红）；2 用法/环境错。
 */
import path from 'node:path';
import { chromium } from 'playwright';

const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const 产物 = process.argv[2];
const 打刀 = process.argv.includes('--knife');
if (!产物) { console.error('✗ 用法：node tools/e2e-413-test-mode.mjs <babel-trial.html 绝对路径> [--knife]'); process.exit(2); }

let fails = 0, 判据 = 0, 本组失败 = 0;
const ok = (c, m) => { 判据++; if (!c) { fails++; 本组失败++; console.log(`  ✗ ${m}`); } };
const 段 = (t) => console.log(`\n── ${t} ──`);

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await b.newContext();
const p = await ctx.newPage();
const 页错 = [];
p.on('pageerror', (e) => 页错.push(String(e).slice(0, 200)));
const 开页 = async () => { await p.goto(`file://${产物}`, { waitUntil: 'load' }); await p.waitForTimeout(3200); };
try { await 开页(); } catch (e) { console.error(`✗ 环境错（浏览器/产物起不来：${CHROME}）：${e?.message ?? e}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); await b.close(); process.exit(2); }

/* ── 装置自证（✗ 缺面就往下跑）：四个口必须在位 ─────────────────────── */
段('装置自证（四个口在位）');
const 面 = await p.evaluate(() => {
	const B = globalThis.SugarCube?.setup?.BABEL;
	if (!B) return { 缺: 'SugarCube.setup.BABEL' };
	const 要 = { 测试模式: ['开', '列表', '结束', '状态'], 测试卡: ['入场', '备场', '跑战斗卡', '跑奖励卡', '纯查看', '账目'], 测试档: ['保存', '读取', '列出', '删除', '可用', '键形'], 运行: ['取', '栈深', '正式'] };
	const 缺 = [];
	for (const [k, ks] of Object.entries(要)) for (const x of ks) if (typeof B[k]?.[x] !== 'function') 缺.push(`${k}.${x}`);
	return { 缺, 池id: B.测试模式?.池id, 结束id: B.测试模式?.结束id, 可用: B.测试档?.可用?.() };
});
ok(面.缺.length === 0, `★四个口须齐（缺：${JSON.stringify(面.缺)}）`);
ok(!!面.可用, `★\`测试档.可用()\` 须为真（localStorage 可得）—— 实得 ${JSON.stringify(面.可用)}`);
ok(面.池id === 'babelTest-测试卡', `★池 id 须是 \`babelTest-测试卡\`（实得 ${JSON.stringify(面.池id)}）`);
console.log(`  ★池=${面.池id}｜结束口=${面.结束id}｜localStorage=${面.可用}`);

/* ── ①入场 ＋ ②两卡真跑 ───────────────────────────────────────── */
段('①入场／②两卡真跑');
const 入 = await p.evaluate(async () => {
	const B = globalThis.SugarCube.setup.BABEL;
	const 目录 = B.测试模式.列表?.() ?? [];
	const 卡id = B.测试模式.卡目录 ? Object.keys(B.测试模式.卡目录) : null;
	/* ★入场：走文档入口（✗ 直接开） */
	const r = await B.测试卡.入场();
	return { 目录, 卡id, r, 状态: B.测试模式.状态?.() };
});
ok(入.r?.ok === true, `★入场须成（实得 ${JSON.stringify(入.r)?.slice(0, 180)}）`);
const 场次 = 入.r?.场次id ?? null;
ok(!!场次, `★入场须给场次 id（实得 ${JSON.stringify(场次)}）`);
console.log(`  ★入场 ⇒ 场次=${场次}｜卡=${入.r?.卡}｜果=${JSON.stringify(入.r?.果)?.slice(0, 60)}｜账=${JSON.stringify(入.r?.账)}`);
console.log(`  ★列表=${JSON.stringify(入.目录)?.slice(0, 160)}`);

/* ★两卡：入场已开一张；★另一张用 开(卡id) 起（★目录恰两张 = 乙案） */
const 两卡 = await p.evaluate(async (场次id) => {
	const B = globalThis.SugarCube.setup.BABEL;
	const 出 = { 战: null, 奖: null, 奖场次: null, 错: [], 两卡id: null };
	const 卡目录 = B.测试模式.卡目录 ?? {};
	出.两卡id = Object.keys(卡目录).map((k) => 卡目录[k]?.卡id ?? k);
	/* ★①战斗卡：入场已经开的那张 */
	try { 出.战 = await B.测试卡.跑战斗卡(场次id, { interactive: true }); } catch (e) { 出.错.push('战:' + e.message); }
	/* ★②奖励卡：★另开一个场次（✗ 与战斗场次混用 —— 同场次的卡类固定 ✓ 本席首版就踩这条） */
	try {
		const 另 = B.测试模式.开('test-card-reward');
		出.奖场次 = 另?.场次id ?? null;
		出.奖 = B.测试卡.跑奖励卡(出.奖场次);
	} catch (e) { 出.错.push('奖:' + e.message); }
	return 出;
}, 场次);
console.log(`  ★卡目录的卡 id=${JSON.stringify(两卡.两卡id)}｜奖励场次=${两卡.奖场次}`);
console.log(`  ★跑战斗卡 ⇒ ${JSON.stringify(两卡.战)?.slice(0, 200)}`);
console.log(`  ★跑奖励卡 ⇒ ${JSON.stringify(两卡.奖)?.slice(0, 200)}`);
ok(两卡.错.length === 0, `★两卡真跑不得报错（错：${JSON.stringify(两卡.错)}）`);
ok(两卡.战?.ok !== false, `★跑战斗卡须成（实得 ${JSON.stringify(两卡.战)?.slice(0, 160)}）`);
ok(两卡.奖?.ok !== false, `★跑奖励卡须成（实得 ${JSON.stringify(两卡.奖)?.slice(0, 160)}）`);
ok((两卡.奖?.交付 ?? []).length > 0 || (两卡.奖?.背包增 ?? 0) > 0, `★奖励须真落（交付 ${JSON.stringify(两卡.奖?.交付)}／背包增 ${两卡.奖?.背包增}）`);

/* ── ③三账 ＋ ④纯查看（✗ 抽）───────────────────────────────────── */
段('③骰三账／④纯查看');
const 账 = await p.evaluate((场次id) => {
	const B = globalThis.SugarCube.setup.BABEL;
	const 前 = B.测试卡.账目(场次id);
	const 背前 = JSON.stringify(B.测试模式.取(场次id)?.玩家?.items ?? null);
	const 看 = B.测试卡.纯查看(场次id);
	const 后 = B.测试卡.账目(场次id);
	const 背后 = JSON.stringify(B.测试模式.取(场次id)?.玩家?.items ?? null);
	return { 前, 看, 后, 纯查看前后背包同: 背前 === 背后, 看形: JSON.stringify(看)?.slice(0, 200) };
}, 场次);
console.log(`  ★账目前=${JSON.stringify(账.前)}｜纯查看=${账.看形}`);
console.log(`  ★账目后=${JSON.stringify(账.后)}｜纯查看前后背包逐字同=${账.纯查看前后背包同}`);
ok(账.前?.ok === true, `★账目须可得（实得 ${JSON.stringify(账.前)}）`);
ok(账.前?.掷骰 >= 0 && 账.前?.抽卡 >= 0, `★三账须数值（实得 ${JSON.stringify(账.前)}）`);
ok(账.纯查看前后背包同 === true, `★纯查看**不得抽**（前后背包须逐字同 —— 实得 ${账.纯查看前后背包同}）`);
ok(JSON.stringify(账.前) === JSON.stringify(账.后), `★纯查看不得改账（前 ${JSON.stringify(账.前)} ⇒ 后 ${JSON.stringify(账.后)}）`);

/* ── ⑤结束口（三不：不授胜·不补奖·不复活）＋ 只清该场次 ────────────── */
段('⑤结束口（三不 ＋ 只清该场次）');
const 结 = await p.evaluate((ids) => {
	const B = globalThis.SugarCube.setup.BABEL;
	const { 场次id, 奖场次 } = ids;
	/* ★★量具要先抓住**引用** —— 结束会把该场次从表里摘掉，之后再 `取` 就是 null（★本席首版就踩这条） */
	const 玩 = B.测试模式.取(场次id)?.玩家 ?? null;
	const 前背 = JSON.stringify(玩?.items ?? null);
	const 前账 = B.测试卡.账目(场次id);
	const r1 = B.测试模式.结束(场次id);
	const 后背 = JSON.stringify(玩?.items ?? null);      // ★同一对象，✗ 不重新取
	const 后账 = B.测试卡.账目(场次id);
	const r2 = B.测试模式.结束(场次id);                  // ★幂等
	/* ★「只清该场次」：另一个场次（奖励）须仍在 */
	const 奖还在 = B.测试模式.取(奖场次) != null;
	const 目录后 = (B.测试模式.列表?.() ?? []).length;
	return { r1, r2, 前账, 后账, 背同: 前背 === 后背, 前背, 后背, 奖还在, 目录后, 活: B.测试模式.状态?.() };
}, { 场次id: 场次, 奖场次: 两卡.奖场次 });
ok(结.r2?.ok === true && 结.r2?.已结束 === true, `★结束须**幂等**（再调实得 ${JSON.stringify(结.r2)}）`);

console.log(`  ★结束 ⇒ ${JSON.stringify(结.r1)?.slice(0, 170)}`);
console.log(`  ★幂等再调 ⇒ ${JSON.stringify(结.r2)?.slice(0, 130)}`);
console.log(`  ★前背=${结.前背}\n  ★后背=${结.后背}｜★另一场次仍在=${结.奖还在}`);
ok(结.r1?.ok === true, `★结束口须成（实得 ${JSON.stringify(结.r1)}）`);
ok(结.背同 === true, `★结束**三不**（不补奖／不复活）⇒ 测试角色背包须逐字不变（前 ${结.前背} ⇒ 后 ${结.后背}）`);
ok(结.奖还在 === true, `★结束须**只清该场次**（另一场次须仍在 —— 实得 ${结.奖还在}）`);
ok(结.r2?.ok === true && 结.r2?.已结束 === true, `★结束须**幂等**（再调实得 ${JSON.stringify(结.r2)}）`);

/* ── ⑥★★跨刷新 `babelTest/` ───────────────────────────────────── */
段('⑥跨刷新 babelTest/（★真 reload）');
const 刷前 = await p.evaluate((场次id) => {
	const B = globalThis.SugarCube.setup.BABEL;
	const 键 = B.测试档.键形(场次id);
	let 存 = null;
	try { 存 = B.测试档.保存({ id: 场次id, 事实: { 场景: '测试局', 态: '在途' }, 历史: [], 越界键: 1 }); } catch (e) { 存 = { 抛: e.message, code: e.code }; }
	let raw = null;
	try { raw = globalThis.localStorage.getItem(键); } catch (e) { raw = 'ERR:' + e.message; }
	return { 键, 存, rawLen: raw ? raw.length : null, rawHead: raw ? raw.slice(0, 120) : null };
}, 场次);
console.log(`  ★键=${刷前.键}｜保存=${JSON.stringify(刷前.存)?.slice(0, 140)}`);
console.log(`  ★raw 长=${刷前.rawLen}｜raw 头=${刷前.rawHead}`);
ok(!!刷前.键 && 刷前.键.startsWith('babelTest/'), `★键形须 \`babelTest/…\`（实得 ${JSON.stringify(刷前.键)}）`);
ok(刷前.rawLen > 0, `★★localStorage 里须真有该键（✗ 只挂内存 —— 实得 ${刷前.rawLen}）`);

await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3200);
const 刷后 = await p.evaluate((场次id) => {
	const B = globalThis.SugarCube.setup.BABEL;
	const 读 = B.测试档.读取(场次id);
	const 列 = B.测试档.列出();
	let raw = null;
	try { raw = globalThis.localStorage.getItem(B.测试档.键形(场次id)); } catch (e) { raw = 'ERR:' + e.message; }
	return { 读形: JSON.stringify(读)?.slice(0, 240), 列, rawLen: raw ? raw.length : null, 可用: B.测试档.可用() };
}, 场次);
console.log(`  ★reload 后读取 ⇒ ${刷后.读形}`);
console.log(`  ★reload 后列出 ⇒ ${JSON.stringify(刷后.列)?.slice(0, 160)}｜raw 长=${刷后.rawLen}`);
ok(刷后.rawLen > 0, `★★**跨刷新后该键须仍在**（localStorage 真过 process —— 实得 ${刷后.rawLen}）`);
ok(!!刷后.读形 && 刷后.读形 !== 'null' && 刷后.读形 !== 'undefined', `★跨刷新后须可**读取**（实得 ${刷后.读形}）`);
ok((刷后.列 ?? []).length > 0, `★跨刷新后 列出 须非空（实得 ${JSON.stringify(刷后.列)}）`);

/* ── ⑦正控 ＋ 异步还原（★`#463` 补的那一格）────────────────────── */
段('⑦正控：正式面逐字不变 ＋ 异步后栈归零');
const 正 = await p.evaluate(async () => {
	const B = globalThis.SugarCube.setup.BABEL;
	const SC = globalThis.SugarCube;
	const 正式前 = JSON.stringify(SC.State.variables[Object.keys(SC.State.variables).find((k) => /babel/i.test(k)) ?? ''] ?? null);
	const 槽前 = JSON.stringify(Object.keys(SC.Save?.slots ?? {}));
	/* ★★异步在途**两点断**（引 developer 的修请 · 领队 取甲）：
	 *   ① **在途时**（async fn 体内、第一个 await 之后）⇒ 上下文**仍置着** ⇒ 栈深**必须＝1** ✓
	 *      —— ★摘掉 `在()` 里那支 thenable 分支后，代码落到下面的 `还原(); return r;`
	 *        ⇒ 上下文在**第一个 `await` 之前**就被弹掉 ⇒ 此读数会是 **0** ✓（← 旧断言的盲区 ✓）
	 *   ② **落定后**（await 返回后）⇒ 必须**归位 0** ✓（← 漏还原（泄漏）则此格红 ✓）
	 *   ⇒ 两点合计：**过早还原**与**漏还原**两种病都咬 ✓ */
	let 在途 = null;
	await B.运行.在(B.运行.正式(), async () => {
		await new Promise((r) => setTimeout(r, 5));
		/* ★★① 必须在 **await 之后**读：
		 *   读在 await **之前** ⇒ 读的是 `fn()` 的**同步段** ⇒ `还原()` 尚未执行 ⇒ **两形皆 1 ⇒ 恒真** ✗
		 *     （★本席首版就踩了这个坑，靠 `在.toString()` 探针 ＋ 产物级刀才查出来 ✓）
		 *   读在 await **之后** ⇒ 落在「异步尾」所在的那条路上 ⇒ 正确实现＝1 ✓，过早还原＝0 ⇒ **红** ✓ */
		在途 = B.运行.栈深();
		return 1;
	});
	const 后 = B.运行.栈深();          // ★② 落定后读 ⇒ **应归位 0** ✓
	const 正式后 = JSON.stringify(SC.State.variables[Object.keys(SC.State.variables).find((k) => /babel/i.test(k)) ?? ''] ?? null);
	const 槽后 = JSON.stringify(Object.keys(SC.Save?.slots ?? {}));
	return { 栈前后: [在途, 后], 正式同: 正式前 === 正式后, 槽同: 槽前 === 槽后, 槽: 槽前 };
});
	console.log(`  ★运行.栈深：**在途**=${正.栈前后[0]}（★须 1）⇒ **落定后**=${正.栈前后[1]}（★须 0）｜Save.slots=${正.槽}`);
	ok(正.栈前后[0] === 1, `★**异步在途时** 运行.栈深() 须＝**1**（上下文仍置着 ⇒ 异步尾落**测试**域 ✗ 正式域；**过早还原即红**；实得 ${正.栈前后[0]}）`);
	ok(正.栈前后[1] === 0, `★**异步落定后** 运行.栈深() 须归位＝**0**（**泄漏即红**；实得 ${正.栈前后[1]}）`);
ok(正.正式同 === true, `★测试局全程 ⇒ **正式面（State.variables）逐字不变**（实得 ${正.正式同}）`);
ok(正.槽同 === true, `★测试局全程 ⇒ **Save.slots 键集不变**（实得 ${正.槽同}）`);
ok(页错.length === 0, `★全程不得有 pageerror（实得 ${JSON.stringify(页错)?.slice(0, 200)}）`);

/* ── ⑧ `books#536` ③：测试档的**三面** —— ★**真浏览器 ＋ 真 `reload()`** 之下断 ─────────────
 *  ①**版本／模式不认 ⇒ 具名拒**（✗ 静默当旧档）②**白名单外 ⇒ 丢弃并计数上报** ③**活动控制面 ⇒ 不入档**
 *  ★本节的**探形留证**：先把 `测试档` 的**键名/白名单/活动面/版本/前缀**与**入档原始键**打出来 ✓
 *    （✗ 凭印象说「键是什么」—— 本席在 `#536` ② 就栽在「认不出 HP 键」上 ✓）。 */
段('⑧ `books#536` ③：测试档三面（版本／模式具名拒 · 白名单 ＋ 控制面 ⇒ 丢弃并计数）· 跨真刷新');
const 档形 = await p.evaluate(() => {
	const T = globalThis.SugarCube.setup.BABEL.测试档;
	return { 键: Object.keys(T).sort(), 白名单: T.白名单, 活动面: T.活动面, 版本: T.版本, 模式: T.模式, 前缀: T.前缀 };
});
console.log(`  ★探形留证：测试档键=${JSON.stringify(档形.键)}｜白名单=${JSON.stringify(档形.白名单)}｜活动面=${JSON.stringify(档形.活动面)}｜版本=${档形.版本}｜模式=${JSON.stringify(档形.模式)}｜前缀=${JSON.stringify(档形.前缀)}`);
ok(Array.isArray(档形.白名单) && 档形.白名单.length === 2 && 档形.白名单.includes('事实') && 档形.白名单.includes('历史'),
	`★⑧前置：入档白名单须**恰为** [事实, 历史]（实得 ${JSON.stringify(档形.白名单)}）`);
ok(Array.isArray(档形.活动面) && 档形.活动面.length > 0, `★⑧前置：活动控制面须**点名在册**（实得 ${JSON.stringify(档形.活动面)}）`);
const 塞 = { id: 's-536c', 事实: { a: 1 }, 历史: [1], 骰面: [2], 额度: 3, 入口标记: 'x', 输入队列: [], 订阅: {}, 活动控制: 1, 跑题: 'z' };
const 期望丢 = ['骰面', '额度', '入口标记', '输入队列', '订阅', '活动控制', '跑题'];
const 保 = await p.evaluate(({ 场次, 白 }) => {
	const T = globalThis.SugarCube.setup.BABEL.测试档;
	const r = T.保存(场次);
	const 键 = T.键形('s-536c');
	const 原 = globalThis.localStorage.getItem(键);
	let 入档 = null; try { 入档 = JSON.parse(原); } catch { 入档 = '（解析失败）'; }
	/* ★坏档具名拒：**直接写库**造两种（✗ 靠产品自己写 ✓）—— 版本不符 / 模式不符 */
	globalThis.localStorage.setItem(T.键形('s-536ver'), JSON.stringify({ 模式: T.模式, 版本: 99, 事实: {} }));
	globalThis.localStorage.setItem(T.键形('s-536mod'), JSON.stringify({ 模式: '别的局', 版本: T.版本, 事实: {} }));
	return { 保: r, 键, 入档键: 入档 && typeof 入档 === 'object' ? Object.keys(入档).sort() : 入档,
		读: T.读取('s-536c'), 读坏版: T.读取('s-536ver'), 读坏模: T.读取('s-536mod') };
}, { 场次: 塞, 白: 档形.白名单 });
console.log(`  ★探形留证：保存.丢弃=${JSON.stringify(保.保?.丢弃)}｜入档原始键=${JSON.stringify(保.入档键)}｜坏版本读=${JSON.stringify(保.读坏版?.code)}｜坏模式读=${JSON.stringify(保.读坏模?.code)}`);
ok(保.保?.ok === true, `★⑧②：保存须成（实得 ${JSON.stringify(保.保)?.slice(0, 160)}）`);
const 丢 = Array.isArray(保.保?.丢弃) ? 保.保.丢弃 : [];
ok(期望丢.every((k) => 丢.includes(k)), `★⑧②：白名单外**＋**控制面键须**逐个出现在「丢弃」上报里**（期望 ${JSON.stringify(期望丢)}；实得 ${JSON.stringify(丢)}）`);
ok(丢.length === 期望丢.length, `★⑧②：**计数**须**恰为** ${期望丢.length}（✗ 多报／漏报；实得 ${丢.length}：${JSON.stringify(丢)}）`);
ok(Array.isArray(保.入档键) && 保.入档键.every((k) => ['模式', '版本', '场次', '事实', '历史'].includes(k)),
	`★⑧③：**入档原始值**只许含 模式／版本／场次／事实／历史（实得 ${JSON.stringify(保.入档键)}）⇒ 控制面**不入档** ✓`);
ok(保.读?.ok === true && 保.读?.事实?.a === 1, `★⑧②：存完能读回（实得 ${JSON.stringify(保.读)?.slice(0, 120)}）`);
ok(保.读坏版?.code === 'TEST_SAVE_WRONG_VERSION', `★⑧①：**版本 99 ⇒ 具名拒** ` + '`TEST_SAVE_WRONG_VERSION`' + `（✗ 静默当旧档；实得 ${JSON.stringify(保.读坏版)?.slice(0, 160)}）`);
ok(保.读坏模?.code === 'TEST_SAVE_WRONG_MODE', `★⑧①：**模式不符 ⇒ 具名拒** ` + '`TEST_SAVE_WRONG_MODE`' + `（实得 ${JSON.stringify(保.读坏模)?.slice(0, 160)}）`);
/* ── ⑧·跨真刷新：上面三条**过 process 边界**之后仍须成立 ── */
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(3200);
const 刷 = await p.evaluate(() => {
	const T = globalThis.SugarCube.setup.BABEL.测试档;
	const 原 = globalThis.localStorage.getItem(T.键形('s-536c'));
	let 键 = null; try { 键 = Object.keys(JSON.parse(原)).sort(); } catch { 键 = '（解析失败）'; }
	return { 键, 读: T.读取('s-536c'), 坏版: T.读取('s-536ver'), 坏模: T.读取('s-536mod') };
});
console.log(`  ★探形留证（reload 后）：入档原始键=${JSON.stringify(刷.键)}｜坏版本读=${JSON.stringify(刷.坏版?.code)}｜坏模式读=${JSON.stringify(刷.坏模?.code)}`);
ok(Array.isArray(刷.键) && 刷.键.every((k) => ['模式', '版本', '场次', '事实', '历史'].includes(k)) && !刷.键.includes('骰面') && !刷.键.includes('入口标记'),
	`★⑧③跨刷新：真 ` + '`reload()`' + ` 之后入档值**仍**只含白名单面（实得 ${JSON.stringify(刷.键)}）`);
ok(刷.读?.ok === true, `★⑧②跨刷新：真 refresh 之后**仍可读回**（实得 ${JSON.stringify(刷.读)?.slice(0, 120)}）`);
ok(刷.坏版?.code === 'TEST_SAVE_WRONG_VERSION' && 刷.坏模?.code === 'TEST_SAVE_WRONG_MODE',
	`★⑧①跨刷新：**两处具名拒**过 process 边界仍成立（版本=${JSON.stringify(刷.坏版?.code)}／模式=${JSON.stringify(刷.坏模?.code)}）`);

await b.close();
console.log(`\n${本组失败 === 0 ? '✓' : '✗'} 测试模式 e2e：${本组失败 === 0 ? '全绿' : `★本组 ${本组失败} 处失败`} —— **${判据} 条判据**`);
if (打刀) {
	/* ★★`--knife` **自证**（列 developer 的 T 域意见 ③・领队同日）：
	 *   ★只印「红是期望的」✗ ⇒ **刀没接上时也印** ⇒ 读者会把「装置级空跑」当「刀已验」✗（＝「声称 > 覆盖」✓）
	 *   ⇒ 刀模式下**本组必须有红** ✓；零红 ⇒ 本跑**失败**（rc=1）＋ 具名说清 ✗ 静默 ✓ */
	console.log('  ★注意：本跑带 --knife ⇒ **红是期望的**（刀须红且**只红对应那几格**）');
	if (本组失败 === 0) {
		console.log('  ✗ ★★**刀模式自证失败**：本跑零红 ⇒ **刀没落在被测对象实际走的那条路上** ✗');
		console.log('     （★判据纪律 ③：装置跑成 ≠ 该格判得出；零红 ⇒ 本跑的「全绿」**不构成**验证 ✓）');
		本组失败 += 1; fails += 1; 判据 += 1;
	}
}
process.exit(fails === 0 ? 0 : 1);
