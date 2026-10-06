/* 内容边界登记表的**机械守卫**（`sgstory#1988` 阶段 5·切片①；领队 18:07 裁甲+丙）
 *
 * 用法：`node tools/check-content-inventory.mjs [--selftest]`
 * 退出码：0＝表与现状一致 ✓；1＝不一致（逐条具名）；2＝装置错（登记表读不到／不是 JSON ✓）。
 *
 * ## 为什么要有它
 * 「内容」与「版式/骨架」的边界此前**只活在人的记忆里** ⇒ 新档一落地没人知道它算哪一类 ✓。
 * 本门把边界变成**可复算**的：**每个档都要在 `stories/babel/content-inventory.json` 里登记** ✓。
 * ★**两向都断**（`#1991` 判据半的教训：只断一个方向 ⇒ 一个"恒报全部"的实现也会绿 ✗）：
 *   ①**盘上有、表里无** ⇒ 红（新档未登记 ✓ —— 这是本门的主职 ✓）
 *   ②**表里有、盘上无** ⇒ 红（登记成了空文 ✓ —— 删档没销号 ✓）
 * ## 本门**不**判什么（✗ 免得当已护）
 *   · ✗ 不判「类别对不对」（那是评审的活 ✓，人写的依据在表里逐条可查 ✓）
 *   · ✗ 不判内容应不应该在 JS（那是**切片②**的事 ✓，本门先钉边界 ✓）
 */
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const 表路径 = 'stories/babel/content-inventory.json';

/** 纯函数：给「盘上档列表」与「登记表」⇒ 得差异（⇒ 可被自检直接喂合成数据 ✓）。 */
export function 核对(盘上, 表) {
	const 登记 = new Set((表.档 ?? []).map((x) => x.path));
	const 实有 = new Set(盘上);
	/* ★`#1988` 切片②-1：类别**必须是已定义的**（✗ 表里冒出一个没定义过的类别 ⇒ 红） */
	const 定义表 = 表.类别定义 ?? {};
	const 未定义类别 = [...new Set((表.档 ?? []).map((x) => x.类别))].filter((c) => !(c in 定义表)).sort();
	return {
		未登记: [...实有].filter((p) => !登记.has(p)).sort(),
		空登记: [...登记].filter((p) => !实有.has(p)).sort(),
		重复: ( 表.档 ?? []).map((x) => x.path).filter((p, i, a) => a.indexOf(p) !== i),
		未定义类别,
	};
}
/** ★**抽取件判据**（`叙事文本（抽取件）` ＝ `story/text/**`）：**只许文案常量 ✗ 逻辑** ✓（领队 21:13 裁乙 ✓）
 *  禁止面：控制流与函数定义 ✓；**须含 ≥1 处文案常量** ✓（空档＝"搬了个空壳" ✗）。 */
export function 抽取件问题(正文) {
	const 禁 = [/(^|[^\w$])if\s*\(/, /(^|[^\w$])for\s*\(/, /(^|[^\w$])while\s*\(/, /(^|[^\w$])function(\s|\()/, /=>/, /(^|[^\w$])class\s/, /(^|[^\w$])await\s/];
	const 中 = 禁.map((r) => (正文.match(r) || [])[0]).filter(Boolean);
	const 有文案 = /['"`][^'"`]*[\u4e00-\u9fa5]{2,}[^'"`]*['"`]/.test(正文);
	const out = [];
	if (中.length) out.push(`出现逻辑写法：${JSON.stringify(中)}`);
	if (!有文案) out.push('档里没有文案常量（搬了个空壳？）');
	return out;
}

/** ★**叙事文案密度**（防「抄 A 成 B」假绿）：数一数该档里"像玩家能读的话"的中文串常量。
 *  ⚠ 它是**弱判据**（✗ 分不清"叙事"与"错误提示"✓）—— 但它能抓住**最要命的那一种假绿**：
 * 把**纯逻辑档**标成『内容（叙事）』✓（那种档的密度**必然**趋 0 ✓）。
 *  ★阈值与判据形都在**清单里一处声明**（✗ 别在代码里写死 ✓）。 */
export function 叙事密度(正文) {
	/* ★**先剥注释再数**（领队 2026-10-05 00:28 裁① ✓）：设计注释里**引用原文**是常态 ✓，
	 *   旧形把它数成"文案" ✗ ⇒ 会把"爱写注释的规则档"误判成内容 ✗（`world/boss.js` 实测 **81 → 6** ✗）。 */
	const 净 = 正文
		.replace(/\/\*[\s\S]*?\*\//g, '')      // 块注释
		.replace(/^[ \t]*\/\/.*$/gm, '');         // 行首行注释
	const 命中 = 净.match(/['"`][^'"`]*[\u4e00-\u9fa5]{4,}[^'"`]*['"`]/g) || [];
	return 命中.length;
}

const 自检 = process.argv.includes('--selftest');
if (自检) {
	/* ★刀：本门的两把牙 —— 各喂一组**合成**数据（✗ 不碰真盘 ✓ ⇒ 判据的期望不与被测物同源 ✓） */
	const 表 = { 档: [{ path: 'a.js' }, { path: 'b.js' }] };
	const 一 = 核对(['a.js', 'b.js', '新档.js'], 表);
	const 二 = 核对(['a.js'], 表);
	const 三 = 核对(['a.js', 'b.js'], { 档: [{ path: 'a.js' }, { path: 'a.js' }] });
	const 四 = 核对(['a.js','b.js'], { 档: [{ path: 'a.js', 类别: '内容（叙事）' }, { path: 'b.js', 类别: '★没定义过' }], 类别定义: { '内容（叙事）': {} } });
	const 五 = [叙事密度("const a = '这是一句够长的中文文案用来数';"), 叙事密度('const f = (x) => x + 1;')];
	const 果 = [
		[一.未登记.join(',') === '新档.js', '①盘上有表里无 ⇒ 须抓出「新档.js」'],
		[二.空登记.join(',') === 'b.js', '②表里有盘上无 ⇒ 须抓出「b.js」'],
		[三.重复.join(',') === 'a.js', '③重复登记 ⇒ 须抓出'],
		[四.未定义类别.join(',') === '★没定义过', '④类别未定义 ⇒ 须抓出「★没定义过」'],
		[五[0] === 1 && 五[1] === 0, '⑤叙事密度：有文案 ⇒ 1；纯逻辑 ⇒ 0'],
		[抽取件问题("export const a = '这是一句中文文案';").length === 0, '⑥抽取件：纯文案 ⇒ 无问题'],
		[抽取件问题("export const a = '中文文案'; if (x) y();").length === 1, '⑦抽取件：混进 `if` ⇒ 须报 1 条'],
		[抽取件问题("export const a = 1;").length === 1, '⑧抽取件：无文案常量 ⇒ 须报 1 条'],
	];
	let ok = true;
	for (const [过, 名] of 果) { console.log((过 ? '✓' : '✗') + ' ' + 名); if (!过) ok = false; }
	console.log(ok ? '✓ 自检 8/8 如期（两向 ＋ 重复 ＋ 类别未定义 ＋ 叙事密度 ＋ 抽取件三项）' : '✗ 自检失败');
	process.exit(ok ? 0 : 1);
}

if (!existsSync(表路径)) { console.error(`✗ 装置错：登记表不在 ${表路径}（先落切片①的登记表 ✓）`); process.exit(2); }
let 表;
try { 表 = JSON.parse(readFileSync(表路径, 'utf8')); }
catch (e) { console.error(`✗ 装置错：登记表不是合法 JSON —— ${e.message}`); process.exit(2); }
const scope = 表.scope ?? 'stories/babel/src';
const 盘上 = execFileSync('git', ['ls-files', scope], { encoding: 'utf8' }).split('\n').filter(Boolean);
const { 未登记, 空登记, 重复, 未定义类别 } = 核对(盘上, 表);
/* ★密度断（只对『内容（叙事）』类 ✓；阈值取自清单 ✓）： */
const 阈值 = 表.类别定义?.['内容（叙事）']?.阈值;
const 密度红 = [];
if (typeof 阈值 === 'number') {
	for (const x of 表.档 ?? []) {
		if (x.类别 !== '内容（叙事）') continue;
		let 正文 = '';
		try { 正文 = readFileSync(x.path, 'utf8'); } catch { 密度红.push([x.path, '读不到']); continue; }
		const n = 叙事密度(正文);
		if (n < 阈值) 密度红.push([x.path, `叙事文案 ${n} 处 < 阈值 ${阈值}`]);
	}
}
let 红 = 0;
for (const p of 未登记) { console.error(`✗ [未登记] ${p} —— 盘上有、表里没有 ⇒ 新档落地了但**边界没登记**（在 ${表路径} 的「档」里加一条 ✓）`); 红++; }
for (const p of 空登记) { console.error(`✗ [空登记] ${p} —— 表里有、盘上没了 ⇒ **删档没销号**（✗ 别让登记表变成空文 ✓）`); 红++; }
for (const p of 重复) { console.error(`✗ [重复] ${p} —— 同一档登记了两次`); 红++; }
for (const c of 未定义类别) { console.error(`✗ [类别未定义] ${c} —— 表里出现了没定义过的类别 ⇒ 先在「类别定义」里给它一句定义与判据形（✗ 别让类别悄悄长出来）`); 红++; }
/* ★**原档上限断**（标 `混装待拆` 的档密度须**低于**阈值 ＝"文案真搬走了"的机械形 ✓）：
 *   ★**故意不在本笔落** ✗ —— 它现在会把**两个尚未搬动**的档（`boss.js` 81／`tools.js` 64 ✓）判红 ✓，
 *   而"没搬"正是**本笔的现状** ✓。⇒ 它必须与**搬动同笔落** ✓（判据与它的对象同笔 ✓）—— 见清单里
 *   「切片③」段：搬 `boss.js` 那一笔里**同时**加回这条断 ✓。★现在留在这里的是**为什么还没它** ✓，✗ 不是静默省略 ✓。 */
/* ★抽取件（`叙事文本（抽取件）`）：只许文案常量 ✗ 逻辑 ✓ */
const 抽取件红 = [];
for (const x of 表.档 ?? []) {
	if (x.类别 !== '叙事文本（抽取件）') continue;
	let 正文 = '';
	try { 正文 = readFileSync(x.path, 'utf8'); } catch { 抽取件红.push([x.path, '读不到']); continue; }
	for (const why of 抽取件问题(正文)) 抽取件红.push([x.path, why]);
}
for (const [p, 因] of 抽取件红) { console.error(`✗ [抽取件] ${p} —— ${因} ⇒ ★抽出件**只许文案常量** ✓（`+ '`import` 指位/导出面可留 ✓，逻辑不許 ✗）'); 红++; }
for (const [p, 因] of 密度红) { console.error(`✗ [内容类密度] ${p} —— ${因} ⇒ ★这档标成了『内容（叙事）』但里面几乎没有叙事文案 ⇒ **抄 A 成 B 假绿**（把逻辑档标成了内容）`); 红++; }
if (红) { console.error(`✗ 内容边界登记表与现状不一致：${红} 条`); process.exit(1); }
const 待细目 = (表.档 ?? []).filter((x) => x.类别 === '待细目').length;
console.log(`✓ 内容边界登记表与现状一致（${盘上.length} 档｜未登记 0｜空登记 0｜类别定义 ${Object.keys(表.类别定义 ?? {}).length} 类｜★待细目 ${待细目} 档）`);
