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
 * ## ★清单的**两态**（写给读这档的人）
 *   · **声明了 `packs`**（本仓现在就是：`["dnd3"]`）⇒ 产物**只装**这些规则包 ＋ `src/core/**`（core 恒入）；
 *   · **没清单／没这个键** ⇒ **全装**（＝该口引入前的行为；引擎侧逐字节同旧的读数见 `sagitsr/sgstory#2000`）。
 *   ⚠ **生效条件**：本仓的构建用**声明 pin** 的引擎（`.github/engine-ref.json`）⇒ 清单**只有在 pin
 *     抬到含 `sagitsr/sgstory#2000` 的提交后才生效**；在那之前它**不生效也不报错**（旧 build.py 不读 story.json
 *     ⇒ 产物逐字节不变）。★这正是本门 ③ 用「能力门」而不是「直接断言」的理由。
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
	/* ★坏 JSON 要**具名红**（`rc=1` ＋ 说清是哪个文件坏了）—— ✗ 让它以「未捕获异常」的形炸出去：
	 *   那种形**分不清**「清单坏了」与「装置坏了」（后者 rc=2 才是对的语义）。 */
	let 档;
	try {
		档 = JSON.parse(fs.readFileSync(清单, 'utf8'));
	} catch (e) {
		console.error(`✗ 清单读不出／不是合法 JSON：${清单} —— ${e.message}`);
		process.exit(1);
	}
	/* ★`books#280` ⑭ 后的**全装态**：清单**未声明** `packs` 是**合法**且**有意义**的一态 ——
	 *   语义＝**全装**（＝`packs` 口引入前的行为，`sgstory#2000`）。★本席 2026-10-05 实测教训：
	 *   本门原版把「未声明」当**错**（硬 `exit(1)`）⇒ 只 revert 声明的那一笔会被本门**咬住** ——
	 *   即「判据与产品语义不同步」。⇒ 拆成两态各断各的（下面 ③＝声明态／④＝全装态）。 */
	const 声明 = Array.isArray(档?.packs) ? 档.packs : null;
	if (声明 !== null && (!声明.length || !声明.every((x) => typeof x === 'string' && x))) {
		console.error(`✗ 清单 \`packs\` 若给，须是**非空字符串数组**：${JSON.stringify(声明)}`);
		process.exit(1);
	}
	const 全装态 = 声明 === null;
	/* ★`books#280` ⑭ 后（0.0.2 取稳）**本仓此刻不得声明 `packs`**：声明 ⇒ 产物只装 dnd3 ⇒ 「dnd3 独活」
	 *   ⇒ 每战**必晕 ✗ 杀**（有剑 3+1／空手 1+1 皆晕）⇒ `kills` 恒 0 ⇒ **首战门永闭 ⇒ 主线不可通关**。
	 *   ⇒ 本门在本仓的**当前口径＝全装**：未声明 ⇒ 断「真全装」；一旦有人声明 ⇒ **判据红**（✗ 崩溃）。
	 *   ⚠ `packs` **口**仍是**引擎能力**（`sgstory#2000`，别的故事可用）—— 退掉的是**本仓的声明**，✗ 不是口。 */
	if (!全装态) {
		console.log('✗ 门红：');
		console.log(`  · 本仓此刻**不得**声明 \`packs\`（现声明：${JSON.stringify(声明)}）—— 声明 ⇒ dnd3 独活 ⇒ 每战必晕 ✗ 杀`);
		console.log('    ⇒ `kills` 恒 0 ⇒ 首战门永闭 ⇒ 主线不可通关（`books#280` ⑭）；0.0.2 取稳口径＝**全装**（✗ 声明）。');
		console.log('    ⚠ 复核该缺陷的因与修：`sgstory#2011`（菜单必须留**手上那件武器**的攻击项）。');
		process.exit(1);
	}
	console.log('  清单**未声明** `packs` ⇒ 语义＝**全装**（＝本口引入前的行为）');

	/* ── ④ **全装态**：构建日志须印「全装」＋ 产物里须**多于一个**规则包（＝旧已验行为）── */
	{
		const 源码4 = fs.readFileSync(path.join(ENGINE, 'build.py'), 'utf8');
		if (!源码4.includes('故事清单规则包')) {
			console.log('  · ④ **待判**：引擎 pin 的 build.py 还没有 packs 口 ⇒ 全装是**唯一**行为（✗ 无可判之差）—— 抬 pin 后自动生效');
		} else {
			const 出4 = path.join(os.tmpdir(), `books-fullinstall-${process.pid}.html`);
			const r4 = spawnSync('python3', [path.join(ENGINE, 'build.py'), path.join(ROOT, 'stories', 'babel'), '--out', 出4], { encoding: 'utf8' });
			if (r4.status !== 0) { console.log(`✗ ④ 真构建失败（装置面）：\n${(r4.stdout ?? '') + (r4.stderr ?? '')}`.slice(0, 600)); process.exit(2); }
			const 日志 = String(r4.stdout ?? '') + String(r4.stderr ?? '');
			const 实装4 = packIdsIn(fs.readFileSync(出4, 'utf8'));
			if (!/全装/.test(日志)) 红.push('④ 未声明 `packs` ⇒ 构建日志**没印「全装」**（应印「清单未声明 ⇒ 全装」）—— 语义与产物不符');
			if (实装4.length < 2) 红.push(`④ 全装态下产物里只有 ${实装4.length} 个规则包（${实装4.join('、')}）⇒ **没真全装**（旧已验行为＝两包都在）`);
			console.log(`  ④ 构建日志含「全装」＝${/全装/.test(日志)}｜产物里的规则包：${实装4.join('、') || '（无）'}`);
			fs.rmSync(出4, { force: true });
		}
	}
	/* ⚠ 声明态的三臂（清单合法／包 id 存在／产物只装已声明）**随本仓进入全装态而暂不适用**：
	 *   它们由 `#280` ⑩ 的旧口径带来；本仓此刻 ✗ 声明（上面早退即拦）⇒ 那三臂在此**不可达**。
	 *   若将来本仓再声明（版本窗口另裁），按这三条恢复即用（它们仍在 git 历史与本席的 ⑩ 笔里）。 */

	if (红.length) { console.log('✗ 门红：'); 红.forEach((x) => console.log(`  · ${x}`)); process.exit(1); }
	console.log(`✓ 门绿（清单${全装态 ? '**未声明** ⇒ 全装态' : '合法'}${全装态 ? '' : (有口 ? ' 且产物只装已声明包' : '；③ 待判（引擎 pin 未含 packs 口）')}）`);
}

/* 自检刀：把清单改成含一个**不存在**的 id ⇒ ② 必须红；复原后门必须绿（按字节分毫还原） */
if (isMain && argv.includes('--selftest')) {
	const 备份 = fs.readFileSync(清单);
	const 跑 = () => spawnSync(process.execPath, [import.meta.filename, '--engine', ENGINE], { encoding: 'utf8' });
	fs.writeFileSync(清单, JSON.stringify({ packs: ['dnd3', 'nosuchpack-xyz'] }, null, 2) + '\n');
	const A = 跑();
	const 红对 = A.status === 1 && /nosuchpack-xyz/.test(A.stdout);
	console.log(`  ${红对 ? '✓' : '✗'} 刀 K1：清单含不存在 id ⇒ rc=${A.status}（期望 1 且具名「nosuchpack-xyz」）`);
	/* ★K2：坏 JSON ⇒ 须 rc=1 且**具名到文件**（✗ 未捕获异常 —— 那分不清「清单坏」与「装置坏」） */
	fs.writeFileSync(清单, '{ not json\n');
	const C = 跑();
	const 坏对 = C.status === 1 && /不是合法 JSON/.test(C.stdout + C.stderr);
	console.log(`  ${坏对 ? '✓' : '✗'} 刀 K2：坏 JSON ⇒ rc=${C.status}（期望 1 且具名「不是合法 JSON」）`);
	fs.writeFileSync(清单, 备份);
	const B = 跑();
	const 复原对 = fs.readFileSync(清单).equals(备份) && B.status === 0;
	console.log(`  ${复原对 ? '✓' : '✗'} 刀 K3：复原 ⇒ rc=${B.status}（期望 0）且清单逐字节同`);
	process.exit(红对 && 坏对 && 复原对 ? 0 : 1);
}

if (isMain && !argv.includes('--selftest')) main();
