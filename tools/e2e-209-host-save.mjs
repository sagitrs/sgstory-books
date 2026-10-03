/* `books#209`（P1·F-01）**真宿主**判据：战中禁存（宿主面）＋ 读档后面板不残影。
 *
 * 为什么单开一枝（✗ 并进 `verify.mjs` 或 `e2e-178-slots.mjs`）：
 *   · 病灶的两半都**只在真宿主里看得见** —— ①侧栏的普通存档走的是宿主自己的口子
 *     （`Config.saves.isAllowed(saveType)`），②敌面板的残影要靠**真读档**（`Save.slots.load`）
 *     才复现；无头桩里这两件事都只能**照抄**（见 `verify.mjs` ㊴ 格的桩）。
 *   · 靶＝**构建产物**（真 SugarCube ＋ 真 DOM）⇒ 与 `e2e-178-slots.mjs` 同形：**先构建再跑**。
 *
 * 本席在真产物里实测到的宿主语义（判据照此写，✗ 凭印象）：
 *   · `Config.saves.isAllowed` **初始为 `undefined`**（＝放行）；宿主按 `saveType` 分别来问
 *     （`Save.Type.Slot`／`Disk`／`Base64`／`Auto`）；
 *   · 拒时 `Save.slots.save` **同步抛** `saveErrorDisallowed`（宿主自己的本地化串 ⇒ 玩家看得到人话），
 *     且侧栏存档面板那条动作会置空。
 *   · 残影机制：敌面板读的是 `ui/battle.js` 里两个**不进存档**的模块态 ⇒ 读档换了世界，
 *     屏上仍是上一场的敌情（本席实测：真 `Save.slots.load` 后面板照样印「巨蜥 19/22」）。
 *
 * 用法（**先构建产物**）：
 *     python3 <引擎>/build.py stories/babel --out babel-trial.html
 *     node tools/e2e-209-host-save.mjs --engine <引擎检出>
 *     node tools/e2e-209-host-save.mjs --engine <引擎检出> --selftest   # 两把刀：各恰红一格
 * 退出码：0 全过；1 有红；2 环境错（引擎根／产物／jsdom 缺，具名）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 引擎 = process.argv[2] === '--engine' ? process.argv[3] : undefined;
const 自检 = process.argv.includes('--selftest');
const S = (v) => JSON.stringify(v)?.slice(0, 60) ?? String(v);

/* ---------- 判据本体（纯离线？不 —— 真产物、真宿主；「替换」只给自检下刀用）---------- */
/**
 * 跑一遍两半判据。
 * @param env `resolveEnv` 的结果（`htmlPath` 已被自检换成打完刀的副本）
 * @returns 具名失败串数组（空＝全过）；另附读数供打印
 */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, D = SC.setup.DND3;
	const 槽 = SC.Save.slots;
	const 面板 = () => (s.doc.querySelector('[data-panel="enemy"]')?.textContent ?? '').trim();
	const 读数 = {};

	/* ===== ① 宿主面门禁 ===== */
	const 判定 = (t) => (typeof SC.Config.saves.isAllowed === 'function' ? SC.Config.saves.isAllowed(t) : '（未装门）');
	ok(typeof SC.Config.saves.isAllowed === 'function',
		'★【①门禁·boot】装载期没装门（真产物里 `Config.saves.isAllowed` 仍非函数）'
		+ ' —— 战中侧栏照样能存，半截状态就是这么落盘的（writer 报的 F-01 ①）');
	/* 正控：非战能存（✗ 只有「战中拒」一条 ⇒ 一个恒拒的坏实现也会绿） */
	B.战中 = false;
	槽.save(3, '战前');
	读数.战前档 = 槽.get(3)?.desc ?? null;
	ok(读数.战前档 === '战前', `★【①门禁】非战时宿主存档竟然没落（实得 ${S(读数.战前档)}）——「拒」那半就无从对照`);
	/* 战中：类型全覆盖 ＋ 真写被拒 ＋ 拒的文案是宿主那条可读串 */
	B.战中 = true;
	读数.战中判定 = Object.fromEntries(['Slot', 'Disk', 'Base64', 'Auto'].map((t) => [t, 判定(t)]));
	ok(['Slot', 'Disk', 'Base64', 'Auto'].every((t) => 读数.战中判定[t] === false),
		`★【①门禁】战中宿主判定没全类型拒（实得 ${S(读数.战中判定)}）`);
	let 抛 = null;
	try { 槽.save(3, '战中'); } catch (e) { 抛 = e; }
	ok(抛 !== null, '★【①门禁】战中宿主存档**没被拒**（真写成功了 —— 存下的是半截状态）');
	const 该文案 = String(SC.L10n?.get?.('saveErrorDisallowed') ?? '');
	读数.拒文案 = 抛 ? String(抛.message) : null;
	ok(该文案 !== '' && 读数.拒文案 === 该文案,
		`★【①门禁】战中存档被拒了，但**不是宿主那条可读文案**（实得 ${S(读数.拒文案)}；宿主串 ${S(该文案)}）`
		+ ' —— 玩家看不懂的拒绝等于没拒');
	B.战中 = false;
	槽.save(3, '战后');
	ok(槽.get(3)?.desc === '战后', `★【①门禁】战中解除后仍存不进去（实得 ${S(槽.get(3)?.desc)}）——「禁」清不掉了`);

	/* ===== ② 读档 ⇒ 敌面板不残影 ===== */
	const 敌旧 = new (R.Character)({ name: '巨蜥', hp: 19, maxHp: 22, stats: { ac: 12 } });
	R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌旧], players: [D.Player] } });
	R.events.emit('item:used', { actor: 敌旧, name: '甩尾' });
	读数.读档前面板 = 面板();
	ok(读数.读档前面板.includes('巨蜥'),
		`★【②面板】前置没铺成：战斗事件后敌面板该印巨蜥（实得 ${S(读数.读档前面板)}）`);
	槽.load(3);                                        // ★真读档（走 story/hooks.js 那条 onLoad 订阅）
	await new Promise((r) => setTimeout(r, 300));
	读数.读档后面板 = 面板();
	ok(读数.读档后面板 === '',
		`★【②面板】读档后面板仍印上一场的敌情（实得 ${S(读数.读档后面板)}）—— 残影未清`
		+ '（writer 报的 F-01 ②：载入变野猪第 1 回合而敌情栏留着 19/22）');
	/* 正控（✗ 不得清过头）：新一场真发生时，面板必须读**新**这一场 */
	const 敌新 = new (R.Character)({ name: '野猪', hp: 26, maxHp: 26, stats: { ac: 11 } });
	R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌新], players: [D.Player] } });
	读数.新场面板 = 面板();
	ok(读数.新场面板.includes('野猪') && !读数.新场面板.includes('巨蜥') && !读数.新场面板.includes('甩尾'),
		`★【②面板】读档后新一场没顶上（或旧场／旧动作还留着）：${S(读数.新场面板)}`);

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
		console.log(`  ①门禁：战前可存＝${S(读数.战前档)}｜战中判定＝${S(读数.战中判定)}｜拒文案＝${S(读数.拒文案)}｜战后可存＝战后`);
		console.log(`  ②面板：读档前＝${S(读数.读档前面板)}｜真读档后＝${S(读数.读档后面板) || '（空）'}｜新场顶上＝${S(读数.新场面板)}`);
		for (const f of fails) console.log(`  ✗ ${f}`);
		console.log(fails.length === 0 ? '  ✓ 真宿主判据通过（战中全类型拒＋可读文案 · 读档后无残影 · 新场顶得上）'
			: `  ✗ 真宿主判据失败 ${fails.length} 条`);
		process.exit(fails.length === 0 ? 0 : 1);
	}

	/* 两把刀：每把只拆一处，且**须恰红自己那一半**（隔离＝另一半天仍绿）。 */
	const 刀 = [
		{
			名: 'boot-门-off',
			说明: '拆「装载期装门」那一次调用 ⇒ ①半须红（②半仍绿）',
			找: 'setup.BABEL.装宿主存档门();',
			换: '/* 刀：boot 装门已拆 */',
			须红: '【①门禁',          // ①半：至少一条具名红（拆门后可能红多条，都算如期）
			须绿: '【②面板',          // ②半：**一条都不该红** ⇒ 这就是「各恰红一格」的隔离
		},
		{
			名: '读档归零-off',
			说明: '拆读档路径上的归零调用 ⇒ ②半须红（①半仍绿）',
			找: 'setup.BABEL?.敌情栏重置?.();',
			换: '/* 刀：读档归零已拆 */',
			须红: '【②面板',
			须绿: '【①门禁',
		},
	];
	let 坏 = 0;
	for (const k of 刀) {
		const 文本 = 打刀(原文本, k.找, k.换);
		const 副本 = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'books209-')), 'babel-trial.html');
		fs.writeFileSync(副本, 文本);
		const { fails } = await 判({ ...env, htmlPath: 副本 });
		const 红 = fails.filter((f) => f.includes(k.须红)).length;
		const 误红 = fails.filter((f) => f.includes(k.须绿)).length;
		const 其他 = fails.length - 红 - 误红;
		const 如期 = 红 >= 1 && 误红 === 0 && 其他 === 0;
		if (!如期) 坏 += 1;
		console.log(`  ${如期 ? '✓' : '✗'} 刀 \`${k.名}\`（${k.说明}）`
			+ ` ⇒ 本半边红 ${红} 条｜另半边红 ${误红} 条｜不属于任一半 ${其他} 条`
			+ `${如期 ? '' : `（实得全部：${S(fails)}）`}`);
	}
	console.log(坏 === 0 ? `\n✓ 两把刀如期（各恰红自己那一半，另一半天不动）` : `\n✗ ${坏}/${刀.length} 把刀未如期`);
	process.exit(坏 === 0 ? 0 : 1);
};

main().catch((e) => {
	console.error(`✗ 环境／脚本错：${e?.message ?? e}`);
	process.exit(2);
});
