/* 产物**新鲜度**守卫（共享件 · `sagitrs-tester-3`）
 *
 * ## 为什么有这一件
 *   本仓的 e2e 臂**只认预构建产物**（`stories/babel/babel-trial.html`），✗ 不自己构建
 *   （构建归 `.github/workflows/babel-tests.yml` 的「构建」步；本地手跑须先 `python3 <引擎>/build.py`）。
 *   ⇒ ★**产物陈旧时，臂读的是上一版源码**：读数看着对，量的却**不是当前那棵树的码**。
 *   本舰队已实测栽过两次：
 *     · 修好的引擎 ＋ 18:19 的旧产物 ⇒ 夹具读「治好了」而自证读「没治」—— **两读打架，都是旧产物造的**；
 *     · 「改源码忘重建 ⇒ 刀零红／判据看着没牙」—— 那是同一族的**近亲**。
 *
 * ## 本件的来由
 *   这不是新规矩：★`tools/e2e-harness.mjs`（`:88-111`）与 `tests/e2e/old-house/run-baseline.mjs`（`:315-336`）
 *   **各自都写了一份**同样的检查（注释写明「作者建议、协调方批」与「`books#209` 路演」）。
 *   ⇒ ★本件把那份知识**提成一处**（同一个判据、同一段消息、同一套边界），✗ 让第三份再长出来：
 *      · `e2e-harness.mjs` 改用它（行为不变：同样在 `resolveEnv` 里判、同样 `throw`）；
 *      · 其余**不经 harness** 的臂（自己装产物的那批）在入口**调它一次**。
 *
 * ## ★第三处为什么**没**同笔接入（★领队问过，理由在此）
 *   ★同规矩的**第三处**在 `sagitrs/sgstory`：`tests/e2e/old-house/run-baseline.mjs`（`:315-336`）。
 *   ⇒ ★**跨仓**：本件在 `sagitrs/sgstory-books`；books 的 CI 检出里**没有** sgstory 树
 *     ⇒ ★`import '../../../tools/bundle-fresh.mjs'` 那形**行不通**（✗ 是「懒得做」✗ 是**物理不可达**）✓
 *   ⇒ ★故那一处**暂留自持副本**（它自身**已正确**：同样严格早于、同样具名、同样 `exit 2` ✓）；
 *     待两边**约定共享位置**（发布物／子模块／各自一份但**同 sha 声明**）时再合 ⇒ ★届时**以本件为准** ✓
 *   ★**★这一节存在的意义**：★把「还有一处没合」**写在明账上** —— ✗ 让后来者以为「只有两处」✓
 *
 * ## 判据（★与既有两处逐条一致）
 *   1. 产物**不在** ⇒ 装置错（`exit 2` 语义），并给出**整条**重建命令；
 *   2. 产物**早于** `stories/babel/src/**` 最新档，或早于 `<引擎>/src/**` 最新档 ⇒ **具名红**；
 *   3. ⚠ 取**严格早于**：同一次克隆/构建里各档 mtime 可能**全等** ⇒ 相等**放行**（`>=` 会全场误红）；
 *   4. 自证：环境变量 `BUNDLE_STALE_SELFTEST=1` ⇒ 按「已过期」走一次（★供 `--selftest` 证**红得了**，
 *      因为这条的靶是**本检查自身**，✗ 不是被测源码 ⇒ 替换字符串那套刀不适用）。
 *
 * ## 用法
 *   ```js
 *   import { 断产物新鲜 } from './bundle-fresh.mjs';       // 同目录
 *   import { 断产物新鲜 } from '../tools/bundle-fresh.mjs'; // 其它层
 *   断产物新鲜({ 产物: '<绝对路径>/babel-trial.html', 引擎根: '<引擎检出>', 仓根: process.cwd() });
 *   ```
 *   ★抛 `Error` ⇒ 由调用方决定怎么落（CLI 式臂：打印 ＋ `exit 2`；harness：`throw` ✓）。
 *   ★也可直接跑：`node tools/bundle-fresh.mjs --art <产物> --engine <引擎检出> [--books <仓根>]`
 *     ⇒ 退出码 `0` 新鲜｜`1` 陈旧（★具名红）｜`2` 装置错（缺产物／路径不对）
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/** 某一棵树下 `*.js` 的**最新 mtime**（递归；只认 `.js`，与既有两处一致）。 */
export function 最新源档(dir) {
	let t = 0, 谁 = null;
	if (!fs.existsSync(dir)) return { t, 谁 };
	for (const f of fs.readdirSync(dir, { recursive: true })) {
		const q = path.join(dir, String(f));
		if (!q.endsWith('.js') || !fs.statSync(q).isFile()) continue;
		const m = fs.statSync(q).mtimeMs;
		if (m > t) { t = m; 谁 = q; }
	}
	return { t, 谁 };
}

/**
 * 断「产物新鲜」。
 * @param {{产物:string, 引擎根?:string, 仓根?:string, 自证开关?:string}} o
 *   `产物`＝`babel-trial.html` 的**绝对路径**；`引擎根`＝引擎检出（给了就一并比 `引擎/src/**`）；
 *   `仓根`＝books 检出（默认 `process.cwd()`，用于消息里的**相对路径**与故事 src 定位）。
 * @returns {{产物:number, 比过:{名:string, t:number, 谁:string}[]}} 新鲜时的读数（★供调用方回显）
 * @throws {Error} 缺产物 / 陈旧 —— ★消息**具名到档**（哪一档、什么时刻）。
 */
export function 断产物新鲜(o) {
	const 仓根 = path.resolve(o?.仓根 ?? process.cwd());
	const 产物 = o?.产物 ? path.resolve(o.产物) : path.join(仓根, 'stories', 'babel', 'babel-trial.html');
	const 引擎根 = o?.引擎根 ? path.resolve(o.引擎根) : null;
	const 自证 = (o?.自证开关 ?? 'BUNDLE_STALE_SELFTEST');
	const 重建 = 'python3 ' + (引擎根 ? path.join(引擎根, 'build.py') : '<引擎检出>/build.py')
		+ ` "${path.join(仓根, 'stories', 'babel')}" --out "${产物}"`;

	if (!fs.existsSync(产物)) {
		throw new Error(`✗ 装置错（★✗ 判据红 · ✗ 产品缺陷）：**产物不在位** —— ${产物}\n`
			+ `  ⇒ 先构建：${重建}\n`
			+ '  ★（本仓的臂只认**预构建产物** ⇒ 缺产物时诸臂会「零出声」或直接装载失败 ⇒ 那是**装置问题**、✗ 缺陷）');
	}
	const 产物t = fs.statSync(产物).mtimeMs;
	const 比过 = [];
	const 源 = [['故事 src', path.join(仓根, 'stories', 'babel', 'src')]];
	if (引擎根) 源.push(['引擎 src', path.join(引擎根, 'src')]);
	for (const [名, dir] of 源) {
		const 最 = 最新源档(dir);
		比过.push({ 名, t: 最.t, 谁: String(最.谁 ?? '') });
		if (process.env[自证] === '1' || 最.t > 产物t) {
			throw new Error(`✗ 被测产物**过期**：${path.relative(仓根, 产物)} 早于 ${path.relative(仓根, String(最.谁))}`
				+ `（产物 ${new Date(产物t).toISOString()}｜${名} ${new Date(最.t).toISOString()}`
				+ `${process.env[自证] === '1' ? `；★本红来自 ${自证}=1 自证` : ''}）\n`
				+ `  ⇒ 先重建：${重建}\n`
				+ '  ★✗ 别拿旧产物跑读数 —— 那正是「读数跑在另一棵树上」那一族：'
				+ '读数看着对，量的却是**上一版源码**（与「刀没落在被测物上」同族）');
		}
	}
	return { 产物: 产物t, 比过 };
}

/* ── 直接跑（CLI）────────────────────────────────────────────────────────── */
if (import.meta.filename === path.resolve(process.argv[1] ?? '')) {
	const argOf = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
	try {
		断产物新鲜({ 产物: argOf('--art'), 引擎根: argOf('--engine'), 仓根: argOf('--books') ?? process.cwd() });
		console.log(`✓ 产物新鲜：${path.relative(process.cwd(), argOf('--art') ?? 'stories/babel/babel-trial.html')}`);
		process.exit(0);
	} catch (e) {
		console.error(String(e?.message ?? e));
		/* ★★两态**皆 `2`**（装置/前置错）—— ★领队 2026-10-08 令统一，理由：
		 *   ① **陈旧与缺失同族**：二者都让**读数不可信**（陈旧 ⇒ 量的是上一版源码；缺失 ⇒ 根本没得量）
		 *      ⇒ ★它们都**不是**「被测对象有缺陷」（那才是 `1`）✓
		 *   ② **与调用方一致**：各臂遇陈旧即 `exit 2`（本件接入的就是这条）⇒ CLI 若归 `1` 就与臂**自相矛盾** ✓
		 *   ③ **退出码约定**：本仓的臂是 `0` 过／`1` 有红／`2` 装置错 ⇒ 陈旧归 `2` 才对得上 ✓
		 *   ★故**不**按「/产物不在位/ 才 2」分流（我首版那样写 ✗ —— 与臂不一致）。 */
		process.exit(2);
	}
}
