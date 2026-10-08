/* books#314：L10 最简城市。故事侧管目录、资格与剧情；库存交换归 RPG.exchange。
 * 全表是候选默认值，不是作者逐项批准或平衡结论。世界制度不扩成地产／贷款模拟。
 * 装载早于 babel.js；所有依赖地图／工具的读取均在动作执行时发生。
 */
const R = setup.RPG, D = setup.DND3;
const B = (setup.BABEL ??= {});
const cfg = Object.freeze({
	status: 'candidate', threshold: 80,
	buy: Object.freeze({ 'return-scroll': 30, ration: 3, bandage: 8, 'herb-poultice': 12,
		sword: 35, mail: 60, pick: 15, axe: 15, shovel: 15 }),
	sell: Object.freeze({ wood: 8, rock: 6, 'copper-ore': 12, seed: 4 }),
	restMinutes: 120, clinicPrice: 8, clinicHeal: 4, careMinutes: 30, traumaPrice: 6, traumaMod: 4, repairPrice: 5,
});
const locations = Object.freeze({ hearth: 'L10-camp', ration: 'L10-settlement',
	registry: 'L10-registry', workshop: 'L10-workshop', infirmary: 'L10-infirmary' });
const alive = () => D.Player?.hp > 0 && !D.Player.contains('death') && !State.variables.babelRun?.终局;
const resident = () => State.variables.babelL10?.resident === true;
const state = () => {
	const s = (State.variables.babelL10 ??= { sold: 0, resident: false });
	if (!Number.isSafeInteger(s.sold) || s.sold < 0) throw new Error('[L10] 无效累计成交额');
	if (typeof s.resident !== 'boolean') throw new Error('[L10] 无效居民资格');
	return s;
};
const at = (id) => alive() && !B.战中 && B.map?.current === id;
const permit = (id, certificate = false) => at(id) && (!certificate || resident());
/* ★`books#206`：时间账的**唯一写家**在 `00-clock-town.js`（`B.时钟`）⇒ 本处改为**委派**
 *   —— 原先本档与 `babel.js` 各写一遍 `babelRun.时间` ⇒ 一个量两个实现（本仓已记的坑）。
 *   ★本档早于 `babel.js`、晚于 `00-clock-town.js` 装载 ⇒ 装载期即有 `B.时钟`（缺失即具名抛错）。 */
const 时钟 = setup.BABEL.时钟;
if (!时钟) throw new Error('[00-l10-city.js] 未见 B.时钟 —— 00-clock-town.js 没被装载？');
const time = (n) => 时钟.记时间(n);
const refresh = () => { B.记血?.(); R.refreshPanels?.(); };
const pay = (n) => R.exchange(D.Player, { take: [{ id: 'coin', n }] }).status === 'applied';
const reject = (text) => { R.perform(text); return false; };

const sell = (id, n = 1) => {
	if (!permit(locations.ration)) return false;
	/* ★禁售（`books#398` 裁 P：价格与不可售**分开**）：`rain-diadem` **不在收购目录**（下方 `cfg.sell[id]`
	 *   本就会拒）；此处**再**给一条**具名拒** —— ★位置在 `R.exchange`（扣物/付币/记贡献）**之前** ✓
	 *   ⇒ 即便目录哪天误收它，这条仍兜住 ✓。✗ 不用无人消费的 `noSell` 字段冒充 ✓、✗ 不为它新造货币业务 ✓。 */
	if (id === 'rain-diadem') return reject('听雨之冠是渡工给的报酬，这里不收。');
	const price = cfg.sell[id];
	if (!price || !Number.isSafeInteger(n) || n <= 0) return reject('这里只收目录上的资源，数量须为正整数。');
	const value = price * n, s = state();
	if (!Number.isSafeInteger(value) || !Number.isSafeInteger(s.sold + value)) return false;
	const r = R.exchange(D.Player, { take: [{ id, n }], give: [{ id: 'coin', n: value }] });
	if (r.status !== 'applied') return reject('资源不够或交易未完成；没有扣物、付钱或增加资格进度。');
	s.sold += value;
	R.perform(`出售 ${n} 份${R.createItem(id).name}，收到 ${value} 枚旧硬币。累计有效成交 ${s.sold}／${cfg.threshold}。`);
	refresh();
	return true;
};
const buy = (id) => {
	const price = cfg.buy[id];
	const forge = ['sword', 'mail', 'pick', 'axe', 'shovel'].includes(id);
	const place = forge ? locations.workshop : locations.ration;
	if (!price || !(id === 'return-scroll' ? [locations.ration, locations.hearth].some(at) : permit(place, true)))
		return reject('这项购买需要对应店铺和居民证；回城卷轴证前可买。');
	for (const slot of State.variables.babelL10Storage ?? []) R.noteEntityId(slot.entityId);
	const r = R.exchange(D.Player, { take: [{ id: 'coin', n: price }], give: [{ id, n: 1 }] });
	if (r.status !== 'applied') return reject('旧硬币不够或交易未完成；钱和货都没有变化。');
	R.perform(`付出 ${price} 枚旧硬币，收到一份${R.createItem(id).name}。消费不会减少资格进度。`);
	refresh();
	return true;
};
const certify = () => {
	if (!permit(locations.registry)) return false;
	const s = state();
	if (s.resident) return reject('你已经持有居民证；不会重复领证或发奖励。');
	if (s.sold < cfg.threshold) return reject(`还差 ${cfg.threshold - s.sold} 枚有效资源成交额；不必另交领证费。`);
	s.resident = true;
	R.perform('登记员盖下印章。居民证属于这一局的资格，不是背包里可能遗失的道具。五处服务同时开放；前往 L19 不以这张证为门票。');
	return true;
};
const rest = () => {
	if (!permit(locations.hearth)) return false;
	const p = D.Player, floor = Math.ceil(p.maxHp / 2);
	if (p.hp >= floor && !(p.nonlethal > 0)) return reject('你已经超过保底恢复线；这里不会免费回满或补充物资。');
	if (p.hp < floor) p.heal(floor - p.hp); // 候选保底效果，不冒充 SRD Heal 检定。
	p.nonlethal = Math.max(0, Number(p.nonlethal ?? 0) - floor);
	time(cfg.restMinutes);
	R.perform(`在共炉边休息 ${cfg.restMinutes} 分钟。HP 最多补到半血，非致命伤减轻；创伤、道具次数和耐久没有补满。`);
	refresh();
	return true;
};
const clinic = () => {
	if (!permit(locations.infirmary, true)) return false;
	const p = D.Player;
	if (p.hp >= p.maxHp) return reject('HP 已满，不收这笔恢复费；创伤另行诊疗。');
	if (!pay(cfg.clinicPrice)) return reject('钱不足；未收费、未治疗。');
	/* ★`books#200` P0 同族（`books#402` 修派）：**文案取实回值**（✗ 名义 `cfg.clinicHeal`）——
	 *   `Character#heal(n)` 返回**真增量**（引擎 `src/core/20-character.js`：`min(maxHp, hp+n) - hp`）
	 *   ⇒ 近满被上限夹过时（差 2 点满 ⇒ 实回 2 而名义 4）印名义就是**假读数**。
	 *   ⚠ 满血已在**上一行**被拒 ⇒ 此处实回 ≥ 1（✗ 不会出现「恢复 0」的文案）。 */
	const 实回 = p.heal(cfg.clinicHeal); // 候选城市照护效果；不是复活，也不是 SRD 的稳定伤者规则。
	time(cfg.careMinutes);
	R.perform(`接受活人照护，HP 恢复 ${实回}（不超过上限）；创伤、结构缺失和机械损坏不因此消失。`);
	refresh();
	return true;
};
/** **医所动作的标签**：其 N 同样取**实回预计** `min(clinicHeal, maxHp - hp)`（✗ 名义 —— 同一类的假读数）。
 *  满血 ⇒ 标「当前已满」（✗ 仍印 4：那与「点了会治 4 点」同形）。 */
const 活人照护 = () => {
	const p = D.Player;
	const 可回 = Math.min(cfg.clinicHeal, Math.max(0, Number(p.maxHp ?? 0) - Number(p.hp ?? 0)));
	return 可回 > 0
		? `活人照护：恢复 ${可回} HP（${cfg.clinicPrice} 枚；候选）`
		: `活人照护（当前已满；${cfg.clinicPrice} 枚；候选）`;
};
const trauma = (id) => {
	if (!permit(locations.infirmary, true) || !D.Traumas[id] || !D.Player.contains(id)) return false;
	if ((R.heldTotal(D.Player, 'coin') ?? 0) < cfg.traumaPrice) return reject('钱不足；未收费，也未掷治疗检定。');
	// 先在纯效果列表上检定，异常时尚未收费；成功／失败都是明示付费的诊疗尝试。
	const effects = D.Player.effects.slice();
	const patient = { contains: (v) => effects.includes(v), lose: (v) => effects.splice(effects.indexOf(v), 1) };
	const r = D.treatTrauma(patient, id, { mod: cfg.traumaMod });
	if (!pay(cfg.traumaPrice)) return false;
	if (r.ok) D.Player.lose(id);
	time(cfg.careMinutes);
	R.perform(`治疗${D.Traumas[id].name}：${r.total} 对 DC ${r.dc}，${r.ok ? '解除这一条创伤' : '未解除，创伤保留'}。诊疗费不保证检定成功。`);
	refresh();
	return true;
};
const repair = (entityId) => {
	if (!permit(locations.workshop, true)) return false;
	const slot = D.Player.items.find((s) => s.entityId === entityId);
	const cap = B.工具?.TOOL_CHARGES;
	if (!slot || !B.工具?.TOOLS?.[slot.id] || !Number.isInteger(cap) || slot.charges >= cap) return false;
	if (!pay(cfg.repairPrice)) return reject('钱不足；没有扣钱或修理。');
	const current = D.Player.items.find((s) => s.entityId === entityId);
	current.charges = cap;
	time(cfg.careMinutes);
	R.perform('修好所选这一件工具；其他工具、道具次数和伤势保持原样。');
	R.events.emit('inventory:changed', { id: current.id, actor: D.Player });
	refresh();
	return true;
};
const store = (entityId, retrieve = false) => {
	if (!permit(locations.hearth, true)) return false;
	const locker = (State.variables.babelL10Storage ??= []), inventory = D.Player.items;
	const src = retrieve ? locker : inventory, dst = retrieve ? inventory : locker;
	const index = src.findIndex((s) => s.entityId === entityId), slot = src[index];
	if (!slot || slot.equipped || !R.items.has(slot.id)) return reject('找不到这件物品，或它仍装备着；先收起再寄存。');
	// 原件先投递到空袋，不能让通用堆叠语义合进目标同类槽而丢失转入件身份。
	const delivery = [];
	if (!(R.deposit(delivery, slot.id, 1, { ...slot, equipped: false }) > 0)) return false;
	if (delivery.length !== 1 || delivery[0].entityId !== slot.entityId || delivery[0].charges !== slot.charges)
		throw new Error('[L10] 寄存投递破坏原件身份或充能');
	const staged = [...dst.map((s) => ({ ...s })), ...delivery];
	// deposit 是静默共享原语；投递拒绝／异常前两袋均未变。转移，不重发号、不补充充能。
	src.splice(index, 1);
	dst.splice(0, dst.length, ...staged);
	R.events.emit('inventory:changed', { id: slot.id, actor: D.Player });
	R.perform(retrieve ? '取回原有物品；没有赠送新品或恢复次数。' : '个人物品已经寄存；寄存不产生资源贡献。');
	refresh();
	return true;
};
// MapScene 不等待异步地点动作。先离开地图，再按 choice 的 {text,value} 契约等候。
// 服务有独立、可重建的段落；读档时不依赖保存前的 setup 闭包。
const menuPassages = Object.freeze({ sale: 'L10 出售', supply: 'L10 补给', forge: 'L10 工坊',
	storage: 'L10 寄存', repair: 'L10 修理', trauma: 'L10 诊疗', enslaved: 'L10 契约', settled: 'L10 留居',
	enslavedFinal: 'L10 契约确认', settledFinal: 'L10 留居确认' });
const visit = (kind) => SugarCube.Engine.play(menuPassages[kind]);
const choose = async (items, cancel = '先不办了') => {
	const passage = State.passage;
	const value = await R.choice([...items.map((o, i) => ({ text: o.text, value: String(i) })), { text: cancel, value: 'cancel' }]);
	if (State.passage !== passage || !alive()) return false;
	const selected = value === 'cancel' ? null : items[Number(value)];
	const result = selected ? await selected.action() : false;
	if (State.passage === passage && !State.variables.babelRun?.终局) SugarCube.Engine.play('探索');
	return result;
};
const terminal = (kind) => {
	if (!alive()) return false;
	const r = (State.variables.babelRun ??= {});
	r.终局 = true; r.终局类型 = kind;
	// 类型随 babelRun 保存并供回归核对；本版由独立终局段落区分叙事，不另加面板读取面。
	// 背包统一显示中性的只读提示；自由终局和留居不置零 HP、不加 death、不调用复活、不计死亡。
	SugarCube.Engine.play(kind === 'enslaved' ? '失去自由' : '留在共炉');
	return true;
};
const chooseEnding = (kind) => {
	if (!permit(locations.hearth, kind === 'settled')) return false;
	if (kind !== 'enslaved' && kind !== 'settled') return false;
	visit(kind);
	return true;
};
const menu = async (kind, final = false) => {
	const expected = { sale: locations.ration, supply: locations.ration, forge: locations.workshop,
		storage: locations.hearth, repair: locations.workshop, trauma: locations.infirmary,
		enslaved: locations.hearth, settled: locations.hearth }[kind];
	if (!expected || !permit(expected, ['storage', 'repair', 'trauma', 'settled'].includes(kind))) {
		reject('当前不能办理这项服务。'); return false;
	}
	if (kind === 'enslaved' || kind === 'settled') {
		const enslaved = kind === 'enslaved';
		R.perform(enslaved
			? '候选剧情：登记员提出以自由抵偿生活费用。这不是医疗、普通欠账或强制贫困判定；你可无代价拒绝。接受后本次攀登结束，不可再经营或购买奴隶。'
			: '持证不等于留居。你可以选择在共炉共同生活；这是真实归属，不是死亡或失败，也不宣称城里的压迫已经消失。');
		return choose([{ text: final
			? (enslaved ? '最终确认：失去自由，本次攀登结束' : '最终确认：留在共炉，结束本次攀登')
			: (enslaved ? '仍考虑接受受役契约（下一步最终确认）' : '考虑正式留居（下一步最终确认）'),
			action: () => permit(locations.hearth, !enslaved) && (final ? terminal(kind) : visit(`${kind}Final`)) }],
			final ? (enslaved ? '拒绝，保留自由继续攀登' : '暂不定居，继续生活与攀登') : '暂不签署，继续生活与探索');
	}
	let items = [];
	if (kind === 'sale') items = Object.entries(cfg.sell).map(([id, price]) => ({
		text: `出售手上全部${R.createItem(id).name}（${price} 枚／份）`, action: () => sell(id, R.heldTotal(D.Player, id) ?? 0),
	}));
	if (kind === 'supply' || kind === 'forge') items = Object.entries(cfg.buy).filter(([id]) =>
		['sword', 'mail', 'pick', 'axe', 'shovel'].includes(id) === (kind === 'forge')).map(([id, price]) => ({
		text: `${R.createItem(id).name}：${price} 枚（${id === 'return-scroll' ? '证前可买' : '需居民证'}；候选）`, action: () => buy(id),
	}));
	if (kind === 'storage' || kind === 'repair') R.backfillItemIdentity();
	if (kind === 'storage') items = [
		...D.Player.items.filter((s) => !s.equipped).map((s) => ({ text: `寄存：${R.createItem(s.id).name}［${s.entityId}］`, action: () => store(s.entityId) })),
		...(State.variables.babelL10Storage ?? []).map((s) => ({ text: `取回：${R.createItem(s.id).name}［${s.entityId}］`, action: () => store(s.entityId, true) })),
	];
	if (kind === 'repair') items = D.Player.items.filter((s) => B.工具?.TOOLS?.[s.id] && s.charges < B.工具.TOOL_CHARGES).map((s) => ({
		text: `修理${B.工具.TOOLS[s.id].name}［${s.entityId}］，当前耐久 ${s.charges}`, action: () => repair(s.entityId),
	}));
	if (kind === 'trauma') items = Object.entries(D.Traumas).filter(([id]) => D.Player.contains(id)).map(([id, tr]) => ({
		text: `${tr.name}（DC ${tr.dc}）`, action: () => trauma(id),
	}));
	return choose(items);
};
const build = () => {
	const m = new R.WorldMap({ id: 'l10-city-template' });
	const add = (id, name, desc, actions) => m.addLocation(new R.Location({ id, name, desc, actions }));
	add(locations.hearth, '第 10 层 · Common Hearth（共炉）',
		'五栋建筑早已在这里，不必由你逐栋建设。共炉有火、有临时落脚的位置；获得居民证后，食宿、寄存与更长的交谈同时开放。城规的复杂只留在剧情里。', [
		{ text: '歇一歇（保底恢复；不清创伤、不补耐久）', recovery: true, action: rest },
		{ text: '了解这座城与远征', action: () => R.perform('资源要到塔中探索，常见资源可出售。消费与居民资格是两本账。往上走不需要居民证；向下步行已关闭，合法返程用付费卷轴。卷轴不会刷新你已经取过的资源或事件。') },
		{ text: '个人寄存（需居民证）', when: resident, action: () => visit('storage') },
		{ text: '谈论正式留居（不是失败）', when: resident, action: () => chooseEnding('settled') },
		{ text: '听听受役契约（候选剧情；可拒绝）', action: () => chooseEnding('enslaved') },
	]);
	add(locations.registry, "第 10 层 · Newcomers' Registry（登记处）",
		'登记员查的是有效资源成交额，不是你现在还有多少钱。资格不会因为普通消费、逃跑掉物或没钱而吊销。', [
		{ text: () => `查看进度（${State.variables.babelL10?.sold ?? 0}／${cfg.threshold}；${resident() ? '已持证' : '未持证'}；门槛候选）`, action: () => {
			const s = state(); R.perform(`累计有效成交 ${s.sold}。居民证${s.resident ? '已领取' : '未领取'}；领取免费，无逐栋升级。`);
		} },
		{ text: '申请居民证（免费）', action: certify },
	]);
	add(locations.ration, '第 10 层 · Ration House（配给屋）',
		'证前可出售常见资源、买回城卷轴；证后开放稳定补给。装备、药品、口粮转卖不计贡献，店里不卖本店计贡献的原料。', [
		{ text: '出售资源（目录与价格均为候选）', action: () => visit('sale') },
		{ text: '购买补给／回城卷轴', action: () => visit('supply') },
		{ text: '收获旧档已有农田（兼容收尾，不计资格）', when: () => D.farmCount() > 0,
			action: () => R.harvest(D.Player) },
	]);
	add(locations.workshop, '第 10 层 · Ember Workshop（余烬工坊）',
		'工匠展示武器、护甲和工具。证前可询价；证后可购买或修理所选单件工具，不需要升级整座工坊。', [
		{ text: '查看装备与工具目录', action: () => visit('forge') },
		{ text: () => `修理单件工具（${cfg.repairPrice} 枚；候选）`, when: resident, action: () => visit('repair') },
	]);
	add(locations.infirmary, '第 10 层 · Lamplight Infirmary（灯下医所）',
		'照护活人，不复活真死者。HP 恢复、选定创伤、缺肢与机械损坏是不同问题；求医与付钱不代表同意改变身体或交出自由。证前可在共炉保底休整。', [
		{ text: '询问治疗边界', action: () => R.perform('共炉保底休整不收费。居民诊疗需要付费；创伤按各自治疗 DC 检定，失败保留。医院不能恢复已死亡的你，也不因贫困强制卖身。') },
		{ text: () => 活人照护(), when: resident, action: clinic },
		{ text: () => `选一条创伤诊疗（${cfg.traumaPrice} 枚／次；成功不保证；候选）`, traumaCare: true, when: resident,
			action: () => visit('trauma') },
	]);
	add('L10-gate', '第 10 层 · 向上的门', '门外仍是未知的路。居民证不是挑战 L19 的门票；留下和继续前进都是自己的选择。', []);
	for (const id of Object.values(locations).filter((id) => id !== locations.hearth)) {
		m.addPath({ from: locations.hearth, to: id, text: () => `前往${m.locations.get(id).name}` });
		m.addPath({ from: id, to: locations.hearth, text: '回共炉' });
	}
	m.addPath({ from: locations.hearth, to: 'L10-gate', text: '走向上行门' });
	m.addPath({ from: 'L10-gate', to: locations.hearth, text: '回共炉，再作准备' });
	m.validate();
	return m;
};
/** ★`books#208` 备注（改准，dev-9 发现）：**引擎零发射 `save:ready`** —— 唯一发射＝verify 工具侧的**合成**
 *  ⇒ 生产里本监听**不跑** ⇒ 「旧档补域」**不能**靠它；真正生效的是各处 `??=` 的**惰性建域**（本档 `state()`／
 *  `00-clock-town.js` 的 `城写()`）✓。宿主往返请走宿主自己的 onLoad 口（README 已明：✗ 把它当宿主往返）✓。
 *  本函数**保留**（verify 工具与将来的宿主若真发射，行为正确 ✓）。 */
const ensure = () => {
	state(); // 旧档缺新域才补零；不追算旧贡献、清空旧农田或改既得资格。
	const locker = (State.variables.babelL10Storage ??= []);
	if (!Array.isArray(locker)) throw new Error('[L10] 无效个人寄存库存');
	for (const slot of locker) R.noteEntityId(slot.entityId);
};
B.L10 = { cfg, locations, state, ensure, alive, resident, sell, buy, certify, rest, clinic, trauma, repair, store, chooseEnding, menu, build };
R.events.on('save:ready', ensure);
