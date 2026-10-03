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
 *   复位逻辑本身，✗ 只能静态核那行绑定。绑定仍在下面一行（静态可核）。 */
/** ★重开钩子的**登记面**（`dev-9` 的阻断 RC 的修法②）：钩子留一份**可读引用** ——
 *   判据据此断言「被绑的就是复位本体」，✗ 只能拿源码里的两串共现去猜（那只管「出现过」，
 *   把绑定换成**另一个空函数**照样全绿：本席实测过那条盲区）。 */
const 重开钩子 = [];
const 注册重开钩子 = (fn) => {
	if (typeof fn !== 'function') throw new Error('[babel] 重开钩子须是函数');
	重开钩子.push(fn);
	jQuery(document).on(':enginerestart', fn);
	return fn;
};
const 复位头目 = () => {
	DND3.SleeplessOne.hp = DND3.SleeplessOne.maxHp;
	DND3.SleeplessOne.effects = [];
};
注册重开钩子(复位头目);

setup.BABEL.头目 = Object.assign(setup.BABEL.头目 ?? {}, {
	不眠者: DND3.SleeplessOne,
	抓握: R.items?.['sleepless-grasp'] ?? null,
	复位: 复位头目,                       // ★判据可调（见上：host 桩里没有真 DOM 事件）
	重开钩子, 注册重开钩子,                 // ★登记面（判据断言「被绑的 === 复位本体」）
});
