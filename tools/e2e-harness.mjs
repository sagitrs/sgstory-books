/* 巴别 e2e **共享件**（`books#90` ①）—— 无头驱动组装产物的**唯一入口**
 *
 * 它回答一个问题：**「产物在真 DOM 里跑得起来吗？」**
 *   —— 把 `babel-trial.html` 装进 JSDOM，boot 到**可断言状态**，然后按玩家入口点、读面板、断言 DOM。
 *
 * ★★**为何是「共享件」而非某一路的私有脚本**（票面 ① 的裁）：
 *   `books#90` 的四路（甲 Playwright／乙 npm-jsdom／丙 nightly 窗口／丁 本地）**都要这套知识**：
 *   boot（★`#91` 后为 **`runUserInit()`＋`start()`＋`play(start)`** —— 原「5 步」有装置偏差，见文件头 ④′／①）
 *     ＋ 点故事链接（**机制错会静默不导航**）＋ 面板读取。
 *   ⇒ 把它**写一次**放仓内（形同 `tools/rehearse-workflow.py`：**仓内工具、暂不接 CI**），
 *     四路各自去调它 ⇒ **知识成本只付一次**，且换路**不必重写**。
 *
 * ★★**本文件承载的「踩坑读数」**（每条都是我实测踩出来的，✗ 猜想）：
 *   ① **boot＝`runUserInit()` ＋ `start()` ＋ `play(start)`**（★`#91` 修正，见 ④′——原写「5 步」，那形有装置偏差）。
 *      产物**加载期已自跑** `Engine.init()` ＋ `Engine.runUserScripts()`（SugarCube 的 jQuery-ready 序列，
 *      **实测**：t=0.2s 起 `Engine.state === 'init'`、用户脚本束已执行、`document` 上已有 1 个 `.rpg-item-link` 委托）。
 *      ⇒ 该两步**不可重跑**（重跑＝用户脚本束二次执行 ⇒ 计数类断言恒 2×）。
 *      ★但 **`runUserInit()` 必须显式补**：`Engine.start()` 体内**不含**它
 *      （机械核实 `vendor/format.js` 的 `start:{value:function` 体：含 `State.restore()`，**无** `runUserInit`）；
 *      产物自身那段 `runUserInit() → start()` 挂在 `$window.width() && LoadScreen.size<=1` 的 interval 上，
 *      **jsdom 下 `width()===0` ⇒ 该 `.then()` 永不 resolve** ⇒ 指望产物代跑会**静默丢 StoryInit**。
 *      ⇒ 本装置须：**`runUserInit()`**（StoryInit ⇒ 基线变量）＋ **`start()`**（带出 `init`）＋ **`play(start)`**（落到可断言 DOM）。
 *   ② ★**点链接有「静默不导航」的形**：对同一故事链接，
 *      `el.dispatchEvent(new MouseEvent('click'))` **不导航、不报错**（我实测：`开始 → 开始`）；
 *      而 `el.click()`／`jQuery(el).trigger('click')`／`Engine.play(data-passage)` **都导航**。
 *      ⇒ 故本件的 `clickPassage()` **内建「导航确已发生」断言**（✗ 返回 void ——
 *        那会让调用方**对着过期 DOM 判**，与本舰队「绿而判据未执行」同族，且**无法分辨**）。
 *   ③ **故事链接的键是 `data-passage`**（✗ `href`）：按 `href` 选会**选到侧栏的
 *      Continue/Saves/Settings/Restart/Share** —— 我首版即栽在此（白测一轮）。
 *   ④ 单调摊销极好：boot ≈0.6s；每段 `play()` ≈8ms ⇒ **10+ 场景一循环足够**（✗ 每场景重启）。
 *
 *   ④′ ★**装置偏差（`#91` 修正 · 本文件历史上最重的一条读数）**：
 *      **boot 跑「5 步」会多造一份「加载期一次性副作用」** —— 产物加载期已自跑 `init()`＋`runUserScripts()`，
 *      再跑一遍 ⇒ 用户脚本束重执行 ⇒ `RPG.bindItemLinks()` 再绑一次，而守卫（`__itemLinksBound`）挂在
 *      **每次重执行都新建的 `setup.RPG`** 上 ⇒ 归零、拦不住。委托计数**恒 2×**（真浏览器＝1）。
 *      ⇒ **凡计数类断言（绑定／注册／define）在旧形装置上都会读成 2×** ⇒ 是**装置造出来的**，✗ 产品缺陷。
 *      **修正**：boot 跑 `runUserInit()` ＋ `start()` ＋ `play(start)`（见 ① 与 `boot()` 注释）——
 *      ★**勿只跑 `start()`**：它不含 `runUserInit`（我曾据此写错，见 §教训）。
 *      **教训（一般化）**：**装置多跑一步，就会多造一份「一次性副作用」，而这份多出来的量看起来像真读数。**
 *
 * 用法（**先构建产物**，★故事目录与 `--out` 都给**绝对路径** —— 相对形会被拼到**引擎仓根**）：
 *   `python3 <引擎>/build.py "$PWD/stories/babel" --out "$PWD/stories/babel/babel-trial.html"`
 *     node tools/e2e-harness.mjs --engine <引擎检出>                 # 跑内置冒烟（P0/P1 机械子集）
 *     node tools/e2e-harness.mjs --engine <引擎> --selftest          # 刀：证明本件**判得了**
 *     node tools/e2e-harness.mjs --engine <引擎> --list              # 只列可判面
 * 退出码：0 全过；1 有红；2 用法/环境错（引擎根不对、产物缺、jsdom 不可得）。
 *
 * ★jsdom 从**引擎树**解析（books 仓零依赖是**刻意的** —— `#81` 丙案搁置的正是它）：
 *   ⇒ 本件**不要求 books 有 `package.json`**；缺 jsdom 时**具名报错**（✗ 崩在 import 上）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const here = import.meta.dirname;                       // …/tools
const repoRoot = path.resolve(here, '..');              // books 仓根

const argOf = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);

/* ============================================================================
 * 一、环境解析（缺什么就**具名报错**，✗ 让它在别处崩）
 * ==========================================================================*/
/** 解析引擎根与 jsdom。返回 `{ root, storyDir, htmlPath, JSDOM }` 或抛**具名**错。 */
export function resolveEnv(engineArg, env = process.env) {
	/* ★参数优先、回落 `ENGINE`（两件姊妹件统一约定）—— 否则同一语法在两件上行为相反。 */
	const given = engineArg ?? env?.ENGINE ?? null;
	const root = given ? path.resolve(given) : null;
	if (!root) throw new Error('缺 `--engine <引擎检出目录>`（或 `ENGINE=<dir>`）（jsdom 住在引擎树；books 零依赖是刻意的，见文件头）');
	const shims = path.join(root, 'tests/unit/framework/shims.js');
	if (!fs.existsSync(shims)) throw new Error(`引擎根不对：${root}\n  在该处找不到 ${path.relative(root, shims)}`);
	/* jsdom 从引擎树解析（✗ 从本仓 —— 本仓无 node_modules，且**不该有**）。 */
	let JSDOM, VirtualConsole;
	try {
		const req = createRequire(path.join(root, 'noop.js'));
		({ JSDOM, VirtualConsole } = req('jsdom'));
	} catch {
		throw new Error(`引擎树里取不到 jsdom：${root}\n  期望 node_modules/jsdom（引擎侧手装）⇒ 本件**不**要求 books 装依赖`);
	}
	const storyDir = path.join(repoRoot, 'stories', 'babel');
	const htmlPath = path.join(storyDir, 'babel-trial.html');   // 构建产物（✗ 进 git）
	if (!fs.existsSync(htmlPath)) {
		throw new Error(`缺产物：${path.relative(repoRoot, htmlPath)}\n`
			+ `  先构建（★**故事目录与 --out 都给绝对路径**）：`
			+ `\n    python3 ${path.join(root, 'build.py')} "${storyDir}" --out "${htmlPath}"`
			+ `\n  （相对形会被拼到**引擎仓根** ⇒ 产物落错位置，见 .github/workflows/babel-tests.yml 的「构建」步注释）`);
	}
	/* ★产物**新鲜度**守卫（作者建议、协调方批 2026-10-03）：本件只认**预构建产物**，
	 *   `--engine` 只取 jsdom 与故事目录 ⇒ ✗ 不参与构建 ⇒ 产物陈旧时**全链都拿旧码跑**
	 *   （实测踩过：修好的引擎 ＋ 18:19 的产物 ⇒ 夹具读「治好了」而自证读「没治」✗ 两读）。
	 *   判据：产物早于 `stories/babel/src/**` 最新档 或 早于 `--engine/src/**` 最新档 ⇒ **具名红**。
	 *   ⚠ 取**严格早于**（相等放行 —— 同一次克隆/构建里 mtime 可能全等，用 `>=` 会误红）。 */
	{
		const 最新档 = (dir) => {
			let t = 0, 谁 = null;
			if (!fs.existsSync(dir)) return { t, 谁 };
			for (const f of fs.readdirSync(dir, { recursive: true })) {
				const q = path.join(dir, String(f));
				if (!q.endsWith('.js') || !fs.statSync(q).isFile()) continue;
				const m = fs.statSync(q).mtimeMs;
				if (m > t) { t = m; 谁 = q; }
			}
			return { t, 谁 };
		};
		const 产物 = fs.statSync(htmlPath).mtimeMs;
		for (const [名, dir] of [['故事 src', path.join(storyDir, 'src')], ['引擎 src', path.join(root, 'src')]]) {
			const 最 = 最新档(dir);
			if (最.t > 产物) {
				throw new Error(`产物**陈旧**（${名}）：${path.relative(repoRoot, htmlPath)} 早于 ${path.relative(root, String(最.谁))}`
					+ `（产物 ${new Date(产物).toISOString()}｜${名} ${new Date(最.t).toISOString()}）\n`
					+ `  先重建：python3 ${path.join(root, 'build.py')} ${storyDir} --out babel-trial.html\n`
					+ '  ★✗ 别拿旧产物跑读数 —— 那正是「读数跑在另一棵树上」那一族（本舰队实测踩过）');
			}
		}
	}

	return { root, storyDir, htmlPath, JSDOM, VirtualConsole };
}

/* ============================================================================
 * 二、boot（★`runUserInit()` ＋ `start()` ＋ `play(start)`；`init`／`runUserScripts` 由产物加载期自跑，见文件头 ④′）
 * ==========================================================================*/
/**
 * 装产物并 boot 到**可断言状态**（已 `play(start)`）。
 * @returns `{ dom, window, SC, engine, doc, bootMs, playMs, passage }`
 */
export async function boot(env, { quiet = true } = {}) {
	const html = fs.readFileSync(env.htmlPath, 'utf8');
	/** ★D7 采集桶（`#105`）：产物在 boot 期及之后说过的每一句（`{kind,msg}`）。 */
	const consoleMsgs = [];
	const t0 = Date.now();
	const dom = new env.JSDOM(html, {
		runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
		/* ★★`#105` D7：**采集**「未处理异常 / console 报错」——✗ 不再静默吞掉。
		 *
		 *   病灶（本席实测，`books#105` 底稿）：原形 `new VirtualConsole()` **无监听器** ⇒
		 *   产物的 `console.error` 与未捕获异常**被静默丢弃** ⇒ 「D7 零未处理异常」**恒绿、
		 *   ✗ 判不了**。实证：向会话注入 `throw new Error('…')` ⇒ `window.onerror` 确实收到，
		 *   而 harness 的**任何读数里都没有它**。
		 *
		 *   ⇒ 现形：装**收集器**，把三面并成一个可得读数：
		 *     · `jsdomError` —— 未捕获异常 / `Not implemented` 等（jsdom 的通道）
		 *     · `error`      —— 产物 `console.error(...)`
		 *     · `warn`       —— 产物 `console.warn(...)`（**只收不判**；§噪声白名单见下）
		 *   ★**`quiet` 仍是【活旋钮】**（两态各有用处，✗ 不可省 —— 见 `books#122` 折单）：
		 *     · `quiet: true`（缺省，CI 用）⇒ 只**收集**、✗ 回显 —— 否则 CI 日志被产物开局那批
		 *       `[RPG] 重复注册`（实测 11 行 `warn`）淹掉；
		 *     · `quiet: false`（排障用）⇒ **同时回声到 stderr**（行为与改造前一致）。
		 *     ⇒ ★**两态判据面相同**（`consoleMsgs` 都收全），差别**只在回显** ⇒ 判据不受 quiet 影响。
		 */
		virtualConsole: (() => {
			const vc = new env.VirtualConsole();
			const push = (kind) => (...a) => {
				const m = a.map((x) => (x && x.message) ? x.message : String(x)).join(' ');
				consoleMsgs.push({ kind, msg: m });
				/* ★回声分支：`quiet: false` 时把每行原样写 stderr（✗ 用 `console.log` —— 那会
				 *   经本收集器的 `log` 通道**回流**，自环）。⇒ 消费点在此，`quiet` 非死参数。 */
				if (!quiet) process.stderr.write(`[${kind}] ${m}\n`);
			};
			for (const k of ['jsdomError', 'error', 'warn', 'info', 'log', 'debug']) vc.on(k, push(k));
			return vc;
		})(),
	});
	await new Promise((r) => setTimeout(r, 400));           // 给产物内联脚本落地的时间
	const SC = dom.window.SugarCube;
	if (!SC?.Engine) throw new Error('产物里取不到 `SugarCube.Engine` ⇒ 产物不完整或 jsdom 未跑脚本');
	const E = SC.Engine;
	/* ★★`#91` 修正：**boot ＝ `runUserInit()` ＋ `start()` ＋ `play(start)`**。
	 *
	 *   病灶（原形＝`for (init, runUserScripts, runUserInit, start)`）：**装置偏差 —— 用户脚本束被跑第二遍**。
	 *   产物**加载期已自跑** `Engine.init()` ＋ `Engine.runUserScripts()`（SugarCube 的 jQuery-ready 序列）；
	 *   本装置再跑一遍 ⇒ 用户脚本束重执行 ⇒ 其内 `RPG.bindItemLinks()` 再绑一个委托，
	 *   而 `RPG.__itemLinksBound` 是**挂在新建的 `setup.RPG` 上**的守卫（每次重执行都换来一个新对象，
	 *   守卫随之归零）⇒ **守卫拦不住**（实测：`same obj=false`，`document` 上委托 **1 → 2**）。
	 *   ⇒ 凡「加载期一次性副作用」的计数类断言（绑定／注册／define）在该装置上**恒 2×**。
	 *
	 *   ★**三向读数**（同产物，本席实测；A/B 只差 `runUserScripts` 一步）：
	 *     真浏览器（Playwright chromium，玩家真实路径） ⇒ 委托 **1** ✓
	 *     本装置 旧形（含 `runUserScripts`）      ⇒ 委托 **2** ✗（装置造出的第二份）
	 *     本装置 新形（`start` ＋ `play`）         ⇒ 委托 **1** ✓ ——与真浏览器**一致**。
	 *   ★除该计数外**全同**：`state=idle`／`passage=开始`／五面板俱在／正文长度**逐字节相同**。
	 *
	 *   ⚠ **为何是「`runUserInit` ＋ `start`」这两个**（✗ 「跑得越全越保险」／✗ 「只跑 start 就够」）：
	 *     · `init`／`runUserScripts` **不可重跑**（产物已跑）⇒ 重跑的**唯一效果**就是造出那个第二份；
	 *     · `runUserInit`（⇒ `StoryInit`）**必须显式跑** —— `Engine.start()` 体内**不含它**
	 *       （机械核实 `vendor/format.js` 的 `start` 体：有 `State.restore()`、**无** `runUserInit`），
	 *       而产物自身那段挂在 `$window.width()` 上、**jsdom 下永不 resolve**。
	 *   ★**本席曾在此写错并被打红**（`#109` 首版只跑 `start()`）：`StoryInit` 静默没跑 ⇒
	 *     基线变量只有 3 个（正常 8）、`babelGiven=undefined` ⇒ 消费方（`#98` 的 `e2e-drive`）在 L1 抛
	 *     `Cannot read properties of undefined (reading 'L1')`。**装置少跑一步与多跑一步同样致命**，
	 *     而**这两种错都静默**（多跑 ⇒ 计数 2×；少跑 ⇒ 变量缺）。
	 *   ⚠ **若产物**将来**不再在加载期自跑**（例如换构建器／换 SugarCube 版本）⇒ 本形会退化成
	 *     「引擎停在 `init`、段落空」⇒ **下面那道 `Engine.state` 断言会当场报红**（✗ 静默退让）——
	 *     此处选**报红**而非「探测后二选一」：二选一会在两形都不对时**静默挑一个**，而报红能立刻指认前提变了。 */
	const r0 = E.runUserInit();          // ★须**显式**跑：`start()` 体内**不含** runUserInit（见下）
	if (r0?.then) await r0;
	const r1 = E.start();
	if (r1?.then) await r1;
	if (E.state === 'init') {
		throw new Error('`Engine.start()` 后仍在 `init` ⇒ 产物可能**不再在加载期自跑**用户脚本（前提变了）'
			+ '—— 见本函数注释 `#91`：此时应显式补 `init()/runUserScripts()`（✗ 静默二选一）');
	}
	const start = SC.Config?.passages?.start;
	if (!start) throw new Error('取不到 `Config.passages.start`（产物异常）');
	const t1 = Date.now();
	const r = E.play(start);
	if (r?.then) await r;
	const passage = (() => { try { return SC.State.passage; } catch { return null; } })();
	if (passage !== start) {
		throw new Error(`boot 后段落应为 ${JSON.stringify(start)}，实得 ${JSON.stringify(passage)}`
			+ '（★漏 `Engine.play(start)` 就会停在这里 —— 见文件头 ①）');
	}
	/* ★★**settle：必须让出至少一个宏任务**（本件最重要的读数，实测得来）。
	 *   病灶：`play(start)` 返回后**同一 tick 内**点链接 ⇒ 导航**发生了又立刻被 boot 的导航盖回**
	 *   ⇒ `State.passage` 读回**旧段**、**不抛错、不告警** ＝ **静默回退**。
	 *   实测（12 次一组的对照，`setTimeout` 前置）：
	 *       无 yield ⇒ **成功 0／失败 6**（且 12/12 同形）｜`setTimeout(0)` ⇒ **6/6**｜50ms ⇒ 6/6｜200ms ⇒ 6/6
	 *   ⇒ 一个**宏任务**即足（✗ 需大延时）——故此处让一脚，且**这不是「保险延时」，是必要条件**。
	 *   ★另：本席首版把此现象误记为「**机制**问题」（`dispatchEvent` 不导航）—— **那是我自己的读取数错**：
	 *     控制住 yield 后，`dispatch`／`click`／`jQuery.trigger` **三者皆导航**（见 `--selftest` 的 K2）。
	 *     真因是**同 tick**，✗ 机制。（教训：**探针相关性 ≠ 因果** —— 我先把「机制」当了因。） */
	await new Promise((r) => setTimeout(r, 0));
	return { dom, window: dom.window, SC, engine: E, doc: dom.window.document, bootMs: t1 - t0, playMs: Date.now() - t1, passage, consoleMsgs };
}

/** 切到指定段落（✗ 点链接 —— 这是**导航原语**，用于铺前置状态）。 */
export async function playPassage(session, name) {
	if (!session.SC.Story.has(name)) throw new Error(`不存在的段落：${JSON.stringify(name)}`);
	const r = session.engine.play(name);
	if (r?.then) await r;
}

/** 当前段落（可断言状态）。 */
export const currentPassage = (session) => { try { return session.SC.State.passage; } catch { return null; } };

/* ============================================================================
 * 三·五、★D7「未处理异常」判据（`books#105`）—— 把采集变**可判**
 * ==========================================================================*/
/** ★噪声白名单 —— **按实测建的**，✗ 非猜。
 *   实测（本席，冷 boot 一次）：`warn`×**11**（皆 `[RPG] …重复注册：已存在，将被覆盖。`）＋
 *     `jsdomError`×**2**（皆 `Not implemented: Window's scroll() method`）。
 *   前者＝产物**刻意**的重复注册提示（`#1863` 类），后者＝jsdom **未实现**的浏览器 API
 *   —— 两者都**不是**本仓缺陷 ⇒ 白名单收这两种**形状**（✗ 不收任意 warn）。
 *   ⚠ **白名单须窄**：宽到「凡 warn 皆放过」＝把判据变装饰（本舰队的恒绿门族）。 */
export const CONSOLE_NOISE = [
	/^\[RPG\] .*重复注册/,                    // 产物刻意的重复注册提示
	/^Not implemented: Window's scroll\(\)/,   // jsdom 未实现的 API
];

/** ★`#141` ②b：从「试玩终点」段的**正文文本**里取铁器读数（**纯函数** ⇒ 刀可直喂，照 E2 子条）。
 *  为何要它单独一格：该读数是**产物里的一个值**，而 `verify`／`scenario`／`check-refs` 判的是**结构·引用**，
 *  **无一读它** ⇒ `#141` ②b 的两轮病根（判据面错／作用域错）能**全绿过关**。这类值型判据只能由渲染面守。
 *  ⚠ 传**文本**而非 DOM：`#141` 的 `[undefined]` 是**渲染层**的形，取文本才判得到。
 *  返回 `{ raw, n }`：`n === null` ＝ **没渲染成一个数字**（含 `[undefined]`／该行缺失／被改写）。 */
export function ironReading(text) {
	const raw = (String(text).match(/身上的铁器：[^（]*/) ?? [''])[0].trim();
	const m = raw.match(/身上的铁器：\s*(\d+)\s*件/);
	return { raw, n: m ? Number(m[1]) : null };
}

/** D7 判据：**冷 boot 期**不得有「未处理异常」。
 *  读数 = `session.consoleMsgs` 里 **`jsdomError`**（未捕获异常/未实现 API 走此通道）
 *        ＋ **`error`**（产物 `console.error`）—— 两类**减去白名单**后须为空。
 *  返回 `{bad, ignored}`：`bad` = 真异常（须空）；`ignored` = 被白名单放过者（**出声**，✗ 静默）。
 *  ★**为何单列 `jsdomError` 而非「凡非空即红」**：白名单外的**任意** warn 也可能合法（如故事侧提示），
 *    一律判红会**假红**；而「未捕获异常」有确定形状（jsdom 的通道）⇒ 判据落在**确定面**上。 */
export function unhandledErrors(session) {
	const bad = [], ignored = [];
	for (const { kind, msg } of session.consoleMsgs) {
		if (kind !== 'jsdomError' && kind !== 'error') continue;      // warn 不判（见上）
		if (CONSOLE_NOISE.some((re) => re.test(msg))) { ignored.push(msg); continue; }
		bad.push(`[${kind}] ${msg}`);
	}
	return { bad, ignored };
}

/* ============================================================================
 * 三、★点故事链接（**内建「导航确已发生」断言** —— 本件存在的核心理由）
 * ==========================================================================*/
/** 故事内链接 = 有 `data-passage` **且**指向**非当前**段落。
 *   ⚠ 按 `href` 选会落到侧栏（Continue/Saves/…）—— 见文件头 ③。 */
export function storyLinks(session) {
	const cur = currentPassage(session);
	return [...session.doc.querySelectorAll('[data-passage]')]
		.filter((el) => { const v = el.getAttribute('data-passage'); return v && v !== cur; });
}

/** ★**段内可点项**（`books#382` 同批收口）：`<<link>>` 落地成 `#passages` 内的
 *   `<a class="link-internal macro-link">`（**✗ 不带 `data-passage`**）。
 *   `storyLinks()` 按 `data-passage` 找 ⇒ 这类入口**一个都找不到**（实测：当前段「开始」上正是两个 `<<link>>`）。
 *   ★取法与 `e2e-280-*` 族一致（那族已改用「段内 `a,button`」；本件此前停在 `[[…]]` 时代）。
 *   ★`data-passage` 那批**不在此列**（由 `storyLinks()` 负责 ⇒ ✗ 两边都算）。 */
export function 段内可点(session) {
	const 段 = session.doc.querySelector('#passages');
	if (!段) return [];
	return [...段.querySelectorAll('a,button')]
		.filter((el) => !el.hasAttribute('data-passage'))
		.filter((el) => (el.textContent ?? '').trim() !== '');
}

/**
 * ★点一个故事链接，**并断言导航真的发生**。
 *   ✗ 不返回 void —— 那会让调用方**对着过期 DOM 判**（本族最危险的形：不抛错、不改状态 ⇒
 *   「绿而判据未执行」，且**无法与「没跑」分辨**；实测 `dispatchEvent` 即此形）。
 * @param mechanism `'click'`（默认，`el.click()`）｜`'jquery'`｜`'dispatch'`（**已知静默形，仅供刀用**）
 * @throws 目标不存在 / 点了没导航 / 导航到**别的**段落
 */
/** ★判据本体（**纯函数** ⇒ 刀可直喂；照 E2 子条『抽纯函数，✗ 埋 `main()`』）：
 *   「点了之后**导航确已发生**」是硬结论 —— ✗ 返回 void（那会让调用方对着过期 DOM 判）。
 *   ⚠ 本函数是 `clickPassage` 的唯一判决点（✗ 判据散在两边 —— 那样刀只能喂一半）。 */
export const assertNavigated = (before, after, want, mechanism) => {
	if (after === before) {
		throw new Error(`★点了 ${JSON.stringify(want)} 但段落**未变**（仍 ${JSON.stringify(before)}）`
			+ `　—— 机制 ${JSON.stringify(mechanism)} 未导航（✗ 静默放过：那会让后续断言对着**过期 DOM** 判）`);
	}
	if (after !== want) throw new Error(`点了 ${JSON.stringify(want)} 却导航到 ${JSON.stringify(after)}（≠ 目标）`);
	return after;
};

export async function clickPassage(session, { to = null, mechanism = 'click' } = {}) {
	const cur = currentPassage(session);
	const links = storyLinks(session);
	let el = to == null ? links[0] : links.find((x) => x.getAttribute('data-passage') === to);
	let want = el ? el.getAttribute('data-passage') : null;
	/* ★★兜底（**只对 `to == null` 这一支**，✗ 不动 `to` 具名的语义）：段内 macro-link（`<<link>>` 形）。
	 *   它的**目标段落事前不可知**（✗ 无 `data-passage`）⇒ ★判据只断「**导航确已发生**」，
	 *   ✗ 不假装知道目标名 —— 而「点的动作真导航了」正是本件存在的核心理由 ✓。 */
	let 是段内链 = false;
	if (!el && to == null) {
		el = 段内可点(session)[0] ?? null;
		if (el) { 是段内链 = true; want = `（段内链「${(el.textContent ?? '').trim().slice(0, 20)}」·目标由故事决定）`; }
	}
	if (!el) {
		throw new Error(`无可点故事链接${to ? `（要找 ${JSON.stringify(to)}）` : ''}：当前段 ${JSON.stringify(cur)}`
			+ `；页面上 data-passage 目标 = ${JSON.stringify([...session.doc.querySelectorAll('[data-passage]')].map((x) => x.getAttribute('data-passage')))}`
			+ `；段内可点项 = ${JSON.stringify(段内可点(session).map((x) => (x.textContent ?? '').trim().slice(0, 24)))}`);
	}
	if (mechanism === 'jquery') {
		const $ = session.window.jQuery;
		if (!$) throw new Error('产物里无 jQuery（mechanism=jquery 不可用）');
		$(el).trigger('click');
	} else if (mechanism === 'dispatch') {
		el.dispatchEvent(new session.window.MouseEvent('click', { bubbles: true, cancelable: true, view: session.window }));
	} else {
		el.click();
	}
	await new Promise((r) => setTimeout(r, 120));            // 让导航落地
	const now = currentPassage(session);
	if (是段内链) {
		/* ★macro-link 支：只断「**导航确已发生**」（✗ 不断目标名 —— 事前不可知） */
		if (now === cur) {
			throw new Error(`★点了 ${want} 但段落**未变**（仍 ${JSON.stringify(cur)}）`
				+ `　—— 机制 ${JSON.stringify(mechanism)} 未导航（✗ 静默放过：后续断言会对着**过期 DOM** 判）`);
		}
		return now;
	}
	try {
		return assertNavigated(cur, now, want, mechanism);
	} catch (e) {
		/* ★有界重试**一次**：`boot()` 的 settle 已使「同 tick」形不可能，但若一次未落地，
		 *   吸收它；**终判仍是「导航确已发生」**（✗ 不削弱判据 —— 重试后仍不动则照抛）。 */
		await new Promise((r) => setTimeout(r, 50));
		return assertNavigated(cur, currentPassage(session), want, mechanism);
	}
}

/* ============================================================================
 * 四、面板读取（P0/P1 机械子集的断言面）
 * ==========================================================================*/
/** 五个面板的宿主与文本（`hp`/`location`/`trauma`/`inventory`/`notice`）。
 *   ⚠ 失败**具名**（缺面板即抛 ⇒ ✗ 返回空串让调用方以为「读到了空」）。 */
export function panels(session, ids = ['hp', 'location', 'trauma', 'inventory', 'notice']) {
	const out = {};
	for (const id of ids) {
		const host = session.doc.querySelector(`[data-panel="${id}"]`);
		if (!host) throw new Error(`面板宿主缺失：[data-panel="${id}"]（✗ 静默返回空 —— 那会把「面板没了」读成「面板是空的」）`);
		out[id] = (host.textContent ?? '').replace(/\s+/g, ' ').trim();
	}
	return out;
}

/** 宿主与面板注册表是否双向一致（`#1798` B1 面）。 */
export function panelHostsConsistent(session) {
	const declared = [...session.doc.querySelectorAll('[data-panel]')].map((x) => x.getAttribute('data-panel'));
	const registered = [...(session.SC.setup?.RPG?.panels?.keys?.() ?? [])];
	return { declared, registered, missing: registered.filter((r) => !declared.includes(r)), extra: declared.filter((d) => !registered.includes(d)) };
}

/* ============================================================================
 * 五、CLI（`--selftest` 刀 ／ 冒烟 ／ `--list`）
 * ==========================================================================*/
if (import.meta.filename === process.argv[1]) {
	/* ★失败形＝**干净红 ＋ 汇总** ＋ **恒绿门自证**（与 `stories/babel/verify.mjs`／
	 *   `tests/scenario/run.mjs` 同形 —— 本舰队的老教训：汇总被搬走 ⇒ 断言全成装饰）。 */
	const fails = [];
	let summaryPrinted = false;
	const printSummary = (msg) => {
		if (summaryPrinted) return;
		summaryPrinted = true;
		if (msg) fails.push(msg);
		console.log('');
		for (const f of fails) console.log(`  ✗ ${f}`);
		console.log(fails.length === 0 ? '\n✓ e2e harness 通过' : `\n✗ e2e harness 失败 ${fails.length} 条`);
		process.exit(fails.length === 0 ? 0 : 1);
	};
	process.on('uncaughtException', (e) => printSummary(`★未捕获异常：${e?.message ?? e}`));
	process.on('unhandledRejection', (e) => printSummary(`★未处理的拒绝：${e?.message ?? e}`));
	process.on('exit', () => {
		if (!summaryPrinted) { console.log('\n✗ e2e harness 失败 1 条\n  ✗ ★恒绿门：正常结束却从未打印汇总'); process.exitCode = 1; }
	});

	/* ★用法/环境错走 `bail()`：**先声明「汇总已打印」再退**。
	 *   病灶（本席实测）：裸 `process.exit(2)` 会被下面的**恒绿门**兜底覆写成 **1**
	 *   ⇒ `--engine` 缺失报的是「★恒绿门：正常结束却从未打印汇总」—— **归因错**（真因是用法错），
	 *     且**退出码也错**（2 变 1：调用方分不清「用法错」与「有红」）。
	 *   ⇒ 与本席在 `books#81` 折过的「validate 失败支裸 exit ⇒ 恒绿门误归因」**同一条**。 */
	const bail = (msg, code = 2) => { summaryPrinted = true; console.error(`✗ ${msg}`); process.exit(code); };

	let env;
	try { env = resolveEnv(argOf('--engine')); }
	catch (e) { bail(e.message, 2); }

	/* ---------- 刀：证明本件**判得了**（✗ 只证明「跑得动」） ---------- */
	if (has('--selftest')) {
		const s = await boot(env);
		const K = [];
		const expectThrow = async (name, fn, mustMatch) => {
			let err = null;
			try { await fn(); } catch (e) { err = String(e?.message ?? e); }
			const ok = err !== null && new RegExp(mustMatch).test(err);
			K.push([ok, name, err ? err.slice(0, 96) : '（✗ 未抛 —— 判据没生效）']);
		};
		/* ★K8 **最先**（它测的是 **boot 落点**）：若排在导航刀之后 ⇒ 会话状态已变 ⇒ **假红**
		 *   （本席首版即栽在此：K2 导航到 `L1 苏醒` 后 K8 去断「= start」⇒ 红）。**刀之间共享会话 ⇒ 次序即依赖。** */
		{
			const p = currentPassage(s);
			K.push([p === s.SC.Config.passages.start, 'K8 ★boot 须落在 `start` 段落（✗ 停在 idle 就空 → 见文件头 ①）', JSON.stringify(p)]);
		}
		/* ★K9（`#91` 新增）：**boot 不得重跑用户脚本束** —— 直接量「加载期一次性副作用」的**计数**。
		 *
		 *   为何非加不可：这是**装置自己造出来的假量**（文件头 ④′）。旧形 boot（含 `runUserScripts`）
		 *   会把 `.rpg-item-link` 委托绑到 **2**，而真浏览器是 **1** ⇒ 一切计数类断言读成 **2×**。
		 *   本刀**开一条新会话**（✗ 用共享的 `s` —— 计数须从加载瞬间起算，共享会话已经过导航）。
		 *
		 *   判据取「**有效**委托数」：同样 selector 的委托多于 1 条即说明用户脚本束被执行了不止一次。
		 *   ⚠ **对照臂必需**：只断「=== 1」的话，**「selector 拼错 ⇒ 数到 0」也会″通过″吗？**不会（0≠1）——
		 *     但「jQuery 内部结构变了 ⇒ 永远数到 0」会**假红**，故同时**断非 0** 与**断 === 1**，
		 *     并把原给读数印出来，使「数不到」与「真的多绑了」**在输出上可分辨**。 */
		{
			const s2 = await boot(env);
			try {
				const jq = s2.window.jQuery;
				const ev = jq?._data?.(s2.doc, 'events');
				const sel = (ev?.click ?? []).filter((h) => String(h.selector ?? '').includes('rpg-item-link')).length;
				const rpg = s2.SC?.setup?.RPG;
				K.push([rpg !== undefined, 'K9a 对照臂：`setup.RPG` 可得（✗ 取不到时 K9b 的读数不可信）', String(typeof rpg)]);
				K.push([sel === 1, 'K9b ★装置**不得重跑用户脚本束**（`.rpg-item-link` 委托须 = 1；真浏览器读数；旧 5 步形 ⇒ 2）', `委托=${sel}`]);
				K.push([ev !== undefined, 'K9c 对照臂：jQuery 事件表可读（✗ 读到 undefined 时 K9b 的 0/1 无意义）', String(ev === undefined)]);
				/* ★K9d（tester-4 RC 后补）：**断 StoryInit 变量在位** —— K9a/b/c 断的是 `setup.RPG`／委托／事件表，
				 *   **无一断变量** ⇒ 首版「只跑 `start()`」（漏 `runUserInit`）时 **13 刀全绿而程序是坏的**
				 *   （`babelGiven=undefined` ⇒ 消费方在 L1 抛）。**这正是缺的那一格。**
				 *
				 *   判据取**两点**，因为单点都能被「另一种坏法」骗过：
				 *     (a) 变量**总数** —— 首版实测 3（正常 8）⇒ 断 `>= 8`（✗ 断 `=== 8`：产品加变量不应假红）
				 *     (b) **StoryInit 特有的键**在位且非 undefined —— `babelGiven`（故事侧 `StoryInit` 写的）
				 *   ⚠ 对照臂：同时印出实得键集，使「少跑 StoryInit」与「改了变量名」**输出上可分辨**。 */
				const vars = s2.SC?.State?.variables ?? {};
				const nv = Object.keys(vars).length;
				K.push([nv >= 8, 'K9d ★`StoryInit` 须真跑（变量数 ≥8；漏 `runUserInit` 时实测 3）', `变量=${nv}`]);
				K.push([vars.babelGiven !== undefined, 'K9e ★`StoryInit` 写的键在位（`babelGiven`；✗ undefined ⇒ 消费方如 `#98` 的 e2e-drive 会在 L1 抛）', JSON.stringify(Object.keys(vars))]);
			} finally { s2.dom.window.close(); }
		}
		/* ★K1／K1b：**直喂纯函数** `assertNavigated`（✗ 靠会话构造 —— `State.passage` 只有 getter，
		 *   我首版想「人为把 passage 设回」⇒ `Cannot set property passage` ⇒ **构造无效**）。
		 *   两向都要：**未变⇒抛**（本支）＋ **正常导航⇒不抛**（对照臂 K1b，✗ 只测一向会把「恒抛」判成通过）。 */
		await expectThrow('K1 ★`assertNavigated`：**未变 ⇒ 抛**（静默回退形，判据与机制无关）',
			async () => { assertNavigated('开始', '开始', 'L1 苏醒', 'click'); }, '未变');
		{
			let err = null;
			try { assertNavigated('开始', 'L1 苏醒', 'L1 苏醒', 'click'); } catch (e) { err = String(e.message); }
			K.push([err === null, 'K1b 对照臂：**正常导航 ⇒ 不抛**（✗ 只测 K1 会把「恒抛」判成通过）', err ? err.slice(0, 60) : '']);
		}
		await expectThrow('K1c ★导航到**别的**段（≠ 目标）⇒ 也须抛（✗ 只判「变了没有」不够）',
			async () => { assertNavigated('开始', 'L3 溪谷', 'L1 苏醒', 'click'); }, '≠ 目标');
		/* K2：导航原语本身有效（✗ 只有 K1 ⇒ 可能「全都不导航」也过） */
		{
			await playPassage(s, s.SC.Config.passages.start);
			const before = currentPassage(s);
			const after = await clickPassage(s);
			K.push([after !== before, 'K2 对照臂：默认机制**确实导航**（✗ 只测 K1 会把「全不导航」判成通过）', `${before} → ${after}`]);
		}
		/* K11（`books#105` D7 的**自证刀**）：注入一个未捕获异常 ⇒ `unhandledErrors` 须抓到它。
		 *   ✗ 只证「采集桶非空」（那会被产物开局的 warn 满足）——须证**判据本身**认得出「未处理」。 */
		{
			const before = unhandledErrors(s).bad.length;
			s.window.setTimeout(() => { throw new Error('K11-D7-PROBE'); }, 0);
			await new Promise((r) => setTimeout(r, 60));
			const after = unhandledErrors(s).bad;
			K.push([after.length > before && after.some((m) => /K11-D7-PROBE/.test(m)),
				'K11 ★D7：注入未捕获异常 ⇒ 判据须抓到（✗ 恒绿地放过）',
				`注入前 ${before} ⇒ 后 ${after.length}｜${after.slice(-1)[0]?.slice(0, 60)}`]);
			/* 对照臂：白名单本身须**只**放过形状内的东西 —— 拿一条**白名单外**的注入证明它不吞 */
			K.push([!CONSOLE_NOISE.some((re) => re.test('Uncaught [Error: K11-D7-PROBE]')),
				'K11b 对照臂：白名单**不吞**未捕获异常（✗ 宽到「凡 jsdomError 皆放过」即装饰）',
				'K11-D7-PROBE 未被白名单匹配 ✓']);
		}
		/* K12（`books#122` 折单的自证刀）：`quiet` 须是**活旋钮**（有消费点），✗ 死参数。
		 *   病灶（dev-10 的 D RC，我实测复现）：采集器改造后 `quiet` **无消费点** ⇒ `quiet:false`
		 *   与 `true` 行为**完全相同**（两臂 stderr 皆 0；改造前 `false` ⇒ 13 行产物输出）
		 *   ＝「旋钮无消费点」⇒ 判据须证【两态行为真有差异】，✗ 只证"参数在签名里"。 */
		{
			const { spawnSync } = await import('node:child_process');
			const probe = `const {resolveEnv,boot}=await import(${JSON.stringify(import.meta.url)});`
				+ `const e=resolveEnv(${JSON.stringify(env.root)});`
				+ `const s=await boot(e,{quiet:false});process.exit(s.consoleMsgs.length?0:1);`;
			/* ★两臂：同探针、唯一变量 = quiet ⇒ stderr 长度须**不同** */
			const run = (quietVal) => {
				/* ★用 `spawnSync`（✗ `execFileSync`）：后者**只在非零退出时才带 stderr** ——
				 *   本探针两臂都 exit 0 ⇒ stderr 恒空 ⇒ **刀会假红**（我首版即栽在此）。 */
				const r = spawnSync(process.execPath, ['--input-type=module', '-e',
					probe.replace('{quiet:false}', `{quiet:${quietVal}}`)],
					{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 });
				return { out: r.stdout ?? '', err: r.stderr ?? '' };
			};
			const loud = run(false), hush = run(true);
			K.push([loud.err.length > hush.err.length,
				'K12 ★`quiet` 须是【活旋钮】：`quiet:false` 的回显须**多于** `true`（✗ 死参数 ⇒ 两态同形）',
				`loud stderr=${loud.err.length}B ／ hush stderr=${hush.err.length}B`]);
		}
		/* ★K13b：**刀直喂纯函数**（照 E2 子条：抽纯函数 ⇒ 刀不必造整场会话）——
		 *   喂 `#141` 第二轮**真实出现过**的形，判据须**分别**判对（✗ 只喂好形 ＝ 装饰）。 */
		{
			const good = ironReading('身上的铁器：2 件（备注）');
			const undef = ironReading('身上的铁器：[undefined] 件');
			const missing = ironReading('这一局你爬了：最深处 L20');
			const nonnum = ironReading('身上的铁器：零 件');
			K.push([good.n === 2, 'K13b 好形：`身上的铁器：2 件` ⇒ 读出 2', `n=${good.n}`]);
			K.push([undef.n === null, 'K13b ★`[undefined]` 形（`#141` 第二轮真形）⇒ 须报「不是数字」', `n=${undef.n}`]);
			K.push([missing.n === null, 'K13b 该行缺失 ⇒ 须报「不是数字」（✗ 静默 0 ＝ 把「没渲染」读成「0 件」）', `n=${missing.n}`]);
			K.push([nonnum.n === null, 'K13b 非阿拉伯数字 ⇒ 须报「不是数字」（✗ 只判存在性即可被非数值蒙混）', `n=${nonnum.n}`]);
		}
		await expectThrow('K3 找不到目标链接 ⇒ 须抛（✗ 静默用别的链接顶上）',
			() => clickPassage(s, { to: '不存在的段落-xyz' }), '无可点故事链接');
		await expectThrow('K4 面板缺失 ⇒ 须抛（✗ 静默返回空串 —— 那会把「面板没了」读成「面板是空的」）',
			() => panels(s, ['nosuchpanel']), '面板宿主缺失');
		{
			const p = panels(s);
			K.push([Object.keys(p).length === 5 && p.hp.length > 0, 'K5 五面板可读且**非空**（`hp` 等）', JSON.stringify(p).slice(0, 80)]);
		}
		{
			const h = panelHostsConsistent(s);
			K.push([h.missing.length === 0 && h.extra.length === 0, 'K6 面板宿主 ↔ 注册表**双向**一致', `declared=${h.declared.length} registered=${h.registered.length}`]);
		}
		{
			const ls = s.window.localStorage;
			ls.setItem('e2e-probe', 'v');
			K.push([ls.getItem('e2e-probe') === 'v', 'K7 `localStorage` 可用（存读往返面）', 'ok']);
		}
		/* ─── `#1877` P1-3：面板重绘**保留 <details> 开合**（本件是**唯一有真 DOM** 的门 ⇒ 该面归此）───
		 * ★为何不归 `verify.mjs`：那件是**无 DOM 环境**（`document` 是桩、无 jQuery）⇒
		 *   在那儿判会**假红**（我实际踩过）。⇒ 分工：verify 守静态接线，本件守运行时行为。 */
		{
			const R = s.SC.setup.RPG;
			R.perform('K10 探针行 A');
			R.perform('K10 探针行 B');
			R.refreshPanels(['notice']);
			const boxAt = () => s.doc.querySelector('[data-panel="notice"] .rpg-notice-box');
			const box0 = boxAt();
			if (!box0) K.push([false, 'K10 ★`#1877` P1-3：通知面板里没有 `.rpg-notice-box`', '选择器失效 ⇒ 本条无法判']);
			else {
				box0.open = true;
				R.refreshPanels(['notice']);
				const box1 = boxAt();
				K.push([box1 && box1.open === true,
					'K10 ★★`#1877` P1-3：展开后一次刷新**仍展开**（✗ 旧形折回默认 ⇒ 玩家看到「计数在涨、列表恒空」）',
					`refresh 后 open=${box1 && box1.open}`]);
				/* 切档重绘（点开关）—— 旧形同样折回 */
				const tg = s.doc.querySelector('[data-panel="notice"] .rpg-notice-toggle');
				if (tg) {
					s.window.jQuery(tg).trigger('click');
					const box2 = boxAt();
					K.push([box2 && box2.open === true, 'K10b ★切档（全部/仅关键）重绘后仍展开', `toggle 后 open=${box2 && box2.open}`]);
				}
			}
		}
		let bad = 0;
		for (const [ok, name, detail] of K) { if (!ok) bad++; console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — ${detail}`}`); }
		console.log(bad === 0 ? `\n✓ 自检全部如期（${K.length}/${K.length} 刀）` : `\n✗ ${bad}/${K.length} 刀未如期`);
		s.dom.window.close();
		/* ★走 `printSummary`（✗ 裸 exit）—— 裸退会触发**恒绿门**兜底 ⇒ 报**错误归因**
		 *   （把「刀红了」报成「从未打印汇总」），正是我让 books#81 折过的那条。 */
		if (bad !== 0) fails.push(`自检 ${bad}/${K.length} 刀未如期`);
		summaryPrinted = true;                 // 自检自带汇总 ⇒ 声明已打印（✗ 让恒绿门再报一次）
		process.exit(bad === 0 ? 0 : 1);
	}

	/* ---------- 冒烟：产物级 P0/P1 机械子集 ---------- */
	if (has('--list')) {
		console.log('  可判面：boot ／ 三终点出口（可点性）／ 存读往返 ／ 五面板文本与宿主一致 ／ localStorage');
		summaryPrinted = true;                    // ★同 bail：✗ 让恒绿门把 rc=0 覆写成 1
		process.exit(0);
	}
	const s = await boot(env);
	console.log(`  产物：${path.relative(repoRoot, env.htmlPath)}｜boot ${s.bootMs}ms ＋ play ${s.playMs}ms`);
	console.log(`  boot 落点：段落 ${JSON.stringify(s.passage)}`);
	{
		const p = panels(s);
		console.log(`  五面板：${Object.entries(p).map(([k, v]) => `${k}=${JSON.stringify(v.slice(0, 18))}`).join(' ｜ ')}`);
		const h = panelHostsConsistent(s);
		if (h.missing.length || h.extra.length) fails.push(`面板宿主↔注册表不一致：缺 ${JSON.stringify(h.missing)}／多 ${JSON.stringify(h.extra)}`);
		else console.log(`  宿主↔注册表：${h.registered.length} 个双向一致 ✓`);
	}
	/* 出口可点性（P0-2 族）：当前段有可点故事链接 ⇒ 点它并断言**导航发生** */
	try {
		const links = storyLinks(s).map((x) => x.getAttribute('data-passage'));
		console.log(`  可点故事链接：${JSON.stringify(links)}`);
		if (links.length === 0) fails.push('当前段无任何可点故事链接（出口面判据失效 ⇒ 须复核该段是否本该有出口）');
		else {
			const from = currentPassage(s);
			const to = await clickPassage(s);
			console.log(`  点击：${JSON.stringify(from)} → ${JSON.stringify(to)} ✓（导航已断言）`);
		}
	} catch (e) { fails.push(`出口可点性：${e.message}`); }
	/* ★K13（`books#105` e2e 补口 · `#141` ②b 两轮 RC 之后）：**终点的读数须真的渲染成一个数字** ——
	 *   动因：`#141` ②b 的两轮病根（第一轮＝判据取了一个**不承载该值的面**；第二轮＝`.twee` 里**裸 `RPG` 未绑定**）
	 *   **都通过了全部结构门**（`verify`／`scenario`／`check-refs` 判装配·场景链·引用，**无一读这个值**）。
	 *   ⇒ 这类**值型判据**只能由**渲染面**守。
	 *   ★**两臂**（✗ 单臂）：背包只放原料 ⇒ 读 "0 件"；再加两件成品 ⇒ 读 "2 件"。
	 *     若实现是**恒 0／常量／`[undefined]`** ⇒ **两臂必同形** ⇒ 本格红（`#141` 两轮都会在此被抓）。
	 *   ★读数用 **`.textContent`**（✗ 只数 `<p>` —— 本仓段落正文走 `<br>` 与 `<li>`，只认 `<p>` 会**假空**）。 */
	{
		const R = s.SC.setup.RPG;
		const ironLine = async () => {
			await playPassage(s, '试玩终点');
			await new Promise((r) => setTimeout(r, 60));
			const t = ([...s.doc.querySelectorAll('#passages .passage')].pop()?.textContent ?? '');
			return ironReading(t);
		};
		try {
			const inv = s.SC.State.variables.inventory;
			for (const x of [...inv]) if (String(x.id).startsWith('iron-')) inv.splice(inv.indexOf(x), 1);
			R.give('iron-ore');
			const a = await ironLine();
			R.give('iron-longsword'); R.give('iron-battleaxe');
			const b = await ironLine();
			if (a.n === null || b.n === null)
				fails.push(`K13 终点读数**未渲染成数字**：原料臂=${JSON.stringify(a.raw)} 成品臂=${JSON.stringify(b.raw)}`
					+ '（⇒ `<<set>>` 求值失败／段落未渲染；★`#141` 第二轮的 `[undefined]` 即此形）');
			else if (a.n !== 0 || b.n !== 2)
				fails.push(`K13 终点读数**值不对**：原料臂应为 0、成品臂应为 2，实得 ${a.n}／${b.n}`
					+ '（⇒ 判据面错[如取条目上不存在的字段] 或 未排除原料）');
			else console.log(`  K13 终点读数：原料臂=${a.n} 件｜成品臂=${b.n} 件 ✓（两臂有差异 ⇒ 判据非装饰）`);
		} catch (e) { fails.push(`K13 终点读数：${e.message}`); }
	}
	/* ★K14（同上）：**面板与状态同步**这条判据本身**看得见不同步**（`#134` 的运行时面）——
	 *   动因：`verify.mjs` 自己声明「P1-3 运行时面**归 e2e**」，而 e2e 此前**无此例** ⇒ 「转包未兑现」。
	 *   ★本格先证**判据有判别力**：故意只改状态、不刷面 ⇒ **须读出「不同步」**；
	 *     再审**产品的同步通路**：发 `battle:turnEnd`（产品的挂点）⇒ 面板须**追平状态**。 */
	{
		const R = s.SC.setup.RPG, D = s.SC.setup.DND3;
		const domHp = () => (panels(s, ['hp']).hp ?? '').replace(/\s+/g, ' ').trim();
		try {
			/* ★先回到 boot 落点段：面板宿主须在**当前段**（⚠ 本格曾因排在 K13 的导航之后而**假红** ——
			 *   `refreshPanels` 对「宿主不在本段」的面是 **skip**，于是「没刷」被读成「订阅没生效」。见 K8 的同族注）。 */
			await playPassage(s, s.SC.Config.passages.start);
			await new Promise((r) => setTimeout(r, 40));
			R.refreshPanels(['hp']);
			const before = D.Player.hp;
			/* ★NIT-1（`dev-9`）：✗ 用 `before - 3` —— `before ≤ 3` 时它**退化成 no-op**（值没变而判「判别力不足」）
			 *   ⇒ 本格会**假红**。改成**必然不同**的量（−1；面板渲染 `hp / maxHp` ⇒ 任一变化皆改文本），
			 *   并把「够不够改」**前置成断言**（✗ 静默退化）。 */
			if (!(before > 1)) fails.push(`K14 前置：\`D.Player.hp\`=${before}（≤1）⇒ 造不出「必然不同」的读数（本格判别力面失效）`);
			D.Player.hp = before > 1 ? before - 1 : before + 1;      // 两条路都**必然不同**（只改状态，不刷面）
			const stale = !domHp().includes(String(D.Player.hp));
			if (!stale) fails.push('K14 判别力不足：改了状态而未刷面，面板却已同步 ⇒ 本格**看不出不同步**（判据是装饰）');
			R.events.emit('battle:turnEnd', Object.freeze({ round: 1 }));
			const synced = domHp().includes(String(D.Player.hp));
			if (stale && !synced) fails.push(`K14 ★面板未随 \`battle:turnEnd\` 追平状态：面板=${JSON.stringify(domHp())} 状态 hp=${D.Player.hp}`
				+ '（⇒ 订阅未生效／写错标识符 —— `#137` 的 `R.refreshPanels?.()` 即此形）');
			if (stale && synced) console.log(`  K14 面板：先读出不同步（判别力 ✓）⇒ 发 \`battle:turnEnd\` 后追平 ${D.Player.hp} ✓`);
			D.Player.hp = before; R.refreshPanels(['hp']);
		} catch (e) { fails.push(`K14 面板同步：${e.message}`); }
	}
	/* ★D7（`books#105`）：**未处理异常**——采集减去白名单后须为空 */
	{
		const { bad, ignored } = unhandledErrors(s);
		if (ignored.length) console.log(`  D7 白名单放过：${ignored.length} 条（噪声，✗ 判红）`);
		if (bad.length) fails.push(`D7 未处理异常 ${bad.length} 条：${bad.slice(0, 3).join(' ｜ ')}`);
		else console.log(`  D7 未处理异常：0 ✓（采集 ${s.consoleMsgs.length} 条，白名单放过 ${ignored.length}）`);
	}
	/* 存读往返（P0-1 族的最小机械面：存储可用性） */
	{
		const ls = s.window.localStorage;
		ls.setItem('e2e-probe', 'v');
		if (ls.getItem('e2e-probe') !== 'v') fails.push('localStorage 存读往返失败');
		else console.log('  localStorage 往返 ✓');
	}
	s.dom.window.close();
	printSummary();
}
