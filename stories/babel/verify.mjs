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

/** 记录「跳到哪个段落」——战斗死亡会跳「死亡回溯」，本脚本据此判定走了哪条路 */
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
State.variables.babelRun = { deaths: 0, kills: 0, gathered: 0, harvests: 0, traumasSeen: [], deepest: 'L1' };
State.variables.babelGiven = {};
State.variables.span1Arc = {};   // ★`books#132` L1–L9 弧的本局账（与 `meta/init.twee` 逐项同形）
State.variables.span1Farms = 0;
State.variables.span1Harvests = 0;

/* ---------- ① 装配面 ---------- */
head('① 装配面');
ok(!!B, '故事脚本未挂上 `setup.BABEL`（脚本没被装载？）');
ok(map instanceof R.WorldMap, '`setup.BABEL.map` 不是 WorldMap');
if (map) {
	ok(map.validate().length === 0, `地图结构不合法：${map.validate().join('；')}`);
	ok(map.validateConnectivity('L1').length === 0, `L1 出发不可达：${map.validateConnectivity('L1').join('；')}`);
	ok(map.locations.size === 26, `地点数应为 26（一段 13 ＋ 二段 L11–19 九层 ＋ L20 三地点 ＋ 故事侧军械堆/马厩），实为 ${map.locations.size}`);
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
	ok(acts.some((t) => t.includes('采集')), `${id} 没有采集动作`);
	ok(acts.some((t) => t.includes('遭遇')), `${id} 没有遭遇动作`);
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
await B.fight({ interactive: false });   // 无头环境必须走自动通路（交互通路等 UI 选择 ⇒ 会挂起）
R.rng.reset();
const badger = R.characters.get('badger');
ok(badger.hp === protoHp, `注册面单例被战斗改写（hp ${protoHp} → ${badger.hp}）—— 副本没生效`);
const run = State.variables.babelRun;
ok((run.kills > 0) !== (run.deaths > 0), `应恰好走一条路（胜/败），实测 kills=${run.kills} deaths=${run.deaths}`);
if (run.deaths > 0) {
	ok(map.current === 'L1', `死亡后应回起点层 L1，实为 ${map.current}`);
	ok(D.Player.hp === D.Player.maxHp, `死亡重生后体力应满，实为 ${D.Player.hp}/${D.Player.maxHp}`);
	ok(globalThis.__played.includes('死亡回溯'), '死亡后没有跳「死亡回溯」段落');
	ok(D.Player.effects.length === 0, `重生后应清空效果，实为 [${D.Player.effects.join(',')}]`);
} else {
	ok(State.variables.inventory.filter((s) => s.id === 'coin').length > coins0, '胜后没拿到掉落表的铜币');
	ok(D.Player.contains('fracture') || D.Player.contains('bleeding') || D.Player.contains('concussion')
		|| D.Player.effects.length === 0, '创伤面异常');   // 只核不崩
}
console.log(`  kills=${run.kills} deaths=${run.deaths}｜玩家 ${D.Player.hp}/${D.Player.maxHp}`
	+ `｜创伤 [${D.Player.effects.filter((e) => D.Traumas[e]).join(',')}]`);

/* ---------- ⑤b 死亡回起点层（票面「死亡回 1」这一步，强制走一次）----------
 * ★本格要测的是「**死亡 → 重生/清档/跳段**」这条面，✗ 不是「本层的怪打不打得死人」。
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
head('⑤b 死亡回起点层（强制）');
map.moveTo('L1');
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
		L1: { encounters: [{ ref: 'verify-lethal-foe', weight: 1 }], loot: 原表.L1?.loot ?? [] },
	}));
	D.Player.hp = 1;
	D.Player.gain('bleeding');           // 顺手验「死亡清档」也清 persistent 创伤
	R.rng.set(() => 0.5);                // d20=11：怪命中值 11+4=15 ≥ AC12 ⇒ 必中；玩家对 AC30 必不中
	globalThis.__played.length = 0;
	await B.fight({ interactive: false });
	R.rng.reset();
	R.registerEncounterTable('span1', 原表);   // ★恢复（✗ 污染后续段落）
}
const r2 = State.variables.babelRun;
ok(r2.deaths === 1, `应记 1 次死亡，实为 ${r2.deaths}`);
ok(map.current === 'L1', `死亡后应回起点层 L1，实为 ${map.current}`);
ok(D.Player.hp === D.Player.maxHp, `重生后体力应满，实为 ${D.Player.hp}/${D.Player.maxHp}`);
ok(!D.Player.contains('bleeding'), '重生后跨场创伤（bleeding）应被清掉（#1760 裁定⑤）');
ok(globalThis.__played.includes('死亡回溯'), `死亡后应跳「死亡回溯」，实测跳了 [${globalThis.__played.join(',')}]`);
console.log(`  deaths=${r2.deaths}｜回层 ${map.current}｜体力 ${D.Player.hp}/${D.Player.maxHp}｜创伤 [${D.Player.effects.join(',')}]`);

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
			 *   ⚠ `respawn` 会把 `P` 搬回起点层 ⇒ 位置面本格不核、也**不复原**（既有 ⑤b 格同样如此，
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
head('⑳ `books#132` L1–L4 弧（空手可胜／捡剑／必掉绷带／一击必杀／钥匙·宝箱）');
{
	/* ── L1 表：**只出非 elite**（空手 1d3 可磨死）⇒ 这是「空手可胜」的**机械前提**（✗ 口号）。 */
	const t1 = R.encounterTables?.span1;
	ok(!!t1, '★遭遇表 `span1` 不在（弧的 L1–L3 覆写没生效？）');
	if (t1) {
		ok((t1.L2?.encounters ?? []).some((e) => e.elite), '★L2 没有升 elite ⇒ 设计要的「难度较高」不成立');
		ok((t1.L3?.encounters ?? []).some((e) => e.ref === 'blue-moss-wasp'), '★L3 没换成蓝苔蜂（`books#132` 的 L3 怪）');
		/* L4–L9 须**逐字继承**引擎（防漂）：抽查 L9 与引擎表同源 */
		ok(JSON.stringify(t1.L9) === JSON.stringify(D.ENCOUNTER_SPAN1?.L9), '★L9 行与引擎表**不同源**（覆写时漂了）');
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
		for (const [层, 物] of [['L2', 'bandage'], ['L4', 'iron-key']]) {
			R.registerEncounterTable('span1', Object.assign({}, 原表, {
				[层]: { encounters: [{ ref: 'verify-drop-dummy', weight: 1 }], loot: [] },   // ★空随机掉落 ⇒ 断的就是「必掉面」
			}));
			State.variables.inventory = [];
			map.moveTo(层);
			D.Player.hp = D.Player.maxHp;
			R.rng.set(() => 0.99);                       // 必中重击 ⇒ 软目标一击毙
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
}

/* ★正常出口：**必须**在这里调用（`#1815` 的 BLOCKER：这一行被搬走 ⇒ 门恒绿）——
 *   连同上面的 `process.on('exit')` 自证，两层守「断言不是装饰」。 */
printSummary();

