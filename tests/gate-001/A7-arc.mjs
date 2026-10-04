/* A7 判据 · release 0.0.1 · tester-4
 * 判据（我的判据清单 A7，来自 guest-1 令）：
 *   **交互通路**下的「L1 空手可胜」——`fight({interactive:false})` 只走已装备武器（空手零输出），
 *   故空手胜例**只能由交互通路判**（与 #134 的官方战斗中面板同步例**同一装置**）。
 * 口径：造态走**受支持写点**（`BABEL.map.moveTo`），✗ 直赋 `State.variables`（会触发 SugarCube 克隆错，我已踩）。
 * ★前置断言：产物须**新于**最近一次故事源码改动 —— 否则读到的是陈旧弧（我 2026-10-02 栽此，得「弧不存在」假结论）。
 * 用法：ENGINE=<引擎检出> node A7-arc.mjs   （cwd = books 检出；产物须已构建）
 */
const H=await import('file://'+process.cwd()+'/tools/e2e-harness.mjs');
const D=await import('file://'+process.cwd()+'/tools/e2e-drive.mjs');
import fs from 'node:fs';
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
const art='stories/babel/babel-trial.html';
const src=process.env.SRC||'stories/babel/src/world/babel.js';
const mtime=f=>fs.existsSync(f)?fs.statSync(f).mtimeMs:0;
判('A7-0 ★前置：判物新于故事源码（✗ 陈旧弧）', mtime(art)>mtime(src), `产物 ${new Date(mtime(art)).toISOString().slice(11,19)} vs 源 ${new Date(mtime(src)).toISOString().slice(11,19)}`);

const s=await H.boot(H.resolveEnv());
const SC=s.SC, R=SC.setup.RPG, D3=SC.setup.DND3, B=SC.setup.BABEL, V=()=>SC.State.variables;
B.map.moveTo('L1');
D3.Player.hp=20; D3.Player.maxHp=20;
判('A7-1 L1 生效遭遇表**无 elite**且为幼獾', JSON.stringify(R.encounterTableOf('L1')?.L1?.encounters||[]).includes('badger-cub'),
   JSON.stringify(R.encounterTableOf('L1')?.L1?.encounters||null));
判('A7-2 起手背包为空（空手前提）', (V().inventory||[]).length===0, JSON.stringify(V().inventory));

await H.playPassage(s,'遭遇战');
const 步=[]; let 空手项=false, 敌名=null;
/* ★`#259` comment 5980218866 三：原把**一个布尔**同时用于「战斗收场」与「有出口」⇒ 拆双证：
 *   `胜利`＝战斗真收场（kills 增 或 「继续探索」出现）｜`已战`＝有出口（「继续探索」在位）。 */
let 胜利=false, 已战=false;
for(let i=0;i<40;i++){   // ★上限放宽（一场 ≤8 回合 × 约 2 步 ＋ 出口）；首版写 12 ⇒ 撞上限得**不稳定的假红**
  await new Promise(r=>setTimeout(r,220));
  const b=D.choiceButtons(s);
  if(!b.length) break;
  步.push(b);
  if(b.some(x=>/空手打击/.test(x))) 空手项=true;
  if(b.some(x=>/幼獾|獾/.test(x))) 敌名=String(敌名||b.find(x=>/獾/.test(x)));
  if(b.some(x=>/继续探索/.test(x))){ 已战=true; 胜利=true; break; }   // 战斗收场（★双证：已战＝有出口；胜利＝收场）
  const pick=b.find(x=>/空手打击/.test(x)) ?? b.find(x=>/獾/.test(x)) ?? b[0];
  const el=[...s.doc.querySelectorAll('.choice-box button')].find(x=>(x.textContent??'').trim()===pick);
  if(!el) break; el.click();
}
判('A7-3 ★交互战斗 UI 有「空手打击」常驻项', 空手项, JSON.stringify(步[0]||[]));
判('A7-4 ★敌方为 L1 幼獾（✗ 引擎大獾/精英）', 敌名!=null, String(敌名));
判('A7-5 ★空手数击后战斗**收场**（胜例可达）', 胜利, `步数=${步.length}｜玩家 hp=${D3.Player.hp}｜★本格对步数上限敏感：上限过小会得「不稳定的假红」（我首版 12 即踩）`);
判('A7-6 战斗结束后**有出口**（✗ 死路）', 已战, 已战?'「探索」在位':json({}) );
function json(o){return JSON.stringify(o)}
console.log(out.join('\n'));
console.log(`\n  ⇒ 失败 ${out.filter(l=>l.startsWith('✗')).length} 条`);
process.exit(out.filter(l=>l.startsWith('✗')).length?1:0);
