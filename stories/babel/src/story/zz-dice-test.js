/* 巴别之井 · **开发测试模式**：按用途指定原始骰面（`books#415` ／ A4）
 *
 * 契约（本席规格交付＝`books#415` 评论 `6016859133`，四项候裁经领队照荐批）：
 *   · **只定「原始骰面」**：正式加值／DC／伤害／重击确认一律照走 ⇒ **指定 20 也可能失败** ✓；
 *   · ✗ 把单位随机钉到 1；✗ 写成功位；✗ 绕正式数学（票面明文）；
 *   · **收据透传**：`未覆盖` 非空 ⇒ **未生效** ⇒ 调用方须显示「**未生效**」（✗ 显示「已生效」）。
 *
 * 引擎来源：`sgstory#2031`（PR `sgstory#2042`）的 `RPG.diceControl`。本档是**薄壳**，✗ 自造骰机、
 *   ✗ 自己记账（额度账／骰序账／截断标记／底层计数**全在引擎**，故事侧只读）。
 * 会话口径：`'babel-test'` —— 故事侧**稳定号**（A1 裁 4：✗ 自增／✗ 时间戳／✗ 读档后归零的模块计数）。
 *
 * ## 生命周期（A4 §三）
 *   · **读档** ⇒ `清()`（本档订阅宿主 `onLoad`，见文件末）；
 *   · **死亡／新局** ⇒ ✗ 本档订阅（那是**段落跳转**）：`story/play.twee` 的「读档」链**内联**先清一道；
 *     而「重开」＝`Engine.restart()`＝**重载页面** ⇒ 控制随模块内存一起消失（天然 ✓，✗ 另加调用）。
 *   ★为何读档必须清：本档的控制住在**模块内存**里，而读档**不重载页面** ⇒ ✗ 清则上一局的臂会
 *     **跨存档**继续生效（＝「泄漏正式局」的一种，A4 验收第 3 条 ✗ 允许）。
 *
 * ## 已知「未接入」调用点登记（`dev-10` 复核建议①，随本笔带）
 *   口径：该处**消费随机但 ✗ 带 `purpose`** ⇒ 引擎账上记 `未接入`（✗ 可被测试骰控制）。
 *   · `src/world/00-seven-names.js` 的 `掷检定`（自制属性检定：`d20 ＋ 属性修正 ＋ 本次修正 ≥ DC`）
 *     —— **✗ 传 `purpose`** ⇒ 现档**照常走真随机**并记「未接入」；
 *   · `src/world/babel.js` 的两处 `RPG.rng.index`（洗牌／抽签）与 `src/world/hazards.js` 的 `R.rng.index`
 *     （触发格）—— 属**非骰**随机消费，本就不在「骰点用途」之列；登记在此，免得被误读成「随手漏标」。
 *   ★登记**✗ 等于**承诺接入：要不要给 `掷检定` 一个用途（如 `check.skill`／`check.ability`），
 *     属**接口裁定**（引擎侧 `check.skill` 至今**无标准技能面** ⇒ 已如实登在引擎的未覆盖册里）。
 *
 * ## `报告()` 的读数口径（`dev-10` 复核建议②，随本笔带）
 *   `截断.留存范围 ＝ [首序, 末序]`，`序` 是**该窗口内**的单调序（`清账()` 后从 1 重新起算 ⇒
 *   **✗ 全局计数**）。要复算：窗口内第 N 条 ⇒ `序 ＝ N`；被丢掉的总数看 `截断.已丢`。
 *   `清账()` 只清**读数**（账／丢账／序／底层计数），**✗ 动控制面** —— 撤控制走 `清()`（＝`clearAll`）。
 */
(function () {
	'use strict';

	/** 测试会话 id（稳定号；见文件首注释）。 */
	const 会话id = 'babel-test';

	setup.BABEL = setup.BABEL ?? {};

	/** 取引擎控制面（✗ 存在即用；缺 ⇒ 具名抛，✗ 静默假绿）。 */
	const 控 = () => (typeof RPG !== 'undefined' ? RPG.diceControl : null);

	/**
	 * 装一组控制 ⇒ **透传收据**，并现算 `生效`。
	 * @param {{purpose: string, faces: number[], times?: number[], sides?: number,
	 *   actor?: string, instance?: string, 物?: string, slot?: number, 组?: number}} spec
	 * @returns {object} 引擎收据 ＋ `生效`
	 */
	function 装(spec) {
		const c = 控();
		if (!c) throw new Error('测试骰：引擎缺 `RPG.diceControl`（需 sagitrs/sgstory#2031 的能力；见 books#415 前置）');
		c.会话(会话id);
		const 收据 = c.arm(spec);
		/* 引擎收据形（`sgstory#2031`）：`未覆盖` 是**布尔** —— `true` ＝「该 `purpose` **不在接入表**」
		 *   ⇒ 配了也**不会生效**（引擎侧另有 `报告().未覆盖` 给**逐条**清单）。故此处**直接取反**，
		 *   ✗ 自己发明第二套口径；✗ 有收据却缺该字段时**当已生效**。 */
		return Object.assign({}, 收据, { 生效: 收据?.未覆盖 !== true });
	}

	/** 清本测试会话的全部控制与场次。@returns {number} 清掉的条数（**未知会话 ⇒ 0**，✗ 清别人）。 */
	function 清() { const c = 控(); return c ? c.clearAll(会话id) : 0; }

	/** 三账读数（额度账／骰序账＋截断／底层计数／未消费／接入表／未覆盖）。缺引擎 ⇒ `null`。 */
	function 读() { const c = 控(); if (!c) return null; c.会话(会话id); return c.报告(); }

	setup.BABEL.测试骰 = { 装, 清, 读, 会话id };

	/* 读档 ⇒ 清（订阅宿主 `onLoad`；取宿主与 `story/hooks.js` 同形 ——
	 * ★`Save` **裸名**在本产物里是 `undefined`（既有的实测结论，jsdom 与无头两侧同））。 */
	const 宿主 = (typeof SugarCube !== 'undefined' && SugarCube.Save) || globalThis.Save;
	宿主?.onLoad?.add?.(() => { 清(); });
})();
