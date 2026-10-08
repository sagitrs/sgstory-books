/* B3 判据（`books#417`）· 候实现红测 · sagitrs-tester-3
 *
 * 口径：B1 八项终裁 ＋ `#417` 票面四条。★B1 冻结的 L5-L8 边界：
 *   L5 事件取舍：基础战后读懂**抽二择一**与**明确放弃**；放弃**不补取**另一支；去掉玩家**预知选卡依赖**。
 *   L6 工具与资源：读懂所需工具/实例耐久/节点余量/实际产出；课程提示**不能只有抽中采集才可理解**；缺工具**说明原因**。
 *   L7 额外风险：识别**第二战**、收益与消耗，主动选择或放弃；不把池中出现当**必须**选择；不用**指定骰面**证明平衡。
 *   L8 恢复与 Boss 准备：使用**固定温泉**；温泉**不入随机池**；**不恢复**工具耐久/耗材、不清长期正面效果。
 *   ★B1 第2项：保留 L5-L8 **可选第二战**（基础遭遇与池内第二战分开记录）；第3项：去掉独立「已领」账的验收要求。
 *
 * ★本档现在应当是红的（B3 未落）。红须**具名**，✗ 不得以崩冒充（见 run-all.sh 的红旗判）。
 * 用法：ENGINE=<引擎检出> node tests/b-series/B3-l5-l8-pool.mjs   （产物须已构建）
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
import fs from 'node:fs';

const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const s = await H.boot(H.resolveEnv());
const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, V = () => SC.State.variables;

/* ── ① 受控池（✗ 全池随机）：允许组合/禁组合须有正反断言面 ── */
const 池 = B?.受控池 ?? B?.事件池 ?? R?.受控池 ?? null;
判('B3-1 ★L5-L8 有**受控事件池**（✗ 全池随机）',
	池 != null && typeof 池 === 'object' && Object.keys(池).length > 0,
	`B.受控池=${JSON.stringify(B?.受控池 ?? null).slice(0,60)}｜B.事件池=${JSON.stringify(B?.事件池 ?? null).slice(0,60)}`);
判('B3-2 ★池有**允许组合**与**禁组合**两面（正反断言面）',
	池 != null && (池.允许 != null || 池.准入 != null) && (池.禁 != null || 池.禁止 != null),
	池 ? `键=${JSON.stringify(Object.keys(池))}` : '（池不存在）');

/* ── ② 放弃**不补取**另一支（B1 L5 边界）── */
const 放弃 = B?.放弃 ?? B?.事件放弃 ?? null;
判('B3-3 ★「明确放弃」有**独立动作**且注明**不补取**另一支',
	放弃 != null && typeof 放弃 === 'object' && Object.keys(放弃).length > 0,
	`B.放弃=${JSON.stringify(B?.放弃 ?? null).slice(0,80)}｜B.事件放弃=${JSON.stringify(B?.事件放弃 ?? null).slice(0,60)}`);

/* ── ③ 温泉**不入随机池**、**不恢复**工具耐久/耗材（B1 L8 边界）── */
const 温泉 = B?.温泉 ?? R?.温泉 ?? null;
判('B3-4 ★温泉是**固定**(✗ 不入随机池)且有**恢复范围**声明',
	温泉 != null && typeof 温泉 === 'object' && (温泉.固定 === true || 温泉.入池 === false),
	温泉 ? JSON.stringify(温泉).slice(0, 120) : '（温泉不存在）');
判('B3-5 ★温泉**不恢复工具耐久/耗材**（B1 L8：明确排除面）',
	温泉 != null && typeof 温泉 === 'object' && 温泉.恢复工具耐久 !== true,
	温泉 ? `恢复工具耐久=${String(温泉.恢复工具耐久)}` : '（温泉不存在）');

/* ── ④ 第二战：基础遭遇与池内第二战**分开记录**（B1 第2项）── */
判('B3-6 ★第二战与基础遭遇**分开记录**（B1 第2项：✗ 合并一账）',
	(B?.第二战 ?? null) != null || (B?.池内第二战 ?? null) != null,
	`B.第二战=${JSON.stringify(B?.第二战 ?? null).slice(0,60)}｜B.池内第二战=${JSON.stringify(B?.池内第二战 ?? null).slice(0,60)}`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B3 失败 ${红} 条（${红 ? '★候实现：B3 交付未落 ⇒ 本档为**红候实现**' : '全过'}）`);
process.exit(红 ? 1 : 0);
