/* E2 判据（`books#420`）· 候实现红测 · sagitrs-tester-3
 *
 * 口径：`#420` 票面四条（★本票前置是 E1 `#412` ＋ S1 `#395`，✗ 非 B1）。
 *   ① 证前仍可恢复/售货/再次出发；**证后服务可用**，消费和脆弱**不撤销**永久资格/历史任务事实。
 *   ② 返程遵循 `#395` 及 `#400` 政策：**旧损毁先于新附加**，**新脆弱同次保留**；取消/非法/重复**零错误消费**。
 *   ③ 七名河与普通远征都能接 **L10 正常循环**，真实槽位往返/旧卷轴兼容可核，**不把普通前进门当返城**。
 *   ④ 实现/测试合法合入（不属本档）。
 *
 * ★本档现在应当是红的（E2 未落）。红须**具名**。
 * 用法：ENGINE=<引擎检出> node tests/b-series/E2-return-city.mjs
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
import fs from 'node:fs';
const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const s = await H.boot(H.resolveEnv());
const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, V = () => SC.State.variables;

/* ── ① 居民证 / 脆弱 / 收购 三面在册 ── */
判('E2-1 ★**居民证**是独立资格事实（✗ 与消费混一账）',
	(B?.居民证 ?? null) != null || (V()?.居民证 ?? null) != null,
	`B.居民证=${JSON.stringify(B?.居民证 ?? null).slice(0,60)}｜V().居民证=${JSON.stringify(V()?.居民证 ?? null).slice(0,60)}`);
判('E2-2 ★**脆弱**是独立物品/状态面（✗ 只在文案里）',
	(B?.脆弱 ?? null) != null || (R?.脆弱 ?? null) != null,
	`B.脆弱=${JSON.stringify(B?.脆弱 ?? null).slice(0,60)}｜R.脆弱=${JSON.stringify(R?.脆弱 ?? null).slice(0,60)}`);
判('E2-3 ★**资源收购**入口在册（票面①「证后服务可用」）',
	(B?.收购 ?? null) != null || (B?.服务 ?? null) != null,
	`B.收购=${JSON.stringify(B?.收购 ?? null).slice(0,60)}｜B.服务=${JSON.stringify(B?.服务 ?? null).slice(0,60)}`);

/* ── ② 返程政策：旧损毁**先于**新附加（票面②）── */
const 返程 = B?.返程 ?? R?.返程 ?? null;
判('E2-4 ★返程有**顺序**声明：旧损毁**先于**新附加（票面②）',
	返程 != null && typeof 返程 === 'object' && (返程.顺序 != null || 返程.旧损毁先 === true),
	返程 ? JSON.stringify(返程).slice(0, 130) : '（返程未声明）');

/* ── ③ 普通前进门 **✗ 当返城**（票面③）── */
const 门 = B?.门 ?? null;
判('E2-5 ★**普通前进门**与**返城**分开（✗ 一门两用）',
	门 == null ? false : (门.前进 !== 门.返城),
	门 ? `前进=${String(门.前进)}｜返城=${String(门.返城)}` : '（门未声明）');

/* ── ④ 旧卷轴兼容（票面③「旧卷轴兼容可核」）── */
判('E2-6 ★**旧卷轴**兼容面在册（区分现付费卷轴与新政策适用层段）',
	(B?.卷轴 ?? null) != null || (B?.旧卷轴 ?? null) != null,
	`B.卷轴=${JSON.stringify(B?.卷轴 ?? null).slice(0,60)}｜B.旧卷轴=${JSON.stringify(B?.旧卷轴 ?? null).slice(0,60)}`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ E2 失败 ${红} 条（${红 ? '★候实现：E2 交付未落 ⇒ 本档为**红候实现**' : '全过'}）`);
process.exit(红 ? 1 : 0);
