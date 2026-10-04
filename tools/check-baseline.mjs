#!/usr/bin/env node
/* 机读基线表的**形状与可判性**校验器（`docs/playtest/baseline-0.0.2.json`）。
 *
 * 它守三件事（都是「可判性」的性质，✗ 不是产品行为）：
 *   ① 每行必须齐字段：`id`／`维`／`集合`／`装具`／`结论`；
 *   ② `结论` 只能取 `非阻塞`／`阻塞`／`未判`；
 *   ③ **未判具名**：`结论 === '未判'` ⇒ `未判原因` **非空**（✗ 不许留空 —— 空着就等于「静默跳过」）。
 *   加 `--release`（发布口径）：**有 `阻塞` 即红**（零阻塞判定 ✓）。
 * 退出码：0 全过；1 判据不符（逐条打印）；2 环境错（文件缺/不是 JSON）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repo = path.resolve(import.meta.dirname, '..');
const 档 = path.join(repo, 'docs/playtest/baseline-0.0.2.json');
const release = process.argv.includes('--release');
if (!fs.existsSync(档)) { console.error(`✗ 环境错：没有 ${path.relative(repo, 档)}`); process.exit(2); }
let T; try { T = JSON.parse(fs.readFileSync(档, 'utf8')); } catch (e) { console.error(`✗ 环境错：解析失败 ${e.message}`); process.exit(2); }
if (!Array.isArray(T?.行)) { console.error('✗ 环境错：表里没有 `行` 数组'); process.exit(2); }

const 必填 = ['id', '维', '集合', '装具', '结论'];
const 允许 = new Set(['非阻塞', '阻塞', '未判']);
const fails = [], 未判 = [], 阻塞 = [];
for (const [i, r] of T.行.entries()) {
	const 哪 = `第 ${i + 1} 行（${r?.id ?? '(无 id)'}）`;
	for (const k of 必填) if (r?.[k] == null || String(r[k]).trim() === '') fails.push(`${哪}：缺字段 ${k}`);
	if (r?.结论 != null && !允许.has(r.结论)) fails.push(`${哪}：结论取值非法「${r.结论}」（只许 非阻塞／阻塞／未判）`);
	if (r?.结论 === '未判') {
		未判.push(r.id);
		if (!r?.未判原因 || !String(r.未判原因).trim()) fails.push(`${哪}：**未判具名**要求非空的「未判原因」（✗ 不许留空＝静默跳过）`);
	}
	if (r?.结论 === '阻塞') 阻塞.push(r.id);
	/* ★人工面标记：`面` 字段（可选）写 `人工` ⇒ 便于报告分表（✗ 不许把人工面混进自动面表）。 */
}
if (release && 阻塞.length) fails.push(`发布口径（--release）：存在 **阻塞** ${阻塞.length} 条 ⇒ ✗ 不许判零阻塞：${JSON.stringify(阻塞)}`);

console.log(`基线表：共 ${T.行.length} 行｜非阻塞 ${T.行.filter((r) => r.结论 === '非阻塞').length}｜阻塞 ${阻塞.length}｜未判 ${未判.length}`);
if (未判.length) console.log(`  ★未判（具名在册，逐条递减到零）：${JSON.stringify(未判)}`);
for (const f of fails) console.error(`  ✗ ${f}`);
if (fails.length) { console.error(`✗ 基线表校验未过 ${fails.length} 条`); process.exit(1); }
console.log('✓ 基线表形状与可判性校验通过' + (release ? '（发布口径：零阻塞 ✓）' : ''));
