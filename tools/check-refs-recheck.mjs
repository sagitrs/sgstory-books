/* 清单引用核的**独立复算器**（`#300` 条款⑤「两次法则」入册 · 本席在 `books#89`/`#92`/`#93` 三票用过的探针族）
 *
 * 为什么要有第二实现：`tools/check-refs.mjs` 是**判据本体**，但**判据自己不会告诉你它没看什么** ——
 *   它的分母（`处`）由它**自己的字段白名单**导出 ⇒ **白名单外的引用静默不计数**
 *   （＝舰队老教训「分母由被计数物导出 ⇒ 发现不了漏项」；`#300` 条款②「不可解析须成明账」）。
 *   ⇒ 本件用**独立清点**（递归遍历整份清单的全部字符串）与之对账 ⇒ **差集即覆盖缺口**。
 *
 * 本件做四件事（复用 `check-refs.mjs` 的**判据定义**，但**独立实现清点与降级面**）：
 *   ① **清点面**：枚举整份 JSON 里所有 `文件:行` 形引用 ⇒ 分「落在被扫字段」与「**落在未扫字段**」
 *      ★未扫面**点名打印**（✗ 不得静默 —— 今日实测 1 处：`同锚分案.面`）
 *   ② **判据复算**：与 `check-refs.mjs` 同判四事（文件存在／范围非空／声明符号逐字含／散文形一律红）⇒ 打印**应红**集
 *   ③ **降级面**：紧邻引用处**本可核到符号**、但因**显式声明窗口**（40 字符）落下而被降级为「仅范围核」的条目 —— 点名
 *   ④ `--compare`：**跑一次** `check-refs.mjs` 并把**三项读数**（处／不符／符号核）与之对账（✗ 不靠我复述）
 *
 * 用法（★最小可复算集＝**一条命令 ＋ 一个夹具**：夹具＝引擎按 pin 的检出）：
 *   git -C <engine> checkout "$(jq -r .ref <books>/.github/engine-ref.json)"
 *   node tools/check-refs-recheck.mjs --engine <engine>                 # 复算 ＋ 清点
 *   node tools/check-refs-recheck.mjs --engine <engine> --compare        # ＋ 与 check-refs.mjs 对账
 *   node tools/check-refs-recheck.mjs --selftest --engine <engine>       # 刀（正例档＋反例档＋唯一变量）
 * ★引擎根的两种给法都行（**参数优先、回落 `ENGINE`**，与姊妹件 `e2e-drive.mjs` 同约定）：
 *     `--engine <dir>` ｜ `ENGINE=<dir> …`
 *   ⇒ 不带引擎根跑 `--selftest` 是**用法错** ⇒ **具名 rc=2**（✗ 栈回溯）——
 *     否则「崩」在用户视角与「脚本坏了」同形，而本件的双态设计正是「✗ 静默跳过 ⇒ 会让复算变装饰」。
 * 退出码：0 全通过；1 有「应红」或**对账不符**；2 用法／环境错（缺引擎检出 ⇒ 具名，✗ 静默跳过）。
 *
 * ⚠ **本件不判「闸」**（✗ 不改 `check-refs.mjs`、✗ 不使它失效）：它是**第二双眼睛**。
 *   本席**刻意不在同一笔里改被核对象** —— 那会让「复算」失去独立性（自己改判据再自己核）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOKS = path.resolve(HERE, '..');
const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const has = (f) => argv.includes(f);
const ENGINE = argOf('--engine') ?? process.env.ENGINE ?? null;
const DEFAULT_JSON = path.join(BOOKS, 'stories/babel/scenarios/scenarios.json');

/* ── 判据定义：**与 `check-refs.mjs` 逐字同形**（引用核的判据归 T 席；此处的「同形」本身是一条判据） ── */
const CIT = /([\w./-]+\.(?:js|mjs|twee|json|md|html)):(\d+)(?:-(\d+))?/g;
const PROSE = /`([\w./-]+\.(?:js|mjs|twee|json|md|html))`\s*第\s*(\d+)\s*行/g;
const SYM = /（`([^`]{2,80})`）/;
const SYM_WINDOW = 40;                                          // ★被核对象的窗口长度（§③ 降级面的直接成因）
const SCANNED = ['断言', '备注', '守的面', '构造', '动作'];      // ★被核对象的字段白名单
const SKIP = new Set(['node_modules', '.git', 'dist', 'build']);

/* ── 独立清点：递归走**整份**清单（✗ 不用字段白名单 —— 白名单正是要核的对象） ── */
function walkStrings(node, p = '') {
	const out = [];
	if (typeof node === 'string') out.push([p, node]);
	else if (Array.isArray(node)) node.forEach((v, i) => out.push(...walkStrings(v, `${p}[${i}]`)));
	else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) out.push(...walkStrings(v, p ? `${p}.${k}` : k));
	return out;
}
const topField = (p) => p.split('.').find((s) => !s.startsWith('[')) ?? p;

/* ── 索引与解析：**与 `check-refs.mjs` 同解析顺序**（本仓优先 ⇒ 同树多命中为歧义；★`#127`：**两树都命中而内容异 ⇒ 红**，与主件**同刀** ⇒ 两件解析顺序须逐条一致 ✓） ──
 *   ★本席曾在此栽过：拿**引擎副本**的行号去评 books 的实指 ⇒ 假红一条（已撤回；`#300` 条款②「实际形优先」）。 */
function index(root) {
	const out = [];
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			if (SKIP.has(e.name)) continue;
			const q = path.join(d, e.name);
			if (e.isDirectory()) walk(q); else out.push(path.relative(root, q).split(path.sep).join('/'));
		}
	};
	walk(root);
	return out;
}
function makeResolver(engine) {
	const IDX = [[BOOKS, index(BOOKS)], [engine, index(engine)]];
	return (rawFile) => {
		let file = rawFile, only = null;
		for (const pre of ['books/', 'engine/']) if (file.startsWith(pre)) { only = pre.slice(0, -1); file = file.slice(pre.length); }
		const 命中 = [];
		for (const [root, list] of IDX) {
			if (only && (root === BOOKS) !== (only === 'books')) continue;
			const hits = only ? list.filter((r) => r === file) : list.filter((r) => r === file || r.endsWith('/' + file));
			if (hits.length > 1) return { ambiguous: hits };
			if (hits.length === 1) 命中.push({ root, rel: hits[0] });
		}
		if (命中.length === 0) return null;
		if (命中.length === 1) return 命中[0];
		/* ★★`#127` 同刀移植（t4 非阻断②「潜伏盲」）：本件与 `check-refs.mjs` **同解析顺序** ⇒
		 *   那条「**两树都命中而内容异 ⇒ 红**」必须**同刀**落在这里（否则孪生件仍静默取本仓 ✗）。 */
		const 本 = 命中.find((x) => x.root === BOOKS) ?? 命中[0];
		const 引 = 命中.find((x) => x !== 本);
		if (!引) return 本;
		const 文 = (x) => fs.readFileSync(path.join(x.root, x.rel), 'utf8');
		if (文(本) === 文(引)) return 本;
		return { 跨树异: { 本仓: 本, 引擎: 引 } };
	};
}
function judge(resolve, rawFile, from, to) {
	const r = resolve(rawFile);
	if (!r) return { ok: false, why: `文件不存在（本仓／引擎皆无此路径或其后缀）：${rawFile}` };
	if (r.ambiguous) return { ok: false, why: `引用有歧义（同树命中 ${r.ambiguous.length} 处）⇒ 写全路径：${rawFile} ⇒ ${r.ambiguous.slice(0, 3).join('、')}…` };
	if (r.跨树异) return { ok: false, why: `★**两树都命中且内容不同**（books：${r.跨树异.本仓.rel} ／ engine：${r.跨树异.引擎.rel}）⇒ 须写**树限定**：「books/${rawFile}」或「engine/${rawFile}」` };
	const all = fs.readFileSync(path.join(r.root, r.rel), 'utf8').split(/\r?\n/);
	if (from < 1 || from > all.length) return { ok: false, why: `行号越界：${r.rel}:${from}（共 ${all.length} 行）` };
	const seg = all.slice(from - 1, to).join('\n');
	if (seg.trim() === '') return { ok: false, why: `${rawFile}:${from} 所指区段**空行** —— 行号漂了` };
	return { ok: true, seg };
}

/** 复算一份清单（返回结构与 `check-refs.mjs` 的三项读数**同名**，便于 `--compare` 逐项对账）。 */
export function recheck(doc, engine) {
	const resolve = makeResolver(engine);
	const 场景 = doc['场景'];
	const rows = [], unscanned = [], degraded = [];
	let 处 = 0, 符号核 = 0, 仅范围核 = 0;
	const 应红 = [];
	for (const r of 场景) {
		for (const [p, raw] of walkStrings(r)) {
			const field = topField(p);
			const scanned = SCANNED.includes(field);
			const cits = [...raw.matchAll(CIT)];   // ★先收成数组：降级面的搜索窗须**止于下一条引用**（✗ 否则会把它条的符号算作本条）
			for (let ci = 0; ci < cits.length; ci++) {
				const m = cits[ci];
				const from = Number(m[2]), to = Number(m[3] ?? m[2]);
				const at = `${m[1]}:${from}${to !== from ? '-' + to : ''}`;
				if (!scanned) { unscanned.push({ id: r.id, field, at }); continue; }   // ★不计数即不判 —— 缺口在此
				处++;
				const j = judge(resolve, m[1], from, to);
				const sym = raw.slice(m.index + m[0].length, m.index + m[0].length + SYM_WINDOW).match(SYM)?.[1];
				/* ★③ 降级面：紧邻处**有** `` （`符号`） `` 形，但落在窗口之外 ⇒ 被降级成「仅范围核」。点名（✗ 静默）。 */
				if (!sym) {
					const after = m.index + m[0].length;
					const bound = cits[ci + 1]?.index ?? raw.length;   // ★本条的声明窗＝[本条引用末, 下一条引用始)
					const next = raw.slice(after, Math.min(after + 200, bound)).match(SYM)?.[1];
					if (next) degraded.push({ id: r.id, field, at, sym: next });
					仅范围核++;
				}
				if (!j.ok) { 应红.push(`[${r.id}/${field}] ${j.why}`); continue; }
				if (!sym) { rows.push(`${r.id}|${field}|${at}|仅范围核`); continue; }
				if (!j.seg.includes(sym)) 应红.push(`[${r.id}/${field}] ${at} **不含**其声明的符号 \`${sym}\` ⇒ 行号随版本漂了／指错了地方`);
				else { 符号核++; rows.push(`${r.id}|${field}|${at}|符号核:${sym}`); }
			}
			for (const m of raw.matchAll(PROSE)) {
				const line = `[${r.id}/${field}] 引用写成**散文形**（\`${m[1]}\` 第 ${m[2]} 行）⇒ 请写规范形 \`${m[1]}:${m[2]}\``;
				if (scanned) 应红.push(line); else unscanned.push({ id: r.id, field, at: `${m[1]}:${m[2]}（散文形）` });
			}
		}
	}
	return { 条数: 场景.length, 处, 符号核, 仅范围核, 不符: 应红.length, 应红, unscanned, degraded, rows };
}

/* ── 打印（人读 ＋ 机读两段；★「未扫面」为 0 时也**必须打印该行** —— 「没扫到」与「没有」不可混淆） ── */
function report(name, doc, engine, quiet = false) {
	const R = recheck(doc, engine);
	if (!quiet) {
		console.log(`─ 复算（独立实现）：${name}｜${R.条数} 条｜规范形引用 ${R.处} 处（**符号核 ${R.符号核}**｜仅范围核 ${R.仅范围核}）`);
		console.log(`  解析顺序＝本仓优先（与 check-refs.mjs 同）｜被扫字段白名单＝${SCANNED.join('／')}`);
		console.log(`  ★清点面（**独立枚举整份清单**，✗ 用白名单）：未扫字段里的引用 **${R.unscanned.length}** 处`);
		for (const u of R.unscanned) console.log(`      · 未扫：[${u.id}] 字段=\`${u.field}\` ⇒ \`${u.at}\``);
		if (R.unscanned.length === 0) console.log('      · （无 —— 但本行仍须打印：✗ 让「没扫到」与「没有」同形）');
		console.log(`  ★降级面（紧邻有符号声明但落在 ${SYM_WINDOW} 字符窗口之外 ⇒ 降为仅范围核）：**${R.degraded.length}** 处`);
		for (const d of R.degraded) console.log(`      · [${d.id}/${d.field}] ${d.at} 的 \`${d.sym}\` 未被核到（窗口外）`);
		console.log(`  应红 ${R.应红.length} 条`);
		for (const f of R.应红.slice(0, 12)) console.log(`      ✗ ${f}`);
		if (R.应红.length > 12) console.log(`      …（另 ${R.应红.length - 12} 条）`);
	}
	return R;
}

/* ── 刀：正例档 ＋ 反例档 ＋ **唯一变量**（`#300` 条款⑤「对照档」） ── */
function selftest() {
	/* ★用法守卫（与主路径同形，✗ 只住 CLI 分支）：`--selftest` 现在走**单一解析源 `ENGINE`**
	 *   ⇒ 缺引擎根时若不放行，会崩在 `fs.readdirSync(undefined)`（`ERR_INVALID_ARG_TYPE` 栈回溯）。
	 *   崩溃 ≠ 报错：用户视角与「脚本坏了」同形 ⇒ 必须**具名 rc=2**。 */
	if (!ENGINE) { console.error('✗ 缺 `--engine <引擎检出目录>`（或 `ENGINE=<dir>`）—— `--selftest` 也要引擎树（夹具＝pin 产物的一部分）'); return 2; }
	if (!fs.existsSync(ENGINE)) { console.error(`✗ 引擎检出不存在：${ENGINE}`); return 2; }
	const K = [];
	const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? '/tmp', 'recheck-'));
	const mk = (obj) => { const p = path.join(tmpDir, 'f.json'); fs.writeFileSync(p, JSON.stringify(obj, null, 2)); return p; };
	const base = (render) => ({ 场景: [{ id: 'fx', 主锚: 'sagitrs/sgstory#1', 断言: { 渲染: render } }] });
	/* ★夹具指向**引擎树里真实存在**的文件（夹具＝pin 产物的一部分）；此处用引擎树内一条稳定行 */
	const TGT = 'core/05-dice.js';
	/* ★用**已解析的常量** `ENGINE`（✗ `process.env.ENGINE`）：后者使 `--engine` 对 `--selftest` 完全无效
	 *   ⇒ 「照文件头声明跑」与「带参数跑」行为不同（本席原版即此错，dev-10 锚出）。 */
	const engineTree = ENGINE;
	const resolve0 = makeResolver(engineTree);
	const hit = resolve0(TGT);
	if (!hit || hit.ambiguous) { console.error(`✗ selftest 夹具前提不成立：引擎树里 «${TGT}» 应唯一命中（实得 ${JSON.stringify(hit)}）`); return 2; }
	const lineN = fs.readFileSync(path.join(hit.root, hit.rel), 'utf8').split(/\r?\n/).length;
	const okLine = fs.readFileSync(path.join(hit.root, hit.rel), 'utf8').split(/\r?\n/).findIndex((l) => l.includes('RPG.rng')) + 1;

	const run = (obj) => recheck(JSON.parse(fs.readFileSync(mk(obj), 'utf8')), engineTree);
	/* ★「两臂可分辨」自证（开跑前）：正例档 0 红 ∧ 反例档 ≥1 红 ⇒ 两臂可分 */
	const A = run(base(`\`${TGT}:${okLine}\`（\`RPG.rng\`）`));            // 正例档
	const B = run(base(`\`${TGT}:${lineN + 50}\``));                       // 反例档（越界）
	K.push([A.应红.length === 0, `★两臂可分辨 · 正例档 ⇒ **0 红**（实得 ${A.应红.length}）`]);
	K.push([B.应红.length >= 1, `★两臂可分辨 · 反例档 ⇒ **≥1 红**（实得 ${B.应红.length}）`]);
	/* ① 越界 ⇒ 红；② 符号不符 ⇒ 红；③ **唯一变量**：只改符号名（其余一字不动）⇒ 由绿转红 */
	const C = run(base(`\`${TGT}:${okLine}\``));
	K.push([C.应红.length === 0, '① 只给范围（无符号声明）⇒ ✗ 不红（仅范围核，明账）']);
	const D = run(base(`\`${TGT}:${okLine}\`（\`绝不存在的符号-xyz\`）`));
	K.push([D.应红.length >= 1 && D.应红[0].includes('不含'), '② 声明的符号与所引行不符 ⇒ **红**']);
	const E = base(`\`${TGT}:${okLine}\`（\`RPG.rng\`）`);
	const F = base(`\`${TGT}:${okLine}\`（\`RPG.rng\`）`); F.场景[0].同锚分案 = { 面: `\`${TGT}:${lineN + 99}\`` };
	const E2 = run(E), F2 = run(F);
	K.push([E2.unscanned.length === 0, '★唯一变量 · 对照片：无未扫引用 ⇒ 未扫面 = 0']);
	K.push([F2.unscanned.length === 1 && F2.应红.length === E2.应红.length,
		'★唯一变量 · 实验档：只**加一条未扫字段里的引用** ⇒ 未扫面 = 1 而**应红数不变**（＝缺口**不判红**这一事实本身）']);
	const G = run(base('`' + TGT + '` 第 ' + okLine + ' 行'));
	K.push([G.应红.length >= 1 && G.应红[0].includes('散文形'), '③ 散文形 ⇒ **红**']);	/* ④ 降级面：符号声明放在窗口之外 ⇒ 计入「降级」而非「仅范围核」 */
	const H = run(base(`\`${TGT}:${okLine}\`` + '　'.repeat(45) + `（\`RPG.rng\`）`));
	K.push([H.degraded.length === 1, `④ 符号声明落在 ${SYM_WINDOW} 字符窗口之外 ⇒ 计入**降级面**（实得 ${H.degraded.length}）`]);
	/* ⑤ ★**两件约定同形**（dev-10 `#98` RC 的那条）：裸 `--selftest`（无引擎根）须**具名 rc=2**，✗ 栈回溯。
	 *   这是**真子进程**刀（✗ 读码）：夹具＝本件与姊妹件，调用形＝**真命令行**。
	 *   ★该刀能红：把 `selftest()` 开头的 `!ENGINE ⇒ 2` 守卫删掉 ⇒ 裸形当下游 `readdirSync(undefined)` 崩（rc=1 栈回溯） ⇒ 本刀红。 */
	/* ★**禁止递归**：⑤b 的子进程本身也会进 `selftest()`，若不加哨兵则**无限 spawn**（本席实测：
	 *   `--selftest --engine <dir>` 挂死至超时 —— 递归是本刀自造的，✗ 被验对象的问题）。
	 *   哨兵只给 `--engine` 那一次（裸子进程在守卫处就返回 2，✗ 到不了这里）。 */
	if (process.env.RECHECK_SELFTEST_CHILD !== '1') {
		for (const [file, tag] of [['check-refs-recheck.mjs', '本件'], ['e2e-drive.mjs', '姊妹件']]) {
			const bare = spawnSync(process.execPath, [path.join(HERE, file), '--selftest'], { encoding: 'utf8', env: { ...process.env, ENGINE: '' } });
			const bo = (bare.stdout ?? '') + (bare.stderr ?? '');
			K.push([bare.status === 2 && /缺 .--engine/.test(bo),
				`⑤a ★两件约定同形 · ${tag} 裸 \`--selftest\`（无引擎根）⇒ **具名 rc=2**（✗ 栈回溯）—— 实得 rc=${bare.status}｜${bo.trim().split('\n').pop()?.slice(0, 46) ?? ''}`]);
			const withArg = spawnSync(process.execPath, [path.join(HERE, file), '--selftest', '--engine', ENGINE],
				{ encoding: 'utf8', env: { ...process.env, ENGINE: '', RECHECK_SELFTEST_CHILD: '1' } });
			K.push([withArg.status === 0,
				`⑤b ★两件约定同形 · ${tag} \`--selftest --engine <dir>\`（**参数优先**，无 env）⇒ rc=0 —— 实得 rc=${withArg.status}`]);
		}
	}
	fs.rmSync(tmpDir, { recursive: true, force: true });
	let bad = 0;
	for (const [okk, name] of K) { if (!okk) bad++; console.log(`  ${okk ? '✓' : '✗'} ${name}`); }
	console.log(bad === 0 ? `\n✓ recheck 自检全部如期（${K.length}/${K.length} 刀）` : `\n✗ ${bad}/${K.length} 刀未如期`);
	return bad === 0 ? 0 : 1;
}

/* ── CLI 派发：`--selftest` 与主路径**同一解析源**（`ENGINE` ＝ 参数优先、回落 env）── */
let rc = 0;
if (has('--selftest')) rc = selftest();
else {
	if (!ENGINE) { console.error('✗ 缺 `--engine <引擎检出目录>`（✗ 不可静默跳过本核 —— 那会让复算变装饰）'); process.exit(2); }
	if (!fs.existsSync(ENGINE)) { console.error(`✗ 引擎检出不存在：${ENGINE}`); process.exit(2); }
	const JSONF = argv.find((a) => a.endsWith('.json')) ?? DEFAULT_JSON;
	const R = report(path.relative(BOOKS, JSONF), JSON.parse(fs.readFileSync(JSONF, 'utf8')), ENGINE);
	if (R.应红.length) rc = 1;
	if (has('--compare')) {
		/* ★对账用**被核对象的自报**（✗ 本席复述）：跑一次它，解析其汇总行，逐项比。 */
		const p = spawnSync(process.execPath, [path.join(HERE, 'check-refs.mjs'), '--engine', ENGINE, JSONF], { encoding: 'utf8' });
		const out = (p.stdout ?? '') + (p.stderr ?? '');
		const m = out.match(/规范形引用 (\d+) 处（\*\*符号核 (\d+)\*\*｜仅范围核 (\d+)）/);
		const f = out.match(/通过 (\d+)｜不符 (\d+)/);
		if (!m || !f) { console.error(`✗ --compare：解析不出 check-refs.mjs 的读数（rc=${p.status}）\n${out.slice(0, 400)}`); rc = 1; }
		else {
			const theirs = { 处: +m[1], 符号核: +m[2], 仅范围核: +m[3], 不符: +f[2] };
			console.log(`─ 对账（vs check-refs.mjs，其自报 rc=${p.status}）：`);
			for (const k of ['处', '符号核', '仅范围核', '不符']) {
				const same = theirs[k] === R[k];
				console.log(`    ${same ? '✓' : '✗'} ${k}：它 ${theirs[k]} ／ 我 ${R[k]}${same ? '' : '　★**不等 ⇒ 判据面覆盖差**'}`);
				if (!same) rc = 1;
			}
			console.log(`    ★它看不见的：未扫字段引用 **${R.unscanned.length}** 处（其字段白名单＝${SCANNED.join('／')}）⇒ 见上方清点面`);
		}
	}
	console.log(rc ? '✗ 复算：有应红或对账不符' : '✓ 复算：与 check-refs.mjs 一致，且未扫面已点名');
}
process.exit(rc);
