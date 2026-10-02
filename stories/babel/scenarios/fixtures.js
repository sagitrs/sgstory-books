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
	 *   三者**只差对手强弱**，而「强弱」由**遭遇表**（层表驱动）决定 ⇒ 夹具不直接给对手，
	 *   给的是「在哪一层 + 打第几场」。⇒ 出场对手由 `RPG.rollEncounter` 抽（真路径）。
	 *   ⚠ 本席**不**在此手搓怪物实例：那会绕开层表，测的就不是产品的抽法了。 */
	S.registerFixture('战斗态·可胜', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
		player: 默认玩家({ hp: 20, maxHp: 20 }),
	}));
	S.registerFixture('战斗态·必败', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
		player: 默认玩家({ hp: 1, maxHp: 20 }),
	}));
	S.registerFixture('战斗态·久战不决', () => 态({
		babelRun: 默认局({ deepest: 'L11' }),
		player: 默认玩家({ hp: 20, maxHp: 20 }),
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
