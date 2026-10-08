#!/usr/bin/env node
/* `books#315` 附三 · **合前检查器** —— 把「合前必跑的两条」从 README 文字变成**机器说了算**。
 *
 * ## 判谁（两条判据 · 各带可复跑的口径）
 *   ① **基座同尖**：`merge-base(<main>, <票头>)` 必须 **===** `<main>`。
 *      ★落后 ⇒ 该票对**现 main** 的 diff 里会带**回退行** ⇒ 合入会抹掉别的笔刚合的东西。
 *   ② **回退行 0**：对现 main 的 `--numstat` 里，**没有「只删不加」（新增 0 行）的档**。
 *      ★口径＝**3-dot（对 merge-base）**；★**基座落后时**建议再**干跑合并**核一次，
 *        ✗ **不可**用 **2-dot** 两树直比（含 main 自己的推进 ⇒ 会误读成「回退行」）。
 *   ③ （给了 `--prior` 才算）**patch-id**：纯 rebase ⇒ 同改动集在不同基座上的指纹**逐字同**
 *      ⇒ ★先前核过的读数**沿用不重跑**；不同 ⇒ 内容有变 ⇒ 该核的全核。
 *
 * ## 一处源（✗ 不写死）
 *   ★`<main>` 默认 `origin/main`（可 `--main` 覆盖）；★**判据与命令照 `tools/README.md` 附三抄**：
 *     `git diff --numstat <main> <头> | awk '$1=="0"'` ⇒ 本器用**同一判据**（新增行数 0）。
 *
 * ## 装置与退出码（同 210／216 族）
 *   `0` 全绿（★打印两条读数，✗ 不是「通过」二字）｜
 *   `1` 判据红（★逐条具名：哪个档只删不加／patch-id 不同）｜
 *   `2` 装置错（✗ 不当判据红）：不在 git 仓里／取不到 main 或票头／`--selftest` 合成例对不上。
 *
 * ## 明账（★本器证不了的事，写在前面）
 *   · **patch-id 逐字同 ⇒ 「同一改动集」**，★✗ 不证「内容在语义上等价」（例如改注释与改代码可能同 id）。
 *   · **基座同尖 ✗ 不证内容对** —— 本器只管"基座/回退"这一面；内容面另有人核。
 *   · 「只删不加」按**新增行数 == 0** 判（照 README 附三的写法）⇒ ★**纯改名**与**二进制**档
 *     在同一判据下可能形态不同（`numstat` 对二进制印 `-`）⇒ ★那类档请人眼看一眼，✗ 别只信本器。
 *
 * 用法：
 *   node tools/check-premerge.mjs --head <票头> [--base <声明基>] [--prior <旧头>] [--main origin/main] [--repo <仓>]
 *   ★`--base`（**声明基**）＝本器**三面一律对它判**的那个基 ✓；缺省＝`GITHUB_BASE_REF`（CI 的 PR 声明 base ✓）⇒ 再缺省 `--main`／`origin/main` ✓（**输出会明写判的是哪个 base** ✓）。
 *   ★`--prior`＝③patch-id 的**旧头**（旧名曾写作 `--base` ⇒ 已改名，✗ 混用 ✓）。
 *   node tools/check-premerge.mjs --selftest
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);

/** 在指定仓里跑 git；失败即**装置错**（✗ 不当判据红）。 */
function git(repo, ...args) {
	try { return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
	catch (e) { const err = new Error(`git ${args.join(' ')} 失败：${(e.stderr || e.message || '').toString().trim().split('\n')[0]}`);
		err.装置错 = true; throw err; }
}

/**
 * ★**基座落后时的提示**（`books#315` 附三加固 · 2026-10-05）。
 *   本器的 ② 已按 **3-dot**（对 merge-base）判 ⇒ 落后也不会误报 ✓；
 *   但**合并结果仍建议干跑**（`git merge --no-commit --no-ff <票头>`）核一次回退面 ✓。
 *   ★**✗ 不可**用 **2-dot** 两树直比 —— 含 main 自己的推进 ⇒ 会误读成「回退行」 ✗。
 *   返回 '' ⇒ 同尖（无须提示）。
 */
function 落后提示(MB, MAIN, 落后档数) {
	if (!MB || !MAIN || MB === MAIN) return '';
	const n = Number.isFinite(落后档数) ? `${落后档数} 档` : 'N 档';
	return `  ⇒ ★基座落后 ${n}（merge-base ${String(MB).slice(0, 8)}）⇒ **回退面建议再干跑一次合并**：`
		+ '`git merge --no-commit --no-ff <票头>`（附：3-dot `git diff --numstat <main>...<票头>` 即本器 ② 的口径）；'
		+ '★**✗ 不可**用 `git diff <main> <票头>`（**2-dot** 两树直比 —— 含 main 自己的推进 ⇒ 会误读成「回退行」）';
}

/** ★判据本体（与 `--selftest` **共用** ⇒ 自测验的就是真判据）。 */
export function 检查一(repo, main, head) {
	const MB = git(repo, 'merge-base', main, head);
	const MAIN = git(repo, 'rev-parse', main);
	const 同尖 = MB === MAIN;
	/* ★**3-dot（对 merge-base）**：只量**本笔自己的改动**（＝ squash 真正会落的东西 ✓）。
	 *   ✗ 不用 2-dot（`main head` 两树直比）—— 基座落后时会把 **main 自己那几档的推进**也算成差异
	 *   ⇒ 会**误报大批『只删不加』**（本席 2026-10-05 在 `books#334` 上实栽过一次 ✗）。 */
	const 行 = git(repo, 'diff', '--numstat', MB, head).split('\n').filter(Boolean);
	const 回退 = 行.map((l) => l.split('\t')).filter((c) => c[0] === '0').map((c) => c[2]);
	return { 同尖, MB, MAIN, 回退, 行数: 行.length };
}
export function 检查二(repo, base, head, cur) {
	const pid = (a, b) => git(repo, 'diff', git(repo, 'merge-base', a, b), b).length
		? execFileSync('git', ['-C', repo, 'diff', git(repo, 'merge-base', a, b), b], { encoding: 'utf8' })
			: '';
	const one = (ref) => {
		const d = execFileSync('git', ['-C', repo, 'diff', git(repo, 'merge-base', cur, ref), ref], { encoding: 'utf8' });
		return execFileSync('git', ['patch-id', '--stable'], { input: d, encoding: 'utf8' }).trim().split(' ')[0];
	};
	return { 旧: one(base), 新: one(head) };
}

function 跑头注() {
	console.log('◆ check-premerge：合前检查（①基座同尖 ②回退行 0 ③patch-id 可选）');
	console.log('  ★明账：patch-id 只证「同一改动集」✗ 不证语义等价；同尖 ✗ 不证内容对；纯改名/二进制档请人眼过。');
}

/** ★`#505`：**声明基**的解析（纯函数 ⇒ `--selftest` 与主流程**共用同一判据** ✓）。
 *   顺序：`--base`（显式 ✓）⇒ `GITHUB_BASE_REF`（CI 的 PR 声明 base ✓）⇒ 缺省 `--main`／`origin/main` ✓（**明账** ✓）。 */
export function 解析声明基({ 显式 = null, 环境基 = null, 缺省 = 'origin/main' } = {}) {
	if (显式) return { ref: 显式, 源: '--base（显式）' };
	if (环境基) return { ref: `origin/${环境基}`, 源: 'GITHUB_BASE_REF（CI 的 PR 声明 base）' };
	return { ref: 缺省, 源: '缺省 `--main`／`origin/main`（★✗ 给 --base、✗ 非 PR 事件 ⇒ 明账）' };
}

function 主流程() {
	if (has('--selftest')) return 自检();
	跑头注();
	const repo = path.resolve(arg('--repo', process.cwd()));
	const head = arg('--head');
	if (!head) { console.error('✗ 装置错：缺 --head <票头>（用法见档头）'); process.exit(2); }
	/* ★★`#505`（2026-10-08 · 领队令）：**按「声明 base」判**（✗ 写死 main ✓）——
	 *   新分流（main＝0.0.3 阻塞修复专线／dev＝全速开发线 ✓）下，**dev 线的笔本就不该与 main 同尖** ✗
	 *   ⇒ 拿 main 当基会常报「基座落后」✗（**那是常态 ✗ 缺陷** ✓）。
	 *   ⇒ 三面一律对**声明基**判 ✓，并把**判的是哪个 base**明写出来（✗ 让人猜 ✓）。 */
	const 声明基 = 解析声明基({ 显式: arg('--base'), 环境基: process.env.GITHUB_BASE_REF, 缺省: arg('--main', 'origin/main') });
	let main = 声明基.ref;
	try { git(repo, 'rev-parse', '--git-dir'); }
	catch { console.error(`✗ 装置错：${repo} 不是 git 仓`); process.exit(2); }
	let r1; try { r1 = 检查一(repo, main, head); }
	catch (e) { console.error(`✗ 装置错（✗ 不当判据红）：${e.message}\n   ⇒ 核 --main／--head／--repo 是否指对`); process.exit(2); }
	const 红 = [];
	/* ★明写「判的是哪个 base」+ 它的 sha（✗ 让人猜 ✓） */
	let 基sha = '?'; try { 基sha = git(repo, 'rev-parse', '--short', 声明基.ref).trim(); } catch (e) { /* 取不到 ⇒ 下面装置错会拦 ✓ */ }
	console.log(`  ★判基：${声明基.ref}@${基sha}（源：${声明基.源}）`);
	console.log(`  ① 基座同尖（对**声明基**）：merge-base=${r1.MB.slice(0, 8)}｜基=${r1.MAIN.slice(0, 8)} ⇒ ${r1.同尖 ? '✓ 同尖' : '✗ 落后'}`);
	if (!r1.同尖) 红.push(`✗ ① 基座落后**声明基** ${声明基.ref}（merge-base ${r1.MB.slice(0, 8)} ≠ 基 ${r1.MAIN.slice(0, 8)}）—— ★先把声明基并进来（rebase／merge）再谈内容`);
	if (!r1.同尖) {
		let 落后 = NaN;
		try { 落后 = Number(git(repo, 'rev-list', '--count', `${r1.MB}..${r1.MAIN}`).trim()); } catch (e) { /* ✗ 吞：取不到就不写档数 ✓ */ }
		const 提示 = 落后提示(r1.MB, r1.MAIN, 落后);
		if (提示) console.log(提示);
	}
	console.log(`  ② 回退行（对**声明基**的 3-dot）：共 ${r1.行数} 档｜★只删不加 = ${r1.回退.length} 档`);
	for (const p of r1.回退.slice(0, 12)) console.log(`      ✗ ${p}`);
	if (r1.回退.length) 红.push(`✗ ② 有 ${r1.回退.length} 个档「只删不加」⇒ 合入会抹掉别的笔刚合的内容`);
	const base = arg('--prior');
	if (base) {
		let r2; try { r2 = 检查二(repo, base, head, main); }
		catch (e) { console.error(`✗ 装置错：--prior 核不动（${e.message}）`); process.exit(2); }
		const 同 = r2.旧 === r2.新;
		console.log(`  ③ patch-id：旧=${r2.旧.slice(0, 16)}…｜新=${r2.新.slice(0, 16)}… ⇒ ${同 ? '✓ 纯 rebase（读数沿用）' : '✗ 内容有变（读数须重跑）'}`);
		if (!同) 红.push('✗ ③ patch-id 不同 ⇒ ✗ 不只是换基座，内容面须重核');
	} else console.log(`  ③ patch-id：✗ 未给 --prior ⇒ 本面不判（明账）`);
	if (红.length) { console.log(''); for (const l of 红) console.log(`  ${l}`); console.log(`  ⇒ ★判据红 ${红.length} 条`); process.exit(1); }
	console.log(`  ⇒ ★通过（①同尖 ✓｜②回退行 0 ✓${base ? '｜③纯 rebase ✓' : ''}）`); process.exit(0);
}

/** ★合成例自检：造临时仓，证**门能红**也证**门不滥红**。 */
function 自检() {
	const T = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-'));
	const 跑 = (cwd, ...a) => execFileSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
	const 新仓 = (n) => { const d = path.join(T, n); fs.mkdirSync(d, { recursive: true }); execFileSync('git', ['init', '-q', '-b', 'main', d]); 跑(d, 'config', 'user.email', 't@t'); 跑(d, 'config', 'user.name', 't'); return d; };
	const 写 = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
	const 提 = (d, m) => { 跑(d, 'add', '-A'); 跑(d, 'commit', '-q', '-m', m); };
	let 通过 = 0, 失败 = 0;
	const 断言 = (名, cond, 实得) => { if (cond) { console.log(`  ✓ ${名}`); 通过++; } else { console.log(`  ✗ ${名} —— 实得：${实得}`); 失败++; } };
	console.log('◆ check-premerge --selftest：合成例（门能红 ＋ 门不滥红 ＋ 装置错可分）');
	// ── 例 1：落后头 ⇒ ① 该红 ──
	const A = 新仓('a'); 写(A, 'x.txt', '1\n'); 提(A, 'base');
	跑(A, 'branch', '-q', 'feat'); 跑(A, 'checkout', '-q', 'feat'); 写(A, 'feat.txt', 'f\n'); 提(A, 'feat 自己那一笔');
	跑(A, 'checkout', '-q', 'main'); 写(A, 'y.txt', '2\n'); 提(A, 'main 又前进一笔');
	const r1 = 检查一(A, 'main', 'feat');
	断言('K1 落后头 ⇒ ① 判红（同尖=false）', r1.同尖 === false, JSON.stringify({ 同尖: r1.同尖 }));
	// ── 例 2：同尖干净头 ⇒ 该绿（★证门不滥红）──
	const B = 新仓('b'); 写(B, 'x.txt', '1\n'); 提(B, 'base');
	跑(B, 'branch', '-q', 'feat'); 跑(B, 'checkout', '-q', 'feat'); 写(B, 'feat.txt', 'f\n'); 提(B, 'feat 那一笔');
	跑(B, 'checkout', '-q', 'main');
	const r2 = 检查一(B, 'main', 'feat');
	断言('K2 同尖干净头 ⇒ ① 绿', r2.同尖 === true, JSON.stringify({ 同尖: r2.同尖 }));
	断言('K3 同尖干净头 ⇒ ② 回退行 0', r2.回退.length === 0, JSON.stringify(r2.回退));
	/* ★K8/K9（附三加固）：落后提示 —— 纯函数两向 ＋ 械防调用点 ✓ */
	const 提落 = 落后提示('aaaaaaaa', 'bbbbbbbb', 27);
	断言('K8a 落后 ⇒ 提示含「干跑」「2-dot ✗」', /merge --no-commit --no-ff/.test(提落) && /2-dot/.test(提落) && /✗ 不可/.test(提落), 提落.slice(0, 56) + '…');
	断言('K8b 同尖 ⇒ 无提示（✗ 滥报）', 落后提示('same', 'same', 0) === '' && 落后提示('', '', 0) === '', JSON.stringify(落后提示('same', 'same', 0)));
	const 自文 = fs.readFileSync(new URL(import.meta.url), 'utf8');
	断言('K9 ★①落后时调用 落后提示（✗ 不许删掉调用点）', /if \(!r1\.同尖\) \{[\s\S]{0,220}落后提示\(/.test(自文), '命中=' + /if \(!r1\.同尖\) \{[\s\S]{0,220}落后提示\(/.test(自文));
	// ── 例 3：同尖但**只删不加** ⇒ ② 该红（★证 ② 有牙，✗ 不是永绿）──
	const C = 新仓('c'); 写(C, 'x.txt', '1\n'); 写(C, 'gone.txt', 'g\n'); 提(C, 'base');
	跑(C, 'branch', '-q', 'feat'); 跑(C, 'checkout', '-q', 'feat'); fs.unlinkSync(path.join(C, 'gone.txt')); 提(C, '删掉一个档');
	跑(C, 'checkout', '-q', 'main');
	const r3 = 检查一(C, 'main', 'feat');
	断言('K4 同尖但只删不加 ⇒ ② 检出该档', r3.回退.includes('gone.txt'), JSON.stringify(r3.回退));
	// ── 例 4：纯 rebase ⇒ patch-id 该同 ──
	const D = 新仓('d'); 写(D, 'x.txt', '1\n'); 提(D, 'base');
	跑(D, 'branch', '-q', 'feat'); 跑(D, 'checkout', '-q', 'feat'); 写(D, 'feat.txt', 'f\n'); 提(D, 'feat 那一笔');
	const 旧头 = 跑(D, 'rev-parse', 'feat').trim();
	跑(D, 'checkout', '-q', 'main'); 写(D, 'z.txt', '3\n'); 提(D, 'main 前进');
	跑(D, 'checkout', '-q', 'feat'); 跑(D, 'rebase', '-q', 'main');
	const r4 = 检查二(D, 旧头, 'feat', 'main');
	断言('K5 纯 rebase ⇒ patch-id 逐字同（读数沿用）', r4.旧 === r4.新, JSON.stringify(r4));
	// ── 例 5：内容变了 ⇒ patch-id 该不同 ──
	写(D, 'feat.txt', 'f 改了\n'); 提(D, '再改内容');
	const r5 = 检查二(D, 旧头, 'feat', 'main');
	断言('K6 内容有变 ⇒ patch-id 不同（✗ 沿用）', r5.旧 !== r5.新, JSON.stringify(r5));
	/* ★★`#505`（附四加固）：**声明 base 判**两刀 ——
	 *   K10：**解析顺序**（纯函数三向 ✓）：显式 ⇒ `GITHUB_BASE_REF` ⇒ 缺省（★缺省**明账** ✓）。
	 *   K11：★**同一个头**在「对 dev 判」下**绿**、在「对 main 判」下**红** ⇒ 证「改判基」**真改了判否** ✓（✗ 只换行字 ✓）。 */
	const K10a = 解析声明基({ 显式: 'origin/dev', 环境基: 'main', 缺省: 'origin/main' });
	const K10b = 解析声明基({ 环境基: 'dev', 缺省: 'origin/main' });
	const K10c = 解析声明基({ 缺省: 'origin/main' });
	断言('K10a 显式 `--base` 优先（压过 CI 环境变量）', K10a.ref === 'origin/dev' && /显式/.test(K10a.源), JSON.stringify(K10a));
	断言('K10b 无显式 ⇒ 用 `GITHUB_BASE_REF`（CI 的 PR 声明 base）', K10b.ref === 'origin/dev' && /GITHUB_BASE_REF/.test(K10b.源), JSON.stringify(K10b));
	断言('K10c 两者皆无 ⇒ 缺省 `origin/main` 且**明账**', K10c.ref === 'origin/main' && /明账/.test(K10c.源), JSON.stringify(K10c));
	const E = 新仓('e'); 写(E, 'x.txt', '1\n'); 提(E, 'base');   // ★新仓已 `-b main` ⇒ ✗ 再 `branch main`（那会 E128 ✗，我第一版即栽此 ✓）
	跑(E, 'branch', '-q', 'dev');
	跑(E, 'checkout', '-q', 'dev'); 写(E, 'd.txt', 'd\n'); 提(E, 'dev 线一笔');
	跑(E, 'checkout', '-q', 'main'); 写(E, 'm.txt', 'm\n'); 提(E, 'main 线又前进一笔');
	跑(E, 'checkout', '-q', 'dev'); 跑(E, 'branch', '-q', 'feat'); 跑(E, 'checkout', '-q', 'feat'); 写(E, 'f.txt', 'f\n'); 提(E, 'feat：自 dev 开的一笔');
	const 对dev = 检查一(E, 'dev', 'feat'), 对main = 检查一(E, 'main', 'feat');
	断言('K11a 同一头「对 dev（声明基）判」⇒ ① 绿', 对dev.同尖 === true, JSON.stringify({ 同尖: 对dev.同尖 }));
	断言('K11b 同一头「对 main 判」⇒ ① 红（★旧形即误报「落后」✗）', 对main.同尖 === false, JSON.stringify({ 同尖: 对main.同尖 }));
	// ── 例 6：装置错可分（✗ 不是判据红）──
	let 装置错 = false; try { git(path.join(T, '不存在'), 'rev-parse', 'HEAD'); } catch (e) { 装置错 = e.装置错 === true; }
	断言('K7 不存在的仓 ⇒ 标为装置错（✗ 不当判据红）', 装置错, String(装置错));
	fs.rmSync(T, { recursive: true, force: true });
	console.log(`  ⇒ 自检：通过 ${通过}｜失败 ${失败}`);
	process.exit(失败 ? 1 : 0);
}

主流程();
