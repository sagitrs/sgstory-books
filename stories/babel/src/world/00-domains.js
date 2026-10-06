/* 00-domains.js —— 物品／节点／建筑 **三域**与**域属账**（`books#208`；`#172` 批 3）
 *
 * 本档回答的问题：「**同一件东西**该从哪一本账里找？」
 * 口径（出处：`#208` 票面 ＋ 操作者裁，落档评论 `6008797745`／`6012882578`；接口草案 `6008442259`）：
 *   · 裁㈠：三域**落故事侧** ✓；裁㈡：实例身份**沿用 `entityId`** ＋ 源码出现 `instanceId` ⇒ 红 ✓；
 *     裁㈢：`设施`（`books#206` 落地的**生产装置类**）**并入 building 域**，命名沿用 `设施` ✓。
 *
 * 三域与各自**唯一**真源（本档 ✗ 不另存域表 —— 第二真值必漂移；同族事故见 `babel.js:9` 的 adoptHub）：
 *   inventory（物品）＝`D.Player.items`（背包／手／装备）＋ `State.variables.babelL10Storage`（个人寄存）
 *   node（节点）     ＝`State.variables.gatherNodes`（按键＝层 id 存 item **快照**；`#116`「采集点挂地点」）
 *   building（建筑）＝`State.variables.babelTown.设施`（`#206`；含「建筑类」五栋与「生产装置类」设施 ✓）
 *
 * ★**主判据（本票）**：每个 `entityId` **恰好在一个域里是「实体」** ✓ —— 出现在第二处 ⇒ 那必须是
 *   **引用**（由调用方具名），本档只负责把「**实体冲突**」如实报出 ⇒ `域属账().冲突` 非空即红 ✓。
 *   ★为何需要它：同一件东西既能从背包找、又能从节点找（`babel2.js:83` 的「料场图纸应当进背包」正是
 *   这一族）⇒ 一旦两本账都把它当**实体** ⇒ 改一处、另一处静默失效（`babel.js:9` 那类事故）✓。
 *
 * ⚠ 读路径**不写档**（`10-item.js:45-58` 的既有判据）：本档**只读**三本真源；
 *   `保号()` 只顶**模块级**高水位（`RPG.itemEntitySeq`，✗ 不进 `State`）⇒ 因此**读路径也可安全调用** ✓。
 * ⚠ 装载序：本档晚于 `00-clock-town.js`（字典序 c < d）⇒ ✗ 反向依赖；两档都只经 `setup.BABEL` 通信 ✓。
 */
const R = setup.RPG, D = setup.DND3;
const BD = (setup.BABEL ??= {});

const 域名单 = Object.freeze(['inventory', 'node', 'building']);

/** 顶高水位：把已见号推过 `RPG.itemEntitySeq`（✗ 不写档 ⇒ 读路径可调 ✓）。 */
const 保号 = (entityId) => { R.noteEntityId(entityId); return entityId; };

/* ── 三域的**只读**视图（各自独立可装配：✗ 一处失败不牵连另两处）────────── */
/** 物品域：背包里的实例 ＋ 个人寄存里的快照。 */
const 物品域 = () => {
	const 出 = [];
	for (const it of (D.Player?.items ?? [])) if (it?.entityId) 出.push({ entityId: 保号(it.entityId), id: it.id, 源: 'bag' });
	for (const s of (State.variables.babelL10Storage ?? [])) if (s?.entityId) 出.push({ entityId: 保号(s.entityId), id: s.id, 源: 'locker' });
	return 出;
};
/** 节点域：按层 id 存的 item 快照（`#116`：采集点**挂地点**）⇒ 也是**实体**（快照带 `entityId` ✓）。 */
const 节点域 = () => Object.entries(State.variables.gatherNodes ?? {})
	.filter(([, s]) => s?.entityId)
	.map(([层, s]) => ({ entityId: 保号(s.entityId), id: s.id, 源: 'node:' + 层 }));
/** 建筑域：`设施` 表（裁㈢）；「建筑类」五栋与旧农田在地点表里，✗ 不带 `entityId` ⇒ 本域只列**带号**者。 */
const 建筑域 = () => Object.entries(State.variables.babelTown?.设施 ?? {})
	.filter(([, f]) => f?.entityId)
	.map(([键, f]) => ({ entityId: 保号(f.entityId), id: f.产出 ?? 键, 源: '设施:' + 键 }));

/** 域属账：三域**各自的**实体清单 ＋ **冲突**（同一 `entityId` 出现在 ≥2 域 ⇒ 实体撞车 ✓）。 */
const 域属账 = () => {
	const 账 = { inventory: 物品域(), node: 节点域(), building: 建筑域(), 冲突: [] };
	const 见 = new Map();
	for (const 域 of 域名单) for (const e of 账[域]) {
		(见.get(e.entityId) ?? 见.set(e.entityId, []).get(e.entityId)).push({ 域, ...e });
	}
	for (const [entityId, 处] of 见) {
		const 域集 = [...new Set(处.map((x) => x.域))];
		if (域集.length > 1) 账.冲突.push({ entityId, 域s: 域集, 处 });
	}
	return 账;
};

/** 单点域属：`{ 域s, 唯一, 域 }`；未登记 ⇒ `null`（✗ 不臆造域 ✓）。 */
const 域属 = (entityId) => {
	const 账 = 域属账();
	const 域s = 域名单.filter((域) => 账[域].some((e) => e.entityId === entityId));
	if (域s.length === 0) return null;
	return { 域s, 唯一: 域s.length === 1, 域: 域s.length === 1 ? 域s[0] : null };
};

/* ── 挂出机器件（判据／刀要能**真调用**，✗ 只能静态核 —— 同 `#177`／`#207`／`#206` 的理由）── */
BD.域 = { 域名单, 物品域, 节点域, 建筑域, 域属账, 域属, 保号 };
