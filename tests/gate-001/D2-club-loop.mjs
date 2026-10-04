/* D2 终形复测臂（裁丙后）· tester-4
 * 判据：**开局持棒 ⇒ 全程闭环可达**（①开局真给 club ②持棒能胜 ③胜后有掉落 ④掉落可累积到锻造输入 ⑤锻造可达）
 * 用法：E=<引擎检出> B=<books 检出> node D2-club-loop.mjs
 * 唯一变量：武器来源（开局发放）—— 对照臂 = 空手（应 0 击杀）
 */
import fs from 'node:fs'; import path from 'node:path';
const root=process.env.E, books=process.env.B;
const load=(f)=>eval(fs.readFileSync(f,'utf8'));
globalThis.window=globalThis;
globalThis.document={title:'',getElementById:()=>({insertAdjacentHTML(){},innerHTML:''})};
load(path.join(root,'tests/unit/framework/host.js')); load(path.join(root,'tests/unit/framework/shims.js'));
load(path.join(root,'tests/unit/dist/bundle.js')); load(path.join(root,'tests/unit/framework/scenario.js'));
const S=globalThis.__scenario, R=setup.RPG;
const js=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?w(p):e.name.endsWith('.js')&&js.push(p);}})(path.join(books,'stories','babel','src'));
js.sort(); for(const f of js) eval(`(function (RPG, $) {\n${fs.readFileSync(f,'utf8')}\n})(setup.RPG, jQuery);`);
eval(`(function (RPG) {\n${fs.readFileSync(path.join(books,'stories','babel/scenarios/fixtures.js'),'utf8')}\n})(setup.RPG);`);
let 日志=[];
const d=Object.getOwnPropertyDescriptor(Object.prototype,'perform');
Object.defineProperty(Object.prototype,'perform',{value:function(m,...r){日志.push(String(m));return d.value.call(this,m,...r);},enumerable:false,configurable:true,writable:true});
const V=()=>State.variables;
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
/* ★① 真 init：从 init.twee 读初始背包（✗ 用夹具 —— 夹具未必随本笔更新） */
const init=fs.readFileSync(path.join(books,'stories/babel/src/meta/init.twee'),'utf8');
const mInv=init.match(/<<set \$inventory to (\[[^\]]*\])>>/);
let 初始=[];
try{ 初始=eval(mInv?.[1]||'[]'); }catch(e){}
/* ★落点（票面预裁）：**故事 JS 的 L1 动作**（✗ init.twee）⇒ 判据也须落该面（✗ 只扫 init.twee） */
const L1=setup.BABEL.map.locations.get('L1');
const txt=(a)=>String(typeof a.text==='function'?a.text():a.text);
const 拾棒=(L1?.actions||[]).find(a=>txt(a).includes('木棒'));
判('D2丙-1a L1 有「拾起木棒」动作（非战斗武器来源）', !!拾棒, (L1?.actions||[]).map(txt).join(' ｜ ')||'无');
let 拾后=null;
if (拾棒){
  try{ State.set(S.resolveFixture('起手态')); R.give('club'); }catch(e){}
  // 真调用该动作（在**空背包**态下）
  State.set(S.resolveFixture('起手态')); V().mapCurrent_babel='L1';
  const 可用前 = 拾棒.when? 拾棒.when() : true;
  拾棒.action();
  拾后={ 背包含: V().inventory.some(i=>i.id==='club'), 已握: (R.equippedWeapon?.()?.id)==='club', 动作已消失: !(拾棒.when? 拾棒.when():true) };
  判('D2丙-1b 动作开局**可用**（when ✗ 自门）', 可用前, String(可用前));
  判('D2丙-1c 拾起后**入包**', 拾后.背包含, JSON.stringify(V().inventory.map(i=>i.id)));
  判('D2丙-1d 拾起后**已握**（✗ 只给不握）', 拾后.已握, String(R.equippedWeapon?.()?.id));
  判('D2丙-1e 动作**一次性**（拾后消失）', 拾后.动作已消失, String(拾后.动作已消失));
}
const 有棒 = !!拾棒;
/* ★②③ 持棒能胜 + 胜后有掉落 */
const 棒=[{id:'club',charges:null,equipped:true}];
const 用棒=[]; const 空手=[];
for (const L of ['L1','L5','L9','L13','L16']) for (let i=0;i<4;i++) {
  State.set(S.resolveFixture('起手态')); V().inventory=JSON.parse(JSON.stringify(棒)); V().mapCurrent_babel=L; 日志=[];
  const n0=V().inventory.length; await setup.BABEL.fight({interactive:false});
  用棒.push({kills:V().babelRun.kills, 增:V().inventory.length-n0, L});
  State.set(S.resolveFixture('起手态')); V().inventory=[]; V().mapCurrent_babel=L; 日志=[];
  await setup.BABEL.fight({interactive:false}); 空手.push(V().babelRun.kills);
}
判('D2丙-2 持械能胜（击杀场次 > 0）', 用棒.some(x=>x.kills>0), `击杀场次 ${用棒.filter(x=>x.kills>0).length}/${用棒.length}`);
判('D2丙-3 对照臂：空手仍 0 击杀', 空手.every(k=>k===0), `空手击杀 ${空手.reduce((a,b)=>a+b,0)}/${空手.length}`);
判('D2丙-4 胜后有掉落（背包装数增 > 0 的场次）', 用棒.some(x=>x.增>0), `掉落场次 ${用棒.filter(x=>x.增>0).length}/${用棒.length}`);
/* ★④⑤ 锻造输入可达（铁料从 L13+ 掉落）+ craft 入口存在 */
const 有铁=用棒.filter(x=>/L1[3-9]/.test(x.L)&&x.kills>0).length;
判('D2丙-5 二段可获铁料（L13+ 击杀场次 > 0）', 有铁>0, `L13+ 击杀场次 ${有铁}`);
/* ★craft 面：配方在**引擎 dnd3 pack**（`src/dnd/dnd3/items/iron-lineage.js`，`stats.recipe`）
 *   本装置（host+shims+bundle+故事 src）**未注册该 pack**（实测 `createItem('iron-longsword').recipe === undefined`）
 *   ⇒ 我**✗ 据此报红**（＝我的装置限制）⇒ 记**明账**：craft 面须引擎 dnd3 完整装载的装置。 */
out.push('· D2丙-6 craft 配方面 —— **未判（明账）**：配方在引擎 dnd3 pack（`stats.recipe`），本装置未注册该 pack');
const craftable=[];
const 图纸=(()=>{ try{ const L=setup.BABEL.map.locations.get('L20-settlement');
  return (L.availableActions||[]).map(a=>String(typeof a.text==='function'?a.text():a.text)).some(t=>/图纸/.test(t)); }catch(e){ return false; } })();
判('D2丙-7 图纸可得（L20-settlement 有「找图纸」动作）', 图纸, 图纸?'有':'无');

console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
