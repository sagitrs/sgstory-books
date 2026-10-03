/* 巴别之井 · 试玩版 —— 装配桥（遭遇 / 采集 / 单向门）
 *
 * 本文件是**故事侧的薄桥**：只做「谁调用谁」与**读数记账**，判定数学一律在被调方（`src/**`）。
 *   · 遭遇与掉落：`#1784`（B2）的 `RPG.rollEncounter` / `RPG.rollLoot`（层表驱动，抽 1 组）
 *   · 战斗：`RPG.Battle`（core）—— 战败者的随身物由 `Battle.execute()` 内**自动** `RPG.loot`
 *   · 战败终端：**游戏失败**（`books#176` 的操作者裁定②：**死亡＝游戏失败、不复活**）—— 走本档的
 *     `setup.BABEL.结算战败`（三源共用）⇒ 印终局行 ＋ 跳「游戏失败」段落（读档／重开两钮）。
 *     ⚠ 旧终端 `RPG.respawn`（core，#1772：掉落 ＋ 清档 ＋ **回起点层**）**已按裁定废止其故事侧用法**
 *       —— 引擎侧函数仍在（引擎自身契约不变），但故事侧**不再调用**它。
 *   · 采集：`RPG.gather`（core，#1776）｜建造/收获：包内的 `RPG.act(…, 'build')` / `RPG.harvest`
 *
 * ⚠ **依赖声明（软依赖）**：遭遇/掉落面来自 `#1784`（`src/core/65-encounters.js`）。
 *   该面未接线时本文件**显式报出**并拒绝玩下去（✗ 静默降级 —— 静默降级会让「遭遇永不发生」
 *   看起来像「这一层本来就没怪」，与 `#1766` 的「静默不触发」同族）。
 */

const DND3 = setup.DND3;
const R = setup.RPG;
/* ★`books#180`：战后段的**战果判定**是必需件（`world/boss.js` 的 `战果`）——装载期就查。
 *   ⚠ **不接受回落旧形**（`foes.every(isDown)` 那条）：它会把「打晕／同归于尽」静默读成胜利，
 *     而这条静默**没有判据看得见**（本席首版写成 `setup.BABEL.战果?.(...) ?? 旧形` ⇒ 真实战斗路
 *     可以悄悄退回旧规则）。装载序：`world/boss.js` 在 `world/encounters.js` **之前**（按路径排序）。 */
if (typeof setup.BABEL.战果 !== 'function') {
	throw new Error('[encounters] 缺 `setup.BABEL.战果`（`world/boss.js` 未先装载？）—— 战后段不接受回落旧形');
}

const run = () => (State.variables.babelRun ??= { deaths: 0, kills: 0, gathered: 0, harvests: 0, traumasSeen: [], deepest: 'L1', 时间: 0 });

/**
 * 取一个**新鲜的**怪物实例。
 *
 * 注册面（`RPG.characters`）里的是**单例**（`defCharacter` 的返回值），它的 `hp` 会被战斗改写 ⇒
 *   直接拿单例打第二场，会得到「已经死了的怪」（旧宅 e2e 保留了这个形）。
 * 副本走 `Character.revive(JSON.parse(JSON.stringify(proto.toJSON())))` —— 与**存档往返同一条通路**，
 *   ✗ 手搓字段（手搓会漏字段，且与 `#1758` 的 revive 钩子面脱钩）。
 *
 * `elite`（遭遇表的既有标记，`#1748` 称「只标不消费」）在本试玩版的消费方式是**可见命名**
 *   （「精英·獾」）：**house rule（非 SRD）** —— 不给它加数值，理由：① SRD 3.5 无「精英动物」模板
 *   （`Monsters/Monsters - Animals.md` 的 Badger 条目无此形），② 无源的数值强化会污染段内定标
 *   （`SPAN1_SCALING` 的 crBand 是按 CR 算的），③ 遵 `#1706` ⇒ ✗ 用随机强化冒充。
 */
const fresh = (ref, elite) => {
	const proto = R.characters.get(ref);
	if (!proto) throw new Error(`[babel] 遭遇表引用了未注册的角色 id「${ref}」`);
	const copy = R.Character.revive(JSON.parse(JSON.stringify(proto.toJSON())));
	if (elite) copy.name = `精英·${copy.name}`;
	return copy;
};

/**
 * 当前所在地点所属的层 id（`L10-camp` ⇒ `L10`；判不出 ⇒ null）。
 *
 * 权威读法是 `#1784` 的 `RPG.layerOfLocation`（**最长前缀匹配**，因为整备区的地点 id 形如 `L10-camp`）。
 * 该面缺席时用**本图的命名约定**兜底：L1–L9 的地点 id **就是**层 id（`/^L\d+$/`）。
 * ⚠ 兜底**不覆盖**整备区（`L10-camp` 判不出 ⇒ 采集/遭遇在 L10 自然不发生，与语义一致）——
 *   故两种读法在「哪些地点有遭遇」上**同结论**，不引入第二套层语义。
 */
setup.BABEL.layerOf = () => {
	const id = setup.BABEL.map.current;
	if (!id) return null;
	if (typeof R.layerOfLocation === 'function') return R.layerOfLocation(id)?.id ?? null;
	return /^L\d+$/.test(id) ? id : null;
};
/** 该层的采集点 id */
setup.BABEL.gatherOf = (layerId) => setup.BABEL.gatherPoints?.[layerId] ?? null;

/* ---------- 采集（`#116`：节点挂地点，✗ 进背包）----------
 * ## 与旧形的差别（旧＝`#1776`「采集点须先在背包里」）
 *   旧：`RPG.gather(pointId)` 缺省取**玩家背包**语义 ⇒ 须先「翻找」把节点 `R.give` 进包。
 *   新：节点存在**层节点账**（`babel.js` 的 `span1Nodes`），**玩家背包里永无采集点**。
 * ## 怎么做到（★引擎零改动 —— `#116` 勘察实证）
 *   `RPG.act(actor, itemRef, target, action, from)` 的 `from` 是既有参数；而 `RPG.gatherFrom`
 *   用 `who = from ?? that` 决定**产出进谁**、并把 charges 扣在 **actor 持有的那个实例**上。
 *   ⇒ 用一个**临时 holder**（伪容器 `{ items: [节点快照] }`）当 actor，把 `from` 显式给**玩家**
 *     ⇒ **节点留账**、**产出进玩家背包**、charges 扣在 holder 的实例上 ⇒ 再由 `commitNode` 写回账。
 *   ⚠ 写回**必须**做：`act` 的 commit 只写 **actor 的槽**，而 actor 是临时 holder ⇒
 *     不写回则每次采集都从账里读旧 charges ⇒ 表面「采了不耗」（本席勘察实测到该形）。
 */
setup.BABEL.gather = () => {
	/* ★键须是**地点 id**（`map.current`），✗ 层元 id（`layerOf()`）。
	 *   实测（本席 `#116` 落码时撞到）：`L20-settlement` 的 `layerOf()` ＝ **`'L20'`**（层元），
	 *   而采集点登记在**地点** `'L20-settlement'` 上 ⇒ 用 `layerOf()` 取 ⇒ `gatherOf` 得 null
	 *   ⇒ 动作早退（且若某层元下另有同名点会**取错点**）。
	 *   ⇒ 采集点是**地点**的特征（本票的模型）⇒ 一律按**地点 id** 取。 */
	const layer = setup.BABEL.map?.current ?? null;
	const point = setup.BABEL.gatherOf(layer);
	if (!point) return R.perform('这里没有可采的东西。');
	const player = R.playerActor();
	if (!player) return R.perform('你还没有身体可以采东西。');
	/* 临时 holder：只为让 `act` 找得到「槽」（`RPG.act` 要求 itemRef ∈ actor.items）。
	 * 用**账里快照的拷贝**（✗ 直接塞快照 —— 否则 act 内 `reviveItem` 的改动会先落到账上，
	 * 而我们要的是「采成或拒绝**之后**统一写回」，保持单点收口）。 */
	const held = { items: [{ ...setup.BABEL.nodeAt(layer) }] };
	const res = R.act(held, point, player, 'gather', player);
	if (res && res.status === 'applied') {
		setup.BABEL.commitNode(layer, held);   // 单点写回（charges 已扣）
		run().gathered += 1;
	}
	return res;
};

/* ---------- 遭遇 + 战斗（#1784 + core）----------
 * 一战一抽：抽 1 组遭遇（`count: 1`）⇒ 副本实例 ⇒ 交互战（8 回合上限）⇒
 *   胜 ⇒ 掉落表抽一次并进背包｜败 ⇒ 走 `setup.BABEL.结算战败`（**游戏失败**：不复活、位置留原地、
 *   清档与回 L1 都**不再发生**）⇒ 跳「游戏失败」段落。
 */
/**
 * @param opts.interactive `true`（缺省）= 玩家亲自操作（`Battle` 的交互通路，回合内等玩家选动作）；
 *   `false` = 全自动通路。**自动通路是给无头自检用的**（交互通路要等 UI 选择 ⇒ 无头环境会挂起，
 *   见 `stories/babel/verify.mjs` 的用法）；玩家路径一律用缺省值。
 */
/* ---------- `books#171`～`#176`：玩家受伤后的**统一结算入口**（三源共用）----------
 * 由来（操作者试玩 03:20 报，无头三步复现）：层进入的**危害**把人打到 0 血时，`hp=0`、`isDown`
 *   为真、而 **`death` 效果不在**，于是 `RPG.respawn` 按契约**拒绝**（引擎 `40-battle.js:204`
 *   「非死亡态即早退」），结果 **0 血仍可继续移动**且死亡不计数。
 *   ⇒ 根因：`RPG.applyDamage` **不施加 `death`**（引擎面有意，死亡判定归各包的 `grantDeathIfDown`），
 *     而故事侧的危害路只调了 `applyDamage`。战斗路看着正常，只因战战伤害在**包侧**战场内补了。
 *
 * ★★**终端语义（`books#176`，操作者裁定 2026-10-03 03:52 第②条·核心反转）：死亡＝游戏失败、不复活**
 *   旧形（`RPG.respawn`：回起点层、清档、hp 复位）**废止** ⇒ 现终端＝**失败画面**
 *   （`story/play.twee` 的 `游戏失败`）＋「**读档**／**重开**」两钮；L1–9 的「死亡清背包、回第 1 层」
 *   教学随之作废（`:: 死亡回溯` 段已删）。
 * 骨架不变（`books#171` 已立）：① 倒下才进场；② 缺 `death` 标记则补（`DND3.grantDeathIfDown`，
 *   它自己判 `hp <= 0`）；③ **真终局才计数·印行·跳段**；④ 呼叫方收到 `settled` 须停手。
 * **幂等**：本局终局后 `babelRun.终局` 为真 ⇒ 三源重复调用在第一道门就早退
 *   （✗ 不再靠 `respawn` 复位 hp 来化：不复活以后尸体会恒在，没这道账每调一次都会重结算）。
 * @param {object} [opts]
 * @param {string} [opts.源] 来源名（读用：'进入'／'战斗'／'UI'）
 * @param {string} [opts.层] 死亡发生的层 id（缺省取当前层；**须在跳段前取**）
 * @returns {{settled: boolean, reason: string, 死前层?: string}} */
setup.BABEL.结算战败 = ({ 源 = '未知', 层 = null } = {}) => {
	const P = DND3.Player;
	if (!P || P.isDown !== true) return { settled: false, reason: '未倒下' };
	if (run().终局 === true) return { settled: false, reason: '本局已终局' };   // 幂等门（不复活 ⇒ 尸体恒在）
	const 死前层 = 层 ?? setup.BABEL.layerOf?.() ?? null;
	if (typeof DND3.grantDeathIfDown === 'function') DND3.grantDeathIfDown(P);
	/* ★不复活：**不调 `respawn`**（它会把位置搬回起点层、清档、把 hp 填满 —— 那是被本裁定推翻的旧终端）。 */
	run().终局 = true;
	run().deaths += 1;                  // ★语义＝「本局战败次数」（结算屏标签随之改）
	/* `#1798` B4：终局是**结论行** ⇒ 走 `death` 通道（`key`），「仅关键」档下仍进正文。 */
	R.perform(`你在第 ${String(死前层 ?? '?').replace('L', '')} 层倒下了 —— 这一局到此为止。`, { channel: 'death' });
	SugarCube.Engine.play('游戏失败');
	return { settled: true, reason: 源, 死前层 };
};

/* ---------- `books#176`：失败面的「读档」入口（能力探测）----------
 * SugarCube 的存档面板＝`UI.saves()`；无头／桩环境里 `UI` 可能缺席 ⇒ **探测后出声回落**
 *   （✗ 抛穿 DOM —— 那会让失败面变成一个点下去没反应的按钮）。
 * ⚠ 取宿主与 `story/hooks.js` 同形：`SugarCube` 优先、回落 `globalThis`（裸 `UI` 在本产物里不可靠）。
 * ⚠ 本函数**必须挂在 `world/`**：装载序是 `meta/` → `story/` → `ui/` → `world/`（按路径排序）
 *   ⇒ 放 `story/hooks.js` 会在 `setup.BABEL` 建立之前赋值 ⇒ 整脚本抛（本席实跑撞到，见提交记）。
 * ★快速存档的**易用性面**属 `#172` 批 2（本入口只负责「把面板开出来」）。 */
setup.BABEL.读档 = () => {
	const UI = (globalThis.SugarCube ?? globalThis)?.UI;
	if (typeof UI?.saves === 'function') return UI.saves();
	console.warn('[BABEL] 存档面板不可达（`SugarCube.UI.saves` 缺席）—— 请用侧栏的存档入口读档。');
	return false;
};

/* ══════════════════════════════════════════════════════════════════════════════
 * `books#178` 件 1：**快速存档 UI**（`#172` §8.2 · 三槽制 · 战斗外常驻）
 *
 * ★宿主面（本席**实测**取得，✗ 读压缩产物推断）：`SugarCube.Save.slots` ＝
 *   `{ ok, length, isEmpty, count, has, get, load, save, delete }`；`length` 为 **8**
 *   （`Config.saves.maxSlotSaves = 8` ⇒ 票面「≥3」**已满足**，无需改配置）。
 *   存：`slots.save(i, 名称)`；读：`slots.get(i)` ⇒ 元数据 `{type,desc,date,id,rpgSave}`。
 *   ★**名称落在 `desc`**（✗ 不叫 `title`）—— 本席实测所得，勿凭印象写成 `title`。
 *
 * 三槽（票面 §8.2）：槽 0 快存（主动覆盖）｜槽 1 战前保底（整备点自动写·最新胜）｜槽 2 手动。
 * P0：**战斗中禁存** —— 由 `setup.BABEL.战中` 门控，`fight()` 在战前置位、战后清零。
 ══════════════════════════════════════════════════════════════════════════════ */
/* ★★**为什么从 3 号起**（领队裁 甲案 · `dev-10` 取证）：SugarCube 的**自动存档**与槽位存档
 *   共用**同一套编号**，而自动存档环从**低号**开始（`Save.browser.auto` 的环索引）。
 *   ⇒ 若故事槽占 0/1/2，玩家存过之后**下一次触发自动存档**会写进同一号 ⇒ 分工失真。
 *   · 宿主报 `maxSlotSaves = 8` ⇒ 3/4/5 在环外且有余量。
 *   · **✗ 不停用自动存档**：它是玩家崩溃时的保险（领队裁「宿主自动档留低号照常活」）。
 *   · 另一支撑（`dev-10` 转来 · 引擎 `sgstory#1912` 作者核）：把 `maxAutoSaves` 写回 0
 *     **不算关掉** —— 宿主下次读配置时又抬回 1 ⇒ 停用还得额外 pin，代价更高。 */
const 槽位 = Object.freeze({ 快存: 3, 战前保底: 4, 手动: 5 });
setup.BABEL.槽位 = 槽位;
setup.BABEL.战中 = false;

/** 宿主槽位面（缺席即 null —— 无头／桩环境）。 */
const 宿主槽 = () => (globalThis.SugarCube ?? globalThis)?.Save?.slots ?? null;
setup.BABEL.宿主槽 = 宿主槽;

/** 槽位上限（宿主不报 ⇒ 退回**本笔用到的最高号＋1**；✗ 写死旧下限 —— 甲案改号后 3 号被误判越界，
 *   正是 ㉟ 格抓到的那个缺陷）。 */
const 槽上限 = () => (globalThis.SugarCube ?? globalThis)?.Config?.saves?.maxSlotSaves ?? (槽位.手动 + 1);

/** **自动命名**（票面 §8.2：带**真实层数**）：`层·地点名`，战前保底再加 `·战前`。 */
setup.BABEL.存档名 = ({ 战前 = false } = {}) => {
	const m = setup.BABEL.map;
	const 层 = setup.BABEL.layerOf?.() ?? null;
	const 地名 = m?.locations?.get?.(m.current)?.name ?? String(m?.current ?? '未知');
	return `${层 ?? '?'}·${地名}${战前 ? '·战前' : ''}`;
};

/** **可否存档**（P0：战斗中一律拒绝；宿主或槽位不可用亦拒）。 */
setup.BABEL.可存 = (slot = 槽位.快存) => {
	if (setup.BABEL.战中) return false;
	const S = 宿主槽();
	if (typeof S?.save !== 'function') return false;
	return Number.isInteger(slot) && slot >= 0 && slot < 槽上限();
};

/** **写槽**（底层 · ✗ 出文案）：能力与 P0 判据在此**一处**，上层两个入口共用。 */
setup.BABEL.写槽 = (slot = 槽位.快存, opts = {}) => {
	if (setup.BABEL.战中) return null;               // P0：战斗中一律不写（★与 `可存` 同源）
	if (!setup.BABEL.可存(slot)) return null;
	const 名 = setup.BABEL.存档名(opts);
	宿主槽().save(slot, 名);
	return 名;
};

/** **快存**（玩家主动）：`slot` 缺省＝槽 0。**战斗中拒绝并给玩家可读文案**（✗ 静默）。 */
setup.BABEL.快存 = (slot = 槽位.快存, opts = {}) => {
	if (setup.BABEL.战中) { R.perform('战斗中不能存档 —— 先离开这一场。'); return false; }
	const 名 = setup.BABEL.写槽(slot, opts);
	if (名 === null) {
		console.warn('[BABEL] 存档不可达（`Save.slots` 缺席或槽位越界）—— 请用侧栏的存档入口。');
		R.perform('这里的存档入口暂时不可用。');
		return false;
	}
	R.perform(`已存档：${名}`);
	return true;
};

/** **战前保底**（`#172` §8.2 · 领队裁）：**整备点自动写槽 1**，最新胜。
 *   两个触发点——**温泉使用完成**与**进入 L9 门前营地**（一处函数，两处调用）。
 *   ★**失败面 ✗ 覆盖**：`战中` 判据与「快存」**同源**（死亡路径上 `战中` 仍为真 ⇒ 写不进）；
 *     且本函数**只在整备点被调用**，死亡路径不调它（✗ 靠调用点自律，见 `写槽` 的门）。
 *   ★「可手清」＝宿主存档面板对槽位存档的删除（槽号由 `槽位.战前保底` 给出）。 */
setup.BABEL.战前保底 = (来源 = '整备') => {
	const 名 = setup.BABEL.写槽(槽位.战前保底, { 战前: true });
	if (名 === null) return false;
	R.perform(`（${来源}已留下保底存档：${名} —— 失败后可从这里再来。）`);
	return true;
};

/** **快读**：槽位空 ⇒ 出声回落（✗ 静默无反应 —— 那会让按钮看起来坏了）。 */
setup.BABEL.快读 = (slot = 槽位.快存) => {
	const S = 宿主槽();
	if (typeof S?.load !== 'function' || typeof S.isEmpty !== 'function') {
		console.warn('[BABEL] 读档不可达（`Save.slots` 缺席）—— 请用侧栏的存档入口。');
		R.perform('这里的读档入口暂时不可用。');
		return false;
	}
	/* ★★**槽位空否的判据只能用 `has`，不能用 `isEmpty`**（本席实测，`#183` 调查所得）：
	 *   真宿主的 `isEmpty(i)` **一旦有过任何写入**就对**所有号**返回假（空槽亦然），
	 *   而 `has(i)` 逐号准确；且 `get(i)` 对**空槽**也返回占位对象（其字段为 undefined）
	 *   ⇒ 拿 `isEmpty` 当空否判据，会把空槽当有档去读（本席的旧形正是如此）。
	 *   `has` 缺席时才退回 `isEmpty`（更老的宿主），并**明知其不可靠**。 */
	const 空否 = typeof S.has === 'function' ? !S.has(slot) : S.isEmpty(slot);
	if (空否) { R.perform('这个存档位还是空的。'); return false; }
	S.load(slot);
	return true;
};

setup.BABEL.fight = async ({ interactive = true } = {}) => {
	/* ★**早退出口**（`#1877` P1-6）：本段原靠一条静态链 `[[打完，继续探索|探索]]` 兜底，
	 *   而静态链在**段落渲染时**即出现（战斗根本还没打）⇒ 玩家以为已打完了。
	 *   现改为：**早退发生时**才把出口落页底（与主出口共用下面同一个 `choice` 通道 —— `#1856`）。
	 *   ⚠ `RPG.perform` 返回 `this`（**非 thenable**）⇒ 不能用 `.then()` 链，得用 `bail()` 包一层。
	 *   ⚠ 仍必须门控 `interactive`（无头自检里没人可点，`await choice` 会**永久挂起**）。 */
	const exit = () => {
		if (!interactive) return undefined;
		return DND3.Player.choice([{ text: '继续探索', value: '探索' }]).then((v) => SugarCube.Engine.play(v));
	};
	const bail = (msg) => { R.perform(msg); return exit(); };
	const layer = setup.BABEL.layerOf();
	if (!layer) return bail('这里没有可遭遇的东西。');
	if (typeof R.rollEncounter !== 'function' || typeof R.rollLoot !== 'function') {
		/* ★`#1863` 两层拆：**开发者信号走 console**（票号＋源码路径＋API 名 —— 那是写给接线者的）。
		 *   玩家层**仍出声**（✗ 静默 —— 静默会让「遭遇永不发生」被读成「这层本来就没怪」，见文件头 `#1784` 惯例）；
		 *   白话保留「**本该有东西、可这里没有**」的异常感，✗ 删该信息。 */
		console.warn('[BABEL] 装配缺口：遭遇面未接线 —— 需要 `#1784`（`src/core/65-encounters.js`）的 `RPG.rollEncounter`／`RPG.rollLoot`。');
		return bail('这一层静得出奇——按理该有东西挡路的。');
	}
	const rolled = R.rollEncounter(layer, { count: 1 });
	if (rolled.length === 0) return bail('这一层今天什么都没有挡路。');
	const foes = rolled.map((e) => fresh(e.ref, e.elite));
	R.perform(`挡在前面的是：${foes.map((f) => f.name).join('、')}。`);

	/* ★`books#178` P0：**战斗中禁存** —— 战前置位、`finally` 清零（异常路径也要清零，
	 *   否则一次抛错会把「禁存」永久留在盘上，玩家此后哪都存不了）。 */
	setup.BABEL.战中 = true;
	try {
		await new R.Battle(8, [DND3.Player], foes, interactive).execute();
	} finally {
		setup.BABEL.战中 = false;
	}

	/* ★`books#180`：胜／僵持／击晕／失败**只在一处判**（`setup.BABEL.战果`）——
	 *   旧形把「胜」写成 `foes.every(isDown)`，与下面的「玩家是否也倒了」**相邻且不互斥** ⇒
	 *   同归于尽时**先发了战利品**、再走失败流。现在：先取战果，各消费者按它分支。 */
	const 果 = setup.BABEL.战果({ foes, player: DND3.Player });

	if (果 === 'victory') {
		run().kills += foes.length;
		const loot = R.rollLoot(layer);
		for (const l of loot) R.give(l.id, l.n);
		/* ★`books#132`：本层**必掉**（L2 绷带／L4 钥匙）—— 在随机掉落**之后**补授 ⇒ 与随机面不冲突。
		 *   设计动因：L2「战后 100% 掉落绷带」是**治疗门控**链的入口（L3 战前打绷带）；L4 钥匙同理。 */
		for (const id of (setup.BABEL.弧必掉?.[layer] ?? [])) {
			R.give(id);
			R.perform(`你还从它身上翻出了：${R.items.has(id) ? R.createItem(id).name : id}。`);
		}
		if (loot.length > 0) {
			R.perform(`战利品：${loot.map((l) => `${R.items.has(l.id) ? R.createItem(l.id).name : l.id}×${l.n}`).join('、')}。`);
		}
		/* ★`books#180`：**只有真胜利**写进度（打晕／僵持／失败都不写）—— 头目硬门的数据源。 */
		setup.BABEL.记战果?.(layer, 果);
	}

	/* ★`books#180`：头目战场上的**非胜利收场** ⇒ 退回**准备区**（操作者裁定「撤退落点＝准备区」；
	 *   本仓的交互战斗没有独立「撤退」机制 ⇒ 「撤退」＝**未胜而离场**，与僵持／击晕同一条落点）。
	 *   ⚠ 位置写在 `map.moveTo`（✗ 只改读数）：下一屏就是准备区那张图。 */
	if (果 !== 'victory' && !DND3.Player.isDown && setup.BABEL.落准备区?.(layer)) {
		R.perform('它没有追出来。你退回门前的营地，喘了口气。');
	}

	if (DND3.Player.isDown) {
		/* ★`books#171`／`#176`：改走**统一入口**（`setup.BABEL.结算战败`）—— 与危害源共用一处，
		 *   且**只在真终局时**计数／印行（旧形无条件 `deaths += 1`）。
		 *   ★终端＝**游戏失败**（不复活）：跳段在入口内统一做 ⇒ 两个源同形（本处不再单独跳）。 */
		const r = setup.BABEL.结算战败({ 源: '战斗', 层: layer });
		if (r.settled) return;
		/* ★未终局（如本局已终局）⇒ **不装死**：出声 ＋ 把出口照常落页底（✗ 静默——那会让玩家停在死状）。 */
		return bail(`你倒下了，可这一局没能结算（${r.reason}）—— 先喘口气。`);
	}

	/* ── 出口：**必须落在页底**（`#1856` 复现；`#1877` P1-6 把「静态兜底」也收归此处）──────────
	 * ★症状（操作者实测）：僵持收场后「没有任何按钮」⇒ 以为软锁，只能刷新。
	 * ★根因（本席 jsdom 实测，✗ 推断）：本仓的约定是「**输出落页底**」——
	 *   `perform` 与 `choice` 都把内容插在 `.statusbar` **之前**（`01-perform.js:23`／`02-choice.js:36`），
	 *   而段落里的静态链接渲染在**段落顶部**。战斗中玩家被**页底的按钮与日志**钉住
	 *   （每回合都要点页底按钮，且每回合又往页底追加 4–6 行）⇒ 战斗一结束按钮消失，
	 *   唯一的出口在**上方 30–58 个元素之外** ⇒ 玩家看不到。
	 *   ★实测读数：僵持 ⇒ 出口在子元素 index 3/62（其后 58 个）；胜 ⇒ 3/34（其后 30 个）；
	 *     SugarCube 仅在**段落显示时** `window.scroll(0,0)`，战斗中**再无**滚动 ⇒ 视点不回顶部。
	 * ★修法：让出口走**与其它输出同一条**通道（`choice` 自动落页底）⇒ 出口出现在玩家正在看的地方。
	 * ⚠ 仅**交互**通路给出口：无头自检（`verify.mjs` 的 `{ interactive: false }`）里没人可点，
	 *   `await choice(...)` 会**永久挂起** ⇒ 必须门控（本席按此实现，✗ 无条件 await）。 */
	if (interactive) {
		const v = await DND3.Player.choice([{ text: '继续探索', value: '探索' }]);
		SugarCube.Engine.play(v);
	}
};

/**
 * 读数：把玩家**当前持有**的创伤记进「本局见过」的集合。
 *
 * 为什么要这个：创伤没有「被施加」事件（施加是 `c.add(id)` 的通用路径）⇒ 从**持有态**反推
 *   是本仓可用的最省做法。代价：若某条创伤在两次调用之间被施加又解除，会计不到 —— 试玩版的
 *   读数不需要那个精度（已在 README 的「已知面」里写明）。
 */
setup.BABEL.noteTraumas = () => {
	const seen = run().traumasSeen;
	for (const id of Object.keys(DND3.Traumas)) {
		if (DND3.Player.contains(id) && !seen.includes(id)) seen.push(id);
	}
	return seen;
};
