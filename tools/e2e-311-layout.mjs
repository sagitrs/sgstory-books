/* books#311: native Chromium geometry, two fresh contexts, no domain injection.
 * 720x500/DPR2 models the CSS viewport observed at desktop 200% zoom; it is NOT
 * a toolbar-zoom test. 390x844/DPR1 is simulated touch, not a physical device.
 * A named DOM-only combat-CSS fixture toggles the inherited body class, NOT the
 * game phase, and checks hidden-sidebar spacing and fixed-HUD clearance.
 * --selftest: four temporary CSS overrides; named failures and restored sources.
 * Local/manual entry (not called by CI). 0 passed; 1 product/assertion; 2 setup.
 * Usage: PW_DIR=<playwright parent> CHROME_BIN=<exe> node tools/e2e-311-layout.mjs
 *        --books <books-tree> --engine <exact-pin-tree> [--selftest]
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

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
	if (!html.includes(Buffer.from('setup.storyAssets')) || !html.includes(Buffer.from('babel-player-art'))) throw Error('rebuild artifact with declared assets first');
	chromium = createRequire(path.join(path.resolve(process.env.PW_DIR), 'noop.js'))('playwright').chromium;
	chrome = path.resolve(process.env.CHROME_BIN);
	fs.accessSync(chrome, fs.constants.X_OK);
} catch (error) {
	console.error(`SETUP: ${error.message}`); process.exit(2);
}
const selftest = args.includes('--selftest');
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
const report = { apparatus: 'Chromium CSS-viewport geometry; no physical-device, toolbar zoom, font or eight-image decode verdict',
	artifact: { bytes: html.length, sha256: crypto.createHash('sha256').update(html).digest('hex') }, selftest, cases: [] };
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
	for (const mode of ['zoom', 'narrow']) {
		const context = await browser.newContext(mode === 'zoom'
			? { viewport: { width: 720, height: 500 }, deviceScaleFactor: 2 }
			: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
		try {
			const page = await context.newPage();
			await page.goto(`http://127.0.0.1:${server.address().port}/candidate.html`);
			for (const text of ['睁开眼（普通）', '站起来，活动一下手脚']) {
				await page.locator('#passages .passage:not(.passage-out)').getByText(text, { exact: true }).click();
			}
			await page.waitForFunction(() => SugarCube.setup.BABEL.map.current === 'L1' && getComputedStyle(document.querySelector('#passages .passage:not(.passage-out)')).opacity === '1', null, { timeout: 15000 });
			const stowed = await page.locator('#ui-bar').evaluate(el => el.classList.contains('stowed'));
			if ((mode === 'zoom' && stowed) || (mode === 'narrow' && !stowed)) await page.locator('#ui-bar-toggle').click();
			await settle(page);
			const initial = await measure(page), initialFailures = failures(mode, initial);
			const entry = { mode, initial, initialFailures }; report.cases.push(entry);
			if (initialFailures.length) { rc = 1; continue; }
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
