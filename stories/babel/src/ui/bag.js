/* 巴别之井 · 试玩版 —— 「打开背包」视图（`books#280` ⑧ · 0.0.3 UI 线 · A2/panels 族）
 *
 * 形（票面）：入口**常驻**（页脚一条，与 B4 通知面同族）；列出**全部**道具＋**详细效果**；每件**就地使用**。
 *
 * ★「详细效果」的唯一权威源＝**道具定义**（`RPG.createItem(id)` 的 `desc` ＋ `stats`／`slot`／`charges`）
 *   —— ✗ 不在这份视图里再抄一遍数值：抄的那份会随定义演化而漂
 *     （同族事故：`#135` ②b —— 判据层按**定义**取数才没错，按**背包条目**取就恒 undefined）。
 * ★「就地使用」走**引擎同一条路**：`RPG.itemLink()`（点击 ⇒ `RPG.itemClick` ⇒ `useItem(id, who, who, 'use')`）
 *   —— ✗ 不在这里手搓效果（第二份实现会随道具面演化而漂）。
 * ★**战中**：本视图仍**列出**（看是安全的），但**不给**回合契约之外的可点使用入口 —— 与 ③a 同一处裁定
 *   （页脚面点一下用掉一件药、却不占回合 ⇒ 同一件事两条规矩）；改印白话**指向战斗面板**（那条路占本回合）。
 *   ⚠ 判据在 `verify.mjs` 的「第 54 格」（列出齐全／描述与定义同源／使用真生效／战中入口只读／空背包正控）。
 */

const RB = setup.RPG;

/** 效果行的**标签表**：只列**机械面**（数值块），说明文字走定义自己的 `desc`。
 *  ⚠ 加新键时**只加在这一处**：视图 🆚 判据读的是同一张表（判据逐项比对定义 ⇒ 硬编码副本会当场红）。 */
const 效果标签 = Object.freeze({
	hp: '治疗', dmg: '伤害', type: '伤害类型', atkBonus: '命中加成',
	ac: '护甲', ammo: '弹药', heal_bonus: '治疗加成',
});

/** 转义（本视图自己拼 HTML；引擎的 `itemLink` 内部已转义，这里管余下的名字／说明／数值）。 */
const 转义 = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => (
	{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 背包条目 —— 与 `RPG.inventoryLinks()`／`RPG.inventoryLabel()` **同一取数口**：
 *  `State.variables.inventory`（条目） × `RPG.reviveItem`（快照→实例，取定义面）。 */
RB.bagSlots = () => (State?.variables?.inventory ?? []).map((s) => {
	const item = RB.reviveItem(s);
	return { id: item.id, name: item.name, item, equipped: item.equipped === true };
});

/** 机械面逐项（**从定义读**，✗ 抄）。返回 `标签：值` 的数组；没有机械面的道具返回空数组。 */
RB.bagEffects = (item) => {
	const 行 = [];
	for (const [k, 名] of Object.entries(效果标签)) {
		const v = item?.stats?.[k];
		if (v == null) continue;
		行.push(`${名}：${typeof v === 'object' ? (v.id ?? JSON.stringify(v)) : v}`);
	}
	if (item?.slot) 行.push(`装备槽：${RB.slotLabels?.[item.slot] ?? item.slot}`);
	if (item?.charges != null && item.charges > 1) 行.push(`剩余次数：${item.charges}`);
	return 行;
};

/** 视图正文（面板内容；twee 只留骨架 —— 同 `notice` 面的口径）。
 *  ⚠ 拆分点：**逐件一行**的渲染单独成 `bagItemHTML(entry)`（纯函数，只吃条目与定义面）——
 *    这样判据可以拿一颗**哨兵实例**过它，断「文本确实来自定义」而不是「与定义碰巧同字」。 */
RB.bagItemHTML = (e) => {
	/* 名字与 `RPG.inventoryLinks()` 逐字同形：同一个 `itemCountSuffix`（`#1862` ②的口径）。 */
	const 名 = (e.name ?? e.item?.name ?? e.id) + RB.itemCountSuffix(e.item);
	const 左 = setup.BABEL?.战中 === true
		? `<span class="rpg-bag-name">${转义(名)}</span>`
		: RB.itemLink(e.id, { label: 名 });
	const 效果 = RB.bagEffects(e.item);
	/* ⚠ 行标记用 `data-bag-item`（✗ `data-item`）：引擎的点击绑定认 `.rpg-item-link`，而 `data-item`
	 *   是**可点件**的属性名 —— 混用会让「战中还有没有可点件」这类判据读错面（本席首跑实测：那一格红在 <li> 上）。 */
	return `<li data-bag-item="${转义(e.id)}">${左}`
		+ `<span class="rpg-bag-equipped">${e.equipped ? '（已装备）' : ''}</span>`
		+ `<div class="rpg-bag-desc">${转义(e.item?.desc)}</div>`
		+ (效果.length > 0 ? `<div class="rpg-bag-effect">${转义(效果.join('｜'))}</div>` : '')
		+ '</li>';
};

RB.bagHTML = () => {
	const 条目 = RB.bagSlots();
	const 标题 = `背包（${条目.length} 件）`;
	const 战中 = setup.BABEL?.战中 === true;
	if (条目.length === 0) {
		return `<details class="rpg-bag"><summary>${标题}</summary>`
			+ `<div class="rpg-bag-empty">（空）</div></details>`;
	}
	const 行 = 条目.map((e) => RB.bagItemHTML(e)).join('');
	const 提示 = 战中
		? '<div class="rpg-hint">战斗中：请在战斗面板里使用道具——那会占用本回合。</div>'
		: '';
	return `<details class="rpg-bag"><summary>${标题}</summary>${提示}`
		+ `<ul class="rpg-bag-list">${行}</ul></details>`;
};

/* 面板注册：宿主 `.bagbar [data-panel="bag"]`（骨架留在 `ui/ui.twee` 的页脚）——**常驻**（每段落都在）。 */
RB.registerPanel('bag', {
	name: '背包视图',
	host: '[data-panel="bag"]',
	render: () => RB.bagHTML(),
});
