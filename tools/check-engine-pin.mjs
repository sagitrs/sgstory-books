#!/usr/bin/env node
/* 引擎检出 == 本仓声明的 pin（**具名红**）——`books#198` 教训的机械化。
 *
 * ## 为什么要有这件
 *   `books#198` 实例：门测开跑前，引擎检出其实是**旧 pin**（缺 `classOf` API）⇒ 面板空、三处红
 *   ⇒ 被当成**产品缺陷**白烧一轮 ✓。零阻塞判定要求「工具自身可信」⇒ 这条必须先判、且**判得出**。
 *
 * ## 判什么
 *   ① 本仓 `.github/engine-ref.json` 的 `ref`（声明的 pin）；
 *   ② 被测引擎检出的 `git rev-parse HEAD`；
 *   ③ 两者**逐字**相等 ✓（✗ 不认「前缀相同」「时间接近」这类近似）。
 *   ⚠ 检出若**不是 git 树**（例如 `git archive` 出的目录、或旧 worktree 被清掉了 `.git`）
 *     ⇒ **证不出**pin ⇒ 也是**环境错**（✗ 不许静默按「没有 git 就跳过」✓）。
 *
 * ## 用法与退出码
 *   node tools/check-engine-pin.mjs [--engine <引擎检出>] [--quiet]
 *   0 = 逐字相同 ✓；2 = 环境错（缺 pin 文件／引擎不是 git 树／取不到 HEAD）；1 = **不一致**（具名红）
 *   ★`--quiet` 只压成功时的输出（✗ 不压红）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const argOf = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : null; };
const quiet = process.argv.includes('--quiet');
const here = import.meta.dirname;
const repo = path.resolve(here, '..');
const 引擎 = path.resolve(argOf('--engine') ?? path.join(repo, '..', 'engine'));

const 报环境错 = (msg) => { console.error(`✗ 环境错：${msg}`); process.exit(2); };

const pinFile = path.join(repo, '.github/engine-ref.json');
if (!fs.existsSync(pinFile)) 报环境错(`本仓没有 ${path.relative(repo, pinFile)} —— 声明的 pin 无从取得`);
let 声明;
try { 声明 = JSON.parse(fs.readFileSync(pinFile, 'utf8')).ref; } catch (e) { 报环境错(`pin 文件读不出／不是 JSON：${e.message}`); }
if (typeof 声明 !== 'string' || 声明.length === 0) 报环境错('pin 文件里没有 ref');

if (!fs.existsSync(path.join(引擎, '.git'))) {
	报环境错(`${引擎} 不是 git 树（找不到 .git）—— **证不出** pin`
		+ '\n  ⇒ 门测前请用 git 检出（`git worktree` / `git clone` / `git checkout`），✗ 不要用导出的目录');
}
let 实测;
try { 实测 = execFileSync('git', ['-C', 引擎, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
catch (e) { 报环境错(`取不到 ${引擎} 的 HEAD：${e.message}`); }

if (实测 !== 声明) {
	console.error('✗ 引擎检出与声明 pin **不一致**（这不是产品缺陷，是**装置错** —— 见 books#198）');
	console.error(`    声明 pin（.github/engine-ref.json）＝ ${声明}`);
	console.error(`    实测检出（git rev-parse HEAD）    ＝ ${实测}`);
	console.error('  ⇒ 两种修法：①把检出去 co 到声明 pin；②若声明本就该升，走「pin 同笔抬升」那一形再跑 ✓');
	process.exit(1);
}
if (!quiet) console.log(`✓ 引擎检出 == 声明 pin（${声明}）`);
