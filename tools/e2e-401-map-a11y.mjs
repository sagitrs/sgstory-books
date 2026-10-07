/* books#401 S7-3b 探针 71-c：地图面板**窄屏几何 ＋ 等价文字三类**（原生 Chromium）
 *
 * 依据（逐字）：
 *   · `writer-2` S7 六裁 §二.4：「**键盘和触屏须真实可操作。**入口有可达焦点和展开状态，关闭操作有明确名称；
 *     关闭后的焦点合理回到入口，不吞掉待选行动。……图区点击只收起，不选择节点或移动。」
 *   · 同裁 §一.4（第 4 项）：「三类等价文字留在地图面板内 …… 包含**当前节点及实际状态**、本节点**合法可走
 *     方向与目标**、相应**类型及风险**；……**不能只留节点名或图例**。文字与覆盖层共用同一权威输入 ……」
 *   · 同裁 §二.5：「右下布局**不得挡既有按钮**，移动端须**限制图高**并可**等比查看**。」
 *   · 设计 §8：「移动端限制图高并可等比查看；键盘／触屏／读屏有当前节点、可走路线和类型风险的等价文字。」
 *
 * 口径（✗ 不超范围）：本臂只报 **CSS 视口几何 ＋ 面板内文字读数**，✗ 不作实机／无障碍认证结论 ✓。
 * 0 通过；1 产品/断言红；2 装置错。本地手跑体例（未接线 CI；承载与编号归 T 域，见豁免表）。
 * 用法：PW_DIR=<含 node_modules/playwright 的目录> CHROME_BIN=<chrome>
 *       node tools/e2e-401-map-a11y.mjs --books <books 树> --engine <声明 pin 的引擎树> [--selftest]
 * --selftest（正控）：**摘掉等价文字第三段** ⇒ 须**具名红**（`EQ_TEXT_THREE_CLASSES`）⇒ 证本臂对「三类」承重；
 *   摘段后**复原**并断言恢复干净；正控未命中即报 `knifeMissed`（✗ 不许正控落空还报绿）。
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const 入口 = '[data-panel="seven-names-map"] .map-open';
const 包 = '[data-panel="seven-names-map"] .map-wrap';
const 图 = '[data-panel="seven-names-map"] .map-art';
const 文 = '[data-panel="seven-names-map"] .map-eq';

const args = process.argv.slice(2);
const flags = new Set(['--books', '--engine', '--selftest']);
let books, engine, chromium, chrome, html;
try {
	for (let i = 0; i < args.length; i++) {
		if (!flags.has(args[i])) throw Error(`unknown argument: ${args[i]}`);
		if (args[i] !== '--selftest' && (!args[++i] || args[i].startsWith('--'))) throw Error('missing argument value');
	}
	const value = (f) => args.includes(f) ? args[args.indexOf(f) + 1] : null;
	if (!value('--books') || !value('--engine') || !process.env.PW_DIR || !process.env.CHROME_BIN) {
		throw Error('require --books, --engine, PW_DIR and CHROME_BIN');
	}
	books = path.resolve(value('--books')); engine = path.resolve(value('--engine'));
	const pin = JSON.parse(fs.readFileSync(path.join(books, '.github/engine-ref.json'), 'utf8')).ref;
	const actual = execFileSync('git', ['-C', engine, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	if (actual !== pin) throw Error(`engine HEAD ${actual} differs from declared full pin ${pin}`);
	html = fs.readFileSync(path.join(books, 'stories/babel/babel-trial.html'));
	if (!html.includes(Buffer.from('seven-names-map')) || !html.includes(Buffer.from('babel-map-w09'))) {
		throw Error('rebuild artifact from a tree carrying the S7 3b map panel first');
	}
	chromium = createRequire(path.join(path.resolve(process.env.PW_DIR), 'noop.js'))('playwright').chromium;
	chrome = path.resolve(process.env.CHROME_BIN);
	fs.accessSync(chrome, fs.constants.X_OK);
} catch (error) {
	console.error(`SETUP: ${error.message}`); process.exit(2);
}
const selftest = args.includes('--selftest');

/** 页内读面：视口几何 ＋ 面板/等价文字读数 ＋ 权威事实（用于交叉核，✗ 不拿被测物当尺）。 */
const 读 = (page) => page.evaluate(() => {
	/* ★页内自持选择子（`page.evaluate` 跑在**浏览器上下文** ⇒ 外层常量不可见 ✗ —— 本席首版即栽在此）。 */
	const 入口 = '[data-panel="seven-names-map"] .map-open';
	const 包 = '[data-panel="seven-names-map"] .map-wrap';
	const 图 = '[data-panel="seven-names-map"] .map-art';
	const 文 = '[data-panel="seven-names-map"] .map-eq';
	const { setup } = SugarCube, B = setup.BABEL;
	const q = (s) => document.querySelector(s);
	const rect = (s) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect();
		return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right) }; };
	const css = (s, ks) => { const e = q(s); if (!e) return null; const c = getComputedStyle(e); return Object.fromEntries(ks.map((k) => [k, c[k]])); };
	const 段 = Array.from(document.querySelectorAll(文 + ' > div')).map((d) => d.textContent.trim());
	const r = B?.七名河?.读?.() ?? null;
	return {
		/* ★前置按**布局视口** `clientWidth/Height`（`innerWidth` 受滚动条影响：本机实测 390 视口报 405 ✗）。 */
		vw: innerWidth, vh: innerHeight, 布局宽: document.documentElement.clientWidth, 布局高: document.documentElement.clientHeight,
		dpr: devicePixelRatio, touch: navigator.maxTouchPoints,
		scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
		包: rect(包), 图: rect(图), 文: rect(文), 按钮: rect(入口), hud: rect('.statusbar'), 背包栏: rect('.bagbar'),
		包Css: css(包, ['maxHeight', 'maxWidth', 'overflow', 'display']),
		图Css: css(图, ['maxHeight', 'maxWidth', 'height', 'width', 'pointerEvents']),
		文段: 段, 文段数: 段.length,
		图例在: !!q('[data-panel="seven-names-map"] .map-legend'),
		开: B?.地图?.开?.() ?? null,
		aria: q(入口)?.getAttribute('aria-expanded') ?? null,
		/* ★权威面（交叉核的**另一本账** ✓）：当前节点 id 与其标题（面板文字须与之对齐 ✓）。 */
		权威当前: r?.当前 ?? null, 权威标题: r?.定点?.[r?.当前]?.title ?? null, 权威可走数: (r?.导航 ?? []).length,
	};
});
const 判 = (g) => {
	const bad = [];
	if (g.布局宽 !== 390 || g.布局高 !== 844 || g.dpr !== 1 || g.touch !== 1) bad.push('NARROW_PREREQUISITE:布局=' + g.布局宽 + 'x' + g.布局高 + ' dpr=' + g.dpr + ' touch=' + g.touch);
	/* ★**归因**（✗ 不把别处的溢出算本臂账上）：整页溢出只作读数（见 `溢出对比`），本臂只判
	 *   「**地图自己的框**是否越界」（下条 ✓）＋「开图是否**新增**溢出」。 */
	if (g.包 && (g.包.r > g.布局宽 + 1 || g.包.x < -1) && g.开) bad.push('A11Y_PANEL_HORIZONTAL_ESCAPE');
	if (g.开 !== true) bad.push('A11Y_MAP_NOT_OPEN');
	if (!g.包 || !g.图 || !g.文 || !g.按钮) bad.push('A11Y_PANEL_PARTS_MISSING');
	else {
		/* ① 不截断（横向）＋ 面板须落在视口内（✗ 不得横向越界 ✓） */
		if (g.包.r > g.vw + 1 || g.包.x < -1) bad.push('A11Y_PANEL_HORIZONTAL_ESCAPE');
		/* ② 限制图高（移动端：图高 ≤ 40vh ＋ 容差 ✓ 裁 §二.5） */
		if (g.图.h > Math.round(g.vh * 0.4) + 8) bad.push('A11Y_MAP_HEIGHT_UNBOUNDED:图高=' + g.图.h + '>40vh=' + Math.round(g.vh * 0.4));
		/* ③ 不重叠：地图面板 ✗ 不得盖住既有按钮（底部 HUD／背包栏 ✓ 裁 §二.5「不得挡既有按钮」） */
		const 交叠 = (a, b) => a && b && a.x < b.r && a.r > b.x && a.y < b.b && a.b > b.y;
		if (交叠(g.文, g.按钮)) bad.push('A11Y_EQ_OVERLAPS_TOGGLE');
		if (交叠(g.包, g.hud)) bad.push('A11Y_MAP_OVERLAPS_HUD');
	}
	/* ④ 等价文字三类（裁 §一.4：当前／可走／类型与风险 —— ✗ 只留节点名或图例 ✓） */
	if (g.文段数 !== 3) bad.push('EQ_TEXT_THREE_CLASSES:段数=' + g.文段数);
	else {
		if (!/^当前/.test(g.文段[0]) || g.文段[0].length < 6) bad.push('EQ_TEXT_CURRENT_CLASS');
		if (!/^可走/.test(g.文段[1]) || g.文段[1].length < 6) bad.push('EQ_TEXT_DIRECTIONS_CLASS');
		if (!/^类型/.test(g.文段[2]) || g.文段[2].length < 6) bad.push('EQ_TEXT_TYPE_CLASS');
		/* ★**随事实对齐**（交叉核**另一本账** ✓）：面板「当前」须含权威面的当前节点标题（若可得 ✓） */
		if (g.权威标题 && !g.文段[0].includes(g.权威标题)) bad.push('EQ_TEXT_CURRENT_NOT_ALIGNED:段=' + g.文段[0].slice(0, 40) + '｜权威=' + g.权威标题);
		/* ★**方向须带目标**（裁 §一.4「本节点合法可走方向**与目标**」✓）：`→ （）` 空目标即**具名红** ✓。 */
		const 空目标 = /→\s*（\s*）/.test(g.文段[1]);
		if (空目标) bad.push('EQ_TEXT_DIRECTION_TARGET_EMPTY:' + g.文段[1].slice(0, 60));
	}
	return bad;
};

const report = { apparatus: '原生 Chromium 390x844/DPR1 触屏视口；面板几何 ＋ 等价文字读数；✗ 非实机／无障碍认证',
	probe: '71-c（books#401 S7-3b）', artifact: { bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') }, selftest, cases: [] };
let browser, server, rc = 0;
try {
	server = http.createServer((req, res) => {
		if (req.url !== '/candidate.html') { res.writeHead(404); res.end(); return; }
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': html.length }); res.end(html);
	});
	await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
	const url = `http://127.0.0.1:${server.address().port}/candidate.html`;
	const env = Object.fromEntries(['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'TMPDIR', 'FONTCONFIG_FILE', 'LD_LIBRARY_PATH'].filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]));
	try { browser = await chromium.launch({ executablePath: chrome, env, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] }); }
	catch (error) { error.setup = true; throw error; }

	const entry = { mode: 'narrow-390-touch', failures: [] };
	report.cases.push(entry);
	const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
	try {
		const page = await context.newPage();
		await page.goto(url);
		for (const t of ['战斗教学', '站起来，活动一下手脚']) {
			await page.locator('#passages .passage:not(.passage-out)').getByText(t, { exact: true }).click();
		}
		await page.waitForFunction(() => SugarCube.setup.BABEL?.map?.current === 'L1', null, { timeout: 15000 });
		/* ★**溢出归因的前置读数**：**开图前**的整页溢出（✗ 否则改不动「开图新增溢出」这一句 ✓）。 */
		const 未开 = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
		entry.未开图 = 未开;
		/* 展开：走**入口**（并顺带断言触屏下入口可达／展开态 ✓ 裁 §二.4） */
		await page.locator(入口).tap();
		await page.waitForFunction(() => SugarCube.setup.BABEL?.地图?.开?.() === true &&
			document.querySelector('[data-panel="seven-names-map"] .map-open')?.getAttribute('aria-expanded') === 'true', null, { timeout: 8000 });
		const g = await 读(page);
		entry.initial = { vw: g.vw, vh: g.vh, dpr: g.dpr, touch: g.touch, scrollWidth: g.scrollWidth, clientWidth: g.clientWidth,
			包: g.包, 图: g.图, 文: g.文, 按钮: g.按钮, hud: g.hud, 背包栏: g.背包栏, 图Css: g.图Css, 文段: g.文段, 图例在: g.图例在,
			aria: g.aria, 权威当前: g.权威当前, 权威标题: g.权威标题, 权威可走数: g.权威可走数 };
		entry.failures = 判(g);
		/* ★溢出**归因**：整页横向溢出在**开图前**若已存在 ⇒ 读数（✗ 本臂不认领）；开图**新增**才红 ✓。 */
		entry.溢出对比 = { 开图前: 未开.scrollWidth - 未开.clientWidth, 开图后: g.scrollWidth - g.clientWidth };
		if (entry.溢出对比.开图后 > entry.溢出对比.开图前) entry.failures.push('A11Y_OPEN_ADDED_HORIZONTAL_OVERFLOW:前=' + entry.溢出对比.开图前 + ' 后=' + entry.溢出对比.开图后);
		/* ★图区触屏可点（裁 §二.4「图区点击只收起」✓）：点一下须收起来 ＋ 面板部次仍在 */
		await page.locator(图).tap();
		await page.waitForFunction(() => SugarCube.setup.BABEL?.地图?.开?.() === false, null, { timeout: 8000 }).catch(() => {});
		const 收后 = await 读(page);
		entry.触屏图区收 = { 开: 收后.开, aria: 收后.aria };
		if (收后.开 !== false) entry.failures.push('A11Y_TOUCH_REGION_NO_CLOSE');

		/* ── 正控（--selftest）：**摘掉第三段** ⇒ 须具名红 `EQ_TEXT_THREE_CLASSES` ✓ ── */
		if (selftest) {
			await page.locator(入口).tap();
			await page.waitForFunction(() => SugarCube.setup.BABEL?.地图?.开?.() === true, null, { timeout: 8000 });
			const 摘 = await page.evaluate(() => {
				const nodes = document.querySelectorAll('[data-panel="seven-names-map"] .map-eq > div');
				const last = nodes[nodes.length - 1];
				if (!last) return { removed: false };
				/* ★**先存引用再移除**（本席首版移出文档后再用 `querySelector` 找它 ⇒ 找不着 ⇒ 复原失败 ✗）。 */
				window.__knifeSeg = last;
				last.remove();
				return { removed: true };
			});
			entry.正控摘段 = { removed: 摘.removed };
			const 摘后 = await 读(page);
			entry.正控摘段.文段数 = 摘后.文段数;
			entry.正控摘段.命中的具名失效 = 判(摘后).find((x) => x.startsWith('EQ_TEXT_THREE_CLASSES')) ?? null;
			if (!摘.removed || 摘后.文段数 !== 2) { entry.knifeMissed = '摘段未生效（段数=' + 摘后.文段数 + '）'; entry.failures.push('KNIFE_PREREQUISITE'); }
			else if (!entry.正控摘段.命中的具名失效) { entry.knifeMissed = 'EQ_TEXT_THREE_CLASSES'; entry.failures.push('KNIFE_MISSED'); }
			/* 复原（按存的文本重建该段 ⇒ 面板文字回到原样 ✓） */
			const 复原 = await page.evaluate(() => {
				const box = document.querySelector('[data-panel="seven-names-map"] .map-eq');
				const seg = window.__knifeSeg;
				if (!box || !seg) return { restored: false };
				box.appendChild(seg); delete window.__knifeSeg;
				return { restored: true };
			});
			const 复原后 = await 读(page);
			entry.正控复原 = { restored: 复原.restored, 文段数: 复原后.文段数, 失效: 判(复原后) };
			if (!复原.restored || 复原后.文段数 !== 3 || entry.正控复原.失效.length) entry.failures.push('KNIFE_RESTORE_FAILED');
		}
		if (entry.failures.length) rc = 1;
	} catch (error) {
		rc = error.setup ? 2 : 1; entry.thrown = String(error.message ?? error);
	} finally { await context.close(); }
} catch (error) {
	rc = error.setup ? 2 : 1; report.error = String(error.stack ?? error);
} finally {
	await browser?.close();
	if (server?.listening) await new Promise((resolve) => server.close(resolve));
}
const 全红 = report.cases.flatMap((c) => c.failures ?? []);
report.summary = { rc, namedFailures: 全红 };
report.rc = rc;
console.log(JSON.stringify(report, null, 2));
if (rc === 0 && 全红.length === 0) {
	console.log('71-c 判据通过：390 宽不截断／不重叠（含图高上界）＋ 等价文字三类随权威面');
} else {
	console.log(`71-c 未通过（rc=${rc}）：具名失效 ${全红.length} 条${全红.length ? '：' + 全红.join(' / ') : ''}${report.error ? '｜装置错' : ''}`);
}
process.exitCode = rc;
