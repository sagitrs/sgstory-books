/* B6 判据（`books#425`）· 候实现红测 · sagitrs-tester-3  ｜ ★联合收口票
 *
 * 口径：`#425` 票面四条 ＋ B1 冻结的九层目标。
 *   ① **正常流程完整走通，不用测试模式跳过地图/课程/出口**；每批迁移先回归再总收口。
 *   ② **真实槽位**跨层/事件/准备区往返及旧档通过；**不重奖、不复生、不重掷**。
 *   ③ 装备保证、温泉恢复、Boss 胜率及资源预算使用**可核量具**；L1～9/L10/L19 与面板红账有明确结果。
 *   ④ 实现/测试合法合入（不属本档）。
 *   ★票面注：**测试从 B2 开始**，终票只是联合收口；不把最后验收都压在功能完成后。
 *
 * ★本档现在应当是红的（B2-B4 未落 ⇒ 端到端不可能走通）。红须**具名**。
 * 用法：ENGINE=<引擎检出> node tests/b-series/B6-newrun-to-l10.mjs
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
const D = await import('file://' + process.cwd() + '/tools/e2e-drive.mjs');
import fs from 'node:fs';
const out = [];
const 判 = (n, ok, note) => out.push(`${ok ? '✓' : '✗'} ${n}${note ? '   ← ' + note : ''}`);
const art = 'stories/babel/babel-trial.html';
const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : 0);
const s = await H.boot(H.resolveEnv());
const SC = s.SC, B = SC.setup.BABEL, V = () => SC.State.variables;

/* ── ① 正常新局入口（✗ 测试模式）── */
判('B6-1 ★从**正常新局入口**起（✗ 测试模式/直赋态）',
	SC.State.passage != null && !(V().测试模式 === true),
	`passage=${JSON.stringify(SC.State.passage)}｜测试模式=${String(V().测试模式)}`);

/* ── ② 九层框架**端到端可寻址**（逐层 moveTo 并读回）── */
const 层 = ['L1','L2','L3','L4','L5','L6','L7','L8','L9'];
const 通 = [];
for (const L of 层) { try { B.map.moveTo(L); 通.push(L); } catch { /* 该层不可达 */ } }
判('B6-2 ★九层**端到端可寻址**（L1…L9 逐层进得去）',
	通.length === 层.length, `实达 ${通.length}/${层.length}｜达=${通.join(',') || '（无）'}`);

/* ── ③ 到 L10 与返城**分开**（✗ 把前进门当返城）── */
try { B.map.moveTo('L10'); } catch { /* 不可达 */ }
判('B6-3 ★可到 **L10**（九层引导的出口）',
	String(V()?.位置) === 'L10' || String(V()?.map?.current ?? '') === 'L10',
	`位置=${JSON.stringify(V()?.位置)}｜map.current=${JSON.stringify(V()?.map?.current ?? null)}`);

/* ── ④ 真实槽位存读（✗ 不重奖/不复生/不重掷）── */
let 存读可核 = false;
try { await D.saveAt(s, 1); await D.loadAt(s, 1); 存读可核 = true; } catch (e) { /* 记具名 */ }
判('B6-4 ★**真实槽位**存读可往返（票面②）', 存读可核, 存读可核 ? 'saveAt/loadAt 往返成功' : '✗ saveAt/loadAt 失败（根因见上）');

/* ── ⑤ 量具在册（票面③：装备保证/温泉/Boss 胜率/资源预算 可核）── */
const 量具 = ['装备保证', '温泉', 'Boss', '资源预算'];
const 在册 = 量具.filter((k) => B?.[k] != null || SC.setup.RPG?.[k] != null);
判('B6-5 ★四类**量具**在册（装备保证/温泉/Boss/资源预算）',
	在册.length === 量具.length, `在册=${在册.join(',') || '（无）'}｜缺=${量具.filter((k) => !在册.includes(k)).join(',')}`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B6 失败 ${红} 条（${红 ? '★候实现：B2-B4 未落 ⇒ 端到端不可能走通 ⇒ 本档为**红候实现**' : '全过'}）`);
process.exit(红 ? 1 : 0);
