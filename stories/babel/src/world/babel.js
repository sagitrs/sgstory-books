/* 巴别之井 · 试玩版 —— 世界地图（一段：L1–L9 攀爬层 ＋ L10 整备区 ＋ 单向门后的 L11）
 *
 * 面（层表与遭遇表同键配对，`#1748`）：`src/dnd/dnd3/core/climb.js` 的 `LAYER_META_SPAN1`（L1–L9 climb、
 *   L10 hub）与 `ENCOUNTER_SPAN1`（1–9 层遭遇/掉落表；第 10 层无条目 ⇒ 整备区不抽遭遇）。
 * 单向门法则（`docs/plans/babel/outline.md`）：**段内自由、段间封闭** ⇒
 *   L1↔L2↔…↔L9↔L10 双向（段内自由）；`L10-gate → L11` **单向**（无回边，见 `DND3.span1GateExit`）。
 *
 * ★ 第 10 层的三个地点**直接取包里的实例**（`DND3.buildSpan1Hub()`）——本文件**不重写**它们的文本
 *   （单一权威源：L10 的说法只在 `scenes/span1-hub.js` 一处）。取的是同一个 `Location` 对象，
 *   故包里对这两个入口的接线（`#1776` 的资源/聚落 API）在此**一并生效**。
 *
 * 车道：本文件是**故事面**（`stories/**`），只做装配 —— 判定数学、层表、道具全在 `src/` 里。
 */

const DND3 = setup.DND3;
const R = setup.RPG;

/* ---------- 1–9 层：层内容表 ----------
 * `gather` 是该层可采到的采集点道具 id（`#1776` 的采集点是**道具**，须先发放到背包才能采 —— 见 `actions`）。
 * 层名与描述是**故事面文本**（house rule 性质的叙事，非 SRD 条目）；层 id 与层表**逐字一致**（同键配对）。 */
const LAYERS = [
	{
		id: 'L1', name: '第 1 层 · 苏醒之地', gather: 'stone-pile', gatherLabel: '碎石堆',
		desc: '你在一堆碎石里睁开眼。头顶是望不到顶的竖井，脚下是被人踩秃的路。'
			+ '有人从这里往上爬过 —— 没爬出去的人，留在了路边。',
	},
	{
		id: 'L2', name: '第 2 层 · 倒木坡', gather: 'dead-wood', gatherLabel: '枯倒的木料',
		desc: '坡上横着几株枯死的巨木，根须还咬在岩缝里。有人用它们搭过梯子，梯子断了。',
	},
	{
		id: 'L3', name: '第 3 层 · 磷光廊', gather: 'flint-seam', gatherLabel: '燧石露头',
		desc: '岩壁上渗出淡蓝色的光，是苔藓，也是别的什么。空气里有铁锈味。',
	},
	{
		id: 'L4', name: '第 4 层 · 谷穗崖', gather: 'wild-grain', gatherLabel: '野生谷穗',
		desc: '崖边居然长着谷子 —— 风也不知道该从哪儿吹进来。有谷子，就有吃谷子的东西。',
	},
	{
		id: 'L5', name: '第 5 层 · 铜锈矿道', gather: 'copper-vein', gatherLabel: '铜矿石脉',
		desc: '矿道被人撬开过。绿色的铜锈蹭在岩壁上，像很久以前有人在这里干活。',
	},
	{
		id: 'L6', name: '第 6 层 · 兽骨阶', gather: 'stone-pile', gatherLabel: '碎石堆',
		desc: '一级一级的台阶，是用骨头垒的。不知道是兽的，还是别的。',
	},
	{
		id: 'L7', name: '第 7 层 · 无风井', gather: 'dead-wood', gatherLabel: '枯倒的木料',
		desc: '这里没有风，火把的烟直直地往上飘。静得能听见自己的心跳。',
	},
	{
		id: 'L8', name: '第 8 层 · 盐霜壁', gather: 'copper-vein', gatherLabel: '铜矿石脉',
		desc: '岩壁上结着一层白霜，舔一下是咸的。越往上，石头越凉。',
	},
	{
		id: 'L9', name: '第 9 层 · 门前', gather: 'wild-grain', gatherLabel: '野生谷穗',
		desc: '前面透出一点光 —— 那是第 10 层。最后一段路，往往是最难走的。',
	},
];

const map = new R.WorldMap({ id: 'babel' });

/** 层 id → 该层采集点（供采集动作与读数用） */
const GATHER_OF = {};
for (const L of LAYERS) GATHER_OF[L.id] = L.gather;

/* ---------- 层节点账（`#116`：采集点**挂地点**，✗ 进背包）----------
 * ## 为何要新键（✗ 复用 `babelGiven`）
 *   `babelGiven` 是**一次性事实**的 bool 账（语义＝「该层发放过没有」）——
 *   把 charges 快照塞进去会把**两种语义混进一个键**（领队 `#116` 裁甲）。
 *   ⇒ 本键只存**节点快照**（item JSON，含 `charges`），per-run 语义对齐 `babelRun` 族：
 *     新局 ⇒ 新节点；旧档里遗留的 `babelGiven` **留着不管**（= 兼容，✗ 迁移）。
 * ## 语义
 *   · 每层一份（`key = 层 id`）⇒ **隔层不携带** ✓
 *   · `charges` 扣在**本账里的快照**上 ⇒ **按层持久** ✓（采空即 0 ⇒ 动作消失）
 */
/* ⚠ **键名说明**：领队 `#116` 裁甲原名 `span1Nodes`；因**(乙)** 把料场也纳入同一模型
 *   （`L20-settlement` 也持一个 `dead-wood` 节点）⇒ 键名改 **span-中性** `gatherNodes`
 *   （**实质不变**：独立新键 · 存快照 · per-run；仅名字不再暗示「一段专属」）。 */
const nodesOf = () => (State.variables.gatherNodes ??= {});
/** 取该层节点**快照**（首次进层时按 `defItem` 建一份；✗ 共享定义实例）。
 *  ★读的是**共用表** `setup.BABEL.gatherPoints`（一段、二段各层、料场都登记在此）
 *    ⇒ 同一 helper 服务所有「持节点的地点」（`#116` 目标模型）。
 *  @returns 节点快照 `{id, charges, equipped}` 或 `null`（该处无采集点） */
const nodeAt = (layerId) => {
	const pointId = setup.BABEL?.gatherPoints?.[layerId] ?? GATHER_OF[layerId];
	if (!pointId) return null;
	const bag = nodesOf();
	return (bag[layerId] ??= R.createItem(pointId).toJSON());
};
/** 单点写回收口：**采完把 holder 里的快照 charges 写回本账**。
 *  ⚠ 为何必须写回：`RPG.act` 的 commit 只写 **actor 的槽**，而这里 actor 是**临时 holder**
 *    （伪容器）⇒ 不写回则 charges 每次都从账里取旧值 ⇒ **表面「采了不耗」**（本席 `#116` 勘察实测到该形）。
 *  ★收口成**一个 helper**（✗ 各动作散写）：将来改载体（如并入引擎）只改这一处。 */
const commitNode = (layerId, holder) => {
	const pointId = setup.BABEL?.gatherPoints?.[layerId] ?? GATHER_OF[layerId];
	const slot = (holder?.items ?? []).find((s) => s.id === pointId);
	if (!slot) return null;
	nodesOf()[layerId] = slot;
	return slot;
};

/* ---------- `books#176`：**终局位的闸门**（死亡＝游戏失败 ⇒ 尸体不得继续行动）----------
 * 动机：失败面是**独立段落**，但 `MapScene` 的出口分支在 `moveTo` 之后会**无条件重绘**一屏
 *   （引擎 `60-map.js:363-364`，那条路没有 `#leftPassage` 守卫）⇒ 死亡后那一屏会被画进失败页。
 *   ⇒ 两处闸门把「死人的地图」关掉：**层动作**（`when`）与**出口边**（`when`）都要求「活着」。
 *   ✗ 不指望引擎侧改（pin 已定）；这也是玩家侧真正的漏洞面：0 血还能点着走。 */
const 活着 = () => DND3.Player?.isDown !== true;
/** 动作的 `when` 合成：把「活着」与动作自己的条件**与**起来（✗ 两处各挂 —— `when` 只有一个位）。 */
const 只给活人 = (a) => ({ ...a, when: () => 活着() && (typeof a.when === 'function' ? a.when() : true) });
/** 边的 `when` 合成：同上（非头目层原本不挂守卫 ⇒ 现形一律挂，第一条就是「活着」）。 */
const 边可否通行 = (from, to) => {
	const w = 边守卫(from, to);
	return () => 活着() && (w ? w() : true);
};

/* ---------- L5+ 选择制：**每层一次**抽签（`books#133` 笔 1）----------
 * 设计稿（`#132` 的 `writer` 稿）§3.2：抽签必须「**每层一次、结果入档**」——
 *   若每次重绘都抽 ⇒ 玩家**每点一下**（乃至每次进层）都换选项，且**读档后变样**（那正是 bug）。
 * ⇒ 本局账 `$span1Events`＝`{ 层 id: { 抽中: [类,类], 已用: 类|null } }`：
 *   · **只在该层首次进入时抽**（`ensureDraw`，由 `onEnter` 调；`??=` ⇒ 只抽一次）
 *   · 随机一律走 **`RPG.rng`**（全仓唯一随机入口）⇒ 判据与刀可 `set()`／`setSequence()` 定值
 *     ⇒ 「同随机源 ⇒ 同结果」可**机械复现**（✗ 靠“看起来随机”目测）
 *   · ⚠ 故事侧裸键**不进** `envelope().domains`（`#116` 披露过的审计缺口）⇒ 本键**同笔登记**
 *     （见文件尾部 `登记域` 的键表）
 *
 * ★池子定形（`writer` 稿 §1 的**推荐案甲**）：三个**正向类**取二（宝箱／采集／第二场战斗）。
 *   陷阱**不入池**（「抽到灾祸」不该是一个可以点的按钮 ⇒ 那是**死格**）
 *   ⇒ 陷阱作为「层危害」落到笔 2（与工具耐久同笔——拆解要用工具）。
 *   ⚠ 本池是**一处常量**（`EVENT_KINDS`）：若领队裁乙或丙，只改这一行 ＋ 笔 2 的处置动作，机制件不动。 */
const EVENT_KINDS = Object.freeze(['chest', 'gather', 'battle']);
/** 本局事件账（**只读**，✗ 在此抽：守卫函数（`when`）不得有抽签副作用 —— 那会让「看一眼」就抽）。 */
const eventsOf = () => (State.variables.span1Events ??= {});
/** 抽二（**不放回**，走 `RPG.rng.index`）：**同随机源 ⇒ 同结果**；池不足二 ⇒ 显式报错（✗ 静默少抽）。
 *  `必含` 非空且落在池内时（`books#164` 预知）：**该类先占首位**，另一槽照常随机
 *    —— 随机单元只耗**一枚**（而非两枚）⇒ 与无预知时的消耗次序**不同**，判据与 e2e 的注入序列按此写。 */
const drawTwo = (pool = EVENT_KINDS, 必含 = null) => {
	if (!Array.isArray(pool) || pool.length < 2) {
		throw new Error(`[babel] 抽签池不足二（实得 ${Array.isArray(pool) ? pool.length : typeof pool}）`);
	}
	const rest = pool.slice();
	if (必含 != null && rest.includes(必含)) {
		const 锚 = rest.splice(rest.indexOf(必含), 1)[0];
		const second = rest.splice(RPG.rng.index(rest.length), 1)[0];
		/* ★`预知类`＝**这池的来历**（哪一类是被预知钉进来的）⇒ 判据可断言「为什么」（✗ 只断「是什么」）。 */
		return { 抽中: [锚, second], 已用: null, 预知类: 必含 };
	}
	const first = rest.splice(RPG.rng.index(rest.length), 1)[0];
	const second = rest.splice(RPG.rng.index(rest.length), 1)[0];
	return { 抽中: [first, second], 已用: null };
};

/* ---------- `books#164`：永久被动「预知」的**实效** ＝「选择下一层内容的能力」----------
 * 操作者定义：「预知效果就是选择下一层内容的能力，只是个形式上的能力。」
 * 形（领队 2026-10-03 02:30 裁）：持有者在 **L5、L6、L7** 各可**指定一次**下一层（L6／L7／L8）抽签池的
 *   **必含一类**（三正向类选一），另一槽照常随机。**不改数值、不加掉落、不降难度**（纯能动性 agency）。
 * ★为何 **L8 不出**：L9 ＝ 固定头目 ＋ 唯一出口（无抽签）⇒ 在 L8 选「下一层必含」是**死选项**，
 *   按本仓「无死格」既裁不出（边界由 `verify.mjs` 的㉘格钉住）。
 * ★为何还要「目标层**尚无账**」这道门：地图有回边（上下列层可来回走）⇒ 玩家可 L5⇒L6⇒回 L5；
 *   那时 L6 的账已抽定，再选一次仍是**死选项** ⇒ `when` 须同时要求目标层尚未入账。
 * ⚠ 本形**不碰结算**：选中的类走的还是**同一条动作**、取**同一张表**的值（㉘格的形式约束判据钉它）。 */
const 预报可选 = Object.freeze({ L5: 'L6', L6: 'L7', L7: 'L8' });   // 本层 ⇒ 目标层（**一处定义**）
const 预知授予层 = 'L5';      // ★授予层（`#132` 甲裁定：L5 授予，✗ 跨死亡 —— 重爬 L5 重新授予）
const 类名 = Object.freeze({ chest: '宝箱', gather: '采集', battle: '第二场战斗' });
/** 预报账：目标层 ⇒ 被钉的类。**新键**（同笔登记进域契约，见文件尾键表）。 */
const 预报账 = () => (State.variables.span1Foresee ??= {});
/** ★**只读**（✗ 经 `预报账()`）——`when` 路径只许读，建键是写路径（`记预报`）的事。 */
const 预报类 = (targetId) => State.variables.span1Foresee?.[targetId] ?? null;
/** 记一次预报（只允许在 `预报可选` 列出的层上调）。 */
const 记预报 = (layerId, kind) => {
	const target = 预报可选[layerId];
	if (!target) throw new Error(`[babel] 本层不可预知（${layerId}）`);
	预报账()[target] = kind;
	return target;
};
/** 本层该不该出「预知」按钮（**只读**：`when` 不得有副作用 —— 同 `eventsOf` 的说明）。 */
const 可预知 = (layerId) => {
	const target = 预报可选[layerId];
	if (!target) return false;                    // L8 等：无下一层抽签 ⇒ 不出（死选项）
	if (预报类(target) != null) return false;    // 本层已选过（每层一次，✗ 可改）
	if (eventsOf()[target]) return false;         // ★目标层已抽定（回边可达）⇒ 再选是死选项
	const P = DND3.Player;
	return typeof P?.contains === 'function' && P.contains('precognition');
};
/** 预知按钮（三类各一个，**静态入表**、由 `when` 筛 —— 与事件动作同形）。
 *  ⚠ **不挂 `事件类`**：那个键是「抽中的事件」的**结构标记**（㉑㉓格按它取可选面）——
 *    预知按钮不是池里的事件类，给它挂上会让那两格把本按钮算成事件 ⇒ 既有判据假红（本席实跑撞到）。
 *    本按钮的结构标记是 **`预知类`**（取值＝目标类），✗ 与 `事件类` 混用。
 *  ★`books#177` 起，层动作的**结构标记共三种**（判据一律按标记取面，✗ 按文案猜）：
 *    `事件类`＝抽中的池内事件（㉑㉓㉘）｜`预知类`＝预知钮（㉘）｜`温泉`＝**固定动作**（㉛，✗ 入池）。 */
/* ★`books#259` 裁 6：**预知＝进层的门**（操作者原文「先预知，再进入下一层，再战斗」）——
 *   4 选项（3 类 ＋ 不预知）出现在**攀上一层那一刻**，**替代该刻其他选项**；选完即到达＋战斗＋结算被预知的事件。
 *   ⚠ 实现面：`Exit.action` 是**同步**的移动副作用（引擎 `60-map.js:45` 注释），而 `action` **不能抑制**随后的
 *     `map.moveTo`（同档 `:350`／`:362` 无条件调用）⇒ 门的做法是**在 action 里起一个模态选择**：
 *     模态即刻替换该刻的选项（＝裁 6 的「替代」），引擎的 moveTo 在模态之下完成（等价于「那一刻先问、再到达」）。
 *   ⚠ 旧形（L5/L6/L7 各三个**按钮**）**退役** —— 那是「随时可预知」，与「门」互斥（✗ 两形并存）。 */
const 预知门 = (from) => {
	const P = DND3.Player;
	if (typeof P?.contains !== 'function' || !P.contains('precognition')) return false;   // ✗ 持有者 ⇒ 走普通向上边
	if (!可预知(from)) return false;                        // 同一套条件（持有者 ∧ 本层可预报 ∧ 未选过 ∧ 目标层未抽）
	const 选项 = [
		...EVENT_KINDS.map((k) => ({ text: `（预知）下一层会有${类名[k]}`, value: k })),
		{ text: '你没有多想，直接走入下一层', value: null },
	];
	P.choice(选项).then((v) => { if (v) 记预报(from, v); });
	return true;
};

const 预知动作 = (L, kind) => ({
	预知类: kind,                 // ★结构标记兼目标类（㉘格按此取钮与断言）
	text: `（预知）听见下一层的低语：${类名[kind]}`,
	when: () => 可预知(L.id),
	action: () => {
		记预报(L.id, kind);
		R.perform(`你听见下一层的低语 —— 那里会有${类名[kind]}。`);
	},
});

/** 该层**首次进入**时抽一次并登记入档；已有则**原样返回**（幂等，✗ 重抽）。
 *  ★`books#164`：若**上一层曾预报**本层（`$span1Foresee`），把它作为**必含类**交给 `drawTwo`。
 *  @returns 该层的事件账（`{抽中,已用[,预知类]}`） */
const ensureDraw = (layerId) => {
	const bag = eventsOf();
	return (bag[layerId] ??= drawTwo(EVENT_KINDS, 预报类(layerId)));
};
/** 择一：记下用了哪一类（`已用` 非空 ⇒ 同一层的另一个选项 `when` 变假 ⇒ 两个按钮一起退场）。 */
const markUsed = (layerId, kind) => {
	const e = ensureDraw(layerId);
	e.已用 = kind;
	return e;
};
/** 守卫读数：该层抽中 `kind` 且**尚未用过任何一类**（✗ 在此抽签——见 `eventsOf` 的说明）。 */
const eventPending = (layerId, kind) => {
	const e = eventsOf()[layerId];
	return !!e && 本层已战(layerId) && e.已用 === null && e.抽中.includes(kind);
};

/** ★`books#259` 裁 1（战斗不可跳）：本层**是否已打过那一场**。
 *   它是**向上边**与**事件面**的共同前置 ⇒ 「每层严格『先战斗→再判定事件』」，且
 *   「不想触发事件可在**事件入口**跳过」（跳过的是**事件**，✗ 战斗本身）。
 *   标记由 `encounters.js` 的 `fight()` 在**战斗结算后**置上（✗ 战前置 —— 那会让打一半退出的也算已战）。 */
const 本层已战 = (layerId) => State.variables.babelRun?.已战?.[layerId] === true;

/** ★`books#259` 裁 1：**在事件入口跳过**（战后、事件未取时可见；取过或跳过 ⇒ 消失）。 */
const 跳过事件动作 = (L) => ({
	text: '不理会这层的动静，继续向上',
	when: () => {
		const e = eventsOf()[L.id];
		return 本层已战(L.id) && !!e && e.已用 === null;
	},
	action: () => {
		eventsOf()[L.id].已用 = '__跳过';        // ★声明的哨兵（✗ 与事件类混用；`when` 只认 `!== null`）
		R.perform('你没有在这层多做停留。');
	},
});

/* ★`books#133` 笔 1 的**动作表**（领队 2026-10-02 裁：①陷阱**不入池**（层危害落笔 2）②**读法 (B) 替换**：
 *   抽二择一**就是**该层的额外事件面；③抽签只管 **L5–L8**，L9＝固定 BOSS ＋ 唯一出口）。
 *   · L5–L8 的**基础采集动作退役** ⇒ 采集改为「抽中的事件」（本笔先用**现制采集**占位：
 *     该池位的正式形是**工具耐久制**、属笔 2 的面（领队原文「笔 1 先留位」）。
 *     ⚠ 本席**不**把该位做成空挡：池三取二 ⇒ 约三分之一的层会抽到它，空挡＝玩家可见的**死格**。
 *   · **基础遭遇（第一场战斗）保留**（三段都留）：池里的 `battle` 是「**第二场**战斗」——同一条
 *     段落通道（`Engine.play('遭遇战')`），✗ 另一套战斗面。
 *   · 三个类别的动作**全量入表**，由 `when: eventPending(…)` 筛出抽中的两类
 *     ⇒ 动作表**静态**（✗ 依赖渲染时重算数组），而「哪两个按钮可见」完全由**入档的抽签**决定。
 *   · ⚠ 文案一律**字面**（✗ 运行期值）：采集那条继承现制文案（它本来带「还可采 N 次」⇒ 该形
 *     已在清单的`步骤`面记账），其余两条全字面。
 *   · ★`books#177`：L8 另有**固定动作**（温泉，挂 `温泉: true`）—— **✗ 走 `when: eventPending`**
 *     （它与抽签零耦合：抽中什么、择没择，它都照常在表里）⇒ 动作表自此有**四种来源**：
 *     采集／基础遭遇／抽中的事件（三类）／固定动作。 */
const EVENT_LAYERS = Object.freeze(['L5', 'L6', 'L7', 'L8']);
/** ★`books#133` 笔 2：**宝箱奖励表**（一处常量）。缺省＝该层采集点道具（笔 1 的形）；
 *  领队确认「斧铲由 L5／L6 的宝箱事件按层位给」⇒ 两格覆写（其余层走缺省）。 */
/** ★`books#170` P1-6（试玩反馈）：**箱奖励表**（一处常量）。值一律是**物品** id，**✗ 地点节点** id ——
 *  原形 `宝箱奖励[L.id] ?? GATHER_OF[L.id]` 的**回落**会把节点（`dead-wood`／`copper-vein`）塞进背包，
 *  而节点在背包里**不可用**（玩家报的正是 L7 枯木／L8 铜矿脉这两条）。
 *  ⚠ 逐层配齐（L5–L8），缺一格由下方**装配校验**当场抛（✗ 静默回落）。材料奖励取各层节点的**产出物**
 *  （出处＝引擎 `src/dnd/dnd3/items/resources.js` 的 `yields`）。 */
const 宝箱奖励 = Object.freeze({
	L5: 'axe',          // 工具（笔 2 领队裁：斧由 L5 箱给）
	L6: 'shovel',       // 工具（同上：铲由 L6 箱给）
	L7: 'wood',         // 材料：L7 节点 `dead-wood` 的**产出**（✗ 给节点本身）
	L8: 'copper-ore',   // 材料：L8 节点 `copper-vein` 的**产出**（✗ 给节点本身）
});
/* ★装配校验（P1-6 的第三件）：每个事件层都必须有箱奖励 —— 缺配置**当场抛**（故事起不来 ＝ 装配红）。
 *  静默回落到节点正是本缺陷的成因 ⇒ 宁可让它炸在装载期。 */
for (const id of EVENT_LAYERS) {
	if (!宝箱奖励[id]) {
		throw new Error(`[babel] 箱奖励表缺 ${id}（\`books#170\` P1-6：须逐层显式给**物品** id，✗ 回落 \`GATHER_OF\`）`);
	}
}
/** 奖励是否为**工具**（判据取 `world/tools.js` 导出的表本身 ⇒ ✗ 在文案处再写一遍层名）。 */
const 工具奖励 = (id) => !!setup.BABEL.工具?.TOOLS?.[id];
/** 池里各类的**动作形**（`L` ⇒ action）。`chest` 的奖励取该层采集点道具：✗ 新数值面（笔 1 不引入）。 */
const EVENT_ACTIONS = {
	chest: (L) => ({
		事件类: 'chest',       // ★判据按**结构**取类（✗ 按文案猜）
		text: '打开墙角的箱子',
		when: () => eventPending(L.id, 'chest'),
		action: () => {
			markUsed(L.id, 'chest');
			const 奖 = 宝箱奖励[L.id];
			/* ★`books#170` P1-6：**不得回落** `GATHER_OF`（那是地点节点）—— 见 `宝箱奖励` 头注。 */
			if (!奖) throw new Error(`箱奖励缺配置：${L.id}（\`books#170\` P1-6）`);
			R.give(奖);
			R.perform(工具奖励(奖)
				? '箱底压着件趁手的东西 —— 还算能用。'
				: '箱盖一掀就开了，里头的干货还能用。');
		},
	}),
	gather: (L) => ({
		事件类: 'gather',       // ★判据按**结构**取类（✗ 按文案猜）
		/* ★`books#133` 笔 2（工具耐久制）：文案带**工具读数**；`when` 多一道**工具门** ——
		 *   没有对应工具就**不出按钮**（✗ 点进去才被告知没工具 = 假选项）。
		 *   扣耐久在 `world/tools.js` 的采集外层（**采成才扣**，同 `#1801` 的口径）。 */
		text: () => {
			const n = nodeAt(L.id);
			const left = n?.charges;
			const 具 = setup.BABEL.工具?.工具读数?.(L.id) ?? null;
			const 前缀 = 具 ? `用${具.name}采集` : '采集';
			const 耐久 = 具?.charges != null ? `｜${具.name}耐久 ${具.charges}` : '';
			return left == null ? `${前缀}（${L.gatherLabel}${耐久}）`
				: `${前缀}（${L.gatherLabel}｜一次采净 ${left} 件${耐久}）`;
		},
		/* ★`books#212` 第 1 项（操作者试玩：「预知『会有采集』但**无入口无原因**」）——
		 *   原先 `when` 带**工具门** ⇒ 缺工具时按钮**不显示** ✗（玩家只看到"这里会有采集"而无从得知为什么进不去）。
		 *   现改为：**只要本层抽中了采集事件就出按钮** ✓，把「为什么不行」交给 `action` **说明白** ✓
		 *   ——★两种「不行」的文案**按码实况**写（票面原文）：
		 *     · 缺工具 ⇒「此处可采集，需要：铁铲（未持有）」（**✗ 不消费** ⇒ 拿到工具回来还能采 ✓）
		 *     · 已采过 ⇒「本处已采集过（事件用后不补）」
		 *   ⚠ `when` 仍须**只读**（同 `eventsOf` 的说明）⇒ 两条文案都放在 `action` 里 ✓。 */
		when: () => eventPending(L.id, 'gather') && (nodeAt(L.id)?.charges ?? 0) > 0,
		action: () => {
			/* ① 缺工具：说明白，**✗ 不 markUsed** —— 否则「事件用后不补」会把一次可以补的采集吃掉 ✗ */
			if (!(setup.BABEL.工具?.可采?.(L.id) ?? true)) {
				const 工具面 = setup.BABEL.工具;
				const 名 = 工具面?.TOOLS?.[工具面?.需要工具?.(L.id)]?.name ?? '对应的工具';
				R.perform(`此处可采集，需要：${名}（未持有）。`);
				return;
			}
			/* ② 采点已空（纵深防御：`when` 已挡，但层回边可达 ⇒ 到这儿也要有话说） */
			if ((nodeAt(L.id)?.charges ?? 0) <= 0) {
				R.perform('本处已采集过（事件用后不补）。');
				return;
			}
			markUsed(L.id, 'gather');
			setup.BABEL.gather();
		},
	}),
	battle: (L) => ({
		事件类: 'battle',       // ★判据按**结构**取类（✗ 按文案猜）
		text: '再打一场（第二场战斗）',
		when: () => eventPending(L.id, 'battle'),
		action: () => {
			markUsed(L.id, 'battle');
			SugarCube.Engine.play('遭遇战');
		},
	}),
};
/** 基础采集（L1–L4 与 L9 与二段照旧；L5–L8 的采集位改由抽签决定，见上）。 */
const 基础采集动作 = (L) => ({
	/* ★`#116`：**单一采集动作**（✗ 原两段式「先翻找（发进背包）⇒ 再对背包里的节点采」）——
	 *   采集点是**地点的特征**（一处碎石堆），✗ 可揣进背包的道具。
	 *   · **可用性＝地点特征**：`charges` 取自**层节点账**（`nodeAt`）⇒ 采空（0）即动作**消失** ✓
	 *   · **计数在文案上**（`#1887` 的消费面迁到这里）：「碎石堆还可采 N 次」✓
	 *   · 产出进**玩家背包**、节点**留在账上**（`from = 玩家`／actor ＝ 临时 holder） */
	text: () => {
		const n = nodeAt(L.id);
		const left = n?.charges;
		return left == null ? `采集（${L.gatherLabel}）`
			: `采集（${L.gatherLabel}｜一次采净 ${left} 件）`;
	},
	when: () => (nodeAt(L.id)?.charges ?? 0) > 0,
	action: () => setup.BABEL.gather(),
});
/** 基础遭遇（**第一场**；三段皆留）：地图 action 跳独立段落坐战。
 * ⚠ 层读面（`RPG.inGradient`）来自 `#1784`）⇒ 在此**能力探测**：缺席时仍给入口
 *   （点了**开发者通道**会报「装配缺口」、玩家层给白话提示；✗ 静默消失）——★`#1863`：
 *   开发者信号走 `console.warn`（票号/源码路径是写给接线者的），玩家层只出白话。 */
const 基础遭遇动作 = (L) => ({
	text: '遭遇（往上走之前，先看有什么挡路）',
	when: () => (typeof R.inGradient === 'function' ? R.inGradient(L.id) : true),
	action: () => SugarCube.Engine.play('遭遇战'),
});

/* ---------- `books#177`：L8 **温泉** —— 固定动作（✗ 不入抽签池）----------
 * 出处：操作者裁定 2026-10-03 03:52（`#170` 评论 `5965202546`）第③条「L8 增温泉事件（回复所有状态）
 *   —— 确保满装备＋SL 可过（平衡基线：温泉后满状态 vs 不眠者）」。
 * ★**改向**（同日 04:33，`#172` 的 §14 批复 ⑧⑨，锚＝`#172` 评论）：
 *   · ⑧ 恢复范围＝**HP ＋ 非致命伤 ＋ 列入「恢复表」的负面状态**；**长期正面／资源消耗保留**
 *   · ⑨ **可重复 ＋ 耗游戏时间**（日历候批 ⇒ 时间成本＝**占位常量**，钉在表的位置上）
 *   ⇒ 撤两处旧形：「每局一次」与「工具耐久回初值」——耐久不是负面状态，工具损耗属**资源消耗**。
 * ★为何**固定**（✗ 入池）：池三取二 ⇒ 入池就要抽中，约三分之一的局 L9 前没温泉 ⇒ 「L9 硬门前置保障」
 *   不成立。固定动作与抽签**零耦合** ⇒ 未抽中任何事件、以及**择一之后**（事件面已清）都照样可用。
 * ★「所有状态」的玩家侧口径**只在 `温泉回复` 一处**（✗ 清 `effects` 全表 —— 那是「恢复表」才管的事）。 */
const 温泉层 = 'L8';
/** ★占位常量（**钉表位置**）：日历（候批）上台后，这里是**唯一**要改的触点。 */
const 温泉耗时 = Object.freeze({ 分钟: 60 });
/** ★**恢复表**（⑧「列入恢复表」的落点）：本仓的负面状态族＝跨场创伤（`DND3.Traumas`）。
 *   ⇒ 将来加一条负面状态**只改这张表**（✗ 四处改清除逻辑）；表外的（如长期正面「预知」）**保留**。 */
const 温泉可清 = () => Object.keys(DND3.Traumas ?? {});
/** 时间账（⑨的时间成本落点）：**本局**累计分钟数（随存档往返，形同 `babelRun` 族）。 */
const 时间账 = () => Number(State.variables.babelRun?.时间 ?? 0);
const 记时间 = (分钟) => {
	const r = (State.variables.babelRun ??= {});
	r.时间 = Number(r.时间 ?? 0) + 分钟;
	return r.时间;
};
/** 回复所有状态（一处函数 —— 判据按它取读数；口径见上）。★**可重复调用**（⑨的「可重复」）。 */
const 温泉回复 = () => {
	const P = DND3.Player;
	const 前 = { hp: P.hp, 非致命: Number(P.nonlethal ?? 0), 效果: (P.effects ?? []).slice(), 时间: 时间账() };
	const 可清 = new Set(温泉可清());
	P.hp = P.maxHp;
	P.nonlethal = 0;
	P.effects = (P.effects ?? []).filter((e) => !可清.has(e));
	return {
		...前,
		清了: 前.效果.filter((e) => 可清.has(e)),
		留了: 前.效果.filter((e) => !可清.has(e)),
		时刻: 记时间(温泉耗时.分钟),
	};
};
const 温泉动作 = (L) => ({
	温泉: true,                     // ★结构标记（判据按它取动作，✗ 按文案猜）
	/* ★`books#180`／§14 ⑨：「耗游戏时间」要让**玩家看得见**（成本落在**选项本身**上，
	 *   ✗ 只在文档里）—— 数取自占位常量，日历上台后跟常量一起变（一处源）。 */
	text: () => `泡进温泉（回复所有状态 · 约 ${温泉耗时.分钟} 分钟）`,
	when: () => true,               // ★可重复（⑨）：**没有**「用过即退场」的账
	action: () => {
		const r = 温泉回复();
		R.perform(`你把自己浸进热水。伤与别的什么 —— ${r.清了.length} 处 —— 慢慢松开了。`
			+ `（花去 ${温泉耗时.分钟} 分钟；这一局已走到第 ${r.时刻} 分钟。）`);
		/* ★`books#178` 件 1：**整备点自动写槽 1**（触发点一 · 温泉使用完成）。
		 *   `?.` ＋ 能力判：`encounters.js` 在**本档之后**装载 ⇒ 本闭包运行时才求值（✗ 装载期）。 */
		setup.BABEL.战前保底?.('温泉');
	},
});

/**
 * 「层地点」的**唯一构造形**（一段与二段**共用** —— `babel2.js` 经 `setup.BABEL.makeLayerLocation` 复用）。
 * 三件事：① 采集点**发放**（`#1776` 明确「采集点须先在背包里」，投放归本集成票）
 *   ② 采集（`RPG.gather`）③ 遭遇（跳独立段落坐战）。
 */
const makeLayerLocation = (L) => new R.Location({
	id: L.id,
	name: L.name,
	desc: () => L.desc,
	/* 读数：本局到过的**最深**层（进层即记；✗ 用「当前层」代替，因为死亡会把人送回 L1）。 */
	onEnter: () => {
		const r = State.variables.babelRun;
		/* ★`#135` ②a：**max** 语义（✗ 无条件赋值 —— 从 L20 退回 L19 会把「最深」写小；
		 *   `babel2.js:147` 确有该回边）。层号由 id 取（`L19`／`L20-forge` 皆可）⇒ ✗ 字符串直比。 */
		if (r && Number(String(L.id).match(/L(\d+)/)?.[1] ?? 0) > Number(String((r.deepest ?? '')).match(/L(\d+)/)?.[1] ?? 0)) r.deepest = L.id;
		/* ★`books#133` 笔 1：**首次进入该层 ⇒ 抽一次**（幂等：已有则原样返回，✗ 重抽）。
		 *   位置就在「进层即记 deepest」同一钩子里（设计稿 §3.2：同处扩展）。
		 *   ⚠⚠ **须白名单守**（`dev-9` 的阻断 RC）：本行原为无条件 `ensureDraw(L.id)` ⇒ 进 **L1／L9／L11**
		 *     也开账（押反裁 ③「L9 无抽签」与笔面明账 4）且**每进一层吃掉两个随机单元**
		 *     （`RPG.rng` 是全仓唯一随机源：战斗选靶也走它 ⇒ 这是**全局**副作用，✗ 只在本层）。
		 *     本席自己那个「只用了白名单」的声明因此**不实**，已由㉔格的两条新臂钉住。 */
		if (EVENT_LAYERS.includes(L.id)) ensureDraw(L.id);
		/* ★`books#133` 笔 2：**层危害**（进层按档位几率触发，每层每局至多一次；非危害层连随机单元都不读）。
		 *   表与结算在 `world/hazards.js`（只 L5–L8；甲案首形，见该件头注）。
		 *   ⚠⚠ **次序是承重的**：抽签**必须在前** —— 本局账是**一个对象**（`$span1Events[层]`），
		 *     危害「命中才建键」；若危害先命中建了键，`ensureDraw` 的 `??=` 就会以为「已抽过」而**不抽**
		 *     （本席落笔时实测撞到：㉒格报「抽中 undefined」，且是**概率性**的 —— 危害掷中才犯）。
		 *     抽签先跑 ⇒ 账里已有 `抽中`，危害只往**同一个对象**上加 `危害` 标记 ✓。
		 *     ⚠ 随机源的**消耗次序**因此是「先抽签（两格）后危害（一格）」——判据与 e2e 面的注入序列按此写。 */
		const 危害果 = setup.BABEL.危害?.危害结算?.(L.id);
		/* ★`books#171`／`#176`：危害把人打死了且**已进终局**（裁定②后**不复活**，位置留在死亡层）⇒
		 *   本层流程**到此为止**（✗ 继续跑下面的 L5 授予——这一局已经结束了）。 */
		if (危害果 === 'dead') return;
		/* ★`books#164`：**L5 授予**永久被动「预知」（`books#139`／`#1893` 的挂载面在此接到活路径上）。
		 *   ⚠ 幂等：`contains` 先判 ⇒ 重进 L5 **不重复授予、也不重复印**那句低语。
		 *     ★两道守卫各承一面（`books#168`）：**授予**那面由引擎的 `gain` 自己去重 ⇒ `effects` 条数
		 *       判不出守卫（`dev-10` 的刀：只拆本守卫而保留授予 ⇒ 全档零红）；**文案**那面才是本守卫
		 *       真正承重的 ⇒ 判据＝`verify.mjs` ㉘①后半的**文案计数**（只拆守卫 ⇒ 该条红）。
		 *   ⚠ 授予**不耗随机单元**（与抽签／危害的次序无关）⇒ 上两行的次序不变。 */
		if (L.id === 预知授予层 && !(DND3.Player?.contains?.('precognition'))) {
			DND3.Player?.gain?.('precognition');
			R.perform('你开始能听见下一层的低语 —— 下一层会有什么，你可以先选一样。');
		}
	},
	actions: [
		/* ★`books#133` 笔 1（领队裁 ②B）：**L5–L8 的基础采集退役** —— 采集在该四层改为「抽中的事件」，
		 *   故此处**不入表**（其余层与二段照旧，`when` 仍管「采空即消失」）。 */
		...(EVENT_LAYERS.includes(L.id) ? [] : [基础采集动作(L)]),
		基础遭遇动作(L),                      // ★第一场战斗：三段皆留（裁 ②B 原文）
		/* ★抽中的事件（三类的动作**全量入表**，由 `when` 筛：只有抽中的两类能真出现） */
		...(EVENT_LAYERS.includes(L.id) ? EVENT_KINDS.map((k) => EVENT_ACTIONS[k](L)) : []),
		/* ★`books#177`：L8 的**温泉**（固定动作，与抽签零耦合 —— 见 `温泉动作` 头注）。 */
		...(L.id === 温泉层 ? [温泉动作(L)] : []),
		/* ★`books#259` 裁 1：战后可在**事件入口**跳过（✗ 跳过战斗）。 */
		跳过事件动作(L),
		/* ★`books#259` 裁 6：预知**已改为进层的门**（见 `预知门`）⇒ 原先「L5／L6／L7 各三个按钮」的
		 *   常驻形**退役**（✗ 两形并存：「随时可预知」与「进层那一刻问」互斥）。`预知动作` 保留为
		 *   死代码清理前的对照（下一个清理笔删除）—— 本笔先断开入表。 */
		...[],
		/* ★`books#178` 件 1：**战斗外常驻的快存/快读入口**（票面 §8.2「战斗外常驻」）。
		 *   `when` 读 `setup.BABEL.战中` ⇒ 战斗中**不可见** —— 与 P0「禁战内存档」**同源**（✗ 两套判据）。
		 *   ⚠ 闭包在**玩家点击时**求值，故此处不依赖 `encounters.js` 已装载（它在本档之后装载）。 */
		{
			text: '快存（记下这一刻）',
			when: () => !setup.BABEL.战中 && setup.BABEL.可存?.(setup.BABEL.槽位.快存) === true,
			action: () => setup.BABEL.快存(setup.BABEL.槽位.快存),
		},
		{
			text: '快读（回到上一次快存）',
			when: () => !setup.BABEL.战中 && typeof setup.BABEL.宿主槽?.()?.load === 'function',
			action: () => setup.BABEL.快读(setup.BABEL.槽位.快存),
		},
	].map(只给活人),                 // ★`books#176`：**死人的地图不给动作**（终局后那一屏不得可点）
});

for (const L of LAYERS) map.addLocation(makeLayerLocation(L));

/* ══════════════════════════════════════════════════════════════════════════
 * ★`books#201` **乙笔：旅程装备保证**（操作者裁定 2026-10-03「方向＝乙」）
 *
 *   裁定原话：**盾牌／护甲必到手**（L1-8 沿途发放去随机化，**满装备＝设计保证而非运气**）；
 *   方法＝**期望值设计**（解析式算清再落数值）；跑分器＝**验证工具**（✗ 设计工具）。
 *
 *   期望依据（`books#201` 票面的算式与敏感度表）：现状 TTK 14.3 ＞ 回合上限 8 ⇒ **结构性不可胜**
 *   （实测 4.7–5.0% 胜／85–89% 阵亡）。要落进 §14 ⑩ 的 **70–85%** 带内，需三件事同时成立：
 *     ①玩家 AC 15→17（重木盾）②攻击加值 +1→+4 ③武器有效伤害 1d8+1（均 5.5）→ 2d6+3（均 10）
 *   ⇒ 模型读数 **72.6% 胜／13.4% 阵亡**（`#201` 票面敏感度表；权威复核＝跑分器 100 样本）。
 * ══════════════════════════════════════════════════════════════════════════ */

/* ── 淬火长剑（乙的武器那一半）────────────────────────────────────────────
 * 期望依据：**原值** 剑 `1d8`（有效 1d8+1，均 5.5）⇒ **新值** `2d6+2`。
 *   ⚠ 写法说明：引擎近战**把角色 str 加值加进伤害**（头目 1d8 ＋ str 16(+3) ＝ 1d8+3，`tester-3` 的分解）
 *   ⇒ 玩家 str 12(+1) 下，`2d6+2` 的**有效**伤害正是 **2d6+3（均 10）**，与票面达线组合同口径。
 *   ⚠ `atkBonus: 4`：引擎口径为「件上有 `atkBonus` 时**以它为准**」（头目件 `atkBonus: 5` 而 str+bab 合计 6
 *   ⇒ 实测命中 +5 ⇒ 见 `#185` 的探针）⇒ 玩家攻击 **+4**，即票面第 ② 项。
 *   ⚠ 这两条**都是「读码推断」，故判据必须真打一爪去量**（`verify.mjs` ㊴：真命中记伤害/命中加值）——
 *     ✗ 不把推断当读数。 */
R.defItem({
	id: 'sword-quenched', name: '淬火长剑',
	desc: '刃口重新淬过火，颜色发青；握把上缠的布还是热的。比捡来那把称手得多。',
	stats: {
		dmg: '2d6+2',        // ＋玩家 str +1 ⇒ 有效 2d6+3（均 10），期望依据见上
		crit: 2,             // 重击倍率 ×2
		critMin: 19,         // 威胁范围 19–20（与制式长剑同）
		type: 'slashing',
		prof: 'martial',
		atkBonus: 4,         // 玩家攻击 +4（票面第 ② 项）
		weight: 4, cost: 40,
	},
	charges: null, stackable: false, weapon: true, slot: 'weapon',
	actions: { equip: R.slotEquip, unequip: R.slotUnequip },
	/* ⚠ `defItem` 要求**默认动作** `used(that, from)`（缺它直接具名抛 —— 本笔第一版就撞了这条，
	 *   由 `verify.mjs` 的兜底打印出来）·转发返回值同引擎剑（攻击层 `return false` 时须如实传出）。 */
	used(that, from) { return DND3.meleeAttack(this, that, from); },
});

/** ★乙的**保证点**：进 L9 门前营地即**无条件**到手（重木盾 ＋ 淬火长剑）并**当场装上**。
 *   ✗ 做成「可选动作」：那还是「记得点才算」，与裁定的「**保证**而非运气」相反。
 *   形：**幂等**（重复进营地不重复发放/不重复出声）；导出以便判据**直调**（✗ 只能靠走位触发）。 */
const 乙保证 = () => {
	const 得 = [];
	if (!R.has('heavy-wooden-shield')) { R.give('heavy-wooden-shield'); 得.push('重木盾'); }
	if (RPG.equippedIn('shield')?.id !== 'heavy-wooden-shield') R.equip('heavy-wooden-shield');
	if (!R.has('sword-quenched')) { R.give('sword-quenched'); 得.push('淬火长剑'); }
	/* ⚠ **同槽被占时 `slotEquip` 会显式拒绝**（`30-inventory.js:177-180`：「正占着…槽——先卸下它。」
	 *   并 `return false`）⇒ 我首版直接 `R.equip('sword-quenched')` **必然被拒**（手上已有基础长剑）
	 *   ⇒ 乙的武器从未上身（轨迹实证：`sword-quenched` 只出现在「被拒」行里、战场动作 id 恒为 `sword`；
	 *   连带的两个「口径差」也由此而来：真打用的是基础长剑，✗ 不是淬火剑）。
	 *   ⇒ 正确做法：**先走件自己的卸下动作**（`slotUnequip` 挂在件上，`this` 即该件 —— 与引擎契约同路），
	 *     再装。⚠ 我第二版误用 `R.unequip(id)` ⇒ 引出 `Cannot read properties of null` ✗（接口没读就改）。 */
	/* ⚠ 走**官方 API** `RPG.unequip(id)`（`30-inventory.js:310`：`unequip = (id) => useItem(id, null, null, 'unequip')`）
	 *   —— ✗ 不要自己 `旧件.actions.unequip.call(旧件)`：那只改**实例**的 `equipped`，✗ 不写回**背包快照**
	 *   （`RPG.commit` 才提交 `equipped` ⇒ 槽位看起来仍被占 ⇒ 接下来的 `equip` 仍被拒 ⇒ 实测照旧 `sword`）。
	 *   ⚠ 我上一版用 `R.unequip(id)` 时见到的 `Cannot read properties of null (reading 'hp')` **不是**这条调用形式的错
	 *   —— 那是**工具包装器 `R.act` 丢第 4 参**（把 `action` 折成缺省 `use`）的 bug（`tester-3` 已修，随小笔落）。 */
	const 卸槽 = (槽) => {
		const 旧件 = RPG.equippedIn(槽);
		if (!旧件 || 旧件.id === 'sword-quenched') return;
		RPG.unequip(旧件.id);
	};
	if (RPG.equippedIn('weapon')?.id !== 'sword-quenched') { 卸槽('weapon'); R.equip('sword-quenched'); }
	if (得.length) R.perform(`你把这一段路上攒下的称手东西都带上了：${得.join('、')}。`);
	return 得;
};

/* ---------- ★`books#180`：L9 拆「准备区 ＋ 战场」----------
 * 设计原话「固定事件＝玩家看到出口；选项**唯一**＝前进」说的是**战场里**（✗ 整层）——
 *   拆开后：准备区＝撤退落点＋**合法回 L8 温泉**的补给点；战场＝迎战不眠者，出口仍唯一（且受进度约束）。
 * ⚠ 准备区的边**不经** `边守卫`（`是头目战场('L9-camp')` 假）⇒ L8 回边在此合法化（`#180` 的「须解」那处）。 */
const 准备区 = new R.Location({
	id: 'L9-camp',
	name: '第 9 层 · 门前营地',
	desc: () => '光就在前面那道门缝里。你在这里扎过营 —— 再往上一步，就是它守的地方。',
	/* ⚠ 判据的「前哨」面：准备区**不设遭遇**（安全点，撤退落点），动作一律过「活着」闸门。 */
	actions: [].map(只给活人),
});
map.addLocation(准备区);
/* ★`books#178` 件 1：**整备点自动写槽 1**（触发点二 · 进入 L9 门前营地）。
 *   ★保留旧钩（`onEnter` 是**单值属性**，直接赋值会静默吃掉既存副作用 —— 同 `战场` 那处的形）。 */
{
	const 旧入 = 准备区.onEnter;
	准备区.onEnter = (loc) => {
		旧入?.(loc);
		/* ★`books#201` 乙：**先发保证装备、再写战前保底** —— 次序有意：
		 *   保底槽 1 存的是「进营地那一刻」的状态 ⇒ 装备必须先到手，否则保底存了一份「没盾没剑」的档，
		 *   玩家读档回来又得重走一遍（`#183` 的整备点自动写槽 1）。 */
		setup.BABEL.乙保证?.();
		setup.BABEL.战前保底?.('门前营地');
	};
}
/** L9 的**入口**（上行走到的是准备区，✗ 战场；下行从准备区回 L8）。 */
const 入层口 = (id) => (id === 'L9' ? 'L9-camp' : id);
/* 战场那一格照实改名（✗ 与准备区同名 —— 两处同名会让玩家与判据都把两处当一处）。 */
const 战场 = map.locations.get('L9');
if (战场) 战场.name = '第 9 层 · 门前战场';
/** ★§14 ⑤（操作者批「头目撤退后满血重置」）：进战场且**本局未过** ⇒ 头目复位（防无成本磨血）。 */
const 进战场复位 = () => {
	if (!setup.BABEL.已过?.('L9')) setup.BABEL.头目?.复位?.();   // 跨文件：走导出面（`boss.js` 的 `已过`）
};
if (战场) {
	const 旧入 = 战场.onEnter;
	战场.onEnter = () => { 旧入?.(); 进战场复位(); };
}
/** ★`books#180`：头目战场**非胜收场**的落点（撤退落点＝准备区）。一处函数 ⇒ 判据可**直调**
 *   （`fight()` 的战后段消费它；「本仓无独立撤退机制 ⇒ 撤退＝未胜而离场」的口径见该处注释）。 */
const 落准备区 = (layer) => {
	if (!是头目战场(layer)) return false;
	map.moveTo(准备区.id);
	return true;
};

/* ══════════════════════════════════════════════════════════════════════════════
 * L1–L9 **引导弧**（`books#132` · 操作者设计指令）—— 故事侧装配
 *
 * 设计：**L1 战斗引导（空手可胜＋捡剑）⇒ L2 装备引导（战后必掉绷带）⇒ L3 治疗门控（一击必杀）
 *   ⇒ L4 钥匙/宝箱/中甲 ⇒ L5 被动＋选择制 ⇒ L6–8 随机 ⇒ L9 BOSS＋唯一出口**。
 * 本文件落 **L1–L4**（L5–L9 候引擎件：工具族/被动挂载面/事件化）。
 *
 * ★**数据归属新规**（`#132` 票面 16:31 裁）：**Babel 专属数值 ⇒ 故事层**（本席主场）；
 *   通用物品/机制 ⇒ 引擎（`src/**`）。⇒ 本笔的 L3 怪**在此自建**（`RPG.defCharacter`）。
 * ★**遭遇表＝装配**（同裁）：故事侧**覆写** `span1` —— ✗ 再造一份，而是 `spread` 引擎表**只换 L1–L3 三行**
 *   （防漂：L4–L9 与掉落面**逐字继承**引擎，引擎改那几层时本文件**不必跟改**）。
 *   ⚠ `registerEncounterTable` 对重复注册**只告警不抛**（`65-encounters.js:163`）⇒ 覆写是**受支持的形**。
 * ══════════════════════════════════════════════════════════════════════════════ */

/* ---------- L1 的怪：**幼獾**（「空手可胜」的**数值前提**）----------
 * ★为何需要（本席**实跑实测**，✗ 推断）：只用引擎的 `badger`（hp 6／AC 15）时，**空手（1d3+1）打不赢** ——
 *   实测 8 回合**僵持**（`kills +0`、玩家 4/20）。⇒ 「L1 空手可胜」卡在**数值**，✗ 卡在机制（空手项 `#1854` 已在）。
 * ★取向（`#132` 数据归属新规：**Babel 专属数值 ⇒ 故事层**）：L1 是**引导层** ⇒ 给一只**幼兽**：
 *   血量 4（空手约 2 击）／AC 12（打得中）／爪 1d2+4（咬得动但不致命）。
 * 来历（一句）：从塌方的缝里钻出来的小家伙。它还没学会怕人 —— 但它已经会咬人。 */
DND3.BadgerCub = R.defCharacter({
	id: 'badger-cub',
	name: '幼獾',
	hp: 4, maxHp: 4,
	stats: setup.DND3.stats({ str: 6, dex: 15, ac: 12, bab: 0 }),
	/* ★**攻击走 `items`**（✗ `attacks:` —— `RPG.Character` **不认**该字段，我首版在此写错 ⇒ 怪**咬不动人**、白送一场；
	 *   本席随后以 `⑲` 的「有已装备的攻击件」格钉住这一类）。幼獾复用引擎的獾爪（语义正）。 */
	items: [{ id: 'badger-claw', equipped: true }],
});

/* ---------- L3 的怪：**蓝苔蜂**（一击必杀 · 但它比你快）----------
 * 来历（一句）：苔藓里飞出来的东西。它比你快，但它薄得像一片鳞。
 * 数值（照 `#132` 设计）：**血量 1**（玩家最低一击 1d3 ≥ 1 ⇒ **一击必杀是机制事实**，✗ 概率）｜敏捷高｜**单次伤害高**。 */
/* ★尾刺＝**Babel 专属**天然攻击件 ⇒ 按新规落在**故事层**（形照引擎 `items/natural-attacks.js` 的 `natAttack`）。 */
R.defItem({
	id: 'blue-moss-sting', name: '蓝苔尾刺',
	/* ★同上（`books#170`）：伤害块必须进 `stats`（✗ 顶层 —— 那会被 `Item` 构造静默丢掉，伤害骰恒 undefined）。 */
	stats: { dmg: '1d8', type: 'piercing', atkBonus: 6 },
	desc: '一根发着淡蓝光的刺。碰一下就断 —— 但碰上了很疼。',
	charges: null, stackable: false, weapon: true, slot: 'weapon',
	actions: { equip: R.slotEquip, unequip: R.slotUnequip },
	used(that, from) { return DND3.meleeAttack(this, that, from); },
});
DND3.BlueMossWasp = R.defCharacter({
	id: 'blue-moss-wasp',
	name: '蓝苔蜂',
	hp: 1, maxHp: 1,
	stats: setup.DND3.stats({ ac: 14, str: 6, dex: 18, bab: 2 }),
	items: [{ id: 'blue-moss-sting', equipped: true }],
});

/* ---------- 遭遇表覆写（换 L1–L3 与 L9；L4–L8 与 **掉落面**逐字继承引擎）---------- */
{
	const base = DND3.ENCOUNTER_SPAN1 ?? {};
	R.registerEncounterTable('span1', Object.assign({}, base, {
		/* L1：**只出非 elite 獾** ⇒ 空手（1d3）可磨死 —— 设计「空手战斗能赢」的机械前提。 */
		/* L1：**保持引擎的獾**（✗ 换 —— 实测：换掉会**打破创伤族既有格**，它们依赖 L1 獾的伤害型）。
		 *   ⇒ 「空手可胜」的数值前提**另议**（见本笔报告：无头自动通路**测不出**空手，那是**交互选项**）。 */
		L1: { encounters: [{ ref: 'badger-cub', weight: 1 }], loot: base.L1?.loot ?? [{ id: 'coin', weight: 1 }] },
		/* L2：**升 elite** ⇒ 空手明显吃力（设计「难度较高」）；掉落留给战后必掉面（见 `encounters.js`）。 */
		L2: { encounters: [{ ref: 'badger', weight: 1, elite: true }], loot: base.L2?.loot ?? [{ id: 'coin', weight: 1 }] },
		/* L3：换成蓝苔蜂（一击必杀／高敏／高伤）。 */
		L3: { encounters: [{ ref: 'blue-moss-wasp', weight: 1 }], loot: base.L3?.loot ?? [{ id: 'coin', weight: 1 }] },
		/* ★`books#133` 笔 3：**L9 ＝ 固定头目**（设计稿 §L9「固定事件＝玩家看到出口」）——
		 *   行内**只剩一个 ref** ⇒ 任何一次抽都只能是它（「固定」由此是**机械事实**，✗ 口号）。
		 *   体在 `world/boss.js`（故事层定义；`#1855` 的形）。掉落面**继承引擎的 L9 行**不动
		 *   （头目战利品口径未定 ⇒ 不新造数值面；明账见 PR）。 */
		L9: { encounters: [{ ref: 'sleepless-one', weight: 1 }], loot: base.L9?.loot ?? [{ id: 'coin', weight: 1 }] },
	}));
}

/* ---------- 层表覆写（`books#133` 笔 3；与上面的遭遇表**同笔**）----------
 * 领队 2026-10-03 00:01 裁（逐字）：「两表同笔覆写[ENCOUNTER_SPAN1+LAYER_META_SPAN1——同键配对校验，
 *   L9 条目替换]」。两表由**同一个键**配对（`#1748`）：遭遇表的键集 ⊆ 层表的 id 集
 *   （`hub` 型层不设遭遇行），层 id 与遭遇表键**同一套命名**（防两套）。
 * ★本笔**唯一改动的条目＝ L9**：标成 `boss: true`。该标记是下面「唯一出口」的**数据源**
 *   （✗ 在守卫里硬写 `=== 'L9'`）⇒ 头目层将来换位置只改这一格。
 * ⚠ 重复注册：引擎的 `registerLayerMeta` 对重复 id 打 `console.warn`（`#1816` 的既有形，**告警不抛**）
 *   —— 本条是**有意覆写** ⇒ 该告警属预期（本笔既不静默、也不去压掉它）。 */
const LAYER_META = R.registerLayerMeta('span1', (() => {
	const base = DND3.LAYER_META_SPAN1 ?? [];
	if (base.length === 0) {
		throw new Error('[babel] 层表缺席（`DND3.LAYER_META_SPAN1` 未装载？）—— `books#133` 笔 3 的出口守卫读它（✗ 静默降级）');
	}
	/* ★`books#180`：`bossArena` 指明**战场那一处**（L9 拆成「准备区 ＋ 战场」后，整层不再是头目层
	 *   —— 准备区要能自由走回 L8）。守卫与判据都读这一格（✗ 硬写层名，✗ 按层前缀判）。 */
	return base.map((l) => (l?.id === 'L9' ? Object.assign({}, l, { boss: true, bossArena: 'L9' }) : Object.assign({}, l)));
})());
/** 头目层判定（走引擎的公开读面 `layerOfLocation` —— 它按**最长前缀**匹配地点 id
 *  ⇒ `'L10-camp'` 归 `L10`，✗ 误配到 `L1`）。 */
const 是头目战场 = (locId) => {
	const 行 = R.layerOfLocation?.(locId);
	return 行?.boss === true && (行.bossArena ?? 行.id) === locId;
};
/** 头目层的**唯一出口**指向：层表里的**下一层**（`L9` ⇒ `L10`）。 */
const 头目层前方 = (locId) => {
	const t = R.layerMeta?.['span1'] ?? [];
	const id = R.layerOfLocation?.(locId)?.id ?? locId;
	const i = t.findIndex((l) => l?.id === id);
	return i >= 0 ? (t[i + 1]?.id ?? null) : null;
};
/** 进度账的键＝**层 id**（头目实体按层归属；将来一场一头目也只改这里）。 */
const 头目场 = (locId) => R.layerOfLocation?.(locId)?.id ?? locId;
/** 边守卫：**只给头目层的边**装（非头目层返回 `null` ⇒ 连 `when` 都不挂，边照旧可用）。
 *  ★落法是**动作守卫**而✗结构删边（领队原文）：边仍在图里（`map.exits` 读得到、`validate()` 照验），
 *    只是 `when` 恒假 ⇒ 「玩家选项中只有一个」。 */
const 边守卫 = (from, to) => {
	if (!是头目战场(from)) return null;        // 装载时：非**战场**根本不装守卫（准备区／普通层边照旧可用）
	const 前方 = 头目层前方(from);              // 前方由**层表顺序**定（静态内容 ⇒ 装载时取即可）
	/* ★调用时**再看一次表**：头目标记若被摘掉 ⇒ 该层不再受限（✗ 把标记在装载时判死 ——
	 *   那样「读数随表翻面」就只是句空话：面 O 的两向臂会立刻抓到，见 `tools/e2e-drive.mjs`）。 */
	/* ★`books#180`：**唯一出口 ∧ 本局已过该场** —— 头目硬门（操作者裁定：L9 头目硬卡进度）。
	 *   两向都在一处：未胜 ⇒ 该边 `when()` 假（不出现在选项里，边本身仍在图里）。 */
	return () => !是头目战场(from)
		|| ((R.layerOfLocation?.(to)?.id ?? to) === 前方 && setup.BABEL.已过?.(头目场(from)));
};

/* ---------- L1 固定事件：地上那把剑 ---------- */
/* ★与已关闭的 `#128`（木棒）**同形**，实体换成**剑**（`books#132` 设计：L1 武器获取＝捡剑）。
 * 判据随迁（那格已随 `#129` 关闭退场，本笔重建，含「拾起后动作消失」与「已握在手上」两项）。 */
map.locations.get('L1').actions.unshift({
	text: '拾起地上的长剑',
	when: () => !R.has('sword'),
	action: () => {
		R.give('sword');
		R.equip('sword');
		R.perform('你抽出那把剑。刃上有豁口，但比拳头强。');
	},
});

/* ---------- L3 固定事件：拾起矿镐（`books#133` 笔 2；设计稿 §2 L3「捡到矿镐」）----------
 * ★三件工具里唯一由**固定事件**给的一件（另两件按领队确认走 L5／L6 的宝箱表）。
 *   ★`books#259` 裁 3 起：工具 **`stackable: false`** ⇒ ✗ 再拾**并入**（耐久是**属性** ✗ 数量）；
 *   本事件每局只触发一次 ⇒ 实际不会出现第二把（`world/tools.js` 头注同旨）。 */
map.locations.get('L3').actions.unshift({
	text: '拾起插在石缝里的矿镐',
	when: () => !R.has('pick'),
	action: () => {
		R.give('pick');
		R.perform('镐头没锈 —— 是有人留在这儿的，手柄上还缠着布条。');
	},
});

/* ---------- L4 固定事件：宝箱（钥匙开 ／ 硬开 —— **不可逆的二择**）----------
 * ★引擎已备形（`src/core/41-chest.js`）：`openBy()`＝钥匙开（无检定）；`lockNow()`＝**撬坏即永久锁死**；
 *   箱子有 `hp/isBroken` ⇒ 它**同时**是战斗目标（`get isDown()`）。
 * ★实现取「**一次挥击**」而✗「整场战斗」：地图动作是**同步**的，而 `R.Battle.execute()` 是 async
 *   （`遭遇` 走的是**跳段落** `Engine.play('遭遇战')` 那条路）。**一次挥击**仍走引擎**同一条伤害面**
 *   （`DND3.meleeAttack`）⇒ ✗ 旁路、✗ 重造机制；代价是「硬开只有一下」（够不够看数值）。
 * ★**不可逆**（设计要的「有代价的二择」）：挥击**没砸开** ⇒ 箱盖变形、钥匙再也拧不动 ⇒ `lockNow()`。 */
const L4_CHEST_ID = 'chest-l4';
const L4箱态 = () => {
	const v = State.variables.span1Arc;
	if (!v.chests) v.chests = {};
	if (!v.chests[L4_CHEST_ID]) v.chests[L4_CHEST_ID] = { hp: 6, opened: false, broken: false, locked: false };
	return v.chests[L4_CHEST_ID];
};
/** 按存态**重建**箱实例（✗ 常驻对象 —— 那次读档后即与存档脱节）。 */
const L4箱 = () => {
	const s = L4箱态();
	const c = new R.Chest({ id: L4_CHEST_ID, name: '铁皮箱', hp: s.hp, items: [{ id: 'mail', n: 1 }] });
	c.opened = s.opened; c.locked = s.locked;
	return c;
};
const L4已了 = () => { const s = L4箱态(); return s.opened || s.broken || s.locked; };
const L4中甲入包 = (s) => {
	R.give('mail');
	R.perform('箱盖翻过去，里头垫着干草 —— 一件铁环甲，还带着别人的味道。');
};
map.locations.get('L4').actions.unshift(
	{
		text: '用铁钥匙开箱',
		when: () => R.has('iron-key') && !L4已了(),
		action: () => {
			const s = L4箱态();
			R.take('iron-key');
			R.perform('钥匙在锁芯里转了半圈，机关没响。');
			L4箱().openBy();
			s.opened = true;
			L4中甲入包(s);
		},
	},
	{
		text: '硬开（抡起手里的家伙砸箱盖）',
		when: () => !L4已了(),
		action: () => {
			const s = L4箱态();
			const c = L4箱();
			/* 走引擎**同一条**伤害面：玩家手上的武器（无武器 ⇒ 空手，`unarmedItem` 已 equipped ⟹ 不会卡在拔出分支）。 */
			const w = R.equippedWeapon() ?? DND3.Player.unarmed.item;
			DND3.meleeAttack(w, c, DND3.Player);
			s.hp = c.hp;
			if (c.isBroken) {
				s.broken = true;
				R.perform('箱板裂开一道口子，你把它掰开。');
				L4中甲入包(s);
			} else {
				/* ★**不可逆**：没砸开 ⇒ 箱盖变形，钥匙也拧不动了（引擎的 `lockNow()` 形）。 */
				c.lockNow();
				s.locked = true;
			}
		},
	},
);

/**
 * **接管**一个整备区（把包里的 `WorldMap` 并进本图）：地点字段与 `actions` **按引用共享**
 * （⇒ 包里对入口的接线在此一并生效，单一权威源），边**同一批实例**一并取入
 * （只取地点会得孤岛 —— 实测 `validate()` 报「孤立点 L10-settlement」）。
 * 唯一的故事侧补丁是 `onEnter` 读数钩子（记录 `deepest`）；**✗ 直接改包里的实例**
 * （那会连带污染包自己那张图）。
 */
const adoptHub = (target, hub, patch = {}) => {
	for (const loc of hub.locations.values()) {
		target.addLocation(new R.Location({
			id: loc.id, name: loc.name, desc: loc.desc,
			/* ★`#116`：`patch[locId]` 可**替换**该地点的动作表（`(原表) => 新表`）——
			 *   为何要这个口（✗ 直接改 `loc.actions`）：包里那张图与故事侧**共享同一批实例**
			 *   （本函数上方注：「✗ 直接改包里的实例 —— 那会连带污染包自己那张图」）。
			 *   ⇒ 经本参**只改故事侧这一份**（原表按引用传入 ⇒ patch 可读它、✗ 必须用它）。 */
			actions: (patch[loc.id] ? patch[loc.id](loc.actions) : loc.actions).map(只给活人),   // ★`books#176`：hub 动作同挂闸门
			onEnter: () => {
				const r = State.variables.babelRun;
				/* ★`#135` ②a（hub 接管面）：同 max 语义（✗ 无条件赋值）。 */
				const _d = R.layerOfLocation(loc.id)?.id ?? loc.id;
				if (r && Number(String(_d).match(/L(\d+)/)?.[1] ?? 0) > Number(String((r.deepest ?? '')).match(/L(\d+)/)?.[1] ?? 0)) r.deepest = _d;
			},
		}));
	}
	/* ★`books#176`：hub 的**出边**来自包（不经 `边可否通行`）⇒ 在此按同一个「活着」语义包一层。
	 *   ⚠ `addExit` 要的是 **`Exit` 实例**（✗ 裸对象 —— 本席首版即栽在此：`addExit 需要 Exit 实例`）
	 *     ⇒ 按 `addPath` 的同形**新建**实例（✗ 改包里的那个：那会连带污染包自己那张图）。
	 *   （hub 的**动作**已在上面 `actions:` 处走 `只给活人`；两样都是「接管面」自带的，故都在本函数内收口。） */
	for (const exit of hub.exits) {
		const w = exit.when;
		target.addExit(new R.Exit({
			from: exit.from, to: exit.to, text: exit.text, action: exit.action,
			when: () => 活着() && (typeof w === 'function' ? w() : true),
		}));
	}
};

/* ---------- 第 10 层：整备区（取包里的实例 —— 单一权威源）---------- */
adoptHub(map, DND3.buildSpan1Hub());   // 包里已自带 `validate()`：不合法会抛

/* ---------- 边 ----------
 * 段内自由（双向）＋ 段间封闭（10→11 单向、无回边）。 */
for (let i = 0; i < LAYERS.length - 1; i++) {
	const a = LAYERS[i].id;
	const b = 入层口(LAYERS[i + 1].id);   // ★`books#180`：L9 的入口是**准备区**
	const w = 边可否通行(a, b);   // ★`books#176`：合成「活着」
	/* ★`books#259` 裁 1：**本层那一场没打，向上边不开**（战斗不可跳）；
	 *   ⚠ 只有「层 → 下一层」这组边受此门（`L9-camp → L9`「走进那道光」与 `L9 → L10-camp` 不在此列：
	 *     前者是进战场的门、后者已由 `#180` 的头目硬门管）。 */
	map.addPath({ from: a, to: b, text: `向上，去第 ${i + 2} 层`,
		/* ★`books#259` 裁 6：持有「预知」者，这一攀先过**门**（模态 4 选项）；其余人直接上去。 */
		action: () => { 预知门(a); },
		when: () => (typeof w === 'function' ? w() : true) && 本层已战(a) });
}
/* ★`books#133` 笔 3：L9 的**唯一出口**＝前进（设计稿：「选项唯一＝前进进入 10 层」）。
 *   文案带上设计原词，让「前进」在**选项本身**上可见（✗ 只在文档里）。边照旧，守卫只说「就这一条」。 */
map.addPath({ from: 'L9-camp', to: 'L9', text: '走进那道光（迎战不眠者）', when: 边可否通行('L9-camp', 'L9') });
map.addPath({ from: 'L9', to: 'L10-camp', text: '前进（钻进光里 · 第 10 层）', when: 边可否通行('L9', 'L10-camp') });
/* ★`books#259` 裁 2（塔单向向上）：**本行原为 `L10-camp → L9`「退回第 9 层（段内自由）」—— 已摘**。
 *   领队 07:19 裁：裁 2 只摘**层间回边**；「撤退落准备区」（`books#180` 的 `L9-camp`）＝**战内语义**（doc-3 §14⑥⑦「有退路必成」），
 *   ✗ 塔层移动 ⇒ 那条路（`encounters.js` 的「落准备区」）**原样保留**，与本行无关。 */
/* ★`books#259` 裁 2（塔单向向上）：**向下边整段原在此处**（`入层口(Li) → L(i-1)`「向下，回第 N 层（段内自由）」循环）—— **已摘**。
 *   ⇒ 塔内**只可向上**；「撤退」不在此面（它是战内语义，见上）。 */
/* ★ **10→11 单向门本体与 L11 实体均由 `babel2.js` 接**（`#1791`）：
 *   一段当年挂不上那条边（L11 尚不存在 ⇒ 悬空边、`validate()` 必红）；现在 L11 是二段的**爬层**
 *   （不再是终点）⇒ 由二段文件统一挂。 */

/* ---------- 构建时校验（build-and-check：不合法就别开故事）----------
 * 这里只校验**一段已建的部分**（连通性检查要等二段接上 ⇒ 在 `babel2.js` 末尾做全图检查）。 */
const problems = map.validate();
if (problems.length > 0) throw new Error(`[babel] 一段图不合法：${problems.join('；')}`);

/* ---------- 注册为可玩的 MapScene ---------- */
/** ★`books#136`（F4）：「探索」场景的**唯一构造形**。
 *  两个消费者：①下方注册 ②**读档重注册**（`src/story/hooks.js` 的 `Save.onLoad` 钩子）。
 *  ⇒ 共用本工厂（✗ 两处各写一份字面量：那样「新场景该带哪些参数」就有了两个权威源，
 *    将来加一个参数（如 chain／onEnter）只改一处 ⇒ **静默漂移**）。
 *
 *  ★为何读档要**换实例**（✗ 「清掉那个记录」）：印过场景头的记录是引擎 `MapScene` 的**私有字段**
 *  （`src/core/60-map.js` 的 `#headerLoc`）⇒ 故事侧**读不到也写不了**（本席实测：实例上
 *  `getOwnPropertyNames` 只有公开字段）。而它**随实例存活**，`map.current` **随存档存活** ⇒
 *  同地点读档时两者相等 ⇒ 场景头（【层名】＋desc）**不重印**：读档后屏幕上只剩选项。
 *  ⇒ 读档＝换一个新实例（私有缓存归零）⇒ 场景头重印 ✓。
 *  ⚠ **地图实例必须复用同一个**（`map`）—— 地点与边是构建期重放出来的代码面，
 *    换图 ⇒ 位置/地点全丢（判据见 `verify.mjs` 的 ㉑）。 */
const makeExploreScene = () => new R.MapScene({ id: 'babel-explore', title: '巴别之井', map, start: 'L1' });

setup.BABEL = Object.assign(setup.BABEL ?? {}, {
	map,
	/* ★`#132` 战后**必掉**表（设计：L2 100% 绷带 ／ L4 固定掉钥匙）—— 由 `world/encounters.js` 的战后段消费。
	 *  为何故事侧办（✗ 等引擎的「必掉字段」）：`fight()` 的战后段**是本仓的面** ⇒ 在此声明、战后**无条件授予**
	 *  ⇒ 语义**确定**（✗ 高权重近似）。键＝层 id，值＝必掉物 id 数组。
	 *  ⚠ 必须挂在**本导出面**（✗ 文件前部）—— 同 `nodeAt` 那条实测教训。 */
	弧必掉: Object.freeze({ L2: ['bandage'], L4: ['iron-key'] }),
	gatherPoints: GATHER_OF,       // 地点 id → 该处采集点道具 id（遭遇/采集桥读它；`#116` 起含 L20-settlement）
	/* ★`#116`：地点节点 helper（**在此挂出**，✗ 文件前部 —— 那时 `setup.BABEL` 尚不存在，
	 *   实测：提前赋值 ⇒ `TypeError: Cannot set properties of undefined (setting 'nodeAt')`
	 *   ⇒ 整个 IIFE 抛错 ⇒ `setup.BABEL` 从未注册 ⇒ 故事起不来）。 */
	nodeAt,
	commitNode,
	makeLayerLocation,             // 「层地点」构造形（一段/二段共用；二段文件复用）
	/* ★`books#133` 笔 1：选择制的机器件导出（同 `登记域` 的理由：判据/刀要能**真调用**，✗ 只能静态核）。 */
	EVENT_KINDS, EVENT_LAYERS, drawTwo, eventsOf, ensureDraw, markUsed, eventPending,
	/* ★`books#164`：预知的机器件（同上理由）—— `预报可选`／`预报账`／`预报类`／`记预报`／`可预知`／`类名`。 */
	预报可选, 预报账, 预报类, 记预报, 可预知, 类名, 预知动作, 预知授予层,
	/* ★`books#133` 笔 3：头目弧的机器件（同上理由：判据/刀要能**真调用**）。 */
	LAYER_META, 是头目战场, 头目场, 头目层前方, 边守卫, 边可否通行, 活着, 准备区, 入层口, 进战场复位, 落准备区,   // ★`books#180`
	宝箱奖励表: 宝箱奖励,    // ★`books#170` P1-6：判据按**表**取读数（✗ 在判据里重写一份）
	温泉层, 温泉回复, 温泉动作, 温泉耗时, 温泉可清, 时间账,   // ★`books#177`：温泉的机器件（判据/刀要能**真调用**）
	adoptHub,                      // 整备区接管形（一段/二段共用）
	layerOf: () => R.layerOfLocation(map.current)?.id ?? null,
	makeExploreScene,              // ★`books#136`：读档重注册用（`story/hooks.js` 消费；与下方注册同源）

});

/* ★`#1902`／`#1903`：把本弧的**本局账**登记进保存域契约（引擎 `RPG.save.declareDomain`）。
 *   动机：`#116` 起就有的缺口 —— story 侧新建的裸键**不进** `envelope().domains`，逐域往返面也看不到它；
 *   后果是**审计缺口**，✗ 不是丢档（进档由序列化宿主完成）。
 *   形状标记沿用既有 `span1Farms`／`span1Harvests` 的 `byPack` 约定。
 *   ⚠ 须在**导出面之后**调用（✗ 文件前部／✗ 对象字面量内部）。
 * ★**接口缺席必须显式判**（`dev-9` 阻断 RC）：可选调用 `?.()` 在方法缺席时求值 `undefined`、**不抛**，
 *   故旧的 `try/catch` 对缺席支**永不参与**、那条 `console.warn` 是死支（声明与实现不符）。
 *   现形：`typeof` 显式判 ⇒ 缺席支**真的出声**。函数挂在 `setup.BABEL.登记域` 上 ⇒ **可被调用**（刀用）。 */
/** 本弧**本局账**的键表（★**一处定义**：`books#133` 笔 1 加 `span1Events`；`books#164` 加 `span1Foresee`）。
 *  新键**加在这里**，✗ 再写一段登记代码。
 *  ★`#1902`：本表**导出**（`setup.BABEL.保存域键`）—— 审计面按它**逐键**取读数（✗ 在判据里重写一份键表：
 *    那样「加了键但漏登记」正是判据看不见的那一种）。 */
const 保存域键 = ['span1Arc', 'span1Events', 'span1Foresee'];
const 登记域 = () => {
	const keys = 保存域键;
	if (typeof R.save?.declareDomain !== 'function') {
		console.warn(`[BABEL] 保存域登记口缺席：${keys.join('／')} 未登记（候 \`sgstory#1903\` 的 \`RPG.save.declareDomain\`）`);
		return false;
	}
	let all = true;
	for (const k of keys) {
		if (!R.save.declareDomain(k, 'byPack')) {
			console.warn(`[BABEL] ${k} 未登记：与内置键同名或已登记过（引擎返回 false）`);
			all = false;
		}
	}
	return all;
};
登记域();
setup.BABEL.登记域 = 登记域;
setup.BABEL.保存域键 = 保存域键;   // ★`#1902`：审计面按此表逐键断（同源，✗ 判据自写一份）
/* ★`books#178` 件 2 的需求：**「只给活人」这个闸门必须能被别档取用**（同源，✗ 各自重写一份判活）。
 *   件 2 的营火交易挂在**引擎侧地点**上，绕不过本档 `.map(只给活人)` 那道过滤 ⇒ 只有导出它，
 *   挂上去的动才与地图动作受**同一道**闸门（`#176` 终局后 hub 不给动作的判据据此成立）。 */
setup.BABEL.只给活人 = 只给活人;
setup.BABEL.乙保证 = 乙保证;          // ★`books#201` 乙：判据可**真调用**（✗ 只能静态核）
setup.BABEL.是头目战场 = 是头目战场;  // ★`books#201`：`fight()`（跑分器走的真路）据此在该层发保证装备
R.registerScene(makeExploreScene());

/* ---------- 永久被动「预知」（**注册面已迁引擎档** · `#1909`／`sgstory#1930`）----------
 * 原故事侧 `R.defEffect({ id: 'precognition', … })` 已**退役**：注册面现在在**引擎档**
 *   `src/dnd/dnd3/core/passives.js`（归属理由见该档文件头 —— 通用被动归引擎，Babel 专属数值归故事层）。
 * ⚠ **退役是必须的**（✗ 不是整洁癖）：引擎与故事两边都注册 ⇒ 加载期打一条
 *   `[RPG] 效果 id「precognition」重复注册：预知 被覆盖。`（本席实测：退役前 boot 期 14 条「重复注册」，
 *   含这一条；退役后 13 条、无它）。且两条实现并存时，将来改一处忘另一处会**静默**按后加载者为准。
 * ★**注册即验照留**（形同原样，只把出处改指引擎档）：未生效即抛 —— ✗ 不留到 L5 授予时才以「未知效果」
 *   暴露（那时代价是战斗深处的一次崩溃）。 */
if (!R.effects.has('precognition'))
	throw new Error('[babel] 引擎档 dnd3/core/passives.js 的 precognition 未生效（pin 是否已含 sgstory#1930？）');
