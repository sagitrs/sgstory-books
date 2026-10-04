#!/usr/bin/env node
/* `books#210`（F-02：保留槽无标记）· **tests-first · DOM 层**（`sgstory#1938` 第 4 步）。
 *
 * ## 这支笔是**测试先行**：现在跑＝**红**（面未到）
 *   引擎侧第 3 步（对话框渲染后处理）**尚未落地** ⇒ 现在真 DOM 里，保留槽与普通槽**一视同仁**
 *   （实测：两槽的 `save` 控件都**可点**、行内**无标记**）⇒ 本档**必红** ✓ —— 那是**预期**，
 *   ✗ 不是缺陷：本档就是那条「面到了没有」的判据 ✓。dev-10 第 3 步落地后**应翻绿** ✓。
 *   ★因此本档**暂不接夜窗/CI**（红了会把门带红）—— 接线的时机＝它翻绿那一刻 ✓。
 *
 * ## 判谁（三臂）
 *   **A 保留槽**（正例）：两个保留槽（码 3／4 —— 见下「两种编号」）那两行，须**有系统标记**
 *      **或**其写入控件为 `disabled` ✓（二者取一即可；两个半面都印在读数里，红了看得见是哪一个 ✓）。
 *   **B 对照臂**（✗ 不许把整面禁掉冒充通过）：**手动槽那一行必须无标记且可写** ✓。
 *   **C 点击不落档**：对保留槽的 `save` 控件派发 click ⇒ **不得落档**（`Save.slots.has(码) === false`）✓。
 *
 * ## 臂 D（`#1938` 第 5 条 · **正例臂** · 2026-10-04 我加）
 *   **系统写路径 ⇒ 保留槽确实更新**：故事侧 `setup.BABEL.快存(槽位.快存)`（✗ 不走手动入口按钮）写两次、
 *   中间改一个状态标记 ⇒ 断①**入口返回成功**（真值 `true`；若保护被**错移**到写路径／执行层 ⇒ `null`／`false` ✓）
 *   ②宿主槽**真有值**（键形实测 `…save.slot.data:<码>`）③**两次之间槽的原始值须变**（值长实测 200⇒213⇒252 ✓）。
 *   ⚠ 读口用 **jsdom 的 `localStorage`** 并 `key(i)` 遍历：SugarCube 的 `Save.slots.load` 是**载入**动作 ✗ 不是读；
 *     而 `globalThis.localStorage` 在 Node 侧**是 undefined**（★我两版都栽在这 ⇒ 那时断言**根本没跑**、走了「记声明」路 ✗）。
 *   ⇒ 本臂在**现态就是绿的**（系统写今天就能写进保留槽）⇒ 它是**回归守卫** ✓，不是「候绿」。
 *
 * ## 刀（自检现状）
 *   · **刀 D（现在就能下 ✓）**：把保护**错移到写路径**（故事侧 `写槽` 里拦住保留码）⇒ 系统写返回 `false`
 *     ⇒ **臂 D 如期红 3 条** ✓（★这条正是「保护面错移执行层」的照妖镜 ✓）。打的是**产物文本**（✗ 不改源码 ✓）。
 *   · **刀 A（候 D 码）**：去掉保留槽的标记/恢复可写 ⇒ A 红。靶未在位 ⇒ **记声明、不判红**（✗ 不是通过 ✓）。
 *
 * ## 两种编号（dev-10 勘明，我实测复认）
 *   · **码里／故事侧**（0 基）：`快存 = 3`、`战前保底 = 4`、`手动 = 5` —— 来自
 *     `setup.BABEL.槽位`（一处源；`encounters.js` 导出，`verify.mjs` 有断言钉住 ✓）。
 *   · **玩家看到的**（1 基行号）＝码 ＋ 1 ⇒ 快存显示「槽位 4」、手动显示「槽位 6」✓。
 *   ⇒ 本档的**靶行**＝**码 3／4**；DOM 里对应 `#saves-save-3`／`#saves-save-4` ✓（实测：
 *     `#saves-list` 是 `<table>`，每槽一 `<tr>`，行内两按钮 `#saves-save-<码>`／`#saves-delete-<码>`）。
 *
 * ## 一处源（✗ 不写死第二份）
 *   保留槽号**读故事侧的 `setup.BABEL.槽位`** ✓；读不到 ⇒ 退回**具名默认** `{快存:3, 战前保底:4}`，
 *   并把这个「退回」**印进读数**（✗ 不静默）✓。★刀 B 就是拔「一处源」：把故事侧的号改掉 ⇒ 本档
 *   的靶行**须跟着动**（✗ 若本档写死号，就会「号改了判据还盯着老行」⇒ 那正是要防的 ✓）。
 *
 * ## 用法与退出码
 *   node tools/e2e-210-reserved-slots.mjs --engine <引擎检出>
 *   node tools/e2e-210-reserved-slots.mjs --engine <引擎检出> --selftest   # 刀：**候 D 码在位**才有靶
 *   0 = 三臂全过；1 = 有红；2 = 环境错（引擎根／产物／jsdom，具名）
 *   ⚠ 跑前须构建产物（同 `e2e-216`）；harness 的**新鲜度守卫**（`#221`）会先替你挡住陈旧产物 ✓。
 *
 * ## 刀（**声明式**：靶是 D 码里的字符串，✗ 现在还不存在）
 *   · 刀 A：去掉保留槽的标记/恢复可写 ⇒ **A 红**（❌ 现在下不了：靶未在位）
 *   · 刀 B：故事侧 `槽位` 改号（快存 3→6）⇒ 本档**须跟着换靶**并因此红 ✓（证「一处源」被守住）
 *   两条刀都**候 dev-10 第 3 步落地**……但★刀 B 的靶是我**自己的取值面**（`B.槽位`）——
 *   ★它其实**现在就能下**：改产物里 `快存:3` ⇒ 本档靶行变 6 ⇒ 而引擎未处理 ⇒ A 仍红
 *   ⇒ ✗ 红上加红、分不出「一处源守没守住」✗。⇒ 故两条刀**一并候 D 码落地**，届时补 `--selftest`。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 自检 = process.argv.includes('--selftest');
const 具名默认 = { 快存: 3, 战前保底: 4, 手动: 5 };
const 标记模式 = /系统|保留|专属|〔/;      // ★标记文案待 D 码定；此处按「有标记」的常见形判
const S = (x) => JSON.stringify(x);

/** 真产物、真宿主、真点按钮。@returns `{ fails, 读数 }` */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, B = SC.setup.BABEL;
	const 槽 = SC.Save.slots;
	const 读数 = {};

	/* ── 一处源：保留槽号 ── */
	const 表 = B?.槽位 ?? null;
	读数.槽位面 = { 读到: 表, 用: 表 ?? 具名默认, 退回: 表 == null };
	const 用 = 表 ?? 具名默认;
	const 保留 = ['快存', '战前保底'].map((k) => 用[k]).filter((n) => Number.isInteger(n));
	const 手动 = Number.isInteger(用.手动) ? 用.手动 : null;
	ok(保留.length === 2, `★一处源：故事侧 \`槽位\` 里取不到两个保留槽号（实得 ${S(表)}）—— 那是本档的靶，取不到就判不了`);
	ok(手动 !== null, `★一处源：取不到手动槽号（实得 ${S(表)}）—— 对照臂的靶`);

	/* ── 真开面：走玩家入口 `UI.saves()` ── */
	SC.UI.saves();
	await new Promise((r) => setTimeout(r, 300));
	const list = s.doc.querySelector('#saves-list');
	ok(!!list, '★装置：`UI.saves()` 之后 DOM 里没有 `#saves-list`（存档浏览器没渲染出来 ⇒ 本档量不到面）');

	const 行 = (码) => s.doc.querySelector(`#saves-save-${码}`)?.closest('tr') ?? null;
	const 按钮 = (码) => s.doc.querySelector(`#saves-save-${码}`);

	/* ── 臂 A：保留槽须有标记 **或** 不可写 ── */
	const A = [];
	for (const 码 of 保留) {
		const tr = 行(码), b = 按钮(码);
		const 文 = (tr?.textContent ?? '').trim();
		const 标 = 标记模式.test(文);
		const 禁 = b?.disabled === true || b?.getAttribute('aria-disabled') === 'true';
		A.push({ 码, 行文: 文, 有标记: 标, 禁用: 禁, 存在: !!b });
	}
	读数.臂A_保留槽 = A;
	ok(!list || A.every((x) => x.有标记 || x.禁用),
		'★【A 保留槽】保留槽（码 ' + JSON.stringify(保留) + '）既**无系统标记**、写入控件**又可点**'
		+ ` —— ★**面未到**（引擎侧第 3 步「对话框渲染后处理」尚未落地）：${S(A)}`
		+ '（这就是本档预期的**红**；dev-10 第 3 步落地后应翻绿 ✓）');

	/* ── 臂 B（对照臂）：手动槽须**无标记且可写**（✗ 不许把整面禁掉冒充通过） ── */
	if (手动 !== null) {
		const tr = 行(手动), b = 按钮(手动);
		const 文 = (tr?.textContent ?? '').trim();
		const 标 = 标记模式.test(文);
		读数.臂B_手动槽 = { 码: 手动, 行文: 文, 有标记: 标, 禁用: b?.disabled === true, 存在: !!b };
		ok(!!b && b.disabled === false && !标,
			`★【B 对照臂】手动槽（码 ${手动}）须**无标记且可写**（实得 ${S(读数.臂B_手动槽)}）`
			+ ' —— ✗ 不许把整面禁掉当「保护好了」✓');
	}

	/* ── 臂 C：点保留槽的 save ⇒ **不落档** ── */
	读数.臂C_点击 = [];
	for (const 码 of 保留) {
		if (typeof 槽?.delete === 'function' && 槽.has(码)) 槽.delete(码);   // 清干净 ⇒ 本臂自成一面（同 216 的隔离教训）
		const b = 按钮(码);
		if (b) {
			b.dispatchEvent(new s.dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
			await new Promise((r) => setTimeout(r, 250));
		}
		const 落档 = typeof 槽?.has === 'function' ? 槽.has(码) : null;
		读数.臂C_点击.push({ 码, 点了: !!b, 落档 });
		ok(落档 === false, `★【C 点击】点保留槽（码 ${码}）的保存控件**真落档了**（实得 has=${S(落档)}）—— ✗ 拒绝操作须零状态变更 ✓`);
	}
	/* ── 臂 D（`#1938` 第 5 条 · **正例臂**）：**系统写路径 ⇒ 保留槽确实更新** ──
	 *   臂 C 管「保留槽的**手动**入口须被拦」✓；本臂管**反面**：故事侧**系统**路径
	 *   （`setup.BABEL.快存`／`战前保底`）写**自己的**保留槽**必须照写** ✓。
	 *   ★这条正是「**保护面错移到执行层**」的照妖镜：若保护被放到宿主写口（`Save.slots.save`
	 *     ／故事侧 `写槽` 的 `宿主槽().save(...)`）⇒ 系统写也一起哑 ⇒ 本臂具名红 ✓。
	 *   ★判法＝**内容确实变了**（✗ 不是「没报错」）：写两次、中间改一个状态标记 ⇒
	 *     宿主槽的**原始值**须变 ✓（槽原始串是 LZString 压缩的 ⇒ 不看明文，只看变没变 ✓）。
	 *   ⚠ 读口用 `localStorage` **扫键**：SugarCube 的 `Save.slots.load` 是**载入**动作 ✗ 不是读 ✓
	 *     —— 我第一版误用它、读出 `{}` ⇒ 那条红是我判据坏、不算牙 ✗（当场换掉 ✓）。 */
	{
		const 码 = 用.快存;                      // ★与臂 A/C 同一处源（故事侧 `槽位`，读不到退具名默认 ✓）
		const 写口 = B?.['快存'];
		const LS = s.doc?.defaultView?.localStorage ?? s.win?.localStorage ?? null;   // ★jsdom 的 localStorage（✗ 不在 Node 的 globalThis 上）
		读数.臂D_写口 = { 快存: typeof 写口, 战前保底: typeof B?.['战前保底'], 码 };
		if (typeof 写口 !== 'function' || !LS) {
			console.log(`  ⏳【D 系统写】**记声明**：故事侧 \`快存\`／宿主槽面未在位（写口=${S(typeof 写口)}／localStorage=${S(!!LS)}／BABEL=${S(Object.keys(B ?? {}).length)} 个键）⇒ 本臂**不判红** ✓`);
		} else {
			const 标 = '__t3_dom_marker';
			const 槽键 = () => { const out = []; for (let i = 0; i < LS.length; i++) { const k = LS.key(i); if (k?.includes('save.')) out.push(k); } return out; };
			const 读槽 = () => { try {
				const ks = 槽键(), k = ks.find((x) => x.endsWith('data:' + 码)) ?? null;   // ★键形实测 `…save.slot.data:<码>`
				return { 用键: k ?? null, 值: k ? String(LS.getItem(k)) : null, 键样: ks.slice(0, 3) };
			} catch (e) { return { 错: e.message }; } };
			const 前 = 读槽();
			SC.State.variables[标] = 'D1';
			const 一次 = (() => { try { return 写口(码); } catch (e) { return '『抛』' + e.message; } })();
			const 甲 = 读槽();
			SC.State.variables[标] = 'D2-' + Date.now();
			const 二次 = (() => { try { return 写口(码); } catch (e) { return '『抛』' + e.message; } })();
			const 乙 = 读槽();
			const 变了 = !!(甲.值 && 乙.值 && 甲.值 !== 乙.值);
			读数.臂D = { 一次, 二次, 用键: 乙.用键, 键样: 乙.键样, 值长: [前.值?.length ?? null, 甲.值?.length ?? null, 乙.值?.length ?? null], 两次之间变了: 变了 };
			ok(一次 === true && 二次 === true,
				`★【D 系统写】故事侧**系统写入口须返回成功**（实得 一次=${S(一次)}／二次=${S(二次)}）`
				+ ' ⇒ ★**保护面若被错移到写路径/执行层**，系统写会返回 `null`／`false` ⇒ 就是这一条红 ✓');
			ok(!!乙.值, `★【D 系统写】经**系统路径**写后，宿主槽里应**真有值**（实得 用键=${S(乙.用键)}／键样=${S(乙.键样)}／`
				+ `值长=${S(读数.臂D.值长)}）⇒ ✗ 写被拦住了 ✓`);
			ok(变了, `★【D 系统写】**两次系统写之间改了状态 ⇒ 宿主槽的原始值须变**（实得值长 ${S(读数.臂D.值长)}，`
				+ `变了=${S(变了)}）⇒ ★**保护面若被错移到执行层**（堵宿主写口／故事侧写槽）就是这一条红 ✓`);
		}
	}

	return { fails, 读数 };
}

/* ── 自检（刀）──
 *   ★两条刀，各拔一处、各须红在**自己那一面**；打的是**产物文本**（✗ 不改源码 —— 改了不重建＝刀没落在被测物上 ✓）。
 *   ① 刀 A（**候 D 码**）：去掉保留槽的标记/恢复可写 ⇒ **A 红**。现在靶未在位 ⇒ **记声明、不判红**（✗ 不是通过）。
 *   ② 刀 D（**正例臂的反向刀** ✓ 现在就能下）：把「保护」**错移到写路径**（故事侧 `写槽` 里拦住保留码）
 *      ⇒ 系统快存也一起哑 ⇒ **臂 D 具名红** ✓。这条正是派单要的照妖镜 ✓。 */
if (自检) {
	const fs2 = await import('node:fs');
	const path2 = await import('node:path');
	const env2 = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]);
	const html = path2.join(env2.repo ?? path2.resolve(import.meta.dirname, '..'), 'stories/babel/babel-trial.html');
	const 原 = fs2.readFileSync(html, 'utf8');
	let 不中 = 0;
	const 中不中 = [];

	/* 刀 A：候 D 码 ⇒ 现在记声明 */
	console.log('★刀 A（去保留槽标记）：靶（D 码里「标记/禁用」的字符串）**尚未在位** ⇒ **记声明、不判红** ✗ 不是「通过」✓');

	/* 刀 D：保护错移写路径 ⇒ 臂 D 须具名红 */
	const 靶D = '宿主槽().save(slot, 名);';
	const 产 = 原.split(靶D).length - 1;
	if (产 === 0) { console.error('✗ 刀 D：产物里找不到写口靶（`宿主槽().save(slot, 名);`）⇒ 刀没落在被测物上（产物变了就同步改刀 ✓）'); 不中++; }
	else {
		/* ★**全部替换**：该行在产物里出现多次（实测 8 处）⇒ 只替第一处可能打不到真跑的那一份 ✓ */
		const 刀本 = html.replace(/\.html$/, `.__knifeD-${process.pid}.html`);
		fs2.writeFileSync(刀本, 原.split(靶D).join(
			"if (setup && setup.BABEL && setup.BABEL.槽位 && Object.values(setup.BABEL.槽位).includes(slot)) return null; /* ★刀 D：保护**错移**到写路径 */\n\t" + 靶D));
		try {
			const { fails, 读数: 读刀 } = await 判({ ...env2, htmlPath: 刀本 });
			console.log('  ▸ 刀本里的臂 D 读数：' + JSON.stringify(读刀?.臂D));
			const 命中 = fails.filter((f) => /【D 系统写】/.test(f));
			const 走了声明 = /记声明/.test(JSON.stringify(fails)) || fails.some((f) => /面未到/.test(f));
			if (命中.length) console.log(`✓ 刀 D（保护错移写路径，替 ${产} 处）⇒ **臂 D 如期红**：${命中.length} 条（${命中[0].slice(0, 66)}…）`);
			else if (fails.length === 0) console.error('✗ 刀 D ⇒ **零红且全绿**：臂 D 没咬住（判据没牙）✗');
			else { console.error(`✗ 刀 D ⇒ 臂 D 零红（其余红 ${fails.length} 条：${JSON.stringify(fails.slice(0, 2)).slice(0, 140)}）⇒ 判据没牙 ✓`); 不中++; }
			中不中.push({ 刀: 'D', 命中: 命中.length, 产 });
		} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	}
	process.exit(不中 ? 1 : 0);
}

/* ★环境错**具名退 2**（✗ 不让 harness 的抛错被算成「判据红」——那会把「装置没装好」读成「被测物坏了」）。
 *   实测踩过：假引擎根 ⇒ `resolveEnv` 抛 ⇒ 进程以 1 退出 ✗ ⇒ 与「判据红」撞码 ⇒ 这里收干净 ✓。 */
let env;
try { env = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]); }
catch (e) { console.error(`✗ 环境错：${e.message}`); process.exit(2); }
let 结果;
try { 结果 = await 判(env); }
catch (e) { console.error(`✗ 环境错（装置起不来）：${e.message}`); process.exit(2); }
const { fails, 读数 } = 结果;
console.log('\n── 读数（`books#210` F-02 · DOM 层）');
console.log('  ' + S(读数));
if (fails.length) {
	console.error(`\n✗ e2e-210 未过 ${fails.length} 条`);
	for (const f of fails) console.error(`  ✗ ${f}`);
	process.exit(1);
}
console.log('\n✓ e2e-210 三臂全过（保留槽有标记/不可写 ＋ 手动槽可写 ＋ 点击不落档）');
process.exit(0);
