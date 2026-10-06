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
 * **一次返程事务**（`#443` 改造）：★**域面走引擎提交边界** `RPG.commitBoundary` ✓，✗ 我自建回滚。
 *
 * ## 为什么改（`#442` 的评审 N1 提出，我认）
 * `src/core/33-commit.js`（E2 `sgstory#2025` · 设计 §4「返程的一致提交」）档头：设计把「可靠提交边界」
 * 列为**引擎职责** ✓ ⇒ 复用它，✗ 手搓「快照⇒计划⇒一次应用⇒try/catch 回滚」✓。
 *
 * ## 职责怎么分（★两处如实声明 ✗ 不含糊）
 *   · **域面**（可序列化活块＝`State.variables['sevenNames']` ✓）⇒ 走 `preview`／`commit` ✓ ⇒ 得
 *     **近窗去重**（`COMMIT_ALREADY_SETTLED` ＋ 零副作用 ✓）／**前像二次确认**（`COMMIT_STALE` ✓）／
 *     **记账写后回读**（`COMMIT_LEDGER_FAILED` ⇒ 回滚 ✓）。
 *   · **物品面 ✗ 不在该边界内**（物品是**类实例数组** ✗ 过不了 `规整`；且边界要求「与 `preview` 同一块
 *     **活事实**」，传副本会得到「交易静默没发生」✗）⇒ 走**引擎自己的口**：★按**实体**用
 *     `RPG.splitStack(bag, entityId, n)`（`30-inventory.js:179` ✓「批次按身份切分」· E1 `sgstory#2023` ✓）
 *     ＋ `RPG.slotUnequip` ✓，✗ 不再直接 `splice`；它在 `publish` 里跑 ⇒ **✗ 与域面不同原子** ✓（如实声明 ✓）。
 *   · **长程幂等仍故事自持** ✓：引擎边界注**自己写明**「去重是**窗口** ✗ 绝对：账有界（默认 200，超限丢最旧）
 *     ⇒ 只有**最近** `上限` 笔请求受保护；更早的请求号被重放 ⇒ **会再执行一次**」✓ ⇒ `域.返程已结 = 实例`
 *     **留着承重** ✓（✗ 不退成读面缓存 ✓）。
 *
 * @param {{实例?: string|null, 演出?: ((栏:object)=>void)|null}} o
 * @returns {{ok:true, 栏:object, 实例:string, 边界:string} | {ok:false, code:string, why:string}}
 */
const 返程事务 = ({ 实例 = null, 演出 = null } = {}) => {
	const s = 读档();
	if (!s) return { ok: false, code: 'SEVEN_NOT_STARTED', why: '七名河教程未在进行中' };
	const 本次 = 实例 ?? s.机会?.实例 ?? null;
	if (!本次) return { ok: false, code: 'RETURN_NO_INSTANCE', why: '本次返程没有实例号 ⇒ ✗ 无法幂等' };
	/* ★长程幂等（故事自持键 ✓）；与引擎**近窗**去重并存 ✓（边界见上 ✓）。 */
	if (s.返程已结 === 本次) return { ok: false, code: 'RETURN_ALREADY_SETTLED', why: `本次返程（${本次}）已结算（✗ 再损毁）` };
	const 边 = R.commitBoundary;
	if (typeof 边?.preview !== 'function' || typeof 边?.commit !== 'function') {
		return { ok: false, code: 'RETURN_NO_ENGINE', why: '引擎缺 `RPG.commitBoundary`（本笔声明 pin 起应有）' };
	}

	/* 计划：分类只看**传送前**状态 ✓；按**实体** ✓（✗ 按同款 id ✓）。 */
	const 前 = 快照();
	const 栏 = 分类(前);
	const 消失集 = new Set((栏.消失 ?? []).map((x) => x.entityId).filter((x) => x != null));

	/* ── 域面：引擎提交边界（票据纯数据 ✓；`apply` 只在草稿上跑 ✓ 活事实零接触 ✓）── */
	const 预览 = 边.preview({
		request: `sevenNames:返程:${本次}`,
		facts: s,
		apply: (草稿) => {
			草稿.机会 = Object.assign({}, 草稿.机会 ?? {}, { 用: true, 实例: 本次 });
			草稿.态 = '完成';
			草稿.返程已结 = 本次;
			草稿.返程结果 = { 实例: 本次, 栏: { 消失: 栏.消失, 新增: 栏.新增, 稳定: 栏.稳定 } };
		},
	});
	if (预览.status !== 'previewed') {
		return { ok: false, code: 预览.code ?? 'RETURN_PREVIEW_REJECTED', why: `预览未通过（${预览.status}）` };
	}

	/* ── 物品面（`publish` 内 ✓ 按实体幂等 ⇒ 重入不二损毁 ✓）＋ 演出 ── */
	const 物品面 = () => {
		const 背 = D.Player?.items;
		if (!Array.isArray(背)) return;
		for (const 件 of [...背]) {
			if (!消失集.has(件?.entityId)) continue;
			let 目标 = 件;
			try {
				const n = Number(件.charges ?? 1);
				if (typeof R.splitStack === 'function' && n > 1) 目标 = R.splitStack(背, 件.entityId, n) ?? 件;
			} catch { 目标 = 件; }
			if (目标 && 目标.equipped && typeof R.slotUnequip === 'function') R.slotUnequip.call(目标);
			const 位 = 背.findIndex((x) => x && x.entityId === (目标?.entityId ?? 件.entityId));
			if (位 >= 0) 背.splice(位, 1);
		}
		for (const 件 of 背) {
			if (排除id.includes(件.id)) continue;
			件.state = Object.assign({}, 件.state ?? {}, { [脆弱键]: true });
		}
	};

	const 结算 = 边.commit(预览.ticket, {
		facts: s,
		publish: () => { 物品面(); if (typeof 演出 === 'function') 演出(栏); },
	});
	if (结算.status === 'settled' && 结算.reused) return { ok: false, code: 'RETURN_ALREADY_SETTLED', why: '引擎账上该请求已提交（近窗去重 ✓）' };
	if (结算.status !== 'applied') return { ok: false, code: 结算.code ?? 'RETURN_COMMIT_REJECTED', why: `提交未成（${结算.status}）` };
	return { ok: true, 栏, 实例: 本次, 边界: 'commitBoundary' };
};

/** ★旧卷轴返程：**冻结例外**的**具名口**（`#443` N2 ✓）。
 *  裁文（`writer-2` 四裁 `6018346663` 第 3 项）**不批准**「付费旧卷轴也执行脆弱结算」⇒ 例外**已冻结** ✓。
 *  此口的意义＝**显式可审** ✗ 不靠「挂在别处没写」✓：返回**具名 code**，判据据它断 ✓。 */
const 旧卷轴返程 = () => ({ ok: true, code: 'RETURN_SCROLL_EXEMPT', 未损毁: true,
	why: '旧卷轴例外已冻结（✗ 执行脆弱损毁 ✓），按同一实现出具名回执' });

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

BS.返程结算 = { 域键, 脆弱键, 排除id, 适用件, 是脆弱, 快照, 分类, 返程事务, 旧卷轴返程, 读返程, 演出,
	演出句 };
