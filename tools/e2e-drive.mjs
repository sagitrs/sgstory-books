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
if (has('--list')) {
	console.log('  硬判面：R 读档往返·导航形｜L 同地点读档·场景头重印（`books#136` F4）｜M L5 选择制事件面｜N 工具门（`books#133` 笔 2）｜O L9 唯一出口（`books#133` 笔 3）｜Q 战斗面（敌面板／治疗读数 · `books#188`）');
	console.log('  明账面（挂票号；`--require <self-loop|item-click>` 可升硬判）：S 自环就地重绘·面板跟随（sagitrs/sgstory#1859）｜I 故事页点道具不穿 DOM（sagitrs/sgstory#1857）');
	console.log('  原语：passageLines／choiceButtons／driveButton／saveAt／loadAt／setStateVars／panelText');
	process.exit(0);
}

let env;
try { env = resolveEnv(argOf('--engine'), process.env); } catch (e) { bail(e.message, 2); }
if (!fs.existsSync(env.htmlPath)) {
	bail(`缺产物：${env.htmlPath}\n  先构建：python3 ${path.join(env.root, 'build.py')} ${env.storyDir} --out ${path.basename(env.htmlPath)}`);
}

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const lines = (s) => passageLines(s).length;

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
	let L正 = null, L反 = null, L回滚 = null, L处理器数 = null;
	{
		await playPassage(s, '探索'); await tick(300);
		await driveButton(s, /向上，去第 2 层/, { read: lines });
		L正 = passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
		await saveAt(s, 3);
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
	let N无工具 = null, N有工具 = null;
	{
		const B = s.SC.setup.BABEL, R = s.SC.setup.RPG;
		const 包 = s.SC.State.variables.inventory;
		if (Array.isArray(包)) 包.length = 0;
		delete s.SC.State.variables.span1Events.L7;
		R.rng.setSequence([0, 0, 0.99]);              // L7 手算：抽中 ['chest','gather']；危害 miss
		B.map.moveTo('L7');
		R.rng.reset();
		const 采 = () => B.map.locations.get('L7').actions.find((a) => a.事件类 === 'gather');
		N无工具 = 采().when() === false;
		R.give('axe');
		N有工具 = 采().when() === true;
	}
	F('★面 N 两向：同一注入下，无斧 ⇒ 不可选、给斧 ⇒ 可选（读数随**背包**翻面，✗ 恒定）', N无工具 === true && N有工具 === true);

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
	await driveButton(s, /向上，去第 2 层/, { read: lines });         // 走到 L2 ⇒ 该屏该印【第 2 层 · 倒木坡】
	const 头首见 = passageLines(s).some((t) => t.includes('【第 2 层 · 倒木坡】'));
	await saveAt(s, 1);                                             // 存档刻：current＝L2（此刻头已印）
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
	s.SC.setup.RPG.rng.setSequence([0.99, 0, 0.99]);   // L5 手算：index(3)=2 ⇒ battle；rest[chest,gather] index(2)=0 ⇒ chest；危害 miss
	await driveButton(s, /向上，去第 5 层/, { read: lines });   // 出口导航 ⇒ moveTo('L5') ⇒ 抽签（就地重绘）
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
	await driveButton(s, /打开墙角的箱子/, { read: (x) => 事件按钮(x).join('｜') });   // 择一（就地重绘；读数＝事件按钮集，必变）
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
	await driveButton(s, /向上，去第 7 层/, { read: lines });   // 进 L7 ⇒ 抽签 + 危害
	s.SC.setup.RPG.rng.reset();
	const 采按钮 = (x) => choiceButtons(x).filter((t) => /^用.*采集/.test(t));
	const N账 = s.SC.State.variables.span1Events?.L7 ?? null;
	const N无 = 采按钮(s);
	ok(JSON.stringify(N账?.抽中 ?? null) === JSON.stringify(['chest', 'gather']),
		`★面 N：注入后 L7 的抽中与手算不符（手算 ['chest','gather']；实得 ${JSON.stringify(N账?.抽中)}）`);
	ok(N无.length === 0, `★面 N：手上**没有**铁斧，却出现了采集按钮（${JSON.stringify(N无)}）—— 工具门没生效`);
	ok(choiceButtons(s).some((t) => t.includes('箱子')), '★面 N：另一类事件按钮（箱子）也不在 ⇒ 事件面本身没起来，本面读数不成立');
	s.SC.setup.RPG.give('axe');
	await playPassage(s, '探索'); await tick(250);            // 就地重画（同一段落、同一账）
	const N有 = 采按钮(s);
	ok(N有.length === 1, `★面 N：给了铁斧之后采集按钮仍不出现（实得 ${JSON.stringify(N有)}）—— 工具门接线断了`);
	if (N有.length === 1 && N无.length === 0) console.log(`  面 N ✓ 工具门：无斧 ⇒ 采集按钮 0 个；给斧 ⇒ ${JSON.stringify(N有)}`);

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
	s.dom.window.close();
}
console.log('');
for (const f of fails) console.log(`  ✗ ${f}`);
console.log(fails.length === 0 ? '✓ e2e 驾驶层通过' : `✗ e2e 驾驶层失败 ${fails.length} 条`);
process.exit(fails.length === 0 ? 0 : 1);
}   // ← cli 块结束（★守卫：import 时上面整段不执行）
