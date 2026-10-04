#!/usr/bin/env node
/* `books#315` 附三 · **合前检查器** —— 把「合前必跑的两条」从 README 文字变成**机器说了算**。
 *
 * ## 判谁（两条判据 · 各带可复跑的口径）
 *   ① **基座同尖**：`merge-base(<main>, <票头>)` 必须 **===** `<main>`。
 *      ★落后 ⇒ 该票对**现 main** 的 diff 里会带**回退行** ⇒ 合入会抹掉别的笔刚合的东西。
 *   ② **回退行 0**：对现 main 的 `--numstat` 里，**没有「只删不加」（新增 0 行）的档**。
 *   ③ （给了 `--base` 才算）**patch-id**：纯 rebase ⇒ 同改动集在不同基座上的指纹**逐字同**
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
 *   node tools/check-premerge.mjs --head <票头> [--main origin/main] [--base <旧头>] [--repo <仓>]
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

/** ★判据本体（与 `--selftest` **共用** ⇒ 自测验的就是真判据）。 */
export function 检查一(repo, main, head) {
	const MB = git(repo, 'merge-base', main, head);
	const MAIN = git(repo, 'rev-parse', main);
	const 同尖 = MB === MAIN;
	const 行 = git(repo, 'diff', '--numstat', main, head).split('\n').filter(Boolean);
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

function 主流程() {
	if (has('--selftest')) return 自检();
	跑头注();
	const repo = path.resolve(arg('--repo', process.cwd()));
	const main = arg('--main', 'origin/main');
	const head = arg('--head');
	if (!head) { console.error('✗ 装置错：缺 --head <票头>（用法见档头）'); process.exit(2); }
	try { git(repo, 'rev-parse', '--git-dir'); }
	catch { console.error(`✗ 装置错：${repo} 不是 git 仓`); process.exit(2); }
	let r1; try { r1 = 检查一(repo, main, head); }
	catch (e) { console.error(`✗ 装置错（✗ 不当判据红）：${e.message}\n   ⇒ 核 --main／--head／--repo 是否指对`); process.exit(2); }
	const 红 = [];
	console.log(`  ① 基座同尖：merge-base=${r1.MB.slice(0, 8)}｜main=${r1.MAIN.slice(0, 8)} ⇒ ${r1.同尖 ? '✓ 同尖' : '✗ 落后'}`);
	if (!r1.同尖) 红.push(`✗ ① 基座落后现 main（merge-base ${r1.MB.slice(0, 8)} ≠ main ${r1.MAIN.slice(0, 8)}）—— ★先 rebase，再谈内容`);
	console.log(`  ② 回退行：对现 main 的 diff 共 ${r1.行数} 档｜★只删不加 = ${r1.回退.length} 档`);
	for (const p of r1.回退.slice(0, 12)) console.log(`      ✗ ${p}`);
	if (r1.回退.length) 红.push(`✗ ② 有 ${r1.回退.length} 个档「只删不加」⇒ 合入会抹掉别的笔刚合的内容`);
	const base = arg('--base');
	if (base) {
		let r2; try { r2 = 检查二(repo, base, head, main); }
		catch (e) { console.error(`✗ 装置错：--base 核不动（${e.message}）`); process.exit(2); }
		const 同 = r2.旧 === r2.新;
		console.log(`  ③ patch-id：旧=${r2.旧.slice(0, 16)}…｜新=${r2.新.slice(0, 16)}… ⇒ ${同 ? '✓ 纯 rebase（读数沿用）' : '✗ 内容有变（读数须重跑）'}`);
		if (!同) 红.push('✗ ③ patch-id 不同 ⇒ ✗ 不只是换基座，内容面须重核');
	} else console.log('  ③ patch-id：✗ 未给 --base ⇒ 本面不判（明账）');
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
	// ── 例 6：装置错可分（✗ 不是判据红）──
	let 装置错 = false; try { git(path.join(T, '不存在'), 'rev-parse', 'HEAD'); } catch (e) { 装置错 = e.装置错 === true; }
	断言('K7 不存在的仓 ⇒ 标为装置错（✗ 不当判据红）', 装置错, String(装置错));
	fs.rmSync(T, { recursive: true, force: true });
	console.log(`  ⇒ 自检：通过 ${通过}｜失败 ${失败}`);
	process.exit(失败 ? 1 : 0);
}

主流程();
