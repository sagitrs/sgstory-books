/* 清单引用的**机械守卫**（`#80` tester-4 RC·裁乙；`#82` dev-10 RC 折）：K13 只查「引用**有形**」（有 `文件:行` 或选择器），
 * ✗ 查其**内容** ⇒ 行号漂了、路径删了、符号改了，清单照旧「通过」。
 *
 * 本件判四件事：
 *   ① 文件存在（支持 `engine/`／`books/` **显式树限定**；无限定则后缀匹配、**本仓优先**，同一棵树多命中 ⇒ 红「有歧义 ⇒ 写全路径」）
 *   ② 行号在范围内、所引区间**非空**
 *   ③ ★**声明了符号的引用**（形如 `` `路径:行`（`符号`） ``）⇒ 所引行/区间必须**逐字**含该符号
 *   ④ ★**散文形一律红**（如 `` `a.js` 第 12 行 ``）—— 规范形是 `路径:行`；散文形机械核不到内容（本席自己的更正注就用过该形 ⇒ 「通过 36」曾是**下界**）
 *
 * 用法：node tools/check-refs.mjs --engine <引擎检出> [清单文件]
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

const fail = [];
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
	for (const [root, list] of IDX) {
		if (only && (root === BOOKS) !== (only === 'books')) continue;
		const hits = only
			? list.filter((rel) => rel === file)
			: list.filter((rel) => rel === file || rel.endsWith('/' + file));
		if (hits.length === 1) return { root, rel: hits[0] };
		if (hits.length > 1) return { ambiguous: hits, root };
	}
	return null;
}

function readAt(rawFile, n) {
	const r = resolve(rawFile);
	if (!r) return { ok: false, why: `文件不存在（本仓／引擎皆无此路径或其后缀）：${rawFile}` };
	if (r.ambiguous) return { ok: false, why: `引用有歧义（同一棵树命中 ${r.ambiguous.length} 处）⇒ 写全路径：${rawFile} ⇒ ${r.ambiguous.slice(0, 3).join('、')}…` };
	const all = fs.readFileSync(path.join(r.root, r.rel), 'utf8').split(/\r?\n/);
	if (n < 1 || n > all.length) return { ok: false, why: `行号越界：${r.rel}:${n}（共 ${all.length} 行）` };
	return { ok: true, all, where: `${r.root === BOOKS ? 'books' : 'engine'}/${r.rel}` };
}

/* ---------- 抽取 ---------- */
const CIT = /([\w./-]+\.(?:js|mjs|twee|json|md|html)):(\d+)(?:-(\d+))?/g;   // 规范形
const PROSE = /`([\w./-]+\.(?:js|mjs|twee|json|md|html))`\s*第\s*(\d+)\s*行/g; // ★散文形（一律红）
const SYM = /（`([^`]{2,80})`）/;   // 紧随引用之后的**显式符号声明**

const FIELDS = ['断言', '备注', '守的面', '构造', '动作'];
const rawOf = (r, field) => (field === '断言' ? Object.values(r['断言'] ?? {}).join('\n') : String(r[field] ?? ''));

let 处 = 0, 符号核 = 0, 仅范围核 = 0;
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
			if (!sym) { 仅范围核++; continue; }
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
for (const f of fail.slice(0, 12)) console.log(`  ✗ ${f}`);
if (fail.length > 12) console.log(`  …（另 ${fail.length - 12} 条）`);
console.log(fail.length ? '✗ 清单引用核失败' : '✓ 清单引用核通过');
process.exit(fail.length ? 1 : 0);
