/* 巴别之井 · 试玩版 —— **场景夹具登记**（`#1878` 故事侧）
 *
 * ## 为什么这份料在故事侧（✗ 引擎侧）
 *   夹具内容全是**故事态**（`$player`／`$babelRun`／`$inventory`…）—— 那不是引擎语汇。
 *   机制（`registerFixture`）在引擎（`tests/unit/framework/scenario.js`，sgstory `#1888`），
 *   **注册**在此随故事走（`#1878` 领队裁定：✗ 引擎反过来知道故事的状态）。
 *
 * ## 为什么必须是**具名**（✗ 可以 inline JSON）
 *   `setup.DND3.stats()` 的返回块含 **Symbol 键**（`[PACK]: 'dnd3'`）—— 它是「这件装备/这个角色
 *   属哪个规则包」的**唯一机器可读依据**（跨包同名遮蔽的判据）。而 `scenarios.json` 的 inline JSON
 *   **表达不了 Symbol**（`JSON.stringify` 直接丢掉 Symbol 键）⇒ inline 建的角色态**丢标记** ⇒ 假绿。
 *   ⇒ 状态型条目**只能**走 `形: "具名"`。
 *
 * ## 本文件**不进产品交付树**
 *   它在 `stories/babel/scenarios/`（**测试侧**），✗ 不在 `stories/babel/src/**` ——
 *   后者会被 `build.py` 逐档内联进 `babel-trial.html`。夹具依赖 `__scenario` 面，产品页面不需要它。
 *
 * ## 用法
 *   runner（`tests/scenario/run.mjs`）在**装载故事脚本之后** eval 本档 ⇒ 登记生效。
 *   `--dump-facts=engineFixtures` 的 `count` 应 **> 0**（该读数即「面接通了」的刀）。
 *   ⚠ 消费时必须走 `__scenario.resolveFixture(name)`（**不克隆**）＋**直接赋给 `State.variables`**；
 *     走 `loadFixture` 会 JSON 往返 ⇒ **Symbol 标记丢掉**（见 `#1888` 的实测）。
 */
(function (RPG) {
	'use strict';
	const R = RPG;
	const S = globalThis.__scenario;
	if (!S || typeof S.registerFixture !== 'function') {
		/* 引擎侧没这面 ⇒ **出声**（✗ 静默：静默会让「夹具没接上」看起来像「清单里就是散文」）。 */
		if (typeof console !== 'undefined') {
			console.warn('[babel/fixtures] 引擎无 `__scenario.registerFixture` ⇒ 夹具未登记（清单里的具名条目会被判为散文）');
		}
		return;
	}

	/* ---------- 构造料（全部**每次新建**：✗ 共享引用，否则用例之间互相污染）---------- */

	/** `init.twee` 的默认态（★照抄那份的真值；漂移由 `verify.mjs` 的 StoryInit 读数兜）。 */
	const 默认玩家 = (over = {}) => {
		const p = {
			name: '无名者',
			hp: 18,
			maxHp: 20,
			/* ★**必须**经 `DND3.stats()`**（✗ 字面量）—— Symbol pack 标记在这条路上才有。 */
			stats: setup.DND3.stats({ ac: 12, str: 12, dex: 12, heal_bonus: 0 }),
			effects: [],
		};
		return Object.assign(p, over);
	};
	const 默认局 = (over = {}) => Object.assign(
		{ deaths: 0, kills: 0, gathered: 0, harvests: 0, traumasSeen: [], deepest: 'L1' }, over);

	/** 一件**背包快照**（✗ 实例 ⇒ 与存档同形：只放 id/charges/equipped）。 */
	const 件 = (id, n = 1) => (id === 'coin' || id === 'rock' || id === 'wood' || id === 'tinder'
		|| id === 'seed' || id === 'copper-ore' || id === 'iron-ore'
		? { id, charges: n }                       // 计数库存形（`#1880` 的 coin/资源）
		: { id, charges: n, equipped: false });    // 其余件照 `Item.toJSON()` 的形

	/** 一件**可装备**的件（`equipped: false` 显式给 —— `chain-shirt` 那条是跨包同名遮蔽的主角）。 */
	const 装备件 = (id) => ({ id, charges: null, equipped: false });

	/** 通用：铺一份态（✗ 全量重写 —— 只在默认上覆盖差异面）。 */
	const 态 = (over = {}) => Object.assign({
		player: 默认玩家(),
		inventory: [],
		babelRun: 默认局(),
		babelGiven: {},
		babelSeen: {},
		span1Farms: 0,
		span1Harvests: 0,
	}, over);

	/* ---------- 15 具名夹具（`#1878` 提案的表；名字照录）---------- */

	/* F1 起手态：全默认（✗ 改动） */
	S.registerFixture('起手态', () => 态());

	/* F2 起手态+装备1：★**必具名** —— 跨包同名遮蔽（`chain-shirt` 是 dnd-5e 的件） */
	S.registerFixture('起手态+装备1', () => 态({
		inventory: [装备件('chain-shirt')],
	}));

	/* F3 一段遭遇态：`deepest` 推到 span1 某层（该层可触发遭遇） */
	S.registerFixture('一段遭遇态', () => 态({
		babelRun: 默认局({ deepest: 'L2' }),
	}));

	/* F4 二段遭遇态：`deepest` 到二段 */
	S.registerFixture('二段遭遇态', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
	}));

	/* F5/F6/F7 战斗三终点（★与 `cross-battle-end-*` 同源）——
	 *
	 * ## ★①「当前层」必须是**夹具给的**（`#117` 折单①）
	 *   病灶：三夹具原先**只**给 `$babelRun.deepest`，✗ 给 `$mapCurrent` ⇒ `setup.BABEL.layerOf()`
	 *   （读 `map.current`）拿到的仍是**上一场留下的位置**（或 null）⇒ `fight()` 一开头
	 *   `const layer = setup.BABEL.layerOf(); if (!layer) return R.perform('这里没有可遭遇的东西。')`
	 *   ⇒ **早退**、根本不抽遭遇 ⇒ 「战斗三终点」的场景**跑了一场空的**
	 *   （`tester-4` 实跑 `deaths 0/0/0` 正是这个早退产物，✗ 真读数）。
	 *   ⇒ 键名**现读确认**（✗ 凭记忆）：`src/core/60-map.js` 的 `current` getter 读
	 *     `State.variables[this._stateKey()]` ＝ **`$mapCurrent`**。★且 `set current` **不写档**
	 *     （写点单点＝`moveTo`）⇒ 夹具只能给**状态变量** `mapCurrent`，✗ 给实例字段。
	 *   ⚠ 其它夹具（F3/F4 等）**不动** —— 它们不跑战斗。
	 *
	 * ## ★★★①′ 键名**不是** `mapCurrent`（本席首版即栽此 ⇒ 病灶复发一次，记之）
	 *   `WorldMap._stateKey()` 是**依图 id 生成**的：`!this.id || this.id === 'world' ? 'mapCurrent' : \`mapCurrent_${this.id}\``。
	 *   本图 `setup.BABEL.map.id === 'babel'` ⇒ 真键是 **`mapCurrent_babel`**。
	 *   ⇒ 本席首版按记忆写 `mapCurrent: 'L11'` ⇒ `map.current` **仍为 null** ⇒ `layerOf()` null
	 *     ⇒ 三态**全部走早退** —— 与「不修」同效（★这就是「键名现读确认，✗ 凭记忆名」的字面实例）。
	 *   ⇒ 折法：键名**现读**自 `map._stateKey()`（✗ 硬编 `_babel` 后缀 —— 图换 id 即失准）。
	 *
	 * ## ★②三态分化＝**走玩家侧参数**（✗ 手搓怪物实例）
	 *   对手由 `RPG.rollEncounter(layer, {count:1})` 抽（层表驱动，**真路径**）——
	 *   手搓怪物实例会绕开层表 ⇒ 测的就不是产品的抽法了（writer-2 诊断，本席照此）。
	 *   L11 今日抽到 `fire-beetle`（hp 4／ac 16／咬 2d4+1）。
	 *
	 * ## ★★③一个**实跑才暴露的结构事实**（本席读数，✗ 读码）
	 *   **自动通路（`interactive:false`）的玩家若空手 ⇒ 永不出手。**
	 *   `BattleTurn.execute()` 第一行是 `const weapon = attacker.contains(['weapon','equipped'])`，
	 *   为 `null` ⇒ 直接 `return { status:'rejected', reason:'no-weapon' }`。
	 *   而 `#1854` 的**空手打击**只在**交互**通路（`buildPlayerOptions` ⇒ `#playerAction`）里出现
	 *   ⇒ 无头场景（`{interactive:false}`）里，空手玩家**打不动任何东西**（实测：`foe.hp` 恒不变）。
	 *   ⇒ 故「可胜／久战」两态**须给一件装备的武器**（那是**玩家侧参数**，✗ 手搓怪）——本席实测：
	 * ```
	 *   ⚠ RNG **未播种** ⇒ 单次读数不可作准；本席按 **100 次**取分布定形：
	 * ```
	 *   可胜(club,str20,ac40,hp20)  ⇒ d0/k1 ×100/100
	 *   久战(club,str1,ac40,hp20)   ⇒ d0/k0 ×100/100   ← str1⇒atk −5 恒不中；ac40⇒甲虫亦不中 ⇒ 8 回合上限
	 *   必败(hp1,空手,**ac12**)      ⇒ d1/k0 ×99／d0/k0 ×1   ← ★**1% 尾失**（甲虫 8 回合全失手）⇒ 不采
	 *   必败(hp1,空手,**ac0**)       ⇒ d1/k0 ×100/100  ← ★采此：**防御为零 ⇒ 必挨打** ⇒ 确定
	 * ```
	 *   ★两条实测教训（正是「须实测成立」的意思，✗ 读码投影）：
	 *     · 「必败」**给 club** ⇒ 实测 `d0/k1` 15/100 ⇒ **不是稳定必败**（甲虫 hp 4、`club` 1d6+1 一击即破）
	 *       ⇒ 故**空手**（自动通路无武器 ⇒ 不出手，与 `verify.mjs:211` 的既有注同形）。
	 *     · 「必败」**ac12** ⇒ 有 **1% 尾失**（甲虫 8 回合全失手概率 ≈ 0.5⁸）⇒ 改 **ac 0** 消掉该尾。
	 *   ⚠ 「可胜」的 `kills=1` 是 100/100，但**断言只查 `deaths`**（0）⇒ 即使玩家 8 回合全失手也只是
	 *     `d0/k0`（平局）⇒ `deaths=0` **恒成立** ⇒ 该断言对 RNG **稳**。 */
	/** ★当前层的**状态键名** —— **现读**自 `WorldMap._stateKey()`（✗ 硬编）：
	 *   本图 `id='babel'` ⇒ **`mapCurrent_babel`**（✗ `mapCurrent` —— 那只对 `id` 空/'world' 的图）。 */
	const 层键 = () => setup.BABEL?.map?._stateKey?.() ?? 'mapCurrent';
	const 战斗态 = (over = {}) => 态(Object.assign({
		[层键()]: 'L11',                         // ★当前层（`map.current` 的 State 源）
		babelRun: 默认局({ deepest: 'L11' }),
	}, over));
	/** 一件**已装备**的武器快照（`contains(['weapon','equipped'])` 要求两者皆真）。 */
	const 武器件 = (id) => ({ id, charges: null, equipped: true });
	/* 可胜：**有武器 ＋ 高力 ＋ 高防** ⇒ 一击破 4hp；甲虫 ac 打不穿 ⇒ d0/k1 */
	S.registerFixture('战斗态·可胜', () => 战斗态({
		player: 默认玩家({ hp: 20, maxHp: 20, stats: setup.DND3.stats({ ac: 40, str: 20, dex: 12, heal_bonus: 0 }) }),
		inventory: [武器件('club')],
	}));
	/* 必败：**1 血 ＋ 空手**（自动通路无武器 ⇒ 不出手）⇒ 挨一下即倒 ⇒ d1/k0 */
	S.registerFixture('战斗态·必败', () => 战斗态({
		/* ★ac **0**（✗ 默认 12）：默认 ac 下甲虫有 ≈0.5⁸ 的概率 8 回合全失手 ⇒ 实测 **1% 尾失**；
		 *   防御为零 ⇒ **必挨打** ⇒ 100/100 确定。 */
		player: 默认玩家({ hp: 1, maxHp: 20, stats: setup.DND3.stats({ ac: 0, str: 12, dex: 12, heal_bonus: 0 }) }),
	}));
	/* 久战不决：**有武器但极低力（atk −5 恒不中）＋ 高防（甲虫亦不中）** ⇒ 8 回合上限 ⇒ d0/k0 */
	S.registerFixture('战斗态·久战不决', () => 战斗态({
		player: 默认玩家({ hp: 20, maxHp: 20, stats: setup.DND3.stats({ ac: 40, str: 1, dex: 12, heal_bonus: 0 }) }),
		inventory: [武器件('club')],
	}));
	/* F8 持草药×1 且 HP 未满 */
	S.registerFixture('持草药×1 且 HP 未满', () => 态({
		player: 默认玩家({ hp: 12, maxHp: 20 }),
		inventory: [件('herb-poultice')],
	}));

	/* F9 有建材＋空地（`$span1Farms = 0` ⇒ 空地） */
	S.registerFixture('有建材＋空地', () => 态({
		inventory: [件('wood', 4), 件('rock', 4)],
		span1Farms: 0,
	}));

	/* F10 含采集点物＋已采过（`$span1Farms > 0` ⇒ 非空） */
	S.registerFixture('含采集点物＋已采过', () => 态({
		inventory: [件('stone-pile')],
		babelRun: 默认局({ gathered: 1 }),
		span1Farms: 1,
	}));

	/* F11 有 iron-ore＋图纸（真 id ＝ `forge-longsword`，见 `iron-lineage.js:153`） */
	S.registerFixture('有 iron-ore＋图纸', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
		inventory: [件('iron-ore', 3), 件('wood', 2), 件('forge-longsword')],
		babelGiven: { 'L20-forge': true },
		babelSeen: { 'forge-longsword': true },
	}));

	/* F12 有 iron-ore＋iron-message */
	S.registerFixture('有 iron-ore＋iron-message', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
		inventory: [件('iron-ore', 2), 件('iron-message')],
	}));

	/* F13 带创伤态（逐 hub 层各一枚）—— `$babelRun.traumasSeen` 同步。
	 *   ★效果 id 取 `DND3.Traumas` 的**真键**（`laceration`／`fracture`／`concussion`／`bleeding`，
	 *     见 `src/dnd/dnd3/core/traumas.js:19`）—— `effects` 里放的就是这些 id（`c.add(id)` 的通用路径）。 */
	S.registerFixture('带创伤态（逐 hub 层各一枚）', () => 态({
		player: 默认玩家({ hp: 10, maxHp: 20, effects: ['laceration'] }),
		babelRun: 默认局({ traumasSeen: ['laceration'] }),
	}));

	/* F14 L20 链态（★该条**已有真地点 id** ⇒ 二者可并存：id 管「在哪」、具名管「什么态」） */
	S.registerFixture('L20 链态', () => 态({
		babelRun: 默认局({ deepest: 'L20' }),
		babelGiven: { 'L20-forge': true, 'L20-settlement': true },
	}));

	/* F15 战斗事件态（已跑过一场：战斗结束/死亡/掉落三事件皆有据） */
	S.registerFixture('战斗事件态', () => 态({
		babelRun: 默认局({ deepest: 'L11', kills: 1, deaths: 0 }),
		inventory: [件('coin', 2)],
	}));

	/* ---------- 登记自证（供 runner 的刀）---------- */
	/* ★「登记非空且达已知下限」—— 遍历/展开类判据的老纪律：漏登记会以「零条 ⇒ 全绿」通过。 */
	S.babelFixtures = {
		names: Object.keys(S.fixtures).filter((k) => typeof k === 'string'),
		FLOOR: 15,
	};
})(setup.RPG);
