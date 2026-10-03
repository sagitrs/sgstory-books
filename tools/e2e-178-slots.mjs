/* `books#178` 件 1：**槽位判据**（真宿主 · jsdom 跑实际产物）
 *
 * ★立此格的理由（`dev-10` 在 `#183` 提出）：㉛／㉜／㉝ 都只覆盖**我自己写的那条路**，
 *   而「槽位被别的东西改掉」这件事**只有走真导航才暴露得到** ⇒ 需要本格。
 *
 * ★★量具教训（本席在 `#183` 调查中实测所得，务必保留）：
 *   真宿主的 `Save.slots.isEmpty(i)` **一旦有过任何写入，就对所有号返回假**（空槽亦然），
 *   而 `has(i)` 逐号准确、`get(i)` 对空槽返回**占位对象**（字段为 undefined）。
 *   ⇒ 本格**一律用 `has`／`get` 判空否**；用 `isEmpty` 会得到「看起来有档」的假象。
 *
 * 断言：①故事三槽（3/4/5）在**导航**与**点温泉**之后读数不变（除我自己写的那一号）
 *       ②槽 1 的整备点自动写落在**4 号**（甲案改号后）
 */
const S = (v) => JSON.stringify(v)?.slice(0, 40) ?? String(v);
const 槽号 = { 快存: 3, 战前保底: 4, 手动: 5 };
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
try {
	const { resolveEnv, boot, playPassage } = await import('./e2e-harness.mjs');
	const 引擎 = process.argv[2] === '--engine' ? process.argv[3] : undefined;
	const s = await boot(resolveEnv(引擎));
	const 槽 = s.SC.Save.slots, B = s.SC.setup.BABEL;
	const 空 = (i) => !槽.has(i);
	const 名 = (i) => 槽.get(i)?.desc;
	console.log(`  槽位面：has 可用 = ${typeof 槽.has === 'function'}｜三槽皆空 = ${[3,4,5].every(空)}`);
	/* ① 快存 → 导航 → 读数不变 */
	ok(B.快存(槽号.快存), '★快存没写进 3 号');
	const 存名 = 名(槽号.快存);
	await playPassage(s, '探索'); await new Promise((r) => setTimeout(r, 200));
	ok(名(槽号.快存) === 存名, `★导航改动了快存槽（${S(存名)} ⇒ ${S(名(槽号.快存))}）`);
	ok(空(槽号.手动), '★导航凭空写进了手动槽 5 号');
	/* ② 整备点自动写落 4 号（点真按钮 ⇒ 走真动作） */
	B.map.moveTo('L8'); await playPassage(s, '探索'); await new Promise((r) => setTimeout(r, 200));
	const 钮 = [...s.doc.querySelectorAll('button')].find((e) => /泡进温泉/.test(e.textContent));
	ok(钮 != null, '★L8 找不到温泉按钮（界面变了？）');
	钮?.click(); await new Promise((r) => setTimeout(r, 300));
	ok(!空(槽号.战前保底), '★点温泉后 4 号仍空 ⇒ 整备点自动写没落');
	ok(String(名(槽号.战前保底)).includes('·战前'), `★4 号的名不带战前标记（实得：${S(名(槽号.战前保底))}）`);
	ok(名(槽号.快存) === 存名, `★点温泉改动了快存槽（${S(存名)} ⇒ ${S(名(槽号.快存))}）`);
	console.log(`  快存槽＝${S(存名)}｜保底槽＝${S(名(槽号.战前保底))}`);
} catch (e) { fails.push(`★脚本异常：${String(e?.message).slice(0, 90)}`); }
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length === 0 ? '  ✓ 槽位判据通过（导航与整备点皆不改动他槽）' : `  ✗ 槽位判据失败 ${fails.length} 条`);
process.exit(fails.length === 0 ? 0 : 1);
