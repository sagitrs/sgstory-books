/* 巴别之井 · **测试模式**（`books#413` A2 · 层 1：会话 ＋ 身份 ＋ 固定结束口）
 *
 * ## 依据（A2 六项终裁，`#413` 评论 `6018185312`；起草＝本席的实现前清单 `6017887525`）
 *   · ①**乙案**：首版＝**一张真战斗卡 ＋ 一张真奖励卡** ＋ **另列**固定结束控制 ⇒ 本档给出**测试卡目录**
 *     （池 ＋ 卡 id ＋ `类` 字段；✗ 把整张旧遭遇表自动纳入）；②结束控制内部 id `endTestMode`、显示
 *     「结束测试模式」，**✗ 第三张可抽卡**、✗ 进任何随机池、✗ 被「指定事件」当战斗/奖励内容调用；
 *   · ③持久化走 `babelTest/` 命名空间（`zz-test-save.js` 已落）—— 本档把会话的 `persist` 端口接到它上面，
 *     **✗ 写正式 `Save.slots`**；④**稳定执行身份**由本消费者层给（`场次id`＝`babel-test/<卡id>/<场次序>`）
 *     —— ✗ 模板 id／显示名／回合号／DOM／时间戳／读档归零的临时计数；**身份生成 ✗ 消费正式骰流**；
 *   · ⑤**真 `RPG.GameSession`**：角色／物品／事实／随机源／输入／订阅／生命周期／持久化路由**都在这两卡路上**；
 *     ✗ 共享全局的薄壳；✗ 借正式玩家／正式随机流／正式状态／全局订阅跑完再回滚 ✓。
 *
 * ## 形
 *   `setup.BABEL.测试模式 = { 会话id, 池id, 结束id, 卡目录, 开(卡id, opts), 取(), 列表(), 结束(场次id), 状态() }`
 *   · `开(卡id)` ⇒ `{ ok, 场次id, 会话, 上下文, 卡 }`（✗ 开时不动正式局一个字节 ✓）
 *   · `结束(场次id)` ⇒ 具名 `endTestMode`：销毁该测试场次 ＋ 清**它自己的**活动控制 ＋ 旧输入/订阅/回调失效；
 *     ✗ 授胜／✗ 补奖／✗ 复活；**死亡后照样可达** ✓
 *   · `取(场次id?)` ⇒ 场次句柄（缺省取最后一个）
 *
 * ## 纪律
 *   · **缺必要接缝 ⇒ 具名抛**（✗ 静默降级成全局源 —— 那正好会把「未隔离」伪装成「跑通了」✗）：
 *     `TEST_MODE_NO_ENGINE_RNG`（引擎无 `RPG.makeRng`）／`TEST_MODE_NO_SESSION`（无 `RPG.GameSession`）；
 *   · 本档**只做会话与入口这一层**；两张卡的场景体在 `zz-test-cards.js`（候补）⇒ 本档 ✗ 自带掉落/奖励数学
 *     （另造一套＝明文禁 ✓）。
 */
(function () {
	'use strict';

	setup.BABEL = setup.BABEL ?? {};

	/** 会话 id 前缀（③裁：`babelTest/` 是**持久化**命名空间；此处是**运行**身份前缀，两账分开 ✓）。 */
	const 身份前缀 = 'babel-test';

	/** 池 id（①裁：池与「指定事件」入口都须可达，并**校验目录成员**）。 */
	const 池id = 'babelTest-测试卡';

	/** ★结束控制：**独立** id ＋ 显示名（②裁 —— 二者描述**同一个**固定退出控制，✗ 两个重复结算事件）。 */
	const 结束id = 'endTestMode';
	const 结束名 = '结束测试模式';

	/* 目录（①裁：首版**恰两张**：一张真战斗、一张真奖励；✗ 结束控制不在其中 ✓）。
	 * ⚠ 内容（敌人／奖励）由**接线提案具名** —— 此处给**首版点名表**，值取正式内容档里**已有**的 id。 */
	const 卡目录 = Object.freeze([
		Object.freeze({
			卡id: 'test-card-battle', 类: '战斗', 显示名: '测试·战斗卡',
			说明: '一组固定敌人 ⇒ 走**正式**战斗规则与结算（✗ 另造战斗数学）',
			/* ★①裁「内容由接线提案具名」：点**内容档里已有的真战斗节点**（`E3` ⇒ 鳄鱼×1 ✓），
			 *   ✗ 自造敌人表（那会变成第二套内容 ✓）。 */
			节点: 'E3', 敌组: Object.freeze(['Crocodile']),
		}),
		Object.freeze({
			卡id: 'test-card-reward', 类: '奖励', 显示名: '测试·奖励卡',
			说明: '一次固定交付 ⇒ 走**正式**唯一交付口（✗ 另造奖励/掉落数学；✗ 经旧随机口）',
			/* ★交付形＝**候选 id ⇒ 件数**（`00-seven-names-content.js` 的 `物品映射` 口径 ✓）
			 *   —— 候选须在映射表里（✗ 自造 id ⇒ 交付口会静默跳过 ✓）。 */
			交付: Object.freeze({ bandage: 1 }),
		}),
	]);

	const 卡表 = new Map(卡目录.map((c) => [c.卡id, c]));
	/** 「指定事件」入口：**只认目录成员**（✗ 池外 id ⇒ 具名拒 ✓）。 */
	const 取卡 = (卡id) => 卡表.get(String(卡id)) ?? null;

	const 场次表 = new Map();   // 场次id ⇒ 句柄
	const 已结束表 = new Set();  // ★已销毁的场次 id ⇒ 「重复结束」可**幂等**作答（✗ 二次副作用 ✓）
	let 场次序 = 0;             // ★身份**由本消费者层给**（④裁）；✗ 读档归零的临时计数当身份 ✗ ——
	                            //   故「场次序」只用来**区分本次开的两张卡**，✗ 不作跨刷新身份（那走 `场次id` 明文 ✓）。

	/** 具名拒（✗ 静默降级）。 */
	const 拒 = (code, msg, extra) => Object.assign(new Error(msg), { code }, extra ? { detail: extra } : {});

	/** 引擎接缝守（⑤裁：缺**必要最小接缝** ⇒ 具名呈报，✗ 自称已就绪）。 */
	const 接缝 = () => {
		if (typeof setup.RPG?.makeRng !== 'function') {
			throw 拒('TEST_MODE_NO_ENGINE_RNG',
				'引擎缺 `RPG.makeRng`（`sgstory#2043` 的按会话随机源接缝）⇒ 测试局**无法**拥有自己的随机源，'
				+ '本模式**拒绝**以共享全局源开场（那会把「未隔离」伪装成「跑通了」✗）');
		}
		if (typeof setup.RPG?.GameSession !== 'function') {
			throw 拒('TEST_MODE_NO_SESSION', '引擎缺 `RPG.GameSession` ⇒ 测试局无法拥有独立会话 ✓');
		}
	};

	/** 测试档端口：接 `zz-test-save.js` 的 `babelTest/` 路线（③裁）。✗ 碰正式 `Save.slots` ✓。 */
	const 建端口 = (场次id) => ({
		名: '测试档',
		可用() { return setup.BABEL.测试档?.可用?.() === true; },
		save(载荷 = {}) { return setup.BABEL.测试档?.保存?.({ id: 场次id, ...载荷 }); },   // ★实况签名：`保存({id, 事实, 历史})`（见本组既有判据 ✓）
		load() { return setup.BABEL.测试档?.读取?.(场次id); },
		drop() { return setup.BABEL.测试档?.删除?.(场次id); },
	});

	/** 测试玩家：**独立实例**（⑤裁「角色/物品…须有独立会话归属」）。
	 *   ⚠ `DND3.Player` 本身就是一次 `defCharacter`（`dnd3/player.js:44`）⇒ 测试角色**必须**另建一个，
	 *     ✗ 借正式那位 ✓（借了再回滚＝明文禁 ✓）。 */
	const 建玩家 = () => {
		const C = setup.RPG.Character;
		const 玩家 = new C({
			name: '测试者',
			/* ★`properties: ['player']` —— **交互通路**的成文前提（引擎的回合问的是 `attacker.choice`）：
			 *   ✗ 带它 ⇒ 本角色会被当 **AI 行动者**走在自动环里 ⇒ 玩家侧**永远不被问**、`submitBattleAction`
			 *   也无处可去（实测：交互路一开就自己跑到 `战果: down` ✗ —— 外部提交的端到端格正是这样抓到的 ✓）。 */
			properties: ['player'],
			hp: 12, maxHp: 12, bab: 1,
			stats: setup.DND3?.stats?.({ str: 12, dex: 12, con: 12, int: 10, wis: 10, cha: 10, ac: 10 }) ?? {},
			items: [],
		});
		/* ★标记：测试角色（供规则层/UI 分辨；✗ 拿显示名当身份 ✓） */
		玩家.测试 = true;   // ★标记位（✗ 拿显示名当身份 ✓）
		return 玩家;
	};

	/** 开一个测试场次（**一张卡** ⇒ 一个会话 ✓）。 */
	const 开 = (卡id, opts = {}) => {
		接缝();
		const 卡 = 取卡(卡id);
		if (!卡) throw 拒('TEST_MODE_NO_CARD', `测试卡目录里没有这张卡：${JSON.stringify(String(卡id))}`
			+ `（目录成员：${卡目录.map((c) => c.卡id).join('／')}）—— 「指定事件」入口只认目录成员 ✓`);
		场次序 += 1;
		const 场次id = `${身份前缀}/${卡.卡id}/${场次序}`;     // ④裁：稳定身份**由本层给**
		const rng = setup.RPG.makeRng({ 名: `测试局·${卡.卡id}`, 会话: 场次id });   // ★自有随机源（✗ 全局）
		const R = setup.RPG;
		const 玩家 = (function () { const p = 建玩家(); return p; })();
		const 会话 = new R.GameSession({
			id: 场次id,
			ports: { persist: 建端口(场次id) },
			rng,
			facts: {
				事实: { 场景: '测试局', 卡: 卡.卡id, 态: '在途', 结果: null },
				历史: [],
			},
			/* ★可变对象**声明面**（⑤裁：命令体常直接改引擎对象 ⇒ 由装载方点名，✗ 让内核去猜） */
			objects: () => [玩家],
		});
		const 上下文 = Object.freeze({
			名: `测试局·${卡.卡id}`,
			场次id,
			卡,
			会话,
			玩家: () => 玩家,
			账: () => 会话.facts?.().事实 ?? null,
			rng: () => rng,
		});
		const 句柄 = { 场次id, 卡, 会话, 上下文, rng, 玩家, 活: true, 建的: Date.now() };
		场次表.set(场次id, 句柄);
		return { ok: true, 场次id, 会话, 上下文, 卡, 玩家, rng };   // ★回传 rng（判据要能断「自有随机源」✓）
	};

	const 取 = (场次id = null) => (场次id == null
		? [...场次表.values()].filter((h) => h.活).pop() ?? null
		: 场次表.get(String(场次id)) ?? null);

	const 列表 = () => [...场次表.values()].map((h) => ({
		场次id: h.场次id, 卡: h.卡.卡id, 类: h.卡.类, 活: h.活,
	}));

	/** ★固定结束控制（②裁）：销毁**该**场次 ＋ 清**它自己的**活动控制 ＋ 旧输入/订阅/回调失效。
	 *   ✗ 授胜／✗ 补奖／✗ 复活；**死亡后照样可达**（本档 ✗ 看玩家死活 ✓）。 */
	const 结束 = (场次id = null) => {
		if (场次id != null && 已结束表.has(String(场次id))) {
			return { ok: true, id: 结束id, 名: 结束名, 场次id: String(场次id), 已结束: true };
		}
		const h = 取(场次id);
		if (!h) return { ok: false, id: 结束id, 名: 结束名, reason: '没有这个测试场次', code: 'TEST_MODE_NO_SESSION_HANDLE' };
		if (!h.活) return { ok: true, id: 结束id, 名: 结束名, 场次id: h.场次id, 已结束: true };
		/* ① 清**本场次**的活动控制（✗ 清别的会话、✗ 重置旧注入 —— 承 A2 §二「只清所属」✓） */
		let 清控制 = null;
		try { 清控制 = setup.RPG?.diceControl?.clearAll?.(h.场次id) ?? null; } catch (e) { 清控制 = { 错: String(e?.message ?? e) }; }
		/* ② 旧输入/订阅/回调失效：会话本体丢弃 ⇒ 其 `_input`／`_events`／场景随之不可达 ✓
		 *    ＋ 显式清输入队列（✗ 留待旧回调再消费 ✓） */
		let 清输入 = null;
		try { 清输入 = h.会话?.ctx?.input?.丢弃?.() ?? null; } catch { 清输入 = null; }
		h.活 = false;
		场次表.delete(h.场次id);
		已结束表.add(h.场次id);
		return {
			ok: true, id: 结束id, 名: 结束名, 场次id: h.场次id,
			清控制, 清输入,
			不授胜: true, 不补奖: true, 不复活: true,
		};
	};

	const 状态 = () => ({
		会话id前缀: 身份前缀, 池id, 结束: { id: 结束id, 名: 结束名 },
		卡目录: 卡目录.map((c) => ({ 卡id: c.卡id, 类: c.类, 显示名: c.显示名 })),
		在场次: 列表(),
		测试档可用: setup.BABEL.测试档?.可用?.() === true,
	});

	setup.BABEL.测试模式 = Object.freeze({
		身份前缀, 池id, 结束id, 结束名, 卡目录, 取卡, 开, 取, 列表, 结束, 状态,
	});
})();
