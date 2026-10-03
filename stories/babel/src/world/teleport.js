/* `books#178` 件 2 —— **传送道具（单向回城 · 购买）** · 故事侧装配 · 零引擎改动
 *
 * 票面规格（`#178`）：道具「回城卷轴」类，使用 ⇒ 传送至 L10 城镇层；**亦可步行**（回边照旧）；
 *   购买面走城镇商店／营火交易，**经济数值占位**且判据**钉表位置**。
 *
 * ★**落点取「步行路线的同一个落点」**（`L10-camp`）：地图既有边是 `L9 → L10-camp`（前进）
 *   与 `L10-camp → L9`（退回）⇒ 两条路**汇于一处**。若另选一处落点，两臂就不再是同一目的地，
 *   「亦可步行」的对照也就失去意义（本席按票面「传送至 L10 城镇层」与「亦可步行」并读）。
 * ★**购买面取「营火交易」**（票面给了「城镇商店／营火交易」两形，本笔取后者）：地点是引擎侧
 *   的 `L10-camp`「大空洞·营火」（`span1-hub.js`），故本档只**挂动作**，✗ 改引擎。
 * ★载入序：本档排在 `babel.js` **之后**（`b` < `t`）⇒ 挂动作时地图已建好，可直接取地点。
 */

const DND3 = setup.DND3;
const R = setup.RPG;

/** 回城落点（＝步行落点）。★只此一处 —— 改聚落只改这里。 */
const 聚落 = 'L10-camp';
setup.BABEL.聚落 = 聚落;

/** 回城卷轴的道具 id。★只此一处。 */
const 卷轴 = 'return-scroll';
setup.BABEL.回城卷轴 = 卷轴;

/* ══ **集市价目表**（票面：经济数值**占位** ＋ 判据**钉表位置**）══════════════════════
 * ★数值**只在本表出现一次**：文案里的价由本表取，扣钱也由本表取 ⇒ 改价改一处。
 *   判据据此断言「全档只有一处写着这个数」（见 `verify.mjs` 的同源格）。 */
const 商铺价 = Object.freeze({ [卷轴]: 30 });
setup.BABEL.商铺价 = 商铺价;

/** 数玩家手上的件数（计数形道具的 `charges` 即数量；同形见 `world/tools.js` 的持工具）。 */
const 手上有 = (id) => (State.variables.inventory ?? [])
	.filter((s) => s?.id === id)
	.reduce((n, s) => n + (Number(s.charges) || 0), 0);
setup.BABEL.手上有 = 手上有;

/* ══ 道具本体 ═══════════════════════════════════════════════════════════════════════
 * ★**消耗由引擎负责**：`useItem` 在 `action === 'use'` 且 `charges != null` 时自减 1，
 *   归零后由 `act` 移除槽 ⇒ 本档**不自己扣**（两处都扣就会扣两次）。
 * ★**拒的形**：`return false` ＝ 引擎认的「零副作用软拒」（`useItem` 据 `=== false` 判）；
 *   引擎另有一形 `throw RPG.refuse(code, msg)`，用在「从根本上不能用」，本笔✗ 用它 ——
 *   玩家站在聚落里再撕一张卷轴只是**浪费**，不是用法错误，给一句可读话即可。 */
DND3.ReturnScroll = R.defItem({
	id: 卷轴,
	name: '回城卷轴',
	desc: '一张画着井口与灯火的旧卷轴。撕开它，脚下的路会把你直接送回聚落。',
	charges: 1,
	used(that, from) {
		const m = setup.BABEL.map;
		if (m?.current === 聚落) {
			this.perform('你已经在聚落的营火边了 —— 这张卷轴留着走远了再用。');
			return false;                       // ★零副作用（`charges` 不写回）
		}
		m?.moveTo?.(聚落);
		this.perform('卷轴在指间烧成灰。再睁眼，是营火的味道。');
	},
});

/** **买一件**（营火交易）。★扣钱与给货**同笔**：钱不够则什么都不发生（✗ 半买）。 */
setup.BABEL.买 = (id) => {
	const 价 = 商铺价[id];
	if (价 == null) return false;               // 表里没有 ⇒ 不卖（✗ 猜价）
	const 有 = 手上有('coin');
	if (有 < 价) {
		R.perform(`旧硬币不够 —— 还差 ${价 - 有} 枚。`);
		return false;
	}
	R.take('coin', 价);
	R.give(id);
	R.perform(`你数出 ${价} 枚旧硬币，换回一张回城卷轴。`);
	return true;
};

/* ══ 把「营火交易」挂到聚落（保留既有动作 —— ✗ 覆盖别人的表）════════════════════ */
{
	const 地点 = setup.BABEL.map?.locations?.get?.(聚落);
	if (地点 && Array.isArray(地点.actions)) {
		/* ★**必须过 `只给活人`**：本动作挂在**引擎侧地点**上，绕不过 `babel.js` 的
		 *   `.map(只给活人)` ⇒ 若不取那道闸门，终局后 hub 仍会给玩家这个按钮
		 *   （★本笔首跑就被既有判据「臂4 hub」抓到，实得 1 条）。
		 *   ⚠ 闸门缺席时**宁可不挂**（✗ 挂一个绕过规则的）—— 出声告知。 */
		const 闸 = setup.BABEL.只给活人;
		if (typeof 闸 !== 'function') {
			console.warn('[BABEL] `只给活人` 闸门缺席 —— 营火交易不挂（避免终局后仍给动作）。');
		} else {
			地点.actions.push(闸({
				text: () => `在营火边换一张回城卷轴（${商铺价[卷轴]} 枚旧硬币）`,
				when: () => typeof setup.BABEL.买 === 'function' && !setup.BABEL.战中,
				action: () => setup.BABEL.买(卷轴),
			}));
		}
	} else {
		console.warn('[BABEL] 聚落地点缺席或没有动作表 —— 营火交易未挂上（请用侧栏的存档入口外的手段买）。');
	}
}
