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

/* 回合结束 ⇒ 刷面板（战斗内每次选择前都对齐；✗ 等段落重渲）。 */
RPG.events.on('battle:turnEnd', () => {
	RPG.refreshPanels?.();
});

RPG.events.on('battle:end', () => {
	if (setup.BABEL && typeof setup.BABEL.noteTraumas === 'function') setup.BABEL.noteTraumas();
	RPG.refreshPanels?.();
});

RPG.events.on('item:used', (e) => {
	if (e.action && e.action !== 'use') return;
	const r = State.variables.babelRun;
	if (r) r.itemsUsed = (r.itemsUsed ?? 0) + 1;
});

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
		const make = setup.BABEL?.makeExploreScene;
		if (typeof make !== 'function' || !RPG.scenes.has('babel-explore')) return;
		RPG.scenes.delete('babel-explore');
		RPG.registerScene(make());
	});
}

