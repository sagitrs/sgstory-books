/* `books#399`（S5·七名河）**臂 A1**：固定遭遇**不经随机掉落口**。
 *
 * 臂案出处：`#399` 评论 `6010094502`（`sagitrs-tester-3`，05:37）§一 的 **A1** 行；
 *   ＋ `#399` 评论 `6014316573`（`temp-guest-1`）第 2 条：★**断言「随机掉落口调用计数=0」的
 *     消费点＝进战前分路** ✓（★即本臂要断的那一处）。
 *
 * 病（本臂要防的）：七名河四组遭遇是**固定敌组 ＋ 固定散货**（经片 1 的**唯一交付口**）。
 *   若哪天有人把交付**接到旧随机口**（`RPG.rollLoot` / `RPG.rollEncounter`，层表驱动）⇒
 *   ★**玩家会拿到计划外的随机物**；而这一**不会红任何既有格**（✗ 归因不到「经了旧口」）✗。
 *
 * ★**战果受控**（`BS.战果` 桩 ⇒ `'victory'`）：本臂断的是「**掉落口计数**」，✗ 不是「这局能不能赢」；
 *   而真随机下四组常以 `down` 收场 ⇒ 不控则「没有交付 ⇒ 计数当然是 0」＝**恒真式** ✗（承臂案 §二②）。
 *   故 ★**受控** 且 ★**带桩可写守卫**（✗ 不可写即具名红，✗ 不许静默退化成概率判据 —— 承 `#440` ⑦c 形）。
 *
 * 判据形（承臂案 §二 通则①②）：
 *   ★**负**：★四组战斗（E3/E5/E6/E7）各打一场 ⇒ ★**随机掉落口调用计数 = 0**（两工具分别计 ✓）。
 *   ★**正**（✗ 禁恒真式的正控）：★同一夹具下**必须真的发生过一次固定交付** ⇒
 *     ★否则本条是「什么都没发生 ⇒ 计数当然是 0」的恒真式 ✗（★那正是臂案 §二② 禁的形）。
 *   ★**正**（第二控）：★**计数器具本身要有牙** ⇒ 主动调一次 `R.rollLoot` ⇒ 计数须 **1**（✗ 恒 0 的死计）。
 *
 * 刀（`--selftest`）：★把「固定交付」改成先经一次 `R.rollLoot` ⇒ ★**须 rc=1 且具名「经了随机掉落口」**。
 *
 * 用法（**先构建产物**）：
 *     python3 <引擎>/build.py stories/babel --out stories/babel/babel-trial.html
 *     node tools/e2e-397-fixed-encounter-no-lootroll.mjs --engine <引擎检出>
 *     node tools/e2e-397-fixed-encounter-no-lootroll.mjs --engine <引擎检出> --selftest
 * 退出码：0 全过；1 有红；2 环境错（引擎根／产物／jsdom 缺，具名）。
 */
import fs from 'node:fs';
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 引擎 = process.argv[2] === '--engine' ? process.argv[3] : undefined;
const 自检 = process.argv.includes('--selftest');
const 四组 = ['E3', 'E5', 'E6', 'E7'];

/** 判据本体。`env.htmlPath` 可被自检换成打完刀的副本。 */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC;
	const B = SC.setup.BABEL, R = SC.setup.RPG, BS = SC.setup.BABEL;
	const S7 = B?.七名河, S7B = B?.七名河战斗;
	const 读数 = {};

	ok(!!S7B, '★故事没挂上 `setup.BABEL.七名河战斗`（片 2 未装载？）⇒ 本臂无从判');
	if (!S7B) return { fails, 读数 };

	/* ── 计数器具：★包在**真函数**外面，✗ 不换实现（换了就断不了真调用）── */
	const 计数 = { rollLoot: 0, rollEncounter: 0 };
	const 原 = { rollLoot: R.rollLoot, rollEncounter: R.rollEncounter };
	const 装 = () => {
		if (typeof 原.rollLoot === 'function') R.rollLoot = (...a) => { 计数.rollLoot++; return 原.rollLoot.apply(R, a); };
		if (typeof 原.rollEncounter === 'function') R.rollEncounter = (...a) => { 计数.rollEncounter++; return 原.rollEncounter.apply(R, a); };
	};
	const 卸 = () => { if (typeof 原.rollLoot === 'function') R.rollLoot = 原.rollLoot; if (typeof 原.rollEncounter === 'function') R.rollEncounter = 原.rollEncounter; };

	/* ── ★受控战果桩（★带可写守卫；`finally` 复原 ✓）── */
	const 桩可写 = (o, k) => {
		const d = Object.getOwnPropertyDescriptor(o, k);
		return !d || (d.writable !== false && !Object.isFrozen(o));
	};
	ok(桩可写(BS, '战果'),
		'★受控桩 `BS.战果` 不可写 ⇒ 本臂会退化成「看运气」✗（真随机下多为 down ⇒ 正控恒败）⇒ 具名红');
	const 原果 = BS.战果;
	BS.战果 = () => 'victory';

	try {
		/* ★★第二控：计数器具**自身要有牙** ⇒ 主动调一次 ⇒ 须计到 1（✗ 恒 0 的死计） */
		装();
		try { R.rollLoot('L2'); } catch { /* 真实现可能缺层 ⇒ 计数已在包装内加过 ✓ */ }
		ok(计数.rollLoot === 1, `★计数器具无牙：主动调一次 \`R.rollLoot\` 后计数应为 **1**（实得 ${计数.rollLoot}）—— 若恒 0 则本臂全篇是恒真式`);
		卸();

		for (const id of 四组) {
			const node = S7.节点表?.[id];
			ok(!!node, `${id} 不在节点表（片 2 未装载？）`);
			if (!node) continue;
			/* 每组：复位存档域与背包 ⇒ 干净入场（承 `#440` 第 66 组的存-复原口径 ✓） */
			const 背存 = JSON.parse(JSON.stringify(R.itemsOf?.(SC.setup.DND3.Player) ?? SC.setup.DND3.Player.items ?? []));
			SC.State.variables['sevenNames'] = { 态: '进行中', 当前: id, 结果: {}, 机会: { 用: false, 实例: 'a1' }, 路径: [] };
			try {
				计数.rollLoot = 0; 计数.rollEncounter = 0; 装();
				/* ★真路：走战斗行动（首个选项＝应战/侦察）⇒ 真跑一场（★真随机 ✓ 臂案 §一口径 ✓） */
				const 果 = await S7B.战斗行动(0, { interactive: false });
				/* 若首战未胜（stalemate/stunned/down）⇒ 续战（✗ 改选 ✓）直到结账或死 */
				let 末 = 果;
				for (let k = 0; k < 6 && 末?.未胜; k++) 末 = await S7B.继续({ interactive: false });
				卸();
				读数[id] = { 战果: 末?.战果 ?? null, rollLoot: 计数.rollLoot, rollEncounter: 计数.rollEncounter, 交付: 末?.交付?.length ?? null };
				/* ★负：二口零调用 */
				ok(计数.rollLoot === 0, `★${id} 战后**经了随机掉落口**（\`R.rollLoot\` 调用 ${计数.rollLoot} 次）—— 固定遭遇的交付只许走唯一交付口`);
				ok(计数.rollEncounter === 0, `★${id} 战后**经了随机遭遇口**（\`R.rollEncounter\` 调用 ${计数.rollEncounter} 次）`);
			} finally {
				卸();
				SC.setup.DND3.Player.items = 背存.map((x) => R.reviveItem(x));
			}
		}
		/* ★正控：★本夹具下必须**真的发生过一次固定交付** ⇒ 否则负条是恒真式 */
		const 有交付 = Object.entries(读数).filter(([, v]) => (v.交付 ?? 0) > 0).map(([k]) => k);
		ok(有交付.length > 0,
			`★正控失败：四组里**没有任何一组发生固定交付**（读数 ${JSON.stringify(读数)}）⇒ 上面「计数 = 0」是恒真式（✗ 什么都没发生当然 0）`);
	} finally { 卸(); BS.战果 = 原果; }
	return { fails, 读数 };
}

/* ============ --selftest：刀 ============ */
if (自检) {
	const env = resolveEnv(引擎);
	/* ★刀：在**临时副本**上给「固定交付」前置一次真随机口调用 ⇒ 判据须具名红。 */
	const 补 = fs.readFileSync(env.htmlPath, 'utf8').replace(
		/(const 发 = 胜后交付\(node\);)/,
		'if (typeof R?.rollLoot === "function") { try { R.rollLoot("L2"); } catch (e) {} }\n\t\t$1');
	const 临时 = env.htmlPath + '.knife.html';
	fs.writeFileSync(临时, 补);
	const { fails } = await 判({ ...env, htmlPath: 临时 });
	fs.rmSync(临时, { force: true });
	const 具名 = fails.some((m) => /经了随机掉落口/.test(m));
	console.log(`  自检：${具名 ? '✓ 刀咬住了' : '✗ 刀没咬住'}（失败 ${fails.length} 条）`);
	for (const m of fails.slice(0, 3)) console.log(`    ${m}`);
	process.exit(具名 ? 0 : 1);
}

let env;
try { env = resolveEnv(引擎); } catch (e) { console.error(`✗ 环境错：${e?.message ?? e}`); process.exit(2); }
const { fails, 读数 } = await 判(env);
console.log(`  A1 固定遭遇不经随机掉落口｜读数：${JSON.stringify(读数)}`);
for (const m of fails) console.log(`  ✗ ${m}`);
console.log(fails.length ? `  ⇒ ★判据红 ${fails.length} 条` : '  ⇒ ★全过（负：二口零调用 ✓｜正：确有固定交付 ✓｜器具：有牙 ✓）');
process.exit(fails.length ? 1 : 0);
