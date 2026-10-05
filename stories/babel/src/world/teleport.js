/* books#178／#314：付费回城卷轴。#259 已批准卷轴例外；塔下行步行边不恢复。
 * 传送与 L9 前进步行同落 L10-camp；不复制事件／资源，不复活真死者。
 * 购买复用 L10 候选目录和 RPG.exchange，不另写一套扣钱发货逻辑。
 */
const DND3 = setup.DND3, R = setup.RPG, B = setup.BABEL;
const 聚落 = 'L10-camp', 卷轴 = 'return-scroll';
B.聚落 = 聚落;
B.回城卷轴 = 卷轴;
B.商铺价 = B.L10.cfg.buy;
B.手上有 = (id) => R.heldTotal(DND3.Player, id) ?? 0;
B.买 = (id) => B.L10.buy(id);

DND3.ReturnScroll = R.defItem({
	id: 卷轴, name: '回城卷轴',
	desc: '撕开后回到第 10 层共炉。付费返程不会恢复已经取走的资源或重发事件奖励。',
	charges: 1,
	used() {
		if (!B.L10.alive() || B.战中) {
			this.perform('终局、死亡或战斗中不能用这张返程卷轴。');
			return false;
		}
		if (B.map?.current === 聚落) {
			this.perform('你已经在聚落的共炉边了；这张卷轴留着走远了再用。');
			return false;
		}
		if (!B.map?.locations.has(聚落)) return false;
		B.map.moveTo(聚落);
		this.perform('卷轴烧成灰。再睁眼，是共炉的灯火。次数只由引擎扣除。');
	},
});
// 保留旧营火购买入口和稳定 ID；正式补给目录在配给屋，卷轴两处均证前可买。
B.map.locations.get(聚落).actions.push(B.只给活人({
	text: () => `在共炉边换一张回城卷轴（${B.商铺价[卷轴]} 枚旧硬币；候选）`,
	when: () => !B.战中, action: () => B.买(卷轴),
}));
