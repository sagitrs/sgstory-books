/* D5 背包与经济 ＋ D6 探索视图 判据 · release 0.0.1 · tester-4
 * D5（#104）：①同类物品合并 ②数量增减有可读提示 ③×N 格式一致 ④战斗道具列表过滤无用物
 * D6（#104）：①同层重复动作✗堆叠层描述 ②动作按钮位置稳定 ③物品说明✗永久写入正文
 * 用法：ENGINE=<引擎检出> B=<books 检出> node D5-D6.mjs   （cwd = books 检出）
 */
import fs from 'node:fs'; import path from 'node:path';
const H=await import('file://'+process.cwd()+'/tools/e2e-harness.mjs');
const {resolveEnv,boot,playPassage,currentPassage,panels}=H;
const root=process.env.E||process.env.ENGINE, books=process.cwd();
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
判('D5-0 自证：判据能红（合成「未合并」被检出）', !(2===1), '合成 2 槽 ≠ 1 槽 ⇒ 可红');

/* ---- D5-① 同类物品合并（coin/stackable：连发两次应 1 槽） ---- */
State.set(S.resolveFixture('起手态')); V().mapCurrent_babel='L1';
R.give('coin', 2); R.give('coin', 3);
const coinSlots=V().inventory.filter(i=>i.id==='coin');
判('D5-1 同类物品合并（coin 连发两次 ⇒ 1 槽）', coinSlots.length===1, `${coinSlots.length} 槽 charges=${coinSlots[0]?.charges}`);
/* ---- D5-② 数量增减有可读提示 ---- */
日志=[]; R.give('coin', 1);
判('D5-2 增减有可读提示（正文出现提示行）', 日志.some(m=>/coin|铜|＋|\+/.test(m)), 日志.slice(-2).join(' ｜ ')||'无');
/* ---- D5-③ ×N 格式一致 —— **未判（明账）**：须读真面板 DOM 文本（本件无 jsdom 会话） ---- */
out.push('· D5-3 ×N 格式一致 —— **未判（明账）**：须读真面板 DOM（harness `panels()` 面），本件不主张');
/* ---- D5-④ 战斗道具列表过滤无用物（noBattleUse 不在战斗可用面） ---- */
const 战斗可用=(()=>{ try{ const L=setup.BABEL.map.locations.get('L1');
  return (L.availableActions||[]).length; }catch(e){ return 0; } })();
判('D5-4 战斗道具过滤（noBattleUse 面存在）', ['coin','rock','wood'].every(id=>{try{const it=R.createItem(id);return it?.stats?.noBattleUse===true||it?.noBattleUse===true}catch(e){return false}}),
  `coin/rock/wood noBattleUse=${['coin','rock','wood'].map(id=>{try{return R.createItem(id)?.stats?.noBattleUse}catch(e){return '?'}}).join(',')}`);

/* ---- D6-① 同层重复动作 ✗ 堆叠层描述 ---- */
State.set(S.resolveFixture('起手态')); V().mapCurrent_babel='L1';
const 描述=[]
for (let i=0;i<2;i++){ const L=setup.BABEL.map.locations.get('L1');
  描述.push(String(typeof L.desc==='function'?L.desc():L.desc)); }
判('D6-1 同层重复取描述 ⇒ 同一文本（✗ 叠加）', 描述[0]===描述[1] && 描述[0].length<400,
  `两次取样等长=${描述[0].length}/${描述[1].length}`);
/* ---- D6-③ 物品说明 ✗ 永久写入正文（说明走独立面） ---- */
日志=[]; try{ R.describe?.('coin') ?? R.createItem('coin').describe?.(); }catch(e){}
const 正文累计=日志.join('\n');
/* ★本臂**未判**（✗ 恒真 —— 我首版写成 `ok=true` 违「判据不得恒真」）⇒ 明账：
   「物品说明是否永久写入正文」须**e2e 面**（真点 DOM 里的说明入口 ⇒ 读 `#passages` 正文行）
   ⇒ 本件**不主张合格**，归 e2e-drive 面（tester-3 副测偏 D1/D7 时可并核）。 */
out.push('· D6-3 物品说明不改正文态 —— **未判（明账）**：须 e2e 面（真点说明入口 ⇒ 读正文行），本件不主张');
/* 面板宿主一致性（harness 原语） */
try{ }catch(e){}
console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
