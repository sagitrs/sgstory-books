/* `books#379`：**twee 标签配平门** —— 逐段核「闭合标签数 ≤ 开标签数」（`if`／`unless`）
 *
 * ## 为什么要有这道门（一次真事）
 *   `#354` 实测：外科式摘除只摘**一半** —— `<<if>>`／`<<else>>` 摘掉了，**闭合的 `<</if>>` 留在段尾** ✗
 *   ⇒ 该标签**漏进了正文**（真机可见），而**当时的装置与真机判据都不报警** ✗ ——
 *   它是「读了会当成文案、实为残标签」的那一类：静默、不可见、只在肉眼扫正文时才现形。
 *   ⇒ 本门把「多出来的闭合标签」机械钉住 ✓。
 *
 * ## 判据（★只判**一个方向**，理由写在下面）
 *   **逐段落**：`<</if>>`／`<</unless>>` 的出现数 **≤** `<<if>>`／`<<unless>>` 的出现数。
 *   ★为何**不用等号**：SugarCube 的 `<<unless>>` 允许以 `<</if>>` 闭合（两者同族）⇒ 等号会**误报** ✗；
 *     而「闭多于开」这一向**没有**合法写法 ✓ ⇒ 它才是真缺口。
 *   ★为何**不在本门判**「开多于闭」（未闭合）：那是**编译期**的事（SugarCube 会报错 ⇒ 门在装配自检那一步 ✓），
 *     本门只管**静默**的那一向 ✓（✗ 不越界当编译器）。
 *   ★注释先剥：`/* … *​/` 与 `/% … %/`（档头注释里常**举例**写标签 ⇒ 不剥会误报 ✗，本席实测过一次）。
 *
 * ## 边界（✗ 不假装比实际更强）
 *   · 行扫 + 正则 ⇒ **不理解**标签是否落在**字符串**里（若将来有 `'<</if>>'` 这种字面量，须把该值写成更深的注释或换写法）；
 *   · 只按 `:: 段名` 切段（twee 的段界就是它 ✓），✗ 不解析宏语义（条件真假、嵌套深度都不管 ✓）。
 *
 * 用法：node tools/check-twee-tags.mjs [--root <故事源目录>]｜… --selftest
 * 退出码：0 通过；1 具名红（列出每个超量段落与其行号）；2 装置错（目录缺／无 .twee ⇒ 具名，✗ 不静默当绿）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const 开 = /<<\s*(if|unless)\b/g;
const 闭 = /<<\s*\/\s*(if|unless)\s*>>/g;
const 剥注释 = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/%[\s\S]*?%\//g, '');

const 数 = (s, re) => (s.match(re) ?? []).length;

/** 逐段核 ⇒ 返回问题列表（每条含档、段名、段首行、开、闭） */
const 核 = (root) => {
	const 问题 = [];
	let 档数 = 0, 段数 = 0;
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) { walk(p); continue; }
			if (!p.endsWith('.twee')) continue;
			档数++;
			const 原行 = 剥注释(fs.readFileSync(p, 'utf8')).split('\n');
			let cur = null;
			const 收 = () => {
				if (!cur) return;
				段数++;
				if (cur.闭 > cur.开) 问题.push({ 档: path.relative(root, p), 段: cur.名, 行: cur.首行, 开: cur.开, 闭: cur.闭 });
			};
			for (let i = 0; i < 原行.length; i++) {
				const l = 原行[i];
				if (/^\s*::\s/.test(l)) { 收(); cur = { 名: l.replace(/^\s*::\s*/, '').trim(), 首行: i + 1, 开: 0, 闭: 0 }; continue; }
				if (!cur) { cur = { 名: '（段前）', 首行: 1, 开: 0, 闭: 0 }; }
				cur.开 += 数(l, 开);
				cur.闭 += 数(l, 闭);
			}
			收();
		}
	};
	if (!fs.existsSync(root)) { console.error(`✗ 装置错：故事源目录不存在 ⇒ ${root}`); process.exit(2); }
	walk(root);
	if (!档数) { console.error(`✗ 装置错：\`${root}\` 下没有 .twee ⇒ **证不出**（✗ 不静默当绿）`); process.exit(2); }
	return { 问题, 档数, 段数 };
};

const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const 根 = path.resolve(import.meta.dirname, '..');
const 真根 = path.resolve(arg('--root') ?? path.join(根, 'stories/babel/src'));

if (process.argv.includes('--selftest')) {
	const 临时 = fs.mkdtempSync(path.join(os.tmpdir(), 'twee-'));
	const 造 = (src) => { fs.mkdirSync(临时, { recursive: true }); fs.writeFileSync(path.join(临时, 'x.twee'), src); };
	const 跑 = () => { const r = spawnSync(process.execPath, [import.meta.filename, '--root', 临时], { encoding: 'utf8' }); return { rc: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }; };
	let 过 = 0; const 败 = [];
	/* ① 孤儿闭合标签（`#354` 原形）⇒ 须 rc=1 且具名到该段 */
	造(':: 甲\n正文\n<</if>>\n');
	let r = 跑();
	if (r.rc === 1 && /甲/.test(r.out)) { console.log('  ✓ ①孤儿 `</if>`（`#354` 原形）⇒ 如期红在「甲」'); 过++; }
	else 败.push(`①孤儿闭合：期望 rc=1 且具名「甲」，实 rc=${r.rc}｜${r.out.split('\n').slice(0, 3).join(' / ')}`);
	/* ② 合法成对（if 有闭）⇒ 绿 */
	造(':: 乙\n<<if $x>>是<</if>>\n');
	r = 跑();
	if (r.rc === 0) { console.log('  ✓ ②合法成对 ⇒ 如期绿'); 过++; } else 败.push(`②合法成对：期望 rc=0，实 rc=${r.rc}｜${r.out.split('\n').slice(0, 3).join(' / ')}`);
	/* ③ `<<unless>>` 以 `<</if>>` 闭合（**合法**）⇒ 绿 —— ★这条防的是「用等号」那种过严的尺 */
	造(':: 丙\n<<unless $x>>否<</if>>\n');
	r = 跑();
	if (r.rc === 0) { console.log('  ✓ ③`<<unless>>` 用 `<</if>>` 闭（合法）⇒ 如期绿'); 过++; } else 败.push(`③unless 用 </if> 闭：期望 rc=0（✗ 不得用等号），实 rc=${r.rc}`);
	/* ④ 注释里写标签 ⇒ 绿（★本席实测过一次误报，故立此臂） */
	造(':: 丁\n/* 例：<<if>> … <</if>> */\n正文\n');
	r = 跑();
	if (r.rc === 0) { console.log('  ✓ ④注释里的标签不算（先剥注释）⇒ 如期绿'); 过++; } else 败.push(`④注释：期望 rc=0，实 rc=${r.rc}`);
	/* ⑤ 装置错：空目录 ⇒ rc=2 具名 */
	fs.rmSync(临时, { recursive: true, force: true }); fs.mkdirSync(临时, { recursive: true });
	r = 跑();
	if (r.rc === 2 && /证不出/.test(r.out)) { console.log('  ✓ ⑤无 .twee ⇒ 装置错 rc=2 具名'); 过++; } else 败.push(`⑤装置错：期望 rc=2 具名，实 rc=${r.rc}`);
	fs.rmSync(临时, { recursive: true, force: true });
	for (const b of 败) console.log(`  ✗ ${b}`);
	console.log(`自检：通过 ${过}｜失败 ${败.length}`);
	process.exit(败.length ? 1 : 0);
}

const { 问题, 档数, 段数 } = 核(真根);
if (问题.length) {
	console.error(`✗ twee 标签配平门：${问题.length} 处**闭合标签多于开标签**（\`books#354\` 那类孤儿标签）；共扫 ${档数} 档／${段数} 段：`);
	for (const p of 问题) console.error(`  · ${p.档} 的段「${p.段}」（自第 ${p.行} 行）：闭 ${p.闭} > 开 ${p.开}`);
	console.error('  ⇒ 该类标签会**漏进正文**（真机可见、装置不报警）—— 请补齐或删掉多出的闭合标签。');
	process.exit(1);
}
console.log(`✓ twee 标签配平门通过（${档数} 档／${段数} 段；仅判「闭多于开」这一向 · 注释先剥）`);
