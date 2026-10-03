/* 巴别之井 · 试玩版 —— **装配自检**（故事侧脚本，✗ 规则内核）
 *
 * 这个脚本回答一个问题：**「这一段线真的能走通吗？」**
 *   —— 用车间的头无头环境（与 `tests/unit/headless.mjs` 同一套 shim）把**插件 ＋ 故事脚本**装起来，
 *      然后按票面的可玩线走一遍：L1 苏醒 → 采集 → 遭遇 → 战斗 →（死/胜）→ 聚落建设 → 单向门 → 收尾。
 *
 * 它**不是**规则用例（判定数学的用例在 `tests/unit/**`，归测试席）；这里只核**装配**：
 *   地图是否合法、层是否可达、单向门是否真的单向、跨包 API 有没有接错、桥函数的读数对不对。
 *
 * 用法（先构建，再跑）：
 *     python3 build.py stories/babel --out babel-trial.html
 *     node stories/babel/verify.mjs
 * 退出码：全部通过 0；有失败 1（并逐条打印）。
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const here = import.meta.dirname;

/* ---------- 引擎根（`books#76` 相 A：故事与引擎**可**分仓）----------
 *   ① **同仓布局**（故事住在 `sgstory/stories/<名>` 里）⇒ 引擎根＝两个上级（缺省，本仓现状）；
 *   ② **拆分布局**（故事在 books 仓、引擎在别处检出）⇒ `--engine <引擎检出目录>`。
 * ⚠ 引擎根不对 ⇒ **显式报错**（✗ 静默按「文件不存在」崩 —— 那会把「路径配错」伪装成「装配坏了」）。 */
const argOf = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const engineArg = argOf('--engine');
const root = engineArg ? path.resolve(engineArg) : path.resolve(here, '..', '..');
const shimsPath = path.join(root, 'tests/unit/framework/shims.js');
if (!fs.existsSync(shimsPath)) {
	console.error(`✗ 引擎根不对：${root}\n  在该处找不到 ${path.relative(root, shimsPath)}`
		+ '\n  ⇒ 拆分仓布局请显式给：node stories/babel/verify.mjs --engine <sgstory 检出目录>');
	process.exit(2);
}
const load = (f) => eval(fs.readFileSync(f, 'utf8'));

/* ---------- 断言收集（✗ 用 assert 立刻抛：装配检查要一次看全部问题）---------- */
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const head = (s) => console.log(`\n─ ${s}`);

/** ★失败形必须是「**干净红 ＋ 汇总**」（D 席 M9 的形态：中途裸访问崩溃 ⇒ 吞掉此前已收集的失败）。
 *   故先把汇总抽成函数，并给「未捕获异常」挂兜底 —— 任何崩溃都先打印已收集的失败再退出。 */
let summaryPrinted = false;
const printSummary = (extra) => {
	if (summaryPrinted) return;                 // 幂等：崩溃兜底与正常出口只打印一次
	summaryPrinted = true;
	if (extra) fails.push(extra);
	console.log(`\n${fails.length === 0 ? '✓ 装配自检通过' : `✗ 装配自检失败 ${fails.length} 条`}`);
	for (const f of fails) console.log(`  ✗ ${f}`);
	process.exit(fails.length === 0 ? 0 : 1);
};
process.on('uncaughtException', (e) => printSummary(`★未捕获异常（脚本中途崩了）：${e?.message ?? e}`));
process.on('unhandledRejection', (e) => printSummary(`★未处理的拒绝：${e?.message ?? e}`));
/* ★**「恒绿门」自证**（本笔实测踩过：把汇总的**尾调用**搬去别处 ⇒ 脚本正常结束、`exit=0` ⇒
 *   下面十几节断言**全部沦为装饰**）。⇒ 任何「正常结束却没打印过汇总」的路径都强制红。
 *   这一条守的是**门自己**，✗ 被测物。 */
process.on('exit', () => {
	if (!summaryPrinted) {
		console.log('\n✗ 装配自检失败 1 条');
		console.log('  ✗ ★恒绿门：脚本正常结束但从未打印汇总（`printSummary()` 的调用被搬走/删掉）');
		process.exitCode = 1;
	}
});


/* ---------- 环境（镜像 tests/unit/headless.mjs）---------- */
globalThis.window = globalThis;
globalThis.document = { title: '', getElementById: () => ({ insertAdjacentHTML() {}, innerHTML: '' }) };
/* ★载入序须与引擎的 `tests/unit/headless.mjs` 一致：**host.js（宿主仿真）先于 shims.js**
 *   —— 引擎演进后 `shims` 依赖 `host`（未加载即抛「framework/host.js 未加载」）；
 *   本脚本是**故事侧消费者**，引擎换载入序时它**不会自动跟着变** ⇒ 曾在 main 上静默变红（本笔修的）。
 *   ⚠ 故此处用「**存在即加载**」的形（✗ 写死）：引擎若回退到无 `host.js` 的旧形也照跑。 */
if (fs.existsSync(path.join(root, 'tests/unit/framework/host.js'))) {
	load(path.join(root, 'tests/unit/framework/host.js'));
}
load(path.join(root, 'tests/unit/framework/shims.js'));

/** 记录「跳到哪个段落」——战斗终局会跳「游戏失败」（`books#176` 后：死亡＝游戏失败），本脚本据此判定走了哪条路 */
globalThis.__played = [];
SugarCube.Engine.play = (name) => { globalThis.__played.push(name); };

load(path.join(root, 'tests/unit/dist/bundle.js'));   // 插件源码（build.py 生成）

/* ---------- 装载故事侧脚本（与 build.py 同形：IIFE ＋ RPG 别名）---------- */
const storySrc = path.join(here, 'src');
const jsFiles = [];
(function walk(dir) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p);
		else if (e.name.endsWith('.js')) jsFiles.push(p);
	}
})(storySrc);
jsFiles.sort();
for (const f of jsFiles) eval(`(function (RPG, $) {\n${fs.readFileSync(f, 'utf8')}\n})(setup.RPG, jQuery);`);

const R = setup.RPG;
const RPG_create = (id) => R.createItem(id);
const D = setup.DND3;
const B = setup.BABEL;
const map = B?.map;

/* StoryInit 的变量（twee 不在本脚本里执行，故手工摆上 —— 与 meta/init.twee 逐项同形）。
 * ★ `effects: []` / `inventory: []` 不是可选项：缺 `effects` 时 `Player.contains()` 会抛
 *   （访问器桥到 `$player.effects`）—— 本自检最初就是这样抓到「StoryInit 少给一项」的。 */
State.variables.player = {
	name: '无名者', hp: 18, maxHp: 20,
	stats: setup.DND3.stats({ ac: 12, str: 12, dex: 12, heal_bonus: 0 }),
	effects: [],
};
State.variables.inventory = [];
State.variables.babelRun = { deaths: 0, kills: 0, gathered: 0, harvests: 0, traumasSeen: [], deepest: 'L1', 终局: false };  // ★`books#176` 终局键
State.variables.babelGiven = {};
State.variables.span1Arc = {};   // ★`books#132` L1–L9 弧的本局账（与 `meta/init.twee` 逐项同形）
State.variables.span1Events = {}; // ★`books#133` 笔 1：选择制事件账（与 `meta/init.twee` 逐项同形）
State.variables.span1Foresee = {}; // ★`books#164`：预知账（`{目标层: 类}`，与 `meta/init.twee` 逐项同形）
State.variables.span1Farms = 0;
State.variables.span1Harvests = 0;

/* ---------- ① 装配面 ---------- */
head('① 装配面');
ok(!!B, '故事脚本未挂上 `setup.BABEL`（脚本没被装载？）');
ok(map instanceof R.WorldMap, '`setup.BABEL.map` 不是 WorldMap');
if (map) {
	ok(map.validate().length === 0, `地图结构不合法：${map.validate().join('；')}`);
	ok(map.validateConnectivity('L1').length === 0, `L1 出发不可达：${map.validateConnectivity('L1').join('；')}`);
	ok(map.locations.size === 27, `地点数应为 27（一段 13 ＋ 二段 L11–19 九层 ＋ L20 三地点 ＋ 故事侧军械堆/马厩 ＋ \`#180\` 的 L9 准备区），实为 ${map.locations.size}`);
}
console.log(`  地点 ${map.locations.size} 个｜边 ${map.exits.length} 条`);

/* ---------- ② 层与内容（1–9 层：采集点 ＋ 遭遇 ＋ 向上的路）---------- */
head('② 全梯逐层（一段 1–9 ＋ 二段 11–19：采集点 ＋ 遭遇 ＋ 向上的路）');
const CLIMB_LAYERS = [...Array(9).keys()].map((i) => `L${i + 1}`).concat([...Array(9).keys()].map((i) => `L${i + 11}`));
for (const id of CLIMB_LAYERS) {
	const i = Number(id.slice(1));
	const loc = map.locations.get(id);
	ok(!!loc, `缺层 ${id}`);
	if (!loc) continue;
	const acts = loc.availableActions.map((a) => (typeof a.text === 'function' ? a.text() : a.text));
	/* ★`books#133` 笔 1（领队裁 ②B）：**L5–L8 的采集位改为「抽中的事件」** ⇒ 那四层不断无条件采集，
	 *   改断「池里那三条事件动作**全在表**（由 when 筛）」＋ 未抽中时**不出现**（见㉓格）。
	 *   ⚠ 这一格原本写「每层须有采集」，是**旧不变式**——裁定改了它，故同笔改到新形（✗ 删掉不测）。 */
	const 事件层 = (B.EVENT_LAYERS ?? []).includes(id);
	if (事件层) {
		const 事件类 = B.EVENT_KINDS ?? [];
		const 标 = loc.actions.filter((a) => a.事件类 != null);
		ok(标.length === 事件类.length && 事件类.every((k) => 标.some((a) => a.事件类 === k)),
			`${id} 的事件动作表不齐（池 ${事件类.join('／')}；入表 ${标.map((a) => a.事件类).join('／') || '（空）'}）`);
	} else {
		ok(acts.some((t) => t.includes('采集')), `${id} 没有采集动作`);
	}
	ok(acts.some((t) => t.includes('遭遇')), `${id} 没有遭遇动作（第一场战斗三段皆留）`);
	ok(!!B.gatherOf(id), `${id} 没有配采集点`);
	if (typeof R.layerOfLocation === 'function') ok(R.layerOfLocation(id)?.id === id, `${id} 判不出层（层表未配对？）`);
	console.log(`  ${id}：采集点 ${B.gatherOf(id)}｜动作 ${acts.length} 个`);
}
if (typeof R.layerOfLocation === 'function') {
	ok(R.layerOfLocation('L10-camp')?.id === 'L10', '`L10-camp` 判不出层 L10（最长前缀匹配失效？）');
	ok(R.layerType('L10') === 'hub', 'L10 应是 hub 型（遭遇面应结构性跳过）');
	console.log(`  L10-camp ⇒ 层 ${R.layerOfLocation('L10-camp')?.id}（type=${R.layerType('L10')}）｜层读面：#1784 在场`);
} else {
	console.log('  L10-camp ⇒ 层读面（#1784）缺席，走本图命名约定兜底（L10-* 判不出层）');
}

/* ---------- ③ 单向门（段间封闭：10 → 11 有边、11 → 无回边）---------- */
head('③ 段间封闭（10→11 接通 ＋ 20→21 只定义不挂图）');
const gate = map.exitsFrom('L10-gate');
ok(gate.some((e) => e.to === 'L11'), '`L10-gate` 没有通往 L11 的边（10→11 未接通）');
ok(!map.exitsFrom('L11').some((e) => e.to === 'L10' || e.to.startsWith('L10-')),
	`L11 有回 L10 的边（段间不是封闭的）：${map.exitsFrom('L11').map((e) => e.to).join('、')}`);
const reach = map.reachableFrom('L1');                       // Set 或数组（两种都兼容）
const has = (x) => (reach.has ? reach.has(x) : reach.includes(x));
ok(has('L11'), 'L11 从 L1 不可达');
ok(has('L20-gate'), 'L20-gate 从 L1 不可达（二段没接上？）');
/* ★ 20→21：定义存在、**图里没有**（`L21` 属三段）—— 这是「只定义不挂图」的机械判据。 */
ok(typeof D.span2GateExit === 'function', '`DND3.span2GateExit` 定义缺失');
ok(D.span2GateExit().to === 'L21', '`span2GateExit` 的 to 不是 L21');
ok(!map.locations.has('L21'), '★图里出现了 L21（`span2GateExit` 被挂上了 —— 应只定义不挂图）');
ok(!map.exitsFrom('L20-gate').some((e) => e.to === 'L21'), '★`L20-gate` 挂了通往 L21 的边');
ok(map.exitsFrom('L21').length === 0, 'L21 出现回边');
console.log(`  L10-gate ⇒ ${gate.map((e) => e.to).join('、')}｜L11 回边 ${map.exitsFrom('L11').filter((e) => e.to.startsWith('L10')).length} 条`
	+ `｜L20-gate 出口 ${map.exitsFrom('L20-gate').length} 条（L21 未挂 ✓）`);

/* ---------- ④ 采集（`#116`：节点挂**地点**，✗ 进背包）---------- */
head('④ 采集闭环（L1 的碎石堆 · 地点节点形）');
map.moveTo('L1');
const 采集点ids = ['stone-pile', 'dead-wood', 'flint-seam', 'wild-grain', 'copper-vein'];
ok(!采集点ids.some((id) => R.has(id)), '起点背包里不该有采集点（`#116`：玩家不持有采集点）');
/* ★新模型：**单一采集动作**（✗ 无「翻找」那一步）；可用性＝该处节点 charges。 */
const 采集动作 = (locId) => map.locations.get(locId).availableActions
	.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).startsWith('采集（'));
ok(!!采集动作('L1'), 'L1 没有「采集（…）」动作（地点节点形）');
const 节点账 = () => State.variables.gatherNodes ?? {};
const 取账 = (locId) => 节点账()[locId];
const 采前 = 取账('L1')?.charges ?? null;
const before = State.variables.babelRun.gathered;
if (采集动作('L1')) 采集动作('L1').action();
ok(State.variables.babelRun.gathered === before + 1, `采集读数没涨：${before} → ${State.variables.babelRun.gathered}`);
ok(R.has('rock'), '采集没有产出石料（`yields` 未生效？）');
/* ★两向断：① 产出**进背包** ② 节点**留账**且 charges **扣了**（✗ 采了不耗）。 */
ok(!采集点ids.some((id) => R.has(id)), `★采集后**背包里仍无**采集点（实得：${R.inventoryLabel()}）`);
const 采后 = 取账('L1')?.charges ?? null;
ok(采前 != null && 采后 === 采前 - 1, `★节点 charges 应扣 1（账：${采前} → ${采后}）`);
/* 动作文案带次数（`#1887` 的显示面迁到这里） */
const 文案 = String(typeof 采集动作('L1')?.text === 'function' ? 采集动作('L1').text() : 采集动作('L1')?.text);
ok(/还可采 \d+ 次/.test(文案), `★动作文案应带剩余次数（实得：${文案}）`);
console.log(`  背包：${R.inventoryLabel()}｜节点=${JSON.stringify(取账('L1'))}｜动作=「${文案}」`);

/* ---------- ⑤ 遭遇 + 战斗（#1784 的 API 缺席 / 在场两种形）---------- */
head('⑤ 遭遇 + 战斗');
map.moveTo('L1');
/* 遭遇面在场与否，是本节的**分岔点**（先判，后按分支跑）——
 *   在场（联调形：把 `#1784` 的分支并进来）：走真 API；
 *   缺席（main 形）：走**契约桩**，并先断言桥会**显式报缺**（✗ 静默降级）。 */
const encounterFaceReal = typeof R.rollEncounter === 'function' && typeof R.rollLoot === 'function';
console.log(`  遭遇面：${encounterFaceReal ? '真 API（#1784 在场）' : '桩（#1784 缺席，按契约注入）'}`);
if (!encounterFaceReal) {
	const said = [];
	const origPerform = R.perform;
	/* ★`#1863` 两层拆：装配缺口是**接线缺陷** ⇒ 信号迁**开发者通道**（`console.warn`），玩家层出白话。
	 *   本格**两向都断**：①开发者拿到「装配缺口」（✗ 静默）②玩家层**不含**票号／源码路径（✗ 泄漏）。 */
	const wants = [];
	const origWarn = console.warn;
	R.perform = (s) => { said.push(String(s)); return origPerform.call(R, s); };
	console.warn = (s) => { wants.push(String(s)); return origWarn.call(console, s); };
	await B.fight({ interactive: false });   // 必须走**自动通路**：交互通路要等 UI 选择（无头会挂起）
	R.perform = origPerform; console.warn = origWarn;
	ok(wants.some((s) => s.includes('装配缺口')), '`#1784` 缺席时应向**开发者通道**（`console.warn`）显式报「装配缺口」，实测未报');
	ok(said.length > 0 && !said.some((s) => /#[0-9]{3,}/.test(s) || /`[^`]*\.(js|md)`/.test(s)),
		'玩家层文案不含票号／源码路径（`#1863`）');
	console.log(`  未接线时：开发者通道 ${wants.filter((s) => s.includes('装配缺口')).length} 条显式提示｜玩家层 ${said.length} 条（无票号）`);
	R.rollEncounter = (layer) => [{ ref: 'badger', elite: true, layer }];
	R.rollLoot = (layer) => [{ id: 'coin', n: 1, layer }];
}
R.give('club');                                 // 与故事里 L1 的「拾起木棒」同形：没武器就出不了手
R.equip('club');
R.rng.set(() => 0.99);   // 确定性：重击频出 ⇒ 战斗必在回合上限内分出结果
const protoHp = R.characters.get('badger').hp;
const coins0 = State.variables.inventory.filter((s) => s.id === 'coin').length;
const 层5 = map.current;                        // ★`books#176`：战败后位置须**留在原层**
await B.fight({ interactive: false });   // 无头环境必须走自动通路（交互通路等 UI 选择 ⇒ 会挂起）
R.rng.reset();
const badger = R.characters.get('badger');
ok(badger.hp === protoHp, `注册面单例被战斗改写（hp ${protoHp} → ${badger.hp}）—— 副本没生效`);
const run = State.variables.babelRun;
ok((run.kills > 0) !== (run.deaths > 0), `应恰好走一条路（胜/败），实测 kills=${run.kills} deaths=${run.deaths}`);
if (run.deaths > 0) {
	/* ★`books#176`：死亡＝**游戏失败**（不复活）⇒ 位置**不**回起点层、体力**不**复位、效果**不清**。 */
	ok(map.current === 层5, `战败后位置应**留在原层**（${层5}），实为 ${map.current} —— 复活语义已废止`);
	ok(D.Player.hp === 0, `战败后体力应仍为 0（不复活），实为 ${D.Player.hp}/${D.Player.maxHp}`);
	ok(State.variables.babelRun.终局 === true, '战败后未置「本局终局」账（入口的幂等门）');
	ok(globalThis.__played.includes('游戏失败'), `战败后应跳「游戏失败」，实测跳了 [${globalThis.__played.join(',')}]`);
} else {
	ok(State.variables.inventory.filter((s) => s.id === 'coin').length > coins0, '胜后没拿到掉落表的铜币');
	ok(D.Player.contains('fracture') || D.Player.contains('bleeding') || D.Player.contains('concussion')
		|| D.Player.effects.length === 0, '创伤面异常');   // 只核不崩
}
console.log(`  kills=${run.kills} deaths=${run.deaths}｜玩家 ${D.Player.hp}/${D.Player.maxHp}`
	+ `｜创伤 [${D.Player.effects.filter((e) => D.Traumas[e]).join(',')}]`);
/* ★`books#176`：本格可能把玩家**留在终局态**（死亡＝不复活）⇒ 必须放回活人态，
 *   否则**终局位闸门**（`活着()`）会把**后面每一格**的地图动作与出口全关掉（本席实跑撞到：
 *   ⑤b 之后 L11 的边读为 0）。 */
D.Player.hp = D.Player.maxHp;
D.Player.effects = (D.Player.effects ?? []).filter((e) => e !== R.death.id);
State.variables.babelRun.终局 = false;

/* ---------- ⑤b 战败终端＝游戏失败（`books#176`；强制走一次）----------
 * ★本格要测的是「**死亡 → 终局/失败面/停手**」这条面，✗ 不是「本层的怪打不打得死人」。
 * ★层选**非起点层**（L3）：这样「位置**不**回 L1」才是**可判**的（在 L1 上死的，回不回 L1 都一样），
 *   顺带把「终局行须印**死亡层**号」这条也钉住（`tester-4` 的刀：层读数取错 ⇒ 文案印错层）。
 * ★重搭（裁 (a)）：**格内作用域覆写遭遇表** —— 本层临时换成一只「必杀怪」，
 *   ★**快照的真实边界**（`dev-10` 侦察 RC 更正，本席原措辞说错了）：`fresh()`（`world/encounters.js:35`）
 *   走 `revive(JSON.parse(JSON.stringify(proto.toJSON())))` ⇒ **过得了快照的是【角色级】的普通字段**
 *   （`hp`／`maxHp`／`stats`）；而 `items` 在快照里**只带引用**（`{id, equipped}`，**不含 stats**）——
 *   攻击数值的**权威在注册表**：`combat.js:67` 按 **id** 去解析 `item.stats.atkBonus`。
 *   ⇒ 故本格成立**靠的是** `badger-claw` **注册表项**自带攻击；★**若换成一个没注册的自造 item id，这里会断**
 *     （记：**item 的权威在注册表，快照只带引用**）。跑完**恢复原表**（✗ 污染后续段落）。
 *   ⇒ 死亡分支／`respawn`／跳段**全走真路**，且**零设计数值依赖**。
 * ★为何不能省（本席三次落空的实测）：旧形把「必死」赌在**本层怪的数值**上
 *   （引擎獾 **AC 15** ⇒ 玩家 auto 通路打不中 ⇒ 它活到出手；换成 AC 12 的弱怪 ⇒ 两下被打死 ⇒
 *   **没机会出手** ⇒ 死亡不发生；而直接 `hp=0` 置倒虽能过 deaths/跳段，但**击倒处理不触发** ⇒ 体力/创伤两红）。 */
head('⑤b 战败终端＝游戏失败（强制）');
map.moveTo('L3');
{
	const 原表 = R.encounterTables.span1;
	R.defCharacter({
		id: 'verify-lethal-foe', name: '（装置）必杀怪',
		hp: 999, maxHp: 999,                                   // ★**角色级**普通字段 ⇒ 过快照（见上：item 不走这条）
		stats: setup.DND3.stats({ ac: 30, str: 10, dex: 10, bab: 0 }),   // AC 30 ⇒ 玩家打不中它
		/* ★攻击数值来自**注册表**（`combat.js:67` 按 id 解析 `stats.atkBonus`），✗ 不走快照；
		 *   本格**必须**用已注册的件（用自造 id 会断）。`atkBonus 4` ⇒ 对 AC 12 必中。 */
		items: [{ id: 'badger-claw', equipped: true }],
	});
	R.registerEncounterTable('span1', Object.assign({}, 原表, {
		L3: { encounters: [{ ref: 'verify-lethal-foe', weight: 1 }], loot: 原表.L3?.loot ?? [] },
	}));
	globalThis.__host?.install?.();          // ★接住 `perform` 的输出（读终局行用；同㉖/㉙格的形）
	D.Player.hp = 1;
	D.Player.gain('bleeding');           // ★不复活 ⇒ 本格验的是「效果**不清**」（旧口径是清掉）
	R.rng.set(() => 0.5);                // d20=11：怪命中值 11+4=15 ≥ AC12 ⇒ 必中；玩家对 AC30 必不中
	globalThis.__played.length = 0;
	await B.fight({ interactive: false });
	R.rng.reset();
	R.registerEncounterTable('span1', 原表);   // ★恢复（✗ 污染后续段落）
}
const r2 = State.variables.babelRun;
const 行5b = () => (globalThis.__host?.host?.lines?.() ?? []);
const 终局行 = 行5b().filter((l) => String(l).includes('这一局到此为止')).join('｜');
ok(r2.deaths === 1, `应记 1 次战败，实为 ${r2.deaths}`);
ok(r2.终局 === true, '战败后未置「本局终局」账（入口的幂等门）');
ok(map.current === 'L3', `战败后位置应**留在死亡层 L3**，实为 ${map.current} —— 复活语义已废止（不复活）`);
ok(D.Player.hp === 0, `战败后体力应仍为 0，实为 ${D.Player.hp}/${D.Player.maxHp}`);
ok(D.Player.contains('bleeding'), '不复活 ⇒ 效果**不清**（跨场创伤 bleeding 应仍在；清档属旧 respawn 语义）');
ok(D.Player.contains(R.death.id), '不复活 ⇒ `death` 标记应仍在');
ok(globalThis.__played.includes('游戏失败'), `战败后应跳「游戏失败」，实测跳了 [${globalThis.__played.join(',')}]`);
/* ★`tester-4` 的刀所指向的那条契约：终局行须印**死亡层**号（✗ 起点层）—— 层读数取错即在此红。 */
ok(/第\s*3\s*层/.test(终局行), `★终局行没印死亡层号（应含「第 3 层」；实得「${终局行}」）`);
console.log(`  战败：deaths=${r2.deaths}｜位置 ${map.current}｜体力 ${D.Player.hp}/${D.Player.maxHp}｜death 标记 ${D.Player.contains(R.death.id)}｜跳段 [${globalThis.__played.join(',')}]`);
/* ★`books#176`：同上 —— 本格刻意把玩家留在终局态，随后**放回活人态**（否则终局位闸门关闭后面各格）。 */
D.Player.hp = D.Player.maxHp;
D.Player.effects = (D.Player.effects ?? []).filter((e) => e !== R.death.id);
State.variables.babelRun.终局 = false;

/* ---------- ⑥ 第 10 层聚落（#1776 的建造/收获）---------- */
head('⑥ 聚落闭环（L10）');
map.moveTo('L10-settlement');
R.give('farm-plot');
R.give('seed', 2);
const res = R.act(D.Player, 'farm-plot', D.Player, 'build');
ok(res?.status === 'applied', `开垦失败：${JSON.stringify(res)}`);
ok(State.variables.span1Farms === 1, `农田计数应为 1，实为 ${State.variables.span1Farms}`);
R.harvest();
ok(R.has('ration'), '收获没有产出「口粮」');
ok(State.variables.span1Farms === 0, '收获后农田应清空（`#1776` 的「收完即需重耕」）');
console.log(`  开垦 ${res?.status}｜收获后 口粮=${State.variables.inventory.filter((s) => s.id === 'ration').length} 份`
	+ `｜累计收获 ${State.variables.span1Harvests}`);

/* ---------- ⑦ 穿越单向门 ---------- */
head('⑦ 穿越单向门（10→11 接通 ⇒ 二段可走）');
map.moveTo('L10-gate');
map.moveTo('L11');
ok(map.current === 'L11', '穿门后应到 L11');
ok(State.variables.babelRun.deepest === 'L11', '`deepest` 读数没更新');
ok(map.exitsFrom('L11').some((e) => e.to === 'L12'), '★L11 没有通往 L12 的路（10→11 接了但二段没接？）');
map.moveTo('L20-gate');
ok(State.variables.babelRun.deepest === 'L20', '走到 L20-gate 后 `deepest` 没更新（应记层 id L20）');
const terminus = map.locations.get('L20-gate').availableActions.map((a) => String(a.text));
ok(terminus.some((x) => x.includes('看看这一局')), '★L20-gate 没有收尾读数入口（试玩终点没搬过来）');
console.log(`  L10-gate ⇒ L11 ⇒ L12 通路 ✓｜终点已搬到 L20-gate（deepest=${State.variables.babelRun.deepest}）`);

/* ---------- ⑧ 整备闭环（**不变式：遍历全部 hub 层**）----------
 * ★本节的两次演化（两席各自的 RC，形态同族）：
 *   ① `#1785`（dev-9）：本笔是装配票 ⇒ 「整备点接了 `treatTrauma`」必须有断言 —— 否则换成常量照样全绿
 *      （那正是 `#1780` §八.2 记的 hub 解除闭环缺口）。当时只点了**一段**的 `L10-camp`。
 *   ② `#1792`（dev-9 BLOCKING ＋ T 席独立复现）：本笔**新增**了二段整备点，而本节仍只断一段
 *      ⇒ A′ 刀（把 `span2-hub.js` 的 `treatTrauma` 换常量）**exit=0**。
 * ⇒ 故本节不再「手工补一支」，改成**根因形**（dev-10 建议）：**遍历层表里所有 `hub` 层**，
 *   对每个 hub 的每个整备入口跑**同一段双向检查**（高掷治愈／低掷保留）—— 将来加 hub **自动被覆盖**。
 *   （与「遍历层组写不变式」同思路：把「哪些 hub」交给**层表**回答，✗ 由人记着补。） */
head('⑧ 整备闭环（不变式：遍历全部 hub 层）');
{
	/* hub 层的权威来源是**层表**（`#1784` 的 `layersOfType`）；该面缺席时退化为「本图里所有带歇脚动作的地点」。 */
	const hubLayers = typeof R.layersOfType === 'function'
		? R.layersOfType('hub').map((x) => x.id)
		: [...new Set([...map.locations.values()].map((l) => R.layerOfLocation(l.id)?.id).filter(Boolean))];
	const isRest = (a) => String(a.text).includes('歇一歇');
	let checked = 0;
	for (const layer of hubLayers) {
		const locs = [...map.locations.values()].filter((l) => (R.layerOfLocation(l.id)?.id ?? l.id) === layer);
		if (locs.length === 0) continue;
		const rests = locs.flatMap((l) => l.availableActions.filter(isRest).map((a) => ({ loc: l, act: a })));
		if (rests.length === 0) continue;          // 无整备入口的 hub（未来形态）不算错，跳过即可
		for (const { loc, act } of rests) {
			const id = 'bleeding';                  // 每次迭代自清理 ⇒ 各 hub 之间零干扰
			D.Player.stats.heal_bonus = 20;
			D.Player.gain(id);
			ok(D.Player.contains(id), `前置：${loc.id} 的检查需要一条可治创伤`);
			R.rng.set(() => 0.99);                  // d20 = 20 ⇒ 必成
			act.action();
			R.rng.reset();
			ok(!D.Player.contains(id), `★${loc.id} 整备**没治好**创伤 ⇒ 该 hub 接线未生效（换成常量也能过 = 本节点要堵的洞）`);

			D.Player.gain(id);
			D.Player.stats.heal_bonus = -100;
			R.rng.set(() => 0.01);                  // d20 = 1 ⇒ 必败
			act.action();
			R.rng.reset();
			ok(D.Player.contains(id), `★${loc.id} 低掷点却治好了 ⇒ DC 比对失效（判据恒真的恒等替换）`);
			D.Player.stats.heal_bonus = 0;
			D.Player.lose(id);
			checked += 1;
		}
	}
	ok(checked >= 2, `整备入口应至少覆盖 2 处（一段 L10 ＋ 二段 L20），实为 ${checked} ⇒ 不变式没生效`);
	console.log(`  hub 层 ${hubLayers.join('、')}｜整备入口 ${checked} 处，逐处 高掷治愈／低掷保留 ✓`);
}

/* ---------- ⑨ 二段遭遇（`span2` 真表；`#1791` 票面验收第 1 项）----------
 * **双向**：好的一侧抽得出二段敌人；坏的一侧 —— hub 层**结构性**抽不出、未注册层**抛错**。 */
head('⑨ 二段遭遇（span2 真表）');
{
	const r1 = R.rollEncounter('L13', { count: 1 });
	ok(r1.length === 1, `L13 抽不出遭遇（实得 ${r1.length} 条）`);
	ok(['fire-beetle', 'giant-bee', 'bombardier-beetle'].includes(r1[0]?.ref),
		`L13 抽出的不是二段敌人：${r1[0]?.ref}`);
	ok(R.rollEncounter('L20').length === 0, '★L20 是 hub，不该抽得出遭遇（结构性排除失效）');
	let thrown = null;
	try { R.rollEncounter('L99'); } catch (e) { thrown = e; }
	ok(thrown !== null, '★未注册的层应抛错（层 id 打错不该被当成「这层没遭遇」）');
	ok(R.layerType('L11') === 'climb' && R.layerType('L20') === 'hub', '二段层型不对（L11 climb／L20 hub）');
	console.log(`  L13 ⇒ ${r1.map((e) => e.ref).join('、')}｜L20 ⇒ ${R.rollEncounter('L20').length} 条｜L99 ⇒ ${thrown ? '抛错 ✓' : '未抛 ✗'}`);
}

/* ---------- ⑩ 创伤：真实暴露 ＋ 跨场存活（钝击 ⇒ 骨裂；`#1781`）----------
 * **双向**：钝击重击 ⇒ 骨裂（且**不是**失血 ⇒ 证明判据/提序是活的）；跨 `battle:end` 仍在（persistent）。 */
head('⑩ 创伤：真实暴露 ＋ 跨场存活（钝击 ⇒ 骨裂）');
{
	for (const id of Object.keys(D.Traumas)) if (D.Player.contains(id)) D.Player.lose(id);
	/* ★伤害**必须 ≥ 失血阈值 3**（且 < maxHp/2 ⇒ 不触发脑震荡）：否则「crushing 提序」这条判据
	 *   测不出来 —— 伤害 2 时两种次序都落到 `fracture`（本笔 K 刀实测：退回原序仍然全绿）。
	 *   取 1d6=3 ⇒ 伤害 2×3 = 6（≥3、<10）⇒ 提序在位才得骨裂，退回原序会得失血。 */
	const q = [0.99, 0.99, 0.4];    // 重击威胁 20／确认 20／伤害骰 1d6=3
	R.rng.set(() => (q.length ? q.shift() : 0.01));
	/* ★**本格须自足**（✗ 依赖「上一个格子恰好把手里的家伙掉了」）——
	 *   实测：`meleeAttack` 在**手里已握别件**时走「腾不出手」分支 `return false`（`combat.js:42-51`）
	 *   ⇒ 合成这一击**打不出去** ⇒ 创伤面整段假红。本席首版正是据此误判（并差一点按「迁层」改，✗ 治本）。
	 *   而与 `item.id` 相同的那件（如手里也是 club）**不会被拒**（判据是 `held.id !== item.id`）
	 *   ⇒ 故此前它**靠意外**绿：一旦前置格的结局变了（我换弱 L1 怪 ⇒ 那场从「败」变「胜」⇒ 家伙留手上），本格即红。
	 *   ⇒ 显式把这一件标为**已握** ⇒ 跳过「拔出/腾不出手」整支 ⇒ 本格**与前置状态解耦**。 */
	/* ★**前提自设**（✗ 依赖前置格留下的体力/结局）—— 实测（本席 DBG 取样）：
	 *   本格此前**恰好**靠前面那场仗**打输⇒重生满血**才好使；我把 L1 的怪换弱之后那场**打赢了**
	 *   ⇒ 玩家**残血（3/20）**来到本格 ⇒ 这一击的创伤分支变了 ⇒ 本格**整段假红**。
	 *   ⇒ 显式把体力摆满（本格测的是**创伤面**，✗ 不是「上场的收尾」）⇒ 与前置状态**解耦**。 */
	D.Player.hp = D.Player.maxHp;
	const 合成锤 = R.createItem('club');
	合成锤.equipped = true;   // ★跳过「腾不出手」拒绝（上注）
	合成锤.used(D.Player, { stats: { bab: 20, str: 10 } });   // club: type=bludgeoning
	R.rng.reset();
	ok(D.Player.contains('fracture'), '★钝击重击没有致骨裂（真实路径不通）');
	ok(!D.Player.contains('bleeding'), '★骨裂被失血遮蔽（判据提序失效）');
	const before = D.Player.hp;
	R.events.emit('battle:end', { players: [D.Player], enemies: [] });     // 跨场：一场战斗结束
	ok(D.Player.contains('fracture'), '★创伤没跨过 `battle:end`（persistent 语义失效）');
	ok(D.Player.hp === before, '`battle:end` 不该改体力');
	console.log(`  骨裂已施加 ✓｜跨场仍在 ✓｜失血未遮蔽 ✓｜体力 ${D.Player.hp}/${D.Player.maxHp}`);
}

/* ---------- ⑪ 锻造闭环（`#1788` 的 craft 面；票面验收第 3 项）----------
 * ★两半，各点一件事（第二半的由来：本节点最初只直调 `RPG.act` ⇒ 把**锻造台动作**换成 no-op
 *   仍然全绿 —— 与 dev-9 对 ⑧ 的那条 RC 同族，故必须**走动作**，不只走引擎）：
 *   ① **接线**：走 L20-forge 的**锻造台动作**锻一件（给足料 ⇒ 到手；动作若被换成 no-op ⇒ 必红）；
 *   ② **引擎原子性**：直调 `RPG.act` 料不够 ⇒ rejected 且**输入不被扣**（这条测的是 `#1788`/`#1776` 的引擎，
 *      保留在此以便一眼看到「失败不留损」成立）。 */
head('⑪ 锻造闭环（料场 ⇒ 图纸 ⇒ 铁器）');
{
	map.moveTo('L20-settlement');
	/* ★`#116` (乙)：料场动作已改口 —— 图纸仍在（真·可携带道具），但**木料改地点节点形**
	 *   ⇒ 原「在料场里翻找（图纸与木料）」现为「在料场里翻找（找锻造图纸）」。 */
	const yard = map.locations.get('L20-settlement').availableActions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('料场'));
	ok(!!yard, 'L20-settlement 没有「找图纸」动作（接线缺失）');
	if (yard) yard.action();
	const bps = D.span2Blueprints();
	ok(bps.length === 6, `图纸清单应为 6 张（从注册面派生），实为 ${bps.length}`);
	ok(bps.every((id) => R.has(id)), `料场没把图纸发齐：缺 ${bps.filter((id) => !R.has(id)).join('、')}`);
	/* ⚠ 判据要**从行首**匹配「采集」（✗ 用 `includes('木料')` —— 其它动作文本也可能含该词 ⇒ 误命中）。
	 * ★`#116`：料场木料改**地点节点形** —— 单一采集动作 ＋ charges 记在**地点节点账**上。 */
	const 文本 = (a) => String(typeof a.text === 'function' ? a.text() : a.text);
	const woodAction = map.locations.get('L20-settlement').availableActions.find((a) => 文本(a).startsWith('采集'));
	ok(!!woodAction, 'L20-settlement 没有「采集（料场木料｜还可采 N 次）」动作（地点节点形）');
	const 木节点前 = State.variables.gatherNodes?.['L20-settlement']?.charges ?? null;
	if (woodAction) woodAction.action();
	ok(R.has('wood'), '采集木料没有产出木材（锻造的输入之一）');
	/* ★两向断（`#116` 的核心）：节点**留账**且 charges 扣 1；产出**进背包**，节点**不进背包**。 */
	const 木节点后 = State.variables.gatherNodes?.['L20-settlement']?.charges ?? null;
	ok(木节点前 != null && 木节点后 === 木节点前 - 1, `★料场节点 charges 应扣 1（账：${木节点前} → ${木节点后}）`);
	ok(!R.has('dead-wood'), '★料场采集后**背包里不该有采集点**（`#116`：玩家不持有采集点）');

	const countOf = (id) => (State.variables.inventory ?? []).filter((s) => s.id === id)
		.reduce((n, s) => n + (s.charges ?? 1), 0);

	/* ② 引擎原子性（料不够 ⇒ 拒绝且不扣料） */
	const ore0 = countOf('iron-ore'), wood0 = countOf('wood');
	const r1 = R.act(D.Player, 'forge-greatsword', D.Player, 'craft');   // 巨剑＝铁矿 3 ＋ 木材 2
	ok(r1?.status === 'rejected', `★料不够时应被拒（实为 ${r1?.status}）`);
	ok(countOf('iron-ore') === ore0 && countOf('wood') === wood0, '★被拒时输入被扣了（原子性破了）');

	/* ① 接线（走**包里的锻造台动作**） */
	map.moveTo('L20-forge');
	const forge = map.locations.get('L20-forge').availableActions.find((a) => String(a.text).includes('锻造台'));
	ok(!!forge, 'L20-forge 没有「锻造台」动作（#1791 的接线缺失）');
	R.give('iron-ore', 3);
	R.give('wood', 2);
	const ore1 = countOf('iron-ore'), wood1 = countOf('wood');
	const forgedBefore = D.span2Blueprints().filter((id) => RPG_create(id)?.stats?.recipe?.yields?.[0]?.id)
		.map((id) => RPG_create(id).stats.recipe.yields[0].id).filter((id) => R.has(id)).length;
	if (forge) forge.action();
	const forgedAfter = D.span2Blueprints().filter((id) => RPG_create(id)?.stats?.recipe?.yields?.[0]?.id)
		.map((id) => RPG_create(id).stats.recipe.yields[0].id).filter((id) => R.has(id)).length;
	ok(forgedAfter > forgedBefore, '★锻造台动作没有产出任何铁器 ⇒ 接线未生效（换成 no-op 也能过的形）');
	ok(countOf('iron-ore') < ore1 && countOf('wood') < wood1, '★锻造台产出了东西但输入没减少')
	console.log(`  图纸 ${bps.length} 张 ✓｜料不够 ⇒ rejected 且不扣料 ✓｜锻造台 ⇒ 铁器 +${forgedAfter - forgedBefore} 件`
		+ `（铁矿 ${ore1}→${countOf('iron-ore')}、木材 ${wood1}→${countOf('wood')}）`);
}

/* ---------- ⑫ 军械／马厩（票面第 5 条的「可观察」）---------- */
head('⑫ 军械堆（盾）／马厩（骑乘）');
{
	map.moveTo('L20-armory');
	const takeShield = map.locations.get('L20-armory').availableActions.find((a) => String(a.text).includes('小圆盾'));
	ok(!!takeShield, '军械堆没有发盾的动作');
	if (takeShield) takeShield.action();
	ok(R.has('buckler'), '★军械堆没有发出盾（盾装备面观察不到）');
	ok(!map.locations.get('L20-armory').availableActions.some((a) => String(a.text).includes('小圆盾')),
		'★已持有的盾仍在可领列表里（`when` 前置失效）');
	map.moveTo('L20-stable');
	const takeMount = map.locations.get('L20-stable').availableActions.find((a) => String(a.text).includes('骡子'));
	ok(!!takeMount, '马厩没有发坐骑的动作');
	if (takeMount) takeMount.action();
	ok(R.has('mule'), '★马厩没有发出坐骑（骑乘面观察不到）');
	console.log(`  小圆盾 ✓（AC 前缀 ${D.Player.stats.ac}）｜骡子 ✓`);
}

/* ---------- ⑭ 通知中心（B4 · `#1798`）的**故事侧接线** ----------
 * ★承 ⑧ 的教训（den-9 的 RC：「接线有了、守卫没有」）⇒ 本笔的可见面（状态栏那一栏）也点一下：
 *   面板体／开关要**能渲染**，且「仅关键」档要真的**把常态行挡在正文外**（✗ 只存在一个函数没人调）。 */
head('⑭ 通知中心（B4）的故事侧接线');
{
	ok(typeof R.noticeToggleHTML === 'function' && typeof R.noticesHTML === 'function',
		'★B4 的呈现面不存在 ⇒ 状态栏那一栏渲染不出来');
	const before = R.noticeFilter;
	R.clearNotices();
	R.setNoticeFilter('all');
	const printed = [];
	const origDefer = R.deferOutput;
	R.deferOutput = (b) => { printed.push(1); return b(); };
	try {
		R.perform('逐回合的常态行（应被挡）。');
		R.perform('战斗结束：敌方被击败！', { channel: 'battle-end' });
		ok(printed.length === 2, '默认档下两行都应进正文（=既有无变化）');
		R.setNoticeFilter('key');
		printed.length = 0;
		R.perform('又一条常态行（应被挡）。');
		ok(printed.length === 0, '★「仅关键」档下常态行**不进正文**（✗ 只是存在开关没人用）');
		R.perform('你死在了第 3 层。', { channel: 'death' });
		ok(printed.length === 1, '★关键通道（death）的行仍进正文');
	} finally {
		R.deferOutput = origDefer;
		R.setNoticeFilter(before === 'key' ? 'all' : before);
	}
	ok(R.notices().length === 4, `★被挡下的行也要在通知缓冲里（✗ 丢证据），实得 ${R.notices().length}`);
	const toggle = R.noticeToggleHTML();
	ok(toggle.includes('data-mode='), '开关链应带 data-mode（点了才切得动）');
	ok(R.noticesHTML().includes('rpg-notice'), '面板体应渲染出条目');
	/* ★**接线**判据（✗ 只判能力存在）：状态栏（twee）里必须真的调了这两个面 ——
	 *   否则「能力有、没人用」= 玩家看不到（正是 dev-9 那条 RC 的形态）。 */
	const uiTwee = fs.readFileSync(path.join(storySrc, 'ui', 'ui.twee'), 'utf8');
	/* ★**接线**判据（✗ 只判能力存在）：开关与面板体必须**被故事侧真的调了** ——
	 *   否则「能力有、没人用」= 玩家看不到（正是 dev-9 那条 RC 的形态）。
	 *   ⚠ B1 之后这两处从 twee **移进了面板渲染函数**（`ui/panels.js`）⇒ 判据改为**两处都看**
	 *   （✗ 写死「必须在 twee 里」—— 那会随版式演进假红）。 */
	const uiPanelJs = fs.readFileSync(path.join(storySrc, 'ui', 'panels.js'), 'utf8');
	const wired = (needle) => uiTwee.includes(needle) || uiPanelJs.includes(needle);
	ok(wired('noticeToggleHTML'), '★故事侧没调 `noticeToggleHTML` ⇒ 开关渲染不出来（能力有、接线没有）');
	ok(wired('noticesHTML'), '★故事侧没调 `noticesHTML` ⇒ 面板体空');
	ok(wired('notice') && (uiTwee.includes('data-panel="notice"') || uiPanelJs.includes("registerPanel('notice'")),
		'★通知面板既没宿主也没注册');
	/* C1 的接线（状态栏有没有真的换用可点标签） */
	ok(wired('inventoryLinks'), '★故事侧没换用 `inventoryLinks()` ⇒ 道具名点不动（C1 的可见面没接上）');
	ok(uiTwee.includes('inventory-links'), '状态栏缺 `.inventory-links` 容器');
	console.log(`  开关：${toggle.replace(/<[^>]*>/g, '')}｜缓冲 ${R.notices().length} 条（含被挡的两条）`);
}

/* ---------- ⑮ 面板刷新域（B1 · `#1798`）的故事侧接线 ----------
 * ★判据形态（承 dev-9／dev-10 两轮 RC）：
 *   ① 「注册的宿主 ↔ 骨架里的宿主」**双向**一致（任一侧改名／多余宿主都要红）
 *   ② 接线判据要看**活行**（✗ 裸 `includes` —— 把绑定注释掉、字符串仍在 ⇒ 空刀）
 *   ③ 渲染函数**真的读状态**（逐面板两向，✗ 只看某一条）
 *   ④ **调用面**存在（本笔曾顺手删掉一条与版式无关的调用而无人抓 ⇒ 单列） */
head('⑮ 面板刷新域（B1）的接线');
{
	/** 去掉注释行后仍含该串（✗ 裸 `includes`：注释里含该串会被当成接线） */
	const liveLines = (src, needle) => src.split('\n')
		.filter((l) => l.includes(needle) && !/^\s*(\/\/|\*|\/\*)/.test(l));
	const uiTwee = fs.readFileSync(path.join(storySrc, 'ui', 'ui.twee'), 'utf8');
	const panelsJs = fs.readFileSync(path.join(storySrc, 'ui', 'panels.js'), 'utf8');
	const uiCore = fs.readFileSync(path.join(root, 'src', 'core', '70-ui.js'), 'utf8');
	const noticeCore = fs.readFileSync(path.join(root, 'src', 'core', '71-notice.js'), 'utf8');

	ok(typeof R.registerPanel === 'function' && typeof R.refreshPanels === 'function', '★B1 的面板面不存在');
	/* ★`want` **动态取自注册表**（✗ 硬编码 4 个 —— 那样「通知」永远被跳过） */
	const panels = [...R.panels.keys()];
	ok(panels.length >= 5, `★面板数应 ≥ 5（体力/位置/创伤/背包/通知），实得 ${panels.length}：${panels.join('、')}`);
	const hostsInMarkup = [...uiTwee.matchAll(/data-panel="([^"]+)"/g)].map((m) => m[1]);

	/* ① 双向一致：逐面板（宿主选择器里的**容器 class** 也要在骨架里；`?.` ⇒ 缺注册时干净红✗崩溃） */
	for (const id of panels) {
		const host = R.panels.get(id)?.host;
		ok(!!host, `★面板「${id}」没有宿主选择器`);
		if (!host) continue;
		ok(host.includes(`data-panel="${id}"`), `★面板「${id}」宿主（${host}）与骨架属性不一致`);
		for (const cls of host.match(/\.[A-Za-z][\w-]*/g) ?? []) {
			const name = cls.slice(1);
			/* ★class 值内的**词匹配**（两次 RC 后的定形）：
			 *   ① 初版 `includes('class="statusbar')` 是**无锚前缀** ⇒ `class="statusbarX"` 变体全绿（T 席 RC-1）；
			 *   ② 中版 `class="[^"]*(?:^|\s)<name>…"` 里 **`^` 在 `[^"]*` 之后永不成立** ⇒ 首类名位不匹配，
			 *      靠 `includes(\`${name}"\`)` 兜底掩盖 ⇒ 而该兜底对**多类名**（`class="statusbar extra"`，
			 *      本仓多处此形）失效 ⇒ **误伤合法版式**（T 席 RC-2 自纠）。
			 *   正解：`class="(?:[^"]*\s)?<name>(?=[\s"]|$)` —— 可选前导（覆盖首类名与后续类名），
			 *      ✗ 去 `^`；并**删掉 fallback**（它就是掩盖首类名失败的那一支）。 */
			ok(new RegExp(`class="(?:[^"]*\\s)?${name}(?=[\\s"]|$)`).test(uiTwee),
				`★面板「${id}」宿主的容器「${cls}」不在 twee 骨架里（容器改名 ⇒ 面板写到空处）`);
		}
		ok(hostsInMarkup.includes(id), `★骨架里没有面板「${id}」的宿主`);
	}
	/* ①′ 反向：骨架里每个宿主都得有人注册（多一个 ghost 宿主 ⇒ 红） */
	for (const id of hostsInMarkup) ok(R.panels.has(id), `★骨架里有**无人注册**的宿主 data-panel="${id}"`);

	/* ② 接线须是**活行** */
	ok(liveLines(panelsJs, ':passagedisplay').length > 0, '★填充点（`:passagedisplay` 绑定）不在了');
	ok(liveLines(panelsJs, 'refreshPanels()').length > 0, '★填充点没调 `refreshPanels()`');
	ok(liveLines(panelsJs, 'noteTraumas').length > 0,
		'★`noteTraumas` 的**调用面**不见了（每段落兜底 ⇒ 删了则「见过的创伤」恒空，且无面能抓）');
	ok(liveLines(uiCore, "refreshPanels(['inventory'])").length > 0, '★C1 的点击后重绘没走局部刷新域');
	ok(liveLines(noticeCore, "refreshPanels(['notice'])").length > 0,
		'★通知开关的重绘没走面板注册表（自己找 DOM 写 ⇒ 计数恒 0、同一结构两个产出者）');

	/* ③ 渲染函数真的读状态（逐面板；先归一创伤态，免「本来就持有 ⇒ 加不上 ⇒ 假红」） */
	for (const id of Object.keys(D.Traumas)) D.Player.lose(id);
	const before = {};
	for (const id of panels) before[id] = R.panelHTML(id);
	D.Player.hp -= 1;
	D.Player.gain('bleeding');
	const changed = panels.filter((id) => R.panelHTML(id) !== before[id]);
	D.Player.hp += 1;
	D.Player.lose('bleeding');
	ok(changed.includes('hp'), '★体力面板的渲染函数没读状态');
	ok(changed.includes('trauma'), '★创伤面板的渲染函数没读状态（改状态而面板体不变）');
	const invHTML = R.panelHTML('inventory');
	ok(invHTML.includes('rpg-item-link') || invHTML.includes('（空）'),
		`背包面板体应是可点标签（C1 的形），实得：${invHTML.slice(0, 60)}`);
	console.log(`  面板 ${panels.length} 个（${panels.join('、')}）｜宿主双向一致 ✓｜活行判据 ✓｜状态两向（${changed.join('、')}）✓`);
}

/* ---------- ⅖ #1877 P1-3 / P1-6（批次 B）----------
 * ★两处都是**操作者实测的症状**，而旧判据全绿 ⇒ 本节守的正是那几个**没被守的接口**：
 *   ① P1-3「通知计数在涨、可列表恒空」：旧判据只判「`noticesHTML()` 里有 `rpg-notice`」（能力有）
 *      ⇒ 而真因是**面板重绘把 `<details>` 的 `open` 打回默认折叠** ⇒ 玩家看不到列表。
 *   ② P1-6「打完，继续探索」战斗中即现**顶部**：旧判据完全没碰这条静态链。 */
head('⅖ `#1877` P1-3 面板重绘保留交互态 ／ P1-6 战斗出口时机');
{
	const panelsJs = fs.readFileSync(path.join(storySrc, 'ui', 'panels.js'), 'utf8');
	const corePanel = fs.readFileSync(path.join(root, 'src', 'core', '72-panel.js'), 'utf8');
	const twee = fs.readFileSync(path.join(storySrc, 'story', 'play.twee'), 'utf8');

	/* ① P1-3㐲：核提供**保留契约**（回到态须有处可存），且 refreshPanels 真的把它传给 writer */
	ok(Array.isArray(R.preservePanelState) && R.preservePanelState.length > 0,
		'★`#1877` P1-3：核没提供 `RPG.preservePanelState` ⇒ 重绘无处搬运交互态');
	ok(R.preservePanelState.some((e) => e && /details/.test(String(e.sel))),
		'★P1-3：保留表里没有通知块的选择器（`details.rpg-notice-box`）⇒ toggle 相当于没接');
	ok(/put\(.*preserve: RPG\.preservePanelState/.test(corePanel),
		'★P1-3：`refreshPanels` 没把 `preserve` 传给 writer ⇒ writer 拿不到「要保什么」');

	/* ② P1-3 故事侧：writer 确实在写入**前后**搬运 `open`（✗ 只声明）*/
	ok(/panelWriter\s*=/.test(panelsJs) && /\.open\s*=\s*true/.test(panelsJs),
		'★P1-3：故事侧 writer 没有把 `open` 写回（面板重绘仍会把列表折回）');
	ok(/\.find\(sel\)/.test(panelsJs) && /\.find\(sel\)/.test(corePanel) === false,
		'★P1-3：搬运必须按**同一选择器**配对（✗ 按 index —— 列表顺序一变就错位）');

	/* ③ 运行时面（展开⇒刷新⇒仍展开）**不在此判** —— 本件是无 DOM 环境（`document` 是桩、无 jQuery），
	 *   在此判会**假红**。该面归 `books/tools/e2e-harness.mjs`（真 jsdom）：
	 *   `probe-B.mjs` 实测「展开 open=true → refreshPanels → open=true → 切档 → open=true」。
	 *   ⇒ 本件只守**静态接线**（①②）＋ P1-6（④⑤），运行时行为由 e2e 守 —— 两处各守其能守的。 */

	/* ④ P1-6：`:: 遭遇战` 段里**不得**再有静态出口链接 */
	const seg = (twee.split(':: 遭遇战')[1] ?? '').split('\n::')[0];
	ok(seg.length > 0, '★找不到「遭遇战」段（段落改名 ⇒ 本判据失效）');
	ok(!/\[\[[^\]]*探索[^\]]*\]\]/.test(seg),
		'★`#1877` P1-6：遭遇战段里仍有静态出口链接 ⇒ 战斗**尚未开始**它就在页顶出现（操作者实测）');

	/* ⑤ P1-6 早退出口：`fight()` 须在**早退时**自己落页底出口（✗ 两条出口） */
	const enc = fs.readFileSync(path.join(storySrc, 'world', 'encounters.js'), 'utf8');
	const fightBody = enc.split('setup.BABEL.fight = async')[1]?.split('setup.BABEL.noteTraumas')[0] ?? '';
	ok(/const exit = \(\) =>/.test(fightBody), '★P1-6：fight() 里没有早退出口函数 `exit()`');
	ok(/if \(!interactive\) return undefined;/.test(fightBody),
		'★P1-6：早退出口没有 `interactive` 门控 ⇒ 无头（`verify`/自动通路）会 `await choice` **永久挂起**');
	const bail = [...fightBody.matchAll(/bail\('/g)].length;
	ok(bail >= 3, `★P1-6：早退分支应各自落出口（本仓早退 3 处：无该层／装配缺口／无遭遇），实测 ${bail} 处`);

	console.log(`  P1-3：保留表 ${R.preservePanelState.length} 条｜核契约＋故事侧接线 ✓（运行时面归 e2e）`);
	console.log(`  P1-6：遭遇战段无静态链 ✓｜早退出口 ${bail} 处且门控 ✓`);
}

/* ---------- 汇总 ---------- */
/* 汇总与崩溃兜底的**定义**在文件开头**（见「失败形」一节）—— 那两行 `process.on` 必须在
 * 任何可能抛错的语句之前注册，否则中途崩溃时兜底还没挂上（本笔 M9′ 刀实测踩过）。 */

/* ---------- ⑯ 试玩终点的**结算与重开**（`books#130` ①②）----------
 * 两处都是**玩家可见**面，且都**只能静态核**（本脚本不执行 twee —— 它手摆 StoryInit 变量）
 * ⇒ 判据落在**源文本**上。★口径（`#130` 评论的装置辨析）：
 *   restart 家族的判据一律断「**调用了什么**」，✗ 断「调用后世界变成什么样」——
 *   因为 jsdom 的 `location.reload()` 是 **no-op**（实测 `"Not implemented: navigation to another Document"`），
 *   断「reload 后状态」等于断一个**真浏览器不走的分支**。 */
head('⑯ 试玩终点（① 结算模板串 ＋ ② 真重开）');
{
	const playTwee = fs.readFileSync(path.join(storySrc, 'story', 'play.twee'), 'utf8');
	/* ① `$_r.` 是**故事变量**前缀，而 `_r` 是 `<<set>>` 出来的**临时变量** ⇒ 写 `$_r.` 会**原样印出模板串**。 */
	const bad = [...playTwee.matchAll(/\$_\w+\./g)].map((m) => m[0]);
	ok(bad.length === 0, `★\`play.twee\` 里有 \`$\` 前缀的临时变量引用（会向玩家**印出模板串**）：${bad.join('、')}`);
	ok(playTwee.includes('_r.deepest') && playTwee.includes('_r.gathered'), '★结算屏的读数引用不见了（`_r.deepest`／`_r.gathered`）');
	/* ② 终点链须**真重开**：断「调到 `Engine.restart()`」，✗ 断「段落是『开始』」（后者状态全留）。
	 * ★★**须先剥注释再断**（`dev-10` RC · `#131`）：本段上方的说明性注释里**就有** `Engine.restart()` 这串
	 *   ⇒ 直接断子串会被**注释满足**（旧形 `term.includes('Engine.restart()')` ⇒ 把链改回段落跳转也**仍绿**）。
	 *   ⇒ 两向都收紧：① 判据只核**代码**（**剥块注释**）② 断言**调用形** `<<run Engine.restart()>>`（✗ 松散子串）。
	 *   ⚠ 本条注释**不得**写出块注释的**结束定界符** —— 本席首版在此写了字面量 ⇒ **提前终结注释** ⇒ 整档 `SyntaxError`（讽刺地正属本格要防的「注释/代码混淆」族）。 */
	const term = playTwee.slice(playTwee.indexOf(':: 试玩终点')).replace(/\/\*[\s\S]*?\*\//g, '');
	ok(!/\[\[再爬一次[^\]]*\]\]/.test(term), '★终点链仍是**段落跳转**形（`[[…|开始]]`）⇒ 背包/位置/状态全留，「新一局」不成立');
	ok(term.includes('<<run Engine.restart()>>'), '★终点链没有调 `Engine.restart()`（`≈books#130` ②：须真重开；断的是**调用形**，✗ 松散子串）');
	console.log(`  结算屏：\`$\`前缀误用 ${bad.length} 处 ✓｜终点链调用 Engine.restart() ✓（真重开，✗ 段落跳转）`);
}

/* ---------- ⑰ D5-3① `give`/`take` 后重绘的**不变式**（T 席 `sagitrs-tester-3` 建议）----------
 * T 席读数的要害：`give('coin')` 后**面板未变**，`refreshPanels` 后才变 ⇒ 现设计**依赖**
 *   「所有给件路径都恰在**切段**处收尾（`:passagedisplay` 是唯一填充点）」这条**未来不变式**。
 * ★本格把该依赖**写下来并钉住**（✗ 只是注释）：
 *   ① 渲染**单点同形** —— 面板体（去标签）与 `inventoryLabel()` **逐字相同**（后缀共用 `itemCountSuffix`）；
 *   ② `give`／`take` **本体不自刷新** —— 一旦有人给它们加自刷新，**本格变红** ⇒ 强迫**同笔**改判据
 *      （✗ 静默改变「何时重绘」这条玩家可感语义）；填充点与局部刷新域的既有断言在 ⑮。
 *   ⚠ 本格**不**声称「give 后面板会自动更新」—— 恰恰相反：它钉的是「**不**自动」这个事实与它的依赖。 */
head('⑰ D5-3① give/take 后重绘的不变式（面板唯一填充点＝切段）');
{
	const invCore = fs.readFileSync(path.join(root, 'src', 'core', '30-inventory.js'), 'utf8');
	const nRefresh = (invCore.match(/refreshPanels/g) ?? []).length;
	ok(nRefresh === 0, `★\`give\`/\`take\` 所在档出现了 ${nRefresh} 处 refreshPanels —— 若**有意**改成自刷新，须**同笔**改本格与 ⑮（✗ 静默改变重绘时机）`);
	/* ★**先清背包**：本格断的是「充能件带 `×1`」（渲染单点），✗ 不是「上一格剩了几枚硬币」——
	 *   不清则硬币**并入既有堆** ⇒ 标签成 `×N` ⇒ 本格假红（实测；同 ⑩ 那族的**前提依赖**）。 */
	State.variables.inventory = [];
	R.give('coin');
	const label = R.inventoryLabel();
	const dom = String(R.panelHTML?.('inventory') ?? '').replace(/<[^>]*>/g, '').trim();
	ok(dom === label, `★背包面板体与 \`inventoryLabel()\` **不同形**（多渲染点漂了）：DOM=${JSON.stringify(dom.slice(0, 60))}｜label=${JSON.stringify(label.slice(0, 60))}`);
	ok(label.includes('×1'), '★充能件没带 `×1` 后缀（D5-3 的「含 ×1」面）');
	console.log(`  面板体 ≡ label（逐字）✓｜give/take 本体不自刷新 ✓（refreshPanels 出现 ${nRefresh} 处）｜label=${JSON.stringify(label)}`);
}

/* ---------- ⑱ D5-3② 后缀**三类**其一：不充能件**恒无后缀**（T 席建议：防日后「统一加后缀」静默改文案）----------
 * 三类（`RPG.itemCountSuffix` 单点给出）：不充能件 ⇒ **空串**｜采集点 ⇒ `（还可采 N 次）`｜其余充能件 ⇒ `×N`。
 * ★本格专钉**第一类**：它最容易被「统一加后缀」的重构**静默**吃掉（那会改玩家可见文案 ⇒ 属语义变更）。
 *   另两类在此**一并取真值**（✗ 只钉一类而另两类无据），并断两类**可分辨**（✗ 同形）。 */
head('⑱ D5-3② 后缀三类（不充能件恒无后缀 · 采集点 · ×N）');
{
	const sfx = (id) => R.itemCountSuffix(R.createItem(id));
	const 不充能 = ['club', 'wood-spear'];
	const 充能件 = ['coin', 'iron-ore', 'herb-poultice'];
	const 采集点 = ['stone-pile', 'dead-wood'];
	for (const id of 不充能) {
		ok(sfx(id) === '', `★不充能件 \`${id}\` 带了后缀 ${JSON.stringify(sfx(id))} —— 不充能件**恒无后缀**（✗ 日后「统一加后缀」会静默改文案）`);
	}
	for (const id of 充能件) ok(/^×\d+$/.test(sfx(id)), `★充能件 \`${id}\` 的后缀不是 \`×N\` 形：${JSON.stringify(sfx(id))}`);
	for (const id of 采集点) ok(/^（还可采 \d+ 次）$/.test(sfx(id)), `★采集点 \`${id}\` 的后缀不是「（还可采 N 次）」形：${JSON.stringify(sfx(id))}`);
	ok(!/^×/.test(sfx('stone-pile')), '★采集点用了 `×N` 形（与普通充能件**同形**⇒ 玩家分不出「还能采」与「库存 N」）');
	console.log(`  不充能件 ${不充能.join('、')} ⇒ 空串 ✓｜充能件 ${充能件.map((i) => i + sfx(i)).join('、')}｜采集点 ${采集点.map((i) => i + sfx(i)).join('、')}｜两形可分辨 ✓`);
}

/* ---------- ⑲ 永久被动「预知」占位（`#1893` E2 · books#132 甲裁定）----------
 * ★四条语义各断一处：**注册生效** · **授予** · **跨场保留** · **存读档往返仍在**。
 * ★反向刀（甲裁定「跨场 ✗ 跨死亡」）：**死亡清档后 ✗ 残留** —— 若误断成「跨死亡永久」会在此被抓住。
 * ★往返走引擎自陈的**同一条通路**（`world/encounters.js:24`）：`toJSON → JSON → Character.revive`。 */
head('⑲ 永久被动「预知」占位（注册 · 授予 · 跨场 · 往返 · 死亡✗残留）');
{
	const P = D.Player;
	/* ★格尾复原（dev-10 NIT-2）：本格会改 `P` 的 items/hp/nonlethal 并走 `respawn`（**会搬位置**）
	 *   ⇒ 存/复原，✗ 把「留死 Player」传给后续格。 */
	const saved = { items: P.items, hp: P.hp, maxHp: P.maxHp, nonlethal: P.nonlethal };
	/* ★★取 def 前必须【先探测】（dev-10 NIT-1 的准修）：`R.effectOf` 对**未注册 id 抛错**
	 *   （`17-effect.js:135`「未注册 ⇒ 抛错」）⇒ 直接 `const def = R.effectOf(…)` 会让刀红成
	 *   「未捕获异常（脚本中途崩了）」而非**具名断言**。
	 *   ⚠ ✗ 用 `if (def)` 守卫 —— 那修不到：**抛在取 def 那一行**。 */
	const registered = R.effects.has('precognition');
	const def = registered ? R.effectOf('precognition') : null;
	ok(registered, '★`precognition` 未注册（`R.effects.has` 为假）—— 故事侧 `R.defEffect` 未生效');
	/* ★未注册 ⇒ 以下三条会**误红**（`def` 为 null）＋ 授予等四条会**抛**
	 *   ⇒ 全部放进 `else` ⇒ 刀红收成**恰一条**（✗ 四条假红 —— 本席实跑抓到）。 */
	if (!registered) {
		console.log('  ★未注册 ⇒ 名/scope/判定字段 ＋ 授予/跨场/往返/清档**全部跳过**（刀面：红已具名于上一条）');
	} else {
		ok(def?.name === '预知', `名应为「预知」，实为 ${JSON.stringify(def?.name)}`);
		ok(def?.scope === 'persistent', `scope 应为 persistent，实为 ${JSON.stringify(def?.scope)}`);
		/* 占位 ⇒ **不得带判定字段**（防日后被顺手加上效果 ⇒ 静默改判定） */
		ok(!('selfRollMode' in def) && !('targetRollMode' in def) && !('inactive' in def),
			'★占位件不得带判定字段（否则会参与 rollMode／canAct 派生）');
		try {
			P.lose('precognition');            // 干净起点（防前序格残留）
			P.gain('precognition');
			ok(P.contains('precognition'), '授予后应持有');
			R.events.emit('battle:end', { players: [P], enemies: [] });
			ok(P.contains('precognition'), '★跨场保留：战斗结束后应仍在（scope=persistent）');
			const round = R.Character.revive(JSON.parse(JSON.stringify(P.toJSON())));
			ok(round.contains('precognition'), '★存读档往返后应仍在（同 encounters.js:24 的往返通路）');
			/* 反向刀：死亡清档 ⇒ 须清（甲裁定「✗ 跨死亡」） */
			P.hp = 0;
			P.gain(R.death.id);
			const res = R.respawn(P, { map });
			ok(!P.contains('precognition'),
				`★死亡清档后仍残留 —— 甲裁定是「跨场 ✗ 跨死亡」（respawn 清档应清它；实见 ${JSON.stringify(P.effects)}）`);
			console.log(`  注册/授予/跨场/往返 ✓｜死亡清档 cleared=${res.cleared} ⇒ ✗残留 ✓`);
		} finally {
			/* ★复原（dev-10 NIT-2）：状态键回原值 ＋ 清本格授予的效果 ⇒ ✗ 残留给后续格。
			  *   ⚠ 本格直调引擎的 `R.respawn`（**引擎契约**；`books#176` 后故事侧不再调它）⇒ 它会把 `P` 搬回
			 *     且后续格均显式 `map.moveTo(...)`）。 */
			P.lose('precognition');
			P.items = saved.items;
			P.hp = saved.hp;
			P.maxHp = saved.maxHp;
			P.nonlethal = saved.nonlethal;
		}
	}
}

/* ---------- ⑳ L1–L9 **引导弧**（`books#132`）的 L1–L4 节拍 ----------
 * 每格对应**操作者设计的一条节拍**（✗ 我自拟）—— 判据即「该节拍在装置上**成立**」：
 *   L1 空手可胜 ＋ 捡剑 ｜ L2 战后 100% 绷带 ｜ L3 一击必杀怪 ｜ L4 必掉钥匙 ＋ 宝箱三路（不可逆）。 */
/* 本格给⑳这一段一个已知的进入状态，做法是在它开始之前埋一件哨兵，
 * 并把⑳自己会发下的两件物品清掉；后面那一格才有办法判断残留有没有漏到下游。
 * 这一行必须写在⑳保存进入状态的那一行之前，否则它自己会被当成进入状态的一部分。 */
const 刀前背包 = State.variables.inventory;
State.variables.inventory = [{ id: 'heavy-steel-shield', charges: null, equipped: false }];
globalThis.__arcEntry = { pos: map.current, hp: D.Player.hp };
head('⑲b 保存域登记（`#1902`／`#1903`：`$span1Arc` 进 `envelope().domains`）');
{
	/* ★先断**接口在场**（`dev-9` NIT-2）：接口缺席时 `undefined === false` 为假 ⇒ 下游断言会把
	 *   「接口不在」误报成「护栏失效」，把读的人引向错的方向。 */
	ok(typeof R.save?.declareDomain === 'function', '接口不在（books 依赖的 `sgstory#1903` 未合入？）');
	const en = R.save?.envelope?.();
	ok(!!en, '`RPG.save.envelope()` 不在');
	if (en) {
		const 域 = en.domains ?? [];
		const 含 = 域.includes('span1Arc');
		/* ★`✓` 只在**成功支**印（`dev-9` NIT-1）：无条件印 `✓` 是恒真面、零信息量，
		 *   而正文恰引该行当读数 ⇒ 读的人会把恒真的 `✓` 当成判据结论。计数则两支都印。 */
		console.log(含 ? `  域登记：domains 含 span1Arc（${域.length} 个域）`
			: `  域登记：domains **不含** span1Arc（${域.length} 个域）｜实得 ${JSON.stringify(域)}`);
		ok(含, `★\`span1Arc\` 不在 \`envelope().domains\`（实得：${JSON.stringify(域)}）⇒ 故事侧新键未登记`);
	}
	/* ★`dev-9` NIT-3：本行曾为**裸调用** ⇒ 接口缺席时抛 `TypeError`、脚本**从 ⑲b 崩掉**，
	 *   其后各格一条不跑（新头 0 格 / 上一头 2 格）。⇒ 包一层能力判，缺席时**只记不可判**，✗ 崩。 */
	if (typeof R.save?.declareDomain === 'function') {
		ok(R.save.declareDomain('inventory', 'byPack') === false, '★内置键（inventory）被故事侧覆盖了，护栏失效');
	} else {
		console.log('  （接口缺席 ⇒ 护栏面不可判，✗ 崩）');
	}
	/* ★**阻断的刀**（`dev-9`：可选调用在缺席时静默 ⇒ 出声支是死支）——
	 *   把接口临时撤掉，**真调用**登记函数，断言告警出现；复原后再调一次，断言不再出现。 */
	{
		const 存 = R.save.declareDomain;
		const 告警 = []; const 原warn = console.warn;
		console.warn = (m) => 告警.push(String(m));
		/* ★两向结果须在 `try` **之外**可见（块外要印）；✗ 在 try 内 `const`（块外引用即 ReferenceError）。 */
		let 缺席告警 = false, 归因ok = false;
		try {
			R.save.declareDomain = undefined;
			setup.BABEL.登记域();
			缺席告警 = 告警.some((m) => m.includes('保存域登记口缺席'));
			ok(缺席告警, '★接口缺席时**没有出声**（登记函数在缺席支不出声 ⇒ 声明与实现不符）');
			R.save.declareDomain = 存;
			const 前 = 告警.length;
			setup.BABEL.登记域();
			/* ★在场时**会**出声，但必须是**另一条**（重复登记）：`declareDomain` 对同名重复返回 `false`
			 *   ⇒ 本条区分「缺席」与「已登记」两种 false，✗ 只看「有没有出声」。 */
			const 新 = 告警.slice(前).join('｜');
			归因ok = 新.includes('已登记过') && !新.includes('缺席');
			ok(归因ok, `★接口在场时的出声归因错（应说「已登记」，实得：${新 || '（无）'}）`);
		} finally {
			R.save.declareDomain = 存; console.warn = 原warn;
		}
		/* ★`dev-9` NIT-5：本行的 `✓` 原为**无条件**印（臂 D 下也照印「告警 0 条 ✓」）⇒ 改为按两向结果条件印。 */
		console.log(`  缺席/在场两向：告警 ${告警.length} 条${缺席告警 && 归因ok ? ' ✓' : ' ✗'}`);
	}
}

head('⑳ `books#132` L1–L4 弧（空手可胜／捡剑／必掉绷带／一击必杀／钥匙·宝箱）');
{
	/* ★**存-复原**（`dev-10` NIT · 非洁癖）：本段会**清背包／移动地图**，而 **L5–L9 的新格（㉑㉒…）**
	 *   紧接着追加在本段之后 ⇒ 残留**马上会被继承**成下游假红。照 ⑤b 的形：进出各一次。 */
	const 存弧 = { inv: (State.variables.inventory ?? []).slice(), 位: map.current, hp: D.Player.hp };   // ★存**副本**（✗ 引用：本段内若有 give 会就地改到它）
	/* ── L1 表：**只出非 elite**（空手 1d3 可磨死）⇒ 这是「空手可胜」的**机械前提**（✗ 口号）。 */
	const t1 = R.encounterTables?.span1;
	ok(!!t1, '★遭遇表 `span1` 不在（弧的 L1–L3 覆写没生效？）');
	if (t1) {
		ok((t1.L2?.encounters ?? []).some((e) => e.elite), '★L2 没有升 elite ⇒ 设计要的「难度较高」不成立');
		ok((t1.L3?.encounters ?? []).some((e) => e.ref === 'blue-moss-wasp'), '★L3 没换成蓝苔蜂（`books#132` 的 L3 怪）');
		/* ★**判据连改（`books#133` 笔 3）**：原来这里要求「L9 与引擎表逐字同源」，而笔 3 把 L9
		 *   **有意替换**成固定头目行 ⇒ 那条反了。继承面改查 **L8**（L4–L8 仍须逐字继承，防漂）；
		 *   L9 的新不变式在 ㉗ 格（单一 ref ＝ 固定头目）。 */
		ok(JSON.stringify(t1.L8) === JSON.stringify(D.ENCOUNTER_SPAN1?.L8), '★L8 行与引擎表**不同源**（L4–L8 应逐字继承，覆写时漂了）');
		ok((t1.L9?.encounters ?? []).length === 1 && t1.L9.encounters[0].ref === 'sleepless-one',
			`★L9 行不是「固定头目」（${JSON.stringify(t1.L9?.encounters)}）—— 笔 3 的口径是行内只剩头目一个 ref`);
	}
	/* ── L3 怪：**一击必杀 = 机制事实**（hp 1 ≤ 玩家最低一击） */
	const wasp = R.characters.get('blue-moss-wasp');
	ok(!!wasp, '★`blue-moss-wasp` 没注册（L3 的怪）');
	if (wasp) {
		ok(wasp.maxHp === 1, `★蓝苔蜂 maxHp=${wasp.maxHp}（设计要「一击必杀」⇒ 须 ≤ 玩家最低一击 1）`);
		ok((D.Player.unarmed?.item?.stats?.dmg ?? '') === '1d3', '★空手伤害不再是 1d3 ⇒「一击必杀」的下限判据须重算');
		/* ★**怪必须有已装备的攻击件**（`RPG.Character` **不认** `attacks:` 字段 —— 我首版即栽在此：
		 *   怪因此**咬不动人**，一场「白送」的战斗表面上仍会让「可胜」为真）。⇒ 这一格钉住这一类。 */
		const foeItems = (c) => (c?.items ?? []).map((i) => (typeof i?.id === 'string' ? i.id : null));
		ok(foeItems(wasp).length > 0, '★蓝苔蜂**没有攻击件**（`items` 空）⇒ 它在战斗里咬不动人（`attacks:` 字段不被 `Character` 认）');
	}
	/* ── L1 固定事件：捡剑（**经动作**触发，✗ 直接 give） */
	State.variables.inventory = [];
	const l1 = map.locations.get('L1').actions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('长剑'));
	ok(!!l1, '★L1 没有「拾起地上的长剑」动作（`books#132` L1 固定事件）');
	if (l1) {
		l1.action();
		ok(R.has('sword'), `★拾起后背包里没有剑（实得：${R.inventoryLabel()}）`);
		ok(R.equippedWeapon?.()?.id === 'sword', '★拾起后剑**没握在手上**（握不上 ⇒ 战斗仍出不了手）');
		ok(l1.when && !l1.when(), '★拾起后动作**没消失**（应一次性）');
	}
	/* ── L4：必掉钥匙（表）＋ 宝箱三路（钥匙开／硬开成功／硬开失败**不可逆**） */
	/* ★「必掉」须断**真给**（✗ 只断声明常量）—— 这是 `dev-10` 对本笔的 RC：
	 *   原两行只读 `setup.BABEL.弧必掉` 这张**表**，而「战后真给」在 `world/encounters.js` 的循环里
	 *   ⇒ **删掉那个循环，本格照样绿**（＝「声称覆盖而无判据」）。
	 * ⇒ 现形：**格内覆写遭遇表**换成软目标（hp1／AC1）＋ rng 定值 ⇒ **必胜** ⇒ 断**战后背包真含**该物。 */
	{
		const 原表 = R.encounterTables.span1;
		R.defCharacter({
			id: 'verify-drop-dummy', name: '（装置）软目标',
			hp: 1, maxHp: 1,
			stats: setup.DND3.stats({ ac: 1, str: 4, dex: 4, bab: 0 }),
			items: [{ id: 'badger-claw', equipped: true }],
		});
		/* ★`books#180`（`dev-10` 的复核①）：**徒手路径**要有判据 —— `babel.js` 的设计原文是
		 *   「L1 战斗引导（**空手可胜** ＋ 捡剑）」，而本笔引入的新口径改了它的**含义**：
		 *   空手（DND3 的徒手攻击是**非致命**）⇒ 把对手**打晕**脱身，✗ 击杀取材。
		 *   ⇒ 本臂断四件：`kills` 不涨／必掉不发（主依据＝引擎 `#1854`：非致命昏迷者不掉落，
		 *   §14 ⑥ 只是头目门的旁证）／玩家活着能走／**回合数**钉住是「打晕」（✗ 僵持）。
		 *   （✗ 与「僵持」同形 —— 两者都不发战利品，只靠后果分不出来）。 */
		{
			R.registerEncounterTable('span1', Object.assign({}, 原表, {
				L2: { encounters: [{ ref: 'verify-drop-dummy', weight: 1 }], loot: [] },
			}));
			State.variables.inventory = [];
			map.moveTo('L2');
			D.Player.hp = D.Player.maxHp;
			D.Player.nonlethal = 0;
			const kills0 = Number(State.variables.babelRun?.kills ?? 0);
			/* ⚠ 抓战斗日志要包 **`Battle.prototype.perform`**（✗ 故事侧的 `R.perform`）——
			 *   战斗逐行走的是**实例方法**，故事侧包 `RPG.perform` 一行也看不到（本席首版就栽在此，
			 *   回合数读成 0 ⇒ 那条断言**空过**）。 */
			const 原BP = R.Battle.prototype.perform;
			const 行 = [];
			R.Battle.prototype.perform = function (t2, ...rest) { 行.push(String(t2)); return 原BP.call(this, t2, ...rest); };
			try {
				R.rng.set(() => 0.99);                    // 徒手必中 ⇒ 软目标被**非致命**打晕
				await B.fight({ interactive: false });
			} finally {
				R.rng.reset();
				R.Battle.prototype.perform = 原BP;
			}
			const kills1 = Number(State.variables.babelRun?.kills ?? 0);
			ok(kills1 === kills0, `★徒手打晕却涨了 kills（${kills0} ⇒ ${kills1}）—— 打晕不是击杀`);
			ok(!R.has('bandage'), '★徒手打晕却发了「必掉」的绷带 —— 非击杀不该结账（引擎 `#1854` 同规）');
			ok(!D.Player.isDown, '★徒手打晕后玩家自己出局了（本臂的前提：空手也能脱身）');
			/* ⚠ 分「打晕」与「僵持」不能靠结束行文案（`Battle` 的 `perform` 是引擎自己那条路，
			 *   故事侧包不到）⇒ 改断**回合数**：僵持必然跑满 8 回合，打晕会提前收场。
			 *   与上面两条合起来即充分：提前收场 ∧ 无 kills ∧ 无必掉 ∧ 玩家活着 ⇒ 只能是打晕。 */
			const 回合数 = 行.filter((t2) => /【第 \d+ 回合】/.test(t2)).length;
			/* ⚠ **下界也要断**（`dev-10` 的 RC）：`回合数 < 8` 是**上限形** —— 装置要是**一行没抓到**
			 *   （本席首版包错 `perform` 对象时正是 0），`0 < 8` 为真 ⇒ 断言**空过**。而「打晕 vs 僵持」
			 *   恰恰**只**靠它分（僵持同样满足「无 kills ∧ 无必掉 ∧ 玩家活着」）。
			 *   ⇒ 加下界：**装置没测到**（0 回合）也红。 */
			ok(0 < 回合数 && 回合数 < 8, `★本臂没能分出打晕与僵持（实得 ${回合数} 回合，应 0 < n < 8）—— 0 表示**装置没抓到日志**（✗ 真发生了 0 回合的战斗）`);
			console.log(`  徒手：kills ${kills0}⇒${kills1}｜绷带 ${R.has('bandage')}｜玩家出局 ${D.Player.isDown}｜提前收场（${回合数} < 8 回合）`);
		}
		for (const [层, 物] of [['L2', 'bandage'], ['L4', 'iron-key']]) {
			R.registerEncounterTable('span1', Object.assign({}, 原表, {
				[层]: { encounters: [{ ref: 'verify-drop-dummy', weight: 1 }], loot: [] },   // ★空随机掉落 ⇒ 断的就是「必掉面」
			}));
			State.variables.inventory = [];
			map.moveTo(层);
			D.Player.hp = D.Player.maxHp;
			/* ★`books#180`：本臂要的是**真击杀**。徒手在 DND3 是**非致命** ⇒ 只会把软目标**打晕**
			 *   （`isKnockedOut`）⇒ 按 §14 ⑥「打晕不等于胜利」与引擎自己的 `RPG.loot`（非致命昏迷者不掉落）
			 *   ⇒ 战果＝`stunned`、不发战利品也不发必掉（本席实跑读数：靶 hp1／非致命 8 ⇒ stunned）。
			 *   故先持械（致命路），再一击毙。 */
			R.give('sword');
			R.equip('sword');
			R.rng.set(() => 0.99);                       // 必中重击 ⇒ 软目标一击毙（致命）
			await B.fight({ interactive: false });
			R.rng.reset();
			ok(R.has(物), `★${层} 战后背包里**没有** ${物} ⇒ 「必掉」只写在表上、**没有真给**（dev-10 RC）`);
		}
		R.registerEncounterTable('span1', 原表);
	}
	ok(JSON.stringify(setup.BABEL.弧必掉?.L2) === JSON.stringify(['bandage']), '★L2 必掉表不是绷带（`books#132`：战后 100%）');
	const l4acts = map.locations.get('L4').actions.map((a) => String(typeof a.text === 'function' ? a.text() : a.text));
	ok(l4acts.some((t) => t.includes('铁钥匙')), '★L4 没有「用铁钥匙开箱」动作');
	ok(l4acts.some((t) => t.includes('硬开')), '★L4 没有「硬开」动作');
	/* 路①：钥匙开 ⇒ **消耗钥匙** ＋ 得中甲（`mail`） */
	{
		State.variables.span1Arc = {};
		State.variables.inventory = [];
		R.give('iron-key');
		const openAct = map.locations.get('L4').actions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('铁钥匙'));
		ok(openAct.when(), '★有钥匙时「用铁钥匙开箱」却不可用');
		openAct.action();
		ok(!R.has('iron-key'), '★开了箱但钥匙**没被消耗**（`books#132`：钥匙＝消耗品）');
		ok(R.has('mail'), `★开箱后没拿到中甲（实得：${R.inventoryLabel()}）`);
		ok(R.has('sword') === false, '（前置复核）本条不该再留剑 —— 上一格的后效未清');
	}
	/* 路②：硬开**失败** ⇒ **永久锁死**（不可逆 ⇒ 之后两条路都不可用） */
	{
		State.variables.span1Arc = {};
		State.variables.inventory = [];
		/* ★须先给家伙：**空手 1d3 ≤ 3 < 6 点血 ⇒ 永远砸不开**（实测）⇒ 硬开是「手上有东西才谈得上」的动作。 */
		R.give('sword'); R.equip('sword');
		const hardAct = map.locations.get('L4').actions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('硬开'));
		/* 确定性：让伤害掷骰**最小** ⇒ 6 点血的箱子砸不破。 */
		const roll = R.rng.set(() => 0.0);
		D.Player.hp = D.Player.maxHp;
		hardAct.action();
		R.rng.reset();
		ok(State.variables.span1Arc.chests?.['chest-l4']?.locked === true, '★硬开没砸开时**没有锁死** ⇒ 「有代价的二择」不成立（可无限重试＝白给）');
		ok(!R.has('mail'), '★硬开失败却拿到了中甲');
		ok(!map.locations.get('L4').actions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('硬开')).when(),
			'★锁死后「硬开」仍可用（不可逆被破）');
	}
	/* 路③：硬开**成功** ⇒ 得中甲 */
	{
		State.variables.span1Arc = {};
		State.variables.inventory = [];
		R.give('sword'); R.equip('sword');   // 同上：须有家伙
		const hardAct = map.locations.get('L4').actions.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).includes('硬开'));
		const roll = R.rng.set(() => 0.99);   // 高掷 ⇒ 必破（剑 1d8 满掷 8 > 6 点血）
		D.Player.hp = D.Player.maxHp;
		hardAct.action();
		R.rng.reset();
		ok(R.has('mail'), `★硬开砸开了却没拿到中甲（实得：${R.inventoryLabel()}）`);
	}
	/* ── L1「空手可胜」的**可达性**（✗ 本格**不**声称已证「可胜」）----------
	 * ★实测教训：**无头自动通路测不出空手** —— 空手打击在战斗 UI 里是**一个选项**（`40-battle.js:445` 常驻项），
	 *   自动通路只走「已装备武器」⇒ **空手时玩家零输出**（实测 `kills +0`，玩家白挨打）。
	 *   ⇒ 「空手可胜」须由**交互通路**（真驾驶/tester 的 e2e 驾驶层）判，✗ 不能用 `fight({interactive:false})` 冒充。
	 *   本格只钉**结构前提**：L1 的表里**没有 elite**（空手面对的是最弱档）＋ 空手项**存在**。 */
	{
		ok(typeof D.Player.unarmed === 'object' && D.Player.unarmed !== null, '★空手面不在（`#1854`/E1）⇒「空手可胜」无从谈起');
		const t = R.encounterTables?.span1 ?? {};
		ok((t.L2?.encounters ?? []).some((e) => e.elite), '★L2 没有 elite ⇒ 设计要的「难度较高」不成立');
		/* ★**甲已落**（`#132` 裁甲 · 本笔）：引擎表 L1 原含一条 **elite 獾**（`climb.js:70`）⇒ 本笔把 L1 覆写为
		 *   **幼獾**（去 elite，hp4/AC12）⇒ 「空手可胜」的**结构前提**成立。
		 *   ⚠ **剩余面（✗ 本格冒充）**：「空手**真能赢**」须由**交互通路**判 —— 空手打击是战斗 **UI 选项**
		 *   （`40-battle.js:445`），`fight({interactive:false})` 只走「已装备武器」⇒ 空手**零输出**（实测 `kills +0`）。
		 *   ⇒ 该面已转测试席（与 `#134` 交互战斗驾驶同装置）。本格只钉结构前提，✗ 声称已证「可胜」。 */
		const l1Elite = (t.L1?.encounters ?? []).some((e) => e.elite);
		ok(!l1Elite, '★L1 表里出现 elite ⇒ 「空手可胜」的结构前提被破（`#132` 裁甲：L1 去 elite）');
		console.log(`  空手前提：L1 无 elite ✓（甲已落）｜★「真能赢」须交互通路判（已转测试席）`);
	}
	console.log(`  弧：L1 表无 elite ✓｜L2 elite ✓｜L3 蓝苔蜂 hp=${wasp?.maxHp} ✓｜捡剑经动作 ✓｜`
		+ `必掉 L2/L4 ✓｜宝箱三路（钥匙消耗／锁死不可逆／砸开得物）✓`);
	State.variables.inventory = 存弧.inv;   // ★复原（✗ 留给下游格）
	if (map.locations.has(存弧.位)) map.moveTo(存弧.位);
	D.Player.hp = 存弧.hp;
}

/* ⑳b 的用处，是验证下游格看到的进入状态确实等于⑳的进入状态。
 * ⑳会清空背包并发下物品，如果它不做复原，紧接着追加的㉑㉒等格会继承这些残留，
 * 表现为难以定位的假红。这里一共断四个面：哨兵仍在、⑳发下的两件不在、
 * 地图位置回到进入状态、体力回到进入状态。 */
head('⑳b 存-复原（刀）');
{
	ok(R.has('heavy-steel-shield'), '⑳之后哨兵件不见了，说明进入状态没有被复原，下游格会继承⑳的残留');
	ok(!R.has('bandage') && !R.has('iron-key'), '⑳发下的物品漏到了下游，背包里仍有绷带或铁钥匙，说明复原没有盖住残留');
	ok(map.current === globalThis.__arcEntry.pos,
		`⑳之后地图位置没有复原，实测为 ${map.current}，进入状态是 ${globalThis.__arcEntry.pos}`);
	ok(D.Player.hp === globalThis.__arcEntry.hp,
		`⑳之后体力没有复原，实测为 ${D.Player.hp}，进入状态是 ${globalThis.__arcEntry.hp}`);
	console.log(`  存-复原：哨兵仍在 ${R.has('heavy-steel-shield')}，残留绷带 ${R.has('bandage')}，残留铁钥匙 ${R.has('iron-key')}`);
	State.variables.inventory = 刀前背包;
}

/* ── ㉑ 读档后「探索」场景头须重印（`books#136` F4）───────────────────────────
 *
 * 它回答的问题：**同地点读档后，玩家还看得见自己在哪一层吗？**
 *   病灶：场景头（【层名】＋desc）只在「进场」时印一次，判据是引擎 `MapScene` 里的
 *     `map.current !== #headerLoc`；而 `#headerLoc` 是**实例私有字段**（故事侧不可达、随实例存活），
 *     `map.current` 随**存档**存活 ⇒ 同地点读档时两者相等 ⇒ 读档后屏幕上**只剩选项**。
 *   修在故事侧（`src/story/hooks.js`：读档换一个新场景实例）⇒ 本格断的正是**该修的果**：
 *     读档后再进场，场景头须**重印**。
 *
 * ⚠ 装置两面（先说清，✗ 含糊）：
 *   · `choice` 桩成「永不 resolve」—— `#renderLocation` 走到「头已印、选项待选」那一刻停住；
 *     不桩，本仓已有格记过「无头 await choice 永久挂起」那条。
 *   · `perform` 按实例收到本格数组 —— 本脚本不装宿主输出归档，故就地收一次
 *     （影子 `Object.prototype.perform`，只影响本格这二三个实例）。
 *   ★本格**两向**（开跑前先断「装置看得见头」）：先走 L1→L2→L1 两跳，**两跳都须印头**；
 *     若这两臂不成立（装置看不见头），后面那条读档断言就成了「碰巧绿」⇒ 具名报出来。 */
head('㉑ 读档进场 ⇒ 场景头重印（`books#136` F4）');
{
	const ID = 'babel-explore';
	ok(R.scenes.get(ID) instanceof R.MapScene, `★「${ID}」未注册为 MapScene（读档重注册的前提）`);

	/** 驱动一次**真渲染**，返回本次印出的正文行。
	 *  ★与 `Scene.play` 同形：`execute()` 是 async 且 fire-and-forget（✗ 在此 await —— 它永不返回）。 */
	const 渲染一次 = async () => {
		const scene = R.scenes.get(ID);
		const 行 = [];
		scene.perform = (t) => { if (typeof t === 'string') 行.push(t); };
		scene.choice = () => new Promise(() => {});
		scene.execute();
		await new Promise((r) => setTimeout(r, 0));
		return 行;
	};
	const 印了 = (行, 层名) => 行.some((t) => t.includes(`【${层名}】`));

	map.moveTo('L1');                              // 先把「印过的地点」钉到 L1（上游各格动过位置）
	await 渲染一次();
	map.moveTo('L2');
	const 去 = await 渲染一次();
	ok(印了(去, '第 2 层 · 倒木坡'),
		'★两向①（装置自证）：换层后场景头没印 ⇒ 本格判不了 F4（✗ 把它读成 F4 结论）');
	map.moveTo('L1');
	const 回 = await 渲染一次();
	ok(印了(回, '第 1 层 · 苏醒之地'),
		'★两向②（装置自证）：回到 L1 后场景头没印 ⇒ 本格判不了 F4');

	/* 存档（此刻 current＝L1）→ 读档（**同地点**）→ 再进场：场景头须重印。
	 * 走 host 的真实存/读面（含 `Save.onSave`／`Save.onLoad` 处理器）⇒ 断的是**接线**，✗ 不是工厂直调。 */
	const 存档 = Save.make();
	Save.load(存档);
	const 新场景 = R.scenes.get(ID);
	ok(新场景 instanceof R.MapScene && 新场景.map === map && 新场景.startId === 'L1',
		'★读档后重注册的场景不是「同一张图 ＋ 同一起点」的 MapScene ⇒ 位置与地点会丢');
	const 再入 = await 渲染一次();
	ok(印了(再入, '第 1 层 · 苏醒之地'),
		'★F4：同地点读档后场景头**没有重印**（读档后屏幕上只有选项、没有地点名与描述）');
	console.log(`  读档进场：换层 ${印了(去, '第 2 层 · 倒木坡')} ✓｜回 L1 ${印了(回, '第 1 层 · 苏醒之地')} ✓｜`
		+ `同地点读档后重印 ${印了(再入, '第 1 层 · 苏醒之地')}`);
}

/* ── ㉒ 选择制事件账（`books#133` 笔 1）─────────────────────────────
 *
 * 它回答的问题：**「每层一次抽签、结果入档」这条不变式成立吗？**
 *   设计稿 §3.2：抽签必须每层一次且入档 —— 若每次重绘都抽，玩家每点一下都换选项，读档后还会变样。
 *   本格断五件：①池 ∧ 取二（两类互异、皆在池内、`已用` 为空）②**接线**（进层即抽，`onEnter` 真路径）
 *   ③**幂等**（离层再回不重抽）④**确定性**（同随机源 ⇒ 同结果，两臂可分辨）
 *   ⑤**入档**（域契约含本键；未进过的层无键）与**择一即关闭**（两类一起退场，且不重抽）。
 *
 * ⚠ 装置：本格自建一个**干净的账**（本局账是逐域可重置的纯数据 ⇒ 可存-复原），
 *   ✗ 不用上游各格遗留的抽签结果（那会把「本格的读数」变成「上游跑到哪了」的函数）。 */
head('㉒ 选择制事件账（`books#133` 笔 1）');
{
	const 存账 = State.variables.span1Events;
	const 存位 = map.current;
	State.variables.span1Events = {};                     // 干净起手（存-复原见本格末）

	ok(!('L5' in State.variables.span1Events), '★起手：未进入的层不得有账键（否则「首次进入才抽」无从判）');
	map.moveTo('L5');                                     // 真路径：进层 ⇒ `onEnter` ⇒ `ensureDraw`
	const 甲账 = State.variables.span1Events['L5'];
	ok(!!甲账, '★进层后**没有**事件账 ⇒ `onEnter` 的抽签接线断了');
	if (甲账) {
		const 池 = B.EVENT_KINDS;
		ok(Array.isArray(甲账.抽中) && 甲账.抽中.length === 2, `★抽中不是两类（实得 ${JSON.stringify(甲账.抽中)}）`);
		ok(new Set(甲账.抽中).size === 2, `★抽中两类**互异**（实得 ${JSON.stringify(甲账.抽中)}）`);
		ok(甲账.抽中.every((k) => 池.includes(k)), `★抽中类越池（池 ${池.join('／')}；实得 ${JSON.stringify(甲账.抽中)}）`);
		ok(甲账.已用 === null, `★新账的「已用」须为空（实得 ${JSON.stringify(甲账.已用)}）`);
		const 首抽 = JSON.stringify(甲账.抽中);
		map.moveTo('L6'); map.moveTo('L5');               // 离层再回
		ok(JSON.stringify(State.variables.span1Events['L5'].抽中) === 首抽,
			'★**重抽**了（离层再回后抽中变了 ⇒ 「每层一次」不成立）');
	}

	/* 确定性：**两臂**须可分辨（✗ 只断一条：一条可能碰巧中） */
	R.rng.setSequence([0, 0]);
	const 甲抽 = B.drawTwo();
	R.rng.setSequence([0.99, 0.99]);
	const 乙抽 = B.drawTwo();
	R.rng.reset();
	ok(JSON.stringify(甲抽.抽中) !== JSON.stringify(乙抽.抽中),
		`★确定性两臂**不可分辨**（不同随机源却同结果 ${JSON.stringify(甲抽.抽中)}）`);
	ok(JSON.stringify(甲抽.抽中) === JSON.stringify(['chest', 'gather']),
		`★注入序列 [0,0] 的抽中与手算不符（手算 ['chest','gather']；实得 ${JSON.stringify(甲抽.抽中)}）`);

	/* 入档：域契约含本键（同 `span1Arc` 的面；`#116` 披露的审计缺口不得再漏） */
	const 域 = R.save?.envelope?.()?.domains ?? [];
	ok(域.includes('span1Events'), `★\`span1Events\` 不在 \`envelope().domains\`（实得 ${JSON.stringify(域)}）⇒ 审计缺口`);

	/* 择一即关闭：两类**一起**退场，且**不重抽**（⚠ 无账时**不崩**：只印一句，红由上一条具名承担） */
	{
		const 账 = State.variables.span1Events['L5'];
		if (!账) {
			console.log('  （本层无事件账 ⇒ 「择一面」不可判，红在上一条具名断言）');
		} else {
			const 首抽 = JSON.stringify(账.抽中);
			B.markUsed('L5', 账.抽中[0]);
			ok(B.eventPending('L5', 'chest') === false && B.eventPending('L5', 'gather') === false
				&& B.eventPending('L5', 'battle') === false,
				'★择一之后本层仍有事件待选（两类的守卫须一起变假）');
			ok(B.eventPending('L6', 'chest') === true || B.eventPending('L6', 'gather') === true
				|| B.eventPending('L6', 'battle') === true, '★择一**串层**：另一层的待选面被关掉了（账须逐层独立）');
			ok(JSON.stringify(State.variables.span1Events['L5'].抽中) === 首抽, '★择一之后**重抽**了');
		}
	}

	console.log(`  事件账：取二 ${JSON.stringify(甲账?.抽中 ?? null)}｜重抽 false ✓｜两臂可分辨 ✓｜域含本键 ${域.includes('span1Events')}`);
	State.variables.span1Events = 存账;                   // 复原（✗ 把本格的账留给下游格）
	if (map.locations.has(存位)) map.moveTo(存位);
}

/* ── ㉓ 选择制的**动作面**（`books#133` 笔 1）──────────────────────────
 *
 * ㉒ 判的是**账**（每层一次抽、入档、不漏），本格判的是**屏**：
 *   ① **抽二 ⇒ 两个按钮**（可选的事件面（`availableActions` 里的`事件类`）恰等于抽中的两类）
 *   ② **未抽中的类即便条件满足也不出现**（用 `setSequence` 强制抽到 ['battle','chest']
 *     ⇒ 带 charges 的 `gather` 仍须**不可选**）——这一臂排掉「按条件而非按抽签筛」的伪实现
 *   ③ **择一 ⇒ 两类一起退场**（领队裁 ②B：择一即本层的额外事件面用完）
 *   ④ **基础遭遇（第一场战斗）不受抽签影响**（暂退场不得连带搞掉它）
 *   ⑤ 择一之后**不重抽**（账不变）。 */
head('㉓ 选择制动作面（`books#133` 笔 1）');
{
	const 存账 = State.variables.span1Events;
	const 存位 = map.current;
	const 存包 = State.variables.inventory;
	State.variables.span1Events = {};
	State.variables.inventory = [];
	const 可事件 = (id) => map.locations.get(id).availableActions
		.filter((a) => a.事件类 != null).map((a) => a.事件类).sort();

	/* ① 真进层 ⇒ 可选面恰等于抽中的两类 */
	R.give('pick');                          // ★笔 2 的工具门：L5 的采集要矿镐 ⇒ 不给就只剩另一类（见㉕⑥）
	map.moveTo('L5');
	const 账5 = State.variables.span1Events['L5'];
	const 甲可 = 可事件('L5');               // ★就地取读数（下方重置账后 L5 的账已被抹，不能再读）
	ok(JSON.stringify(甲可) === JSON.stringify([...(账5?.抽中 ?? [])].sort()),
		`★L5 可选的事件面 ≠ 抽中的两类（抽中 ${JSON.stringify(账5?.抽中)}；可选 ${JSON.stringify(甲可)}）`);

	/* ② 强制抽签：未抽中的类（带 charges 的采集）仍不可选 */
	State.variables.span1Events = {};
	/* ★三级注入：进 L6（**危害层**）**先抽签 ①②、后掷危害 ③**（`onEnter` 的次序，witness 见 `world/babel.js`）
	 *  —— ③ 取 0.99 ⇒ `index(6)=5 ≠ 触发格 0` ⇒ miss。
	 *  ⚠ 本行**同时钉住次序**：把危害挪到抽签之前 ⇒ `ensureDraw` 的 `??=` 以为已抽过而不抽 ⇒ 立刻红。
	 *  （首版本注释把次序写反了，dev-9 的 NIT① 抓到；实现一直是对的。） */
	R.rng.setSequence([0.99, 0, 0.99]);     // 手算：index(3)=2 ⇒ battle；rest[chest,gather] index(2)=0 ⇒ chest；危害 index(6)=5 ⇒ miss
	map.moveTo('L6');
	R.rng.reset();
	const 账6 = State.variables.span1Events['L6'];
	ok(JSON.stringify(账6?.抽中) === JSON.stringify(['battle', 'chest']),
		`★注入序列的抽中与手算不符（手算 ['battle','chest']；实得 ${JSON.stringify(账6?.抽中)}）`);
	ok(!可事件('L6').includes('gather'), '★未抽中的类出现了（采集未在抽中却可选 ⇒ 按条件筛而非按抽签筛）');
	ok(可事件('L6').length === 2, `★可选事件面不是两类（实得 ${JSON.stringify(可事件('L6'))}）`);

	/* ③④⑤ 择一：两类一起退场；基础遭遇**不受影响**；账不变（不重抽） */
	const loc6 = map.locations.get('L6');
	const 选中 = loc6.actions.find((a) => a.事件类 === 可事件('L6')[0]);
	ok(!!选中, '★取不到抽中类的动作对象（动作表与`事件类`标记不一致）');
	if (选中) 选中.action();
	const 遭遇形 = (a) => (typeof a.text === 'function' ? a.text() : a.text);
	/* ★`dev-9` NIT-5 的同族：日志里的 `✓` 须**按读数条件**印（✗ 无条件印 —— 臂 B 下会照印「已清 ✓」） */
	const 清 = 可事件('L6').length === 0;
	const 遭遇在 = loc6.availableActions.some((a) => 遭遇形(a).includes('遭遇'));
	const 账静 = JSON.stringify(State.variables.span1Events['L6'].抽中) === JSON.stringify(['battle', 'chest']);
	ok(清, `★择一之后本层事件面没退场（还可选 ${JSON.stringify(可事件('L6'))}）`);
	ok(遭遇在, '★择一之后**基础遭遇**也没了（第一场战斗须保留）');
	ok(账静, '★择一之后重抽了');
	console.log(`  事件面：L5 抽中 ${JSON.stringify(账5?.抽中)} ⇒ 可选 ${JSON.stringify(甲可)}｜`
		+ `强制抽 ['battle','chest'] ⇒ 采集不可选${!可事件('L6').includes('gather') ? ' ✓' : ' ✗'}`
		+ `｜择一后面已清${清 ? ' ✓' : ' ✗'}｜基础遭遇仍在${遭遇在 ? ' ✓' : ' ✗'}`);

	State.variables.span1Events = 存账;
	State.variables.inventory = 存包;
	if (map.locations.has(存位)) map.moveTo(存位);
}

/* ── ㉔ 守卫无副作用（`books#133` 笔 1；`dev-10` 的非阻断记录）─────────────
 *
 * 声明（`world/babel.js`：「守卫不得抽签 —— 那会让『看一眼』就抽」）此前**无判据**：
 *   `dev-10` 把抽签搬进守卫后，验与驾驶层**都仍绿** ⇒ 声明与实现可差得很远而不出声。本格把它钉住：
 *   ① 在**干净账**上「光看不动」—— 逐地点读 `text`／`when`／`availableActions`（这正是一切渲染
 *     路径对动作对象的读法）⇒ 账须**仍为空**（✗ 一次抽都不许在这条路径上发生）；
 *   ② 真 `moveTo` 一层 ⇒ **只有该层**的键出现（✗ 顺手给别的层抽）。
 * ⚠ 读 `text`／`when` 会**建采集点节点**（`nodeAt` 的 `??=`）⇒ 节点账也须存-复原。 */
head('㉔ 守卫无副作用（`books#133` 笔 1）');
{
	const 存账 = State.variables.span1Events;
	const 存位 = map.current;
	const 存节点 = State.variables.gatherNodes;
	let 读了 = 0;
	try {
		State.variables.span1Events = {};
		for (const [, loc] of map.locations) {
			for (const a of loc.actions) {
				读了 += 1;
				if (typeof a.text === 'function') a.text();
				if (typeof a.when === 'function') a.when();
			}
			loc.availableActions;                  // ★渲染路径真走的就是它（`MapScene` 的 actions 面）
		}
		const 看后 = Object.keys(State.variables.span1Events);
		ok(看后.length === 0,
			`★「光看不抽」被破：只读了守卫与文案 ⇒ 账里出现 ${看后.length} 个键（${看后.join('／')}）`);

		/* ★★`dev-9` 的阻断 RC（`dev-10` 同步复现）：白名单**之外**的层不得开抽、**也不得耗随机单元**。
		 *   病灶：`onEnter` 原为无条件 `ensureDraw(L.id)` ⇒ 进 L1／L9／L11 也开账（押反裁 ③），
		 *   且每进一层吃掉 `RPG.rng` 的两个单元（战斗选靶也走它 ⇒ **全局**副作用）。
		 *   ⚠ 本格的②臂原指向**事件层** L5 ⇒ 必然绿，✗ 拦不住这条（`dev-9` 把它改成 L1 即当场红）。 */
		R.rng.setSequence([0.5, 0.5, 0.9]);      // 若进层未耗单元 ⇒ 下面第一个 index(3) 读到 0.5（⇒ 1）
		map.moveTo('L1');
		const 单元 = R.rng.index(3);
		R.rng.reset();
		const 白外 = Object.keys(State.variables.span1Events);
		ok(白外.length === 0, `★白名单**之外**也开了抽：进 L1 ⇒ 账 ${JSON.stringify(白外)}（裁 ③：L9 无抽签、L1 更无）`);
		ok(单元 === 1, `★进非事件层吃了随机单元：注入 [0.5,0.5,0.9] 后首个 index(3) 应读 0.5（⇒1），实得 ${单元}`);

		/* 白名单**之内**：真进 L5 ⇒ 账里**只有**该层 */
		map.moveTo('L5');
		const 键 = Object.keys(State.variables.span1Events);
		ok(键.length === 1 && 键[0] === 'L5',
			`★真进事件层后账里应**只有** L5（实得 ${JSON.stringify(键)}）——多键＝有别的路径在抽`);
		console.log(`  守卫无副作用：读 ${读了} 条动态动作（含 availableActions）⇒ 账键 ${看后.length} 个`
			+ `${看后.length === 0 ? ' ✓' : ' ✗'}｜进非事件层(L1) ⇒ 账 ${白外.length} 个、耗单元 ${单元 === 1 ? '0 ✓' : '≠0 ✗'}`
			+ `｜进事件层(L5) ⇒ ${JSON.stringify(键)}`);
	} finally {
		State.variables.span1Events = 存账;
		State.variables.gatherNodes = 存节点;
		if (map.locations.has(存位)) map.moveTo(存位);
	}
}

/* ── ㉕ 工具耐久制（`books#133` 笔 2）─────────────────────────────
 *
 * 它回答的问题：**「工具三件 ⟹ 耐久 ⟹ 实例感知扣费」这条链走得通吗？**
 *   ① 三件定义齐 ＋ **层-工具表** 的取值都在工具集里 ② 耐久初值按**表**（判据钉的是**表位置** ⇒ 平衡只改表）
 *   ③ **拾取并入**（同类再拾 ⇒ 一个槽、耐久相加，✗ 两把） ④ ★**实例感知扣费**（手工构造两把不同耐久：
 *   用掉的那把 −1、另一把**不动** —— 这正是 `sgstory#1905`／领队探针的形） ⑤ **采成才扣**（节点已空 ⇒ 不扣）
 *   ⑥ **工具门**（该层没有对应工具 ⇒ 抽中的「采集」**不出按钮**；给上 ⇒ 出）
 *   ⑦ ★**最后一次采集也要扣**（`books#171` 的 P2-10：采空那一击若不扣，耐久就永远掉不下去）。
 */
head('㉕ 工具耐久制（`books#133` 笔 2）');
{
	const T = B.工具;
	const 存包 = State.variables.inventory;
	const 存账 = State.variables.span1Events;
	const 存位 = map.current;
	ok(!!T, '★`setup.BABEL.工具` 未导出（`world/tools.js` 未装载？）');
	if (T) {
		try {
			State.variables.inventory = [];
			State.variables.span1Events = {};
			const 三件 = ['pick', 'axe', 'shovel'];
			ok(三件.every((id) => R.items.has(id)), `★工具三件未注册齐（缺 ${三件.filter((id) => !R.items.has(id)).join('／') || '（无）'}）`);
			const 越集 = Object.entries(T.工具层表 ?? {}).filter(([, k]) => !三件.includes(k));
			ok(越集.length === 0, `★层-工具表的取值不在工具集里：${JSON.stringify(越集)}`);

			/* ② 耐久初值按**表**（✗ 不写死 6 —— 写死会让平衡改动在此静默失效） */
			R.give('pick');
			const 初 = State.variables.inventory.find((s) => s.id === 'pick')?.charges;
			ok(初 === T.TOOL_CHARGES, `★耐久初值与表不符（表 ${T.TOOL_CHARGES}；实得 ${初}）`);

			/* ③ 拾取并入 */
			R.give('pick');
			const 槽些 = State.variables.inventory.filter((s) => s.id === 'pick');
			ok(槽些.length === 1 && 槽些[0].charges === T.TOOL_CHARGES * 2,
				`★再拾同类没有并入（实得 ${JSON.stringify(槽些)}）⇒ 玩法里会出现两把同类工具`);

			/* ④ ★实例感知：两把不同耐久 ⇒ 用掉那把 −1、另一把不动 */
			State.variables.inventory = [
				{ id: 'pick', charges: 2, equipped: false },
				{ id: 'pick', charges: 9, equipped: false },
			];
			const 选中 = T.持工具('L5');
			ok(选中 === State.variables.inventory[1], '★取工具没有按「同类别并存 ⇒ 取耐久最多」这把（规则变了？）');
			T.扣耐久(选中);
			const 两把读数 = State.variables.inventory.map((s) => `pick:${s.charges}`).join('／');   // ★就地取（末尾印会印到⑥之后的包）
			ok(State.variables.inventory[0].charges === 2 && State.variables.inventory[1].charges === 8,
				`★扣错那把（实得 ${JSON.stringify(State.variables.inventory)}）—— 这正是 sgstory#1905 与领队探针的形`);

			/* ⑤ 采成才扣：节点已空时直调结算 ⇒ 不扣耐久（`#1801`「接受后才扣」的口径） */
			State.variables.inventory = [{ id: 'axe', charges: 3, equipped: false }];
			State.variables.span1Events = {};
			const 存节点账 = State.variables.gatherNodes;     // ★整账存-复原（单对象复原会被 `commitNode` 换掉）
			map.moveTo('L7');
			State.variables.gatherNodes = { ...(存节点账 ?? {}), L7: { ...B.nodeAt('L7'), charges: 0 } };
			B.gather();                                  // 直调（绕过 `when`）⇒ 节点空 ⇒ 不该扣耐久
			const 耐久 = State.variables.inventory.find((s) => s.id === 'axe')?.charges;
			ok(耐久 === 3, `★节点采空却扣了耐久（铁斧 3 ⇒ ${耐久}）—— 「采成才扣」被破`);
			State.variables.gatherNodes = 存节点账;

			/* ⑦ ★`books#171`（P2-10）：**最后一次采集也要扣** —— 节点只余 1 次 ⇒ 采空那一击必须扣 1 点。
			 *   旧形把「采前有货」的读数写在 `现制采集()` **之后** ⇒ 采空后读到 0 ⇒ 判「采前无货」
			 *   ⇒ 不扣（操作者试玩实测：最后一次采完耐久停在 1）。刀：把读数移回调用之后 ⇒ 本臂红。 */
			State.variables.inventory = [{ id: 'axe', charges: 3, equipped: false }];
			State.variables.span1Events = {};
			const 存节点账二 = State.variables.gatherNodes;
			map.moveTo('L7');
			State.variables.gatherNodes = { ...(存节点账二 ?? {}), L7: { ...B.nodeAt('L7'), charges: 1 } };
			B.gather();
			const 末次耐久 = State.variables.inventory.find((s) => s.id === 'axe')?.charges;
			const 末次空 = (B.nodeAt('L7')?.charges ?? 0) === 0;
			ok(末次空, `★只余 1 次时采集没有采空（实得 ${B.nodeAt('L7')?.charges}）—— 本臂前置不成立`);
			ok(末次耐久 === 2, `★最后一次采集**没扣耐久**（铁斧 3 ⇒ ${末次耐久}）—— 「采前有货」的读数取晚了（P2-10）`);
			State.variables.gatherNodes = 存节点账二;

			/* ⑥ 工具门：抽中 gather 时，没工具 ⇒ 该动作**不可选**；给上工具 ⇒ 可选 */
			State.variables.span1Events = {};
			State.variables.inventory = [];
			R.rng.setSequence([0, 0, 0.99]);             // L7：抽签 ⇒ ['gather','battle']（index(3)=0 ⇒ chest；rest[gather,battle] index(2)=0 ⇒ gather）
			map.moveTo('L7');
			R.rng.reset();
			const 采动作 = () => (map.locations.get('L7').actions.find((a) => a.事件类 === 'gather'));
			ok(!!采动作(), '★L7 的动作表里没有 `gather` 事件（动作表变了？）');
			ok(采动作().when() === false, '★没有对应工具时 `gather` 仍可选（假选项：点进去才被告知没工具）');
			R.give('axe');
			ok(采动作().when() === true, '★手上有铁斧了，`gather` 仍不可选（工具门接线断了）');
			console.log(`  工具：三件齐 ✓｜初值 ${T.TOOL_CHARGES}（表）✓｜同类并入 ✓｜实例感知扣费 ${两把读数}（应 2／8）｜采空不扣 ✓｜工具门 ✓`);
		} finally {
			State.variables.inventory = 存包;
			State.variables.span1Events = 存账;
			if (map.locations.has(存位)) map.moveTo(存位);
		}
	}
}

/* ── ㉖ 层危害（`books#133` 笔 2）─────────────────────────────
 *
 * 它回答的问题：**进层危害按表结算、每层每局一次、预知只加一句预警吗？**
 *   ① 命中：注入「命中格」⇒ 掉血**恰等于表里的伤害**（判据按表取读数）② **幂等**（同层再来一次 ⇒ `done`，
 *   不再掉血）②b **miss 也封闭**（领队 2026-10-02 23:48 裁「封 miss」）⇒ 未命中后重进 ⇒ `done`、
 *   **不重掷、不耗随机单元** ③ **预知位**：在场时**多一句预警文案**、**结算不变**（两次对照掉血相同）
 *   ④ 非危害层 ⇒ `absent` 且**不耗随机单元**（与抽签同族的那条不变式）。
 *   ⚠ 读数取 host 输出归档（本格 `__host.install()`）—— 预警是 `perform` 出来的**屏上文案**。 */
head('㉖ 层危害（`books#133` 笔 2）');
{
	const H = B.危害;
	const P = D.Player;
	const 存账 = State.variables.span1Events;
	const 存位 = map.current;
	ok(!!H && typeof H.危害结算 === 'function', '★`setup.BABEL.危害` 未导出（`world/hazards.js` 未装载？）');
	if (H && typeof H.危害结算 === 'function') {
		try {
			globalThis.__host?.install?.();                     // 接住 `perform` 的输出（只读观察）
			const 行 = () => (globalThis.__host?.host?.lines?.() ?? []);
			const 层 = Object.keys(H.危害表)[0];
			const cfg = H.危害表[层];
			/* ① 命中 ⇒ 掉血恰为表里的伤害 */
			State.variables.span1Events = {};
			P.hp = P.maxHp;
			R.rng.setSequence([0.5, 0.5, 0]);                   // 抽签两格（⇒ 含 gather）+ 危害命中格
			map.moveTo(层);
			R.rng.reset();
			ok(P.hp === P.maxHp - cfg.伤害,
				`★危害命中后掉血与表不符（表 ${cfg.伤害}；${P.maxHp} ⇒ ${P.hp}）`);
			ok(State.variables.span1Events[层]?.危害 === 'hit', `★命中后账里没有危害标记（应为 'hit'；实得 ${JSON.stringify(State.variables.span1Events[层])}）`);
			/* ② 幂等：再来一次 ⇒ done，且不再掉血 */
			const 前 = P.hp;
			R.rng.setSequence([0.5, 0.5, 0]);                   // 就算掷中，也不该再触发
			const 二 = H.危害结算(层);
			R.rng.reset();
			ok(二 === 'done' && P.hp === 前,
				`★同层第二次进仍结算（返回 ${二}，血 ${前} ⇒ ${P.hp}）—— 「每层每局至多一次」被破`);
			/* ②b ★**miss 也封闭**（领队 2026-10-02 23:48 裁「封 miss」：「每层每局至多一次」按**字面**落）——
			 *   未命中 ⇒ 账里记 `'miss'` ⇒ 再进返回 `done` 且**不重掷、不耗随机单元**。
			 *   ⚠ 注入两值**互异**：同值看不出「有没有白耗」（本格 ④ 的同一条教训）。 */
			State.variables.span1Events = {};
			R.rng.setSequence([0.5, 0.5, 0.9]);                 // 抽签两格 + 危害**未命中**格（index(6)=5 ≠ 0）
			map.moveTo(层);
			R.rng.reset();
			const 一态 = State.variables.span1Events[层]?.危害;
			R.rng.setSequence([0.5, 0.9]);                      // 若重掷：第一个值即 0.5 ⇒ 命中
			const 二进 = H.危害结算(层);
			const 残余 = R.rng.index(3);                        // 若白耗一格：读到 0.9 ⇒ 2（✗ 1）
			R.rng.reset();
			ok(一态 === 'miss' && 二进 === 'done' && 残余 === 1,
				`★miss 未封闭（账里 ${JSON.stringify(一态)}；再进返回 ${二进}）或重进白耗随机单元（index(3)=${残余}，应 1）`);
			/* ③ 预知位：多一句预警、结算不变 */
			State.variables.span1Events = {};
			const 无预知 = (() => { P.lose?.('precognition'); P.hp = P.maxHp; const 起 = 行().length; R.rng.setSequence([0.5, 0.5, 0]); map.moveTo(层); R.rng.reset(); return { 掉血: P.maxHp - P.hp, 新行: 行().slice(起) }; })();
			State.variables.span1Events = {};
			const 有预知 = (() => { P.gain?.('precognition'); P.hp = P.maxHp; const 起 = 行().length; R.rng.setSequence([0.5, 0.5, 0]); map.moveTo(层); R.rng.reset(); return { 掉血: P.maxHp - P.hp, 新行: 行().slice(起) }; })();
			P.lose?.('precognition');
			ok(有预知.新行.some((s) => String(s).includes('你早知道这一层不对劲')),
				`★预知在场时**没有**预警文案（新行：${JSON.stringify(有预知.新行)}）`);
			ok(有预知.掉血 === 无预知.掉血 && 无预知.新行.every((s) => !String(s).includes('你早知道这一层不对劲')),
				`★预知位改了**结算**（掉血 ${无预知.掉血} vs ${有预知.掉血}）或**不在场也出声** —— 本笔的口径是「只加一句预警、结算不变」`);
			/* ④ 非危害层：absent 且不耗随机单元 */
			/* ★注入**两个不同**的值：若 `危害结算` 在非危害层白掷一次，`index(3)` 会读到 0.9 ⇒ 2（✗ 1）
			 *   —— 两个同值会**看不出来**（本席首版即栽在此：注入 [0.5,0.5] ⇒ 白耗也读 1）。 */
			R.rng.setSequence([0.5, 0.9]);
			const v = H.危害结算('L1');
			const 单元 = R.rng.index(3);
			R.rng.reset();
			ok(v === 'absent' && 单元 === 1,
				`★非危害层未早退（返回 ${v}）或白耗随机单元（首个 index(3)=${单元}，应 1）`);
			console.log(`  危害：${层} 命中掉 ${cfg.伤害}（表）✓｜二次 done 不掉血 ✓｜miss 也封闭（不重掷、不耗单元）✓｜预知只加预警（掉血同 ${有预知.掉血}）✓｜非危害层 absent 且不耗随机单元 ✓`);
		} finally {
			State.variables.span1Events = 存账;
			if (map.locations.has(存位)) map.moveTo(存位);
		}
	}
}

/* ── ㉗ L9 头目弧（`books#133` 笔 3）────────────────────────────
 *
 * 它回答的问题：**L9 是不是「固定头目 ＋ 唯一出口（前进）」、两表是不是同键配对？**
 *   ① 头目实体在册、**有已装备的攻击件**（「咬不动人」那一类：`Character` 不认 `attacks:` 字段）
 *     ——数值表读自**实体对实体**（它 ≥ 段内头「巨蜥」）② L9 的遭遇行是**单一 ref ＝ 头目**
 *     （「固定」是机械事实：**抽一次也是它**），且**掉落面逐字继承引擎** ③ **唯一出口**：可用出口恰好
 *     1 条且文案含「前进」；而**边仍在图里**（✗ 结构删边 —— 对照 ④：非头目层 L8 有 2 条可用
 *     ⇒ 守卫是**按层**的，✗ 全局摘除）⑤ **两表同键配对**（层表 id 序列 ＝ 引擎的；遭遇表键集 ⊆ 层表
 *     id 集；带 `boss` 的只有 L9）⑥ 接管面不动的证据：L10 仍是 `hub`、L10-camp 的出口含「退回第 9 层」。
 *   ⚠ 本格会**移动地图**：进出各一次（形照 ⑳ / ㉖）。 */
head('㉗ L9 头目弧（`books#133` 笔 3）');
{
	const 存位 = map.current;
	try {
		/* ★读数一律落**局部变量**，收束行的 ✓ 由读数印（✗ 无条件打 ✓ —— `dev-9` 在笔 2 的 NIT）。 */
		const m = (b) => (b ? '✓' : '✗');
		const 头目 = B.头目?.不眠者;
		const 件 = (头目?.items ?? []).map((i) => (typeof i?.id === 'string' ? i.id : null)).filter(Boolean);
		const 甲 = !!头目 && !!R.characters.get('sleepless-one') && 件.length > 0 && (头目.items ?? []).some((i) => i?.equipped);
		ok(!!头目 && !!R.characters.get('sleepless-one'), '★`sleepless-one` 不在册（`world/boss.js` 未装载？）');
		ok(件.length > 0, '★头目**没有攻击件**（`items` 空）⇒ 它在战斗里咬不动人（`attacks:` 字段不被 `Character` 认）');
		ok((头目?.items ?? []).some((i) => i?.equipped), '★头目的攻击件**没有装备**（`equipped: true`）⇒ 自动通路取不到它');
		/* ★重开复位（形照引擎 `monsters/*.js` 的同名钩子）：**没有它，头目只会被杀一次**
		 *   （`hp` 留在 0、`effects` 还挂着上一局的）。两向分两层：
		 *   ① **接线**：`world/boss.js` 里那行 `:enginerestart` 绑定在，**且绑的是 `复位头目`**
		 *      （剥块注释与行注释后再断 —— 同 ⑲ 的教训）。
		 *   ② **行为**：真调复位函数（本判据跑在 host 桩里，**没有真 DOM 事件** ⇒ 走那个具名函数）。
		 *   ★`books#156`（`#155` 的合后遗留；`dev-9` 提，`app/sagitrs-developer` 出形）：原先只核
		 *     「`:enginerestart` 与 `jQuery(document).on` 两串**共现**」⇒ 把绑定换成**另一个空函数**、
		 *     而 `复位头目` 留着且照旧导出时，本臂与行为臂**都绿**，而那正是「重开事件不会复位头目」。
		 *     ⇒ 现形为**三层齐断**：
		 *       ① **运行时身份**：登记面里的每一个钩子都 `===` 导出面的复位本体。
		 *          （host 桩里的 `jQuery` 是 no-op 代理（引擎 `tests/unit/framework/shims.js:26`）
		 *          ⇒ 绑定动作**留不下痕迹**，故身份只能靠故事侧的登记面去核。）
		 *       ② **注册走的是具名登记函数**（摘掉注册、绕开它直接绑 ⇒ 红）。
		 *       ③ **登记函数绑的是它的参数**（绑别的 ⇒ 红）。
		 *     ★**行注释与块注释都剥**（只剥块注释时，把绑定写成 `// jQuery…on(…)` 仍会假绿，同族）。
		 *     ⚠ 真事件触发那一层本档**测不到**（`SugarCube.Engine.restart` 与真 DOM 事件都不在桩里），
		 *       而且**眼下本仓与引擎两侧都没有这一层**：本仓驾驶层档搜该事件名 0 命中，
		 *       引擎单测明文绕开（`tests/unit/dnd3/characters.test.js` 记「jQuery shim 无法触发 :enginerestart」）。
		 *       ⇒ 该缺口已开票 `books#161`（须补一面真 DOM 触发面）——本档**不得**写成「真触发」或「归某面」。 */
		const bossSrc = fs.readFileSync(new URL('./src/world/boss.js', import.meta.url), 'utf8')
			.replace(/\/\*[\s\S]*?\*\//g, '')             // 块注释
			.replace(/(^|[^:])\/\/[^\n]*/gm, '$1');        // 行注释（避开 http:// 这类）
		const 钩子 = B.头目?.重开钩子 ?? [];
		const 本体 = B.头目?.复位;
		const 身份 = typeof 本体 === 'function' && 钩子.length > 0 && 钩子.every((f) => f === 本体);
		const 注册路 = /注册重开钩子\s*\(\s*复位头目\s*\)/.test(bossSrc) && /on\(\s*':enginerestart'\s*,\s*fn\s*\)/.test(bossSrc);
		const 接线 = 身份 && 注册路;
		ok(身份, `★重开事件绑的不是复位本体（登记面 ${JSON.stringify(钩子.map((f) => typeof f))}，复位本体 ${typeof 本体}）⇒ 头目只会被杀一次`);
		ok(注册路, '★`world/boss.js` 的注册没走具名登记函数，或其登记函数绑的不是参数（接线不可核）');
		const 原hp = 头目?.hp;
		if (头目) { 头目.hp = 0; 头目.effects = ['残留']; }
		const 复位fn = B.头目?.复位;
		ok(typeof 复位fn === 'function', '★复位逻辑没有导出（`setup.BABEL.头目.复位`）⇒ 判据只能静态核');
		复位fn?.();
		const 复位ok = 头目?.hp === 头目?.maxHp && (头目?.effects ?? []).length === 0;
		ok(复位ok, `★重开复位没把头目拨回（hp ${头目?.hp}／${头目?.maxHp}，effects ${JSON.stringify(头目?.effects)}）—— 它只会被杀一次`);
		if (头目) 头目.hp = 原hp;
		/* 数值面：读**实体对实体**（✗ 在此写魔数） */
		const 巨蜥 = R.characters.get('monitor-lizard');
		ok(!!巨蜥 && 头目.maxHp >= 巨蜥.maxHp, `★头目 maxHp=${头目?.maxHp} < 段内头「巨蜥」${巨蜥?.maxHp}（头目不该比段内头更脆）`);
		/* ① L9 遭遇行：单一 ref ＋ 掉落面继承 ＋ 仍是 `climb`（标 `boss` 不得把层挤出梯度） */
		const t1 = R.encounterTables?.span1;
		ok((t1?.L9?.encounters ?? []).length === 1, `★L9 不是「固定」（encounters ${(t1?.L9?.encounters ?? []).length} 条）`);
		ok(JSON.stringify(t1?.L9?.loot) === JSON.stringify(D.ENCOUNTER_SPAN1?.L9?.loot), '★L9 的**掉落面**漂了（应逐字继承引擎）');
		ok(R.layerOf('L9')?.type === 'climb', `★L9 不再是 \`climb\`（${R.layerOf('L9')?.type}）—— 标 \`boss\` 不该动 \`type\`（那是梯度语义）`);
		/* 「固定」的机械证据：抽一次也只能抽出它（注入后立即复位；读数取第 0 笔的 ref） */
		R.rng.setSequence([0.5, 0.5, 0.5, 0.5]);
		const 抽ref = R.rollEncounter('L9')?.[0]?.ref ?? null;
		R.rng.reset();
		ok(抽ref === 'sleepless-one', `★L9 抽出来不是头目（实得 ${JSON.stringify(抽ref)}）⇒ 「固定」不成立`);
		/* ② 唯一出口（★`books#180` 起**两向**：未胜 ⇒ 0 条（硬门）；已胜 ⇒ 1 条（唯一的前进）；**边始终在图里**） */
		const L9出口_未胜 = map.exitsFrom('L9');
		const 乙0 = L9出口_未胜.length === 0;
		ok(乙0, `★未过头目时 L9 仍给出口（实得 ${JSON.stringify(L9出口_未胜.map((e) => e.text))}）—— 硬门失守`);
		const 存进度 = JSON.parse(JSON.stringify(State.variables.babelRun?.bosses ?? null));
		B.记战果?.('L9', 'victory');
		const L9出口_已胜 = map.exitsFrom('L9');
		const L9边 = map.exits.filter((e) => e.from === 'L9');
		const 乙 = L9出口_已胜.length === 1 && /前进/.test(String(L9出口_已胜[0]?.text ?? ''));
		ok(乙, `★已过头目后 L9 的可用出口不是「唯一的前进」（实得 ${JSON.stringify(L9出口_已胜.map((e) => e.text))}）`);
		const 丙 = L9边.some((e) => e.to === 'L10-camp') && map.exitsFrom('L9-camp').some((e) => e.to === 'L8')
			&& map.locations.has('L9-camp') && map.exitsFrom('L9-camp').some((e) => e.to === 'L9');
		ok(丙, `★L9 拆面坏了：战场→L10 ${L9边.some((e) => e.to === 'L10-camp')}／准备区存在 ${map.locations.has('L9-camp')}`
			+ `／准备区→L8 ${map.exitsFrom('L9-camp').some((e) => e.to === 'L8')}／准备区→战场 ${map.exitsFrom('L9-camp').some((e) => e.to === 'L9')}`);
		State.variables.babelRun.bosses = 存进度 ?? {};
		/* ③ 对照：非头目层不设限（守卫**按层**作用，✗ 全局摘除） */
		const L8出口 = map.exitsFrom('L8');
		const 丁 = L8出口.length === 2;
		ok(丁, `★非头目层 L8 的可用出口不是 2 条（${JSON.stringify(L8出口.map((e) => e.text))}）⇒ 守卫并非按层作用`);
		/* ④ 两表同键配对 */
		const 引擎层 = (D.LAYER_META_SPAN1 ?? []).map((l) => l?.id);
		const 本地层 = (B.LAYER_META ?? []).map((l) => l?.id);
		const 遭遇键 = Object.keys(R.encounterTables?.span1 ?? {});
		const 戊 = JSON.stringify(本地层) === JSON.stringify(引擎层)
			&& 遭遇键.every((k) => 本地层.includes(k))
			&& (B.LAYER_META ?? []).filter((l) => l?.boss === true).map((l) => l.id).join() === 'L9';
		ok(JSON.stringify(本地层) === JSON.stringify(引擎层), `★层表 id 序列与引擎不同（${JSON.stringify(本地层)} vs ${JSON.stringify(引擎层)}）—— 两表须同键同序`);
		ok(遭遇键.every((k) => 本地层.includes(k)), `★遭遇表键不在层表里（${遭遇键.filter((k) => !本地层.includes(k))}）—— 两表**同键配对**被破`);
		ok((B.LAYER_META ?? []).filter((l) => l?.boss === true).map((l) => l.id).join() === 'L9',
			`★带 boss 标记的层不是恰好 L9（${JSON.stringify((B.LAYER_META ?? []).filter((l) => l?.boss === true).map((l) => l.id))}）`);
		/* ⑤ 接管面不动 */
		const 己 = (B.LAYER_META ?? []).find((l) => l?.id === 'L10')?.type === 'hub' && map.exitsFrom('L10-camp').some((e) => e.to === 'L9');
		ok((B.LAYER_META ?? []).find((l) => l?.id === 'L10')?.type === 'hub', '★L10 不再是 `hub`（接管面被改了）');
		ok(map.exitsFrom('L10-camp').some((e) => e.to === 'L9'), '★L10-camp 少了「退回第 9 层」那条边（衔接面被改了）');
		console.log(`  头目弧：实体＋攻击件 ${m(甲)}｜L9 固定（抽得 ${抽ref}）${m(抽ref === 'sleepless-one')}`
			+ `｜硬门（未胜 ${L9出口_未胜.length} 条 ⇒ 已胜 ${L9出口_已胜.length} 条「${L9出口_已胜[0]?.text ?? ''}」）${m(乙)}（边仍在 ${L9边.length} 条；非头目层 L8 对照 ${L8出口.length} 条 ${m(丁)}）`
			+ `｜两表同键（层 ${本地层.length}／遭遇 ${遭遇键.length} 键，\`boss\` 只在 L9）${m(戊)}｜L10 接管面不动 ${m(己)}`
			+ `｜重开复位（接线 ${m(接线)}＋行为 ${m(复位ok)}）`);
	} finally {
		if (map.locations.has(存位)) map.moveTo(存位);
	}
}

/* ── ㉘ 预知实效（`books#164`）─────────────────────────────────────
 *
 * 它回答的问题：**「预知 ＝ 选择下一层内容的能力」这条形式能力成立吗？**
 *   操作者定义：「预知效果就是选择下一层内容的能力，只是个形式上的能力。」
 *   领队落形（2026-10-03 02:30）：持有者在 L5／L6／L7 各可指定一次下一层抽签池的**必含一类**
 *   （另一槽照常随机）；**不改数值、不加掉落、不降难度**（纯能动性）。
 * 本格断七件：①L5 授予（幂等）②持有者**钉得住**下一池的一类（且账里记下「为什么」）
 *   ③无预知者照旧**纯随机**（同随机源下手算逐字相符，且不得记 `预知类`）
 *   ④**形式约束**：选定类的奖励与未选定时**逐字相同**（同表同动作，无加成）
 *   ⑤入档（域契约含本键）与**随档往返后仍生效**
 *   ⑥**边界**：L8 无按钮（L9 无抽签＝死选项）／目标层已抽则不出（回边会造死选项）／每层一次／无预知则一个不出
 *   ⑦**动作面**：三类按钮静态入表、由 `when` 筛（持有时恰三个，选定后全部退场）。
 * ⚠ 装置：本格自建干净账（`span1Events`／`span1Foresee`）并**存-复原**（含持有态、背包与体力）。
 * ⚠ 随机源：有预报时抽签只耗**一枚**、无预报耗**两枚**，L5–L8 又是危害层 ⇒ 注入序列按此写。
 */
head('㉘ 预知实效（`books#164`）');
{
	const P = D.Player;
	const 存账 = State.variables.span1Events;
	const 存预报 = State.variables.span1Foresee;
	const 存位 = map.current;
	const 存包 = State.variables.inventory;
	const 存效果 = (P.effects ?? []).slice();
	const 存hp = P.hp;
	const 清 = () => { State.variables.span1Events = {}; State.variables.span1Foresee = {}; };
	/** 渲染路径对动作对象的读法（与㉓格同形）：只取带 `预知类` 标记的。 */
	const 预知钮 = (id) => map.locations.get(id).availableActions
		.filter((a) => a.预知类 != null).map((a) => a.预知类).sort();
	let 授 = false, 次数 = 0, 账6 = null, 账6无 = null, 甲 = null, 乙 = null, 域 = [];
	try {
		/* ① L5 授予（幂等）：退层再回不得重复授予 */
		P.lose('precognition');
		清();
		map.moveTo('L5');
		授 = P.contains('precognition');
		ok(授, '★进 L5 未授予「预知」—— 本能力的活路径断在授予面上（授予层＝L5）');
		map.moveTo('L6'); map.moveTo('L5');
		次数 = (P.effects ?? []).filter((e) => e === 'precognition').length;
		ok(次数 === 1, `★L5 授予的幂等不成立（\`precognition\` 出现 ${次数} 次，应为 1：0 ＝ 未授予；>1 ＝ 重复授予）`);
		/* ★两半各承一面（`books#168`，出处 `dev-10` 的非阻断刀）：
		 *   上面那条数的是 `effects` 条数 —— 而引擎的 `gain` **本身就去重** ⇒ **对守卫零判别力**
		 *   （只拆守卫、保留授予 ⇒ 全档零红，实测）。守卫真正承重的是**文案面**（重进 L5 不重复印低语）
		 *   ⇒ 另出一条**文案计数**断言（刀：只拆守卫 ⇒ 只此条红，而上面那条仍绿）。 */
		globalThis.__host?.install?.();                        // 接住 `perform` 的输出（只读观察）
		const 行 = () => (globalThis.__host?.host?.lines?.() ?? []);
		const 低语 = () => 行().filter((l) => String(l).includes('你开始能听见下一层的低语')).length;
		P.lose('precognition');
		清();
		/* ⚠ 量**增量**（✗ 累计）：当前段落的输出块是本格前面各臂**累加**出来的 ——
		 *   直接数总数会把上游臂的印数算进来（本席首版即如此：实得 3 句而非 1）。 */
		const 起0 = 低语();
		map.moveTo('L5');                                      // 首次：授予 ＋ 一句低语
		const 首次增 = 低语() - 起0;
		map.moveTo('L6');
		const 起1 = 低语();
		map.moveTo('L5');                                      // 退层再回：守卫须挡住重复印
		const 重进增 = 低语() - 起1;
		ok(首次增 === 1, `★首次进 L5 的授予文案不是恰好 1 句（实得 +${首次增} 句）—— 「授予」这一半本身不成立`);
		ok(重进增 === 0,
			`★重进 L5 **重复印**了授予文案（实得 +${重进增} 句）—— 守卫承重的正是这一面（\`effects\` 条数由引擎去重，判不出它）`);

		/* ② 持有者钉得住下一池的一类（必含支只耗一枚；第三枚给 L6 的危害，取 0.99 ⇒ miss） */
		清();
		R.rng.setSequence([0, 0.99, 0.99]);
		B.记预报('L5', 'chest');
		map.moveTo('L6');
		R.rng.reset();
		账6 = State.variables.span1Events['L6'];
		ok(Array.isArray(账6?.抽中) && 账6.抽中.includes('chest'),
			`★预知未生效：L6 的池里没有必含的 \`chest\`（实得 ${JSON.stringify(账6?.抽中)}）`);
		ok(JSON.stringify(账6?.抽中) === JSON.stringify(['chest', 'gather']),
			`★必含支的池与手算不符（手算 ['chest','gather']：预知类占首位、另一槽取 0 ⇒ gather；实得 ${JSON.stringify(账6?.抽中)}）`);
		ok(账6?.预知类 === 'chest', '★账里没记下「为什么」（`预知类`）—— 判据只能断「是什么」');

		/* ③ 无预知者照旧纯随机（同随机源 ⇒ 手算逐字相符；且不得记「预知类」） */
		清();
		P.lose('precognition');
		R.rng.setSequence([0, 0, 0.99]);
		map.moveTo('L6');
		R.rng.reset();
		账6无 = State.variables.span1Events['L6'];
		ok(JSON.stringify(账6无?.抽中) === JSON.stringify(['chest', 'gather']),
			`★无预知者的抽中与手算不符（手算 ['chest','gather']（抽二耗两枚）；实得 ${JSON.stringify(账6无?.抽中)}）`);
		ok(账6无?.预知类 === undefined, '★无预知者却记了 `预知类`（把「随机抽中」冒充成「预知钉的」）');
		P.gain('precognition');

		/* ④ 形式约束：选定类的**授予面**与未选定时逐字相同（同表同动作 ⇒ 无加成） */
		const 跑箱 = (用预报) => {
			清();
			State.variables.inventory = [];
			/* 两路都让 L6 的池含 chest：预报路钉它；随机路用注入让它自己抽到 */
			if (用预报) { R.rng.setSequence([0, 0.99]); B.记预报('L5', 'chest'); }
			else { R.rng.setSequence([0, 0, 0.99]); }
			map.moveTo('L6');
			R.rng.reset();
			const 箱 = map.locations.get('L6').actions.find((x) => x.事件类 === 'chest');
			if (箱) 箱.action();
			return { 包: State.variables.inventory.map((s) => s.id).sort(), 池: State.variables.span1Events['L6']?.抽中 };
		};
		甲 = 跑箱(true);
		乙 = 跑箱(false);
		ok(JSON.stringify(甲.包) === JSON.stringify(乙.包),
			`★形式约束被破：预知路径与随机路径的**授予物不同**（预知 ${JSON.stringify(甲.包)} vs 随机 ${JSON.stringify(乙.包)}）—— 预知不得带数值优势`);
		ok(甲.包.length === 1, `★开箱应恰好授予一件（实得 ${JSON.stringify(甲.包)}）`);

		/* ⑤ 入档（域契约）与随档往返后仍生效 */
		域 = R.save?.envelope?.()?.domains ?? [];
		ok(域.includes('span1Foresee'),
			`★\`span1Foresee\` 不在 \`envelope().domains\`（实得 ${JSON.stringify(域)}）⇒ 审计缺口`);
		清();
		State.variables.span1Foresee = JSON.parse(JSON.stringify({ L6: 'battle' }));   // 模拟随档回来的账
		R.rng.setSequence([0, 0.99]);
		map.moveTo('L6');
		R.rng.reset();
		const 账往 = State.variables.span1Events['L6'];
		ok(账往?.抽中?.[0] === 'battle',
			`★随档往返后的预报不生效（L6 池首位应为 battle；实得 ${JSON.stringify(账往?.抽中)}）`);

		/* ⑥ 边界 */
		清();
		P.gain('precognition');
		ok(预知钮('L8').length === 0,
			`★L8 的动作面上出现了预知按钮（实得 ${JSON.stringify(预知钮('L8'))}）—— L9 无抽签，那是死选项`);
		ok(B.可预知('L8') === false, '★`可预知(L8)` 为真（L9 无抽签 ⇒ 死选项）');
		map.moveTo('L5');
		ok(B.可预知('L5') === true, '★持有者进 L5 且目标层未抽时**不可**预知（按钮面断了）');
		B.记预报('L5', 'chest');
		ok(B.可预知('L5') === false, '★已选过一层还能再选（「每层一次」不成立）');
		/* ★持有者门**须在干净层上判**（`dev-9` 自纠：先前这两条挂在已「记过预报」的 L5 上，
		 *   「已选过」那一道门也能把结果弄成 false ⇒ 本臂对持有者门**零判别力**（撤门也不红）。 */
		ok(B.可预知('L6') === true, '★持有者在干净层（L6）不可预知 —— 后两条的基线不成立');
		P.lose('precognition');
		ok(B.可预知('L6') === false, '★无预知者也能预知（持有者门断了）');
		P.gain('precognition');
		清();
		map.moveTo('L5'); map.moveTo('L6');            // L6 已抽定
		ok(B.可预知('L5') === false, '★目标层已抽定后 L5 仍可预知（回边路径上会造出死选项）');

		/* ⑦ 动作面：持有时恰三个；真点一次 ⇒ 入账且按钮全部退场 */
		清();
		map.moveTo('L5');
		const 钮 = 预知钮('L5');
		ok(JSON.stringify(钮) === JSON.stringify(['battle', 'chest', 'gather']),
			`★持有者进 L5 的预知按钮不是三类（实得 ${JSON.stringify(钮)}）`);
		const 箱钮 = map.locations.get('L5').availableActions.find((x) => x.预知类 === 'chest');
		if (箱钮) 箱钮.action();
		ok(B.预报类('L6') === 'chest',
			`★点「宝箱」后预报账没记下（实得 ${JSON.stringify(State.variables.span1Foresee)}）`);
		ok(预知钮('L5').length === 0,
			`★选定后按钮未退场（实得 ${JSON.stringify(预知钮('L5'))}）—— 「每层一次」在屏上不成立`);

		const 无预知同 = JSON.stringify(账6无?.抽中) === JSON.stringify(['chest', 'gather']);
		const 形式同 = JSON.stringify(甲?.包) === JSON.stringify(乙?.包);
		console.log(`  预知：L5 授予${授 ? ' ✓' : ' ✗'}（效果条数 ${次数}／首次低语 +${首次增}、重进 +${重进增}）｜持有者钉住 L6=${JSON.stringify(账6?.抽中)}（预知类 ${账6?.预知类}）`
			+ `｜无预知手算相符${无预知同 ? ' ✓' : ' ✗'}｜形式约束（${JSON.stringify(甲?.包)} vs ${JSON.stringify(乙?.包)}）${形式同 ? ' ✓' : ' ✗'}`
			+ `｜域含本键${域.includes('span1Foresee') ? ' ✓' : ' ✗'}｜L8 无钮${预知钮('L8').length === 0 ? ' ✓' : ' ✗'}`);
	} finally {
		清();
		State.variables.span1Events = 存账;
		State.variables.span1Foresee = 存预报;
		State.variables.inventory = 存包;
		P.effects = 存效果;
		P.hp = 存hp;
		if (map.locations.has(存位)) map.moveTo(存位);
	}
}

/* ── ㉙ 战败终端＝游戏失败（`books#171` 的统一入口 ＋ `books#176` 的终端语义）────────
 *
 * 它回答的问题：**「致命伤 ⇒ 真的进了终局（而不是被吞掉、或被复活）吗？」**
 *   两段来历：`books#171`（源 `#170` 的 P0）修的是「致命伤没能结算」；`books#176`（操作者裁定②
 *   ·核心反转）把**终端**从「复活回起点层」改成「**游戏失败**（不复活）」—— 旧 `respawn` 循环废止。
 * 本格断四件：①**致命进入 ⇒ 终局**（hp 仍 0／位置**留原层**／终局账置真／战败计数恰 +1／
 *   终局行恰一次且**印死亡层号**／跳「游戏失败」／`death` 标记仍在）
 *   ②**原地点流程停**（致命进入 L5 后 **不得**再跑 L5 的授予块 —— 那是「onEnter 没停手」的铁证）
 *   ③**幂等**（三源重复调用：`settled` 全假、状态零变动） ④**非致命不结算**（倒下才进场）。
 *   另加**静态段**：失败面两钮齐、且复活教学段 `:: 死亡回溯` 已删（裁定②要求废止 L1–9 的该口径）。
 * ⚠ 装置：本格只改 `hp/effects/账/位置`，末了**存-复原**；随机源按「抽签两枚 ＋ 危害一枚」注入。
 */
head('㉙ 战败终端＝游戏失败（`books#171`／`#176`）');
{
	const P = D.Player;
	const 存 = {
		hp: P.hp, maxHp: P.maxHp, items: P.items, effects: (P.effects ?? []).slice(),
		账: State.variables.span1Events, 预报: State.variables.span1Foresee, 位: map.current,
		run: { ...State.variables.babelRun },
	};
	const 行 = () => (globalThis.__host?.host?.lines?.() ?? []);
	const 终局行数 = () => 行().filter((l) => String(l).includes('这一局到此为止')).length;
	let 死后 = {};
	try {
		globalThis.__host?.install?.();          // 接住 `perform` 的输出（只读观察）
		/* ① 致命进入：L5 的危害打 2 点，玩家只剩 1 血 ⇒ 必命中 ⇒ 必进终局 */
		P.effects = [];
		P.hp = 1;
		State.variables.babelRun.deaths = 0;
		State.variables.babelRun.终局 = false;
		State.variables.span1Events = {};
		State.variables.span1Foresee = {};
		const 起 = 终局行数();
		globalThis.__played.length = 0;
		R.rng.setSequence([0, 0, 0]);            // 抽签两枚（⇒['chest','gather']）＋ 危害 `index(6)=0` ⇒ 命中
		map.moveTo('L5');
		R.rng.reset();
		const 本行 = 行().filter((l) => String(l).includes('这一局到此为止')).join('｜');
		死后 = {
			hp: P.hp, 位: map.current, deaths: State.variables.babelRun.deaths,
			终局: State.variables.babelRun.终局, 终局行: 终局行数() - 起, 行文: 本行,
			死标: P.contains(R.death), 预知: P.contains('precognition'),
			跳段: (globalThis.__played ?? []).slice(),
		};
		ok(死后.hp === 0, `★不复活：hp 应仍为 0（实得 ${死后.hp}／${P.maxHp}）—— 复活语义已废止（裁定②）`);
		ok(死后.位 === 'L5', `★位置应**留在死亡层 L5**（实得 ${JSON.stringify(死后.位)}）—— 不得回起点层`);
		ok(死后.终局 === true, '★本局终局账未置真（入口的幂等门）');
		ok(死后.deaths === 1, `★战败计数不是 1（实得 ${死后.deaths}）—— 要么没计，要么重复计`);
		ok(死后.终局行 === 1, `★终局行不是恰一次（实得 ${死后.终局行}）`);
		ok(/第\s*5\s*层/.test(死后.行文), `★终局行没印死亡层号（应含「第 5 层」；实得「${死后.行文}」）`);
		ok(死后.死标 === true, '★不复活 ⇒ `death` 标记应仍在（旧 respawn 才清它）');
		ok(死后.跳段.includes('游戏失败'), `★没跳「游戏失败」段（实测跳了 [${死后.跳段.join(',')}]）`);
		ok(死后.预知 === false,
			'★致命进入 L5 后仍跑了 L5 的授予块（拿到了「预知」）—— **原地点流程没停**，那正是验收里最关键的那条回归');

		/* ★终局位的**闸门**（`books#176`）：死人不得继续行动 —— 死亡层的地图须**无动作、无出口**。
		 *   （引擎的出口分支在 `moveTo` 后无条件重绘，那一屏会被画进失败页 ⇒ 否则尸体还能接着玩。） */
		/* ★四臂各承一面（`dev-10` 的要求：红须落在**指定面**，✗ 冒充）：
		 *   ① 一段层动作 ② 一段边（含 `L10-camp→L9` 那条零守卫的）③ **二段边** ④ **hub**（动作与出边都不经层表）。 */
		const 臂1_动作 = map.locations.get('L5').availableActions.length;
		/* ★四臂**互斥**（`dev-10`：红须落在指定面，✗ 冒充）：一段/二段各取**普通层**（✗ hub 层 ——
		 *   那会与臂4 重叠：hub 的出边同属两臂 ⇒ 一把刀会同时打红两臂，读不出「哪一面没挂闸门」）。 */
		const 臂2_一段边 = map.exitsFrom('L5').length + map.exitsFrom('L9').length;
		const 臂3_二段边 = map.exitsFrom('L19').length + map.exitsFrom('L12').length;
		const 臂4_hub = map.locations.get('L10-camp').availableActions.length + map.exitsFrom('L10-camp').length;
		ok(臂1_动作 === 0, `★[臂1 一段层动作] 终局后仍给动作（实得 ${臂1_动作} 条）—— 尸体还能继续玩`);
		ok(臂2_一段边 === 0, `★[臂2 一段边] 终局后仍给出口（L5＋L9 实得 ${臂2_一段边} 条）—— 尸体还能继续走`);
		ok(臂3_二段边 === 0, `★[臂3 二段边] 终局后二段仍给出口（L19＋L12 实得 ${臂3_二段边} 条）—— 二段可带尸行走`);
		ok(臂4_hub === 0, `★[臂4 hub] 终局后 hub 仍给动作／出边（实得 ${臂4_hub} 条）—— hub 面没挂闸门`);

		/* ② 静态：失败面两钮齐；复活教学段已删（裁定②要求废止 L1–9 的「死亡清背包回 L1」口径） */
		const twee = fs.readFileSync(new URL('./src/story/play.twee', import.meta.url), 'utf8');
		ok(!/^:: 死亡回溯/m.test(twee), '★复活教学段 `:: 死亡回溯` 仍在（裁定②要求废止）');
		ok(/^:: 游戏失败/m.test(twee), '★失败面无 `:: 游戏失败` 段');
		const 面 = (twee.split(/^:: /m).find((b) => b.startsWith('游戏失败')) ?? '');
		ok(/读档/.test(面), `★失败面缺「读档」钮（实得：${面.slice(0, 90)}）`);
		ok(/重开/.test(面), `★失败面缺「重开」钮（实得：${面.slice(0, 90)}）`);
		ok(/Engine\.restart\(\)/.test(面), '★「重开」钮不是真重开（应走 `Engine.restart()`）');
		ok(/setup\.BABEL\.读档\(\)/.test(面), '★「读档」钮没走 `setup.BABEL.读档()`（能力探测入口）');

		/* ③ 幂等：三源（进入／战斗／UI）重复调用 ⇒ 全报未结算、状态零变动 */
		const 前三 = { deaths: State.variables.babelRun.deaths, hp: P.hp, 位: map.current, 行数: 终局行数() };
		const 三次 = [
			setup.BABEL.结算战败({ 源: '进入' }),
			setup.BABEL.结算战败({ 源: '战斗' }),
			setup.BABEL.结算战败({ 源: 'UI' }),
		];
		const 幂等 = 三次.every((r) => r.settled === false)
			&& State.variables.babelRun.deaths === 前三.deaths && P.hp === 前三.hp
			&& map.current === 前三.位 && 终局行数() === 前三.行数;
		ok(三次.every((r) => r.settled === false), `★已终局后仍报 settled（幂等破：${JSON.stringify(三次.map((r) => r.settled))}）`);
		ok(幂等, '★重复调用有副作用（计数／血／位置／输出里有一样变了）');

		/* ④ 非致命：站着的人调用 ⇒ 不结算、不计数（倒下才进场） */
		P.hp = P.maxHp - 1;
		P.effects = [];
		State.variables.babelRun.终局 = false;      // 把终局账撤掉，只留「站着」这一个变量
		const 站 = setup.BABEL.结算战败({ 源: 'UI' });
		ok(站.settled === false && 站.reason === '未倒下',
			`★未倒下时仍结算（settled=${JSON.stringify(站.settled)}、reason=${JSON.stringify(站.reason)}）`);
		ok(State.variables.babelRun.deaths === 前三.deaths, '★未倒下却计了战败数');

		console.log(`  战败终端：致命进入 ⇒ hp ${死后.hp}／位置 ${JSON.stringify(死后.位)}／战败 ${死后.deaths}／终局账 ${死后.终局}`
			+ `｜终局行 ${死后.终局行}（印「第 5 层」${/第\s*5\s*层/.test(死后.行文) ? ' ✓' : ' ✗'}）｜跳段 ${JSON.stringify(死后.跳段)}`
			+ `｜原地点流程停（未拿到预知）${死后.预知 === false ? ' ✓' : ' ✗'}｜幂等${幂等 ? ' ✓' : ' ✗'}｜非致命不结算${站.settled === false ? ' ✓' : ' ✗'}`);
	} finally {
		P.hp = 存.hp;
		P.maxHp = 存.maxHp;
		P.items = 存.items;
		P.effects = 存.effects;
		State.variables.span1Events = 存.账;
		State.variables.span1Foresee = 存.预报;
		State.variables.babelRun = 存.run;
		if (map.locations.has(存.位)) map.moveTo(存.位);
	}
}

/* ── ㉛ L8 温泉（`books#177`；改向见下）────────────────────────────────────
 * 它回答的问题：**「L9 硬门前的满状态前提」在装置上成立吗？**
 *   口径（现形）：**可重复 ＋ 每次耗游戏时间**（占位常量，玩家在选项文案上看得见）＋
 *     **恢复表内**的负面状态（长期正面保留）。
 *   出处：操作者裁定 03:52（`#170`）第③条；**改向** 04:33（`#172` 的 §14 批复 ⑧⑨）：
 *     可重复＋耗游戏时间（时间成本＝占位常量）｜范围＝HP＋非致命伤＋**恢复表内**的负面状态
 *     （长期正面／资源消耗**保留**）⇒ 撤「每局一次」与「耐久回初值」两处旧形。
 * 本格断五件：①**共存**（与抽签零耦合：择一之后事件面清空、温泉仍在 —— 两向对照）
 *   ②**回复范围**（hp 满／非致命归零／表内负面清／**表外正面留**）
 *   ③**可重复**（连泡两次：都用得上、都生效）④**时间占位读数**（每次 +`温泉耗时.分钟`）
 *   ⑤**耐久不回初值**（工具损耗属资源消耗 ⇒ 保留）
 *   ⑥**成本在选项文案上**（读 `text()`，✗ 只信文档 —— `tester-3` 在 `#179` 上指出的判据缺口）。
 * 刀：① 池内化（`when` 加 `eventPending`）⇒ 共存臂红；② 清全部 `effects` ⇒ 表外正面那条红；
 *   ③ 去非致命复位 ⇒ 范围臂红；④ 去时间记账 ⇒ 占位读数红；⑤ 回旧形（耐久回初值）⇒ ⑤红；
 *   ⑥ 文案里删掉分钟数 ⇒ ⑥红；⑦ 把战后段的落点**调用**改成空操作 ⇒ ⑦红（消费点 —— `tester-3` 的 RC）；
 *   ⚠ 刀③须用**保图合法**的拆法（下行边循环里跳过 `L9-camp`）—— 直接删那条边会先把准备区拆成**不可达**，
 *     红落在**地图校验器**上（装置级红，说不清 ③ 判得了）。
 * ⚠ 装置：本格改 hp／nonlethal／effects／背包／账／位置 ⇒ 末了**存-复原**；抽签靠注入随机源。 */
head('㉛ L8 温泉（`books#177`）');
{
	const P = D.Player;
	const T = B.工具;
	const 存 = {
		hp: P.hp, 非致命: P.nonlethal ?? 0, effects: (P.effects ?? []).slice(), 包: State.variables.inventory,
		账: State.variables.span1Events, 位: map.current, run: { ...State.variables.babelRun },
	};
	let 读数 = {};
	try {
		State.variables.span1Events = {};
		State.variables.inventory = [];
		State.variables.babelRun = { ...State.variables.babelRun, 时间: 0 };
		R.give('pick');                       // 工具一件（⑤耐久臂的读数用）
		R.rng.setSequence([0, 0, 0.99]);      // L8 抽签两枚 + 危害一枚 miss
		map.moveTo('L8');
		R.rng.reset();
		const 温泉钮 = () => map.locations.get('L8').availableActions.filter((a) => a.温泉 === true);
		const 事件钮 = () => map.locations.get('L8').availableActions.filter((a) => a.事件类 != null);
		const 耗时 = B.温泉耗时?.分钟;

		/* ① 共存（两向）：择一之后**事件面清空**，而**温泉仍在** —— 这是「零耦合」的可判形 */
		const 前_事件 = 事件钮().length, 前_温泉 = 温泉钮().length;
		for (const k of (State.variables.span1Events['L8']?.抽中 ?? [])) B.markUsed('L8', k);
		const 后_事件 = 事件钮().length, 后_温泉 = 温泉钮().length;
		ok(前_温泉 === 1 && 后_温泉 === 1, `★温泉与抽签耦合了（择一前 ${前_温泉} 条／择一后 ${后_温泉} 条，应恒为 1）`);
		ok(前_事件 === 2 && 后_事件 === 0, `★对照臂不成立（事件面应 2→0，实得 ${前_事件}→${后_事件}）`);

		/* ② 回复范围（行为面：真点那个动作）：hp 满／非致命归零／表内清／表外留 */
		/* ⚠ 前置状态必须**活着**：`nonlethal > hp` 即出局（`isKnockedOut`）⇒ 终局位闸门（`#175`）
		 *   会把本层动作**全关掉**（本席首版把 hp 设 1／非致命设 5，当场撞到「L8 上没有温泉动作」——
		 *   那不是入表断了，是闸门按设计关了图）。⇒ hp 取**高于非致命**且低于满血。 */
		P.hp = 10;
		P.nonlethal = 5;
		P.effects = ['bleeding', 'precognition'];      // 前者在恢复表（创伤）内，后者是长期正面
		const 槽 = State.variables.inventory.find((s) => s.id === 'pick');
		槽.charges = 1;
		const 按 = 温泉钮()[0];
		ok(!!按, '★L8 上没有温泉动作（`makeLayerLocation` 的入表断了）');
		if (按) 按.action();
		读数 = {
			hp: P.hp, maxHp: P.maxHp, 非致命: Number(P.nonlethal ?? 0), 效果: (P.effects ?? []).slice(),
			耐久: State.variables.inventory.find((s) => s.id === 'pick')?.charges, 初值: T?.TOOL_CHARGES,
			时间: B.时间账?.(), 余钮: 温泉钮().length,
		};
		ok(读数.hp === P.maxHp, `★温泉后 hp 未满（实得 ${读数.hp}／${P.maxHp}）`);
		ok(读数.非致命 === 0, `★温泉后非致命伤没归零（实得 ${读数.非致命}）—— ⑧的范围漏了这一项`);
		ok(!读数.效果.includes('bleeding'), `★恢复表内的负面状态没清（实得 ${JSON.stringify(读数.效果)}）`);
		ok(读数.效果.includes('precognition'), `★恢复表外的**长期正面**被一起清了（实得 ${JSON.stringify(读数.效果)}）—— ⑧要求「长期正面保留」`);
		ok(读数.耐久 === 1, `★工具耐久被回充了（实得 ${读数.耐久}／充前 1）—— ⑨撤了「耐久回初值」（资源消耗保留）`);
		/* ★`books#180`（`tester-3` 在 `#179` 上指出的判据缺口，随本笔补齐，✗ 另开一笔）：
		 *   ⑨ 的「耗游戏时间」若只写在文案里而**判据不读文案**，把那个数删掉照样绿 ——
		 *   ⇒ 断**选项文案**里确实出现常量值（数取自 `温泉耗时.分钟`，✗ 字面量）。 */
		const 文案 = typeof 按?.text === 'function' ? 按.text() : String(按?.text ?? '');
		读数.文案 = 文案;
		ok(文案.includes(String(耗时)), `★选项文案里读不到时间成本（实得「${文案}」，常量 ${耗时}）—— ⑨ 的「耗游戏时间」玩家看不见`);

		/* ③ 可重复 ＋ ④ 时间占位读数：连泡第二次（先再造伤） */
		P.hp = 2;
		const 二次钮 = 温泉钮().length;
		if (温泉钮()[0]) 温泉钮()[0].action();
		const 二次 = { hp: P.hp, 时间: B.时间账?.(), 钮: 温泉钮().length };
		ok(二次钮 === 1 && 二次.hp === P.maxHp, `★温泉不可重复（二次前 ${二次钮} 条／二次后 hp ${二次.hp}）—— ⑨要求「可重复」`);
		ok(读数.时间 === 耗时 && 二次.时间 === 耗时 * 2,
			`★时间成本占位读数不对（一次 ${读数.时间}／两次 ${二次.时间}，表 ${耗时}）—— ⑨要求「耗游戏时间」`);

		/* ⑤ 满状态进 L9 的前提（平衡基线「温泉后满状态 vs 不眠者」的机械前提） */
		P.hp = 10; P.nonlethal = 3; P.effects = ['bleeding'];
		const L9前 = { hp: P.hp, 效果: (P.effects ?? []).length };
		ok(L9前.效果 > 0, '★本臂前置不成立（进 L9 前应带着效果）');
		if (温泉钮()[0]) 温泉钮()[0].action();     // 温泉是 L8 的可选动作 ⇒ 用它把状态拉满
		map.moveTo('L9');
		const 在L9 = { hp: P.hp, 效果: (P.effects ?? []).length, 非致命: Number(P.nonlethal ?? 0), 层: setup.BABEL.layerOf?.() ?? null };
		ok(在L9.层 === 'L9' && 在L9.hp === P.maxHp && 在L9.效果 === 0 && 在L9.非致命 === 0,
			`★满状态进 L9 的前提不成立（层 ${JSON.stringify(在L9.层)}／hp ${在L9.hp}／效果 ${在L9.效果}／非致命 ${在L9.非致命}）`);

		console.log(`  温泉：文案「${读数.文案}」｜共存（择一后事件 ${后_事件} 条／温泉 ${后_温泉} 条）｜范围 ⇒ hp ${读数.hp}／非致命 ${读数.非致命}／效果 ${JSON.stringify(读数.效果)}／耐久 ${读数.耐久}（充前 1）`
			+ `｜可重复（二次 hp ${二次.hp}）｜时间占位（一次 ${读数.时间}／两次 ${二次.时间}，表 ${耗时}）｜满状态进 L9：${在L9.层} hp ${在L9.hp}`);
	} finally {
		P.hp = 存.hp;
		P.nonlethal = 存.非致命;
		P.effects = 存.effects;
		State.variables.inventory = 存.包;
		State.variables.span1Events = 存.账;
		State.variables.babelRun = 存.run;
		if (map.locations.has(存.位)) map.moveTo(存.位);
	}
}

/* ── ㉜ 头目硬门·准备区（`books#180`）────────────────────────────────────
 *
 * 它回答的问题：**L9 头目真的硬卡进度吗？撤退落点与重挑战口径成立吗？**
 *   出处：操作者裁定（L9 头目硬卡进度·温泉满装 SL 可过）＋ `#172` 的 §14 批复 ⑤⑥⑦。
 * 本格断六件：①**仅 victory 开门**（四臂：victory／down／stunned／stalemate）
 *   ②**撤退落准备区**（非胜收场的落点 ＝ 准备区）③**准备区可达温泉**（准备区 → L8 的边**可用**，
 *   且 L8 的温泉动作在位 —— 后半依赖 `#179`，未合则记明账）④**未过时 L10 门锁着／过关后开**
 *   ⑤**重挑战满血复位**（§14 ⑤）⑥**同归于尽 ≠ 胜利**（`down` 优先于「敌全倒」）。
 * 刀：① 拆 victory 条件（把 stunned 也算胜）⇒ ①红；② 拆守卫的进度条件 ⇒ ④红；
 *   ③ 拆落点 ⇒ ②红；④ 拆进战场复位 ⇒ ⑤红。
 * ⚠ 装置：本格改 `$babelRun.bosses`／位置／头目 hp ⇒ 末了**存-复原**。 */
head('㉜ 头目硬门·准备区（`books#180`）');
{
	const 头目 = B.头目?.不眠者;
	const 存 = {
		位: map.current, run: { ...State.variables.babelRun }, 账: State.variables.babelRun?.bosses,
		头目hp: 头目?.hp, 头目效果: (头目?.effects ?? []).slice(),
	};
	let 读数 = {};
	try {
		const 全倒 = { isDown: true, name: '靶' };
		const 全晕 = { isDown: true, nonlethal: 9, hp: 1, name: '靶' };
		const 尚活 = { isDown: false, name: '靶' };
		const 玩家 = (倒) => ({ isDown: 倒, hp: 1, maxHp: 20 });
		const 果 = (对手, 玩家倒) => B.战果?.({ foes: [对手], player: 玩家(玩家倒) });

		/* ① 仅 victory 开门（四臂）＋ ⑥ 同归于尽 ≠ 胜利（`down` 优先） */
		const 四臂 = { victory: 果(全倒, false), stalemate: 果(尚活, false), stunned: 果(全晕, false), 同归于尽: 果(全倒, true) };
		ok(四臂.victory === 'victory', `★真击杀判成了「${四臂.victory}」`);
		ok(四臂.stalemate === 'stalemate', `★僵持判成了「${四臂.stalemate}」`);
		ok(四臂.stunned === 'stunned', `★打晕判成了「${四臂.stunned}」—— §14 ⑥「击晕不开门」`);
		ok(四臂.同归于尽 === 'down', `★同归于尽判成了「${四臂.同归于尽}」—— 玩家出局优先于「敌全倒」（旧形两判不互斥之处）`);

		/* ④ 门：未过 ⇒ 0 条；记 victory ⇒ 1 条 */
		State.variables.babelRun.bosses = {};
		const 门_未过 = map.exitsFrom('L9').filter((e) => e.to === 'L10-camp').length;
		B.记战果?.('L9', 'victory');
		const 门_已过 = map.exitsFrom('L9').filter((e) => e.to === 'L10-camp').length;
		ok(门_未过 === 0 && 门_已过 === 1, `★硬门读数不对（未过 ${门_未过} 条 ⇒ 已过 ${门_已过} 条，应 0 ⇒ 1）`);

		/* ② 撤退落准备区（落点函数直调：`fight()` 的战后段消费同一处） */
		map.moveTo('L9');
		const 落了 = B.落准备区?.('L9') === true;
		const 落点 = map.current;
		ok(落了 && 落点 === 'L9-camp', `★非胜收场的落点不是准备区（落了 ${落了}／位置 ${落点}）`);
		ok(B.落准备区?.('L5') === false, '★落点函数对**非战场**层也生效（应只对头目战场）');
		/* ★`books#180`（`tester-3` 在 #181 上指出的缺口）：上面两条断的是**函数本身**，
		 *   而 `fight()` 的**消费点**没人看着 —— 战后段哪天不再调用它，判据会全绿，而玩家
		 *   「未胜却不回营地」（那支还带一句出声）。⇒ 本臂**真跑一次非胜收场**，断位置落到准备区。
		 *   形：换一个打不死的靶（必僵持）＋ 把玩家血量抬高（防非致命出局把落点挡掉）。 */
		{
			const 原表2 = R.encounterTables.span1;
			R.defCharacter({
				id: 'verify-gate-dummy', name: '（装置）铁壁靶',
				hp: 999, maxHp: 999,
				stats: setup.DND3.stats({ ac: 99, str: 4, dex: 4, bab: 0 }),
				items: [],
			});
			R.registerEncounterTable('span1', Object.assign({}, 原表2, {
				L9: { encounters: [{ ref: 'verify-gate-dummy', weight: 1 }], loot: [] },
			}));
			const 存血 = { hp: D.Player.hp, maxHp: D.Player.maxHp, 非致命: D.Player.nonlethal ?? 0 };
			D.Player.maxHp = 200; D.Player.hp = 200; D.Player.nonlethal = 0;
			State.variables.babelRun.bosses = {};
			map.moveTo('L9');
			await B.fight({ interactive: false });
			const 消费位 = map.current;
			ok(消费位 === 'L9-camp', `★未胜收场**没有**回到准备区（位置 ${消费位}）—— 战后段没消费落点（函数在、消费点断了）`);
			ok(State.variables.babelRun.bosses?.L9 !== 'victory', '★未胜收场却记了 victory（硬门会被自己派发的票打开）');
			读数.消费位 = 消费位;
			R.registerEncounterTable('span1', 原表2);
			D.Player.maxHp = 存血.maxHp; D.Player.hp = 存血.hp; D.Player.nonlethal = 存血.非致命;
		}

		/* ③ 准备区可达温泉 */
		const 备出 = map.exitsFrom('L9-camp').map((e) => e.to);
		ok(备出.includes('L8'), `★准备区没有回 L8 的**可用**边（实得 ${JSON.stringify(备出)}）—— 「回温泉补给」不成立`);
		map.moveTo('L8');
		const 温泉在 = map.locations.get('L8').availableActions.some((a) => a.温泉 === true);
		ok(温泉在, '★准备区可达 L8，但 L8 上没有温泉动作（`#179` 的入表断了？）');

		/* ⑤ 重挑战满血复位（§14 ⑤）：把头目打残 ⇒ 出准备区再进战场 ⇒ 复位 */
		if (头目) {
			头目.hp = 3;
			State.variables.babelRun.bosses = {};
			map.moveTo('L8'); map.moveTo('L9-camp'); map.moveTo('L9');
			读数.复位后hp = 头目.hp;
			ok(头目.hp === 头目.maxHp, `★重挑战没有满血复位（实得 ${头目.hp}／${头目.maxHp}）—— §14 ⑤`);
			/* 反过来：**已过**时不复位（读的是进度账，✗ 无条件复位） */
			头目.hp = 3;
			B.记战果?.('L9', 'victory');
			map.moveTo('L9-camp'); map.moveTo('L9');
			ok(头目.hp === 3, `★已过头目仍被复位（实得 ${头目.hp}）—— 复位条件没读进度账`);
		}
		读数.门 = [门_未过, 门_已过];
		console.log(`  头目门：四臂 ${JSON.stringify(四臂)}｜门（未过 ${门_未过} ⇒ 已过 ${门_已过}）`
			+ `｜落点 ${落点}（备出 ${JSON.stringify(备出)}）`
			+ `｜重挑战复位 ${读数.复位后hp === 头目?.maxHp ? '✓' : '✗'}｜已过不复位 ✓`);
	} finally {
		if (头目) { 头目.hp = 存.头目hp; 头目.effects = 存.头目效果; }
		State.variables.babelRun = { ...存.run };
		if (存.账 === undefined) delete State.variables.babelRun.bosses; else State.variables.babelRun.bosses = 存.账;
		if (map.locations.has(存.位)) map.moveTo(存.位);
	}
}


/* ---------- ㉛ `books#178` 件 1：快速存档（三槽制 · P0 禁战内 · 能力缺席出声）----------
 * 本格跑在**无头**装具里：`SugarCube.Save` 缺席（实测）⇒ 走的是**回落支**（出声＋可读文案）。
 *   ★真宿主面（`Save.slots` 的存/读/元数据）由 **e2e 真产物**那一臂守，✗ 本格冒充。 */
head('㉛ `books#178` 件 1 快速存档（三槽 · P0 禁战内 · 回落出声）');
{
	const B = setup.BABEL;
	ok(B.槽位?.快存 === 3 && B.槽位?.战前保底 === 4 && B.槽位?.手动 === 5,
		`★三槽约定不符（应 快存3／战前保底4／手动5，实得 ${JSON.stringify(B.槽位)}）`);
	/* 命名：带**真实层数**（票面 §8.2）。 */
	map.moveTo('L9');
	const 名 = B.存档名();
	ok(名.includes('L9'), `★存档名没带真实层数（实得：${名}）`);
	const 战前名 = B.存档名({ 战前: true });
	ok(战前名.includes('L9') && 战前名.endsWith('·战前'), `★战前保底名不符（实得：${战前名}）`);
	console.log(`  命名：普通=${名}｜战前=${战前名}`);
	/* P0：战斗中禁存（两向：可存 为假 ＋ 快存 给可读文案）。 */
	B.战中 = true;
	ok(B.可存(B.槽位.快存) === false, '★战斗中「可存」仍为真（P0 禁战内存档失效）');
	{
		const 言 = []; const op = R.perform;
		R.perform = (m) => { 言.push(String(m)); return op; };
		const r = B.快存(B.槽位.快存);
		R.perform = op;
		ok(r === false, '★战斗中「快存」没被拒');
		ok(言.some((m) => /战斗中不能存档/.test(m)), '★战斗中快存被拒但没给玩家可读文案');
	}
	B.战中 = false;
	/* 能力缺席（本装具即此形）⇒ 出声 ＋ 可读文案 ＋ **✗ 崩**。 */
	ok(B.宿主槽() === null || typeof B.宿主槽() === 'object', '宿主槽位面形态异常');
	{
		const 警 = [], 言 = []; const ow = console.warn, op = R.perform;
		console.warn = (m) => 警.push(String(m));
		R.perform = (m) => { 言.push(String(m)); return op; };
		let 抛 = null, r2;
		try { r2 = B.快存(B.槽位.快存); } catch (e) { 抛 = e.message; }
		console.warn = ow; R.perform = op;
		ok(抛 === null, `★宿主槽位缺席时「快存」**抛了**（${抛}）—— 应出声回落`);
		ok(r2 === false, '★宿主缺席时「快存」没返回 false');
		ok(警.some((m) => /存档不可达/.test(m)), '★宿主缺席时没向开发者通道出声');
		ok(言.some((m) => /存档入口暂时不可用/.test(m)), '★宿主缺席时没给玩家可读文案');
		console.log(`  回落支：出声 ${警.length} 条｜玩家文案 ${言.length} 条（✗ 崩）`);
	}
/* ---------- ㊱ `books#178` 件 2：传送道具（**传送臂 ＋ 步行臂并存** ＋ 价目表钉位置）----------
 * 票面点名的判据形：「传送后位置 ＋ 步行可达并存两臂 ＋ 刀」。
 * ★两臂**都在同一格**内测：只测传送＝「步行那半被悄悄改掉也不报警」。 */
head('㊱ `books#178` 件 2 传送道具（传送 · 步行并存 · 价目表单源）');
{
	const B = setup.BABEL, m = B.map;
	const 卷 = B.回城卷轴, 聚 = B.聚落;
	ok(typeof 卷 === 'string' && typeof 聚 === 'string', '★件 2 的 id 常量没导出');
	/* ① **传送臂**：站在别处，用一张 ⇒ 落在聚落。 */
	{
		m.moveTo('L1');
		ok(m.current !== 聚, '★前置没生效：起点已在聚落，传送臂测不出来');
		R.give(卷);
		const 前 = B.手上有(卷);
		/* ★断**可观测量**（位置、消耗），✗ 断返回值：本席跑里 `useItem` 返回 undefined，
		 *   而位置与充能两条**都真的动了** ⇒ 返回值不是这条路的判据（票面要的也是这两样）。 */
		R.useItem(卷, setup.DND3.Player, setup.DND3.Player);
		ok(m.current === 聚, `★用了卷轴位置没变聚落（实得 ${JSON.stringify(m.current)}）`);
		ok(B.手上有(卷) < 前, '★用了卷轴但没消耗（引擎扣充能的那条路没走到）');
	}
	/* ② **步行臂**：既有的边**仍在**（传送 ✗ 取代步行 —— 票面要两臂并存）。 */
	{
		/* ★两向读：**边存在**（`m.exits`，✗ 过守卫）＋ **活人时守卫放行**（`exitsFrom` 按 `when` 过滤）。
		 *   只读后者会被守卫状态骗（死人时它本来就空），只读前者又测不出守门是否误挡。 */
		const 边在 = (a, b) => (m.exits ?? []).some((e) => e.from === a && e.to === b);
		const 可走 = (id) => (m.exitsFrom(id) ?? []).map((p) => (typeof p === 'string' ? p : p?.to));
		ok(边在('L9', 聚), '★L9 到聚落的步行**边**没了（传送把步行取代掉了 —— 票面要两臂并存）');
		ok(边在(聚, 'L9'), '★聚落回 L9 的步行**边**没了');
		ok(可走(聚).includes('L9'), `★活人时聚落回 L9 走不了（实得 ${JSON.stringify(可走(聚))}）`);
		/* ★出向那条**是被设计挡住的**：`#180` 头目硬门（唯一出口 ∧ 本局已过该场）。
		 *   故这里**真走一遍**：记下战果 ⇒ 边应转为可走 ⇒ 步行臂才算成立（✗ 只断边在）。
		 *   ⚠ 必须**快照并复原**进度账：本格留下的战果会让下游格看到「已过 L9」。 */
		const 账 = State.variables.babelRun;
		const 前账 = 账?.bosses;
		const 前有 = 账 != null && Object.prototype.hasOwnProperty.call(账, 'bosses');
		ok(typeof B.记战果 === 'function', '★`记战果` 出口面缺席 ⇒ 步行臂无法真走');
		B.记战果?.('L9', 'victory');
		ok(可走('L9').includes(聚), `★打过头目之后 L9 到聚落仍走不了 ⇒ 步行臂不成立（传送成了唯一的路）（实得 ${JSON.stringify(可走('L9'))}）`);
		if (前有) 账.bosses = 前账; else if (账) delete 账.bosses;   // ★复原
	}
	/* ③ **已在聚落 ⇒ 软拒且零副作用**（充能不写回 —— 引擎的拒支语义）。 */
	{
		m.moveTo(聚); R.give(卷);
		const 前 = B.手上有(卷);
		R.useItem(卷, setup.DND3.Player, setup.DND3.Player);
		ok(B.手上有(卷) === 前, '★站在聚落里用卷轴仍扣了充能（软拒应当零副作用）');
		ok(m.current === 聚, '★站在聚落里用卷轴把位置动了（软拒应当零副作用）');
	}
	/* ④ **价目表＝单一源**：扣的钱必须**跟着表走**（改表 ⇒ 扣的钱跟着变；否则就是两处各写一个数）。 */
	{
		const 价 = B.商铺价[卷];
		ok(Number.isFinite(价), `★价目表里没有 ${卷} 的价（实得 ${JSON.stringify(B.商铺价)}）`);
		R.give('coin', 40);                       // ★`give(id, n)` —— 第二参是件数（本席原按「give 一次一件」写，钱不够）
		const 钱前 = B.手上有('coin'), 卷前 = B.手上有(卷);
		const okBuy = B.买(卷);
		ok(okBuy === true, '★钱够时买不动');
		ok(钱前 - B.手上有('coin') === 价, `★扣的钱与价目表不符（表 ${价}，实扣 ${钱前 - B.手上有('coin')}）`);
		ok(B.手上有(卷) === 卷前 + 1, '★买了却没到手');
	}
	/* ⑤ **钱不够 ⇒ 零副作用**（✗ 半买）。 */
	{
		R.take('coin', 9999);                       // 清空到零（take 不抛）
		const 钱前 = B.手上有('coin'), 卷前 = B.手上有(卷);
		const okBuy = B.买(卷);
		ok(okBuy === false, '★钱不够却买成了');
		ok(B.手上有('coin') === 钱前 && B.手上有(卷) === 卷前, '★钱不够却动了账（半买）');
	}
	/* ⑥ **到达状态对照**（★本笔最该防的形：一方只到了同一个地点 id，却绕过了 `onEnter`）。
	 *   两路**各真走一次**，比**到达状态**（层号／`onEnter` 真被调用过／当下可达动作集），
	 *   ✗ 只比 `map.current` —— 那样「传送直接赋 id 而不走进入流程」的写法照样全绿。
	 *   ⚠ 探针包在 `onEnter` 外层并**保留旧钩**；格末复原（含进度账与钩子）。 */
	{
		const 地点 = m.locations.get(聚);
		ok(!!地点, '★取不到聚落地点，到达状态对照无法进行');
		const 旧入 = 地点?.onEnter;
		let 到过 = 0;
		const 动作集 = () => (地点?.actions ?? [])
			.filter((x) => !x.when || x.when())
			.map((x) => (typeof x.text === 'function' ? x.text() : x.text))
			.sort();
		const 到达态 = () => ({ 层: B.layerOf?.() ?? null, 到过, 动作: 动作集() });
		if (地点) 地点.onEnter = (loc) => { 到过 += 1; return 旧入?.(loc); };
		const 账 = State.variables.babelRun;
		const 前账 = 账?.bosses, 前有 = 账 != null && Object.prototype.hasOwnProperty.call(账, 'bosses');
		try {
			/* 路 A：**传送**。 */
			到过 = 0; m.moveTo('L1'); R.give(卷, 1);
			R.useItem(卷, setup.DND3.Player, setup.DND3.Player);
			const 甲 = 到达态();
			/* 路 B：**步行**（先开 `#180` 的头目硬门，再从 L9 走那条边）。 */
			到过 = 0; m.moveTo('L1'); B.记战果?.('L9', 'victory'); m.moveTo('L9');
			ok((m.exitsFrom('L9') ?? []).some((e) => (e.to ?? e) === 聚), '★开闸后 L9 的步行出边仍不在');
			m.moveTo(聚);
			const 乙 = 到达态();
			ok(甲.层 === 乙.层, `★两路到达的**层号**不同（传送 ${JSON.stringify(甲.层)} vs 步行 ${JSON.stringify(乙.层)}）`);
			/* ★`onEnter` 真的被走过（这才是「防绕过进入流程」的正面断言）。 */
			ok(甲.到过 >= 1, `★传送**没有**经过聚落的进入流程（onEnter 调用 ${甲.到过} 次）`);
			ok(乙.到过 >= 1, `★步行**没有**经过聚落的进入流程（onEnter 调用 ${乙.到过} 次）`);
			ok(甲.到过 === 乙.到过, `★两路的进入流程次数不同（传送 ${甲.到过} vs 步行 ${乙.到过}）`);
			ok(甲.动作.join('|') === 乙.动作.join('|'),
				`★两路到达后的**可达动作集**不同（传送 ${JSON.stringify(甲.动作)} vs 步行 ${JSON.stringify(乙.动作)}）`);
			console.log(`  到达态对照：传送 层=${JSON.stringify(甲.层)} 动作数=${甲.动作.length}｜步行 层=${JSON.stringify(乙.层)} 动作数=${乙.动作.length}`);
		} finally {
			if (地点) 地点.onEnter = 旧入;
			if (前有) 账.bosses = 前账; else if (账) delete 账.bosses;
		}
	}
	console.log(`  传送/步行/软拒/买卖四向 ✓｜价目表读数 ${JSON.stringify(B.商铺价)}`);
}

/* ---------- ㉜ `books#178` 件 1：**槽 1 整备点自动写**（两触发点 · 行为判据）----------
 * 票面 §8.2（领队裁）：槽 1 ＝**整备点自动写**，最新胜，失败面 ✗ 覆盖，可手清。
 * 两触发点＝**温泉使用完成**与**进入 L9 门前营地**。本格**真跑触发路径**（✗ 断文案、✗ 断源码文本），
 *   手法：把 `setup.BABEL.战前保底` 换成探针 ⇒ 调真触发点 ⇒ 断探针被调用**且带对来源**。 */
head('㉜ `books#178` 槽 1 整备点自动写（温泉完成 · 入营地 · 失败面✗覆盖）');
{
	const B = setup.BABEL;
	const 真 = B.战前保底;
	const 记 = [];
	B.战前保底 = (来源) => { 记.push(String(来源)); return true; };
	/* 触发点一：温泉（L8 的固定动作 · 结构标记 `温泉: true`）。 */
	{
		const 温泉 = (map.locations.get('L8')?.actions ?? []).find((a) => a?.温泉 === true);
		ok(温泉 != null, '★L8 找不到温泉动作（结构标记 `温泉: true`）');
		温泉?.action?.();
		ok(记.includes('温泉'), `★「温泉完成」没有触发槽 1 自动写（记到：${JSON.stringify(记)}）`);
	}
	/* 触发点二：进入 L9 门前营地（`onEnter` 钩）。 */
	{
		const 营地 = map.locations.get('L9-camp');
		ok(营地 != null, '★找不到 `L9-camp`（门前营地）');
		ok(typeof 营地?.onEnter === 'function', '★门前营地没有 `onEnter` 钩 ⇒ 进营地不会自动写槽 1');
		营地?.onEnter?.(营地);
		ok(记.includes('门前营地'), `★「进营地」没有触发槽 1 自动写（记到：${JSON.stringify(记)}）`);
	}
	B.战前保底 = 真;
	/* 失败面 ✗ 覆盖：整备点写入走 `写槽` 的**同一道** P0 门 ⇒ 战中时写不进（两向）。 */
	{
		const 言 = []; const op = R.perform; R.perform = (m) => { 言.push(String(m)); return op; };
		B.战中 = true;
		const r = B.战前保底('整备');
		B.战中 = false; R.perform = op;
		ok(r === false, '★战斗中「战前保底」仍写入 ⇒ 失败面会覆盖可用存档（P0 失效）');
		ok(!言.some((m) => /保底存档/.test(m)), '★战斗中「战前保底」还印了「已留下保底存档」');
	}
	console.log(`  两触发点：${记.join('、')}｜战斗中写入被拒 ✓`);
}

/* ---------- ㉝ 快速存档：**真宿主语义的桩**（`has` 可靠 · `isEmpty` 不可靠）----------
 * ★本格的桩**照抄真宿主的怪癖**（本席实测）：`isEmpty(i)` 一旦有过写入即对**所有号**为假、
 *   `get(i)` 对空槽返回占位对象。⇒ 若实现拿 `isEmpty` 当空否判据，本格**必红**。
 *   桩若不照抄这个怪癖，本格就是「装置比真宿主善良」的假绿。 */
head('㉝ 快速存档（宿主桩：has 可靠 · isEmpty 不可靠 ⇒ 空槽不可读）');
{
	const 旧 = globalThis.SugarCube;
	const m = new Map(); const 载过 = [];
	globalThis.SugarCube = { ...(旧 ?? {}), Save: { slots: {
		has: (i) => m.has(i),
		get: (i) => (m.has(i) ? m.get(i) : {}),                    // ★空槽返回占位对象（同真宿主）
		save: (i, d) => { m.set(i, { type: 2, desc: d }); },
		load: (i) => { 载过.push(i); },                            // ★在场（✗ 缺 ⇒ 代码先走「入口不可用」支而绕过空槽判）
		count: () => m.size,
		delete: (i) => m.delete(i),
		isEmpty: (i) => (m.size === 0 ? !m.has(i) : false),        // ★同真宿主：写过就恒假
		length: 8,
	} } };
	try {
		const B = setup.BABEL;
		ok(B.可存(B.槽位.快存) === true, '★宿主桩在场时「可存」仍为假');
		const 名 = B.写槽(B.槽位.快存, {});
		ok(typeof 名 === 'string' && 名.length > 0, `★写槽没落名（实得：${JSON.stringify(名)}）`);
		ok(m.has(B.槽位.快存) === true, '★写槽后宿主桩里查不到该槽');
		/* ★核心：**空槽不可读**。桩的 `isEmpty` 此刻对 5 号返回**假**（同真宿主），
		 *   若实现拿它当判据 ⇒ 会去 load 一个空槽 ⇒ 本断言红。 */
		{
			const 言 = []; const op = R.perform; R.perform = (x) => { 言.push(String(x)); return op; };
			const r = B.快读(B.槽位.手动);                       // 5 号：从未写过
			R.perform = op;
			ok(r === false, '★空槽位「快读」没有拒绝 ⇒ 拿 isEmpty 当判据（真宿主会返回假）');
			ok(言.some((x) => /还是空的/.test(x)), `★空槽「快读」被拒但没给可读文案（实得：${JSON.stringify(言)}）`);
			ok(m.has(B.槽位.手动) === false, '★空槽「快读」竟把它变成有档');
			ok(载过.length === 0, `★空槽「快读」竟调了 read（载过：${JSON.stringify(载过)}）`);
		}
		console.log(`  桩：写槽落名「${名}」｜空槽快读被拒 ✓`);
	} finally { globalThis.SugarCube = 旧; }
}
/* ★正常出口：**必须**在这里调用（`#1815` 的 BLOCKER：这一行被搬走 ⇒ 门恒绿）——
 *   连同上面的 `process.on('exit')` 自证，两层守「断言不是装饰」。 */
printSummary();

