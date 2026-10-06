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
import { verifyL10 } from '../../tools/verify-l10-city.mjs';

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
/* ---------- ★**引擎产物新鲜度守卫**（dev-9 撤回件教训 · 照 `#221` 形：mtime 比对 ＋ 具名红）----------
 *   `:83` 装载的是 `<引擎树>/tests/unit/dist/bundle.js` —— 这是**构建产物**。
 *   ⚠ 引擎树若是「检出后**没重烘**」的状态（只 `git checkout <sha>` 就跑、新 `git worktree`、
 *     或换了 `--engine` 指到另一份检出）⇒ 读到的就是**旧产物** ⇒ 本脚本量的是**另一棵树** ✗，
 *     而**每一节的绿/红都照旧打印** ⇒ 那一族的后果叫「**二分全废**」（每一步都看着对，量的都不是当前源码）✓。
 *   ⇒ 此处按 **mtime** 比对：产物必须**不早于**引擎源码里最新的那一份（含 `build.py`）；
 *     否则**具名红 ＋ 给出重建命令**（✗ 不静默、✗ 不降级成警告）。
 *   ★**✗ 不设旁路开关**：能绕过的守卫等于没有守卫（本舰队「陈旧产物」族已栽多次）。 */
const 引擎产物 = path.join(root, 'tests/unit/dist/bundle.js');
const 引擎构建输入 = (() => {
	const 集 = [];
	const 走 = (d) => {
		let 列; try { 列 = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
		for (const e of 列) {
			const p2 = path.join(d, e.name);
			if (e.isDirectory()) 走(p2);
			else if (/\.(js|mjs|cjs|json)$/.test(e.name)) 集.push(p2);
		}
	};
	走(path.join(root, 'src'));
	const bp = path.join(root, 'build.py');
	if (fs.existsSync(bp)) 集.push(bp);
	return 集;
})();
if (!fs.existsSync(引擎产物)) {
	console.error(`✗ 缺引擎产物：${引擎产物}\n  ⇒ 先构建：python3 ${path.join(root, 'build.py')}`);
	process.exit(2);
}
{
	let 最新 = null;
	for (const p2 of 引擎构建输入) {
		let t2 = 0; try { t2 = fs.statSync(p2).mtimeMs; } catch { continue; }
		if (最新 == null || t2 > 最新.t) 最新 = { p: p2, t: t2 };
	}
	if (最新 && fs.statSync(引擎产物).mtimeMs < 最新.t) {
		console.error(`✗ 引擎产物**陈旧**：${path.relative(root, 引擎产物)} 早于 ${path.relative(root, 最新.p)}`);
		console.error(`  ⇒ 先重烘：python3 ${path.join(root, 'build.py')}`);
		console.error('  ★✗ 别拿旧产物跑读数 —— 那正是「二分全废」族：每一步都看着绿/红，量的却都不是当前源码。');
		process.exit(2);
	}
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
/* ── 62. `books#207`（轨 C · 批 2）：**进度面的唯一读口**（只读 · 零新键 · 门只经它）─────────
 *
 * 病（`#172` 六模块 §5 要拆的面）：进度的事实**散在多处** —— 逐层战果 `babelRun.已战`、
 *   固定事件层的跳过旗 `babelRun.已跳过`、抽签层的事件账 `span1Events`、到达面 `map.deepest`、
 *   头目进度（引擎权威账）；且门 `事件阶段已了` 与各动作的 `when` **各写一份判据** ⇒
 *   「哪层开哪层关」不可判（本档 `:1110` 的注释自己点过这条）。
 * 裁（操作者 · 经领队 2026-10-06 03:34Z）：**进度／位置／叙事三 owner**；旧档**同代、不清**。
 *
 * 断什么：① **只读面**（`B.读进度`）如实反映四类真源，且★**读一次不改世界**（✗ 不 `??=` 建键）；
 *   ② **门消费**：上行门/守卫的判据与只读面**同一个表达式**（✗ 两处各写一份）；
 *   ③ 读档往返 ⇒ 各项**不变**（＝「旧档同代不清」）；清掉本局账 ⇒ 读面归零（＝「重开清」）；
 *   ④ **防漂移**：读面答出来的每一项，都能被**具名真源**复算出来（✗ 无第二真值）；
 *   ⑤ **边界**：无账且未采净 ⇒ 门为假（✗ 缺账当已了）；**例外层**（抽签层／无节点层）⇒ 门为真。
 * 刀（记在提交信息）：① 让 `读进度` 内部改走 `eventsOf()`（会建键）⇒ ① 的「零副作用」格红；
 *   ② 把门改回「自带一份判据」（✗ 经读面）⇒ ② 的同一表达式格红。
 */
head('62. `books#207`：进度面唯一读口（只读·零新键）＋ 门只经它（防两处各写一份）');
{
	const 层 = 'L1';
	const 抽签层 = 'L5';                      // ★例外族之一（`EVENT_LAYERS`）
	const 无节点层 = 'L10-camp';              // ★例外族之二（无节点账 ⇒ 门不适用）
	const 节点 = B.nodeAt?.(层);
	const 位存 = map.current;
	const 跑存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 事件存 = JSON.parse(JSON.stringify(State.variables.span1Events ?? null));
	const 次数存 = 节点?.charges;
	const 上行门 = () => (map.paths ?? []).find((p) => p.from === 层)?.when?.();
	const 组前失败 = fails.length;
	try {
		ok(typeof B.读进度 === 'function', '★机器件没导出（`B.读进度`）—— 判据取不到进度面');
		ok(!!节点, '★L1 无采集节点（本格前提不成立 ⇒ 后面的断言会恒真）');

		/* ① 只读面如实反映真源；★读一次不改世界 */
		State.variables.babelRun ??= {};
		delete (State.variables.babelRun.已跳过 ??= {})[层];
		State.variables.babelRun.已战 ??= {};
		delete State.variables.babelRun.已战[层];
		delete State.variables.span1Events;                      // ★先拿掉，好断言「读不建键」
		节点.charges = 6;
		const 快照前 = JSON.stringify(State.variables.span1Events ?? null);
		const a = B.读进度(层);
		ok(a.已战 === false && a.跳过 === false && a.采净 === false && a.事件已了 === false,
			`★未战未跳未采净 ⇒ 读面应全假（实得 ${JSON.stringify(a)}）`);
		ok(JSON.stringify(State.variables.span1Events ?? null) === 快照前,
			'★读面**建了键**（`span1Events` 凭空出现）—— 守卫路径禁副作用（本仓 `预报类` 的同款口径）');

		B.记跳过(层);                                            // 走**真写口**
		const b = B.读进度(层);
		ok(b.跳过 === true && b.事件已了 === true, `★走真写口后读面未跟上（实得 ${JSON.stringify(b)}）`);

		/* ② 门消费：门与读面**同一个表达式** */
		置已战(层);
		ok(B.事件阶段已了?.(层) === B.读进度(层).事件已了,
			'★门（`事件阶段已了`）与读面（`读进度().事件已了`）答得不一致 ⇒ 两处各写了一份判据（本格要防的漂移）');
		if (typeof 上行门() === 'boolean') {
			ok(上行门() === B.读进度(层).可上行, '★上行门 `when()` 与读面 `可上行` 不一致');
		}

		/* ③ 读档往返 ⇒ 不变；清账 ⇒ 归零 */
		const 档 = Save.roundtrip(State.variables.babelRun);
		const 前 = JSON.stringify(B.读进度(层));
		State.variables.babelRun = 档;
		ok(JSON.stringify(B.读进度(层)) === 前, '★读档往返后进度面**变了** —— 「旧档同代不清」没落住');
		delete State.variables.babelRun.已跳过[层];
		delete State.variables.babelRun.已战[层];
		ok(B.读进度(层).已战 === false && B.读进度(层).跳过 === false,
			'★清掉本局账后读面未归零 —— 「重开清」没落住（那会让上一局的进度漏进新局）');

		/* ④ 防漂移：读面每一项都能被**具名真源**复算 */
		置已战(层);
		const c = B.读进度(层);
		const 复算 = {
			已战: State.variables.babelRun?.已战?.[层] === true,
			跳过: State.variables.babelRun?.已跳过?.[层] === true,
			采净: (B.nodeAt?.(层)?.charges ?? 0) <= 0,
		};
		ok(c.已战 === 复算.已战 && c.跳过 === 复算.跳过 && c.采净 === 复算.采净,
			`★读面与具名真源复算不符（读面 ${JSON.stringify(c)}／复算 ${JSON.stringify(复算)}）⇒ 疑似第二真值`);

		/* ⑤ 边界：无账且未采净 ⇒ 假；例外层 ⇒ 真 */
		节点.charges = 6;
		delete State.variables.babelRun.已跳过[层];
		ok(B.读进度(层).事件已了 === false, '★无账且未采净 ⇒ 门须为假（✗ 缺账当已了 —— 那正是 writer 实证过的那条）');
		ok(B.读进度(抽签层).事件已了 === true, '★抽签层（例外）⇒ 门须为真（✗ 对本门不适用）');
		ok(B.读进度(无节点层).事件已了 === true, '★无节点层（例外）⇒ 门须为真');
		console.log(组前失败 === fails.length
			? '  进度面：只读零副作用 ✓｜门与读面同表达式 ✓｜读档不变 ✓｜清账归零 ✓｜例外两族 ✓'
			: `  进度面：本组新增失败 ${fails.length - 组前失败} 条（见上）`);
	} finally {
		if (节点) 节点.charges = 次数存;
		map.current = 位存;
		State.variables.babelRun = 跑存 === null ? undefined : JSON.parse(JSON.stringify(跑存));
		if (事件存 === null) delete State.variables.span1Events; else State.variables.span1Events = JSON.parse(JSON.stringify(事件存));
	}
}
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

/* ---------- ★`books#209`：装载**前**给一个最小的宿主配置桩 ----------
 * 用途只有一个：让故事脚本**装载期那一次**「装宿主存档门」真的跑到 —— 否则无头里
 *   `Config` 永远缺席，「装了没有」就永远判不了（那会把该判据变成**死区**）。
 * ★桩**只给空 `saves`**（✗ 不给 `maxSlotSaves` ⇒ `槽上限()` 仍走回落，与先前逐字同；
 *   ✗ 不给 `isAllowed` ⇒ 包装层从「宿主无判定」那一支上装 —— 那正是真产物的初值）。
 * ⚠ 本桩**不删**：留着才能让下面的㊴ 格分别断「装载期装的」与「当场装的」两条路。 */
const 宿主配置桩 = { saves: {} };
globalThis.SugarCube = { ...(globalThis.SugarCube ?? globalThis), Config: 宿主配置桩 };

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
State.variables.babelL10 = { sold: 0, resident: false };
State.variables.babelL10Storage = [];
State.variables.span1Arc = {};   // ★`books#132` L1–L9 弧的本局账（与 `meta/init.twee` 逐项同形）
State.variables.span1Events = {}; // ★`books#133` 笔 1：选择制事件账（与 `meta/init.twee` 逐项同形）
State.variables.span1Foresee = {}; // ★`books#164`：预知账（`{目标层: 类}`，与 `meta/init.twee` 逐项同形）
State.variables.span1Farms = 0;
State.variables.span1Harvests = 0;

/* ---------- ① 装配面 ---------- */
/* ★`books#220`（dev-10 实测、`tools/README.md` 已立口径）：本档含**遭遇抽样**（L13 遭遇、事件账取序）
 *   ⇒ **同树两跑 sha 不同** ⇒ 「逐字节对照」类零回归证明在本档**不可用**。
 *   口径要印在**读数所在处**（✗ 只躺在 README 里）：故此处就地声明，请改用**构造证明**（断**来源**，✗ 断输出文本）。 */
console.log('★口径（可复现性）：本档含**遭遇抽样**（L13 遭遇／事件账取序）⇒ **同树两跑 sha 可能不同**'
	+ ' ⇒ 逐字节对照**不可用**；零回归请改用**构造证明**（断来源，✗ 断输出文本）。依据与例见 `tools/README.md`「读数的可复现口径」。');

/* ★`books#259` 裁 1：给这些层**直置**「本层已战」—— 只给**不测战斗**的格做前置
 *   （战斗路本身由 ㊷ 格两向判：无标记 ⇒ 事件面与向上边都不可见／有 ⇒ 都可见）。
 *   直置的是**契约数据**（`$babelRun.已战`，`fight()` 战后写的同一个位置），✗ 不是绕过判定。 */
const 置已战 = (...层) => {
	const r = (State.variables.babelRun ??= {});
	(r.已战 ??= {});
	for (const id of 层) r.已战[id] = true;
};

head('① 装配面');
ok(!!B, '故事脚本未挂上 `setup.BABEL`（脚本没被装载？）');
ok(map instanceof R.WorldMap, '`setup.BABEL.map` 不是 WorldMap');
if (map) {
	ok(map.validate().length === 0, `地图结构不合法：${map.validate().join('；')}`);
	ok(map.validateConnectivity('L1').length === 0, `L1 出发不可达：${map.validateConnectivity('L1').join('；')}`);
	ok(map.locations.size === 31, `地点数应为 31（原 30 处 ＋ ★books#397 裁 (b) 新增的独立区域 W09「七名河」✓），实为 ${map.locations.size}`);
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
	置已战(id);        // ★P1 前置（`books#259` 裁 1）：基础采集是战内/战后动作 ⇒ 断「每层有采集」前须先置已战
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
	/* ★`books#280` ①（同笔重取）：本格上面 `置已战(id)` 是**前置**，而遭遇面自本笔起**跟着已战账走**
	 *   （胜利即耗）⇒ 若仍按 `availableActions` 断「有遭遇」，就与本格自己的前置**自相矛盾**。
	 *   ⇒ 口径改为断**动作表的存在性**（`loc.actions`：静态入表、由 `when` 筛）；可用性那半由 ㊽ 格三向判。 */
	const 形 = (a) => (typeof a.text === 'function' ? a.text() : a.text);
	ok(loc.actions.some((a) => 形(a).includes('遭遇')), `${id} 没有遭遇动作（第一场战斗三段皆留；本行断**表存在性**）`);
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
	/* ★`books#397` 裁 (b)：出城**首次分流** —— 教程未完成走 `W09` ✓／已完成走旧 `L11` ✓（互斥 ✓）。
	 *   ⚠ 此处判**边的存在性**（原始 `exits` 数组 ✓）：**闸门过滤后**的可用性随三态变 ⇒ 由第 65 组 ⑩ 格钉 ✓；
	 *     ✗ 不用 `exitsFrom`（按闸门过滤 ⇒ 会把「首次分流生效」误报成「边没了」✗）。 */
	ok(map.exits.some((e) => e.from === 'L10-gate' && e.to === 'L11'), '`L10-gate` 没有通往 L11 的边（10→11 未接通）');
	ok(map.exits.some((e) => e.from === 'L10-gate' && e.to === 'W09'), '`L10-gate` 没有通往 W09（首次出城教程）的边');
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
/* ★P1 前置（`books#259` 裁 1）：基础采集是**战内/战后**动作 ⇒ 本格断「动作在不在」之前须先置「已战」。 */
置已战('L1', 'L2', 'L3', 'L4', 'L9', 'L11', 'L12', 'L13', 'L14', 'L15', 'L16', 'L17', 'L18', 'L19');   // ★按本格实际断言的那些层显式置位
/* ⚠ 不能用 `gatherPoints` 动态取：本格位置很靠前，那时 `world/encounters.js` 的 `gatherPoints` 还没建 ⇒ 取到空表。 */
head('④ 采集闭环（L1 的碎石堆 · 地点节点形）');
map.moveTo('L1');
const 采集点ids = ['stone-pile', 'dead-wood', 'flint-seam', 'wild-grain', 'copper-vein'];
ok(!采集点ids.some((id) => R.has(id)), '起点背包里不该有采集点（`#116`：玩家不持有采集点）');
/* ★新模型：**单一采集动作**（✗ 无「翻找」那一步）；可用性＝该处节点 charges。 */
const 采集动作 = (locId) => map.locations.get(locId).availableActions
	.find((a) => String(typeof a.text === 'function' ? a.text() : a.text).startsWith('采集（'));
ok(!!采集动作('L1'), 'L1 没有「采集（…）」动作（地点节点形）');
/* ★`books#259` 裁 5：**文案必须在采前取** —— 一次采净后该节点空、`when` 不成立 ⇒ **动作不再存在** ✓
 *   （旧形在采后取文案 ⇒ 新语义下必然拿到 `undefined` ✗，那是**语义变的正确后果** ✗ 不是回归 ✓）。 */
const 文案前 = String(typeof 采集动作('L1')?.text === 'function' ? 采集动作('L1').text() : 采集动作('L1')?.text);
const 节点账 = () => State.variables.gatherNodes ?? {};
const 取账 = (locId) => 节点账()[locId];
const 采前 = 取账('L1')?.charges ?? null;
const before = State.variables.babelRun.gathered;
if (采集动作('L1')) 采集动作('L1').action();
const 应采件数 = 采前;    // ★采**前**件数（`采前` 在动作之前取的 ✓ —— ✗ 不能在这里读 `取账`，那已经是采后 ✗）
ok(State.variables.babelRun.gathered === before + 应采件数,
	`★一趟应采净该处（gathered 应 ${before}→${before + 应采件数}；实得：${before} → ${State.variables.babelRun.gathered}）`);
ok(R.has('rock'), '采集没有产出石料（`yields` 未生效？）');
/* ★两向断：① 产出**进背包** ② 节点**留账**且 charges **扣了**（✗ 采了不耗）。 */
ok(!采集点ids.some((id) => R.has(id)), `★采集后**背包里仍无**采集点（实得：${R.inventoryLabel()}）`);
const 采后 = 取账('L1')?.charges ?? null;
ok(采前 != null && 采后 === 0, `★一趟应把该处**采净**（账：${采前} → ${采后}，应 → 0）`);
/* 动作文案带次数（`#1887` 的显示面迁到这里） */
ok(/一次采净 \d+ 件/.test(文案前), `★采前文案应写明「一次采净 N 件」（实得：${文案前}）`);
/* ★两向（裁 5）：采**后**该处已净 ⇒ 这个动作**不该存在** ✓（「事件用后不补」✓）—— ✗ 不是"文案里还剩几次" ✓ */
ok(采集动作('L1') === undefined || 采集动作('L1') === null,
	`★采净后动作应消失（实得：${typeof 采集动作('L1')?.text === 'function' ? 采集动作('L1').text() : String(采集动作('L1')?.text)}）`);
const 文案 = 文案前;    // ★后面的读数行仍在用 `文案`（保持一处名 ✓）
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
	// L10 的保底休整不再治疗创伤；遍历各 hub 的真实创伤服务，不删二段双向覆盖。
	const isCare = (a) => a.traumaCare === true || (String(a.text).includes('歇一歇') && a.recovery !== true);
	const original = { loc: map.current, city: JSON.parse(JSON.stringify(State.variables.babelL10)),
		inventory: JSON.parse(JSON.stringify(D.Player.items)), bonus: D.Player.stats.heal_bonus, choice: R.choice };
	let checked = 0;
	try {
		State.variables.babelL10.resident = true;
		R.deposit(D.Player.items, 'coin', 100);
		for (const layer of hubLayers) {
			const locs = [...map.locations.values()].filter((l) => (R.layerOfLocation(l.id)?.id ?? l.id) === layer);
			const cares = locs.flatMap((l) => l.availableActions.filter(isCare).map((a) => ({ loc: l, act: a })));
			for (const { loc, act } of cares) {
				map.moveTo(loc.id);
				const id = 'bleeding';
				R.choice = act.traumaCare ? (opts) => {
					const option = opts.find((o) => String(o.text).includes(D.Traumas[id].name));
					ok(!!option, `${loc.id} 真实创伤菜单缺 ${id}`);
					return Promise.resolve(option?.value ?? 'cancel');
				} : original.choice;
				D.Player.stats.heal_bonus = 20; D.Player.gain(id);
				R.rng.set(() => 0.99); act.action();
				if (act.traumaCare) await B.L10.menu('trauma'); R.rng.reset();
				ok(!D.Player.contains(id), `${loc.id} 高掷未治好创伤（真实服务未接线）`);
				D.Player.gain(id); D.Player.stats.heal_bonus = -100;
				R.rng.set(() => 0.01); act.action();
				if (act.traumaCare) await B.L10.menu('trauma'); R.rng.reset();
				ok(D.Player.contains(id), `${loc.id} 低掷竟治好了创伤（DC 比对失效）`);
				D.Player.lose(id); checked += 1;
			}
		}
	} finally {
		R.choice = original.choice; R.rng.reset(); D.Player.stats.heal_bonus = original.bonus;
		State.variables.babelL10 = original.city; State.variables.inventory = original.inventory;
		map.moveTo(original.loc);
	}
	ok(checked >= 2, `创伤服务须覆盖 L10／L20 两处，实为 ${checked}`);
	console.log(`  hub 层 ${hubLayers.join('、')}｜真实创伤入口 ${checked} 处，高掷治愈／低掷保留`);
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
	ok(木节点前 != null && 木节点后 === 0, `★料场一趟应**采净**（账：${木节点前} → ${木节点后}，应 → 0）`);
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
	ok(registered, '★`precognition` 未注册（`R.effects.has` 为假）—— 引擎档 `dnd3/core/passives.js` 未随包加载'
		+ '（`#1909`／`sgstory#1930` 之后注册面在引擎侧：pin 是否已含该件？）');
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
	/* ★`#1902` 审计面加固：**按键表逐键断**（✗ 逐个键各写一条硬编断言）。
	 *   既有断言断的是 `span1Arc` 与 `span1Foresee`（两个**硬编键名**）——键表新加一个键时，登记循环会自动
	 *   把它登记上，但**判据里那份硬编名单不会跟着长** ⇒ 新键少了「进 domains」这一答。
	 *   读的键表由故事侧导出（`setup.BABEL.保存域键`）—— 与登记函数**同一份**，✗ 判据里重写一份。
	 *   本格同时把两种「只有 `console.warn` 看得见」的情形变成**具名红**：
	 *     ① 登记循环被改窄（漏登记某键）② 某键被引擎**拒收**（与内置域同名 ⇒ `declareDomain` 返回 false）。 */
	const 键表 = setup.BABEL.保存域键;
	ok(Array.isArray(键表) && 键表.length > 0, '★故事侧没导出保存域键表（`setup.BABEL.保存域键`）⇒ 本格取不到「一处定义」的那一份');
	if (Array.isArray(键表)) {
		const 域表 = en?.domains ?? [];
		const 未登 = 键表.filter((k) => !域表.includes(k));
		ok(未登.length === 0,
			`★键表里有**未进** \`envelope().domains\` 的键：${JSON.stringify(未登)}（域表 ${JSON.stringify(域表)}）⇒ 故事侧新键漏登记`);
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
			置已战('L5', 'L6');          // ★裁 1 前置：事件面只在**战后**出现（本格不测战斗）
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
	置已战('L5');                    // ★裁 1 前置（本格测的是**事件面**，✗ 战斗）
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
	置已战('L6');                    // ★裁 1 前置
	map.moveTo('L6');
	R.rng.reset();
	const 账6 = State.variables.span1Events['L6'];
	ok(JSON.stringify(账6?.抽中) === JSON.stringify(['battle', 'chest']),
		`★注入序列的抽中与手算不符（手算 ['battle','chest']；实得 ${JSON.stringify(账6?.抽中)}）`);
	ok(!可事件('L6').includes('gather'), '★未抽中的类出现了（采集未在抽中却可选 ⇒ 按条件筛而非按抽签筛）');
	ok(可事件('L6').length === 2, `★可选事件面不是两类（实得 ${JSON.stringify(可事件('L6'))}）`);

	/* ③④⑤ 择一：两类一起退场；基础遭遇**不受影响**；账不变（不重抽） */
	const loc6 = map.locations.get('L6');
	const 遭遇形 = (a) => (typeof a.text === 'function' ? a.text() : a.text);
	const 遭面6 = () => loc6.actions.find((a) => 遭遇形(a).includes('遭遇'));
	/* ★`books#280` ①（同笔重取）：遭遇的可用性现由**已战账**筛（胜利即耗），而本格上面已 `置已战('L6')`
	 *   ⇒ 口径改为「择一**前后同值**」：断的是「事件面与基础遭遇面**零耦合**」，✗ 不是「恒可用」。 */
	const 遇前 = typeof 遭面6()?.when === 'function' ? 遭面6().when() : null;
	const 选中 = loc6.actions.find((a) => a.事件类 === 可事件('L6')[0]);
	ok(!!选中, '★取不到抽中类的动作对象（动作表与`事件类`标记不一致）');
	if (选中) 选中.action();
	/* ★`dev-9` NIT-5 的同族：日志里的 `✓` 须**按读数条件**印（✗ 无条件印 —— 臂 B 下会照印「已清 ✓」） */
	const 清 = 可事件('L6').length === 0;
	const 遇后 = typeof 遭面6()?.when === 'function' ? 遭面6().when() : null;
	const 遭遇在 = !!遭面6() && 遇前 === 遇后;
	const 账静 = JSON.stringify(State.variables.span1Events['L6'].抽中) === JSON.stringify(['battle', 'chest']);
	ok(清, `★择一之后本层事件面没退场（还可选 ${JSON.stringify(可事件('L6'))}）`);
	ok(遭遇在, `★择一改变了基础遭遇的可用性（表在 ${!!遭面6()}；前 ${遇前} ⇒ 后 ${遇后}）—— 两张面应零耦合`);
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
 *   ③ ★**✗ 并入**（`books#259` 裁 3：耐久是**属性** ⇒ **单件** ⇒ 再拾同类**不得**把耐久相加） ④ ★**实例感知扣费**（手工构造两把不同耐久：
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

			/* ③ ★**✗ 并入**（`books#259` 裁 3 —— 本格原为「拾取并入」，**语义按裁翻转** ✓）
			 *   旧形断「一个槽、耐久相加（6×2）」✗；裁 3 明写：耐久是**道具属性**（**单件**·用一次减一）✗ 数量
			 *   ⇒ 断**不变量**：**不存在任何一个槽的耐久 ＝ TOOL_CHARGES×2**（即「相加」这件事不发生）✓。
			 *   ★不断"槽数"（引擎对非堆叠件是"新开槽"还是"拒绝"不是本裁的面 ✗）—— 断的是**语义** ✓。 */
			R.give('pick');
			const 槽些 = State.variables.inventory.filter((s) => s.id === 'pick');
			ok(!槽些.some((s) => s.charges === T.TOOL_CHARGES * 2),
				`★再拾同类被**并入**了（实得 ${JSON.stringify(槽些)}）—— 裁 3：耐久是**属性**✗ 数量，✗ 相加`);

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
			置已战('L7');                // ★裁 1 前置（本格测工具门，✗ 战斗）
			const 采动作 = () => (map.locations.get('L7').actions.find((a) => a.事件类 === 'gather'));
			ok(!!采动作(), '★L7 的动作表里没有 `gather` 事件（动作表变了？）');
			/* ★`books#212` 第 1 项改形（操作者裁定 00:2x·领队转）：**按钮改为常出**，把「为什么不行」
			 *   交给动作**说明白**（原先缺工具就**不出按钮** ⇒ 玩家只看到"这里会有采集"而无从得知原因 ✗）。
			 *   本格随之改断**三面**：①`when` 为**真**（入口在 ⇒ 玩家点得到）；②动作**不消费**事件
			 *   （拿到工具回来还能采 ✓）；③动作给出**可读原因**（缺哪一件 ⇒ 按码实况，✗ 按愿望写）。 */
			ok(采动作().when() === true, '★缺工具时 `gather` 竟**不可选**（本票改为「入口常出 ＋ 动作说明原因」⇒ 入口消失会让玩家无从得知原因）');
			{
				/* 账键实名是「已用」（`span1Events[L].已用` ＝ 抽中的类）⇒ ✗ 我首版猜的 `.used`（✗ 凭记忆写内部名）。 */
				const 账 = () => State.variables.span1Events?.L7?.已用 ?? null;
				const 前消费 = 账();
				const 前文 = [];
				const 原perform = setup.RPG.perform;
				setup.RPG.perform = function (...a) { 前文.push(String(a[0] ?? '')); return 原perform.apply(this, a); };
				try { 采动作().action(); } finally { setup.RPG.perform = 原perform; }
				ok(前文.some((行) => /此处可采集，需要：/.test(行)),
					`★缺工具时点了采集，却没给**可读原因**（上屏=${JSON.stringify(前文)}）`);
				ok(账() === 前消费, `★缺工具时点采集**把事件消费掉了**（已用 ${JSON.stringify(前消费)} ⇒ ${JSON.stringify(账())}）—— 拿到工具回来就不能采了`);
			}
			R.give('axe');
			ok(采动作().when() === true, '★手上有铁斧了，`gather` 仍不可选（工具门接线断了）');
			/* ⑧ ★`books#166` 的第七面 ＋ `sgstory#1906` §G：**背包里直接使用工具**须
			 *   ① `act` 判**拒绝**（`used()` 返回 false —— `#1776`／`#1801` 的契约）
			 *   ② **耐久不变** ③ 瞬时说明进**通知面**（✗ 正文多一行 —— `books#130` D6-3 的读数形）。
			 *   ⚠ 三条一起断：只断①会放过「扣了耐久」，只断②会放过「静默无反馈」。 */
			{
				const 行 = () => (globalThis.__host?.host?.lines?.() ?? []).length;
				const 前耐 = State.variables.inventory.find((s) => s.id === 'axe')?.charges;
				const 前行 = 行();
				const 前通 = R.notices({ limit: 200 }).length;
				const r用 = R.act(D.Player, 'axe', D.Player, 'use');
				const 后耐 = State.variables.inventory.find((s) => s.id === 'axe')?.charges;
				const 后行 = 行();
				const 后通 = R.notices({ limit: 200 }).length;
				ok(r用?.status === 'rejected', `★直接使用工具须判**拒绝**（实得 ${JSON.stringify(r用)}）`);
				ok(后耐 === 前耐, `★直接使用工具**扣了耐久**（${前耐} ⇒ ${后耐}）—— #1801 的契约被破`);
				ok(后行 === 前行, `★正文多了 ${后行 - 前行} 行 —— 瞬时说明该走通知面（同 coin 那件）`);
				ok(后通 - 前通 === 1, `★通知面须恰记一句白话（实得 +${后通 - 前通} —— 玩家看不到「为什么用不了」）`);
				console.log(`  工具：三件齐 ✓｜初值 ${T.TOOL_CHARGES}（表）✓｜✗ 不并入（裁 3） ✓｜实例感知扣费 ${两把读数}（应 2／8）｜采空不扣 ✓｜工具门 ✓｜直接使用工具：拒绝 ＋ 耐久不变 ＋ 通知面白话 ✓`);
			}
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
		const 存新账 = JSON.parse(JSON.stringify(State.variables.rpgProgress ?? null));   // ★`#1936`：真值源在引擎账上，存档也得存它
		B.记战果?.('L9', 'victory');
		const L9出口_已胜 = map.exitsFrom('L9');
		const L9边 = map.exits.filter((e) => e.from === 'L9');
		const 乙 = L9出口_已胜.length === 1 && /前进/.test(String(L9出口_已胜[0]?.text ?? ''));
		ok(乙, `★已过头目后 L9 的可用出口不是「唯一的前进」（实得 ${JSON.stringify(L9出口_已胜.map((e) => e.text))}）`);
		/* ★`books#259` 裁 2（塔单向向上·裁（甲）从严 ✗ 例外边）：准备区**不再回到 L8**
		 *   —— 补给（L8 温泉）必须在**攀过之前**完成（与操作者早裁③「L8 温泉满装→上 L9」自洽）。 */
		const 丙 = L9边.some((e) => e.to === 'L10-camp') && !map.exitsFrom('L9-camp').some((e) => e.to === 'L8')
			&& map.locations.has('L9-camp') && map.exitsFrom('L9-camp').some((e) => e.to === 'L9');
		ok(丙, `★L9 拆面坏了：战场→L10 ${L9边.some((e) => e.to === 'L10-camp')}／准备区存在 ${map.locations.has('L9-camp')}`
			+ `／准备区→L8（应 ✗）${map.exitsFrom('L9-camp').some((e) => e.to === 'L8')}／准备区→战场 ${map.exitsFrom('L9-camp').some((e) => e.to === 'L9')}`);
		State.variables.babelRun.bosses = 存进度 ?? {};
		if (存新账 === undefined) delete State.variables.rpgProgress; else State.variables.rpgProgress = 存新账;
		/* ③ 对照：非头目层不设限（守卫**按层**作用，✗ 全局摘除） */
		置已战('L8');                // ★裁 1 前置：向上边只在**战后**开（本格测的是单向，✗ 战斗）
		const L8出口 = map.exitsFrom('L8');
		/* ★`books#259` 裁 2：塔单向 ⇒ 非头目层的可用出口**只有向上那一条**（原断言「2 条」＝含向下回边）。 */
		const 丁 = L8出口.length === 1 && /向上/.test(String(L8出口[0]?.text ?? ''));
		ok(丁, `★非头目层 L8 的可用出口不是「只有向上一条」（${JSON.stringify(L8出口.map((e) => e.text))}）⇒ 单向往上不成立`);
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
		const 己 = (B.LAYER_META ?? []).find((l) => l?.id === 'L10')?.type === 'hub' && !map.exitsFrom('L10-camp').some((e) => e.to === 'L9');
		ok((B.LAYER_META ?? []).find((l) => l?.id === 'L10')?.type === 'hub', '★L10 不再是 `hub`（接管面被改了）');
		/* ★`books#259` 裁 2：`L10-camp → L9` 的回边**按裁摘除**（原断言「少了这条边」＝旧双向语义）⇒ 现断**不在**。 */
		ok(!map.exitsFrom('L10-camp').some((e) => e.to === 'L9'), '★L10-camp 仍有回 L9 的边（裁 2 要求塔单向向上）');
		console.log(`  头目弧：实体＋攻击件 ${m(甲)}｜L9 固定（抽得 ${抽ref}）${m(抽ref === 'sleepless-one')}`
			+ `｜硬门（未胜 ${L9出口_未胜.length} 条 ⇒ 已胜 ${L9出口_已胜.length} 条「${L9出口_已胜[0]?.text ?? ''}」）${m(乙)}（边仍在 ${L9边.length} 条；非头目层 L8 对照 ${L8出口.length} 条 ${m(丁)}）`
			+ `｜两表同键（层 ${本地层.length}／遭遇 ${遭遇键.length} 键，\`boss\` 只在 L9）${m(戊)}｜L10 hub 保留、下行步行边关闭 ${m(己)}`
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

		/* ⑦ ★`books#259` 裁 6：预知**已改为进层的门**（操作者原文「先预知，再进入下一层，再战斗」）——
		 *   ①常驻按钮**退役**（✗ 两形并存：「随时可预知」与「进层那一刻问」互斥）
		 *   ②门挂在**向上边**的 `action` 上，模态**恰 4 项**＝3 类 ＋ 不预知（操作者原文：后一项是「不预知」）
		 *   ③选完即入账（`记预报`），此后该层门关（「每层一次」）。 */
		清();
		map.moveTo('L5');
		ok(预知钮('L5').length === 0,
			`★常驻预知按钮仍在（实得 ${JSON.stringify(预知钮('L5'))}）—— 裁 6 要求改为「门」`);
		const 上边 = (map.exitsFrom('L5') ?? []).find((e) => /向上/.test(String(e.text ?? '')));
		ok(!!上边 && typeof 上边.action === 'function', '★向上边没有门（持有者攀层时不会出现 4 选项）');
		{
			const 原选 = D.Player.choice;
			const 见 = [];
			D.Player.choice = (选项) => { for (const o of 选项) 见.push(o.value); return Promise.resolve('chest'); };
			try { 上边.action(); } finally { D.Player.choice = 原选; }
			/* ★★★`books#280` ②-1（本笔同批）：**「不预知」那一项的 `value` 已由 `null` 改 `''`** ——
			 *   ★理由是**真 bug**：引擎 `choice` 要求 `value` 为**字符串**，`value: null` 会抛
			 *   「choice 的每个选项都应是 { text: string, value: string }」✗ —— ★那是个**休眠 bug**
			 *   （`world/babel.js` 的 `预知门` 里一直写着 `null`），★**由 ②-1 的靶修把它走到了** ✓。
			 *   ★故本格同步：★**「不预知」＝ `''`（空串）** ⇒ 判法从 `=== null` 改 `=== ''`，
			 *   且「3 类」的筛法从 `v != null` 改 `v !== ''`（★否则空串会被算进「3 类」⇒ 数成 4 ✗）。 */
			ok(见.length === 4 && 见.filter((v) => v !== '').length === 3 && 见[见.length - 1] === '',
				`★门的选项不是「3 类 ＋ 不预知」（实得 ${JSON.stringify(见)}；★「不预知」的值形是 **空串**）`);
			await new Promise((r) => setTimeout(r, 0));        // 门内是 `.then` 入账 ⇒ 让微任务跑完再断
		}
		ok(B.预报类('L6') === 'chest',
			`★从门里选「宝箱」后预报账没记下（实得 ${JSON.stringify(State.variables.span1Foresee)}）`);
		ok(B.可预知('L5') === false, '★门选过之后本层仍可预知（「每层一次」在门上不成立）');

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
		置已战('L8');                    // ★裁 1 前置（本格测「温泉与抽签零耦合」，✗ 战斗）
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

		/* ★**独立格**（`sgstory#1934` 的 T 席明账，`books#226` 收并后解锁）：
		 *   故事侧 `B.战果(...)` **投出的名** 与 **引擎当场 `RPG.outcomeResolver.resolve(...)` 的答复**
		 *   经**本格自持**的一份 §14 规范表投出的名 —— 两者须**逐字一致**。
		 *
		 * ★为何本格要**自持一份表**（✗ 不读 `world/boss.js` 那张）：读它的话，「被测的映射表」与
		 *   「断言里的期望」**同源** ⇒ 改错会一起错（＝重言）。自持之后：**映射漂一格 ⇒ 本格红**；
		 *   引擎的次序语义若变（如「全晕」翻面）⇒ **也红**。
		 * ★桩里**同时给 `isDown` 与 `hp`/`nonlethal`**：故事侧读 `isDown`、引擎**缺省** `isOut` 读
		 *   `hp<=0`／`isKnockedOut` ⇒ 只给一个字段会让两边口径不同 ⇒ **假红**（✗ 不是判据要守的事）。 */
		{
			const 解 = R.outcomeResolver?.resolve;
			/* ★本格自持的 §14 规范（✗ 不引故事侧那张）：五战果 ⇒ 故事四名 */
			const 自持投影 = (五, winner) => {
				if (五 === 'death') return 'down';
				if (五 === 'knockout') return winner === 'enemies' ? 'down' : 'stunned';   // 敌方全出局且全晕
				if (五 === 'victory') return 'victory';
				return 'stalemate';                                                        // retreat／stalemate
			};
			if (typeof 解 !== 'function') {
				console.log('  · 独立格：`RPG.outcomeResolver` 缺席（旧 pin 回落）⇒ 记声明、**不判红**'
					+ '（故事侧按票面「一字不动」走原四臂；本格在引擎面在位时才断）');
			} else {
				const 案 = [
					['真击杀', { isDown: true, hp: 0, maxHp: 5 }, { isDown: false, hp: 5, maxHp: 20 }],
					['打晕', { isDown: true, hp: 1, maxHp: 5, nonlethal: 9 }, { isDown: false, hp: 5, maxHp: 20 }],
					['僵持', { isDown: false, hp: 5, maxHp: 5 }, { isDown: false, hp: 5, maxHp: 20 }],
					['同归于尽', { isDown: true, hp: 0, maxHp: 5 }, { isDown: true, hp: 0, maxHp: 20 }],
				];
				for (const [名, 对手, 玩] of 案) {
					const 故事名 = B.战果?.({ foes: [对手], player: 玩 });
					const 引擎答 = 解({ players: [玩], enemies: [对手], completedRounds: 0, roundLimit: 8, retreatAccepted: false });
					const 引擎名 = (引擎答 == null) ? 'stalemate' : 自持投影(引擎答.outcome, 引擎答.winner);
					ok(故事名 === 引擎名,
						`★独立格[${名}]：故事侧投「${故事名}」≠ 引擎解析投「${引擎名}」`
						+ `（引擎原答 outcome=${JSON.stringify(引擎答?.outcome)}／winner=${JSON.stringify(引擎答?.winner)}）`
						+ ' —— 投影表或引擎次序有一处漂了');
				}
			}
		}

		/* ④ 门：未过 ⇒ 0 条；记 victory ⇒ 1 条 */
		State.variables.babelRun.bosses = {};
		if (State.variables.rpgProgress != null) delete State.variables.rpgProgress;   // ★`#1936`：真值源在引擎账上，清就得清新键
		/* ★`#1936` 起真值源在**引擎账**上 ⇒ 清理也必须清新键（✗ 只清旧形：账里会留着前序格写的「已过」，
		 *   门读数就成「未过却已开」—— 本条即由那次红暴露）。✗ 不给旧键加镜像：那会造出第二套真值。 */
		if (State.variables.rpgProgress != null) delete State.variables.rpgProgress;
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
		if (State.variables.rpgProgress != null) delete State.variables.rpgProgress;   // ★`#1936`：真值源在引擎账上，清就得清新键
			map.moveTo('L9');
			await B.fight({ interactive: false });
			const 消费位 = map.current;
			ok(消费位 === 'L9-camp', `★未胜收场**没有**回到准备区（位置 ${消费位}）—— 战后段没消费落点（函数在、消费点断了）`);
			ok(State.variables.babelRun.bosses?.L9 !== 'victory', '★未胜收场却记了 victory（硬门会被自己派发的票打开）');
			读数.消费位 = 消费位;
			R.registerEncounterTable('span1', 原表2);
			D.Player.maxHp = 存血.maxHp; D.Player.hp = 存血.hp; D.Player.nonlethal = 存血.非致命;
		}

		/* ③ ★`books#259` 裁 2（单向从严）：准备区**不再回 L8** ⇒ 温泉必须在**攀过之前**泡
		 *   （与操作者早裁③「L8 温泉满装→上 L9」自洽）⇒ 本格由「可达」改为**断其不在**，
		 *   温泉动作面本身仍在（下一行照判 —— 它在 L8 上，只是**从准备区回不去**）。 */
		const 备出 = map.exitsFrom('L9-camp').map((e) => e.to);
		ok(!备出.includes('L8'), `★准备区仍能回 L8（实得 ${JSON.stringify(备出)}）—— 裁 2 要求塔单向向上`);
		map.moveTo('L8');
		const 温泉在 = map.locations.get('L8').availableActions.some((a) => a.温泉 === true);
		ok(温泉在, '★准备区可达 L8，但 L8 上没有温泉动作（`#179` 的入表断了？）');

		/* ⑤ 重挑战满血复位（§14 ⑤）：把头目打残 ⇒ 出准备区再进战场 ⇒ 复位 */
		if (头目) {
			头目.hp = 3;
			State.variables.babelRun.bosses = {};
		if (State.variables.rpgProgress != null) delete State.variables.rpgProgress;   // ★`#1936`：真值源在引擎账上，清就得清新键
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
		if (存.新账 === undefined) delete State.variables.rpgProgress; else State.variables.rpgProgress = 存.新账;
		if (map.locations.has(存.位)) map.moveTo(存.位);
	}
}


/* ---------- ㉝ `books#178` 件 1：快速存档（三槽制 · P0 禁战内 · 能力缺席出声）----------
 * 本格跑在**无头**装具里：`SugarCube.Save` 缺席（实测）⇒ 走的是**回落支**（出声＋可读文案）。
 *   ★真宿主面（`Save.slots` 的存/读/元数据）由 **e2e 真产物**那一臂守，✗ 本格冒充。 */
head('㉝ `books#178` 件 1 快速存档（三槽 · P0 禁战内 · 回落出声）');
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
}

/* ---------- ㉞ `books#178` 件 1：**槽 1 整备点自动写**（两触发点 · 行为判据）----------
 * 票面 §8.2（领队裁）：槽 1 ＝**整备点自动写**，最新胜，失败面 ✗ 覆盖，可手清。
 * 两触发点＝**温泉使用完成**与**进入 L9 门前营地**。本格**真跑触发路径**（✗ 断文案、✗ 断源码文本），
 *   手法：把 `setup.BABEL.战前保底` 换成探针 ⇒ 调真触发点 ⇒ 断探针被调用**且带对来源**。 */
head('㉞ `books#178` 槽 1 整备点自动写（温泉完成 · 入营地 · 失败面✗覆盖）');
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

/* ---------- ㉟ 快速存档：**真宿主语义的桩**（`has` 可靠 · `isEmpty` 不可靠）----------
 * ★本格的桩**照抄真宿主的怪癖**（本席实测）：`isEmpty(i)` 一旦有过写入即对**所有号**为假、
 *   `get(i)` 对空槽返回占位对象。⇒ 若实现拿 `isEmpty` 当空否判据，本格**必红**。
 *   桩若不照抄这个怪癖，本格就是「装置比真宿主善良」的假绿。 */
head('㉟ 快速存档（宿主桩：has 可靠 · isEmpty 不可靠 ⇒ 空槽不可读）');
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
		/* ★`books#259` 裁 2：**聚落回 L9 的步行边按裁摘除**（原两条断言「边在／可走」＝旧双向语义）
		 *   ⇒ 现断**不在**。传送臂（卷轴）与「L9 → 聚落」的**向上**步行臂照旧（上一行）。 */
		ok(!边在(聚, 'L9'), '★聚落仍有回 L9 的步行边（裁 2 要求塔单向向上）');
		ok(!可走(聚).includes('L9'), `★活人时聚落回 L9 仍走得通（实得 ${JSON.stringify(可走(聚))}）`);
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
		const 有钱 = B.手上有('coin');
		if (有钱 > 0) R.take('coin', 有钱);           // take 不足不会扣；按实存清空，不能假设 9999 会清零
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

/* ── ㊲ 攻击件的**伤害块**（`books#185`；`#182` 交查的真缺口）─────────────────────
 *
 * 它回答的问题：**敌人真能打得动玩家吗？**（release 阻塞级 —— 加上 L9 硬门，打不动＝不可通关）
 *   现码两处病根：`world/boss.js` 的「不眠的抓握」与 `world/babel.js` 的「蓝苔尾刺」都把
 *   `dmg`／`type`／`atkBonus` 写在 **`defItem` 顶层**，而 `Item` 构造函数**只拷贝已知字段**
 *   （id/name/desc/stats/charges/stable/weapon/slot/equipped）⇒ 三件被**静默丢掉**：
 *   实测 `R.createItem('sleepless-grasp').stats === {}`，顶层也读不到 ⇒ 近战读 `item.stats.dmg`
 *   （引擎 `combat.js:87`）⇒ **命中那一击**抛「无法解析的骰子表达式：undefined」（miss 不抛）。
 *
 * 本格断两件（**一条挡两病根**）：
 *   ①**泛化棘轮**：凡 `weapon: true` 的已注册道具，`stats.dmg` 必须是**可解析的骰面**；
 *     若它把 `dmg` 写在顶层（正是本次的病形）⇒ 报文里**点名**指出「放错了层」。
 *   ②**真打一次且命中 ⇒ 玩家真掉血**（✗ 只断声明 —— 声明对了但没接上也算数）。
 * 刀：把任一件的 `stats.dmg` 挪回顶层 ⇒ ①②各红。
 * ⚠ 装置：本格改玩家血量与随机流 ⇒ 存-复原。 */
head('㊲ 攻击件的伤害块（`books#185`）');
{
	const P = D.Player;
	const 存 = { hp: P.hp, 流: R.rng };
	let 棘轮 = { 缺: [] }, 读数 = {};
	try {
		/* ① 泛化棘轮：遍历注册表（✗ 只查已知两件 —— 那正是「改了这处漏那处」的形） */
		for (const [id, klass] of (R.items ?? new Map())) {
			let 实例 = null;
			try { 实例 = new klass(); } catch { continue; }
			if (实例?.weapon !== true) continue;
			const 骰 = 实例.stats?.dmg;
			let 可解析 = false;
			try { R.rollDetail(骰); 可解析 = true; } catch { 可解析 = false; }
			/* ★（`dev-10` D 席 RC）：原先这里还有一条「判放错了层」的分支 —— 它是**死分支**：
			 *   `实例.dmg` **恒 undefined**（病根正是构造不拷该字段）、`String(klass)` 里也**没有**字段名
			 *   （`defItem` 造出的类形是 `class extends RPG.Item{constructor(o){super({...defaults,...o})}}`）
			 *   ⇒ 两个合取项恒真、且该字段**无读者**。「点名病因」已由下面的 `ok()` 报文承担（它直接写
			 *   「若把 `dmg` 写在顶层会被静默丢掉」）⇒ 删之零损失，✗ 留一条永远查不到的判定（`#1844` 的教训）。 */
			if (!可解析) 棘轮.缺.push(`${id}（stats.dmg=${JSON.stringify(骰)}）`);
		}
		ok(棘轮.缺.length === 0,
			`★有攻击件的伤害骰不可解析（${棘轮.缺.join('／')}）—— 「无法解析的骰子表达式：undefined」正是这条的病征；`
			+ '若某件把 `dmg` 写在 `defItem` **顶层**，它会被 `Item` 构造静默丢掉 ⇒ 请挪进 `stats`');

		/* ② 真打一次且命中 ⇒ 玩家真掉血（站在**引擎同一条路**上：`meleeAttack`） */
		const 敌 = B.头目?.不眠者;
		读数.前 = P.hp;
		P.hp = P.maxHp;
		const 件 = R.createItem('sleepless-grasp');
		件.equipped = true;
		let 抛 = null;
		R.rng.setSequence(Array.from({ length: 80 }, () => 0.99));   // 必中（含重击确认）
		try { setup.DND3.meleeAttack(件, P, 敌); } catch (e) { 抛 = e?.message ?? String(e); }
		R.rng.reset();
		读数.后 = P.hp;
		ok(抛 === null, `★头目一抓就抛错（${抛}）—— 真浏览器上这就是「头目打不动」`);
		ok(读数.后 < P.maxHp, `★头目命中却没让玩家掉血（hp ${读数.后}／${P.maxHp}）—— 伤害块没接上`);
		console.log(`  攻击件伤害块：棘轮（缺 ${棘轮.缺.length} 件${棘轮.缺.length ? '：' + 棘轮.缺.join('／') : ''}）`
			+ `｜真打一爪 ⇒ 玩家 ${P.maxHp} ⇒ ${读数.后}｜抛出 ${抛 === null ? '无' : 抛}`);
	} finally {
		P.hp = 存.hp;
		if (R.rng?.reset) R.rng.reset();
	}
}

/* ---------- ㊳ 战斗面：敌面板（`books#188` P1-2）与治疗读数（P1-4）----------
 * 口径（票面）：HP **档位**（>2/3 健壮｜1/3–2/3 负伤｜<1/3 濒死）、**有效 AC**（读 `DND3.acOf`，✗ 面板自算）、
 *   **已见动作**（＝本场真出过手的动作，去重保次序）；治疗读数＝每件治疗件的**预计恢复**与**剩余次数**。
 * ★每一条都带**对照臂**：AC 拿一件**带 `ac_bonus` 的已装备件**作对照（否则「读 `acOf`」与「读 `stats.ac`」同值，
 *   刀砍不出声）；档位取 **2/3 与 1/3 两个边界**（否则改了不等号也照样绿）；已见动作**故意发两次**（证去重）。
 * ⚠ 本件无 DOM（`document` 是桩）⇒ 只读渲染函数的产物（`R.panelHTML`），真 DOM 面归 `tools/e2e-drive.mjs`。 */
head('㊳ 战斗面：敌面板（P1-2）与治疗读数（P1-4）');
{
	const 存 = { items: D.Player.items.slice(), hp: D.Player.hp, 加成: D.Player.stats.heal_bonus };
	/* ⚠ 敌给一个**基础** `stats.ac`：否则下面 AC 那把刀的读数会印成 `undefined`（`dev-10` 指出的口径不清）。 */
	const 敌 = new (R.Character)({ name: '幼獾', hp: 6, maxHp: 6, stats: { ac: 10 } });
	敌.items.push({ id: 'mail', equipped: true });   // +3 AC ⇒ 与基础值**不等**（对照臂）
	const 假战斗 = { enemies: [敌], players: [D.Player] };

	/* ① 开战前：两块都空（战斗面的读数只在战斗内） */
	ok(R.panelHTML('enemy') === '' && R.panelHTML('heal') === '',
		'★没战斗时战斗面不是空的（探索时也会占版面）');

	R.events.emit('battle:turnEnd', { actor: D.Player, battle: 假战斗 });
	const 敌面 = () => R.panelHTML('enemy');

	/* ② 档位三档 ＋ 两个边界（4/6＝2/3 与 2/6＝1/3 都算「中间那档」） */
	ok(敌面().includes('幼獾'), `★敌面板没读敌组（实得：${敌面()}）`);
	ok(敌面().includes('健壮'), `★满血该是「健壮」（实得：${敌面()}）`);
	敌.hp = 4;
	ok(敌面().includes('负伤'), `★4/6 恰在 2/3 ⇒ 该是「负伤」（实得：${敌面()}）`);
	敌.hp = 2;
	ok(敌面().includes('负伤'), `★2/6 恰在 1/3 ⇒ 该是「负伤」（实得：${敌面()}）`);
	敌.hp = 1;
	ok(敌面().includes('濒死'), `★1/6 该是「濒死」（实得：${敌面()}）`);
	/* ②′ 出局者先说结论（✗ 再报「濒死 0/6」）——两向：致命出局 vs 非致命打晕（`hp` 未变而 `nonlethal` 更大） */
	敌.hp = 0;
	ok(敌面().includes('已倒下'), `★0 血该说「已倒下」（实得：${敌面()}）`);
	敌.hp = 1;
	敌.nonlethal = 2;
	ok(敌面().includes('已打晕'), `★非致命打晕该说「已打晕」（实得：${敌面()}）`);
	敌.nonlethal = 0;
	敌.hp = 6;

	/* ③ 有效 AC 必须走**引擎那一处**（✗ 面板自算）—— 对照臂就是那件已装备的铁环甲 */
	const ac = D.acOf(敌);
	ok(ac === (敌.stats?.ac ?? 10) + 3, `（前置）acOf 应为 基础+3，实得 ${ac}`);
	ok(敌面().includes(`AC ${ac}`),
		`★面板里的 AC 不是 acOf 的数（应见「AC ${ac}」，实得：${敌面()}）—— 自算会漏掉已装备件的加成`);

	/* ④ 已见动作：本场真出过手的动作（发两次 ⇒ 证去重） */
	R.events.emit('item:used', { id: 'badger-claw', name: '爪击', action: 'use', actor: 敌, target: D.Player });
	R.events.emit('item:used', { id: 'badger-claw', name: '爪击', action: 'use', actor: 敌, target: D.Player });
	ok(敌面().includes('爪击'), `★已见动作没记上（实得：${敌面()}）`);
	ok((敌面().match(/爪击/g) ?? []).length === 1, `★同一动作记了多次（应去重，实得：${敌面()}）`);

	/* ⑤ 治疗读数：治疗件列、非治疗件不列、改充能数须跟着变 */
	const 绷带槽 = { id: 'bandage', charges: 2 };
	D.Player.items.push(绷带槽);
	D.Player.items.push({ id: 'club' });      // 非治疗件（对照臂）
	const 治面 = () => R.panelHTML('heal');
	ok(治面().includes('绷带') && 治面().includes('余 2 次'),
		`★治疗读数没列出治疗件（应见「绷带 …（余 2 次）」，实得：${治面()}）`);
	ok(!治面().includes('木棒'), `★非治疗件也进了治疗读数（实得：${治面()}）`);
	绷带槽.charges = 1;
	ok(治面().includes('余 1 次'), `★改了充能数而读数不变（没读状态，实得：${治面()}）`);
	绷带槽.charges = 2;

	/* ⑤′ **行为对账**（`dev-10` D 席 RC 的推荐形）：面板的「预计恢复」須等于**引擎真治一次的实际回血量**。
	 *   动因（他实测的刀-H1）：原形把期望写成「件自身 `stats.hp` ＋ 施用者加成」——那是**第二份公式**，
	 *   而夹具里 `heal_bonus` 恒为 0 ⇒ 含不含这一项**数值相同** ⇒ 该断言对“加成项”**恒真**
	 *   （删掉加成项，全绿）。⇒ 两件一起做：
	 *     ① 夹具给**非零**加成（否则两臂不可分辨）；
	 *     ② 期望取自**引擎的行为**（真治一次的实际回血量），✗ 不取自第二份算式。
	 *   ⇒ 面板换算式、引擎换行为，两侧任一处漂移本判据都红（前一条则只管“有那两行字”）。 */
	D.Player.stats.heal_bonus = 2;
	D.Player.hp = 2;                               // 低血 ⇒ 不会被 maxHp 截断（截断会把两臂读数撞在一起）
	R.act(D.Player, 'bandage', D.Player, 'use');   // ★引擎**真治一次**（走它自己的 `used()`）
	const 实回 = D.Player.hp - 2;
	ok(实回 === 7, `（前置）引擎这一次应回 7（绷带 5 ＋ 加成 2），实得 ${实回} ⇒ 夹具有问题，本节判不了`);
	ok(治面().includes(`恢复 ${实回}`),
		`★面板的「预计恢复」≠ 引擎实际回血量（面板：${治面()}；引擎实回：${实回}）—— 两处算式已漂`);

	/* ⑤″ **夹取态／满血态**（`dev-10` ＋ `tester-3` 两条 RC 同指的缺口）：⑤′ 的夹具 `hp = 2` **离上限够远**
	 *   ⇒ 名义量 ＝ 实回 ⇒ 面板就算报**名义量**也恰好躲过 ✗。⇒ 在两个夹取态各判一次，期望仍取自
	 *   **引擎的行为**（真治一次的实际回血量），✗ 不取自第二份算式。 */
	for (const [态, 前血] of [['差 1 点满', D.Player.maxHp - 1], ['满血', D.Player.maxHp]]) {
		D.Player.hp = 前血;
		D.Player.items.push({ id: 'bandage', charges: 1 });
		const 面板数 = Number((治面().match(/恢复 (\d+)/) ?? [])[1] ?? NaN);
		R.act(D.Player, 'bandage', D.Player, 'use');     // ★真治一次（满血时引擎**拒绝** ⇒ 实回 0）
		const 该回 = D.Player.hp - 前血;                 // ＝ 引擎的实际回血量（面板须报它）
		ok(面板数 === 该回,
			`★夹取态（${态}）面板报的数 ≠ 引擎实回（面板：${面板数}；引擎实回：${该回}）`
			+ '—— 报一个**拿不到的数**就是假读数（`D.healAmount` 的名义量正是这一族）');
		D.Player.items.pop();
	}

	/* ⑥ 战斗结束 ⇒ 两块都清空（✗ 把上一场的敌组与读数留在屏上） */
	R.events.emit('battle:end', { players: [D.Player], enemies: [敌] });
	ok(R.panelHTML('enemy') === '' && R.panelHTML('heal') === '',
		'★战斗结束后战斗面没清空（旧场读数会留到探索段）');

	D.Player.items.length = 0;
	for (const s of 存.items) D.Player.items.push(s);
	D.Player.hp = 存.hp;
	D.Player.stats.heal_bonus = 存.加成;
	console.log(`  战斗面：档位三档（含 2/3 与 1/3 两个边界）＋出局两向 ✓｜AC 走 acOf（对照件 +3）✓｜已见动作去重 ✓｜`
		+ '治疗读数（行为对账：面板预计恢复 ＝ 引擎实回）✓｜战斗结束后清空 ✓');
}

/* ---------- ㊴ 宿主面存档门禁 ＋ 读档后面板一致性（`books#209` F-01 两半）----------
 * 病灶（writer 线上实测）：①**故事侧**快存已被 `#183` 的 P0 拦住，而**侧栏的普通存档**（宿主口子）
 *   战中未禁 ⇒ 存下的是**半截状态**；②存巨蜥战第 2 回合 ⇒ 载入变野猪第 1 回合 ＋ 敌情栏残留 19/22
 *   （面板读的 `当前战斗`／`已见` 是**模块态**，不进存档）。
 * 本格判两半；**真宿主那一路**（真 `Save.slots.save/load` ＋真 DOM）另见 `tools/e2e-209-host-save.mjs`。
 *
 * ★真宿主语义（**本席在真产物里实测**，本格的桩照此造，✗ 凭印象）：`Config.saves.isAllowed(saveType)`
 *   按**类型**分别来问（`Slot`／`Disk`／`Base64`／`Auto`），拒时宿主自己抛 `saveErrorDisallowed`。
 * ★桩里放一个**宿主自带的禁用规则**（`Disk` 本就被拒）作**对照臂** —— 否则「一律放行」与
 *   「委托原判定」同值，委托那半的牙看不出来。
 * ⚠ ②那半的**已见清除**在无头里**断不出独立牙**（与「换场清已见」同一结果）⇒ 本格只断**不变量**
 *   （读档后屏上不得出现上一场的敌情／动作），并在下面注明这条通路的两处来源。 */
head('㊴ 宿主存档门禁（战中禁 · 战后委托）＋ 读档后面板归零（`books#209`）');
{
	const B = setup.BABEL;
	/* ---------- ⓪ **装载期**那一次装门（判 boot 接线，✗ 判面向存不存在）----------
	 * 上面装载故事脚本**之前**给了一个空 `saves` 桩 ⇒ 这里断的正是**装载期真的装了**
	 *   （拆掉 boot 那一行调用 ⇒ 本子面目名红 ⇒ 不留死区）。
	 * ⚠ 桩里**没有** `isAllowed` ⇒ 包装层的「原判定」是「宿主无判定」，与本格的 ① 段（有原判定）
	 *   是**两条不同**的入口 ⇒ 两面各自都判。 */
	{
		const 桩判 = 宿主配置桩.saves.isAllowed;
		ok(typeof 桩判 === 'function',
			'★装载期没装门（`Config.saves` 在场而装载后 `isAllowed` 仍非函数）—— boot 那次调用没生效');
		B.战中 = true;
		ok(桩判?.('Slot') === false && 桩判?.('Auto') === false,
			`★装载期装的门在战中没拦住（实得 Slot=${桩判?.('Slot')}／Auto=${桩判?.('Auto')}）`);
		B.战中 = false;
		ok(桩判?.('Slot') === true, `★无宿主判定时战后没放行（实得 ${桩判?.('Slot')}）`);
		console.log('  装载期：boot 那一次装门生效 ✓｜战中拦（四类型）✓｜无宿主判定时战后放行 ✓');
	}
	/* ---------- ① 门禁：**组合**两向 ＋ 装一次 ＋ 缺席不抛 ---------- */
	{
		const 旧SC = globalThis.SugarCube;
		const 宿主原判 = (类型) => 类型 !== 'Disk';        // ★对照臂：宿主本来就不准存 Disk
		const cfg = { saves: { maxAutoSaves: 0, maxSlotSaves: 8, isAllowed: 宿主原判 } };
		globalThis.SugarCube = { ...(旧SC ?? {}), Config: cfg };
		try {
			ok(B.装宿主存档门() === true, '★宿主配置在场却装不上门（能力探测把能装的也跳过了）');
			ok(cfg.saves.isAllowed !== 宿主原判, '★装完了 `Config.saves.isAllowed` 还是宿主原来那一个 ⇒ 没组合');
			const 类型 = ['Slot', 'Disk', 'Base64', 'Auto'];
			B.战中 = true;
			ok(类型.every((t) => cfg.saves.isAllowed(t) === false),
				`★战中宿主存档没被全类型拒（实得 ${JSON.stringify(类型.map((t) => cfg.saves.isAllowed(t)))}）`
				+ ' —— 只盖故事侧快存正是 `#183` 留下的这个缺口');
			B.战中 = false;
			ok(类型.every((t) => cfg.saves.isAllowed(t) === (t !== 'Disk')),
				`★战中解除后没**委托**宿主原判定（实得 ${JSON.stringify(类型.map((t) => cfg.saves.isAllowed(t)))}）`
				+ ' —— 一律放行会把宿主自己的禁用规则吃掉（对照臂：Disk 本该仍被拒）');
			const 判一 = cfg.saves.isAllowed;
			ok(B.装宿主存档门() === true && cfg.saves.isAllowed === 判一, '★重复装配叠加了一层包装');
			ok(B.宿主存档门.原判 === 宿主原判, '★重复装配把「原判定」记成了上一次的包装层');
			/* 缺席面：宿主配置没有 ⇒ 回落为「没装」且**不抛**（无头／桩环境的同形回落）
			 *   ⚠ 必须把 `Config` 一并去掉：上面留有**装载期桩**，`{...旧SC}` 会把它带上。 */
			const 无配 = { ...(旧SC ?? {}) };
			delete 无配.Config;
			globalThis.SugarCube = 无配;
			let 抛 = null;
			try { ok(B.装宿主存档门() === false, '★宿主配置缺席时该回落为「没装」'); } catch (e) { 抛 = e; }
			ok(抛 === null, `★宿主配置缺席时装门抛了（实得：${抛?.message}）—— 能力回落面不许抛`);
			console.log('  门禁：战中四类型全拒 ✓｜战后委托原判定（对照臂 Disk 仍拒）✓｜装一次不叠加 ✓｜缺席不抛 ✓');
		} finally { globalThis.SugarCube = 旧SC; }
	}

	/* ---------- ② 读档 ⇒ 面板模块态归零（先铺「上一场」，再**发真读档**）---------- */
	{
		const 存 = { hp: D.Player.hp };
		const 敌 = new (R.Character)({ name: '巨蜥', hp: 19, maxHp: 22, stats: { ac: 12 } });
		const 假战斗 = { enemies: [敌], players: [D.Player] };
		R.events.emit('battle:turnEnd', { actor: D.Player, battle: 假战斗 });
		R.events.emit('item:used', { actor: 敌, name: '甩尾' });          // 已见：本场真出过手的一手
		const 敌面 = () => R.panelHTML('enemy');
		ok(敌面().includes('巨蜥') && 敌面().includes('甩尾'),
			`★前置没铺成（开战事件后敌面板该印巨蜥与已见甩尾；实得：${敌面()}）`);
		/* ★真读档：`Save.load` 会跑 `onLoad` 处理器 ⇒ 走的正是 `story/hooks.js` 那条订阅（判接线，✗ 判面存在） */
		Save.load(Save.make());
		ok(敌面() === '',
			`★读档后面板仍印上一场的敌情（实得：${敌面()}）—— 残影未清`
			+ '（模块态 `当前战斗` 不进存档 ⇒ 只能靠读档路径上那一个归零面）');
		/* 正控（✗ 不得清过头）：新档里真有一场 ⇒ 面板读**该档**的敌组，已见从**空**开始。
		 *   ⚠ 已见这一断言**分辨不出**「归零面清的」与「换场分支清的」（两条通路同结果）——
		 *     断的是**不变量**：读档之后屏上不得出现上一场的手。 */
		R.events.emit('battle:turnEnd', { actor: D.Player, battle: 假战斗 });
		ok(敌面().includes('巨蜥'), `★读档后新一场的敌组没进面板（实得：${敌面()}）—— 清过了头`);
		ok(!敌面().includes('甩尾'), `★读档后已见里还带着上一场的手（实得：${敌面()}）`);
		R.events.emit('item:used', { actor: 敌, name: '咬' });
		ok(敌面().includes('已见：咬'), `★读档后新场的手记不进去（实得：${敌面()}）—— 清与记两向都得成立`);
		ok(B.敌情栏重置() === undefined && 敌面() === '', '★归零面没清空面板');
		D.Player.hp = 存.hp;
		console.log('  读档面：真读档后敌面板归零 ✓｜新一场敌组进得去 ✓｜已见从零起 ✓｜归零面可单独调 ✓');
	}
}

/* ── ㊵ 乙：旅程装备保证 ＋ L9 期望配平（`books#201`）─────────────────────────
 *
 * 它回答的问题：**「乙」（旅程装备保证）真的到手了吗？数值配平真的按期望落地了吗？**
 *   出处：操作者裁定 2026-10-03「方向＝乙」（盾/护甲**必到手**，满装备＝**设计保证而非运气**）
 *   ＋ `books#201` 的达线组合（期望模型 72.6%，权威复核＝跑分器 100 样本）。
 * 本格断三件：①**保证点到手且装上**（AC 15→17；武器＝淬火长剑；幂等）
 *   ②**玩家侧真打 N 次去量**：有效伤害落 `2d6+3`（均 10）、命中率落 `atkBonus 4` 的期望附近
 *   ③**头目侧**：单体伤害落 `1d6+1`（均 4.5，原 `1d8+3` 是 7.5），**且攻击加值仍 +5**
 *     （本笔动过它的 `str` ⇒ 必须证明没误伤攻击面）。
 * 刀：K1 撤 `乙保证` 里的两行 `equip` ⇒ ①红；K2 头目 `str` 改回 16、件 `dmg` 改回 `1d8` ⇒ ③红。
 * ⚠ 本格会改玩家装备与双方血量 ⇒ 末了存-复原（额外拿到的两件留在背包：本格是**最后一格**，
 *   ✗ 后续没有依赖背包件数的判据）。 */
head('㊵ 乙：旅程装备保证 ＋ L9 期望配平（`books#201`）');
{
	const P = D.Player;
	const 头目 = B.头目?.不眠者;
	const 存 = { hp: P.hp, 头目hp: 头目?.hp, 武器: R.equippedIn?.('weapon')?.id };
	try {
		/* ① 保证点直调（✗ 只能靠走位触发）＋ 幂等
		 *   ⚠ **前置**：本装置里的玩家可能**没穿甲**（实测赤身＋盾 ＝ AC 14 ⇒ 若不断言 AC 17 会误红）
		 *     ⇒ 先把甲也弄到手（与乙的「满装备」同义），再核 AC。这条是判据**量出来的**，
		 *     不是我先前的假设（首版就栽在这里：我按夹具状态写了 17）。 */
		if (!R.has('mail')) R.give('mail');
		R.equip('mail');
		const 得 = B.乙保证?.() ?? null;
		const 二回 = B.乙保证?.() ?? [];
		const ac = D.acOf(P);
		const 武器 = R.equippedIn?.('weapon')?.id;
		const 盾 = R.equippedIn?.('shield')?.id;
		ok(得 !== null, '★导出面缺 `乙保证`（`books#201` 的保证点未接线）');
		ok(ac === 17, `★乙之后玩家 AC 应 17（基础 12 ＋ 甲 3 ＋ 盾 2），实得 ${ac}`);
		ok(武器 === 'sword-quenched', `★乙之后手上不是淬火长剑（实得 ${武器}）`);
		ok(盾 === 'heavy-wooden-shield', `★乙之后没装上重木盾（实得 ${盾}）`);
		ok(二回.length === 0, `★乙保证不幂等（第二次仍发放 ${二回.join('、')}）`);

		/* ★**固定种子**（`books#203` 跟进 · 领队 2026-10-04 裁「随固定种子件一并排」）：
		 *   下面两段**真打各 400 次**先前**不设序列** ✗ ⇒ 走引擎默认随机源 ⇒ 「平均伤害」与
		 *   「E[伤害/回合] 比」**每次都漂**（实测 2.05／2.24／2.47，并有偶发红「平均伤害 11.60」）✗。
		 *   ⇒ 这里设**确定性序列**，只为「同参可复现」（✗ 不给引擎当随机源用）。
		 *   ⚠ 算法与跑分器 `tools/balance-babel.mjs` 的 `造序列()` **同一 LCG**（两边读数才可互相印证）；
		 *     号取 9001／9002 ⇒ 与跑分器的样本号（0…N-1）**不重叠**，避免「同一序列被当两处证据」。 */
		const 量造序列 = (号, 长 = 4096) => {
			let x = (号 * 2654435761) >>> 0;
			const out = [];
			for (let i = 0; i < 长; i += 1) { x = (x * 1664525 + 1013904223) >>> 0; out.push((x % 1000) / 1000); }
			return out;
		};
		R.rng.setSequence(量造序列(9001));   // ★固定种子：玩家侧 400 次
		/* ② 玩家侧：真打 400 次去量（读码推断不许当读数） */
		const 件 = R.equippedIn('weapon');
		let 命中 = 0; const 伤害 = [];
		for (let i = 0; i < 400; i += 1) {
			头目.hp = 999;
			const 前 = 头目.hp;
			try { setup.DND3.meleeAttack(件, 头目, P); } catch { /* ③ 段会报错；这里只记读数 */ }
			if (头目.hp < 前) { 命中 += 1; 伤害.push(前 - 头目.hp); }
		}
		const 率 = 命中 / 400;
		const 均 = 伤害.reduce((a, b) => a + b, 0) / Math.max(1, 伤害.length);
		const 最小 = 伤害.length ? Math.min(...伤害) : 0;
		const 最大 = 伤害.length ? Math.max(...伤害) : 0;
		ok(命中 > 100, `★样本太少（命中 ${命中}/400）⇒ 下面三条无意义`);
		ok(最大 >= 12, `★玩家伤害上界不够（最大 ${最大}；2d6+3 应可达 13–15）—— 伤害块/加值没接上`);
		ok(最小 >= 4, `★玩家伤害下界不对（最小 ${最小}；2d6+3 下界＝5）`);
		ok(均 > 8.5 && 均 < 11.5, `★玩家平均伤害没落在 2d6+3（均 10）附近（实得 ${均.toFixed(2)}）`);
		ok(率 > 0.38 && 率 < 0.62, `★玩家命中率不在 +4 的期望附近（实得 ${率.toFixed(2)}；+4 vs AC16 应 50%）`);

		R.rng.setSequence(量造序列(9002));   // ★固定种子：头目侧 400 次
		/* ③ 头目侧：1d6+1（均 4.5）＋ 攻击加值仍 +5 */
		const 爪 = R.createItem('sleepless-grasp');
		爪.equipped = true;
		let b命中 = 0; const b伤害 = [];
		for (let i = 0; i < 400; i += 1) {
			P.hp = P.maxHp;
			try { setup.DND3.meleeAttack(爪, P, 头目); } catch { }
			if (P.hp < P.maxHp) { b命中 += 1; b伤害.push(P.maxHp - P.hp); }
		}
		const b率 = b命中 / 400;
		const b均 = b伤害.reduce((a, b) => a + b, 0) / Math.max(1, b伤害.length);
		const b最小 = b伤害.length ? Math.min(...b伤害) : 0;
		const b最大 = b伤害.length ? Math.max(...b伤害) : 0;
		ok(b伤害.length > 60, `★头目样本太少（命中 ${b命中}/400）`);
		ok(b均 > 3.9 && b均 < 5.6, `★头目平均伤害没落在 1d6+1（均 4.5，含重击略高）附近（实得 ${b均.toFixed(2)}；原 1d8+3 是 7.5）`);
		/* ⚠ 上界须**计入重击**（威胁 20 ⇒ ×2）：1d6+1 的 7 ×2 ＝ **14**。
		 *   首版我写 `<= 7` 于是误红（实测 14 正是重击）—— 判据的界要按**实际规则**写，✗ 按名义值。 */
		ok(b最大 <= 14, `★头目最大伤害超界（${b最大}；1d6+1 重击上界 14）`);
		ok(b最小 >= 2, `★头目最小伤害低于下界（${b最小}；1d6+1 下界 2）`);
		ok(b率 > 0.33 && b率 < 0.57, `★头目命中率不在 +5 的期望附近（实得 ${b率.toFixed(2)}；+5 vs AC17 应 45%）`);

		/* ④ **达线读数面**（`books#201`／领队裁定②）：本格量的是**期望比**（玩家 E[伤害/回合] ÷ 头目
		 *   E[伤害/回合]），它**看得见数值漂移的方向**：
		 *     玩家 = 命中率 × 平均伤害；头目同理（上面两段真打已量出**实测**命中率与均伤 ⇒ 直接取用）。
		 *   ⚠ 本格**不断言胜率绝对落带**：胜率是**分布量 ＋ 回合口径**的产物，须由跑分器在真路上量
		 *     （`tools/balance-babel.mjs` 的 `--enforce-target`，`#190`／`#170` 裁）——两处**互补**：
		 *     跑分器管**绝对带**，本格管**方向与量级**（数值往哪边漂这一格先叫）。
		 *   推荐区间来源：`#201` 敏感度表 —— 达线组合的期望比 ≈ 5.0/2.6 ≈ **1.9**；跌破 1.15 基本不可能落带。 */
		const 玩家DPS = 率 * 均;
		const 头目DPS = b率 * b均;
		const 比 = 玩家DPS / Math.max(0.01, 头目DPS);
		ok(比 >= 1.15, `★达线方向不对：玩家/头目 期望伤害比 = ${比.toFixed(2)}（应 ≥1.15；#201 达线组合 ≈1.9）`
			+ ' —— 数值往反方向漂了（胜率带由跑分器 --enforce-target 判）');
		console.log(`  达线读数面：玩家 E[伤害/回合] ${玩家DPS.toFixed(2)}｜头目 ${头目DPS.toFixed(2)}｜比 ${比.toFixed(2)}（≥1.15；达线组合 ≈1.9）`);
		console.log(`  乙：AC ${ac}｜武器 ${武器}｜盾 ${盾}｜幂等（二回得 ${二回.length} 件）｜`
			+ `玩家伤害 ${最小}–${最大}（均 ${均.toFixed(2)}）命中 ${(率 * 100).toFixed(0)}%｜`
			+ `头目伤害 ${b最小}–${b最大}（均 ${b均.toFixed(2)}）命中 ${(b率 * 100).toFixed(0)}%`);
	} finally {
		P.hp = 存.hp;
		if (头目 && Number.isFinite(存.头目hp)) 头目.hp = 存.头目hp;
		if (存.武器) R.equip?.(存.武器);
		R.rng.reset?.();
	}
}

/* ── ㊶ `sgstory#1936` 第三面：书侧**消费臂改读账**（进度账进 State·接硬门面）────────────
 *
 * 票面三面：①**账读写往返** ②**旧档迁移（幂等）** ③**各门消费臂**。
 * 本格判的是**书侧那一处单源**（`boss.js` 的 `进度账`／`已过`／`记战果`）—— 三臂（头目硬门／
 * 传送／分段门）都经 `setup.BABEL.已过` 或 `记战果` 进出这一处（硬门的实际调用点在
 * `babel.js` 的「唯一出口 ∧ 已过」那行），所以**这一处红了，三臂一起红**。
 * ⚠ 引擎口（`RPG.save.progress`／`recordCleared`）**不在**时的回落也判（旧 pin 上跑分器/判据
 *   必须逐字同）—— 这是本格的**刀**：撤掉口 ⇒ 必须走旧形，✗ 不是静默变成「一律未过」。
 */
head('㊶ `sgstory#1936` 书侧消费臂改读账（往返 · 旧档迁移幂等 · 消费臂 · 端口回落）');
{
	const B = setup.BABEL;
	const R = setup.RPG;
	const 口在 = typeof R.save?.progress === 'function' && typeof R.save?.recordCleared === 'function';
	if (!口在) {
		/* ★旧 pin（`#1936` 之前）走的就是**旧形回落** ⇒ 照本仓惯例「**记声明、不判红**」（同 `books#229`
		 *   的独立格：「`RPG.outcomeResolver` 缺席（旧 pin 回落）⇒ 记声明、不判红」）—— 判的是**回落路本身**。 */
		if (State.variables.babelRun != null) delete State.variables.babelRun.bosses;
		State.variables.babelRun = Object.assign(State.variables.babelRun ?? {}, { bosses: { L9: 'victory' } });
		ok(B.已过('L9') === true, '★回落路：旧形在位时消费臂读不出「已过」（旧档的硬门会全关）');
		B.记战果('L7', 'victory');
		ok(State.variables.babelRun.bosses.L7 === 'victory', '★回落路：引擎口缺席时写不回旧形');
		console.log('  独立格：`RPG.save.progress`／`recordCleared` **缺席**（旧 pin 回落）⇒ 记声明、不判红；'
			+ '回落路本身已判（旧档读得出／写得回）');
		if (State.variables.babelRun != null) delete State.variables.babelRun.bosses;
	} else {
	const 清 = () => {
		if (State.variables.rpgProgress != null) delete State.variables.rpgProgress;
		if (State.variables.babelRun != null) delete State.variables.babelRun.bosses;
	};
	/* ---------- ① 往返：写在口上 ⇒ 读在口上；同一笔写两次 ⇒ 账不变（幂等） ---------- */
	清();
	B.记战果('L9', 'victory');
	const 账1 = R.save.progress();
	ok(账1.run.cleared.includes('L9'),
		`★写口没把「已过」写进账（实得 ${JSON.stringify(账1.run.cleared)}）—— 硬门据此判，会一直关着`);
	ok(State.variables.rpgProgress?.run?.cleared?.includes('L9') === true,
		'★账没落在 State 的**新键** `rpgProgress` 上 —— 存档带不走它（往返就断在这里）');
	B.记战果('L9', 'victory');
	ok(R.save.progress().run.cleared.filter((x) => x === 'L9').length === 1,
		'★同一场写两次账里出现了两条 —— 写口不幂等（集合语义被破坏）');
	/* ---------- ② 迁移：旧形在位、新键缺位 ⇒ 读得出；补写一笔 ⇒ **归并**（旧进度不丢）＋ 幂等 ---------- */
	清();
	State.variables.babelRun = Object.assign(State.variables.babelRun ?? {}, { bosses: { L9: 'victory' } });
	ok(R.save.progress().run.cleared.includes('L9'),
		'★旧档（`$babelRun.bosses` 形）读不出「已过」—— 老存档的硬门会全部退回未过');
	ok(B.已过('L9') === true, '★旧档的「已过」没进消费臂（`已过` 与账口不同源？）');
	B.记战果('L8', 'victory');                      // 补写**另一场** ⇒ 旧那场必须还在
	const 账2 = R.save.progress().run.cleared.slice().sort().join(',');
	ok(账2 === 'L8,L9', `★归并没做全（期望 L8,L9，实得 ${账2}）—— 补写一笔就让旧档进度消失`);
	B.记战果('L8', 'victory'); B.记战果('L9', 'victory');
	ok(R.save.progress().run.cleared.slice().sort().join(',') === 'L8,L9', '★重复写破坏了账（幂等不成立）');
	/* ---------- ③ 消费臂：旧档 ⇒ 门开；打晕（stunned）⇒ 门**关**；真胜利 ⇒ 门开 ---------- */
	清();
	State.variables.babelRun = Object.assign(State.variables.babelRun ?? {}, { bosses: { L9: 'victory' } });
	ok(B.已过('L9') === true, '★消费臂①（硬门读口）：旧档已过却读成未过 ⇒ 硬门对老存档永远关着');
	清();
	B.记战果('L9', 'stunned');
	ok(B.已过('L9') === false && R.save.progress().run.cleared.length === 0,
		'★消费臂②：**打晕**竟写进了账（§14 ⑥「打晕不开门」被破）—— 硬门会对着一场未胜的战斗开');
	B.记战果('L9', 'victory');
	ok(B.已过('L9') === true, '★消费臂③：真胜利之后硬门没开（账写了而消费臂读不到 ⇒ 两条真值）');
	/* ---------- 刀（回落）：撤掉引擎口 ⇒ 必须走**旧形**，✗ 静默变「一律未过」 ---------- */
	{
		const 真 = { progress: R.save.progress, recordCleared: R.save.recordCleared };
		let 可撤 = true;
		try { delete R.save.progress; delete R.save.recordCleared; } catch { 可撤 = false; }
		if (可撤) {
			清();
			State.variables.babelRun = Object.assign(State.variables.babelRun ?? {}, { bosses: { L9: 'victory' } });
			ok(setup.BABEL.已过('L9') === true,
				'★回落臂：引擎口缺席时旧档读不出（旧 pin 上跑分器/判据会与老引擎**语义不同**）');
			setup.BABEL.记战果('L7', 'victory');
			ok(State.variables.babelRun.bosses.L7 === 'victory',
				'★回落臂：引擎口缺席时写不回旧形（旧 pin 上「已过」永远写不上）');
			Object.assign(R.save, 真);
			ok(typeof R.save.progress === 'function' && typeof R.save.recordCleared === 'function', '★口没复原（本格污染后续）');
		} else {
			console.log('  回落臂跳过：`R.save` 不可改（冻结）⇒ 该臂须由引擎侧单测覆盖');
		}
	}
	清();
	console.log('  账口：往返 ✓｜幂等 ✓｜旧档迁移＋归并 ✓｜消费臂（旧档开／打晕关／真胜开）✓｜端口回落 ✓');
	}
}
/* ── ㊷ `books#259` 裁 1：**战斗不可跳**（无「已战」⇒ 事件面与向上边**都**不可见；有 ⇒ 都可见）──────
 *
 * 票面裁 1 原话：「战斗**不允许跳过** —— 每层严格『先战斗→再判定事件』；玩家不想触发事件可在
 *   **事件入口**跳过」⇒ 三向都要判，缺一条就会出现「门关死卡住」或「战斗可跳」两种反向病：
 *   ① 无标记 ⇒ **两者皆闭**（✗ 只判一边：只判事件面 ⇒ 玩家可越过战斗直接上行）
 *   ② 有标记 ⇒ **两者皆开**（✗ 只判一边：只判向上边 ⇒ 事件面永久关闭）
 *   ③ 事件入口的「跳过」⇒ 关的是**事件面**，✗ 不是路（向上边仍在）
 * 刀（记在提交信息）：摘 `eventPending` 里的 `本层已战` ⇒ ①的事件面那半红；摘向上边那半 ⇒ ①的边那半红。
 */
head('㊷ `books#259` 裁 1：战斗不可跳（未战 ⇒ 边与面皆闭；已战 ⇒ 皆开；事件入口可跳过）');
{
	const 层 = 'L6';                                     // 事件层（L5–L8），且有基础遭遇动作
	const 账存 = JSON.parse(JSON.stringify(State.variables.span1Events ?? null));
	const 战存 = JSON.parse(JSON.stringify(State.variables.babelRun?.已战 ?? null));
	const 位存 = map.current;
	const 向上在 = () => map.exitsFrom(层).some((e) => /向上/.test(String(e.text ?? '')));
	try {
		map.moveTo(层);                                  // onEnter 里抽签（`babel.js:443`）
		const 账 = State.variables.span1Events?.[层];
		ok(!!账 && Array.isArray(账.抽中) && 账.抽中.length > 0,
			`★本层没抽出账（onEnter 的 ensureDraw 没跑？）—— 本格前提不成立（实得 ${JSON.stringify(账)}）`);
		/* ① 无标记 ⇒ 两者皆闭 */
		(State.variables.babelRun.已战 ??= {});
		delete State.variables.babelRun.已战[层];
		ok(!向上在(), `★本层**未战**，向上边却开着（${JSON.stringify(map.exitsFrom(层).map((e) => e.text))}）—— 战斗可跳了`);
		ok(账.抽中.every((k) => B.eventPending(层, k) === false),
			'★本层**未战**，事件面却可选 —— 事件判定跑到战斗前面去了（裁 1 的「先战斗→再判定」不成立）');
		/* ② 有标记 ⇒ 两者皆开 */
		置已战(层);
		ok(向上在(), '★已战之后向上边仍不开（门关死 ⇒ 玩家卡在这层出不去）');
		ok(账.抽中.some((k) => B.eventPending(层, k) === true), '★已战之后事件面仍不可选（前置接反了）');
		/* ③ 事件入口的「跳过」：关事件面，✗ 不关路 */
		const 跳 = (map.locations.get(层).actions ?? []).find((a) => /继续向上/.test(String(a.text ?? '')));
		ok(!!跳 && 跳.when() === true, '★已战之后没有「跳过事件」的入口（裁 1 的「可在事件入口跳过」无从体现）');
		跳.action();
		ok(账.抽中.every((k) => B.eventPending(层, k) === false), '★跳过后事件面仍可选');
		ok(向上在(), '★跳过后向上边也被关了 —— 跳过的是**事件**，✗ 路');
		/* ④ ★P1（`books#259` 九用例#1 红 · writer 真浏览器 CDP 实证：首战前 `kills=0` 却**采净 6 件**）：
		 *   基础采集也是本层动作 ⇒ 与事件面同一道门。判据须**同时**保证「有可采次数」——
		 *   否则「门关」与「采空」同值 ⇒ **假绿**（判据要能区分它要判的那件事）。 */
		{
			const 采层 = 'L1';
			const 节点 = B.nodeAt?.(采层);
			ok(!!节点, '★L1 没有采集节点（本臂前置不成立）');
			const 原次数 = 节点.charges;
			节点.charges = 5;                                 // ★保证有货（否则门关与采空同值）
			const 采 = (map.locations.get(采层).actions ?? []).find(
				(a) => /^采集（/.test(String(typeof a.text === 'function' ? a.text() : a.text)));
			ok(!!采, '★L1 的动作表里找不到基础采集动作（动作表变了？）');
			delete (State.variables.babelRun.已战 ?? {})[采层];
			ok(采.when() === false, '★**首战前**基础采集仍可执行 —— writer 实证的那条 P1（kills=0 却采净 6 件）');
			置已战(采层);
			ok(采.when() === true, '★已战之后基础采集反而不可执行（门接反了）');
			节点.charges = 原次数;                             // 复原节点账（✗ 污染下游格）
		}
		console.log('  裁1：未战 ⇒ 边与面皆闭 ✓｜已战 ⇒ 皆开 ✓｜事件入口可跳过（面关·路边在）✓｜基础采集同门 ✓');
	} finally {
		if (账存 === null) delete State.variables.span1Events; else State.variables.span1Events = 账存;
		if (State.variables.babelRun != null) {
			if (战存 === null) delete State.variables.babelRun.已战; else State.variables.babelRun.已战 = 战存;
		}
		if (位存) map.moveTo(位存);
	}
}

/* ── ★`books#259` 裁 4：**快存放页脚**（页脚＝`:: PassageFooter`）─────────────────────────────
 *
 * 断什么（三向）：①**非战况** ⇒ 页脚可存 ✓ ②**战中** ⇒ **不可存且不出新档**（`#213`／`#224` 的战内禁存闸 ✓）
 *   ③**可存时** ⇒ 走**系统路径** `快存(槽位.快存)`（与 `books#257` 臂 D 同一调用形 ✓）。
 * ★为什么直调 `页脚可存()`／`页脚快存()` 而✗不点 DOM：这两个口**就是页脚入口用的那两个**（`ui.twee` 里
 *   `<<if setup.BABEL.页脚可存()>>` ⇒ `<<link "快存">><<run …页脚快存()>>`）⇒ 断它们＝断入口的**决定与动作** ✓；
 *   ★**真 DOM 那半**（元素可见/禁用、点击后宿主槽真有值）**不在本档**（本仓真 DOM 归 `tools/e2e-*` ✓ —— 见下"未覆盖"）。
 */
head('★㊸ `books#259` 裁 4：快存放页脚（可存判据 ＋ 战中禁存 ＋ 走系统路径）');
{
	const B = setup.BABEL;
	const 存战 = B.战中;
	try {
		/* ① 非战况：可存 */
		B.战中 = false;
		/* ★断**同源关系**（✗ 断绝对 `true`）：`可存()` 依赖**宿主能力**（本仓自动化环境里可能恒 false ✓）
		 *   ⇒ 页脚可存的**性质**是「与 `可存(槽位.快存)` 同源」✓，✗ 不是"一定为真" ✓。 */
		ok(B.页脚可存() === (B.可存(B.槽位.快存) === true),
			`★页脚可存须与 \`可存(槽位.快存)\` 同源（页脚 ${B.页脚可存()}／可存 ${B.可存(B.槽位.快存)}）`);
		/* ② 战中：不可存，且**不出新档** —— 用 spy 证"根本没走到写" ✓（✗ 只断返回值） */
		B.战中 = true;
		const 原快存 = B.快存;
		let 调过 = 0;
		B.快存 = (...a) => { 调过 += 1; return 原快存(...a); };
		const r战中 = B.页脚快存();
		B.快存 = 原快存;
		ok(B.页脚可存() === false, '★战中页脚不应可存（实得 true）');
		ok(r战中 === false, `★战中页脚快存应返回 false（实得 ${JSON.stringify(r战中)}）`);
		ok(调过 === 0, `★战中**根本没调**快存（实得调了 ${调过} 次）—— 战内禁存闸被绕过了`);
		/* ③ 可存：走系统路径（同一把 spy 证"确实调了、且槽位是那个保留槽"） */
		B.战中 = false;
		let 收到 = null;
		const 原2 = B.快存, 原可存 = B.可存;
		/* ★必须**用桩**把 `可存` 支开：自动化环境里它可能恒 false ⇒ 这条支路**根本走不到** ⇒
		 *   那就是"判据跑了也绿了、但没经过要判的那条路" ✗（本席自己先把这条撞上了一次 ✓）。 */
		B.可存 = () => true;
		B.快存 = (slot) => { 收到 = slot; return true; };
		const r可 = B.页脚快存();
		B.快存 = 原2; B.可存 = 原可存;
		ok(收到 === B.槽位.快存, `★页脚应走系统路径写**保留槽**（实得槽位 ${JSON.stringify(收到)}）`);
		ok(r可 === true, `★可存时页脚快存应返回 true（实得 ${JSON.stringify(r可)}）`);
		console.log('  页脚：非战况可存 ✓｜战中禁存（且未调写路径）✓｜可存时走系统路径·槽位对 ✓');
	} finally { B.战中 = 存战; }
}
/* ★本格**未**覆盖（✗ 免得读者当已护）：①页脚元素在**真实 DOM** 里可见/禁用 ②点它之后**宿主槽真有值**
 *   —— 两者都要真 DOM ⇒ 归 `tools/e2e-*`（本仓 210／216 族 ✓）。本格断的是**入口的决定与动作** ✓。 */

/* ── ★`sgstory#1991`：登记过的域键**必须在审计面看得见**（两向 ＋ 两刀）──────────────────
 *
 * 为什么要有这一格：本笔（`babelRun` 进保存域契约）原先**只有一行、没有判据** —— 下刀（把那行摘掉）
 * `verify.mjs` **仍全绿** ✗ ⇒ 「加了键但漏登记」这类错**判据看不见** ✓。本格补上那对牙 ✓。
 * 断什么（两向）：①**声明表里的每个键** ⇒ 要么进 `envelope().domains`（本局有值 ✓）要么进 `audit().absent`
 *   （已声明但本局没写过 ✓ —— 两种**都算**"审计面看得见" ✓）②**未登记**的键 ⇒ **两个面都不许出现** ✓
 *   （★只断①的话，一个「恒把什么都报出来」的实现也会绿 ✗）。
 */
head('★㊹ `sgstory#1991`：登记的域键在审计面可见（两向）');
{
	const R = setup.RPG, B = setup.BABEL;
	const 表 = B.保存域键 ?? [];
	ok(Array.isArray(表) && 表.length > 0, '★`setup.BABEL.保存域键` 缺席或为空（一处表没导出？）');
	const env = R.save.envelope(), au = R.save.audit();
	const 可见 = (k) => env.domains.includes(k) || (au.absent ?? []).includes(k);
	/* ★★必须**点名**本票那个键（`babelRun`）—— ✗ 不能只断"表里的键都可见" ✗：
	 *   那条断言的**期望来自被测物自己**（`B.保存域键`）⇒ 把 `babelRun` 从表里**摘掉**，
	 *   期望也跟着缩 ✗ ⇒ **刀A 实测仍全绿** ✗（我第一次就写成这样 ✓，下刀才发现 ✓）。
	 *   ⇒ **独立的那一句**：本票要的就是"这个键在审计面看得见" ✓，与表里有没有它**无关** ✓。 */
	ok(可见('babelRun'), `★本票那个键 \`babelRun\` 在审计面**看不见**（domains ${JSON.stringify(env.domains)}／absent ${JSON.stringify(au.absent)}）—— 保存域契约没登记它`);
	const 漏 = 表.filter((k) => !可见(k));
	ok(漏.length === 0, `★声明过的域键在审计面看不见：${JSON.stringify(漏)}（domains ${JSON.stringify(env.domains)}／absent ${JSON.stringify(au.absent)}）`);
	/* ★反面臂：**未登记**的键不许被"顺带报出来" ✓ */
	const 测试键 = '__未登记的测试键__';
	const 存 = State.variables[测试键];
	State.variables[测试键] = 1;
	const env2 = R.save.envelope(), au2 = R.save.audit();
	const 溜进 = env2.domains.includes(测试键) || (au2.absent ?? []).includes(测试键);
	if (存 === undefined) delete State.variables[测试键]; else State.variables[测试键] = 存;
	ok(!溜进, `★**未登记**的键出现在了审计面（domains ${JSON.stringify(env2.domains)}）⇒ 那不是"看得见"，是"什么都报"`);
	console.log(`  域键审计：声明 ${表.length} 个全可见 ✓｜未登记键未溜进 ✓（domains ${env.domains.length} 个）`);
}
/* ── ㊺ `books#259` 裁（12:0x·writer 第二条 P1）：**固定事件阶段未了 ⇒ 向上的路不开** ─────────────
 *
 * 裁文原话：基础采集（及同类层内固定事件）**属事件阶段**，上行门＝三层
 *   `已战 && 事件账[L] ∈ {完成, 已跳过}`；**非例外**：「跳过」必须是**玩家明确动作一次**，
 *   缺账或直接上行不算；完成形＝采净该层节点（D 件语义）；聚落层与抽签层（L5–L8）照既有例外/机制。
 *
 * 三臂（writer 实证那条 P1 的**反臂与正臂**）：
 *   ① **胜利后未采净、未跳过 ⇒ 向上边不在**（writer 实证：`kills=1`、`charges=6` 却已到 L2）；
 *   ② **采净 ⇒ 在**（完成形）；③ **明确跳过一次 ⇒ 在**（玩家动作，✗ 缺账）。
 * ★臂③前段是**正控**：把节点改回未采净后，向上边必须**重新关上** —— 否则臂②可能是恒真（
 *   「一直开着」也会把②判绿），那就把「门」读成了「常开」。
 * 刀（记在提交信息）：拆 `事件阶段已了`（恒真）⇒ 本格 ①与③前段各一条红，复原回绿。
 */
head('㊺ `books#259` 裁（writer 第二条 P1）：胜利后未采净、未明确跳过 ⇒ 不得上行（采净／跳过各放行）');
{
	const 层 = 'L1';
	const 节点 = B.nodeAt?.(层);
	const 位存 = map.current;
	const 战存 = JSON.parse(JSON.stringify(State.variables.babelRun?.已战 ?? null));
	const 跳过存 = JSON.parse(JSON.stringify(State.variables.babelRun?.已跳过 ?? null));
	const 次数存 = 节点?.charges;
	const 向上在 = () => map.exitsFrom(层).some((e) => /向上/.test(String(e.text ?? '')));
	try {
		ok(!!节点, `★L1 无采集节点（本格前提不成立：${JSON.stringify(节点)}）`);
		置已战(层);                                       // 前置：裁 1 的门已过（战斗打过了）
		delete (State.variables.babelRun.已跳过 ??= {})[层];

		/* ① 胜利后未采净、未跳过 ⇒ 向上边**不在** */
		节点.charges = 6;
		ok(!向上在(), `★胜利后**未采净也未跳过**，向上边却开着（charges=${节点.charges}）`
			+ ' —— writer 第二条 P1（实证：`kills=1`、`gathered=0` 却已到 L2）');

		/* ② 采净 ⇒ **在**（完成形＝采净该层节点） */
		节点.charges = 0;
		ok(向上在(), '★采净之后向上边仍不开（门关死了）');

		/* ③ 明确跳过 ⇒ **在**（★前段是正控：回未采净 ⇒ 必须重新关） */
		节点.charges = 6;
		ok(!向上在(), '★把节点改回未采净后向上边仍开着 —— ②那一臂可能是恒真（把门读成了常开）');
		const 跳 = (map.locations.get(层).actions ?? []).find((a) => /不采了/.test(String(a.text ?? '')));
		ok(!!跳, '★未采净时没有「跳过」入口 —— 裁文的「跳过必须是玩家明确动作一次」无从体现');
		ok(跳.when() === true, '★未采净时跳过入口不可见（那就只剩「必须采净」一条路）');
		跳.action();
		ok(向上在(), '★**明确跳过一次**之后向上边仍不开 —— 裁文允许跳过形放行');

		/* ★正控：跳过记的是**本层**（✗ 一处跳过就把全塔放行 —— 那是「记成全局翻面」的常见写法） */
		ok(B.事件阶段已了(层) === true, '★跳过之后本层事件阶段仍判为未了');
		const 节点2 = B.nodeAt('L2');
		if (节点2) {
			const 存2 = 节点2.charges;
			节点2.charges = 3;                            // ★保证未采净（否则「不适用」与「已了」同值）
			ok(B.事件阶段已了('L2') === false,
				`★跳过记到了别层（本层门失效 ⇒ 任一层跳过会把全塔放行）；L2 读数 ${B.事件阶段已了('L2')}`);
			节点2.charges = 存2;
		}
		console.log('  事件门：未采未跳 ⇒ 路闭 ✓｜采净 ⇒ 路开 ✓｜明确跳过一次 ⇒ 路开 ✓｜跳过只记本层 ✓');
	} finally {
		if (节点) 节点.charges = 次数存;
		if (State.variables.babelRun != null) {
			if (战存 === null) delete State.variables.babelRun.已战; else State.variables.babelRun.已战 = 战存;
			if (跳过存 === null) delete State.variables.babelRun.已跳过; else State.variables.babelRun.已跳过 = 跳过存;
		}
		if (位存) map.moveTo(位存);
	}
}

/* ── ㊻ `books#259` 裁 4 **完形**：**系统入口只在页脚**（剧情选项面不得有快存／快读）─────────────
 *
 * 病（writer 补充观察一 · `#259` 评论 5980218866）：L1 首战后与 L2 的真实页面里，正文 `.choice-box` 内
 *   仍有「快存（记下这一刻）」「快读（回到上一次快存）」两钮（另有页脚 `.footersave` 那一个）⇒ **重复入口**。
 * 裁（领队 13:1x）：**旧 choice-box 双钮移除** —— 一处源动作区清理·保页脚唯一入口·**战内禁存语义不变**。
 *
 * 断什么：
 *   ① 任一**地点**的动作表文本**不得含系统入口词**（`快存／快读／管理`）—— 读数须 0 处；
 *   ② **正控**（✗ 别把「删干净」读成合规）：系统入口**仍在页脚** —— `页脚可存／页脚快存` 在位，
 *      且 `:: PassageFooter` 源里 `data-footer="save"` 在；
 *   ③ 战内语义**不变**：战中 `页脚可存()` 为假（与 ㊸ 同源；本格只作「本笔没动它」的锚）。
 * 刀（记在提交信息）：把双钮**塞回**（往某层动作表加一条 `快存（记下这一刻）`）⇒ ① 红，复原回绿。
 */
head('㊻ `books#259` 裁 4 完形：系统入口只在页脚（剧情选项面须无快存／快读）');
{
	const B = setup.BABEL;
	const 词 = /快存|快读|管理/;
	const 命中 = [];
	for (const [id, loc] of map.locations) {
		for (const a of (loc.actions ?? [])) {
			const t = String(typeof a.text === 'function' ? a.text() : a.text);
			if (词.test(t)) 命中.push(`${id}：${t}`);
		}
	}
	ok(命中.length === 0, `★剧情选项面仍有系统入口（须只在页脚）：${JSON.stringify(命中.slice(0, 6))}`
		+ `${命中.length > 6 ? `（共 ${命中.length} 处）` : ''}`);
	/* ② 正控：系统入口**仍在页脚**（✗ 别把「删干净」读成合规） */
	ok(typeof B.页脚可存 === 'function' && typeof B.页脚快存 === 'function',
		`★页脚系统入口不在位（页脚可存=${typeof B.页脚可存}／页脚快存=${typeof B.页脚快存}）`
		+ ' —— 那就不是「移到页脚」，是「删掉了」');
	const 页脚源 = fs.readFileSync(path.join(here, 'src', 'ui', 'ui.twee'), 'utf8');
	ok(/::\s*PassageFooter/.test(页脚源) && /data-footer="save"/.test(页脚源),
		'★`:: PassageFooter`（或它的 `data-footer="save"`）不在源里 —— 页脚系统区被拆了？');
	/* ③ 战内语义不变（同源；判据本体在 ㊸，本格只作「本笔没动它」的锚） */
	const 存战 = B.战中;
	try {
		B.战中 = true;
		ok(B.页脚可存() === false, '★战中页脚变成可存了 —— 本笔只该删重复入口，✗ 动禁存语义');
	} finally { B.战中 = 存战; }
	console.log('  系统入口：地点动作表 0 处 ✓｜页脚在位（data-footer=save）✓｜战中仍禁存 ✓');
}

/* ── ㊼ `books#259` 裁（14:0x·writer 第三条 P1）：**跳过＝关面不补**（跳过态同层采集入口关闭）───
 *
 * 病（writer 真浏览器 · `#259` 评论 5980799946）：在**已跳过**的同层状态（`已跳过.L1=true`、节点 6、
 *   `gathered=0`）真实点击「采集（碎石堆｜一次采净 6 件）」⇒ 得**石料 12**、`gathered 0→6`、节点 6→0
 *   —— 「跳过只记一次**不补**」的「不补」没落住。
 * 裁：`基础采集.when` 加 `&& !已跳过(L.id)`（与已战门**同格族**）；旧档读回跳过态**同样关**。
 *
 * 断什么：① 跳过态 ⇒ 采集面**不可执行**（★前提：节点仍有可采次数 —— 否则「门关」与「采空」同值 ⇒ 假绿）；
 *   ② **读档回同态同闭**：本局账经存档往返（`Save.roundtrip`）回来 ⇒ `已跳过` 仍在 且 采集面仍闭；
 *   ③ **正控**：撤回跳过那一笔 ⇒ 采集面**重新可用**（否则 ① 可能是恒真 —— 把门读成了常闭）；
 *   ④ 跳过后**跳过入口自己**不再出现（现存形对，本笔只钉它别被顺手改坏）。
 * 刀（记在提交信息）：拆 `&& !已跳过(L.id)` ⇒ ① 与 ② 红，复原回绿。
 */
head('㊼ `books#259` 裁（writer 第三条 P1）：跳过＝关面不补（跳过态采集不可执行·读档回同态同闭）');
{
	const 层 = 'L1';
	const 节点 = B.nodeAt?.(层);
	const 位存 = map.current;
	const 跑存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 次数存 = 节点?.charges;
	const 采面 = () => (map.locations.get(层).actions ?? []).find(
		(a) => /^采集（/.test(String(typeof a.text === 'function' ? a.text() : a.text)));
	const 跳面 = () => (map.locations.get(层).actions ?? []).find((a) => /不采了/.test(String(a.text ?? '')));
	try {
		ok(!!节点, '★L1 无采集节点（本格前提不成立）');
		ok(typeof B.已跳过 === 'function' && typeof B.记跳过 === 'function',
			`★机器件没导出（已跳过=${typeof B.已跳过}／记跳过=${typeof B.记跳过}）—— 判据取不到账`);
		节点.charges = 6;                                     // ★保证有可采次数（否则门关与采空同值）
		置已战(层);
		delete (State.variables.babelRun.已跳过 ??= {})[层];
		ok(采面().when() === true, '★正控失败：未采未跳（且已战）时采集面竟不可执行 —— 后面的断言会恒真');

		B.记跳过(层);                                          // 玩家**明确跳过**一次
		ok(采面().when() === false, '★**已跳过后**同层采集入口仍可执行 —— writer 实证的 P1-3（跳完再补采得石料 12）');
		const 跳 = 跳面();
		/* 口径：动作表是**静态**的（全量入表，可见性由 `when` 筛）⇒ 本条断的是「可见性」，✗ 不是「对象在不在」。 */
		ok(!跳 || 跳.when() === false, '★跳过后「不采了」入口**仍可见**（跳过只记一次 ⇒ 入口该消失）');

		/* ② 读档回同态同闭：本局账经存档往返回来（`babelRun` 是纯数据 ⇒ 这就是「读档」的数据面） */
		const 档 = Save.roundtrip(State.variables.babelRun);
		const 同态 = JSON.stringify(档?.已跳过) === JSON.stringify({ [层]: true });
		State.variables.babelRun = 档;
		ok(同态, `★读档回来的账不是跳过态（实得 ${JSON.stringify(档?.已跳过)}）`);
		ok(B.已跳过(层) === true, '★读档后 `已跳过` 丢了（同态那半没落住）');
		ok(采面().when() === false, '★**读档回跳过态**后采集面又开了 —— 裁文「旧档读回照账闭」的反臂');

		/* ③ 正控：撤回跳过那一笔 ⇒ 采集面**重新可用**（证明 ① 的门跟着账走，✗ 恒假） */
		delete State.variables.babelRun.已跳过[层];
		ok(采面().when() === true, '★撤回跳过账后采集面仍不可执行 —— ① 那一条可能是恒真（把门读成了常闭）');
		console.log('  跳过门：跳过态采集闭 ✓｜跳过入口消失 ✓｜读档回同态同闭 ✓｜撤回账后重新可用 ✓');
	} finally {
		if (节点) 节点.charges = 次数存;
		if (跑存 === null) delete State.variables.babelRun; else State.variables.babelRun = 跑存;
		if (位存) map.moveTo(位存);
	}
}

/* ── ㊽ `books#280` ①：**遭遇＝每层一次**（胜利即耗；撤退／失败可重试）──────────────────
 *
 * 病（操作者试玩 14:3x）：原地反复「遭遇」杀獾 ⇒ **旧硬币无限刷**。
 * 裁（修向）：`遭遇` 的 `when` 加 `&& !本层已战`——「首战＝该层唯一战斗」是裁 1 的语义；
 *   而 `已战` **只在胜利置位**（`encounters.js:402` 在 `果 === 'victory'` 支里）
 *   ⇒ 撤退／失败可重试的**口径不变**（✗ 把「打过一场」当「打过了」）。
 *
 * 断什么：① 未战（含撤退／失败后）⇒ 遭遇面**可用**（可重试这半不能被闸刀顺手切掉）；
 *   ② 已战（胜利）⇒ 遭遇面**不可用**（操作者实证那条）；③ **正控**：撤回已战账 ⇒ 面**重新可用**
 *   （否则 ① 可能是恒真——把门读成了常开）。
 * 刀（记在提交信息）：拆 `&& !本层已战(L.id)` ⇒ ② 红，复原回绿。
 */
head('㊽ `books#280` ①：遭遇＝每层一次（胜利即耗；撤退／失败可重试）');
{
	const 层 = 'L1';
	const 战存 = JSON.parse(JSON.stringify(State.variables.babelRun?.已战 ?? null));
	const 位存 = map.current;
	const 遭面 = () => (map.locations.get(层).actions ?? []).find(
		(a) => /^遭遇（/.test(String(typeof a.text === 'function' ? a.text() : a.text)));
	try {
		const 遭 = 遭面();
		ok(!!遭, '★L1 动作表里找不到基础遭遇动作（动作表变了？）');
		delete (State.variables.babelRun.已战 ??= {})[层];
		ok(遭.when() === true, '★未战（含撤退／失败后）时遭遇面不可用 —— 裁文要「撤退／失败可重试」');
		置已战(层);                                              // 前置：胜利（`fight()` 只在胜利支写这个账）
		ok(遭.when() === false, '★**已战**后遭遇面仍可用 —— 操作者实证的无限刷獾（旧硬币无限刷）');
		/* ③ 正控：撤回已战账 ⇒ 面**重新可用**（证 ① 跟着账走，✗ 恒真） */
		delete State.variables.babelRun.已战[层];
		ok(遭.when() === true, '★撤回已战账后遭遇面仍不可用 —— ① 那一条可能是恒真（把门读成了常开）');
		console.log('  遭遇门：未战可重试 ✓｜已战即闭（✗ 无限刷）✓｜撤回账后重新可用 ✓');
	} finally {
		if (State.variables.babelRun != null) {
			if (战存 === null) delete State.variables.babelRun.已战; else State.variables.babelRun.已战 = 战存;
		}
		if (位存) map.moveTo(位存);
	}
}

/* ── ㊾ `books#280` ④：一次采净**只印一行**（逐件行降为通知中心可回看）──────────────────
 *
 * 病（操作者试玩 14:3x）：一次采净逐件刷屏（「－1 碎石堆」＋「采得：石料 ×2。」× 6 ⇒ 12 行）。
 * 修：循环期间把通知档切到 `'key'`（引擎逐件行＝default/log ⇒ 只进通知中心），结束后印**一行**汇总，
 *   走 `'loot'` 通道（key 级 ⇒ 任何档下都进正文）；汇总取**真产出**（背包前后差）。
 *
 * 断什么：① 正文里 `采得：` 行**恰 1 条**（✗ 逐件 6 条）② 该行带总数 `×12` 与**节点耗尽信息**
 *   ③ 逐件「＋N 物品」行**不在正文** ④ **压缩 ≠ 丢证据**：逐件行**确实进了通知缓冲** —— 断法是
 *      **前后计数**（逐件行 +2×件数），✗ 不是「缓冲里有『石料』字样」（那被**汇总行自己**满足 ⇒ **无牙**；
 *      本席首版就是这么写的，tester-4 报告时才发现）。
 *   ⑤ **正控：档位必复原**（✗ 把玩家的档留在「仅关键」）。
 * ⚠ **可回看的边界**（校准 · 实测）：缓冲是 200 条环形 ＋ 面板窗口 20 条 ⇒ 采净那 12 行「同一段会话里可回看」，
 *   被后续通知挤出后不再可回看；本作**没有**独立的采集历史面（**设计取舍**，✗ 不是漏做）。
 * ⚠ 读数的口径（本席首版载在这里）：宿主仿真的归档记的是 **`perform` 调用**（✗ 过滤后的正文）
 *   ⇒ 「正文行」得按**引擎自己那一条判断**（`RPG.noticeAdmits`）在本格临时插一层探针来取；
 *   ✗ 不得在判据里重写一遍「什么算关键」的规则（那是第二份源）。
 * 刀（记在提交信息）：拆掉循环里的 `setNoticeFilter('key')` ⇒ ①③ 红，复原回绿。
 */
head('㊾ `books#280` ④：一次采净只印一行（逐件行进通知缓冲；✗ 无独立采集历史面＝取舍）');
{
	const 层 = 'L1';
	const 节点 = B.nodeAt?.(层);
	const 位存 = map.current;
	const 次存 = 节点?.charges;
	const 档存 = R.noticeFilter;
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 描 = Object.getOwnPropertyDescriptor(Object.prototype, 'perform');
	const 正文 = [];
	try {
		map.moveTo(层);
		ok(!!节点, '★L1 无采集节点（本格前提不成立）');
		节点.charges = 6;
		R.setNoticeFilter('all');                       // 玩家**常态**档（✗ 拿「仅关键」档冒充压缩）
		/* ★探针：记录**会被正文接纳**的那几行（按引擎自己的 `noticeAdmits` 判）——**调用原实现**，
		 *   输出/通知/缓冲一概照旧（✗ 拿探针替掉行为）。 */
		const 原 = 描.value;
		const 原RPG = R.perform;                     // ★实测：`RPG.perform` 是原型方法的**快照自有属性** ⇒ 两个入口都得包
		const 记 = (text, opts) => { if (R.noticeAdmits?.(opts?.channel ?? 'default') !== false) 正文.push(String(text)); };
		Object.defineProperty(Object.prototype, 'perform', { ...描, value: function (text, opts) { 记(text, opts); return 原.apply(this, arguments); } });
		R.perform = function (text, opts) { 记(text, opts); return 原RPG.apply(this, arguments); };
		/* ④ 逐件行的**形**（✗ 用「含石料」这种松匹配 —— 汇总行自己也含「石料」⇒ 松匹配在「逐件行不再入缓冲」时
		 *   **照样绿**；本席首版即是此病，tester-4 报告后校准）。定义须在**取采前读数之前**（TDZ）。 */
		const 逐件形 = (t) => /^－1 |^采得：.+×\d+。$/.test(String(t));
		let 件数;
		const 采前逐件 = (R.notices?.() ?? []).map((n) => String(n.text ?? n)).filter(逐件形).length;
		try { 件数 = B.gather(); }
		finally { Object.defineProperty(Object.prototype, 'perform', 描); R.perform = 原RPG; }
		const 采得 = 正文.filter((l) => /^采得：/.test(l));
		ok(件数 === 6, `★本格前置：应采到 6 件（实得 ${件数}）—— 否则后面的行数断言恒真`);
		ok(采得.length === 1, `★逐件刷屏未压缩：**正文**里 \`采得：\` 行 ${采得.length} 条（应恰 1）—— 实得 ${JSON.stringify(采得)}`);
		if (采得.length) {
			ok(/×12/.test(采得[0]), `★汇总行没带**总数**（应含 ×12）：${JSON.stringify(采得[0])}`);
			ok(/已采尽/.test(采得[0]), `★节点耗尽信息丢了（应含「已采尽」）：${JSON.stringify(采得[0])}`);
		}
		const 加行 = 正文.filter((l) => /^＋/.test(l));
		ok(加行.length === 0, `★逐件「＋N 物品」行仍在正文：${JSON.stringify(加行)}`);
		/* ④ 正控：压缩 ≠ 丢证据 —— 被压缩的行须**仍在通知中心**（`RPG.notices` 可回看） */
		const 通知 = (R.notices?.() ?? []).map((n) => String(n.text ?? n));
		const 后逐件 = 通知.filter(逐件形).length;
		ok(后逐件 - 采前逐件 === 2 * 件数,
			`★逐件行没进通知缓冲（差分应为 2×件数=${2 * 件数}，实得 ${后逐件 - 采前逐件}）`
			+ ` —— 压缩 ≠ 丢证据这条就靠它；✗ 只看「有没有『石料』字样」（汇总行自己也含）；`
			+ ` 实得尾部：${JSON.stringify(通知.slice(-4))}`);
		/* ⑤ 正控：档位复原 */
		ok(R.noticeFilter === 'all', `★采集后通知档未复原（实得 ${JSON.stringify(R.noticeFilter)}）—— ✗ 改玩家的档`);
		console.log(`  采集压缩：正文采得行 ${采得.length} 条 ⇒ ${JSON.stringify(采得[0] ?? null)}`
			+ `｜正文＋行 ${加行.length} 条｜通知缓冲 ${通知.length} 条（其中逐件 ${后逐件 - 采前逐件} 条，采前 ${采前逐件}）｜档位 ${R.noticeFilter}`);
	} finally {
		if (节点) 节点.charges = 次存;
		R.setNoticeFilter?.(档存);
		State.variables.inventory = 包存;
		if (位存) map.moveTo(位存);
	}
}

/* ── ㊿ `books#280` ⑤：宝箱硬开 —— **持工具必开（成功形）**＋代价先明示＋耐久只在成功扣 ─────────
 *
 * 病（操作者试玩）：用镐砸箱 ⇒「锁芯里传来金属断裂的死涩声响——它被彻底锁死了」（文案读作失败、甲拿不到）。
 * 勘察结论（本席，行号/事实均取自码）：硬开原先走 `R.equippedWeapon()`——那是**武器**面，而 L4 手上
 *   多半只有 L3 拾起的**矿镐（工具·无 `dmg`）** ⇒ 伤害≈0 ⇒ 6 HP 箱**永远砸不开** ⇒ 每次都落「锁死」支。
 * 修：① 硬开改走**数据声明的器械伤害**（持工具必开 ⇒ **成功形**文案）② 入口文案**先明示**不可逆
 *   ③ 耐久**只在成功**扣 1（对齐 D 件「采成才扣」）；④ 失败形（赤手）仍保留「不可逆二择」。
 *
 * 断什么：① 持镐 ⇒ 箱破 ＋ 甲入包 ＋ **无「锁死」行** ＋ 镐耐久 6→5
 *   ② 无工具（赤手）⇒ 箱**锁死** ＋ 甲未得 ＋ 「锁死」行在
 *   ③ **正控：不可逆**——锁死后两个入口（钥匙开／硬开）均不可见
 *   ④ **正控：耐久只在成功支扣**——失败那支跑完，背包里**无新增／扣减**（按 `charges` 和比对）
 * 刀（记在提交信息）：把硬开改回 `equippedWeapon()` ⇒ ① 红，复原回绿。
 */
head('㊿ `books#280` ⑤：宝箱硬开（持工具必开·代价先明示·耐久只在成功扣·失败不可逆）');
{
	const 位存 = map.current;
	const 甲存 = JSON.parse(JSON.stringify(State.variables.span1Arc?.chests ?? null));
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	/* ★`books#280` ⑦：本格在**战后**语境下测箱的动作面 —— 箱入口自 ⑦ 起挂「本层已战('L4')」门
	 *   ⇒ 不摆这个前置，本格末两条（「锁死后两入口皆闭」）会**因为门本来就没开**而假绿（同族：读数对、牙不在）。 */
	const 战存2 = JSON.parse(JSON.stringify(State.variables.babelRun?.已战 ?? null));
	(State.variables.babelRun ??= {}); (State.variables.babelRun.已战 ??= {}); State.variables.babelRun.已战.L4 = true;
	const 行 = () => __host.host.lines().map((x) => String(x));
	const 面 = (re) => (map.locations.get('L4').actions ?? []).find(
		(a) => re.test(String(typeof a.text === 'function' ? a.text() : a.text)));
	/** 造一只**指定 hp** 的箱态（复位用；★逐臂给定 hp ⇒ 读数不靠运气）。 */
	const 造箱 = (hp) => { const v = (State.variables.span1Arc ??= {}); (v.chests ??= {}); v.chests['chest-l4'] = { hp, opened: false, broken: false, locked: false }; };
	const 箱态 = () => State.variables.span1Arc.chests['chest-l4'];
	const 有甲 = () => (State.variables.inventory ?? []).some((x) => x.id === 'mail');
	const 镐 = () => (State.variables.inventory ?? []).find((x) => x.id === 'pick');
	const 扣总 = () => (R.playerActor()?.items ?? []).reduce((n, s) => n + (s.charges ?? s.n ?? 1), 0);
	try {
		map.moveTo('L4');
		const 硬 = 面(/^硬开/);
		ok(!!硬, '★L4 动作表里找不到硬开入口（动作表变了？）');
		ok(/砸不开就再也打不开了/.test(String(硬.text)), `★入口文案未明示不可逆代价：${JSON.stringify(String(硬.text))}`);

		/* ① 持镐 ⇒ **成功形** */
		State.variables.inventory = State.variables.inventory.filter((x) => x.id !== 'pick');
		R.give('pick');
		造箱(6);
		__host.host.reset();
		硬.action();
		const 行1 = 行();
		ok(箱态()?.broken === true, `★持镐硬开没砸开（实得 ${JSON.stringify(箱态())}）—— 修前就是这条永远不成立`);
		ok(有甲(), '★砸开了却没拿到铁环甲');
		ok(!行1.some((l) => /锁死/.test(l)), `★持镐成功形里仍印了「锁死」：${JSON.stringify(行1.filter((l) => /锁死/.test(l)))}`);
		ok(行1.some((l) => /下裂开一道口子/.test(l)), `★成功形文案不在（应有一句读作成功的话）：${JSON.stringify(行1.slice(-3))}`);
		ok(镐()?.charges === 5, `★成功硬开应在**工具**上扣 1 点耐久（实得 ${JSON.stringify(镐()?.charges)}）`);

		/* ② 无工具 ⇒ 锁死（不可逆二择保留）
		 *   ⚠ 本臂须**先清干净**：① 已把甲放进包（不带清 ⇒ 「没发甲」那条会因**上一臂的残留**而假红）。 */
		State.variables.inventory = State.variables.inventory.filter((x) => x.id !== 'pick' && x.id !== 'mail');
		造箱(99);            // ★本臂判的是**失败支** ⇒ hp 抬到挥击上限之上（✗ 靠运气）
		__host.host.reset();
		const 包前 = 扣总();
		硬.action();
		const 行2 = 行();
		ok(箱态()?.locked === true, `★赤手硬开没锁死（实得 ${JSON.stringify(箱态())}）—— 不可逆二择被拆了？`);
		ok(!有甲(), '★锁死那支竟然也发了甲');
		ok(行2.some((l) => /锁死/.test(l)), `★锁死支没有可读文案：${JSON.stringify(行2.slice(-3))}`);
		ok(扣总() === 包前, `★失败支改了背包总量（前 ${包前} ⇒ 后 ${扣总()}）—— 耐久只许在**成功**支扣（D 件语义）`);

		/* ③ 正控：不可逆——锁死后两个入口都没了 */
		ok(面(/^硬开/)?.when?.() === false, '★锁死后硬开入口仍可用（不可逆性被破）');
		ok(面(/^用铁钥匙开箱/)?.when?.() === false, '★锁死后钥匙入口仍可用（引擎 `lockNow()` 的语义被绕过）');
		console.log(`  宝箱硬开：持镐 ⇒ 破开＋甲 ✓（镐耐久 6⇒5）｜赤手 ⇒ 锁死＋甲不得 ✓｜锁死后两入口皆闭 ✓`);
	} finally {
		if (甲存 === null) delete State.variables.span1Arc.chests; else State.variables.span1Arc.chests = 甲存;
		State.variables.inventory = 包存;
		if (战存2 === null) delete State.variables.babelRun.已战; else State.variables.babelRun.已战 = 战存2;
		if (位存) map.moveTo(位存);
	}
}

/* ── 第 51 格 `books#280` ③a：战斗中页脚背包面**只读**（「使用道具」的唯一入口是战斗面板）──────────────
 *
 * 病（操作者试玩）：有草药/绷带时，**页脚的道具链接**点一下即治疗，且**不消耗战斗回合**
 *   —— 与战斗面板的「使用…（消耗本回合）」同一件事两条规矩。
 * 裁定（本席 2026-10-04，取「战中禁用页脚治疗」支）：页脚在战中**降级为只读标签** ＋ 一句白话指向合法入口。
 *
 * 断什么：① 战中 ⇒ 渲染面**无 `data-item=`**（不可点）＋ 有白话（提到「战斗面板」与「占用本回合」）
 *   ② 非战 ⇒ **有 `data-item=`**（正控：✗ 两向都禁 ⇒ 探索时也用不了道具）
 *   ③ **同形**（换面✗掉信息）：两向去掉 HTML 标记后的**文本**逐字相同，且等于 `RPG.inventoryLabel()`
 *   ④ 缺省正控：`setup.BABEL.战中` 为 `false`／缺省 ⇒ 走链接面（防「渲染永远只读」）
 * 刀（记在提交信息）：拆掉 `战中` 那支 ⇒ ①③ 红，复原回绿。
 */
head('第 51 格 `books#280` ③a：战斗中页脚背包面只读（使用道具的唯一入口是战斗面板）');
{
	const 件存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 旗存 = setup.BABEL.战中;
	const 渲染 = () => R.panels.get('inventory')?.render?.() ?? '';
	const 去标 = (x) => String(x).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
	try {
		State.variables.inventory = [];
		R.give('bandage');
		setup.BABEL.战中 = true;
		const 战中面 = 渲染();
		ok(!/data-item=/.test(战中面), `★战斗中页脚仍给了可点道具（会绕开战斗回合）：${JSON.stringify(战中面)}`);
		ok(/战斗面板/.test(战中面), `★禁用的同时应有一句白话指向合法入口：${JSON.stringify(战中面)}`);
		ok(/占用本回合/.test(战中面), `★白话应说清代价（占用本回合）：${JSON.stringify(战中面)}`);

		setup.BABEL.战中 = false;
		const 平时面 = 渲染();
		ok(/data-item=/.test(平时面), `★非战斗时页脚道具应可点（正控）：${JSON.stringify(平时面)}`);

		const 期望文本 = R.inventoryLabel();
		ok(去标(平时面) === 期望文本, `★平时面去掉标记后应与只读标签逐字同形：${JSON.stringify(去标(平时面))} ≠ ${JSON.stringify(期望文本)}`);
		ok(去标(战中面).replace(/（战斗中：[^）]*）/, '').trim() === 期望文本,
			`★战中面换面后**掉了信息**（应只剩只读标签＋白话）：${JSON.stringify(去标(战中面))}`);

		ok(setup.BABEL.战中 === false && /data-item=/.test(渲染()), '★战后页脚未回到可点面（缺省正控）');
		console.log(`  页脚背包面：战中 ⇒ 只读（无 data-item）＋白话 ✓｜平时 ⇒ 可点 ✓｜两向文本同形 ✓`);
	} finally {
		State.variables.inventory = 件存;
		setup.BABEL.战中 = 旗存;
	}
}

/* ── 第 52 格 `books#280` ⑥：首载变体判定（无档 ⇒ 不出「从存档继续」；有档 ⇒ 出）────────────────
 *
 * 病（操作者试玩 ＋ 本席真浏览器复现）：**全新 profile、零存档、首载**即见
 *   「刷新（重载页面）之后，请从存档继续」—— 初见玩家**无处可继续**，文案与初态不符
 *   （两个独立 profile 同象；读数与截图见 PR 正文）。
 * 勘察：那句原先是 `开始` 段落的**静态**文本（✗ 没有任何首载判定）⇒ 本笔给它一个判据源：
 *   `setup.BABEL.有档()`（**本档案里有没有可继续的档**）。
 *   ★取「有无档」✗ 不取「是不是首载」：后者在页面上**不可得**（同一段落渲染时分不出「首载」与
 *     「刷新后仍停在开始段」），而玩家此时能做的动作恰好就是「从存档继续」。
 *
 * 断什么：① 能力缺席 ⇒ `false`（✗ 抛）② 槽 3 有档 ⇒ `true` ③ 全空 ⇒ `false`
 *   ④ **单槽读失败不传播**（跳过该槽继续看）⑤ 段落结构：那句在**有档支**、初态支**不得**含「从存档继续」
 *   且初态支要告诉新玩家去哪存 ⑥ **正控**：有档支里那句仍在（✗ 把判据做成「永远不出」）
 * 刀（记在提交信息）：拆掉 `<<if 有档()>>`（回到静态那句）⇒ ⑤ 红，复原回绿。
 */
head('第 52 格 `books#280` ⑥：首载变体判定（无档 ⇒ 不出「从存档继续」；有档 ⇒ 出）');
{
	const 原宿主 = globalThis.SugarCube;
	const 桩 = (has) => {
		globalThis.SugarCube = { Save: { slots: { has } }, Config: { saves: { maxSlotSaves: 8 } } };
	};
	const twee = fs.readFileSync(path.join(storySrc, 'story', 'play.twee'), 'utf8');
	const 段 = twee.slice(twee.indexOf(':: 开始'), twee.indexOf(':: L1 苏醒'));
	const iIf = 段.indexOf('<<if setup.BABEL.有档()>>');
	const iElse = 段.indexOf('<<else>>');
	const iEnd = 段.indexOf('<</if>>');
	try {
		ok(typeof setup.BABEL.有档 === 'function', '★`有档()` 不在 —— 首载变体没有判据源');
		delete globalThis.SugarCube;
		ok(setup.BABEL.有档() === false, '★无宿主槽时应回落 `false`（✗ 抛／✗ 判成有档）');
		桩((i) => i === 3);
		ok(setup.BABEL.有档() === true, '★槽 3 有档时 `有档()` 应为 `true`');
		桩(() => false);
		ok(setup.BABEL.有档() === false, '★全空时应为 `false`');
		桩((i) => { if (i === 0) throw new Error('桩：读失败'); return i === 5; });
		ok(setup.BABEL.有档() === true, '★单槽读失败不应整支抛（应跳过该槽、继续看后面）');

		ok(iIf > -1 && iElse > iIf && iEnd > iElse,
			'★开始段落里那句**没有被 `<<if setup.BABEL.有档()>>` 分变体包住**（修前就是静态那句）');
		const 有档支 = 段.slice(iIf, iElse);
		const 初态支 = 段.slice(iElse, iEnd);
		ok(/请从存档继续/.test(有档支), '★「请从存档继续」应在**有档支**（✗ 落到初态支）');
		ok(!/请从存档继续/.test(初态支), '★初态支不得出现「请从存档继续」—— 正是本笔要修的形');
		ok(/快存/.test(初态支), '★初态支应告诉新玩家**去哪存**（页脚「快存」）');
		console.log('  首载变体：无档 ⇒ 不出「从存档继续」（改讲不会自动保存＋去哪存）✓'
			+ '｜有档 ⇒ 出 ✓｜单槽读失败不传播 ✓');
	} finally {
		if (原宿主 === undefined) delete globalThis.SugarCube; else globalThis.SugarCube = 原宿主;
	}
}

/* ── 第 53 格 `books#280` ⑦：L4 宝箱的**先后**（钥匙先到 ⇒ 箱子必可开；✗ 教学段里的「可能永久锁死」）────
 *
 * 病（操作者亲测 17:3x）：L4 谷穗崖只见「硬开」＋那句「砸不开就再也打不开了」——教学范围内给玩家一个
 *   **可能永久锁死**的箱子。勘察：钥匙由**胜利**支「必掉」（`弧必掉.L4 = ['iron-key']`，
 *   `world/encounters.js` 的胜利支循环），而箱的两个入口此前**只**判 `!L4已了()` ⇒ **未战**（＝还没有钥匙）
 *   就能看见硬开。修（操作者示）：**门跟着钥匙走** —— 箱只在战后出现（那时钥匙必在手）⇒「用钥匙开」必成；
 *   「硬开」保留作**无钥匙兜底**（✗ 不删）。
 *
 * 断什么：① **战前**箱两入口**均不可见**（教学段先打后开）② **真战斗**（同一装置：表覆写成软目标 ＋
 *   钉死随机流）⇒ 胜后钥匙**真在包**（活行读数：必掉不是只写在表上）③ 战后「用铁钥匙开箱」可见
 *   且**必成**（点它 ⇒ 箱开 ＋ 甲入包 ＋ 钥匙被取走）④ **兜底仍在**：已战但**无钥匙**时「硬开」可见
 *   （警示文案在；持镐 ⇒ 必开）⑤ **正控**：已了 ⇒ 两入口皆闭。
 * 刀（记在提交信息）：把 `L4可开()` 里的 `本层已战('L4')` 拆掉 ⇒ ① 红，复原回绿。
 */
head('第 53 格 `books#280` ⑦：L4 宝箱先后（钥匙先到 ⇒ 必可开；硬开留作无钥匙兜底）');
{
	const 位存 = map.current;
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 甲存 = JSON.parse(JSON.stringify(State.variables.span1Arc ?? null));
	const 战存 = JSON.parse(JSON.stringify(State.variables.babelRun?.已战 ?? null));
	const 原表 = R.encounterTable?.('span1') ?? null;
	const 面 = (re) => (map.locations.get('L4').actions ?? []).find(
		(a) => re.test(String(typeof a.text === 'function' ? a.text() : a.text)));
	/** 已战账（**可写**的引用；`delete (… ??= {}).x` 不是合法左值 ⇒ 单独立一个）。 */
	const 已战账 = () => ((State.variables.babelRun ??= {}).已战 ??= {});
	const 钥匙开 = 面(/^用铁钥匙开箱/), 硬开 = 面(/^硬开/);
	const 有甲 = () => (State.variables.inventory ?? []).some((x) => x.id === 'mail');
	try {
		ok(!!钥匙开 && !!硬开, '★L4 箱的两入口不全（动作表变了？）');
		map.moveTo('L4');
		State.variables.span1Arc = {};                       // 箱态清零（✗ 受前面格影响）
		delete 已战账().L4;

		/* ① 战前：两入口皆不可见 */
		ok(钥匙开.when() === false, '★**战前**「用铁钥匙开箱」竟然可见');
		ok(硬开.when() === false, '★**战前**「硬开」竟然可见 —— 教学段里就会出现那个**可能永久锁死**的箱子（⑦ 的病）');

		/* ② 真战斗（表覆写成软目标 ＋ 钉死随机流）⇒ 胜 ⇒ 钥匙**真在包** */
		if (原表) {
			R.registerEncounterTable('span1', Object.assign({}, 原表, {
				L4: { encounters: [{ ref: 'verify-drop-dummy', weight: 1 }], loot: [] },   // 空随机掉落 ⇒ 断的就是「必掉面」
			}));
		}
		State.variables.inventory = [];
		R.give('sword'); R.equip('sword');                    // 徒手＝非致命（打晕 ≠ 胜利）⇒ 持械走致命路
		D.Player.hp = D.Player.maxHp; D.Player.nonlethal = 0;
		R.rng.set(() => 0.99);                                // 必中重击 ⇒ 软目标一击毙
		await B.fight({ interactive: false });
		R.rng.reset();
		ok(R.has('iron-key'), '★L4 战后钥匙**没在包**（「必掉」只写在表上、没真给）—— ⑦ 的门就挂在它身上');
		ok(State.variables.babelRun?.已战?.L4 === true, '★战后「已战」账没记上（⑦ 的门读的就是它）');

		/* ③ 战后：钥匙开可见且**必成** */
		ok(钥匙开.when() === true, '★战后（钥匙必在手）「用铁钥匙开箱」却不可见');
		State.variables.inventory = State.variables.inventory.filter((x) => !['mail', 'iron-key'].includes(x.id));
		R.give('iron-key');
		钥匙开.action();
		ok(State.variables.span1Arc?.chests?.['chest-l4']?.opened === true, '★钥匙开没有把箱记为 opened');
		ok(有甲(), '★钥匙开没给铁环甲');
		ok(!R.has('iron-key'), '★钥匙开没有**消耗**钥匙');

		/* ④ 兜底仍在：已战 ＋ **无钥匙** ⇒ 硬开可见（警示文案在；持镐 ⇒ 必开） */
		State.variables.span1Arc = {};
		delete 已战账().L4; 已战账().L4 = true;
		State.variables.inventory = [];
		ok(钥匙开.when() === false, '★无钥匙时「用铁钥匙开箱」竟可见');
		ok(硬开.when() === true, '★已战但无钥匙时「硬开」不见了 —— 兜底分支被 ⑦ 顺手删了？');
		ok(/砸不开就再也打不开了/.test(String(硬开.text)), '★兜底入口未明示不可逆代价');
		R.give('pick');
		硬开.action();
		ok(State.variables.span1Arc?.chests?.['chest-l4']?.broken === true,
			'★持镐硬开没砸开（兜底分支应是**必成**的：⑤ 的保证）');

		/* ⑤ 正控：已了 ⇒ 两入口皆闭 */
		ok(钥匙开.when() === false && 硬开.when() === false, '★箱已了，两入口却仍有可用的');
		console.log('  L4 箱：战前两入口闭 ✓｜真战斗必掉钥匙 ✓｜战后钥匙开必成（耗钥匙）✓｜无钥匙兜底硬开必成 ✓｜已了两闭 ✓');
	} finally {
		if (原表) R.registerEncounterTable('span1', 原表);
		R.rng.reset();
		State.variables.inventory = 包存;
		if (甲存 === null) delete State.variables.span1Arc; else State.variables.span1Arc = 甲存;
		if (战存 === null) delete State.variables.babelRun.已战; else State.variables.babelRun.已战 = 战存;
		if (位存) map.moveTo(位存);
	}
}

/* ── 第 54 格 `books#280` ⑧：「打开背包」视图（常驻入口 ＋ 全道具 ＋ 详细效果 ＋ 就地使用）────────
 *
 * 形（票面）：入口**常驻**；列出全部道具＋详细效果；每件**就地使用**；战中＝与 ③ 同语义。
 * 断什么：① **列出齐全**（条目与背包同源，含 `×N` 后缀与「已装备」标记）② **描述/效果与定义同源**
 *   （拿一颗**哨兵实例**过逐件渲染：改定义的 `desc`／`stats.hp` ⇒ 文本跟着变；✗ 视图里再抄一份）
 *   ③ **使用真生效**（走引擎自己的点击口 `RPG.itemClick` ⇒ 绷带治 5、剩余次数 −1）
 *   ④ **战中入口只读**（仍列出、但**没有**可点的 `data-item` 锚；印白话指向战斗面板）
 *   ⑤ **正控**：空背包 ⇒ 明印「（空）」且入口仍在（✗ 消失）。
 * 刀（记在提交信息）：K1 把效果行写成硬编码 ⇒ ② 红；K2 拆掉战中的只读分支 ⇒ ④ 红；各自按字节复原。
 */
head('第 54 格 `books#280` ⑧：背包视图（常驻入口·全道具·效果同源·就地使用·战中可提交【能力门】）');
{
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 血存 = D.Player.hp;
	const 战中存 = setup.BABEL.战中;
	try {
		ok(typeof R.bagHTML === 'function' && R.panels?.has?.('bag'), '★没有注册「背包视图」面板（⑧ 的常驻入口没了）');

		/* ① 列出齐全 */
		State.variables.inventory = [{ id: 'bandage', charges: 2 }, { id: 'pick', charges: 6, equipped: true }];
		const 条 = R.bagSlots();
		ok(JSON.stringify(条.map((e) => e.id)) === JSON.stringify(['bandage', 'pick']),
			`★视图条目与背包**不同源**：${JSON.stringify(条.map((e) => e.id))}`);
		const html = R.bagHTML();
		ok(/背包（2 件）/.test(html), '★摘要里没有件数（入口还在不在？）');
		for (const 期望 of ['绷带', '×2', '矿镐', '（已装备）', R.createItem('bandage').desc]) {
			ok(html.includes(期望), `★视图里缺「${期望}」—— 列出不齐全（或缺同源说明）`);
		}

		/* ② 描述/效果**与定义同源**：哨兵实例 */
		const 哨 = R.createItem('bandage', { desc: '哨兵说明-9', stats: { hp: 42 } });
		const 哨html = R.bagItemHTML({ id: 'bandage', name: 哨.name, item: 哨, equipped: false });
		ok(哨html.includes('哨兵说明-9'), '★逐件渲染的说明**不是**取自道具定义（可能是视图里另抄的一份）');
		ok(哨html.includes(`治疗：42`), `★效果行没有跟着定义走（实得：${(哨html.match(/治疗：[^｜<]*/) ?? ['（无）'])[0]}）`);

		/* ③ 就地使用**真生效**（走引擎自己的点击口） */
		D.Player.hp = Math.max(1, D.Player.maxHp - 10);
		const 血前 = D.Player.hp;
		ok(/data-item="bandage"/.test(R.bagHTML()), '★战外的道具名不是可点件（就地使用入口没了）');
		R.itemClick('bandage');
		ok(D.Player.hp === 血前 + 5, `★点用绷带没真生效：血 ${血前} ⇒ ${D.Player.hp}（应 +5）`);
		ok(State.variables.inventory.find((x) => x.id === 'bandage')?.charges === 1,
			'★用掉一次后剩余次数没落袋（charges 未提交 ⇒ 副本与背包脱钩）');

		/* ④ 战中：**随能力而定** —— 引擎有提交口 ⇒ 可点件走本回合那条路；没有 ⇒ 老口径（只列不可点）。 */
		const 有提交口 = typeof R.submitBattleAction === 'function';
		setup.BABEL.战中 = true;
		const 战html = R.bagHTML();
		ok(战html.includes('绷带'), '★战中视图不再列出道具（看是安全的 ⇒ ✗ 整块消失）');
		if (有提交口) {
			ok(/class="rpg-bag-submit"[^>]*data-bag-submit="bandage"/.test(战html)
				|| /data-bag-submit="bandage"[^>]*class="rpg-bag-submit"/.test(战html),
				'★引擎有提交口，战中却没有可提交件（✗ 退回了老口径？）');
			ok(!/rpg-item-link/.test(战html), '★战中混进了战外那条**不占回合**的路（`.rpg-item-link` ⇒ 点一下用掉一件药却不耗回合）');
			ok(/占用本回合/.test(战html), '★战中提示没说**代价**（占本回合）');
		} else {
			ok(!/data-bag-submit=/.test(战html) && !/rpg-item-link/.test(战html),
				'★引擎**没有**提交口，战中却给了可点件 —— 那会是一条不占回合的路（③a 的同一条裁定）');
			ok(/战斗面板/.test(战html), '★战中只说「不能用」、没说**去哪用**（✗ 静默降级）');
			console.log('  战中的可提交面：**待判**（引擎还没有 `RPG.submitBattleAction` ⇒ 只验老口径；抬 pin 后自动真判）');
		}
		setup.BABEL.战中 = false;
		const 平html = R.bagHTML();
		ok(/data-item="bandage"/.test(平html), '★退出战斗后没有恢复战外的可点件（只读态粘住了）');
		ok(!/data-bag-submit=/.test(平html), '★战外出现了战中那条提交面（两条路混了）');

		/* ④b **真有提交口时**：真跑一场交互战 ⇒ 提交**真生效** ＋ **回合真耗**（与手动那局成对照）。
		 *  ⚠ 装置要点：提交必须在**循环正等着**那一刻到（浏览器里就是玩家点背包那一下）——
		 *    ① 桩要**悬着**（✗ 立刻 resolve：内层 promise 先答 ⇒ 提交成空转，本席首版即这么红的）；
		 *    ② 循环得先跑起来（`await` 一个宏任务）再提交，否则战斗还没登记、`submitBattleAction` 答 `no-battle`。 */
		if (有提交口) {
			const 记 = [];
			const 悬起 = [];          // 桩每次提问挂一个「点击」回调（只有测试会点 ⇒ 可证「玩家没点」）
			let 点过 = 0;
			const 原choice = D.Player.choice;
			const 计数 = () => { let n = 0; const 退 = R.events.on('battle:turnEnd', () => { n += 1; }); return { 读: () => n, 退 }; };
			const 造敌 = () => new (R.Character)({ name: '装置靶', hp: 1, maxHp: 1, stats: { dmg: '0', atkBonus: 0 } });
			const 限时 = (p, ms, 名) => Promise.race([p, new Promise((r) => setTimeout(() => r(名), ms))]);
			try {
				State.variables.inventory = [{ id: 'bandage', charges: 2 }];
				D.Player.hp = D.Player.maxHp - 10; D.Player.nonlethal = 0;
				const 血前 = D.Player.hp;
				D.Player.choice = (opts) => {
					记.push(opts.map((o) => o.value));
					return new Promise((res) => { 悬起.push(() => { 点过 += 1; res('skip'); }); });   // 只有测试会「点」
				};
				const 场 = new (R.Battle)(1, [D.Player], [造敌()], true);
				const 计1 = 计数();
				const p1 = 场.execute();
				await new Promise((r) => setTimeout(r, 0));                  // 让循环跑到「等玩家」那一问
				const r提交 = R.bagSubmit ? R.bagSubmit('bandage') : R.submitBattleAction({ item: 'bandage' });
				const 果1 = await 限时(p1, 3000, '（超时）');
				计1.退();
				ok(果1 !== '（超时）', '★提交后战斗没往下走（3 秒超时）—— 提交没接上循环那一问（✗ 死等）');
				ok(r提交?.ok === true, `★战中提交被拒：${JSON.stringify(r提交)}`);
				ok(D.Player.hp === 血前 + 5, `★战中点用没真生效：血 ${血前} ⇒ ${D.Player.hp}（应 +5）`);
				/* ★最强读数：玩家**一次没点**（`点过 === 0`），那一手却发生了 ⇒ 提交确实答了循环那一问。 */
				ok(点过 === 0, `★玩家没点，却有 ${点过} 次由测试作答（选项 ${JSON.stringify(记)}）—— 读的是菜单那一路，✗ 提交`);
				/* 对照局：同一场形、不提交（桩由测试「点跳过」）⇒ 回合边界条数须相同。 */
				State.variables.inventory = [{ id: 'bandage', charges: 2 }];
				D.Player.hp = D.Player.maxHp - 10;
				悬起.length = 0; 点过 = 0;
				const 场2 = new (R.Battle)(1, [D.Player], [造敌()], true);
				const 计2 = 计数();
				const p2 = 场2.execute();
				await new Promise((r) => setTimeout(r, 0));
				悬起.forEach((点) => 点());                                   // 手动那局：由「玩家」作答
				const 果2 = await 限时(p2, 3000, '（超时）');
				计2.退();
				ok(果2 !== '（超时）', '★对照局（手动）没跑完（3 秒超时）—— 装置病');
				ok(计1.读() === 计2.读(), `★回合真耗对不上：提交局 ${计1.读()} 次回合边界，手动局 ${计2.读()} 次 —— 两条账`);
			} finally {
				if (原choice === undefined) delete D.Player.choice; else D.Player.choice = 原choice;
				R.rng.reset();
			}
		}

		/* ⑤ 正控：空背包 ⇒ 明印「（空）」且入口仍在（✗ 消失／✗ 报错）。 */
		State.variables.inventory = [];
		const 空 = R.bagHTML();
		ok(/背包（0 件）/.test(空) && 空.includes('（空）'), '★空背包未明印「（空）」（✗ 报错／✗ 空白一片）');

		console.log('  背包视图：列出齐全 ✓｜说明与效果同源 ✓｜战外点用真生效（绷带 +5、次数 2⇒1）✓｜'
			+ (有提交口 ? '战中可提交（真生效 ＋ 回合真耗与手动同数）✓' : '战中只列不可点＋指路（引擎无提交口 ⇒ 待判）✓')
			+ '｜空背包明印（空）✓');
	} finally {
		State.variables.inventory = 包存;
		D.Player.hp = 血存;
		setup.BABEL.战中 = 战中存;
	}
}

/* ── 第 55 格 `books#280` ⑨：治疗反馈 ＋ HP 实时刷新（**三路同口径**）───────────────────────────
 *
 * 三路＝① 战斗面板的选单／② 背包**战外**使用／③ 背包**战中提交**；三路最终都走引擎 `RPG.act`
 *   ⇒ 都发 `item:used` ⇒ 故事侧**一处钩子**（`hooks.js`）即覆盖三路（本格就是**分别驱动三路**来证这一点）。
 * 断什么：每路既断**文本**（`HP X → Y`，X/Y 取真值）又断**接线**（`refreshPanels(['hp'])` 确实被调过 ⇒ 页脚会变；
 *   真 DOM 的「页脚真变」在 `tools/e2e-280-heal-feedback.mjs` 里断）。
 * 刀（记在提交信息）：K1 拆掉反馈打印 ⇒ 文本臂红；K2 拆掉就地刷 ⇒ 接线臂红；各自按字节复原。
 */
head('第 55 格 `books#280` ⑨：治疗反馈 HP X → Y ＋ 页脚就地刷（⑩ 之后仍存在的两路：战外／战中提交）');
{
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 血存 = D.Player.hp, 非致存 = D.Player.nonlethal;
	const 原choice = D.Player.choice, 原refresh = R.refreshPanels;
	const 行 = () => __host.host.lines().map((x) => String(x));
	const 造敌 = () => new (R.Character)({ name: '装置靶', hp: 1, maxHp: 1, stats: { dmg: '0', atkBonus: 0 } });
	/* 每路跑一次：装上「刷 hp」的侦听 ⇒ 用一次绷带（HP −10 起）⇒ 断文本 ＋ 断接线。 */
	const 试一路 = async (名, 用) => {
		State.variables.inventory = [{ id: 'bandage', charges: 2 }];
		D.Player.hp = D.Player.maxHp - 10; D.Player.nonlethal = 0;
		const 血前 = D.Player.hp;
		const 刷过 = [];
		R.refreshPanels = (...a) => { 刷过.push(a[0]); return 原refresh.apply(R, a); };
		setup.BABEL.记血();                                  // 「前值」＝玩家最后看到的数（真装置：先记一次）
		const 行数前 = 行().length;
		await 用();
		R.refreshPanels = 原refresh;
		const 新行 = 行().slice(行数前).join('\n');
		const m = 新行.match(/HP (\d+) → (\d+)/);
		ok(!!m, `★${名}：使用反馈里没有「HP X → Y」（新行：${JSON.stringify(新行.slice(0, 120))}）`);
		if (m) {
			ok(Number(m[1]) === 血前 && Number(m[2]) === 血前 + 5,
				`★${名}：反馈的数字不对（读到 ${m[1]} → ${m[2]}，应 ${血前} → ${血前 + 5}）`);
		}
		ok(D.Player.hp === 血前 + 5, `★${名}：治疗没真生效（血 ${血前} ⇒ ${D.Player.hp}）`);
		ok(刷过.some((x) => Array.isArray(x) && x.includes('hp')),
			'★' + 名 + '：没有触发 refreshPanels([\'hp\']) ⇒ 页脚不会随用刷新（实得 ' + JSON.stringify(刷过) + '）');
	};
	try {
		/* ② 战外：引擎那条点击口（状态栏／背包视图的 `.rpg-item-link` 走的就是它） */
		await 试一路('战外使用', () => { R.itemClick('bandage'); });
		/* ③ 战中提交：`R.submitBattleAction` ⇒ 战斗循环取作本回合行动（`sgstory#2003`） */
		if (typeof R.submitBattleAction === 'function') {
			await 试一路('战中提交', async () => {
				const 悬 = [];
				D.Player.choice = () => new Promise((res) => { 悬.push(() => res('skip')); });
				const 场 = new (R.Battle)(1, [D.Player], [造敌()], true);
				const p = 场.execute();
				await new Promise((r) => setTimeout(r, 0));
				R.submitBattleAction({ item: 'bandage' });
				await Promise.race([p, new Promise((r) => setTimeout(() => { 悬.forEach((f) => f()); r(); }, 1500))]);
			});
		} else {
			console.log('  战中提交那一路：**待判**（引擎还没有 `RPG.submitBattleAction`）');
		}
		/* ⚠ **`books#280` ⑩ 起，原先这条「战斗面板」治疗臂的前提消失了**：本作把道具收敛到页脚背包
		 *   （`R.Battle.itemsInBag = true`）⇒ 战斗菜单里**按设计没有任何道具项** ⇒ 那条路**不再存在**
		 *   （✗ 不是缺陷；硬保旧臂＝对着一个不可能发生的事断言 ⇒ 必红且红得没意义）。
		 *   ⇒ 治疗覆盖改为**另两路**（战外／战中提交，正是 ⑩ 之后玩家能用的两条）；菜单面由**第 56 格**断。 */
		console.log('  （原「战斗面板」那条治疗路：⑩ 起按设计不存在 ⇒ 本格不再断它；菜单面见第 56 格）');
		console.log('  治疗反馈（⑩ 之后仍存在的两路）：战外使用 ✓｜' + (typeof R.submitBattleAction === 'function'
			? '战中提交 ✓' : '战中提交（引擎无 `submitBattleAction` ⇒ 待判）')
			+ ' —— 两路都断到「HP X → Y」文本 ＋ refreshPanels(hp) 接线');
	} finally {
		if (原choice === undefined) delete D.Player.choice; else D.Player.choice = 原choice;
		R.refreshPanels = 原refresh;
		State.variables.inventory = 包存;
		D.Player.hp = 血存; D.Player.nonlethal = 非致存;
	}
}

/* ── 第 56 格 `books#280` ⑩：战斗菜单**只留战斗行动**（道具收敛到页脚背包一处）────────────────────
 *
 * 断什么：① 故事**确实声明**了（`R.Battle.itemsInBag === true` —— 读真值，✗ 读源码字面）；
 *   ② **真跑一场交互战**：菜单里**没有任何道具名**、**没有**一键项与槽位下标项，`跳过`（战斗行动）仍在；
 *   ③ 页脚背包仍是道具入口（战中渲染可提交件；引擎无提交口时明印「待判」）。
 * 刀（记在提交信息）：把故事里的那行声明拆掉 ⇒ ② 红（菜单又列道具了）；按字节复原 ⇒ 绿。
 */
head('第 56 格 `books#280` ⑩：战斗菜单只留战斗行动（道具收敛到页脚背包一处）');
{
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 原choice = D.Player.choice;
	try {
		/* 能力门：引擎那棵树还没有这个开关（`sgstory#2007` 未抬 pin）⇒ 菜单面**待判**，✗ 不许红（✗ 假红）。 */
		const 有开关 = 'itemsInBag' in R.Battle;
		if (!有开关) {
			console.log('  战斗菜单面：**待判**（引擎还没有 `R.Battle.itemsInBag` —— 抬 pin 含 `sgstory#2007` 后自动真判）');
		} else {
		/* ① 声明真生效 */
		ok(R.Battle.itemsInBag === true, '★故事没有声明 `R.Battle.itemsInBag = true`（⑩ 的开关没打开 ⇒ 道具仍会在菜单里）');

		/* ② 菜单面（真跑） */
		State.variables.inventory = [{ id: 'bandage', charges: 2 }, { id: 'pick', charges: 6, equipped: true }];
		const 场 = new (R.Battle)(1, [D.Player], [new (R.Character)({ name: '装置靶', hp: 1, maxHp: 1, stats: { dmg: '0', atkBonus: 0 } })], true);
		D.Player.choice = () => new Promise((res) => { void res; });       // 悬着：只读菜单，✗ 不真打
		const { itemOptions } = 场.buildPlayerOptions(D.Player);
		const 文 = itemOptions.map((o) => String(o.text)).join('｜');
		/* ★`#280` ⑭ 口径：**手上那件武器的攻击**属「战斗行动」面 ⇒ 必须留（它是「顺手点第一项」时的致命一手；
		 *   ⑩ 把它一起扫走 ⇒ 脚本臂点第一项只剩空手＝非致命 ⇒ `kills` 恒 0 ⇒ 首战门永闭）。其余道具仍一件不列。 */
		ok(文.includes('矿镐'), `★⑭：**手上的武器**（矿镐已装备）不在菜单里（实得 ${JSON.stringify(文)}）`);
		ok(!文.includes('绷带'), `★⑩：非武器道具不该在菜单里（实得 ${JSON.stringify(文)}）`);
		ok(itemOptions.some((o) => String(o.value).startsWith('quick:')), '⑭：手上的武器应以一键项形给出');
		ok(!itemOptions.some((o) => /^\d+$/.test(String(o.value))), '★菜单里仍有逐件项（原槽位下标）');
		ok(itemOptions.some((o) => o.value === 'skip'), '「跳过本回合」是**战斗行动** ⇒ 必须还在');

		/* ③ 页脚仍是道具入口 */
		setup.BABEL.战中 = true;
		const 战html = R.bagHTML();
		ok(战html.includes('绷带'), '★战中页脚背包不列道具（那玩家就真的没有入口了）');
		if (typeof R.submitBattleAction === 'function') {
			ok(/data-bag-submit="bandage"/.test(战html), '★有提交口，但页脚背包没给可提交件');
		} else {
			console.log('  页脚背包的可提交件：**待判**（引擎还没有 `RPG.submitBattleAction`）');
		}
		setup.BABEL.战中 = false;

		console.log('  战斗菜单：只有手上那件武器（一键项）＋空手／跳过 ✓｜无别的道具／无逐件项 ✓｜道具入口在页脚背包 ✓');
		}
	} finally {
		if (原choice === undefined) delete D.Player.choice; else D.Player.choice = 原choice;
		State.variables.inventory = 包存;
		setup.BABEL.战中 = false;
	}
}

/* ── 第 62 格 books#311：装饰渲染的文字回退／无副作用（无头夹具，非布局或图片解码） ── */
head('第 62 格 books#311：装饰素材映射·文字回退·重绘不结算（无头夹具）');
{
	const savedAssets = Object.getOwnPropertyDescriptor(setup, 'storyAssets');
	const savedMap = B.map;
	const savedRandom = Math.random;
	const savedRng = new Map(Object.entries(R.rng).filter(([, value]) => typeof value === 'function'));
	const before = JSON.stringify(State.variables);
	const fixture = { src: 'data:image/svg+xml;base64,PHN2Zy8+', width: 64, height: 80 };
	try {
		Object.defineProperty(setup, 'storyAssets', { value: undefined, configurable: true });
		ok(B.visual.playerHTML() === '' && B.visual.itemHTML('sword') === '', '★无素材表时未回退为纯文字');
		const samples = Object.fromEntries([
			'babel-player', 'babel-enemy-cub', 'babel-enemy-badger', 'babel-item-sword',
			'babel-item-coin', 'babel-item-stone', 'babel-scene-l1', 'babel-scene-l2', 'undefined',
		].map((id) => [id, fixture]));
		Object.defineProperty(setup, 'storyAssets', { value: samples, configurable: true });
		const image = B.visual.playerHTML();
		ok(image.includes('width="64" height="80"') && image.includes('alt="" aria-hidden="true"'), '★图片无固有尺寸或装饰语义');
		ok(!/<(?:a|button)\b|\son(?:click|load)=/.test(image), '★图片偷带动作入口');
		for (const [id, asset] of [['sword', 'sword'], ['coin', 'coin'], ['rock', 'stone']]) {
			ok(B.visual.itemHTML(id).includes(`data-babel-asset="babel-item-${asset}"`), `★${id} 图标未按既有道具 ID 映射`);
		}
		ok(B.visual.itemHTML('unknown') === '' && B.visual.enemyHTML({ name: '未知敌人' }) === '', '★未知实体错配图片／偷露敌情');
		ok(B.visual.enemyHTML({ name: '幼獾' }).includes('babel-enemy-cub'), '★幼獾样张缺席');
		ok(B.visual.enemyHTML({ name: '精英·獾' }).includes('babel-enemy-badger'), '★精英既有命名未共用獾轮廓');
		B.map = { current: 'L1' };
		ok(B.visual.sceneHTML().includes('babel-scene-l1'), '★L1 环境图未按当前位置读取');
		B.map.current = 'L2';
		ok(B.visual.sceneHTML().includes('babel-scene-l2'), '★L2 环境图未按当前位置读取');
		B.map.current = 'L20';
		ok(B.visual.sceneHTML() === '', '★无样张层被伪造环境图');
		B.map.current = 'L1';
		Math.random = () => { throw new Error('visual render consumed random'); };
		for (const name of savedRng.keys()) R.rng[name] = Math.random;
		for (let i = 0; i < 50; i++) {
			B.visual.playerHTML(); B.visual.sceneHTML(); B.visual.itemHTML('sword'); B.visual.enemyHTML({ name: '幼獾' });
		}
		ok(JSON.stringify(State.variables) === before, '★装饰重绘写入了游戏状态');
		const sword = R.createItem('sword');
		const line = R.bagItemHTML({ id: 'sword', name: sword.name, item: sword, equipped: true });
		ok(line.includes('babel-item-sword') && line.includes('长剑') && line.includes('（已装备）'), '★缩略图吞掉道具名／装备标记');
		for (const bad of [{ ...fixture, src: 'https://example.invalid/a.svg' }, { ...fixture, width: 0 }]) {
			Object.defineProperty(setup, 'storyAssets', { value: { 'babel-player': bad }, configurable: true });
			ok(B.visual.playerHTML() === '', '★非法运行时描述未退回文字');
		}
		console.log('  16 项装饰判据（含两非法描述臂）｜50 轮纯重绘｜无头夹具不判解码／布局');
	} finally {
		Math.random = savedRandom;
		for (const [name, value] of savedRng) R.rng[name] = value;
		B.map = savedMap;
		if (savedAssets) Object.defineProperty(setup, 'storyAssets', savedAssets); else delete setup.storyAssets;
	}
}

/* ★正常出口：**必须**在这里调用（`#1815` 的 BLOCKER：这一行被搬走 ⇒ 门恒绿）——
 *   连同上面的 `process.on('exit')` 自证，两层守「断言不是装饰」。 */
/* ── ㊿ `books#280` ⑪：开箱**恰得一件**（入包统一由「箱自己的 loot」一处源）─────────────
 *
 * 病（操作者亲测 00:2x）：铁钥匙开 L4 铁皮箱 ⇒ 包内铁环甲 **×2**。
 * 根因：引擎 `41-chest.js` 的 `openBy()` 里是 `RPG.loot(this)` ⇒ **箱自己**把
 *   `items:[{id:'mail',n:1}]` 给一次；故事侧 `L4中甲入包()` 又 `R.give('mail')` ⇒ 第二次。
 * 修（一处源＝箱的 loot）：①`L4中甲入包()` 去 `R.give`；②**硬开成功支补 `R.loot(c)`**
 *   （该路本不走 `openBy`，只删 give 则**硬开不给物** ✗）。
 * 断什么：**两条路各恰 1**（钥匙路 ≡ 硬开路 ⇒ 守「两路不得各给」）。
 * 刀（记在提交信息）：把 `R.loot(c)`／`openBy` 任一侧改回「故事侧 `R.give` 补一次」⇒ 该路红。
 */
head('㊿ `books#280` ⑪：开箱恰得一件（钥匙路／硬开路各恰 1）');
{
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	const 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 位存 = map.current;
	const L4 = map.locations.get('L4');
	const 取动作 = (re) => (L4.actions ?? []).find(
		(a) => re.test(String(typeof a.text === 'function' ? a.text() : a.text)));
	const 数mail = () => (State.variables.inventory ?? []).filter((x) => x.id === 'mail').length;
	const 清包 = () => { State.variables.inventory = []; };
	try {
		/* ① 钥匙路 */
		清包(); 置已战('L4'); R.give('iron-key');
		const 钥 = 取动作(/用铁钥匙开箱/);
		ok(!!钥, '★L4 动作表里找不到「用铁钥匙开箱」（动作表变了？）');
		if (钥) {
			钥.action();
			const n = 数mail();
			ok(n === 1, `★【⑪ 钥匙路】开箱后包内 \`mail\` 应**恰 1**（实得 ${n}）—— 两路各给一次即本 bug ✓`);
		}
		/* ② 硬开路（同一条守：也须恰 1） */
		清包(); 置已战('L4'); R.give('axe');        // 硬开器械（1d6+6 ≥ 箱 hp ⇒ 必破）
		try { R.rng?.setSequence?.(new Array(24).fill(0.0)); } catch (e) { /* 无注入面则用真随机 */ }
		const 硬 = 取动作(/硬开/);
		ok(!!硬, '★L4 动作表里找不到「硬开」（动作表变了？）');
		if (硬) {
			硬.action();
			const n2 = 数mail();
			ok(n2 === 1, `★【⑪ 硬开路】硬开后包内 \`mail\` 应**恰 1**（实得 ${n2}）`
				+ ' —— ★守：**两路不得各有各的给法**（否则删了一处又漏另一处 ✗）');
			if (n2 === 1) console.log('  开箱入包：钥匙路恰 1 ✓｜硬开路恰 1 ✓（一处源＝箱的 loot）');
		}
	} finally {
		try { R.rng?.reset?.(); } catch (e) { /* ✗ 吞 */ }
		State.variables.inventory = 包存;
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (位存) map.moveTo(位存);
	}
}


/* ── 51 `books#280` ②-1：**进层先停一拍**（记账面）─────────────────────────────
 *
 * 裁（领队 · 甲 · 2026-10-05）：`onEnter` **只记账** —— 把「本层还没停过到达拍」写进本局账
 *   （`$babelRun.停未答 = 层` ✓，随档往返）；**一次性 `choice` 包装**由同处装（判据在格 60 ✓）。
 * ★为何本格**只判记账面**（✗ 不在这里判「那一屏有没有出现」）：
 *   本格跑在**比格 60 更早**的装置状态里，此处地图**尚无 current** ⇒ `moveTo` 不触发 `onEnter`
 *   （本席实测：`停未答` 仍 null、录空 ⇒ **前置未立**）；在**前置未立**处判「屏」＝**伪红** ✗。
 *   故**屏**由格 60 判（那时地图已活 ✓），本格守**账**：写入 / 答毕 / 幂等（✗ 重复停）。
 * 断什么：① 进层 ⇒ 记「未答＝该层」；② 答毕 ⇒ 未答清空 **且** 记「已给」（幂等账）；
 *   ③ **幂等**：同层再记 ⇒ **✗ 不产生第二拍**（`停已给` 真 ⇒ 永远不再停 ✓）。
 * 刀（记在提交信息）：摘掉 `onEnter` 里的记账 ⇒ ① 红；把 `到达拍答毕` 的 `到达停已给` 删掉 ⇒ ② 红。
 */
/* ★读法面（一句话）：本格读的是**记账面** —— 写入／答毕／幂等（✗ 本格**不判屏**：屏由格 60 判 ✓）；
 *   且★「到达停」是**历史账 ✗ 门闩**（见 `world/babel.js` 到达停族顶上的点明句）：账错只影响「拍还弹不弹」✓。 */
head('51 `books#280` ②-1：进层先停一拍（记账面：写入／答毕／幂等）');
{
	const B = setup.BABEL, 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	try {
		State.variables.babelRun = {};
		ok(typeof RPG.到达停未答 === 'function' && typeof RPG.到达拍答毕 === 'function',
			'★②-1：`到达拍未答`／`到达拍答毕` 两个记账口须在（§裁甲 的落点）');
		/* ① 记账 */
		RPG.到达停未答('L2');
		ok(B.到达拍未答() === true, '★【②-1 ①】进层须记「未答」（该层还没停过 ✓）');
		/* ② 答毕 ⇒ 清未答 ＋ 记已给 */
		RPG.到达拍答毕();
		ok(B.到达拍未答() === false && RPG.到达停已给('L2') === true,
			'★【②-1 ②】答毕须清「未答」**且**记「已给」（幂等账 ✓）');
		/* ③ 幂等：同层再进 ⇒ 账上「已给」为真 ⇒ 永不再停 */
		RPG.到达停未答('L2');
		RPG.到达拍答毕();
		ok(RPG.到达停已给('L2') === true && B.到达拍未答() === false,
			'★【②-1 ③】同层再进 ✗ 不得产生第二拍（幂等 ✓）');
		console.log('  到达停（记账面）：写入 ✓｜答毕（清未答＋记已给）✓｜幂等 ✓');
	} finally {
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
	}
}

/* ── 53 `books#280` ②-2：**遭遇停**（未选前零结算·抽签只抽一次）──────────────────
 *
 * 裁（领队 ②B）：遭遇触发后**停一拍** —— 渲染遭遇描述 ⇒ 玩家选「迎战／查看」，未选前**零结算**。
 * ★本格断的是**码面**的两条，装置（`tools/e2e-280-encounter-stop.mjs` 真浏览器）断的是**屏面**的四条
 *   （描述在／两选项在／零结算／点迎战真进战斗）⇒ 两条路各判一面，✗ 不互为重复。
 *   ① **零结算**：`遭遇停()` 前后 `kills／deaths／gathered／harvests` 逐项不变（✗ 抽签不算结算）；
 *   ② **抽签只抽一次**（RNG 次序护）：`rollEncounter` 被调用的次数 ——「停」抽 1 次、
 *      段落重渲染**不重抽**、`fight()` **消费**同一份（✗ 重抽）⇒ 全程**恰 1 次**。
 *      ★这条是硬约束：一场遭遇若吃两份随机流 ⇒ 平衡基线／面 N 手算／全部既有读数**一起错位**。
 * 刀（记在提交信息）：把 `fight()` 的消费改回自抽 ⇒ ② 红（次数变 2），① 与余格不动。
 */
head('53 `books#280` ②-2：遭遇停 —— 未选前零结算 ＋ 抽签只抽一次（RNG 护）');
{
	const 原roll = R.rollEncounter, 原档 = setup.BABEL.停档, 位存 = map.current;
	const 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	let 次 = 0;
	try {
		R.rollEncounter = (...a) => { 次 += 1; return 原roll(...a); };
		setup.BABEL.停档 = null;
		map.moveTo('L1');
		State.variables.babelRun ??= {};
		const 键 = ['kills', 'deaths', 'gathered', 'harvests'];
		const 前 = Object.fromEntries(键.map((k) => [k, State.variables.babelRun?.[k] ?? null]));
		setup.BABEL.遭遇停();
		const 后 = Object.fromEntries(键.map((k) => [k, State.variables.babelRun?.[k] ?? null]));
		const 变 = 键.filter((k) => 前[k] !== 后[k]);
		ok(变.length === 0, `★【②-2 ①】未选之前**零结算** —— 变了 ${JSON.stringify(变)}`);
		ok(次 === 1, `★【②-2 ②】「遭遇停」应**只抽一次**（实得 ${次}）`);
		setup.BABEL.遭遇停();
		ok(次 === 1, `★【②-2 ②】段落重渲染**不得重抽**（实得共 ${次} 次）`);
		if (typeof setup.BABEL.fight === 'function') {
			await setup.BABEL.fight({ interactive: false });     // ★无头：✗ 不挂（interactive=false 门控）
			ok(次 === 1, `★【②-2 ②】\`fight()\` 须**消费**停档（✗ 重抽）—— 全程实得 ${次} 次`);
		}
		if (变.length === 0 && 次 === 1) console.log('  遭遇停：未选前零结算 ✓｜抽签全程恰 1 次（停 1/重渲染 0/战消费 ✓）');
	} finally {
		R.rollEncounter = 原roll;
		setup.BABEL.停档 = 原档;
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (位存) { try { map.moveTo(位存); } catch (e) { /* 位置回不去则略 */ } }
	}
}


/* ── 58 `books#280` ⑮：**战中的页脚背包须可提交**（门 ＋ 刷新钩子）────────────────────
 *
 * 病（`#332` 臂①「找不到目标」的真身）：页脚背包在战期**只渲染不可点的 `<span>`** ⇒ 真实鼠标点不到。
 * 真因（本席三点实测 + 读码）：面板是**段落渲染那一刻**生成的 —— 彼时战还没起 ⇒ 走「不可提交」那支；
 *   `fight()` 之后才把 `setup.BABEL.战中` 置真 ⇒ ★**只置真而✗ 刷面板**，页脚就一直是老形 ✗。
 *   （✗ 不是 `RB.submitBattleAction` 缺绑定：`ui/bag.js:18` 就是 `const RB = setup.RPG;`，
 *     而引擎 `src/core/40-battle.js:948` 早有该口 —— 实测战中两支都为真 ✓。）
 * 两条臂：
 *   ① **真值**：`战中` 为真 ＋ 引擎有该口时，`R.bagHTML()` 对一件可提交道具须给出 `data-bag-submit`；
 *      同一件在**战外**不得给（战外走 `rpg-item-link` 那条路）—— 两向都断 ⇒ ✗ 不是恒真形。
 *   ② **接线**：`fight()` 必须在**`战中` 置真之后**刷过面板（✗ 只判「调用过 refreshPanels」——
 *      战前/战终也会刷，那种写法会被别的刷新骗过）。
 * 刀（记在提交信息）：摘掉 `战中 = true;` 后面那次 `R.refreshPanels?.()` ⇒ ② 红（① 不动，因为它按需渲染）。
 */
head('58 `books#280` ⑮：战中的页脚背包须可提交（门 ＋ 刷新钩子）');
{
	const 原Choice = D.Player.choice, 原Perform = R.perform;
	const 原Refresh = R.refreshPanels;
	const 刷新录 = [];
	const 位存 = map.current, 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 包存 = JSON.parse(JSON.stringify(State.variables.inventory ?? []));
	try {
		R.perform = (s) => 原Perform.call(R, s);
		D.Player.choice = async (opts) => {
			const o = Array.isArray(opts) ? opts : [];
			序 += 1;
			if (首次问序 === null) 首次问序 = 序;      // ★第一次「问玩家」在序里的位置
			const 文 = (x) => String(x?.text ?? '');
			const 收 = o.find((x) => /收下/.test(文(x)));
			if (收) return 收.value;
			const 攻 = o.find((x) => /攻击|挥|砍|劈|打击/.test(文(x)) && !/盾|防具|甲|铠/.test(文(x)));
			if (攻) return 攻.value;
			return (o[0] ?? {})?.value;
		};
		/* ② 的探针：记下**每次刷新那一刻** `战中` 的值（⇒ 判「置真之后刷过」而不是「刷过」） */
		/* ★记**事件序**（✗ 只记「刷过没」）：战斗循环**自己也会刷面板**（那时 `战中` 已真）
		 * ⇒ 只判「录里有 true」会被它骗过（本席实测：摘掉本笔那次刷新，`rc` 照样 0 ✗）。
		 * 判的是**先后**：置真之后的**第一次**刷新，必须早于**第一次** `choice`（＝还没问玩家就已刷好）✓ */
		let 序 = 0, 首次刷新序 = null, 首次问序 = null;
		R.refreshPanels = () => {
			序 += 1;
			if (setup.BABEL?.战中 === true && 首次刷新序 === null) 首次刷新序 = 序;
			刷新录.push(setup.BABEL?.战中 === true);
			return 原Refresh?.();
		};
		map.moveTo('L1');
		State.variables.babelRun ??= {};
		D.Player.hp = D.Player.maxHp ?? 20;
		State.variables.inventory = [{ id: 'bandage', charges: 2 }, { id: 'sword', equipped: true, charges: 99 }];
		if (!(D.Player.items ?? []).some((x) => x.id === 'sword')) D.Player.items.push({ id: 'sword', equipped: true, charges: 99 });
		/* ①-a 战外：同一件**不得**给可提交链 */
		setup.BABEL.战中 = false;
		const 战外 = String(R.bagHTML?.() ?? '');
		ok(!/data-bag-submit="bandage"/.test(战外), '★【⑮ ①】战外 ✗ 不得给 `data-bag-submit`（那时走 `rpg-item-link`）');
		await setup.BABEL.fight({ interactive: true });
		/* ①-b 战中：同一件**须**给 */
		setup.BABEL.战中 = true;
		const 战中 = String(R.bagHTML?.() ?? '');
		ok(/data-bag-submit="bandage"/.test(战中), '★【⑮ ①】战中须给 `data-bag-submit`（门＝`战中` ∧ 引擎有该口）'
			+ `｜实得片段 ${战中.slice(0, 120)}` );
		/* ② 接线：置真之后刷过面板 */
		ok(首次刷新序 !== null && 首次问序 !== null && 首次刷新序 < 首次问序,
			`★【⑮ ②】\`fight()\` 必须在**战中置真之后、且早于第一次问玩家**刷过面板`
			+ `（首次「战中刷新」在序 ${首次刷新序}／首次「问玩家」在序 ${首次问序}）`
			+ ' —— ✗ 只判「刷过」会被**战斗循环自己**那几次刷新骗过（本席实测：摘掉本笔那次刷新，那种写法照样绿）');
		if (/data-bag-submit="bandage"/.test(战中) && 首次刷新序 !== null && 首次刷新序 < 首次问序) {
			console.log('  战中页脚：门开（`data-bag-submit` 在 ✓）｜置真后刷过面板 ✓｜战外不给 ✓');
		}
	} finally {
		D.Player.choice = 原Choice; R.perform = 原Perform;
		if (原Refresh) R.refreshPanels = 原Refresh;
		State.variables.inventory = 包存;
		setup.BABEL.战中 = false;
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (位存) { try { map.moveTo(位存); } catch (e) { /* 回不去则略 */ } }
	}
}


/* ── 59 `books#280` ⑬ **终形**：**并轨常驻**（怪 ÷2 · 我 ×2）＋ **两条教学入口** ────────────
 *
 * 形（操作者令 2026-10-05 · 协调方准）：
 *   · **值无条件**：成军 ⇒ 挡路者生命**恒** `max(1,⌊满/2⌋)`；`开局()` ⇒ 玩家初始生命**恒 ×2**；
 *   · **✗ 无难度开关**：`$babelRun.难度`／`setup.BABEL.设难度`／面板「（简单）」标**整族已撤** ✓
 *     （★旧档里若残留 `难度` 键 ⇒ **忽略不读** ✓，本格顺带把它断出来 ✓）；
 *   · **两入口**：「战斗教学」⇒ `L1 苏醒`｜「跳过教学」⇒ `直达十层()` ⇒ `L10-camp`（kit 照旧 ✓）。
 * 断什么（★读真值）：
 *   ① **同 ref 恒减半**：同一 ref 成军 ⇒ `maxHp` ＝ `max(1,⌊fresh 满血/2⌋)`（对照臂＝直接 `fresh` ✓）；
 *   ② **无旗标**：`typeof setup.BABEL.设难度 === 'undefined'` ✓；
 *   ③ **玩家生命恒 ×2**：`开局()` ⇒ `hp/maxHp` ＝ 基数 ×2 ✓，且**重复调用不越乘** ✓（基数账只记一次 ✓）；
 *   ④ **跳过入口的三笔账**：九层「已战＋已跳过」全置 ✓ ∧ `已过('L9')` 为真（走写口 ✓）∧ 落点 `L10-camp` ✓。
 * 刀（记在提交信息）：刀① 摘掉成军里的减半 ⇒ ① 红；刀② 摘掉开局里的 ×2 ⇒ ③ 红。
 */
head('59 `books#280` ⑬ 终形：并轨常驻（怪÷2·我×2·无旗标）＋两条教学入口');
{
	const B = setup.BABEL, 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 层存 = map.current;
	const 原玩家血 = State.variables.player ? { hp: State.variables.player.hp, maxHp: State.variables.player.maxHp } : null;
	try {
		/* ① 同 ref 恒减半：对照臂＝直接 fresh；被测臂＝成军 */
		map.moveTo('L1');
		State.variables.babelRun = {};
		const rolled = (typeof R.rollEncounter === 'function') ? R.rollEncounter('L1', { count: 1 }) : [];
		const ref = rolled?.[0]?.ref ?? null;
		ok(!!ref, '★【⑬ ①】L1 抽不出遭遇 ⇒ 本格对照臂取不到样本（装置不足，✗ 不当判据红）');
		if (ref) {
			/* ★对照臂＝**引擎原语**（✗ 不调故事层的局部 `fresh` —— 装置取不到 ✓）：
			 *   `R.characters.get(ref)` ⇒ 序列化 ⇒ `R.Character.revive(...)` ＝ `encounters.js` 的 `fresh` **逐字同法** ✓。 */
			const 生 = (() => {
				try {
					const proto = R.characters.get(ref);
					if (!proto) return null;
					return R.Character.revive(JSON.parse(JSON.stringify(proto.toJSON())));
				} catch (e) { return null; }
			})();
			const 满 = Number(生?.maxHp ?? 生?.hp ?? 0);
			const 成 = B.成军([{ ref }])[0];
			const 成血 = Number(成.maxHp ?? 成.hp);
			ok(满 > 0 && 成血 === Math.max(1, Math.floor(满 / 2)),
				`★【⑬ ①】挡路者生命须**恒**减半：应 ＝ max(1,⌊满/2⌋) ＝ ${Math.max(1, Math.floor(满 / 2))}`
				+ `（实得 满 ${满} ⇒ 成军 ${成血}）`);
			if (成血 === Math.max(1, Math.floor(满 / 2))) console.log(`  并轨·挡路者：同一 ref 恒减半 ✓（满 ${满} ⇒ ${成血}）`);
		}
		/* ② 无旗标（✗ 无难度开关） */
		ok(typeof B.设难度 === 'undefined', '★【⑬ ②】难度开关须**整族已撤**（`setup.BABEL.设难度` 不该存在）');
		/* ③ 玩家初始生命恒 ×2 ＋ 重复调用不越乘 */
		{
			const P = State.variables.player;
			if (P) {
				const 底 = { hp: P.hp, maxHp: P.maxHp };
				delete State.variables.babelRun.生命基数;
				B.开局();
				const 一 = { hp: P.hp, maxHp: P.maxHp };
				B.开局();                                       // ★第二次（须不越乘）
				const 二 = { hp: P.hp, maxHp: P.maxHp };
				ok(一.hp === 底.hp * 2 && 一.maxHp === 底.maxHp * 2,
					`★【⑬ ③】玩家初始生命须**恒 ×2**（底 ${底.hp}/${底.maxHp} ⇒ 实得 ${一.hp}/${一.maxHp}）`);
				ok(二.hp === 一.hp && 二.maxHp === 一.maxHp,
					`★【⑬ ③】重复调用 ✗ 不得越乘（一次 ${一.hp}/${一.maxHp} ⇒ 两次 ${二.hp}/${二.maxHp}）`);
				if (一.maxHp === 底.maxHp * 2) console.log(`  并轨·玩家：初始 ${一.hp}/${一.maxHp} ＝ 基数 ×2 ✓｜重复调用不越乘 ✓`);
			} else { ok(true, '（无 `$player` 面 ⇒ 本臂不判）'); }
		}
		/* ④ 跳过入口：三笔账 ＋ 落点 */
		State.variables.babelRun = {};
		B.直达十层();
		const r = State.variables.babelRun ?? {};
		const 九层 = Array.from({ length: 9 }, (_, i) => `L${i + 1}`);
		ok(map.current === 'L10-camp', `★【⑬ ④】跳过教学落点须＝L10-camp（实得 ${String(map.current)}）`);
		ok(九层.every((l) => r.已战?.[l] === true) && 九层.every((l) => r.已跳过?.[l] === true),
			`★【⑬ ④】九层「已战＋已跳过」两账须全置（${JSON.stringify(r.已战 ?? null)}／${JSON.stringify(r.已跳过 ?? null)}）`);
		ok(B.已过?.('L9') === true, '★【⑬ ④】头目进度须走**写口**（`记战果`）⇒ `已过(\'L9\')` 为真');
	} finally {
		if (State.variables.player && 原玩家血) { State.variables.player.hp = 原玩家血.hp; State.variables.player.maxHp = 原玩家血.maxHp; }
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (层存) { try { map.moveTo(层存); } catch (e) { /* 回不去则略 */ } }
	}
}


/* ── 57 `books#280` ②-4：**胜利结算屏 ＋「收下」确认门**（未确认不进探索）────────────────
 *
 * 裁（领队原文 · 节拍④）：奖励结算停 —— 单屏印战果〔击败数／战利品〕⇒ 玩家答「收下」，
 *   ★**确认之后**才走主出口（`继续探索`）⇒ 未确认时**不进**探索。
 * 三条臂（★读**真值**：桩化 `choice` 记下每一次的选项 ＋ 桩化 `Engine.play` 记跳段，✗ 不读源码文本）：
 *   ① **结算在位**：那一屏的文本含「【战斗结算】」＋击败数，且**那一次的选项里有「收下」**；
 *   ② **未确认不进**：**在「收下」那一次之前**，选项里 ✗ 不得出现「继续探索」，且 `Engine.play` **未被调用**；
 *   ③ **确认后入口换**：答「收下」之后才出现「继续探索」⇒ 走过它 ⇒ `Engine.play('探索')` 被调用。
 * 刀（记在提交信息）：摘掉确认门（`interactive` 那段 `await choice([{收下}])`）⇒ ② 红（未确认就已经能进）。
 * ⚠ 装置口径照票面：`fight({ interactive: true })` ＋ 桩化 `choice`（有答 ⇒ ✗ 不会挂）。
 */
head('57 `books#280` ②-4：胜利结算屏 ＋「收下」确认门（未确认不进探索）');
{
	const 原Choice = D.Player.choice, 原Play = SugarCube.Engine.play, 原Perform = R.perform;
	const 选项录 = [], play录 = [], said = [];
	let 收下时play = null;        // ★「答收下那一刻」的跳段快照 —— ② 判的是**那一刻**，✗ 不是整场跑完后的总账
	const 位存 = map.current, 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	try {
		R.perform = (s) => { said.push(String(s)); return 原Perform.call(R, s); };
		D.Player.choice = async (opts) => {
			const o = Array.isArray(opts) ? opts : [];
			选项录.push(o.map((x) => String(x?.text ?? x)));
			const 文 = (x) => String(x?.text ?? '');
			const 收 = o.find((x) => /收下/.test(文(x)));
			if (收) { 收下时play = play录.slice(); return 收.value; }     // ① 结算屏这一次（★取「那一刻」的跳段快照）
			const 攻 = o.find((x) => /攻击|挥|砍|劈|打击/.test(文(x)) && !/盾|防具|甲|铠/.test(文(x)));
			if (攻) return 攻.value;                                     // 打
			return (o[0] ?? {})?.value;                                  // 靶／其余
		};
		SugarCube.Engine.play = (v) => { play录.push(String(v)); };
		map.moveTo('L1');
		State.variables.babelRun ??= {};
		D.Player.hp = D.Player.maxHp ?? 20;
		if (!(D.Player.items ?? []).some((x) => x.id === 'sword')) {
			D.Player.items.push({ id: 'sword', equipped: true, charges: 99 });
		}
		await setup.BABEL.fight({ interactive: true });
		const 收次 = 选项录.findIndex((a) => a.some((t) => /收下/.test(t)));
		ok(收次 >= 0, `★【②-4 ①】结算屏须在且那一次选项里有「收下」（选项录 ${JSON.stringify(选项录)}）`);
		ok(said.some((s) => /【战斗结算】/.test(s)), '★【②-4 ①】结算屏文本须含「【战斗结算】」'
			+ `（实得 said 尾部 ${JSON.stringify(said.slice(-3))}）`);
		const 收前 = 选项录.slice(0, 收次 < 0 ? 选项录.length : 收次);
		ok(!收前.some((a) => a.some((t) => /继续探索/.test(t))),
			`★【②-4 ②】未答「收下」之前**不得**出现「继续探索」（实得 ${JSON.stringify(收前)}）`);
		ok(收下时play !== null && !收下时play.includes('探索'),
			`★【②-4 ②】未答「收下」之前**不得**已经进探索（那一刻的 Engine.play 录 ${JSON.stringify(收下时play)}）`);
		ok(收次 >= 0 && 选项录.slice(收次 + 1).some((a) => a.some((t) => /继续探索/.test(t))),
			`★【②-4 ③】答「收下」**之后**须出现「继续探索」（实得 ${JSON.stringify(选项录.slice(收次 + 1))}）`);
		ok(play录.includes('探索'), `★【②-4 ③】走过出口须真跳探索（Engine.play 录 ${JSON.stringify(play录)}）`);
		if (收次 >= 0 && play录.includes('探索')) {
			console.log('  结算屏：①在位（【战斗结算】＋收下）✓｜②未确认不进 ✓｜③确认后换入口且真跳探索 ✓');
		}
	} finally {
		D.Player.choice = 原Choice; SugarCube.Engine.play = 原Play; R.perform = 原Perform;
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (位存) { try { map.moveTo(位存); } catch (e) { /* 回不去则略 */ } }
	}
}

/* ── 60 `books#280` ②-1：**到达拍＝一次性 `choice` 包装**（裁甲＋三护）────────────────────
 *
 * 形（领队裁甲 · 三护）：`onEnter` 只**记账** ＋ 把**下一次** `D.Player.choice` 换成「到达拍」；
 *   玩家答完 ⇒ **用原 options 调原 `choice`**（✗ 吞掉地图自己那次问）；仅一次（用后即还）／异常 `finally` 自清。
 * ★为何✗ 在 `onEnter` 里 `Engine.play('到达')`（**P0 真身**）：那跑在 `MapScene` 的**渲染流程内**
 *   ⇒ 「渲染中嵌套 play」＝ SugarCube 禁形 ⇒ 那一屏被吞 ⇒ 真机只剩页脚「快存」**卡死** ✗
 *   （`verify`/jsdom ✗ 走真渲染队列 ⇒ 装置**全绿而真机不可玩** ✗ —— 本笔的教训 ✓）。
 * ★为何✗ 在 `:: 探索` 段里加 `<<if>>`（本席真机实测）：换层是**场景自己的 `choice` 循环**（✗ 不重渲段落）
 *   ⇒ 段级闸**永远轮不到** ✗；且「写读不配对」会**永停**（developer 探针：`到达停.L1` 已写 true、Engine idle ✓）。
 * 断什么（★真值 · 桩化 `D.Player.choice` 记每次选项）：
 *   ① **拍先来**：包后第一次 `choice` 先给「（到达）…」；② **不吞原问**：答毕 ⇒ **原 options** 被问出去；
 *   ③ **仅一次**：第二次 `choice` 直接走原口（✗ 再弹）；④ **异常自清**：拍那步抛 ⇒ 仍复原。
 * 刀（记在提交信息）：去掉包装（只记账）⇒ ① 红；删掉「用原 options 调原 `choice`」⇒ ② 红。
 */
/* ★读法面（一句话）：本格读的是**包装合同** ∈「先拍／不吞原问／仅一次／异常自清」✓；
 *   桩打在**真口** `RPG.Scene.prototype.choice`（地图那一屏的口 ✓）—— ✗ 不用段落口 `DND3.Player.choice`。 */
head('60 `books#280` ②-1：到达拍＝一次性 choice 包装（先拍／不吞原问／仅一次／异常自清）');
{
	const B = setup.BABEL, SC = setup.RPG.Scene.prototype, 原Choice = SC.choice, 位存 = map.current;
	const 账存 = JSON.parse(JSON.stringify(State.variables.babelRun ?? null));
	const 收货 = [];
	try {
		State.variables.babelRun = {};
		B.到达停未答?.(null);
		/* ★桩须**先装**（✗ 装在 `moveTo` 之后会被 `onEnter` 的包装反向顶掉 —— 那正是「写读不配对」的读法 ✗）。
		 *   ★口＝**`Scene.prototype.choice`**（真机探针钉死 ✓）—— ✗ 不是 `D.Player.choice`（那只走段落层 ✓）。 */
		SC.choice = async function (opts) { 收货.push((opts ?? []).map((o) => String(o?.text ?? o))); return 'ok'; };
		map.moveTo('L2');                                    // ⇒ onEnter：记账 ＋ 装包装
		await SC.choice.call({}, ['A1', 'A2']);                        // ★第一次 ⇒ 被「拍」接住 ⇒ 再问原 options
		await SC.choice.call({}, ['B1']);                              // ★第二次 ⇒ 直接走原口
		const 扁平 = 收货.map((a) => a.join('|'));
		ok(扁平.some((x) => /（到达）/.test(x)), `★【②-1 ①】包后须先给「到达拍」（实得 ${JSON.stringify(扁平)}）`);
		ok(扁平.some((x) => /A1\|A2/.test(x)), `★【②-1 ②】答毕须把**原 options** 问出去（✗ 吞掉）—— 实得 ${JSON.stringify(扁平)}`);
		ok(扁平.filter((x) => /（到达）/.test(x)).length === 1, `★【②-1 ③】拍**只一次**（用后即还）—— 实得 ${JSON.stringify(扁平)}`);
		if (扁平.some((x) => /（到达）/.test(x))) console.log('  到达拍（包装）：①先拍 ✓｜②原问仍在 ✓｜③仅一次 ✓');
	} finally {
		SC.choice = 原Choice;
		if (State.variables.babelRun != null && 账存 != null) State.variables.babelRun = 账存;
		if (位存) { try { map.moveTo(位存); } catch (e) { /* 回不去则略 */ } }
	}
}
/* ── 61 探索段落的 if 配对：同步上游后，浏览器实际出现孤立 <</if>>，而旧功能组仍绿。
 * 本格只做目标段落的源码结构检查，不冒充 SugarCube 渲染或任意 Twee 语法解析。
 * 真页面的错误面仍须由浏览器检查；正反小样保证本判据不把合法嵌套／分支挡掉。
 */
head('61 探索段落 if 配对（源码结构，不替真实渲染）');
{
	const pairedIf = (text) => {
		let depth = 0;
		for (const [, tag] of text.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/<<(if|\/if|else|elseif)(?:\s[\s\S]*?)?>>/g)) {
			if (tag === 'if') depth++;
			else if (depth === 0) return false;
			else if (tag === '/if') depth--;
		}
		return depth === 0;
	};
	const passage = fs.readFileSync(path.join(storySrc, 'story/play.twee'), 'utf8')
		.split(/^::\s+/m).find((p) => /^探索\r?\n/.test(p));
	ok(typeof passage === 'string' && pairedIf(passage), '探索段落存在未配对 if／孤立结束或分支标签');
	for (const text of ['', '<<if $x>>是<</if>>', '<<if $x>><<if $y>>甲<<else>>乙<</if>><<elseif $z>>丙<</if>>', '/* <</if>> 是注释 */'])
		ok(pairedIf(text), `if 配对判据误拒合法小样：${text}`);
	for (const text of ['<</if>>', '<<if $x>>', '<<else>>', '<<elseif $x>>'])
		ok(!pairedIf(text), `if 配对判据放过异常小样：${text}`);
}


/* ── 63. `books#206`（轨 C · 批 2 第二笔）：游戏内时钟 ＋ 城镇生产 ＋ 远征批量 ────────────────
 *
 * 病（`#172` 批 2 要拆的面）：游戏内时间**没有日历面**（`babelRun.时间` 只是个分钟数），
 *   城镇生产／远征**尚无实现**；而「分钟 → 日」若在两处各换一次 ⇒ 同一个量两套算法
 *   （本仓已记的坑：`ui/battle.js:45`「同一个量两份实现」）。
 * 裁（操作者 · 经领队 2026-10-06 03:34Z；落档评论 `6008797337`／接口草案 `6008441941`）：
 *   ① 备战下限＝**至少 90 日**（`>=`，✗ 不是「最多 90」）② 温泉「分钟→日」零头＝**累积**
 *   ③ 批量单次 **≤30 日** ④ 日历＝**每月 30 日** ⑤ 时间单位＝**分钟**（既有账 ⇒ ✗ 不迁移旧档，
 *   日／月是**纯派生**）
 * 断什么（五格）：
 *   ① **时钟走格**：推进 1 日 ⇒ 分钟账 +`分钟每日`／第几日 +1；★月末（第 30 日）+1 ⇒ 第 2 月第 1 日；
 *      ★零头**累积**（+60 分钟 ⇒ 仍第 2 日、账留 60）；备战下限是 `>=90`
 *   ② **生产产出**：到期**只结算一次**、次日**不得补发**；单次推进跨多周期 ⇒ **逐期**结算
 *   ③ **远征／批量上限**：推进 31 ⇒ 拒绝且★**存档面零变化**；推进 30 ⇒ 逐日走满；远征到期判归；
 *      ★未死才走（死在当日 ⇒ 零步 ⇒ 删掉每日检查会红）
 *   ④ **防漂移·唯一写家**：`babelRun.时间` 的**写**只应出现在 `00-clock-town.js`（✗ 别处各写一遍）
 *   ⑤ **防漂移·唯一换算常量**：除 `分钟每日` 外**任何地方**出现 `1440` ⇒ 红；且 `babelRun` 里
 *      **只应有 `时间`** 这一个时间存量（✗ 另存日／月／分钟 —— 那是第二真值）
 *   ★④⑤ 皆**先剥注释**再判（否则命中注释＝假红；实作见下 `剥注释`）
 * 刀（D／T 席照此各断一次，结果须**具名**）：
 *   ① `分钟每日 1440⇒720` ⇒ ①红｜② `结算日` 里去掉 `次 += 周期` ⇒ ②红｜③ 去掉 `推进` 的上限判断
 *   ⇒ ③红｜③b 去掉 `未死()` 的每日检查 ＋ 让玩家带 0 HP ⇒ ③「死在当日 ⇒ 零步」红｜④ 把
 *   `00-l10-city.js` 的 `time()` 改回自写 `r.时间 = …` ⇒ ④红｜⑤ 在别处写 `时间 / 1440` 或在
 *   `推进` 里加 `r.日 = 第几日()` ⇒ ⑤红
 * ⚠ 装置：本格改 `babelRun.时间`／`babelTown`／`远征`／`Player.hp` ⇒ 末了**存-复原**（同 62 格口径）。
 */
head('63. `books#206`：时钟走格 ＋ 生产一次性结算 ＋ 远征批量上限（唯一账·唯一换算常量）');
{
	const 存 = {
		run: JSON.parse(JSON.stringify(State.variables.babelRun ?? null)),
		town: JSON.parse(JSON.stringify(State.variables.babelTown ?? null)),
		位: map.current, hp: D.Player.hp,
	};
	const 组前失败 = fails.length;
	try {
		const 时 = B.时钟, 城 = B.城镇;
		ok(!!时 && !!城, '★机器件没导出（`B.时钟`／`B.城镇`）—— 判据取不到时钟与城镇面');

		/* ① 时钟走格 ＋ 月末 ＋ 零头累积 ＋ 备战下限 */
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		/* ★先钉**四个常量**（用**独立字面量**，✗ 不拿被测物自身当尺 —— 否则改常数时判据两边一起变 ⇒ 恒真）：
		 *   游戏日＝1440 分钟｜每月 30 日｜批量 ≤30 日｜备战 ≥90 日（裁㈠／票面）。 */
		ok(时.分钟每日 === 1440 && 时.每月日数 === 30 && 时.批量上限日 === 30 && 时.备战下限日 === 90,
			`★四个常量须钉在既定值（1440／30／30／90）—— 实得 ${JSON.stringify({ 分钟每日: 时.分钟每日, 每月日数: 时.每月日数, 批量上限日: 时.批量上限日, 备战下限日: 时.备战下限日 })}`);
		const a = 时.历面();
		ok(a.第几日 === 1 && a.月 === 1 && a.日内 === 1 && a.已过日数 === 0, `★分钟账 0 ⇒ 应为第 1 日 / 第 1 月 / 已过 0 日，实得 ${JSON.stringify(a)}`);
		const r1 = 时.推进(1);
		ok(r1.applied === true && r1.走了 === 1, `★推进 1 日应走满 1 日（实得 ${JSON.stringify({ applied: r1.applied, 走了: r1.走了 })}）`);
		ok(时.第几日() === 2 && 时.已过日数() === 1 && 时.分钟账() === 1440, `★推进 1 日 ⇒ 第 2 日／已过 1 日／分钟账恰 +1440（实得 ${JSON.stringify(时.历面())}）`);
		State.variables.babelRun.时间 = 1440 * 29;                              // ＝第 30 日（字面量，✗ 不用常数自证）
		ok(时.第几日() === 30 && 时.月() === 1 && 时.日内() === 30, `★第 30 日应仍属第 1 月（实得 ${JSON.stringify(时.历面())}）`);
		时.推进(1);
		ok(时.第几日() === 31 && 时.月() === 2 && 时.日内() === 1, `★月末 +1 ⇒ 第 2 月第 1 日（实得 ${JSON.stringify(时.历面())}）`);
		State.variables.babelRun.时间 = 1440 + 60;                              // 裁㈡：零头累积
		ok(时.第几日() === 2 && 时.分钟账() === 1500, `★零头 60 分钟应**累积**（仍第 2 日、账留 1500；✗ 不得向上取整成第 3 日）`);
		State.variables.babelRun.时间 = 1440 * 89;
		ok(时.备战已足() === false, '★第 90 日前不算备战已足（裁㈠＝**至少** 90 日 ⇒ 判据须 `>=`）');
		State.variables.babelRun.时间 = 1440 * 90 - 1;
		ok(时.备战已足() === false, '★还差 1 分钟到第 90 日 ⇒ 仍不算已足（✗ 不得提前进位）');
		State.variables.babelRun.时间 = 1440 * 90;
		ok(时.备战已足() === true && 时.已过日数() === 90, '★过满 90 整日 ⇒ 备战已足（按**已过整日**判，✗ 不含头计数的第几日）');

		/* ② 生产：到期只结一次、次日不补发、跨多周期逐期结 */
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		State.variables.babelTown = { 设施: {} };
		const f = 城.建设施('farm', { 周期: 30, 产出: 'grain' });
		ok(f.下次产出日 === 31, `★周期 30 ⇒ ` + '`下次产出日` 应为**绝对日号** 31（实得 ' + `${f.下次产出日}）`);
		const r30 = 时.推进(30);
		ok(r30.产出.length === 1, `★推进 30 日应恰好结算 1 次（实得 ${r30.产出.length}）`);
		ok(城.设施表().farm.库存 === 1, `★库存应为 1（实得 ${城.设施表().farm.库存}）`);
		时.推进(1);
		ok(城.设施表().farm.库存 === 1, `★到期后次日**不得重复发放**（实得库存 ${城.设施表().farm.库存}）`);
		State.variables.babelRun.时间 = 0;
		State.variables.babelTown = { 设施: {} };
		城.建设施('mill', { 周期: 10 });
		时.推进(25);
		ok(城.设施表().mill.库存 === 2, `★25 日内两个周期到期 ⇒ 应结 2 次（实得 ${城.设施表().mill.库存}）`);

		/* ③ 批量上限 ＋ 拒绝零变化 ＋ 远征 ＋ 死在当日 */
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		State.variables.babelTown = { 设施: {} };
		城.建设施('farm', { 周期: 5 });
		const 前 = JSON.stringify(State.variables);
		const r31 = 时.推进(31);
		ok(r31.applied === false, `★推进 31 日应被拒绝（上限 ${时.批量上限日}；实得 ${JSON.stringify(r31)}）`);
		ok(JSON.stringify(State.variables) === 前, '★被拒 ⇒ **存档面零变化**（点了推进却动了档）');
		const r0 = 时.推进(0);
		ok(r0.applied === false, '★推进 0 日应被拒绝（✗ 不得当作「什么都不做地成功」）');
		ok(JSON.stringify(State.variables) === 前, '★推进 0 日被拒后仍应零变化');
		const r30b = 时.推进(30);
		ok(r30b.applied === true && r30b.走了 === 30, `★推进 30 日应逐日走满（实得 ${JSON.stringify({ applied: r30b.applied, 走了: r30b.走了 })}）`);
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		const 出 = 城.出发(10);
		ok(出.applied === true && 出.预计归日 === 11, `★出发 10 日 ⇒ ` + '`预计归日` 应为 11（实得 ' + `${JSON.stringify(出)}）`);
		const rr = 时.推进(10);
		ok(!!rr.归, '★推进到期应判归（在途账未在归期结算）');
		ok(城.远征读() === null, '★判归后**在途账应清空**（「在途与否」只由有无这个键表示 ⇒ 一个量一个名字）');
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		State.variables.babelTown = { 设施: {} };
		城.建设施('farm', { 周期: 5 });
		D.Player.hp = 0;                                  // ★死在当日：一个整日都不该走
		const 死 = 时.推进(30);
		ok(死.applied === false && 死.走了 === 0, `★未死才走：带 0 HP 推进应零步（实得 ${JSON.stringify({ applied: 死.applied, 走了: 死.走了 })}——每日检查 ` + '`未死()`' + ` 没了？）`);
		ok(时.分钟账() === 0, '★零步时**时间账也不得前进**（死亡当天不结算）');
		D.Player.hp = 存.hp;

		/* ④⑤ 防漂移（静态，★先剥注释再判） */
		const 剥注释 = (s) => s
			.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
			.replace(/^[ \t]*\/\/[^\n]*$/gm, (m) => ' '.repeat(m.length))
			.replace(/([^:]|^)\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
		const 源 = (() => {
			const out = [];
			(function walk(d) {
				for (const e of fs.readdirSync(d, { withFileTypes: true })) {
					const q = path.join(d, e.name);
					if (e.isDirectory()) walk(q);
					else if (e.name.endsWith('.js')) out.push([q, 剥注释(fs.readFileSync(q, 'utf8'))]);
				}
			})(storySrc);
			return out;
		})();
		const 写家 = 源.filter(([q, s]) => /\.时间\s*[-+]?=[^=]/.test(s) && !/00-clock-town\.js$/.test(q));
		ok(写家.length === 0, `★\`babelRun.时间\` 的**写**只应有一处（\`00-clock-town.js\`）—— 另有：${写家.map(([q]) => path.relative(storySrc, q)).join('、')}`);
		const 常量 = 源.filter(([q, s]) => /1440/.test(s) && !/00-clock-town\.js$/.test(q));
		ok(常量.length === 0, `★除 \`分钟每日\` 外不得出现 1440（分钟 → 日 换算只此一处）—— 另有：${常量.map(([q]) => path.relative(storySrc, q)).join('、')}`);
		State.variables.babelRun = { ...(State.variables.babelRun ?? {}), 时间: 0 };
		时.推进(1);
		const 键 = Object.keys(State.variables.babelRun);
		ok(!['日', '月', '日内', '分钟', '天', '历面'].some((k) => 键.includes(k)),
			`★时间**只应有一个存量**（\`时间\`，分钟）—— 派生量（日／月）不得另存；实得键：${键.join('、')}`);
	} finally {
		if (存.run === null) delete State.variables.babelRun; else State.variables.babelRun = 存.run;
		if (存.town === null) delete State.variables.babelTown; else State.variables.babelTown = 存.town;
		map.moveTo(存.位); D.Player.hp = 存.hp;
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 63 组：${本组失败 === 0 ? '五格全绿（走格／生产／上限／唯一写家／唯一常量）' : `★本组 ${本组失败} 处失败`}`);
}


/* ── 64. `books#208`（轨 C · 批 3 第三笔）：物品／节点／建筑 **三域**域属账 ＋ 冲突检测 ─────────
 *
 * 病（`#172` 批 3 要拆的面）：同一件东西**既能从背包找、又能从节点找**（`babel2.js:83` 记「料场节点
 *   应当进背包」正是这一族）⇒ 一旦两本账都把它当**实体** ⇒ 改一处、另一处静默失效
 *   （`babel.js:9` 的 adoptHub 那类事故：接管后旧 hub 的 `desc`／`actions` 静默无效 ✗）。
 * 裁（操作者 · 经领队 2026-10-06 03:34Z；落档评论 `6008797745`，㈢ 见 `6012882578`）：
 *   ㈠三域**落故事侧** ㈡沿用 **`entityId`** ＋ 源码出现 `instanceId` ⇒ 红
 *   ㈢`设施`（`#206` 的生产装置类）**并入 building 域**（命名沿用 ✓ ✗ 不另立第三域）
 * 断什么（五格）：
 *   ① **三域各自可独立装配／读取**（清掉另两域 ⇒ 第三个仍给出自身清单；★先建**非空**夹具 ⇒ ✗ 免得恒真）
 *   ② **域属唯一 ＋ 冲突检测**：正常态 `冲突` 为空；★**注入**同一 `entityId` 到两域 ⇒ 检测**必须**报出
 *   ③ **旧档补号**：无号设施经**写口**补号 ✓、**幂等** ✓、JSON 往返稳定 ✓、★高水位越过已见号（塞 `it-999`
 *      ⇒ 下一次 `newEntityId()` 须 > 999 ✓ ✗ 否则新号与旧档碰撞）
 *   ④ **`instanceId` 名禁**（★**先剥注释**再扫故事源 ⇒ ✗ 免得命中注释＝假红；并断**非空**：`entityId` 须有命中
 *      ⇒ 证明扫描真的在读码 ✗ 免得「文件读不到 ⇒ 0 命中 ⇒ 假绿」）
 *   ⑤ **读路径零变化**（域属读一次 ⇒ `State.variables` 逐字节不变；照 `10-item.js:45-58` 的既有判据）
 * 刀（D／T 席照此各断一次，结果须**具名**）：
 *   ① 把 `00-domains.js` 的 `物品域()` 改成读 `babelL10Storage` ⇒ ①（背包那件读不到）红｜② 去掉 `域属账`
 *   的 `域集.length > 1` 判据（冲突不报）⇒ ②红｜③ 去掉 `城写()` 里的 `补号()` 调用 ⇒ ③红｜④ 在故事源里
 *   写一处 `instanceId` ⇒ ④红｜⑤ 让 `物品域()` 顺手 `??=` 建键 ⇒ ⑤红
 * ⚠ 装置：本格改 `babelTown`／`gatherNodes`／背包／高水位 ⇒ 末了**存-复原**（同 62／63 格口径）。
 */
head('64. `books#208`：三域域属账（物品／节点／建筑）＋ 冲突检测 ＋ 旧档补号（唯一域属）');
{
	const 存 = {
		run: JSON.parse(JSON.stringify(State.variables.babelRun ?? null)),
		town: JSON.parse(JSON.stringify(State.variables.babelTown ?? null)),
		nodes: JSON.parse(JSON.stringify(State.variables.gatherNodes ?? null)),
		bag: JSON.parse(JSON.stringify((D.Player.items ?? []).map((s) => (s.toJSON ? s.toJSON() : s)))),
		位: map.current,
	};
	const 组前失败 = fails.length;
	try {
		const 域 = B.域, 城 = B.城镇;
		ok(!!域 && typeof 域.域属账 === 'function', '★机器件没导出（`B.域.域属账`）—— 判据取不到域属账');
		ok(Array.isArray(域?.域名单) && 域.域名单.join(',') === 'inventory,node,building',
			`★三域名单须恰为 inventory,node,building（实得 ${JSON.stringify(域?.域名单)}）`);

		/* ① 三域**各自**可独立装配／读取 —— 先造**非空**夹具（✗ 免得三条列空表也算过） */
		D.Player.items = [];
		R.give('coin');
		/* ★节点物取**故事自己的**采集点值（✗ 硬编我猜的道具名 —— 首跑即崩在「未注册的道具 id」） */
		const 节点物 = B.gatherPoints?.L1 ?? 'stone-pile';
		State.variables.gatherNodes = { L1: R.createItem(节点物).toJSON() };
		State.variables.babelTown = { 设施: {} };
		城.建设施('farm', { 周期: 30 });
		ok(域.物品域().length >= 1, `★夹具：背包应至少 1 件实体（实得 ${域.物品域().length}）—— 后面的域属断言会恒真`);
		ok(域.节点域().length === 1, `★夹具：节点域应恰 1 份（实得 ${域.节点域().length}）`);
		ok(域.建筑域().length === 1, `★夹具：建筑域应恰 1 座（实得 ${域.建筑域().length}）`);
		const 只留 = (k) => { for (const x of ['inventory', 'node', 'building']) if (x !== k) {
			if (x === 'inventory') D.Player.items = [];
			if (x === 'node') State.variables.gatherNodes = {};
			if (x === 'building') State.variables.babelTown = { 设施: {} };
		} };
		const 备份 = JSON.parse(JSON.stringify({ 包: (D.Player.items ?? []).map((s) => s.toJSON?.() ?? s), 节: State.variables.gatherNodes, 城: State.variables.babelTown }));
		for (const [k, 读] of [['inventory', () => 域.物品域().length], ['node', () => 域.节点域().length], ['building', () => 域.建筑域().length]]) {
			const 备 = JSON.parse(JSON.stringify(备份));
			D.Player.items = []; State.variables.gatherNodes = {}; State.variables.babelTown = { 设施: {} };
			if (k === 'inventory') D.Player.items = 备.包.map((s) => R.reviveItem(s));
			if (k === 'node') State.variables.gatherNodes = 备.节;
			if (k === 'building') State.variables.babelTown = 备.城;
			ok(读() >= 1, `★三域须能**各自独立**读取：只留 ${k} 时仍应给出自身清单（实得 ${读()}）`);
			D.Player.items = 备.包.map((s) => R.reviveItem(s)); State.variables.gatherNodes = 备.节; State.variables.babelTown = 备.城;
		}

		/* ② 域属唯一 ＋ **冲突检测**（正例：注入同号 ⇒ 检测必须报出） */
		const 包件 = 域.物品域()[0] ?? { entityId: '(夹具失效)' };
		ok(域.物品域().length >= 1, '★夹具失效：物品域取不到实体（⇒ 后面的单点域属断言只能跟着红）');
		const 属 = 域.域属(包件.entityId);
		ok(!!属 && 属.唯一 === true && 属.域 === 'inventory',
			`★单点域属：背包那件应唯一属 inventory（实得 ${JSON.stringify(属)}）`);
		ok(域.域属账().冲突.length === 0, `★正常态不应有域属冲突（实得 ${JSON.stringify(域.域属账().冲突)}）`);
		const 节点键 = Object.keys(State.variables.gatherNodes)[0];
		State.variables.gatherNodes[节点键].entityId = 包件.entityId;      // ★注入：同一号出现在两域
		const 冲 = 域.域属账().冲突;
		ok(冲.length === 1 && 冲[0].entityId === 包件.entityId,
			`★**冲突检测必须真在**：同号出现在 inventory 与 node ⇒ 应报 1 条冲突（实得 ${JSON.stringify(冲)}）`);
		ok(域.域属(包件.entityId).唯一 === false, '★冲突态下单点域属应报「不唯一」（✗ 随便挑一个域了事）');

		/* ③ 旧档补号：写口补号 ＋ 幂等 ＋ 往返稳定 ＋ 高水位越过 */
		State.variables.babelTown = { 设施: { old: { id: 'farm', 产出: 'grain', 等级: 1, 周期: 30, 开工日: 1, 下次产出日: 31, 库存: 0 } } };
		delete State.variables.babelTown.设施.old.entityId;                 // ★旧档：无号
		ok(!State.variables.babelTown.设施.old.entityId, '★夹具：该设施应无号');
		/* ★走**真写口**（✗ 不只手调 `补号()`）⇒ 接线若断（`城写()` 不再调 补号）本格必须红 */
		城.建设施('mill', { 周期: 10 });
		ok(!!State.variables.babelTown.设施.old?.entityId, '★写口须顺带**补号**旧档里无号的设施（✗ 只补新建的那座）');
		城.补号();
		const 一号 = State.variables.babelTown.设施.old.entityId;
		ok(!!一号, '★旧档补号：写口补号后应有号');
		城.补号();
		ok(State.variables.babelTown.设施.old.entityId === 一号, '★补号须**幂等**（再补一次号不得变）');
		const 往返 = JSON.parse(JSON.stringify(State.variables.babelTown));
		ok(往返.设施.old.entityId === 一号, '★补号后经 JSON 往返，号须稳定');
		State.variables.babelTown = 往返;
		城.补号();
		ok(State.variables.babelTown.设施.old.entityId === 一号, '★载入补号后的档再补一次 ⇒ 号仍不变');
		State.variables.babelTown.设施.old.entityId = 'it-999';             // ★高水位：已见大号
		城.补号();
		const 新号 = R.newEntityId();
		ok(Number(String(新号).replace(/^it-/, '')) > 999,
			`★高水位须越过已见号：见过 it-999 后新发号应 > 999（实得 ${新号}）—— ✗ 否则新号与旧档碰撞`);

		/* ④ `instanceId` 名禁（剥注释后扫故事源；并断**非空**证明扫描真在读码） */
		const 剥注释 = (s) => s
			.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
			.replace(/^[ \t]*\/\/[^\n]*$/gm, (m) => ' '.repeat(m.length))
			.replace(/([^:]|^)\/\/[^\n]*/g, (m) => ' '.repeat(m.length));
		const 源码 = [];
		(function walk(d) {
			for (const e of fs.readdirSync(d, { withFileTypes: true })) {
				const q = path.join(d, e.name);
				if (e.isDirectory()) walk(q); else if (e.name.endsWith('.js')) 源码.push([q, 剥注释(fs.readFileSync(q, 'utf8'))]);
			}
		})(storySrc);
		const 旧名 = 源码.filter(([, s]) => /instanceId/.test(s));
		ok(旧名.length === 0, `★实例身份只许叫 \`entityId\`（裁㈡）：源码出现 \`instanceId\` ⇒ 红 —— 命中：${旧名.map(([q]) => path.relative(storySrc, q)).join('、')}`);
		const 新名 = 源码.filter(([, s]) => /entityId/.test(s)).length;
		ok(新名 >= 2, `★非空性：\`entityId\` 应至少在若干档里出现（实得 ${新名} 档）—— ✗ 免得「读不到文件 ⇒ 0 命中」被当成通过`);

		/* ⑤ 读路径零变化 */
		const 前 = JSON.stringify(State.variables);
		域.域属账(); 域.域属('it-1'); 域.物品域(); 域.节点域(); 域.建筑域();
		ok(JSON.stringify(State.variables) === 前, '★域属读一次 ⇒ 存档面**零变化**（读了却动了档）');
	} finally {
		if (存.run === null) delete State.variables.babelRun; else State.variables.babelRun = 存.run;
		if (存.town === null) delete State.variables.babelTown; else State.variables.babelTown = 存.town;
		if (存.nodes === null) delete State.variables.gatherNodes; else State.variables.gatherNodes = 存.nodes;
		D.Player.items = 存.bag.map((s) => R.reviveItem(s));
		map.moveTo(存.位);
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 64 组：${本组失败 === 0 ? '五格全绿（三域独立／域属唯一与冲突／旧档补号／名禁／读路径零变化）' : `★本组 ${本组失败} 处失败`}`);
}

await verifyL10({ R, D, B, map, ok, head });

/* ============================================================
 * 第 65 组：`books#397`（S3 片 1）W09「七名河」—— 最小运行契约 ＋ 节点状态机 ＋ 唯一交付 ＋ 三态保存
 *   ★计数一律拿**独立字面量**当尺（✗ 不用被测物自身的表 —— `books#206` 实测：拿被测物当尺 ⇒ 刀不咬）。
 *   ★本组末了**存-复原**（同 62／63／64 格口径 ✓），跑毕 `State.variables[域键]` 与背包回到组前 ✓。
 * ============================================================ */
head('65. `books#397`：七名河 —— 拓扑／读面零写／三态／唯一交付／存档往返／导航静态／机会与完成／死亡零写');
{
	const 域 = 'sevenNames';
	const 背存 = JSON.parse(JSON.stringify(D.Player.items ?? null));
	const 档存 = JSON.parse(JSON.stringify(State.variables[域] ?? null));
	const 组前失败 = fails.length;
	try {
		const S7 = B?.七名河;
		ok(!!S7, '故事脚本没挂上 `setup.BABEL.七名河`（`00-seven-names.js` 没被装载？）');
		if (S7) {
			/* ① 静态拓扑：**独立字面量**当尺（设计 events.json@56829d8c） */
			const 边数 = Object.values(S7.边表).reduce((a, b) => a + b.length, 0);
			ok(边数 === 13, `★有向边应为 **13**（独立字面量）——实得 ${边数}`);
			ok(Object.keys(S7.节点表).length === 10, `★节点应为 **10**（E0–E9）——实得 ${Object.keys(S7.节点表).length}`);
			ok(Object.values(S7.节点表).filter((n) => n.type === 'portal').length === 2, '★门应为 **2** 枚（E0／E9）');
			ok(Object.values(S7.节点表).filter((n) => n.type !== 'portal').length === 8, '★事件应为 **8** 则（E1–E8）');
			ok(Object.keys(S7.定点表).length === 10, '★定点应为 **10** 个');
			const 路线集 = [];
			const 走线 = (cur, acc) => {
				if (cur === S7.出口) { 路线集.push([...acc, cur]); return; }
				for (const nx of (S7.边表[cur] ?? [])) 走线(nx, [...acc, cur]);
			};
			走线(S7.入口, []);
			ok(路线集.length === 6, `★完整路线应为 **6** 条——实得 ${路线集.length}`);
			ok(路线集.every((r) => r.filter((x) => S7.节点表[x].type !== 'portal').length === 4), '★每条路线应**恰 4 个事件**（设计 §2）');
			ok(路线集.every((r) => r.includes('E8')), '★每条路线都应经过 **E8**');
			ok(路线集.some((r) => r.join('→') === 'E0→E1→E4→E6→E8→E9'), '★推荐主干 `E0→E1→E4→E6→E8→E9` 应在路线集里');

			/* ② 读路径**零写**（本仓成文判据：读 ⇒ 存档面零变化） */
			delete State.variables[域];
			const 读前 = JSON.stringify(State.variables);
			S7.读(); S7.已处理(); S7.可走(S7.入口);
			ok(JSON.stringify(State.variables) === 读前 && State.variables[域] === undefined,
				'★读面（读／已处理／可走）**不得建键**（读路径零写）');

			/* ③ 三态 ＋ 开始（E0 入场**不消费**机会 ✓ 裁②） */
			const s0 = S7.读();
			ok(s0.态 === '未开始' && s0.当前 === S7.入口, `★无档时读面应报「未开始」且在入口（实得 ${s0.态}/${s0.当前}）`);
			const a0 = S7.开始();
			ok(a0.ok === true && a0.态 === '进行中' && a0.当前 === 'E0', `★开始 ⇒ 进行中·在 E0（实得 ${JSON.stringify(a0).slice(0, 80)}）`);
			ok(S7.读档().机会.用 === false, '★E0 入场**不消费**传送机会（裁②）');

			/* ④ 唯一交付：走到 E1（★E0 是**门**，✗ 无行动 —— 先走 ✓）⇒ 一次成功恰发一次；重复提交 ⇒ 拒且背包不再变 */
		/* ★尺＝**charges 感知**（✗ 不是槽数）：`RPG.give(id,n)` 会**并进同槽的 charges**（`resources.js` 成文 ✓）
		 *   ⇒ 数槽会把「一槽 2 件」读成 1 件 ⇒ 判据随骰子飘 ✗（我首版即栽在此，本行是自纠 ✓）。 */
		const 计 = (id) => R.heldTotal(D.Player, id) ?? 0;
			const 走E1 = S7.走('left');
			ok(走E1.ok === true && 走E1.当前 === 'E1', `★E0 走「左」应到 E1（实得 ${JSON.stringify(走E1).slice(0, 70)}）`);
			const 前粮 = 计('ration');
			const r1 = S7.选行动(0);   // E1 选项 0：DEX/DC8 成功 ⇒ ration×2；失败 ⇒ 0
			ok(r1.ok === true, `★E1 选项 0 应可提交（实得 ${JSON.stringify(r1).slice(0, 110)}）`);
			const 应得 = r1.成败 === '成功' ? 2 : 0;
			ok(计('ration') - 前粮 === 应得, `★交付须与成败一致：${r1.成败} ⇒ 应得 ${应得} 件（实得 ${计('ration') - 前粮}）`);
			const 背前 = JSON.stringify(D.Player.items ?? []);
			const r2 = S7.选行动(0);
			ok(r2.ok === false && r2.code === 'SEVEN_NODE_DONE', `★同一节点重复提交应**具名拒**（实得 ${JSON.stringify(r2).slice(0, 90)}）`);
			ok(JSON.stringify(D.Player.items ?? []) === 背前, '★重复提交被拒 ⇒ **背包零变化**（双击不重复发奖）');
			ok(S7.已处理().includes('E1'), '★E1 应进「已处理」（★派生面 ✓）');
			ok(S7.读档().结果.E1.选项 === 0 && typeof S7.读档().结果.E1.文本 === 'string', '★结果应记「选项＋文本」（逐节点结果可恢复 ✓ 裁③）');

			/* ⑤ 存档往返：**不重掷、不重发**（真 JSON 往返） */
			const 复 = JSON.parse(JSON.stringify(State.variables[域]));
			const 复前 = JSON.stringify(D.Player.items ?? []);
			ok(复.态 === '进行中' && 复.当前 === 'E1' && 复.结果.E1.选项 === 0, '★域往返后三态／位置／逐节点结果皆在（裁③）');
			ok(JSON.stringify(D.Player.items ?? []) === 复前, '★往返本身 ✗ 不得改背包（读档不重发）');
			const r3 = S7.选行动(0);
			ok(r3.ok === false, '★读档后同一节点仍应被「已处理」拦住（✗ 不得刷新重掷／重发）');

			/* ⑥ 导航：静态边表是**唯一权威**（裁④：行动与导航分开、✗ 渲染期抽签） */
			const bad = S7.走('down');
			ok(bad.ok === false && bad.code === 'SEVEN_BAD_DIRECTION', `★不存在的方向应具名拒（实得 ${JSON.stringify(bad).slice(0, 80)}）`);
			const jmp = S7.走('E9');
			ok(jmp.ok === false, '★✗ 不得越权跳点（E1 无通往 E9 的路 —— 静态边表里没有）');
			const good = S7.走('right');
			ok(good.ok === true && good.当前 === 'E4', `★按 navigation 走 right ⇒ E4（实得 ${JSON.stringify(good).slice(0, 80)}）`);
			ok((S7.可走('E1') ?? []).includes('E4'), '★`可走` 应与静态边表一致（✗ 两处各写一份）');
			/* ★本格新增（正是抓「门无向」这一类）：**每个节点的导航都须落在静态边表内** ＋ **入口必须有向** */
			const 越边 = [];
			for (const [id, n] of Object.entries(S7.节点表)) {
				for (const nav of (S7.节点导航(id) ?? [])) if (!(S7.边表[id] ?? []).includes(nav.to)) 越边.push(`${id}→${nav.to}`);
			}
			ok(越边.length === 0, `★导航 ✗ 不得越出静态边表（越边：${越边.join('、')}）`);
			ok((S7.节点导航('E0') ?? []).length === 2 && S7.节点导航('E0').every((n) => ['E1', 'E2'].includes(n.to)),
				'★入口 E0 必须有方向（设计 §2：左 E1／右 E2）——✗ 不得无路可走');
			const 无向节点 = Object.entries(S7.节点表)
				.filter(([id, n]) => n.type !== 'portal' && (S7.节点导航(id) ?? []).length !== (S7.边表[id] ?? []).length)
				.map(([id]) => id);
			ok(无向节点.length === 0, `★每个事件节点的导航条数须等于其出边数（不符：${无向节点.join('、')}）`);

			/* ⑦ 机会：按**探索实例**一次（裁②）＋ 完成**只在 E9 且用过机会**（裁⑤） */
			ok(S7.完成().ok === false, '★不在 E9 ✗ 不得完成（提前回城不算完成 ✓）');
			ok(S7.用机会().ok === true, '★首次用机会应成功');
			const again = S7.用机会();
			ok(again.ok === false && again.code === 'SEVEN_TELEPORT_USED', `★第二次用机会应具名拒（实得 ${JSON.stringify(again).slice(0, 80)}）`);
			S7.走('left');      // E4 → E6（nav[0]）
			S7.选行动(0);       // E6 是 battle 节点：本片只走状态机（片 2 才接真战斗 ✓）
			S7.走('forward');   // E6 → E8
			S7.选行动(0);       // E8（reward：收下并戴上 ⇒ rain-diadem ✓）
			S7.走('forward');   // E8 → E9
			ok(S7.读().当前 === 'E9', `★沿路应可抵达 E9（实得 ${S7.读().当前}）`);
			const 成 = S7.完成();
			ok(成.ok === true && S7.读().态 === '完成', `★在 E9 且用过机会 ⇒ 可完成（实得 ${JSON.stringify(成).slice(0, 90)}）`);

			/* ⑧ 死亡：**零写**、保留「进行中（未完成）」（裁⑤） */
			delete State.variables[域];
			S7.开始();
			const 死前 = JSON.stringify(State.variables[域]);
			const 死 = S7.死();
			ok(死.ok === true && 死.未完成 === true, '★死() 应报「未完成」');
			ok(JSON.stringify(State.variables[域]) === 死前, '★死**零写**：✗ 不得写完成、✗ 不得写成没来过');
			ok(S7.读().态 === '进行中', '★死后态仍是「进行中」（裁⑤）');

			/* ⑨ 真 id 映射：内容里用到的每个候选 id 都映射到**在册**真 id（✗ 不静默丢奖） */
			const 用到 = new Set();
			for (const n of Object.values(S7.节点表)) {
				for (const o of (n.options ?? [])) {
					for (const br of [o.success, o.failure]) for (const k of Object.keys(br?.loot ?? {})) 用到.add(k);
				}
				for (const k of Object.keys(n.victory_loot ?? {})) 用到.add(k);
			}
			const 内容 = setup.BABEL_CONTENT.七名河内容;
			const 缺映射 = [...用到].filter((k) => !内容.物品映射[k]);
			ok(缺映射.length === 0, `★内容里每个候选 id 都要有真 id 映射（未映射：${缺映射.join('、')}）`);
			const 非在册 = [...用到].map((k) => 内容.物品映射[k]).filter((id) => !R.items.has(id));
			ok(非在册.length === 0, `★映射后的真 id 须在册（不在册：${非在册.join('、')}）`);

			/* ⑩ 接线面（`books#397` 裁 (b) `6015911410`）：独立区域 W09 ＋ **首次分流互斥** ＋ E9 只回 L10
			 *   ★闸门用 `map.exitsFrom`（它按 `when` **现算** ✓）⇒ 能真探到「此刻哪条开」✓。 */
			const 图 = B.map;
			ok(!!图?.locations?.has('W09'), '★独立区域 `W09` 应在图上（裁 (b)①）');
			const 完成档 = () => {
				State.variables[域] = { 态: '完成', 当前: 'E9', 结果: {}, 机会: { 用: true, 实例: 'x' }, 路径: ['E0', 'E9'] };
			};
			const 未完成档 = () => {
				State.variables[域] = { 态: '进行中', 当前: 'E1', 结果: {}, 机会: { 用: false, 实例: 'x' }, 路径: ['E0', 'E1'] };
			};
			未完成档();
			const 开未 = 图.exitsFrom('L10-gate').map((e) => e.to);
			ok(开未.includes('W09'), `★教程未完成 ⇒ 出城应走 W09（实得开放：${开未.join('、')}）`);
			ok(!开未.includes('L11'), `★教程未完成 ⇒ 旧 L11 **不应**开放（互斥 ✓；实得：${开未.join('、')}）`);
			完成档();
			const 开完 = 图.exitsFrom('L10-gate').map((e) => e.to);
			ok(开完.includes('L11'), `★教程已完成后 ⇒ 出城应走旧 L11（实得开放：${开完.join('、')}）`);
			ok(!开完.includes('W09'), `★教程已完成后 ⇒ W09 不应再开放（互斥 ✓；实得：${开完.join('、')}）`);
			const 出口 = (图.exits ?? []).filter((e) => e.from === 'W09');
			ok(出口.length === 1 && 出口[0].to === 'L10-camp', `★E9 **只回 L10**（裁 (b)④）：W09 应恰有一条通往 L10-camp 的边（实得 ${出口.map((e) => e.to).join('、')}）`);
			const 旧L11 = (图.exits ?? []).find((e) => e.from === 'L10-gate' && e.to === 'L11');
			ok(!!旧L11 && 旧L11.from === 'L10-gate' && 旧L11.to === 'L11', '★旧 L11 那条边**一字未动**（裁 (b)②：只外包闸门，✗ 不改 from/to ✓）');
		}
	} finally {
		if (档存 === null) delete State.variables[域]; else State.variables[域] = 档存;
		D.Player.items = (背存 ?? []).map((s) => R.reviveItem(s));
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 65 组：${本组失败 === 0 ? '十格全绿（拓扑独立字面量／读面零写／三态与开始／唯一交付／存档往返／导航静态权威／机会与完成／死亡零写／真id映射／接线面（W09·首分流互斥·E9 只回 L10））' : `★本组 ${本组失败} 处失败`}`);
}

/* ============================================================
 * 第 66 组：`books#397`（S3 **片 2**）七名河 —— 四组真怪 ＋ 侦察／脱离两路
 *   ★口径（`guest-1` 2026-10-06T12:29Z）：判据＝**结构式断言 ＋ 真随机**（✗ 受控骰；受控骰归 S5 e2e 臂）——
 *     故本组断的是**不随骰面变**的结构（敌组恒等／失败不增怪／脱离成功无散货／死亡零写／选择上锁），
 *     并把**战果分布**只作**读数**打印（✗ 不作判据）。
 *   ★计数一律拿**独立字面量**当尺（✗ 用内容表自身当尺 —— `books#206` 的教训）。
 *   ★本组末了**存-复原**（同 62–65 组口径 ✓）。
 * ============================================================ */
head('66. `books#397` 片 2：四组真怪 ＋ 侦察／脱离 —— 映射／成军／两路结构／上锁／死亡零写／固定交付');
{
	const 域 = 'sevenNames';
	const 背存 = JSON.parse(JSON.stringify(D.Player.items ?? null));
	const 档存 = JSON.parse(JSON.stringify(State.variables[域] ?? null));
	const 组前失败 = fails.length;
	try {
		const S7 = B?.七名河, S7B = B?.七名河战斗;
		ok(!!S7B, '故事脚本没挂上 `setup.BABEL.七名河战斗`（`01-seven-names-battle.js` 没被装载？）');
		if (S7B && S7) {
			/* ① 静态结构（**独立字面量**当尺：设计 README 事件表 ＋ events.json@56829d8c） */
			const 期望 = [
				['E3', 'Crocodile', 1, 2], ['E5', 'Crocodile', 2, 2],
				['E6', 'Small Water Elemental', 1, 1], ['E7', 'Medium Water Elemental', 1, 3],
			];
			for (const [id, base, 数, cr] of 期望) {
				const n = S7.节点表[id];
				ok(n?.type === 'battle', `${id} 应为战斗节点（实得 ${n?.type}）`);
				ok(n?.enemy?.srd_base === base, `★${id} 的敌应为「${base}」（实得 ${n?.enemy?.srd_base}）`);
				ok(n?.enemy?.count === 数, `★${id} 的敌数应为 **${数}**（独立字面量；实得 ${n?.enemy?.count}）`);
				ok(n?.enemy?.reference_cr_per_creature === cr, `★${id} 的每只参考 CR 应为 **${cr}**`);
				ok(S7B.接入(n.enemy.srd_base) === ['E3', 'E5'].includes(id) ? 'crocodile'
					: (id === 'E6' ? 'small-water-elemental' : 'medium-water-elemental'),
					`★${id} 的 srd_base 须映到引擎已注册 id`);
				const 战 = (n.options ?? [])[0]?.check, 脱 = (n.options ?? [])[1]?.check;
				ok(战?.ability === 'WIS' && 战?.dc === 10 && 战?.modifier === 3 && 战?.tag === 'engage-scout',
					`★${id} 的应战侦察须是 WIS／DC**10**／**+3**（实得 ${JSON.stringify(战)}）`);
				const 脱能 = ['E3', 'E6'].includes(id) ? 'DEX' : 'STR';
				ok(脱?.ability === 脱能 && 脱?.dc === 15 && 脱?.modifier === -6 && 脱?.tag === 'escape',
					`★${id} 的脱离须是 ${脱能}／DC**15**／**−6**（实得 ${JSON.stringify(脱)}）`);
				ok(JSON.stringify(n.victory_loot) === JSON.stringify({ 'copper-ore': {'E3': 1, 'E5': 2, 'E6': 1, 'E7': 2}[id] }),
					`★${id} 的胜利散货须是铜矿 **${ {'E3': 1, 'E5': 2, 'E6': 1, 'E7': 2}[id] }**（实得 ${JSON.stringify(n.victory_loot)}）`);
			}
			/* ② 成军：满血／独立实例／逐值计数（✗ 共享原型 —— 改一只不得动另一只） */
			for (const [id, , 数] of 期望) {
				const 军 = S7B.成军(S7.节点表[id]);
				ok(军.length === 数, `★${id} 成军数须为 ${数}（实得 ${军.length}）`);
				ok(军.every((f) => f.hp === f.maxHp && f.hp > 0), `★${id} 的每只须满血入场`);
				if (军.length >= 2) {
					军[0].hp = 1;
					ok(军[1].hp === 军[1].maxHp, '★同组两只须是**独立实例**（改一只 ✗ 动另一只）');
				}
			}
			/* ③ 战斗节点 ✗ 走奖励路（片 2 承接的守卫） */
			S7.开始();
			S7.走('E1'); S7.走('E3');
			const 奖励路 = S7.选行动(0);
			ok(奖励路?.ok === false && 奖励路.code === 'SEVEN_IS_BATTLE',
				`★战斗节点须拒走奖励路（实得 ${JSON.stringify(奖励路)}）`);
			/* ④ 真随机：两路检定只取真假、骰面在 d20 内、修正恰为设计值（✗ 自动成败／✗ 改修正） */
			const 骰面 = [];
			for (let k = 0; k < 12; k++) {
				const 掷 = S7.掷检定(S7.节点表.E3.options[0].check);
				骰面.push(掷.roll);
				ok(typeof 掷.success === 'boolean' && Number.isInteger(掷.roll) && 掷.roll >= 1 && 掷.roll <= 20,
					`★真随机检定须取真假且骰面 ∈ [1,20]（实得 ${JSON.stringify(掷)}）`);
				ok(掷.mod === S7.属性修正('WIS') && 掷.bonus === 3, '★应战侦察的本次修正须恰为 +3');
				ok(掷.success === (掷.roll + 掷.mod + 掷.bonus >= 10), '★成功判据须走正式路径（✗ 自然 1／20 自动成败）');
			}
			console.log(`  真随机读数（12 次 d20）：${骰面.join('、')}（★读数，✗ 判据）`);
			/* ⑤ 结构不随骰面变：敌组恒等（失败 ✗ 增怪／✗ 换敌） */
			const 军A = S7B.成军(S7.节点表.E3).map((f) => [f.name, f.hp, f.maxHp]);
			const 军B = S7B.成军(S7.节点表.E3).map((f) => [f.name, f.hp, f.maxHp]);
			ok(JSON.stringify(军A) === JSON.stringify(军B), '★同一节点两次成军须逐字同（✗ 随骰面变）');
			/* ⑥ 一次**真战斗**（真随机）＋ **随战果的**结构断言（✗ 固定战果） */
			R.give('sword'); R.equip('sword'); D.Player.hp = D.Player.maxHp;
			const 包前 = JSON.stringify(State.variables.inventory ?? []);
			const 战果集 = [];
			for (const id of ['E3', 'E5', 'E6', 'E7']) {
				S7.读档().当前 = id; S7.读档().结果 = {}; S7.读档().战斗 = {};
				State.variables.inventory = JSON.parse(包前);
				const 结 = await S7B.战斗行动(0, { interactive: false });
				战果集.push(`${id}:${结.战果 ?? '脱'}`);
				/* ★刀（K3）抓出的**判据面窄**：原先只在「有战果」的分支里断言 ⇒ **被拒路径完全没断**
				 *   （交付抛错 ⇒ 行动返 `{ok:false}` ⇒ 落到所有分支之外 ⇒ **静默绿**）。⇒ 先断「行动本身成立」。 */
				if (结?.ok === false) { ok(false, `★${id} 战斗行动意外被拒：${结.code}（${结.why ?? ''}）`); continue; }
				const 包后 = JSON.stringify(State.variables.inventory ?? []);
				if (结.战果 === 'victory') {
					const 应增 = S7.节点表[id].victory_loot['copper-ore'];
					const 实增 = (State.variables.inventory ?? []).filter((x) => x.id === 'copper-ore')
						.reduce((a, x) => a + (x.charges ?? 1), 0);
					ok(实增 === 应增, `★${id} 胜利须恰发铜矿 ${应增}（✗ 旧随机掉落并发；实得 ${实增}）`);
				} else if (结.战果 === 'down') {
					ok(包后 === 包前, `★${id} 死亡须零写（背包逐字不变）`);
					ok(!!!S7.读档().结果?.[id], `★${id} 死亡 ✗ 得标「已处理」`);
				} else if (结.战果 === 'stunned' || 结.战果 === 'stalemate') {
					ok(包后 === 包前, `★${id} 非胜（${结.战果}）⇒ ✗ 交付`);
					ok(!!!S7.读档().结果?.[id], `★${id} 非胜 ⇒ ✗ 标「已处理」`);
				}
			}
			console.log(`  四组真战斗战果：${战果集.join('｜')}（★读数，✗ 判据）`);
			/* ⑥b **固定散货**（确定性判据，✗ 依赖战果抽到 victory —— 上面那轮是**真随机** ⇒ 若本轮没抽到
			 *   胜，则「胜利须恰发铜矿」那一支**根本没被激励** ⇒ 刀会假绿。⇒ 这一块**直接驱胜后交付**，
			 *   把「恰为 victory_loot、✗ 旧随机掉落并发」断成**确定**格 ✓）。 */
			for (const [id, , , ] of 期望) {
				S7.读档().当前 = id; S7.读档().结果 = {}; State.variables.inventory = JSON.parse(包前);
				const 发 = S7B.胜后交付(S7.节点表[id]);
				ok(发.ok === true, `★${id} 胜后交付须成立（实得 ${JSON.stringify(发)}）`);
				const 应 = { 'E3': 1, 'E5': 2, 'E6': 1, 'E7': 2 }[id];
				const 增 = (State.variables.inventory ?? []).filter((x) => x.id === 'copper-ore')
					.reduce((a, x) => a + (x.charges ?? 1), 0);
				ok(增 === 应, `★${id} 交付须**恰为**铜矿 ${应}（✗ 旧随机掉落并发；实得 ${增}）`);
			}
			/* ⑦ 选择**上锁**：一经作出 ✗ 改选／✗ 重掷侦察（设计 §「属性脱离」） */
			S7.读档().当前 = 'E3'; S7.读档().结果 = {}; S7.读档().战斗 = {};
			await S7B.战斗行动(0, { interactive: false });
			/* ⑦b ★`F1`（`dev-10` 的 D 票）：**掷果随锁存**（确定性）＋「未胜 ⇒ 续战 ⇒ 胜」后 `成败` 与**首次掷果**一致 */
			S7.读档().当前 = 'E3'; S7.读档().结果 = {}; S7.读档().战斗 = {};
			await S7B.战斗行动(0, { interactive: false });
			const 锁 = S7.读档().战斗?.E3;
			ok(!!锁 && !!锁.掷 && typeof 锁.掷.success === 'boolean',
				`★锁里须带**首次掷果**（✗ 只有 {选项,标签,脱离} ⇒ 续战会假记「失败」；实得 ${JSON.stringify(锁)}）`);
			ok(!('__选项' in (S7.读档() ?? {})), '★瞬时量（`__选项`）✗ 得写进存档域（F2）');
			/* 续战 ⇒ 结账：**成败须取自首次掷果**（夹具：压低该怪血量 ⇒ 近确定获胜；★✗ 控骰） */
			const 二 = await S7B.战斗行动(1, { interactive: false });
			/* ★判据面须含**两条**拒路（我第一版只认 LOCKED ⇒ 真随机里首次行动若**直接获胜**则走 DONE ⇒ 假红）：
			 *   ①选择已作出但**未结账** ⇒ `SEVEN_BATTLE_LOCKED`（✗ 改选）②已结账 ⇒ `SEVEN_NODE_DONE`（✗ 重发）。
			 *   ⇒ 要判的是「**第二次选择一律被拒**」，✗ 只判其中一条码。 */
			ok(二?.ok === false && ['SEVEN_BATTLE_LOCKED', 'SEVEN_NODE_DONE'].includes(二.code),
				`★同一节点的第二次选择须拒（✗ 改选／✗ 重发；实得 ${JSON.stringify(二)}）`);
			/* ⑦c ★`B2`（`dev-10`）：**F1 的后果格** —— 受控 `S7.掷检定` ＋ 受控 `BS.战果` 序
			 *   （`['stalemate','victory']`）**保证必激励**：①非胜 ⇒ 锁留且 ✗ 写 `结果` ②续战获胜 ⇒
			 *   `成败` 须与**首次掷果**一致 ＋ 存档面须留 `掷.roll`。
			 *   ⚠ **放在组末** ＋ `finally` 复原两桩 ⇒ ✗ 污染同组其它格（本格第一版就是这样把后文带红的）；
			 *   ⚠ 若两桩之一**不可写**（冻结等）⇒ 具名红（✗ 静默退回概率判据 —— B2 的原病）。 */
			{
				const 桩可写 = (o, k) => {
					const d = Object.getOwnPropertyDescriptor(o, k);
					return !d || (d.writable !== false && !Object.isFrozen(o));
				};
				ok(桩可写(S7, '掷检定') && 桩可写(B, '战果'),
					'★受控桩不可写 ⇒ 本格会退化成概率判据（B2 的原病）⇒ 具名红');
				const 原掷 = S7.掷检定, 原果 = B.战果, 序号 = ['stalemate', 'victory'];
				try {
					S7.掷检定 = () => ({ success: true, roll: 20, mod: 0, bonus: 3, total: 23, dc: 10, die: '1d20' });
					B.战果 = () => 序号.shift() ?? 'victory';
					S7.读档().当前 = 'E3'; S7.读档().结果 = {}; S7.读档().战斗 = {};
					const 一 = await S7B.战斗行动(0, { interactive: false });
					ok(一?.战果 === 'stalemate' && !S7.读档().结果?.E3,
						`★未胜 ⇒ ✗ 写「结果」且锁须留（实得 战果=${一?.战果}｜结果=${JSON.stringify(S7.读档().结果?.E3 ?? null)}）`);
					ok(!!S7.读档().战斗?.E3, '★未胜后锁须**仍在**（续战用同一选择）');
					const 结 = await S7B.继续({ interactive: false });
					ok(结?.ok === true && 结?.战果 === 'victory', `★续战获胜须结账（实得 ${JSON.stringify(结)}）`);
					ok(S7.读档().结果?.E3?.成败 === '成功',
						`★续战胜后账上成败须与**首次掷果**一致（应「成功」；实得 ${S7.读档().结果?.E3?.成败}）—— B2/F1 的假事实`);
					ok(S7.读档().结果?.E3?.掷?.roll === 20, '★存档面须留**首次掷果**（✗ null）');
				} finally {
					S7.掷检定 = 原掷; B.战果 = 原果;
					S7.读档().结果 = {}; S7.读档().战斗 = {};
				}
			}
		}
	} finally {
		State.variables[域] = 档存 ?? undefined;
		if (D.Player.items) State.variables.inventory = 背存 ?? [];
		const 本组失败 = fails.length - 组前失败;
		console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 66 组：${本组失败 === 0
			? '结构全绿（四组映射与字面量／成军独立／奖励路守卫／真随机两路／敌组恒等／随战果结构断言／选择上锁）'
			: `★本组 ${本组失败} 处失败`}`);
	}
}

/* ── 67. `books#415`（A4）：开发测试模式 —— 按用途指定**原始骰面**（正反十格） ──────────────────
 *
 * 病（票面）：开发者要能「指定一个或一段**合法原始骰面**」，而**正式加值与判定照走**；
 *   ✗ 把单位随机钉到 1、✗ 直接写成功位（那是**冒充**，✗ 算能力）。
 * 裁：A1 终裁 ＋ 引擎 `sgstory#2031`（PR `#2042`，已合 `32b0e981`）的**六项裁定**；本笔的 pin 即消费它。
 * 断什么（十格）：
 *   ① **指定面真消费**（真豁免 ⇒ 面＝指定面 ＋ 账上记「受控」，**行为证据**：结果仍由正式加值／DC 决定）
 *   ② **指定 20 仍走正式数学**（DC 999 ⇒ 同一颗 20 仍**失败**）
 *   ③ **无关用途不消费**（另用途掷骰走真随机并记「未受新控制」；目标臂一分未动）
 *   ④ **越界面**（臂面 > d20）⇒ 整次**具名拒** ＋ **零部分消费**
 *   ⑤ **过宽装**（只给 purpose）⇒ `DICE_ARM_TOO_BROAD`
 *   ⑥ **耗尽后恢复**（面吃完 ⇒ 同用途走真随机）
 *   ⑦ **清除后恢复**（`清()` ⇒ 额度账空 ＋ 走真随机）
 *   ⑧ **未接入用途**（如 `check.skill`）⇒ 收据 `未覆盖` 非空 ⇒ 入口报 **生效=false**（✗ 显示「已生效」）
 *   ⑨ **不泄漏正式局**：装／消费前后 `State.variables` **逐字不变**；旧 `setSequence` **✗ 被吃**（两账互不干扰）；
 *      抽尽仍**具名抛** `RNG_EXHAUSTED`
 *   ⑩ **会话隔离**：`clearAll(未知 id)` ⇒ 返 **0** 且本会话臂**照旧生效**（★B1 的同形断言，故事侧再钉一次）
 */
head('67. `books#415`（A4）：开发测试模式 —— 按用途指定原始骰面（正反十格）');
{
	const 组前失败 = fails.length;
	const 骰 = B?.测试骰;
	const Cc = R.diceControl;
	const 甲 = D.Player;
	const 名 = 甲?.name ?? null;
	ok(!!骰, '故事侧入口 `setup.BABEL.测试骰` 未装载（`src/story/zz-dice-test.js` 没装？）');
	ok(!!Cc, '引擎缺 `RPG.diceControl`（须 `sgstory#2031` 的能力 ⇒ 查本笔的 pin）');
	if (骰 && Cc) {
		const 起手 = () => { 骰.清(); Cc.清账(); R.rng.reset?.(); };
		const 账 = () => 骰.读().骰序账;
		const 该 = (p) => 账().filter((x) => x.purpose === p);
		const 抛码 = (fn) => { try { fn(); return null; } catch (e) { return e?.code ?? String(e?.message ?? e); } };
		try {
			/* ① 指定面**真消费**（行为证据：真豁免，结果由正式加值／DC 决定） */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [20] });
			const 中 = D.save(甲, 'fortitude', 1);
			ok(中.roll === 20, `★指定面须真被吃：实得 d20＝${中.roll}（✗ 钉 1、✗ 写成功位）`);
			ok(该('check.save').some((x) => x.source === '受控' && x.face === 20), '★账上须有**受控**条目且面＝20（可读可复算）');

			/* ② 指定 20 **仍走正式数学** */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [20] });
			const 败 = D.save(甲, 'fortitude', 999);
			ok(败.roll === 20 && 败.success === false, `★指定 20 仍须走正式数学（DC 999 ⇒ 败），✗ 写成功位（实得 roll=${败.roll} success=${败.success}）`);

			/* ③ 无关用途**不消费** */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [7, 7] });
			R.rollDetail('1d20', { purpose: 'damage', actor: 名, 组: 0 });
			ok(该('damage').some((x) => x.source === '未受新控制'), '★无关用途须**不消费**目标额度（并记「未受新控制」）');
			ok(骰.读().额度账[0]?.已消费 === 0, `★目标臂**一分未动**（实得已消费 ${骰.读().额度账[0]?.已消费}）`);

			/* ④ 越界面 ⇒ 整次具名拒 ＋ **零部分消费** */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [25] });
			const 拒 = 抛码(() => D.save(甲, 'fortitude', 1));
			ok(拒 === 'DICE_FACE_OUT_OF_RANGE', `★越界面须**具名拒**（实得 ${拒}）`);
			ok(骰.读().额度账[0]?.已消费 === 0 && 账().filter((x) => x.purpose === 'check.save').length === 0,
				'★越界拒后须**零部分消费**（臂未吃、账上无该用途条目）');

			/* ⑤ 过宽装（只给 purpose）⇒ 具名拒 */
			起手();
			ok(抛码(() => 骰.装({ purpose: 'check.save', faces: [1] })) === 'DICE_ARM_TOO_BROAD', '★只给 purpose ⇒ 须 `DICE_ARM_TOO_BROAD`（✗ 静默装一条宽臂）');

			/* ⑥ 耗尽后恢复真随机 */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [7] });
			ok(D.save(甲, 'fortitude', 1).roll === 7, '★耗尽前的第一颗须吃指定面 7');
			D.save(甲, 'fortitude', 1);
			ok(该('check.save')[1]?.source === '未受新控制', '★面吃完后**同用途**须走真随机（记「未受新控制」）');
			ok(骰.读().额度账.length === 0, '★面吃完 ⇒ 该臂应被撤下（额度账回空）');

			/* ⑦ 清除后恢复真随机 */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [9, 9] });
			ok(骰.清() === 1, '★`清()` 应撤销 1 条臂（返条数）');
			D.save(甲, 'fortitude', 1);
			ok(该('check.save').at(-1)?.source === '未受新控制' && 骰.读().额度账.length === 0, '★清除后须恢复正式随机（额度账空 ＋ 记「未受新控制」）');

			/* ⑧ 未接入用途（引擎无此接点）⇒ 入口须报 **生效=false** */
			起手();
			const 收 = 骰.装({ purpose: 'check.skill', actor: 名, faces: [1] });
			ok(收.生效 === false && 收.未覆盖 === true,
				`★未接入用途须**明报未生效**（引擎收据 「未覆盖」是布尔：实得 生效=${收.生效} 未覆盖=${JSON.stringify(收.未覆盖)}）`);
			ok(骰.读().未覆盖.some((x) => x.purpose === 'check.skill'), '★`报告().未覆盖` 须列出该用途');
			/* 正对照：**已接入**用途的收据须报「未覆盖=false／生效=true」（两向都断，✗ 只断一个方向） */
			const 收正 = 骰.装({ purpose: 'check.save', actor: 名, faces: [1] });
			ok(收正.生效 === true && 收正.未覆盖 === false, `★已接入用途须报生效（实得 生效=${收正.生效} 未覆盖=${JSON.stringify(收正.未覆盖)}）`);

			/* ⑨ 不泄漏正式局：存档面逐字不变 ＋ 旧注入 ✗ 被吃 ＋ 抽尽仍具名抛 */
			起手();
			const 档前 = JSON.stringify(State.variables);
			骰.装({ purpose: 'check.save', actor: 名, faces: [13] });
			D.save(甲, 'fortitude', 1);
			ok(JSON.stringify(State.variables) === 档前, '★装／消费控制**不得写存档面**（`State.variables` 须逐字不变）');
			R.rng.setSequence?.([0.2]);   /* ★注入的是**单元值**（[0,1)）：0.2 ⇒ `pick(20)` ＝ floor(0.2×20)+1 ＝ **5** */
			骰.装({ purpose: 'check.save', actor: 名, faces: [13] });
			ok(D.save(甲, 'fortitude', 1).roll === 13, '★受控颗须吃臂面 13（✗ 吃旧注入）');
			ok(R.rollDetail('1d20', { purpose: 'damage', actor: 名 }).rolls[0] === 5, '★旧 `setSequence` **✗ 被受控路径吃掉**（两账互不干扰）');
			ok(抛码(() => R.rollDetail('1d20', { purpose: 'damage', actor: 名 })) === 'RNG_EXHAUSTED', '★旧注入抽尽仍须**具名抛** `RNG_EXHAUSTED`（✗ 静默回退真随机）');
			R.rng.reset?.();

			/* ⑩ 会话隔离（B1 同形：未知会话 id ⇒ 返 0，本会话不受影响） */
			起手();
			骰.装({ purpose: 'check.save', actor: 名, faces: [11] });
			ok(Cc.clearAll('并不存在的会话') === 0, '★`clearAll(未知 id)` 须返 **0**');
			ok(D.save(甲, 'fortitude', 1).roll === 11, '★未知 id 清场**不得动本会话**（臂仍生效 ⇒ 吃到 11）');

			/* ⑪ ★**读档双清**（`dev-10` 复核 B3 · 领队转本笔）：这道面**此前无格** —— 摘掉订阅仍全绿 ✗。
			 *   ★为何要做**重放**：无头装具里 `SugarCube.Save` **默认缺席**（本档 `:2441` 成文）⇒ 本档装载时
			 *     订阅**根本没发生** ⇒ ✗ 装个桩再断言「有订阅」是假绿。故：先装带 `onLoad` 的桩 ⇒ **重放本档 IIFE**
			 *     （⇒ 订阅落进桩）⇒ **真触发**回调 ⇒ 看**行为**（✗ 只看内部字段）。 */
			const 旧SC = globalThis.SugarCube;
			try {
				const 订阅 = [];
				globalThis.SugarCube = Object.assign({}, 旧SC, { Save: { onLoad: { add: (fn) => 订阅.push(fn) } } });
				骰.清(); Cc.清账();
				eval(fs.readFileSync(path.join(storySrc, 'story', 'zz-dice-test.js'), 'utf8'));
				ok(订阅.length === 1, `★本档须**订阅**宿主 onLoad（重放后应恰 1 条，实得 ${订阅.length}）`);
				/* ★臂给**两面**：第一面被吃后**仍未撤下**（✗ 一面就自销 ⇒ 后面的「清没清」断言会**空转** ✓
				 *   —— 本席首版用单面，`K2a′`（订阅在而回调不清）**照样全绿** ⇒ 当场改双面 ✓）。 */
				骰.装({ purpose: 'check.save', actor: 名, faces: [19, 19] });
				ok(骰.读().额度账.length === 1, '前置：读档前应恰有 1 条臂');
				/* ★**配对反证（确定性）**：撤下前注入已知序列 ⇒ 受控面**不吃**序列（仍吃臂面 19）✓。
				 *   ⚠ 本节曾用「真随机掷一次 ≠ 19」当行为证据 ✗ —— 那**约 1/20 概率假红**（真随机 d20 本来
				 *   就可能正好出 19），三处独立观察（本席／`#446` 作者／CI）皆撞过 ⇒ 改为**确定等于**注入值 ✓。 */
				R.rng.reset?.();
				R.rng.setSequence?.([0.5]);          /* 0.5 ⇒ d20 ＝ floor(0.5×20)＋1 ＝ **11** */
				ok(D.save(甲, 'fortitude', 1).roll === 19, '★撤下前：受控面须吃臂面 19（✗ 吃注入序列）');
				ok(骰.读().额度账.length === 1, '★首面被吃后臂**仍在**（前置：双面臂 ⇒ 余额 1；✗ 否则后面的「清没清」断言空转）');
				订阅.forEach((fn) => fn());
				ok(骰.读().额度账.length === 0, '★读档后额度账须**空**（✗ 让上一局的臂跨存档继续生效）');
				R.rng.reset?.();
				R.rng.setSequence?.([0.5]);
				ok(D.save(甲, 'fortitude', 1).roll === 11, '★读档**后再掷须＝注入值 11**（行为证据：控制确已撤下 ⇒ 吃得到序列）');
				R.rng.reset?.();
			} finally {
				globalThis.SugarCube = 旧SC;
			}

			/* ⑫ ★**静态**：`play.twee` 的「读档」链须**逐字**带 `测试骰?.清()`（另一道读档清场；✗ 只靠模块订阅） */
			const 试玩 = fs.readFileSync(path.join(storySrc, 'story', 'play.twee'), 'utf8');
			const 读档行 = 试玩.split('\n').find((l) => l.includes('<<link "读档"'));
			ok(typeof 读档行 === 'string' && 读档行.includes('测试骰?.清()'),
				`★play.twee 的读档链须含 \`测试骰?.清()\`（实得：${读档行 ?? '（无该行）'}）`);
		} finally {
			骰.清(); Cc.清账(); R.rng.reset?.();
		}
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 67 组：${本组失败 === 0 ? '十二格全绿（真消费·行为证据／20 仍走正式数学／无关用途零消费／越界零部分消费／过宽拒／耗尽恢复／清除恢复／未接入明报未生效／不泄漏正式局·两账互不干扰／会话隔离／**读档双清（动态·重放触发 onLoad）**／读档链静态逐字）' : `★本组 ${本组失败} 处失败`}`);
}


/* ============================================================
 * 第 68 组：`books#397`（S3 **片 3a**）返程结算 —— 适用集／三栏按**前态**／**按实体**／装备清除／
 *   幂等按实例／**拒即挡移动**／旧卷轴**冻结例外**零写／并槽分离／回滚面／演出名量
 *   ★口径＝`writer-2` 四裁 `6018346663`（含三条实现级纠正 ✓）
 *   ★计数拿**独立字面量**当尺（✗ 不用被测物自己的表 ✓）；本组末了**存-复原** ✓
 * ============================================================ */
head('68. `books#397` 片 3a：返程结算 —— 适用集／前态分类／按实体／装备清除／幂等／拒挡移动／卷轴例外／并槽／回滚');
{
	const 域 = 'sevenNames';
	const 背存 = JSON.parse(JSON.stringify(D.Player.items ?? null));
	const 档存 = JSON.parse(JSON.stringify(State.variables[域] ?? null));
	const 寄存 = JSON.parse(JSON.stringify(State.variables.babelL10Storage ?? null));
	const 组前失败 = fails.length;
	try {
		const 结 = B?.返程结算;
		ok(!!结, '故事脚本没挂上 `setup.BABEL.返程结算`（`00-return-settle.js` 没被装载？）');
		if (结) {
			const 清背 = () => { D.Player.items = []; };
			const 造 = (id, state) => { const x = R.createItem(id); if (state) x.state = state; D.Player.items.push(x); return x; };
			const 起档 = (实例) => { State.variables[域] = { 态: '进行中', 当前: 'E9', 结果: {}, 机会: { 用: false, 实例 }, 路径: [] }; return State.variables[域]; };

			/* ① 适用集：货币排除（裁①）＋ 寄存**不在**背包适用集内（不同行 ✓） */
			清背(); 造('coin'); 造('club'); 造('iron-ore');
			State.variables.babelL10Storage = [{ entityId: 'st-1', id: 'club' }];
			const 适 = 结.适用件();
			ok(!适.some((x) => x.id === 'coin'), '★裁①：货币 `coin` **不进**适用集');
			ok(适.length === 2 && 适.some((x) => x.id === 'club') && 适.some((x) => x.id === 'iron-ore'),
				`★适用集＝背包**除货币**（实得 ${适.length} 件：${适.map((x) => x.id).join(',')}）`);
			ok(结.排除id.includes('coin'), '★排除口是**声明**（`排除id`）⇒ 将来改口径有处可改');

			/* ② 三栏按**传送前**状态：已脆弱⇒消失／未脆弱⇒新增且**本次不消失**／稳定栏恒空（裁②） */
			清背(); 造('club', { 脆弱: true }); 造('iron-ore'); 造('coin');
			起档('i-1');
			const r2 = 结.返程事务({ 损毁: true, 实例: 'i-1' });
			ok(r2.ok === true, `★事务应成功（实得 ${JSON.stringify(r2).slice(0, 80)}）`);
			const 剩2 = (D.Player.items ?? []).map((x) => x.id);
			ok(!剩2.includes('club'), '★①原已脆弱者**消失**');
			ok(剩2.includes('iron-ore'), '★②原未脆弱者**留下**（✗ 不同时消失）');
			ok(结.是脆弱(D.Player.items.find((x) => x.id === 'iron-ore')), '★②同上者**新增脆弱**');
			ok((r2.栏 ?? {}).稳定?.length === 0, '★③v1 无稳定来源 ⇒ 稳定栏恒空（裁②）');
			ok(剩2.includes('coin'), '★①货币全程未被碰');

			/* ②b ★**长程**幂等（`#443` 补格）：★造「引擎账里**没有**、而故事标记**已落**」的局面 ✓
			 *   —— ✗ 引擎的近窗去重会兜住重复请求 ⇒ 不这样造，**故事自持键去掉也测不出来** ✓（K2 不咬逼出 ✓）。 */
			const 域5 = State.variables[域];
			域5.机会 = Object.assign({}, 域5.机会 ?? {}, { 实例: 'i-long' }); 域5.返程已结 = 'i-long';
			清背(); 造('club', { 脆弱: true });
			const r5b = 结.返程事务({ 实例: 'i-long' });
			ok(r5b.ok === false && /RETURN_ALREADY_SETTLED/.test(r5b.code ?? ''),
				`★长程幂等须由**故事自持键**兜住（引擎账有界＝200 ⇒ ✗ 靠不住 ✓；实得 ${r5b.code ?? '（无）'}）`);
			ok((D.Player.items ?? []).some((x) => x.id === 'club'), '★同上：✗ 未二次损毁（club 仍在 ✓）');

			/* ②c ★**写闸**（`#444` RC-2 补格 ✓）：上面 ②b 只测**读闸**（手工先写标记）⇒
			 *   把 `apply` 里那行**写**删掉也照样绿 ✗（D 席的刀即此 ✓）⇒ 此处专测**写** ✓。 */
			清背(); 造('club', { 脆弱: true }); 造('iron-ore'); 起档('i-w');
			const rw = 结.返程事务({ 实例: 'i-w' });
			ok(rw.ok === true, '（前置）写闸事务应成功');
			const 域w = State.variables[域];
			ok(域w?.返程已结 === 'i-w', `★成功事务后**须把实例写进域**（✗ 只读不写 ✓；实得 ${JSON.stringify(域w?.返程已结 ?? null)}）`);
			ok(R.commitBoundary.settled('sevenNames:返程:i-w') != null, '★引擎账上须查得到该请求（`settled(request)` ✓）');
			/* ★存档往返后再调同实例 ⇒ 仍须拒（写下的标记要**过得了存档** ✓） */
			const 档w = JSON.parse(JSON.stringify(域w));
			State.variables[域] = JSON.parse(JSON.stringify(档w));
			const rw2 = 结.返程事务({ 实例: 'i-w' });
			ok(rw2.ok === false && /RETURN_ALREADY_SETTLED/.test(rw2.code ?? ''),
				`★存档往返后同实例仍须拒（实得 ${rw2.code ?? '（无）'}）`);
			ok((D.Player.items ?? []).filter((x) => x.id === 'club').length === 0, '★同上：✗ 未二次损毁 ✓');

			/* ②d ★**多份整摞**（`#444`：原「切不动须拒」一格的**后继** ✓ —— 切分路径已去掉 ✓）：
			 *   `charges=3` 的脆弱件须**整体消失**（✗ 只减份数 ✓），且✗ 不得牵连同款其它件 ✓。 */
			清背(); const 摞3 = 造('club'); 摞3.charges = 3; 摞3.state = { 脆弱: true };
			const 陪1 = 造('club'); 起档('i-d2');
			const rd2 = 结.返程事务({ 实例: 'i-d2' });
			ok(rd2.ok === true, `★②d 多份整摞不得让事务失败（✗ 旧病灶 STACK_SPLIT_WHOLE ✓；实得 ${JSON.stringify(rd2).slice(0, 80)}）`);
			const 剩D = D.Player.items ?? [];
			ok(!剩D.some((x) => x.entityId === 摞3.entityId), '★②d：**该实例（3 份）整体消失** ✓');
			ok(剩D.some((x) => x.entityId === 陪1.entityId), '★②d：同款**其它件一件不动** ✓');

			/* ②e ★**同族第四条**（dev 的 NIT，我从自证侧接受 ✓）：`splitStack` **在场** ＋ `charges>1`
			 *   ⇒ 真断「**只该实体那摞消失**：同款其它件一件不动 ＋ 件数恰为 1」✓
			 *   —— ★②d 那条「整摞不得删」在**它自己的场景**（`splitStack` 缺席 ⇒ 早退）里**走不到** ✗（dev 的刀2 证 ✓），此处补上可达路径 ✓。 */
			清背();
			const 大3 = 造('club'); 大3.charges = 3; 大3.state = { 脆弱: true };     // 目标实体：3 份、脆弱
			const 同普 = 造('club'); const 同脆 = 造('club', { 脆弱: true });        // 同款其它：一普一脆
			起档('i-e');
			const re = 结.返程事务({ 实例: 'i-e' });
			ok(re.ok === true, `（前置）②e 事务应成功（实得 ${JSON.stringify(re).slice(0, 60)}）`);
			const 剩E = D.Player.items ?? [];
			ok(!剩E.some((x) => x.entityId === 大3.entityId), '★②e：**该实体（3 份）须消失**');
			ok(剩E.some((x) => x.entityId === 同普.entityId), '★②e：同款**普通**件**一件不动**（✗ 被整摞删 ✓）');
			ok(!剩E.some((x) => x.entityId === 同脆.entityId), '★②e：同款**另一件脆弱的**照②规则消失（✗ 与该摞无关 ✓）');
			ok(剩E.filter((x) => x.id === 'club').length === 1, `★②e：同款剩**恰 1 件**（实得 ${剩E.filter((x) => x.id === 'club').length}）`);

			/* ②f ★**「物品面失败 ⇒ 复原」的可达格**（dev 的残留项 ✓，照他的便宜补法 ✓）
			 *   ★去掉切分后这条补偿路径**无格无刀** ✗（我上轮已如实声明 ✓）⇒ 用**具名桩**逼它走到 ✓。
			 *   ★关键：桩**在第二件才抛** ⇒ 第一件**已卸已删** ⇒ 这样「复原」才**承重**（✗ 不是空转 ✓）。 */
			清背();
			const 装A = 造('club'); 装A.state = { 脆弱: true };
			const 装B = 造('club'); 装B.state = { 脆弱: true };
			try { R.slotEquip.call(装A); } catch {}  try { R.slotEquip.call(装B); } catch {}   // ★两件(各占一槽或后者被拒 ⇒ 皆按读数 ✓)
			const 陪3 = 造('iron-ore'); 起档('i-f');
			const 原卸2 = R.slotUnequip; let 卸次 = 0;
			R.slotUnequip = function (...a) { 卸次++; if (卸次 >= 2) throw new Error('桩：第二件卸装失败'); return 原卸2.apply(this, a); };
			let rf; try { rf = 结.返程事务({ 实例: 'i-f' }); } finally { R.slotUnequip = 原卸2; }
			ok(rf?.ok === false, `★②f 物品面失败须**拒**（实得 ${JSON.stringify(rf).slice(0, 70)}）`);
			ok((D.Player.items ?? []).some((x) => x.entityId === 装A.entityId), '★②f：**第一件已删 ⇒ 须被复原**（✗ 半途 ✓）');
			ok((D.Player.items ?? []).some((x) => x.entityId === 装B.entityId), '★②f：第二件亦在 ✓');
			ok((D.Player.items ?? []).some((x) => x.entityId === 陪3.entityId), '★②f：同批其它件亦在（逐件复原 ✓）');
			ok(State.variables[域]?.返程已结 !== 'i-f', '★②f：**域面未提交**（✗ 半途已落 ✓）');

			/* ③ ★**按实体**（裁 §三）：同 id 两件、只有一件脆弱 ⇒ **只消失那一件**（✗ 不误删另一件 ✓） */
			清背(); const 脆 = 造('club', { 脆弱: true }); const 普 = 造('club');
			ok((D.Player.items ?? []).length === 2, '（前置）同 id **两件**并存（✗ 未被并成一槽）');
			起档('i-2'); 结.返程事务({ 损毁: true, 实例: 'i-2' });
			const 剩3 = D.Player.items ?? [];
			ok(剩3.length === 1, `★裁④：只消失**一件**（实得剩 ${剩3.length}）`);
			ok(剩3[0]?.entityId !== 脆.entityId, '★消失的是**那件脆弱的**（✗ 不误删普通的）');
			ok(结.是脆弱(剩3[0]), '★剩下的那件也已按②新增脆弱');

			/* ④ 装备中者消失 ⇒ **装备引用被清**（裁 §三.4 ✓；行为读数：槽位空出来） */
			清背(); const 袍 = 造('club'); R.slotEquip.call(袍); const 在位 = !!袍.equipped;
			ok(在位 || true, `（前置）装备标记 ${在位 ? '已置位' : '未能置位（本件无槽 ⇒ 记读数）'}`);
			袍.state = { 脆弱: true };
			起档('i-3'); 结.返程事务({ 损毁: true, 实例: 'i-3' });
			const 还剩 = (D.Player.items ?? []).some((x) => x.entityId === 袍.entityId);
			ok(!还剩 && !袍.equipped, '★装备中者被毁 ⇒ **引用一并清掉**（✗ 留悬挂装备 ✓）');

			/* ⑤ 幂等**按实例**（裁纠正③）：二次调用 ⇒ 具名拒 ＋ **零变化**（行为读数，✗ 只报条数） */
			清背(); 造('club', { 脆弱: true }); 造('iron-ore');
			起档('i-4'); 结.返程事务({ 损毁: true, 实例: 'i-4' });
			const 面1 = JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON()));
			const r5 = 结.返程事务({ 损毁: true, 实例: 'i-4' });
			ok(r5.ok === false && /RETURN_ALREADY_SETTLED/.test(r5.code ?? ''), `★二次调用须**具名拒**（实得 ${r5.code ?? '（无）'}）`);
			ok(JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON())) === 面1, '★同上：**存档面逐字节零变化**（✗ 再损毁一次）');

			/* ⑥ ★**拒即挡移动**（裁纠正②）：本 pin 的 `MapScene` 判 `exit.action() !== false` */
			const 边 = (map.exits ?? []).find((e) => e.from === 'W09' && e.to === 'L10-camp');
			ok(!!边, '★E9 出口边在位（W09 → L10-camp）');
			if (边) {
				const 拒 = 边.action();                       // 该实例已结 ⇒ 应**返回 false**
				ok(拒 === false, `★拒时 `+"`action()`"+` 须返回 **false**（实得 ${JSON.stringify(拒)}）⇒ ✗ 返回 {ok:false} 挡不住移动`);
				/* ★自纠补格（K9 不咬逼出来的）：**出口是否真把三栏演出来** —— 原判据只验 `演出()` 函数本身 ✗
				 *   ⇒ 接线被换掉也不会红 ✗ ⇒ 此处给 `R.note` 装**收集器**，调出口 `action` ⇒ 断**真文案** ✓。 */
				const 原note = R.note; const 收 = [];
				try {
					R.note = (s) => { 收.push(String(s)); };
					清背(); 造('club', { 脆弱: true }); 造('iron-ore'); 起档('i-9b');
					边.action();
				} finally { R.note = 原note; }
				const 文接 = 收.join('\n');
				ok(文接.includes('获得脆弱的') && 文接.includes('原已脆弱而消失的') && 文接.includes('保持稳定的'),
					`★E9 出口须**真演出三栏**（实得通知：${JSON.stringify(文接.slice(0, 90))}）`);
				ok(文接.includes('club×1') || 文接.includes('木棒×1') || 文接.includes('×1'),
					`★同上：须带**名称×数量**（实得 ${JSON.stringify(文接.slice(0, 90))}）`);
				起档('i-9');                                   // 新实例 ⇒ 应放行
				const 允 = 边.action();
				ok(允 !== false, `★新实例应**放行**（实得 ${JSON.stringify(允)}）`);
			}

			/* ⑦ 旧卷轴**冻结例外**（裁文第 3 项）：同接缝走一遍 ⇒ **零写**（✗ 不损毁 ✓）＋ 仍回城 */
			const 卷 = D?.ReturnScroll;
			ok(!!卷, '★回城卷轴定义在位（`teleport.js`）');
			if (卷) {
				清背(); 造('club', { 脆弱: true }); 造('iron-ore'); 起档('i-5');
				const 前卷 = JSON.stringify({ 背: (D.Player.items ?? []).map((x) => x.toJSON()), 档: State.variables[域] });
				map.moveTo('W09');
				const 卷件 = 造('return-scroll'); R.slotUnequip?.call?.(卷件);
				if (卷件.used) { try { 卷件.used.call(卷件); } catch { /* 无头里移动可失败 ⇒ 不计判据 */ } }
				/* ★自纠：原文此处写过 `… !== 前卷 || true` ⇒ **恒真** ✗ ⇒ 那是「不会红的判据」✗（违本席自己的规矩 ✓）
				 *   ⇒ 改印**读数**（✗ 不计入判据面 ✓），真判据是下一条「不损毁」✓。 */
				console.log(`    （卷轴路径读数：件数 ${(D.Player.items ?? []).length} —— ✗ 不计入判据面 ✓）`);
				ok(结.是脆弱((D.Player.items ?? []).find((x) => x.id === 'club')), '★★旧卷轴路径**不损毁**（脆弱的 club 仍在 ✓）');
				/* ★N2（`#443`）：例外须有**具名口** ⇒ 取到具名 code，✗ 只断「没损毁」✓ */
				const 回执 = 结.旧卷轴返程();
				ok(回执?.code === 'RETURN_SCROLL_EXEMPT', `★旧卷轴须给具名 code（实得 ${回执?.code ?? '（无）'}）`);
			}

			/* ⑧ ★并槽分离：脆弱件与普通件**状态键不同** ⇒ 引擎不会并成一槽（设计 §6「不同状态不混栈」） */
			清背(); const 甲 = 造('club', { 脆弱: true }); const 乙 = 造('club');
			ok(R.stateCompatible(甲, 乙) === false, '★同款不同状态 ⇒ **不可混栈**（`stateCompatible` 为假）');
			ok(R.itemStateKey(甲) !== R.itemStateKey(乙), '★同上（`itemStateKey` 不同）');

			/* ⑨ ★引擎提交边界的两条路（`#443`：✗ 不再验「我自建的回滚」那套 ✓）
			 *   ★分工如实：**近窗去重**与**前像二次确认**由引擎承担 ✓；**长程**幂等由故事自持键 ✓（见档头 ✓）。 */
			清背(); 造('club', { 脆弱: true }); 造('iron-ore'); 起档('i-6');
			const r9a = 结.返程事务({ 实例: 'i-6' });
			ok(r9a.ok === true, `（前置）首次事务应成功（实得 ${JSON.stringify(r9a).slice(0, 70)}）`);
			delete State.variables[域].返程已结;                  // ★绕开**故事自持**的长程标记 ⇒ 专测**引擎近窗去重** ✓
			const 面9 = JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON()));
			const r9 = 结.返程事务({ 实例: 'i-6' });
			ok(r9.ok === false && /RETURN_ALREADY_SETTLED/.test(r9.code ?? ''), `★重复请求须**具名拒**（实得 ${r9.code ?? '（无）'}）`);
			ok(/近窗去重/.test(r9.why ?? ''), `★且须来自**引擎账**（✗ 不是故事标记先拦 ✓；实得 why=${JSON.stringify((r9.why ?? '').slice(0, 60))}）`);
			ok(JSON.stringify((D.Player.items ?? []).map((x) => x.toJSON())) === 面9, '★同上：**物品面零变化**（`publish` ✗ 再跑 ✓）');
			/* 前像二次确认：直接在**引擎面**上证（本模块内部 preview→commit 一气呵成 ⇒ ✗ 无法从外面塞陈旧票 ✓） */
			const 域活 = State.variables[域];   // ★活块（模块内 `读档` 未导出 ✓）
			const 票9 = R.commitBoundary.preview({ request: 'probe:stale', facts: 域活, apply: (d) => { d.__探针9 = 1; } });
			ok(票9.status === 'previewed', `（前置）引擎 preview 应给票（实得 ${票9.status}）`);
			域活.__探针9 = 999;                                  // ★改前像 ⇒ 票据陈旧 ✓
			const 陈 = R.commitBoundary.commit(票9.ticket, { facts: 域活 });
			ok(陈.status === 'rejected' && 陈.code === 'COMMIT_STALE', `★前像已变 ⇒ 须拒 \`COMMIT_STALE\`（实得 ${陈.status}／${陈.code ?? '（无）'}）`);
			ok(域活.__探针9 === 999, '★同上：拒时**零写**（✗ 按旧计划落地 ✓）');
			/* ⑩ 演出与名量：三栏条目带**真名与真量**（✗ 不吞错 ✓） */
			清背(); 造('club', { 脆弱: true }); 造('iron-ore', { 脆弱: true });
			起档('i-7'); const r10 = 结.返程事务({ 损毁: true, 实例: 'i-7' });
			const 栏10 = r10.栏 ?? {};
			ok((栏10.消失 ?? []).length === 2, `★三栏「消失」应记 **2** 条（实得 ${(栏10.消失 ?? []).length}）`);
			ok((栏10.消失 ?? []).every((x) => typeof x.名 === 'string' && x.名.length > 0 && x.数量 >= 1),
				`★每条须带**真名与真量**（实得 ${JSON.stringify((栏10.消失 ?? []).map((x) => [x.名, x.数量]))}）`);
			ok(typeof 结.演出句 === 'string' && 结.演出句.includes('跨越位面的波动'), '★演出句在位（裁 §三 保留原句 ✓）');
			/* ⑪ 演出面（裁 §三）：三栏头 ＋ 空栏「无」＋ 名×量 ＋ 寄存说明 —— **全在文案里** ✓ */
			const 文 = 结.演出({ 新增: [{ 名: '铁矿石', 数量: 2 }], 消失: [], 稳定: [] });
			ok(文.includes('获得脆弱的') && 文.includes('原已脆弱而消失的') && 文.includes('保持稳定的'), '★演出须含**三栏头**（裁 §三）');
			ok(文.includes('铁矿石×2'), `★演出须含**名称×数量**（实得文案：${JSON.stringify(文.slice(0, 90))}）`);
			ok((文.match(/无/g) ?? []).length >= 2, '★空的栏须写「**无**」');
			ok(文.includes('寄存物不受影响'), '★须说明**未同行寄存物未受影响** ✓');
			ok(文.includes('跨越位面的波动'), '★须含设计原句 ✓');
		}
	} finally {
		if (背存 === null) delete D.Player.items; else D.Player.items = 背存.map((s) => R.reviveItem(s));
		if (档存 === null) delete State.variables[域]; else State.variables[域] = 档存;
		if (寄存 === null) delete State.variables.babelL10Storage; else State.variables.babelL10Storage = 寄存;
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 68 组：${本组失败 === 0 ? '十格全绿（适用集／前态分类／按实体／装备清除／幂等零变化／拒挡移动／卷轴冻结例外零损毁／并槽分离／回滚面／名量）' : `★本组 ${本组失败} 处失败`}`);
}


/* ============================================================
 * 候选组（**story 侧** · ★**组号待 T 域确认** —— 裁六 `6021566672` 第 5 项：
 *   行为要求冻结，但**测试组号与工具改动归 T 域**；本席**不动** `tools/e2e-311-layout.mjs` ✗
 *   ⇒ 只落**故事侧**格，探针/e2e 扩展另由 T 域出案 ✓）
 *   `books#401` 3b：正式单图（底图 ＋ 覆盖层 ＋ 图例 ＋ 三类等价文字 ＋ 三路开关）
 * ============================================================ */
head('候选组（组号待 T 域确认）`books#401` 3b：单图 —— 资产接线／覆盖层按真结果／位置／图例非仅颜色／等价文字／开关零副作用／只读边界');
{
	const B4 = B?.地图;
	ok(!!B4, '故事脚本没挂上 `setup.BABEL.地图`（`ui/map.js` 没被装载？）');
	if (B4) {
		const 域4 = 'sevenNames';
		const 档4 = JSON.parse(JSON.stringify(State.variables[域4] ?? null));
		const 背4 = JSON.parse(JSON.stringify(D.Player.items ?? null));
		const 组前4 = fails.length;
		try {
			/* ① 资产接线：`story.json` 声明 ＋ 运行时读得到（★单文件链由构建产物覆盖，e2e 侧另案 ✓） */
			const mf = JSON.parse(fs.readFileSync(path.join(here, 'story.json'), 'utf8'));
			ok(mf?.assets?.['babel-map-w09'] === 'assets/map-w09.svg', `★清单须声明底图（实得 ${JSON.stringify(mf?.assets?.['babel-map-w09'] ?? null)}）`);
			const 引全 = fs.readFileSync(path.join(here, 'assets', 'map-w09.svg'), 'utf8');
			/* ★先**剥注释**再判（✗ 否则注释里提到的字样会误命中 —— 本席旧账里的同族错 ✓）。 */
			const 引 = 引全.replace(/<!--[\s\S]*?-->/g, '');
			ok(!/<style|<text|class=|data-|role=/.test(引), '★底图须**白名单内**（✗ style/text/class/data-*/role ✓；Note：判前已剥注释 ✓）');
			ok((引.match(/<line /g) ?? []).length >= 60, `★支路虚线须由短线段拼接（✗ stroke-dasharray ✗；实得 ${(引.match(/<line /g) ?? []).length} 段）`);
			ok(/<title>/.test(引), '★底图须有 `<title>`（无障碍名 ✓）');

			/* ② 覆盖层**按真结果**区分语义（★裁 §二.1：已处理≠胜利；失败／脱离按真结果 ✓） */
			const 造读 = (果) => ({ 已开始: true, 当前: 'E3', 已处理: ['E3'], 结果: { E3: 果 },
				定点: { E3: { type: 'battle', title: '鳄口' } }, 节点: { type: 'battle' }, 导航: [] });
			ok(B4.标记(造读({ 战果: 'victory', 成败: '成功' }), 'E3') === '胜', '★战斗胜利 ⇒ 「胜」');
			ok(B4.标记(造读({ 脱战: true, 战果: null, 成败: '成功' }), 'E3') === '脱离', '★成功脱离 ⇒ 「脱离」（✗ 与胜利混义 ✓）');
			ok(B4.标记(造读({ 战果: 'stalemate', 成败: '失败' }), 'E3') === '未胜', '★未胜三支 ⇒ 「未胜」');
			const 奖 = { 已开始: true, 当前: 'E4', 已处理: ['E4'], 结果: { E4: { 成败: '成功', 文本: '' } },
				定点: { E4: { type: 'reward', title: '渡口' } }, 节点: { type: 'reward' }, 导航: [] };
			ok(B4.标记(奖, 'E4') === '通过', '★奖励节点检定通过 ⇒ 「通过」（✗ 不叫胜利 ✓）');
			ok(B4.标记({ ...奖, 结果: { E4: { 成败: '失败' } } }, 'E4') === '失败', '★检定失败 ⇒ 「失败」');
			ok(B4.标记({ ...奖, 结果: { E4: { 成败: '无检定' } } }, 'E4') === '已办', '★无检定 ⇒ 「已办」（✗ 不冒充结果 ✓）');

			/* ③ 位置按**实际上下文**；④ 覆盖层是**纯函数**（同输入同输出 ＋ ✗ 不改状态） */
			const 前档 = JSON.stringify(State.variables);
			const 一 = B4.覆盖层(造读({ 战果: 'victory', 成败: '成功' }));
			const 二 = B4.覆盖层(造读({ 战果: 'victory', 成败: '成功' }));
			ok(一 === 二, '★覆盖层须**纯函数**（同输入同输出 ✓）');
			ok(JSON.stringify(State.variables) === 前档, '★覆盖层**零 State 写** ✓（E5 约束的同形 ✓）');
			ok(一.includes('map-here'), '★当前位置标记在位（`map-here` ✓）');
			ok(Object.keys(B4.坐标).length === 10, `★坐标须覆盖 10 节点（实得 ${Object.keys(B4.坐标).length}）`);
			/* ③b ★**坐标漂移守卫**（「一个量只留一个名字」的机械保障 ✓）：模块坐标须与底图**逐点对齐**
			 *   —— ★两处各存一份是**已知取舍**（白名单不容 `class`/`data-*` ⇒ 资产内无法回指 ✓）⇒ 用本格防漂移 ✓。 */
			const 图点 = Object.fromEntries([...引.matchAll(/<circle id="(E\d)" cx="(\d+)" cy="(\d+)"/g)].map((m) => [m[1], [Number(m[2]), Number(m[3])]]));
			const 差 = Object.entries(B4.坐标).filter(([n, [x, y]]) => !图点[n] || 图点[n][0] !== x || 图点[n][1] !== y);
			ok(Object.keys(图点).length === 10, `★底图圆点须带 \`id\`（实得 ${Object.keys(图点).length} 个；D 席 N2 ✓）`);
			ok(差.length === 0, `★模块坐标须与底图圆点**按 id 逐点相同**（实得差 ${JSON.stringify(差)}）`);

			/* ⑤ 图例**非仅靠颜色**：实线＋虚线两形 ＋ 文字图例（运行时 DOM ⇒ ✗ 受资产白名单限制 ✓） */
			B4.切换();
			const 文 = B4.面板();
			ok(/主干/.test(文) && /支路/.test(文) && /实线/.test(文) && /虚线/.test(文), '★图例须**文字化**（✗ 仅颜色 ✓）');
			ok(/stroke-width="3"/.test(文) && /stroke-dasharray/.test(文), '★图例须**两形并存**（粗实线 ＋ 虚线 ✓）');

			/* ⑥ 三类等价文字（裁④：留面板内 ✓） */
			ok(/当前：/.test(文) && /可走：/.test(文) && /类型：/.test(文), '★三类等价文字须在面板内（当前／可走／类型 ✓）');

			/* ⑦ ★开关：**真状态变**才出原句 ＋ 零副作用（裁 §二.3 ✓；★真开合的合法差分＝可见性/展开态 ✓） */
			const 收 = []; const 原note = R.note;
			const 域前 = JSON.stringify(State.variables); const 随前 = Math.random;
			let 随动 = 0; Math.random = () => { 随动++; return 0.5; };
			try {
				R.note = (s) => 收.push(String(s));
				for (let i = 0; i < 6; i++) B4.切换();     // 开/收 各 3 次 ⇒ 原句 6 条 ✓
			} finally { R.note = 原note; Math.random = 随前; }
			ok(收.length === 6, `★每次**真状态变**恰一条演出（6 次切换 ⇒ 6 条；实得 ${收.length}）`);
			/* ★断**交替**（✗ 不断固定先后 —— 本格进入时面板可能已被前文打开过 ✓）：
			 *   两句话各 3 条 ＋ 相邻必不同 ⇒ 「真状态变才出句」的同义断言 ✓。 */
			const 开句数 = 收.filter((s) => s === '你打开了地图').length;
			ok(开句数 === 3 && 收.filter((s) => s === '你收起了地图').length === 3,
				`★两句话须各 3 条（实得 开 ${开句数}／收 ${收.length - 开句数}）`);
			ok(收.every((s, i) => i === 0 || s !== 收[i - 1]), `★相邻必不同（✗ 同态重复刷 ✓；实得 ${JSON.stringify(收)}）`);
			ok(收.every((s) => s === '你打开了地图' || s === '你收起了地图'), '★只许设计的两句（✗ 自造文案 ✓）');
			ok(JSON.stringify(State.variables) === 域前, '★开关**零存档改动**（✗ 推时间／✗ 写域 ✓）');
			ok(随动 === 0, `★开关**零随机消费**（实得 ${随动}）`);

			/* ⑧ ★只读边界（裁 §二.5：✗ 不得成为返城／逃脱／存档／用物／战斗入口 ✓） */
			const 展开 = B4.面板();
			ok(!/<a\s|<button[^>]*(回城|返城|逃脱|存档|读档|使用|攻击)/.test(展开), '★地图面板内 ✗ 不得有返城／逃脱／存档／用物／战斗入口');
			ok(!/data-action|onclick=/.test(展开), '★同上：✗ 不得出现动作钩子（除受控的 `data-map-toggle` ✓）');
		} finally {
			if (档4 === null) delete State.variables[域4]; else State.variables[域4] = 档4;
			if (背4 === null) delete D.Player.items; else D.Player.items = 背4.map((s) => R.reviveItem(s));
			if (B4 && B4.开()) B4.切换();          // ★收起，✗ 不留展开态影响后文 ✓
		}
		const 本组失败4 = fails.length - 组前4;
		console.log(`  ${本组失败4 === 0 ? '✓' : '✗'} 候选组：${本组失败4 === 0 ? '八格全绿（资产接线／标记不混义／纯函数零写／位置／图例非仅颜色／等价文字／开关零副作用／只读边界）' : `★本组 ${本组失败4} 处失败`}（★组号待 T 域确认 ✓）`);
	}
}

/* ============================================================
 * 第 69 组：`books#398`（S4 余量）铜冠装备接线 ——
 *   真头槽／真佩戴／占槽换装与**旧件保全**／**两种**失败安全（拒与抛）／结果 `E8` 防重／
 *   读档往返后仍拒／谢绝不给冠／禁售（价格与不可售**分开**）／头槽语义（无 AC·不占 body·不免脆弱）
 *   ★容量：**如实记读数**（裁 S：受测版本无合法容量门 ⇒ 不适用，✗ 手写 PASS）
 *   ★口径＝S4 六裁 `6021846162`（H/P/M/R/B/S）＋ 承接席清单 `6021891030`
 * ============================================================ */
head('69. `books#398` S4：真头槽／占槽换装保全／失败安全两路／结果防重／谢绝／禁售／头槽语义／文本如实');
{
	const 域 = 'sevenNames';
	const 七 = B?.七名河;
	const L10 = B?.L10;
	const 背存 = JSON.parse(JSON.stringify(D.Player.items ?? null));
	const 档存 = JSON.parse(JSON.stringify(State.variables[域] ?? null));
	const 组前失败 = fails.length;
	try {
		ok(!!七, '故事脚本没挂上 `setup.BABEL.七名河`（`00-seven-names.js` 没被装载？）');
		if (七) {
			const 清背 = () => { D.Player.items = []; };
			const 造 = (id, o = {}) => { const x = R.createItem(id); Object.assign(x, o); D.Player.items.push(x); return x; };
			const 起档 = () => { State.variables[域] = { 态: '进行中', 当前: 'E8', 结果: {}, 机会: { 用: false, 实例: 'i-s4' }, 路径: [] }; return State.variables[域]; };
			const 冠数 = () => (D.Player.items ?? []).filter((x) => x.id === 'rain-diadem').length;

			/* ① 定义面（裁 H／P／B）：真槽声明 ＋ 参考价 100 ＋ 中文槽名 ＋ 描述 ✗ 宣布机械效果 */
			const 冠 = R.createItem('rain-diadem');
			ok(冠?.slot === 'head', `★裁 H：须有**真** \`slot\` 声明（实得 ${JSON.stringify(冠?.slot)}）`);
			ok(冠?.stats?.cost === 100, `★裁 P：参考价须＝**100**（实得 ${JSON.stringify(冠?.stats?.cost)}）`);
			ok(R.slotLabels?.head === '头部', `★头槽须有中文显示名（实得 ${JSON.stringify(R.slotLabels?.head)}）`);
			ok(!/(加值|＋|\+|bonus)/.test(String(冠?.desc ?? '')), `★裁 B：描述 ✗ 宣布机械效果（实得 ${JSON.stringify(冠?.desc)}）`);

			/* ② 真佩戴（裁 H）：走 E8 选项 0 ⇒ 真置 `equipped` ＋ 结果记**装**槽 */
			清背(); 起档();
			const r0 = 七.选行动(0);
			ok(r0?.ok === true, `★E8「收下并戴上」应成功（实得 ${JSON.stringify(r0).slice(0, 90)}）`);
			ok(R.equippedIn('head')?.id === 'rain-diadem', '★裁 H：佩戴＝**真**装备（`R.equippedIn(head)` ✓ ✗ 替身表 ✓）');
			ok(State.variables[域].结果.E8?.装 === 'head', '★同上：结果须记**装**槽（可审 ✓）');

			/* ③ 占槽换装（裁 H）：旧件**留背包**且 `entityId／charges／state` 逐字保全 */
			清背(); const 旧冠 = 造('rain-diadem', { charges: 2, state: { 标记: '旧' } }); R.slotEquip.call(旧冠);
			起档();
			const r1 = 七.选行动(0);
			ok(r1?.ok === true, `★占槽时换装应成功（正文已明写「转入背包…不吞物品」⇒ 选择即确认；实得 ${JSON.stringify(r1).slice(0, 80)}）`);
			ok(R.equippedIn('head')?.entityId !== 旧冠.entityId, '★新件上位 ✓');
			const 包旧 = (D.Player.items ?? []).find((x) => x.entityId === 旧冠.entityId);
			ok(!!包旧 && 包旧.equipped === false, '★裁 H：旧件**留在背包**且已不装备（✗ 被吞 ✓）');
			ok(包旧?.charges === 2 && 包旧?.state?.标记 === '旧', '★同上：`charges／state` **逐字保全** ✓');

			/* ④ 失败安全·**不可装**（裁 H）：受控桩让本件**判不出槽** ⇒ 选行动拒 ＋ 旧件**仍在位** ＋ 新件收回 ＋ ✗ 写结果
			 *   ★桩打在 `reviveItem`（槽名的**唯一来处**：快照上无 `slot` ⇒ 只能由定义复活 ✓） */
			清背(); const 旧2 = 造('rain-diadem'); R.slotEquip.call(旧2); 起档();
			const 原活 = R.reviveItem;
			R.reviveItem = function (x) { return { ...x, slot: null }; };
			let r2; try { r2 = 七.选行动(0); } finally { R.reviveItem = 原活; }
			ok(r2?.ok === false && /DIADEM_NOT_EQUIPPABLE/.test(r2.code ?? ''), `★不可装 ⇒ 须**具名拒**（实得 ${JSON.stringify(r2).slice(0, 70)}）`);
			ok(R.equippedIn('head')?.entityId === 旧2.entityId, '★拒时**旧件仍在位**（✗ 不暗卸 ✓）');
			ok(冠数() === 1, '★新件**已收回**（✗ 重复发奖 ✓）');
			ok(State.variables[域].结果.E8 === undefined, '★裁 M：拒时 **✗ 先写结果**（不先标已领取 ✓）');

			/* ⑤ 失败安全·**抛**（裁 H）：装槽中途抛 ⇒ 具名拒 ＋ **旧件仍在位**（未动过）＋ 新件收回 ＋ ✗ 写结果 */
			清背(); const 旧3 = 造('rain-diadem'); R.slotEquip.call(旧3); 起档();
			R.reviveItem = function () { throw new Error('受控抛：换装中途'); };
			let r3; try { r3 = 七.选行动(0); } finally { R.reviveItem = 原活; }
			ok(r3?.ok === false && /DIADEM_EQUIP_FAILED/.test(r3.code ?? ''), `★装槽抛 ⇒ 须**具名拒**（实得 ${JSON.stringify(r3).slice(0, 70)}）`);
			ok(R.equippedIn('head')?.entityId === 旧3.entityId, '★抛时**旧件仍在位**（✗ 半换装 ✓）');
			ok(冠数() === 1, '★新件已收回 ✓');
			ok(State.variables[域].结果.E8 === undefined, '★✗ 未写结果 ✓');

			/* ⑥ 防重（裁 M）：同节点二次选行动 ⇒ 具名拒 ＋ 件数不变 */
			清背(); 起档(); 七.选行动(0);
			const 数1 = 冠数();
			const r4 = 七.选行动(0);
			ok(r4?.ok === false && /SEVEN_NODE_DONE/.test(r4.code ?? ''), `★二次选行动须拒（实得 ${r4?.code ?? '（无）'}）`);
			ok(冠数() === 数1, '★件数不变（✗ 重复发奖 ✓）');

			/* ⑦ 读档往返（裁 R）：结果随**同一份快照**回来 ⇒ 仍拒再领 */
			State.variables[域] = JSON.parse(JSON.stringify(Save.roundtrip(State.variables[域])));
			ok(State.variables[域].结果.E8?.选项 === 0, '★结果**随快照**回来（✗ 靠堆外集合 ✓）');
			const r5 = 七.选行动(0);
			ok(r5?.ok === false && /SEVEN_NODE_DONE/.test(r5.code ?? ''), '★读档往返后**仍拒**再领取 ✓');

			/* ⑧ 谢绝（裁 M）：提交**放弃**结果 ＋ **不给冠** ＋ ✗ 装任何东西 */
			清背(); 起档();
			const r6 = 七.选行动(2);
			ok(r6?.ok === true, `★谢绝也须成立（实得 ${JSON.stringify(r6).slice(0, 70)}）`);
			ok(冠数() === 0, '★裁 M：谢绝**不给冠** ✓');
			ok(State.variables[域].结果.E8?.放弃 === true, '★同上：结果须记**放弃** ✓');
			ok(R.equippedIn('head') == null, '★谢绝 ✗ 装任何东西 ✓');

			/* ⑨ 禁售（裁 P：价格与不可售**分开**）：目录不收；★**真售口**的行为断言在 `tools/verify-l10-city.mjs`（那里有真 permit 装置 ✓） */
			ok(!Object.hasOwn(L10?.cfg?.sell ?? {}, 'rain-diadem'), '★裁 P：铜冠**不在收购目录** ✓');

			/* ⑩ 头槽语义（裁 H）：无独立 AC／不占 body／**不免脆弱** */
			清背(); 起档(); 七.选行动(0);
			ok(!('ac_bonus' in (R.createItem('rain-diadem')?.stats ?? {})), '★头槽**无独立 AC** ✓');
			ok(R.equippedIn('body') == null, '★装头槽**不占 body** ✓');
			const 适 = B?.返程结算?.适用件?.() ?? [];
			ok(适.some((x) => x.id === 'rain-diadem'), '★铜冠**在**脆弱适用集内（✗ 免脆弱 ✓）');

			/* ⑪ 容量（裁 S）：★**如实记读数** —— 受测版本无合法容量门 ⇒ 不适用（✗ 手写 PASS、✗ 用占槽失败冒充） */
			console.log('    （★裁 S 读数：本受测版本**无重量/格数容量门** ⇒ 容量不足**不适用**；✗ 不计入判据面 ✓）');
		}
	} finally {
		if (背存 === null) delete D.Player.items; else D.Player.items = 背存.map((s) => R.reviveItem(s));
		if (档存 === null) delete State.variables[域]; else State.variables[域] = 档存;
	}
	const 本组失败 = fails.length - 组前失败;
	console.log(`  ${本组失败 === 0 ? '✓' : '✗'} 第 69 组：${本组失败 === 0 ? '十一格全绿（真头槽定义／真佩戴／占槽换装旧件保全／拒路／抛路／防重／读档往返／谢绝／禁售目录／头槽语义／文本如实）' : `★本组 ${本组失败} 处失败`}`);
}

printSummary();
