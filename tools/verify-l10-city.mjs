/* books#314：L10 装配验收；夹具不是平衡读数或作者批准。所有组自设前置并还原。 */
export async function verifyL10({ R, D, B, map, ok, head }) {
head('L10 最简城市：交易、资格、服务、迁移与独立终局');
{
	const C = B.L10, saved = JSON.parse(JSON.stringify(State.variables));
	const original = { choice: R.choice, play: SugarCube.Engine.play, deposit: R.deposit };
	const jumps = [], menus = []; let selection = 'cancel';
	const reset = (loc = C.locations.hearth) => {
		State.variables.player = { name: 'L10 夹具', hp: 20, maxHp: 20,
			stats: D.stats({ ac: 12, str: 12, dex: 12, heal_bonus: 0 }), effects: [], nonlethal: 0 };
		State.variables.inventory = [];
		State.variables.babelRun = { deaths: 0, kills: 0, gathered: 0, harvests: 0, traumasSeen: [], deepest: 'L1', 终局: false, 时间: 0 };
		State.variables.babelL10 = { sold: 0, resident: false }; State.variables.babelL10Storage = [];
		State.variables.span1Farms = 0; State.variables.span1Harvests = 0;
		B.战中 = false; map.moveTo(loc); menus.length = 0; jumps.length = 0;
	};
	const economy = () => JSON.stringify({ inventory: D.Player.items, city: C.state(), storage: State.variables.babelL10Storage, time: B.时间账() });
	const amount = (id) => R.heldTotal(D.Player, id) ?? 0;
	try {
		R.choice = (opts) => { menus.push(opts); return Promise.resolve(selection); };
		SugarCube.Engine.play = (p) => jumps.push(p);
		reset();
		ok(C.cfg.status === 'candidate', 'L10 参数未标候选');
		ok(Object.keys(C.state()).sort().join() === 'resident,sold', '新增城市主进度超过两项');
		const template = C.build();
		for (const id of Object.values(C.locations)) {
			const actual = map.locations.get(id), expected = template.locations.get(id);
			ok(actual != null, `五处建筑缺 ${id}`);
			ok(actual?.name === expected?.name && actual?.desc === expected?.desc,
				`城市 ${id} 的名称／描述未来自故事 L10 模板`);
			if (id !== C.locations.hearth) ok(map.exitsFrom(C.locations.hearth).some((e) => e.to === id), `证前不可进 ${id}`);
		}
		for (const id of new Set([...Object.keys(C.cfg.buy), ...Object.keys(C.cfg.sell)]))
			ok(R.items.has(id), `候选目录缺注册定义 ${id}`);
		ok(Object.keys(C.cfg.sell).every((id) => !Object.hasOwn(C.cfg.buy, id)), '卖同类原料可循环刷贡献');

		reset(C.locations.ration);
		const farmLabel = '收获旧档已有农田（兼容收尾，不计资格）';
		const farmLocation = map.locations.get(C.locations.ration);
		const farmVisible = () => farmLocation.availableActions.some((a) => a.text === farmLabel);
		const farmAction = farmLocation.actions.find((a) => a.text === farmLabel);
		ok(!farmVisible(), '没有旧田仍显示兼容收尾');
		State.variables.span1Farms = 2;
		R.deposit(D.Player.items, 'wood'); R.deposit(D.Player.items, 'coin', 7);
		const farmUnrelated = () => JSON.stringify({ city: C.state(), storage: State.variables.babelL10Storage,
			otherItems: D.Player.items.filter((s) => s.id !== 'ration'), time: B.时间账() });
		const unrelatedBefore = farmUnrelated();
		ok(farmVisible(), '旧档有田，证前兼容收尾菜单不可见');
		// 可见性另判；直接调用原动作也要判，以免死守卫遮住错误 actor 的丢田路径。
		ok(farmAction?.action() === true, '旧田收尾未成功投递口粮');
		ok(State.variables.span1Farms === 0 && State.variables.span1Harvests === 2 && amount('ration') === 2,
			'旧田未一次收空／记收成／向玩家投递对应口粮');
		ok(farmUnrelated() === unrelatedBefore, '旧田收尾改贡献／资格／寄存／其他原件或时间');
		ok(!farmVisible(), '旧田收完仍显示兼容收尾');
		const harvested = () => JSON.stringify({ economy: economy(), farms: State.variables.span1Farms,
			harvests: State.variables.span1Harvests });
		const harvestedBefore = harvested();
		ok(farmAction?.action() === false && harvested() === harvestedBefore, '旧田收尾重复发粮／记收成或改变经济');

		reset(C.locations.ration); R.deposit(D.Player.items, 'wood', 10);
		let before = economy(); ok(C.sell('bandage', 1) === false && economy() === before, '药品错误计入贡献');
		before = economy(); ok(C.sell('wood', 11) === false && economy() === before, '资源不足半结算');
		for (const n of [4, 3, 3]) ok(C.sell('wood', n) === true, '有效资源交易失败');
		ok(C.state().sold === 10 * C.cfg.sell.wood && amount('wood') === 0, '资源未扣或重复贡献');
		const sold = C.state().sold, coins = amount('coin');
		ok(C.buy('return-scroll') === true, '证前不能买合法返程用品');
		ok(amount('coin') === coins - C.cfg.buy['return-scroll'] && C.state().sold === sold, '消费倒扣贡献或价表不同源');
		map.moveTo(C.locations.registry); const bagBefore = JSON.stringify(D.Player.items);
		ok(C.certify() === true && C.state().resident, '达门槛未免费领证');
		ok(C.certify() === false && JSON.stringify(D.Player.items) === bagBefore, '重复领证发奖／扣款');
		map.moveTo(C.locations.ration); R.withdraw(D.Player.items, 'coin', amount('coin'));
		before = economy(); ok(C.buy('bandage') === false && economy() === before, '没钱购买半结算');
		ok(C.state().resident && C.state().sold === sold, '消费或贫困吊销资格');

		reset(); D.Player.hp = 3; D.Player.nonlethal = 25; D.Player.gain('fracture');
		ok(map.locations.get(C.locations.hearth).availableActions.some((a) => a.recovery === true), '非致命倒下的保底恢复不可达');
		ok(B.结算战败({ 源: 'L10夹具' }).reason === '非致命倒下' && !State.variables.babelRun.终局, '非致命倒下被死亡结算');
		ok(C.rest() === true && D.Player.hp === Math.ceil(D.Player.maxHp / 2), '证前保底恢复错误');
		ok(D.Player.contains('fracture') && D.Player.hp < D.Player.maxHp && D.Player.nonlethal === 15, '休整清创伤／全回满／非致命量错误');
		ok(B.时间账() === C.cfg.restMinutes, '休整时间未记');
		reset(C.locations.infirmary); D.Player.hp = 10; R.deposit(D.Player.items, 'coin', 100);
		before = economy(); ok(C.clinic() === false && economy() === before, '未持证提前付费照护');
		C.state().resident = true; D.Player.gain('fracture'); const hp = D.Player.hp;
		ok(C.clinic() === true && D.Player.hp === hp + C.cfg.clinicHeal && D.Player.contains('fracture'), '照护误清创伤或未恢复');
		D.Player.hp = 0; before = economy(); ok(C.clinic() === false && economy() === before, '真死仍能付费恢复');

		reset(C.locations.workshop); C.state().resident = true; R.deposit(D.Player.items, 'coin', 100);
		R.deposit(D.Player.items, 'pick', 2);
		const picks = D.Player.items.filter((s) => s.id === 'pick');
		picks[0].charges = 2; picks[1].charges = 4; const first = picks[0].entityId, second = picks[1].entityId;
		ok(first !== second, '两件工具身份相同');
		ok(C.repair(first) === true && D.Player.items.find((s) => s.entityId === first).charges === B.工具.TOOL_CHARGES
			&& D.Player.items.find((s) => s.entityId === second).charges === 4, '修理串到别件或未按身份选择');
		map.moveTo(C.locations.hearth);
		ok(C.store(second) === true && State.variables.babelL10Storage[0].charges === 4
			&& State.variables.babelL10Storage[0].entityId === second, '寄存回满耐久或重发身份');
		ok(C.store(second, true) === true && D.Player.items.find((s) => s.entityId === second).charges === 4, '取回造新物品／回满');
		D.Player.items.find((s) => s.entityId === second).equipped = true;
		before = economy(); ok(C.store(second) === false && economy() === before, '仍装备着也寄存');
		D.Player.items.find((s) => s.entityId === second).equipped = false;
		before = economy(); R.deposit = () => 0;
		ok(C.store(second) === false && economy() === before, '寄存投递拒绝仍扣原件'); R.deposit = original.deposit;

		reset(); C.state().resident = true; R.deposit(D.Player.items, 'bandage');
		const moved = { ...D.Player.items[0] }, stored = { ...R.createItem('bandage').toJSON(), charges: 1, equipped: false, marker: '原寄存件' };
		State.variables.babelL10Storage.push(stored);
		const storedBefore = JSON.stringify(stored);
		ok(C.store(moved.entityId) === true && State.variables.babelL10Storage.length === 2
			&& State.variables.babelL10Storage.some((s) => s.entityId === moved.entityId && s.charges === moved.charges)
			&& JSON.stringify(State.variables.babelL10Storage.find((s) => s.entityId === stored.entityId)) === storedBefore,
			'堆叠物寄存合并原件／覆盖目标原有身份、充能或顶层状态');
		R.deposit(D.Player.items, 'bandage'); const receiving = { ...D.Player.items[0] };
		ok(C.store(moved.entityId, true) === true && D.Player.items.length === 2
			&& D.Player.items.some((s) => s.entityId === moved.entityId && s.charges === moved.charges)
			&& JSON.stringify(D.Player.items.find((s) => s.entityId === receiving.entityId)) === JSON.stringify(receiving)
			&& State.variables.babelL10Storage.length === 1 && JSON.stringify(State.variables.babelL10Storage[0]) === storedBefore
			&& C.state().sold === 0 && B.时间账() === 0, '堆叠物取回合并、增贡献／时间或改了留存原件');
		before = economy(); let brokenDelivery = false;
		R.deposit = (bag, id, n, snapshot) => { bag.push({ ...snapshot, entityId: 'forged' }); return snapshot.charges; };
		try { C.store(moved.entityId); } catch (e) { brokenDelivery = e.message.includes('寄存投递破坏原件'); }
		ok(brokenDelivery && economy() === before, '投递破坏身份未抛程序异常或两袋半提交'); R.deposit = original.deposit;

		reset(); State.variables.span1Farms = 1; delete State.variables.babelL10; delete State.variables.babelL10Storage;
		R.events.emit('save:ready', {});
		ok(C.state().sold === 0 && !C.state().resident && State.variables.span1Farms === 1
			&& Array.isArray(State.variables.babelL10Storage), '旧档补域追奖／清田／未迁移');
		const domains = R.save.envelope().domains;
		ok(domains.includes('babelL10') && domains.includes('babelL10Storage'), '新域未进信封');

		reset(); State.variables.span1Farms = 1; R.deposit(D.Player.items, 'bandage'); const hpBefore = D.Player.hp;
		C.chooseEnding('enslaved'); await C.menu('enslaved');
		ok(!State.variables.babelRun.终局 && !jumps.includes('失去自由'), '第一次取消就终局');
		selection = '0'; C.chooseEnding('enslaved'); await C.menu('enslaved');
		selection = 'cancel'; await C.menu('enslaved', true);
		ok(!State.variables.babelRun.终局, '最终确认取消仍终局');
		selection = '0'; C.chooseEnding('enslaved'); await C.menu('enslaved'); await C.menu('enslaved', true);
		ok(menus.every((opts) => opts.every((o) => typeof o.value === 'string')), '菜单违反真实 choice 的 text/value 契约');
		ok(State.variables.babelRun.终局类型 === 'enslaved' && jumps.at(-1) === '失去自由'
			&& D.Player.hp === hpBefore && !D.Player.contains('death') && State.variables.babelRun.deaths === 0, '自由终局伪装死亡／复活');
		const openLocations = [...map.locations.values()].filter((l) => l.availableActions.length > 0).map((l) => l.id);
		ok(openLocations.length === 0 && [...map.locations.keys()].every((id) => map.exitsFrom(id).length === 0),
			`自由终局后仍能操作地图（动作残留 ${openLocations.join()}）`);
		ok(!R.bagHTML().includes('rpg-item-link') && !R.panels.get('inventory').render().includes('rpg-item-link'), '终局背包仍可使用');
		ok(R.bagSubmit('bandage')?.reason === 'run-ended', '终局战斗提交入口仍可使用道具');
		ok(C.chooseEnding('enslaved') === false && jumps.filter((p) => p === '失去自由').length === 1, '终局重复结算');
		reset(); C.state().resident = true; C.chooseEnding('settled'); await C.menu('settled'); await C.menu('settled', true);
		ok(jumps.at(-1) === '留在共炉' && State.variables.babelRun.终局类型 === 'settled'
			&& D.Player.hp === 20 && !D.Player.contains('death'), '正常留居被当成死亡／奴役');
		reset('L10-gate');
		ok(map.exitsFrom('L10-gate').some((e) => e.to === 'L11' || e.to === 'W09')  /* ★books#397 裁 (b)：首次出城分流到 W09 ⇒ 两者皆算「能出发」✓ */, '证前不能再次出发');
		ok(!map.exits.some((e) => e.from === C.locations.hearth && e.to === 'L9'), '恢复塔向下步行边');
		map.moveTo('L19'); B.记战果('L19', 'victory');
		ok(map.exitsFrom('L19').some((e) => e.to === 'L20-forge'), 'L19 新增居民证门或旧头目门漂移');
		console.log('  候选目录、五入口及模板来源、原子交易、两项进度、保底休整、单件修理／寄存、旧田收尾、旧档与两终局分别已断言；不是收益／平衡验收。');
	} finally {
		R.choice = original.choice; SugarCube.Engine.play = original.play; R.deposit = original.deposit;
		for (const key of Object.keys(State.variables)) delete State.variables[key]; Object.assign(State.variables, saved);
	}
}
}
