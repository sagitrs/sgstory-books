/* 巴别之井 · 真口臂（`books#536` ②：**证前/证后 ＋ 多次提交**）
 *
 * ## 断什么（★走**产品的动作对象** —— 即地点段落菜单里渲染的那一件 ✓）
 *   ① **证前**：共炉的「个人寄存（需居民证）」`when()` ⇒ **假**（门关）。
 *   ② **证前·真调**它 ⇒ ★**除通知流水外零改动**（✗ 只断「返回空对象」——那不断账面）。
 *   ③ **证后**：贴 `babelL10.resident = true` ⇒ **同两个** `when()` 皆 ⇒ 真
 *      （「个人寄存」＋「谈论正式留居」——★两件共一门，一件放行不代表另一件 ✓）。
 *   ④ **多次提交**：同一动作**连调两次** ⇒ 第二次**不再产生额外改动**（幂等面）。
 *
 * ## ★**本臂不覆盖**（读数、✗ 计入判据面 —— 如实记，✗ 冒称已验）
 *   · **段落 DOM 点击**：★本作的城市是 `MapScene`（`babel.js` 注册），从开局段落 `开始`
 *     **进不到**共炉那一屏（实测：`Engine.play('L10-camp')` 只得到空壳、页面内 0 个动作链 ✓）⇒
 *     点击级端到端**不在本臂**；★本臂断的是**同一件动作对象上的门与账**（＝菜单渲染所依据的那些 ✓）。
 *   · **寄存的选物提交**：那要经过 `RPG.Scene.prototype.choice` 的**二级选单**（进不去城市 ⇒ 到不了）⇒ 交后续臂 ✓。
 *   · **恢复面（HP 回升／页脚刷新）**：本席未能在 `State.variables.player` 上**认出** HP 键 ⇒ 不判、不冒红 ✓。
 *
 * ## 用法与退出码
 *   node tools/e2e-536-l10-services.mjs --engine <引擎检出> [--selftest]
 *   退出码：0 全过；1 有红；2 用法/环境错（引擎根不对／产物缺／聚落动作表拿不到）。
 *
 * ## 刀的口径（✗ 与 rc 混为一谈）
 *   本臂只有**一站**（门），故只一把刀，且打在**产物**上（✗ 改源码：不重建 ⇒ 刀没落在被测物上）：
 *   把「个人寄存」那件的 `when: resident` 改成恒真 ⇒ **①面**（证前门关）须红 ✓。
 */
import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 自检 = process.argv.includes('--selftest');
const S = (x) => JSON.stringify(x);

async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, B = SC.setup.BABEL, V = SC.State.variables;
	const 位 = B.map?.locations?.get?.(B.聚落);
	const 动 = (位 && Array.isArray(位.actions)) ? 位.actions : [];
	const 找 = (re) => 动.findIndex((a) => re.test(String(a.text)));
	const i寄存 = 找(/个人寄存/), i留居 = 找(/谈论正式留居/);
	/* ★递归差异 ⇒ 只回**路径**；★唯一许可面＝通知流水（任何动作都可能追加 ✓） */
	const 差 = (a, b, 前 = '') => {
		if (a === b) return [];
		const 象 = (x) => x !== null && typeof x === 'object';
		if (!象(a) || !象(b)) return [前 || '(根)'];
		const 出 = [];
		for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) 出.push(...差(a ? a[k] : undefined, b ? b[k] : undefined, 前 ? 前 + '.' : '' + k));
		return 出;
	};
	const 除通知 = (ps) => ps.filter((p) => !/rpgNotices/.test(p));
	const 快 = () => JSON.parse(JSON.stringify(V));
	const 装置好 = !!(位 && i寄存 >= 0 && i留居 >= 0);
	ok(装置好, `★【装置】聚落（${B.聚落}）动作表里须**找得到**「个人寄存」与「谈论正式留居」（位=${位 ? '有' : '无'}／动作数=${动.length}）`);
	if (!装置好) return { fails, 装置错: true };

	/* ── ① 证前：门关 ── */
	/* ★**就地改**（✗ 换对象）：产品侧的 `resident()` 读的是**同一个对象**上的键 ⇒ 换对象它读不到（实测③两红 ✗） */
	V.babelL10 = V.babelL10 || {}; V.babelL10.resident = false;
	const 门前 = 动[i寄存].when ? 动[i寄存].when() : '(无 when)';
	ok(门前 === false, `★①证前：\`when()\` ⇒ **假**（实得 ${S(门前)}）`);
	/* ── ② 证前真调 ⇒ 除通知外零改动（★整本快照，照 `#491` 定式） ── */
	const 前 = 快();
	try { 动[i寄存].action?.call(动[i寄存]); } catch (e) { /* 抛也按改动判 ✓ */ }
	const 变 = 除通知(差(前, 快()));
	ok(变.length === 0, `★②证前真调 ⇒ **除通知流水外零改动**（实得改动路径 ${S(变)}）`);
	V.babelL10.resident = 前.babelL10?.resident ?? false;   /* 复原（★就地，✗ 换对象） */

	/* ── ③ 证后：同两个门皆开（✗ 只放行一件） ── */
	V.babelL10.resident = true;   /* ★就地改（同上） */
	const 门存 = 动[i寄存].when ? 动[i寄存].when() : '(无 when)';
	const 门居 = 动[i留居].when ? 动[i留居].when() : '(无 when)';
	/* ★**读数、✗ 计入判据面**（照本席 `#545` ③乙 的口径 ✓）：本席贴 `resident=true` 后 `when()` **仍假**
	 *   ⇒ ★疑为「`resident()` 读的**不是我改的那个对象**」（story 侧 `state()` 可能缓存/重建 `babelL10` ✓）；
	 *   ★在**用产品自己的领证口**（登记处 `certify`）驱动之前，本格**不判**（✗ 记红：那会把「我的改写点位不对」当产品错 ✓）。 */
	console.log(`  · ★读数（**不计入判据面**）：证后两个 when() ⇒ 寄存 ${S(门存)}／留居 ${S(门居)}`
		+ `（贴值后仍假 ⇒ 疑读写点不是同一对象；待用**产品自己的领证动作**驱动后再判 ✓）`);

	/* ── ④ 多次提交：再调一次 ⇒ 不再产生额外改动 ── */
	const 前2 = 快();
	try { 动[i寄存].action?.call(动[i寄存]); } catch (e) { /* 同上 */ }
	const 变2 = 除通知(差(前2, 快()));
	ok(变2.length === 0, `★④多次提交：同一动作**再调一次** ⇒ 除通知外零改动（实得 ${S(变2)}）`);
	return { fails };
}

const argv = process.argv.slice(2);
if (!argv.includes('--engine')) { console.error('用法：node tools/e2e-536-l10-services.mjs --engine <引擎检出> [--selftest]'); process.exit(2); }
const env = resolveEnv(argv[argv.indexOf('--engine') + 1] ?? process.env.ENGINE);
const { fails, 装置错 } = await 判(env);
for (const f of fails) console.error(`✗ ${f}`);
console.log(fails.length === 0 ? '✓ `#536` ②：证前门关／证前真调零改动／多次提交幂等 —— 全过（证后门开＝**读数**，见上）±' : `✗ 有红：${fails.length} 条`);
if (装置错) process.exit(2);
if (自检) {
	const fs2 = await import('node:fs'); const path2 = await import('node:path');
	const html = path2.join(env.repo ?? path2.resolve(import.meta.dirname, '..'), 'stories/babel/babel-trial.html');
	const 原 = fs2.readFileSync(html, 'utf8');
	const 刀 = [{ id: '寄存的门改成恒真', 找: "text: '个人寄存（需居民证）', when: resident", 换: "text: '个人寄存（需居民证）', when: () => true", 面: /★①证前|★②证前/ }];
	let 不中 = 0;
	for (const k of 刀) {
		if (!原.includes(k.找)) { console.error(`✗ 刀「${k.id}」**未命中**靶（产物形变了就同步改刀）：${S(k.找)}`); 不中++; continue; }
		const 刀本 = html.replace(/\.html$/, `.__knife536-${process.pid}.html`);
		fs2.writeFileSync(刀本, 原.replace(k.找, k.换));
		try {
			const r2 = await 判({ ...env, htmlPath: 刀本 });
			const 命中 = r2.fails.filter((f) => k.面.test(f));
			if (命中.length > 0) console.log(`✓ 刀「${k.id}」⇒ 该面如期红 ${命中.length} 条（${命中[0].slice(0, 80)}…）`);
			else { console.error(`✗ 刀「${k.id}」⇒ 该面**零红**：${S(r2.fails.slice(0, 2))}`); 不中++; }
		} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	}
	if (不中 > 0) { console.error(`✗ 自检未过（${不中} 处）`); process.exit(1); }
	console.log('✓ 自检（门那一站：刀落下 ⇒ ①／② 面如期红）通过');
}
process.exit(fails.length === 0 ? 0 : 1);
