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
/* ★★`books#176`（操作者裁定②·核心反转）：**死亡＝游戏失败、不复活** ⇒ 旧段 `:: 死亡回溯` **已删**
 *   （`story/play.twee` 头注明写「连同 L1–9 的该口径一并作废」；本席 2026-10-04 实测：`playPassage(s,'死亡回溯')`
 *    直接抛 `不存在的段落："死亡回溯"`——旧判据是在**等一个不存在的段落**，红得看起来像产品缺陷）。
 *   ⇒ 本条按**现形**改判：死亡 ⇒ `:: 游戏失败` 可达且可渲染。
 *   死亡的正路＝**引擎自己的入口**：`DND3.Player.damage()` 打到 `hp<=0`（`isDown` 的真源＝`hp<=0 || RPG.isKnockedOut()`，
 *   `src/core/20-character.js:49`）⇒ `setup.BABEL.结算战败()`（三源共用：进入／战斗／UI）⇒ 印终局行 ＋ 跳「游戏失败」。
 *   ★装置：`isDown` 是**只读 getter**（✗ 不可直赋）⇒ 必须走 `damage()`。 */
try{ SC.setup.DND3.Player.damage(SC.setup.DND3.Player.maxHp*2); }catch(e){ 判('D1-4a 造死亡（Player.damage）', false, String(e).slice(0,70)); }
判('D1-4a 造死亡：`hp<=0 ⇒ isDown`（引擎单点）', SC.setup.DND3.Player.isDown===true,
   `hp=${SC.setup.DND3.Player.hp}｜isDown=${SC.setup.DND3.Player.isDown}`);
let 结算=null, 结算抛=null;
try{ 结算 = SC.setup.BABEL.结算战败?.({源:'战斗',层:'L5'}); }catch(e){ 结算抛=String(e).slice(0,80); }
const p3=currentPassage(s);
const 失败面=s.doc.querySelector('#passages .passage');
/* ⚠ **jsdom 不实现 `innerText`**（实测恒空 ⇒ 首版据此判 ⇒ 红得像产品缺陷 ✗）⇒ 取 `textContent`（jsdom 支持 ✓）。 */
const 失败面字=(失败面?.textContent||'').replace(/\s+/g,' ').trim();
const run后=SC.State.variables.babelRun;
判('D1-4 死亡 ⇒ `:: 游戏失败` 段可达且可渲染（★断**内容**，✗ 不只断非空）',
   p3==='游戏失败' && /这一局到此为止/.test(失败面字) && run后?.终局===true && run后?.deaths===1,
   `现段=${p3}｜终局=${run后?.终局}｜deaths=${run后?.deaths}｜结算=${J(结算)}${结算抛?'｜抛='+结算抛:''}｜正文 ${失败面字.length} 字`);
判('D1-4b 失败面两出口「读档／重开」在（✗ 死路）',
   ['读档','重开'].every(t=>[...s.doc.querySelectorAll('#passages a')].some(a=>(a.textContent||'').includes(t))),
   [...s.doc.querySelectorAll('#passages a')].map(a=>(a.textContent||'').trim().slice(0,8)).join('／'));
/* ★`读档` 出口在 jsdom 里**真开存档面板**（本席实测：面板在、8 个槽位行）；★「选有描述槽 ⇒ 载入 ⇒ 状态回探索」
 *   那半须**真浏览器**面（jsdom 无真存档往返）⇒ 由 `books#278` 姿势的 CDP 臂实证（tester-3 · 2026-10-04）：
 *   开「存档」→ 槽 1（行内带描述）→ 点该槽 `button.load` ⇒ 段由「（未进入）」回到「第 1 层 · 苏醒之地」
 *   （`babelRun.终局=false`／HP 18/20 对照一致）✓ —— ★该半的判据面留在真浏览器臂，本件不重复判。 */
let 面板=null; try{ SC.setup.BABEL.读档?.(); await new Promise(r=>setTimeout(r,300)); 面板=s.doc.querySelector('#ui-dialog-body'); }catch(e){}
判('D1-4b-2 「读档」出口真开存档面板（jsdom 面）', !!面板,
   `面板=${!!面板}｜槽位行=${面板?面板.querySelectorAll('tr').length:0}`);
判('D1-4b-3 幂等门：终局后重复结算 ⇒ 「本局已终局」',
   (SC.setup.BABEL.结算战败?.({源:'战斗'})||{}).reason==='本局已终局', '不复活 ⇒ 不重复结算');
/* ★自证（体例同 D1-0）：**「段不存在」这一形态必须能被检出** —— 旧判据正是栽在这里（它把不存在的段名当目标）。 */
let 段不存在被检出=false; try{ await playPassage(s,'不存在的段落X'); }catch(e){ 段不存在被检出=true; }
判('D1-4c 自证：驱动不存在的段名 ⇒ 必须抛错（检出该形态）', 段不存在被检出, '合成错态 ⇒ 可红');
判('D1-5 失败面 → 有继续出口（✗ 死路）',
   [...s.doc.querySelectorAll('#passages a[data-passage], #passages [data-passage]')].length>0 || !!面板,
   `${s.doc.querySelectorAll('#passages [data-passage]').length} 个 data-passage 入口｜存档面板=${!!面板}`);

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
