/* 巴别之井 · 试玩版 —— **二段**世界面（L11–L20 装配；#1791）
 *
 * 面：
 *   · 层表/遭遇表 `src/dnd/dnd3/core/climb2.js`（L11–L19 climb、L20 hub；键 'span2'）
 *   · 第 20 层整备区 `src/dnd/dnd3/scenes/span2-hub.js`（三地点：`L20-forge`／`L20-settlement`／`L20-gate`）
 *   · 铁器谱系 `src/dnd/dnd3/items/iron-lineage.js`（6 张锻造图纸 ⇒ craft 配方）
 *
 * ★ 与一段**相反的挂图决定**（`#1791` 票面第 4 条，照 `#1782` 先例）：
 *   `span1GateExit()`（10→11）**本笔才挂**（一段当年挂不上：L11 尚不存在）；
 *   `span2GateExit()`（20→21）**只定义不挂** —— `L21` 属三段（候 `#1754` 裁），挂图即悬空边、`validate()` 必红。
 *   ⇒ 试玩版**终点**因此落在 L20-gate（不再是一段的 L11）。
 *
 * ★ 第 20 层的三个地点**取包里的实例**（`DND3.buildSpan2Hub()`，连边一并取入）⇒ 单一权威源；
 *   本文件另外**补两个故事侧地点**（军械堆／马厩）—— 理由是票面第 5 条要求「盾装备／骑乘」可**观察**，
 *   而这两个面（`#1788` 的 `shields.js`／`mounts.js`）在包里没有发放口（✗ 观察不到的面 = 死面）。
 *
 * 车道：故事面（`stories/**`），只做装配；判定数学/内容数据全在 `src/**`。
 */

const DND3 = setup.DND3;
const R = setup.RPG;

const map = setup.BABEL.map;   // 一段在 `babel.js` 里已建好（本文件按路径序在其后加载）

/* 「层地点」的构造形由一段文件（`babel.js`）提供并挂在 `setup.BABEL` 上 ⇒ 两段**形状同源**。 */
const makeLayerLocation = setup.BABEL.makeLayerLocation;

/* ---------- 二段 11–19 层 ----------
 * 叙事：矿道 ⇒ 猎场 ⇒ 城墙根；采集点复用一段的 5 种**采集点道具**（✗ 新造内容数据）——
 *   铁料**不走采集点**：二段的遭遇掉落表自带 `iron-ore`（`climb2.js` 的 L13–L19），
 *   锻造闭环因此是「打怪取铁 ⇒ 图纸 ⇒ 铁器」，见 README 的「已知面」。 */
const SPAN2_LAYERS = [
	{
		id: 'L11', name: '第 11 层 · 矿道口', gather: 'dead-wood', gatherLabel: '坑木',
		desc: '穿过那道竖直的光，脚下变成湿的矿渣。墙上钉着木撑，新新旧旧，一直往里。'
			+ '从这里开始，光要靠自己带。',
	},
	{
		id: 'L12', name: '第 12 层 · 虫巢边缘', gather: 'stone-pile', gatherLabel: '碎石堆',
		desc: '耳边先是嗡嗡声，然后才是味道。地上有被啃空的骨壳，亮得像上了釉。',
	},
	{
		id: 'L13', name: '第 13 层 · 铁锈层', gather: 'flint-seam', gatherLabel: '燧石露头',
		desc: '巷道拐了个弯，岩壁的颜色变了：铁锈红一层压一层。有人在这里挖过，也在这里死过。',
	},
	{
		id: 'L14', name: '第 14 层 · 猎场', gather: 'wild-grain', gatherLabel: '野草穗',
		desc: '豁然开阔。穹顶高得看不清，风从某个看不见的口子灌进来。这里养着东西 —— 上面的人养来取乐的。',
	},
	{
		id: 'L15', name: '第 15 层 · 灰烬坡', gather: 'dead-wood', gatherLabel: '烧焦的木料',
		desc: '坡上铺满灰。踩下去会陷到脚踝。灰底下偶尔露出一截烧剩的木头，还有别的东西。',
	},
	{
		id: 'L16', name: '第 16 层 · 铸渣堆', gather: 'stone-pile', gatherLabel: '炉渣堆',
		desc: '整层的岩壁都被熏黑了。铁水早已凝固成一道道帘子，把路切成细缝。',
	},
	{
		id: 'L17', name: '第 17 层 · 空风道', gather: 'flint-seam', gatherLabel: '燧石露头',
		desc: '风声大得像呼吸。石缝里嵌着碎铁片，捡起来能换一顿饭 —— 如果上面还有人给饭。',
	},
	{
		id: 'L18', name: '第 18 层 · 断墙', gather: 'copper-vein', gatherLabel: '铜矿石脉',
		desc: '一道石墙横过巷道，塌口只容一个人侧身过。墙是别人修的，用来挡什么，已经不重要了。',
	},
	{
		id: 'L19', name: '第 19 层 · 城墙根', gather: 'dead-wood', gatherLabel: '脚手木料',
		desc: '头顶传来铁锤声。城墙就在上面 —— 再往上，是别人的地界。',
	},
];
for (const L of SPAN2_LAYERS) map.addLocation(makeLayerLocation(L));

/* 二段各层的采集点登记进**共用表**（`gatherOf` 读它；一段在 `babel.js` 里登记自己的）。 */
for (const L of SPAN2_LAYERS) setup.BABEL.gatherPoints[L.id] = L.gather;
/* ★`#116` (乙)：**料场也持节点**（同构于层地点）⇒ 登记它的采集点。 */
setup.BABEL.gatherPoints['L20-settlement'] = 'dead-wood';

/* ---------- 第 20 层：整备区（取包里的实例 ⇒ 单一权威源）----------
 * ★`#116` (乙)：料场（`L20-settlement`）改**地点节点形**——单一「采集」动作（✗ 原两段式
 *   「翻找（发 dead-wood 进背包）⇒ 对背包里的节点采」）。经 `patch` 参替换动作表，
 *   ✗ 改包里的实例（那会污染包自己那张图）。
 *   ⚠ **图纸留在原动作**：图纸是**真·可携带道具**（`#1788` 的 6 张，用于锻造），
 *     ✗ 不是地点特征 ⇒ 它**应当**进背包（本次只把**木料**改节点形）。 */
setup.BABEL.adoptHub(map, DND3.buildSpan2Hub(), {
	'L20-settlement': (原表) => 原表.map((a) => {
		if (a.text === '在料场里翻找（图纸与木料）') {
			return Object.assign({}, a, {
				text: '在料场里翻找（找锻造图纸）',
				action: () => {
					const missing = DND3.span2Blueprints().filter((id) => !RPG.has(id));
					for (const id of missing) RPG.give(id);
					RPG.perform(missing.length > 0
						? `你从料场翻出 ${missing.length} 张图纸。`
						: '料场里只剩下碎木头 —— 图纸你都有了。');
				},
			});
		}
		if (a.text === '采集（枯倒的木料）') {
			return Object.assign({}, a, {
				text: () => {
					const n = setup.BABEL.nodeAt('L20-settlement');
					const left = n?.charges;
					return left == null ? '采集（料场木料）' : `采集（料场木料｜还可采 ${left} 次）`;
				},
				when: () => (setup.BABEL.nodeAt('L20-settlement')?.charges ?? 0) > 0,
				action: () => setup.BABEL.gather(),
			});
		}
		return a;
	}),
});

/* ---------- 故事侧补的两个 L20 地点（票面第 5 条的「可观察」）----------
 * 军械堆 ⇒ 盾（`shields.js`）；马厩 ⇒ 坐骑（`mounts.js`）。**house rule（非 SRD）**：发放即拾取。 */
map.addLocation(new R.Location({
	id: 'L20-armory',
	name: '行会·军械堆',
	desc: '盾牌靠着墙码成一排，木的、铁的、包边的。管事的看了你一眼，没说话，也没拦。',
	actions: [
		/* N-2（dev-9）：换装要有 `perform` —— 盾占同一槽（`slot:'shield'`）⇒ 换装是**互斥切槽**，
		 *   玩家若不被告知，会以为「新盾没拿到」。 */
		/* ★`#135` ③：`slotEquip` 同槽被占即**拒绝**（`src/core/30-inventory.js:110-124`），旧 action 却
		 *   **无视返回值**无条件印「你换下旧的…」⇒ 玩家同时看到两句相反的话。修法＝文案与**实际结果同源**：
		 *   读 `equippedIn('shield')`（返回**对象** ⇒ 比 `.id`）⇒ 印「换成了」或「收进背包（槽被占）」✓ */
		{ text: '拿一面小圆盾（AC +1）', when: () => !R.has('buckler'), action: () => { R.give('buckler'); R.equip('buckler'); if (RPG.equippedIn('shield')?.id === 'buckler') R.perform('你把小圆盾扣在左臂上。'); } },
		{ text: '换一面重木盾（AC +2，代价更沉）', when: () => !R.has('heavy-wooden-shield'), action: () => { R.give('heavy-wooden-shield'); R.equip('heavy-wooden-shield'); if (RPG.equippedIn('shield')?.id === 'heavy-wooden-shield') R.perform('你换下旧的，扛起一面重木盾。'); } },
	],
}));
map.addLocation(new R.Location({
	id: 'L20-stable',
	name: '行会·马厩',
	desc: '厩里味道很重。几匹驮兽低着头，其中一匹抬头看你 —— 它认得往上走的人。',
	actions: [
		{ text: '牵一匹骡子（便宜、耐走）', when: () => !R.has('mule'), action: () => { R.give('mule'); R.perform('你牵走一匹骡子。它不情愿，但跟着你走。'); } },
		{ text: '牵一匹轻型马', when: () => !R.has('light-horse'), action: () => { R.give('light-horse'); R.equip('light-horse'); R.perform('你翻身上马 —— 缰绳一紧，它先走了一步。'); } },
	],
}));

/* ---------- 边 ---------- */
/* ★ 10→11 单向门**本笔才挂**（一段当年挂不上：L11 尚不存在）。挂上后 L11 就有了入边 ⇒ 段间连通。 */
map.addExit(DND3.span1GateExit());
/* ★`books#176`：本文件**复用** `babel.js` 导出的终局位闸门（✗ 自建一份 —— `babel.js` 先装载）。 */
const 边可否通行 = setup.BABEL.边可否通行;
if (typeof 边可否通行 !== 'function') throw new Error('[babel2] 缺 `setup.BABEL.边可否通行`（`world/babel.js` 未先装载？）');

/* 段内自由（双向）：L11↔…↔L19↔L20-forge */
for (let i = 0; i < SPAN2_LAYERS.length - 1; i++) {
	const a = SPAN2_LAYERS[i].id;
	const b = SPAN2_LAYERS[i + 1].id;
	/* ★`books#176`：终局位闸门 —— 复用 `babel.js` 导出的**同一个** `边可否通行`（✗ 自建一份）。 */
	map.addPath({ from: a, to: b, text: `向上，去第 ${i + 12} 层`, when: 边可否通行(a, b) });
	map.addPath({ from: b, to: a, text: `向下，回第 ${i + 11} 层（段内自由）`, when: 边可否通行(b, a) });
}
map.addPath({ from: 'L19', to: 'L20-forge', text: '走进城墙（第 20 层）', when: 边可否通行('L19', 'L20-forge') });
map.addPath({ from: 'L20-forge', to: 'L19', text: '退回第 19 层（段内自由）', when: 边可否通行('L20-forge', 'L19') });
/* 故事侧两地点：从料场分出去的支线（单向去、可回料场） */
map.addPath({ from: 'L20-settlement', to: 'L20-armory', text: '去军械堆', when: 边可否通行('L20-settlement', 'L20-armory') });
map.addPath({ from: 'L20-armory', to: 'L20-settlement', text: '回料场', when: 边可否通行('L20-armory', 'L20-settlement') });
map.addPath({ from: 'L20-settlement', to: 'L20-stable', text: '去马厩', when: 边可否通行('L20-settlement', 'L20-stable') });
map.addPath({ from: 'L20-stable', to: 'L20-settlement', text: '回料场', when: 边可否通行('L20-stable', 'L20-settlement') });
/* ★`#135` ①（dev-10 预研）：补 **料场 → 炉边** 回边 —— 引擎 hub 两条边皆**单向**
 *   （`src/dnd/dnd3/scenes/span2-hub.js:115-116`：炉边→料场→石门）⇒ 领图后回不了炉边锻造
 *   （README 承诺链路断）。加在**故事侧**（✗ 改引擎）✓ */
map.addPath({ from: 'L20-settlement', to: 'L20-forge', text: '回炉边', when: 边可否通行('L20-settlement', 'L20-forge') });
/* ★ `span2GateExit()`（20→21）**只定义不挂图**——`L21` 属三段。下行的「定义存在」断言在 verify.mjs §③。 */

/* ---------- 收尾：终点评语（试玩版到 L20-gate 为止）---------- */
map.locations.get('L20-gate').actions.push(
	{ text: '看看这一局爬了些什么', action: () => SugarCube.Engine.play('试玩终点') },
);

/* ---------- 全图校验（build-and-check）---------- */
const problems = [...map.validate(), ...map.validateConnectivity('L1')];
if (problems.length > 0) throw new Error(`[babel] 二段接入后地图不合法：${problems.join('；')}`);
