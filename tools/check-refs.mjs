/* 清单引用的**机械守卫**（`#80` tester-4 RC·裁乙；`#82` dev-10 RC 折）：K13 只查「引用**有形**」（有 `文件:行` 或选择器），
 * ★**内容已核**（`#80` 之后加的口 ✓）：旧 K13 才是「只查有形、✗ 查内容」✗ ⇒ 本行原先那句说的是**旧态** ✓，2026-10-04 更正以免误导读者 ✓ —— 见下方 ③「声明了符号的引用 ⇒ 所引行/区间必须**逐字**含该符号」✓。
 *
 * 本件判四件事：
 *   ① 文件存在（支持 `engine/`／`books/` **显式树限定**；无限定则后缀匹配、**本仓优先**，同一棵树多命中 ⇒ 红「有歧义 ⇒ 写全路径」）
 *   ② 行号在范围内、所引区间**非空**
 *   ③ ★**声明了符号的引用**（形如 `` `路径:行`（`符号`） ``）⇒ 所引行/区间必须**逐字**含该符号
 *   ⑤ ★**`--require-symbols`（可选 · 默认关）**：打开后「仅范围核 > 0」即红（逐条具名）——
 *      把「明账」变成**机械判据**；✗ 改默认属语义变更，须领队裁（本笔只加开关）。亦可 `REFS_REQUIRE_SYMBOLS=1`。
 *   ④ ★**散文形一律红**（如 `` `a.js` 第 12 行 ``）—— 规范形是 `路径:行`；散文形机械核不到内容（本席自己的更正注就用过该形 ⇒ 「通过 36」曾是**下界**）
 *
 * 用法：node tools/check-refs.mjs --engine <引擎检出> [清单文件] [--require-symbols] [--docs]
 *   `src/**`／`tests/**`／`vendor/**` 的引用落在**引擎检出**；`stories/**` 落在**本仓**；其余两棵树都试（本仓优先）。
 * 失败形：干净红 ＋ 汇总（崩溃亦具名）＋ rc≠0；★引擎缺失 ⇒ 具名 rc=2（✗ 静默跳过 —— 那会让这道门变装饰）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOKS = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ENGINE = argOf('--engine') ?? process.env.ENGINE ?? null;
const JSONF = argv.find((a) => a.endsWith('.json')) ?? path.join(BOOKS, 'stories/babel/scenarios/scenarios.json');

const DOCS = argv.includes('--docs');
/* ★`--require-symbols`（`books#271` 余项落定后由领队裁：**明账变机械判据** · 另笔落）：
 *   本件原先只在**明账**里报「仅范围核 N」并照旧 rc=0 —— 于是「作者忘了写符号」这类退化
 *   **不回红**（`books#280` ⑥ 实测：只拆掉一个符号 ⇒ 红 0、rc 0，而明账变 1 ⇒ 只看 rc 会把
 *   「少了锚」读成「通过」）。开关打开后：**仅范围核 > 0 ⇒ 红**（逐条具名，便于照单补）。
 *   ⚠ 默认**关**（✗ 不改既有语义）：本仓其余笔的作者未必都在同一条船上，默认变硬会让他们的笔
 *     突然变红 —— 那是判据面的**语义变更**，须由领队裁后再改默认。
 *   ⚠ 亦可经环境变量 `REFS_REQUIRE_SYMBOLS=1` 打开（供 CI／本地复跑用，✗ 不必改命令行）。 */
const 要求符号 = argv.includes('--require-symbols') || /^(1|true|yes)$/i.test(process.env.REFS_REQUIRE_SYMBOLS ?? '');
// 豁免面（`#1842` 设计输入①）：`tools/refs-exemptions.json` 按**文件前缀**豁免 ⇒ 进「已豁免（计数出声）」，✗ 静默丢弃。
const EXEMPT = (() => {
	let list;
	try { list = JSON.parse(fs.readFileSync(path.join(HERE, 'refs-exemptions.json'), 'utf8'))['豁免'] ?? []; }
	catch (e) { console.error(`✗ refs-exemptions.json 读不出／坏：${e.message}`); process.exit(2); }   // ★配置坏 ⇒ rc=2（✗ 静默回落空豁免）
	// ★NIT②③ 机械守卫：**结构式**前缀（`<非空路径>/**` 一条挡四形：空／`docs`／`d`／`docs/`）＋「为何」「谁定」各一行非空
	const bad = [];
	for (const e of list) {
		const f = String(e['文件'] ?? '');
		if (!/^[\w./-]+\/\*\*$/.test(f)) bad.push(`前缀不合结构式 \`<路径>/**\`：\`${f}\``);
		for (const k of ['为何', '谁定']) if (!String(e[k] ?? '').trim()) bad.push(`豁免 \`${f}\` 缺「${k}」`);
	}
	if (bad.length) { for (const b of bad) console.error(`✗ refs-exemptions.json：${b}`); process.exit(2); }
	return list;
})();
// 跨仓/外来形（设计输入③）：不在本仓/引擎树里的稿内相对名 ⇒ 归「外来（计数出声）」，✗ 与「本仓引用指错」混为一谈。
const 外来形 = (f) => /^(gates\/|[\w-]*ch\d+\.twee$|[\w-]*endings\.twee$|[\w-]*tables?\.twee$|[\w-]*codex\.twee$)/.test(f);

const fail = [];
const docsFail = [];   // ★docs 面**独立数组**：报告态 ✗ 吞清单面的红（dev-10 阻断 RC）
process.on('uncaughtException', (e) => {
	console.error(`✗ ★未捕获异常：${e.message}`);
	console.error('✗ 清单引用核失败 1 条');
	process.exit(1);
});
if (!ENGINE) { console.error('✗ 缺 --engine（引擎检出目录）：✗ 不可静默跳过本核'); process.exit(2); }
if (!fs.existsSync(ENGINE)) { console.error(`✗ 引擎检出不存在：${ENGINE}`); process.exit(2); }

const doc = JSON.parse(fs.readFileSync(JSONF, 'utf8'));
const 场景 = doc['场景'];
if (!Array.isArray(场景) || 场景.length === 0) throw new Error('读不到「场景」数组（或为空）');

/* ---------- 路径解析（给**不完整**引用用后缀匹配；显式树限定 ⇒ 精确相对路径） ---------- */
const SKIP = new Set(['node_modules', '.git', 'dist', 'build']);
function index(root) {
	const out = [];
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			if (SKIP.has(e.name)) continue;
			const p = path.join(dir, e.name);
			if (e.isDirectory()) walk(p); else out.push(path.relative(root, p).split(path.sep).join('/'));
		}
	};
	walk(root);
	return out;
}
const IDX = [[BOOKS, index(BOOKS)], [ENGINE, index(ENGINE)]];

function resolve(rawFile) {
	let file = rawFile, only = null;
	for (const pre of ['books/', 'engine/']) {
		if (file.startsWith(pre)) { only = pre.slice(0, -1); file = file.slice(pre.length); }
	}
	const 命中 = [];
	for (const [root, list] of IDX) {
		if (only && (root === BOOKS) !== (only === 'books')) continue;
		const hits = only
			? list.filter((rel) => rel === file)
			: list.filter((rel) => rel === file || rel.endsWith('/' + file));
		if (hits.length > 1) return { ambiguous: hits, root };
		if (hits.length === 1) 命中.push({ root, rel: hits[0] });
	}
	if (命中.length === 0) return null;
	if (命中.length === 1) return 命中[0];
	/* ★★`#127`：**两树都命中** —— 旧形「本仓优先」是**首树命中即返**，于是「两树同路径、内容不同」被**静默**
	 *   解到本仓（引用面看不出取的是哪棵树 ⇒ 跨树写错行号可静默过门 ✗）。
	 *   ⇒ 现形：**内容相同**才按「本仓优先」（照旧 ✓）；**内容不同** ⇒ 红，要求写**树限定**
	 *     （`books/…` 或 `engine/…` —— 与本件既有的显式树前缀写法一致 ✓）。 */
	const 本 = 命中.find((x) => x.root === BOOKS) ?? 命中[0];
	const 引 = 命中.find((x) => x !== 本);
	if (!引) return 本;
	const 文 = (x) => fs.readFileSync(path.join(x.root, x.rel), 'utf8');
	if (文(本) === 文(引)) return 本;
	return { 跨树异: { 本仓: 本, 引擎: 引 } };
}

function readAt(rawFile, n, docRaw) {
	let r = resolve(rawFile);
	/* ② 同节简写（近似：**同文件内**）：若本文档里出现过同**基名**的可解析路径 ⇒ 按其解析（设计输入②：同节「至少一次全路径」其后许简写） */
	if (!r && docRaw) {
		const base = rawFile.split('/').pop();
		for (const m2 of docRaw.matchAll(new RegExp('([\\w./-]*' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '):\\d+', 'g'))) {
			if (m2[1] === rawFile) continue;
			const r2 = resolve(m2[1]);
			if (r2 && !r2.ambiguous) { r = r2; break; }
		}
	}
	if (!r) return { ok: false, why: `文件不存在（本仓／引擎皆无此路径或其后缀）：${rawFile}` };
	if (r.ambiguous) return { ok: false, why: `引用有歧义（同一棵树命中 ${r.ambiguous.length} 处）⇒ 写全路径：${rawFile} ⇒ ${r.ambiguous.slice(0, 3).join('、')}…` };
	if (r.跨树异) return { ok: false, why: `★**两树都命中且内容不同**（books：${r.跨树异.本仓.rel} ／ engine：${r.跨树异.引擎.rel}）⇒ 须写**树限定**：「books/${rawFile}」或「engine/${rawFile}」（✗ 静默取本仓 ⇒ 跨树写错行号可过门 ✗）` };
	const all = fs.readFileSync(path.join(r.root, r.rel), 'utf8').split(/\r?\n/);
	if (n < 1 || n > all.length) return { ok: false, why: `行号越界：${r.rel}:${n}（共 ${all.length} 行）` };
	return { ok: true, all, where: `${r.root === BOOKS ? 'books' : 'engine'}/${r.rel}` };
}

/* ---------- 抽取 ---------- */
const CIT = /([\w./-]+\.(?:js|mjs|twee|json|md|html)):(\d+)(?:-(\d+))?/g;   // 规范形
const PROSE = /`([\w./-]+\.(?:js|mjs|twee|json|md|html))`\s*第\s*(\d+)\s*行/g; // ★散文形（一律红）
const SYM = /（`([^`]{2,80})`）/;   // 紧随引用之后的**显式符号声明**

const FIELDS = ['断言', '备注', '守的面', '构造', '动作'];
/**
 * 取某字段的**可扫文本**（供 `CIT` 正则抽引用）。
 *
 * ★★`#117` 折单（`dev-10` D RC 铁证）：**须递归取「字符串叶子」，✗ 用 `Object.values().join('\n')`**。
 *
 * 病灶：旧形对 `断言` 用 `Object.values(断言).join('\n')` —— 而 `JS` 的 `join` 会把**对象叶子**
 *   转成字符串 `"[object Object]"` ⇒ ★**对象内部的引用整片进不了扫描**。
 *   本笔把 `断言.逻辑` 由**散文串**改成**对象形**（`{说明, 步骤, 存档}`）⇒ `:102` 三处实指**当场从扫描面消失**：
 * ```
 *   门（check-refs.mjs）见 43 处 ｜ 递归取叶子 = 46 处 ⇒ **差 3**（正是 `逻辑.说明` 里的三条 `:102`）
 *   同仓独立复算器 check-refs-recheck.mjs --compare：**本头 rc=1**（它 35／我 38 ★覆盖差）｜**main rc=0**
 * ```
 *   ⇒ ★这是**预存盲区**（`join` 一直在那里）被**首个对象形**触发 ⇒ 覆盖**净减由本笔引入**（✗ 凭空冒出）。
 *   ⚠ 未修则**甲案对象形只会更多** ⇒ 此后每笔都在**无声打折**（引用核看不见新写的引用）。
 *
 * 折法：**递归取字符串叶子**（`string` ⇒ 收；`array`／`object` ⇒ 下钻）＋ `join('\n')`。
 *   ⇒ 对**散文串**字段（`备注`／`动作`…）行为逐字不变（`typeof v === 'string'` 直返）⇒ 无回归。
 */
const rawOf = (r, field) => {
	const v = r[field];
	if (v == null) return '';
	if (typeof v === 'string') return v;
	const out = [];
	const walk = (x) => {
		if (typeof x === 'string') out.push(x);
		else if (Array.isArray(x)) x.forEach(walk);
		else if (x != null && typeof x === 'object') Object.values(x).forEach(walk);
	};
	walk(v);
	return out.join('\n');
};

let 处 = 0, 符号核 = 0, 仅范围核 = 0;
const 无符 = [];   // ★无显式符号的引用（`--require-symbols` 打开时逐条具名）
for (const r of 场景) {
	for (const field of FIELDS) {
		const raw = rawOf(r, field);
		for (const m of raw.matchAll(CIT)) {
			处++;
			const from = Number(m[2]), to = Number(m[3] ?? m[2]);
			const at = `${m[1]}:${from}${to !== from ? '-' + to : ''}`;
			const got = readAt(m[1], from);
			if (!got.ok) { fail.push(`[${r.id}] ${got.why}`); continue; }
			const seg = got.all.slice(from - 1, to).join('\n');
			if (seg.trim() === '') { fail.push(`[${r.id}] ${at} 所指区段**空行** —— 行号漂了`); continue; }
			const sym = raw.slice(m.index + m[0].length, m.index + m[0].length + 40).match(SYM)?.[1];
			if (!sym) { 仅范围核++; 无符.push(`[${r.id} ⁄ ${field}] ${at}`); continue; }
			if (!seg.includes(sym)) fail.push(`[${r.id}] ${at} **不含**其声明的符号 \`${sym}\` ⇒ 行号随版本漂了／指错了地方 —— 复核并同刷`);
			else 符号核++;
		}
		for (const m of raw.matchAll(PROSE)) {
			fail.push(`[${r.id}] 引用写成**散文形**（\`${m[1]}\` 第 ${m[2]} 行）⇒ 请写规范形 \`${m[1]}:${m[2]}\`（规范形才核得到行内容）`);
		}
	}
}

console.log(`─ 清单引用核：${场景.length} 条｜规范形引用 ${处} 处（**符号核 ${符号核}**｜仅范围核 ${仅范围核}）｜引擎 ${ENGINE}`);
console.log('  解析顺序＝本仓优先（同树多命中 ⇒ 红）｜散文形**一律红**');
console.log(`  通过 ${Math.max(0, 处 - fail.length)}｜不符 ${fail.length}　★明账：仅范围核 ${仅范围核}（＝待补显式符号，逐条递减到零）`);
if (要求符号 && 仅范围核 > 0) {
	fail.push(`★${仅范围核} 处引用**没有显式符号**（\`--require-symbols\` ⇒ 每处都须写成 \`路径:行\`（\`符号\`））`);
	for (const w of 无符.slice(0, 12)) console.log(`  · 无符：${w}`);
	if (无符.length > 12) console.log(`  · …（另 ${无符.length - 12} 处）`);
}
for (const f of fail.slice(0, 12)) console.log(`  ✗ ${f}`);
if (fail.length > 12) console.log(`  …（另 ${fail.length - 12} 条）`);
console.log(fail.length ? '✗ 清单引用核失败' : '✓ 清单引用核通过');
/* ---------- `--docs`（报告态；**独立数组**，✗ 不影响清单面的 rc —— dev-10 阻断 RC 的裁甲案） ---------- */
/* ---------- `--docs`（报告态；`#1842` writer 三条设计输入） ---------- */
if (DOCS) {
	const walkMd = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		if (SKIP.has(e.name)) return [];
		const q = path.join(dir, e.name);
		return e.isDirectory() ? walkMd(q) : (e.name.endsWith('.md') ? [q] : []);
	});
	const docsDir = path.join(BOOKS, 'docs');
	const files = fs.existsSync(docsDir) ? walkMd(docsDir) : [];
	let 处 = 0, 豁免数 = 0, 外来数 = 0, 范围核 = 0;
	const 豁免命中 = [];
	for (const f of files) {
		const rel = 'docs/' + path.relative(docsDir, f).split(path.sep).join('/');
		const 豁免 = EXEMPT.some((e) => rel.startsWith(String(e['文件']).replace('/**', '/')));
		const raw = fs.readFileSync(f, 'utf8');
		for (const m of raw.matchAll(CIT)) {
			处++;
			const from = Number(m[2]), to = Number(m[3] ?? m[2]);
			const got = readAt(m[1], from, raw);   // ② 同文件简写（近似「同节」）在 readAt 内处理
			if (!got.ok) {
				if (豁免) { 豁免数++; 豁免命中.push(`${rel} → ${m[1]}:${from}`); continue; }          // ① 豁免面（计数出声）
				if (外来形(m[1])) { 外来数++; continue; }  // ③ 跨仓/外来形（计数出声）
				docsFail.push(`[${rel}] ${got.why}`);
				continue;
			}
			const seg = got.all.slice(from - 1, to).join('\n');
			if (seg.trim() === '') { docsFail.push(`[${rel}] ${m[1]}:${from} 所指区段空行`); continue; }
			范围核++;
		}
	}
	console.log(`─ docs 引用核（**报告态**：存在＋范围两核）：扫 ${files.length} 个 md｜引用 ${处} 处｜**不符 ${docsFail.length}**`
		+ `｜已豁免 ${豁免数}｜外来形 ${外来数}（★两类**计数出声**，✗ 静默丢弃）｜范围核 ${范围核}`);
	console.log(`  ★明账（棘轮）：不符须归零后方转**硬判**；本条**不使 rc≠0**（rc 由**清单面**决定）`);
	// NIT①：豁免**逐条打印** ＋ 条数输出 —— 光一个「已豁免 16」回答不了「有没有本仓真红被豁免掉」
	console.log(`  豁免面（${EXEMPT.length} 条声明）：`);
	for (const e of EXEMPT) console.log(`    · ${e['文件']}（${e['谁定']}）`);
	for (const h of 豁免命中) console.log(`    · 命中：${h}`);
	for (const f of docsFail.slice(0, 20)) console.log(`  · ${f}`);
	if (docsFail.length > 20) console.log(`  …（另 ${docsFail.length - 20} 条）`);
	console.log(`✓ docs 引用核（报告态）—— **清单面的 rc 由清单面自己给**（本块 ✗ 退出、✗ 覆盖 rc）`);
	console.log(`  清单面此时：不符 ${fail.length} ⇒ 本进程将 rc=${fail.length ? 1 : 0}`);
}


process.exit(fail.length ? 1 : 0);

