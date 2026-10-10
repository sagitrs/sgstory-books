#!/usr/bin/env node
/* 引擎检出 == 本仓声明的 pin（**具名红**）——`books#198` 教训的机械化。
 *
 * ## 为什么要有这件
 *   `books#198` 实例：门测开跑前，引擎检出其实是**旧 pin**（缺 `classOf` API）⇒ 面板空、三处红
 *   ⇒ 被当成**产品缺陷**白烧一轮 ✓。零阻塞判定要求「工具自身可信」⇒ 这条必须先判、且**具名**。
 *
 * ## 判什么
 *   ① 本仓 `.github/engine-ref.json` 的 `ref`（声明的 pin）—— ★**来源必须可核**（见下）；
 *   ② 被测引擎检出的 `git rev-parse HEAD`；
 *   ③ 两者**逐字**相等 ✓（✗ 不认「前缀相同」「时间接近」这类近似）。
 *   ⚠ 检出若**不是 git 树**（例如 `git archive` 出的目录、或旧 worktree 被清掉了 `.git`）
 *     ⇒ **证不出**pin ⇒ 也是**环境错**（✗ 不许静默按「没有 git 就跳过」✓）。
 *
 * ## ★声明来源（2026-10-08 补 · `books#402` 线裁 ①–⑤）
 *   本件原只读**工作树**里那份 pin 档 ⇒ ★在**过期／非预期检出**上会拿**旧声明**去判**新检出**：
 *     实测：工作树 pin=`944358b7` 而 `origin/dev` 已是 `6bcad3e7` ⇒ 门印「✓ 引擎检出 == 声明 pin
 *     （`944358b7…`）」并 **rc=0** ✗ —— ★**假绿** ✓（★恰是本件头注要防的那一类）。
 *   ⇒ 现：★(a) **每次运行都印来源**（仓路径 ／ 仓 HEAD ／ 该档相对 HEAD **脏/净** ／ 该档最近提交）；
 *      ★(b) 该档**相对 HEAD 有改动 ⇒ rc=2**（✗ 用未提交的声明判 ✓）；
 *      ★(c) 可选 `--expect <sha>` ⇒ **以调用方锚定的 sha 为准**（CI／合后必办用：把「当时受检的
 *          受检树」写进调用式 ⇒ ✗ 靠工作树自证 ✓）。
 *
 * ## 用法与退出码
 *   node tools/check-engine-pin.mjs [--engine <引擎检出>] [--expect <sha>] [--ref-file <声明件>] [--quiet] [--selftest]
 *   node tools/check-engine-pin.mjs --ref-file <声明件> --print-ref     # ★阶段①（检出**前**）：只输出 ref
 *   ★`--ref-file`（缺省仍 `.github/engine-ref.json` ⇒ **既有调用零改动** ✓）：CLI 有**独立 pin**
 *     （拟 `stories/hof-cli/engine-ref.json`）⇒ 同一门、**同一条真值** ✓（✗ 让 workflow 内联自读 JSON ✗）。
 *   ★**两阶段同真值**：阶段① `--print-ref`（把唯一完整 ref 打给 `git checkout` 用）／阶段② 核 `HEAD == ref`
 *     ⇒ ★两个模式**共用同一个「读声明」路径** ⇒ 解析只此一处 ✓（两阶段各自解析 ⇒ 错位无人管 ✓）。
 *   ★`--print-ref` 的 **stdout 只有 ref 一行**（供 `$(…)` 取用 ✓）；★**来源行走 stderr**（可核 ✓ ✗ 污染 stdout ✓）。
 *   0 = 逐字相同 ✓；2 = 环境错（缺 pin 档／★`ref` **不是 40 位完整 SHA**／引擎不是 git 树／取不到 HEAD／★pin 档脏）；
 *   1 = **不一致**（具名红 ✓）。★`--quiet` 只压**成功**输出（✗ 不压红 ✗ 不压**来源行**）。
 *   ★三态须**分清**（`books#569` T 席裁）：**缺声明／坏 ref／错检出** ⇒ 前两者是**环境错 rc=2**，
 *     ✗ 不许把「坏声明」与「检出不符」混成同一个 1 ✓（那会把装置错读成产品缺陷 ✓）。
 *
 * ## 自检（四态刀 · `--selftest`）
 *   临时造四态并逐态具名：①匹配 ⇒ 0 ②不一致 ⇒ 1 ③非 git ⇒ 2 ④**pin 档脏** ⇒ 2；
 *   每态另核「来源行」在位 ✓（✗ 只看 rc ✓）。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const argOf = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const quiet = process.argv.includes('--quiet');
const here = import.meta.dirname;
const repo = path.resolve(here, '..');
const 引擎 = path.resolve(argOf('--engine') ?? path.join(repo, '..', 'engine'));
const 期望 = argOf('--expect');

const git = (cwd, ...args) => {
	try { return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim(); }
	catch { return null; }
};
const 报环境错 = (msg) => { console.error(`✗ 环境错：${msg}`); process.exit(2); };

/* ── ⓪ 自检（四态刀）：★放在**最前** —— 自检须**自足**，✗ 受外部环境（默认引擎检出）影响 ✓ */
/* ── ④ 自检（四态刀）───────────────────────────────────────────── */
if (process.argv.includes('--selftest')) {
	const 本件 = import.meta.filename;
	const 临时 = fs.mkdtempSync(path.join(os.tmpdir(), 'pin-selftest-'));
	const 造仓 = (dir, 名) => {
		fs.mkdirSync(dir, { recursive: true });
		execFileSync('git', ['-C', dir, 'init', '-q']);
		execFileSync('git', ['-C', dir, 'config', 'user.email', 's@l']);
		execFileSync('git', ['-C', dir, 'config', 'user.name', 's']);
		fs.writeFileSync(path.join(dir, 'README.md'), `引擎树 ${名}\n`, 'utf8');
		execFileSync('git', ['-C', dir, 'add', '-A']);
		execFileSync('git', ['-C', dir, 'commit', '-q', '-m', 名]);
		return { dir, sha: git(dir, 'rev-parse', 'HEAD') };
	};
	const 跑 = (booksDir, 引擎Dir) => {
		fs.mkdirSync(path.join(booksDir, 'tools'), { recursive: true });
		fs.copyFileSync(本件, path.join(booksDir, 'tools/check-engine-pin.mjs'));   // ★脚本进临时仓 ⇒ 其 repo 即该仓 ✓
		try {
			const out = execFileSync('node', [path.join(booksDir, 'tools/check-engine-pin.mjs'), '--engine', 引擎Dir], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
			return { rc: 0, out };
		} catch (e) { return { rc: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; }
	};
	const 写pin = (booksDir, sha) => {
		fs.mkdirSync(path.join(booksDir, '.github'), { recursive: true });
		fs.writeFileSync(path.join(booksDir, '.github/engine-ref.json'),
			JSON.stringify({ ref: sha, branch: 'main', why: 'selftest', checked: 'selftest' }, null, 2) + '\n', 'utf8');
	};
	const 甲 = 造仓(path.join(临时, 'engA'), 'A');
	const 乙 = 造仓(path.join(临时, 'engB'), 'B');
	const 态 = [];
	/* ★T 席加固（`books#569` · `writer-2` 请求）：另三态 —— ⑤**坏 ref**（✗ 落到「不一致」）⑥**`--ref-file` 生效** ⑦**`--print-ref` 干净输出** */
	const 跑参 = (booksDir, 引擎Dir, 额外 = []) => {
		fs.mkdirSync(path.join(booksDir, 'tools'), { recursive: true });
		fs.copyFileSync(本件, path.join(booksDir, 'tools/check-engine-pin.mjs'));   // ★脚本须进临时仓 ✓
		try {
			const out = execFileSync('node', [path.join(booksDir, 'tools/check-engine-pin.mjs'), '--engine', 引擎Dir, ...额外], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
			return { rc: 0, out };
		} catch (e) { return { rc: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; }
	};
	const 跑仅 = (booksDir, 额外) => {
		fs.mkdirSync(path.join(booksDir, 'tools'), { recursive: true });
		fs.copyFileSync(本件, path.join(booksDir, 'tools/check-engine-pin.mjs'));   // ★同 跑()：脚本须进临时仓 ✓
		try {
			const out = execFileSync('node', [path.join(booksDir, 'tools/check-engine-pin.mjs'), ...额外], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
			return { rc: 0, out };
		} catch (e) { return { rc: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; }
	};
	/* ★`坏` 计数（★T 席自查：首版两处放错位置 ⇒ `坏 is not defined` / TDZ ⇒ 实跑抓到）——须在 `坏++` **之前**声明 */
	let 坏 = 0;
	{ const d = path.join(临时, 'b1'); 写pin(d, 甲.sha); 态.push(['①匹配', 0, 跑(d, 甲.dir)]); }
	{ const d = path.join(临时, 'b2'); 写pin(d, 甲.sha); 态.push(['②不一致', 1, 跑(d, 乙.dir)]); }
	{ const d = path.join(临时, 'b3'); 写pin(d, 甲.sha); const 非git = path.join(临时, 'plain'); fs.mkdirSync(非git, { recursive: true }); 态.push(['③非 git', 2, 跑(d, 非git)]); }
	{ const d = path.join(临时, 'b4'); 写pin(d, 甲.sha);
	  execFileSync('git', ['-C', d, 'init', '-q']); execFileSync('git', ['-C', d, 'config', 'user.email', 's@l']);
	  execFileSync('git', ['-C', d, 'config', 'user.name', 's']); execFileSync('git', ['-C', d, 'add', '-A']);
	  execFileSync('git', ['-C', d, 'commit', '-q', '-m', 'pin']);          // 先提交 ⇒ 再弄脏 ✓
	  fs.appendFileSync(path.join(d, '.github/engine-ref.json'), '   ', 'utf8');
	  态.push(['④pin 档脏', 2, 跑(d, 甲.dir)]); }
	/* ⑤ 坏 ref：短 sha ⇒ **环境错**（✗ 落到「不一致」）；★正因为它须先于比对失败，比对才不会被坏声明污染 */
	{ const d = path.join(临时, 'b5');
	  fs.mkdirSync(path.join(d, '.github'), { recursive: true });
	  fs.writeFileSync(path.join(d, '.github/engine-ref.json'), JSON.stringify({ ref: 'abc123' }) + '\n', 'utf8');
	  const r = 跑(d, 甲.dir);
	  态.push(['⑤坏 ref（短 sha）', 2, r]);
	  const ok = r.rc === 2 && /不是 40 位/.test(r.out);
	  if (!ok) { console.log('    ↳ ⑤ 孩子输出：\n' + String(r.out).split('\n').slice(0, 6).join('\n')); }
	  console.log(`  ${ok ? '✓' : '✗'} ⑤坏 ref（短 sha）：rc=${r.rc}（期望 2）｜具名=${/不是 40 位/.test(r.out) ? '在' : '★缺'}`);
	  if (!ok) 坏++;
	}
	/* ⑥ `--ref-file` 生效：**另一档**（CLI 形态）⇒ 用**它**的 ref；★并核来源行印的是**那个档**（✗ 仍印默认档 ✓） */
	{ const d = path.join(临时, 'b6');
	  fs.mkdirSync(path.join(d, '.github'), { recursive: true });
	  fs.writeFileSync(path.join(d, '.github/engine-ref.json'), JSON.stringify({ ref: 乙.sha }) + '\n', 'utf8');   // ★默认档写成**不匹配**的乙
	  fs.mkdirSync(path.join(d, 'stories/hof-cli'), { recursive: true });
	  fs.writeFileSync(path.join(d, 'stories/hof-cli/engine-ref.json'), JSON.stringify({ ref: 甲.sha }) + '\n', 'utf8');  // ★被指定的档＝甲
	  const rel = 'stories/hof-cli/engine-ref.json';
	  const r = 跑参(d, 甲.dir, ['--ref-file', rel]);   // ★须用 跑参（✗ 跑() 不吃额外参数）
	  const ok = r.rc === 0 && r.out.includes(甲.sha) && r.out.includes(rel);
	  if (!ok) { console.log('    ↳ ⑥ 孩子输出：\n' + String(r.out).split('\n').slice(0, 6).join('\n')); }
	  console.log(`  ${ok ? '✓' : '✗'} ⑥--ref-file 用**被指定的档**：rc=${r.rc}｜来源行指 ${rel}=${r.out.includes(rel) ? '在' : '★缺'}`);
	  if (!ok) 坏++;
	}
	/* ⑦ `--print-ref`：**stdout 只有 ref 一行**（供 `$(…)`）；来源行走 stderr ⇒ ✗ 污染 stdout */
	{ const d = path.join(临时, 'b7'); 写pin(d, 甲.sha);
	  const r = 跑仅(d, ['--ref-file', '.github/engine-ref.json', '--print-ref']);
	  const 行 = String(r.out).trim().split('\n');
	  const ok = r.rc === 0 && 行.length === 1 && 行[0] === 甲.sha;
	  if (!ok) { console.log('    ↳ ⑦ 孩子输出：\n' + String(r.out).split('\n').slice(0, 6).join('\n')); }
	  console.log(`  ${ok ? '✓' : '✗'} ⑦--print-ref：rc=${r.rc}｜stdout=${行.length} 行｜恰为声明 ref=${行[0] === 甲.sha ? '是' : '★否'}`);
	  if (!ok) 坏++;
	}
	for (const [名, 期望rc, r] of 态) {
		const okrc = r.rc === 期望rc;
		const ok源 = r.out.includes('声明来源');                              // ★来源行须在位 ✓
		const ok言 = 名 === '①匹配' ? r.out.includes('✓ 引擎检出 == 声明 pin') : /✗|环境错/.test(r.out);
		const ok = okrc && ok源 && ok言;
		if (!ok) { 坏++; console.log('    ↳ 孩子输出（全文）：\n' + String(r.out).split('\n').filter((l) => l && !/not a git repository/.test(l)).join('\n')); }
		console.log(`  ${ok ? '✓' : '✗'} ${名}：rc=${r.rc}（期望 ${期望rc}）｜来源行=${ok源 ? '在' : '★缺'}｜具名行=${ok言 ? '在' : '★缺'}`);
	}
	fs.rmSync(临时, { recursive: true, force: true });
	console.log(`${坏 === 0 ? '✓' : '✗'} check-engine-pin 自检：**七态** ${坏 === 0 ? '全如期' : `★${坏} 处不符`}（匹配／不一致／非 git／pin 档脏／坏 ref／--ref-file／--print-ref），见下脏）`);
	process.exit(坏 === 0 ? 0 : 1);
}

/* ── ① 声明（可核来源）──────────────────────────────────────────── */
/** ★完整 SHA 的形：40 位十六进制。★加严（`books#569` T 席裁）：旧形只查「非空字符串」⇒
 *   **坏声明会滑到比对那一步**变成「检出不一致」⇒ **装置错被读成产品缺陷** ✗。 */
export const 是完整ref = (s) => typeof s === 'string' && /^[0-9a-f]{40}$/.test(s);
const pinFile = path.resolve(repo, argOf('--ref-file') ?? '.github/engine-ref.json');
const pinRel = path.relative(repo, pinFile);
const 要印ref = process.argv.includes('--print-ref');
/* ★来源行（`--print-ref` 时走 **stderr** ⇒ stdout 保持「只有 ref 一行」可供 `$(…)` 取用 ✓） */
const 印来源 = (s) => { if (要印ref) console.error(s); else console.log(s); };
if (!fs.existsSync(pinFile)) 报环境错(`本仓没有 ${path.relative(repo, pinFile)} —— 声明的 pin 无从取得`);
let 档内;
try { 档内 = JSON.parse(fs.readFileSync(pinFile, 'utf8')).ref; } catch (e) { 报环境错(`pin 文件读不出／不是 JSON：${e.message}`); }
if (typeof 档内 !== 'string' || 档内.length === 0) 报环境错(`pin 文件（${pinRel}）里没有 ref`);

/* ★来源行：无论成败都印（`--quiet` 也不压 ✓）—— 让读的人能核「这份声明取自哪棵树、哪个提交、脏不脏」 */
const 仓头 = git(repo, 'rev-parse', 'HEAD') ?? '(非 git 树／取不到)';
const 脏行 = git(repo, 'status', '--porcelain', '--', pinRel);
const 该档脏 = 脏行 !== null && 脏行 !== '';
const 该档提交 = git(repo, 'log', '-1', '--format=%h %s', '--', pinRel) ?? '(取不到)';
印来源('· 声明来源：' + `${repo}（仓 HEAD ${仓头}；档 ${pinRel}；该档相对 HEAD ${该档脏 ? '★脏' : '净'}；该档最近提交 ${该档提交}）`
	+ (期望 ? `；★--expect 覆盖为 ${期望}` : ''));

if (档内 != null && 档内 !== '' && !是完整ref(档内)) {
	报环境错(`pin 文件（${pinRel}）里的 ref **不是 40 位十六进制完整 SHA**：${JSON.stringify(String(档内).slice(0, 60))}`
		+ '\n  ⇒ ★短 sha／带分支名／带空白都算**坏 ref**（✗ 不许拿它去跟 HEAD 比 —— 那会把「坏声明」误报成「检出不符」✓）');
}
if (该档脏) 报环境错(`${pinRel} 相对 HEAD 有改动（★未提交的声明不具判定力）`
	+ '\n  ⇒ 请先提交／还原该档，或改用 `--expect <sha>` 锚定当时受检树');
const 声明 = 期望 ?? 档内;
/* ★阶段①（检出**前**）：stdout 只打 ref 一行（供 `git checkout $(…)` ✓），✗ 打任何别的东西 ✓ */
if (要印ref) { process.stdout.write(声明 + '\n'); process.exit(0); }
if (typeof 声明 !== 'string' || 声明.length === 0) 报环境错('`--expect` 给的值不是非空字符串');

/* ── ② 实测检出 ───────────────────────────────────────────────── */
if (!fs.existsSync(path.join(引擎, '.git'))) {
	报环境错(`${引擎} 不是 git 树（找不到 .git）—— **证不出** pin`
		+ '\n  ⇒ 门测前请用 git 检出（`git worktree` / `git clone` / `git checkout`），✗ 不要用导出的目录');
}
let 实测;
try { 实测 = execFileSync('git', ['-C', 引擎, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
catch (e) { 报环境错(`取不到 ${引擎} 的 HEAD：${e.message}`); }

/* ── ③ 逐字比 ────────────────────────────────────────────────── */
if (实测 !== 声明) {
	console.error('✗ 引擎检出与声明 pin **不一致**（这不是产品缺陷，是**装置错** —— 见 books#198）');
	console.error(`    声明 pin（${期望 ? '--expect' : pinRel}）＝ ${声明}`);
	console.error(`    实测检出（git rev-parse HEAD）    ＝ ${实测}`);
	console.error('  ⇒ 两种修法：①把检出去 co 到声明 pin；②若声明本就该升，走「pin 同笔抬升」那一笔（✗ 在门里绕过）');
	process.exit(1);
}
if (!quiet) console.log(`✓ 引擎检出 == 声明 pin（${声明}）`);
