/* books#311: full SugarCube artifact, jsdom DOM and deliberately injected image events.
 * Not a real-browser layout/font/decode test or a normal-player playthrough.
 * Fixed input: prebuilt stories/babel/babel-trial.html from the declared engine tree.
 * 0 assertions green; 1 assertion/product exception; 2 usage/environment failure.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolveEnv, boot, playPassage, unhandledErrors } from './e2e-harness.mjs';

let env;
try {
	const args = process.argv.slice(2);
	if ((args.length !== 2 && !(args.length === 3 && args[2] === '--selftest')) || args[0] !== '--engine') throw new Error('usage: node tools/e2e-311-visual.mjs --engine <engine-tree> [--selftest]');
	const pin = JSON.parse(fs.readFileSync(new URL('../.github/engine-ref.json', import.meta.url), 'utf8')).ref;
	const actual = execFileSync('git', ['-C', path.resolve(args[1]), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
	if (actual !== pin) throw new Error(`engine HEAD ${actual} differs from declared full pin ${pin}`);
	env = resolveEnv(args[1]);
} catch (error) {
	console.error(error.message);
	process.exit(2);
}
let session;
let total = 0;
const failures = [];
const surfaces = {};
const ok = (condition, message) => { total++; if (!condition) failures.push(message); };
const selftest = process.argv.includes('--selftest');
try {
	session = await boot(env);
	const { SC, doc, window } = session;
	const R = SC.setup.RPG;
	const visual = SC.setup.BABEL.visual;
	const assets = SC.setup.storyAssets;
	const manifest = JSON.parse(fs.readFileSync(path.join(env.storyDir, 'story.json'), 'utf8'));
	ok(!!assets && Object.isFrozen(assets) && Object.getPrototypeOf(assets) === null, 'actual artifact has no frozen, null-prototype asset table');
	ok(!!assets && Object.keys(assets).sort().join('|') === Object.keys(manifest.assets).sort().join('|'), 'actual artifact does not contain exactly the declared assets');
	if (!assets) throw new Error('artifact prerequisite failed: missing storyAssets');
	for (const [id, relative] of Object.entries(manifest.assets)) {
		const raw = fs.readFileSync(path.join(env.storyDir, relative));
		const asset = assets[id];
		ok(!!asset && Object.isFrozen(asset) && asset.mime === 'image/svg+xml', `${id}: missing/faulty descriptor`);
		ok(asset?.src === `data:image/svg+xml;base64,${raw.toString('base64')}` && asset?.sha256 === crypto.createHash('sha256').update(raw).digest('hex'), `${id}: embedded bytes/digest differ from declared source`);
	}
	const player = doc.querySelector('#passages img.babel-player-art');
	ok(!!player && player.width === 320 && player.height === 400, 'footer portrait absent or lacks intrinsic dimensions');
	ok(!!player && player.getAttribute('alt') === '' && player.getAttribute('aria-hidden') === 'true' && !player.closest('button,a'), 'decorative portrait became an action or redundant text');
	ok(doc.querySelectorAll('#passages .babel-reading-title').length === 1, 'reading heading duplicated/missing on initial passage');
	ok(doc.querySelector('#passages .babel-reading-title')?.nextElementSibling?.classList.contains('babel-scene-frame'), 'header formatting became extra blank rendered lines');
	ok(!!doc.querySelector('#passages .footersave') && !doc.querySelector('#passages .footersave br'), 'footer source formatting became blank lines inside system controls');
	const storage = () => Object.fromEntries(Object.keys(window.localStorage).sort().map((key) => [key, window.localStorage.getItem(key)]));
	const snapshot = () => JSON.stringify({ variables: SC.State.variables, turns: SC.State.turns, passage: SC.State.passage, storage: storage() });
	const sequence = () => {
		const passage = doc.querySelector('#passages .passage:not(.passage-out)');
		const walk = doc.createTreeWalker(passage, window.NodeFilter.SHOW_TEXT), nodes = [];
		for (let node = walk.nextNode(); node; node = walk.nextNode()) if (node.nodeValue.trim()) nodes.push(node.nodeValue);
		return { text: passage.textContent, nodes, paragraphs: Array.from(passage.querySelectorAll('p'), p => p.textContent) };
	};
	const decorationInParagraph = () => !!doc.querySelector('#passages .passage:not(.passage-out) p img[data-babel-asset]');
	const before = snapshot(), textBefore = sequence();
	ok(textBefore.nodes.length > 0, 'text-sequence prerequisite: no meaningful rendered text nodes');
	ok(!decorationInParagraph(), 'decorative image entered the paragraph sequence');
	if (selftest) {
		const title = doc.querySelector('.babel-reading-title'), probe = doc.createTextNode('具名正文刀');
		try { title.append(probe); ok(JSON.stringify(sequence()) !== JSON.stringify(textBefore), 'TEXT_SEQUENCE_CHANGED knife missed'); }
		finally { probe.remove(); }
		ok(JSON.stringify(sequence()) === JSON.stringify(textBefore), 'text knife did not restore the exact sequence');
		const paragraph = doc.createElement('p'); paragraph.append(player.cloneNode());
		try { doc.querySelector('#passages .passage:not(.passage-out)').append(paragraph); ok(decorationInParagraph(), 'DECORATION_IN_PARAGRAPH knife missed'); }
		finally { paragraph.remove(); }
		ok(!decorationInParagraph() && JSON.stringify(sequence()) === JSON.stringify(textBefore), 'paragraph knife did not restore decoration placement/text');
		surfaces.textKnives = ['TEXT_SEQUENCE_CHANGED', 'DECORATION_IN_PARAGRAPH'];
	}
	if (player) {
		// Named fault fixture: jsdom does not decode images, so inject DOM error explicitly.
		player.dispatchEvent(new window.Event('error'));
		ok(player.hidden === true, 'synthetic image error did not hide its decoration');
		const sameText = JSON.stringify(sequence()) === JSON.stringify(textBefore);
		ok(sameText, 'image failure changed the exact rendered text sequence');
		player.dispatchEvent(new window.Event('load'));
		surfaces.imageFailure = { synthetic: true, hidden: player.hidden, textSequenceUnchanged: sameText };
	}
	const faultSourcesSame = snapshot() === before;
	ok(faultSourcesSame, 'synthetic image error/load changed domain, passage, turn count or saves');
	if (surfaces.imageFailure) surfaces.imageFailure.domainAndSavesUnchanged = faultSourcesSame;
	const random = window.Math.random;
	const rng = new Map(Object.entries(R.rng).filter(([, value]) => typeof value === 'function'));
	const trap = () => { throw new Error('visual redraw consumed randomness'); };
	try {
		window.Math.random = trap;
		for (const name of rng.keys()) R.rng[name] = trap;
		for (let i = 0; i < 20; i++) {
			visual.playerHTML(); visual.itemHTML('sword'); visual.enemyHTML({ name: '幼獾' }); visual.sceneHTML();
			R.refreshPanels();
		}
		const textAfter = sequence(), sameText = JSON.stringify(textAfter) === JSON.stringify(textBefore), sameSources = snapshot() === before;
		ok(sameSources, '20 panel/decorative redraws changed domain or saves');
		ok(sameText, 'full-panel redraw changed the exact rendered text sequence');
		surfaces.fullPanelRedraw = { redraws: 20, textSequenceUnchanged: sameText, domainAndSavesUnchanged: sameSources,
			textNodeCount: textBefore.nodes.length, paragraphCount: textBefore.paragraphs.length, before: textBefore, after: textAfter,
			scope: 'initial passage only; does not clear the historical in-combat first red' };
	} finally {
		window.Math.random = random;
		for (const [name, value] of rng) R.rng[name] = value;
	}
	const descriptor = Object.getOwnPropertyDescriptor(SC.setup, 'storyAssets');
	try {
		Object.defineProperty(SC.setup, 'storyAssets', { value: undefined, configurable: true });
		ok(visual.playerHTML() === '' && visual.itemHTML('sword') === '' && visual.enemyHTML({ name: '幼獾' }) === '', 'missing-registry fixture did not return text-only decorations');
		R.refreshPanels();
		ok(snapshot() === before, 'missing-registry redraw changed state or saves');
	} finally {
		Object.defineProperty(SC.setup, 'storyAssets', descriptor);
	}
	ok(visual.itemHTML('unknown') === '' && visual.enemyHTML({ name: '未见角色' }) === '', 'unknown content received unrelated artwork');
	// Named navigation fixture, not player input: reproduce asynchronous map entry
	// after PassageHeader has rendered; the scene must use the existing panel refresh.
	await playPassage(session, '探索');
	for (let i = 0; i < 50 && SC.setup.BABEL.map?.current !== 'L1'; i++) await new Promise((resolve) => setTimeout(resolve, 20));
	ok(SC.setup.BABEL.map?.current === 'L1', 'initial map-entry fixture did not establish L1');
	const scene = doc.querySelector('#passages .babel-scene-frame img');
	ok(scene?.dataset.babelAsset === 'babel-scene-l1' && scene.width === 1280 && scene.height === 360, 'initial L1 backdrop missing/stale after asynchronous entry');
	const afterEntry = snapshot(), entryText = sequence();
	R.refreshPanels();
	ok(snapshot() === afterEntry, 'map-entry decoration redraw changed state or saves');
	const entryTextSame = JSON.stringify(sequence()) === JSON.stringify(entryText);
	ok(entryTextSame, 'initial-map full-panel redraw changed the exact rendered text sequence');
	surfaces.initialMapRedraw = { textSequenceUnchanged: entryTextSame, textNodeCount: entryText.nodes.length, paragraphCount: entryText.paragraphs.length };
	const errors = unhandledErrors(session);
	ok(errors.bad.length === 0, `unhandled artifact errors: ${errors.bad.join(' | ')}`);
	console.log(JSON.stringify({ apparatus: 'jsdom; synthetic image events and named Engine.play initial-map fixture; no layout/font/decode verdict', total, passed: total - failures.length, failed: failures.length, redraws: 20, surfaces, ignoredConsoleNoise: errors.ignored, warnings: session.consoleMsgs.filter((entry) => entry.kind === 'warn').map((entry) => entry.msg) }, null, 2));
} catch (error) {
	failures.push(error.stack ?? String(error));
} finally {
	session?.dom.window.close();
}
for (const failure of failures) console.error(`FAIL: ${failure}`);
process.exitCode = failures.length ? 1 : 0;
