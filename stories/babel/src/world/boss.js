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
	dmg: '1d8', type: 'bludgeoning', atkBonus: 5,
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
	stats: DND3.stats({ str: 16, dex: 12, con: 16, ac: 16, bab: 3, cr: 3 }),
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
 * 口径（操作者 `#172` §14 批复 ⑥⑦）：**打晕 ≠ 打死**（`allowKnockoutClear` 可配置）｜
 *   玩家**全非致命出局**同样是「失败」入口（本函数把两者都归 `'down'`）。
 * ⚠ 进度账落**本局**（`$babelRun.bosses`）：硬门要「**每局**都得打」，✗「打过一次就永久开」。
 */
setup.BABEL.头目策略 = Object.assign({ allowKnockoutClear: false }, setup.BABEL.头目策略 ?? {});
/** 战果：`'victory' | 'stunned' | 'stalemate' | 'down'`（判定**只此一处**）。 */
const 战果 = ({ foes, player } = {}) => {
	const 敌 = foes ?? [];
	const 全倒 = 敌.length > 0 && 敌.every((f) => f.isDown);
	const 全晕 = 全倒 && 敌.every((f) => R.isKnockedOut?.(f) === true);
	if (player?.isDown) return 'down';                       // 致命归零 **或** 非致命出局（§14 ⑦）
	if (全倒 && (!全晕 || setup.BABEL.头目策略.allowKnockoutClear)) return 'victory';
	if (全倒) return 'stunned';                              // §14 ⑥：打晕不开门（可配置翻面）
	return 'stalemate';                                      // 回合打完双方仍在（含玩家主动收手）
};
/** 进度账：本局各场头目的战果（**只有** victory 会写进去）。 */
const 进度账 = () => ((State.variables.babelRun ??= {}).bosses ??= {});
const 已过 = (场) => 进度账()[场] === 'victory';
const 记战果 = (场, 果) => {
	if (果 === 'victory') 进度账()[场] = 'victory';
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
