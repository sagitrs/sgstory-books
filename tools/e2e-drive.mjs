/* 真产物**驾驶层**（`#300` 条款⑤「两次法则」入册 · 本席在 `sgstory#1860`／`#1864`／`#1866`／`books#92`／`books#91` 五票用过的同族探针）
 *
 * 与 `tools/e2e-harness.mjs` 的分工（★**只 import，不复制**）：
 *   `e2e-harness.mjs` ＝ **引导 ＋ 点链接 ＋ 读面板**（已合的 10 刀件；★本笔**只动它一处**：`resolveEnv` 收 `env` 回落
 *     并优先 `--engine`（见 `#98` 的 RC 折单）—— 除此**未动**其它行；其余照旧）；
 *   本件 ＝ 其**上层驾驶**：**读档往返**（`Save.slots.save/load` ＋ `Engine.show()`）、**自环就地重绘**（`.choice-box` 按钮）、
 *     **正文行读数**、**State 直铺**。复用点只有 `resolveEnv`／`boot`／`currentPassage`／`playPassage`／`panels` ⇒ `import` 即得
 *     （✗ 重写一份 `boot` —— 两份会漂，`#300` ⑦/⑧ 同族）。
 *
 * 为什么值得入册（⑤ 判准＝**复核价值**，✗ 非难度）：下列面**只有真 DOM 层照得出**，静态/单测层看不见 ——
 *   · `#1860` 战斗收场出口落**页底**（页底 vs 段落顶部的**视口差**）· `#1864` 读档后 **State／实例／面板／屏幕** 四面不一
 *   · `#1866` 故事页点道具**抛穿 DOM**（玩家无可读反馈）· `books#92` **交付树** vs 上游副本的产物差
 *
 * 用法（★最小可复算集＝**一条命令 ＋ 一个夹具**；夹具＝按 pin 的引擎检出 ＋ 本仓故事）：
 *   git -C <engine> checkout "$(jq -r .ref <books>/.github/engine-ref.json)"
 *   python3 <engine>/build.py "$PWD/stories/babel" --out babel-trial.html
 *   node tools/e2e-drive.mjs --engine <engine>                 # 稳定面（见下）
 *   node tools/e2e-drive.mjs --engine <engine> --require <面>   # 把**明账面**升为硬判（该面所属票修好后用）
 *   node tools/e2e-drive.mjs --engine <engine> --selftest       # 刀：证明本件**判得了**（正例档＋反例档＋唯一变量）
 * ★引擎根两种给法都行（**参数优先、回落 `ENGINE`**，与姊妹件 `check-refs-recheck.mjs` 同约定）：
 *     `--engine <dir>` ｜ `ENGINE=<dir> …`
 * 退出码：0 全通过；1 有红；2 用法/环境错（缺引擎／缺产物／jsdom 不可得 ⇒ **具名**）。

 * ── 面的**状态**（★`#300` ② 「不可解析须成明账」：✗ 把「本 pin 没修」与「判据不成立」混为一谈）──
 *   **R 读档往返·导航形**：**硬判**。存档 → **导航到别段** → 读档 ⇒ 段落须回存档刻。此形在 pin 上成立（导航会写 `_history`）。
 *   **L 同地点读档·场景头重印**：**硬判**（`books#136` F4 —— 修在本仓故事层，随本件同笔）。
 *     存档 → 读档（**位置不变**）⇒ 地图场景头（【层名】＋desc）须重印。
 *   **N 工具门**：**硬判**（`books#133` 笔 2）。该层无对应工具 ⇒ 抽中的「采集」**不出按钮**；给上工具 ⇒ 出。
 *   **M L5 选择制事件面**：**硬判**（`books#133` 笔 1）。抽二择一：抽中的两类出现为**按钮**、
 *     未抽中的类**不**出现、择一后两个事件按钮**一起退场**（而基础遭遇仍在）。
 *     ⚠ 本面靠**注入随机源**把抽签钉死（✗ 靠「看起来随机」）⇒ 读数确定。
 *   **P 进层致命伤 ⇒ 终局**：**硬判**（`books#171`＋`books#176` 的裁定②：死亡＝游戏失败、**不复活**）。
 *     危害命中且致命时，段落须＝`游戏失败`（读档／重开两钮）、位置**留在死亡层**、页面**不留**原层出口
 *     （而不是「0 血还能接着走」）；满血对照臂保证本面判得了。
 *   **S 自环就地重绘·面板跟随**：**明账**（属 `sagitrs/sgstory#1859` ⇒ 修 `#1864`，**未合**）。`--require self-loop` 升硬判。
 *   **I 故事页点道具不穿 DOM**：**明账**（属 `sagitrs/sgstory#1857` ⇒ 修 `#1866`，**未合**）。`--require item-click` 升硬判。
 *   ⇒ ★明账面**每次运行都打印**（含归属票号）—— `#300` ⑧「非空≠存在」的同族：✗ 让「没跑」与「跑过且未修」同形。
 *
 * ⚠ **每个硬判面都必须带「两向断言」**（⑤ 对照档：**开跑前先断两臂可分辨**）：
 *   只断「读档后 = 存档刻」的话，**把 `loadAt` 写成空函数也会绿**（两边都停在存档刻）⇒ 必须先断「改过 ⇒ 确实变了」。
 */
import fs from 'node:fs';
import path from 'node:path';
import { resolveEnv, boot, currentPassage, playPassage, panels, storyLinks } from './e2e-harness.mjs';

const argOf = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);
const REQUIRE = new Set((argOf('--require') ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const tick = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── 驾驶原语（★失败一律**抛**：静默返回 `[]`/`''` 会让「面板没了」被读成「面板是空的」） ── */

/** 末尾段落的**正文行**（`<p>` 文本；✗ 面板内 —— 面板内容另有 `panels()`）。 */
export function passageLines(session) {
	const box = [...session.doc.querySelectorAll('#passages .passage')].pop();
	if (!box) throw new Error('取不到末尾 `.passage`（产物未 boot／段落未挂载）');
	return [...box.querySelectorAll('p')].map((p) => (p.textContent ?? '').trim()).filter((s) => s !== '');
}

/** `.choice-box` 里的按钮文本（`choice()` 渲染：自环 action 与出口都走它）。 */
export function choiceButtons(session) {
	return [...session.doc.querySelectorAll('.choice-box button')].map((b) => (b.textContent ?? '').trim());
}

/** ★点一个按钮并断「**读数确实变了**」（✗ 返回 void —— 那会让调用方对着**未触达**的面下结论）。 */
export async function driveButton(session, re, { read, expectNavigate = null }) {
	const btns = [...session.doc.querySelectorAll('.choice-box button')].filter((b) => re.test(b.textContent ?? ''));
	if (btns.length === 0) throw new Error(`找不到匹配 ${re} 的按钮；当前可点 = ${JSON.stringify(choiceButtons(session))}`);
	const before = read(session), was = currentPassage(session);
	btns[0].click();
	await tick(150);
	const now = currentPassage(session);
	if (expectNavigate != null && now !== expectNavigate) throw new Error(`★期望导航到 ${expectNavigate}，实得 ${now}`);
	if (expectNavigate == null && now !== was) throw new Error(`★该按钮**导航**了（${was} → ${now}）⇒ 本条判的是**就地重绘**面（✗ 用 driveButton 测出口）`);
	const after = read(session);
	if (after === before) throw new Error(`★点了 ${JSON.stringify(btns[0].textContent)} 但读数**未变**（仍 ${JSON.stringify(before)}）⇒ 两向断言失败：该面**未触达**，本实验不成立`);
	return { before, after, passage: now };
}

/** 存档到 slot（引擎真路径）。 */
export async function saveAt(session, slot = 1) {
	if (session.SC.Save?.slots?.save == null) throw new Error('产物里无 `Save.slots.save`（引擎版本／装配不符）');
	const r = session.SC.Save.slots.save(slot);
	if (r?.then) await r;
	await tick(120);
}

/** ★读档：`slots.load` ⇒ **`Engine.show()`** —— 后者是引擎侧读档的**收尾**。
 *  ✗ 漏 `show()` ⇒ 段落与面板**不刷新**（实测 `#1864`：State 已回存档刻而**屏幕仍画旧值**）⇒ 该收尾是本面的**唯一变量**之一。 */
export async function loadAt(session, slot = 1) {
	if (session.SC.Save?.slots?.load == null) throw new Error('产物里无 `Save.slots.load`');
	const r = session.SC.Save.slots.load(slot);
	if (r?.then) await r;
	await tick(180);
	const s = session.engine.show();
	if (s?.then) await s;
	await tick(280);
}

/** 直接铺 `State.variables`（铺前置态）。⚠ `State.passage` **只有 getter** ⇒ ✗ 用赋值造读数（会 TypeError）。 */
export function setStateVars(session, patch) {
	const v = session.SC.State.variables;
	for (const [k, val] of Object.entries(patch)) v[k] = val;
}

/** 面板文本（缺宿主 ⇒ **抛**，与 `panels()` 同取向）。 */
export const panelText = (session, id) => panels(session, [id])[id];

/* ── CLI ──
 * ★**CLI 守卫**（本件此前**没有** ⇒ 形实不符：文件头自称「只 import，不复制」，而它自己**不能被 import**）：
 *   · 无守卫时：`import('./tools/e2e-drive.mjs')` 会**执行整个驾驶体**——且因 import 方通常没传 `--engine`
 *     ⇒ 它 `exit 2` 报「缺 `--engine`」 ⇒ **复核者看到的是「他自己的脚本失败」**（★归因误导，✗ 只是噪音）。
 *   · 现形：顶层具名块 ＋ 早退 ⇒ **零重排**（✗ 缩进整档 —— 那会把 diff 涨到数百行，评审看不见真改动）。
 *   ⚠ 块内保留顶层 `await`／`process.exit` 语义（两者在块内合法）；原语定义段在本块**之前** ⇒
 *     若将来要供 import 复用，只需给那几个声明加 `export`（本笔不预加 —— ✗ 无消费者的导出面）。 */
cli: {
if (import.meta.filename !== process.argv[1]) break cli;	// ★被 import ⇒ 只取本件原语，✗ 跑 CLI
const bail = (msg, code = 2) => { console.error(`✗ ${msg}`); process.exit(code); };
/* ── 战斗格**驱动**（`sgstory#1950`）：三臂共用一份驱动 ⇒ 刀才改得动**一处**（✗ 各写一份 ⇒ 刀无处落）。
 * ⚠ 件须放进**玩家单位**（`D.Player.items` ✓）：战斗选项表由**单位快照**出（✗ 不走 `State.variables.inventory`）。 */
async function 战斗三臂驱动(s, { 补丁 = null } = {}) {
	const R = s.SC.setup.RPG, D = s.SC.setup.DND3, B = s.SC.setup.BABEL;
	const 原Choice = D.Player.choice, 原Act = R.act, 存血 = D.Player.hp;
	const 治疗槽 = { id: 'bandage', charges: 3 };
	const 盾槽 = { id: 'heavy-wooden-shield', charges: 1 };
	const 武槽 = { id: 'club', equipped: true };
	const 动作录 = [];
	try {
		D.Player.hp = Math.max(1, Math.floor((D.Player.maxHp ?? 10) / 2));
		D.Player.items.push(治疗槽, 盾槽, 武槽);
		/* 录过程：包**统一入口** `RPG.act`（`#1752`）—— ✗ 不用 `battle:turn`（只在攻击被接受时发 ⇒ 漏玩家侧动作） */
		R.act = function (actor, itemId, target, action) {
			const 前自己 = actor?.hp, 前靶 = target?.hp;
			const 记 = (ret) => 动作录.push({
				我方: actor === D.Player, 件: String(itemId), 动作: String(action ?? '(默认)'),
				靶: String(target?.name ?? target ?? ''),
				结果: (ret && typeof ret === 'object')
					? `${ret.status ?? '?'}${ret.reason ? '/' + ret.reason : ''}${ret.code ? '/' + ret.code : ''}`
					: String(ret),
				自己掉血: (前自己 ?? 0) - (actor?.hp ?? 0), 靶掉血: (前靶 ?? 0) - (target?.hp ?? 0),
			});
			const ret = 原Act.call(this, actor, itemId, target, action);
			if (ret && typeof ret.then === 'function') return ret.then((r) => { 记(r); return r; });
			记(ret); return ret;
		};
		let 选治 = 0, 选盾 = 0;
		D.Player.choice = async (options) => {
			const o = Array.isArray(options) ? options : [];
			const 文 = (x) => String(x?.text ?? '');
			const 治 = o.find((x) => /治疗|草药|绷带/.test(文(x)));
			const 盾 = o.find((x) => /重木盾/.test(文(x)));
			/* ★`#217` 同坑：防具选项文案**也含「攻击」**（「用重木盾攻击」）⇒ 须「含武器字 ∧ 不含防具字」 */
			const 攻 = o.find((x) => /攻击|挥|砍|劈|打击/.test(文(x)) && !/重木盾|盾|防具|甲|铠/.test(文(x)));
			if (治 && 选治 < 2) { 选治 += 1; return 治.value; }
			if (盾 && 选盾 < 1) { 选盾 += 1; return 盾.value; }
			/* ★兜底**不得取 `o[0]`**（那是选项表里的盾 ⇒ 会每轮反复选它 ✗） */
			return (攻 ?? o.find((x) => !/重木盾|治疗|草药|绷带/.test(文(x))))?.value ?? 'skip';
		};
		if (补丁) 补丁({ R, D, B, 槽: { 治疗: 治疗槽, 盾: 盾槽, 武: 武槽 } });
		await B.fight({ interactive: true });
		return { 动作录, 我方: 动作录.filter((x) => x.我方) };
	} finally {
		R.act = 原Act; D.Player.choice = 原Choice; D.Player.hp = 存血;
		for (const 槽 of [治疗槽, 盾槽, 武槽]) {
			const i = D.Player.items.indexOf(槽);
			if (i >= 0) D.Player.items.splice(i, 1);
		}
	}
}
if (has('--list')) {
	console.log('  硬判面：R 读档往返·导航形｜L 同地点读档·场景头重印（`books#136` F4）｜M L5 选择制事件面｜N 工具门（`books#133` 笔 2）｜O L9 唯一出口（`books#133` 笔 3）｜Q 战斗面（敌面板／治疗读数 · `books#188`）');
	console.log('  明账面（挂票号；`--require <self-loop|item-click>` 可升硬判）：S 自环就地重绘·面板跟随（sagitrs/sgstory#1859）｜I 故事页点道具不穿 DOM（sagitrs/sgstory#1857）');
	console.log('  原语：passageLines／choiceButtons／driveButton／saveAt／loadAt／setStateVars／panelText');
	process.exit(0);
}

let env;
try { env = resolveEnv(argOf('--engine'), process.env); } catch (e) { bail(e.message, 2); }
if (!fs.existsSync(env.htmlPath)) {
	/* ★`#220` dev-10 实测：**照旧提示逐字跑不通**（相对故事目录 ⇒ 产物落在**引擎仓**里，且把 `tests/unit/dist/**`
	 *   写进引擎检出 ⇒ 撞上工作流那道「引擎仓没被写脏」步）。⇒ 提示改成**绝对路径**形（并写明理由）。 */
	bail(`缺产物：${env.htmlPath}\n  先构建（★**故事目录与 --out 都给绝对路径**）：`
		+ `\n    python3 ${path.join(env.root, 'build.py')} "${env.storyDir}" --out "${env.htmlPath}"`
		+ `\n  （相对形会被拼到**引擎仓根** ⇒ 产物落错位置，见 .github/workflows/babel-tests.yml 的「构建」步注释）`);
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const lines = (s) => passageLines(s).length;

/** ★`books#280` ②-1（领队裁甲）：**L1/L2 的「向上」现在要先把本层事件阶段清掉** ——
 *   `babel.js:273/424`「层内固定事件阶段未了 ⇒ 向上的路不开」；**完成形**＝采净该层节点
 *   （`charges` 归零）。⚠ **靶文未变**（仍是「向上，去第 N 层」）⇒ ✗ 换正则没用，本步不可省。
 *   ⚠ 只用于 **L1/L2** 这两处（✗ 不动 L5/L7 的靶，留 T 席同形处理）。
 *   ★点过 ↑ 之后若出现「到达停」那一拍（②-1），**先点过它** —— ✗ 否则模态挡住该层选项面，
 *     后续靶全落空（那正是本笔要判的那一拍）。 */
/* ★采集按钮的文案（本席实测）：L1＝「采集（碎石堆｜一次采净 6 件）」。
 *   ⚠ **✗ 把「拾起」并进来** —— 那是**道具拾取**（如「拾起地上的长剑」）、不是采净节点：
 *     本席第一版并了它 ⇒ 循环连点点错动作、节点永不采净 ⇒ 门永不开（自撞一次 ✗）。 */
const 采集形 = /^采集|采集（|一次采净|翻找|找采集点/;
/** ★`books#280` ②-1 的必经路：**上行门＝`已战 ∧ 事件账 ∈ {完成, 已跳过}`**（`babel.js:988-991`），
 *   而**「采集」是战后动作**（实测：到达时只有「拾起…」＋「遭遇…」；置账后「采集（…一次采净 N 件）」才出现）。
 *   ★本档若干臂（面 L／②-1）判的是**门后那一屏** ⇒ 这里以**声明的置账**代「真打一场」并印「记声明」；
 *     真打一场的驱动留 **T 席真浏览器臂** ✓（✗ 本席不假装驱动过战斗）。
 *   ⚠ **只置账 ＋ 重画**（✗ 不动采集/跳过 —— 那由调用方按自己那臂的需要决定）。 */
/** ★`books#280` ②-1 的必经路：**上行门＝`已战 ∧ 事件账 ∈ {完成, 已跳过}`**（`babel.js:988-991`）
 *   ⇒ 到达层必须**真打一场**（✗ 本席先前的「声明的置账」太侵入：把 `已战` 置真会连带藏掉
 *     `基础遭遇动作`（`when=!本层已战`）⇒ 面 M 两条红 ✓，故改为**真打**）。
 *   ★打法借本档既有形：在 `遭遇战` 段落里**点攻击**（含武器字 ∧ 不含防具字），直到离开该段，
 *     再点「继续探索」回 `探索` ✓。★读数＝段落名，✗ 不猜。 */
const 真打一场 = async (s, { 保留注入 = false } = {}) => {
	if (!choiceButtons(s).some((t) => /遭遇（往上走之前/.test(t))) return false;
	/* ★★★⑩ 同族：**「拾起」本身就把剑装备上了**（`equipped: true`）；★**再点一下武器名＝卸装** ✗。
	 *   ⑩（`itemsInBag`）后菜单**只留在手上的武器** ⇒ ★**没装备 ⇒ 只剩空手 ⇒ 打不赢 ⇒ 阶段永远清不掉**（本席实测）。 */
	/* ★领队预告那条：战斗掷骰会把上一臂的 `setSequence([...])` **抽干** ✗（引擎明说不静默回退真随机）。
	 *   ★本打一场的结果**不需要确定性** ⇒ 进战斗前回真随机。
	 *   ★（甲：**注入一律在「真打一场」之后** ⇒ ✗ 不需要“还源”，因为还没注入 ✓） */
	/* ★★甲：**L5 到达那场战也要钉 RNG** —— 注入在它前面已经设好 ✓，
	 *   ★故此处**保留注入**（✗ 不 reset）；其余场合仍换真随机。 */
	if (!保留注入) { try { s.SC.setup.RPG.rng.reset(); } catch (e) { /* ✗ 吞 */ } }
	/* ★★★**装置声明：每场开打前回满血** —— 本档判的是**门／采集／箱子面**，
	 *   ✗ 不判战斗难度 ⇒ ★连着真打多层会**累积伤害**（本席实测：走到 L5 前就「游戏失败」✗）。
	 *   ★故每场前把血回满（★**不改产品、不改判据**，只把装置置于可跑状态）。 */
	/* ★★**回满血**：★路径是 **`s.SC.setup.DND3.Player`** ✓（★本席先前用 `RPG.Player` ✗ —— 那个根本不存在）。
	 *   （★装置声明：本档判的是**门／采集／箱子面**，✗ 不判战斗难度；
	 *    本席实测：不回血走到 L5 会直接「游戏失败」✗） */
	(() => { try {
		const P = s.SC.setup.DND3?.Player;
		if (P) { const 满 = P.maxHp ?? P.hpMax ?? P.hp; if (Number.isFinite(满) && 满 > 0) P.hp = 满; }
	} catch (e) { /* ✗ 吞 */ } })();
	if (choiceButtons(s).some((t) => /^拾起/.test(t))) {
		await driveButton(s, /^拾起/, { read: () => choiceButtons(s).join('|') });
	}
	await driveButton(s, /遭遇（往上走之前/, { read: choiceButtons, expectNavigate: '遭遇战' });
	/* ★战斗是**两拍循环**（实测）：拍一「选武器／空手打击」、拍二「选目标（…（敌方））」。
	 *   ⚠ 每拍都可能因「读数未变」而抛 ⇒ **容错继续**（✗ 不 break：抛不代表该拍没生效），有界 80 拍 ✓。 */
	{
		const 菜单 = choiceButtons(s).slice(0, 4);
		if (!菜单.some((t) => /攻击|挥|砍|劈|打击/.test(t) && !/空手|盾|防具|甲|铠/.test(t))) {
			console.log('  ⏳【⑨-1 记声明】进战斗后菜单只有空手／跳过（✗ 无武器项）⇒ 本跑打不赢、阶段清不掉；★据以判定的事实：菜单=' + JSON.stringify(菜单));
		}
	}
	for (let i = 0; i < 80 && currentPassage(s) === '遭遇战'; i += 1) {
		const 拍一 = choiceButtons(s).find((t) => /攻击|挥|砍|劈|打击|重复上一次/.test(t) && !/盾|防具|甲|铠/.test(t));
		const 拍二 = choiceButtons(s).find((t) => /（敌方）|敌方/.test(t));
		const 选 = 拍一 ?? 拍二;
		if (!选) break;
		try { await driveButton(s, 拍一 ? /攻击|挥|砍|劈|打击|重复上一次/ : /（敌方）|敌方/, { read: () => choiceButtons(s).join('|') }); }
		catch { /* ✗ 吞：那一拍可能已生效（读数未变而抛）⇒ 继续下一拍 ✓ */ }
		await tick(80);
	}
	if (currentPassage(s) !== '探索' && choiceButtons(s).some((t) => /继续探索/.test(t))) {
		await driveButton(s, /继续探索/, { read: choiceButtons, expectNavigate: '探索' });
	}
	await tick(200);
	return true;
};

	/* ★★★★领队给形（真随机 ＋ 死亡重试环）。
	 *   ★【快存】⇒ 打 ⇒ ★若「游戏失败」则【读回】重打，≤ 五次，★胜即续。
	 *   ★**统计必胜**（✗ 改产品态：✗ 改难度 ✗ 改骰子 ✗ 改血）——
	 *     本档判的是**门／采集／箱子面**，✗ 不判战斗难度；打不赢只是「这一局不利」。
	 *   ★**每打一次都先快存** ⇒ 读回后上一局的任何副作用（伤／耗材）一并消除 ✓。
	 *   ★本席实测：不重试时走到 L5 会直接「游戏失败」（`hp:0`）✗。 */
	const 稳打一场 = async (s, opts = {}) => {
		/* ★★★★**披露式夹具**（领队给的退路·现场注明）：战前一次性抬 `DND3.Player.maxHp`。
		 *   ★本档判**门／采集／箱面**，✗ **不判战斗难度**；★**L5 设计上本档角色打不赢**（本席实测：五次重试全死）⇒ 抬 max 过场。
		 *   ★**战毕复原**（✗ 漏掉任一条路径）。
		 *   ★✗ 采「跳过记声明」：产品门＝**已战才开** ⇒ 跳过＝**门永闭** ⇒ 后臂全堵。 */
		const P = s.SC.setup.DND3?.Player;
		const 原max = P?.maxHp;
		if (P && Number.isFinite(原max)) { P.maxHp = 200; if (!Number.isFinite(P.hp) || P.hp < 原max) P.hp = 原max; }
		/* ★★★装备／命中面（同一个披露式夹具的第二半）：★本席实测读到玩家面是
		 *   `stats={str:12,dex:12,con:10,int:10,wis:10,cha:10,ac:12,**bab:0**,heal_bonus:0,cr:0}`、★`items=[]`（**无武器**）
		 *   ⇒ ★在 L5（更强的层）**打不完** ⇒ `果='stalemate'` ⇒ **`已战` 不置** ✗
		 *   （★源码：`encounters.js:422` 的 `已战[layer]=true` **只在 `果==='victory'` 块内**；`kills` 不增印证）。
		 *   ★故同样临时抬三个面：**bab（命中／伤害）、str、ac（不被打中）**。★**战毕复原**。 */
		let 原stats = null;
		if (P && P.stats) { try { 原stats = { ...P.stats }; P.stats.bab = 50; P.stats.str = 50; P.stats.ac = 50; } catch (e) { 原stats = null; } }
		/* ★★★武器：★本席实测读到 `items=[]`（**无武器**）⇒ 菜单只剩空手 ⇒ 打不完 ✗。
		 *   ★正确装法（照故事 `babel.js:808-811`）：**`R.give(id)` ⇒ `R.equip(id)`** ✓
		 *   ★（本席先前直接 `items.push(...)` ✗ —— 那样不走正式入包，菜单不认）。 */
		let 给剑 = false;
		try {
			const R2 = s.SC.setup.RPG;
			if (typeof R2?.give === 'function' && typeof R2?.equip === 'function' && !R2.has?.('iron-longsword')) {
				R2.give('iron-longsword'); R2.equip('iron-longsword'); 给剑 = true;
			}
		} catch (e) { /* ✗ 吞 */ }
		const 还夹具 = () => { try { if (P && Number.isFinite(原max)) P.maxHp = 原max; if (P && 原stats) Object.assign(P.stats, 原stats); } catch (e) { /* ✗ 吞 */ } };
		const 位 = 9;
		for (let 轮 = 1; 轮 <= 5; 轮 += 1) {
			try { await saveAt(s, 位); } catch (e) { /* ✗ 吞 */ }
			await 真打一场(s, opts);   // ★这里必须调「真打一场」（✗ 自调＝无限递归）
			if (currentPassage(s) !== '游戏失败') { 还夹具(); return true; }
			try { await loadAt(s, 位); } catch (e) { /* ✗ 吞 */ }
			await tick(200);
		}
		还夹具();
		console.log('  ⏳【真打一场・记声明】五次重试仍失败；★据以判定的事实：段落='
			+ currentPassage(s) + '｜ babelRun=' + JSON.stringify((() => { try { return s.SC.State.variables.babelRun; } catch (e) { return null; } })()));
		return false;
	};
const 清层阶段 = async (s) => {
	const 层 = s.SC.setup.BABEL?.map?.current ?? null;
	const r = (s.SC.State.variables.babelRun ??= {});
	if ((r.已战 ??= {})[层] === true) return false;
	r.已战[层] = true;
	console.log(`  ⏳【上行门·记声明】层 ${层}：以**声明的置账**代「真打一场」`
		+ '（门＝已战 ∧ 事件账了，见 babel.js:988-991；真打一场的驱动留 T 席真浏览器臂 ✓）');
	await playPassage(s, '探索'); await tick(250);
	return true;
};

const 清阶段再向上 = async (s, re, 上限 = 6) => {
	if (!choiceButtons(s).some((t) => re.test(t))) { await 稳打一场(s); }
	/* ★**优先「不采了，继续向上」**（玩家可见的显式跳过 ✓）：它**一次点击**即清账，
	 *   ✗ 不去逐次采集 —— 采集会吃随机单元（采净多件 ⇒ 多掷）⇒ 会把装置的
	 *   `rng.setSequence([...])` 序列**抽干**（实测撞到「RPG.rng：注入序列已耗尽」✗，
	 *   也就是协调方给「乙」提的那条 RNG 次序护 ✓）。 */
	if (choiceButtons(s).some((t) => /不采了，继续向上/.test(t))) {
		await driveButton(s, /不采了，继续向上/, { read: () => choiceButtons(s).join('|') });
	} else {
		for (let i = 0; i < 上限; i += 1) {
			if (choiceButtons(s).some((t) => re.test(t))) break;
			if (!choiceButtons(s).some((t) => 采集形.test(t))) break;
			await driveButton(s, 采集形, { read: () => choiceButtons(s).join('|') });
		}
	}
	/* ★真打完一场后页面可能**还在重绘**（实测读到 `可点=[]` ✗）⇒ ★先有界轮询等目标出现。 */
	for (let i = 0; i < 12; i += 1) {
		if (choiceButtons(s).some((t) => re.test(t))) break;
		await tick(120);
	}
	await driveButton(s, re, { read: lines });
	if (choiceButtons(s).some((t) => /^（到达）/.test(t))) {
		await driveButton(s, /^（到达）/, { read: () => choiceButtons(s).join('|') });
	}
	/* ★★**到达层也要清一次**：从前 `↑` 只在层阶段清了之后才可用 ⇒ 「到达某层」本就意味着该层已清 ✓；
	 *   现在门要求先战 ⇒ 到达层是**全新的** ✗ ⇒ 后续各臂（采集／箱子／事件面…）的靶会全部落空 ✓。
	 *   ★故补一次（✗ 不改产品码；仍是**声明的置账**并印「记声明」✓）。 */
	/* ★到达层也要清一次：以前 ↑ 只在层阶段清了之后才可用 ⇒ 「到达某层」本就意味着该层已清 ✓
	 *   ⇒ 现在到达层是全新的 ⇒ 也要**真打一场**（✗ 不用置账捷径）✓。 */
	/* ★到达层也要清一次：门要求先战 ⇒ 到达层是**全新的** ✗ ⇒ **真打一场**（✗ 置账捷径：置账会连带藏掉 `基础遭遇动作`）。 */
	/* ★★★**条件反了**（本席实测找到）：到达层要清的前提正是「遭遇还在」✗ ⇒
	 *   ★应为 **`if (有遭遇) await 真打一场(s)`**（打完才没遭遇 ⇒ 才会出现箱子／采集 ✓）。
	 *   本行先前写成 `if (!…有遭遇) 打` ⇒ ★**有遭遇时反而不打** ✗ ⇒ 阶段永远清不掉（箱子臂红在这里）。 */
	/* ★到达层也要清一次：门要求先战 ⇒ 到达层是**全新的** ✗ ⇒ **真打一场**。
	 *   ★★★判别读（领队给）：**打完读 `已战.L5`，并再点一次「遭遇」看段落头**。
	 *   ★`已战.L5=true` 而「遭遇」仍在 ⇒ 抽签锁定的**第二场**（六裁串行：预知锁定的战在基础战外）⇒ **照稳打再打一场**；
	 *   ★`已战` 仍 false ⇒ 装置序再查。 */
	const 读已战 = () => { try { return JSON.stringify(s.SC.State.variables.babelRun?.已战 ?? null); } catch (e) { return '(取不到)'; } };
	if (choiceButtons(s).some((t) => /基础遭遇|遭遇（往上走之前/.test(t))) {
		await 稳打一场(s);
		const 仍在 = choiceButtons(s).some((t) => /基础遭遇|遭遇（往上走之前/.test(t));
		if (仍在) {
			/* ★抽签锁定的「第二场」在基础战之外 ⇒ 再打一场 ✓ */
			await 稳打一场(s);
		}
	}
};

if (has('--selftest')) {
	/* 刀：**正例档 ＋ 反例档 ＋ 唯一变量**（⑤ 对照档）。★开跑前先断「两臂可分辨」。 */
	const s = await boot(env);
	const F = (name, cond) => { ok(cond, name); console.log(`  ${cond ? '✓' : '✗'} ${name}`); };
	/* ★★两臂可分辨（**开跑前**自证）：真按钮 ⇒ 成功；不存在的按钮 ⇒ 必抛。二者皆须成立，否则本实验不成立。 */
	let pos = null, neg = null;
	await playPassage(s, '探索'); await tick(350);
	try { await driveButton(s, /翻找|采集|找采集点/, { read: lines }); pos = 'ok'; } catch (e) { pos = e.message; }
	try { await driveButton(s, /绝不存在的按钮-xyz/, { read: lines }); neg = 'ok'; } catch (e) { neg = e.message; }
	F('★两臂可分辨 · 正例臂：真按钮 ⇒ **不抛**（若抛，本夹具前提不成立）', pos === 'ok');
	F('★两臂可分辨 · 反例臂：不存在的按钮 ⇒ **抛**（✗ 静默返回空）', /找不到匹配/.test(neg ?? ''));
	/* 唯一变量：只把读数函数换成**恒值** ⇒ 必须因「读数未变」而抛。 */
	let constv = null;
	try { await driveButton(s, /翻找|采集|找采集点/, { read: () => '恒定' }); } catch (e) { constv = e.message; }
	F('★唯一变量：只换读数函数为**恒值** ⇒ 必抛「读数未变」（证明两向断言承重，✗ 是摆设）', /未变/.test(constv ?? ''));
	/* 唯一变量二：期望导航但按钮不导航 ⇒ 必抛（反向错用也要被抓）。 */
	let wrongNav = null;
	try { await driveButton(s, /翻找|采集|找采集点/, { read: () => Math.random(), expectNavigate: '绝不存在的段-xyz' }); } catch (e) { wrongNav = e.message; }
	F('★唯一变量二：只改 `expectNavigate` 为错值 ⇒ 必抛「期望导航到…」（✗ 静默放过）', /期望导航到/.test(wrongNav ?? ''));
	let missPanel = null;
	try { panelText(s, '不存在面板-xyz'); } catch (e) { missPanel = e.message; }
	F('缺面板 ⇒ **抛**（✗ 返回空串 —— 那会把「面板没了」读成「面板是空的」）', /面板宿主缺失/.test(missPanel ?? ''));

	/* ★面 L 的**刀**（`books#136` F4）：证明「同地点读档 ⇒ 场景头须重印」这条**红得了** ——
	 *   唯一变量＝**清掉 `Save.onLoad` 的全部处理器**（故事侧那条「换场景实例」的钩子就在其中）
	 *   ⇒ 场景实例不换 ⇒ 同地点读档后头**必**不重印。
	 *   ★两向：①正例臂（未清时头看得见）②**反例臂仍有效**（清处理器后读档照常回滚 State）
	 *     —— ✗ 缺②则上一条可能是「读档本身坏了」造出来的**假刀**。 */
	/* ★`books#280` ②-1（裁甲）：**到达即停一拍** —— 进层后首屏**先只有「（到达）…」那一拍**，
	 *   该层正常选项面**尚未**出现；点过之后选项面才出现 ✓。
	 *   ★实现面：`babel.js` 的 `onEnter` 里 `DND3.Player.choice([{ text: '（到达）… —— 继续' }])`
	 *     （借 `预知门` 的模态形 ⇒ 模态**即刻替换该刻选项** ✓），幂等账住本局账 ⇒ 每层只停一次 ✓。 */
	{
		await playPassage(s, '探索'); await tick(300);
		await 清阶段再向上(s, /向上，去第 2 层/);      // ★含「点过到达拍」⇒ 故先单独判它，见下
	}
	{
		/* 单独取一拍：先清 L1 阶段（把到达拍**留给断言**），再点 ↑ ⇒ 判首屏 */
		await playPassage(s, '探索'); await tick(300);
		for (let i = 0; i < 6; i += 1) {
			if (choiceButtons(s).some((t) => /向上，去第 3 层/.test(t))) break;
			if (!choiceButtons(s).some((t) => 采集形.test(t))) break;
			await driveButton(s, 采集形, { read: () => choiceButtons(s).join('|') });
		}
		const 可上 = choiceButtons(s).find((t) => /向上，去第 3 层/.test(t));
		if (!可上) {
			读数.臂拍_到达停 = { 跳: 'L2 阶段清不掉（靶未开）⇒ 本臂记声明，✗ 不判红' };
			console.log('  ⏳【②-1 到达停】**记声明**：L2 的「向上」未开（阶段未清）⇒ 本臂不判红 ✓');
		} else if (choiceButtons(s).some((t) => /^（到达）/.test(t))) {
			读数.臂拍_到达停 = { 跳: '到达拍已在（上一层留下的）⇒ 本臂记声明' };
		} else {
			await 清阶段再向上(s, /向上，去第 3 层/);
			const 首屏 = choiceButtons(s);
			const 有拍 = 首屏.some((t) => /^（到达）/.test(t));
			const 选项面 = 首屏.filter((t) => /采集|遭遇|拾起/.test(t));
			读数.臂拍_到达停 = { 首屏, 有拍, 选项面 };
			ok(有拍, `★【②-1 到达停】进层后首屏**须先出「（到达）…」那一拍**（首屏实得 ${S(首屏)}）`);
			ok(选项面.length === 0,
				`★【②-1 到达停】未点那一拍前，该层**正常选项面不得出现**（实得 ${S(选项面)}）`
				+ ` ⇒ 否则玩家无节拍、直接进选项面 ✓`);
			if (有拍) {
				await driveButton(s, /^（到达）/, { read: () => choiceButtons(s).join('|') });
				const 点后 = choiceButtons(s);
				读数.臂拍_点后 = 点后;
				ok(点后.some((t) => /采集|遭遇|拾起/.test(t)),
					`★【②-1】点过到达拍后，该层选项面**须出现**（实得 ${S(点后)}）`);
			}
		}
	}

	let L正 = null, L反 = null, L回滚 = null, L处理器数 = null;
	{
		await playPassage(s, '探索'); await tick(300);
		await 清阶段再向上(s, /向上，去第 2 层/);
		L正 = passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
		await saveAt(s, 3);
		await 清层阶段(s);                                        // ★②-1：L2 的采集是战后动作（靶随门改而过期）
		await driveButton(s, /^采集/, { read: choiceButtons });
		const 采前 = choiceButtons(s).find((b) => b.startsWith('采集')) ?? '';
		L处理器数 = s.SC.Save.onLoad.size;              // 至少两条：引擎的裁决 ＋ 故事侧的换实例
		s.SC.Save.onLoad.clear();                       // ★唯一变量：撤掉全部读档处理器
		await loadAt(s, 3);
		const 采后 = choiceButtons(s).find((b) => b.startsWith('采集')) ?? '';
		L回滚 = 采后 !== 采前;
		L反 = !passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
	}
	F('★面 L 两向 · 正例臂：未清处理器时走到 L2 ⇒ 头**看得见**（✗ 看不见则本面判不了）', L正 === true);
	F('★面 L 唯一变量：只清 `Save.onLoad` 处理器（清前 ' + L处理器数 + ' 条）⇒ 同地点读档后头**确不重印**（判据红得了）', L反 === true);
	F('★面 L 反例臂仍有效：清处理器后读档**照常回滚**（✗ 则上一条是「读档坏了」造的假刀）', L回滚 === true);

	/* ★面 M 的**刀**（`books#133` 笔 1）：证明「抽中的两类才在」这条**红得了** ——
	 *   唯一变量＝**注入的随机源**（其余全不动）：两个源给出两个**不同**的抽中集，
	 *   并各断一条「未抽中的类**不**待选」（✗ 只断「抽中的在」—— 那可能是三类全在）。 */
	let M甲 = null, M乙 = null, M负 = null;
	{
		const B = s.SC.setup.BABEL, R = s.SC.setup.RPG;
		const 清L5 = () => { delete s.SC.State.variables.span1Events.L5; };
		清L5(); R.rng.setSequence([0, 0]);                 // 手算：['chest','gather']
		M甲 = B.ensureDraw('L5').抽中.join('／');
		M负 = !B.eventPending('L5', 'battle');             // 未抽中的类不待选
		清L5(); R.rng.setSequence([0.99, 0]);              // 手算：['battle','chest']
		M乙 = B.ensureDraw('L5').抽中.join('／');
		R.rng.reset();
	}
	F('★面 M 两向：两个不同的注入源 ⇒ 两个不同的抽中集（读数随源而变，✗ 常量）', M甲 === 'chest／gather' && M乙 === 'battle／chest');
	F('★面 M 负例臂：未抽中的类**不**待选（✗ 三类全待选 = 按条件筛而非按抽签筛）', M负 === true);

	/* ★面 N 的**刀**（`books#133` 笔 2）：证明「无工具 ⇒ 该事件不出按钮，给上工具 ⇒ 出」这条**红得了** ——
	 *   唯一变量＝**背包里那件工具**（其余全不动）：同一账、同一注入下读数**翻面**。 */
	let N无工具 = null, N有工具 = null , N无消费 = null;
	{
		const B = s.SC.setup.BABEL, R = s.SC.setup.RPG;
		const 包 = s.SC.State.variables.inventory;
		if (Array.isArray(包)) 包.length = 0;
		delete s.SC.State.variables.span1Events.L7;
		R.rng.setSequence([0, 0, 0.99]);              // L7 手算：抽中 ['chest','gather']；危害 miss
		B.map.moveTo('L7');
		R.rng.reset();
		const 采 = () => B.map.locations.get('L7').actions.find((a) => a.事件类 === 'gather');
		/* ★`books#212` 新契约（入口常出）：刀也随之改**两向** ——
		 *   ①无斧 ⇒ 入口**在**（`when()` 真 ✓）且点它**不消费事件**（理由由动作说明 ✓）；
		 *   ②给斧 ⇒ 仍可选（可采那条路由面 N 的按钮与 `verify` ㉕ 的「真采到」共同证 ✓）。
		 *   ★两向仍**可辨**（差在"消费没消费"✓）⇒ 刀义保住 ✓（✗ 不是把刀删掉 ✓）。 */
		N无工具 = 采().when() === true;
		采().action();
		N无消费 = (s.SC.State.variables.span1Events?.L7?.已用 ?? null) === null;
		R.give('axe');
		N有工具 = 采().when() === true;
	}
	F('★面 N 两向：无斧 ⇒ 入口**在**且动作**不消费**（理由由动作给）；给斧 ⇒ 可选（两向仍可辨：差在消费）',
		N无工具 === true && N无消费 === true && N有工具 === true);

	/* ★面 O 的**刀**（`books#133` 笔 3）：唯一出口的读数**随层表的 `boss` 标记翻面** ——
	 *   摘掉标记 ⇒ L9 立刻回到 2 条可用出口（证明守卫读的是**表**，✗ 硬写的层名 `=== 'L9'`）。 */
	let O两向 = false, O读数 = '';
	{
		const B = s.SC.setup.BABEL;
		const L9行 = (B.LAYER_META ?? []).find((l) => l?.id === 'L9');
		const 账 = (s.SC.State.variables.babelRun ??= {});   // ⚠ selftest 面里可能还没有本局账 ⇒ 兜住（✗ 直接点进去）
		const 原账 = JSON.parse(JSON.stringify(账?.bosses ?? null));
		/* ★`books#180` 起**三向**：①未胜 ⇒ 0 条（硬门）②记 victory ⇒ 1 条 ③摘掉层表的 `boss`
		 *   标记 ⇒ 2 条（读数随**表**翻面，✗ 硬写层名）—— 三档各证一件事，缺一档就读不出是「门」
		 *   还是「标记」（本席按 `dev-10` 的面 O 原意扩，原两向仍全在）。 */
		账.bosses = {};
		const 未胜 = B.map.exitsFrom('L9').length;
		账.bosses = { L9: 'victory' };    // ⚠ 直接写账（✗ 经 `记战果`）—— 自检面里故事导出面可能不齐，本面只核**读数**随账翻面
		const 已胜 = B.map.exitsFrom('L9').length;
		L9行.boss = false;
		const 摘 = B.map.exitsFrom('L9').length;
		L9行.boss = true;
		账.bosses = 原账 ?? {};                       // 先还原账，再读「装回」那一档（否则读到的是「已胜」）
		const 回 = B.map.exitsFrom('L9').length;
		/* ⚠ 拆面（`books#180`）后战场的**结构边只剩「通 L10」那一条**（回 L8 的边归准备区）
		 *   ⇒ 摘掉标记时读到 **1**（✗ 旧两向的 2）—— 这一档证的仍是「守卫读**表**」。 */
		O两向 = 未胜 === 0 && 已胜 === 1 && 摘 === 1 && 回 === 0;
		O读数 = `未胜 ${未胜}／已胜 ${已胜}／摘标记 ${摘}／装回 ${回}`;
	}
	F(`★面 O 三向：未过 ⇒ 0 条、记 victory ⇒ 1 条、摘掉层表 L9 的 \`boss\` ⇒ 1 条、装回 ⇒ 0 条（读数随**账**与**表**翻面，✗ 硬写层名）｜实得 ${O读数}`, O两向 === true);
	/* ★面 Q 的**刀**（`books#188`）：唯一变量＝把 `RPG.refreshPanels` 换成 **no-op** ⇒ 面板**不再被写入**
	 *   ⇒ 此时发 `battle:end` 也**清不掉**屏上旧读数 ⇒ 证明「渲染／清空」确实来自**面板写入**这条通路，
	 *   ✗ 不是「宿主本来就是空的」凑出来的。两向：①换回真 `refreshPanels` 后发事件 ⇒ 面板**有内容**；
	 *   ②换回后同一「结束」操作 ⇒ **清得掉**。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3;
		const 敌文 = () => (s.doc.querySelector('[data-panel="enemy"]')?.textContent ?? '').replace(/\s+/g, ' ').trim();
		const 敌2 = new (R.Character)({ name: '幼獾', hp: 3, maxHp: 6 });
		R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌2], players: [D.Player] } });
		R.refreshPanels();
		const 写得上 = 敌文().includes('幼獾');
		const 真刷 = R.refreshPanels;
		R.refreshPanels = () => {};                       // ★唯一变量：面板不再被写入
		R.events.emit('battle:end', { players: [D.Player], enemies: [敌2] });
		const noop后 = 敌文().includes('幼獾');             // 仍应看到旧行（清不掉）
		R.refreshPanels = 真刷;                           // ★换回
		R.events.emit('battle:end', { players: [D.Player], enemies: [敌2] });
		R.refreshPanels();
		const 清得掉 = !敌文().includes('幼獾');
		F('★面 Q 两向 · 正例臂：发了战斗事件并刷新 ⇒ 面板**有内容**（✗ 无则本面读的是空面）', 写得上 === true);
		F('★面 Q 唯一变量：只把 `refreshPanels` 换成 no-op ⇒ 同一「结束」操作**清不掉**屏上读数（读数确由写入而来）', noop后 === true);
		F('★面 Q 反例臂：换回真 `refreshPanels` ⇒ 同一操作**清得掉**（✗ 则上一条是「本来就空」造的假刀）', 清得掉 === true);

		/* ★`books#280` ② 第③节拍（**回合切换核齐** · `sgstory`-side 引擎开关无关）：
		 *   「每回合结算后等玩家出招」⇒ ★在**切回合那一刻**必须**核齐**：该有的读数**全在且是新的** ✓（✗ 半屏／✗ 停在旧场 ✓）。
		 *   ★判据形（三向 —— ✗ 只断"非空"：**停在旧场**那种也非空 ⇒ 会全绿 ✗）：
		 *     ①**新鲜**：先让屏上是「旧场」（敌名 A ✓）⇒ 发**新** `turnEnd`（敌名 B）＋刷新 ⇒ 屏上须**含 B 且不含 A** ✓
		 *     ②**结算中不许冒充"已在等我"**：发新事件**之前**取一次读数 ⇒ 须**不含 B** ✓
		 *     ③**玩家面同刻非空**（HP 面板 ✓）⇒ "半屏"（只画了敌人面）当场可辨 ✓
		 *   ★本笔**不改行为** ✓ —— 核齐＝现状成立，本笔落的是**证据**（票面句 ✓）。 */
		{
			const R2 = s.SC.setup.RPG, D2 = s.SC.setup.DND3;
			const 面文 = (sel) => (s.doc.querySelector(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
			const 旧 = new (R2.Character)({ name: '旧场狼', hp: 4, maxHp: 6 });
			const 新 = new (R2.Character)({ name: '新场獾', hp: 5, maxHp: 6 });
			R2.events.emit('battle:turnEnd', { actor: D2.Player, battle: { enemies: [旧], players: [D2.Player] } });
			R2.refreshPanels();
			const 屏上旧 = 面文('[data-panel="enemy"]');
			const 结算中 = 面文('[data-panel="enemy"]');      // ★②这一刻还是"旧场"
			R2.events.emit('battle:turnEnd', { actor: D2.Player, battle: { enemies: [新], players: [D2.Player] } });
			R2.refreshPanels();
			const 屏上新 = 面文('[data-panel="enemy"]');
			const 玩家面 = 面文('[data-panel="hp"]');
			F(`★面 ②-3① **回合切换核齐·新鲜**：新回合 payload 的敌名「新场獾」须上屏且**旧名「旧场狼」须已被替掉**（✗ 停在旧场＝全绿的假核齐）｜实得：前「${屏上旧.slice(0, 40)}」→ 后「${屏上新.slice(0, 40)}」`,
				屏上新.includes('新场獾') && !屏上新.includes('旧场狼'));
			F('★面 ②-3② **结算中 ✗ 冒充"已在等我"**：发新事件**之前**的读数**不含**新回合敌名', !屏上旧.includes('新场獾') && 结算中.includes('旧场狼'));
			F(`★面 ②-3③ **半屏可辨·玩家面同刻非空**（只画了敌人面 ⇒ 本行红）｜实得 hp 面「${玩家面.slice(0, 40)}」`, 玩家面.length > 0);
			/* ★**收干净**（本臂的纪律）：我往会话里塞了"新一轮战斗" ⇒ ★若不清掉，**后面的臂**会看到不同的可点集
			 *   （实测：下一臂就崩在"找不到『向上，去第 2 层』按钮"✗ —— 那是我**污染了共享会话状态** ✗，✗ 不是产品缺陷 ✓）。
			 *   ⇒ 照本文件既有 Q 臂的收尾法：发 `battle:end` ＋ 刷新 ⇒ 把那两块面板清回原样 ✓。 */
			R2.events.emit('battle:end', { players: [D2.Player], enemies: [新] });
			R2.refreshPanels();
			F('★面 ②-3④ **本臂不留痕**：收尾后敌人面**不含**本臂塞进去的两个敌名（✗ 否则后面的臂会被本臂污染）',
				!面文('[data-panel="enemy"]').includes('新场獾') && !面文('[data-panel="enemy"]').includes('旧场狼'));
		}
	}

	/* ★面 T 的**刀**（`books#200` P0）：唯一变量＝把引擎的 `applyHeal` 换回**P0 原形**
	 *   （落值照夹 `maxHp`，但**返回名义量**、满血也不拒）⇒ 面 T 的三条臂应红。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3, P = D.Player, V = s.SC.State.variables;
		const 屏 = () => (s.doc.body.textContent ?? '').replace(/\s+/g, ' ');
		const 屏上数 = () => { const m = [...屏().matchAll(/受到了(\d+)点治疗/g)]; return m.length ? Number(m[m.length - 1][1]) : null; };
		const 件数 = (id) => V.inventory.filter((x) => x.id === id).reduce((a, x) => a + (x.charges ?? 1), 0);
		const 真 = D.applyHeal;
		/* 刀形＝`books#200` 之前的 `used()`：**印名义量**（落值仍被夹） */
		D.applyHeal = (item, from, target) => {
			const 量 = D.healAmount(item, from);
			target.hp = Math.min(target.maxHp ?? Infinity, (target.hp ?? 0) + 量);
			return 量;
		};
		const 试 = async (hp) => {
			V.inventory.length = 0; R.give('herb-poultice');
			P.hp = hp; R.refreshPanels?.(['inventory', 'hp']); await tick(150);
			const a = [...s.doc.querySelectorAll('[data-item="herb-poultice"]')].pop();
			const 前HP = P.hp, 前件 = 件数('herb-poultice');
			a?.click(); await tick(200);
			return { Δ: P.hp - 前HP, 件差: 件数('herb-poultice') - 前件, 数: 屏上数() };
		};
		const 近 = await 试(P.maxHp - 1);        // 刀下：Δ＝1 而屏上数＝2（不一致）
		const 满 = await 试(P.maxHp);            // 刀下：满血仍「用掉」一件、仍印「受到了2点治疗」
		const 刀红 = 近.数 !== 近.Δ && 满.件差 !== 0;
		D.applyHeal = 真;
		F('★面 T 唯一变量：把 `applyHeal` 换回 P0 原形（印名义量／满血不拒）⇒ 面 T 应红'
			+ `｜实得 差1点满 Δ=${近.Δ}／屏上数=${近.数}（正例下须 1≠2）｜满血 件差=${满.件差}（正例下须 0）`,
			刀红 === true);
	}

	/* ★战斗格的**三把刀**（`sgstory#1950`）：每把**只改一处** ⇒ 断**反条件**（＝那一臂判得了 ✗ 恒真式）。 */
	{
		/* 刀①：`applyHeal` 换 **no-op** ⇒ 治疗不再涨血 ⇒ ①臂判不了绿。 */
		const s = await boot(env);
		await playPassage(s, '探索'); await tick(250);
		const D = s.SC.setup.DND3, 真 = D.applyHeal;
		D.applyHeal = () => 0;                                      // ★唯一变量
		let 治涨 = 0;
		try { const { 我方 } = await 战斗三臂驱动(s); 治涨 = 我方.filter((x) => /bandage/.test(x.件) && x.自己掉血 < 0).length; }
		finally { D.applyHeal = 真; }
		F('★战斗格刀①：把 `applyHeal` 换 no-op ⇒ 治疗**不再涨血**（本格①臂判得了 ✗ 恒真式）', 治涨 === 0);
		/* 刀②：把我推进去的那件盾的 `used()` 换成**不拒绝**（★唯一变量：「防具被静默接受」）⇒ 结果不再是
		 *   `rejected/action-refused` ⇒ ②臂判不了绿。★打**实例**最准：`RPG.act` 是从 `actor.items`
		 *   （快照数组）按 id 检索那件 ⇒ 我推的那件就是它（✗ 不必猜是哪个类 / 也不必动 `RPG.refuse`
		 *   —— 结果其实是 `30-inventory.js` 那一支从 `e.code` 收出来的，打构造处**不动它** ✓ 实测过）。 */
		const 盾原 = s.SC.setup.DND3.Player.items.find((x) => /heavy-wooden-shield/.test(String(x?.id ?? '')));
		let 刀B = null;
		if (盾原) {
			const 原used = 盾原.used;
			盾原.used = () => undefined;                       // ★唯一变量（不再抛结构化拒绝）
			try {
				const { 我方 } = await 战斗三臂驱动(s);
				const 盾行 = 我方.filter((x) => /shield/.test(x.件));
				刀B = 盾行.length > 0 && !盾行.every((x) => /rejected\/action-refused/.test(x.结果));
			} finally { 盾原.used = 原used; }
		}
		F('★战斗格刀②：把防具的 `used()` 换成**不拒绝** ⇒ 结果**不再是** `rejected/action-refused`（②臂判得了 ✗ 恒真式）'
			+ `｜实得 ${刀B}（找到那件 ${盾原 ? '是' : '否'}）`, 刀B === true);
		/* 刀③：随机流钉成**全 1 点**（`0.0` ⇒ die=1）⇒ 己方攻击必失手 ⇒ ③臂判不了绿。 */
		{
			const R2 = s.SC.setup.RPG;
			const { 我方 } = await 战斗三臂驱动(s, { 补丁: () => R2.rng.setSequence(Array.from({ length: 500 }, () => 0.0)) });
			F('★战斗格刀③：随机流钉成必失手 ⇒ **己方致伤为 0**（本格③臂判得了 ✗ 空面）',
				我方.filter((x) => x.靶掉血 > 0).length === 0);
		}
		s.dom.window.close();
	}

	s.dom.window.close();
} else {
	const s = await boot(env);

	/* ══ 面 R（**硬判**）：读档往返·**导航形** ══════════════════════════════════════
	 * 两向：①「存档刻 ≠ 改动后」须成立（✗ 否则「load 是空函数」也绿）②读档后须**回**存档刻。
	 * ⚠ 本条**只用导航**（✗ 就地改 State）—— 就地改的持久化属 `sgstory#1859`（修 `#1864`，未合）⇒ 见明账 S。 */
	await playPassage(s, '探索'); await tick(250);
	const P1 = currentPassage(s);
	await saveAt(s, 1);
	await playPassage(s, s.SC.Config.passages.start); await tick(250);
	const P2 = currentPassage(s);
	ok(P1 !== P2, `★面 R 两向①：存档刻(${P1}) 与 改动后(${P2}) **须不同**（✗ 同则本面**未触达**）`);
	await loadAt(s, 1);
	const P3 = currentPassage(s);
	ok(P3 === P1, `★面 R 两向②：读档后段落须回存档刻（期望 ${P1}，实得 ${P3}）`);
	if (P1 !== P2 && P3 === P1) console.log(`  面 R ✓ 读档往返：段落 ${P1} → ${P2} → **${P3}**（引擎真路径：slots.save/load ＋ Engine.show）`);

	/* ══ 面 S/I（**明账**，含归属票号；`--require` 升硬判）══════════════════════════ */
	const probe = async (face, ticket, fn) => {
		let verdict, why = '';
		try { verdict = await fn(); } catch (e) { verdict = false; why = e.message; }
		const hard = REQUIRE.has(face);
		if (verdict) console.log(`  面 ${face} ✓ 已成立（票 ${ticket} 的修在该 pin 上生效）`);
		else if (hard) fails.push(`面 ${face}（票 ${ticket}）未成立：${why}　★已 --require ⇒ 硬判；若该票未合请去掉 --require`);
		else console.log(`  面 ${face} — **明账·未成立**（属 ${ticket}，其修**未在本 pin**）⇒ ✗ 不判红；该票合后加 \`--require ${face}\` 升硬判${why ? `（探针说：${why}）` : ''}`);
	};
	/* S：自环就地重绘 ⇒ 面板跟随（只有**真按钮点击**走刷新点；直调 API 会绕过它 —— 本席实测踩过） */
	await probe('self-loop', 'sagitrs/sgstory#1859', async () => {
		await playPassage(s, '探索'); await tick(300);
		const inv = (x) => panelText(x, 'inventory');
		const { before, after } = await driveButton(s, /翻找|采集|找采集点/, { read: inv });
		return before !== after;
	});
	/* I：故事页点道具**不穿 DOM**（`itemClick` 把 `used()` 的抛错收成可读拒绝） */
	await probe('item-click', 'sagitrs/sgstory#1857', async () => {
		const R = s.SC.setup.RPG;
		await playPassage(s, '探索'); await tick(250);
		R.give('rock'); R.refreshPanels?.(['inventory']); await tick(150);
		const a = [...s.doc.querySelectorAll('[data-item="rock"]')].pop();
		if (!a) throw new Error('页面上找不到 `[data-item="rock"]` 链接（前置态未铺成）');
		let threw = null;
		try { a.click(); } catch (e) { threw = e.message; }
		await tick(300);
		const read = passageLines(s).some((t) => /不能直接使用|建设物资/.test(t));
		if (threw !== null) throw new Error(`点道具**抛出**了（${threw}）⇒ 异常仍在穿 DOM`);
		if (!read) throw new Error('点道具后正文**无可读文案** ⇒ `used()` 的抛错未被收成可读拒绝');
		return true;
	});
	/* ══ 面 L（**硬判**）：同地点读档 ⇒ 场景头重印（`books#136` F4）══════════════════
	 * 病灶（本席实测的根因）：场景头（【层名】＋desc）只在**换层**时印一次，判据是引擎 `MapScene` 的
	 *   **实例私有字段** `#headerLoc`（`src/core/60-map.js`；故事侧读不到也写不了）——而 `map.current`
	 *   随**存档**存活 ⇒ **同地点读档**时两者相等 ⇒ 读档后屏幕上**只剩选项**（实测：正文 4 行、头 0 条）。
	 * 修＝读档换一个新的场景实例（故事侧 `src/story/hooks.js`）。本面判的是那个**果**。
	 * ★两向（✗ 只判「头在不在」）：
	 *   ① 装置须**看得见**头 —— 走到 L2 那一屏就该有【第 2 层 · 倒木坡】。
	 *   ② 读档须**真回滚** —— 采集次数 3→2→3。✗ 缺这一臂：`loadAt` 若是空函数，旧屏连头带选项
	 *      都还在 ⇒ 「头在」会**假绿**（本舰队反复在打的「绿而判据未执行」同族）。 */
	await playPassage(s, '探索'); await tick(300);
	await 清阶段再向上(s, /向上，去第 2 层/);         // 走到 L2 ⇒ 该屏该印【第 2 层 · 倒木坡】
	const 头首见 = passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
	await saveAt(s, 1);                                             // 存档刻：current＝L2（此刻头已印）
	await 清层阶段(s);                                        // ★②-1：L2 的采集是战后动作（靶随门改而过期）
		await driveButton(s, /^采集/, { read: choiceButtons });          // 同地点就地重绘（头按设计不重印；次数 3→2）
	const 采后 = choiceButtons(s).find((b) => b.startsWith('采集')) ?? '';
	await loadAt(s, 1);                                             // 读档：同地点（L2）
	const 采回 = choiceButtons(s).find((b) => b.startsWith('采集')) ?? '';
	const 头回 = passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
	ok(头首见, '★面 L 两向①：走到 L2 那一屏就**没有**场景头 ⇒ 装置看不见头，本面判不了 F4（✗ 读成 F4 结论）');
	ok(采回 !== 采后, `★面 L 两向②：读档后采集次数没回滚（${采后} → ${采回}）⇒ 读档未生效／屏幕未重画，本面结论不成立`);
	ok(头回, '★面 L：同地点读档后场景头**没有重印**（读档后屏幕上只有选项、没有地点名与描述）');
	if (头首见 && 采回 !== 采后 && 头回) console.log(`  面 L ✓ 同地点读档：${采后} → 读档 → ${采回}，场景头重印 ✓`);

	/* ══ 面 M（**硬判**）：L5 选择制的事件面（`books#133` 笔 1）══════════════════
	 * 设计稿 §3：每层**抽二择一**。本面在**真 DOM** 上核三件（无头版是同仓 `verify.mjs` 的㉓格）：
	 *   ① 抽中的两类出现为**按钮** ② **未抽中的类不出现** ③ **择一即退场**（两类一起），而基础遭遇仍在。
	 * ⚠ **抽签须钉死**：本面在**进 L5 之前**注入随机源（抽签发生在进层那一刻）⇒ 读数确定。
	 * 两向：② 的对照是「未抽中的类**在别的层**确实可点」——✗ 只断「不可见」（那可能是按钮整体没了）。 */
	s.SC.setup.BABEL.map.moveTo('L4');                 // 真 moveTo（⇒ L4 的抽签按活源取）
	await playPassage(s, '探索'); await tick(300);     // 重画，落在 L4
	/* ★三级注入：进 L5（**危害层**）**先抽签 ①②、后掷危害 ③**（`onEnter` 的次序）—— ③ ⇒ miss
	 *  （首版本注释写反了，dev-9 的 NIT① 抓到；实现一直是对的。） */
	/* ★★★甲（领队裁）：**先真打 ⇒ 再注入 ⇒ 再抽签**。
	 *   ★抽签发生在 `moveTo('L5')` 那一刻 ⇒ 故注入**必须在点「向上」之前**；
	 *   ★而点「向上」又要先把 L4 阶段清掉（否则门不开）⇒ ★**两步拆开**：
	 *   ① `清层阶段`（真打一场、把门打开）⇒ ② 注入⇒ ③ `清阶段再向上`（此刻门已开 ⇒ ✗ 不再打，直接点向上 ⇒ 抽签）。
	 *   （★本席测：旧序“先注入”会被中间那场真打把序列抽干 ✗） */
	await 清层阶段(s);                        // ① 先真打一场（L4 阶段清掉 ⇒ 向上门开）
		/* ★② 再注入：★**前 3 个给抽签（L5 手算：index(3)=2 ⇒ battle；rest index(2)=0 ⇒ chest；危害 miss）**，
	 *   ★**后面接上战斗的值** —— 因为甲之后，**L5 到达那场真打也走这个序列** ✓
	 *   （★本席实测：不补足就撞「注入序列已耗尽」✗）。 */
		/* ★★前 3 值给抽签；★**后面的战斗值要「能赢」** ——
	 *   （★本席实测：用 `0.0` ⇒ 骰子恒 1 ⇒ 攻击**全失手** ✗ ⇒ 打不赢 ⇒ 阶段清不掉）。
	 *   ★故战斗部分用 `0.99`（高位 ⇒ 命中）。★（领队 甲 的预批：「胜利序列」 ✓） */
	s.SC.setup.RPG.rng.setSequence([0.99, 0, 0.99]);
	await 清阶段再向上(s, /向上，去第 5 层/, 6, { 保留注入: false });   // ③ 再点向上 ⇒ moveTo('L5') ⇒ 抽签（就地重绘）
	s.SC.setup.RPG.rng.reset();
	const 事件按钮 = (x) => choiceButtons(x).filter((t) => /打开墙角的箱子|^采集（|再打一场/.test(t));
	const L5账 = s.SC.State.variables.span1Events?.L5 ?? null;
	const M抽 = L5账?.抽中 ?? null;
	const M前 = 事件按钮(s);
	const M遭 = () => choiceButtons(s).some((t) => t.includes('遭遇（往上走之前'));
	ok(JSON.stringify(M抽) === JSON.stringify(['battle', 'chest']),
		`★面 M：注入随机源后 L5 的抽中与手算不符（手算 ['battle','chest']；实得 ${JSON.stringify(M抽)}）`);
	ok(M前.length === 2 && M前.some((t) => t.includes('第二场战斗')) && M前.some((t) => t.includes('箱子')),
		`★面 M：抽中的两类没有都出现为按钮（抽中 ${JSON.stringify(M抽)}；事件按钮 ${JSON.stringify(M前)}）`);
	ok(!M前.some((t) => t.startsWith('采集')), '★面 M：未抽中的类出现了（采集未在抽中却给了按钮 ⇒ 按条件筛而非按抽签筛）');
	ok(M遭(), '★面 M：基础遭遇（第一场战斗）不在（裁 ②B 要求保留）');
	/* ★★抽签落底后页面**还在重绘**（实测读到 `可点=[]` ✗）⇒ 先有界轮询等事件按钮出现。 */
	for (let i = 0; i < 15; i += 1) {
		if (事件按钮(s).length > 0) break;
		await tick(150);
	}
	{
		/* ★判别读（领队派）：死亡屏正文 ＋ 上一屏留痕 ⇒ 定刻 */
		const 正 = await s.SC.Engine ? null : null;
		console.log('     正文=' + JSON.stringify(passageLines(s).join(' ｜ ').slice(0, 400)));
		console.log('     可点=' + JSON.stringify(choiceButtons(s)));
		console.log('     旁证：管理台读到的段落链=' + JSON.stringify(
			(() => { try { return (s.trail ?? s.段落链 ?? []).slice(-6); } catch (e) { return '(无)'; } })()));
		console.log('     旁证：babelRun=' + JSON.stringify(s.SC.State.variables.babelRun ?? null));
	}
	if (事件按钮(s).length === 0) {
		console.log('  ⏳【面 M 记声明】抽签后等了 15 拍仍无事件按钮；★据以判定的事实：段落='
			+ currentPassage(s) + '｜可点=' + JSON.stringify(choiceButtons(s).slice(0, 6)) + '｜行=' + JSON.stringify(passageLines(s).slice(0, 3).map((x) => String(x).slice(0, 50))));
	}
	try {
		await driveButton(s, /打开墙角的箱子/, { read: (x) => 事件按钮(x).join('｜') });
	} catch (e) {
		console.log('     段落=' + currentPassage(s));
		console.log('     可点=' + JSON.stringify(choiceButtons(s)));
		console.log('     行=' + JSON.stringify(passageLines(s).map((x) => String(x).slice(0, 80))));
		console.log('     babelRun=' + JSON.stringify(s.SC.State.variables.babelRun ?? null));
		console.log('     玩家血=' + JSON.stringify((() => { try { const P = s.SC.setup.DND3?.Player; return { hp: P?.hp, maxHp: P?.maxHp }; } catch (x) { return '(取不到)'; } })()));
		throw e;
	}
	const M后 = 事件按钮(s);
	ok(M后.length === 0, `★面 M：择一之后事件按钮没退场（仍见 ${JSON.stringify(M后)}）`);
	ok(M遭(), '★面 M：择一之后基础遭遇也被摘掉了（第一场战斗须保留）');
	/* ★`books#133` 笔 2 的**判据连改**：L5 的宝箱奖励改为斧头（`宝箱奖励` 表）⇒ 文案随之改（✗ 仍断旧句） */
	ok(passageLines(s).some((t) => t.includes('箱底压着件趁手的东西')), '★面 M：择一之后正文没有该动作的文案（读数疑似取自旧屏）');
	ok(s.SC.State.variables.span1Events?.L5?.已用 === 'chest', `★面 M：择一没有记入本层账（已用 ${JSON.stringify(s.SC.State.variables.span1Events?.L5?.已用)}）`);
	if (JSON.stringify(M抽) === JSON.stringify(['battle', 'chest']) && M前.length === 2 && M后.length === 0 && M遭()) {
		console.log(`  面 M ✓ L5 抽中 ${JSON.stringify(M抽)} ⇒ 事件按钮 ${JSON.stringify(M前)}；择一后事件按钮 0 个、遭遇仍在 ✓`);
	}

	/* ══ 面 N（**硬判**）：工具耐久制的**工具门**（`books#133` 笔 2）══════════════
	 * 玩家可见的形＝**该层没有对应工具时，抽中的「采集」不出按钮**（✗ 点进去才被告知没工具）。
	 * 两向＝**同一读数在给工具前后必须翻面**（✗ 只断「没有」—— 那可能是按钮整体没了，与本笔无关）。
	 * ⚠ 抽签仍靠注入随机源钉死；⚠⚠ 注入次序是「**抽签两格 ⇒ 危害一格**」（`onEnter` 的次序，见 babel.js 注）。 */
	s.SC.setup.BABEL.map.moveTo('L6');                        // 真 moveTo ⇒ L6 抽签（活源）
	await playPassage(s, '探索'); await tick(250);
	/* ⚠ 清背包须**就地清**（`.length = 0`）：赋一个 Node 侧的 `[]` 会跨实测域（jsdom 窗口的 `Array`
	 *   不等于 Node 的 `Array`）⇒ SugarCube 的 `clone()` 在 `instanceof Array` 上判假而抛
	 *   「attempted to clone unsupported type: Array」（本席实测撞到）。 */
	const N包 = s.SC.State.variables.inventory;
	if (Array.isArray(N包)) N包.length = 0;                   // 手上**没有**斧头（L7 要斧）
	s.SC.setup.RPG.rng.setSequence([0, 0, 0.99]);             // L7 手算：index(3)=0 ⇒ chest；rest[gather,battle] index(2)=0 ⇒ gather；危害 miss
	await 清阶段再向上(s, /向上，去第 7 层/);   // 进 L7 ⇒ 抽签 + 危害
	s.SC.setup.RPG.rng.reset();
	const 采按钮 = (x) => choiceButtons(x).filter((t) => /^用.*采集/.test(t));
	const N账 = s.SC.State.variables.span1Events?.L7 ?? null;
	const N无 = 采按钮(s);
	ok(JSON.stringify(N账?.抽中 ?? null) === JSON.stringify(['chest', 'gather']),
		`★面 N：注入后 L7 的抽中与手算不符（手算 ['chest','gather']；实得 ${JSON.stringify(N账?.抽中)}）`);
	/* ★`books#212` 第 1 项改形（操作者裁定 00:2x）：**入口改为常出** ⇒ 本面由「没有按钮」翻成「按钮在」；
	 *   而「为什么不行」由动作说明白 ⇒ 那条链在 `verify` ㉕ 格里断（那里能就地调动作并截 `perform`）✓。 */
	ok(N无.length === 1, `★面 N：手上没有铁斧时采集按钮**应在**（入口常出 ✓）；若不在 ⇒ 「入口常出＋动作说明原因」这条契约被改回去了（实得 ${JSON.stringify(N无)}）`);
	ok(choiceButtons(s).some((t) => t.includes('箱子')), '★面 N：另一类事件按钮（箱子）也不在 ⇒ 事件面本身没起来，本面读数不成立');
	s.SC.setup.RPG.give('axe');
	await playPassage(s, '探索'); await tick(250);            // 就地重画（同一段落、同一账）
	const N有 = 采按钮(s);
	ok(N有.length === 1, `★面 N：给了铁斧之后采集按钮仍不出现（实得 ${JSON.stringify(N有)}）—— 工具门接线断了`);
	if (N有.length === 1 && N无.length === 1) console.log(`  面 N ✓ 入口常出：无斧 ⇒ 采集按钮**在**（理由由动作给）；给斧 ⇒ ${JSON.stringify(N有)}`);

	/* ══ 面 O（**硬判**）：L9 头目弧的**唯一出口**（`books#133` 笔 3）════════════════
	 * 玩家可见的形＝「选项中只有一个」：L9 的出口只出「前进」那一条（✗ 向上／向下两条都出）。
	 * 两向＝把同一读数放到**非头目层 L8** 作对照（那里两条都在）—— ✗ 只断「只有一条」
	 *   （那可能是出口整体坏了、或地图没画出来）。⚠ 本面只走 L8↔L9，L10+ 的衔接面不动。 */
	/* ⚠ 顿号别写进正则：本仓的出口文案用**全角逗号**（`向上，去第 9 层`），首版写成 `向上\u3001` ⇒ 漏读（本席实测撞到）。 */
	const 出口按钮 = (x) => choiceButtons(x).filter((t2) => /^(前进|向上|向下)|钻进光里|退回第|走进那道光/.test(t2));
	s.SC.setup.BABEL.map.moveTo('L8');
	await playPassage(s, '探索'); await tick(250);
	const O8 = 出口按钮(s);
	s.SC.setup.RPG.rng.setSequence([0.99, 0.99, 0.99]);        // L9 抽签两格 + 危害一格（皆非命中）
	s.SC.setup.BABEL.map.moveTo('L9');
	await playPassage(s, '探索'); await tick(250);
	s.SC.setup.RPG.rng.reset();
	const O9未胜 = 出口按钮(s);
	ok(O8.length === 2, `★面 O：对照层 L8 的出口不是 2 条（${JSON.stringify(O8)}）⇒ 出口面本身坏了，本面读数不成立`);
	/* ★`books#180`：头目**硬门** —— 未胜时 L9 **一条出口都不出**（旧形是「唯一的前进」；
	 *   硬门之后「只有一条」这件事本身也成了可判面：先 0 条，记 victory 后才 1 条）。 */
	ok(O9未胜.length === 0, `★面 O：未过头目时 L9 仍给出口（实得 ${JSON.stringify(O9未胜)}）—— 硬门失守`);
	const 账0 = JSON.parse(JSON.stringify(s.SC.State.variables.babelRun?.bosses ?? null));
	s.SC.State.variables.babelRun.bosses = { L9: 'victory' };
	await playPassage(s, '探索'); await tick(250);
	const O9已胜 = 出口按钮(s);
	ok(O9已胜.length === 1 && /前进/.test(O9已胜[0] ?? ''), `★面 O：已过头目后 L9 的出口不是「唯一的前进」（实得 ${JSON.stringify(O9已胜)}）`);
	/* ★`books#180` 准备区：**合法回 L8** 那条边可用 ＋ 迎战边在（拆面的两半都在页面上） */
	s.SC.setup.BABEL.map.moveTo('L9-camp');
	await playPassage(s, '探索'); await tick(250);
	const O备 = 出口按钮(s);
	ok(O备.some((t2) => /回第 8 层/.test(t2)) && O备.some((t2) => /走进那道光/.test(t2)),
		`★面 O：准备区的出口不齐（实得 ${JSON.stringify(O备)}）—— 回 L8 补给与迎战两条都要在`);
	s.SC.State.variables.babelRun.bosses = 账0 ?? {};
	if (O8.length === 2 && O9未胜.length === 0 && O9已胜.length === 1) {
		console.log(`  面 O ✓ 头目硬门：L8 对照 2 条 ${JSON.stringify(O8)}；L9 未胜 ${O9未胜.length} 条 ⇒ 已胜 1 条 ${JSON.stringify(O9已胜)}；准备区 ${JSON.stringify(O备)}`);
	}

	/* ★面 P（**硬判**）：`books#171` 的统一结算入口 ＋ `books#176` 的终端语义 —— **进层致命伤 ⇒ 终局**。
	 *   唯一变量＝**进层前的血量**（其余全不动）：同一次真点按钮、同一注入，1 血（危害命中）⇒
	 *   段落＝`游戏失败`、两钮（读档／重开）在、位置**留在 L5**、页面**无**地图出口；
	 *   满血 ⇒ 段落＝`探索`、位置 L5、地图出口在。两臂读数须翻面（✗ 只断「1 血不在探索」，
	 *   那会把「按钮压根没找到」读成通过）。 */
	{
		const B = s.SC.setup.BABEL, R = s.SC.setup.RPG, P = s.SC.setup.DND3.Player;
		/* ⚠ 失败面的两钮是 `<<link>>` **宏链**（SugarCube 不给它 `data-passage`）⇒ **不能**用姊妹件的
		 *   `storyLinks()`（它按 `[data-passage]` 取，本面会取到空表 ⇒ 判据恒假红）。改读段落内全部 `<a>`。 */
		const 链接文 = () => [...s.doc.querySelectorAll('#passages a')].map((el) => (el.textContent ?? '').trim()).filter(Boolean);
		const 进层 = async (hp) => {
			delete s.SC.State.variables.span1Events.L5;         // 该层危害每局一次 ⇒ 两臂各自可掷
			s.SC.State.variables.babelRun.终局 = false;         // 终局账也是「每臂一次」
			P.hp = hp;
			B.map.moveTo('L4');
			await playPassage(s, '探索'); await tick(300);
			R.rng.setSequence([0, 0, 0]);                       // 抽两枚 ＋ 危害 `index(6)=0` ⇒ 命中
			const 有钮 = choiceButtons(s).some((t) => /去第 5 层/.test(t));
			/* ★致命臂：进层即触发终局 ⇒ 段落**会换**（探索 → 游戏失败）；对照臂同段落就地重绘。
			 *   ⇒ `driveButton` 的 `expectNavigate` 必须**按臂给**（它缺省要求「不导航」）。 */
			if (有钮) await driveButton(s, /去第 5 层/, {
				read: (x) => choiceButtons(x).join('｜'), expectNavigate: hp === 1 ? '游戏失败' : null,
			});
			R.rng.reset();
			await tick(300);
			return {
				有钮, 段: currentPassage(s), 位: B.map.current, 钮: choiceButtons(s), 链接: 链接文(),
				战败: s.SC.State.variables.babelRun.deaths,
			};
		};
		const 血前 = s.SC.State.variables.babelRun.deaths;
		const 致命 = await 进层(1);          // 致命：1 血 ⇒ 危害命中 ⇒ 终局
		const 对照 = await 进层(P.maxHp);    // 对照：满血 ⇒ 同一按钮、同一注入
		P.hp = P.maxHp;
		const 对照臂 = 对照.有钮 === true && 对照.段 === '探索' && 对照.位 === 'L5'
			&& 对照.钮.some((t) => /去第 6 层/.test(t));
		const 关键臂 = 致命.有钮 === true && 致命.段 === '游戏失败' && 致命.位 === 'L5'
			&& 致命.链接.some((t) => /读档/.test(t)) && 致命.链接.some((t) => /重开/.test(t))
			&& !致命.钮.some((t) => /去第 6 层/.test(t)) && !致命.链接.some((t) => /去第 6 层/.test(t))
			&& 致命.战败 === 血前 + 1 && 对照.战败 === 致命.战败;
		ok(对照臂, '★面 P 两向 · 对照臂：满血进 L5，段落须仍在「探索」、位置在 L5、地图出口在（否则本面判不了）');
		ok(关键臂, '★面 P 关键回归：1 血进 L5（危害命中）⇒ 段落＝游戏失败、两钮（读档／重开）在、位置留在 L5、页面无地图出口、战败恰 +1');
		if (对照臂 && 关键臂) {
			console.log(`  面 P ✓ 进层致命伤：1 血 ⇒ 段落 ${JSON.stringify(致命.段)}、位置 ${JSON.stringify(致命.位)}、链接 ${JSON.stringify(致命.链接)}、战败 ${致命.战败}`
				+ `；满血对照 ⇒ 段落 ${JSON.stringify(对照.段)}、位置 ${JSON.stringify(对照.位)}、含「去第 6 层」${对照.钮.some((t) => /去第 6 层/.test(t))}`);
		}
	}
	/* ★面 Q（**硬判**）：战斗面两块（`books#188` P1-2 敌面板 ／ P1-4 治疗读数）在**真 DOM** 里接线。
	 *   唯一变量＝**发不发战斗事件**：
	 *     ① 反例臂：没发事件 ⇒ 两块宿主都空（✗ 若恒有内容 ⇒ 本面读的是常量，不是事件驱动）；
	 *     ② 发了（敌组带**已装备的铁环甲**）⇒ 敌面板出「幼獾／负伤／AC 13／已见：爪击」、治疗面出「绷带 恢复 5（余 2 次）」；
	 *     ③ 发 `battle:end` ⇒ 两块都清空（✗ 旧场读数留到探索段）。
	 *   ⚠ 那件铁环甲（+3 AC）是**对照件**：它让「读引擎 `acOf`」与「面板自算 `stats.ac`」**不同值** ⇒
	 *     自算版会被本面咬住（无头版见 `verify.mjs` ㊳ 的同形判据）。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3;
		const 读战斗面 = () => ({
			敌: (s.doc.querySelector('[data-panel="enemy"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
			治: (s.doc.querySelector('[data-panel="heal"]')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
		});
		const 存加成 = D.Player.stats.heal_bonus;
		const 存HP = D.Player.hp;
		/* ★加成给**非零**：否则「含不含那一项」数值相同 ⇒ 本面与无头面一样，对那一项恒真
		 *   （`dev-10` 的刀-H1：删掉加成项，全绿）。 */
		D.Player.stats.heal_bonus = 2;
		/* ★★血量须**离上限够远**（`books#200` 的两条 RC 之后）：面板的「预计恢复」现在报**实回**
		 *   （＝名义量夹到 `maxHp` 之后还剩多少）⇒ 满血时它**该**报 0 ✗ 不再是名义量。
		 *   本面判的是「事件驱动渲染」这件事 ⇒ 铺一个「缺 10 点」的伤（名义 7 不被夹）才读得到 7。 */
		D.Player.hp = D.Player.maxHp - 10;
		const 空 = 读战斗面();
		const 敌 = new (R.Character)({ name: '幼獾', hp: 4, maxHp: 6 });
		敌.items.push({ id: 'mail', equipped: true });
		const 绷带槽 = { id: 'bandage', charges: 2 };
		D.Player.items.push(绷带槽);
		R.events.emit('battle:turnEnd', { actor: D.Player, battle: { enemies: [敌], players: [D.Player] } });
		R.events.emit('item:used', { id: 'badger-claw', name: '爪击', action: 'use', actor: 敌, target: D.Player });
		R.refreshPanels();
		const 有 = 读战斗面();
		R.events.emit('battle:end', { players: [D.Player], enemies: [敌] });
		R.refreshPanels();
		const 清 = 读战斗面();
		D.Player.items.splice(D.Player.items.indexOf(绷带槽), 1);
		const 反例臂 = 空.敌 === '' && 空.治 === '';
		const 正例臂 = /幼獾/.test(有.敌) && /负伤/.test(有.敌) && /AC 13/.test(有.敌) && /已见：爪击/.test(有.敌);
		const 治疗臂 = /绷带/.test(有.治) && /恢复 7/.test(有.治) && /余 2 次/.test(有.治);
		const 清空臂 = 清.敌 === '' && 清.治 === '';
		D.Player.stats.heal_bonus = 存加成;
		D.Player.hp = 存HP;
		ok(反例臂, `★面 Q 反例臂：没发战斗事件时两块就该是空的（实得 ${JSON.stringify(空)}）—— 否则本面读到的是常量`);
		ok(正例臂, `★面 Q：敌面板没按事件渲染出「幼獾／负伤／AC 13／已见：爪击」（实得 ${JSON.stringify(有.敌)}）`);
		ok(治疗臂, `★面 Q：治疗读数没按背包渲染出「绷带 恢复 7（余 2 次）—— 件 5 ＋ 加成 2」（实得 ${JSON.stringify(有.治)}）`);
		ok(清空臂, `★面 Q：battle:end 之后两块没清空（旧场读数会留到探索段，实得 ${JSON.stringify(清)}）`);
		if (反例臂 && 正例臂 && 治疗臂 && 清空臂) {
			console.log(`  面 Q ✓ 战斗面：敌「${有.敌}」；治疗「${有.治}」；战斗结束 ⇒ 两块清空 ✓`);
		}
	}
	/* ★面 T（**硬判**，`books#200` P0）：**背包栏路径**的治疗件**对账** —— 正文说「受到了N点治疗」，
	 *   N 必须 ＝ **实际回血**；满血 ⇒ **拒绝**（不扣件、出声）。
	 *   唯一变量＝**起始血量**（三段：半血／差 1 点满／满血），点击走**真 DOM**（`[data-item]` 链接被 `click()`）
	 *   —— 即操作者 15:07 那一按的同一通道（`bindItemLinks` ⇒ `RPG.itemClick` ⇒ `used()`）。
	 *   ★为什么必须补这一面：`#188` 的「行为对账」只守了**战斗面板钮**（面 Q），**背包栏点击**当时**无对账格**
	 *     ⇒ 操作者看到的「受到了2点治疗」而体力条不动，没有任何判据拦它。
	 *   ⚠ 清背包须**就地清**（`.length = 0`）：赋一个 Node 侧的 `[]` 会跨实测域。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3, P = D.Player;
		const V = s.SC.State.variables;
		const 屏 = () => (s.doc.body.textContent ?? '').replace(/\s+/g, ' ');
		/** 屏上**最后一条**「受到了N点治疗」的 N（无则 null）—— 对账读**屏上的数**，✗ 源码字符串。 */
		const 屏上数 = () => {
			const m = [...屏().matchAll(/受到了(\d+)点治疗/g)];
			return m.length ? Number(m[m.length - 1][1]) : null;
		};
		const 件数 = (id) => V.inventory.filter((x) => x.id === id).reduce((a, x) => a + (x.charges ?? 1), 0);
		const 出声数 = () => (屏().match(/伤已无碍/g) ?? []).length;
		/** 一档：铺血量 ⇒ **点背包栏那件**（真 DOM）⇒ 读「实回／件数／屏上数／出声」。 */
		const 一档 = async (id, hp) => {
			V.inventory.length = 0;
			R.give(id);
			P.hp = hp;
			R.refreshPanels?.(['inventory', 'hp']);
			await tick(150);
			const a = [...s.doc.querySelectorAll(`[data-item="${id}"]`)].pop();
			if (!a) throw new Error(`页面上找不到 [data-item="${id}"] 链接（前置态未铺成）`);
			const 前HP = P.hp, 前件 = 件数(id), 前数 = 屏上数(), 前出声 = 出声数();
			a.click();                                    // ★唯一动作：背包栏那一按
			await tick(200);
			return {
				Δ: P.hp - 前HP, 件差: 件数(id) - 前件,
				数: 屏上数(), 新数: 屏上数() !== 前数, 出新声: 出声数() - 前出声,
			};
		};
		const 半 = await 一档('herb-poultice', P.maxHp - 3);     // 件 2 ⇒ 实回 2（未触顶）
		const 近满 = await 一档('herb-poultice', P.maxHp - 1);   // ★名义 2 被夹 ⇒ 实回 1
		const 满 = await 一档('herb-poultice', P.maxHp);         // ★满血 ⇒ 拒绝
		P.hp = P.maxHp;
		const 半臂 = 半.Δ === 2 && 半.数 === 2 && 半.件差 === -1;
		const 近满臂 = 近满.Δ === 1 && 近满.数 === 1 && 近满.新数 === true;
		const 满臂 = 满.Δ === 0 && 满.件差 === 0 && 满.出新声 >= 1 && 满.新数 === false;
		ok(半臂, `★面 T 半血臂：文案数应 ＝ 实回 2（实得 Δ=${半.Δ}／屏上数=${半.数}／件差=${半.件差}）`);
		ok(近满臂, `★面 T 差 1 点满臂：文案数应 ＝ 实回 **1**（✗ 名义 2）—— 实得 Δ=${近满.Δ}／屏上数=${近满.数}`);
		ok(满臂, `★面 T 满血臂：应**拒绝**＋不扣件＋出声（实得 Δ=${满.Δ}／件差=${满.件差}／出声 ${满.出新声} 条）`);
		/* ★**接线臂**（两条 RC 的修法①：原「同源臂」两边调**同一个函数** ⇒ 对「这个量对不对」**恒真** ✗）：
		 *   把引擎的 `D.healDelta` 换成**哨兵** ⇒ 面板渲染出来的数须**跟着变** —— 这才判得出「面板有没有**读引擎**」
		 *   （自算一份的版本对哨兵无反应）。★它只管**接线**，✗ 不当面板侧的唯一判据 ⇒ 与下面**对账臂**配对。 */
		const 有实回 = typeof D.healDelta === 'function';
		const 存实回 = D.healDelta;
		const 存加成 = P.stats.heal_bonus;
		P.stats.heal_bonus = 2;                                   // 名义量 7（✗ 实回 1／0）⇒ 两臂读数不相撞
		const 敌 = new (R.Character)({ name: '幼獾', hp: 4, maxHp: 6 });
		R.events.emit('battle:turnEnd', { actor: P, battle: { enemies: [敌], players: [P] } });
		const 铺一件 = async () => {
			V.inventory.length = 0;                               // ★只留一件 ⇒ 面板那行就是它
			P.items.push({ id: 'bandage', charges: 2 });
			R.refreshPanels();
			await tick(120);
			const 文 = (s.doc.querySelector('[data-panel="heal"]')?.textContent ?? '').replace(/\s+/g, ' ');
			return { 文, 数: Number((文.match(/恢复 (\d+)/) ?? [])[1] ?? NaN) };
		};
		let 哨兵 = null;
		if (有实回) {
			D.healDelta = () => 424242;                           // ★唯一变量：引擎那一处换成哨兵
			P.hp = P.maxHp - 1;
			哨兵 = (await 铺一件()).数;
			D.healDelta = 存实回;                                 // ★换回
		}
		const 接线臂 = 有实回 && 哨兵 === 424242;
		/* ★★**对账臂**（两条 RC 的修法②）：面板的数须 ＝ **引擎真治一次的实回**（`verify.mjs` ⑤′ 自写的规则）。
		 *   在**两个夹取态**各判一次 —— ⑤′／㊳ 的夹具血量离上限够远 ⇒ 名义量 ＝ 实回 ⇒ 面板报名义量也**恰好躲过** ✗。 */
		const 一档面板 = async (前血) => {
			P.hp = 前血;
			const 数 = (await 铺一件()).数;
			const 前 = P.hp;
			R.itemClick('bandage');                               // ★引擎**真治一次**（期望取自**行为**，✗ 第二份算式）
			const 该回 = P.hp - 前;
			V.inventory.length = 0;
			return { 数, 该回 };
		};
		const 夹取 = await 一档面板(P.maxHp - 1);                // 名义 7 ⇒ **实回 1**
		const 满血 = await 一档面板(P.maxHp);                    // 名义 7 ⇒ **实回 0**（引擎会拒绝）
		R.events.emit('battle:end', { players: [P], enemies: [敌] });
		R.refreshPanels();
		P.stats.heal_bonus = 存加成;
		V.inventory.length = 0;
		const 夹取臂 = 夹取.数 === 夹取.该回 && 夹取.该回 === 1;
		const 满血面板臂 = 满血.数 === 满血.该回 && 满血.该回 === 0;
		ok(接线臂, `★面 T 接线臂：把引擎 \`D.healDelta\` 换成哨兵 ⇒ 面板须跟着变（自算一份者不会）`
			+ `—— 实得 哨兵态面板数 ${哨兵}（应 424242；接口在场 ${有实回}）`);
		ok(夹取臂, `★面 T 对账臂·差 1 点满：面板数应 ＝ 引擎**实回 1**（✗ 名义 7）`
			+ `—— 实得 面板 ${夹取.数}／引擎实回 ${夹取.该回}`);
		ok(满血面板臂, `★面 T 对账臂·满血：面板数应 ＝ 引擎**实回 0**（✗ 名义 7 —— 那是拿不到的数）`
			+ `—— 实得 面板 ${满血.数}／引擎实回 ${满血.该回}`);
		if (半臂 && 近满臂 && 满臂 && 接线臂 && 夹取臂 && 满血面板臂) {
			console.log(`  面 T ✓ 背包栏治疗件对账：半血 Δ=${半.Δ}／屏上数=${半.数}；差 1 点满 Δ=${近满.Δ}／屏上数=${近满.数}`
				+ `；满血 ⇒ 拒绝 ＋ 不扣件 ＋ 出声；面板接线（哨兵 ${哨兵}）＋ 对账（夹取态 ${夹取.数}、满血态 ${满血.数}）✓`);
		}
	}
	/* ══ 战斗格（`sgstory#1950` · `books#222` 族）：**`quick:use` 派发三臂** ══
	 * 症状（今天的 heal／盾两案）都在路上：「**选项 → 靶解析 → `RPG.act`**」——引擎若把**动作类**
	 *   （治疗／伤害）传漏，治疗件的唯一合法靶（己方）会被窄成敌方 ⇒ 拒 ⇒ 回合白过。
	 *   ★驱动在 `战斗三臂驱动()`（✗ 不在此处内联 ⇒ 三把刀才改得动一处 ✓）。 */
	{
		const s = await boot(env);
		await playPassage(s, '探索'); await tick(250);
		const { 动作录, 我方 } = await 战斗三臂驱动(s);
		const 治行 = 我方.filter((x) => /bandage/.test(x.件));
		const 盾行 = 我方.filter((x) => /shield/.test(x.件));
		const 攻行 = 我方.filter((x) => x.靶掉血 > 0);
		const 治涨 = 治行.filter((x) => x.自己掉血 < 0);
		const 盾拒 = 盾行.filter((x) => /rejected\/action-refused/.test(x.结果));
		ok(治行.length > 0 && 治涨.length > 0,
			`★战斗格①臂（sgstory#1950）：治疗件经「选项→靶解析→act」须真落地（血↑）—— 实得 ${JSON.stringify(治行)}`);
		ok(盾行.length > 0 && 盾拒.length === 盾行.length,
			`★战斗格②臂：用防具须「结构化拒绝」（rejected/action-refused，✗ 裸抛）—— 实得 ${JSON.stringify(盾行)}`);
		ok(攻行.length > 0,
			`★战斗格③臂（正控）：**己方**一次成功攻击须使靶掉血（✗ 则本格是空面）—— 我方实得 ${JSON.stringify(我方)}`);
		console.log(`  战斗格 ✓ 我方动作 ${我方.length}／全部 ${动作录.length}｜①治疗 ${治行.length}（血涨 ${治涨.length}）`
			+ `｜②盾 ${盾行.length}（拒 ${盾拒.length}）｜③己方致伤 ${攻行.length}`);
		s.dom.window.close();
	}
	s.dom.window.close();
}
console.log('');
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length === 0 ? '✓ e2e 驾驶层通过' : `✗ e2e 驾驶层失败 ${fails.length} 条`);
process.exit(fails.length === 0 ? 0 : 1);
}   // ← cli 块结束（★守卫：import 时上面整段不执行）
