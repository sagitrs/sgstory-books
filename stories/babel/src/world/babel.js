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
		/* ★`#135` ②a：**max** 语义（✗ 无条件赋值 —— 从 L20 退回 L19 会把「最深」写小；
		 *   `babel2.js:147` 确有该回边）。层号由 id 取（`L19`／`L20-forge` 皆可）⇒ ✗ 字符串直比。 */
		if (r && Number(String(L.id).match(/L(\d+)/)?.[1] ?? 0) > Number(String((r.deepest ?? '')).match(/L(\d+)/)?.[1] ?? 0)) r.deepest = L.id;
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
	dmg: '1d8', type: 'piercing', atkBonus: 6,
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

/* ---------- 遭遇表覆写（只换 L1–L3；L4–L9 与 **掉落面**逐字继承引擎）---------- */
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
	}));
}

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
			actions: patch[loc.id] ? patch[loc.id](loc.actions) : loc.actions,
			onEnter: () => {
				const r = State.variables.babelRun;
				/* ★`#135` ②a（hub 接管面）：同 max 语义（✗ 无条件赋值）。 */
				const _d = R.layerOfLocation(loc.id)?.id ?? loc.id;
				if (r && Number(String(_d).match(/L(\d+)/)?.[1] ?? 0) > Number(String((r.deepest ?? '')).match(/L(\d+)/)?.[1] ?? 0)) r.deepest = _d;
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
const 登记域 = () => {
	if (typeof R.save?.declareDomain !== 'function') {
		console.warn('[BABEL] 保存域登记口缺席：span1Arc 未登记（候 `sgstory#1903` 的 `RPG.save.declareDomain`）');
		return false;
	}
	if (!R.save.declareDomain('span1Arc', 'byPack')) {
		console.warn('[BABEL] span1Arc 未登记：与内置键同名或已登记过（引擎返回 false）');
		return false;
	}
	return true;
};
登记域();
setup.BABEL.登记域 = 登记域;   // ★导出以便判据可**真调用**（✗ 只能静态核）
R.registerScene(makeExploreScene());

/* ---------- 永久被动「预知」占位（`#1893` E2 · 供 L5 的固定事件授予）----------
 * ★**占位**：无任何效果（✗ 判定字段）—— 只提供挂载面，效果留待 0.0.2。
 * `scope:'persistent'` ⇒ **跨场保留**；而**死亡清档照样清它**（`RPG.respawn` 的清档按角色实例的
 *   `effects` 过滤，与「谁注册」无关 ⇒ 故事侧注册与引擎侧注册语义一致）。
 * ★**注册即验**：未生效即抛（✗ 静默 —— 否则要到 L5 授予时才以「未知效果」暴露）。 */
R.defEffect({
	id: 'precognition', name: '预知', kind: 'buff', scope: 'persistent',
	desc: '（占位：暂无效果）',
});
if (!R.effects.has('precognition')) throw new Error('[babel] precognition 注册未生效');
