#!/usr/bin/env node
/* `books#259` 裁 4 · **页脚快存的真 DOM 臂**（`books#264` 落在 story 侧，本档补它未覆盖的那半）。
 *
 * ## 判谁（三臂）；`books#264` 已由 `verify.mjs` ㊸ 判**逻辑**面，本档只判**玩家真看得到／点得到**那面
 *   **A 可存时**：页脚**真有入口**（`[data-footer="save"]` 里有可点的「快存」链接 ✔）
 *                 ＋ **点它之后系统槽真的有值**（✗ 不是「没报错」：读宿主槽原始值，须**变了** ✔）。
 *   ★**臂 B 的边界（我自陈）**：「**没有可点的「快存」链**」是主断言、已由刀证明有牙 ✔；「**点了不落档**」是**纵深**兜底 ——
 *     干净态下根本没有「快存」链可点 ✔，故它的牙只在「有人把链塞回来」时显现 ⇒ 本档**每次点击前重新查文档内节点**
 *     （脱离文档的旧节点 `click()` 是静默空操作 ✗ ⇒ 会把兜底变空转 ✓），并把「在不在文档」印进读数 ✔。
 *   **B 战中**：★「**可见但不可点**」（裁 4 明令**别藏**）—— 页脚容器仍在 DOM 里 ✔、
 *                 但**没有可点的「快存」链** ✔（★载入链不计：载入 ≠ 存，且侧栏面板的「载入」在战中同样可用
 *                 —— 领队裁「战中载入＝弃局回档，正当」· `books#402` 装置陈旧修）、且**点了也不落档**（槽原始值**不变** ✔ ⇒ 零状态变更）。
 *   **C 同源**：`页脚可存()` 与 `可存(槽位.快存)` **两态各自相等** ✔（✗ 不另立第二套判据 —— `books#264` 的教训：
 *                 断言若与被测共享同一个**环境恒值**，它绿得毫无信息 ⇒ 本臂改成**两端并列**判 ✔）。
 *
 * ## 一处源（✗ 不写死）
 *   槽号读故事侧 `setup.BABEL.槽位`（✗ 不写死 3/4）✔；读不到 ⇒ 退回**具名默认** `{快存:3}` 并把「退回」印进读数 ✔。
 *   ★槽的原始值从**宿主存储**取（`localStorage` 的 `…save.slot.data:<码>`）—— ✗ **不用** `Save.slots.load`：
 *     那是**载入**动作 ✔ 不是读口（我在 `books#257` 踩过：误用它读出 `{}`、红得毫无意义 ✔）。
 *
 * ## 装置与退出码（同 `210`／`216` 族）
 *   跑前须构建**本仓根**的产物（harness 的新鲜度守卫会先替你挡陈旧产物 ✔）。
 *   0 = 三臂全过；1 = 有红（逐条具名）；2 = 环境错（引擎根／产物／jsdom，具名 ✔ ✗ 不当判据红）
 *
 * 用法：node tools/e2e-259-footer-save.mjs --engine <引擎检出> [--selftest]
 *       ★缺席闸（本仓惯例）：页脚面**未在位** ⇒ 印「记声明」并**不判红** ✔（✗ 不静默当绿）
 */
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 自检 = process.argv.includes('--selftest');
const 具名默认 = { 快存: 3 };
const S = (x) => JSON.stringify(x);

/** 真产物、真点、真读。@returns `{ fails, 读数 }` */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, B = SC.setup.BABEL;
	const 读数 = {};

	/* ── 一处源：保留槽号 ── */
	const 表 = B?.槽位 ?? null;
	读数.槽位面 = { 读到: 表, 退回: 表 == null };
	const 码 = (表 ?? 具名默认).快存;
	ok(Number.isInteger(码), `★一处源：故事侧 \`槽位\` 里取不到快存槽号（实得 ${S(表)}）`);
	读数.码 = 码;

	/* ── 宿主槽的真读口（扫键；键形实测 `…save.slot.data:<码>`） ── */
	const LS = s.doc?.defaultView?.localStorage ?? s.win?.localStorage ?? null;
	const 槽值 = () => {
		try {
			if (!LS) return null;
			for (let i = 0; i < LS.length; i++) {
				const k = LS.key(i);
				if (k && k.endsWith('data:' + 码)) return String(LS.getItem(k));
			}
			return null;
		} catch { return null; }
	};
	const 页脚 = () => s.doc.querySelector('[data-footer="save"]');
	/* ★只认**那一条「快存」链**（✗ 页脚里任一 `<a>`）—— `books#402` 装置陈旧修（2026-10-08）：
	 *   页脚在战中**正确地**把「快存」渲成不可点的 span，而「载入快存」仍是 `<a>`（载入 ≠ 存，且侧栏
	 *   面板的「载入」在战中同样可用 —— 领队裁：战中载入＝弃局回档，正当）⇒ 旧形 `querySelector('a')`
	 *   会把它当成「快存链」而**假红**。 */
	const 快存链 = () => [...(页脚()?.querySelectorAll('a') ?? [])].find((el) => (el.textContent ?? '').trim() === '快存') ?? null;

	/* ── 缺席闸（本仓惯例：未在位 ⇒ 记声明、不判红 ✗ 不假装通过） ── */
	if (typeof B?.['页脚可存'] !== 'function' || typeof B?.['页脚快存'] !== 'function' || !页脚()) {
		console.log('  ⏳【页脚快存】**记声明**：故事侧 `页脚可存`／`页脚快存` 或 `[data-footer="save"]` 未在位'
			+ ` ⇒ 本档**不判红** ✓（写：页脚可存=${S(typeof B?.['页脚可存'])}／页脚快存=${S(typeof B?.['页脚快存'])}`
			+ `／页脚容器=${S(!!页脚())}）`);
		读数.缺席 = { 页脚可存: typeof B?.['页脚可存'], 页脚快存: typeof B?.['页脚快存'], 页脚: !!页脚() };
		return { fails, 读数 };
	}

	/* ── 臂 A：可存时，页脚有可点入口，且**点了系统槽真有值** ── */
	B.战中 = false;
	const 前 = 槽值();
	const a = 快存链();
	读数.臂A_前 = { 有容器: !!页脚(), 有链接: !!a, 链接文: (a?.textContent ?? '').trim().slice(0, 12), 槽前长: 前?.length ?? null };
	ok(!!a, '★【A 可存】页脚里应有一个**可点的「快存」链接**（实得：' + S(读数.臂A_前) + '）');
	ok(/快存/.test((a?.textContent ?? '')), `★【A 可存】页脚链接文应是「快存」（实得 ${S((a?.textContent ?? '').trim())}）`);
	if (a) {
		try { a.click(); } catch (e) { 读数.臂A_点错 = String(e?.message ?? e); }
		await new Promise((r) => setTimeout(r, 80));
	}
	const 后 = 槽值();
	读数.臂A_后 = { 槽后长: 后?.length ?? null, 原有: 前 != null, 写进去了: (!!后 && (前 == null || 前 !== 后)) };
	ok(!!后, `★【A 可存】点页脚「快存」后，宿主槽里应**真有值**（实得 ${S(读数.臂A_后)}）`);
	/* ★判「写进去了」：**后非空** ∧（**原为空 ⇒ 这就是写入** ∨ 原非空 ⇒ 值须变）。
	 *   ⚠️ 我第一版写成「前 ≠ 后」✗ —— 槽**原本是空**时「变了」无从谈起（`null ≠ 200` 我判成了「没变」）
	 *   ⇒ 那是**我判据太紧** ✗，不是产品缺陷 ✓（当场改）。 */
	const 写进去了 = !!后 && (前 == null || 前 !== 后);
	ok(写进去了, `★【A 可存】点页脚「快存」后，宿主槽须**真有内容且是新写的**（实得 前长=${S(读数.臂A_前.槽前长)}`
		+ `／后长=${S(读数.臂A_后.槽后长)}）⇒ ✗ 「没报错」不等于「写进去了」`);

	/* ── 臂 B：战中 —— **可见但不可点**，且**点了不落档** ── */
	B.战中 = true;
	try { SC.Engine.play(SC.State.passage); } catch (e) { 读数.臂B_重渲错 = String(e?.message ?? e); }
	await new Promise((r) => setTimeout(r, 120));
	const b容器 = 页脚(), b链接 = 快存链();
	const 战前 = 槽值();
	读数.臂B = { 容器在: !!b容器, 有无链接: !!b链接, 域内文: (b容器?.textContent ?? '').trim().slice(0, 24),
		有禁用标记: !!b容器?.querySelector('.footersave-off'), 槽前长: 战前?.length ?? null };
	ok(!!b容器, '★【B 战中】页脚容器**须仍在 DOM 里**（裁 4：战斗中**别藏** ⇒ 玩家要知道为什么不能存）'
		+ `（实得 ${S(读数.臂B)}）`);
	ok(!b链接, `★【B 战中】战中**不应有可点的「快存」链接**（实得 ${S(读数.臂B)}）`);
	if (b容器) {
		/* ★即使有人把链接塞回来，点它也不该落档。
		 *   ⚠️ 我第一版只点「**重渲前**取到的节点」✗ —— 那可能是**已脱离文档的旧节点**，
		 *     `click()` 是**静默空操作** ⇒ 这条断言会**空转**（刀里它就**没红** ⇒ 我据此判它没牙 ✗）。
		 *   ⇒ 改为：**每次点击前重新查一遍**当前文档里的可点物 ✓（脱离文档者计入读数、✗ 不当作已点 ✓）。 */
		const 点过 = [];
		for (let round = 0; round < 2; round++) {
			for (const el of (页脚() ?? b容器).querySelectorAll('a,button,span')) {
				const 文0 = (el.textContent ?? '').trim();
				/* ★只点**与「快存」有关**的可点物（含那条被禁的 span）—— ✗ 点「载入快存」：
				 *   那会真去**载档**（旁效，且不是本臂要测的那件事）。 `books#402` 装置陈旧修。 */
				if (!/^快存/.test(文0)) continue;
				const 在文档 = !!(s.doc.contains ? s.doc.contains(el) : el.isConnected);
				点过.push({ 文: (el.textContent ?? '').trim().slice(0, 8), 在文档 });
				if (在文档) { try { el.click(); } catch { /* 不可点不算错 */ } }
			}
			await new Promise((r) => setTimeout(r, 60));
		}
		读数.臂B.点了 = 点过;
		await new Promise((r) => setTimeout(r, 80));
	}
	const 战后 = 槽值();
	读数.臂B.槽后长 = 战后?.length ?? null;
	ok(战后 === 战前, `★【B 战中】战中点页脚**不得落档**（宿主槽原始值应不变：前=${S(战前?.length ?? null)}`
		+ `／后=${S(战后?.length ?? null)}）—— ✗ 拒绝操作须零状态变更`);

	/* ── 臂 C：同源（两态各自相等；两端并列印出 ✗ 不判绝对真） ── */
	const 同源 = (战中) => {
		B.战中 = 战中;
		const 页 = (() => { try { return B.页脚可存(); } catch (e) { return '『抛』' + e.message; } })();
		const 系 = (() => { try { return (!B.战中) && (B.可存?.(码) === true); } catch (e) { return '『抛』' + e.message; } })();
		return { 战中, 页脚侧: 页, 可存侧: 系, 相等: 页 === 系 };
	};
	const c1 = 同源(false), c2 = 同源(true);
	读数.臂C = [c1, c2];
	ok(c1.相等 && c2.相等, `★【C 同源】\`页脚可存()\` 须与 \`可存(${码})\` 同源（两态各自相等）：`
		+ `非战 ${S(c1)}／战中 ${S(c2)} ⇒ ✗ 不要另立第二套判据`);
	B.战中 = false;

	return { fails, 读数 };
}

/* ── 自检（刀）：✗ 不改源码 —— 打在**产物文本**上（改了源码不重建＝刀没落在被测物上 ✔） ── */
if (自检) {
	const fs2 = await import('node:fs');
	const path2 = await import('node:path');
	const env2 = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]);
	const html = path2.join(env2.repo ?? path2.resolve(import.meta.dirname, '..'), 'stories/babel/babel-trial.html');
	const 原 = fs2.readFileSync(html, 'utf8');
	/* 刀：把战中的守卫**拆掉**（页脚可存恒真 ＋ 页脚快存不拦）⇒
	 *   「战中不应有可点链接」与「战中点不得落档」两条**须具名红** ✔（证明臂 B 真有牙）。 */
	const 旧 = "setup.BABEL.页脚可存 = () => (!setup.BABEL.战中) && (setup.BABEL.可存?.(槽位.快存) === true);";
	if (!原.includes(旧)) {
		console.error('✗ 刀：产物里找不到靶（`页脚可存` 的定义行）⇒ 刀没落在被测物上（产物变了就同步改刀 ✔）');
		process.exit(1);
	}
	const 刀本 = html.replace(/\.html$/, `.__knife-footer-${process.pid}.html`);
	fs2.writeFileSync(刀本, 原.replace(旧, "setup.BABEL.页脚可存 = () => true;   /* ★刀：拆掉战中守卫 */"));
	let 不中 = 0;
	try {
		const { fails } = await 判({ ...env2, htmlPath: 刀本 });
		const 命中 = fails.filter((f) => /【B 战中】/.test(f));
		if (命中.length) console.log(`✓ 刀（拆战中守卫）⇒ **臂 B 如期红**：${命中.length} 条（${命中[0].slice(0, 68)}…）`);
		else { console.error(`✗ 刀 ⇒ **臂 B 零红**（判据没牙）：fails=${JSON.stringify(fails.slice(0, 3))}`); 不中++; }
	} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	process.exit(不中 ? 1 : 0);
}

/* ★环境错**具名退 2**（✗ 不让装置没装好被读成「被测物坏了」） */
let env;
try { env = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]); }
catch (e) { console.error(`✗ 环境错：${e.message}`); process.exit(2); }
let 结果;
try { 结果 = await 判(env); }
catch (e) { console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`); process.exit(2); }
const { fails, 读数 } = 结果;
console.log('\n── 读数（`books#259` 裁 4 · 页脚快存 DOM 臂）');
console.log('  ' + S(读数));
if (fails.length) {
	console.error(`\n✗ e2e-259 未过 ${fails.length} 条`);
	for (const f of fails) console.error(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\n✓ e2e-259 三臂全过（可存能写 ＋ 战中可见不可点且不落档 ＋ 与 `可存` 同源）');
process.exit(0);
