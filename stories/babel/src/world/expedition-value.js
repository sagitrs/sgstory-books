/* 巴别之井 —— 普通远征「价值参照」参数化（`books#456` D1 预备笔）
 *
 * ## 规格（SSOT，✗ 本档不复述数值）
 *   `docs/plans/babel/core/expedition-value-reference.md`（PR `#454` 合 `288f62c`）＝
 *   §1 SRD 3.5 目录锚点（gp）＋ §2 原创单效果**局部线性拟合候选**（`V_effect = a·n + c`，六族）。
 *   方向出处＝核心 04 §7.2【已定估价方向】。
 *
 * ## 本档是／不是
 *   ★**是**：上述两张表的**机器可读形**（数据）＋ 把 **V／P／R／w 分开**的**纯函数**口。
 *   ★**不是**：✗ 已平衡参数（规格文首逐字「**以下不是本作已平衡的商店、通量或收购参数**」）；
 *     ✗ 币制裁定（`gp` ↔ 旧硬币换算＝**未决 #4** ⇒ 本档**只标币种、绝不换算**）；
 *     ✗ 对既有目录价的覆盖（§7.2【已定估价方向】：「已有具体目录价优先直接使用」）。
 *
 * ## 零接线（本笔边界 · 与领队裁一致）
 *   ✗ 不接商店（`world/00-l10-city.js` 的 `cfg.buy/sell` **一字不动**）｜✗ 不接通量（`Q=b+kX` 的
 *   `b/k/Qmax` 属规格【待定】）｜✗ 不改任何既有 `stats.cost`｜✗ 不碰 0.0.3 七名河。
 *   ⇒ 本档**加了也不改变既有行为**（纯数据 ＋ 纯函数，无订阅、无动作、无落点）。
 *
 * ## 三条纪律（各有判据格守，见 `verify.mjs` 第 82 组）
 *   ① **锚点不复制**：已注册件的参考价**引用** `RPG.createItem(id).stats.cost`（引擎同源）；
 *      无 `cost` 的件进**缺口账**（✗ 补 0、✗ 外推 —— 规格 §2 末段逐字「范围外及没有锚点的效果不外推，
 *      也不默认零价通量」）。
 *   ② **范围外拒绝**：拟合只在**列明范围**内取值（越界 ⇒ 具名拒）；`n=0 ⇒ 0`（规格 §2 逐字
 *      「n=0计0」）；**普通装备不许负截距**（算出负值 ⇒ 拒，✗ 取负）。
 *   ③ **币种不混**：每个值带 `币种`；跨币种相加 ⇒ 具名拒（`V_CURRENCY_MISMATCH`）。
 *      ⚠ 缺省币种＝`gp`（依据在 `币种声明` 头注）；**非 gp 的件须逐件声明**（现只 `rain-diadem`）。
 *
 * ## 取数精度（✗ 不冻结）
 *   规格 §2 的 `c` 是 `−20000/3` 这类**有理数** ⇒ 本档存 `[分子, 分母]`、**全程有理运算**，
 *   只在**整件**末尾取整一次（精度可传参，缺省＝铜币＝2 位小数）。规格 §2 末句自陈
 *   「是否采用此结算精度仍是实现细则」⇒ 本档把它做成**参数**，✗ 当已裁。
 *
 * ## 装载序
 *   本档只 `setup.RPG`／`setup.BABEL`；**一切取件都在调用时**（`RPG.items` 的登记在各档装载期发生
 *   ⇒ 装载期读会漏件）⇒ 无装载序依赖。
 */
const R = setup.RPG;
const B = (setup.BABEL ??= {});

/* ── 一、SRD 目录锚点（规格 §1；单位 gp）─────────────────────────────────────
 *   ★这是**参照表**（供估值查），✗ 不是商店价目；已注册件的价以**引擎 `stats.cost`** 为准（纪律①）。 */
const 锚点 = Object.freeze({
	状态: '已定',
	依据: '核心 04 §7.2【已定估价方向】：以 D&D 3.5 手册装备效果/价格为锚点',
	币种: 'gp',
	单价: Object.freeze({
		匕首: 2, 短剑: 10, 长剑: 15, 巨剑: 50,
		皮甲: 10, 镶钉皮甲: 25, 链甲衫: 100,
		链甲: 150, 胸甲: 200, 半身甲: 600, 全身甲: 1500,
		重木盾: 7, 重钢盾: 20,
	}),
	加价: Object.freeze({
		精制单头武器: Object.freeze({ 形: '定额', 值: 300 }),
		精制甲盾: Object.freeze({ 形: '定额', 值: 150 }),
		魔法武器增强n: Object.freeze({ 形: '平方', 系数: 2000 }),
		魔法甲盾增强n: Object.freeze({ 形: '平方', 系数: 1000 }),
	}),
	出处: 'SRD 3.5 · olimot/srd-v3.5-md@c7f30a0ce11a579f75456746f278a4c75f67b4c1（equipment.md／magic-items-i, ii）',
});

/* ── 二、原创单效果局部线性拟合**候选**（规格 §2；单位 gp）────────────────────
 *   `a`／`c` 存 `[分子, 分母]` ⇒ 全程有理运算（纪律④：✗ 浮点累积）。`c` 为负截距**是拟合的形**，
 *   由「`n=0 ⇒ 0` ＋ 只在该族**列明范围**内取值」两条保证**普通装备取不到负值**（纪律②）。 */
const 拟合 = Object.freeze({
	状态: '作者暂定',
	依据: '规格 §2：助手提出的**候选**，「不是 SRD 价格定律」',
	币种: 'gp',
	族: Object.freeze({
		武器增强: Object.freeze({ 说明: '命中与伤害一起提高', 锚点: '2000n²',
			范围: Object.freeze([1, 2, 3]), a: Object.freeze([8000, 1]), c: Object.freeze([-20000, 3]) }),
		甲盾增强AC: Object.freeze({ 说明: '护甲/盾的 AC 增强', 锚点: '1000n²',
			范围: Object.freeze([1, 2, 3]), a: Object.freeze([4000, 1]), c: Object.freeze([-10000, 3]) }),
		偏斜或自然护甲增强: Object.freeze({ 说明: '偏斜AC 与 自然护甲增强（各为 2000n²）', 锚点: '2000n²',
			范围: Object.freeze([1, 2, 3]), a: Object.freeze([8000, 1]), c: Object.freeze([-20000, 3]) }),
		单项能力值增强: Object.freeze({ 说明: '单项 ability score', 锚点: '1000n²',
			范围: Object.freeze([2, 4, 6]), a: Object.freeze([8000, 1]), c: Object.freeze([-40000, 3]) }),
		全豁免抗力加值: Object.freeze({ 说明: 'resistance bonus to all saves', 锚点: '1000n²',
			范围: Object.freeze([1, 2, 3]), a: Object.freeze([4000, 1]), c: Object.freeze([-10000, 3]) }),
		单项技能表现加值: Object.freeze({ 说明: 'competence bonus，单项技能', 锚点: '100n²',
			范围: Object.freeze([1, 2, 3]), a: Object.freeze([400, 1]), c: Object.freeze([-1000, 3]) }),
	}),
});

/* ── 三、币种与回收的**显式声明**（✗ 默认、✗ 换算）───────────────────────────
 *   纪律③：每个值带 `币种`，跨币种相加 ⇒ 具名拒。**目录价的缺省币种＝`gp`**，依据＝规格 §1 的锚点
 *   全是金币 ＋ 引擎 `dnd3` 目录价沿 SRD 表（`items/mounts.js` 头注「Cost → stats.cost」）。
 *   ★**例外须逐件声明**（七名河 `rain-diadem`＝旧硬币 —— 规格附录明写它由本表重估）。
 *   ★**残余（本笔未覆盖，如实记）**：引擎件的 `stats` **不带包标记**（`RPG.包标记` 对道具返 `core`
 *     ⇒ 无机械信号可区分「引擎目录价」与「故事侧自造价」）⇒ 除已声明者外，**本档未逐件鉴币**；
 *     将来若非 gp 的造件增多，须在此表逐件补声明（✗ 靠缺省默坐）。 */
const 币种声明 = Object.freeze({
	'rain-diadem': '旧硬币',        // 七名河 S4 裁 P：参考价 100 旧硬币（规格附录：✗ 不由本表重估）
});
/** 回收事实（**只登记已裁者**；规格 §7.2【已定】：「不能出售不等于价值为零」⇒ R 与 V 分开）。 */
const 回收声明 = Object.freeze({
	'rain-diadem': Object.freeze({ 可售: false, 依据: 'books#398 裁 P（禁售：不进收购目录）＋规格附录（100 旧硬币不由拟合重估）' }),
});

/* ── 四、口径原语（内部；✗ 不导出取值路径）─────────────────────────────────── */
const 有注册 = (id) => R.items?.has?.(id) === true;
const 取件 = (id) => (有注册(id) ? R.createItem(id) : null);
const 取价 = (件) => (Number.isFinite(件?.stats?.cost) ? 件.stats.cost : null);
/** 件 `cost` 的币种：已声明 ⇒ 用它；否则 ⇒ 目录缺省 `gp`（依据见 `币种声明` 头注）。 */
const 件币种 = (id) => 币种声明[id] ?? 锚点.币种;
/** 取整到 `10^-位`（缺省铜币＝2 位）。★只在**整件**末尾取一次（规格 §2）。 */
const 取整 = (x, 位 = 2) => {
	const k = 10 ** 位;
	return Math.round(x * k) / k;
};

/* ── 五、纯函数口（V／P／R／w 分开；✗ 无第二真值）────────────────────────── */
/** 目录件的参考价值 V：**引用**引擎 `stats.cost`（✗ 复制数字）。 */
const V_目录件 = (id) => {
	if (typeof id !== 'string' || id === '') return { ok: false, code: 'V_BAD_ID' };
	if (!有注册(id)) return { ok: false, code: 'V_UNKNOWN_ITEM', id };
	const 值 = 取价(取件(id));
	if (值 == null) return { ok: false, code: 'V_NO_ANCHOR', id };              // ⇒ 缺口账（✗ 补 0）
	const 币种 = 件币种(id);
	return { ok: true, id, 值, 币种, 来源: '引擎 stats.cost（§7.2：既有目录价优先直接使用）' };
};

/** 单效果估值（有理运算）：`n=0 ⇒ 0`；**越界拒**；**负值拒**（普通装备不许负截距）。 */
const V_效果 = (族名, n) => {
	const 族 = 拟合.族[族名];
	if (!族) return { ok: false, code: 'V_UNKNOWN_FAMILY', 族: 族名 };
	if (!Number.isInteger(n) || n < 0) return { ok: false, code: 'V_BAD_N', n };
	if (n === 0) return { ok: true, 值: 0, 有理: [0, 1], 币种: 拟合.币种, 族: 族名 };
	if (!族.范围.includes(n)) return { ok: false, code: 'V_OUT_OF_RANGE', 族: 族名, n, 范围: [...族.范围] };
	const 分子 = 族.a[0] * n * 族.c[1] + 族.c[0] * 族.a[1];
	const 分母 = 族.a[1] * 族.c[1];
	if (分子 < 0) return { ok: false, code: 'V_NEGATIVE', 族: 族名, n, 有理: [分子, 分母] };
	return { ok: true, 值: 分子 / 分母, 有理: [分子, 分母], 币种: 拟合.币种, 族: 族名 };
};

/** 整件原创装备＝基底价 ＋ Σ 各独立效果（同源/同效果不叠加、派生收益不重复计钱 ⇒ 由**调用方**负责喂独立效果）。 */
const V_原创件 = (基底id, 效果列 = [], { 精度 = 2 } = {}) => {
	const 基 = V_目录件(基底id);
	if (!基.ok) return { ok: false, code: 'V_BASE_' + 基.code, 基底: 基底id, 原: 基 };
	let 分子 = 基.值, 分母 = 1;
	const 币种 = 基.币种;
	const 明细 = [{ 项: '基底', id: 基底id, 值: 基.值, 币种 }];
	for (const 效 of Array.isArray(效果列) ? 效果列 : []) {
		const r = V_效果(效?.族, 效?.n);
		if (!r.ok) return { ok: false, code: 'V_EFFECT_' + r.code, 效, 原: r };
		if (r.币种 !== 币种) return { ok: false, code: 'V_CURRENCY_MISMATCH', 基底: 币种, 效: r.币种 };
		const [en, ed] = r.有理;
		分子 = 分子 * ed + en * 分母;
		分母 = 分母 * ed;
		明细.push({ 项: '效果', 族: 效.族, n: 效.n, 值: r.值, 币种: r.币种 });
	}
	return { ok: true, 值: 取整(分子 / 分母, 精度), 有理: [分子, 分母], 币种, 明细, 精度 };
};

/** 四口分开：V（参考价值）／P（买价）／R（回收资格与价格）／w（重量）。
 *  ★P／R **未裁** ⇒ 返 `{未定:true}`（✗ 返 0 —— 「未定」与「零」必须不同形）；R 可「不可售 ∧ V>0」。 */
const 四口 = (id) => {
	const v = V_目录件(id);
	const 件 = 取件(id);
	return Object.freeze({
		V: v.ok ? Object.freeze({ 值: v.值, 币种: v.币种 }) : Object.freeze({ 未定: true, code: v.code }),
		P: Object.freeze({ 未定: true, 因: '买价未冻（规格 §7.1【作者暂定】）' }),
		R: 回收声明[id] ?? Object.freeze({ 未定: true, 因: '回收资格与价格未裁（规格 §7.1）' }),
		w: Number.isFinite(件?.stats?.weight) ? 件.stats.weight : null,
	});
};

/** 缺口账：**有注册、无 `cost`** 的件（✗ 补 0、✗ 外推）。★现算（注册表为准，✗ 手维护清单）。 */
const 缺口 = () => [...(R.items?.keys?.() ?? [])].filter((id) => 取价(取件(id)) == null).sort();
/** 币种声明账：**已点名的非缺省币种**（✗ 只读声明本身 ⇒ 可审「例外集到底有几个」）。 */
const 币种声明账 = () => Object.keys(币种声明).sort().map((id) => ({ id, 币种: 币种声明[id] }));

B.价值参照 = Object.freeze({
	版本: 'docs/plans/babel/core/expedition-value-reference.md（PR #454 合 288f62c）',
	币种缺省: 'gp',
	币种缺省依据: '规格 §1 的锚点全为金币 ＋ 引擎 dnd3 目录价沿 SRD 表（items/mounts.js 头注：Cost → stats.cost）；非 gp 件须逐件声明（现只 rain-diadem）',
	非已平衡: true,                        // 规格文首逐字自陈 ⇒ 消费方**不得**当已批平衡
	零接线: true,                          // ✗ 商店／✗ 通量／✗ 改既有价（领队裁 a）
	锚点, 拟合, 币种声明, 回收声明,
	V_目录件, V_效果, V_原创件, 四口, 缺口, 币种声明账, 取整,
});
