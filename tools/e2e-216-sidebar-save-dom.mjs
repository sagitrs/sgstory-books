/* `books#216`（`books#209` 明账②的判据补）：**侧栏存档按钮的真 DOM 臂**。
 *
 * 为什么单开一枝（✗ 并进 `tools/e2e-209-host-save.mjs`）：
 *   · `#209` 那枝断的是**宿主面**（`Config.saves.isAllowed` 与被拒时的可读文案）与**面板残影**；
 *     本枝断的是**玩家真正点得到的那个按钮**（`UI.saves()` 渲染出来的 `#saves-save-N`）——
 *     T 席判「只按源码读得、未真点按钮」**不算覆盖** ✓，理由我认：本仓 0.0.2 前两起 P0
 *     （`#170` P2-11／`#200`）都是「**屏上读数与引擎不一致**」那一族，而**按钮**正是这类假读数
 *     最爱藏的地方 ✓。
 *   · ★另有一条**硬约束**（票面写明）：`#215` 的两条守护 `grep` 正吃 `e2e-209-host-save.mjs` 的
 *     两句汇总串（`真宿主判据通过`／`两把刀如期`）⇒ 本枝**另起档**，✗ 动那两句 ✓。
 *
 * 靶＝**构建产物**（真 SugarCube ⇒ 真 `UI.saves()`）：跑前须构建
 *     python3 <引擎>/build.py <本仓>/stories/babel --out babel-trial.html
 *   ⚠ `e2e-harness.mjs` 已带**产物新鲜度**守卫（`#221`）：产物旧于 `stories/babel/src/**` 或
 *     `--engine/src/**` ⇒ **具名红**（✗ 拿旧产物跑读数 —— 本舰队实测踩过两次）✓。
 *
 * 本席在真产物里实测到的形（判据照此写，✗ 凭印象）：
 *   `#ui-dialog-body.saves` ＞ `table#saves-list` ＞ 每槽一行，含两个按钮：
 *     `<button id="saves-save-N" class="save" disabled aria-disabled="true" tabindex="-1">`
 *     `<button id="saves-delete-N" class="delete" disabled aria-disabled="true" …>`
 *   · **战中**（`setup.BABEL.战中 = true`）⇒ `save` 按钮 **disabled**；派发 click ⇒ **不落档** ✓
 *   · **战后** ⇒ `disabled` 撤掉 ⇒ 派发 click ⇒ **真落档**（`desc` 由宿主自动给，实测「回合 2」）✓
 *
 * 用法：
 *     node tools/e2e-216-sidebar-save-dom.mjs --engine <引擎检出>
 *     node tools/e2e-216-sidebar-save-dom.mjs --engine <引擎检出> --selftest   # 两把刀：各恰红一面
 * 退出码：0 全过；1 有红；2 环境错（引擎根／产物／jsdom 缺，具名）。
 */
import fs from 'node:fs';
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 引擎 = process.argv[2] === '--engine' ? process.argv[3] : undefined;
const 自检 = process.argv.includes('--selftest');
const S = (v) => (v === null || v === undefined ? String(v) : JSON.stringify(v)?.slice(0, 60) ?? String(v));

/** 真产物、真宿主、**真点按钮**。@returns `{ fails, 读数 }` */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, D = SC.setup.DND3;
	const 槽 = SC.Save.slots;
	const 面板 = () => (s.doc.querySelector('[data-panel="enemy"]')?.textContent ?? '').trim();
	const 开面 = async () => { SC.UI.saves(); await new Promise((r) => setTimeout(r, 200)); };
	const 按钮 = (n) => s.doc.querySelector(`#saves-save-${n}`);
	const 点 = async (el) => {
		el?.dispatchEvent(new s.dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
		await new Promise((r) => setTimeout(r, 250));
	};
	const 读数 = {};

	/* ===== ① 战中：按钮**不可点** ＋ 派发 click 也**不落档**（✗ 静默成功） ===== */
	B.战中 = true;
	await 开面();
	const b3 = 按钮(3);
	读数.战中按钮 = { 存在: !!b3, disabled: b3?.disabled ?? null, aria: b3?.getAttribute('aria-disabled') ?? null };
	ok(!!b3, '★【①侧栏】战中 `UI.saves()` 里**找不到**槽 3 的存档按钮（宿主面的门没接到真 UI 上）');
	ok(读数.战中按钮.disabled === true, `★【①侧栏】战中存档按钮**仍可点**（实得 ${S(读数.战中按钮)}）—— 玩家点它就能把半截状态存下去`);
	ok(读数.战中按钮.aria === 'true', `★【①侧栏】战中存档按钮缺 \`aria-disabled\`（无障碍面：读屏用户仍以为可点）（实得 ${S(读数.战中按钮.aria)}）`);
	await 点(b3);
	读数.战中点击后 = { has: 槽.has(3), 档: 槽.get(3) === null ? null : '（有档）' };
	ok(读数.战中点击后.has === false, `★【①侧栏】战中点按钮**真落档了**（实得 has=${S(读数.战中点击后.has)}）—— 这就是 F-01 那条半截状态`);

	/* ===== ② 战后**正控**：不得一律禁用 ⇒ 同一按钮须恢复可点且真落档 ===== */
	B.战中 = false;
	/* ★先把槽 3 清干净：① 那一面在**坏实现**下会真落档 ⇒ 若不清，② 的「落档了吗」就被 ① 的
	 *   副作用污染（本席首版实测：刀①一下，② 也红 ⇒ 两面**不隔离** ✗）。清槽 ⇒ ② 自成一面 ✓。 */
	if (typeof 槽.delete === 'function' && 槽.has(3)) 槽.delete(3);
	await 开面();
	const b3b = 按钮(3);
	读数.战后按钮 = { disabled: b3b?.disabled ?? null, aria: b3b?.getAttribute('aria-disabled') ?? null };
	/* ⚠ 「没禁用」的判据写成 `disabled !== true`（✗ `=== false`）：宿主在**没装门**时该属性可能是
	 *   缺席（`null`）⇒ 那是「未禁用」✓，`=== false` 会把它误判成红（本席首版正是这样越界的 ✗）。 */
	ok(读数.战后按钮.disabled !== true, `★【②正控】战后按钮**仍被禁用**（实得 ${S(读数.战后按钮)}）—— 那说明「禁」清不掉，✗ 不是门禁而是坏死`);
	ok(槽.has(3) === false, `★【②正控】前置没铺成：清槽后槽 3 仍有档（实得 ${S(槽.has(3))}）`);
	const 前 = 槽.has(3);
	await 点(b3b);
	读数.战后点击后 = { has: 槽.has(3), desc: 槽.get(3)?.desc ?? null };
	ok(槽.has(3) === true && 前 === false, `★【②正控】战后点按钮**没落档**（实得 ${S(读数.战后点击后)}）—— 「恢复可点」不能只是没 disabled`);
	ok(typeof 读数.战后点击后.desc === 'string' && 读数.战后点击后.desc !== '',
		`★【②正控】真落档了但**描述为空**（实得 ${S(读数.战后点击后.desc)}）—— 玩家回头认不出这是哪一档`);

	/* ===== ③ 残影联动（真 DOM 版）：真读档 ⇒ 敌面板**不得**再印上一场 ===== */
	槽.save(4, '战前');
	ok(槽.get(4)?.desc === '战前', `★【③残影】前置没铺成：非战时该能存（实得 ${S(槽.get(4)?.desc)}）`);
	const 敌旧 = new (R.Character)({ name: '巨蜥', hp: 19, maxHp: 22, stats: { ac: 12 } });
	R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌旧], players: [D.Player] } });
	R.events.emit('item:used', { actor: 敌旧, name: '甩尾' });
	读数.读档前面板 = 面板();
	ok(读数.读档前面板.includes('巨蜥'), `★【③残影】前置没铺成：战斗事件后敌面板该印巨蜥（实得 ${S(读数.读档前面板)}）`);
	槽.load(4);
	await new Promise((r) => setTimeout(r, 300));
	读数.读档后面板 = 面板();
	ok(读数.读档后面板 === '', `★【③残影】真读档后面板仍印上一场的敌情（实得 ${S(读数.读档后面板)}）—— F-01 ② 的残影`);
	/* 正控（✗ 不得清过头）：新一场真发生时，面板须读**新**那一场 */
	const 敌新 = new (R.Character)({ name: '野猪', hp: 26, maxHp: 26, stats: { ac: 11 } });
	R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌新], players: [D.Player] } });
	读数.新场面板 = 面板();
	ok(读数.新场面板.includes('野猪') && !读数.新场面板.includes('巨蜥') && !读数.新场面板.includes('甩尾'),
		`★【③残影】读档后新一场没顶上（或旧场／旧动作还留着）：${S(读数.新场面板)}`);

	return { fails, 读数 };
}

/* ---------- 自检（刀）：证明判据**判得了** ---------- */
/** 在**产物文本**上打一刀（✗ 改源码：源码改了不重建 ⇒ 刀没落在被测物上，本舰队栽过两次）。 */
function 打刀(文本, 找, 换) {
	if (!文本.includes(找)) {
		throw new Error(`刀替换**未命中**（产物里找不到该串 ⇒ 刀没落在被测物上）：${找}`);
	}
	return 文本.replace(找, 换);
}

const main = async () => {
	const env = resolveEnv(引擎);
	const 原文本 = fs.readFileSync(env.htmlPath, 'utf8');

	if (!自检) {
		const { fails, 读数 } = await 判(env);
		console.log(`  ①侧栏：战中按钮＝${S(读数.战中按钮)}｜派发 click 后 has(3)＝${S(读数.战中点击后.has)}`);
		console.log(`  ②正控：战后按钮＝${S(读数.战后按钮)}｜点击后 has(3)＝${S(读数.战后点击后.has)} desc＝${S(读数.战后点击后.desc)}`);
		console.log(`  ③残影：读档前＝${S(读数.读档前面板)}｜真读档后＝${S(读数.读档后面板) || '（空）'}｜新场顶上＝${S(读数.新场面板)}`);
		for (const f of fails) console.log(`  ✗ ${f}`);
		console.log(fails.length === 0 ? '  ✓ 侧栏真 DOM 判据通过（战中真禁点·点了也不落档 · 战后恢复且真落档 · 读档后无残影·新场顶得上）'
			: `  ✗ 侧栏真 DOM 判据失败 ${fails.length} 条`);
		process.exit(fails.length === 0 ? 0 : 1);
	}

	/* 两把刀：每把只拆一处，且**须恰红自己那一面**（隔离＝其余面仍绿）。 */
	const 刀 = [
		{
			名: '216-战中门-off',
			说明: '拆「装载期装门」那一次调用 ⇒ ①面须红（②③面仍绿）',
			/* ★刀靶取**门里那句「战中拒」**（✗ 拆整次装门调用）：拆整次会让宿主配置缺席 ⇒
			 *   存档面板**整块渲染都不一样**（按钮都找不到）⇒ ②③ 面被殃及，两面就不再隔离 ✗
			 *   （本席首版实测：拆整次 ⇒ ①面 3 条 ＋ **②面 2 条**越界 ✗）。 */
			找: '=> !setup.BABEL.战中 && (原判 ? Boolean(原判(类型)) : true);',
			换: '=> (原判 ? Boolean(原判(类型)) : true);   /* 刀：战中不再拒 */',
			须红: '★【①侧栏',
			须绿: ['★【②正控', '★【③残影'],
		},
		{
			名: '216-读档归零-off',
			说明: '拆读档路径上的归零调用 ⇒ ③面须红（①②面仍绿）',
			找: 'setup.BABEL?.敌情栏重置?.();',
			换: '/* 刀：读档归零已拆 */',
			须红: '★【③残影',
			须绿: ['★【①侧栏', '★【②正控'],
		},
	];
	let 坏 = 0;
	for (const k of 刀) {
		const 副本 = env.htmlPath + '.' + k.名 + '.html';
		fs.writeFileSync(副本, 打刀(原文本, k.找, k.换), 'utf8');
		const { fails } = await 判({ ...env, htmlPath: 副本 });
		fs.unlinkSync(副本);
		const 红集 = fails.filter((f) => f.includes(k.须红));
		const 越界 = fails.filter((f) => !f.includes(k.须红));
		const 恰好 = 红集.length > 0 && 越界.length === 0;
		console.log(`  ${恰好 ? '✓' : '✗'} 刀 \`${k.名}\` ⇒ 须**恰红**「${k.须红}」；实得红 ${fails.length} 条（本面 ${红集.length}／越界 ${越界.length}）`);
		if (!恰好) { console.error(`    （刀义：${k.说明}）\n${fails.map((f) => '    ' + f).join('\n')}`); 坏++; }
	}
	if (坏) { console.error(`\n刀的判别力自证失败 ${坏} 条 —— 判据红不了，等于没有判据`); process.exit(1); }
	console.log(`\n✓ 刀的判别力自证通过（${刀.length} 把，各恰红自己那一面）`);
};

main().catch((e) => {
	console.error(`✗ 环境错：${e?.message ?? e}`);
	process.exit(2);
});
