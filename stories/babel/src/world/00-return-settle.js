/* 00-return-settle.js —— W09「七名河」**返程结算**（`books#397` · S3 **片 3a**）
 *
 * 设计源：`README.md@56829d8c` §6「一次传送与脆弱结算」✓；口径＝**`writer-2` 四裁 `6018346663`**（含对草案的纠正 ✓）。
 *
 * ## 四裁（✗ 不越）
 *   ①**货币排除**：本故事 `coin` 按**货币用途**排除 ⇒ ✗ 进本算法 ✓（它是真物品，但用途是支付/买卖结算 ✓）；
 *   ②**v1 无稳定来源**：随行物**一律无豁免** ⇒ 第三栏恒「无」✓（★但**保留该栏** ✓）；
 *   ③**挂故事侧统一返程事务**：✗ 不给全局 `moveTo` 加故事钩子 ✓；
 *   ④**3a／3b 分笔**：本档只做 3a ✓（3b＝正式单图，另笔 ✓）。
 *
 * ## 裁文的三条**实现级纠正**（本档照落 ✓）
 *   1. ★**「一处函数＋顺序调用 ≠ 可靠提交」**：原 E9 出口依次 `用机会()`→`完成()`→地图移动 ✗
 *      ⇒ 本档做成**真事务**：快照 ⇒ 计划 ⇒ **一次应用** ⇒ 出错**回滚**（任意失败 ⇒ 存档面零变化 ✓）。
 *   2. ★**「提交拒绝必须真挡住移动」**：本 pin 的 `MapScene` 判 `exit.action() !== false`（`60-map.js:377` ✓）
 *      ⇒ 故事侧出口的 `action` **必须返回 `false`** 才挡得住 ✓（✗ 返回 `{ok:false}` 不挡）。
 *   3. ★**幂等标识归「一次返程执行 ＋ 其探索实例」** ✓（✗ 不是教程永久「已返程」✓）
 *      ⇒ 落 `域.返程已结 = 实例`（实例＝片 1 的 `机会.实例` ✓）。
 *
 * ## 三栏（裁 §三）：以**传送前状态**分类 ✓
 *   ①原已脆弱 ∧ 无豁免 ⇒ **消失**（记名称／`entityId`／数量 ✓）｜②原未脆弱 ∧ 无豁免 ⇒ **新增脆弱**
 *   （本次**不立即消失** ✓ —— 分类只看快照 ✓）｜③合规稳定 ⇒ 不变（v1 恒空 ⇒ 显示「无」✓）。
 *   ★**按具体实体/批次与真实数量**处理（✗ 按同款 id 误删另一件 ✓）；同状态堆叠／不同状态分栈由引擎
 *   `itemStateKey` 免费得到（`state` 变 ⇒ 键变 ⇒ ✗ 并槽 ✓）。
 *
 * ⚠ 读路径**零写** ✓（只有 `返程事务` 写 ✓）。
 */
const R = setup.RPG, D = setup.DND3;
const BS = (setup.BABEL ??= {});
const 域键 = 'sevenNames';
/** 脆弱标记（`state` 里的布尔位；★本仓**首个** `state` 消费者 ⇒ 在此具名 ✓）。 */
const 脆弱键 = '脆弱';
/** ✗ 进入本算法的物品 id（裁①：货币按用途排除）。 */
const 排除id = Object.freeze(['coin']);

/** 适用件＝背包（含手／装备／随身容器内）✓；排除：寄存（`babelL10Storage` ✗ 不同行 ✓）＋裁①排除的 id ✓。 */
const 适用件 = () => (D.Player?.items ?? []).filter((s) => s && typeof s.id === 'string' && !排除id.includes(s.id));
/** 是否已脆弱（快照与实例同形 ✓）。 */
const 是脆弱 = (件) => 件?.state?.[脆弱键] === true;
/** 件名（人读 ✓；✗ 不吞错 ⇒ 查不到就报 id ✓）。 */
const 件名 = (件) => { try { return R.createItem(件.id).name; } catch { return 件.id; } };

/** 域读（✗ 不建键 ✓）／域写（唯一建键处 ✓）。 */
const 读档 = () => State.variables[域键];
const 建档 = () => (State.variables[域键] ??= { 态: '未开始', 当前: 'E0', 结果: {}, 机会: { 用: false, 实例: null }, 路径: [] });

/** 快照（**传送前**状态 ✓；✗ 深拷实例本体 —— 只留判定与展示所需的键 ✓）。 */
const 快照 = () => 适用件().map((s) => ({
	entityId: s.entityId ?? null, id: s.id, 名: 件名(s),
	数量: Number(s.charges ?? 1), 已装备: !!s.equipped, state: s.state == null ? null : JSON.parse(JSON.stringify(s.state)),
}));

/** 分类（**只看快照** ✓ ⇒ 「同次新附加脆弱不得立刻消失」自然成立 ✓）。 */
const 分类 = (前) => ({
	消失: 前.filter(是脆弱),
	新增: 前.filter((x) => !是脆弱(x)),
	稳定: [],                                   // v1 无稳定来源 ⇒ 恒空（★仍保栏 ✓ 裁②）
});

/**
 * **一次返程事务**：结算 ＋ 用机会 ＋ 完成 ＋ 落幂等标记 —— **同一笔** ✓。
 * @param {{损毁?: boolean, 实例?: string|null, 提交?: (() => void)|null}} o
 *   `损毁=false` 供**旧卷轴**那条路（裁文：旧卷轴例外**已冻结** ⇒ ✗ 不执行脆弱损毁 ✓）；
 *   `提交` ＝调用方**本笔专属**的落账（E9：用机会 ＋ 完成 ✓）⇒ ★它**在事务内**跑 ⇒
 *   失败与结算**一起回滚** ✓（这正是裁文纠正①「一处函数＋顺序调用 ≠ 可靠提交」的修法 ✓）。
 * @returns {{ok:true, 栏:object, 实例:string|null} | {ok:false, code:string, why:string}}
 */
const 返程事务 = ({ 损毁 = true, 实例 = null, 提交 = null } = {}) => {
	const s = 读档();
	if (!s) return { ok: false, code: 'SEVEN_NOT_STARTED', why: '七名河教程未在进行中' };
	const 本次 = 实例 ?? s.机会?.实例 ?? null;
	/* ★旧卷轴例外（裁文：**已冻结** ⇒ ✗ 损毁 ✓）：**先**于幂等检查 ⇒ 它与本结算**无关** ✓，
	 *   仍走同一实现以求**一眼可审** ✓（✗ 靠「这里没写」隐式豁免 ✓）。✗ 不碰任何物品 ✓，也 ✗ 落标记 ✓。 */
	if (!损毁) {
		if (typeof 提交 === 'function') 提交();
		return { ok: true, 栏: { 消失: [], 新增: [], 稳定: [] }, 实例: 本次, 未损毁: true };
	}
	/* ★裁③：幂等**按实例** ⇒ 同一次返程的重复回调/重绘/恢复 ⇒ 零变化 ＋ 具名拒 ✓。 */
	if (本次 && s.返程已结 === 本次) {
		return { ok: false, code: 'RETURN_ALREADY_SETTLED', why: `本次返程（${本次}）已结算（✗ 再损毁）` };
	}

	/* ── 计划（✗ 先不写）────────────────────────────────────────── */
	const 前 = 快照();
	const 栏 = 分类(前);
	/* ★裁§三：**按实体**处理 ⇒ 用 entityId 定位（✗ 按 id 误删另一件 ✓）。 */
	const 消失集 = new Set(栏.消失.map((x) => x.entityId).filter((x) => x != null));
	const 需要消失 = (件) => 消失集.has(件.entityId);

	/* ── 应用（一次；出错**回滚**）──────────────────────────────── */
	const 备份 = JSON.parse(JSON.stringify(State.variables[域键]));
	const 背件 = (D.Player.items ?? []).map((x) => JSON.parse(JSON.stringify(x.toJSON ? x.toJSON() : x)));
	try {
		/* ① 消失：先**清装备引用**（裁 §三.4 ✓），再从背包里按**实体**移除 ✓。 */
		for (const 件 of [...(D.Player.items ?? [])]) {
			if (!需要消失(件)) continue;
			if (件.equipped && typeof R.slotUnequip === 'function') R.slotUnequip.call(件);
			const 位 = D.Player.items.indexOf(件);
			if (位 >= 0) D.Player.items.splice(位, 1);
		}
		/* ② 新增脆弱：保留 `entityId`／数量／`charges`／其他 `state` ✓（只加一位 ✓）。 */
		for (const 件 of (D.Player.items ?? [])) {
			if (排除id.includes(件.id)) continue;
			件.state = Object.assign({}, 件.state ?? {}, { [脆弱键]: true });
		}
		/* ③ 调用方本笔的落账（E9：用机会 ＋ 完成 ✓）—— ★同在事务内 ⇒ 失败一起回滚 ✓。 */
		if (typeof 提交 === 'function') 提交();
		/* ④ 落幂等标记（★按实例 ✓）。 */
		建档().返程已结 = 本次;
	} catch (e) {
		/* ★真事务：任意失败 ⇒ **存档面零变化** ✓（✗ 半途而废 ✓）。 */
		if (D.Player?.items) D.Player.items = 背件.map((x) => R.reviveItem(x));
		State.variables[域键] = 备份;
		return { ok: false, code: 'RETURN_SETTLE_FAILED', why: `返程结算失败，已回滚（${e?.message ?? e}）` };
	}
	return { ok: true, 栏, 实例: 本次 };
};

/** ★设计原句（裁 §三：**保留**）：传送结算的演出首句 ✓。 */
const 演出句 = '跨越位面的波动使你以外的存在变得模糊，只有强大的存在才能在传送中保持自我。';

/** ★演出文案（裁 §三）：**原句** ＋ 三栏「名称×数量」（空栏写「无」✓）＋ 寄存未受影响说明 ✓。 */
const 演出 = (栏) => {
	const 列 = (名, 条) => `【${名}】` + ((条 ?? []).length ? 条.map((x) => `${x.名}×${x.数量}`).join('、') : '无');
	return [
		演出句,
		列('获得脆弱的', 栏?.新增), 列('原已脆弱而消失的', 栏?.消失), 列('保持稳定的', 栏?.稳定),
		'（未同行的寄存物不受影响。）',
	].join('\n');
};

/** 只读面（给面板／判据；✗ 不写 ✓）：三栏 + 本次实例 + 是否已结。 */
const 读返程 = () => {
	const s = 读档();
	const 前 = 快照();
	return { 栏: 分类(前), 实例: s?.机会?.实例 ?? null, 已结: s?.返程已结 ?? null, 适用件: 前 };
};

BS.返程结算 = { 域键, 脆弱键, 排除id, 适用件, 是脆弱, 快照, 分类, 返程事务, 读返程, 演出,
	演出句 };
