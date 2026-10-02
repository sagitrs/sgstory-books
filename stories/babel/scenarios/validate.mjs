/* 清单自检（`#1814` 探索面 1/5 的**可装载**证据）：字段齐、id 唯一、锚非空、
 * 四条强制形**在数据层可判**的那部分（层=both ⇒ 逻辑与渲染断言都要有；动作非空；fixture 形合法）。
 * 用法：node stories/babel/scenarios/validate.mjs [文件]  ⇒ 失败形＝干净红＋汇总（rc≠0）。 */
import fs from 'node:fs';
import path from 'node:path';

const fail = [];
const ok = [];
const file = process.argv[2] ?? path.join(import.meta.dirname, 'scenarios.json');
const 形 = new Set(['裸状态形', '具名']);
const 层 = new Set(['logic', 'render', 'both']);
const 段 = new Set(['span1', 'span2', 'cross']);

/* ★失败形纪律：崩溃也要**干净红＋具名**（✗ 让异常把汇总吞掉） */
process.on('uncaughtException', (e) => {
	console.error(`✗ ★未捕获异常：${e.message}`);
	console.error('✗ 清单自检失败 1 条');
	process.exit(1);
});
/* ★此处曾有一个 `process.on('exit')` 的「恒绿门」支（正常结束却没跑过一条 ⇒ rc=1），**已删**：
 *   它是**死代码** —— 空清单／路径错在 `JSON.parse` 前就被上面的具名支拦下（先抛），
 *   而清单非空时循环必然填 `ok`／`fail` ⇒ 该条件**永不成立**（tester-4 RC：判冗余，裁乙）。
 *   ⇒ 「空清单红」由 **uncaughtException 支具名**承担（✗ 两条支声称覆盖同一面）。 */

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const rows = doc['场景'];
if (!Array.isArray(rows) || rows.length === 0) throw new Error('读不到「场景」数组（或为空）');

const seen = new Set();
for (const r of rows) {
	const at = `[${r.id ?? '(缺 id)'}]`;
	const bad = (m) => fail.push(`${at} ${m}`);
	if (!r.id) bad('缺 id'); else if (seen.has(r.id)) bad(`id 重复：${r.id}`); else seen.add(r.id);
	if (!段.has(r['段'])) bad(`「段」非法：${r['段']}`);
	if (!r['来源']) bad('缺「来源」（谁供的料）');
	if (!形.has(r['入口态']?.['形'])) bad(`入口态.形 非法：${r['入口态']?.['形']}`);
	if (!r['入口态']?.['fixture']) bad('缺 入口态.fixture');
	/* ★信封形判据（`#79` dev-10 NIT-3「可判未判」）：`loadFixture` 把**含 `state` 键**的对象当**存档对象形**
	 *   ⇒ 会走 `Save.onLoad` 契约（而入口态**不是存档**，`#1806` 笔 1）⇒ inline 数据里出现存档信封键即红。
	 *   （fixture 为**具名字符串**时无此面；只有 inline `数据` 才可判 ⇒ 有则必判。） */
	if (r['入口态']?.['数据'] != null) {
		const 数据 = r['入口态']['数据'];
		for (const k of ['state', 'saveVersion', 'version']) {
			if (Object.prototype.hasOwnProperty.call(数据, k)) {
				bad(`入口态.数据 含存档信封键 \`${k}\` ⇒ 会被当**存档对象形**（入口态是**裸状态**，✗ 信封）`);
			}
		}
	}
	if (!Array.isArray(r['动作']) || r['动作'].length === 0) bad('「动作」空 —— 场景必须走真实动作');
	if (!Array.isArray(r['锚']) || r['锚'].length === 0) bad('「锚」空 —— 场景须锚一条裁定');
	if (!层.has(r['层'])) bad(`「层」非法：${r['层']}`);
	if (r['层'] === 'both' || r['层'] === 'logic') {
		if (!r['断言']?.['逻辑']) bad('层含 logic 但缺「断言.逻辑」');
	}
	if (r['层'] === 'both' || r['层'] === 'render') {
		if (!r['断言']?.['渲染']) bad('层含 render 但缺「断言.渲染」');
	}
	if (!r['守的面']) bad('缺「守的面」（一句话说清守哪个回归）');
	/* ★第 5 条强制形「准写死」（writer ＋ writer-2 合署）：**渲染栏每个被断言的值/子串须带实指**
	 *   —— `文件:行`（如 `play.twee:58`）**或**选择器（如 `.noticebar`／`[data-panel="hp"]`）——
	 *   **指不出 ⇒ 该断言未成立**（本轮 5 处错**全同形**：断言了 UI 不产出的东西；带实指是唯一**当场**拦得住的形）。 */
	const 渲染 = (r['断言'] ?? {})['渲染'];
	if (typeof 渲染 === 'string' && 渲染.length > 0) {
		const 有文件行 = /[\w./-]+\.(js|mjs|twee|json|md|html):\d+/.test(渲染);
		const 有选择器 = /(^|[\s（(])[.#][\w-]+|\[[^\]]+\]/.test(渲染);
		if (!有文件行 && !有选择器) bad('「断言.渲染」缺**实指**（须带 `文件:行` 或选择器 —— 指不出 ⇒ 断言未成立）');
	}
	/* ★「须可执行」**形核**（`#1814` 甲案首笔）：对象形**出现时**须满足该形的**最低要件** ⇒ 防「**形似可执行**」（写个 `{}` 就算升过）。
	 *   ★本笔**只**判 `断言.逻辑`。`断言.渲染` 的**对象形暂不上判** —— 它须与 T 席 `tests/scenario/run.mjs` 的 `panelRefs`
	 *   **对象形升级同批**：现实现是 `String(断言.渲染)` 扫 `data-panel="…"` ⇒ 先改对象形 ⇒ `String({})` ＝ `[object Object]`
	 *   ⇒ **面板核静默掉核**（✗ 无声）—— 见 `sagitrs/sgstory#1814` 的「顺序约束（双向）」①②。 */
	const 逻辑 = (r['断言'] ?? {})['逻辑'];
	if (逻辑 != null && typeof 逻辑 === 'object') {
		const 步 = 逻辑['步骤'];
		if (!Array.isArray(步) || 步.length === 0) bad('「断言.逻辑」对象形缺非空 `步骤` 数组');
		else if (!步.some((s) => /loadFixture|dispatch|rollEncounter|Battle|act\(/.test(String(s)))) {
			bad('「断言.逻辑.步骤」未含**真实动作**（须含 `loadFixture`／`dispatch`／`rollEncounter`／`Battle` 之一 —— 形似可执行不算）');
		}
		const 存 = 逻辑['存档'];
		if (存 == null || typeof 存 !== 'object' || Array.isArray(存)) bad('「断言.逻辑」对象形缺 `存档` 对象（`assertSave` 期望）');
		else if (Object.keys(存).length === 0) bad('「断言.逻辑.存档」为**空对象** ⇒ `assertSave({})` **恒过** ＝ 形似可执行（✗ 空期望）');
		else {
			for (const k of ['state', 'saveVersion', 'version']) {
				if (Object.prototype.hasOwnProperty.call(存, k)) bad(`「断言.逻辑.存档」含存档**信封**键 \`${k}\`（\`assertSave\` 期望的是**存档内路径**，✗ 信封）`);
			}
		}
	}
	if (!fail.length || !fail.some((f) => f.startsWith(at))) ok.push(r.id);
}

/* ★「主锚 + 同锚分案」口径（`#1814` 去重判据的**可执行**形）：
 *   · `主锚` 必须**恰一个**且 ∈ `锚`（一条场景＝一个裁定 —— 其余锚只是同条场景的旁证）；
 *   · 主锚**重** ⇒ 两条都须声明 `同锚分案{同锚:主锚, 面}`，且 `面` 必须**互不相同**
 *     （「前提同源、断言面不同」⇒ 允许并存；✗「同一面拆两条」）。 */
const 主锚 = new Map();
for (const r of rows) {
	const at = `[${r.id ?? '(缺 id)'}]`;
	if (!r['主锚']) fail.push(`${at} 缺「主锚」`);
	else if (!Array.isArray(r['锚']) || !r['锚'].includes(r['主锚'])) fail.push(`${at} 「主锚」(${r['主锚']}) 不在「锚」里`);
	if (r['主锚']) {
		if (!主锚.has(r['主锚'])) 主锚.set(r['主锚'], []);
		主锚.get(r['主锚']).push(r);
	}
	/* 声明了分案就必须指向**自己**的主锚（✗ 只在重复组里查 —— 那样 stale 分案会溜过） */
	if (r['同锚分案'] && r['同锚分案']['同锚'] !== r['主锚']) {
		fail.push(`${at} 「同锚分案.同锚」(${r['同锚分案']['同锚']}) ≠ 主锚(${r['主锚']})`);
	}
}
for (const [a, group] of 主锚) {
	if (group.length < 2) continue;
	const 面s = group.map((r) => r['同锚分案']?.['面']);
	for (let i = 0; i < group.length; i++) {
		const r = group[i], at = `[${r.id}]`;
		if (!r['同锚分案']) fail.push(`${at} 与另 ${group.length - 1} 条同主锚 ${a}，但缺「同锚分案」（须写清**断言面**，✗ 同一面拆两条）`);
	}
	for (let i = 0; i < 面s.length; i++) for (let j = i + 1; j < 面s.length; j++) {
		if (面s[i] && 面s[i] === 面s[j]) fail.push(`[${group[i].id}] 与 [${group[j].id}] 同主锚 ${a} 的「分案面」**逐字相同** —— ✗ 同一面拆两条`);
	}
}

const by = (k, v) => rows.filter((r) => r[k] === v).length;
console.log(`─ 清单：${rows.length} 条（来源 writer ${by('来源', 'writer')}｜writer-2 ${by('来源', 'writer-2')}`
	+ `｜主锚 ${主锚.size} 个、其中同锚分案 ${[...主锚.values()].filter((g) => g.length > 1).length} 组`
	+ `｜段 span1 ${by('段', 'span1')}／span2 ${by('段', 'span2')}／cross ${by('段', 'cross')}）`);
console.log(`  通过 ${ok.length}｜不符 ${fail.length}`);
for (const f of fail) console.log(`  ✗ ${f}`);
console.log(fail.length ? '✗ 清单自检失败' : '✓ 清单自检通过');
process.exit(fail.length ? 1 : 0);
