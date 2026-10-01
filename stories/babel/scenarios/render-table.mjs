/* 票面/评审用的**表渲染**：读单源 `scenarios.json` ⇒ 打 markdown 表（✗ 手抄 ⇒ 表与 JSON 永不漂移）。
 * 用法：node stories/babel/scenarios/render-table.mjs [文件]  > table.md
 * ★`#1814` 的票面那张表就是用这个生成的（「单源」这句要**可复现**才算数）。 */
import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] ?? path.join(import.meta.dirname, 'scenarios.json');
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = d['场景'];
const by = (k, v) => rows.filter((r) => r[k] === v).length;

console.log(`**${rows.length} 条**＝writer ${by('来源', 'writer')} ｜ writer-2 ${by('来源', 'writer-2')}`
	+ ` ｜ 段：span1 ${by('段', 'span1')}／span2 ${by('段', 'span2')}／cross ${by('段', 'cross')}\n`);
console.log('| id | 段 | 来源 | 入口态 fixture | 动作序列 | 逻辑断言 | 渲染断言 | 主锚（锚集） | 层 | 守的面 |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
	console.log(`| \`${r.id}\` | ${r['段']} | ${r['来源']} | ${r['入口态']['fixture']}（${r['入口态']['形']}）`
		+ ` | ${r['动作'].join('／')} | ${r['断言']['逻辑'] ?? '—'} | ${r['断言']['渲染'] ?? '—'}`
		+ ` | ${r['主锚']}${r['同锚分案'] ? '（★同锚分案：' + r['同锚分案']['面'].slice(0, 28) + '…）' : ''}`
		+ ` | ${r['层']} | ${r['守的面']} |`);
}
