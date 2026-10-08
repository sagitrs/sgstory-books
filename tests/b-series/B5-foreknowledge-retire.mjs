/* B5 判据（`books#419`）· 候实现红测 · sagitrs-tester-3
 *
 * 口径：B1 八项终裁（第4项 ＋ 第三节「旧档映射的明确政策」）＋ `#419` 票面四条。
 *   ★B1 第4项：**同代、无跨局继承**；新局**不带**旧预知；合法读档保留该代的真实层数/事件/奖励，
 *     但**不能在退役后重新激活**。
 *   ★第三节旧档政策（我摘成可断的 7 面）：
 *     层数/到达：用既有位置与 `babelRun.deepest` 权威，**不另存** `map.deepest` 同义账；缺字段只从**可信已有到达事实**推导。
 *     已战：既有 `babelRun.已战` 及正式战果写口；缺键为「无此记录」，**不以深度补成 true**。
 *     已领：**不新建** —— 从实际奖励/消耗/事件事实审计；**不为每层补一个 false/true**。
 *     固定层已跳过：`babelRun.已跳过`，缺则未明确跳过。
 *     抽签事件账：`span1Events` 已有抽中/已用/跳过**原样保留**，**不因读档、退役或刷新重新抽**。
 *     预知：旧键缺失**不建活动控制**；按 B5 处理退役。
 *     Boss 进度：沿真实进度写口，**不因「已到 L9/L10」补写胜利**。
 *   ★票面：① 新局不授预知/不显示旧选择；旧档明确迁移，不损已有事件/奖励/层数事实 ② 旧预知配置不继续控制未入账层，
 *     已抽事件不重抽 ③ 全调用点核查与两仓回归可核；保留合法其他消费者，**测试模式不偷用玩家旧状态**。
 *
 * ★本档现在应当是红的（B5 未落）。红须**具名**。
 * 用法：ENGINE=<引擎检出> node tests/b-series/B5-foreknowledge-retire.mjs
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
import fs from 'node:fs';
const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const s = await H.boot(H.resolveEnv());
const SC = s.SC, B = SC.setup.BABEL, V = () => SC.State.variables;
const 跑 = V().babelRun ?? null;

/* ── ① 新局**不带**旧预知（B1 第4项）── */
判('B5-1 ★新局状态里**无活动预知**（B1 第4项：同代、无跨局继承）',
	!(跑 && (跑.预知?.活动 === true || 跑.预知?.已授 === true)),
	`babelRun.预知=${JSON.stringify(跑?.预知 ?? null)}`);

/* ── ② 已战：缺键为「无此记录」，**不以深度补成 true**（B1 第三节）── */
const 已战 = 跑?.已战 ?? null;
判('B5-2 ★`babelRun.已战`**存在**且是**账形体**（B1：缺键为「无此记录」，✗ 不以深度补 true）',
	已战 != null && typeof 已战 === 'object' && !Array.isArray(已战),
	`babelRun.已战=${JSON.stringify(已战).slice(0, 90)}`);
判('B5-3 ★**不另存** `map.deepest` 同义账（B1：用既有位置与 babelRun.deepest 权威）',
	!Object.prototype.hasOwnProperty.call(V().map ?? {}, 'deepest') || V().map?.deepest === undefined,
	`V().map.deepest=${JSON.stringify(V()?.map?.deepest)}`);

/* ── ③ 已领：**不新建**每层 false/true（B1 第3项 ＋ 第三节）── */
判('B5-4 ★**不新建**「每层已领」账（B1 第3项：去掉独立「已领」账的验收要求）',
	!(跑 && 跑.已领 != null && typeof 跑.已领 === 'object' && Object.keys(跑.已领).every((k) => /^L\d+$/.test(k))),
	`babelRun.已领=${JSON.stringify(跑?.已领 ?? null).slice(0, 90)}`);

/* ── ④ 抽签事件账 `span1Events` **原样保留**（B1 第三节）── */
判('B5-5 ★`span1Events` 是**保留**式账（B1：不因读档/退役/刷新重新抽）',
	Object.prototype.hasOwnProperty.call(V(), 'span1Events'),
	`span1Events=${JSON.stringify(V()?.span1Events ?? null).slice(0, 90)}`);

/* ── ⑤ 退役后可核：**旧预知配置不控制未入账层**（票面②）── */
判('B5-6 ★有**退役**动作/标志（B5 交付面；✗ 只是不写键）',
	(B?.预知退役 ?? null) != null || (B?.退役预知 ?? null) != null || 跑?.预知?.已退役 === true,
	`B.预知退役=${typeof B?.预知退役}｜babelRun.预知.已退役=${String(跑?.预知?.已退役)}`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B5 失败 ${红} 条（${红 ? '★候实现：B5 交付未落 ⇒ 本档为**红候实现**' : '全过'}）`);
process.exit(红 ? 1 : 0);
