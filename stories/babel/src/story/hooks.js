/* 巴别之井 · 试玩版 —— 故事侧事件钩子（演示「不改规则包就挂接新系统」，同旧宅 e2e 的 hooks.js）
 *
 * 这里只做**读数的采集**（供试玩终点显示）：
 *   · `battle:end` ⇒ 把玩家此刻持有的创伤记进「本局见过」（施加没有独立事件，见 encounters.js 的说明）
 *   · `item:used`  ⇒ 次数（试玩版只用来确认「道具真的用上了」）
 * ✗ 不改任何判定：全部读数都进 `$babelRun`（纯数据 ⇒ 随存档往返）。
 *
 * ★`#134`（R1-a）**面板同步**：战斗中 HP／创伤／背包不随异步战斗循环更新
 *   （外部评审实测三场全错：HP 13 显示 18/20）—— 根因＝面板唯一填充点是 `:passagedisplay`
 *   （`ui/panels.js`），而**战斗在同段落内异步推进**（`encounters.js` 的 `await …execute()`，
 *   每回合往页底追加按钮）⇒ 段落✗重渲 ⇒ 面板停在开战那一刻的值。
 *   ⇒ 修法（故事层，✗ 动引擎）：订阅引擎**已发**的 `battle:turnEnd`（`core/40-battle.js:52`，
 *     只读·payload 冻结）⇒ 每回合结束刷一次（＝验收的「每次出现选择时 DOM==State」）；
 *     并在 `battle:end` 一并刷（掉落由 `Battle.execute()` 内部结算完 ⇒ 出「继续探索」前已对齐）。
 *   ⚠ `RPG.refreshPanels` 由 `ui/panels.js` 注册（可选调用：该面未落地时静默跳过，与 `noteTraumas` 同形）。
 *   ⚠⚠ 本档**没有** `const R = setup.RPG;`（`R` 是 `ui/panels.js:9`／`world/encounters.js:15` 各自的**局部**形）⇒ 调用前必须写全名 **`RPG.`**：
 *      写 `R.refreshPanels?.()` 会 ReferenceError（`?.` 只护空值，✗ 护**未声明**标识符），且被 `core/40-battle.js` 的
 *      「订阅方抛错一律吞并」吞掉 ⇒ **静默 no-op**（tester-3 实测两处 count 增 0，本笔首版即踩此坑 ⇒ RC）。
 */

const 重建探索 = () => {
	const make = setup.BABEL?.makeExploreScene;
	if (typeof make !== 'function' || !RPG.scenes.has('babel-explore')) return;
	RPG.scenes.delete('babel-explore');
	RPG.registerScene(make());
};

/* 宿主 onLoad 先于实际 State 历史还原；save:ready 中补的旧档缺域会被其后 unmarshal 覆盖。
 * 段落开始时已换成真实存档状态，才再调用同一个幂等补缺／寄存身份预留入口。
 * 这里不做奖励、位置、农田或资格追算，也不把回调存入 State。
 */
$(document).on(':passagestart.babelL10', () => { setup.BABEL.L10?.ensure(); });

/* 回合结束 ⇒ 刷面板（战斗内每次选择前都对齐；✗ 等段落重渲）。 */
RPG.events.on('battle:turnEnd', () => {
	setup.BABEL.记血?.();          // ★⑨：逐回合对齐「最后看到的 HP」（战斗中的伤害在这里被吸收）
	RPG.refreshPanels?.();
});

RPG.events.on('battle:end', () => {
	if (setup.BABEL && typeof setup.BABEL.noteTraumas === 'function') setup.BABEL.noteTraumas();
	RPG.refreshPanels?.();
});

/* ★`books#280` ⑨（操作者亲测 · 0.0.2 阻塞）：**治疗反馈 ＋ HP 实时刷新** —— 三路同口径。
 *
 *   勘察结论（关键）：三条路（① 战斗面板的选单／② 背包**战外**使用／③ 背包**战中提交**）
 *   **最终都走引擎的 `RPG.act`**（统一入口 `#1752`）⇒ 都发同一个 `item:used`（引擎 `30-inventory.js`）。
 *   ⇒ 本档**一处钩子**即覆盖三路（✗ 三处补丁：那会随某一路演化而漂，正是本舰队反复吃过的那种账）。
 *
 *   ① 反馈：把 `HP X → Y` 印在**使用反馈**里（只在 HP **升高**时印＝治疗；满血被引擎按设计拒 ⇒ 不印）。
 *   ② 刷新：同一次里 `refreshPanels(['hp'])` ⇒ **页脚立刻变**（✗ 等段落重渲 —— 那正是 ⑨ 报的「不随用刷新」）。
 *   ⚠「前值」＝玩家**最后看到**的那个数（`:passagedisplay`／`battle:start`／`battle:turnEnd` 各记一次）——
 *     ✗ 拿不到「治疗前的真值」：`item:used` 在动作**之后**发，payload 里没有前后值（引擎侧只带 `id/name/action`）。 */
const 血知 = { 值: null };
/* ⚠ **装载序**：本档（`src/story/hooks.js`）**先于** `src/world/babel.js` 装载（按路径排序）⇒ 此刻
 *   `setup.BABEL` 还没建 ⇒ 这里**先自建空壳**再挂；`world/babel.js:1009` 是
 *   `Object.assign(setup.BABEL ?? {}, {…})` ⇒ **会合并进来**（✗ 不是覆盖）⇒ 这样挂是安全的。
 *   （本席实测：不先建壳 ⇒ `Cannot set properties of undefined` ⇒ 整个用户脚本束崩 ⇒ verify 立即具名报出。） */
setup.BABEL = setup.BABEL ?? {};
/** 记「玩家最后看到的 HP」（⑨ 的「前值」来源；那些调用点都在**任何一次使用之前**）。 */
setup.BABEL.记血 = () => { 血知.值 = setup.DND3.Player.hp; };

RPG.events.on('item:used', (e) => {
	if (e.action && e.action !== 'use') return;
	const r = State.variables.babelRun;
	if (r) r.itemsUsed = (r.itemsUsed ?? 0) + 1;
	/* ① 治疗反馈（只报升高）＋ ② 页脚就地刷 —— 两件都只在这里做一处（三路共用）。 */
	const 后 = setup.DND3.Player.hp;
	const 前 = 血知.值;
	if (前 != null && 后 > 前) RPG.perform(`${e.name ?? e.id}：HP ${前} → ${后}`);
	血知.值 = 后;
	if (typeof RPG.refreshPanels === 'function' && RPG.panels?.has?.('hp')) RPG.refreshPanels(['hp']);
	// 卷轴的次数已由 act 提交，才可新建段落；在 used() 内导航会提前复制未扣的库存。
	if (e.id === setup.BABEL.回城卷轴 && setup.BABEL.map?.current === setup.BABEL.聚落) {
		重建探索();
		SugarCube.Engine.play('探索');
	}
});

/* ★⑨：进战斗时把「最后看到的 HP」对齐（战斗中伤害由 `battle:turnEnd` 逐回合对齐）。 */
RPG.events.on('battle:start', () => { setup.BABEL.记血?.(); });

/* ---------- ★`books#136`（F4）：读档 ⇒ 换一个「探索」场景实例（⇒ 场景头重印）----------
 *
 * 病灶：地图的**场景头**（【层名】＋desc）只在「进场」时印一次 —— 判据在引擎 `MapScene` 里比较
 *   `map.current !== #headerLoc`（`src/core/60-map.js`）。`#headerLoc` 是**实例私有字段**
 *   （故事侧不可达），而 `map.current` 住在**存档**里 ⇒ **同地点读档**（存档处＝最后一次印头的地点）
 *   时两者相等 ⇒ 读档后屏幕上**只有选项、没有地点名与描述**（`#136` F4）。
 *
 * 修法：读档这一「进场」路径上**换一个新实例**（其私有缓存天然归零）⇒ 场景头重印。
 *   · 工厂＝`world/babel.js` 的 `setup.BABEL.makeExploreScene`（与**注册处同源** ⇒ ✗ 两处字面量）
 *   · 先 `delete` 再 `registerScene`：直接重复注册会被引擎打「重复注册：将被覆盖」告警
 *     （`core/50-scene.js`）—— 那是给**误注册**的信号，而此处是**有意替换** ⇒ 先把旧条目撤下。
 *
 * ⚠ 取宿主走 `SugarCube.Save` 回落 `globalThis.Save`：与引擎 `core/80-save.js` 的 `install()` 同形。
 *   ★**`Save` 裸名在本产物里是 `undefined`**（本席实测，jsdom 与无头两侧同）⇒ ✗ 写裸 `Save.onLoad`。
 * ⚠ 只做「重注册」，**不读存档内容**：存档裁决与还原仍归引擎那条 onLoad（先注册）⇒ 两者无耦合。
 * ⚠ 能力探测：装配未就绪（工厂缺席）或场景不在册（id 改名）⇒ 静默跳过（与 `refreshPanels?.` 同形）；
 *   这两种缺口由 `verify.mjs` 的㉑格机械断（读档后场景头须重印）。 */
{
	const SC = globalThis.SugarCube ?? globalThis;
	const saveFace = SC?.Save ?? globalThis.Save;
	saveFace?.onLoad?.add?.(() => {
		/* ★`books#209` ②（F-01）：读档 ⇒ **敌情栏的模块态归零**。
		 *   病灶：敌面板读的是 `ui/battle.js` 里两个**不进存档**的量（`当前战斗`／`已见`）
		 *   ⇒ 读档后世界换了，屏上还是上一场的敌情（writer 实测「载入变野猪第 1 回合 ＋
		 *   敌情栏残留 19/22」）。本席已在真产物里复现过（真`Save.slots.load` 后面板仍印旧敌）。
		 *   ★与本订阅里下面的场景重注册**同一处收尾**（两件都是「读档＝换一个世界」的尾巴）
		 *     —— 顺序无耦合；✗ 别把它挂到 `:passagedisplay`（那每段都跑，卡手）。
		 *   ⚠ 能力探测：`ui/battle.js` 未落地那么本面缺席 ⇒ 静默跳过
		 *     （与 `refreshPanels?.`／下面 `makeExploreScene` 的探测同形）。 */
		setup.BABEL?.敌情栏重置?.();
		重建探索();
	});
}

