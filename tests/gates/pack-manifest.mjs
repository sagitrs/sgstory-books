#!/usr/bin/env node
/* 故事清单 `packs` 的**声明面**门（`sgstory-books#295` 甲的消费侧）
 *
 * 本仓的 `stories/babel/story.json` 声明本作**只装哪些规则包**（`sgstory#295` 甲：`build.py` 按包过滤）。
 * 本门判三件事：
 *   ① 清单在、是合法 JSON，且 `packs` 是**非空字符串数组**；
 *   ② 每个 id 在**引擎检出**里真有对应的包根（`src/dnd/<id>/00-init.js`）—— ✗ 拼错 id 会到**构建期**才报，
 *      这条把它提前到**门**里（✗ 靠人记）；
 *   ③ ★**能力门**：若引擎的 `build.py` 含 `packs` 口（`故事清单规则包`）⇒ **真构建**一次，断言产物里
 *      **没有**未声明规则包的**标记行**（`/* ===== src/dnd/<id>/`）；若引擎**还没有**这个口
 *      （＝引擎 pin 早于 `sagitsr/sgstory#2000`）⇒ **明确印「待判」**（✗ 不算绿 —— 假绿比红坏）。
 *      ⇒ 这条会随 books 的引擎 pin 抬上去**自动生效**，✗ 不靠人回来补。
 *
 * 用法：node tests/gates/pack-manifest.mjs --engine <引擎检出> [--selftest]
 * 退出码：0＝门绿（②③ 或 ②＋「待判」）；1＝有红（逐条具名）；2＝装置错（缺清单／缺引擎检出／构建跑不起来）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const 清单 = path.join(ROOT, 'stories', 'babel', 'story.json');
const argv = process.argv.slice(2);
const argOf = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ENGINE = argOf('--engine');
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);

/** 产物文本里出现的**规则包** id（标记行；去重、排序）。 */
export const packIdsIn = (text) => [...new Set([...text.matchAll(/\/\* ===== src\/dnd\/([^/]+)\//g)].map((m) => m[1]))].sort();

function main() {
	if (!ENGINE || !fs.existsSync(path.join(ENGINE, 'build.py'))) {
		console.error(`✗ 装置错：缺引擎检出（--engine <含 build.py 的检出>）⇒ **证不出**`);
		process.exit(2);
	}
	if (!fs.existsSync(清单)) { console.error(`✗ 装置错：缺清单 ${清单} ⇒ **证不出**`); process.exit(2); }

	const 红 = [];
	const 声明 = JSON.parse(fs.readFileSync(清单, 'utf8'))?.packs;
	if (!Array.isArray(声明) || !声明.length || !声明.every((x) => typeof x === 'string' && x)) {
		console.error(`✗ 清单 \`packs\` 须是**非空字符串数组**：${JSON.stringify(声明)}`);
		process.exit(1);
	}
	console.log(`  清单声明规则包：${声明.join('、')}`);

	/* ② 包 id 必须在引擎检出里真有（✗ 拼错 ⇒ 提前到门里红） */
	const 缺 = 声明.filter((id) => !fs.existsSync(path.join(ENGINE, 'src', 'dnd', id, '00-init.js')));
	if (缺.length) 红.push(`② 清单声明的包在引擎检出里不存在（✗ 拼错？）：${缺.join('、')} —— 包 id ＝ \`src/dnd/<id>/00-init.js\` 的目录名`);
	const 可用 = fs.existsSync(path.join(ENGINE, 'src', 'dnd'))
		? fs.readdirSync(path.join(ENGINE, 'src', 'dnd')).filter((d) => fs.existsSync(path.join(ENGINE, 'src', 'dnd', d, '00-init.js'))).sort()
		: [];
	console.log(`  引擎可用规则包：${可用.join('、') || '（无）'}`);

	/* ③ 能力门：引擎有 packs 口 ⇒ 真构建并断「未声明的包不在产物里」；没有 ⇒ 明印「待判」 */
	/* ★② 已红 ⇒ **跳过** ③：那时真构建会因「未知包 id」而失败，把它当「装置错（rc=2）」会把
	 *   ② 的红**遮掉**（本席首版即此病，被自检刀 K1 当场咬住：期望 rc=1＋具名，实得 rc=2）。 */
	const 引擎源码 = 红.length ? '' : fs.readFileSync(path.join(ENGINE, 'build.py'), 'utf8');
	const 有口 = 引擎源码.includes('故事清单规则包');
	if (红.length) {
		console.log('  · ③ 跳过（② 已红：先报「清单声明的包不存在」，✗ 拿构建失败当装置错）');
	} else if (!有口) {
		console.log(`  · ③ **待判**：引擎 pin 的 build.py 还没有 packs 口（sagitsr/sgstory#2000 之后才有）`
			+ ` ⇒ 本仓清单**此刻不生效**（也不报错：该 pin 的构建不读 story.json）—— 抬 pin 后本臂自动生效`);
	} else {
		const 出 = path.join(os.tmpdir(), `books-packcheck-${process.pid}.html`);
		const r = spawnSync('python3', [path.join(ENGINE, 'build.py'), path.join(ROOT, 'stories', 'babel'), '--out', 出], { encoding: 'utf8' });
		if (r.status !== 0) { console.log(`✗ ③ 真构建失败（装置面）：\n${(r.stdout ?? '') + (r.stderr ?? '')}`.slice(0, 600)); process.exit(2); }
		const 实装 = packIdsIn(fs.readFileSync(出, 'utf8'));
		const 多装 = 实装.filter((id) => !声明.includes(id));
		if (多装.length) 红.push(`③ 产物里出现了**未声明**的规则包：${多装.join('、')}（声明：${声明.join('、')}）⇒ 清单没生效或有包在清单口之外被装入`);
		console.log(`  ③ 产物里的规则包：${实装.join('、') || '（无）'}（声明：${声明.join('、')}）`);
		fs.rmSync(出, { force: true });
	}

	if (红.length) { console.log('✗ 门红：'); 红.forEach((x) => console.log(`  · ${x}`)); process.exit(1); }
	console.log(`✓ 门绿（清单合法${有口 ? ' 且产物只装已声明包' : '；③ 待判（引擎 pin 未含 packs 口）'}）`);
}

/* 自检刀：把清单改成含一个**不存在**的 id ⇒ ② 必须红；复原后门必须绿（按字节分毫还原） */
if (isMain && argv.includes('--selftest')) {
	const 备份 = fs.readFileSync(清单);
	const 跑 = () => spawnSync(process.execPath, [import.meta.filename, '--engine', ENGINE], { encoding: 'utf8' });
	fs.writeFileSync(清单, JSON.stringify({ packs: ['dnd3', 'nosuchpack-xyz'] }, null, 2) + '\n');
	const A = 跑();
	const 红对 = A.status === 1 && /nosuchpack-xyz/.test(A.stdout);
	console.log(`  ${红对 ? '✓' : '✗'} 刀 K1：清单含不存在 id ⇒ rc=${A.status}（期望 1 且具名「nosuchpack-xyz」）`);
	fs.writeFileSync(清单, 备份);
	const B = 跑();
	const 复原对 = fs.readFileSync(清单).equals(备份) && B.status === 0;
	console.log(`  ${复原对 ? '✓' : '✗'} 刀 K2：复原 ⇒ rc=${B.status}（期望 0）且清单逐字节同`);
	process.exit(红对 && 复原对 ? 0 : 1);
}

if (isMain && !argv.includes('--selftest')) main();
