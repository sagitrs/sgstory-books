/* `books#375`：**引擎检出须来自本仓声明 pin**（机械判据 · 供 `e2e-window.yml` 调用）
 *
 * ## 为什么要这道判据（一次真事）
 *   `e2e-window.yml` 的引擎检出原本缺省打 `main`（`ref: ${{ inputs.engine_ref || 'main' }}`），
 *   而**它的下一步**要求「引擎检出 == 声明 pin」（`books#198` 教训机械化）⇒ 两者**互相打架**：
 *   **引擎 `main` 每前进一次，那次 nightly 必红**（实测 `#375`：声明 `789762d9` vs 检出 `c3c6366a`）。
 *   ⇒ 其后那些真判据（宿主存档门禁／侧栏存档真 DOM 臂／战斗格三臂）**一次都没跑** ⇒
 *   门存在的理由（`#1856`：只有真 DOM 照得出的失效形）**恰好失效**。
 *
 * ## 本判据查什么
 *   ① 引擎检出步的 `ref:` **须引用 pin 步的输出**（`steps.pin.outputs.ref`）⇒ 缺省＝声明 pin（两单对称）；
 *   ② ✗ 不得残留 `|| 'main'` 这类回落（病根：引擎 main 前进 ⇒ 本门红）；
 *   ③ pin 单须**空值即具名红**（`test -n "$ref"`）—— ✗ 不允许空 ref 落回检出动作的缺省分支。
 *   ★①与②是一件事的两面；③单独列，因为它管的是「pin 文件坏了」那种环境态。
 *
 * ## 边界（✗ 不假装比实际更强）
 *   · 本判据是**配置／意图面**的 —— 它证「意图是 pin」，✗ 不证「检出结果＝pin」（那要网络与真跑）；
 *     「结果面」的核对仍由下一步 `tools/check-engine-pin.mjs` 做 ⇒ 两步合起来才是完整闭环。
 *   · 字段靠**行扫**（本仓 CI 不装 YAML 解析器，同 `tests/gates/workflow-steps.mjs` 的口径）。
 *
 * 用法：node tools/check-workflow-pin-ref.mjs [--file <workflow.yml>]｜… --selftest
 * 退出码：0 通过；1 具名红；2 装置错（缺档 ⇒ 具名，✗ 不静默当绿）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const 判 = (源) => {
	const 问题 = [];
	if (!/id:\s*pin\b/.test(源)) 问题.push('缺 `id: pin` 的读 pin 步 ⇒ 后面的检出无从取用声明 pin');
	if (!/echo\s+"ref=\$ref"\s*>>\s*"\$GITHUB_OUTPUT"/.test(源))
		问题.push('读 pin 步未把 `ref=<pin>` 写进 `$GITHUB_OUTPUT` ⇒ 检出单取不到它');
	if (!/test\s+-n\s+"\$ref"/.test(源))
		问题.push('读 pin 步缺 `test -n "$ref"` 空值具名红 ⇒ 空 pin 会静默落回检出的缺省分支');
	if (!/ref:\s*\$\{\{\s*github\.event\.inputs\.engine_ref\s*\|\|\s*steps\.pin\.outputs\.ref\s*\}\}/.test(源))
		问题.push('引擎检出的 `ref:` 未写成 `${ github.event.inputs.engine_ref || steps.pin.outputs.ref }` ⇒ 缺省不是声明 pin');
	if (/github\.event\.inputs\.engine_ref\s*\|\|\s*'main'/.test(源))
		问题.push("引擎检出仍有 `|| 'main'` 回落 ⇒ 引擎 main 一前进，本门必红（`#375` 病根）");
	return 问题;
};
const 判一档 = (档) => {
	if (!fs.existsSync(档)) { console.error(`✗ 缺工作流档：${档}\n  （用法 \`node tools/check-workflow-pin-ref.mjs [--file <yml>]\`）`); process.exit(2); }
	const 问题 = 判(fs.readFileSync(档, 'utf8'));
	if (问题.length) {
		console.error(`✗ 引擎检出【未】来自声明 pin（\`books#375\`）—— ${问题.length} 条：`);
		for (const p of 问题) console.error(`  · ${p}`);
		console.error('  ⇒ 本门验的应是「故事实际交付所依据的那棵树」；要打新树做早期回归探测请显式传 `engine_ref=`。');
		process.exit(1);
	}
	console.log('✓ 引擎检出＝声明 pin（两单对称：读 pin 单 ⇒ 检出单；钉在 `books#375`）');
};

const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1]; };
const 根 = path.resolve(import.meta.dirname, '..');
const 真档 = path.join(根, '.github/workflows/e2e-window.yml');

/* ── `--selftest`：**两向自证** —— 往**临时副本**上落两种变异，断言「判据红在对的支」──
 *   ① 检出 `ref:` 改回 `|| 'main'`（病根原形）⇒ 须 rc=1 且具名到「回落」那一条；
 *   ② 撤掉 pin 单的空值守卫 ⇒ 须 rc=1 且具名到「空值具名红」那一条；
 *   ③ 复原 ⇒ rc=0。
 *   ★刀只看「红在对的支」，✗ 只看 rc（同 `check-refs.knives.sh` 的口径）。 */
if (process.argv.includes('--selftest')) {
	const 真 = fs.readFileSync(真档, 'utf8');
	const 临时 = fs.mkdtempSync(path.join(os.tmpdir(), 'pinref-'));
	const 档 = path.join(临时, 'wf.yml');
	const 用 = (源) => {
		fs.writeFileSync(档, 源);
		const r = spawnSync(process.execPath, [import.meta.filename, '--file', 档], { encoding: 'utf8' });
		return { rc: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
	};
	let 过 = 0; const 败 = [];
	const 变异 = [
		['①检出回落 main', /ref:\s*\$\{\{\s*github\.event\.inputs\.engine_ref\s*\|\|\s*steps\.pin\.outputs\.ref\s*\}\}[^\n]*/,
			"ref: ${{ github.event.inputs.engine_ref || 'main' }}", "`|| 'main'` 回落"],
		['②撤空值守卫', /test\s+-n\s+"\$ref"[^\n]*/, 'true', '`test -n "$ref"` 空值具名红'],
	];
	for (const [名, 型, 替, 期望] of 变异) {
		const 变 = 真.replace(型, 替);
		if (变 === 真) { 败.push(`${名}：★变异未生效（先查尺子自己）`); continue; }
		const r = 用(变);
		if (r.rc === 1 && r.out.includes(期望)) { console.log(`  ✓ ${名}（如期红在：${期望}）`); 过++; }
		else 败.push(`${名}：期望 rc=1 且具名「${期望}」，实 rc=${r.rc}｜${r.out.split('\n').slice(0, 3).join(' / ')}`);
	}
	const ok = 用(真);
	if (ok.rc === 0) { console.log('  ✓ ③复原（如期绿）'); 过++; } else 败.push(`③复原：期望 rc=0，实 rc=${ok.rc}`);
	fs.rmSync(临时, { recursive: true, force: true });
	for (const b of 败) console.log(`  ✗ ${b}`);
	console.log(`自检：通过 ${过}｜失败 ${败.length}`);
	process.exit(败.length ? 1 : 0);
}

判一档(path.resolve(arg('--file') ?? 真档));
