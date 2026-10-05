/* books#311: native Chromium geometry, two fresh contexts, no domain injection.
 * 720x500/DPR2 models the CSS viewport observed at desktop 200% zoom; it is NOT
 * a toolbar-zoom test. 390x844/DPR1 is simulated touch, not a physical device.
 * A named DOM-only combat-CSS fixture toggles the inherited body class, NOT the
 * game phase, and checks hidden-sidebar spacing and fixed-HUD clearance.
 * --selftest: four temporary CSS overrides; named failures and restored sources.
 * Separately records native SVG decode, an injected image fault, and exact
 * text-node sequences before/after full-panel redraw at the normal L1 entry.
 * These are not a historical in-combat redraw classification.
 * Local/manual entry (not called by CI). 0 passed; 1 product/assertion; 2 setup.
 * Usage: PW_DIR=<playwright parent> CHROME_BIN=<exe> node tools/e2e-311-layout.mjs
 *        --books <books-tree> --engine <exact-pin-tree> [--selftest]
 * --combat-redraw: separate, bounded normal-input L1->L2 reproduction. It does
 * not retry/restart after a failed prerequisite or reinterpret a text red as green.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const flags = new Set(['--books', '--engine', '--selftest', '--combat-redraw']);
let books, engine, chromium, chrome, html;
try {
	for (let i = 0; i < args.length; i++) {
		if (!flags.has(args[i])) throw Error(`unknown argument: ${args[i]}`);
		if (!['--selftest', '--combat-redraw'].includes(args[i]) && (!args[++i] || args[i].startsWith('--'))) throw Error('missing argument value');
	}
	if (args.includes('--selftest') && args.includes('--combat-redraw')) throw Error('--selftest and --combat-redraw are separate entries');
	const value = (f) => args.includes(f) ? args[args.indexOf(f) + 1] : null;
	if (!value('--books') || !value('--engine') || !process.env.PW_DIR || !process.env.CHROME_BIN) {
		throw Error('require --books, --engine, PW_DIR and CHROME_BIN');
	}
	books = path.resolve(value('--books')); engine = path.resolve(value('--engine'));
	const pin = JSON.parse(fs.readFileSync(path.join(books, '.github/engine-ref.json'), 'utf8')).ref;
	const actual = execFileSync('git', ['-C', engine, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	if (actual !== pin) throw Error(`engine HEAD ${actual} differs from declared full pin ${pin}`);
	html = fs.readFileSync(path.join(books, 'stories/babel/babel-trial.html'));
	if (!html.includes(Buffer.from('setup.storyAssets')) || !html.includes(Buffer.from('babel-player-art'))) throw Error('rebuild artifact with declared assets first');
	chromium = createRequire(path.join(path.resolve(process.env.PW_DIR), 'noop.js'))('playwright').chromium;
	chrome = path.resolve(process.env.CHROME_BIN);
	fs.accessSync(chrome, fs.constants.X_OK);
} catch (error) {
	console.error(`SETUP: ${error.message}`); process.exit(2);
}
const selftest = args.includes('--selftest');
const combatRedraw = args.includes('--combat-redraw');
const measure = (page) => page.evaluate(() => {
	const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON() ?? null;
	return { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, touch: navigator.maxTouchPoints,
		scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth,
		stowed: document.querySelector('#ui-bar').classList.contains('stowed'),
		sidebar: rect('#ui-bar'), main: rect('#passages'), portrait: rect('.babel-player-art'),
		toggle: rect('#ui-bar-toggle'), hud: rect('.statusbar'), title: rect('.babel-reading-title'),
		position: getComputedStyle(document.querySelector('.statusbar')).position };
});
const snapshot = (page) => page.evaluate(() => {
	const { State, setup } = SugarCube;
	return JSON.stringify({ variables: State.variables, turns: State.turns, passage: State.passage,
		player: setup.DND3.Player.toJSON(), position: setup.BABEL.map.current,
		notices: setup.RPG.noticesHTML(), noticeToggle: setup.RPG.noticeToggleHTML(),
		storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) });
});
const failures = (mode, g) => {
	const bad = [];
	if (g.scrollWidth !== g.clientWidth) bad.push('HORIZONTAL_OVERFLOW');
	if (mode === 'combat-css') {
		if (!g.sidebar || g.sidebar.width !== 0 || !g.main || g.main.left >= 100) bad.push('COMBAT_HIDDEN_SIDEBAR_SPACE');
		if (g.position !== 'fixed' || !g.hud || !g.title || g.title.top < g.hud.bottom) bad.push('COMBAT_HUD_TITLE');
	} else if (mode === 'zoom') {
		if (g.width !== 720 || g.height !== 500 || g.dpr !== 2 || g.stowed) bad.push('ZOOM_PREREQUISITE');
		if (!g.main || !g.sidebar || g.main.left < g.sidebar.right) bad.push('ZOOM_SIDEBAR_OVERLAP');
	} else {
		if (g.width !== 390 || g.height !== 844 || g.dpr !== 1 || g.touch !== 1) bad.push('NARROW_PREREQUISITE');
		const p = g.portrait, t = g.toggle;
		if (!p || p.width <= 0 || !t || (p.left < t.right && p.right > t.left && p.top < t.bottom && p.bottom > t.top)) bad.push('NARROW_PORTRAIT_OVERLAP');
		if (g.position !== 'fixed' || !g.hud || !g.title || g.hud.top < 0 || g.hud.bottom > 844 || g.title.top < g.hud.bottom) bad.push('NARROW_HUD_TITLE');
	}
	return bad;
};
const settle = async (page) => {
	// Settle the existing margin transition; waiting is not a performance verdict.
	await page.waitForFunction(() => !document.getAnimations().some(a => a.playState === 'running' && a.effect?.target?.id === 'story'), null, { timeout: 5000 });
};
const decorationAudit = (page) => page.evaluate(async () => {
	const { setup } = SugarCube, R = setup.RPG;
	const passage = () => document.querySelector('#passages .passage:not(.passage-out)');
	const sequence = () => {
		const p = passage(), walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT), nodes = [];
		for (let node = walk.nextNode(); node; node = walk.nextNode()) if (node.nodeValue.trim()) nodes.push(node.nodeValue);
		return { text: p.textContent, nodes, paragraphs: Array.from(p.querySelectorAll('p'), p => p.textContent),
			panels: Object.fromEntries(['.noticebar', '.statusbar', '.bagbar', '.enemybar'].map(selector => [selector, p.querySelector(selector)?.textContent ?? null])) };
	};
	const domain = () => JSON.stringify({ variables: SugarCube.State.variables, turns: SugarCube.State.turns,
		passage: SugarCube.State.passage, player: setup.DND3.Player.toJSON(), position: setup.BABEL.map.current,
		notices: R.noticesHTML(), noticeToggle: R.noticeToggleHTML(),
		storage: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])) });
	const before = sequence(), source = domain(), bad = [];
	if (!before.nodes.length) bad.push('TEXT_SEQUENCE_PREREQUISITE');
	if (passage().querySelector('p img[data-babel-asset]')) bad.push('DECORATION_IN_PARAGRAPH');
	const decoded = [];
	for (const [id, asset] of Object.entries(setup.storyAssets)) {
		const image = new Image(); image.src = asset.src; await image.decode();
		decoded.push({ id, width: image.naturalWidth, height: image.naturalHeight });
		if (image.naturalWidth !== asset.width || image.naturalHeight !== asset.height) bad.push(`SVG_DECODE_DIMENSIONS:${id}`);
	}
	if (decoded.length !== 8) bad.push('EIGHT_SVG_DECODE_PREREQUISITE');
	const portrait = passage().querySelector('.babel-player-art');
	await portrait.decode();
	const oldSrc = portrait.getAttribute('src'), oldHidden = portrait.hidden;
	let fault;
	try {
		portrait.src = 'data:image/svg+xml;base64,bm90IHN2Zw==';
		let rejected = false; try { await portrait.decode(); } catch { rejected = true; }
		// Wait for the actual native error event and the production hide listener.
		for (let i = 0; i < 100 && !portrait.hidden; i++) await new Promise(r => setTimeout(r, 10));
		fault = { nativeDecodeRejected: rejected, hidden: portrait.hidden,
			textSequenceUnchanged: JSON.stringify(sequence()) === JSON.stringify(before), domainAndSavesUnchanged: domain() === source };
		if (!Object.values(fault).every(Boolean)) bad.push('NATIVE_IMAGE_FAULT_INVARIANTS');
	} finally { portrait.src = oldSrc; portrait.hidden = oldHidden; await portrait.decode(); }
	const random = Math.random, rng = new Map(Object.entries(R.rng).filter(([, fn]) => typeof fn === 'function'));
	const trap = () => { throw Error('Decoration redraw consumed randomness'); };
	try {
		Math.random = trap; for (const name of rng.keys()) R.rng[name] = trap;
		for (let i = 0; i < 20; i++) R.refreshPanels();
	} finally { Math.random = random; for (const [name, fn] of rng) R.rng[name] = fn; }
	const after = sequence(), redraw = { redraws: 20, textSequenceUnchanged: JSON.stringify(after) === JSON.stringify(before),
		domainAndSavesUnchanged: domain() === source, before, after };
	if (!redraw.textSequenceUnchanged || !redraw.domainAndSavesUnchanged) bad.push('FULL_PANEL_REDRAW_INVARIANTS');
	return { scope: 'normal L1 entry only; eight source decode fixtures, not eight live illustrations or historical combat-red classification',
		decoded, imageFailure: fault, fullPanelRedraw: redraw, failures: bad };
});
const report = { apparatus: 'Chromium CSS-viewport geometry and named SVG/text fixtures; no physical-device, toolbar zoom or font verdict',
	artifact: { bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') }, selftest, combatRedraw, cases: [] };
let browser, server, rc = 0;
try {
	server = http.createServer((req, res) => {
		if (req.url !== '/candidate.html') { res.writeHead(404); res.end(); return; }
		res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': html.length }); res.end(html);
	});
	await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
	const env = Object.fromEntries(['PATH', 'HOME', 'USER', 'LOGNAME', 'LANG', 'TMPDIR', 'FONTCONFIG_FILE', 'LD_LIBRARY_PATH'].filter(k => process.env[k] !== undefined).map(k => [k, process.env[k]]));
	try { browser = await chromium.launch({ executablePath: chrome, env, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking'] }); }
	catch (error) { error.setup = true; throw error; }
	if (combatRedraw) {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const entry = { mode: 'normal-L2-stopped-combat', inputs: [], swordActionBound: 4 }; report.cases.push(entry);
		try {
			const page = await context.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}/candidate.html`);
			const active = page.locator('#passages .passage:not(.passage-out)');
			const click = async text => { await active.getByText(text, { exact: true }).click(); entry.inputs.push(text); };
			for (const text of ['战斗教学', '站起来，活动一下手脚', '（到达）第 1 层 · 苏醒之地 —— 继续',
				'拾起地上的长剑', '遭遇（往上走之前，先看有什么挡路）', '迎战']) await click(text);
			let won = false;
			for (let i = 0; i < 4; i++) {
				await click('用已装备长剑攻击');
				await page.waitForFunction(() => Array.from(document.querySelectorAll('#passages .passage:not(.passage-out) button'))
					.some(b => ['收下', '用已装备长剑攻击'].includes(b.textContent.trim())), null, { timeout: 15000 });
				if (await active.getByText('收下', { exact: true }).count()) { won = true; break; }
			}
			if (!won) { const error = Error('SCENARIO_UNREACHED: no first victory within four sword actions; no reroll'); error.setup = true; throw error; }
			for (const text of ['收下', '继续探索', '采集（碎石堆｜一次采净 6 件）', '向上，去第 2 层',
				'（到达）第 2 层 · 倒木坡 —— 继续', '遭遇（往上走之前，先看有什么挡路）', '迎战', '空手打击']) await click(text);
			await active.getByText('精英·獾（敌方）', { exact: true }).waitFor();
			entry.prerequisite = await page.evaluate(() => ({ position: SugarCube.setup.BABEL.map.current,
				combatBody: document.body.classList.contains('战中'), run: SugarCube.State.variables.babelRun }));
			if (entry.prerequisite.position !== 'L2' || !entry.prerequisite.combatBody) throw Error('L2_COMBAT_PREREQUISITE');
			entry.decoration = await decorationAudit(page);
			entry.decoration.scope = 'normal L2 stopped combat; named image fault and full-panel redraw, not a CSS-class battle simulation';
			if (entry.decoration.failures.length) rc = 1;
		} finally { await context.close(); }
	}
	for (const mode of combatRedraw ? [] : ['zoom', 'narrow']) {
		const context = await browser.newContext(mode === 'zoom'
			? { viewport: { width: 720, height: 500 }, deviceScaleFactor: 2 }
			: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
		try {
			const page = await context.newPage();
			await page.goto(`http://127.0.0.1:${server.address().port}/candidate.html`);
			for (const text of ['战斗教学', '站起来，活动一下手脚']) {
				await page.locator('#passages .passage:not(.passage-out)').getByText(text, { exact: true }).click();
			}
			await page.waitForFunction(() => SugarCube.setup.BABEL.map.current === 'L1' && getComputedStyle(document.querySelector('#passages .passage:not(.passage-out)')).opacity === '1', null, { timeout: 15000 });
			const stowed = await page.locator('#ui-bar').evaluate(el => el.classList.contains('stowed'));
			if ((mode === 'zoom' && stowed) || (mode === 'narrow' && !stowed)) await page.locator('#ui-bar-toggle').click();
			await settle(page);
			const initial = await measure(page), initialFailures = failures(mode, initial);
			const entry = { mode, initial, initialFailures }; report.cases.push(entry);
			if (initialFailures.length) { rc = 1; continue; }
			entry.decoration = await decorationAudit(page);
			if (entry.decoration.failures.length) { rc = 1; continue; }
			if (selftest) {
				const before = await snapshot(page);
				const style = await page.addStyleTag({ content: mode === 'zoom'
					? '#ui-bar:not(.stowed) ~ #story { margin-left: 3.5em !important; }'
					: '.statusbar { padding-left: 0.6em !important; }' });
				try {
					await settle(page); entry.knife = await measure(page); entry.knifeFailures = failures(mode, entry.knife);
					const expected = mode === 'zoom' ? 'ZOOM_SIDEBAR_OVERLAP' : 'NARROW_PORTRAIT_OVERLAP';
					if (!entry.knifeFailures.includes(expected)) { entry.knifeMissed = expected; rc = 1; }
				} finally { await style.evaluate(el => el.remove()); }
				await settle(page); entry.restored = await measure(page); entry.restoredFailures = failures(mode, entry.restored);
				entry.sourceAndSavesUnchanged = before === await snapshot(page);
				if (entry.restoredFailures.length || !entry.sourceAndSavesUnchanged) rc = 1;
			}
			if (await page.locator('body').evaluate(el => el.classList.contains('战中'))) throw Error('COMBAT_CSS_FIXTURE_PREREQUISITE: expected non-combat body');
			const combatBefore = await snapshot(page);
			await page.locator('body').evaluate(el => el.classList.add('战中'));
			try {
				await settle(page);
				const g = await measure(page), bad = failures('combat-css', g);
				entry.combatCSS = { apparatus: 'DOM-only body class, NOT gameplay/battle/save-permission simulation', initial: g, initialFailures: bad };
				if (bad.length) rc = 1;
				if (selftest && !bad.length) {
					// Zero passage margin alone need not put the title under a short HUD.
					// Pin the title to the HUD's top so both named geometry predicates are exercised.
					const style = await page.addStyleTag({ content: 'body.战中 #story { margin-left: 20em !important; } body.战中 #passages { margin-top: 0 !important; } body.战中 .babel-reading-title { position: fixed !important; top: 0 !important; }' });
					try {
						await settle(page); entry.combatCSS.knife = await measure(page);
						entry.combatCSS.knifeFailures = failures('combat-css', entry.combatCSS.knife);
						if (!['COMBAT_HIDDEN_SIDEBAR_SPACE', 'COMBAT_HUD_TITLE'].every(v => entry.combatCSS.knifeFailures.includes(v))) { entry.combatCSS.knifeMissed = true; rc = 1; }
					} finally { await style.evaluate(el => el.remove()); }
					await settle(page); entry.combatCSS.restored = await measure(page);
					entry.combatCSS.restoredFailures = failures('combat-css', entry.combatCSS.restored);
					if (entry.combatCSS.restoredFailures.length) rc = 1;
				}
			} finally { await page.locator('body').evaluate(el => el.classList.remove('战中')); }
			await settle(page);
			entry.combatCSS.restoredModeFailures = failures(mode, await measure(page));
			entry.combatCSS.sourceAndSavesUnchanged = combatBefore === await snapshot(page);
			if (entry.combatCSS.restoredModeFailures.length || !entry.combatCSS.sourceAndSavesUnchanged) rc = 1;
		} finally { await context.close(); }
	}
} catch (error) {
	rc = error.setup ? 2 : 1; report.error = error.stack ?? String(error);
} finally {
	await browser?.close();
	if (server?.listening) await new Promise(resolve => server.close(resolve));
}
report.rc = rc;
console.log(JSON.stringify(report, null, 2));
process.exitCode = rc;
