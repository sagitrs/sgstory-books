/* check-readme-tables.mjs —— Markdown **表格结构**核：每张表的每一行，**未转义竖线数**须＝本表表头。
 *
 * 为什么要有它（`books#358` 的实测）：
 *   `tools/README.md` 的 ⑫ 段曾出现**把两行粘成一行**的坏法 —— 一行 855 字符、把「期望读数」与
 *   「设立理由」两行吞并、又夹进一段提交摘要。后果：该段条目从 **4 项变 3 项**（✗ 违反本档
 *   「工具的 README 条目必载四项」），而**渲染出来只是列错位**，✗ 不报错 ⇒ ★**肉眼与 CI 都不拦**。
 *   ⇒ 本件把那个判据机械化：**单元数 ≠ 表头 = 红**。★负控用**历史真档**（`beb159f` 那版）验过：
 *     它报出【行 328，单元 8，应 3】——正是当时**人工**抓到的那一行 ✓。
 *
 * 口径（★写死，免得日后漂）：
 *   · **分隔符**＝**未转义**的 `|`；`\|` **不算**（GFM 的转义形 ⇒ 它在格里是字面竖线）。
 *     ★本件**✗ 不**把「反引号里的竖线」当字面 —— GFM 下代码跨里的裸 `|` **照样分格**
 *     （须写 `\|`）⇒ 本件与 GFM 同口。这正是一条**真**教训：⑫ 段的 `save|load|delete` 就是它。
 *   · 表＝「表头行（含 `|`）＋ 分隔行（只含 `|` `-` `:` 与空白）＋ ≥1 行体」。
 *   · **只判单元数**；✗ 不判列宽、✗ 不判列名、✗ 不判内容（那是文风核 `check-norms-symbols.py` 的面）。
 *
 * 退出码：0 全过｜1 有具名不符行（逐条印「行号｜单元数｜应为」＋该行前 70 字）｜2 用法/装置错。
 *
 * 用法：
 *   node tools/check-readme-tables.mjs [<md 档> ...]        # 缺省 tools/README.md
 *   node tools/check-readme-tables.mjs --selftest           # 刀：正例／反例（粘行）／转义形（正反）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* ── 判据本体（★主流程与 --selftest **共用** ⇒ 两份必漂） ─────────────────── */
/** 数**未转义**竖线（`\|` 不计）。 */
export function 未转义竖线数(行) {
	return (行.match(/(^|[^\\])\|/g) ?? []).length;
}
/** 分隔行判定：`| --- | :--: |` 一类（去竖线后只剩 `-` `:` 空白）。 */
export function 是分隔行(行) {
	if (!行.includes('|')) return false;
	const 余 = 行.replace(/\|/g, '').replace(/[-:\s]/g, '');
	return 余 === '';
}
/** 扫一份文本 ⇒ 不符行清单 `[{行号, 单元, 应, 文本}]`（★不做 I/O ⇒ 可自检）。 */
export function 核表(文本) {
	const 行 = 文本.split('\n');
	const 坏 = [];
	let i = 0;
	while (i < 行.length) {
		if (行[i].includes('|') && i + 1 < 行.length && 是分隔行(行[i + 1])) {
			const 应 = 未转义竖线数(行[i]);
			let j = i + 2;
			while (j < 行.length && 行[j].includes('|')) {
				const 实 = 未转义竖线数(行[j]);
				if (实 !== 应) 坏.push({ 行号: j + 1, 单元: 实, 应, 文本: 行[j].slice(0, 70) });
				j++;
			}
			i = j;
		} else i++;
	}
	return 坏;
}

/* ── --selftest：刀（★正例／反例／转义两向；合成样本 ⇒ 判据的期望不与被测物同源）─── */
if (process.argv.includes('--selftest')) {
	const 检 = [];
	const 查 = (名, 条件, 读) => 检.push({ 名, 条件, 读 });
	const 好 = ['| 项 | 内容 |', '|---|---|', '| **清单** | 甲 |', '| **固定命令** | 乙 |'];
	const 粘 = ['| 项 | 内容 |', '|---|---|', '| **清单** | 甲 | **设立理由** | 丙 |'];
	const 转义好 = ['| 项 | 内容 |', '|---|---|', '| **清单** | 甲 `a \\| b` 乙 |'];
	const 转义坏 = ['| 项 | 内容 |', '|---|---|', '| **清单** | 甲 `a | b` 乙 |'];
	查('K1 正例：四行两列 ⇒ 0 不符', 核表(好.join('\n')).length === 0, JSON.stringify(核表(好.join('\n'))));
	const b2 = 核表(粘.join('\n'));
	/* ⚠ 期望值**我第一版写错了**（写成 4）——`| **清单** | 甲 | **设立理由** | 丙 |` 的**未转义竖线数是 5**（含首尾）。
	 *   ★本件**当场把我这个错值判红**（K2 ✗）⇒ 说明它真在数，✗ 不是恒绿装饰（自检的价值正在此）。 */
	查('K2 ★刀（粘行）：单元 5 ≠ 表头 3 ⇒ 恰好 1 条具名', b2.length === 1 && b2[0].单元 === 5 && b2[0].应 === 3, JSON.stringify(b2));
	查('K3 转义形 `\\|` **不算**分隔 ⇒ 0 不符（✗ 被当成坏行）', 核表(转义好.join('\n')).length === 0, JSON.stringify(核表(转义好.join('\n'))));
	const b4 = 核表(转义坏.join('\n'));
	查('K4 ★反例臂：格里**裸** `|`（未转义）⇒ 判出（与 GFM 同口）', b4.length === 1 && b4[0].单元 === 4, JSON.stringify(b4));
	查('K5 非表文本 ⇒ 0 不符（✗ 把散文当表）', 核表('# 标题\n\n这是一行散文，含 | 一个竖线 |\n').length === 0, '散文');
	查('K6 空行交错的表体 ⇒ 表在此**结束**（✗ 越界判后面的行）', 核表(['| a | b |', '|---|---|', '| 1 | 2 |', '', '| 单独 | 一行 |'].join('\n')).length === 0, '空行截断');
	const 失败 = 检.filter((x) => !x.条件);
	for (const x of 检) console.log(`  ${x.条件 ? '✓' : '✗'} ${x.名}  ｜${x.读}`);
	console.log(失败.length ? `\n  ⇒ 自检失败 ${失败.length} 条` : '\n  ⇒ 自检：6/6 如期（★主流程与自检共用同一个 `核表` ✓）');
	process.exit(失败.length ? 1 : 0);
}

/* ── 主流程 ───────────────────────────────────────────────────────────── */
const 参 = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const 档 = 参.length ? 参 : ['tools/README.md'];
/** 本件住在 `tools/`；缺省档按**仓根**解析（`import.meta` ⇒ ✗ 吃 cwd）。 */
const 仓根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let 总坏 = 0, 总表 = 0;
for (const p of 档) {
	const f = path.isAbsolute(p) ? p : path.join(仓根, p);
	if (!fs.existsSync(f)) { console.error(`✗ 装置错（✗ 不当判据红）：找不到 ${f}`); process.exit(2); }
	const 文本 = fs.readFileSync(f, 'utf8');
	const 坏 = 核表(文本);
	const 表数 = (文本.match(/\n\|[^\n]*\|\n\|[-:\s|]+\|\n/g) ?? []).length;
	总表 += 表数; 总坏 += 坏.length;
	for (const b of 坏) console.log(`  ✗ ${path.relative(仓根, f)}:${b.行号} —— 单元 ${b.单元}，应为 ${b.应}（≠ 本表表头）｜${b.文本}`);
	console.log(`  ${path.relative(仓根, f)}：表 ${表数}｜不符行 ${坏.length}`);
}
console.log(总坏 ? `✗ 表格结构核失败：${总坏} 行单元数与表头不符` : `✓ 表格结构核通过（表 ${总表}｜不符 0）`);
process.exit(总坏 ? 1 : 0);
