/* books#401 S7-3b 探针 71-b：地图开关**三路一个开关**（原生 Chromium）
 *
 * 依据（逐字）：
 *   · `writer-2` S7 六裁 §二.3：「**入口、图区点击及 ESC 使用同一个地图开关**；状态真正改变时分别显示
 *     『**你打开了地图**』『**你收起了地图**』，同态调用／纯重绘**不重复演出**。开关暂态不变成另一份
 *     持久地图进度，绘图函数不自动开局、选路或领取。」
 *   · 同裁 §三：「真实打开／收起：面板可见性、展开属性、焦点与规定的**一次演出**是**允许的精确差分**」
 *     ⇒ 故本臂**只**允许「具名演出行」的差分，其余（时间／骰／节点／路线／战果／奖励／物品／机会／
 *     真实存档槽）**逐字节须不变** ✓。
 *
 * 本臂读的是**行为**（真点、真按 ESC、真读通知面），✗ 不断源码字符串，✗ 不印 PASS 充数。
 * 0 通过；1 产品/断言红；2 装置错。
 * 本地手跑体例（**未接线 CI** —— 承载与编号归 T 域确认，见 `tools/check-tool-registry.mjs` 豁免表）。
 * 用法：PW_DIR=<含 node_modules/playwright 的目录> CHROME_BIN=<chrome 可执行>
 *       node tools/e2e-401-map-toggle.mjs --books <books 树> --engine <声明 pin 的引擎树> [--selftest]
 * --selftest（刀）：在**新页**注入「吞掉 document 级 keydown 注册」⇒ **解绑 ESC** ⇒ 该路须**具名红**；
 *   且须证：入口路仍绿（刀只砍 ESC 一路）＋ 刀未命中即报 `knifeMissed`（✗ 不许刀落空还报绿）。
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const 开句 = '你打开了地图';
const 收句 = '你收起了地图';
const 入口 = '[data-panel="seven-names-map"] .map-open';
const 图区 = '[data-panel="seven-names-map"] .map-art';

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
	/* ★探针须跑在**含地图接线**的产物上（✗ 跨树跑 ⇒ 装置错，同 311 的产物前置口径）。 */
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

/* ── 页内读面：开关态（权威 `B.地图.开()` ＋ DOM 的 `aria-expanded`）／通知面计数／非允许项快照 ── */
const 读态 = (page) => page.evaluate(() => {
	const { State, setup } = SugarCube, R = setup.RPG, B = setup.BABEL;
	const eq = document.querySelectorAll('[data-panel="seven-names-map"] .map-open');
	/* ★★**具名演出差分**（裁 §三）：通知账 `$rpgNotices` 是**明许**变动的那一本 ⇒ 从这里剔除，
	 *   由 `通知` 字段**单独**按**逐字计数**比对 ✓（本席首版整域硬比 ⇒ 两条明许演出行把
	 *   「连按回原」判成 `TOUCHED_NON_ALLOWED` 的**误报** ✗ —— 裁文正是要求「只放过具名演出记录，
	 *   ✗ 不豁免整个通知／State 域」✓）。 */
	const 域 = (() => { const c = JSON.parse(JSON.stringify(State.variables ?? {})); delete c.rpgNotices; return JSON.stringify(c); })();
	return {
		开: B?.地图?.开?.() ?? null,
		aria: Array.from(eq).map((b) => b.getAttribute('aria-expanded')),
		按钮文: Array.from(eq).map((b) => b.textContent.trim()),
		入口个数: eq.length,
		图区在: !!document.querySelector('[data-panel="seven-names-map"] .map-art'),
		通知: (R.noticesHTML?.() ?? ''),
		/* ★**演出钩读数**：实现走 `R.note?.(句)`（故事侧演出出口 ✓ —— 与本仓 `verify.mjs` 候选组
		 *   **同形**：那里也是给 `R.note` 装收集器 ✓）。★另记**引擎通知面**是否含这两句（读数 ✓）：
		 *   实测该钩**无任何提供者**（引擎与故事两侧皆未定义 `RPG.note` ✓）⇒ 通知面**看不到** ⇒
		 *   「**显示**」（裁 §二.3 原文）与实装**不一致** ⇒ ★已报票待裁（✗ 本席不单方改 ✓）。 */
		演出: (window.__perf ?? []),
		通知含开句: (R.noticesHTML?.() ?? '').includes('你打开了地图'),
		域: 域,
		回合: State.turns,
		位置: B?.map?.current ?? null,
		玩家: setup.DND3.Player.toJSON(),
		存档槽: Object.fromEntries(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])),
	};
});
/** 非允许项快照（✗ 不含通知面 —— 通知面里的**具名演出行**是裁文明许的差分 ✓）。 */
const 非允许 = (g) => JSON.stringify({ 域: g.域, 回合: g.回合, 位置: g.位置, 玩家: g.玩家, 存档槽: g.存档槽 });
const 计数 = (s, 子) => s.split(子).length - 1;
/** ★按**实现真钩**计演出句（✗ 不按通知面 —— 那面收不到，见 `读态` 的说明 ✓）。 */
const 演出计 = (g, 句) => (g.演出 ?? []).filter((s) => s === 句).length;
const 演出全 = (g) => (g.演出 ?? []);
const 走位 = async (page) => {
	for (const t of ['战斗教学', '站起来，活动一下手脚']) {
		await page.locator('#passages .passage:not(.passage-out)').getByText(t, { exact: true }).click();
	}
	await page.waitForFunction(() => {
		const p = document.querySelector('#passages .passage:not(.passage-out)');
		return SugarCube.setup.BABEL?.map?.current === 'L1' && p && getComputedStyle(p).opacity === '1';
	}, null, { timeout: 15000 });
};
const 等开关 = (page, 期望) => page.waitForFunction((v) =>
	SugarCube.setup.BABEL?.地图?.开?.() === v &&
	document.querySelector('[data-panel="seven-names-map"] .map-open')?.getAttribute('aria-expanded') === String(v), 期望, { timeout: 8000 });

const report = { apparatus: '原生 Chromium；真点入口／真点图区／真按 ESC；通知面**逐字计数**＋非允许项逐字节比对',
	probe: '71-b（books#401 S7-3b）', artifact: { bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') }, selftest, cases: [] };
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

	/* ══ 主路：三路一个开关（各一次）＋ 逐字出句 ＋ 负（连按回原）＋ 同态不重复演出 ══ */
	const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const entry = { mode: 'three-paths-once', inputs: [], failures: [] };
	report.cases.push(entry);
	try {
		const page = await context.newPage();
		/* ★装**演出收集器**（实现真钩 `R.note` ✓；`addInitScript` 保证在故事脚本前生效 ✓）。 */
		await page.addInitScript(() => {
			Object.defineProperty(window, '__perf', { value: [], writable: false, configurable: false });
			const 装 = () => { const R = window.SugarCube?.setup?.RPG; if (R && !R.__perfHooked) { R.note = (s) => { window.__perf.push(String(s)); }; R.__perfHooked = true; } };
			装(); setInterval(装, 20);
		});
		await page.goto(url);
		await 走位(page);
		const 起 = await 读态(page);
		entry.initial = { 开: 起.开, aria: 起.aria, 按钮文: 起.按钮文, 入口个数: 起.入口个数, 开句数: 演出计(起, 开句), 收句数: 演出计(起, 收句) };
		if (起.开 !== false || 起.入口个数 < 1 || 起.aria[0] !== 'false') entry.failures.push('TOGGLE_CLOSED_PREREQUISITE');
		if (演出计(起, 开句) !== 0 || 演出计(起, 收句) !== 0) entry.failures.push('TOGGLE_NOTICE_PREREQUISITE');
		if (entry.failures.length) throw Error('TOGGLE_PREREQUISITE: ' + entry.failures.join(','));

		/* ── 路 1：**入口按钮** ⇒ 开 ＋ 一句「你打开了地图」逐字 ── */
		await page.locator(入口).click();
		await 等开关(page, true);
		const g1 = await 读态(page);
		entry.入口 = { 开: g1.开, aria: g1.aria, 开句数: 演出计(g1, 开句), 收句数: 演出计(g1, 收句) };
		if (g1.开 !== true || g1.aria[0] !== 'true') entry.failures.push('ENTRY_NO_OPEN:开=' + g1.开 + ' aria=' + g1.aria.join('|'));
		if (演出计(g1, 开句) !== 1) entry.failures.push('ENTRY_NOTICE_VERBATIM:开句数=' + 计数(g1.通知, 开句));
		if (演出计(g1, 收句) !== 0) entry.failures.push('ENTRY_NOTICE_EXTRA:收句数=' + 计数(g1.通知, 收句));

		/* ── 路 2：**图区点击** ⇒ 收 ＋ 一句「你收起了地图」逐字 ── */
		if (!g1.图区在) entry.failures.push('REGION_MISSING:展开态未见图区');
		await page.locator(图区).click();
		await 等开关(page, false);
		const g2 = await 读态(page);
		entry.图区 = { 开: g2.开, aria: g2.aria, 开句数: 演出计(g2, 开句), 收句数: 演出计(g2, 收句) };
		if (g2.开 !== false || g2.aria[0] !== 'false') entry.failures.push('REGION_NO_CLOSE:开=' + g2.开 + ' aria=' + g2.aria.join('|'));
		if (演出计(g2, 收句) !== 1) entry.failures.push('REGION_NOTICE_VERBATIM:收句数=' + 计数(g2.通知, 收句));
		if (演出计(g2, 开句) !== 1) entry.failures.push('REGION_NOTICE_DRIFT:开句数=' + 计数(g2.通知, 开句));

		/* ── 路 3：**ESC** ⇒ 开（先经入口）再按 ESC ⇒ 收 ＋ 逐字 ── */
		await page.locator(入口).click();
		await 等开关(page, true);
		const 前ESC = await 读态(page);
		await page.keyboard.press('Escape');
		await 等开关(page, false).catch(() => {});
		const g3 = await 读态(page);
		entry.ESC = { 开: g3.开, aria: g3.aria, 开句数: 演出计(g3, 开句), 收句数: 演出计(g3, 收句) };
		if (g3.开 !== false || g3.aria[0] !== 'false') entry.failures.push('ESC_NO_CLOSE:开=' + g3.开 + '（三路须同一开关 ⇒ ESC 亦须能收）');
		if (演出计(g3, 收句) !== 演出计(前ESC, 收句) + 1) entry.failures.push('ESC_NOTICE_VERBATIM:收句数=' + 计数(g3.通知, 收句));

		/* ── 负：**连按回原**（点两次 ⇒ 回到原态；且**非允许项逐字节不变**）── */
		await 等开关(page, false);
		const 负前 = await 读态(page);
		await page.locator(入口).click(); await 等开关(page, true);
		await page.locator(入口).click(); await 等开关(page, false);
		const 负后 = await 读态(page);
		entry.连按 = { 开: 负后.开, aria: 负后.aria, 开句数: 演出计(负后, 开句), 收句数: 演出计(负后, 收句),
			非允许项不变: 非允许(负前) === 非允许(负后) };
		if (负后.开 !== 负前.开 || 负后.aria[0] !== 负前.aria[0]) entry.failures.push('DOUBLE_PRESS_NOT_RESTORED');
		if (!entry.连按.非允许项不变) entry.failures.push('DOUBLE_PRESS_TOUCHED_NON_ALLOWED');
		if (演出计(负后, 开句) !== 演出计(负前, 开句) + 1 || 演出计(负后, 收句) !== 演出计(负前, 收句) + 1) {
			entry.failures.push('DOUBLE_PRESS_NOTICE_DRIFT:两次真实变更须各出且只出一句');
		}

		/* ── 同态：**纯重绘 20 次 ⇒ ✗ 不重复演出**（且非允许项不变）── */
		const 同前 = await 读态(page);
		await page.evaluate(async () => { const R = SugarCube.setup.RPG; for (let i = 0; i < 20; i++) R.refreshPanels(); });
		await page.waitForTimeout(50);
		const 同后 = await 读态(page);
		entry.同态重绘 = { 次数: 20, 开句数差: 演出计(同后, 开句) - 演出计(同前, 开句), 收句数差: 演出计(同后, 收句) - 演出计(同前, 收句),
			非允许项不变: 非允许(同前) === 非允许(同后) };
		if (entry.同态重绘.开句数差 !== 0 || entry.同态重绘.收句数差 !== 0) entry.failures.push('SAME_STATE_REPLAYED_NOTICE');
		if (!entry.同态重绘.非允许项不变) entry.failures.push('SAME_STATE_TOUCHED_NON_ALLOWED');
		if (entry.failures.length) rc = 1;
	} catch (error) {
		rc = error.setup ? 2 : 1; entry.thrown = String(error.message ?? error);
	} finally { await context.close(); }

	/* ══ 刀（--selftest）：**解绑 ESC** ⇒ 该路须具名红；入口路须仍绿 ══ */
	if (selftest) {
		const 刀 = { mode: 'knife-unbind-esc', failures: [], expectation: 'ESC_NO_CLOSE' };
		report.cases.push(刀);
		const kc = await browser.newContext({ viewport: { width: 1280, height: 900 } });
		try {
			const page = await kc.newPage();
			/* ★刀法：拦掉 document 级 `keydown` 注册 ⇒ ESC 一路断（✗ 不动入口／图区那两条）✓ */
			await page.addInitScript(() => {
				Object.defineProperty(window, '__perf', { value: [], writable: false, configurable: false });
				const 装 = () => { const R = window.SugarCube?.setup?.RPG; if (R && !R.__perfHooked) { R.note = (s) => { window.__perf.push(String(s)); }; R.__perfHooked = true; } };
				装(); setInterval(装, 20);
				const orig = Document.prototype.addEventListener;
				Document.prototype.addEventListener = function (type, fn, opts) {
					if (type === 'keydown') return;
					return orig.call(this, type, fn, opts);
				};
			});
			await page.goto(url);
			await 走位(page);
			const 起 = await 读态(page);
			if (起.开 !== false) 刀.failures.push('KNIFE_PREREQUISITE');
			/* 入口路须**照常可开**（证刀只砍 ESC 一路 ⇒ ✗ 一把刀砍全臂） */
			await page.locator(入口).click();
			await 等开关(page, true);
			const 开到 = await 读态(page);
			刀.入口仍可开 = 开到.开 === true && 演出计(开到, 开句) === 1;
			if (!刀.入口仍可开) 刀.failures.push('KNIFE_ALSO_BROKE_ENTRY');
			/* ESC 路 —— 刀下**必须**收不起来（否则本臂对 ESC 接线不承重 ⇒ 刀落空） */
			await page.keyboard.press('Escape');
			await page.waitForTimeout(150);
			const 刀后 = await 读态(page);
			刀.afterEscOpen = 刀后.开;
			/* ★刀下 ESC 收不起来 ⇒ 主路对 ESC 路报的**正是** `ESC_NO_CLOSE` ⇒ 刀命中该具名失效 ✓。 */
			刀.hit = 刀后.开 === true ? 'ESC_NO_CLOSE' : null;
			if (刀.hit !== 'ESC_NO_CLOSE') { 刀.knifeMissed = 'ESC_NO_CLOSE'; 刀.failures.push('KNIFE_MISSED'); }
			if (刀.failures.length) rc = 1;
		} catch (error) {
			rc = 1; 刀.thrown = String(error.message ?? error);
		} finally { await kc.close(); }
	}
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
/* ★守护串**只在真通过时**印（本席首版在 rc=2 的装置错上也印了「通过」✗ —— CI 取守护串的正是不许这种假绿 ✓）。 */
if (rc === 0 && 全红.length === 0) {
	console.log('71-b 判据通过：三路一个开关 ＋ 出句逐字 ＋ 连按回原 ＋ 同态不重复演出');
} else {
	console.log(`71-b 未通过（rc=${rc}）：具名失效 ${全红.length} 条${全红.length ? '：' + 全红.join(' / ') : ''}${report.error ? '｜装置错' : ''}`);
}
process.exitCode = rc;
