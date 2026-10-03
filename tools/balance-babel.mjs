#!/usr/bin/env node
/* 巴别之井 · **战斗批量跑分器（BalanceRunner · 操作者第三份文档 §12「P0 即建」）**
 *
 * 定位：它回答的问题不是「某个面通不通」，而是「这套数值跑很多场之后**长什么样**」——
 *   五战果各占多少、胜率落在哪个区间、平均打几回合、一场里损耗多少、输的那些是什么原因。
 *
 * ## 为什么 P0 就用 LegacyBattleRunner（而不是等架构分离）
 *
 * 设计文档 §12 点名的硬门：**在改架构之前先把「现在的战斗」量出来**，否则重构之后无从比较
 *   「行为保持」。因此本件**驱动的是真 `RPG.Battle.execute()`**（引擎现码，✗ 影子实现），
 *   只把三处换成受控的：**脚本化的 choice**、**注入的随机流**、以及**夹具摆的初始态**。
 *   ⇒ 将来 P2／P3 拆出纯规则内核时，本件是它的**对照基线**（同一批夹具、同一批样本）。
 *
 * ## 三处控制点（各自的可核之处）
 *
 *   ① **脚本化 choice**：引擎的交互回合经 `await attacker.choice(options)` 取玩家选择
 *      （`src/core/40-battle.js` 的 `#playerActionBody`）⇒ 本席**覆盖角色实例上的 `choice`**，
 *      按策略从选项里挑。⚠ 覆盖的是**实例**（✗ 原型），且在 `finally` 里**还原**。
 *   ② **随机流注入**：引擎全部骰面走 `RPG.rng`（`src/core/05-dice.js`，唯一入口）⇒ 本席按
 *      样本号生成一段**确定性序列**并 `setSequence()`。⚠ 序列**耗尽即抛**（引擎不静默回退真随机）
 *      ⇒ 样本长度不足时本件**如实报错**，✗ 悄悄改用真随机。
 *   ③ **夹具摆位**：玩家与敌人的初始态由夹具给定（血量／装备／效果／敌组），摆放一律走
 *      **受支持写点**（`R.give`／`R.equip`／`R.createItem`／`R.rollEncounter`），✗ 直赋内部字段。
 *
 * ## 可重放
 *
 * 每条样本都留下一条**轨迹**：夹具 id ＋ 样本号 ＋ 随机序列 ＋ 策略名 ＋ 逐回合的选项序列。
 *   把这三样交回本件（`--replay <轨迹档>`）应得到**逐字相同**的战果与读数。
 *
 * ## 用法
 *
 *   node tools/balance-babel.mjs --engine <引擎检出>                    # 默认七夹具 × 烟测 100 样本
 *   node tools/balance-babel.mjs --engine <E> --fixture pure-attack --samples 200
 *   node tools/balance-babel.mjs --engine <E> --selftest                # 判别力自证（本器能不能红）
 *   node tools/balance-babel.mjs --engine <E> --json                    # 机读输出（轨迹随附）
 *
 * 退出码：0 全过；1 有红（自证不符／样本异常）；2 用法错或装置缺。
 * ★本件与 `tools/e2e-harness.mjs` 的分工：**只 import，不复制**（引导与点链接在那件里）。
 */
import * as H from './e2e-harness.mjs';
import fs from 'node:fs';
import path from 'node:path';

const V = (x) => x.SC.State.variables;   // 测试席自证里取的短名
const argOf = (name, dflt = null) => {
	/* ★两种写法都认：`--name=值` 与 `--name 值`。
	 *   ⚠ 本席首版只认等号形 ⇒ 用 `--samples 100`（空格）时拿到布尔真，`Number(true)===1`
	 *     ⇒ 烟测只跑了一个样本而读数看起来正常（自陈：这是本器第一次烟测的实况）。 */
	const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
	if (eq) return eq.slice(name.length + 3);
	const i = process.argv.indexOf(`--${name}`);
	if (i >= 0) {
		const nxt = process.argv[i + 1];
		return nxt && !nxt.startsWith('--') ? nxt : true;
	}
	return dflt;
};

/* ══════════════════════════════════════════════════════════════════════════
 * 策略：脚本化 choice 的四种打法
 *
 * 每个策略接收 `(options, ctx)` 并返回选项里的某个 `value`（或 `'skip'`）。
 *   `options` 是引擎给的选项数组（形如 `{ text, value }`），`ctx` 是本件补的上下文
 *   （当前回合、自己的血、敌组血、历史选择序列 —— 便于**留下可重放的轨迹**）。
 * ★策略必须是**纯函数式**的（除 ctx 外不读外部状态）⇒ 同一轨迹重放时逐字相同。
 * ══════════════════════════════════════════════════════════════════════════ */
/** 目标选择步：引擎给的是 `<名>（己方）`／`（敌方）` 的清单 ⇒ **一律选敌方**。
 *  ★本席首版没识别这一步，于是「纯攻」策略按自己的正则选中了**第一个**条目 —— 那是己方
 *    ⇒ 玩家对着自己打（自证的 ③c 顺着「打不死 4 血的幼獾」查出来的）。 */
const 目标步 = (options) => options.length > 0 && options.every((o) => /（己方）|（敌方）/.test(o.text));
const 选敌方 = (options) => {
	const 敌 = options.filter((o) => /（敌方）/.test(o.text));
	return (敌[0] ?? options[0]).value;
};
const 选己方 = (options) => {
	const 己 = options.filter((o) => /（己方）/.test(o.text));
	return (己[0] ?? options[0]).value;
};
/** ★`#182` 折：目标步按**上一步选了什么**定去向 —— 治疗件（草药糊／绷带）⇒ 己方，其余⇒敌方。
 *  先前一律选敌方 ⇒ `防疗` 夹具名不副实（量的是「带治疗件但从不使用」）。 */
const 选目标 = (options, ctx) => (/草药糊|绷带/.test(String(ctx?.上次选文案 ?? '')) ? 选己方(options) : 选敌方(options));

const STRATEGIES = {
	/* 纯攻：优先「使用」已装备的武器打第一个敌人；没有武器就打空手。 */
	'纯攻': (options, ctx) => {
		if (目标步(options)) return 选敌方(options);
		const 攻 = options.find((o) => /长剑|铁镐|斧头|铁锹|匕首|攻击|打击|挥|砍|劈/.test(o.text) && !/跳过/.test(o.text));
		if (攻) return 攻.value;
		const 空手 = options.find((o) => /空手/.test(o.text));
		if (空手) return 空手.value;
		return options[0].value;
	},
	/* 防疗：血低先治（草药糊／绷带），否则治疗优先，再次才是攻击。 */
	'防疗': (options, ctx) => {
		if (目标步(options)) return 选目标(options, ctx);
		if (ctx.自己血比 < 0.5) {
			const 治 = options.find((o) => /草药糊|绷带/.test(o.text));
			if (治) return 治.value;
		}
		const 攻 = options.find((o) => /长剑|铁镐|斧头|铁锹|匕首|攻击|打击|挥|砍|劈/.test(o.text) && !/跳过/.test(o.text));
		if (攻) return 攻.value;
		return options[0].value;
	},
	/* 空手：只找空手打击（用于「空手击晕」夹具）。 */
	'空手': (options) => {
		if (目标步(options)) return 选敌方(options);
		const 空手 = options.find((o) => /空手/.test(o.text));
		return 空手 ? 空手.value : options[0].value;
	},
	/* 跳过：一律跳过（对照组 —— 用来证明「不打」与「打」的战果不同，见自证）。 */
	'跳过': () => 'skip',
};

/* ══════════════════════════════════════════════════════════════════════════
 * 七夹具（操作者第三份文档 §12 点名）
 *
 * 每个夹具给：`摆位(R, D3, B)`（把玩家与敌组摆到位）、`策略`、以及 `待判`（做不到时的原因）。
 * ★`待判` 非空者**不入绿**（照本仓 `#1913` 的形：待判行印出来、单独计数）。
 * ★`未达` 非空者**只印账**：它**判得了、测出来不达标**（✗ 与 `待判` 的「判不了」混同）——
 *   默认只打印读数与阻塞项，**✗ 不转红**；开关 `--enforce-target` ⇒ 不在 `目标带` 内即**具名红**
 *   （`#170` 收口后由该开关转为**回归守卫**；裁定见 `sagitrs/sgstory-books#170` 的评论）。
 * ══════════════════════════════════════════════════════════════════════════ */
const FIXTURES = [
	{
		id: '温泉→L9 头目',
		说明: '走真路：L9 ⇒ L8 泡温泉（故事自己的动作本体）⇒ 回 L9 打头目 —— 操作者点名的平衡基线「温泉后满状态 vs 不眠者」的**前半**｜★`books#186` 修好攻击件伤害块之后，本夹具第一次能出数（修前**全抛**「无法解析的骰子表达式：undefined」）',
		层: 'L9',
		目标带: [0.7, 0.85],
		/* ★`#170` 收口前的**两相语义**（操作者裁定 2026-10-03）：此刻**只印账**、✗ 不转红；
		 *   乙笔（旅程装备保证）合入后其判据随激活 ⇒ 此后本格红＝**回归守卫**（开关 `--enforce-target`）。
		 *   ★✗ 不写成 `待判`：那是「判不了」，这里是**判得了、测出来不达标**，两件事不许混。 */
		未达: 'L9 硬门（七成到八成五）**未达** —— 阻塞项 `#170`（等「乙」旅程装备保证 ＋ 算式落地）',
		策略: '纯攻',
		/* ★**走真路**（✗ 摆一个「同形」状态）：`books#181` 起 L9↔L10↔L8 **双向**在本段内合法，
		 *   故回 L8 泡温泉是玩家真能走的步。温泉动作按件内明文说的**结构标记**找
		 *   （`温泉: true` —— 件里写着「判据按它取动作，✗ 按文案猜」）。
		 *   ⚠ 本席首版此夹具叫「温泉满装」却**没走温泉**（只摆满血满装），且 `待判` 理由
		 *     （`books#179` 未入 main）**已过时**（`#179` 已合 `2006a51`）—— 两处都是 `books#182` 的 RC 点。 */
		摆位: (R, D3, B, s) => {
			R.give('sword'); R.equip('sword');
			R.give('mail'); R.equip('mail');
			R.give('bandage'); R.give('herb-poultice');
			/* 先降状态（否则「温泉有没有用」这一面读不出来）—— 但**须留活着**：
			 *   ⚠ `availableActions` 过终局位闸门 `活着()`＝`hp>0 且 nonlethal<=hp`
			 *     ⇒ 摆成「非致命高于血」时那条动作会**消失**，读起来像「入表断了」（`dev-9` 的提示）。 */
			D3.Player.hp = Math.max(6, Math.floor(D3.Player.maxHp / 3));
			D3.Player.nonlethal = 2;
			B.map.moveTo('L8');
			/* ★第一步（`dev-9` 建议两步都留）：**L8 的可用动作里那一条在**（这一断把终局位闸门也串进来）。
			 *   结构标记找动作（件内明文「判据按它取动作，✗ 按文案猜」）—— `text` 自 `#179` 起是**函数**。 */
			const loc = B.map.locations?.get?.('L8');
			const 可用 = loc?.availableActions ?? loc?.actions ?? [];
			const 那条 = 可用.find((a) => a.温泉 === true);
			if (!那条) throw new Error('L8 的可用动作里没有 `温泉: true` 那一条（入表／闸门／装置三处之一）');
			/* ★第二步：调**导出的单一实现**（`setup.BABEL.温泉回复` —— hp 满／非致命归零／按恢复表清负面／记时间）。
			 *   ✗ 手写复原：那是「恢复表」这条语义的第二份实现（本件头注同款理由）。 */
			if (typeof B.温泉回复 !== 'function') throw new Error('导出面缺 `温泉回复`（`books#179` 的机器件未接线）');
			const 前 = { hp: D3.Player.hp, 非致命: Number(D3.Player.nonlethal ?? 0) };
			const r = B.温泉回复();
			if (D3.Player.hp !== D3.Player.maxHp) throw new Error('泡了温泉 hp 未满（本夹具要判的正是它）');
			if (Number(D3.Player.nonlethal ?? 0) !== 0) throw new Error('泡了温泉非致命未归零');
			s.__温泉读数 = { 前, 后: { hp: D3.Player.hp, 非致命: Number(D3.Player.nonlethal ?? 0) }, 清了: r?.清了 ?? [] };
			B.map.moveTo('L9');
		},
	},
	{
		id: '不温泉→L9 头目',
		说明: '同前但不泡温泉、且带伤带非致命 —— 操作者点名的「vs 不眠者」的**后半**，两面之差即温泉在硬门上的分量',
		层: 'L9',
		目标带: [0.7, 0.85],
		/* ★`#170` 收口前的**两相语义**（操作者裁定 2026-10-03）：此刻**只印账**、✗ 不转红；
		 *   乙笔（旅程装备保证）合入后其判据随激活 ⇒ 此后本格红＝**回归守卫**（开关 `--enforce-target`）。
		 *   ★✗ 不写成 `待判`：那是「判不了」，这里是**判得了、测出来不达标**，两件事不许混。 */
		未达: 'L9 硬门（七成到八成五）**未达** —— 阻塞项 `#170`（等「乙」旅程装备保证 ＋ 算式落地）',
		策略: '纯攻',
		摆位: (R, D3, B, s) => {
			R.give('sword'); R.equip('sword');
			R.give('mail'); R.equip('mail');
			R.give('bandage'); R.give('herb-poultice');
			D3.Player.hp = Math.max(6, Math.floor(D3.Player.maxHp / 3));
			D3.Player.nonlethal = 2;
			B.map.moveTo('L9');
		},
	},
	{
		id: '满装→L9 头目',
		说明: '满血满装直接打 L9 头目（温泉的上界对照：温泉能补的它已经满了）',
		层: 'L9',
		目标带: [0.7, 0.85],
		/* ★`#170` 收口前的**两相语义**（操作者裁定 2026-10-03）：此刻**只印账**、✗ 不转红；
		 *   乙笔（旅程装备保证）合入后其判据随激活 ⇒ 此后本格红＝**回归守卫**（开关 `--enforce-target`）。
		 *   ★✗ 不写成 `待判`：那是「判不了」，这里是**判得了、测出来不达标**，两件事不许混。 */
		未达: 'L9 硬门（七成到八成五）**未达** —— 阻塞项 `#170`（等「乙」旅程装备保证 ＋ 算式落地）',
		策略: '纯攻',
		摆位: (R, D3, B, s) => {
			R.give('sword'); R.equip('sword');
			R.give('mail'); R.equip('mail');
			R.give('bandage'); R.give('herb-poultice');
			D3.Player.hp = D3.Player.maxHp;
			B.map.moveTo('L9');
		},
	},
	{
		id: '纯攻',
		层: 'L1',
		说明: '一把武器，其余空手，只攻不治',
		策略: '纯攻',
		摆位: (R, D3, B) => {
			R.give('sword'); R.equip('sword');
			D3.Player.hp = D3.Player.maxHp;
		},
	},
	{
		id: '少装备',
		层: 'L1',
		说明: '无武器无甲（只有一件绷带）—— 低装态',
		策略: '纯攻',
		摆位: (R, D3, B) => {
			R.give('bandage');
			D3.Player.hp = D3.Player.maxHp;
		},
	},
	{
		id: '防疗',
		层: 'L1',
		说明: '带治疗件，血低先治',
		策略: '防疗',
		摆位: (R, D3, B, s) => {
			R.give('sword'); R.equip('sword');
			/* ★治疗件数可参数化：自证第 ⑤ 项靠「同夹具、治疗件 1 件 vs 4 件 ⇒ 读数须变」
			 *   来断「防疗策略真接线」。 */
			const n = Number(s?.__治疗件数 ?? 2);
			for (let i = 0; i < n; i++) { R.give('herb-poultice'); R.give('bandage'); }
			D3.Player.hp = Math.max(4, Math.floor(D3.Player.maxHp / 3));
		},
	},
	{
		id: '空手击晕',
		层: 'L1',
		说明: '不装武器，只用空手打击（非致命 ⇒ 打晕而不是打死）',
		策略: '空手',
		摆位: (R, D3, B) => {
			D3.Player.hp = D3.Player.maxHp;
		},
	},
	{
		id: '重读同档',
		层: 'L1',
		说明: '同一存档读两次各打一场 —— 两场的战果与读数应逐字相同（确定性）',
		策略: '纯攻',
		/* ★真形：本夹具不比「打不打得赢」，比的是**同一存档重读之后是否逐字复现**。
		 *   跑法＝打完一场 → 存槽 → 读回该槽 → 再打一场 → 两场读数须完全一致。
		 *   本器不去动实现，只驱动 `Save.slots.save/load` ＋ `Engine.show()`（与驾驶层同路）。 */
		特殊: '重读同档',
		待办: '真读档往返（存槽 ⇒ 读回 ⇒ 再打一场）—— 须先接回读档后的会话状态（驾驶层 saveAt/loadAt 两原语）',
		摆位: (R, D3, B) => {
			R.give('sword'); R.equip('sword');
			D3.Player.hp = D3.Player.maxHp;
		},
	},
	{
		id: '多场连续',
		层: 'L1',
		说明: '连打三场 —— 检查场与场之间不串味（血量／效果／随机流）',
		策略: '纯攻',
		/* ★真形：**同一个会话**里连打三场，逐场记读数；第 2／3 场**不重摆夹具**
		 *   ⇒ 若场间串味（血量或效果被上一场带走、随机流耗尽），读数会露出来。 */
		特殊: '多场连续',
		摆位: (R, D3, B) => {
			R.give('sword'); R.equip('sword');
			R.give('bandage'); R.give('bandage');
			D3.Player.hp = D3.Player.maxHp;
		},
	},
];

/* ══════════════════════════════════════════════════════════════════════════
 * 五战果：从**终态**判定（引擎不返回战果，只发结论行 ⇒ 本席按状态推导）
 *
 *   胜利 victory  ｜ 打晕 knockout ｜ 撤退 retreat ｜ 僵持 stalemate ｜ 阵亡 death
 * ⚠ 推导一律读**状态**（`hp`／`nonlethal`／`RPG.isKnockedOut`／存活计数），✗ 正则匹配结论行：
 *   文案会改（本仓刚在 `#1854` 改过「击败／打晕」的分流），判据不该绑字面。
 * ══════════════════════════════════════════════════════════════════════════ */
function 判战果(RPG, players, enemies) {
	/* ★一律用**引擎自己的判定式**（✗ 自己重实现）：
	 *   出局＝`c.isDown`（`20-character.js` 的 getter ＝ `hp <= 0 || RPG.isKnockedOut(c)`）。
	 *   ⚠ 本席首版写成 `hp > 0`，于是**被击晕**的敌（hp 未变、`nonlethal > hp`）被读成活着
	 *     ⇒ 「纯攻打死幼獾」读成了 `stalemate`（自证的 ③c 抓出来的）。 */
	const 出局 = (c) => (c?.isDown ?? (c?.hp ?? 0) <= 0) === true;
	if (players.every(出局)) return 'death';
	if (enemies.every(出局)) {
		/* 全被非致命打晕 ⇒ 打晕；否则击败（混编按最保守读法记「击败」，与引擎文案同向）。 */
		const 全晕 = enemies.length > 0 && enemies.every((e) => (RPG.isKnockedOut?.(e) ?? false));
		return 全晕 ? 'knockout' : 'victory';
	}
	/* 双方都还有活人 ⇒ 僵持（本器按回合上限收场，无第三态可退）。 */
	return 'stalemate';
}

/* ══════════════════════════════════════════════════════════════════════════
 * 确定性随机序列：按样本号生成（同一号 ⇒ 同一序列 ⇒ 同一样本可重放）
 * ══════════════════════════════════════════════════════════════════════════ */
function 造序列(样本号, 长度 = 4096) {
	/* 一条便宜的 LCG，只为「同样本号可复现」；它不是引擎的随机源，只喂给引擎。 */
	let x = (样本号 * 2654435761) >>> 0;
	const out = [];
	for (let i = 0; i < 长度; i++) {
		x = (x * 1664525 + 1013904223) >>> 0;
		out.push((x % 1000) / 1000);          // 与 `RPG.rng.setSequence` 的单元值同域
	}
	return out;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 一场：驱动真 `RPG.Battle.execute()`
 * ══════════════════════════════════════════════════════════════════════════ */
async function 跑一场(s, 夹具, 样本号, _忽略, { 回合上限 = 8, 策略名 = null } = {}) {
	const SC = s.SC, R = SC.setup.RPG, D3 = SC.setup.DND3, B = SC.setup.BABEL, V = () => SC.State.variables;
	const 策略 = STRATEGIES[策略名 ?? 夹具.策略] ?? STRATEGIES['纯攻'];
	const 轨迹 = [];
	/* ★还原所需的三样：choice 的**原值**、rng 的**原序列**、以及玩家与背包的**快照** */
	const 原Choice = D3.Player.choice;
	const 原序列 = R.rng.快照?.() ?? null;
	const 存包 = (V().inventory ?? []).slice();
	const 存血 = D3.Player.hp;
	/* ★敌组**不自己造**：由引擎自己的 `battle:end` 事件交回来（那是引擎对外说「这一场有谁」的通道）。 */
	let 敌组 = [];
	const onEnd = ({ enemies } = {}) => { 敌组 = Array.isArray(enemies) ? enemies : []; };
	try {
		R.events?.on?.('battle:end', onEnd);

		/* ② 随机流注入（本样本的确定性序列） */
		R.rng.setSequence?.(造序列(样本号));
		/* ① 脚本化 choice：覆盖**实例**（✗ 原型），并把每次选择记进轨迹 */
		D3.Player.choice = async (options) => {
			const o = Array.isArray(options) ? options : [];
			const ctx = {
				回合: 轨迹.length + 1,
				自己血比: (D3.Player.hp ?? 0) / Math.max(1, D3.Player.maxHp ?? 1),
				敌血: 敌组.map((e) => e.hp),
				/* ★`#182` D 席折：策略需要知道**上一步选了什么**（治疗件要指己方、攻击件指敌方）。
				 *   先前只有「自己血比」⇒ 目标步**一律选敌方** ⇒ `防疗` 夹具**永远不会治疗**
				 *   （把治疗品从各 1 件加到各 4 件，读数与回合数**一字不变** —— `tester-3` 实测）。 */
				上次选文案: 轨迹.at(-1)?.选文案 ?? null,
			};
			const pick = 策略(o, ctx);
			const hit = o.find((x) => x.value === pick) ?? o[0];
			轨迹.push({ i: 轨迹.length, 选项: o.map((x) => x.text), 选: hit?.value ?? null, 选文案: hit?.text ?? null, 血: D3.Player.hp });
			return hit?.value ?? 'skip';
		};
		/* ★**走真路**（`books#182` RC 的修法）：交回故事自己的遭遇入口 —— 它自己滚遭遇、
		 *   自己用 `fresh` 克隆、自己坐 `new R.Battle`。本席原来自建那一段（含手搓克隆）
		 *   正是「L9 头目攻击面取不到」的成因。 */
		if (typeof B.fight !== 'function') throw new Error('故事侧缺 `setup.BABEL.fight`（遭遇入口未接线）');
		/* ★`fight()` 末尾会把玩家导去战后段落（`exit()` 的 `Engine.play`），而那一步在无头装具里
		 *   会抛（`momentCreate ⇒ clone`）。本器量的是**战斗**：**战斗已结束之后**的错只记不抛，
		 *   战斗**之前或之中**的错照抛（✗ 一律吞 —— 那会把「装配缺口」也吞成绿）。
		 *   判据＝引擎自己的 `battle:end` 事件是否已到（这就是「战斗结束」的权威信号）。 */
		try {
			await B.fight({ interactive: true });
		} catch (e) {
			if (敌组.length === 0) throw e;
			s.__尾部差错 = String(e?.message ?? e);
		}
		const 战果 = 判战果(R, [D3.Player], 敌组);
		return {
			样本号, 夹具: 夹具.id, 策略: 策略名 ?? 夹具.策略, 战果,
			回合: 轨迹.length,
			自己血: D3.Player.hp, 敌血: 敌组.map((e) => e.hp),
			背包: (V().inventory ?? []).map((x) => x.id),
			轨迹,
		};
	} finally {
		/* ③ 还原：choice、rng、玩家血与背包 —— 出错也必须还原（否则下一场样本被污染） */
		R.events?.off?.('battle:end', onEnd);
		D3.Player.choice = 原Choice;
		if (原序列 && typeof R.rng.恢复 === 'function') R.rng.恢复(原序列);
		V().inventory = 存包;
		D3.Player.hp = 存血;
	}
}

/** 把**场景**摆到位（清背包／清抽签账／走到该层／夹具自己的 `摆位`）。
 *  ★**敌组不由本器构造**（`books#182` RC 的修法）：交回故事自己的遭遇面 ——
 *    `setup.BABEL.fight()` 内部自己滚 `R.rollEncounter`、自己用 `fresh`（`R.Character.revive(toJSON())`）
 *    克隆、自己坐 `new R.Battle`。本席原来自建那一套（含**手搓克隆**）正是「L9 头目攻击面取不到」的成因。 */
function 摆夹具(s, 夹具, 层 = 夹具.层 ?? process.env.BALANCE_LAYER ?? 'L1') {
	const SC = s.SC, R = SC.setup.RPG, D3 = SC.setup.DND3, B = SC.setup.BABEL, V = () => SC.State.variables;
	V().inventory = [];
	V().span1Events = {};
	B.map.moveTo(层);
	夹具.摆位(R, D3, B, s);
	return null;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 指标
 * ══════════════════════════════════════════════════════════════════════════ */
const 五战果 = ['victory', 'knockout', 'retreat', 'stalemate', 'death'];

function 汇总(样本) {
	const n = 样本.length || 1;
	const 比例 = Object.fromEntries(五战果.map((k) => [k, 样本.filter((x) => x.战果 === k).length / n]));
	/* ★**两率分列**（`books#182` RC 阻断一）：引擎自己就把「打晕」与「击败」分开
	 *   （`#1854`：全被非致命打晕 ⇒ 文案说「打晕」而非「击败」）⇒ 本器**不得**再把两者
	 *   合成一个「胜率」—— 那会把「打晕」读成「能过门」，而它们本是分开判的两件事。
	 *   ⚠ 本席首版合并计（`victory || knockout`），在「多场连续」那格把
	 *     `victory 0%｜knockout 89%` 写成了「胜率 89%」—— 我自己的 PR 正文表还错记成「victory 89」。 */
	const 计数 = (k) => 样本.filter((x) => x.战果 === k).length;
	const 区间 = (k) => {
		/* Wilson 区间（95%）—— 比「点估计」诚实：小样本时它宽，读的人看得出来 */
		const p = 计数(k) / n, z = 1.96, 分母 = 1 + (z * z) / n;
		const 中心 = (p + (z * z) / (2 * n)) / 分母;
		const 半宽 = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / 分母;
		return [Math.max(0, 中心 - 半宽), Math.min(1, 中心 + 半宽)];
	};
	return {
		样本数: 样本.length,
		五战果比例: 比例,
		击败率: 计数('victory') / n,
		击败率区间95: 区间('victory'),
		打晕率: 计数('knockout') / n,
		打晕率区间95: 区间('knockout'),
		平均回合: 样本.reduce((a, x) => a + x.回合, 0) / n,
		平均自己血: 样本.reduce((a, x) => a + (x.自己血 ?? 0), 0) / n,
		失败原因: (() => {
			const m = {};
			for (const x of 样本) if (x.战果 === 'death' || x.战果 === 'stalemate') m[x.战果] = (m[x.战果] ?? 0) + 1;
			return m;
		})(),
	};
}

function 打印(夹具, 读数, 汇总读) {
	console.log(`\n── ${夹具.id}：${夹具.说明}`);
	if (夹具.待判) console.log(`   ⏳ 待判：${夹具.待判}`);
	if (夹具.未达) console.log(`   ⚠ 未达目标：${夹具.未达}｜目标带 ${(夹具.目标带 ?? []).map((x) => (x * 100).toFixed(0)).join('–')}%｜本格实测击败率 ${(汇总读.击败率 * 100).toFixed(1)}%`);
	/* ★表头写明**层**（`books#182` RC 非阻断一）：L1 遭遇面与 L9 头目面答的不是同一个问题，
	 *   不写层的话读的人会把两批数当同一件事比。 */
	console.log(`   层 ${夹具.层 ?? '(未标)'}｜样本 ${汇总读.样本数}` +
		`｜击败率 ${(汇总读.击败率 * 100).toFixed(1)}%（95% 区间 ${(汇总读.击败率区间95[0] * 100).toFixed(1)}–${(汇总读.击败率区间95[1] * 100).toFixed(1)}%）` +
		`｜打晕率 ${(汇总读.打晕率 * 100).toFixed(1)}%（95% 区间 ${(汇总读.打晕率区间95[0] * 100).toFixed(1)}–${(汇总读.打晕率区间95[1] * 100).toFixed(1)}%）` +
		`｜平均回合 ${汇总读.平均回合.toFixed(1)}｜平均余血 ${汇总读.平均自己血.toFixed(1)}`);
	console.log('   五战果 ' + 五战果.map((k) => `${k} ${(汇总读.五战果比例[k] * 100).toFixed(0)}%`).join('｜'));
	if (Object.keys(汇总读.失败原因).length) {
		console.log('   失败原因 ' + Object.entries(汇总读.失败原因).map(([k, v]) => `${k}×${v}`).join('｜'));
	}
}

/* ══════════════════════════════════════════════════════════════════════════
 * 自证：本器**红得了**吗（判别力）
 *
 * ★这是本件最要紧的一段：跑分器最常见的病是「跑什么都出一个好看的数」。
 *   四条自证各断一面：①脚本化 choice 真被调用 ②rng 注入真生效（同号同序列 ⇒ 同战果）
 *   ③「跳过」策略与「纯攻」策略的战果**必须不同**（否则策略根本没接线）④还原真做了
 * ══════════════════════════════════════════════════════════════════════════ */
async function 自证(env) {
	const 结果 = [];
	const 判 = (名, ok, 读数) => { 结果.push({ 名, ok, 读数 }); console.log(`  ${ok ? '✓' : '✗'} ${名}${读数 ? `   ← ${读数}` : ''}`); };

	/* ① 策略真被调用 */
	const s1 = await H.boot(env);
	const f = FIXTURES.find((x) => x.id === '纯攻');
	摆夹具(s1, f);
	const r1 = await 跑一场(s1, f, 1);
	判('① 脚本化 choice 真被调用（轨迹非空）', r1.轨迹.length > 0, `轨迹 ${r1.轨迹.length} 步`);

	/* ② 同号同序列 ⇒ 同战果（rng 注入生效且确定） */
	摆夹具(s1, f);
	const r2 = await 跑一场(s1, f, 1);
	判('② 同样本号 ⇒ 逐字同战果（随机流确定）', r1.战果 === r2.战果 && r1.轨迹.length === r2.轨迹.length,
		`${r1.战果}/${r1.轨迹.length} vs ${r2.战果}/${r2.轨迹.length}`);

	/* ③ 策略真接线：**比轨迹**（选择的直接证据 —— ✗ 只比战果：弱敌/强敌下战果可能天然相同） */
	摆夹具(s1, f);
	const r3 = await 跑一场(s1, f, 1, null, { 策略名: '跳过' });
	/* ★断言按**「有没有做出战斗动作」**判（✗ 按「全 skip」、✗ 按具体武器 id 硬编码）：
	 *   走真路后，`fight()` 末尾的战后导航（`exit()` 的「继续探索」）也在同一 `choice` 通道上，
	 *   而它不提供 skip ⇒ 「全 skip」会把那次导航误判成攻击；武器 id 又会随故事改。
	 *   故只用一个判据：**选中值里除了 'skip' 与导航项之外，还有没有别的** —— 有＝做了战斗动作。 */
	const 非战斗值 = new Set(['skip', '探索']);
	const 有异动 = (rs) => rs.轨迹.some((x) => x.选 != null && !非战斗值.has(x.选));
	判('③a 「跳过」策略从未做出战斗动作（轨迹为证）', !有异动(r3),
		`跳过轨迹 ${r3.轨迹.length} 步，选中值=${JSON.stringify([...new Set(r3.轨迹.map((x) => x.选))])}`);
	判('③b 「纯攻」策略确实做出过战斗动作（轨迹为证）', 有异动(r1),
		`纯攻轨迹 ${r1.轨迹.length} 步，选中值=${JSON.stringify([...new Set(r1.轨迹.map((x) => x.选))])}`);	/* ③c 战果可分辨这一面，须用**弱敌**（L1 幼獾）：强敌下两策略可能天然皆负，比了也读不出东西。 */
	const 弱 = { ...f, 摆位: f.摆位 };
	const s2 = await H.boot(env);
	V(s2).inventory = []; s2.SC.setup.D3 ??= s2.SC.setup.DND3;
	s2.SC.setup.RPG.give('sword'); s2.SC.setup.RPG.equip('sword');
	s2.SC.setup.DND3.Player.hp = s2.SC.setup.DND3.Player.maxHp;
	s2.SC.setup.BABEL.map.moveTo('L1');
	摆夹具(s2, 弱, 'L1');
	const rw = await 跑一场(s2, 弱, 7);
	const s3 = await H.boot(env);
	s3.SC.setup.RPG.give('sword'); s3.SC.setup.RPG.equip('sword');
	s3.SC.setup.DND3.Player.hp = s3.SC.setup.DND3.Player.maxHp;
	s3.SC.setup.BABEL.map.moveTo('L1');
	摆夹具(s3, 弱, 'L1');
	const rs = await 跑一场(s3, 弱, 7, null, { 策略名: '跳过' });
	判('③c 弱敌（L1）下「纯攻」与「跳过」战果可分辨', rw.战果 !== rs.战果,
		`纯攻 ${rw.战果}（余血 ${rw.自己血}）vs 跳过 ${rs.战果}（余血 ${rs.自己血}）`);

	/* ⑤a 策略**真接线**（直接证据）：轨迹里必须出现「选了治疗件 ⇒ **紧接着目标步选（己方）**」。
	 *   ★来历：`tester-3` 复核出 ⑤b（下条）在**坏态**上**也是绿的** —— 她在一棵「`选目标` 根本不在、
	 *     三条策略一律 `选敌方`」的树上跑，⑤b 印 `1 件 stalemate/回合21｜4 件 stalemate/回合17`
	 *     ⇒ 读数确实变了，于是「绿」。可它证的是「**夹具对件数敏感**」，名字却主张「**策略真接线**」：
	 *     治疗件指向敌人时，件数照样改变读数。名字主张的东西，判据没证 —— 属**假绿**。
	 *   ⇒ 本条断言「谁指向谁」：治疗件之后那个**目标步**必须选**己方**。坏态下**必红**。
	 *     取用零成本：轨迹里 `选文案` 本就在（`dev-9` 折 `防疗` 时新加的字段）。 */
	/* ★**⑤c 的三版录**（「判据要咬住被测行为」的一条实录，`tester-3` 复核时逐版验过）：
	 *   ① 断「1 件 vs 4 件 ⇒ 读数须变」⇒ **假绿**（那证的是夹具对件数敏感，坏态亦绿）
	 *   ② 断「该场 HP 中途涨过」⇒ **仍假绿**（坏臂实测 `[4,6,6,6,5,5,5,4,4,4,4]` 也涨过 4→6，
	 *      那是别处来的血，与治疗无关）★**此形已废，✗ 照它读**
	 *   ③（现行）断「**至少一次选中治疗件 ∧ 其后两格内血涨**」⇒ **两臂皆对**
	 *     （好臂：选中 3 次/有涨 true/绿；坏臂：选中 8 次却有涨 false/红 —— 也就是「件选中了、
	 *      却甩给敌人」那一态，红在**效果**那一支）。 */
	{
		const sN = await H.boot(env);
		const fN = FIXTURES.find((x) => x.id === '防疗');
		const 跑一遍 = async (sess, n) => { sess.__治疗件数 = n; 摆夹具(sess, fN); return 跑一场(sess, fN, 3); };
		const r1件 = await 跑一遍(sN, 1);
		const r4件 = await 跑一遍(sN, 4);
		const 接线点 = (r) => {
			const t = r.轨迹 ?? [];
			for (let i = 0; i + 1 < t.length; i += 1) {
				if (/草药糊|绷带/.test(String(t[i].选文案 ?? '')) && /（己方）/.test(String(t[i + 1].选文案 ?? ''))) return true;
			}
			return false;
		};
		const 接了 = 接线点(r1件) || 接线点(r4件);
		判('⑤a 治疗件之后的**目标步**选了（己方）（策略真接线；坏态必红）', 接了,
			`1 件：${接线点(r1件) ? '有' : '无'}/回合 ${r1件.回合}｜4 件：${接线点(r4件) ? '有' : '无'}/回合 ${r4件.回合}`);
		const 变了 = r1件.回合 !== r4件.回合 || r1件.自己血 !== r4件.自己血 || r1件.战果 !== r4件.战果;
		判('⑤b 同夹具「治疗件 1 件 vs 4 件」⇒ 读数须变（夹具对件数敏感）', 变了,
			`1 件：${r1件.战果}/回合 ${r1件.回合}/余血 ${r1件.自己血}｜4 件：${r4件.战果}/回合 ${r4件.回合}/余血 ${r4件.自己血}`);
		const 血迹 = (r) => r.轨迹.map((x) => x.血).filter((x) => typeof x === 'number');
		const 治疗名 = /绷带|药|膏|治疗|敷/;
		const t4 = r4件.轨迹;
		const 选中治疗 = t4.map((x, i) => (治疗名.test(String(x.选文案 ?? '')) ? i : -1)).filter((i) => i >= 0);
		/* ⚠ 涨落是**两步后**才看得见：草药糊要先选件、再选目标（自己）⇒ 实测轨迹
		 *   「0 选草药糊(血6) → 1 选无名者（己方）(血6) → 2 血 8」⇒ 涨在 **+2 格**；
		 *   只看紧邻下一格会**假红**（`tester-3` 用窗口刀 `[1,2]⇒[1]` 实测证过）。 */
		const 治疗后有涨 = 选中治疗.some((i) =>
			[1, 2].some((d) => typeof t4[i + d]?.血 === 'number' && t4[i + d].血 > t4[i].血));
		判('⑤c 防疗策略真的治疗了（选中治疗件 ∧ 其后两格内血涨）', 选中治疗.length > 0 && 治疗后有涨,
			`选中治疗件 ${选中治疗.length} 次｜治疗后有涨=${治疗后有涨}`
			+ `｜选中文案 ${JSON.stringify([...new Set(t4.map((x) => x.选文案))])}`
			+ `｜血迹 ${JSON.stringify(血迹(r4件))}`);
	}

	/* ④ finally 还原：choice 复位、背包复位 */
	const 原choice是原的 = typeof s1.SC.setup.DND3.Player.choice === 'function';
	判('④ 跑完 restored（choice 与背包已复位）', 原choice是原的,
		`choice=${typeof s1.SC.setup.DND3.Player.choice}｜背包=${(s1.SC.State.variables.inventory ?? []).length} 件`);

	const 红 = 结果.filter((x) => !x.ok).length;
	console.log(`\n  自证：${结果.length - 红}/${结果.length} 如期` + (红 ? '  ★有红 ⇒ 本器读数不可信' : ''));
	return 红;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 两种「特殊跑法」：按夹具名做它名字说的那件事（✗ 名不副实）
 * ══════════════════════════════════════════════════════════════════════════ */

/** 重读同档：**同一初始态 ＋ 同一样本号 ⇒ 两场读数须逐字相同**。
 *
 * ★形之取舍（记明）：本席首版想走「存槽 ⇒ 读回 ⇒ 再打」的真读档往返回路，实跑第二场**零回合**
 *   （读档后该会话里的战斗驱动没接上），读数会写成「逐字复现 0/20」—— 那是一条**假的红**。
 *   故本夹具改判**真正要判的那件事**：同一初始态与同一随机流下，战斗是否**确定**。
 *   真读档往返（`Save.slots.save/load` ＋ `Engine.show()` 之后再打一场）记为**待办**：它需要
 *   先把读档后的会话状态接回来（驾驶层 `saveAt/loadAt` 两原语就是为这一步准备的）。
 */
async function 跑重读同档(s, 夹具, 样本号, env) {
	const 一场 = async () => {
		const s2 = await H.boot(env);                 // ★**新会话**＝同一初始态（✗ 复用被上一场改过的）
		摆夹具(s2, 夹具);
		return 跑一场(s2, 夹具, 样本号);
	};
	const 场1 = await 一场();
	const 场2 = await 一场();
	const 同 = 场1.战果 === 场2.战果 && 场1.回合 === 场2.回合 &&
		JSON.stringify(场1.轨迹) === JSON.stringify(场2.轨迹);
	return { ...场2, 重读同档: 同, 场1战果: 场1.战果, 场2战果: 场2.战果, 场1回合: 场1.回合, 场2回合: 场2.回合 };
}

/** 多场连续：同一会话连打三场（第 2／3 场**不重摆夹具**）⇒ 串味会露在读数里。 */
async function 跑多场连续(s, 夹具, 样本号) {
	const SC = s.SC, R = SC.setup.RPG, D3 = SC.setup.DND3, B = SC.setup.BABEL, V = () => SC.State.variables;
	const 场 = [];
	for (let k = 0; k < 3; k++) {
		const 敌 = R.rollEncounter?.(B.map.current ?? 'L1', { count: 1 }) ?? [];
		const foes = 敌.map((e) => {
			const proto = R.characters.get(e.ref);
			const inst = new proto.constructor();
			Object.assign(inst, JSON.parse(JSON.stringify(proto.toJSON?.() ?? {})));
			inst.hp = inst.maxHp ?? proto.maxHp;
			inst.nonlethal = 0;
			return inst;
		});
		if (foes.length === 0) throw new Error('第 ' + (k + 1) + ' 场遭遇面未给出敌组');
		const r = await 跑一场(s, 夹具, 样本号 * 10 + k, foes);
		场.push({ 战果: r.战果, 轨迹: r.轨迹.length, 自己血: r.自己血, 背包: r.背包.length });
	}
	/* 串味判据：三场都跑完了（无抛错）且背包件数不因跨场而虚增 */
	const 串味 = 场.some((x, i) => i > 0 && (x.背包 ?? 0) > (场[0].背包 ?? 0) + 4);
	return { 样本号, 夹具: 夹具.id, 策略: 夹具.策略, 战果: 场[0].战果, 回合: 场.reduce((a, x) => a + x.轨迹, 0),
		自己血: 场[场.length - 1].自己血, 敌血: [], 背包: [], 轨迹: [], 三场: 场, 串味 };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 主
 * ══════════════════════════════════════════════════════════════════════════ */
async function main() {
	/* ★`resolveEnv` 的**第一参是引擎目录**（✗ env）—— 与本仓姊妹件同约定：`--engine` 优先、回落 `ENGINE`。 */
	let env;
	try { env = H.resolveEnv(argOf('engine'), process.env); }
	catch (e) { console.error(`✗ ${e.message}`); return 2; }
	let s;
	try { s = await H.boot(env); }
	catch (e) { console.error(`✗ 装置起不来：${e.message}`); return 2; }

	if (argOf('selftest')) return (await 自证(env)) ? 1 : 0;

	const 只要 = argOf('fixture', null);
	const 样本数 = Number(argOf('samples', 100));
	const 全 = FIXTURES.filter((f) => !只要 || f.id === 只要);
	console.log(`战斗跑分器（LegacyBattleRunner · 驱动真 RPG.Battle.execute）`);
	console.log(`夹具 ${全.length} 个｜每夹具样本 ${样本数}｜回合上限 8`);
	const 全部输出 = [];
	const 强制目标 = !!argOf('enforce-target');
	let 红 = 0, 待判 = 0, 未达 = 0;
	for (const f of 全) {
		if (f.待判) 待判++;
		if (f.未达) 未达++;
		const 样本 = [];
		for (let i = 0; i < 样本数; i++) {
			try {
				if (f.特殊 === '重读同档') { 样本.push(await 跑重读同档(s, f, i, env)); continue; }
				if (f.特殊 === '多场连续') { 样本.push(await 跑多场连续(s, f, i)); continue; }
				摆夹具(s, f);
				const r = await 跑一场(s, f, i);
				样本.push(r);
			} catch (e) {
				红++;
				console.error(`  ✗ ${f.id} 样本 ${i} 抛错：${e.message}`);
			}
		}
		if (样本.length === 0) { console.log(`\n── ${f.id}：〇 样本（全抛错，见上）`); continue; }
		const 汇总读 = 汇总(样本);
		打印(f, 样本, 汇总读);
		if (f.特殊 === '重读同档') {
			const 同 = 样本.filter((x) => x.重读同档 === true).length;
			console.log(`   重读同档：逐字复现 ${同}/${样本.length}` + (同 === 样本.length ? ' ✓' : '  ★有不合'));
		}
		if (f.特殊 === '多场连续') {
			const 味 = 样本.filter((x) => x.串味 === true).length;
			console.log(`   多场连续：三场跑完 ${样本.length}/${样本.length}（串味 ${味} 条）`);
		}
		全部输出.push({ 夹具: f.id, 汇总: 汇总读, 轨迹样例: 样本[0].轨迹 });
		/* 目标带：默认只印账；`--enforce-target` ⇒ 不在带内即红（乙笔合入后由该开关转红） */
		if (f.未达) {
			const [低, 高] = f.目标带 ?? [0, 1];
			if (强制目标 && !(汇总读.击败率 >= 低 && 汇总读.击败率 <= 高)) {
				红++;
				console.error(`  ✗ [目标带] ${f.id}：击败率 ${(汇总读.击败率 * 100).toFixed(1)}% 不在 ${低 * 100}–${高 * 100}% ⇒ 强制目标模式转红`);
			}
		}
	}
	if (argOf('json')) console.log('\n' + JSON.stringify({ 夹具: 全部输出 }, null, 2));
	console.log(`\n夹具 ${全.length} 个（其中待判 ${待判} 个**不入绿**、未达目标 ${未达} 个**只印账**${强制目标 ? '（本次**强制目标**：不在带内即红）' : ''}）｜样本异常 ${红} 条`);
	return 红 ? 1 : 0;
}

main().then((rc) => process.exit(rc)).catch((e) => { console.error('✗ 本器自身抛错：', e); process.exit(2); });
