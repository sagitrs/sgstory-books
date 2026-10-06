/* 01-seven-names-battle.js —— W09「七名河」S3 **片 2**（`books#397`）：**四组真怪 ＋ 侦察／脱离两路**
 *
 * 设计源（票面 sha `56829d8c`）：`docs/plans/babel/optional/tutorial-seven-names/README.md` 的
 *   事件表（E3 Crocodile×1／E5 Crocodile×2／E6 Small Water Elemental×1／E7 Medium Water Elemental×1；
 *   胜利固定散货 铜矿 1／2／1／2）与 §「应战侦察」／§「属性脱离」两段口径 ——
 *   数据（`enemy`／`victory_loot`／两选项的 `check{ability,dc,modifier}` 与成败文本）**全在内容档**
 *   （片 1 已逐字带入 ✓）⇒ 本档**只落逻辑**，✗ 不重写任何文案／数值。
 *
 * 承**片 1 的四口**（✗ 另造一套）：
 *   · `S7.掷检定`（检定形 `{ability,dc,modifier}` ⇒ `R.checkRoll`；**真随机** ✓）
 *   · `S7.交付／S7.收回`（**唯一交付口** —— 设计明文「战斗铜矿交付复用同一交付口」✓）
 *   · `S7.读档／已处理／可走／节点导航`（状态与导航的**唯一权威**）
 *   · `S7.死`（死亡**零写** ✓）
 *
 * 口径（`guest-1` 2026-10-06T12:29Z 点名）：判据用**结构式断言＋真随机**（✗ 受控骰；受控骰归 S5 e2e 臂）
 *   ⇒ 本档只保证「结构不随骰面变」：失败**不增怪／不换敌**、脱离成功**无散货且不记胜利**、
 *     脱离失败**立即开战且不可重选**、胜利用**固定散货**（✗ 旧随机掉落）、死亡**零写**。
 *
 * ⚠ 战斗只走**固定敌组**：✗ `rollEncounter`（那是层梯度抽签）、✗ `rollLoot`（设计：「不并发旧随机掉落」）✓。
 * ⚠ 成军与故事侧 `encounters.js` 的 `fresh` 同形（`R.Character.revive(toJSON())`）：✗ 手搓克隆
 *   （`books#182` 的 RC 正是「手搓克隆 ⇒ L9 头目攻击面取不到」）。
 */
(() => {
	const R = setup.RPG, D = setup.DND3, BS = setup.BABEL, C = setup.BABEL_CONTENT.七名河内容;
	const S7 = BS.七名河;
	if (!S7) throw new Error('七名河片 2：片 1 的逻辑面（`setup.BABEL.七名河`）未装载 ⇒ 装载序不对');

	/** 内容里的 `srd_base` ⇒ 引擎**已注册**的角色 id（三只皆由 `#2027` 交付 ✓） */
	const 怪表 = Object.freeze({
		'Crocodile': 'crocodile',
		'Small Water Elemental': 'small-water-elemental',
		'Medium Water Elemental': 'medium-water-elemental',
	});
	/** 回合上限：设计 §「四组」按 `new R.Battle(8, …)` ⇒ **8** 是本弧的权威（✗ 自造层语义） */
	const 回合上限 = 8;

	/** 成军：`enemy.srd_base` × `count` 克隆**满状态**实例（✗ 抽签、✗ 手搓）。 */
	const 成军 = (node) => {
		const id = 怪表[node?.enemy?.srd_base];
		if (!id) throw new Error(`七名河片 2：内容里的 srd_base「${node?.enemy?.srd_base}」没有映射（候引擎注册）`);
		const proto = R.characters.get(id);
		if (!proto) throw new Error(`七名河片 2：引擎未注册角色「${id}」（候 \`#2027\` 的交付）`);
		const n = Number(node.enemy.count ?? 1);
		if (!Number.isInteger(n) || n < 1) throw new Error(`七名河片 2：enemy.count 须是正整数（收到 ${node.enemy.count}）`);
		return Array.from({ length: n }, () => R.Character.revive(JSON.parse(JSON.stringify(proto.toJSON()))));
	};

	/** 跑一场**固定敌组**的真战斗（照故事侧 `fight()` 的约定：战中门控 ＋ 面板刷新）。 */
	const 跑一场 = async (node, { interactive = false } = {}) => {
		const foes = 成军(node);
		BS.战中 = true;
		try { globalThis.document?.body?.classList?.add('战中'); } catch { /* 无 DOM ⇒ 略 */ }
		R.refreshPanels?.();
		let 场 = null;
		try {
			场 = new R.Battle(回合上限, [D.Player], foes, interactive);
			await 场.execute();
		} finally {
			BS.战中 = false;
			try { globalThis.document?.body?.classList?.remove('战中'); } catch { /* 同上 */ }
			R.refreshPanels?.();
		}
		/* ★战果**只在一处判**（故事侧 `setup.BABEL.战果` ⇒ 引擎 `outcomeResolver`）✗ 本档自写「胜＝全倒」 */
		const 果 = BS.战果({ foes, player: D.Player, 战斗: 场 });
		return { foes, 场, 果 };
	};

	/** 一次行动的结果面（与片 1 `选行动` **同形**：`{ok, 节点, 成败, 文本, 掷, 交付, 可走, 导航}`）。 */
	const 结账 = (s, id, 选项序号, opt, 掷, 支, 交付件, extra = {}) => {
		s.结果[id] = {
			选项: 选项序号, 标签: opt.label,
			成败: opt.check ? (掷?.success ? '成功' : '失败') : '无检定',
			文本: 支?.text ?? '', 掷,
			交付: (交付件 ?? []).map(([a, b]) => `${a}×${b}`),
			...(extra ?? {}),
		};
		s.路径.push(id);
		if (s.战斗) delete s.战斗[id];          // ★已结账 ⇒ 解锁（节点已处理 ⇒ 不会再有行动）✓
		return { ok: true, 节点: id, 成败: s.结果[id].成败, 文本: s.结果[id].文本, 掷, 交付: 交付件 ?? [], 可走: S7.可走(id), 导航: S7.节点导航(id), ...(extra ?? {}) };
	};

	/** 胜利结算：**固定散货**经片 1 的唯一交付口（★一次；异常 ⇒ 先收回再拒 ✓ 与片 1 同规）。 */
	const 胜后交付 = (node) => {
		let 件 = [];
		try { 件 = S7.交付(node.victory_loot ?? {}); }
		catch (e) { S7.收回(件); return { ok: false, code: 'SEVEN_CAPACITY', why: `散货交付失败，已撤回（${e?.message ?? e}）` }; }
		return { ok: true, 交付: 件 };
	};

	/**
	 * **战斗节点的一次行动**（唯一入口；`选行动` 对战斗节点直接拒 ⇒ 走这里 ✓）。
	 *   · `应战`（`check.tag === 'engage-scout'`）：掷检定 ⇒ **成或败都进真实战斗**（设计：失败只少情报，
	 *     ✗ 不增怪／✗ 不换敌）⇒ 胜 ⇒ 固定散货；非胜（death／stalemate／knockout）⇒ **✗ 交付**。
	 *   · `脱离`（`check.tag === 'escape'`）：成功 ⇒ **通过**（✗ 散货、✗ 记胜利／击杀；节点记已处理）；
	 *     失败 ⇒ **立即开战**（✗ 不能重选另一种避战 ✓）⇒ 胜 ⇒ 固定散货。
	 * @returns 结果面；死亡 ⇒ 走片 1 的 `死()`（**零写** ✓）
	 */
	const 战斗行动 = async (i, { interactive = false } = {}) => {
		const s = S7.读档();
		if (!s || s.态 !== S7.态.进行中) return { ok: false, code: 'SEVEN_NOT_STARTED', why: '七名河教程未在进行中' };
		const id = s.当前, node = C.节点表[id];
		if (!node) return { ok: false, code: 'SEVEN_NO_NODE', why: `未知节点 ${id}` };
		if (node.type !== 'battle') return { ok: false, code: 'SEVEN_NOT_BATTLE', why: `${id} ✗ 是战斗节点` };
		if (S7.已处理(s).includes(id)) return { ok: false, code: 'SEVEN_NODE_DONE', why: `${id} 已处理（✗ 不重发奖励）` };
		const opt = node.options?.[i];
		if (!opt) return { ok: false, code: 'SEVEN_NO_OPTION', why: `${id} 无第 ${i} 个选项` };

		/* ★设计「失败**立即开战**，✗ 不重新选择侦察或另一种避战抵消失败」（`README.md` §「属性脱离」）——
		 *   落形：**本节点的选择一经作出即上锁**（`s.战斗[id]`），续战走 `继续()`（✗ 重掷侦察／✗ 改选）。
		 *   ⚠ 锁写在**首次行动**之前、删在**结账**那一刻 ⇒「已处理」仍由 `结果` 派生 ✓（✗ 另存一套完成账）。 */
		/* ★设计「失败**立即开战**，✗ 不重新选择侦察或另一种避战抵消失败」（`README.md` §「属性脱离」）——
		 *   落形：**本节点的选择一经作出即上锁**（`s.战斗[id]`），续战走 `继续()`（✗ 重掷侦察／✗ 改选）。
		 *   ⚠ 锁写在**首次行动**之前、删在**结账**那一刻 ⇒「已处理」仍由 `结果` 派生 ✓（✗ 另存一套完成账）。
		 *   ★`F1`（`dev-10` 的 D 票，**真伤**）：**掷果随锁一起存** —— 原先只存 `{选项,标签,脱离}`，而续战时
		 *     `结账` 取 `s.结果[id].掷`（非胜三支**不写 `结果`** ⇒ 恒 `undefined`）⇒ 账上 `成败` 恒记「失败」✗
		 *     —— 侦察成功＋打赢却写「失败」＝**账记假事实**（设计 §10「保存」面要核骰果）。
		 *   ⚠ `down`／`stunned`／`stalemate` **不清锁**（设计「一经作出即上锁」⇒ 续战仍用同一选择）；
		 *     仅**结账**（脱离成功／胜利）删锁 ✓。
		 *   ★`F2`（同票，非阻断）：✗ 再把瞬时量写进存档域（原 `s.__选项`）⇒ 改**参数传递** ✓。 */
		const 掷 = opt.check ? S7.掷检定(opt.check) : null;
		s.战斗 ??= {};
		if (s.战斗[id]) return { ok: false, code: 'SEVEN_BATTLE_LOCKED', why: `${id} 的选择已定（${s.战斗[id].标签}）⇒ 续战请走「继续战斗」（✗ 改选／✗ 重掷侦察）` };
		s.战斗[id] = { 选项: i, 标签: opt.label, 脱离: opt.check?.tag === 'escape', 掷 };
		const 支 = opt.check ? (掷.success ? opt.success : opt.failure) : opt.success;
		const 是脱离 = opt.check?.tag === 'escape';

		/* 脱离**成功** ⇒ 通过：无散货、不记胜利／击杀（设计 §「属性脱离」原文 ✓） */
		if (是脱离 && 掷?.success) {
			return 结账(s, id, i, opt, 掷, 支, [], { 脱战: true, 战果: null });
		}

		/* 其余（应战成／败、脱离失败）⇒ **立即开战**（✗ 重选、✗ 改判） */
		const { foes, 果 } = await 跑一场(node, { interactive });
		/* ★词汇对齐故事侧**四名**（`world/boss.js` 的 `战果`：`victory`／`stunned`／`stalemate`／`down`
		 *   —— 引擎五名到故事四名的投影）⇒ 本档**穷举四支**，✗ 留空洞、✗ 自造 `'death'`：
		 *   玩家出局（`down`）＝死亡语义 ⇒ **零写**（片 1 `死()`：保留「进行中（未完成）」）。 */
		if (果 === 'down') {
			/* ★死亡：**零写**（片 1 `死()` 的语义 —— 保留「进行中（未完成）」）；✗ 交付、✗ 标已处理 */
			return { ok: true, 节点: id, 成败: 掷 ? (掷.success ? '成功' : '失败') : '无检定', 文本: 支?.text ?? '',
				掷, 战果: 果, 交付: [], 可走: S7.可走(id), 导航: S7.节点导航(id), 已死: true };
		}
		if (果 === 'stunned' || 果 === 'stalemate') {
			/* 敌方全晕（`stunned` ⇒ §14 ⑥ 明文 ✗ 开门）／僵持（`stalemate`）：**✗ 标已处理、✗ 交付**。 */
			/* 僵持／被打晕：**✗ 标已处理、✗ 交付**（可再来一次 ⇒ 由 `已处理` 派生，✗ 另存账） */
			return { ok: true, 节点: id, 成败: 掷 ? (掷.success ? '成功' : '失败') : '无检定', 文本: 支?.text ?? '',
				掷, 战果: 果, 交付: [], 可走: S7.可走(id), 导航: S7.节点导航(id), 未胜: true, 原因: 果 };
		}
		const 发 = 胜后交付(node);
		if (!发.ok) return 发;
		return 结账(s, id, i, opt, 掷, 支, 发.交付, { 战果: 果, 敌数: foes.length });
	};

	/** **续战**：按**已锁的选择**重开这一场（✗ 重掷侦察、✗ 改选；死亡 ✗ 续 ⇒ 零写）。 */
	const 继续 = async ({ interactive = false } = {}) => {
		const s = S7.读档();
		if (!s || s.态 !== S7.态.进行中) return { ok: false, code: 'SEVEN_NOT_STARTED', why: '七名河教程未在进行中' };
		const id = s.当前, 锁 = s.战斗?.[id];
		if (!锁) return { ok: false, code: 'SEVEN_NO_BATTLE_LOCK', why: `${id} 没有进行中的战斗选择（✗ 无锁可续）` };
		const node = C.节点表[id];
		const { foes, 果 } = await 跑一场(node, { interactive });
		if (果 === 'down') return { ok: true, 节点: id, 战果: 果, 交付: [], 已死: true, 可走: S7.可走(id), 导航: S7.节点导航(id) };
		if (果 === 'stunned' || 果 === 'stalemate') return { ok: true, 节点: id, 战果: 果, 交付: [], 未胜: true, 原因: 果, 可走: S7.可走(id), 导航: S7.节点导航(id) };
		const 发 = 胜后交付(node);
		if (!发.ok) return 发;
		const opt = node.options?.[锁.选项];
		/* ★`F1`：成败取自**首次掷果**（随锁存的 `锁.掷`），✗ 读 `s.结果`（非胜支不写它 ⇒ 会假记「失败」） */
		return 结账(s, id, 锁.选项, opt, 锁.掷 ?? null, opt?.success, 发.交付, { 战果: 果, 敌数: foes.length, 续战: true });
	};

	BS.七名河战斗 = Object.freeze({ 怪表, 回合上限, 成军, 跑一场, 胜后交付, 战斗行动, 继续, 接入: (id) => 怪表[id] ?? null });
})();
