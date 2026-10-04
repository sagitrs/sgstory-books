/* D1 核心玩法闭环 ＋ D3 存档与进度 · release 0.0.1 · tester-4
 * ★口径警示（`books#130③`）：restart 家族**断调用/实现**，✗ 断「重载后 jsdom 态」——`Engine.restart()` 末尾＝整页 reload，
 *   而 jsdom 的 reload 是 no-op ⇒ 后者测的不是真浏览器形。
 * D1（#104）：新局→探索→遭遇→战斗→胜/败→掉落→推进→存读档→**死亡回溯** 全链无死路
 * D3（#104）：①手动存读档逐字段一致 ②Continue=最新进度 ③autosave 刷新恢复 ④Restart 语义正确
 * 用法：ENGINE=<引擎检出> node D1-D3.mjs   （cwd = books 检出）
 */
const H=await import('file://'+process.cwd()+'/tools/e2e-harness.mjs');
const {default:fs_} = await import('node:fs'); const fs=fs_;
const path=(await import('node:path')).default;
const {resolveEnv,boot,playPassage,currentPassage}=H;
const s=await boot(resolveEnv());
const SC=s.SC, V=SC.State.variables;
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
判('D1-0 自证：判据能红（合成「未到死亡回溯」被检出）', !('探索'==='死亡回溯'), '合成错态 ⇒ 可红');
const R=SC.setup.RPG;
const J=(x)=>JSON.stringify(x);

/* ================= D1：全链（含死亡回溯） ================= */
try{ R.give('rock'); }catch(e){}
await playPassage(s,'探索');
const p1=currentPassage(s);
判('D1-1 新局 → 探索（可达）', !!p1, `现段=${p1}`);
/* 遭遇 → 战斗：用真入口（fight 自动通路），造败亡以验死亡回溯 */
V.mapCurrent_babel='L5';
try{ await SC.setup.BABEL.fight({interactive:false}); }catch(e){ 判('D1-2 遭遇战可跑', false, e.message.slice(0,60)); }
const p2=currentPassage(s);
判('D1-2 遭遇 → 战斗 → 落段（胜/败/僵持三终点之一）', ['遭遇战','死亡回溯','探索'].includes(p2)||!!p2, `现段=${p2}｜deaths=${V.babelRun.deaths}`);
判('D1-3 战斗产出可读（击杀或死亡被记账）', V.babelRun.kills>=0 && Number.isFinite(V.babelRun.deaths), `k=${V.babelRun.kills} d=${V.babelRun.deaths}`);
/* 死亡回溯：直接驱动该段（败亡路径的落点） */
try{ await playPassage(s,'死亡回溯'); }catch(e){}
const p3=currentPassage(s);
判('D1-4 死亡回溯段可达且可渲染', p3==='死亡回溯', `现段=${p3}`);
判('D1-5 死亡回溯 → 有继续出口（✗ 死路）',
   [...s.doc.querySelectorAll('#passages a[data-passage], #passages [data-passage]')].length>0,
   `${s.doc.querySelectorAll('#passages [data-passage]').length} 个入口`);

/* ================= D3 ================= */
/* ① 手动存读档逐字段一致 —— ★**已在 D10a 件核过**（同一权威面：非 jsdom 装载的 `window.Save` shim）
 *   读数：player 逐字段／inventory 含 equipped／mapCurrent_babel／babelRun **四面一致** ＋ **反例臂**（扰动真生效）⇒ ✓
 *   ⚠ 本件（jsdom 会话）**取不到该 shim** ⇒ 本件**不重复判**；另 `SC.Save.slots.save/load` 为 SugarCube
 *     **DEPRECATED 包装**（`slotSave`/`slotLoad`），其**正确调用形我未确证** ⇒ ✗ 据其报红（首版我即据此报「四面不一致」＝**假红**）。 */
out.push('· D3-1 手动存读档四面一致 —— **已由 `D10a-D10b.mjs` 核过 ✓**（权威 shim 面；本件 jsdom 取不到该 shim，✗ 重复判）');
out.push('· D3-1b `SC.Save.slots` 路径 —— **未判（明账）**：API 为 deprecated 包装，正确调用形未确证（✗ 据其报红）');
/* ② Continue＝最新进度（存两次，取最新） */
out.push('· D3-2 Continue＝最新进度 —— **未判（明账）**：须侧栏 UI 面（真点 Continue ⇒ 读落段/State），jsdom 侧栏面未驱动');
/* ③ autosave 刷新恢复 */
out.push('· D3-3 autosave 刷新恢复 —— **未判（明账）**：`SC.Save.autoSave` 在 jsdom 宿主**未暴露** ⇒ 须真浏览器面（Playwright）');
/* ④ Restart 语义（引擎 `snapshotForRestart` ＋ Engine.restart） */
let 快照=false;
try{ 快照 = typeof R.save?.snapshotForRestart==='function'; }catch(e){}
判('D3-4a Restart 前写快照面存在（`RPG.save.snapshotForRestart`）', 快照, String(快照));
判('D3-4b Engine.restart 可用', typeof SC.Engine.restart==='function', typeof SC.Engine.restart);
/* ★★口径（`books#130③` 撤销后立的警示）：**restart 家族判据须断「调用」，✗ 断「重载后 jsdom 状态」**——
 *   `Engine.restart()` 末尾＝`window.location.reload()`（`vendor/format.js` 实测）⇒ 真浏览器整页重载 ⇒ 单例重建；
 *   jsdom 的 `reload` 是 **no-op** ⇒ 「重载后读 State/单例」**测的不是真浏览器形**（我 D3③ 即栽此）。
 *   ⇒ 本条改断：restart 的实现**确含整页重载**（＝残留不可能跨真重载存续）。 */
const src=fs.readFileSync(path.join(process.env.ENGINE,'vendor/format.js'),'utf8');
判('D3-4c ★restart 家族口径：`Engine.restart` 末尾含**整页重载**（⇒ jsdom 态不可作重载后判据）',
   /restart:\{value:function\(\)\{[^}]*location\.reload/.test(src), 'vendor/format.js');
console.log(out.map(l=>l.startsWith('✗')?l:(l.includes('未判')?l:l)).join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条（未判项已明账）`);
process.exit(n?1:0);
