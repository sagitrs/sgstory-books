/* 巴别场景链 · `run.mjs`（`#1814` 末件）—— **单源清单喂两层**
 *
 * 它回答一个问题：**「这份场景圣经，还跟得上故事吗？」**
 *   —— 走 `stories/babel/scenarios/scenarios.json`（单源）逐条核：入口态能不能落地、
 *      动作是不是**真实入口**、渲染断言点名的面板**在不在**。
 *
 * ⚠ **本脚本判什么、不判什么（先说清，✗ 不含糊）**
 *   截至本笔，`scenarios.json` 的 `入口态.fixture`／`断言` 是**散文**（人读的 spec），
 *   ✗ 可执行数据 ⇒ **语义断言本轮判不了**。故：
 *     · **判**（机械可判 ⇒ 能红）：①`validate.mjs` 全绿（清单不合形 ⇒ 全停）
 *       ②入口态若形如 id ⇒ **须实存**（地点）③`动作`须是**该地点真实入口动作**的文案（圣经↔故事**漂移即红**）
 *       ④渲染断言点名的面板须**已注册**且 `panelHTML` 打得出来、`data-panel` 宿主一致
 *     · **不判**（进 `NOT_JUDGED` **明账**，**每次打印**）：语义断言本身（散文）—— 逐条列，✗ 不静默
 *   ⇒ **明账是棘轮**：等作者侧把 `入口态`／`断言` 升成可执行数据（`#1814` 甲），未判面**逐条递减**。
 *   ★**为何不「先绿着」**：按散文硬判必然产出「绿 ＋ 一堆无人看的打印」——
 *     那正是本舰队反复在打的**假保险**（`⚠` 被日志吞＝事实上的静默）。宁可**明账可见**，✗ 假装判过。
 *
 * 渲染层口径（领队 2026-10-01 裁2）：用**引擎自带**的 `RPG.panelHTML`／`RPG.panelRenderCount`
 *   （`src/core/72-panel.js`）做**串级结构断言**，✗ jsdom ——
 *   实证 jsdom 在 CI **不可达**（引擎无 `package.json`、`node_modules` 被 gitignore、workflow 无 `npm install`），
 *   且 `tests/unit/framework/host.js` **明示「不使用 jsdom」**。（给 books 引首例 node 依赖＝改舰队零依赖基线 ⇒ 搁置候 Admin。）
 *
 * 用法：
 *     node tests/scenario/run.mjs --engine <引擎检出目录> [--only <场景 id>] [--list]
 *     node tests/scenario/run.mjs --selftest          # 刀（自证判据红得了）
 * 退出码：0 全过；1 有红；2 用法/环境错（引擎根不对、清单缺失）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawnSync } from 'node:child_process';

const here = import.meta.dirname;                    // …/tests/scenario
const repoRoot = path.resolve(here, '..', '..');     // books 仓根
const scenariosPath = path.join(repoRoot, 'stories', 'babel', 'scenarios', 'scenarios.json');
const validatePath = path.join(repoRoot, 'stories', 'babel', 'scenarios', 'validate.mjs');
const baselinePath = path.join(here, 'not-judged-baseline.json');

const argOf = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
const has = (f) => process.argv.includes(f);

/* ============================================================================
 * 一、判据（**纯函数** ⇒ 刀可直喂；照 E2 子条「抽纯函数，✗ 埋 main()」）
 * ==========================================================================*/

/** `入口态.fixture` 里「形如 id」的判据：**无空白、无全角/中文、长度有界**。
 *   用意：把「`L20-forge`」与「`二段遭遇态`」「`取得 iron-ore ＋ iron-message 的态`」分开 ——
 *   前者**可核实存**（该红就红），后者是**散文**（进明账）。
 *   ★判据须**可被刀直喂**，故独立成函数（✗ 内联在解析里）。 */
export const looksLikeId = (s) => typeof s === 'string' && s.length > 0 && s.length <= 60
	&& !/[\s\u3000]/.test(s) && !/[\u4e00-\u9fff\uff08\uff09\uff0c\u3001]/.test(s);

/** 从渲染断言里取**字面**面板名（`data-panel="location"` ⇒ `location`）。
 *   ⚠ `data-panel="<名>"` 这类**占位**（尖括号）**不算字面** ⇒ 跳过（✗ 当成面板名去判——那会**假红**）。 */
export const panelRefs = (text) => {
	const out = new Set();
	for (const m of String(text ?? '').matchAll(/data-panel="([^"]+)"/g)) {
		const id = m[1];
		if (id.includes('<') || id.includes('{')) continue;   // 占位形 ⇒ ✗ 不判
		out.add(id);
	}
	return out;
};

/**
 * 核心判据：喂「清单 ＋ 故事事实」⇒ 红面 ＋ 未判明账。
 * @param scenarios 场景数组（`scenarios.json` 的 `场景`）
 * @param facts     `{ locations:Set, storyInit:Object|null, actionsAt:(locId)=>string[], panels:Set, panelHTML:(id)=>string, engineFixtures:Set }`
 * @returns `{ reds:[], notJudged:[], checked:number }`
 */
export const judgeScenarios = (scenarios, facts) => {
	const reds = [];
	const notJudged = [];
	const kinds = {};                       // ★`#81` RC①：明账按**类目**计数（供基线棘轮）
	const note = (kind, msg) => { notJudged.push(msg); kinds[kind] = (kinds[kind] ?? 0) + 1; };
	let checked = 0;
	for (const sc of scenarios) {
		const id = sc?.id ?? '(无 id)';
		const fixture = sc?.['入口态']?.['fixture'];
		/* ① 入口态：形如 id ⇒ **须实存**（地点 / 引擎夹具）；散文 ⇒ 明账 */
		let locId = null;
		if (looksLikeId(fixture)) {
			if (facts.locations.has(fixture)) {
				locId = fixture;
				checked += 1;
				/* ★★**进得去才算落地**（本席实测：`fixture=L1` 【真地点 id】经「形如 id ⇒ 须实存」支后
				 *   下游抛 `Cannot read properties of undefined (reading 'L1')`）——
				 *   地点可达但**进不去**，等于该入口态**未落地**：
				 *     · **无引擎 API** ⇒ 连试都不能试 ⇒ 明账（✗ 静默当已验证）
				 *     · 有 API 却**抛** ⇒ **红**（带具名因 ＋ 那是措辞问题，✗ 只是运行期事故）
				 *   `facts.storyInit == null` 时不试（判据取不到料须显形，✗ 静默当原地）。 */
				if (facts.canEnter === true && facts.storyInit != null) {
					try {
						facts.enterLoc(fixture, facts.storyInit);
						checked += 1;
					} catch (e) {
						reds.push(`[${id}] 入口态「${fixture}」是可落地地点，但**进不去**：${e?.message ?? e}`
							+ ' ⇒ 入口态未落地（故事初始化变量缺项？）');
					}
				} else {
					note('entryNoEnterApi', `[${id}] 入口态「${fixture}」是地点，但**无「进入」原语** ⇒ 未证其可落地（✗ 静默当已验证）`);
				}
			}
			else if (facts.engineFixtures.has(fixture)) { checked += 1; }
			else {
				reds.push(`[${id}] 入口态「${fixture}」形如 id，但**故事里不存在** —— 既非地点（${facts.locations.size} 个）`
					+ '亦非已注册引擎夹具 ⇒ **圣经与故事漂移**（✗ 静默放过）');
			}
		} else {
			note('entryProse', `[${id}] 入口态：散文描述「${String(fixture).slice(0, 40)}」⇒ 须先升为**可执行数据**（#1814 甲）`);
		}
		/* ② 动作：入口态落地得了时，**每个动作须是该地点的真实入口动作** */
		const acts = Array.isArray(sc?.['动作']) ? sc['动作'] : [];
		if (locId != null) {
			/* ★★`动作` 是**序列**（逐跳），✗ 集合 —— 本席首版把每一条都拿到**入口地点**去核 ⇒ **假红**：
			 *   实测 `span2-l20-gate-chain` 的 `['走向料场','走向石门']` 在 `L20-forge` 只中第一条，
			 *   第二条是**到了 `L20-settlement` 之后**才合法的边 —— 我把它当「圣经漂移」报了。
			 *   ⇒ 修法：**沿链走**，每一步都拿**当时所在**地点的入口核（出边 ⇒ 落到目标地点）。
			 *   ★这正是本票自己那句「走**真实入口**」的本义：**入口可达性**须按**行进**核，✗ 按起点核。 */
			let cur = locId;
			for (const a of acts) {
				checked += 1;
				const legal = new Set(facts.actionsAt(cur));
				if (!legal.has(a)) {
					reds.push(`[${id}] 动作「${a}」**不是** \`${cur}\` 的真实入口动作 ⇒ 圣经↔故事漂移`
						+ `（行进至此地的合法入口 ${legal.size} 个：${[...legal].join('／') || '（无）'}）`);
					break;                                   // 链断 ⇒ 后续步的「当时所在地」无从确定，✗ 继续瞎判
				}
				const next = facts.stepOf(cur, a);
				if (next == null) {
					reds.push(`[${id}] 动作「${a}」在 \`${cur}\` 被认为是入口，却**推不出落点** ⇒ 判据取不到料（✗ 静默当原地）`);
					break;
				}
				cur = next;
			}
		} else if (acts.length) {
			note('actionUnresolved', `[${id}] 动作 ${acts.length} 条：入口态未落地 ⇒ 无法核「是否为该处真实入口」`);
		}
		/* ③ 渲染面：点名的面板须已注册且打得出来（串级结构断言的前提） */
		const refd = panelRefs(sc?.['断言']?.['渲染']);
		for (const p of refd) {
			checked += 1;
			if (!facts.panels.has(p)) {
				reds.push(`[${id}] 渲染断言点名面板 \`${p}\`，但**未注册** ⇒ 该断言指不出实体（已注册：${[...facts.panels].join('／') || '（无）'}）`);
				continue;
			}
			let html;
			try { html = facts.panelHTML(p); } catch (e) {
				reds.push(`[${id}] 面板 \`${p}\` 已注册却**渲染抛错**：${e?.message ?? e}`);
				continue;
			}
			if (typeof html !== 'string') reds.push(`[${id}] 面板 \`${p}\` 渲染结果不是字符串（${typeof html}）`);
		}
		/* ④ 语义断言：本轮**判不了**（散文）⇒ 明账，✗ 静默 */
		const sem = sc?.['断言'] ?? {};
		for (const [k, v] of [['逻辑', sem['逻辑']], ['渲染', sem['渲染']]]) {
			if (v == null) continue;
			note(k === '逻辑' ? 'semanticLogic' : 'semanticRender', `[${id}] 断言.${k}（散文 ${String(v).length} 字）⇒ 语义未机械判：${String(v).slice(0, 50)}…`);
		}
	}
	return { reds, notJudged, kinds, checked };
};

/**
 * ★`#81` RC① 棘轮：**未判明账不得静默增长**。
 *   dev-9 实证：**复制一条场景** ⇒ 明账 58 → 60 且 **rc=0** —— 即「未覆盖面」可以**无声翻倍**。
 *   ⇒ 钉**下限/上界**基线（体例照 `#1823` 的宿主触点棘轮）：
 *     · `kinds` 任一**高于**基线 ⇒ **红**（新增的未判面须**登记并解释**，✗ 顺手带进来）
 *     · 任一**低于**基线 ⇒ **绿但出声**（★那是**好事** —— `#1814` 甲落地后明账**逐条递减**）
 *     · 基线缺失 ⇒ **红**（✗ 静默放过 —— 缺基线时棘轮恒不生效）
 * @returns `{ reds, notes }`
 */
export const judgeNotJudged = (kinds, baseline) => {
	const reds = [], notes = [];
	if (baseline == null || typeof baseline !== 'object') {
		return { reds: ['缺 `NOT_JUDGED_BASELINE`（未判面上界）⇒ ✗ 静默放过：无法判「未覆盖面是否静默增长」'], notes };
	}
	for (const k of Object.keys(kinds).sort()) {
		const got = kinds[k] ?? 0, want = baseline[k];
		if (want == null) {
			reds.push(`未判面类目 \`${k}\`（${got} 项）**不在基线**里 ⇒ 新类目须登记（✗ 顺手新增未登记类目）`);
			continue;
		}
		if (got > want) reds.push(`未判面 \`${k}\` **增长**：${want} → ${got} ⇒ 未覆盖面扩大了（须解释并同笔更新基线，✗ 静默涨）`);
		else if (got < want) notes.push(`未判面 \`${k}\` 减少：${want} → ${got}（★好事 ⇒ 请刷新基线，否则棘轮松弛）`);
	}
	return { reds, notes };
};

/* ============================================================================
 * 二、刀（`--selftest`）—— 每条判据**须能红**，且**断到「哪条红」**
 * ==========================================================================*/

/* ============================================================================
 * 三、主判定
 * ==========================================================================*/
/* ★失败形＝**干净红 ＋ 汇总**（D 席 M9 形态），＋ **恒绿门自证**（`#1815` 教训随迁：
 *   「正常结束却没打印汇总」= 断言全成装饰 ⇒ 强制红）。这两条守的是**门自己**。 */
const fails = [];
let summaryPrinted = false;
/* ★★`#107` RC（dev-9 锚出，`error` 级）：**出口钩子会吞掉一切 `process.exit(N)`**。
 *   `process.exit(2)` 发出后钩子照跑，钩子内 `process.exitCode = 1` **覆盖**掉刚定的码
 *   （本席实测：`--selftest` 16/16 全绿 ⇒ rc=1；FLOOR 命中 ⇒ rc=1（✗ 声称的 2）；
 *    坏引擎根／`--list`／未知 `--only` ⇒ **全被吞成 1**）。
 *   ⇒ 引入 `cleanExit`：**凡“我已出声并有意定下退出码”的路径**先置真，钩子则**不接管**。
 *   ⚠ 本变量**必须在钩子注册之前声明**（钩子闭包引用它）。 */
let cleanExit = false;
/** 声明「本进程已出声完毕、退出码已定下」⇒ 钩子不再改码。 */
const markCleanExit = () => { cleanExit = true; summaryPrinted = true; };
const printSummary = (msg) => {
	if (summaryPrinted) return;
	summaryPrinted = true;
	if (msg) fails.push(msg);
	console.log(msg ? `\n${msg}` : '');
	cleanExit = true;                                  // ★★本函数自己定码 ⇒ 钩子勿接管
	process.exit(fails.length === 0 ? 0 : 1);
};
process.on('uncaughtException', (e) => printSummary(`✗ 场景链失败 1 条\n  ✗ ★未捕获异常（脚本中途崩了）：${e?.message ?? e}`));
process.on('unhandledRejection', (e) => printSummary(`✗ 场景链失败 1 条\n  ✗ ★未处理的拒绝：${e?.message ?? e}`));
process.on('exit', () => {
	if (!cleanExit) {
		console.log('\n✗ 场景链失败 1 条');
		console.log('  ✗ ★恒绿门：脚本正常结束但从未打印汇总（`printSummary()` 被搬走/删掉）');
		process.exitCode = 1;
	}
});

const engineArg = argOf('--engine');
const root = engineArg ? path.resolve(engineArg) : path.resolve(repoRoot, '..', 'sgstory');
const shimsPath = path.join(root, 'tests/unit/framework/shims.js');
if (!fs.existsSync(shimsPath)) {
	console.error(`✗ 引擎根不对：${root}\n  在该处找不到 ${path.relative(root, shimsPath)}`
		+ '\n  ⇒ 拆分仓布局请显式给：node tests/scenario/run.mjs --engine <sgstory 检出目录>');
	markCleanExit();
	process.exit(2);
}
if (!fs.existsSync(scenariosPath)) {
	console.error(`✗ 缺场景清单：${path.relative(repoRoot, scenariosPath)}`);
	markCleanExit();
	process.exit(2);
}
const load = (f) => eval(fs.readFileSync(f, 'utf8'));

/* ---------- 第 0 步：**先跑 `validate.mjs`**（清单不合形 ⇒ 场景链不该开跑）----------
 *   ★用**子进程**（✗ import）：validate 自带 `--selftest` 与 `process.exit`；
 *     同进程调用会污染本进程的退出码与收集器。此处只要它的**裁决**。 */
console.log('─ 第 0 步：场景清单自检（validate.mjs）');
let vOut = '';
try {
	vOut = execFileSync(process.execPath, [validatePath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	console.log(`  ✓ 清单合规（${vOut.trim().split('\n').pop() ?? 'ok'}）`);
} catch (e) {
	const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
	console.error('  ✗ 清单自检未通过 ⇒ **场景链不开跑**（清单是单源；它不合形，跑出来的读数无意义）');
	console.error(out.split('\n').slice(-12).map((l) => `    ${l}`).join('\n'));
	/* ★`#81` RC②：**走 `printSummary`**（✗ 裸 `process.exit`）——
	 *   裸退出会让**恒绿门**兜底接管（「脚本正常结束但从未打印汇总」）⇒ 报**错误的归因**、
	 *   把读者引向「恒绿门」而**真正的因**是「清单不合形」。归因错 ⇒ 排查方向错。 */
	printSummary('✗ 场景链失败 1 条\n  ✗ ★清单自检（validate.mjs）未通过 ⇒ 场景链未开跑（先修清单）');
}

/* ---------- 环境（**镜像** `stories/babel/verify.mjs` ＝ 镜像 `tests/unit/headless.mjs`）----------
 *   ⚠ `window` 必须在**装载任何引擎件之前**挂上：`bundle.js` 顶层即取 `window`／`document`
 *     （首版漏了这两行 ⇒ 装载当场 `window is not defined` ⇒ 被**恒绿门兜底**抓成具名红 —— 兜底生效了）。 */
globalThis.window = globalThis;
globalThis.document = { title: '', getElementById: () => ({ insertAdjacentHTML() {}, innerHTML: '' }) };

/* ---------- 装载引擎（载入序**镜像** `tests/unit/headless.mjs`）----------
 *   ★`host.js` **存在即加载**（✗ 写死）：引擎若回退到无它的旧形也照跑 ——
 *     硬写会在旧 ref 上抛「framework/host.js …」（本席在 books 侧已踩过同类）。 */
if (fs.existsSync(path.join(root, 'tests/unit/framework/host.js'))) {
	load(path.join(root, 'tests/unit/framework/host.js'));
}
load(path.join(root, 'tests/unit/framework/shims.js'));
globalThis.__played = [];
if (globalThis.SugarCube?.Engine) SugarCube.Engine.play = (name) => { globalThis.__played.push(name); };
load(path.join(root, 'tests/unit/dist/bundle.js'));   // 引擎插件（`build.py` 产出）

/* ---------- 装载故事侧脚本（与 `build.py` 同形：IIFE ＋ RPG 别名）---------- */
const storySrc = path.join(repoRoot, 'stories', 'babel', 'src');
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
const B = setup.BABEL;
const map = B?.map;

/* ---------- StoryInit（`src/meta/init.twee` 的 `<<set $x to …>>`）----------
 * ★**run.mjs 原形根本不跑这份 init**（它只 eval `src/**.js`，✗ twee）——
 *   于是 `State.variables.babelGiven` 是 `undefined`，而 `world/babel.js:84` 的
 *   `when: () => … && !State.variables.babelGiven[L.id]` 会抛
 *   `Cannot read properties of undefined (reading 'L1')`。
 *   实测触发路：`入口态.fixture=L1`（**真层地点 id**）过「形如 id ⇒ 须实存」支
 *   ⇒ 下游 `facts.actionsAt('L1')` 求值 `availableActions` ⇒ 崩。
 *
 * ★★两者均**从 `init.twee` 解析**（✗ 手抄）——`verify.mjs:104` 自陈其害：
 *   「twee 不在本脚本里执行，故**手工摆上**」⇒ 手抄与 twee 一旦漂移，两边都不报。
 *   ⇒ 本件只写**最小求值器**（`to` 后取 JSON 字面量，`setup.X.y(...)` 走简单路径）。
 *   ⚠ 不支持更复杂的表达式 ⇒ **出声并记明账**（✗ 静默略过）。 */
const INIT_TWEE = path.join(storySrc, 'meta', 'init.twee');
const parseStoryInit = (file) => {
	if (!fs.existsSync(file)) return { storyInit: null, unresolved: [], note: '无 init.twee' };
	const storyInit = {};
	const unresolved = [];
	/* ★**全文匹配**（✗ 逐行）：`init.twee` 的 `$player` 是**多行** `<<set …>>` ⇒
	 *   逐行扫描会**静默漏掉**它（本席实测：keys=inventory,… 而缺 `player`）。
	 *   而 `$player` 被玩家/战斗访问器桥接（`dnd3/player.js`）⇒ 漏了它会在深处抛。 */
	for (const m of fs.readFileSync(file, 'utf8').matchAll(/<<set\s+\$([\w.]+)\s+to\s+([\s\S]*?)>>/g)) {
		const key = m[1];
		const expr = m[2].trim();
		try { storyInit[key] = new Function('setup', `return (${expr});`)(setup); }
		catch { unresolved.push(`$${key}（表达式非字面量：${expr.slice(0, 50)}）`); }
	}
	return { storyInit, unresolved, note: null };
};
const initParsed = parseStoryInit(INIT_TWEE);
{
	/* ★**下限断言**（本席纪律：凡遍历/展开类判据，须同时断「**展开非空且达已知下限**」——
	 *   否则漏解析会以「零条 ⇒ 全绿」的形静默通过）。`init.twee` 今日有 7 条 `<<set>>`。 */
	const keys = Object.keys(initParsed.storyInit);
	const FLOOR = 7;
	if (keys.length < FLOOR) {
		console.error(`✗ StoryInit 解析**未达下限**：解析出 ${keys.length} 条 < ${FLOOR}（${INIT_TWEE}）§ ${keys.join('／')}`);
		markCleanExit();                                 // ★★否则会被出口钩子吞成 rc=1（RC 的因）
		process.exit(2);
	}
}
for (const u of initParsed.unresolved) console.log(`  ⚠ StoryInit 未能解析 ⇒ 明账（✗ 静默略过）：${u}`);

/* ---------- 故事事实（喂判据）---------- */
const facts = {
	locations: new Set(map ? [...map.locations.keys()] : []),
	panels: new Set(R?.panels ? [...R.panels.keys()] : []),
	engineFixtures: new Set(Object.keys(R?.__scenario?.fixtures ?? {})),
	storyInit: initParsed.storyInit,                 // ★从 `init.twee` 解析（✗ 手抄）
	panelHTML: (id) => R.panelHTML(id),
	/* ★「进入地点」原语（因果链的**真驱动**）：把 init 变量采用为故事变量（shims 的 `State.set`）
	 *   ⇒ 再 `map.moveTo(locId)` ⇒ 再求该地 `availableActions`（就是**崩过的那一步**）。
	 *   ⚠ 每次都用**全新的 `storyInit` 拷贝**（✗ 复用被改脏的那份）—— 否则场景间相互污染。 */
	canEnter: !!(map && typeof map.moveTo === 'function'),
	enterLoc: (locId, vars) => {
		State.set(JSON.parse(JSON.stringify(vars)));
		map.moveTo(locId);
		return path;                                     // 只作占位（调用方不看返回值）
	},
	actionsAt: (locId) => {
		const loc = map?.locations?.get(locId);
		if (!loc) return [];
		const texts = (loc.availableActions ?? []).map((a) => String(typeof a.text === 'function' ? a.text() : a.text));
		/* ★**出边文案也是真实入口**（`走向料场` 这类是地图边、✗ 常驻动作）——
		 *   两条都收：本判据问的是「玩家能不能从这里点出这个文案」，✗ 「它是动作还是边」。 */
		/* ★方法名须是**真名** `exitsFrom`（`src/core/60-map.js:113`）——
		 *   本席首版写成 `map.exitsAt`（**不存在的名**）⇒ 它是 `undefined` ⇒ `?: []` **静默取空**
		 *   ⇒ 出边文案全被排除 ⇒ **假红**（真跑第一条就红，报「走向料场不是真实入口动作」）。
		 *   ★这正是我在本文件 K5 里防的那一族：**判据取不到料时要显形，✗ 默认空**。
		 *   ⇒ 故此处**✗ 用可选链兜底**：名字打错就该**当场抛**，✗ 静默退化成空集。 */
		if (typeof map.exitsFrom !== 'function') {
			throw new Error('引擎 `WorldMap` 缺 `exitsFrom` —— 判据取不到出边文案（✗ 静默当空集 ⇒ 假红/假绿）');
		}
		/* ★方法名须是**真名** `exitsFrom`（`src/core/60-map.js:113`）——
		 *   本席首版写成 `map.exitsAt`（**不存在的名**）⇒ `undefined` ⇒ `?: []` **静默取空**
		 *   ⇒ 出边文案全被排除 ⇒ **假红**（真跑第一条即红）。★即本文件 K5 防的那一族：**取不到料须显形**。 */
		if (typeof map.exitsFrom !== 'function') {
			throw new Error('引擎 `WorldMap` 缺 `exitsFrom` —— 判据取不到出边文案（✗ 静默当空集 ⇒ 假红/假绿）');
		}
		const exitTexts = map.exitsFrom(locId).map((e) => String(e.text));
		return [...texts, ...exitTexts];
	},
	/** 该地点点了这个入口文案之后**在哪**：出边 ⇒ 目标地点；常驻动作 ⇒ 原地。
	 *   ✗ 返回 `null` 表示「认得出是入口却推不出落点」——那是**取料失败**，调用方须报红（✗ 静默当原地）。 */
	stepOf: (locId, text) => {
		const ex = map.exitsFrom(locId).find((e) => String(e.text) === text);
		if (ex) return ex.to;
		const loc = map.locations.get(locId);
		const act = (loc?.availableActions ?? []).find((a) => String(typeof a.text === 'function' ? a.text() : a.text) === text);
		return act ? locId : null;                        // 常驻动作 ⇒ 原地
	},
};

if (has('--selftest')) {
	/* ★**真子进程**跑本件（✗ 读码）：rc 契约的刀（K24／K25）须看**真退出码**。
	 *   `opts.FLOOR` ⇒ 临时把下限改成 99（写入**临时副本**，✗ 改本文件）。 */
	const runSelf = (args = [], opts = {}) => {
		/* ★★**哨兵防空递归**（本席实测踩过 **两次** 同一族）：
		 *   K24 调 `runSelf(['--selftest'])` ⇒ 子进程又跑 `--selftest` ⇒ 又跑 K24 ⇒ **无限 fork**。
		 *   ⚠ **实测后果**：不加哨兵时本刀会把机器打爆（本席开发中真的撞上系统 OOM ×3）。
		 *   ★同族前例：`tools/check-refs-recheck.mjs` 的 `RECHECK_SELFTEST_CHILD`（#98 折单）。 */
		let file = import.meta.filename;
		let tmpFile = null;
		if (opts.FLOOR != null) {
			/* ★★临时副本**必须落在仓内**（✗ `$TMPDIR`）——dev-9 锚出的**本刀自身假绿**：
			 *   原形写 `$TMPDIR/self-XXXX/run.mjs` ⇒ 该副本的 `repoRoot = dirname(import.meta)·../..`
			 *   变成 `$TMPDIR` ⇒ `scenariosPath` 不存在 ⇒ **rc=2 早退于「缺场景清单」（:238）**，
			 *   **根本到不了 FLOOR（:330）** ⇒ 这一格守的是**已知的缺清单分支**，
			 *   对它所声称守的 FLOOR 路**零判别力**（把 FLOOR 处的 `markCleanExit()` 撤掉，它也不红）。
			 *   ⇒ 写在 `tests/scenario/` 内（与本体同目录 ⇒ `repoRoot` 解析正确），跑完**删掉**。
			 *   ★同族：本席自己在 `#98`／`#103`／`#107` 三次踩的「子进程跑的路，须真是它以为的那条路」。 */
			tmpFile = path.join(here, `.tmp-run-${process.pid}-${Math.floor(Math.random() * 1e9)}.mjs`);
			fs.writeFileSync(tmpFile, fs.readFileSync(file, 'utf8').replace('const FLOOR = 7;', `const FLOOR = ${opts.FLOOR};`));
			file = tmpFile;
		}
		try {
			const p = spawnSync(process.execPath, [file, ...(opts.engine === null ? [] : ['--engine', opts.engine ?? root]), ...args], { encoding: 'utf8', env: { ...process.env, SCENARIO_SELFTEST_CHILD: '1' } });
			return { rc: p.status, out: `${p.stdout ?? ''}${p.stderr ?? ''}` };
		} finally {
			if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch { /* 清不掉不影响读数 */ } }
		}
	};
	const F = {
		locations: new Set(['L20-forge', 'L20-settlement']),
		actionsAt: (id) => (id === 'L20-forge' ? ['锻造台', '走向料场'] : []),
		panels: new Set(['location', 'notice', 'trauma', 'hp', 'inventory']),
		panelHTML: (id) => `<div data-panel="${id}">…</div>`,
		engineFixtures: new Set(['起手态']),
		/* 入口 → 落点：`走向料场` 是**出边** ⇒ 落到 `L20-settlement`（K10 的链式刀靠它） */
		stepOf: (locId, text) => (locId === 'L20-forge' && text === '走向料场' ? 'L20-settlement' : locId),
	};
	/* ★夹具原形**不带 `storyInit`/`canEnter`** ⇒ 走「无进入原语 ⇒ 明账」支（K21）。
	 *   带 `canEnter: true` 的夹具另建 `F2`（K22／K23 看「进得去 / 进不去」两臂）。 */
	const F2 = Object.assign({}, F, {
		canEnter: true,
		storyInit: { demo: 1 },
		enterLoc: (locId, vars) => {
			if (locId === 'L20-forge' && vars.demo !== 1) throw new Error('vars 未传入');
			if (locId === 'L20-boom') throw new Error("Cannot read properties of undefined (reading 'L20-boom')");
			return null;
		},
	});
	const mk = (o) => Object.assign({
		id: 'x', 入口态: { fixture: 'L20-forge', 形: '裸状态形' }, 动作: ['走向料场'],
		断言: { 逻辑: '甲', 渲染: '`.statusbar [data-panel="location"]`（`ui/ui.twee:4`）' },
	}, o);
	const knives = [
		['K0 空刀：全合规 ⇒ 绿且 checked>0',
			[F, mk({})], (r) => r.reds.length === 0 && r.checked >= 2],
		['K1 ★动作**不是**该地真实入口 ⇒ 红（圣经↔故事漂移）',
			[F, mk({ 动作: ['走向一个不存在的地方'] })], (r) => r.reds.length === 1 && /不是.*真实入口动作/.test(r.reds[0])],
		['K2 ★入口态形如 id 却**实存不存在** ⇒ 红（✗ 静默放过）',
			[F, mk({ 入口态: { fixture: 'L99-ghost', 形: '裸状态形' } })], (r) => r.reds.length === 1 && /形如 id/.test(r.reds[0])],
		['K3 入口态是**散文** ⇒ 明账（✗ 红 —— 它不是缺陷，是未升级的料）',
			[F, mk({ 入口态: { fixture: '二段遭遇态', 形: '裸状态形' } })], (r) => r.reds.length === 0 && r.notJudged.some((x) => /散文描述/.test(x))],
		['K4 ★渲染断言点名**未注册**面板 ⇒ 红（指不出实体）',
			[F, mk({ 断言: { 逻辑: '甲', 渲染: '`[data-panel="nosuch"]`（`a.js:1`）' } })], (r) => r.reds.length === 1 && /未注册/.test(r.reds[0])],
		['K5 ★占位形 `data-panel="<名>"` **不算字面** ⇒ 不判（✗ 假红）',
			[F, mk({ 断言: { 逻辑: '甲', 渲染: '`data-panel="<名>"`' } })], (r) => r.reds.length === 0],
		['K6 ★面板渲染**抛错** ⇒ 红',
			[Object.assign({}, F, { panelHTML: (id) => { if (id === 'location') throw new Error('炸了'); return '<i></i>'; } }), mk({})],
			(r) => r.reds.length === 1 && /渲染抛错/.test(r.reds[0])],
		['K7 引擎夹具名可落地 ⇒ 不红（入口态亦可是**引擎夹具**）',
			[F, mk({ 入口态: { fixture: '起手态', 形: '具名' }, 动作: [] })], (r) => r.reds.length === 0],
		['K8 ★语义断言**总**进明账（✗ 判不了却不说）',
			[F, mk({})], (r) => r.notJudged.some((x) => /断言\.逻辑/.test(x)) && r.notJudged.some((x) => /断言\.渲染/.test(x))],
		['K10 ★动作是**序列**：第二条只在**第二跳**合法 ⇒ **不红**（✗ 全在入口核 —— 那是把序列当集合）',
			[Object.assign({}, F, {
				locations: new Set(['A', 'B']),
				actionsAt: (id) => (id === 'A' ? ['向东'] : ['向南']),
				stepOf: (id, tx) => (id === 'A' && tx === '向东' ? 'B' : (id === 'B' && tx === '向南' ? 'B' : null)),
			}), mk({ 入口态: { fixture: 'A', 形: '裸状态形' }, 动作: ['向东', '向南'] })],
			(r) => r.reds.length === 0 && r.checked >= 2],
		['K11 ★认得出是入口却**推不出落点** ⇒ 红（取料失败须显形，✗ 静默当原地）',
			[Object.assign({}, F, { stepOf: () => null }), mk({ 动作: ['走向料场'] })],
			(r) => r.reds.length === 1 && /推不出落点/.test(r.reds[0])],
		['K12 ★未判面**增长** ⇒ 红（✗ 静默涨 —— dev-9 实证复制场景 58→60 仍 rc=0）',
			[null, null], () => judgeNotJudged({ semanticLogic: 3 }, { semanticLogic: 2 }).reds.length === 1],
		['K13 ★未判面**减少** ⇒ 绿但出声（★那是好事：`#1814` 甲落地后明账递减）',
			[null, null], () => { const r = judgeNotJudged({ semanticLogic: 1 }, { semanticLogic: 2 }); return r.reds.length === 0 && r.notes.length === 1; }],
		['K14 ★基线**缺失** ⇒ 红（✗ 静默放过 —— 缺基线时棘轮恒不生效）',
			[null, null], () => judgeNotJudged({ semanticLogic: 1 }, null).reds.length === 1],
		['K15 ★**新类目**未登记 ⇒ 红',
			[null, null], () => judgeNotJudged({ brandNew: 1 }, { semanticLogic: 2 }).reds.some((x) => /不在基线/.test(x))],
		['K9 `looksLikeId` 判据本身：id 形 ⇒ true；散文 ⇒ false',
			[null, null], () => looksLikeId('L20-forge') && !looksLikeId('二段遭遇态') && !looksLikeId('取得 iron-ore ＋ 一张图纸的态')],
		/* ── 入口态**可落地性**（本次 dev 实测的崩溃族：形如 id 的真地点过「须实存」后下游崩）── */
		['K21 ★无「进入」原语 ⇒ **明账**（✗ 静默当已验证；夹具原形即此形）',
			[F, mk({ 动作: [] })], (r) => r.reds.length === 0 && r.notJudged.some((x) => /未证其可落地/.test(x))],
		['K22 ★可落地地点**真进得去** ⇒ **不红**（两臂的另一半；✗ 只测抛的那臂）',
			[Object.assign({}, F2, { locations: new Set([...F.locations, 'L20-forge']) }), mk({ 动作: [] })],
			(r) => r.reds.length === 0 && !r.notJudged.some((x) => /未证其可落地|进不去/.test(x))],
		['K23 ★★入口态**崩了**（`Cannot read properties of undefined (reading …)`）⇒ **具名红**（✗ 让异常逃逸成脚本崩）',
			[Object.assign({}, F2, {
				locations: new Set([...F.locations, 'L20-boom']),
				enterLoc: () => { throw new Error("Cannot read properties of undefined (reading 'L20-boom')"); },
			}), mk({ 入口态: { fixture: 'L20-boom', 形: '裸状态形' }, 动作: [] })],
			(r) => r.reds.length === 1 && /进不去/.test(r.reds[0])],
		/* ── `#107` RC（dev-9 锚出）：**出口钩子会吞 `process.exit(N)`** ⇒ 那族 rc 须由刀守（✗ 靠肉眼）── */
		['K24 ★★`--selftest` 的 rc **须为 0**（✗ 被出口钩子吞成 1＋误报「恒绿门」）',
			[null, null], () => runSelf(['--selftest']).rc === 0],
		['K25 ★★**硬错路径的 rc 须真为 2**（✗ 被吞成 1；★三格各给**自己的调用形**，★并断**真走到那条路**）',
			[null, null], () => {
				const bad = runSelf([], { engine: '/nonexistent-xyz' });          // 坏引擎根
				const noOnly = runSelf(['--only', 'zzz-no-such-scenario']);        // 未知 --only
				const floored = runSelf([], { FLOOR: 99 });                        // 下限未达
				/* ★★dev-9 锚出的**本刀自身假绿**（已修）：临时副本若落在 `$TMPDIR`，其 `repoRoot` 解析错
				 *   ⇒ rc=2 早退于「**缺场景清单**」，**永不到 FLOOR** ⇒ 这一格对它声称守的路**零判别力**。
				 *   ⇒ 除 rc 外**另断「真走到那条路」**（✗ 只断 rc≠2 —— 那正是本假绿的形）。 */
				return bad.rc === 2 && noOnly.rc === 2 && floored.rc === 2
					&& /引擎根不对/.test(bad.out)
					&& /没有匹配的场景/.test(noOnly.out)
					&& /未达下限/.test(floored.out) && !/缺场景清单/.test(floored.out);
			}],
	]
	/* ★哨兵置位 ⇒ **剔除** K24／K25（✗ 让它们返回假值 —— 那会让子进程 20/21、父进程 k24 看到 rc=1）。
	 *   剔除后子进程跑 19 把、正常 rc=0；而 K25 的三个子进程各自走自己的硬错路（在到达刀表之前就退）。 */
		.filter((k) => !(process.env.SCENARIO_SELFTEST_CHILD === '1' && /^K2[45]/.test(k[0])));
	let n = 0;
	for (const [name, args, ok] of knives) {
		const r = args[0] == null ? null : judgeScenarios([args[1]], args[0]);   // ★判据吃**数组**（一条场景也要包）
		const pass = !!ok(r);
		n += pass ? 1 : 0;
		console.log(`  ${pass ? '✓' : '✗'} ${name}`);
		if (!pass && r) console.log(`      reds=${JSON.stringify(r.reds)}\n      notJudged=${r.notJudged.length}`);
	}
	console.log(n === knives.length ? `\n  ✓ ${n}/${knives.length} 刀全部如期` : `\n  ✗ ${n}/${knives.length} 刀如期`);
	markCleanExit();                                   // ★★刀已出声 ⇒ 勿让出口钩子覆写 rc（RC 的因）
	process.exit(n === knives.length ? 0 : 1);
}

const all = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'))['场景'] ?? [];
if (has('--list')) { for (const s of all) console.log(`  ${s.id}（${s.段}｜${s.层}）`); markCleanExit(); process.exit(0); }
const only = argOf('--only');
const scenarios = only ? all.filter((s) => s.id === only) : all;
if (!scenarios.length) { console.error(`✗ 没有匹配的场景（--only ${only}）`); markCleanExit(); process.exit(2); }

const { reds, notJudged, kinds, checked } = judgeScenarios(scenarios, facts);
/* ★`#81` RC①：棘轮 —— 未判面**不得静默增长**（体例照 `#1823`）。基线住本目录同名的 JSON。 */
let baseline = null;
try { baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch { baseline = null; }
const nb = judgeNotJudged(kinds, baseline?.['未判'] ?? null);
reds.push(...nb.reds);

/* ---------- 报告 ---------- */
console.log(`\n─ 场景链：${scenarios.length} 条（${checked} 处**机械判**）`);
console.log(`  · 入口态落地点 ${facts.locations.size} 个｜面板 ${facts.panels.size} 个（${[...facts.panels].join('／')}）`);
console.log(`  · 未判面按类目（对棘轮基线）：${Object.entries(kinds).sort().map(([k, v]) => `${k}=${v}`).join('｜')}`
  + (baseline ? `（基线 ${JSON.stringify(baseline['未判'])}）` : '（★无基线）'));
for (const n of nb.notes) console.log(`      ⚠ ${n}`);
console.log(`\n  ⚠ **未机械判**（明账 ${notJudged.length} 项 —— 语义断言是**散文** ⇒ 本轮判不了；`
	+ '`#1814` 甲（作者侧升可执行数据）落地后**逐条递减**）：');
for (const x of notJudged) console.log(`      · ${x}`);
if (reds.length) {
	console.log('\n  ✗ 门红：');
	for (const r of reds) console.log(`    - ${r}`);
	fails.push(`✗ 场景链失败 ${reds.length} 条`);
}

console.log(`\n${fails.length === 0 ? '✓ 场景链通过' : `✗ 场景链失败 ${reds.length} 条`}`
	+ `（机械判 ${checked} 处｜未判 ${notJudged.length} 项**已明账**）`);
printSummary();
