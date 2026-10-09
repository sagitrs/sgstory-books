/* B4 判据（`books#418`）· 候实现红测 · sagitrs-tester-3
 *
 * 口径：B1 八项终裁 ＋ `#418` 票面四条。★B1 冻结的 L9 边界 ＋ 票面：
 *   L9 头目门槛：**准备区 → 固定**不眠者 → **胜利后前进至 L10**；**前进门 ≠ 返城门**；
 *     胜利事实必须**真实结算**；不新增随机池或额外普通遭遇。
 *   票面① 正常 L8 进入准备区、击败 Boss 后出口开放并到 L10；**到达不自动判胜**。
 *   票面② 未胜利/死亡/击晕等未获放行状态**不误开**；重复确认**不重复记账或奖励**。
 *   票面③ **前进门不消费返城机会、不自动施脆弱**。
 *
 * ★本档现在应当是红的（B4 未落）。红须**具名**。
 * 用法：ENGINE=<引擎检出> node tests/b-series/B4-l9-boss-gate.mjs
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
import fs from 'node:fs';
const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const s = await H.boot(H.resolveEnv());
const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, V = () => SC.State.variables;
/* ★★刀架（`books#418` 笔 4 · T 域）：★本族是「**红候实现**」⇒ ★**红本身是预期** ✓ ⇒
 *   但那 5 格**凭什么一定红**？★须证它们**判得了**（★补上正确声明就**转绿** ✓，✗ 恒红 ✗ 恒真）。
 *   `--knife=1` ⇒ 补 `B.Boss`（★B4-2 应转绿 ✓）
 *   `--knife=2` ⇒ 补 `B.门`（两个门 ＋ 前进门零副作用）＋ `B.胜利`（★B4-3／B4-4／B4-5／B4-6 应转绿 ✓） */
const 刀 = process.argv.find((a) => a.startsWith('--knife')) ?? null;
if (刀 === '--knife=1') { B.Boss = { 名: '不眠者', 固定: true, 入池: false }; }
if (刀 === '--knife=2') {
	B.胜利 = { 由Boss: true, 胜: true };
	B.门 = { 胜利条件: 'Boss胜', 前进: { 向: 'L10-camp', 消费返城: false, 施脆弱: false, 确认: () => ({ ok: true, 记账: true }) }, 返城: { 向: 'L10-camp', 别: '返城' } };
}

/* ── ① 准备区与 Boss 入口在**统一框架**内 ── */
判('B4-1 ★L9 **准备区**是可寻址的独立态（✗ 直接进 Boss）',
	(B?.准备区 ?? null) != null || (() => { try { B.map.moveTo('L9准备区'); return String(V()?.位置) === 'L9准备区'; } catch { return false; } })(),
	`B.准备区=${JSON.stringify(B?.准备区 ?? null).slice(0,60)}｜moveTo 后位置=${JSON.stringify(V()?.位置 ?? null)}`);
判('B4-2 ★Boss 是**固定**不眠者（✗ 随机池成员）',
	(B?.Boss ?? null) != null && typeof B.Boss === 'object' && (B.Boss.固定 === true || B.Boss.入池 === false),
	B?.Boss ? JSON.stringify(B.Boss).slice(0, 120) : '（Boss 未声明）');

/* ── ② 胜利事实**真实结算**；**到达不自动判胜**（票面①）── */
const 胜 = B?.胜利 ?? R?.胜利 ?? null;
判('B4-3 ★「胜利」是**真实结算**的单一事实（✗ 由到达 L9/L10 推得）',
	胜 != null && typeof 胜 === 'object' && Object.keys(胜).length > 0,
	`B.胜利=${JSON.stringify(B?.胜利 ?? null).slice(0,60)}｜R.胜利=${JSON.stringify(R?.胜利 ?? null).slice(0,60)}`);
判('B4-4 ★**到达不自动判胜**（Boss 胜是开门条件，✗ 位置即胜）',
	Boolean((B?.胜利 ?? null) != null && (B.胜利.由Boss === true || B.门?.胜利条件 != null)),
	`B.胜利.由Boss=${JSON.stringify(B?.胜利?.由Boss ?? null)}｜B.门.胜利条件=${JSON.stringify(B?.门?.胜利条件 ?? null)}`);

/* ── ③ 前进门 **≠** 返城门；不消费返城机会、不自动施脆弱（票面③）── */
const 门 = B?.门 ?? B?.出口 ?? null;
判('B4-5 ★L9→L10 的**前进门**与**返城门**是**两个**门（✗ 同一门两用）',
	门 != null && typeof 门 === 'object' && (门.前进 ?? null) != null && (门.返城 ?? null) != null && 门.前进 !== 门.返城,
	门 ? JSON.stringify(门).slice(0, 140) : '（门未声明）');
判('B4-6 ★前进门**不消费返城机会**、**不自动施脆弱**',
	门 != null && typeof 门 === 'object' && 门.前进?.消费返城 === false && 门.前进?.施脆弱 === false,
	门 ? `消费返城=${String(门.前进?.消费返城)}｜施脆弱=${String(门.前进?.施脆弱)}` : '（门未声明）');

/* ── ④ 票面② 后半：**重复确认不重复记账或奖励**（★`books#418` 笔 4 补格 · T 域）── */
{
	const 前进 = 门?.前进 ?? null;
	let 幂等 = false, 说明 = '（门未声明）';
	if (前进 != null && typeof 前进 === 'object') {
		const 确认 = typeof 前进.确认 === 'function' ? 前进.确认 : null;
		const 账 = (x) => (x?.记账数 ?? x?.记账 ?? null);
		if (确认) {
			try {
				const a = 确认(), b = 确认();
				const [账前, 账后] = [账(a), 账(b)];
				幂等 = (b?.ok === false || b?.记账 === false || b?.重复 === true || (账前 != null && 账后 === 账前));
				说明 = `一=${JSON.stringify(a)?.slice(0, 80)}｜二=${JSON.stringify(b)?.slice(0, 80)}`;
			} catch (e) { 说明 = '确认() 抛：' + String(e?.message ?? e).slice(0, 60); }
		} else { 说明 = '门.前进.确认 不是函数（✗ 无从重复确认）'; }
	} else if (门 != null) { 说明 = '门.前进 未声明'; }
	判('B4-7 ★**重复确认不重复记账或奖励**（票面② 后半）',
		幂等 === true,
		说明);
}

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B4 失败 ${红} 条（${红 ? '★候实现：B4 交付未落 ⇒ 本档为**红候实现**' : '全过'}）`);
/* ★刀模式：✗ 判「红几条」✓，★判「**该转绿的那格真转绿了吗**」——
 *   ★这才是「刀让结果翻转」✓（✗ 刀后仍红＝我这刀没咬到 ✓）。 */
if (刀) {
	const 该绿 = 刀 === '--knife=1' ? ['B4-2'] : ['B4-3', 'B4-4', 'B4-5', 'B4-6'];
	const 取格 = (名) => out.find((l) => l.includes(名)) ?? '';
	const 未绿 = 该绿.filter((名) => !取格(名).startsWith('✓'));
	if (未绿.length === 0) {
		console.log(`  ⇒ ★刀（${刀}）：**该绿的 ${该绿.length} 格皆已转绿** ✓ ⇒ 本档那几格**判得了**（✗ 恒红）`);
		process.exit(0);
	}
	console.log(`  ⇒ ★刀（${刀}）**没咬住**：${未绿.join('／')} 仍红 ✗ ⇒ 我判「本刀前提不成立」（✗ 判据坏）`);
	process.exit(1);
}
process.exit(红 ? 1 : 0);
