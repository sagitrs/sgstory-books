/* map.js —— W09「七名河」**正式单图**（`books#401` S7 · **3b**）
 *
 * 裁（`writer-2` 六裁 `6021566672` ✓）：①**单张静态底图**（资产 `babel-map-w09` ✓，✗ 不按节点备快照 ✓）
 *   ②**独立 DOM 覆盖层**（✗ 不改 data URL 内的 SVG ✓）③页脚宿主**紧接 `.bagbar` 之后** ✓
 *   ④三类等价文字**留地图面板内**（✗ 不另造游戏段落 ✓）⑤行为要求冻结（**组号/工具改动归 T 域** ✓）
 *   ⑥新绘底图已登记来源／许可／用途（`assets/README.md` ✓）。
 * **§二共同口径**：★**标记不得混义**（已处理≠胜利；检定失败／谢绝／**成功脱离**按**真结果**区分；侦察≠解决事件 ✓）；
 *   位置按**实际上下文** ✓（✗ 不由 floor11／旧 L11 猜 ✓）；入口／图区点击／ESC **同一个开关**，★**真状态变**才出原句 ✓；
 *   键盘触屏真可操作（焦点／展开态／关闭具名／焦点回归 ✓）；**只读≠免回归**（✗ 不得成为返城／逃脱／存档／用物／战斗入口 ✓）。
 * **★E5 约束**（`6012606197`）：`src` 是 data URL ⇒ **资产内部不可进** ⇒ 覆盖层由**已保存权威事实**现算·纯函数·**零 State 写** ✓。
 */
const B = setup.BABEL ??= {};
const R = setup.RPG;
/** 底图节点坐标（★与 `assets/map-w09.svg` **同源**：都按权威拓扑分层取 ✓）。 */
const 坐标 = Object.freeze({
	E0: [60, 380], E1: [60, 312], E2: [260, 312], E3: [60, 244], E4: [160, 244],
	E5: [260, 244], E6: [160, 176], E7: [260, 176], E8: [160, 108], E9: [160, 40],
});
const 类型名 = Object.freeze({ portal: '门', reward: '奖励', battle: '战斗' });
/** ★开关暂态住**局部**（✗ 不进存档、✗ 不推时间 ✓ 裁 §二.3）。 */
let 开 = false;

const 资产 = () => {
	const a = setup.storyAssets?.['babel-map-w09'];
	if (!a || !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+=*$/.test(a.src ?? '')) return null;
	return Number.isInteger(a.width) && a.width > 0 && Number.isInteger(a.height) && a.height > 0 ? a : null;
};

/** ★标记：**按真结果**给（✗ 不把「已处理」当胜利 ✓ 裁 §二.1）。 */
const 标记 = (r, id) => {
	if (!r?.已开始 || !(r.已处理 ?? []).includes(id)) return '';
	const 果 = r.结果?.[id] ?? null;
	const 型 = r.定点?.[id]?.type ?? null;
	if (型 === 'battle' || 果?.战果 != null || 果?.脱战 != null) {
		if (果?.战果 === 'victory') return '胜';
		if (果?.脱战 === true) return '脱离';
		/* ★`未胜` **一句说清它覆盖什么**（D 席 N3 ✓）：战斗面的**三种非胜收场**——`stalemate`（僵持）／
		 *   `stunned`（击晕）／`down`（未胜倒地）—— 现合成**一格**「未胜」✓（裁 §二.1 点名要区分的是
		 *   「检定失败／谢绝／**成功脱离**」✓，这三者已各自区分 ✓）；★若将来要把三种收场**再拆**，
		 *   在此处按 `果.战果` 分派即可 ✓（内容档已有四名：victory／stunned／stalemate／down ✓）。 */
		return '未胜';
	}
	if (果?.成败 === '成功') return '通过';
	if (果?.成败 === '失败') return '失败';
	return '已办';
};

/** 覆盖层：**纯函数**、零 State 写 ✓（★画在底图**之上**的独立 DOM 层 ✓）。 */
const 覆盖层 = (r) => {
	const 件 = [];
	for (const id of Object.keys(坐标)) {
		const [x, y] = 坐标[id];
		const 标 = 标记(r, id);
		const 位 = r?.当前 === id ? `<circle class="map-here" cx="${x}" cy="${y - 20}" r="4"/>` : '';
		/* ★节点标签与类型由**覆盖层**画（✗ 底图内 ✗ —— 构建链 SVG 白名单不允许 `text` 元素 ✓）。 */
		const 名 = r?.定点?.[id]?.title ?? '';
		件.push(`<text class="map-axis" x="${x}" y="${y + 4}">${id}</text>`
			+ `<text class="map-type" x="${x}" y="${y + 26}">${类型名[r?.定点?.[id]?.type] ?? ''}</text>`
			+ `<text class="map-mark" x="${x + 16}" y="${y + 4}">${标}</text>${位}${名 ? `<title>${名}</title>` : ''}`);
	}
	return `<svg class="map-overlay" viewBox="0 0 320 420" width="320" height="420" aria-hidden="true">${件.join('')}</svg>`;
};

/** 三类等价文字（裁④：**留面板内** ✓）。 */
const 等价文字 = (r) => {
	const 名 = (id) => r?.定点?.[id]?.title ?? id;
	const 当前 = r?.节点
		? `当前：${名(r.当前)}（${类型名[r.节点.type] ?? r.节点.type}）—— ${r.已处理.includes(r.当前) ? `已办（${标记(r, r.当前)}）` : '尚未处理'}`
		: '当前：尚未进入七名河。';
	const 可走 = (r?.导航 ?? []).length
		? `可走：${r.导航.map((x) => `${x.label} → ${名(x.direction)}（${类型名[r.定点?.[x.direction]?.type] ?? ''}）`).join('；')}`
		: '可走：本节点无更多可走方向。';
	const 险 = (r?.导航 ?? []).map((x) => r.定点?.[x.direction]?.type).filter(Boolean);
	const 风险 = `类型：${[...new Set(险)].map((t) => 类型名[t] ?? t).join('／') || '—'}（战斗中落败则未胜；可付传送机会提前返城）`;
	return `<div class="map-eq"><div>${当前}</div><div>${可走}</div><div>${风险}</div></div>`;
};

const 面板 = () => {
	const r = B.七名河?.读?.() ?? null;
	if (!开) {
		return `<button type="button" class="map-open" tabindex="0" data-map-toggle="1" aria-expanded="false" aria-controls="seven-names-map-area">打开地图</button>`;
	}
	const a = 资产();
	const 图 = a
		? `<div class="map-wrap" id="seven-names-map-area" tabindex="-1"><img class="babel-art map-art" data-babel-asset="babel-map-w09" src="${a.src}" width="${a.width}" height="${a.height}" alt="七名河地图：自下而上的单向路线" data-map-toggle="1">${覆盖层(r)}</div>`
		: `<div class="map-wrap"><p class="map-missing">（地图图样不可用 —— 文字与操作不受影响 ✓）</p></div>`;
	/* ★图例：主干**实线**／支路**虚线**，**非仅靠颜色** ✓（裁④＋§三 ✓）。 */
	const 图例 = `<div class="map-legend">图例：<svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke="#8fb0c8" stroke-width="3"/></svg> 主干（实线）　<svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke="#6b7d8f" stroke-width="2" stroke-dasharray="7 5"/></svg> 支路（虚线）</div>`;
	return 图 + 图例 + 等价文字(r)
		+ `<button type="button" class="map-open" data-map-toggle="1" aria-expanded="true">收起地图</button>`;
};

/** ★**三路一个开关**（入口按钮／图区点击／ESC ✓ 它们共用本函数 ✓）。 */
const 切换 = () => {
	开 = !开;
	/* ★**真状态变**才出原句（✗ 每次重绘都刷 ✓ 裁 §二.3）。
	 * ★★**领队双裁（`#483` 第 a 项，2026-10-07）**：演出走**引擎真口** `R.pushNotice` ✓ ——
	 *   本处原写 `R.note?.(句)`，而 **`RPG.note` 在任何一侧都无定义**（实测 `typeof === 'undefined'`）
	 *   ⇒ 那是**无人提供的钩** ⇒ 裁文明令要显示的「你打开了地图／你收起了地图」**从未在玩家侧出现** ✗
	 *   （★判据挂在钩上 ⇒ 「显不显示」**测不出来** ✗ —— 本笔修的就是这类盲区 ✓）。 */
	R.pushNotice?.(开 ? '你打开了地图' : '你收起了地图', { channel: 'map-scene' });
	R.refreshPanels?.();
	return 开;
};
B.地图 = Object.freeze({ 开: () => 开, 切换, 面板, 坐标, 覆盖层, 标记, 等价文字, 图例键: 'trunk-solid/branch-dashed' });
/* ── ★**三路同一个开关**（裁 §二.3 ✓）：入口按钮／图区点击／ESC ⇒ **全走 `切换()`** ✓ ──
 *   ★键盘与触屏真可操作（裁 §二.4 ✓）：入口是**真按钮**（可聚焦 ＋ `aria-expanded` ✓）；
 *   关闭有**明确名称**（收起地图 ✓）；★收起后**焦点回到入口** ✓。 */
const 焦点回入口 = () => { try { document?.querySelector?.('[data-panel="seven-names-map"] .map-open')?.focus?.(); } catch { /* 无头环境无 DOM ⇒ 不做 ✓ */ } };
if (typeof document?.addEventListener === 'function') {
	document.addEventListener('click', (e) => {
		if (!e?.target?.closest?.('[data-map-toggle]')) return;
		e.preventDefault?.();
		切换();
		焦点回入口();
	});
	document.addEventListener('keydown', (e) => {
		if (e?.key !== 'Escape' || !开) return;      // ★ESC 只在**展开时**收起 ✓（✗ 不吞其它键 ✓）
		切换();
		焦点回入口();
	});
}

R.registerPanel('seven-names-map', { name: '地图', host: '[data-panel="seven-names-map"]', render: 面板 });
