/* books#599：真实 Chromium 的搬运队 UI、原件正反例、真 Save.slots 往返及刷新。
 * 复用 e2e-harness 的环境/boot；不改共享装置、不接 CI。
 * 前件夹具：真实点击“跳过教学”后加 30 枚旧硬币、用共享 rng 钉高骰；在正常 UI 买卷轴、走既有教程，再进 L11。
 * 不注入地图位置、主路战果、本链阶段、救助、放行或奖励；不证明自然经济/真实随机平衡。
 * 唯一负夹具是把原件换成同名同来历的新实体。
 * 正文态＝当前 #passages 段落，去掉脚本、通知域、页脚；不读 body 源码。
 * 用法：CHROME_BIN=<chrome> LD_LIBRARY_PATH=<依赖目录> node tools/e2e-599-lamplighter.mjs --engine <pin检出> [--runs 5] [--selftest] [--evidence <目录>]
 * playwright/jsdom 默认从引擎的 node_modules 解析；PW_DIR 可指定另一依赖目录。
 * 0=实跑通过，1=判据失败，2=环境作废/未跑。缺环境绝不当绿。
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { resolveEnv, boot } from './e2e-harness.mjs';
const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const engine = arg('--engine'), runs = Number(arg('--runs') ?? 1), selftest = process.argv.includes('--selftest');
const planned = 22;
const scratchRoot = path.join(os.homedir(), 'tmp');
fs.mkdirSync(scratchRoot, { recursive: true });
const evidence = path.resolve(arg('--evidence') ?? fs.mkdtempSync(path.join(scratchRoot, 'babel-599-evidence-')));
const books = path.resolve(import.meta.dirname, '..');
const git = (dir, ...args) => {
	const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' });
	if (r.status !== 0) throw Error(r.stderr || 'git 取证失败');
	return r.stdout.trim();
};
let env, browser, C, metadata;
try {
	if (!engine || !Number.isSafeInteger(runs) || runs < 1) throw Error('需要 --engine；--runs 须为正整数');
	const pin = spawnSync(process.execPath, [path.join(books, 'tools/check-engine-pin.mjs'), '--engine', engine], { cwd: books, encoding: 'utf8' });
	if (pin.status !== 0) throw Error(pin.stderr || pin.stdout || 'pin 不符');
	env = resolveEnv(engine);
	const host = await boot(env);
	try {
		if (!host.SC.setup.BABEL.搬运队?.read) { const e = Error('真实产物搬运队接口缺席'); e.productFailure = true; throw e; }
		C = JSON.parse(JSON.stringify(host.SC.setup.BABEL_CONTENT.搬运队));
	} finally { host.window.close(); }
	const req = createRequire(path.join(path.resolve(process.env.PW_DIR ?? engine), 'package.json'));
	const { chromium } = req('playwright');
	const executablePath = process.env.CHROME_BIN ?? chromium.executablePath();
	if (!fs.existsSync(executablePath)) throw Error('找不到 Chromium；请设 CHROME_BIN，并按机器需要设 LD_LIBRARY_PATH');
	browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
	metadata = { booksHead: git(books, 'rev-parse', 'HEAD'), engineHead: git(path.resolve(engine), 'rev-parse', 'HEAD'),
		booksStatus: git(books, 'status', '--porcelain'), artifactSha256: createHash('sha256').update(fs.readFileSync(env.htmlPath)).digest('hex'),
		browser: await browser.version(), node: process.version,
		coverage: '本地真浏览器实跑；非 CI；普通 UI 入口，30 旧硬币/高骰前件夹具，不证明自然经济/教程随机平衡' };
} catch (e) { console.error(`${e.productFailure ? '产品缺席／判据红' : '环境作废／未跑'}：${e.message}`); await browser?.close(); process.exit(e.productFailure ? 1 : 2); }
fs.mkdirSync(evidence, { recursive: true });

async function run(html, tag) {
	const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
	const p = await context.newPage(), rows = [], errors = [], reads = [];
	const result = (extra) => {
		const passed = rows.filter((x) => x.passed).length, failed = rows.length - passed, uncovered = Math.max(0, planned - rows.length);
		return { tag, ...extra, rows, errors, counts: { suitePlanned: planned, passed, productFailed: failed, environmentInvalid: 0, uncovered, problemTotal: failed + uncovered } };
	};
	p.on('pageerror', (e) => errors.push(e.message));
	const read = () => p.evaluate(() => {
		const S = SugarCube, B = S.setup.BABEL, Q = B.搬运队, R = S.setup.RPG, P = S.setup.DND3.Player;
		const h = document.querySelector('#passages .passage:last-of-type');
		const body = h?.cloneNode(true);
		body?.querySelectorAll('script,style,[data-panel],.statusbar,.noticebar,.bagbar').forEach((x) => x.remove());
		return { passage: S.State.passage, location: B.map.current, story: Q.read(), proof: Q.hasProof(),
			bag: P.items, hp: P.hp, coin: R.heldTotal(P, 'coin'), inBattle: B.战中, poultice: R.heldTotal(P, 'herb-poultice'), bandage: R.heldTotal(P, 'bandage'),
			dialogs: [...document.querySelectorAll('#ui-dialog a,#ui-dialog button')].map((x) => ({ id: x.id, text: x.textContent.trim() })),
			labels: [...document.querySelectorAll('#passages a,#passages button')].map((x) => x.textContent.trim()),
			body: body?.textContent ?? '', errors: [...(h?.querySelectorAll('.error,.error-view') ?? [])].map((x) => x.textContent),
			city: S.State.variables.babelL10, run: S.State.variables.babelRun };
	});
	const check = async (code, cond) => {
		const r = await read(); reads.push({ code, ...r });
		const passed = !!cond(r) && r.errors.length === 0;
		rows.push({ code, passed });
		if (!passed) { const e = Error(`${code}：实际读数见证据`); e.code = code; throw e; }
		return r;
	};
	const click = async (label) => {
		const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const loc = p.locator('#passages a:visible,#passages button:visible').filter({ hasText: new RegExp(`^${escaped}$`) });
		await loc.first().waitFor({ state: 'visible', timeout: 10000 });
		if (await loc.count() !== 1) throw Error(`按钮不唯一：${label}`);
		await loc.click(); // 真实鼠标；点前后不调用 show()/人为重绘。
	};
	const arrival = async () => {
		const r = await read(), label = await p.evaluate(() => {
			const B = SugarCube.setup.BABEL; return `（到达）${B.map.locations.get(B.map.current).name} —— 继续`;
		});
		const loc = p.getByRole('button', { name: label, exact: true });
		if (await loc.count()) await loc.click();
		await p.waitForFunction(() => !SugarCube.setup.BABEL.战中);
		return r;
	};
	const returnByScroll = async () => {
		const item = p.locator('[data-panel="inventory"] a:visible').filter({ hasText: /^回城卷轴×1$/ });
		await item.click();
		const use = p.locator('#passages a:visible,#passages button:visible').filter({ hasText: /^使用$/ });
		if (await use.count()) await use.click();
	};
	const load = async (slot) => {
		// 宿主原生侧栏载入是真 UI：它自己重建段落；不能用 API load 后人为 show 掩掉残影。
		await p.locator('#menu-item-saves a').filter({ hasText: /^存档$/ }).click();
		await p.locator(`#saves-load-${slot}`).and(p.getByRole('button', { name: `载入 槽位 ${slot + 1}`, exact: true })).click(); // 图标钮按可访问名称完全相等，不靠空文本。
		await p.waitForFunction(() => SugarCube.Engine.isIdle());
	};
	const save = async (slot) => {
		const ok = await p.evaluate((i) => { SugarCube.Save.slots.save(i, '搬运队中间阶段'); return SugarCube.Save.slots.has(i); }, slot);
		if (!ok) throw Error('真实 Save.slots 未落档');
	};
	try {
		await p.goto(pathToFileURL(html).href);
		await click('跳过教学');
		await check('REAL_START', (r) => r.location === 'L10-camp' && r.story === null && r.poultice === 2);
		// 明示旧世界资源/骰子前件；其后只点正常 UI，不伪造教程完成、地图位置或本链事实。
		await p.evaluate(() => {
			const S = SugarCube, R = S.setup.RPG;
			R.deposit(S.setup.DND3.Player.items, 'coin', 30);
			R.rng.setSequence(Array.from({ length: 1000 }, () => 1));
			R.setNoticeFilter('key'); // 本链正文还须能在“仅关键”档看见。
		});
		await click('在共炉边换一张回城卷轴（30 枚旧硬币；候选）');
		await click('走向上行门'); await click('走进七名河（单向门）');
		for (const next of ['E1', 'E4', 'E6', 'E8', 'E9']) {
			const node = await p.evaluate(() => SugarCube.setup.BABEL.七名河.读());
			if (node.节点.options?.length && node.当前 !== 'E0') {
				// 谢绝奖励；E6 是合法绕行，固定高骰使逃脱成功。这不写/跳过战果。
				await click(node.节点.options.at(-1).label);
			}
			const label = node.导航.find((x) => x.to === next)?.label;
			if (!label) throw Error(`教程 UI 前件路径不成立：${node.当前} → ${next}`);
			await click(label);
		}
		await click('确认回城（用掉本次传送机会）');
		await click('走向上行门');
		const tower = await p.evaluate(() => {
			const e = SugarCube.setup.BABEL.map.exitsFrom('L10-gate').find((x) => x.to === 'L11');
			return typeof e?.text === 'function' ? e.text() : e?.text;
		});
		if (!tower) throw Error('教程完成后普通塔门不在 UI 前件中');
		await click(tower); await arrival();
		await click(C.发现入口);
		await check('DISCOVERY_COST_VISIBLE', (r) => r.story.stage === 'seen' && r.body.includes(C.成本));
		await click(C.回矿道); await arrival(); await click(C.发现入口);
		await check('LEAVE_IS_NOT_REFUSAL', (r) => r.story.stage === 'seen' && r.poultice === 2 && !r.proof);
		await click(C.递粮);
		await check('NO_RATION_REFUSED', (r) => r.story.stage === 'seen' && r.poultice === 2 && !r.proof && r.body.includes(C.补给不足));
		await click(C.敷料);
		const fed = await check('SUPPLY_NOT_RESCUE', (r) => r.story.stage === 'fed' && r.poultice === 1 && !r.proof);
		await save(6);
		await click(C.扶离);
		const rescued = await check('REAL_TOKEN', (r) => r.story.stage === 'rescued' && r.proof && r.bag.some((x) => x.entityId === r.story.token && x.id === 'lamplighter-clasp'));
		await load(6);
		await check('REAL_SAVE_RESTORES_MIDDLE', (r) => r.story.stage === 'fed' && r.poultice === fed.poultice && !r.proof && !r.bag.some((x) => x.id === 'lamplighter-clasp'));
		await p.reload();
		await p.waitForFunction(() => SugarCube?.Engine?.isIdle());
		await check('RELOAD_RESTORES_MIDDLE', (r) => r.story.stage === 'fed' && r.location === 'L11-lamplighter' && r.poultice === 1 && !r.proof);
		await click(C.扶离);
		await check('RESCUE_AFTER_LOAD', (r) => r.story.stage === 'rescued' && r.proof && r.poultice === 1);
		await click(C.回矿道); await arrival(); await click('向上，去第 12 层'); await arrival();
		await click(C.守路入口);
		await save(7);
		// 同名、同来历，但身份不同：此负夹具专门证明不能按名字/definitionId 冒领。
		await p.evaluate(() => {
			const S = SugarCube, Q = S.setup.BABEL.搬运队, P = S.setup.DND3.Player, R = S.setup.RPG;
			P.items = P.items.filter((x) => x.entityId !== Q.read().token);
			R.deposit(P.items, Q.tokenId, 1); P.items.find((x) => x.id === Q.tokenId).state = { origin: Q.origin };
		});
		await click(C.出示);
		await check('FAKE_TOKEN_REJECTED', (r) => r.story.stage === 'rescued' && r.story.guard === 'unmet' && !r.proof && r.body.includes(C.信物拒绝));
		await load(7);
		await check('REAL_SAVE_RESTORES_TOKEN', (r) => r.proof && r.story.guard === 'unmet');
		await click(C.开战入口); await click(C.退旧道);
		await check('CANCEL_NO_ENEMY_OR_REWARD', (r) => r.story.guard === 'unmet' && r.story.foes === null && !r.story.claimed);
		await click(C.出示);
		await check('REAL_GUARD_CONSEQUENCE', (r) => r.story.guard === 'passed' && r.proof && r.body.includes(C.和平通过));
		await click(C.进入旧室);
		const beforeMedicine = await read();
		await click(C.取绷带);
		const claimed = await check('ONE_STOCK', (r) => r.story.claimed && r.bandage === beforeMedicine.bandage + 2); // 既有绷带每份两次，非本样板改数值。
		await click(C.回旧道); await click(C.进入旧室);
		await check('REVISIT_NO_REWARD', (r) => r.story.claimed && r.bandage === claimed.bandage && r.body.includes(C.储备已取));
		await click(C.回旧道); await click(C.回虫巢);
		// 使用起手按正常城市价格买的真实卷轴，不伪造返城或清路账。
		await returnByScroll();
		await click(C.共炉入口);
		const city = await check('NPC_REMEMBERS_ACTUAL_HELP', (r) => r.location === 'L10-camp' && r.story.reported.guard === 'passed' && r.body.includes(C.共炉和平));
		await click(C.共炉入口);
		await check('NPC_REPEATED_NO_GIFT', (r) => JSON.stringify(r.bag) === JSON.stringify(city.bag) && JSON.stringify(r.city) === JSON.stringify(city.city) && r.hp === city.hp);
		await save(6); await load(6);
		await check('SAVED_FINAL_FACTS', (r) => r.story.claimed && r.story.reported.guard === 'passed' && r.story.stage === 'rescued');
		await p.screenshot({ path: path.join(evidence, `${tag}-city.png`), fullPage: true });
		// 回到真实守路前存档，走另一条实际 UI/引擎战斗，不写 victory/敌人 HP 替身。
		await load(7);
		const beforeWar = await read();
		await click(C.开战入口); await click(C.开战);
		for (let phase = 0; phase < 25; phase++) {
			if ((await read()).story.guard === 'defeated') break;
			const choices = p.locator('#passages .choice-box button:visible');
			await choices.first().waitFor({ state: 'visible', timeout: 10000 });
			const labels = await choices.allTextContents();
			const action = labels.find((x) => x.includes('淬火长剑')) ?? labels.find((x) => x.includes('攻击')) ?? labels.find((x) => x.includes(C.守路人));
			if (!action) throw Error(`战斗 UI 没有可辨认攻击/目标：${JSON.stringify(labels)}`);
			await click(action.trim());
		}
		await check('REAL_BATTLE_NOT_FAKE_RESULT', (r) => r.story.guard === 'defeated' && r.story.foes[0].hp <= 0 && r.story.foes[0].entityId && r.run.kills === beforeWar.run.kills + 1);
		await check('BATTLE_NO_RANDOM_STOCK', (r) => !r.story.claimed && r.coin === beforeWar.coin && r.bandage === beforeWar.bandage);
		await click(C.退旧道); await click(C.回虫巢); await returnByScroll();
		await click(C.共炉入口);
		await check('NPC_SEPARATES_HELP_AND_HARM', (r) => r.story.stage === 'rescued' && r.story.reported.guard === 'defeated' && r.body.includes(C.共炉冲突) && !r.body.includes(C.共炉和平));
		await p.evaluate(() => SugarCube.Engine.restart());
		await p.getByText('跳过教学', { exact: true }).waitFor();
		await click('跳过教学');
		await check('NEW_RUN_NO_INHERITANCE', (r) => r.story === null && !r.proof && !r.bag.some((x) => x.id === 'lamplighter-clasp'));
		if (errors.length) throw Error(`未处理异常：${errors.join(';')}`);
		if (rows.length !== planned) throw Error(`具名例数与索引不同：${rows.length}/${planned}`);
		return result({ status: 0, tokenBeforeLoad: rescued.story.token });
	} catch (e) {
		try {
			reads.push({ code: 'FAILED_LAST_DOM', ...await read() });
			await p.screenshot({ path: path.join(evidence, `${tag}-failed.png`), fullPage: true });
		} catch (observe) { errors.push(`末态读取失败：${observe.message}`); }
		if (!rows.some((x) => !x.passed)) {
			if (rows.length < planned) rows.push({ code: e.code ?? 'UI_DRIVE_FAILED', passed: false });
			else { rows.at(-1).passed = false; rows.at(-1).cause = e.message; }
		}
		return result({ status: 1, code: e.code ?? 'UI_DRIVE_FAILED', message: e.message });
	} finally {
		fs.writeFileSync(path.join(evidence, `${tag}-readings.json`), JSON.stringify(reads, null, 2));
		await context.close();
	}
}
const results = [];
let status = 0, knife;
try {
	for (let i = 0; i < runs; i++) {
		const r = await run(env.htmlPath, `baseline-${i + 1}`); results.push(r);
		console.log(`${r.tag}：${r.rows.filter((x) => x.passed).length}/${r.rows.length}｜产品失败 ${r.rows.filter((x) => !x.passed).length}｜环境作废 0｜未覆盖 ${r.counts.uncovered}｜${r.status === 0 ? '实跑通过' : `红 ${r.code} ${r.message}`}`);
		if (r.status !== 0) { status = 1; break; }
	}
	if (selftest && status === 0) {
		const source = fs.readFileSync(env.htmlPath, 'utf8'), anchor = 'x.id === tokenId && x.entityId === s.token && x.state?.origin === origin';
		if (source.split(anchor).length !== 2) throw Error('刀锚失效，不能冒充反例执行');
		knife = path.join(path.dirname(env.htmlPath), `babel-599-knife-${process.pid}.html`);
		fs.writeFileSync(knife, source.replace(anchor, 'x.id === tokenId && x.state?.origin === origin'));
		const bad = await run(knife, 'knife-identity'); results.push(bad);
		const bitten = bad.status === 1 && bad.code === 'FAKE_TOKEN_REJECTED';
		console.log(`身份刀：${bitten ? '具名咬住 FAKE_TOKEN_REJECTED' : `无效 ${JSON.stringify(bad)}`}`);
		if (!bitten) status = 1;
		const restored = await run(env.htmlPath, 'restored'); results.push(restored);
		console.log(`复原：${restored.rows.filter((x) => x.passed).length}/${restored.rows.length}｜rc=${restored.status}`);
		if (restored.status !== 0) status = 1;
	}
} catch (e) { console.error(`环境作废／未完整跑：${e.message}`); status = 2; }
finally {
	if (knife) fs.rmSync(knife, { force: true });
	await browser.close();
	fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ metadata, status, results }, null, 2));
}
console.log(`证据：${evidence}｜本地实跑 rc=${status}（非 CI）`);
process.exit(status);
