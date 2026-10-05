/* 巴别之井 · 试玩版 —— 「打开背包」视图（`books#280` ⑧ · 后续版本 UI 线 · A2/panels 族）
 *
 * 形（票面）：入口**常驻**（页脚一条，与 B4 通知面同族）；列出**全部**道具＋**详细效果**；每件**就地使用**。
 *
 * ★「详细效果」的唯一权威源＝**道具定义**（`RPG.createItem(id)` 的 `desc` ＋ `stats`／`slot`／`charges`）
 *   —— ✗ 不在这份视图里再抄一遍数值：抄的那份会随定义演化而漂
 *     （同族事故：`#135` ②b —— 判据层按**定义**取数才没错，按**背包条目**取就恒 undefined）。
 * ★「就地使用」走**引擎同一条路**：`RPG.itemLink()`（点击 ⇒ `RPG.itemClick` ⇒ `useItem(id, who, who, 'use')`）
 *   —— ✗ 不在这里手搓效果（第二份实现会随道具面演化而漂）。
 * ★**战中**（`sgstory#2003` ／ `sgstory#2005` 落地后）：本视图的可点件**走战斗循环那条路** ——
 *   点一下＝`RPG.submitBattleAction({item})` 提交**本回合的行动**（回合真耗，与战斗选单同一条账），
 *   ✗ 不是 ③a 治的那种「页脚面点一下用掉一件药、却不占回合」的第二条路（那条是被禁的）。
 *   ⚠ **能力门**：引擎还没有 `submitBattleAction`（＝当前 pin）时，战中仍按老口径 —— 只列不可点 ＋ 白话
 *     指向战斗面板（✗ 不假装已做）。抬 pin 后**自动**变成可点件（判据里那条由「待判」转真判）。
 *   ⚠ 判据在 `verify.mjs` 的「第 54 格」（列出齐全／描述与定义同源／使用真生效／战中的两个口径／空背包正控）。
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

/** ★**能力门**：战中**可提交本回合行动**的前提＝引擎有 `RPG.submitBattleAction`
 *  （`sgstory#2003` 的接口）。没有 ⇒ 战中只列不可点（老口径），✗ 不假装已做、✗ 报错。 */
const 战中可提交 = () => setup.BABEL?.战中 === true && typeof RB.submitBattleAction === 'function';

/** 战斗中提交「使用这一件」＝**本回合的行动**（引擎侧接口；回合账归战斗循环）。 */
RB.bagSubmit = (id) => {
	if (State.variables.babelRun?.终局 === true) return { ok: false, reason: 'run-ended' };
	if (typeof RB.submitBattleAction !== 'function') {
		/* 引擎还没有这个口（旧 pin）⇒ 具名说明，✗ 静默（玩家点了没反应＝另一种假读数）。 */
		RB.perform('这个版本还不能在战斗中从背包使用道具 —— 请在战斗菜单里用。');
		return { ok: false, reason: 'engine-lacks-api' };
	}
	const r = RB.submitBattleAction({ item: id });
	if (r?.ok !== true && r?.text) RB.perform(r.text);     // 具名拒上屏（✗ 静默丢弃返回值）
	RB.refreshPanels();
	return r;
};

/* 点击绑定（幂等：只绑一次）。⚠ 只有**能力门放行**时才会渲染出可点件 ⇒ 绑定本身是死代码也无害。
 *  ⚠ 与引擎那条 `.rpg-item-link` 的绑定**互不覆盖**：本类是战中那条（占回合），
 *    引擎那条是战外那条（不占回合）—— 绑定的选择器不同 ⇒ 同一个 id 不会两条路都给。 */
if (typeof jQuery === 'function') {
	jQuery(document).on('click', '.rpg-bag-submit', function (ev) {
		ev.preventDefault();
		const id = jQuery(this).attr('data-bag-submit');
		if (id) RB.bagSubmit(id);
	});
}

/** 视图正文（面板内容；twee 只留骨架 —— 同 `notice` 面的口径）。
 *  ⚠ 拆分点：**逐件一行**的渲染单独成 `bagItemHTML(entry)`（纯函数，只吃条目与定义面）——
 *    这样判据可以拿一颗**哨兵实例**过它，断「文本确实来自定义」而不是「与定义碰巧同字」。 */
RB.bagItemHTML = (e) => {
	/* 名字与 `RPG.inventoryLinks()` 逐字同形：同一个 `itemCountSuffix`（`#1862` ②的口径）。 */
	const 名 = (e.name ?? e.item?.name ?? e.id) + RB.itemCountSuffix(e.item);
	const 左 = State.variables.babelRun?.终局 === true
		? `<span class="rpg-bag-name">${转义(名)}</span>`
		: 战中可提交()
		? `<a href="#" class="rpg-bag-submit" data-bag-submit="${转义(e.id)}" title="点击使用（占本回合）">${转义(名)}</a>`
		: setup.BABEL?.战中 === true
			? `<span class="rpg-bag-name">${转义(名)}</span>`
			: RB.itemLink(e.id, { label: 名 });
	const 效果 = RB.bagEffects(e.item);
	/* ⚠ 行标记用 `data-bag-item`（✗ `data-item`）：引擎的点击绑定认 `.rpg-item-link`，而 `data-item`
	 *   是**可点件**的属性名 —— 混用会让「战中还有没有可点件」这类判据读错面（本席首跑实测：那一格红在 <li> 上）。 */
	return `<li data-bag-item="${转义(e.id)}">${setup.BABEL.visual.itemHTML(e.id)}${左}`
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
	const 提示 = !战中 ? '' : (战中可提交()
		? '<div class="rpg-hint">战斗中：点道具名即用掉它 —— 那会**占用本回合**。</div>'
		: '<div class="rpg-hint">战斗中：请在战斗面板里使用道具——那会占用本回合。</div>');
	return `<details class="rpg-bag"><summary>${标题}</summary>${提示}`
		+ `<ul class="rpg-bag-list">${行}</ul></details>`;
};

/* 面板注册：宿主 `.bagbar [data-panel="bag"]`（骨架留在 `ui/ui.twee` 的页脚）——**常驻**（每段落都在）。 */
RB.registerPanel('bag', {
	name: '背包视图',
	host: '[data-panel="bag"]',
	render: () => RB.bagHTML(),
});
