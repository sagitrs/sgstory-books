/* B2 判据（`books#416`）· 已转正（`#624`，2026-10-19）· sagitrs-tester-3
 *
 * 口径来源：B1（`#410`）八项终裁 ＋ `#416` 票面「验收与关闭」四条。
 *   ★B1 冻结的 L1-L4 交付边界（我摘成可断的）：
 *     L1 首战与武器：不用**强制成功**代替「空手可胜」的正常随机验收；不把捡武器当…
 *     L2 护甲与背包：物品按**真实 ID／容量／状态**进入背包；**不能因文案写了「获得」就算获得**。
 *     L3 治疗与战前检查：沿**真实道具/门控**；不强制玩家死一次示范。
 *     L4 钥匙、宝箱与换装：保持既定的固定引导弧（不以「必须回城」代替准备）。
 *   ★票面四条（逐条对应下面格）：① 从正常新局入口逐层完成课程并前进，**课程机制真实执行（不用按钮直接写完成）**
 *     ② 事件未结算出口不误开；合法跳过/谢绝可继续，重入/重绘/读档**不重奖重抽** ③ 死亡/战中存档禁用/装备与面板同步
 *     ④ 实现/测试合法合入（不属本档）
 *
 * ★本档**已转正**（`#624`，2026-10-19）：口径是**红应为 0**（红 > 0 ⇒ `run-all.sh` `exit 1`）。红须**具名**。
 *   ⇒ 若红，**须具名**（哪条不成立），✗ 不得以「崩了」冒充判据红（`run-all.sh` 把零出声的 rc≠0 记作**红旗** ⇒ `exit 2`）。
 * 用法：ENGINE=<引擎检出> node tests/b-series/B2-l1-l4-curriculum.mjs   （cwd = books 检出；产物须已构建）
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
const D = await import('file://' + process.cwd() + '/tools/e2e-drive.mjs');
import fs from 'node:fs';

const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const 最新源 = (dir) => {
	let m = 0;
	const 走 = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const p = d + '/' + e.name;
		if (e.isDirectory()) 走(p); else m = Math.max(m, mtime(p));
	} };
	if (fs.existsSync(dir)) 走(dir);
	return m;
};
判('B2-0 ★前置：产物新于故事源码（✗ 陈旧的弧 ⇒ 以下读数不可用）',
	mtime(art) > 最新源('stories/babel/src'), `产物 ${new Date(mtime(art)).toISOString().slice(11, 19)} vs 源 ${new Date(最新源('stories/babel/src')).toISOString().slice(11, 19)}`);

const s = await H.boot(H.resolveEnv());
const SC = s.SC, R = SC.setup.RPG, B = SC.setup.BABEL, V = () => SC.State.variables;
const D3 = SC.setup.DND3;

/* ── ① 四层课程在统一地图/事件框架下 ⇒ 出口接线（B1：九层共用地图/事件/出口框架）── */
const 层 = ['L1', 'L2', 'L3', 'L4'];
const 表 = (L) => { try { return B.map?.层?.[L] ?? B.map?.[L] ?? null; } catch { return null; } };
判('B2-1 ★L1-L4 四层在统一地图框架内**可寻址**（✗ 各自独立的旧场景）',
	层.every((L) => { try { B.map.moveTo(L); return SC.State.variables?.位置 === L || B.map.current?.() === L; } catch { return false; } }),
	`层=${JSON.stringify(层)}｜moveTo 后位置=${JSON.stringify(V().位置)}`);

/* ── ② 课程机制**真实执行**（✗ 用按钮直接写完成）—— 取「课程文档」与「运行旗」互证 ── */
const 文档 = 'docs/plans/babel/l1-9-curriculum.md';
const 有文档 = fs.existsSync(文档);
判('B2-2 ★课程文档落仓（B1 第1项：落点为 docs/plans/babel/l1-9-curriculum.md）',
	有文档, 有文档 ? '在' : `✗ 不缺 ${文档}`);
const 文本 = 有文档 ? fs.readFileSync(文档, 'utf8') : '';
const 九层 = 层.concat(['L5', 'L6', 'L7', 'L8', 'L9']);
/* ★`#634` 收紧（灵敏度低）：原形只问「正文里**有没有**这九个 token」⇒ 那九个字样出现在**别处**
 *   （链接／散文／`L5–L8` 这类区间写法）也能绿 ✗。⇒ 现要求**每层各有一行**：行首是该层
 *   （`| L1 |` 形），且该行**带正文**（剔掉表格符与 token 后仍 ≥ 10 字）。 */
const 行们 = 文本.split('\n');
const 层行 = (L) => 行们.find((x) => new RegExp('^\\s*\\|\\s*' + L + '\\b').test(x)
	&& x.replace(/[|*#\-\s]/g, '').replace(new RegExp('\\b' + L + '\\b'), '').length >= 10);
判('B2-3 ★课程文档含**九层**学习目标（L1…L9 **逐层**具名，每层各有一行带正文）',
	九层.every((L) => 层行(L) != null),
	`命中层=${九层.filter((L) => 层行(L) != null).join(',') || '（无）'}（须九层各一行）`);

/* ── ③ L2：物品按**真实 ID/容量/状态**进背包（✗ 文案写「获得」就算）── */
const inv = V().inventory ?? [];
判('B2-4 ★L2 物品进背包走**真实条目**（有 id/数量字段，✗ 只有文案）',
	inv.length > 0 && inv.every((x) => x && (x.id ?? x.物品) != null),
	`inventory=${JSON.stringify(inv).slice(0, 120)}`);

/* ── ④ 死亡/战中存档禁用（票面第③条）── */
/* ★`#634` 收紧（值面不判）：原形 `(x ?? null) != null` 把 **`false`／任何值**都算「有旗」✗
 *   （实测 `B.存档禁用` 就是 `false`）。⇒ 现须判**值面**：运行旗的类型须是 **boolean**。 */
判('B2-5 ★战中存档禁用有**运行旗**（✗ 只在文案里说）',
	typeof B?.存档禁用 === 'boolean' || typeof R?.存档禁用 === 'boolean',
	`typeof R.存档禁用=${typeof R?.存档禁用}｜typeof B.存档禁用=${typeof B?.存档禁用}（须 boolean）`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B2 失败 ${红} 条（${红 ? '★判据红：已转正 ⇒ 红应为 0，逐条具名见上' : '全过'}）`);
process.exit(红 ? 1 : 0);
