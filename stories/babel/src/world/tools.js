/* 巴别之井 · 试玩版 —— 工具三件（耐久制）＋ 采集换代（`books#133` 笔 2 的 A 半）
 *
 * 口径（领队 2026-10-02 23:27 依操作者原文确认「照此落」；两处微调见票面）：
 *   · 三件工具**故事侧定义**（数据归属裁定：Babel 专属 ⇒ 故事层，**零引擎件**）
 *   · 耐久＝`charges`（初值 `TOOL_CHARGES`，**一处常量**）；`stackable: true` ⇒ `RPG.give` 再拾同类
 *     **并入**（耐久相加，引擎既有语义，✗ 故事侧自写）
 *   · 层–工具对应**一处表**（`工具层表`）；该层**没有对应工具** ⇒ 抽中的「采集」事件**按钮不显示**
 *     （✗ 死格 —— 该层仍有另一类可选）
 *   · **扣耐久实例感知**：扣在「它实际用的那个槽对象」上，✗ 不经 `act`／`take` 的按 id 路径 ——
 *     `src/core/30-inventory.js` 的 `act` 是 `list.find((s) => s.id === id)`（取第一件），
 *     而 `take` 是「按 id 从后往前」，两者都会**扣错那把**（`sgstory#1905` ＋ 领队转达的探针实证）
 *
 * 覆盖范围：**只 L5–L8**（笔 1 已把那四层的采集位改成抽签事件）；L1–L4／L9 与二段**逐字不动**（现制采集）。
 * 显示口径：工具是**充能件**（`charges != null`）⇒ 背包行按引擎既有约定显示 `×N`（与「绷带×2」同义＝还剩几次）。
 */
const R = setup.RPG;

/* ---------- 数值表（**一处常量**；判据按它取读数 ⇒ 往后平衡只改这里）---------- */
const TOOL_CHARGES = 6;
const TOOLS = Object.freeze({
	pick: { name: '矿镐', desc: '一把没锈的矿镐，木柄被汗浸得发黑。' },
	axe: { name: '斧头', desc: '斧刃卷了两处，但劈得动木头。' },
	shovel: { name: '铁铲', desc: '铲头磨得发亮，是铲碎石用的。' },
});
/** 层 ⇒ 该层采集所需的工具（**一处表**）。
 *  ⚠ 本表与领队确认的**材质表**有一处差异：材质表把「碎石堆」判给镐，本表把 **L6（兽骨阶／碎石堆）判给铲**。
 *    理由：否则**铲在 L5–L8 无任何用户**（死件），而「碎石堆用铲」层味也顺。
 *    要把 L6 收回给镐、把铲留到二段 ⇒ 只改这一格。 */
const 工具层表 = Object.freeze({ L5: 'pick', L6: 'shovel', L7: 'axe', L8: 'pick' });

/* ---------- 三件工具（`R.defItem`）---------- */
for (const [id, meta] of Object.entries(TOOLS)) {
	R.defItem({
		id,
		name: meta.name,
		desc: meta.desc,
		stackable: true,                 // ★⇒ `RPG.give` 再拾同类时**并入**（耐久相加）
		charges: TOOL_CHARGES,
		/* ★`books#212` 第 3 项：**声明**这件是「耐久制」（✗ 堆叠件）⇒ 背包行印「（耐久 N）」而不是「×N」
		 *   （操作者原文：「『铁铲×6』实为剩余次数——标『耐久 6』与数量区分」）。缝在引擎
		 *   `RPG.itemCountSuffix`（单点），故事侧只**声明** ✓。 */
		stats: { durability: true },
		/** 背包里点它 ⇒ **拒绝**（`used()` 返回 `false` ⇒ `act` 不提交、**不扣耐久** —— `#1801` 的契约），
		 *  并给一句白话：工具要对着能采的东西用。
		 *  ★`sgstory#1906` §G（`books#166` 的第⑦面）：这句是**瞬时说明**（「为什么用不了」）⇒ 走**通知面**
		 *    （✗ 落正文）。`perform` 两个面都写 ⇒ 玩家每点一次正文多一行（`books#130` D6-3 的读数形）；
		 *    能力探测：通知面未加载的环境回落 `perform`（同 `coin`）。 */
		used() {
			const line = `${this.name}得对着能采的东西用。`;
			if (typeof R.pushNotice === 'function') R.pushNotice(line);
			else this.perform(line);
			return false;
		},
	});
}
if (Object.keys(TOOLS).some((id) => !R.items.has(id))) throw new Error('[babel] 工具三件注册未生效');

/* ---------- 取用与扣费（**实例感知**）---------- */

/** 该层的采集是否需要工具（不在表内 ⇒ `null` ＝ 免工具／非工具层）。 */
const 需要工具 = (layerId) => 工具层表[layerId] ?? null;

/** **实例感知**取工具：返回背包里**那件工具的槽对象**（✗ 返回 id —— 那会把后续扣费带回「按 id 取第一件」）。
 *  ⚠ 同类并存（理论上被 `stackable` 的并入语义排除，但旧档／手工构造仍可能）⇒ 取**耐久最多**的那把：
 *    确定性 ＋ 对玩家友好，且在票面写明这是「玩家点选那件」的替身（静态动作表无法逐实例出按钮）。 */
const 持工具 = (layerId) => {
	const kind = 需要工具(layerId);
	if (!kind) return null;
	const bag = State.variables.inventory ?? [];
	const 候选 = bag.filter((s) => s?.id === kind);
	if (候选.length === 0) return null;
	return 候选.reduce((best, s) => ((s.charges ?? 0) > (best.charges ?? 0) ? s : best), 候选[0]);
};

/** 该层此刻**能不能采**（`when` 用）：免工具层恒真；工具层须手上有那件。 */
const 可采 = (layerId) => !需要工具(layerId) || !!持工具(layerId);

/** 池内「采集」按钮的**读数**（文案用）：`{kind, name, charges}` 或 `null`（免工具层／手上没有）。 */
const 工具读数 = (layerId) => {
	const kind = 需要工具(layerId);
	if (!kind) return null;
	const slot = 持工具(layerId);
	return slot ? { kind, name: TOOLS[kind].name, charges: slot.charges ?? 0 } : { kind, name: TOOLS[kind].name, charges: null };
};

/** 扣 1 点耐久在**那一个槽对象**上；用尽即摘槽（与引擎 `take`／`act` 的「不产生 0 残槽」同语义）。
 *  ⚠ 走 `RPG.events.emit('item:used', …)` 与引擎 `act` 同形 —— 故事侧 `hooks.js` 的 `itemsUsed` 计数读它。 */
const 扣耐久 = (slot) => {
	if (!slot || slot.charges == null) return null;
	slot.charges -= 1;
	if (slot.charges <= 0) {
		const bag = State.variables.inventory ?? [];
		const at = bag.indexOf(slot);
		if (at >= 0) bag.splice(at, 1);
	}
	R.events?.emit?.('item:used', { id: slot.id, name: TOOLS[slot.id]?.name, action: 'gather' });
	return slot;
};

/* ---------- 采集换代：工具制**套在现制采集外层**（节点账那套逐字不动）----------
 * ★为何不重写采集本体：`#116` 的节点账（临时 holder ＋ `commitNode` 写回）已经过两轮评审；
 *   工具制只是**前面加一道门、后面加一次扣费**（采成**才**扣 —— 同 `#1801`「接受后才扣」的口径）。
 * ★为何 `when` 也要工具：否则按钮会点进去才被告知没工具（那是「假选项」）；现在**没有工具就不出按钮**。 */
/* ⚠ **加载次序依赖（dev-9 NIT④）**：本文件按 `sorted(rglob("*.js"))` 装载（`build.py`），
 *   定义现制采集的 `world/encounters.js` 必排在 `world/tools.js` **之前**（`e` < `t`）⇒ 此刻它应当已在。
 *   若日后次序变动使这条捕获拿到 `undefined`，用**具名抛错当场炸掉**（✗ 静默降级成「没有工具制」——
 *   那会让工具门悄悄消失，而判据仍绿：比崩掉更坏）。 */
const 现制采集 = setup.BABEL.gather;
if (typeof 现制采集 !== 'function') {
	throw new Error('tools.js：`#116` 的现制采集缺席（`world/encounters.js` 必须排在 `world/tools.js` 之前装载）');
}
setup.BABEL.gather = () => {
	const layer = setup.BABEL.map?.current ?? null;
	const kind = 需要工具(layer);
	const slot = 持工具(layer);
	if (kind && !slot) return R.perform(`这里的东西得用${TOOLS[kind].name}才弄得动。`);
	/* ★`books#171`（P2-10）：本读数**必须在调用之前取** —— 它问的是「**采前**有货吗」，
	 *   而 `现制采集()` 会扣 `charges`。旧形把它写在调用**之后**，于是**采空那一击**（采前 1 件）
	 *   被读成「采前无货」⇒ **不扣耐久**（操作者试玩实测：最后一次采集后耐久停在 1）。 */
	const 采前有货 = (setup.BABEL.nodeAt?.(layer)?.charges ?? 0) > 0;
	const res = 现制采集();
	/* ★「采成**才**扣」的判据取**两条**：引擎判 `applied` **且**节点采前确实有货 ——
	 *   ⚠ 空节点时引擎仍回 `applied`（它「采到了 0 件」），若只看 status 会**白扣 1 点耐久**
	 *   （本席 ㉕ 的⑤臂实测撞到：铁斧 3 ⇒ 2）。玩法里 `when` 已挡住空节点，这条是**纵深防御**。 */
	if (res && res.status === 'applied' && slot && 采前有货) 扣耐久(slot);
	return res;
};

setup.BABEL.工具 = Object.assign(setup.BABEL.工具 ?? {}, {
	TOOL_CHARGES, TOOLS, 工具层表,        // ★导出**表本身**：判据按表取读数（平衡只改表）
	需要工具, 持工具, 可采, 工具读数, 扣耐久,
});
