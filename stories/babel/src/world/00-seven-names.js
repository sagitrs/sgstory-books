/* 00-seven-names.js —— W09「七名河」首次出城固定教程（`books#397`；S3 · **片 1**）
 *
 * 设计源（票面 sha `56829d8c`）：`docs/plans/babel/optional/tutorial-seven-names/README.md` ＋
 *   `events.json`（正文由 `00-seven-names-content.js` **逐字**带入 ✓，✗ 本档不重写文本）。
 * 口径（终裁 `6014314121` ✓；我照裁更正 `6014362312` ✓；领队照批 `#397` 评论 `6015785798` 后 12:01:54Z）：
 *   ①三态（未开始／进行中／完成）＋**可恢复位置** ✓
 *   ②**独立保存域**（本档 `域键`）——✗ 不塞 `babelRun` ✓；经**故事侧登记口** `RPG.save.declareDomain` ✓
 *     （实查 `src/core/80-save.js:43,89` 可用 ✓ ⇒ ✗ **不需引擎前置** ✓）
 *   ③位置／已处理事实／逐节点结果**皆可恢复**；★「已处理集」**由已提交结果派生**（`已处理()` ✓）✗ 不另存一份
 *   ④行动与导航**分开**；导航**静态定义**（`边表` 是唯一权威 ✓）⇒ ✗ **渲染期抽签**、✗ **渲染期建键** ✓
 *   ⑤已开始未完成者**死亡** ⇒ **保留「进行中（未完成）」**（本档 `死()` 刻意**零写** ✓）
 *   ⑥便捷直达 ✗ **不写** W09 三态／节点结果 ✓
 *   ⑦✗ **不设逐层时限**（时间仍归 `books#206` 的唯一时间账 `推进()` ✓）
 * 片 1 的**最小运行契约**＝状态机 ＋ **唯一交付口** ＋ 三态可持续保存 ✓。
 *
 * ⚠⚠ 本片**具名不做**（✗ 静默省略 ✓）：
 *   · **片 2**：四组真怪物（Crocodile×1／×2、Small／Medium Water Elemental ✓）与候选数值、侦察／脱离两路 ✓
 *     （本档已存 `enemy`／`reference_cr_per_creature` 等**注释性数据**，✗ 不据它召唤 ✓）
 *   · **片 3**：**统一返程结算**（脆弱三栏 ✓ —— 设计 §9 明写该 pin 的 `Item` **无通用脆弱字段** ⇒ 须引擎前置 ✓）
 *     与正式单图地图（§8 的 SVG 资产链 ✓）
 *   · **铜冠的「佩戴」**：片 1 曾判「实查引擎 slot 取值只有 `belt/body/feet/mount/shield/shoulders/vest/weapon`
 *     ⇒ **无头槽** ⇒ 换装落点另笔」——★**S4（`books#398`）已纠正**：那是**已用值**、✗ 不是**封闭枚举**
 *     （`slot` 是**自由字符串**：引擎 `10-item.js:127-129` 注释逐字「规则包可扩展」，赋值 `def.slot ?? null`；
 *     `slotEquip` 逐字符串比较、**无白名单**；既有先例 `src/dnd/dnd3/items/slot-extension.js` 明写「零引擎改」）
 *     ⇒ S4 按**既有扩展点**接**真**头槽（`slot:'head'`、中文显示「头部」）✓（换装见 `装槽` ✓）。
 *   · **铜冠的情境 Listen＋2**（领队已准「另笔」✓）、**撤 `return-scroll`／旧档兼容**（同 ✓）
 *
 * ⚠ 读路径**不写档**（本仓成文判据：被拒 ⇒ 存档面零变化，见 `src/core/10-item.js:45-58`）：
 *   下列 `读()`／`已处理()`／`可走()` **一律不建键** ✓；只有 `开始`／`选行动`／`走`／`用机会`／`完成` 写 ✓。
 * ⚠ 装载序：本档晚于 `00-seven-names-content.js`（字典序 'c' < 'j' ✓）⇒ 直接读它的成品 `BC.七名河内容` ✓。
 * ⚠ 物品注册：★**故事侧注册物品在本仓属首例**（既有物品全在规则包 `src/dnd/dnd3/items/` ✓）
 *   ⇒ 实查 `RPG.defItem` 为公开 API、注册表全局 ✓ ⇒ 可用 ✓；★若评审认为该入规则包，请裁 ⇒ 我改跨仓笔 ✓。
 */
const R = setup.RPG, D = setup.DND3;
const BS = (setup.BABEL ??= {});
const C = setup.BABEL_CONTENT.七名河内容;

/* ── 常量（一个量一个名字 ✓）──────────────────────────────────────── */
/** ★**独立保存域**（②）；✗ 不塞 `babelRun`。 */
const 域键 = 'sevenNames';
/** 三态（①）—— 值即人读字面，✗ 不用数字代号（省一层翻译）。 */
const 态 = Object.freeze({ 未开始: '未开始', 进行中: '进行中', 完成: '完成' });
/** 「高歌猛进」的两个修正**只作登记口径**：真正生效的「本次修正」住在**内容档每个 `check.modifier`** 里 ✓
 *  （设计 §4：−6 只作用**逃脱**检定、＋3 只作用**应战侦察** ⇒ ✗ 不落到属性本身、✗ 不加攻击/AC/豁免 ✓）。 */
const 高歌猛进 = Object.freeze({ 逃脱: -6, 侦察: 3 });

/* ── 本片唯一新物品：听雨之冠（★`slot:'head'` —— 走**既有扩展点**，零引擎改 ✓）────
 *   （片 1 的过窄判断已纠正，理由与引文见档头「铜冠的『佩戴』」一栏 ✓。） */
R.defItem({
	id: 'rain-diadem',
	name: '听雨之冠',
	desc: '七名河渡工给的铜冠；戴上它，能听见水流的节拍。',
	/* ★`noBattleUse: true`：本件在**战斗中没有任何动作** ⇒ 战斗交互选单据此不亮「使用」
	 *   （同 `src/dnd/dnd3/items/resources.js` 的先例 ✓）✗ 让玩家点进去才被拒 ✓。 */
	/* ★S4 裁 P：`cost` ＝ **参考价 100 枚旧硬币**，说明**不可出售**；★**禁售与价格分开** ——
	 *   「不可售」由**售卖政策排除该 id** 落（`00-l10-city.js` 的收购目录 ＋ 真售口在
	 *   扣物/付币/记贡献**之前**的复验 ✓）；✗ 不用一个无人消费的 `noSell` 字段冒充实现 ✓、✗ 不动币制 ✓。 */
	slot: 'head',
	stats: { slotName: '头', cost: 100, weight: 1, noBattleUse: true },
	charges: null,
	stackable: false,
	/* ★`defItem` **强制**要求 `used()`（引擎 `src/core/10-item.js:342`）⇒ 明确**抛具名拒**（✗ 静默），
	 *   同 `resources.js` 的备料形 ✓。★S4：佩戴已走**真**装备路（`slotEquip`／`slotUnequip`）⇒
	 *   这里只剩「战斗中使用」这一条拒路 ✓（片 1 那条「无头槽」拒路随本笔改正 ✗ 不再存在 ✓）。 */
	used() {
		throw R.refuse('DIADEM_NO_BATTLE_USE',
			`「${this.name}」不能在战斗中使用。`,
			{ needAction: 'equip', itemId: this.id });
	},
});
/* ★头槽显示名：引擎 `slotLabels` 是**可选显示名表**（`30-inventory.js:368` `RPG.slotLabels = {}`
 *   ＋ 同档 `?? this.slot` 回退）⇒ 故事侧注册中文「头部」 ✓（✗ 改 core ✓）。 */
R.slotLabels.head = '头部';

/* ── 域访问（读路径零写 ✓）────────────────────────────────────── */
/* ★`books#413` A2（裁：**改 S7 按上下文取** —— ✗ 另造适配层，那会变成「同一个量两套算法」）：
 *   本档的**域／玩家／交付落点**一律从**运行上下文**取 ——
 *     · **正式上下文**（缺省）⇒ `State.variables.sevenNames`／`DND3.Player`／`RPG.give`
 *       ⇒ ★**七名河旧行为逐字不变** ✓（第 70 组既有格 ＋ 其余组为闸 ✓）；
 *     · **测试上下文**（`场次id != null`）⇒ 该会话的**自有域**（会话事实）／**测试角色**／
 *       `RPG.deposit(测试背包, …)` ⇒ 两局**天然不串** ✓。
 *   ⚠ 判据取 `场次id != null`（✗ 取「有没有运行栈」）—— 正式局也恒在上下文里 ✓。 */
const 运 = () => BS.运行?.取?.() ?? null;
const 是测试 = () => 运()?.场次id != null;
/** 域：测试 ⇒ **该会话的活体事实对象**（✗ 快照 —— 本档的状态机是**就地改**（`s.态 = …`）⇒
 *   返快照会让测试局的写**静默丢失** ✗）；正式 ⇒ `State.variables.sevenNames` ✓。
 *   ⚠ 取 `_facts` 是本**集成层**的取舍：会话只公开 `facts()`（快照 ✓）与 `commit()`（合并补丁 ✓），
 *     而本档的写点是**就地改**（十几处）⇒ 若逐处改 `commit` 会摊大改动面；改由 `写域` 统一提交 ✓。 */
const 域 = () => (是测试() ? (运()?.会话?._facts?.事实 ?? null) : State.variables[域键]);
/** 域写回：测试 ⇒ 经会话 `commit`（该会话自己的账 ✓）；正式 ⇒ 直接回 `State`（旧行为 ✓）。 */
const 写域 = (s) => {
	if (是测试()) { 运()?.会话?.commit?.({ 事实: s }); return s; }
	State.variables[域键] = s; return s;
};
/** 原始域（缺席即 `undefined` ⇒ ✗ **不建键**）。 */
const 读档 = () => 域();
/** **写路径**建域（唯一允许建键处 ✓；惰性，✗ 不依赖 `save:ready` —— 引擎零发射 ✓）。 */
const 建档 = () => {
	const 现有 = 域();
	if (现有) return 现有;
	const 新 = { 态: 态.未开始, 当前: C.入口, 结果: {}, 机会: { 用: false, 实例: null }, 路径: [] };
	return 是测试() ? 写域(新) : (State.variables[域键] ??= 新);
};
/** ★**派生**面：已处理集（✗ 不另存一份，见口径③）。 */
const 已处理 = (s) => Object.keys((s ?? 读档())?.结果 ?? {});
/** 静态可达列表（④：唯一权威＝内容档 `边表`；✗ 不抽签、✗ 不建键）。 */
const 可走 = (id) => (C.边表[id] ?? []);

/* ── 门向补充（★出处：设计 README §2「固定拓扑与主干」的拓扑表）─────────────────
 *  ⚠ 设计 `events.json` 的 `portals`（E0／E9）**只带 `intro` 文本、不带 `navigation`** ✗；
 *    而 README §2 的表里写着 E0「**左E1、右E2**」、并说「E0 **推荐左岸**」✓ ⇒ 本档按 §2 **补两个方向** ✓。
 *  ★判据并以 `边表`（权威 ✓）校验：`E0 → [E1, E2]` ✓ ⇒ 补向 ✗ 不得越出静态边表（第 65 组 ⑥ 格钉住 ✓）。
 *  ★E9 **不是**「走」的目标端：它是出口，只有「确认回城」一个 action（走 `完成()` ✓）⇒ ✗ 不补向 ✓。 */
const 门向补充 = Object.freeze({
	E0: [
		{ direction: 'left', to: 'E1', label: '左：奖励·岸边系绳（推荐）' },
		{ direction: 'right', to: 'E2', label: '右：奖励·失落水图' },
	],
});
/** ★**唯一**导航取口（✗ 两处各写一份）：事件用内容档的 `navigation`，门用上方补向 ✓。 */
const 节点导航 = (id) => (C.节点表[id]?.navigation ?? 门向补充[id] ?? []);

/* ── 判定（★用引擎纯判定原语，写路径归本档 ✓）────────────────────── */
/** 属性修正：原始分→调整值一律现算（`DND3.modOf` ✓，✗ 不落字段）。 */
const 属性修正 = (ability) => D.modOf((是测试() ? 运()?.玩家?.() : null)?.stats ?? D.Player?.stats, ability);
/** 掷一次本作自制检定：`d20 ＋ 属性修正 ＋ 本次修正 ≥ DC`（✗ 无技能等级；✗ 自然 1/20 不自动成败 ✓）。 */
const 掷检定 = (check) => R.checkRoll({
	mod: 属性修正(check.ability), dc: check.dc, bonus: check.modifier ?? 0,
});

/* ── 唯一交付口（★投递与记录一同成立；双击不重复发奖 ✓）────────────── */
/** 交付（候选 id ⇒ 真 id 后 `RPG.give`）。返回**已发件**（供失败收回 ✓）。 ✗ 不写任何账。 */
const 交付 = (loot) => {
	const 件 = [];
	const 测试背包 = 是测试() ? (运()?.玩家?.()?.items ?? null) : null;
	for (const [候选, n] of Object.entries(loot ?? {})) {
		const id = C.物品映射[候选];
		if (!id || !Number.isInteger(n) || n <= 0) continue;
		/* ★测试局 ⇒ 落**测试角色自己的背包**（`RPG.deposit` ＝ 引擎参数化交付原语 ✓；
		 *   ✗ `RPG.give` —— 它恒投 `State.variables.inventory`（正式背包）✗ ⇒ 会污染正式局 ✓）。 */
		if (测试背包) R.deposit(测试背包, id, n); else R.give(id, n);
		件.push([id, n]);
	}
	return 件;
};
/** 收回（★容量不足等异常时用 —— 设计 §4：「失败**不先写已领取**」✓ ⇒ 先撤回再拒 ✓）。 */
const 收回 = (件) => {
	const 测试背包 = 是测试() ? (运()?.玩家?.()?.items ?? null) : null;
	for (const [id, n] of 件) { if (测试背包) R.deposit(测试背包, id, -n); else R.give(id, -n); }
};
/** 统一拒绝形（本仓成文：拒绝走**结果面**，✗ 不抛 —— 同 `src/core/55-session.js` ④）。 */
const 拒 = (code, why) => ({ ok: false, code, why: why ?? code });

/* ── 状态机（写路径，逐个具名 ✓）────────────────────────────────── */
/** 开始（或**恢复**）本次教程：未开始 ⇒ 进行中并立**探索实例**（②：「机会」按**实例**一次 ✓，
 *  E0 入场**不消费** ✓）。已完成者 ✗ 不重开（⑥ 之外的正常语义：完成后不再强制教程 ✓）。 */
const 开始 = () => {
	const s = 建档();
	if (s.态 === 态.完成) return 拒('SEVEN_DONE', '本存档的七名河教程已完成');
	if (s.态 === 态.未开始) {
		s.态 = 态.进行中; s.当前 = C.入口; s.路径 = [C.入口];
		s.机会 = { 用: false, 实例: `seven-${Date.now()}` };
	}
	return { ok: true, 态: s.态, 当前: s.当前, 可走: 可走(s.当前), 路径: [...s.路径] };
};
/* ── 真装槽（★S4 裁 H：`slotEquip`／`slotUnequip` ＝ 引擎**既有**合法动作路径 ✓）──────
 *   `slot` 是自由字符串 ⇒ **头槽自动互斥、自动并存**（引擎 `30-inventory.js:301-330`）✓。
 *   **占槽须告知并确认更换**：本笔的选项 `label` 与正文已明写「已有头部装备**转入背包**…不吞物品」
 *   ⇒ **玩家选该选项即确认** ✓；换下者**留在背包**、`entityId／charges／state` 逐字不动 ✓。
 *   ★失败安全：换装失败 ⇒ **旧件复位装备**（✗ 不暗卸）⇒ 由调用方**收回新件**、**不写结果** ✓。 */
const 装槽 = (id, entityId = null) => {
	const 背包 = () => (D.Player?.items ?? []);
	const 冠 = 背包().find((x) => x?.id === id && (entityId == null || x.entityId === entityId)) ?? null;
	if (!冠) return { ok: false, code: 'DIADEM_NO_ITEM', why: '交付后找不到该实体（✗ 用定义 id 造替身 ✓）' };
	/* ★槽名取自**定义** —— 背包里存的是**快照**（`toJSON` 只写 `id/entityId/charges/equipped/state` ✗ 不写 `slot`
	 *   ⇒ 快照上的 `slot` 恒为 `undefined`）；引擎读口 `equippedIn` 同样走 `reviveItem(x).slot` ✓。 */
	const 位 = R.reviveItem(冠).slot ?? null;
	if (!位) return { ok: false, code: 'DIADEM_NOT_EQUIPPABLE', why: '本件没有装备槽' };
	const 旧实例 = R.equippedIn(位);
	if (旧实例 && 旧实例.entityId === 冠.entityId) return { ok: true, 装: true, 槽: 位, 换下: null };   // 同件 ⇒ 幂等 ✓
	/* ★把装备标记写在**背包条目**上 —— 那正是引擎自己的存储面（`equippedIn` 读的就是它 ✓，
	 *   代价是引擎的 `equip(id)`／`slotEquip` 都是**按定义 id**寻件（✗ 分不出同款不同实体）⇒
	 *   本档**按实体**自己写那个标记（D 面裁文也点到这条缺口 ✓），✗ 不另建故事侧替身表 ✓。
	 *   ★旧件**留背包**、`charges／state／entityId` 一律不动 ✓；同槽恰一件由“先清旧再置新”维持 ✓。 */
	const 旧条 = 旧实例 ? (背包().find((x) => x.entityId === 旧实例.entityId) ?? null) : null;
	if (旧条) 旧条.equipped = false;
	冠.equipped = true;
	return { ok: true, 装: true, 槽: 位, 换下: 旧条?.id ?? null };
};

/** 选行动（每节点**只一次** ✓）：查「已处理」⇒ 掷检定 ⇒ **交付** ⇒（★S4：按声明**真装槽**）⇒ **一次提交**结果＋路径。 */
const 选行动 = (i) => {
	const s = 读档();
	if (!s || s.态 !== 态.进行中) return 拒('SEVEN_NOT_STARTED', '七名河教程未在进行中');
	const id = s.当前, node = C.节点表[id];
	if (!node) return 拒('SEVEN_NO_NODE', `未知节点 ${id}`);
	if (node.type === 'portal') return 拒('SEVEN_NOT_EVENT', `${id} 是传送门，✗ 无行动`);
	/* ★片 2（`books#397`）承接：**战斗节点 ✗ 走奖励路** —— 片 1 只挡了 `portal` ⇒ 战斗节点会被
	 *   当成奖励节点走（只掷检定、发空 loot、**不打**）。战斗入口在 `01-seven-names-battle.js`（`战斗行动`）✓。 */
	if (node.type === 'battle') return 拒('SEVEN_IS_BATTLE', `${id} 是战斗节点 ⇒ 走战斗入口（✗ 奖励路）`);
	if (已处理(s).includes(id)) return 拒('SEVEN_NODE_DONE', `${id} 已处理（✗ 不重发奖励）`);
	const opt = node.options?.[i];
	if (!opt) return 拒('SEVEN_NO_OPTION', `${id} 无第 ${i} 个选项`);
	const 掷 = opt.check ? 掷检定(opt.check) : null;
	const 支 = opt.check ? (掷.success ? opt.success : opt.failure) : opt.success;
	let 件 = [];
	try { 件 = 交付(支?.loot); } catch (e) { 收回(件); return 拒('SEVEN_CAPACITY', `交付失败，已撤回（${e?.message ?? e}）`); }
	/* ★S4 裁 H：选项声明 `equip_if_possible` ⇒ **真**装槽（✗ 不写故事侧「已戴」替身表 ✓）。
	 *   ★只有**合法交付 ＋ 所选佩戴事务成功后**才提交 E8 结果 ✓；失败 ⇒ 收回新件 ＋ 旧件复位 ✓。 */
	let 装 = null;
	if (支?.equip_if_possible) {
		for (const [a] of 件) {
			const 条 = (D.Player?.items ?? []).filter((x) => x.id === a).pop() ?? null;   // ★本次交付的那件（取末位 ✓）
			let r;
			try { r = 装槽(a, 条?.entityId ?? null); }
			catch (e) { 收回(件); return 拒('DIADEM_EQUIP_FAILED', `换装失败，已撤回（${e?.message ?? e}）`); }
			if (r.ok) { 装 = r; break; }
			收回(件);
			return 拒(r.code ?? 'DIADEM_EQUIP_REFUSED', `${r.why ?? '换装被拒'}（奖励已撤回 —— ✗ 不先标已领取 ✓）`);
		}
	}
	s.结果[id] = {
		选项: i, 标签: opt.label,
		成败: opt.check ? (掷.success ? '成功' : '失败') : '无检定',
		文本: 支?.text ?? '', 掷, 交付: 件.map(([a, b]) => `${a}×${b}`),
		...(装?.装 ? { 装: 装.槽 } : {}),
		...(件.length === 0 ? { 放弃: true } : {}),
	};
	s.路径.push(id);
	return { ok: true, 节点: id, 成败: s.结果[id].成败, 文本: s.结果[id].文本, 掷, 交付: 件, 可走: 可走(id), 导航: 节点导航(id) };
};
/** 走一步（导航；④行动与导航分开 ✓）：目标**必须**在静态 `边表` 里 ✓ ⇒ ✗ 越权跳点。 */
const 走 = (方向或目标) => {
	const s = 读档();
	if (!s || s.态 !== 态.进行中) return 拒('SEVEN_NOT_STARTED', '七名河教程未在进行中');
	const id = s.当前, node = C.节点表[id];
	const 目标 = 节点导航(id).find((n) => n.direction === 方向或目标 || n.to === 方向或目标);
	if (!目标) return 拒('SEVEN_BAD_DIRECTION', `${id} 没有通往「${方向或目标}」的路`);
	if (!可走(id).includes(目标.to)) return 拒('SEVEN_BAD_EDGE', `静态边表里 ${id} → ${目标.to} 不存在`);
	s.当前 = 目标.to;
	return { ok: true, 当前: s.当前, 导航: 节点导航(s.当前), 是否出口: s.当前 === C.出口, 可走: 可走(s.当前) };
};
/** 用掉本次**探索实例**的传送机会（②）：E0 入场不消费 ✓；提前回城与 E9 **共用**同一次 ✓。 */
const 用机会 = () => {
	const s = 读档();
	if (!s || s.态 !== 态.进行中) return 拒('SEVEN_NOT_STARTED', '七名河教程未在进行中');
	if (s.机会.用) return 拒('SEVEN_TELEPORT_USED', '本次探索的传送机会已用掉');
	s.机会.用 = true;
	return { ok: true, 实例: s.机会.实例, 当前: s.当前 };
};
/** 完成（**只有**在出口 E9 确认回城后才成立 ✓；提前回城 ✗ 不算完成 —— 见口径③⑤）。 */
const 完成 = () => {
	const s = 读档();
	if (!s || s.态 !== 态.进行中) return 拒('SEVEN_NOT_STARTED', '七名河教程未在进行中');
	if (s.当前 !== C.出口) return 拒('SEVEN_NOT_EXIT', `只有在 ${C.出口} 才能完成（当前 ${s.当前}）`);
	if (!s.机会.用) return 拒('SEVEN_TELEPORT_UNUSED', '须先确认使用本层的一次传送机会');
	s.态 = 态.完成;
	return { ok: true, 态: s.态, 路径: [...s.路径], 已处理: 已处理(s) };
};
/** 死亡（⑤）：★**刻意的零写** —— 保留「进行中（未完成）」✓ ✗ 不写完成、✗ 不写成没来过。 */
const 死 = () => {
	const s = 读档();
	if (!s || s.态 !== 态.进行中) return 拒('SEVEN_NOT_STARTED', '七名河教程未在进行中');
	return { ok: true, 态: s.态, 未完成: true, 当前: s.当前 };
};

/* ── 只读面（给 UI／判据；★零写 ✓）────────────────────────────── */
const 读 = () => {
	const s = 读档(), id = s?.当前 ?? C.入口, node = C.节点表[id];
	return {
		已开始: !!s && s.态 !== 态.未开始, 态: s?.态 ?? 态.未开始,
		当前: id, 节点: node ?? null, 已处理: 已处理(s), 路径: s?.路径 ?? [],
		可走: node ? 可走(id) : [], 导航: node ? 节点导航(id) : [], 机会: s?.机会 ?? { 用: false, 实例: null },
		/* ★`books#401` 3b：读面**增带** `结果`（只读 ✓ ✗ 不新建键）—— 覆盖层要按**真结果**区分语义
		 *   （裁六 `6021566672` §二.1：已处理≠胜利；失败／谢绝／成功脱离按真结果区分 ✓）。 */
		结果: s?.结果 ?? {},
		入口: C.入口, 出口: C.出口, 定点: C.定点表, 主干: C.主干,
	};
};

/* ── 挂出 ＋ 域登记（②）────────────────────────────────────────── */
BS.七名河 = {
	域键, 态, 高歌猛进, 入口: C.入口, 出口: C.出口, 主干: C.主干, 边表: C.边表, 定点表: C.定点表, 节点表: C.节点表,
	读档, 已处理, 可走, 节点导航, 门向补充, 属性修正, 掷检定,
	读, 开始, 选行动, 走, 用机会, 完成, 死,
	/* ★片 2（`books#397`）：**唯一交付口**外放 —— 设计明文「战斗铜矿交付**复用同一交付口**」
	 *   ⇒ 战斗侧（`01-seven-names-battle.js`）经此复用，✗ 各自再写一份 `R.give` ＋ 账目。 */
	交付, 收回,
};
R.save.declareDomain(域键, 'byPack');
