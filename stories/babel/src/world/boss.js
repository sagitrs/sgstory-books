/* 巴别之井 · 试玩版 —— L9 的头目：**不眠者**（`books#133` 笔 3；设计稿 `books#132` 的「§L9 BOSS」）
 *
 * 设计原话（操作者，`books#132`）：「**L9 BOSS**：固定事件＝玩家看到出口；选项**唯一**＝前进进入 10 层」。
 *   ⇒ 本件只落**实体**（数值块）；「固定遭遇」由遭遇表的 L9 行落（`world/babel.js`：行内只剩一个 ref），
 *     「唯一出口」由**动作守卫**落（同上；✗ 结构删边 —— L10+ 的衔接面与任何读图的东西都不动）。
 *
 * 数据归属裁定：它是 Babel 专属的怪 ⇒ **故事层**定义（形照引擎 `src/dnd/dnd3/monsters/*.js`；
 *   同笔的「蓝苔蜂」已有先例），✗ 进引擎包。
 *
 * ⚠ **数值是待平衡批的占位**（设计稿只给了「有 BOSS」这件事，没给数值）：本席按段内定标取
 *   引擎 L8 头（巨蜥 hp 22／ac 15／str 17／bab 2／咬 atkBonus 5）**上抬一格**：
 *   hp 26／ac 16／str 16／bab 3／攻 atkBonus 5。玩家此时的装备面＝剑（L1 捡）＋ 中甲（L4 箱）
 *   ＋ 绷带 ＋ 工具三件 ＋ 被动「预知」⇒ 这一档是「能赢但要走几个回合」。**要改只改这一块**。
 */
const R = setup.RPG;
const DND3 = setup.DND3;

/* ★攻击件（`#1855` 的形）：`equipped: true` ⇒ ①自动通路取得到 ②死亡**不掉落**。
 *  ⚠ 必须落在 `items` 里：`RPG.Character` **不认** `attacks:` 字段（本席在「幼獾」上栽过一次 ——
 *    怪因此**咬不动人**，一场「白送」的战斗表面上仍会让「可胜」为真）⇒ 判据同族（㉗ 有该臂）。 */
R.defItem({
	id: 'sleepless-grasp', name: '不眠的抓握',
	/* ★`books#170`（`#182` 交查的**真缺口**，release 阻塞）：`dmg`／`type`／`atkBonus` 原写在**顶层**
	 *   ⇒ `Item` 构造只拷贝**已知字段**（id/name/desc/stats/charges/…）⇒ 三个字段被**静默丢掉**：
	 *   实测 `R.createItem('sleepless-grasp').stats === {}`，且顶层也读不到 ⇒ 近战伤害读
	 *   `item.stats.dmg`（引擎 `combat.js:87`）⇒ **命中那一击**抛「无法解析的骰子表达式：undefined」
	 *   （miss 不抛 ⇒ 只在真打起来时现形）。加上 L9 硬门 ⇒ **头目打不动 = 不可通关**。
	 *   ⇒ 照引擎的形（`items/club.js`：伤害块进 `stats`）落。 */
	/* ★`books#201` 乙笔（数值配平）：**原值** `dmg: '1d8'`（有效 1d8 ＋ str 16(+3) ＝ 1d8+3，均 7.5）
	 *   ⇒ **新值** `dmg: '1d6'` ⇒ 有效 **1d6+1**（均 4.5）。
	 *   期望依据：头目 E[伤害/回合] 4.33 → 2.60 ⇒ TTD 4.6 → 7.7（玩家带盾 9.4），
	 *   与玩家侧三项合起来把 L9 胜率从 4.7% 抬进 70–85% 带（`#201` 敏感度表：54.8% → 72.6%）。 */
	stats: { dmg: '1d6', type: 'bludgeoning', atkBonus: 5 },
	desc: '它的手不知冷热，也不知疲倦。抓住你的时候，你听见有人在数数。',
	charges: null, stackable: false, weapon: true, slot: 'weapon',
	actions: { equip: R.slotEquip, unequip: R.slotUnequip },
	used(that, from) { return DND3.meleeAttack(this, that, from); },
});

/* 来历（一句）：它守着最后一段路，从不睡 —— 因为它比谁都清楚，井底睡着的东西比它更坏。 */
DND3.SleeplessOne = R.defCharacter({
	id: 'sleepless-one',
	name: '不眠者',
	hp: 26, maxHp: 26,
		/* ★`books#201` 乙笔：**原值** `str: 16`（+3 加进伤害 ⇒ 1d8+3）
	 *   ⇒ **新值** `str: 12`（+1 ⇒ 1d6+1）。⚠ 攻击面**不受影响**：该件 `atkBonus: 5` 在场即以它为准（实测 +5）。 */
	stats: DND3.stats({ str: 12, dex: 12, con: 16, ac: 16, bab: 3, cr: 3 }),
	items: [{ id: 'sleepless-grasp', equipped: true }],
});

/* ★重开复位（形照引擎 `monsters/boar.js` 的同名钩子）：**没有这一段，头目只会被杀一次** ——
 *   `:enginerestart` 之后 `hp` 仍是 0、`effects` 还挂着上一局的，头目就「死了还没死」。
 * ★逻辑抽成**具名函数**、并挂到导出面：`verify.mjs` 跑在 host 桩里（**没有真 DOM 事件**：本席实测
 *   `jQuery(document)` 与 host 的 `document` 不是同一个、自注册探针也触发 0 次）⇒ 判据要能**真调用**
 *   复位逻辑本身，✗ 只能静态核那行绑定。绑定仍在下面一行（静态可核）。
 *
 * ★`books#156`（`#155` 的合后遗留，由 `dev-9` 提、`app/sagitrs-developer` 出形）：**登记面**。
 *   为什么需要它：host 桩里的 `jQuery` 是 **no-op 代理**（引擎 `tests/unit/framework/shims.js:26`）
 *   ⇒ 绑定动作**留不下任何痕迹**，只核源码文本时「绑的是哪个函数」核不出来：把绑定换成空函数、
 *   而把真复位挂在导出面上，两层判据都会绿，而那正是「重开事件不会复位头目」。
 *   ⇒ 把「注册」抽成本函数：**登记进数组 ＋ 做绑定**；判据断言「数组里每一个 === 导出面上的复位本体」，
 *     并静态核「注册走的是本函数、本函数绑的是它的参数」（三处齐，见 `verify.mjs` 的 ㉗）。 */
const 复位头目 = () => {
	DND3.SleeplessOne.hp = DND3.SleeplessOne.maxHp;
	DND3.SleeplessOne.effects = [];
};
const 重开钩子 = [];
const 注册重开钩子 = (fn) => { 重开钩子.push(fn); jQuery(document).on(':enginerestart', fn); return fn; };
注册重开钩子(复位头目);

/* ══════════════════════════════════════════════════════════════════════════════
 * ★`books#180`：头目门的**战果判定**与**进度账**（形照 `#175` 的 `结算战败`：一族一个判据源）
 *
 * 为何要单点：旧形把「胜」写死在 `encounters.js` 的 `foes.every(f => f.isDown)` 里，而那条判与
 *   「玩家是否也倒了」**相邻且不互斥** —— 同归于尽时**先发了战利品**、再走失败流（本席读码时挖到）。
 *   ⇒ 战果一处判、消费者（战利品／进度／落点）各按它分支。
 * 口径：**打晕 ≠ 打死** —— **主依据是引擎自己的规则**（`sgstory#1854`：`40-battle.js` 的
 *   `if (this.isOut(enemy) && !RPG.isKnockedOut(enemy) …) RPG.loot(enemy)`「非致命昏迷者**不掉落**」，
 *   且战斗结论行分「打晕／击败」两说）；操作者 `#172` 的 §14 批复 ⑥（击晕不开门）是**旁证** ——
 *   ⚠ ⑥ 管的是**头目门**这一处，✗ 不是「普通掉落」的总规则（属名写准，防按 ⑥ 字面误读）。
 *   ⑦：玩家**全非致命出局**同样是「失败」入口（本函数把两者都归 `'down'`）。
 * ⚠ 进度账落**本局**（`$babelRun.bosses`）：硬门要「**每局**都得打」，✗「打过一次就永久开」。
 */
setup.BABEL.头目策略 = Object.assign({ allowKnockoutClear: false }, setup.BABEL.头目策略 ?? {});
/** 战果：`'victory' | 'stunned' | 'stalemate' | 'down'`（判定**只此一处**）。 */
const 战果 = ({ foes, player, 战斗 = null } = {}) => {
	const 敌 = foes ?? [];
	/* ★`sgstory#1934`（`books#220` 同票）／doc-3 §6.3：判定**收并到引擎的解析器**（`RPG.outcomeResolver`）
	 *   —— 故事侧只留**取名**（四臂名 → 引擎五战果的**投影**），✗ 不再自持一套次序。
	 *   为什么值得收：旧形把「胜」写成 `敌.every(isDown)` 且与「玩家是否也倒了」**相邻且不互斥**
	 *   （`books#180` 那起同归于尽事故的根）⇒ 次序由**引擎一处**给 ⇒ 故事侧按结果取名即可 ✓。
	 *   ⚠ 引擎五名 → 故事四名（**名字变少不是丢信息**：「玩家出局」两因（`death`／`knockout`+`winner=enemies`）
	 *     在故事侧同归 `down`（`§14` ⑦）；「敌方全出局且全晕」⇒ `stunned`（✗ 开门，`§14` ⑥）；
	 *     引擎的 `retreat` 在**故事侧无流程**（下面 `retreatAccepted` 恒 `false` ⇒ 到不了）
	 *     ⇒ 真到得了也按「收手」取名（**穷举**，✗ 留空洞）。 */
	const 解析 = R.outcomeResolver?.resolve;
	if (typeof 解析 === 'function') {
		/* `completedRounds`／`roundLimit` 取**本场的回合预算**：故事侧的语义是「本场循环走完、双方仍在
		 *   ⇒ 僵持」⇒ 拿 `战斗.rounds`（引擎 `Battle` 的回合数）当两者即可 ⇒ 与旧形**逐字同判** ✓。
		 *   ⚠ 引擎判「还没打完」会返 `null` ⇒ 落到下面的**旧形回落** ✓（✗ 把 `null` 当僵持）。 */
		const 解 = 解析({
			players: player ? [player] : [],
			enemies: 敌,
			completedRounds: 战斗?.rounds ?? null,
			roundLimit: 战斗?.rounds ?? null,
			retreatAccepted: false,          // ★故事侧没有退却流程 ⇒ 这一支按设计到不了
		}, {
			/* ★**把故事侧「出局」的口径交给引擎**（✗ 在故事里再判一遍）：本仓的角色状态有两条来源 ——
			 *   引擎的 `hp<=0 / isKnockedOut`（真打）与故事/桩里直接置的 `isDown`（判据与夹具）
			 *   ⇒ 取**并集**当 `isOut` ⇒ 引擎的次序判得动故事侧认得的「全出局」✓（✗ 只认 hp 会让
			 *   `isDown` 那一支漏过去 ⇒ 「同归于尽」被判成 `victory` ✗，本席首版实测正是如此 ✓）。 */
			/* ⚠ **`isDown` 在场就以它为准**（✗ 取并集）：故事/桩里的对手**可能没有 `hp`**（判据与夹具
			 *   常只置 `isDown`）⇒ 并集会把「没写 hp」读成 `0` ⇒ **活着的靶**被算成出局 ⇒ 僵持被判成
			 *   `victory` ✗（本席实测：`尚活 = {isDown:false}` ⇒ 并集 ⇒ ③ 敌方全出局 ⇒ 误红 ✓）。
			 *   `isDown` **缺席**（如引擎真角色只带 hp）时才退回 hp/KO 那条 ✓。 */
			isOut: (a) => (typeof a?.isDown === 'boolean'
				? a.isDown
				: ((a?.hp ?? 0) <= 0 || R.isKnockedOut?.(a) === true)),
		});
		if (解 && typeof 解.outcome === 'string') {
			if (解.outcome === 'death') return 'down';                                    // 主角死（§14 ⑦）
			if (解.outcome === 'knockout' && 解.winner === 'enemies') return 'down';      // 玩家全出局（同归 `down`）
			if (解.outcome === 'knockout') {                                              // 敌方全出局且全晕
				return setup.BABEL.头目策略.allowKnockoutClear ? 'victory' : 'stunned';   // §14 ⑥：打晕不开门（可配置翻面）
			}
			if (解.outcome === 'victory') return 'victory';
			return 'stalemate';              // `retreat`（到不了）／`stalemate` 同归「收手」
		}
	}
	/* ★**旧 pin 的读回落**（老引擎没有 `outcomeResolver`）——一字不动地保留原四臂：
	 *   `e2e`／跑分器在旧 pin 上跑时，判定必须**与老引擎逐字同** ✓（✗ 新面不在就换语义）。 */
	const 全倒 = 敌.length > 0 && 敌.every((f) => f.isDown);
	const 全晕 = 全倒 && 敌.every((f) => R.isKnockedOut?.(f) === true);
	if (player?.isDown) return 'down';                       // 致命归零 **或** 非致命出局（§14 ⑦）
	if (全倒 && (!全晕 || setup.BABEL.头目策略.allowKnockoutClear)) return 'victory';
	if (全倒) return 'stunned';                              // §14 ⑥：打晕不开门（可配置翻面）
	return 'stalemate';                                      // 回合打完双方仍在（含玩家主动收手）
};
/* ★`sgstory#1936` 第三面（书侧**消费臂改读账**）：本局的「已过」以**引擎的进度账**为准 ——
 *   读口 `RPG.save.progress()`／写口 `RPG.save.recordCleared(id)`（两形**逐字同**，写口幂等且能归并旧形）。
 * ⚠ **旧 pin 回落**：引擎没有该口时（`#1936` 之前的 pin）退回**旧形**（`$babelRun.bosses` 里值为
 *   `'victory'` 的键）—— 判据与跑分器在旧 pin 上跑时必须**逐字同**，✗ 新口不在就换语义。
 * ⚠ 新旧**只在引擎口这一处分叉**：写在口上、读也在口上 ⇒ 书侧**不产生第二套真值**。 */
const 账口 = () => (typeof R.save?.progress === 'function' ? R.save.progress() : null);
const 旧账表 = () => ((State.variables.babelRun ??= {}).bosses ??= {});
/** 进度账：本局各场头目的战果（**只有** victory 会写进去）。有引擎口时按口上的账**现算**。 */
const 进度账 = () => {
	const 口 = 账口();
	if (口) return Object.fromEntries(口.run.cleared.map((id) => [String(id), 'victory']));
	return 旧账表();
};
const 已过 = (场) => {
	const 口 = 账口();
	if (口) return 口.run.cleared.includes(String(场));
	return 旧账表()[场] === 'victory';
};
const 记战果 = (场, 果) => {
	if (果 === 'victory') {
		if (typeof R.save?.recordCleared === 'function') R.save.recordCleared(场);
		else 旧账表()[场] = 'victory';        // 旧 pin：一字不动地保留原写法
	}
	return 已过(场);
};

setup.BABEL.头目 = Object.assign(setup.BABEL.头目 ?? {}, {
	不眠者: DND3.SleeplessOne,
	抓握: R.items?.['sleepless-grasp'] ?? null,
	复位: 复位头目,                       // ★判据可调（见上：host 桩里没有真 DOM 事件）
	战果, 进度账, 已过, 记战果,           // ★`books#180`：头目门的战果判定与进度账（判据/刀要能**真调用**）
	重开钩子, 注册重开钩子,               // ★`books#156`：登记面（判据断言「被绑的 === 复位本体」）
});

/* ★`books#180`：战果／进度账同挂**故事出口面** —— 消费方（`babel.js` 的边守卫、`encounters.js`
 *   的战后段）与判据一律按出口面取，✗ 深入 `setup.BABEL.头目` 子对象（两处各一份取法易漂）。 */
setup.BABEL.战果 = 战果;
setup.BABEL.进度账 = 进度账;
setup.BABEL.已过 = 已过;
setup.BABEL.记战果 = 记战果;

/* ═══ ★`books#418`（B4）笔 1：`B.Boss` —— **固定不眠者**的声明面（✗ 随机池成员）═══
 * 口径：B1（`#410`）八项终裁的 L9 边界（准备区 → **固定不眠者** → 胜利后前进）＋ 本票「不新增
 *   随机池或额外普通遭遇」。★「固定」是**机械事实**（✗ 口号），由两处既有机制各承一翼；
 *   本面只是**读口聚合**（✗ 第二真值 —— 真值在遭遇表与白名单那两处，判据/刀按本面取数）：
 *   ① `固定: true` —— 遭遇表 L9 行**只剩一个 ref**（`world/babel.js` 的覆写：`{ ref: 'sleepless-one', weight: 1 }`）
 *      ⇒ 任何一次抽都只能是它（`books#133` 笔 3 落的「固定遭遇」）；
 *   ② `入池: false` —— 抽签白名单 `EVENT_LAYERS`＝L5–L8（✗ 含 L9）⇒ L9 **不抽签、不入池**
 *      （`makeLayerLocation.onEnter` 的白名单守卫 ⇒ 进 L9 连随机单元都不读）⇒ 无额外普通遭遇。
 * ⚠ 判据：t3 的 `tests/b-series/B4-l9-boss-gate.mjs` **B4-2** 按 `固定 === true`／`入池 === false` 断
 *   （**两键 OR** ⇒ 刀须**两键齐翻**才回红：本席实测只翻 `入池` 一键时 `固定` 那一翼仍撑着绿 ✓）。
 * ★红线（t4 契约表口径）：Boss 入池成真（`固定: false` ∧ `入池: true` 齐翻）⇒ B4-2 回红（本席实测 ✓）。 */
setup.BABEL.Boss = Object.freeze({
	名: '不眠者',
	实体: DND3.SleeplessOne,        // 实体定义在本档上方（数值块；`#201` 配平后的现值）
	场: 'L9',                       // 进度账的键（`记战果('L9', …)`；战场＝`LAYER_META` 的 `bossArena`）
	固定: true,                     // ①遭遇表 L9 行唯一 ref（任何一次抽都只能是它）
	入池: false,                    // ②✗ `EVENT_LAYERS` 池成员（L9 不抽签 ⇒ 无额外普通遭遇）
});
