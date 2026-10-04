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

	/* ── 臂 D：`sgstory#1983`（B2）—— 面板声明的 CSS 须**落到宿主 inline style** ──
	 *
	 *   引擎侧已在传：`refreshPanels` 调 writer 时带 `{ preserve, css: RPG.panelCSS(id) }`
	 *   （`css = { [cssVar]: 当前色 }`；**缺声明 ⇒ `null`** ✓）。
	 *   本臂判**故事侧**是否为它落 `style.setProperty` —— ★判**输出**（`getPropertyValue`），
	 *   ✗ 不在故事侧再算一次「哪个键生效」（那是引擎 `tintOf` 的活）✓。
	 *   ★用**测试用面板**（`#1983` 领队裁 (2)：✗ 不让 A2 实面稀释关键路径 ✓）。 */
	const 测试域 = '[data-panel="ut-css"]';
	const 测试变量 = '--ut-tint';
	const 测试色 = 'rgb(1, 2, 3)';
	try {
		R.registerPanel('ut-css', {
			name: '测试色板', host: 测试域, render: () => '<span>ut</span>',
			cssVar: 测试变量, tint: { 中毒: 测试色 }, tintOf: () => '中毒',
		});
	} catch (e) { /* 注册失败 ⇒ 下面宿主取值必空 ⇒ 本臂红（具名）✓ */ }
	const 造宿主 = s.doc.createElement('div');
	造宿主.setAttribute('data-panel', 'ut-css');
	(s.doc.querySelector('.statusbar') ?? s.doc.body).appendChild(造宿主);
	let 刷D = null;
	try { 刷D = R.refreshPanels(['ut-css']); } catch (e) { 刷D = { 抛: e.message }; }
	const 取值 = (el) => (el && el.style && typeof el.style.getPropertyValue === 'function')
		? el.style.getPropertyValue(测试变量) : null;
	const 宿主D = s.doc.querySelector(测试域);
	读数.臂D_css = { 返回: 刷D, 宿主在: !!宿主D, 实得: 取值(宿主D), 期望: 测试色 };
	ok(取值(宿主D) === 测试色,
		`★【D css 落宿主】面板声明的 \`${测试变量}\` 应**逐字**落到宿主 inline style＝${S(测试色)}`
		+ `（实得 ${S(读数.臂D_css.实得)}；刷新返回 ${S(刷D)}）`
		+ ` —— ★写了 \`css\` 却没落到 \`setProperty\` ⇒ 本格红 ✓`);
	/* 反向：未声明 `cssVar` 的面板（hp）⇒ 不得被写上我们的变量 ✓ */
	const 宿主hp = s.doc.querySelector('.statusbar [data-panel="hp"]');
	读数.臂D_反向 = { hp宿主在: !!宿主hp, hp该变量取值: 取值(宿主hp) };
	ok(读数.臂D_反向.hp该变量取值 === '',
		`★【D 反向】未声明 \`cssVar\` 的面板**不得**被写上该变量（实得 ${S(读数.臂D_反向.hp该变量取值)}）`
		+ ` ⇒ 「没声明」与「声明了空」必须不同形 ✓`);

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

	/* ── 臂 C：**按域刷新的局部性**（`#1985` 落的 `refreshDomain` ✓）——
	 *   ★故事侧 5 个面板目前**都未声明域** ✗（`refresh` 走缺省 `null`）⇒ 产品侧「段内改一域」**尚未接线** ✓。
	 *     故本臂用**探针面板**（自建两个域 ＋ 自插宿主）在**真 DOM ＋ 真 writer** 上断「按域只刷该域」✓。
	 *   ★这一条**只证 API 与 writer 的局部性**；「谁在段内去调刷新」＝产品侧接线，✗ 不在本臂（见头注明账）。 */
	/* ★**缺席闸**（本仓惯例：缺席 ⇒ **记声明、不判红** ✗ 不假装通过 ✓）：
	 *   本仓 `engine-ref.json` 的 pin 若**早于** `#1985`（`refreshDomain` 落点），此面在夜窗会因
	 *   「`R.refreshDomain is not a function`」**假红** ✗ ⇒ 这里**先探在位**：缺席 ⇒ 印一行**记声明**并
	 *   **跳过本臂的断言**（✗ 不记红 ✓）；pin 抬升后**本臂自动开咬** ✓（✗ 不需要再改档 ✓）。 */
	if (typeof R.refreshDomain !== 'function' || typeof R.panelsInDomain !== 'function') {
		console.log('  ⏳【C 按域刷新】**记声明**：`RPG.refreshDomain`／`panelsInDomain` 未在位'
			+ '（本仓 pin 早于 `#1985` 的落点）⇒ 本臂**不判红** ✓；pin 抬升后自动开咬 ✓');
		读数.臂C_缺席 = { refreshDomain: typeof R.refreshDomain, panelsInDomain: typeof R.panelsInDomain };
	} else {
	{
		const 域A = 't1763-dom-a', 域B = 't1763-dom-b';
		const 插宿主 = (id) => {
			const el = s.doc.createElement('span');
			el.setAttribute('data-panel', id);
			(s.doc.querySelector('.statusbar') ?? s.doc.body).appendChild(el);
			return el;
		};
		插宿主('t1763-dom-a1'); 插宿主('t1763-dom-b1');
		let 注册错 = null;
		try {
			R.registerPanel('t1763-dom-a1', { name: '域A探针', host: '[data-panel="t1763-dom-a1"]', refresh: 域A, render: () => '<b>A</b>' });
			R.registerPanel('t1763-dom-b1', { name: '域B探针', host: '[data-panel="t1763-dom-b1"]', refresh: 域B, render: () => '<b>B</b>' });
		} catch (e) { 注册错 = e; }
		ok(注册错 === null, `★【C 按域刷新】探针面板注册失败（${注册错 && 注册错.message}）⇒ 按域面判不了 ✓`);

		const 前C = Object.fromEntries(面板.concat(['t1763-dom-a1', 't1763-dom-b1']).map((id) => [id, R.panelRenderCount(id)]));
		const 域列 = (() => { try { return R.panelsInDomain(域A); } catch (e) { return { 抛: e.message }; } })();
		const 靶C = (() => { try { return R.refreshDomain(域A); } catch (e) { return { 抛: e.message }; } })();
		await new Promise((r) => setTimeout(r, 50));
		const 后C = Object.fromEntries(面板.concat(['t1763-dom-a1', 't1763-dom-b1']).map((id) => [id, R.panelRenderCount(id)]));
		读数.臂C_按域 = { 域列, 返回: 靶C, 前: 前C, 后: 后C };
		ok(JSON.stringify(域列) === JSON.stringify(['t1763-dom-a1']),
			`★【C 按域刷新】\`panelsInDomain('${域A}')\` 应**恰**列出域 A 的面板（实得 ${S(域列)}）✓`);
		ok(靶C && JSON.stringify(靶C.rendered) === JSON.stringify(['t1763-dom-a1']) && 靶C.无面板 === false,
			`★【C 按域刷新】\`refreshDomain('${域A}')\` 应**恰**重绘域 A（实得 ${S(靶C)}）✓`);
		const 动了他域C = 面板.concat(['t1763-dom-b1']).filter((id) => 后C[id] !== 前C[id]);
		ok(动了他域C.length === 0,
			`★【C 按域刷新】**改一域动了他域**（计数变了：${S(动了他域C.map((id) => [id, 前C[id], 后C[id]]))}）`
			+ ' ⇒ 产品侧表现即「刷一处、闪全条／丢焦点」✓ —— ✗ 这是本票红线 ✓');
		ok(后C['t1763-dom-a1'] === 前C['t1763-dom-a1'] + 1, `★【C 按域刷新】域 A 面板计数应**恰 +1**（实得 ${前C['t1763-dom-a1']} ⇒ ${后C['t1763-dom-a1']}）✓`);

		/* 两个「不同形」：空域**抛**；未声明域 ⇒ `无面板: true`（✗ 不静默返回空 ✓） */
		let 空域抛 = null;
		try { R.refreshDomain(''); } catch (e) { 空域抛 = e.message; }
		const 未声明 = (() => { try { return R.refreshDomain('t1763-未声明的域'); } catch (e) { return { 抛: e.message }; } })();
		读数.臂C_两形 = { 空域抛, 未声明 };
		ok(空域抛 !== null, '★【C 按域刷新】空域应**具名抛**（✗ 与「域里没面板」同形 ✓）');
		ok(未声明 && 未声明.无面板 === true, `★【C 按域刷新】未声明的域应报 \`无面板: true\`（实得 ${S(未声明)}）✓`);
	}
	}

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
	/* 两条刀，各拔一处、各须红在**自己那一面**：
	 *   ① 摘掉一个面板注册 ⇒ **A 面**红（注册⇒常驻渲染的前提没了 ✓）；
	 *   ② 让 `refreshDomain` 忽略域（退化成全量）⇒ **C 面**红（「改一域✗动他域」是票面红线 ✓）。
	 *   ⚠ 刀① 打在**产物文本**上，✗ 不改源码（改了不重建 ⇒ 刀没落在被测物上，本舰队栽过两次 ✓）。
	 *   ⚠ 刀② 必须**保持返回形**（`无面板` 不给 `ids.length` 崩）—— 否则红是**装置级**（崩），
	 *     按纪律「崩溃不算红」✗（我在 `#1985` 复核时先栽过一次 ✓）。 */
	const 刀 = [
		/* ★`sgstory#1983` 的刀：把「落 css」那行改成**只算不落** ⇒ 【D】**具名红**、反向臂**仍绿** ✓ */
		{ id: 'css 只算不落（不 setProperty）', 找: '根.style.setProperty(k, css[k]);', 换: 'void 0;', 面: /【D/ },
		{ id: '摘掉一个注册', 找: "registerPanel('trauma'", 换: "registerPanel('__knife_off_trauma'", 面: /【A/ },
		{ id: 'refreshDomain 忽略域', 找: "const ids = RPG.panelsInDomain(域);\n\tconst r = RPG.refreshPanels(ids, opts);\n\treturn { 域, rendered: r.rendered, skipped: r.skipped, 无面板: ids.length === 0 };",
		  换: "const ids = null;\n\tconst r = RPG.refreshPanels(ids, opts);\n\treturn { 域, rendered: r.rendered, skipped: r.skipped, 无面板: false };", 面: /【C/ },
	];
	let 不中 = 0;
	for (const k of 刀) {
		if (!原.includes(k.找)) { console.error(`✗ 刀「${k.id}」替换**未命中**（产物里找不到靶）⇒ 刀没落在被测物上（产物变了就同步改刀 ✓）`); 不中++; continue; }
		const 刀本 = html.replace(/\.html$/, `.__knife-${process.pid}-${不中}.html`);
		fs2.writeFileSync(刀本, 原.replace(k.找, k.换));
		try {
			const { fails } = await 判({ ...env2, htmlPath: 刀本 });
			const 命中 = fails.filter((f) => k.面.test(f));
			if (命中.length) console.log(`✓ 刀「${k.id}」⇒ 该面**如期红**：${命中.length} 条（${命中[0].slice(0, 60)}…）`);
			else { console.error(`✗ 刀「${k.id}」⇒ **零红**（该面没咬住）—— 判据没牙：${JSON.stringify(fails.slice(0, 2))}`); 不中++; }
		} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	}
	process.exit(不中 ? 1 : 0);
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
