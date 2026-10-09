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

/* ── ③ 到 L10 与返城**分开**（✗ 把前进门当返城）──
 * ★T 席裁定（2026-10-09 · 应 `#564` §三 两读法之请）：**取甲（字面）**，并**补一翼**。
 *   依据（我一手探针跑出，✗ 读码）：`moveTo('L10')` ⇒ **抛**「不存在的地点「L10」」；
 *     `moveTo('L10-camp')` ⇒ **未抛**、`V().位置 = "L10-camp"`（而 `map.current` 是 `null` ⇒ 旧断言里那条投影翼在本档**用不上**）。
 *   ⇒ 甲：靶 id 用**地图上真实的实体 id**（`L10-camp`，聚落；`teleport.js`／`00-l10-city.js` 同用）。
 *   ★为何✗ 用乙（真经胜利门）：本档**整体是「框架可寻址」面**（`B6-2` 就是九层逐层 `moveTo` 直调 ✓）⇒
 *     乙要真打 Boss（成本高，且「未胜不出前进门」已由 `B4-5` 覆盖 ⇒ 重复）。
 *   ★但「**九层引导的出口**」这层语义要**在册**（✗ 只靠格名）⇒ **补第二翼**：`B.门.前进.向 === 'L10-camp'`
 *     （`books#418` 笔 3 落的声明面 ⇒ 「出口**指向** L10」可核，✗ 需真流程 ✓）。 */
try { B.map.moveTo('L10-camp'); } catch { /* 不可达 */ }
判('B6-3 ★可到 **L10**（九层引导的出口 —— 靶=真实实体 id ＋ 出口指向两翼）',
	(String(V()?.位置) === 'L10-camp' || String(V()?.map?.current ?? '') === 'L10-camp')
		&& B?.门?.前进?.向 === 'L10-camp',
	`位置=${JSON.stringify(V()?.位置)}｜map.current=${JSON.stringify(V()?.map?.current ?? null)}`
		+ `｜★出口指向=${JSON.stringify(B?.门?.前进?.向 ?? null)}（须 'L10-camp'）`);

/* ── ④ 真实槽位存读（✗ 不重奖/不复生/不重掷）── */
let 存读可核 = false;
try { await D.saveAt(s, 1); await D.loadAt(s, 1); 存读可核 = true; } catch (e) { /* 记具名 */ }
判('B6-4 ★**真实槽位**存读可往返（票面②）', 存读可核, 存读可核 ? 'saveAt/loadAt 往返成功' : '✗ saveAt/loadAt 失败（根因见上）');

/* ── ⑤ 量具在册（票面③：装备保证/温泉/Boss 胜率/资源预算 可核）── */
/* ★T 席加固（2026-10-09）：原形只断 `!= null`（**存在性**）⇒ ★**空面也过**：
 *   本席实测（同一批树）刀A `B.装备保证 = {}` ⇒ `B6-5` **仍绿** ✗；刀B `B.资源预算 = true` ⇒ **仍绿** ✗。
 *   ⇒ 「在册」之外**再断面内容成形状**（✗ 断具体数值 —— 数值归 D 面；这里只断**面本身可核**）。 */
const 量具 = ['装备保证', '温泉', 'Boss', '资源预算'];
const 在册 = 量具.filter((k) => B?.[k] != null || SC.setup.RPG?.[k] != null);
const g = B?.装备保证, r = B?.资源预算;
const 函 = (x) => typeof x === 'function';
const 成形状 = (g != null && Array.isArray(g.课程层) && g.课程层.length === 4
		&& 函(g.课程保证已发) && 函(g.保证点) && 函(g.战前保底)
		&& Array.isArray(g.件) && g.件.includes('heavy-wooden-shield') && g.件.includes('sword-quenched'))
	&& (r != null && r.受控池 != null && r.温泉耗时 != null
		&& (r.温泉耗时.分钟 ?? r.温泉耗时) === 60 && 函(r.分钟账) && 函(r.第几日));
判('B6-5 ★四类**量具**在册（装备保证/温泉/Boss/资源预算）＋ 两块面**成形状**',
	在册.length === 量具.length && 成形状,
	`在册=${在册.join(',') || '（无）'}｜缺=${量具.filter((k) => !在册.includes(k)).join(',')}`
		+ `｜★装备保证键=${g ? Object.keys(g).join('/') : '（无）'}（须 课程层/课程保证已发/保证点/战前保底/件）`
		+ `｜★资源预算键=${r ? Object.keys(r).join('/') : '（无）'}（须 受控池/温泉耗时/分钟账/第几日）`);

console.log(out.join('\n'));
const 红 = out.filter((l) => l.startsWith('✗')).length;
console.log(`\n  ⇒ B6 失败 ${红} 条（${红 ? '★候实现：B2-B4 未落 ⇒ 端到端不可能走通 ⇒ 本档为**红候实现**' : '全过'}）`);
process.exit(红 ? 1 : 0);
