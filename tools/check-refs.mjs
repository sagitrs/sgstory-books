/* 清单引用的**机械守卫**（`#80` tester-4 RC·裁乙）：K13 只查「**有形**」（有 `文件:行` 或选择器），✗ 不查其**内容** ⇒
 * 行号可能漂到别的行、路径可能删了、符号可能改了，而清单照旧「通过」。
 * 本件查三件事：① 文件存在 ② 行号在范围内 ③ ★**所引行（或行区间）确实含该字段里 backtick 引的符号**。
 *
 * 用法：node tools/check-refs.mjs [--engine <引擎检出>] [清单文件]
 *   `src/**` 的引用落在**引擎检出**；`stories/**` 落在**本仓**；其余（如 `play.twee`）两棵树都试。
 * 失败形：干净红 ＋ 汇总（崩溃亦具名）＋ rc≠0。★引擎缺失 ⇒ 具名 rc=2（✗ 静默跳过 —— 那会让这道门变装饰）。
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
const rows = [];
process.on('uncaughtException', (e) => {
	console.error(`✗ ★未捕获异常：${e.message}`);
	console.error('✗ 清单引用核失败 1 条');
	process.exit(1);
});
if (!ENGINE) { console.error('✗ 缺 --engine（引擎检出目录）：✗ 不可静默跳过本核'); process.exit(2); }
if (!fs.existsSync(ENGINE)) { console.error(`✗ 引擎检出不存在：${ENGINE}`); process.exit(2); }

const doc = JSON.parse(fs.readFileSync(JSONF, 'utf8'));
const 场景 = doc['场景'];

/** 该字段里的**码形** backtick 片段（✗ 排除引用自身／路径）：`${item.name}×${item.charges}` ✓；`src/core/70-ui.js:69` ✗ */
const codeFragsOf = (s) => [...String(s).matchAll(/`([^`]+)`/g)].map((m) => m[1])
	.filter((f) => !/^[\w./-]+\.(?:js|mjs|twee|json|md|html)(?::\d+(?:-\d+)?)?$/.test(f))
	.filter((f) => /[.$(=×]|\b(?:if|return|const|let|splice|push)\b/.test(f));
/** 码形片段里的标识符 token（长度 ≥3；`$var` 亦算） */
const tokensOf = (frags) => {
	const toks = new Set();
	for (const f of frags) for (const t of f.match(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/g) ?? []) if (t.length >= 3) toks.add(t);
	return [...toks];
};
/** 解析引用：`路径:行` 或 `路径:行-行` */
const refsOf = (s) => [...String(s).matchAll(/([\w./-]+\.(?:js|mjs|twee|json|md|html)):(\d+)(?:-(\d+))?/g)]
	.map((m) => ({ file: m[1], from: Number(m[2]), to: Number(m[3] ?? m[2]) }));

/** 路径索引：给**不完整**引用（如 `play.twee`／`span1-hub.js`）用**后缀匹配**解析。
 *  ★顺序＝**本仓（books）优先**、再引擎（故事已归本仓；引擎侧副本待相 B 移除）；
 *  ★**同一棵树里命中多于一处 ⇒ 红**（引用有歧义 ⇒ 写全路径，✗ 猜一个）。 */
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

function resolve(file) {
	let only = null;
	for (const pre of ['books/', 'engine/']) {
		if (file.startsWith(pre)) { only = pre.slice(0, -1); file = file.slice(pre.length); }
	}
	for (const [root, list] of IDX) {
		if (only && (root === BOOKS) !== (only === 'books')) continue;
		const hits = only ? list.filter((rel) => rel === file) : list.filter((rel) => rel === file || rel.endsWith('/' + file));
		if (hits.length === 1) return { root, rel: hits[0] };
		if (hits.length > 1) return { ambiguous: hits, root };
	}
	return null;
}

const readLine = (file, n) => {
	const r = resolve(file);
	if (!r) return { ok: false, why: `文件不存在（本仓／引擎皆无此路径或其后缀）：${file}` };
	if (r.ambiguous) return { ok: false, why: `引用有歧义（同一棵树命中 ${r.ambiguous.length} 处）⇒ 写全路径：${file} ⇒ ${r.ambiguous.slice(0, 3).join('、')}…` };
	const p = path.join(r.root, r.rel);
	const all = fs.readFileSync(p, 'utf8').split(/\r?\n/);
	if (n < 1 || n > all.length) return { ok: false, why: `行号越界：${r.rel}:${n}（共 ${all.length} 行）` };
	return { ok: true, line: all[n - 1], all, resolved: `${r.root === BOOKS ? 'books' : 'engine'}/${r.rel}` };
};

let 符号核 = 0, 仅范围核 = 0, 处 = 0;
/* ★判据形（tester-4 裁乙的**精确**形）：引用写成 `<路径>:<行>`，**紧随其后**可给 `（`符号`）`：
 *      `src/core/70-ui.js:69`（`item.charges`）
 *   · 给了符号 ⇒ **硬判**：所引行（或区间）必须含该符号（逐字）；
 *   · 未给符号 ⇒ 只做「文件存在 ＋ 行号在范围内 ＋ 区间非空」（＝**明账**里的「仅范围核」，可逐条递减到零）。
 *   ✗ 不用「同字段 token 猜」—— 一个字段可有多句/多引用，猜出来的符号会张冠李戴（本席实测：跨字段污染 12 处假红）。 */
const SYM = /（`([^`]{2,80})`）/;
for (const r of 场景) {
	for (const field of ['断言', '备注', '守的面', '构造', '动作']) {
		const raw = field === '断言' ? Object.values(r['断言'] ?? {}).join('\n') : String(r[field] ?? '');
		for (const m of raw.matchAll(/([\w./-]+\.(?:js|mjs|twee|json|md|html)):(\d+)(?:-(\d+))?/g)) {
			处++;
			const ref = { file: m[1], from: Number(m[2]), to: Number(m[3] ?? m[2]) };
			const got = readLine(ref.file, ref.from);
			const at = `${ref.file}:${ref.from}${ref.to !== ref.from ? '-' + ref.to : ''}`;
			if (!got.ok) { fail.push(`[${r.id}] ${got.why}`); continue; }
			const seg = got.all.slice(ref.from - 1, ref.to).join('\n');
			if (seg.trim() === '') { fail.push(`[${r.id}] ${at} 所指区段**空行** —— 行号漂了`); continue; }
			const tail = raw.slice(m.index + m[0].length, m.index + m[0].length + 40);
			const sym = tail.match(SYM)?.[1];
			if (!sym) { 仅范围核++; continue; }
			if (!seg.includes(sym)) {
				fail.push(`[${r.id}] ${at} **不含**其声明的符号 \`${sym}\` ⇒ 行号随版本漂了／指错了地方 —— 复核并同刷`);
			} else 符号核++;
		}
	}
}
console.log(`─ 清单引用核：${场景.length} 条｜引用 ${处} 处（**符号核 ${符号核}**｜仅范围核 ${仅范围核}）｜引擎 ${ENGINE}\n  解析顺序＝本仓优先（同树多命中 ⇒ 红）`);
console.log(`  通过 ${处 - fail.length}｜不符 ${fail.length}　★**明账**：符号核 ${符号核}／仅范围核 ${仅范围核}（后者＝待补显式符号，逐条递减到零）`);
for (const f of fail.slice(0, 12)) console.log(`  ✗ ${f}`);
if (fail.length > 12) console.log(`  …（另 ${fail.length - 12} 条）`);
console.log(fail.length ? '✗ 清单引用核失败' : '✓ 清单引用核通过（行号确含所引符号）');
process.exit(fail.length ? 1 : 0);
