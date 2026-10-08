/* 巴别之井 · 真 DOM 臂（`books#280` ⑨：治疗反馈「HP X → Y」＋ 页脚 HP 面板随用刷新）
 *
 * ## 断什么（三路同口径 —— 票面 ⑨ 的验收）
 *   ① 战斗内·**页脚背包**提交（`ui/bag.js` 的 `.rpg-bag-submit` ⇒ `RPG.submitBattleAction`）｜
 *   ② 背包**战外**使用（`.rpg-item-link`）｜③ 背包**战中提交**（`sgstory#2003` 的引擎口）
 *   每路各断两件：
 *     · **【文本】** 使用反馈里出现 `HP X → Y`，且 X/Y 是**真值**（−10 起 ⇒ +5）；
 *     · **【页脚】** `.statusbar [data-panel="hp"]` 的 DOM 文本**由 X 变成 Y**（✗ 只断「函数被调过」——
 *       那是装置级读数；本档要的是**页脚真变**）。
 *
 * ★★**臂 ① 的形已随 `books#280` ⑩ 更正**（`books#517` 的定因，`dev-10` 2026-10-08）：
 *   本臂**原形**点的是**战斗选单里的 `quick:` 项**；而 ⑩「战斗菜单只留战斗行动（道具收敛到
 *   **页脚背包一处**）」之后，选单里**没有** `quick:` 项 ⇒ 老形回落 `opts[0]`＝**空手打击**
 *   ⇒ 0 治疗 ⇒ 【文本】【页脚】两条**恒红**（✗ 产品缺陷；同一根因也是 `#364` 那次「臂① 两红」）。
 *   ⇒ 现形改点**战中的页脚背包可点件**（⑮「战中的页脚背包须可提交」那条**真实玩家路**）✓。
 *
 * ## 为什么三路都要断（而不是只断一路）
 *   三路最终都走引擎的 `RPG.act` ⇒ 都发 `item:used`（勘察结论，见 `#280` ⑨ 的落点锚评论）——
 *   但「同一个钩子覆盖三路」是**设计主张**，主张就要三路各证一次：任一路若绕开 `act`（将来有人
 *   在故事侧手搓效果），这一路会红，而只断一路的判据会**照旧绿**。
 *
 * ## 用法与退出码
 *   （先构建产物：`python3 <引擎>/build.py "$PWD/stories/babel" --out "$PWD/stories/babel/babel-trial.html"`）
 *     node tools/e2e-280-heal-feedback.mjs --engine <引擎检出>              # 三路（引擎无提交口 ⇒ ③ 明印「待判」）
 *     node tools/e2e-280-heal-feedback.mjs --engine <引擎检出> --selftest   # 双刀：拆反馈 ⇒【文本】红；拆刷新 ⇒【页脚】红
 *   退出码：0 全过；1 有红；2 用法/环境错（引擎根不对、产物缺、jsdom 不可得）。
 *
 * ## 刀的口径（✗ 与「rc」混为一谈）
 *   两条刀都打在**产物文本**上（✗ 改源码：改了不重建 ⇒ 刀没落在被测物上，本舰队栽过两次），
 *   且**各须红在自己那一面**：【文本】刀只许【文本】红、【页脚】刀只许【页脚】红。
 */

import process from 'node:process';
import { resolveEnv, boot } from './e2e-harness.mjs';

const 自检 = process.argv.includes('--selftest');
const S = (x) => JSON.stringify(x);

/** 一路一臂：备好状态（HP −10、一支绷带）⇒ 跑那一路 ⇒ 断【文本】与【页脚】。 */
async function 判(env) {
	const fails = [];
	const ok = (c, m) => { if (!c) fails.push(m); };
	const s = await boot(env);
	const SC = s.SC, R = SC.setup.RPG, D = SC.setup.DND3;

	const 读 = (id) => (s.doc.querySelector(`.statusbar [data-panel="${id}"]`)?.textContent ?? '').trim();
	const 行文 = () => [...s.doc.querySelectorAll('#passages p')].map((p) => p.textContent).join('\n');
	/** 备一局：一支绷带（2 次）、HP 距满 10、并让故事侧记下「玩家看到的 HP」。 */
	const 备 = async () => {
		SC.State.variables.inventory = [{ id: 'bandage', charges: 2 }];
		D.Player.hp = D.Player.maxHp - 10;
		D.Player.nonlethal = 0;
		SC.setup.BABEL?.记血?.();
		/* ⚠ **装置**：面板是上一段渲染时填的 —— 换完背包要**再刷一次**，否则 DOM 里根本没有那支绷带的链
		 *   （本席首跑即栽在此：断的是「装置没摆好」，✗ 产品缺陷）。 */
		R.refreshPanels();
		await new Promise((r) => setTimeout(r, 20));
		return D.Player.hp;
	};
	const 断一路 = (名, 血前, 取末行 = false) => {
		const 文 = 行文();
		const 全 = [...文.matchAll(/HP (\d+) → (\d+)/g)];
		const m = 取末行 ? 全[全.length - 1] : 全[0];
		ok(!!m, `★【文本】${名}：使用反馈里没有「HP X → Y」（段落文本尾部：${S(文.slice(-140))}）`);
		if (m) {
			ok(Number(m[1]) === 血前 && Number(m[2]) === 血前 + 5,
				`★【文本】${名}：反馈里的数字不对（读到 ${m[1]} → ${m[2]}，应 ${血前} → ${血前 + 5}）`);
		}
		const 真血 = D.Player.hp;
		ok(真血 === 血前 + 5, `★【文本】${名}：治疗没真生效（主角 HP ${血前} ⇒ ${真血}）`);
		const 面板 = 读('hp');
		ok(面板.includes(String(血前 + 5)),
			`★【页脚】${名}：HP 面板**没有随用刷新**（面板文本 ${S(面板)}，应含 ${血前 + 5}）—— ✗ 等段落重渲`);
	};
	const 造敌 = () => new (R.Character)({ name: '装置靶', hp: 1, maxHp: 1, stats: { dmg: '0', atkBonus: 0 } });

	/* ── 臂 ② 战外：走引擎那条点击口（状态栏／背包视图的 `.rpg-item-link` 走的就是它）── */
	{
		const 血前 = await 备();
		const 链 = s.doc.querySelector('.statusbar [data-panel="inventory"] a.rpg-item-link[data-item="bandage"]')
			?? s.doc.querySelector('a.rpg-item-link[data-item="bandage"]');
		ok(!!链, '★【装置】DOM 里找不到绷带的 `.rpg-item-link`（状态栏背包面没渲染？）');
		if (链) { 链.click(); await new Promise((r) => setTimeout(r, 30)); 断一路('战外使用', 血前); }
	}

	/* ── 臂 ① 战斗内：**页脚背包**那条真实入口（`books#280` ⑩／⑮ 之后的形）──────────────
	 *   ★装置陈旧定因（`books#517`；`dev-10` 2026-10-08）：老形点**战斗选单的 `quick:` 项**，
	 *     而 ⑩ 之后选单里**没有**该项 ⇒ 回落 `opts[0]`＝空手打击 ⇒ 两红恒红（✗ 产品）。
	 *   ⇒ 改点 `ui/bag.js` 的 `.rpg-bag-submit`（⇒ `RPG.submitBattleAction` ⇒ **本回合行动**）。
	 *   ⚠ 战中态按 `跑一场()／fight()` 的**同形**置（`setup.BABEL.战中 = true` ＋ `refreshPanels()`）——
	 *     否则 `ui/bag.js` 的能力门不放行 ⇒ 渲染不出可点件 ⇒ 本臂取不到样本。 */
	{
		const 血前 = await 备();
		const 原 = D.Player.choice, 原战 = SC.setup.BABEL?.战中;
		const 悬 = [];
		SC.setup.BABEL.战中 = true;
		R.refreshPanels();
		D.Player.choice = () => new Promise((res) => { 悬.push(() => res('skip')); });
		try {
			const p = new (R.Battle)(1, [D.Player], [造敌()], true).execute();
			await new Promise((r) => setTimeout(r, 0));                 // 让循环跑到「等玩家」那一问
			const 链 = s.doc.querySelector('.rpg-bag-submit[data-bag-submit="bandage"]');
			ok(!!链, '★【装置】战中页脚背包里找不到绷带的可点件（`.rpg-bag-submit`）——⑩／⑮ 之后那条真实入口');
			链?.click();                                                // ★唯一动作：页脚背包那一按
			await Promise.race([p, new Promise((r) => setTimeout(() => { 悬.forEach((f) => f()); r(); }, 2000))]);
		} finally {
			if (原 === undefined) delete D.Player.choice; else D.Player.choice = 原;
			if (原战 === undefined) delete SC.setup.BABEL.战中; else SC.setup.BABEL.战中 = 原战;
		}
		await new Promise((r) => setTimeout(r, 30));
		断一路('战中·页脚背包', 血前);
	}

	/* ── 臂 ③ 战中提交：`RPG.submitBattleAction` ⇒ 战斗循环取作本回合行动（`sgstory#2003`）── */
	if (typeof R.submitBattleAction === 'function') {
		const 血前 = await 备();
		const 原 = D.Player.choice;
		const 悬 = [];
		D.Player.choice = () => new Promise((res) => { 悬.push(() => res('skip')); });
		try {
			const p = new (R.Battle)(1, [D.Player], [造敌()], true).execute();
			await new Promise((r) => setTimeout(r, 0));                 // 让循环跑到「等玩家」那一问
			const r = R.submitBattleAction({ item: 'bandage' });
			ok(r?.ok === true, `★【装置】战中提交被拒：${S(r)}`);
			await Promise.race([p, new Promise((r2) => setTimeout(() => { 悬.forEach((f) => f()); r2(); }, 2000))]);
		} finally { if (原 === undefined) delete D.Player.choice; else D.Player.choice = 原; }
		await new Promise((r) => setTimeout(r, 30));
		断一路('战中提交', 血前);
	} else {
		console.log('  【待判】战中提交那一路：引擎还没有 `RPG.submitBattleAction`（抬 pin 后自动真判）');
	}

	return { fails };
}

/* ── 起手：**产物与本引擎树的关系**（★`books#280` ⑩ 顺手项 ②）────────────────────────────
 *   动因：一个真撞过的坑 —— **pin 产物跑新树** ⇒ 读出来的是「假待判」（引擎明明有这个口，产物里没有）。
 *   本档一律先印三行（引擎树 ＋ HEAD 短 sha ＋ 产物 sha256），并**当产物带版本戳且与树不符 ⇒ rc=2 装置错**：
 *     · 版本戳＝产物里 `$buildVersion` 的值（`build.py --version` 注入；缺省 `—` ⇒ **未标** ⇒ 不判、只提示）；
 *     · 树 HEAD 取不到（不是 git 树、或没装 git）⇒ 也**不判**（✗ 别把「读不到」报成「不一致」）。
 */
const env = resolveEnv(process.argv[process.argv.indexOf('--engine') + 1]);
{
	const fs0 = await import('node:fs');
	const { createHash } = await import('node:crypto');
	const { execFileSync } = await import('node:child_process');
	const html0 = env.htmlPath ?? (await import('node:path')).join(env.repo ?? '.', 'stories/babel/babel-trial.html');
	let 产物sha = null, 戳 = null, 树sha = null;
	try {
		const buf = fs0.readFileSync(html0);
		产物sha = createHash('sha256').update(buf).digest('hex').slice(0, 16);
		const m = buf.toString('utf8').match(/\$buildVersion to "([^"]*)"/);
		戳 = m ? m[1] : null;
	} catch { /* 产物缺 ⇒ 后面的 boot 会具名报出（rc=2） */ }
	try { 树sha = execFileSync('git', ['-C', env.root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { 树sha = null; }
	console.log(`产物：${html0}`);
	console.log(`  构建引擎树：${env.root}${树sha ? `（HEAD ${树sha}）` : '（HEAD 读不到 —— 非 git 树？）'}`);
	console.log(`  产物 sha256[前16]：${产物sha ?? '（读不到）'}｜产物里的版本戳：${戳 ?? '（读不到）'}`);
	const 是sha = typeof 戳 === 'string' && /^[0-9a-f]{7,40}$/.test(戳);
	if (是sha && 树sha && !(树sha.startsWith(戳) || 戳.startsWith(树sha))) {
		console.error(`✗ **装置错（rc=2）**：产物是 **${戳}** 那棵树建的，而本轮给的是 **${树sha}** ——`
			+ '「pin 产物跑新树」会读出**假待判**（引擎有没有那个口，得量本轮这棵树）。'
			+ ' ⇒ 先按本树重烘产物再跑。');
		process.exit(2);
	}
	if (!是sha) console.log('  （产物未标版本 ⇒ 引擎一致性**未核**；CI 的构建步会带 `--version`，本地重烘也建议带上。）');
}
const { fails } = await 判(env);
for (const f of fails) console.error(`✗ ${f}`);
console.log(fails.length === 0 ? '✓ 三路（文本 ＋ 页脚真变）全过'
	: `✗ 有红：${fails.length} 条`);

/* ── 自检（双刀）：打在**产物文本**上，各须红在自己那一面 ── */
if (自检) {
	const fs2 = await import('node:fs');
	const path2 = await import('node:path');
	const html = path2.join(env.repo ?? path2.resolve(import.meta.dirname, '..'), 'stories/babel/babel-trial.html');
	const 原 = fs2.readFileSync(html, 'utf8');
	const 刀 = [
		{ id: '拆掉反馈打印', 找: 'if (前 != null && 后 > 前) RPG.perform(', 换: 'if (false) RPG.perform(', 面: /【文本】/ },
		{ id: '拆掉页脚就地刷', 找: "RPG.refreshPanels(['hp'])", 换: 'void 0', 面: /【页脚】/ },
	];
	let 不中 = 0;
	for (const k of 刀) {
		if (!原.includes(k.找)) {
			console.error(`✗ 刀「${k.id}」替换**未命中**（产物里找不到靶：${S(k.找)}）⇒ 刀没落在被测物上（产物形变了就同步改刀）`);
			不中++; continue;
		}
		const 刀本 = html.replace(/\.html$/, `.__knife-${process.pid}-${不中}.html`);
		fs2.writeFileSync(刀本, 原.replace(k.找, k.换));
		try {
			const r2 = await 判({ ...env, htmlPath: 刀本 });
			const 命中 = r2.fails.filter((f) => k.面.test(f));
			const 他面 = r2.fails.filter((f) => !k.面.test(f));
			if (命中.length > 0) console.log(`✓ 刀「${k.id}」⇒ 该面**如期红** ${命中.length} 条（${命中[0].slice(0, 56)}…）${他面.length ? `｜他面也红 ${他面.length} 条（查是否顺带）` : ''}`);
			else { console.error(`✗ 刀「${k.id}」⇒ **该面零红**（没咬住）：${S(r2.fails.slice(0, 2))}`); 不中++; }
		} finally { try { fs2.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
	}
	if (不中 > 0) { console.error(`✗ 自检未全过（${不中} 处）`); process.exit(1); }
	console.log('✓ 自检（双刀：文本面／页脚面各咬住一次）通过');
}
process.exit(fails.length === 0 ? 0 : 1);
