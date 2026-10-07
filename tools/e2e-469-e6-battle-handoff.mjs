/* ★`books#469` 承重臂（T 面）：★★**七名河战斗节点**的「应战」须**真交接**到战斗 UI**
 *   ＋ **导航闸两向**（★裁「乙·已处理」）：未处理战斗节点 ⇒ 去 E6 的「继续」**不可达**；处理后 ⇒ **可达且真进 E6**。
 *
 * ## 为什么独立成档（✗ 不并入 `e2e-413-test-mode.mjs`）
 *   ★本臂走的是**真玩家的探索路**（跳过教学 ⇒ 聚落 ⇒ 走向上行门 ⇒ 走进七名河 ✓）；
 *   而 `e2e-413-*` 的前置是**测试模式面**（入场／场次／`babelTest/` ✓）—— ★两套前置在同一次 page 会话里
 *   会互相污染（本席实测：段内 `打斗点击 0 次` ✗、`可点` 同时出现「应战」与「继续」✗）。
 *   ⇒ ★**分开两档**最干净 ✓。★且本臂**要求产物含 `#469` 的修** ⇒ 只能跑在**合后 main** 的产物上 ✓。
 *
 * ## 装置
 *   ★真浏览器（playwright ＋ Chrome）；取法 `SugarCube.setup.BABEL.*`；`goto` 后等 ≥3s（★本席实测时机）。
 *   ★CHROME＋LD_LIBRARY_PATH 见文件头；缺则**具名**报环境错（rc=2），✗ 崩在 import 上。
 * ## 退出码
 *   0 全过；1 有红；2 用法／环境错。
 */
import path from 'node:path';
import { chromium } from 'playwright';

const 产物 = process.argv[2];
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
if (!产物) { console.error('✗ 用法：node tools/e2e-469-e6-battle-handoff.mjs <babel-trial.html 绝对路径>'); process.exit(2); }

let fails = 0, 判据 = 0, 本组失败 = 0;
const ok = (c, m) => { 判据++; if (!c) { fails++; 本组失败++; console.log(`  ✗ ${m}`); } };
const 段 = (t) => console.log(`\n── ${t} ──`);

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await b.newContext()).newPage();
const 页错 = [];
p.on('pageerror', (e) => 页错.push(String(e).slice(0, 200)));
try { await p.goto(`file://${产物}`, { waitUntil: 'load' }); await p.waitForTimeout(3200); }
catch (e) { console.error(`✗ 环境错（浏览器/产物起不来：${CHROME}）：${e?.message ?? e}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); await b.close(); process.exit(2); }

/* ★P1-4 段：七名河**战斗节点**的「应战」须**真交接**到战斗 UI（`books#469`）
 *   ＋ **导航闸正负各一**（裁「乙·已处理」）：未处理战斗节点 ⇒ 「继续」**不可达**；处理后 ⇒ **可达**。
 *
 * 装置：真浏览器（playwright ＋ Chrome）；取法 `SugarCube.setup.BABEL.*`；`goto` 后等 ≥3s（★本席实测时机）。
 * 退出码：0 全过；1 有红；2 环境错。
 */
async function 跑P14(p, ok, 段, 工具 = {}) {
	段('P1-4 七名河战斗节点「应战」⇒ 战斗 UI 交接（＋导航闸）');
	const 点 = async (re) => { const r = await p.evaluate((rx) => {
		const as = [...document.querySelectorAll('#passages a,#passages button')];
		const t = as.find((e) => new RegExp(rx).test(e.textContent)); if (!t) return null; t.click(); return t.textContent.trim();
	}, re); await p.waitForTimeout(1100); return r; };
	/* ★★**钉随机**（承 `e2e-280-fullrun.mjs` 同法 ✓）：骰面取最大 ⇒ **我方必中·敌方必不中** ✓
	 *   ⇒ ✗ 不靠运气：不钉的话（本席实测）同一棵树上会有「3 次打完 ✓」与「8 次没打完 ✗」两形 ⇒ **臂自身不稳** ✓。
	 *   ★序列给足（抽干后引擎**不静默回退** ✓）；本档只跑一段 ⇒ 600 面足够 ✓。 */
	await p.evaluate(() => { try { SugarCube.setup.RPG.rng.setSequence(Array.from({ length: 600 }, () => 1.0)); } catch (e) { /* 无 rng ⇒ 本节由下面的具名格报 */ } });

	const 页 = () => p.evaluate(() => (document.getElementById('passages')?.innerText || '').replace(/\n/g, ' | '));
	const 战UI = () => p.evaluate(() => /空手打击|跳过本回合|用已装备.*攻击/.test(document.getElementById('passages')?.innerText || ''));
	const 态 = () => p.evaluate(() => { const 七 = SugarCube.setup.BABEL.七名河;
		return { 当前: 七.读().当前, 型: 七.读().节点?.type ?? null }; });
	const 有继续链 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')]
		.some((e) => /继续/.test(e.textContent)));

	/* ★① 入口：跳过教学 ⇒ 打开地图 ⇒ 走进七名河（★＝真玩家的路 ✓） */
	const s1 = await 点('跳过教学'); ok(!!s1, `★前置：须能「跳过教学」（实得 ${JSON.stringify(s1)}）`);
	/* ★真玩家路（本席实测顺序）：聚落 ⇒ 「走向上行门」（→ 登记处）⇒ 「穿过单向门，走进七名河」。
	 *   ⚠ 早先误以为「打开地图」会换页 ✗ —— 实测点了页不变；**真正换页的是「走向上行门」** ✓。 */
	const s2 = await 点('走向上行门|上行门'); ok(!!s2, `★前置：须能「走向上行门」（实得 ${JSON.stringify(s2)}）`);
	const s3 = await 点('穿过单向门，走进七名河|走进七名河'); ok(!!s3, `★前置：须能走进七名河（实得 ${JSON.stringify(s3)}）`);
	let st = await 态();
	if (st.当前 === 'E0' && st.型 === 'portal') { await 点('左：奖励|左：'); await 点('观察船头水势|观察'); await 点('左：战斗|左：'); }
	st = await 态();
	ok(st.当前 === 'E3' && st.型 === 'battle', `★前置：须停在**战斗节点** E3（实得 ${JSON.stringify(st)}）`);
	console.log(`  ★状态：${st.当前}（type=${st.型}）`);

	/* ★★② 导航闸·负：**未处理**战斗节点 ⇒ 「继续」（→E6）不可达 ✓ */
	/* ★负闸**只认指向 E6 的那条链**（「继续…逆流水灵」）—— ★早先我用宽 `/继续/` ✗：
	 *   页上另有别的「继续」链（会话层），宽正则会**假红** ✓（我首跑即踩）。 */
	const 有E6链 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')]
		.some((e) => /继续/.test(e.textContent) && /逆流水灵/.test(e.textContent)));
	const 负 = await 有E6链();
	const 负宽 = await 有继续链();
	ok(负 === false, `★★导航闸·负：**未处理**战斗节点 ⇒ 去 E6 的「继续」须**不可达**（✗ 提前放行 ✓；实得 有E6链=${负}｜宽测 /继续/=${负宽}）`);

	/* ★★③ 靶（本笔修的直接对象）：点「应战」⇒ **战斗 UI 可见交接** ✓ */
	const c3 = await 点('应战');
	ok(!!c3, `★P1-4：须能找到并点「应战」（实得 ${JSON.stringify(c3)}）`);
	const ui3 = await 战UI();
	ok(ui3 === true, `★★P1-4：点「应战」后**战斗 UI 须出现**（✗ 静默空转 ✗；实得 ${ui3}）—— 读数 ${JSON.stringify((await 页()).slice(0, 150))}`);
	console.log(`  ★点击=${JSON.stringify(c3)}｜战斗 UI=${ui3}`);

	/* ★④ 打一场 ⇒ 处理后 */
	/* ★打完一场：**优先「攻击」**（✗ 别让 \`跳过本回合\` 先命中 —— 我首版按 DOM 顺序 find
	 *   ⇒ 可能一直点「跳过」⇒ 战斗不结束 ⇒ 连带两格红 ✓ 本席实测踩到 ✓）。 */
	/* ★打完一场（★**耐心**形）：★敌方回合的短暂窗口里按钮会缺位 ✗ ⇒ **✗ 不能据此退出**
	 *   （★我首版 \`if (!战UI()) break\` ⇒ 7 次即误判「打完」✗ ⇒ 连带两格红 ✓ 本席实测踩到 ✓）。
	 *   ★现：缺位 ⇒ 等 700ms 重试；★连续 **12** 次都缺 ⇒ 才判「战斗结束」✓。 */
	let 打过 = 0, 缺位 = 0;
	for (let k = 0; k < 60 && 缺位 < 12; k++) {
		const c = await p.evaluate(() => {
			const as = [...document.querySelectorAll('#passages a,#passages button')];
			const t = as.find((e) => /攻击|空手打击/.test(e.textContent)) || as.find((e) => /跳过本回合/.test(e.textContent));
			if (!t) return null; t.click(); return t.textContent.trim();
		});
		if (!c) { 缺位++; await p.waitForTimeout(700); continue; }
		缺位 = 0; 打过++; await p.waitForTimeout(900);
	}
	console.log(`  ★打斗点击 ${打过} 次｜战后态=${JSON.stringify(await 态())}｜可点=${JSON.stringify((await p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')].map((e) => e.textContent.trim()))).slice(0, 10))}`);
	st = await 态();
	/* ★★⑤ 导航闸·正：**处理后** ⇒ 「继续」**可达** ✓，且点了真进 E6 ✓
	 *   ⚠ 战斗收尾后**页未必已重画** ✗（★与本席早先「状态变了页没变」同族 ✓）⇒ ★先等 ＋ 必要时**强制重渲染**再取链 ✓ */
	await p.waitForTimeout(1500);
	if (!(await 有E6链())) {
		await p.evaluate(() => { try { SugarCube.Engine.play(SugarCube.State.passage); } catch (e) { void e; } });
		await p.waitForTimeout(1200);
	}
	const 正有 = await 有E6链();
	const 点继续 = 正有 ? await 点('继续') : null;
	const st2 = await 态();
	ok(st2.当前 === 'E6', `★★导航闸·正：**处理后** ⇒ 「继续」须**可达**且真进 E6（有链=${正有}｜点=${JSON.stringify(点继续)}｜实得 当前=${st2.当前}）`);
	console.log(`  ★战后=${JSON.stringify(st)}｜正闸链=${正有}｜点继续=${JSON.stringify(点继续)}｜当前=${st2.当前}`);

	/* ★⑥ E6（**报告 §4 的原始现场**）：点「应战」⇒ 战斗 UI 须出现 ✓ */
	const c6 = await 点('应战');
	const ui6 = await 战UI();
	ok(ui6 === true, `★★P1-4·原始现场（E6「逆流水灵」）：点「应战」后**战斗 UI 须出现**（实得 ${ui6}）—— 读数 ${JSON.stringify((await 页()).slice(0, 170))}`);
	console.log(`  ★E6 点击=${JSON.stringify(c6)}｜战斗 UI=${ui6}`);
	return { 到E3: st?.当前 ?? null, 到E6: st2?.当前 ?? null, UI3: ui3, UI6: ui6 };
}

/* ★跑该段（★本档只有这一段） */
try { await 跑P14(p, ok, 段); } catch (e) { ok(false, `★段崩：${e?.message ?? e}`); }

ok(页错.length === 0, `★全程不得有 pageerror（实得 ${JSON.stringify(页错)?.slice(0, 200)}）`);
await b.close();
console.log(`\n${本组失败 === 0 ? '✓' : '✗'} books#469 承重臂：${本组失败 === 0 ? '全绿' : `★本组 ${本组失败} 处失败`} —— **${判据} 条判据**`);
process.exit(fails === 0 ? 0 : 1);
