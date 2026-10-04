#!/usr/bin/env node
/* `#1763`（表现层·布局壳：**注册面板 ⇒ 常驻渲染 ＋ 域刷新**）· **tests-first 格**（DOM 层）。
 *
 * ## 本档断什么（三面）
 *   **A 注册 ⇒ 常驻渲染**：真产物里，`refreshPanels()` 之后**每个已注册面板的宿主都找得到**
 *      （`skipped` 为空 ✓）且宿主**非空** ⇒ 面板确实渲染上了；连续两次刷新后**仍成立**（常驻 ✓）。
 *   **B 域刷新（局部性）**：`refreshPanels(['hp'])` ⇒ **只有 hp 的 `panelRenderCount` +1**，
 *      其余面板**计数不动** ✓ ⇒ 「改一域 ✗ 动他域」 ✓。
 *      ★这一面走的是**真 writer**（故事侧 `panels.js` 的 jQuery 实现 ✓）—— 引擎单测
 *      （`tests/unit/core/panel.test.js`）用的是**假 writer** ✓，两边断的不是同一件事 ✓。
 *   **C 一处源**：面板 id／宿主以 `panels.js` 的注册为准 —— 本档**不写死宿主串**，
 *      宿主从 `refreshPanels()` 的返回值与注册表回读 ✓。
 *
 * ## tests-first 说明（现在跑＝**红**）
 *   `#1763` 的 ①「状态变更事件（同段落内操作 HUD 不刷新 —— 捡物三次只显示一次）」**尚未落地** ⇒
 *   故事侧**段内**只刷「受影响的那一个」这条约定**还没接上**（现只有 `:passagedisplay` 的全量刷新 ✓）
 *   ⇒ 本档现在**红**（详见运行输出：「面未到」那一句）✓ —— 那是**预期**，dev/writer 落地后应翻绿 ✓。
 *   ★因此本档**暂不接 CI**（红了会把门带红 ✓）；接线时机＝它翻绿那一刻 ✓。
 *
 * ## 用法与退出码
 *   python3 <引擎>/build.py <本仓>/stories/babel --out babel-trial.html   # 先构建（harness 有新鲜度守卫）
 *   node tools/e2e-1763-panels.mjs --engine <引擎检出>
 *   node tools/e2e-1763-panels.mjs --engine <引擎检出> --selftest          # 刀：摘一个注册 ⇒ A 须红
 *   0 = 三面全过；1 = 有红；2 = 环境错（引擎根／产物／jsdom，具名）
 */
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 自检 = process.argv.includes('--selftest');
const S = (x) => JSON.stringify(x);
/* ★面板 **id 清单**取自故事 `panels.js` 的注册（实测产物里注册 7 个：`hp／location／trauma／inventory／notice`
 *   ＋ `enemy`／`heal` ✓）；**宿主串 ✗ 不写死** —— 「每个注册面板都找得到宿主」由**注册表自己的视图**
 *   （`refreshPanels()` 的 `skipped` ✓）来断 ✓，宿主查找只用于**状态栏那四个的内容**检查 ✓。 */
const 面板 = ['hp', 'location', 'trauma', 'inventory', 'notice', 'enemy', 'heal'];
const 状态栏面板 = ['hp', 'location', 'trauma', 'inventory'];

async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, R = SC.setup.RPG;
	const 读数 = {};

	/* ── 注册表面：五个面板都在？── */
	读数.注册面 = {};
	for (const id of 面板) {
		let html = null;
		try { html = R.panelHTML(id); } catch { html = null; }
		读数.注册面[id] = { 已注册: html !== null };
	}
	ok(面板.every((id) => 读数.注册面[id].已注册),
		`★【A】有面板**未注册**（实得 ${S(读数.注册面)}）—— 注册是「常驻渲染」的前提：面板没注册 ⇒ 永远不渲染 ✓`);

	/* ── 臂 A：刷新 ⇒ 每个注册面板都找得到宿主（skipped 空）＋ 宿主非空 ── */
	const 刷一次 = () => { try { return R.refreshPanels(); } catch (e) { return { 抛: e.message }; } };
	const 第一次 = 刷一次();
	await new Promise((r) => setTimeout(r, 50));
	const 宿主读 = () => Object.fromEntries(面板.map((id) => {
		const 域 = id === 'notice' ? '[data-panel="notice"]' : `.statusbar [data-panel="${id}"]`;
		const el = s.doc.querySelector(域);
		return [id, { 在: !!el, 文本: (el?.textContent ?? '').trim().slice(0, 24) }];
	}));
	读数.臂A_第一刷 = { 返回: 第一次, 宿主: 宿主读() };
	ok(第一次 && Array.isArray(第一次.skipped) && 第一次.skipped.length === 0,
		'★【A 常驻渲染】**有注册面板找不到宿主**（`skipped` 非空：' + S(第一次?.skipped ?? 第一次) + '）'
		+ ' —— ★**面未到**（`#1763` ① 的接线未落地）：注册了却不渲染 ⇒ 玩家看不到常驻条 ✓');
	const 非空 = 状态栏面板.every((id) => 读数.臂A_第一刷.宿主[id].文本.length > 0);
	ok(非空, `★【A 常驻渲染】**状态栏面板渲染成了空**（实得 ${S(读数.臂A_第一刷.宿主)}）—— 面板在、内容是空 ⇒ 玩家看到的还是没信息 ✓`);

	const 第二次 = 刷一次();
	await new Promise((r) => setTimeout(r, 50));
	读数.臂A_第二刷 = { 返回: 第二次, 宿主: 宿主读() };
	/* ★宿主存在性只查**状态栏那四个**（`enemy`／`heal` 的宿主不在 `.statusbar` 里 ⇒ 用它们查会造**假红** ✓）；
	 *   「每个注册面板都找得到宿主」由 `skipped` 空来断 ✓（那是注册表自己的视图 ✓）。 */
	ok(第二次 && Array.isArray(第二次.skipped) && 第二次.skipped.length === 0
		&& 状态栏面板.every((id) => 读数.臂A_第二刷.宿主[id].在),
		`★【A 常驻】再刷一次后**状态栏宿主掉了或 skipped 非空**（实得 ${S(读数.臂A_第二刷)}）⇒ 不「常驻」✓`);

	/* ── 臂 B：域刷新（局部性）——只刷 hp ⇒ 其余计数不动 ── */
	const 前 = Object.fromEntries(面板.map((id) => [id, R.panelRenderCount(id)]));
	const 靶 = (() => { try { return R.refreshPanels(['hp']); } catch (e) { return { 抛: e.message }; } })();
	await new Promise((r) => setTimeout(r, 50));
	const 后 = Object.fromEntries(面板.map((id) => [id, R.panelRenderCount(id)]));
	读数.臂B_局部 = { 前, 后, 返回: 靶 };
	const 动了他域 = 面板.filter((id) => id !== 'hp' && 后[id] !== 前[id]);
	ok(靶 && Array.isArray(靶.rendered) && 靶.rendered.length === 1 && 靶.rendered[0] === 'hp',
		`★【B 域刷新】\`refreshPanels(['hp'])\` 的 \`rendered\` 应**恰** ['hp']（实得 ${S(靶?.rendered ?? 靶)}）✓`);
	ok(动了他域.length === 0,
		`★【B 域刷新】**改一域动了别域**（这些面板的渲染计数变了：${S(动了他域.map((id) => [id, 前[id], 后[id]]))}）`
		+ ' ⇒ 局部刷新破了（玩家侧表现为：刷一处、闪全条／丢焦点 ✓）');
	ok(后.hp === 前.hp + 1, `★【B 域刷新】hp 的渲染计数应**恰 +1**（实得 ${前.hp} ⇒ ${后.hp}）✓`);

	return { fails, 读数 };
}

/* ── 自检（刀）：摘掉一个注册 ⇒ A 须红 ──
 *   ★靶现在就在**产物里**（故事 `panels.js` 的注册调用被内联）⇒ 这把刀**当场下得了** ✓。
 *   ⚠ 刀打在**产物文本**上，✗ 不改源码（改了不重建 ⇒ 刀没落在被测物上，本舰队栽过两次 ✓）。 */
if (自检) {
	const fs2 = await import('node:fs');
	const path2 = await import('node:path');
	const env2 = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]);
	const html = path2.join(env2.repo ?? path2.resolve(import.meta.dirname, '..'), 'stories/babel/babel-trial.html');
	const 原 = fs2.readFileSync(html, 'utf8');
	const 找 = "registerPanel('trauma'";
	if (!原.includes(找)) {
		console.error(`✗ 刀替换**未命中**（产物里找不到 \`${找}\`）⇒ 刀没落在被测物上（产物变了就同步改刀 ✓）`);
		process.exit(2);
	}
	/* ★靶产物写到**另起的临时档**，再把 `htmlPath` **覆盖进 env** ——
	 *   `e2e-harness` 的产物路径是写死的（`storyDir/babel-trial.html`）✗ 不认环境变量
	 *   ⇒ 直接改 env 对象最干净（✗ 不动真产物、✗ 自造开关）✓。 */
	const 刀本 = html.replace(/\.html$/, `.__knife-${process.pid}.html`);
	fs2.writeFileSync(刀本, 原.replace(找, "registerPanel('__knife_off_trauma'"));
	try {
		const { fails } = await 判({ ...env2, htmlPath: 刀本 });
		const 命中 = fails.filter((f) => /【A/.test(f)).length > 0;   // ★按**报文真前缀**匹配（✗ 别照抄我脑里的串）
		if (命中) { console.log('✓ 刀（摘掉一个注册）⇒ A 面**如期红**：' + fails.filter((f) => f.includes('【A')).length + ' 条'); process.exit(0); }
		console.error('✗ 刀（摘掉一个注册）⇒ **零红**（A 面没咬住）—— 判据没牙：' + JSON.stringify(fails.slice(0, 2)));
		process.exit(1);
	} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
}

let env;
try { env = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]); }
catch (e) { console.error(`✗ 环境错：${e.message}`); process.exit(2); }
let 结果;
try { 结果 = await 判(env); }
catch (e) { console.error(`✗ 环境错（装置起不来）：${e.message}`); process.exit(2); }
const { fails, 读数 } = 结果;
console.log('\n── 读数（`#1763` 布局壳 · DOM 层）');
console.log('  ' + S(读数));
if (fails.length) {
	console.error(`\n✗ e2e-1763 未过 ${fails.length} 条`);
	for (const f of fails) console.error(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\n✓ e2e-1763 三面全过（注册⇒常驻渲染 ＋ 域刷新局部性 ＋ 计数恰 +1）');
process.exit(0);
