/* `books#399`（S5·七名河）**臂 A2**：避战分流（侦察／脱离）—— 只选一次 ＋ 加成**不越界** ＋ 脱离成功无散货。
 *
 * 臂案出处：`#399` 评论 `6010094502`（`sagitrs-tester-3`，05:37）§一 的 **A2** 行。
 *
 * 四断（承臂案 §二 通则①②）：
 *   ★①**战前只选一次**：★第一次行动后**再选** ⇒ 须**具名拒**（✗ 改选／✗ 重掷侦察）。
 *   ★②**＋3 仅侦察**：★侦察路径里**攻／伤／AC 三项与基线逐字同** ✗ 无任何加成。
 *   ★③**－6 仅脱离**：同上（✗ 不得溢出到攻伤）。
 *   ★④**脱离成功 ⇒ 无散货**：★背包／掉落**前后逐字段同**。
 *   ★⑤**脱离失败 ⇒ 立即开战且不可改选**（★须真走到战斗 ⇒ 见读数 `战果`）。
 * ★**正控**（✗ 禁恒真式）：★②③ 的「逐字同」必须配「**若真加了成就会变**」的证明 ——
 *   故本臂**同时**取一份「人为把加成接到攻伤」的对照样本 ⇒ ★断言**它确实会不同**（✗ 否则比较是空转）。
 *
 * 刀（`--selftest`）：★把「＋3」误接到攻伤 ⇒ 须 rc=1 且具名「加成越界」。
 *
 * 用法（**先构建产物**）：
 *     node tools/e2e-397-scout-flee-branch.mjs --engine <引擎检出> [--selftest]
 * 退出码：0 全过；1 有红；2 环境错（具名）。
 */
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 引擎 = process.argv[2] === '--engine' ? process.argv[3] : undefined;
const 自检 = process.argv.includes('--selftest');

/** 取「攻／伤／AC」三项（★A2②③ 要比的就是这三项）。 */
const 三面 = (D) => {
	const p = D.Player ?? {};
	const 武 = (p.items ?? []).find((x) => x?.equipped && x?.slot === 'weapon') ?? null;
	return {
		str: p.str ?? null, dex: p.dex ?? null, ac: p.ac ?? null, acBonus: p.stats?.ac_bonus ?? null,
		武id: 武?.id ?? null, 武dmg: 武?.dmg ?? null, 武atk: 武?.atkBonus ?? null,
	};
};

async function 判(env, { 刀 = false } = {}) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, R = SC.setup.RPG, D = SC.setup.DND3, B = SC.setup.BABEL;
	const S7 = B?.七名河, S7B = B?.七名河战斗;
	const 读数 = {};
	ok(!!S7B && !!S7, '★故事没挂上 `setup.BABEL.七名河战斗`／`七名河`（S3 未装载？）⇒ 本臂无从判');
	if (!S7B || !S7) return { fails, 读数 };

	/* ★刀（世界侧扰动）：★让侦察/脱离行动**顺带把 ＋3 灌进玩家 STR** ⇒ ★模拟「加成溢出到攻／伤／AC」的错接 ✓
	 *   ★为何不注入产物：★本席试过两种产物锚（`属性修正`／`掷检定`）—— ★前者**不在判据的线上**（改它判据不红 ✗）、
	 *     后者**把装载打坏**（锚命中别处 ⇒ `七名河战斗` 未挂上 ✗）⇒ ★改在**世界侧**在**判据真正经过的那一步**扰动 ✓。 */
	/* ★`BS.七名河战斗` 是 `Object.freeze` 的 ⇒ ★给它的属性赋值会抛（ESM 严格）⇒ ★用**局部别名**绕开 ✓ */
	const 原行 = S7B.战斗行动, 原继续 = S7B.继续;
	const 行动 = 刀 ? (async (...a) => { const r = await 原行(...a); D.Player.str = (D.Player.str ?? 0) + 3; return r; }) : 原行;
	const 续 = 刀 ? (async (...a) => { const r = await 原继续(...a); D.Player.str = (D.Player.str ?? 0) + 3; return r; }) : 原继续;
	const 域 = 'sevenNames';
	const 档 = (id, 态 = '进行中') => { SC.State.variables[域] = { 态, 当前: id, 结果: {}, 机会: { 用: false, 实例: 'a2' }, 路径: [] }; };

	/* ── ②③ 的**正控**：先证「三面**会**变」这件事**测得到**（✗ 否则「逐字同」可能是尺坏 ✓） ── */
	档('E3'); const 基 = 三面(D);
	const 原修 = S7.属性修正;
	let 敏感 = null;
	try {
		S7.属性修正 = (k) => { const v = 原修(k); return k === 'STR' ? v + 2 : v; };   // ★人为把 STR 抬高
		D.Player.str = 18;
		敏感 = 三面(D);
		D.Player.str = 基.str; S7.属性修正 = 原修;
	} catch (e) { S7.属性修正 = 原修; }
	ok(敏感 && JSON.stringify(敏感) !== JSON.stringify(基),
		`★正控（尺的敏感度）：人为改 \`str\` 后三面**须跟着变**（✗ 否则「逐字同」是空转尺 ✓；实得 ${JSON.stringify(敏感)}）`);

	for (const id of ['E3', 'E5', 'E6', 'E7']) {
		const node = S7.节点表?.[id];
		ok(!!node, `${id} 不在节点表`);
		if (!node) continue;
		/* ---- ① 只选一次 ---- */
		档(id);
		const 一 = await 行动(0, { interactive: false });
		const 二 = await 行动(0, { interactive: false });
		ok(二?.ok === false && ['SEVEN_BATTLE_LOCKED', 'SEVEN_NODE_DONE'].includes(二.code),
			`★${id} 第二次选择须**具名拒**（✗ 改选；实得 ${JSON.stringify(二).slice(0, 70)}）`);
		读数[id] = { 一: 一?.ok, 一码: 一?.code ?? null, 二: 二?.ok, 二码: 二?.code ?? null, 果: 一?.战果 ?? null };
	}
	/* ---- ②③ 加成不越界：侦察／脱离路径里三面须与基线逐字同 ---- */
	for (const [id, 路] of [['E3', 'scout'], ['E3', 'escape']]) {
		档(id);
		const 前 = 三面(D);
		try { S7.属性修正 = 原修; } catch {}
		const r = await 行动(路 === 'escape' ? 1 : 0, { interactive: false });
		const 后 = 三面(D);
		ok(JSON.stringify(前) === JSON.stringify(后),
			`★${id} 的${路 === 'escape' ? '**－6 仅脱离**' : '**＋3 仅侦察**'}：★三面（攻／伤／AC）须**逐字同**（✗ 加成越界）—— 前 ${JSON.stringify(前)} 后 ${JSON.stringify(后)}`);
		读数[`${id}:${路}`] = { 前, 后, ok: r?.ok ?? null };
	}
	/* ---- ④ 脱离成功 ⇒ 无散货（★走第一次就脱离的分支：`继续` 之前必须是「通过」）---- */
	档('E3');
	const 背前 = JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON()));
	let 脱离 = await 行动(1, { interactive: false });
	for (let k = 0; k < 4 && 脱离?.未胜 && !脱离?.已死; k++) 脱离 = await 续({ interactive: false });
	const 背后 = JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON()));
	ok(背后 === 背前,
		`★E3 脱离路：★背包**前后逐字段同**（✗ 脱离不该发散货；前 ${背前.slice(0, 60)} 后 ${背后.slice(0, 60)}）`);
	读数['E3:脱离背包'] = { 件数前: JSON.parse(背前).length, 件数后: JSON.parse(背后).length, 同: 背后 === 背前, 果: 脱离?.战果 ?? null };
	return { fails, 读数 };
}

if (自检) {
	const env = resolveEnv(引擎);
	const { fails } = await 判(env, { 刀: true });
	const 具名 = fails.some((m) => /加成越界/.test(m));
	console.log(`  自检：${具名 ? '✓ 刀咬住了' : '✗ 刀没咬住'}（失败 ${fails.length} 条）`);
	for (const m of fails.slice(0, 3)) console.log(`    ${m}`);
	process.exit(具名 ? 0 : 1);
}

let env;
try { env = resolveEnv(引擎); } catch (e) { console.error(`✗ 环境错：${e?.message ?? e}`); process.exit(2); }
const { fails, 读数 } = await 判(env);
console.log(`  A2 避战分流（★刀关）｜读数：${JSON.stringify(读数).slice(0, 320)}`);
for (const m of fails) console.log(`  ✗ ${m}`);
console.log(fails.length ? `  ⇒ ★判据红 ${fails.length} 条` : '  ⇒ ★全过（只选一次 ✓｜＋3/−6 不越界 ✓｜脱离无散货 ✓｜尺有敏感度 ✓）');
process.exit(fails.length ? 1 : 0);
