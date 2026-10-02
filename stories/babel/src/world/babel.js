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
		if (r) r.deepest = L.id;
	},
	actions: [
		/* ★`#116`：**单一采集动作**（✗ 原两段式「先翻找（发进背包）⇒ 再对背包里的节点采」）——
		 *   采集点是**地点的特征**（一处碎石堆），✗ 可揣进背包的道具。
		 *   · **可用性＝地点特征**：`charges` 取自**层节点账**（`nodeAt`）⇒ 采空（0）即动作**消失** ✓
		 *   · **计数在文案上**（`#1887` 的消费面迁到这里）：「碎石堆还可采 N 次」✓
		 *   · 产出进**玩家背包**、节点**留在账上**（`from = 玩家`／actor ＝ 临时 holder） */
		{
			text: () => {
				const n = nodeAt(L.id);
				const left = n?.charges;
				return left == null ? `采集（${L.gatherLabel}）`
					: `采集（${L.gatherLabel}｜还可采 ${left} 次）`;
			},
			when: () => (nodeAt(L.id)?.charges ?? 0) > 0,
			action: () => setup.BABEL.gather(),
		},
		/* 遭遇：地图 action 跳转到独立段落（战斗要全屏渲染，同旧宅 e2e 的形）。
		 * ⚠ 层读面（`RPG.inGradient`）来自 `#1784`（`src/core/65-encounters.js`）⇒ 在此**能力探测**：
		 *   缺席时仍给出入口（点了**开发者通道**会报「装配缺口」、玩家层给白话提示；✗ 静默消失）——
		 *   ★`#1863`：开发者信号走 `console.warn`（票号/源码路径是写给接线者的），玩家层只出白话。
		 *   这与「静默不触发」的失败形相反，见 encounters.js 的依赖声明。 */
		{
			text: '遭遇（往上走之前，先看有什么挡路）',
			when: () => (typeof R.inGradient === 'function' ? R.inGradient(L.id) : true),
			action: () => SugarCube.Engine.play('遭遇战'),
		},
	],
});

for (const L of LAYERS) map.addLocation(makeLayerLocation(L));

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
			actions: patch[loc.id] ? patch[loc.id](loc.actions) : loc.actions,
			onEnter: () => {
				const r = State.variables.babelRun;
				if (r) r.deepest = R.layerOfLocation(loc.id)?.id ?? loc.id;
			},
		}));
	}
	for (const exit of hub.exits) target.addExit(exit);
};

/* ---------- 第 10 层：整备区（取包里的实例 —— 单一权威源）---------- */
adoptHub(map, DND3.buildSpan1Hub());   // 包里已自带 `validate()`：不合法会抛

/* ---------- 边 ----------
 * 段内自由（双向）＋ 段间封闭（10→11 单向、无回边）。 */
for (let i = 0; i < LAYERS.length - 1; i++) {
	const a = LAYERS[i].id;
	const b = LAYERS[i + 1].id;
	map.addPath({ from: a, to: b, text: `向上，去第 ${i + 2} 层` });
}
map.addPath({ from: 'L9', to: 'L10-camp', text: '钻进光里（第 10 层）' });
map.addPath({ from: 'L10-camp', to: 'L9', text: '退回第 9 层（段内自由）' });
for (let i = LAYERS.length - 1; i > 0; i--) {
	const a = LAYERS[i].id;
	const b = LAYERS[i - 1].id;
	map.addPath({ from: a, to: b, text: `向下，回第 ${i} 层（段内自由）` });
}
/* ★ **10→11 单向门本体与 L11 实体均由 `babel2.js` 接**（`#1791`）：
 *   一段当年挂不上那条边（L11 尚不存在 ⇒ 悬空边、`validate()` 必红）；现在 L11 是二段的**爬层**
 *   （不再是终点）⇒ 由二段文件统一挂。 */

/* ---------- 构建时校验（build-and-check：不合法就别开故事）----------
 * 这里只校验**一段已建的部分**（连通性检查要等二段接上 ⇒ 在 `babel2.js` 末尾做全图检查）。 */
const problems = map.validate();
if (problems.length > 0) throw new Error(`[babel] 一段图不合法：${problems.join('；')}`);

/* ---------- 注册为可玩的 MapScene ---------- */
setup.BABEL = Object.assign(setup.BABEL ?? {}, {
	map,
	gatherPoints: GATHER_OF,       // 地点 id → 该处采集点道具 id（遭遇/采集桥读它；`#116` 起含 L20-settlement）
	/* ★`#116`：地点节点 helper（**在此挂出**，✗ 文件前部 —— 那时 `setup.BABEL` 尚不存在，
	 *   实测：提前赋值 ⇒ `TypeError: Cannot set properties of undefined (setting 'nodeAt')`
	 *   ⇒ 整个 IIFE 抛错 ⇒ `setup.BABEL` 从未注册 ⇒ 故事起不来）。 */
	nodeAt,
	commitNode,
	makeLayerLocation,             // 「层地点」构造形（一段/二段共用；二段文件复用）
	adoptHub,                      // 整备区接管形（一段/二段共用）
	layerOf: () => R.layerOfLocation(map.current)?.id ?? null,
});
R.registerScene(new R.MapScene({ id: 'babel-explore', title: '巴别之井', map, start: 'L1' }));
