/* E2 判据（`books#420`）· 已转正（`#624`，2026-10-19）· sagitrs-tester-3
 *
 * 口径：`#420` 票面四条（★本票前置是 E1 `#412` ＋ S1 `#395`，✗ 非 B1）。
 *   ① 证前仍可恢复/售货/再次出发；**证后服务可用**，消费和脆弱**不撤销**永久资格/历史任务事实。
 *   ② 返程遵循 `#395` 及 `#400` 政策：**旧损毁先于新附加**，**新脆弱同次保留**；取消/非法/重复**零错误消费**。
 *   ③ 七名河与普通远征都能接 **L10 正常循环**，真实槽位往返/旧卷轴兼容可核，**不把普通前进门当返城**。
 *   ④ 实现/测试合法合入（不属本档）。
 *
 * ★本档**已转正**（`#624`，2026-10-19）：口径是**红应为 0**（红 > 0 ⇒ `run-all.sh` `exit 1`）。红须**具名**。
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
/* ★`#634` 收紧（空壳即绿 ×3）：原形只验「任一非 null」⇒ 存根 `{x:1}` 也绿 ✗。⇒ 逐格判**实质面**。 */
判('E2-1 ★**居民证**是独立资格事实（✗ 与消费混一账）',
	(B?.居民证 != null && typeof B.居民证 === 'object' && B.居民证.独立于消费与脆弱 === true)
		|| (V()?.居民证 != null && typeof V().居民证 === 'object' && V().居民证.独立于消费与脆弱 === true),
	`B.居民证键=${B?.居民证 ? JSON.stringify(Object.keys(B.居民证)) : '（无）'}｜V().居民证=${V()?.居民证 == null ? '（无）' : JSON.stringify(Object.keys(V().居民证))}（须含「独立于消费与脆弱: true」）`);
判('E2-2 ★**脆弱**是独立物品/状态面（✗ 只在文案里）',
	(B?.脆弱 != null && typeof B.脆弱 === 'object' && (typeof B.脆弱.是 === 'function' || typeof B.脆弱.键 === 'function'))
		|| (R?.脆弱 != null && typeof R.脆弱 === 'object' && (typeof R.脆弱.是 === 'function' || typeof R.脆弱.键 === 'function')),
	`B.脆弱键=${B?.脆弱 ? JSON.stringify(Object.keys(B.脆弱)) : '（无）'}｜typeof B.脆弱.是=${typeof B?.脆弱?.是}（须可调用）`);
判('E2-3 ★**资源收购**入口在册（票面①「证后服务可用」）',
	typeof B?.收购?.卖 === 'function' || typeof B?.服务?.开 === 'function',
	`B.收购键=${B?.收购 ? JSON.stringify(Object.keys(B.收购)) : '（无）'}｜typeof 收购.卖=${typeof B?.收购?.卖}｜typeof 服务.开=${typeof B?.服务?.开}（须可调用）`);

/* ── ② 返程政策：旧损毁**先于**新附加（票面②）── */
const 返程 = B?.返程 ?? R?.返程 ?? null;
/* ★`#632` 收紧（OR 一翼撑绿）：原形 `顺序!=null || 旧损毁先===true` 是 **OR** ⇒ 只翻一翼
 *   （顺序声明仍在、`旧损毁先:false`）时顺序那一翼**仍撑绿** ✗ ⇒ 改 **AND**（同族形）。 */
判('E2-4 ★返程有**顺序**声明：旧损毁**先于**新附加（票面②）',
	返程 != null && typeof 返程 === 'object' && 返程.顺序 != null && 返程.旧损毁先 === true,
	返程 ? JSON.stringify(返程).slice(0, 130) : '（返程未声明）');

/* ── ③ 普通前进门 **✗ 当返城**（票面③）── */
const 门 = B?.门 ?? null;
判('E2-5 ★**普通前进门**与**返城**分开（✗ 一门两用）',
	门 == null ? false : (门.前进 !== 门.返城),
	门 ? `前进=${String(门.前进)}｜返城=${String(门.返城)}` : '（门未声明）');

/* ── ④ 旧卷轴兼容（票面③「旧卷轴兼容可核」）── */
/* ★`#634` 收紧（空壳即绿）：原形只验「任一非 null」⇒ 存根 `{x:1}` 也绿 ✗。⇒ 现须判**声明的实值**。 */
判('E2-6 ★**旧卷轴**兼容面在册（区分现付费卷轴与新政策适用层段）',
	(B?.卷轴 != null && typeof B.卷轴 === 'object' && typeof B.卷轴.现付费 === 'string' && B.卷轴.现付费.trim() !== '')
		|| (B?.旧卷轴 != null && typeof B.旧卷轴 === 'object' && typeof B.旧卷轴.码 === 'string' && B.旧卷轴.码.trim() !== ''),
	`B.卷轴键=${B?.卷轴 ? JSON.stringify(Object.keys(B.卷轴)) : '（无）'}｜B.旧卷轴键=${B?.旧卷轴 ? JSON.stringify(Object.keys(B.旧卷轴)) : '（无）'}（须含非空串值）`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ E2 失败 ${红} 条（${红 ? '★判据红：已转正 ⇒ 红应为 0，逐条具名见上' : '全过'}）`);
process.exit(红 ? 1 : 0);
