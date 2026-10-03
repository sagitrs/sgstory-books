/* 巴别之井 · 试玩版 —— **战斗面**（`books#188` P1-2 敌面板 ／ P1-4 治疗读数）
 *
 * 两个面板，一条数据源：
 *   `enemy` —— 敌组每单位一行：**体力档位**（>2/3 健壮｜1/3–2/3 负伤｜<1/3 濒死）、**有效 AC**、**已见动作**；
 *   `heal`  —— 背包里的治疗件逐件一行：**预计恢复**、**剩余次数**（＝「治疗入口」的读数面，玩家不必翻背包）。
 *
 * 数据从哪里来（✗ 面板自己算）：
 *   · 敌组的当前态 —— 从 `battle:turnEnd` 的 payload 取 `battle`（引擎每回合成对发；payload 冻结）；
 *   · 有效 AC —— **读 `DND3.acOf(c)`**（＝基础 `stats.ac` ＋ 全部已装备件 `ac_bonus`）。✗ 面板自算：
 *     算 AC 的地方只该有一处，否则将来加一件带 `ac_bonus` 的装备就会出现两套数；
 *   · 已见动作 —— `item:used` 的 `actor`（该敌人）＋ `name`（它用的那一手）。**口径＝本场真出过手的动作**，
 *     去重、保首次次序；跨场持久（`babelKnowledge` 域）是批 D 的事，本笔不做；
 *   · 治疗读数 —— 件自己的 `stats.hp`（治疗量）＋ 施用者加成 `stats.heal_bonus`（与 `used()` 同式）、
 *     以及 `charges`（剩余次数）。
 *
 * ⚠ **战斗实例不进档**：P0 明令战斗中不许存档；本档的状态也是**模块内**的（换场即重来），
 *   与引擎侧 `RPG.repeat` 的「意图活在实例上」同旨。
 * ⚠ `battle:end` 的 payload **不带战斗实例**（只有 `players`／`enemies`）⇒ 收到即清空面板。
 * ⚠ 本档在 `ui/panels.js` **之前**装载（`ui/` 内按档名排序）⇒ 只用 `RPG.*` 与 `R.registerPanel`，
 *   ✗ 不引用 `panels.js` 里的 `R`／`D` 局部形。
 */

const R = setup.RPG;
const D = setup.DND3;

/** 本场战斗 ＋ 已见动作（键＝单位对象；`Map` ⇒ 战斗结束即随实例一起被丢）。 */
let 当前战斗 = null;
const 已见 = new Map();

const 是敌方 = (u) => Array.isArray(当前战斗?.enemies) && 当前战斗.enemies.includes(u);

/** 体力档位（`books#188` P1-2 的三档）。已出局者先说结论 —— ✗ 再报一个「濒死 0/6」。 */
const 档位 = (c) => {
	if (c?.isDown) return R.isKnockedOut?.(c) ? '已打晕' : '已倒下';
	const 满 = Number(c?.maxHp ?? 0);
	const 现 = Number(c?.hp ?? 0);
	if (!(满 > 0)) return '（无体力读数）';
	const 比 = 现 / 满;
	return 比 > 2 / 3 ? '健壮' : 比 >= 1 / 3 ? '负伤' : '濒死';
};

/** 一件对**玩家本人**的**预计恢复** ＝ **引擎的实回**（`DND3.healDelta(item, from, target)`）。
 *
 *  ★`books#200` P0（操作者试玩 15:07）：本行原先是「件 `stats.hp` ＋ 施用者 `heal_bonus`」的**自算式**
 *    （注释写「与 `used()` 同式」）—— 同一个量两份实现，满血／近满血处一漂就是**两条读数说两样**。
 *  ★★**为何是 `healDelta`（实回）而不是 `healAmount`（名义量）**（`dev-10`／`tester-3` 的两条 RC 同指）：
 *    `healAmount` **夹不了 `maxHp`**（它的签名里没有靶）⇒ 满血时它会印一个**拿不到的数**（面板 8／引擎 0）。
 *    实回＝名义量夹到 `maxHp` 之后**还剩多少**（满血 ⇒ 0，差 1 点满 ⇒ 1）—— 这正是 `verify.mjs` ⑤′
 *    自己写明的规则（「面板的『预计恢复』須等于引擎**真治一次的实际回血量**」）。
 *  ⚠ **夹取由引擎做**（✗ 故事侧再写一遍 `Math.min` —— 那又是一份实现，正是本票的病因）。
 *  ⚠ 接口缺席 ⇒ 显式标 `？`（✗ 静默 0 —— 那与「这一点都回不了」同形，正是本票要消灭的假读数）。 */
const 预计恢复 = (item) =>
	(typeof D.healDelta === 'function' ? D.healDelta(item, D.Player, D.Player) : '？');

/** 治疗件 = 引擎动作目录里归入 `heal` 的那一类（✗ 面板自己判 `battleUse` —— 两处各判一份会漂）。 */
const 是治疗件 = (item) => R.battleActions?.classOf?.(item) === 'heal';

const 敌面板 = () => {
	const 们 = 当前战斗?.enemies ?? [];
	return 们.map((c) => {
		const 见过 = 已见.get(c) ?? [];
		return `<div class="enemy-line"><span class="enemy-name">${c.name}</span>`
			+ ` ${档位(c)}（${c.hp ?? '?'}/${c.maxHp ?? '?'}）`
			+ `｜AC ${D.acOf(c)}`
			+ `｜已见：${见过.length ? 见过.join('、') : '（还没出手）'}</div>`;
	}).join('');
};

const 治疗面板 = () => {
	/* 只在**战斗中**给读数（`books#188` P1-4 的「战斗内治疗入口」；探索时背包面板已经列得够）。 */
	if (!当前战斗) return '';
	const 行 = [];
	for (const slot of D.Player?.items ?? []) {
		const item = R.reviveItem(slot);
		if (!是治疗件(item)) continue;
		const 余 = item.charges ?? '—';
		行.push(`<span class="heal-item">${item.name} 恢复 ${预计恢复(item)}（余 ${余} 次）</span>`);
	}
	return 行.length ? 行.join('｜') : '';
};

R.registerPanel('enemy', { name: '敌人', host: '[data-panel="enemy"]', render: 敌面板 });
R.registerPanel('heal', { name: '治疗', host: '[data-panel="heal"]', render: 治疗面板 });

/* 战斗实例的两个来源：回合结束（有实例）与战斗结束（只清空）。两处都**自己刷一次**面板 ——
 * ✗ 指望别处（`story/hooks.js` 也订阅了 `battle:turnEnd`），否则注册顺序一变读数就停在旧场。 */
R.events.on('battle:turnEnd', (e) => {
	const b = e?.battle ?? null;
	if (b && b !== 当前战斗) 已见.clear();   // 换场 ⇒ 已见重来（✗ 把上一场的爪击带过来）
	if (b) 当前战斗 = b;
	R.refreshPanels?.();
});
R.events.on('battle:end', () => {
	当前战斗 = null;
	已见.clear();
	R.refreshPanels?.();
});
R.events.on('item:used', (e) => {
	if (!是敌方(e?.actor)) return;
	const 集 = 已见.get(e.actor) ?? [];
	if (!集.includes(e.name)) 集.push(e.name);
	已见.set(e.actor, 集);
});
