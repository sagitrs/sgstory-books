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
 *   **N 工具门**：**硬判**（`books#133` 笔 2，**同笔追平 `#212`〔入口常出〕与 `#280` ②-1〔采集是战后动作〕**）。
 *     本层**已战之后**：无对应工具 ⇒ 采集入口**在**（`when()` 真 ✓）且点它**不消费事件**（理由由动作给）；
 *     给上工具 ⇒ 仍可选。★两向仍**可辨**（差在「消费没消费」✓）。
 *   **M L5 选择制事件面**：**硬判**（`books#133` 笔 1）。抽二择一：抽中的两类出现为**按钮**、
 *     未抽中的类**不**出现、择一后两个事件按钮**一起退场**（而基础遭遇仍在）。
 *     ⚠ 本面靠**注入随机源**把抽签钉死（✗ 靠「看起来随机」）⇒ 读数确定。
 *   **P 进层致命伤 ⇒ 终局**：**硬判**（`books#171`＋`books#176` 的裁定②：死亡＝游戏失败、**不复活**）。
 *     危害命中且致命时，段落须＝`游戏失败`（读档／重开两钮）、位置**留在死亡层**、页面**不留**原层出口
 *     （而不是「0 血还能接着走」）；满血对照臂保证本面判得了。
 *   **S 自环就地重绘·面板跟随**：**明账**（属 `sagitrs/sgstory#1859` ⇒ 修 `#1864`，**未合**）。`--require self-loop` 升硬判。
 *   **I 故事页点道具不穿 DOM**：**明账**（属 `sagitrs/sgstory#1857` ⇒ 修 `#1866`，**未合**）。`--require item-click` 升硬判。
 *   **②-1 到达停**：**硬判**（`books#340`＝`books#280` ②-1）。进层后首屏**须先出**「（到达）…」那一拍，
 *     且它须**排首位**；点过后该层选项面须出现。
 *     ★**半格记明账**：「选项面**是否被那一拍挡住**」本格**不判** —— 实测两者**同时在页上**
 *     （`#passages` 里**两个** `.choice-box`），而「挡不挡」是**布局**问题，★无头装置（jsdom）**没有布局**。
 *     归属：①产品侧 `world/babel.js` 的 `onEnter`（设计文写「模态即刻替换该刻选项」vs 实测是**多一个 box**）
 *     ②T 面真浏览器臂（拿得到布局）。★每次运行都印（✗ 不静默 —— `#300` ⑧ 同族）。
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

/** ★★`#342` 追平（②-2 遭停）·**第三把取法**：「段内链」 —— `#passages` 里的 `<a>`，**✗ 不是 `.choice-box button`**。
 *   ★本件原有两把取法（`choiceButtons` 读 `.choice-box button` ／ `storyLinks` 读 `[data-passage]`）
 *   ★**都取不到** `<<link "迎战">>`：SugarCube 把它落成 `<a class="link-internal macro-link">`
 *     —— **无 `data-passage`、不在 `.choice-box`**（本席实测：到达 `遭遇战` 段落时 `.choice-box` 数 ＝ **0**）✓
 *   ⚠ 点了它**未必换段落**（「迎战」是就地跑 `fight()`，收尾由 `choice` 画在页底）
 *     ⇒ ★本函数**不断导航**（该不该换段落由调用方按那处的语义判）。
 *   ⚠ 与 `driveButton` 同取向：**找不到就抛** —— ✗ 不静默返回（那会把「没点到」与「点了」同形）。 */
export function 点段内链(session, re) {
	const 列 = [...session.doc.querySelectorAll('#passages a')].filter((a) => re.test((a.textContent ?? '').trim()));
	if (列.length === 0) {
		throw new Error(`段内点不到 ${re}；#passages a 现有 = `
			+ JSON.stringify([...session.doc.querySelectorAll('#passages a')].map((a) => (a.textContent ?? '').trim())));
	}
	列[0].click();
	return (列[0].textContent ?? '').trim();
}

/** ★★`#342` 追平（②-1 到达停）：进层后**首屏第一项**是「（到达）第 N 层 · … —— 继续」
 *   （★它**在 `.choice-box` 里** ✓ —— 与「迎战」不同，那一条是本席实测分清的）
 *   ★它**只在首进该层**出现（`babel.js` 的幂等账 `$babelRun.到达停[层]`）⇒
 *   ★**凡「进层后要读该层选项面」的路径都必须先点掉它**，✗ 否则模态压在选项面之上 ⇒ 后续各靶全落空
 *   （本席实测：`--selftest` 的正例臂、面 L 刀、`清阶段再向上` 都栽在这一拍）。
 *   @returns 点掉了 ⇒ `true`；本层已停过（或不在该拍）⇒ `false` */
export async function 清到达拍(session) {
	const 列 = [...session.doc.querySelectorAll('.choice-box button')].filter((b) => /^（到达）/.test(b.textContent ?? ''));
	if (列.length === 0) return false;
	列[0].click();
	await tick(220);
	return true;
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
	/* ★★未覆盖面**进三栏**（`#342` developer 记④）—— 每次运行都印，✗ 不静默。
	 *   ★理由与「明账面每次打印」同族（`#300` ⑧：「非空≠存在」）——**✗ 让「本档没跑这一面」与「跑过且没红」同形**。
	 *   ★三栏＝【面 ／ 本档为何不判 ／ 谁覆盖】。**列的是「✗ 不属本档判据面」的面**，
	 *     既不是「没做」（邻件在做）也不是「不判」（明账面那两条）。
	 *   ★**一处源**（✗ 不写两份）：`--list` 与正常跑都调 `未覆盖三栏()`。 */
	未覆盖三栏();
	console.log('  原语：passageLines／choiceButtons／driveButton／saveAt／loadAt／setStateVars／panelText');
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
/* ★★`#342` 追平（★又一处**休眠符号**，与 `读数` 同族）：`S(…)`（把一组读数**逐字印出来**用的短形）
 *   在 ②-1 的到达停那一节里用了**三处**，而★**从未声明** ✗ —— 同样因为那一节**从来没跑到过** ✓。 */
const S = (x) => JSON.stringify(x);
/** ★★`#342`（**developer 拒票实证的崩点**）：本局账里的「已战」表 —— **只用来印读数**（✗ 不判）。
 *   ★它先前被写成 `清阶段再向上` 体里的一个 **`const` 局部**（✗ 那里压根没人用），
 *   而**主驱动**（`else` 支，第 ~1069 行）跨域引用它 ⇒ ★`ReferenceError: 读已战 is not defined`。
 *   ★★为何此前没被抳到（★本笔的教训）：本档是 **`if (--selftest) { …刀… } else { …主驱动… }`**
 *     —— ★**两条互斥的路**⇒ `--selftest` **根本不会走到主驱动** ⇒ 拿「`--selftest` 绿」当验收
 *     就是「**绿而那一行未被判过**」。⇒ ★验收口径按领队更正：**装置跑完（零崩）＋ 两跑同读数**（即**主驱动**那条路）。 */
const 读已战 = (s) => { try { return JSON.stringify(s.SC.State.variables.babelRun?.已战 ?? null); } catch (e) { return '(取不到)'; } };

/** ★★`#342` developer 记④：本档**未覆盖**的面，按**三栏**形印出来（【面 ／ 本档为何不判 ／ 谁覆盖】）。
 *   ★为何要印：与「明账面每次打印」同族（`#300` ⑧：「非空≠存在」）——
 *     ✗ 让「**本档没跑这一面**」与「**跑过且没红**」同形（读者看不见未覆盖面就会把它读成「过了」）。
 *   ★列的只是「**✗ 不属本档判据面**」的面 —— 既不是「没做」（邻件在做），也不是「不判」（明账面那两条）。
 *   ★两处调用（`--list` 与正常跑）共用本体 ⇒ **一处源**（✗ 不写两份 ⇒ 不会漂）。 */
function 未覆盖三栏() {
	console.log('');
	console.log('  ── 本档**未覆盖**的面（三栏：面 ／ 本档为何不判 ／ 谁覆盖）—— ✗ 不属本档判据面，✗ 不等于「没做」:');
	for (const [面, 为何, 谁] of [
		['②-2 遭遇停（停屏形）', '本档**路过**它（点「迎战」推进真战斗），✗ 不判它停不停', 'tools/e2e-280-encounter-stop.mjs'],
		['②-4 奖励结算停确认', '本档战斗收场走既有路，✗ 不判「未确认不进探索」', 'tools/e2e-280-playtest.mjs 臂⑦'],
		['⑧ 战中页脚可点件／⑮ 页脚·侧栏横向', '需**真实布局与视口**（本档无头 jsdom，**没有布局**）', 'tools/e2e-280-battle-bag.mjs｜e2e-280-narrow-sticky.mjs'],
		['⑫ 存档栏位可用性', '需真浏览器**事件相位**（克隆／捕获），✗ 在 jsdom 上证不了', 'tools/e2e-280-save-delete.mjs'],
		['⑬ 开局难度（挡路者减半／玩家血×2）', '属**开局面**；本档从「战斗教学」进 L1 **之后**起手', 'stories/babel/verify.mjs 格 59 ＋ 真机探针'],
		['⑭ kills／首战门（「主线可通关」）', '本档战斗格只看**菜单与动作**，✗ 不读 `kills`', 'tools/e2e-280-kills-easy.mjs'],
		['素材／包面（SVG、pack 声明）', '**构建期**面，✗ 驾驶层的对象', 'tests/build/story_assets_test.py（引擎）｜tools/check-content-inventory.mjs'],
	]) console.log(`    · ${面}｜${为何}｜**${谁}**`);
}

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
	/* ★★★★②-1 追平（`#342`）：进层后**首屏第一项**就是**到达停**那一拍 ——
	 *   实测 `playPassage(探索)` 后 `.choice-box` ＝
	 *   `["（到达）第 1 层 · 苏醒之地 —— 继续","拾起地上的长剑","遭遇（往上走之前，先看有什么挡路）"]`
	 *   ⇒ ★先点掉它（幂等账 ⇒ 每层只此一次）✓ ✗ 不点 ⇒ 模态压在选项面之上。 */
	await 清到达拍(s);
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
	/* ★★★★②-2 追平（`#342`，本席**实测定案**）：`:: 遭遇战` 的两条入口（「迎战」／「查看」）是 `<<link>>`
	 *   ⇒ ★落成 `#passages` 里的 `<a class="link-internal macro-link">`，**✗ 不是 `.choice-box button`**
	 *     （实测：到达 `遭遇战` 段落时 `.choice-box` 数 ＝ **0**、`choiceButtons` ＝ `[]`）。
	 *   ★本席上一版用 `choiceButtons` 找「迎战」⇒ **恒找不到** ⇒ 停在遭停 ⇒ 战斗菜单恒空（实测 `菜单=[]`）
	 *     ⇒ ★**整条驱动从这里塌掉**（`清阶段再向上` 随后崩在 `可点=[]` —— 与现 main 同形）。
	 *   ★修法＝①点**段内链**「迎战」②`fight()` 就地跑、收尾把菜单画进 `.choice-box`
	 *     ⇒ ★**有界轮询等它**：✗ 不等就会读到空菜单，而空菜单曾被**误报**成「只有空手／跳过（无武器项）」
	 *     （★「读数缺席」与「读数到位」同形 ⇒ 本席同笔把报文分开写 ✓）。 */
	{
		const 停形 = /^(迎战|开打|拔剑|迎上去)$/;
		const 段内 = [...s.doc.querySelectorAll('#passages a')].filter((a) => 停形.test((a.textContent ?? '').trim()));
		const 盒内 = [...s.doc.querySelectorAll('.choice-box button')].filter((b) => /迎战|开打|拔剑|迎上去/.test(b.textContent ?? ''));
		if (段内.length > 0) {
			点段内链(s, 停形);                       // ★②-2 的现形：段内链（不换段落）
		} else if (盒内.length > 0) {
			await driveButton(s, 停形, { read: () => choiceButtons(s).join('|') });  // 若将来挪进 choice 面
		}
		if (段内.length > 0 || 盒内.length > 0) {
			for (let i = 0; i < 25; i += 1) { if (choiceButtons(s).length > 0) break; await tick(120); }
			if (choiceButtons(s).length === 0) {
				console.log('  ⏳【遭停·记声明】点了「迎战」但战斗菜单在 25×120ms 内仍未出现 ⇒ 本跑打不赢、阶段清不掉；'
					+ '★据以判定的事实：段落=' + JSON.stringify(currentPassage(s)) + '｜可点=[]');
			}
		}
	}
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
	/* ★②-1：战斗收尾若把页面带回该层，可能又落在**到达拍**上（回到 `探索` 时首屏是它）
	 *   ⇒ 本场收尾也清一次（✗ 否则调用方紧接着读该层选项面会落空）。 */
	await 清到达拍(s);
	return true;
};

	/* ★★★★领队给形（真随机 ＋ 死亡重试环）。
	 *   ★【快存】⇒ 打 ⇒ ★若「游戏失败」则【读回】重打，≤ 五次，★胜即续。
	 *   ★**统计必胜**（✗ 改产品态：✗ 改难度 ✗ 改骰子 ✗ 改血）——
	 *     本档判的是**门／采集／箱子面**，✗ 不判战斗难度；打不赢只是「这一局不利」。
	 *   ★**每打一次都先快存** ⇒ 读回后上一局的任何副作用（伤／耗材）一并消除 ✓。
	 *   ★本席实测：不重试时走到 L5 会直接「游戏失败」（`hp:0`）✗。 */
	/** ★★★上行门是**两层**：`when: 本层已战(a) && 事件阶段已了(a)`（`babel.js:976`）。
 *   ★**真打一场只给前半** ✗ ⇒ 门闭 ⇒ **出口为空** ✗。
 *   ★故打完还要**点一次事件了结**（最简：「不理会这层的动静，继续向上」＝**已跳过** ✓）⇒ 两半齐 ⇒ 出口现 ✓。
 *   ★（本席实测：只真打、不了结 ⇒ 出口恒 `[]` ✗） */
const 清事件阶段 = async (s) => {
	const 形 = /不理会|了结|不采了|全部收拾|^向上/;
	for (let i = 0; i < 6; i += 1) {
		const t = choiceButtons(s).find((x) => /不理会这层的动静|不采了，继续向上/.test(x));
		if (!t) break;
		try { await driveButton(s, /不理会这层的动静|不采了，继续向上/, { read: () => choiceButtons(s).join('|') }); } catch (e) { break; }
		await tick(150);
	}
};/* ★★★★**领队裁：统一前置**（本席实测：不统一 ⇒ 读数会翻 ✗）。
 *   ★**每一个 `moveTo(X)` 之后，先跑同一套前置再读该层**：
 *     ① `稳打一场`（★带披露式夹具 ✓ —— ★✗ `真打一场`：那个无夹具 ⇒ 会被打死 ✗）
 *     ② `清事件阶段`（点一次事件了结 ⇒ `事件阶段已了` ✓）
 *   ★两半齐 ⇒ 上行门开 ⇒ 出口现 ✓（门：`babel.js:976` `本层已战(a) && 事件阶段已了(a)`）。
 *   ★**抽签敏感的层要先注入再进**（★否则每跑走的路不同 ✗）。 */
const 进层读 = async (s, 层) => {
	try { s.SC.setup.BABEL.map.moveTo(层); } catch (e) { /* ✗ 吞 */ }
	await playPassage(s, '探索'); await tick(250);
	await 稳打一场(s);
	await 清事件阶段(s);
	await tick(250);
};

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
			/* ★★②-4（`#343`，2026-10-05 实测崩点）：战斗胜利支的**尾**有「收下」确认门
			 *   （`encounters.js`：`if (interactive) await DND3.Player.choice([{ text: '收下', … }])`）
			 *   ⇒ 旧形在此直接返回 ⇒ 调用方（`清阶段再向上`）接着找「向上」时**被门挡死**
			 *     （实测：`当前可点 = ["收下"]` ⇒ 抛「找不到匹配 /向上，去第 2 层/ 的按钮」✗）。
			 *   ⇒ **一处修**：凡门在，先点掉它（全体调用者受益 ✓）。 */
			/* ★★②-4／②-2（`#343`／`#340`，2026-10-05 实测崩点）：战斗收尾有**两道门** ——
			 *   ①「**收下**」＝胜利结算屏的确认门（`encounters.js`：`if (interactive) await DND3.Player.choice([{ text: '收下', … }])`）；
			 *   ②「**继续探索**」＝`exit()` 的出口门（`choice([{ text: '继续探索', value: '探索' }]).then(v => Engine.play(v))`）。
			 *   ⇒ 旧形在此直接返回 ⇒ 调用方（`清阶段再向上`）接着找「向上」时**被门挡死** ✗
			 *     （实测两次：先 `当前可点 = ["收下"]`，补点后又 `= ["继续探索"]`）。
			 *   ⇒ **一处修**：把「单钮门」按序点掉（★只点这两条具名文案，✗ 不泛化点掉任意单钮
			 *     —— 要防误点「（到达）…」这类**由调用方负责**的门 ✓）。 */
			for (let 门 = 0; 门 < 4; 门 += 1) {
				const 可 = choiceButtons(s);
				const 收下 = 可.find((t) => /^收下$/.test(t));
				const 继续 = 可.find((t) => /^继续探索$/.test(t));
				if (收下) { await driveButton(s, /^收下$/, { read: () => choiceButtons(s).join('|') }); continue; }
				if (继续) { await driveButton(s, /^继续探索$/, { read: choiceButtons, expectNavigate: '探索' }); continue; }
				break;
			}
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

/** ★★`#342` 追平：**把会话挪到确定的层**（✗ 不靠「上一节走到哪」—— 本席实测：各臂之间存在
 *   **层耦合**：②-1 那一节把会话带到 L3 ⇒ 面 L 那节要的「向上，去第 2 层」就不在页面上了 ⇒ 抛）。
 *   ★同「统一前置」的道理：**想让读数稳，先把「路」钉死**（✗ 「多跑几次取多数」）。 */
const 定位到层 = async (s, 层) => {
	try { s.SC.setup.BABEL.map.moveTo(层); } catch (e) { /* ✗ 吞 */ }
	await playPassage(s, '探索'); await tick(250);
};

/** ★★`#342`：**重臂某层的「到达停」账** —— ②-1 的到达拍是**幂等**的（账住 `$babelRun.到达停[层]`），
 *   一旦停过就不再出现 ⇒ ★要判它就必须**先把那一层的账删掉**
 *   （★声明的置态，✗ 不是绕过判定 —— 本档对着的仍然是 `onEnter` 里那条真实现）。 */
const 重臂到达停 = (s, 层) => {
	try { const r = (s.SC.State.variables.babelRun ??= {}); if (r.到达停) delete r.到达停[层]; } catch (e) { /* ✗ 吞 */ }
};

const 清阶段再向上 = async (s, re, 上限 = 6, { 留到达拍 = false, 至层 = null, 不打到达层 = false } = {}) => {
	/* ★`#342`：**先把位置钉死**（✗ 不靠上一节）—— 本席实测：不钉 ⇒ 各臂耦合（见 `定位到层`）。 */
	if (至层) await 定位到层(s, 至层);
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
	/* ★★`#342` 追平：跳完层后**读数改看「段落 ＋ 当前层」**（✗ 不用 `lines`）。
	 *   ★本席实测：`lines`（正文字行数）在 L6→L7 这种**就地重绘**上可能**恰好不变**
	 *   ⇒ `driveButton` 报「读数未变」并**把整条驱动扯下来** ✗（而那个点击其实生效了）。
	 *   ⚠ 而这个看似无关的读数选择**曾被另一个因子掩盖**：带「预知门」时那个模态会多一个盒
	 *   ⇒ 行数顺带变了 ⇒ 旧读数“看着能用”。★拿掉门以后才现原形（同一族：**读数的选择也是承重的**）。 */
	await driveButton(s, re, { read: (x) => `${currentPassage(x)}｜${(() => { try { return x.SC.setup.BABEL.map.current; } catch (e) { return '?'; } })()}` });
	/* ★`留到达拍`：调用方要**自己判那一拍**（②-1 的臂）⇒ 此处 ✗ 不代它点掉。 */
	if (!留到达拍 && choiceButtons(s).some((t) => /^（到达）/.test(t))) {
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
	/* ★★`#342` 追平：**这一段也必须受 `留到达拍` 管** —— ★本席实测：不管的话，
	 *   ②-1 那一臂刚把到达拍摆上桌，就会被这里的 `稳打一场`（→ `真打一场` → `清到达拍`）
	 *   连拍带战一并消掉 ⇒ ★臂看到的“首屏”是**打完之后的**选项面 ⇒ ★断言必红
	 *   （实测首屏 ＝ `["采集（枯倒的木料｜一次采净 3 件）","不采了，继续向上"]`、`有拍:false`）。 */
	/* ★★`#342`（**领队半裁 2026-10-05**）：「未战层」与「已战层」是**两件事** ——
	 *   已战层上「基础遭遇」闭**＝防刷语义**（✗ 产品冲突）；★要判「基础遭遇仍在（裁 ②B）」的臂
	 *   必须**停在未战层上读**，✗ 不能被本函数尾段那一场「真打」先把层打成已战。
	 *   ⇒ 新增 `不打到达层`（面 M 那臂用）。★与 `留到达拍` **同族但不同因**：
	 *     前者只因「尾段这一场」而存在；后者同时还要保住那一拍（②-1 的臂用）。 */
	if (!留到达拍 && !不打到达层 && choiceButtons(s).some((t) => /基础遭遇|遭遇（往上走之前/.test(t))) {
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
	/* ★★`#342` 追平：**这一段测的是「装置」，✗ 不是故事** ⇒ ★改用**合成** `.choice-box` 当夹具
	 *   （✗ 不再拿**产品入口文案**当夹具）。★理由是本笔的**实测教训**：原来用 `翻找|采集|找采集点`
	 *   当夹具 ⇒ ★`#338`（②-1 到达停）与 `#340`（②-2 遭停）一进 main，**产品首屏变了** ⇒
	 *   ★**装置自检自己变红** ✗ —— 而它要证的（`driveButton` 判得了）其实没坏。
	 *   ★故：**夹具与产品解耦**；★产品面那几拍改由**本档主驱动**真点
	 *   （到达拍 ／ 遭停「迎战」／ 战斗菜单 —— 本笔追平的那两笔正在那里）✓。
	 *   ⚠ **另开一个会话**（✗ 不污染主会话 —— 本文件早已记过「刀之间共享会话 ⇒ 次序即依赖」）。 */
	let pos = null, neg = null;
	{
		const sX = await boot(env);
		const 盒 = sX.doc.createElement('div');
		盒.className = 'choice-box';
		const 真钮 = sX.doc.createElement('button');
		真钮.textContent = '装置自检-真按钮';
		let 计数 = 0;
		真钮.addEventListener('click', () => { 计数 += 1; });
		盒.appendChild(真钮);
		sX.doc.querySelector('#passages').appendChild(盒);
		const 读数 = () => 计数;
		try { await driveButton(sX, /装置自检-真按钮/, { read: 读数 }); pos = 'ok'; } catch (e) { pos = e.message; }
		try { await driveButton(sX, /绝不存在的按钮-xyz/, { read: 读数 }); neg = 'ok'; } catch (e) { neg = e.message; }
		F('★两臂可分辨 · 正例臂：真按钮 ⇒ **不抛**（若抛，本夹具前提不成立）', pos === 'ok');
		F('★两臂可分辨 · 反例臂：不存在的按钮 ⇒ **抛**（✗ 静默返回空）', /找不到匹配/.test(neg ?? ''));
		/* 唯一变量：只把读数函数换成**恒值** ⇒ 必须因「读数未变」而抛。 */
		let constv = null;
		try { await driveButton(sX, /装置自检-真按钮/, { read: () => '恒定' }); } catch (e) { constv = e.message; }
		F('★唯一变量：只换读数函数为**恒值** ⇒ 必抛「读数未变」（证明两向断言承重，✗ 是摆设）', /未变/.test(constv ?? ''));
		/* 唯一变量二：期望导航但按钮不导航 ⇒ 必抛（反向错用也要被抓）。 */
		let wrongNav = null;
		try { await driveButton(sX, /装置自检-真按钮/, { read: 读数, expectNavigate: '绝不存在的段-xyz' }); } catch (e) { wrongNav = e.message; }
		F('★唯一变量二：只改 `expectNavigate` 为错值 ⇒ 必抛「期望导航到…」（✗ 静默放过）', /期望导航到/.test(wrongNav ?? ''));
		/* ★★★**第二把新取法的刀**（本笔追平 ②-2 时现加）：`点段内链` 也必须**红得了** ——
		 *   ✗ 否则「段内取法」就只是**装饰**（「实现了却没判据」同族）。 */
		let 段内负 = null, 段内正 = null;
		try { 点段内链(sX, /绝不存在的段内链-xyz/); 段内负 = 'ok'; } catch (e) { 段内负 = e.message; }
		const 段钮 = sX.doc.createElement('a');
		段钮.textContent = '装置自检-段内链';
		sX.doc.querySelector('#passages').appendChild(段钮);
		try { const t2 = 点段内链(sX, /装置自检-段内链/); 段内正 = (t2 === '装置自检-段内链') ? 'ok' : `文案=${t2}`; } catch (e) { 段内正 = e.message; }
		F('★`点段内链` 反例臂：不存在的段内链 ⇒ **抛**（✗ 静默返回）', /段内点不到/.test(段内负 ?? ''));
		F('★`点段内链` 正例臂：真段内链 ⇒ **点中并返回其文案**（②-2 遭停就靠这把取法）', 段内正 === 'ok');
	}
	let missPanel = null;
	try { panelText(s, '不存在面板-xyz'); } catch (e) { missPanel = e.message; }
	F('缺面板 ⇒ **抛**（✗ 返回空串 —— 那会把「面板没了」读成「面板是空的」）', /面板宿主缺失/.test(missPanel ?? ''));

	/* ★★`#342` 追平（★**休眠 bug 现场**）：本档的「读数收集对象」**从来没被声明过** ——
	 *   本笔之前的版本（＝现 main）里，下面四处 `读数.臂拍_到达停 = …` **都指着空气** ✗。
	 *   ★为何此前看不见：本档在那之前**就崩了**（②-1／②-2 未追平 ⇒ `清阶段再向上` 抛）
	 *     ⇒ ★**那一段是死代码** ⇒ ★★这正是「**休眠 bug —— 一直写着，但没有任何驱动走到过**」的又一例
	 *     （★本席在 `world/babel.js` 的「不预知」`value: null` 上刚吃过同一个形）。
	 *   ★故本笔**补声明**，并★**在收尾把它印出来**（收了不印与没收同形 ✓）。 */
	const 读数 = {};

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
		/* ★★`#342` 追平：**本臂自持前置**（✗ 不靠上一节走到哪一层）——
		 *   ① 回到 L1、把 L1 的阶段清掉（门开）② **重臂 L2 的到达停账**
		 *   ③ 点「向上，去第 2 层」⇒ ★**留到达拍**（✗ 不以代它点）④ 断「首屏先出那一拍」
		 *   ⑤ 点掉它 ⇒ 断「选项面出现」。
		 *   ★本笔之前那一版靠**自然的层推进**（“上一节走到 L2，本节再上一层层”）⇒
		 *     ★实测在追平 ②-1 后就不成立了（会话已到 L3）⇒ 压根走不到断言（**休眠**）。 */
		await 定位到层(s, 'L1');
		await 稳打一场(s); await 清事件阶段(s); await tick(250);
		重臂到达停(s, 'L2');
		await 清阶段再向上(s, /向上，去第 2 层/, 6, { 留到达拍: true });
		const 首屏 = choiceButtons(s);
		const 有拍 = 首屏.some((t) => /^（到达）/.test(t));
		const 选项面 = 首屏.filter((t) => /采集|遭遇|拾起/.test(t));
		读数.臂拍_到达停 = { 首屏, 有拍, 选项面 };
		ok(有拍, `★【②-1 到达停】进层后首屏**须先出「（到达）…」那一拍**（首屏实得 ${S(首屏)}）`);
		/* ★★★★`#342` 追平（**本席实测改口径**）：原写法是「未点那一拍前，该层**正常选项面不得出现**」
		 *   ⇒ ★实测定：**两者同时**在页上（`#passages` 里**两个** `.choice-box`：一个装「（到达）…」、
		 *     一个装地图/层选项）—— ★即：**拍多了一个盒，✗ 没有把选项面挡住**。
		 *   ★而「有没有挡住」是**布局**问题（那个盒是否 `fixed` 遮住下面）⇒ ★**无头装置没有布局**（jsdom）
		 *     ⇒ ★**本格判不了这一半** ⇒ ★按本舰队口径**记明账**（✗ 不判红 ✗ 判绿）＋ 把事实印出来：
		 *     ★待两处定：①产品侧（`world/babel.js` 的 `onEnter`：设计文写「模态即刻替换该刻选项」
		 *       而实测是**多一个 box**）②T 面**真浏览器臂**（拿得到布局）。
		 *   ★能判的那半保留为硬判：**拍须排首位**（✗ 排在选项面之后 ⇒ 玩家先看到选项）。 */
		ok(首屏.length > 0 && /^（到达）/.test(首屏[0]),
			`★【②-1 到达停】那一拍须**排在首屏第一位**（✗ 排在选项面/看不到）—— 首屏实得 ${S(首屏)}`);
		读数.臂拍_明账 = {
			跳: '「选项面是否被挡住」⇒ 本格不判（无头无布局 ⇒ 判不了）',
			事实: `首屏里选项面与拍**同时**在：拍=${S(首屏.filter((t) => /^（到达）/.test(t)))}｜选项面=${S(选项面)}`,
			归属: '①产品侧 `world/babel.js` onEnter（设计文「模态即刻替换该刻选项」vs 实测多一个 box）②T 面真浏览器臂',
		};
		console.log('  ⏳【②-1 到达停·记明账】「选项面是否被拍挡住」本格**不判**（jsdom 无布局）——'
			+ `事实：拍与选项面**同时**在页上（选项面 ${S(选项面)}）`);
		if (有拍) {
			/* ★②-1 的**第二半**：点过之后选项面**才**出现（两向 —— ✗ 只判「有拍」）。 */
			await driveButton(s, /^（到达）/, { read: () => choiceButtons(s).join('|') });
			const 点后 = choiceButtons(s);
			读数.臂拍_点后 = 点后;
			ok(点后.some((t) => /采集|遭遇|拾起/.test(t)),
				`★【②-1】点过到达拍后，该层选项面**须出现**（实得 ${S(点后)}）`);
		}
		console.log('  ②-1 到达停·读数 = ' + JSON.stringify(读数));
	}

	let L正 = null, L反 = null, L回滚 = null, L处理器数 = null;
	{
		await 清阶段再向上(s, /向上，去第 2 层/, 6, { 至层: 'L1' });      // ★`#342`：先钉位置（✗ 不靠上一节）
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
	let N无工具 = null, N有工具 = null , N无消费 = null, N采when = null;
	{
		const B = s.SC.setup.BABEL, R = s.SC.setup.RPG;
		const 包 = s.SC.State.variables.inventory;
		if (Array.isArray(包)) 包.length = 0;
		delete s.SC.State.variables.span1Events.L7;
		/* ★★★★★★**根因（本席读源码定）**：`drawTwo`（`babel.js:137-149`）**消耗的随机单元数随「预知」而变** ✗ ——
		 *   ★有 `必含`（＝预报账里被钉的那一类）⇒ **只耗 1 枚**；无 ⇒ **耗 2 枚**。
		 *   ★而 `必含` 来自 `span1Foresee['L7']`，它是 **L6 的「预知门」模态**答完写下的 ✗
		 *   ⇒ ★**模态答什么、有没有答，决定了往下各层的消耗位数** ⇒ ★**这就是「吃掉位数不固定」的真身** ✗✗
		 *   （★本席实测：两跑分别得 `["battle","gather"]`／`["chest","battle"]` —— ★**两跑都是「必含占首位」的形** ✓）。
		 *   ★故本格先把**预报账清掉**（＝不预知 ⇒ `必含=null` ⇒ 耗 2 枚 ⇒ 可钉）✓。 */
		try { if (s.SC.State.variables.span1Foresee) delete s.SC.State.variables.span1Foresee.L7; } catch (e) { /* ✗ 吞 */ }
		/* ★★★补：**只清账不够** ✗ —— ★玩家手上有 `precognition` 时，
		 *   ★**L6 的预知门会再弹模态、再写一次账** ✗ ⇒ 故**把能力也一并摘掉** ✓。
		 *   （★本席实测：只清账时两跑仍都以 `battle` 起 ✗ —— 那正是 `必含=battle` 的形 ✓） */
		try {
			const P = s.SC.setup.DND3?.Player;
			if (P && Array.isArray(P.items)) P.items = P.items.filter((x) => x && x.id !== 'precognition');
			if (P?.properties && 'precognition' in P.properties) delete P.properties.precognition;
			if (P?.effects && Array.isArray(P.effects)) P.effects = P.effects.filter((x) => String(x) !== 'precognition');
			if (s.SC.State.variables.span1Foresee) delete s.SC.State.variables.span1Foresee.L7;
		} catch (e) { /* ✗ 吞 */ }
		/* ★★★★★★**末一环（本席实测定）**：★**`moveTo('L7')` 会触发 L6 的「预知门模态」 ✗**，
		 *   ★而门**自己会又写一次账**（`babel.js:207` `P.choice(选项).then((v) => { if (v) 记预报(from, v); })`）
		 *   ⇒ ★**清账／摘能力都无效** ✗ —— ★**必须在门那一刻答「不预知」** ✓。
		 *   ★门的选项里「不预知」那一项 `value === ''`（已由本笔同批修正）⇒ ★答它即可 ✓。
		 *   （★本席实测：不答门时两跑都以 `battle` 起 ✗ —— 那正是 `必含=battle` 的形 ✓） */
		{
			const 原Choice = s.SC.setup.DND3.Player.choice;
			s.SC.setup.DND3.Player.choice = (选项) => {
				try {
					const o = Array.isArray(选项) ? 选项 : [];
					const 不预知 = o.find((x) => x && x.value === '');
					if (不预知) return Promise.resolve('');
				} catch (e) { /* ✗ 吞 */ }
				return 原Choice(选项);
			};
			/* ★★★★★**置于最后一刻 ✗ 不能提前**（本席实测定案）：
			 *   ★★本档的 `稳打一场` 体首有 **`rng.reset()`**（本席 A 修加的）✗
			 *   ⇒ ★**注入与该层抽签之间只要有一战，注入就被清掉** ✗ ⇒ 真随机 ⇒ 读数翻 ✗
			 *   ⇒ ★故注入**紧贴 `moveTo` 之前** ✓，并★**当场断 `_impl` 非空**（被清立即具名 ⇒ ✗ 不静默）✓。 */
			R.rng.setSequence([0, 0, 0.99]);   // L7 手算：抽中 ['chest','gather']；危害 miss
			if (R.rng._impl === null || R.rng._impl === undefined) {
				console.log('  ✗ 注入被清（_impl=null）—— 本格读数不成立');
			}
			try { B.map.moveTo('L7'); } finally { s.SC.setup.DND3.Player.choice = 原Choice; }
			R.rng.reset();
		}
		/* ★moveTo 已移至上面（带答门的包装）✓ */
		/* ★★`#342` 追平：`moveTo('L7')` 之后**必须重画**（`playPassage('探索')`）
		 *   —— ★本席实测：不重画 ⇒ 页上还是**上一层**的选项面 ⇒ 下面读的入口/按钮
		 *   全是**另一层**的（`when()` 恒 false、且 `真打一场` 也找不到李魄）。
		 *   （同形：本档其它处 `moveTo` 后都跟了 `playPassage`。） */
		await playPassage(s, '探索'); await tick(250);
		/* ★★`#342` 追平（实测）：**入口的 `when()` 读的是「本层已战」**（②-1 的）
		 *   —— 实测本处（未战）读得 `when()=false`（无斧 false ／给斧**也** false）⇒ ★先说这是
		 *   **「采集是战后动作」的真实现**（✗ 不是工具门坏了）。★故先**真打一场**再读入口。
		 *   ⚠ **不跑 `清事件阶段`**：那一下（「不采了，继续向上」）会把采集入口一并收掉（实测）✓。 */
		await 稳打一场(s); await tick(250);
		const 采 = () => B.map.locations.get('L7').actions.find((a) => a.事件类 === 'gather');
		N采when = (() => { try { return JSON.stringify(采()?.when?.() ?? null); } catch (e) { return '《抛》' + e.message; } })();
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
	F('★面 N 两向：无斧 ⇒ 入口**在**且动作**不消费**（理由由动作给）；给斧 ⇒ 可选（两向仍可辨：差在消费）'
		+ `｜实得 无工具=${N无工具}／无消费=${N无消费}／有工具=${N有工具}`
		+ `｜L7 账=${JSON.stringify(s.SC.State.variables.span1Events?.L7 ?? null)}`
		+ `｜采项 when()=${N采when}`
		+ `｜层=${(() => { try { return s.SC.setup.BABEL.map.current; } catch (e) { return '?' ; } })()}`
		+ `｜已战=${JSON.stringify(s.SC.State.variables.babelRun?.已战 ?? null)}`,
		N无工具 === true && N无消费 === true && N有工具 === true);

	/* ★面 O 的**刀**（`books#133` 笔 3）：唯一出口的读数**随层表的 `boss` 标记翻面** ——
	 *   摘掉标记 ⇒ L9 立刻回到 2 条可用出口（证明守卫读的是**表**，✗ 硬写的层名 `=== 'L9'`）。 */
	let O两向 = false, O读数 = '';
	{
		const B = s.SC.setup.BABEL;
		const L9行 = (B.LAYER_META ?? []).find((l) => l?.id === 'L9');
		const 账 = (s.SC.State.variables.babelRun ??= {});   // ⚠ selftest 面里可能还没有本局账 ⇒ 兜住（✗ 直接点进去）
		/* ★★`#342` 追平（★**又一处「靶随产品改而过期」** —— `sgstory#1936`）：
		 *   「已过」的**真值**已搬到**引擎的进度账**（读 `R.save.progress()` ／ 写 `R.save.recordCleared()`），
		 *   ★`$babelRun.bosses` 降为**旧名回落**（只在新键缺位时才读，见 `80-save.js:progress`
		 *   与 `world/boss.js:已过`）⇒ ★本臂旧写法（直写 `账.bosses`）在本 pin 上是**死写**：
		 *   读数**永远**翻不了面（实测 `已胜 0`，而 `摘标记 1` 仍在 ⇒ 「表」那一档照旧有效 ✓）。
		 *   ★修：走**真写口**（有则用、无则回落旧账表 —— ★与 `world/boss.js` 的 `记战果` **同一分叉**，
		 *   ✗ 本档不自造第二套真值）。 */
		const 真写 = (场) => {
			try {
				const 口 = s.SC.setup.RPG?.save;
				if (typeof 口?.recordCleared === 'function') 口.recordCleared(场);
				else (账.bosses ??= {})[场] = 'victory';
			} catch (e) { /* ✗ 吞 */ }
		};
		const 清场 = () => {
			try {
				const v = s.SC.State.variables;
				if (v.rpgProgress?.run && Array.isArray(v.rpgProgress.run.cleared)) {
					v.rpgProgress.run.cleared = v.rpgProgress.run.cleared.filter((x) => String(x) !== 'L9');
				}
				if (账.bosses) delete 账.bosses.L9;
			} catch (e) { /* ✗ 吞 */ }
		};
		/* ★`books#180` 起**三向**：①未胜 ⇒ 0 条（硬门）②记 victory ⇒ 1 条 ③摘掉层表的 `boss`
		 *   标记 ⇒ 2 条（读数随**表**翻面，✗ 硬写层名）—— 三档各证一件事，缺一档就读不出是「门」
		 *   还是「标记」（本席按 `dev-10` 的面 O 原意扩，原两向仍全在）。 */
		清场();
		const 未胜 = B.map.exitsFrom('L9').length;
		真写('L9');
		const 已胜 = B.map.exitsFrom('L9').length;
		L9行.boss = false;
		const 摘 = B.map.exitsFrom('L9').length;
		L9行.boss = true;
		清场();
		const 回 = B.map.exitsFrom('L9').length;
		/* ⚠ 拆面（`books#180`）后战场的**结构边只剩「通 L10」那一条**（回 L8 的边归准备区）
		 *   ⇒ 摘掉标记时读到 **1**（✗ 旧两向的 2）—— 这一档证的仍是「守卫读**表**」。 */
		O两向 = 未胜 === 0 && 已胜 === 1 && 摘 === 1 && 回 === 0;
		O读数 = `未胜 ${未胜}／已胜 ${已胜}／摘标记 ${摘}／装回 ${回}`;
	}
	F(`★面 O 三向：未过 ⇒ 0 条、记 victory ⇒ 1 条、摘掉层表 L9 的 \`boss\` ⇒ 1 条、装回 ⇒ 0 条（读数随**账**与**表**翻面，✗ 硬写层名）｜实得 ${O读数}`
		+ `｜L9 出边＝${JSON.stringify((() => { try { return s.SC.setup.BABEL.map.exitsFrom('L9').map((e) => ({ to: e.to, text: e.text, when: (() => { try { return !!e.when?.(); } catch (err) { return '《抛》'; } })() })); } catch (e) { return '《抛》' + e.message; } })())}`
		+ `｜bosses 账=${JSON.stringify(s.SC.State.variables.babelRun?.bosses ?? null)}｜已战=${JSON.stringify(s.SC.State.variables.babelRun?.已战 ?? null)}`, O两向 === true);
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
	}

	/* ★面 T 的**刀**（`books#200` P0）：唯一变量＝把引擎的 `applyHeal` 换回**P0 原形**
	 *   （落值照夹 `maxHp`，但**返回名义量**、满血也不拒）⇒ 面 T 的三条臂应红。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3, P = D.Player, V = s.SC.State.variables;
		/* ★读法同主面 T（★只读 `[data-panel="notice"]` 的**首条**匹配 ⇒ 最新那条 ✓；理由见主面 T 的注释）。 */
		const 屏上数 = () => {
			const t = (s.doc.querySelector('[data-panel="notice"]')?.textContent ?? '').replace(/\s+/g, ' ');
			const m = t.match(/受到了(\d+)点治疗/); return m ? Number(m[1]) : null;
		};
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
		let 刀B = null, 刀B跳 = null;
		if (!盾原) {
			刀B跳 = '找不到那件盾（`heavy-wooden-shield` 没在 `DND3.Player.items` 里）⇒ 本刀不成立';
		} else {
			const 原used = 盾原.used;
			盾原.used = () => undefined;                       // ★唯一变量（不再抛结构化拒绝）
			try {
				const { 我方 } = await 战斗三臂驱动(s);
				const 盾行 = 我方.filter((x) => /shield/.test(x.件));
				/* ★★`#342` 追平（**三态**，照 `#345` 的 `K7` 体例）：⑩（`itemsInBag`）之后
				 *   战斗菜单**只留手上的武器** ⇒ ★防具**不再进菜单** ⇒ 「防具被接受／拒绝」这一臂
				 *   可能**根本取不到样本**（盾行 0 条）。那时是 ★**本刀前提不成立**（✗ 不当红 ✗ 当绿）
				 *   —— ★✗ 不能把「取不到样本」读成「判据失效」（那会把装置的洞当成产品的洞）。 */
				if (盾行.length === 0) 刀B跳 = '⑩ 之后防具不进战斗菜单 ⇒ 本刀取不到样本（★前提不成立）⇒ ✗ 不判红 ✗ 判绿';
				else 刀B = !盾行.every((x) => /rejected\/action-refused/.test(x.结果));
			} finally { 盾原.used = 原used; }
		}
		F('★战斗格刀②：把防具的 `used()` 换成**不拒绝** ⇒ 结果**不再是** `rejected/action-refused`（②臂判得了 ✗ 恒真式）'
			+ `｜实得 ${刀B}（找到那件 ${盾原 ? '是' : '否'}）` + (刀B跳 ? `｜★${刀B跳}` : ''), 刀B跳 !== null || 刀B === true);
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
	/* ★★`#342`·**可复现口径**（✗ 只躺在 README 里）：本支含**真随机**（遭遇抽样／掉落）。
	 *   ⇒ ★**判据面（`ok`/`F` 的断言）两跑逐字同**；
	 *   ★而**旁证打印**里那几个量会浮动：`itemsUsed`、背包件数（如 `旧硬币×N`）、掉落件名
	 *     —— ★它们**不参与任何断言**（✗ 别把旁证的浮动读成判据不稳；也别把判据的稳读成旁证也稳）。
	 *   ★依据：领队对 #342 的验收＝「装置跑完（零崩）＋ **两跑同读数**」——那里的「读数」指**判据面**。 */

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
	await 清阶段再向上(s, /向上，去第 2 层/, 6, { 至层: 'L1' });   // ★`#342`：先钉位置（✗ 不靠上一节）
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
	/* ★★`#342`（**领队半裁 2026-10-05**：「未战层」与「已战层」是**两件事**）：
	 *   ★本席先前把这一条读成「②-1 与裁 ②B 相冲」✗ —— 裁的原文是：**期望判在未战层**
	 *     （fresh 层：基础遭遇**在**）；★**已战层上它闭 ＝ ①防刷语义**（✗ 不是产品冲突）。
	 *   ⚠ 而「已战层上**事件动作面**才出现」是 **②-1 的真实现**（采集/箱子是**战后**动作）
	 *   ⇒ ★故本臂拆成两段：**未战层**判「基础遭遇在 ＋ 事件面尚未出」，**已战层**判「事件面出 ＋ 择一后退场
	 *     ＋ 基础遭遇**闭**」。★两段各自都是**可实现**的读数（✗ 不再把不可能的那半当判据）。 */
	await 清阶段再向上(s, /向上，去第 5 层/, 6, { 不打到达层: true });   // ③ 再点向上 ⇒ moveTo('L5') ⇒ 抽签（就地重绘）
	s.SC.setup.RPG.rng.reset();
	const 事件按钮 = (x) => choiceButtons(x).filter((t) => /打开墙角的箱子|^采集（|再打一场/.test(t));
	const L5账 = s.SC.State.variables.span1Events?.L5 ?? null;
	const M抽 = L5账?.抽中 ?? null;
	const M遭 = () => choiceButtons(s).some((t) => t.includes('遭遇（往上走之前'));
	ok(JSON.stringify(M抽) === JSON.stringify(['battle', 'chest']),
		`★面 M：注入随机源后 L5 的抽中与手算不符（手算 ['battle','chest']；实得 ${JSON.stringify(M抽)}）`);
	/* ── M-a：**未战层**（fresh）── */
	const M未战遭 = M遭();
	const M未战事件 = 事件按钮(s);
	ok(M未战遭, `★面 M·**未战层**：基础遭遇须**在**（裁 ②B；实得 ${S(choiceButtons(s))}）`);
	ok(M未战事件.length === 0, `★面 M·未战层：事件动作面此刻**尚未**出现（②-1：采集/箱子是**战后**动作）—— 实得 ${S(M未战事件)}`);
	if (M未战遭 && M未战事件.length === 0) {
		console.log(`  面 M·未战层 ✓ 基础遭遇在（可点 ${S(choiceButtons(s))}）；事件面尚未出 ✓（②-1 真实现）`);
	}
	/* ── M-b：**已战层**（打完）── */
	await 稳打一场(s); await tick(250);
	const M前 = 事件按钮(s);
	ok(M前.length === 2 && M前.some((t) => t.includes('第二场战斗')) && M前.some((t) => t.includes('箱子')),
		`★面 M：抽中的两类没有都出现为按钮（抽中 ${JSON.stringify(M抽)}；事件按钮 ${JSON.stringify(M前)}）`);
	ok(!M前.some((t) => t.startsWith('采集')), '★面 M：未抽中的类出现了（采集未在抽中却给了按钮 ⇒ 按条件筛而非按抽签筛）');
	ok(!M遭(), `★面 M·**已战层**：打完（＝已战）后基础遭遇须**闭**（①防刷语义 · 领队半裁）—— 实得 ${S(choiceButtons(s))}`);
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
	ok(!M遭(), `★面 M·**已战层**：择一之后基础遭遇仍须**闭**（①防刷语义）—— 实得 ${S(choiceButtons(s))}`);
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
	/* ★★`#342` 追平：**只清 `$inventory` 不够** ✗ —— 实测读到入口文案仍是「**用斧头**采集（…）」
	 *   ⇒ ★说明「有没有斧」这个判走的是**别的面**（`Player.items` 那一侧），✗ 不是这份背包清单。
	 *   ⚠ 那把斧从哪来：★是**面 M 在 L5 开宝箱**给的（`宝箱奖励`：L5 ⇒ `axe`，`encounters.js:131`）
	 *   ⇒ ★**本臂的无斧前提被上一臂破坏了** ⇒ 両向里的「无斧」那一半根本量不到（假红）。
	 *   ★故两个面一起摘（与「摘 `precognition`」同一形：**声明的置态**）。 */
	try {
		const P = s.SC.setup.DND3?.Player;
		if (P && Array.isArray(P.items)) P.items = P.items.filter((x) => !/^axe$/.test(String(x?.id ?? '')));
		if (P?.properties && 'axe' in P.properties) delete P.properties.axe;
	} catch (e) { /* ✗ 吞 */ }
	await playPassage(s, '探索'); await tick(200);
	/* ★★★`#342` 追平·**甲序**（照本档面 M 的同一条，★**本席实测两跑捉到**）：
	 *   **① 先清阶段（置账／真打 ⇒ 向上门开）⇒ ② 再注入 ⇒ ③ 再点向上** ——
	 *   ★✗ **中间不许再打一场**：`清阶段再向上` 里若还需 `稳打一场`，
	 *   那一场会走 `真打一场` 的 `rng.reset()` ⇒ ★**注入被清** ⇒ 抽签走真随机
	 *   ⇒ ★**两跑抽中不同**（实测 `["chest","battle"]` 与 `["battle","chest"]`）⇒ ★**读数浮动 = 不可判**。
	 *   （同一根因——「注入与该层抽签之间只要有一战，注入就被清」——本笔在面 M 那处刚治过，**这里是第三处**。） */
	await 清层阶段(s);
	/* ★★★追平·**预知门那一半**：L6 → L7 会弹**预知门**，门**自己会写预报账**（`babel.js:207`）
	 *   ⇒ `drawTwo` 的 `必含` 非空 ⇒ ★**只耗 1 枚随机单元**（而非 2 枚）⇒ 注入次序整条错位。
	 *   ★修：**把「预知」这件事本身拿掉**（摘 `precognition` 能力 ＋ 清预报账）——
	 *   ★依据是产品面自己那一行：不持有 `precognition` ⇒ `预知门` 直接 `return false`（`babel.js:194-195`）
	 *   ⇒ **门压根不出** ⇒ 抽签回到 2 枚的常态 ⇒ 注入可钉。
	 *   ⚠ ★我第一版写成「在门那一刻答『不预知』」（包 `Player.choice`）✗ —— 实测**崩**：
	 *   那个包装会把**地图场景自己的 `choice`** 一并吞掉（它的选项里也有 `value === ''`）
	 *   ⇒ 点「向上」后页面不动 ⇒ `driveButton` 报「读数未变」（实测撞到）✓。 */
	{
		const P = s.SC.setup.DND3?.Player;
		try {
			if (P && Array.isArray(P.items)) P.items = P.items.filter((x) => x && x.id !== 'precognition');
			if (P?.properties && 'precognition' in P.properties) delete P.properties.precognition;
			if (P?.effects && Array.isArray(P.effects)) P.effects = P.effects.filter((x) => String(x) !== 'precognition');
			if (s.SC.State.variables.span1Foresee) delete s.SC.State.variables.span1Foresee.L7;
		} catch (e) { /* ✗ 吞 */ }
	}
	s.SC.setup.RPG.rng.setSequence([0, 0, 0.99]);         // L7 手算：index(3)=0 ⇒ chest；rest[gather,battle] index(2)=0 ⇒ gather；危害 miss
	await 清阶段再向上(s, /向上，去第 7 层/);
	/* ★**当场断**（✗ 不静默）：预报账须为空 ⇒ `必含=null` ⇒ 上面那个注入才是对的。 */
	if (s.SC.State.variables.span1Foresee?.L7 != null) {
		console.log('  ✗ 预报账非空（' + JSON.stringify(s.SC.State.variables.span1Foresee.L7) + '）⇒ 抽签只耗 1 枚 ⇒ 本格注入次序不成立');
	}
	s.SC.setup.RPG.rng.reset();
	/* ★②-1：采集是**战后动作** ⇒ 读入口/按钮前先真打一场（★此时抽签已完成 ⇒ `rng.reset()` 无影响）。
	 *   ⚠ **不跑 `清事件阶段`**：那一下会把采集入口一并收掉（实测）✓。 */
	await 稳打一场(s); await tick(250);
	/* ★`books#212` 【入口常出】后文案为「采集（<节点名>｜一次采净 N 件）」
	 *   ⇒ ★`#342` 追平：旧形 `/^用.*采集/` 是**采集入口带工具名前缀**时代的靶 ⇒ 后来改了文案
	 *     ⇒ ★旧靶**恒取空** ⇒ 面 N 两条臂都红（★又一次「靶随产品改而过期」——本笔追平的就是这一族）。 */
	const 采按钮 = (x) => choiceButtons(x).filter((t) => /^(用\S+)?采集（/.test(t));
	const N账 = s.SC.State.variables.span1Events?.L7 ?? null;
	const N无 = 采按钮(s);
	ok(JSON.stringify(N账?.抽中 ?? null) === JSON.stringify(['chest', 'gather']),
		`★面 N：注入后 L7 的抽中与手算不符（手算 ['chest','gather']；实得 ${JSON.stringify(N账?.抽中)}）`);
	/* ★`books#212` 第 1 项改形（操作者裁定 00:2x）：**入口改为常出** ⇒ 本面由「没有按钮」翻成「按钮在」；
	 *   而「为什么不行」由动作说明白 ⇒ 那条链在 `verify` ㉕ 格里断（那里能就地调动作并截 `perform`）✓。 */
	ok(N无.length === 1, `★面 N：手上没有铁斧时采集按钮**应在**（入口常出 ✓）；若不在 ⇒ 「入口常出＋动作说明原因」这条契约被改回去了`
		+ `（实得 ${JSON.stringify(N无)}）；★该层**全部可点** ＝ ${JSON.stringify(choiceButtons(s))}（供定因：靶文案若又改了，本条就是“靶过期”而非产品契约被改回）`);
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
	/* ★★★`#342`（**dev-10 现行契约 spec · 领队转达 2026-10-05**）—— 本席先前误读成「产品冲突」，✗ 不是：
	 *   ① `moveTo('L9')` ＝ **战场**：未胜 ⇒ **0 条**；已过 ⇒ **恰 1 条「前进（钻进光里·第10层）」**
	 *   ② `moveTo('L9-camp')` ＝ **准备区**：**恒恰 1 条「走进那道光」**（✗ 回 L8 ＝ 裁 2 摘）
	 *   ③ ★本档原先的 `进层读(s,'L9')` 走的**入层口**是 `L9 → L9-camp`（`入层口('L9')` ＝ `'L9-camp'`）
	 *      ⇒ 实际读到的是**准备区** ⇒ ★**读数没错、期望旧**（「走进那道光」那一条正是准备区的）。
	 *   ⚠ 「已过」须写**真写口**（`sgstory#1936` 起它读的是**引擎进度账**）——★直写 `$babelRun.bosses`
	 *     在本 pin 上是**死写**（本笔在自检面那一份里实测过：`已胜 0` 而 `摘标记 1` 仍有效）。 */
	const 清L9过 = () => {
		try {
			const v = s.SC.State.variables;
			if (v.rpgProgress?.run && Array.isArray(v.rpgProgress.run.cleared)) {
				v.rpgProgress.run.cleared = v.rpgProgress.run.cleared.filter((x) => String(x) !== 'L9');
			}
			if (v.babelRun?.bosses) delete v.babelRun.bosses.L9;
		} catch (e) { /* ✗ 吞 */ }
	};
	const 记L9过 = () => { try {
		const c = s.SC.setup.RPG?.save;
		if (typeof c?.recordCleared === 'function') c.recordCleared('L9');
		else (s.SC.State.variables.babelRun.bosses ??= {}).L9 = 'victory';
	} catch (e) { /* ✗ 吞 */ } };
	await 进层读(s, 'L8');
	const O8 = 出口按钮(s);
	ok(O8.length === 1, `★面 O：对照层 L8 的出口不是 **1** 条（${JSON.stringify(O8)}）⇒ 出口面本身坏了，本面读数不成立`);
	/* ── ① 战场（`moveTo('L9')`）：未胜 0 条 ⇒ 已过恰 1 条「前进（钻进光里·第10层）」── */
	清L9过();
	s.SC.setup.RPG.rng.setSequence([0.99, 0.99, 0.99]);       // 抽签两格 + 危害一格（皆非命中）
	try { s.SC.setup.BABEL.map.moveTo('L9'); } catch (e) { /* ✗ 吞 */ }
	await playPassage(s, '探索'); await tick(250);
	s.SC.setup.RPG.rng.reset();
	const O战未胜 = 出口按钮(s);
	记L9过();
	await playPassage(s, '探索'); await tick(250);
	const O战已胜 = 出口按钮(s);
	ok(O战未胜.length === 0, `★面 O·战场：未过头目时 L9 **一条出口都不出**（实得 ${JSON.stringify(O战未胜)}）—— 硬门失守`);
	ok(O战已胜.length === 1 && /前进/.test(O战已胜[0] ?? ''), `★面 O·战场：已过头目后须**恰 1 条「前进（钻进光里·第10层）」**（实得 ${JSON.stringify(O战已胜)}）`
		+ `；★该屏**全部可点** ＝ ${S(choiceButtons(s))}｜已战账 ＝ ${读已战(s)}`);
	清L9过();
	/* ── ② 准备区（`moveTo('L9-camp')`）：恒恰 1 条「走进那道光」── */
	try { s.SC.setup.BABEL.map.moveTo('L9-camp'); } catch (e) { /* ✗ 吞 */ }
	await playPassage(s, '探索'); await tick(250);
	const O备 = 出口按钮(s);
	ok(O备.length === 1 && /走进那道光/.test(O备[0] ?? ''),
		`★面 O·准备区：出口不是**恰 1 条「走进那道光」**（实得 ${JSON.stringify(O备)}）`);
		/* ★★★`dev-10` 更正（本笔并入）：★**准备区臂 ＝ 恰 1 条「走进那道光」** ✓ ——
		 *   ★旧期望（「回第 8 层」＋「走进那道光」两条）是**过期期望** ✗
		 *   （★`babel.js:643` 已写明：准备区的边**不经**边守卫 ⇒ ★回边不再在页面上出现 ✓）。 */
	if (O8.length === 1 && O战未胜.length === 0 && O战已胜.length === 1 && O备.length === 1) {
		console.log(`  面 O ✓ 头目硬门：L8 对照 1 条（单上行） ${JSON.stringify(O8)}；**战场** L9 未胜 ${O战未胜.length} 条 ⇒ 已胜 ${S(O战已胜)}；**准备区** ${S(O备)}`);
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
			/* ★浮动标注（`#342` developer 记③）：下面这行里的 **`链接` 列表**是**旁证** —— 它随掉落／事件抽签浮动
			 *   ⇒ ★**不参与断言**（本面的断言是「段落＝游戏失败 ＋ 两钮在 ＋ 位置留在 L5」（见上面 `ok(...)`））。
			 *   ★在**这一行就地**标出，✗ 不只躺在文件头（读者看到它就知道它不是判据）。 */
			console.log(`  面 P ✓ 进层致命伤：1 血 ⇒ 段落 ${JSON.stringify(致命.段)}、位置 ${JSON.stringify(致命.位)}、链接 ${JSON.stringify(致命.链接)}、战败 ${致命.战败}`
				+ `；满血对照 ⇒ 段落 ${JSON.stringify(对照.段)}、位置 ${JSON.stringify(对照.位)}、含「去第 6 层」${对照.钮.some((t) => /去第 6 层/.test(t))}`
				+ `｜★行内「链接」为**浮动旁证**（随抽签变）·✗ 不参与断言`);
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
			/* ★浮动标注（`#342` developer 记③）：`敌「…」`／`治疗「…」` 两串是**屏上读数**（旁证）——
			 *   `治疗「…」` 的血量随本跑真实战斗进程浮动 ⇒ ★**不参与断言**（断言在 `ok(...)` 那四条）。 */
			console.log(`  面 Q ✓ 战斗面：敌「${有.敌}」；治疗「${有.治}」；战斗结束 ⇒ 两块清空 ✓`
				+ `｜★「敌」／「治疗」两串为**浮动旁证**（血随本跑进程变）·✗ 不参与断言`);
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
		/* ★★**读法修**（`books#402` 陪跑 · dev-10 实证 · 2026-10-08）：★此前读 `document.body.textContent`
		 *   ＝**错**，有两处非产品来源（★产品清白 ✓，是本臂读错 ✓）：
		 *     ①★`<script>` **源本**也在 `body.textContent` 里 ⇒ ★引擎／道具档的**注释**逐字写着旧病灶
		 *        （『满血印「受到2点治疗」』✓）⇒ ★正则把**源码字符串**当读数收走 ✗；
		 *     ②★通知面是 ★**新在前** ⇒ ★取「**最后一条**」命中的是**最旧**那条（上一档的读数 ✗）。
		 *   ⇒ ★现形：★只读 ★**`[data-panel="notice"]`**（★玩家真看见的那一面 ✓），且取**首条**匹配
		 *     （★新在前 ⇒ 首条＝最新 ✓；★某条不含该串时**继续**匹配 ⇒ 满血那档仍读到**上一条** ✓）。
		 *   ⚠ ★该面板**不在** ⇒ ★**具名**红（✗ 静默回落 `body` ✗ —— 那种回落正是本条的病根 ✓）。 */
		const 通知面 = () => (s.doc.querySelector('[data-panel="notice"]')?.textContent ?? '').replace(/\s+/g, ' ');
		const 有通知面 = () => s.doc.querySelector('[data-panel="notice"]') != null;
		const 屏上数 = () => {
			const m = 通知面().match(/受到了(\d+)点治疗/);
			return m ? Number(m[1]) : null;
		};
		const 件数 = (id) => V.inventory.filter((x) => x.id === id).reduce((a, x) => a + (x.charges ?? 1), 0);
		const 出声数 = () => (通知面().match(/伤已无碍/g) ?? []).length;
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
		ok(有通知面(), '★前件：须有 `[data-panel="notice"]`（★本面的读数只认它 —— ✗ 无则下面的数全是 null ✗）');
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
		/* ★★`#342` 追平（**三态**，照 `#345` 的 `K7` 体例）：⑩（`itemsInBag`）之后
		 *   战斗菜单**只留手上的武器** ⇒ ★治疗件与防具**都不再进菜单**
		 *   ⇒ 「选项→靶解析→act」这条路上的那两臂**取不到样本**（实测：我方动作 4 条，治行 0、盾行 0）
		 *   ⇒ ★**本臂前提不成立**（✗ 不当红 ✗ 当绿）—— ★✗ 不能把「取不到样本」读成「产品坏了」
		 *     也不能读成「判据失效」（两头都是把装置的洞当成产品/判据的洞）。
		 *   ★能判的那半（③正控：己方一次成功攻击须使靶掉血）仍为硬判 ✓。 */
		const 治前提 = 治行.length > 0;
		const 盾前提 = 盾行.length > 0;
		if (!治前提) console.log('  ⏳【战斗格①臂·记明账】⑩ 之后治疗件不进战斗菜单 ⇒ 本臂取不到样本（★前提不成立）⇒ ✗ 不判红 ✗ 判绿');
		if (!盾前提) console.log('  ⏳【战斗格②臂·记明账】⑩ 之后防具不进战斗菜单 ⇒ 本臂取不到样本（★前提不成立）⇒ ✗ 不判红 ✗ 判绿');
		ok(!治前提 || 治涨.length > 0,
			`★战斗格①臂（sgstory#1950）：治疗件经「选项→靶解析→act」须真落地（血↑）—— 实得 ${JSON.stringify(治行)}`);
		ok(!盾前提 || 盾拒.length === 盾行.length,
			`★战斗格②臂：用防具须「结构化拒绝」（rejected/action-refused，✗ 裸抛）—— 实得 ${JSON.stringify(盾行)}`);
		ok(攻行.length > 0,
			`★战斗格③臂（正控）：**己方**一次成功攻击须使靶掉血（✗ 则本格是空面）—— 我方实得 ${JSON.stringify(我方)}`);
		/* ★浮动标注（`#342` developer 记③）：本行的**动作计数**（我方动作／全部／治疗／盾／致伤）是**旁证** ——
		 *   本格含**真随机**（命中／伤害／回合数）⇒ 逐跑浮动 ⇒ ★**不参与断言**（断言是「三臂各判得了」那三条）。 */
		console.log(`  战斗格 ✓ 我方动作 ${我方.length}／全部 ${动作录.length}｜①治疗 ${治行.length}（血涨 ${治涨.length}）`
			+ `｜②盾 ${盾行.length}（拒 ${盾拒.length}）｜③己方致伤 ${攻行.length}`
			+ `｜★本行**动作计数为浮动旁证**（本格含真随机）·✗ 不参与断言`);
		s.dom.window.close();
	}
	s.dom.window.close();
}
console.log('');
未覆盖三栏();
console.log('');
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length === 0 ? '✓ e2e 驾驶层通过' : `✗ e2e 驾驶层失败 ${fails.length} 条`);
process.exit(fails.length === 0 ? 0 : 1);
}   // ← cli 块结束（★守卫：import 时上面整段不执行）
