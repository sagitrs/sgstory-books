/* D2 关键对照臂：**空手 vs 持械**（唯一变量 = 有无武器）
 * #104 D2 判据「空手/持械均可推进」的机械读数。
 * 用法：E=<引擎检出> B=<books 检出> node D2-unarmed-vs-armed.mjs
 */
import fs from 'node:fs'; import path from 'node:path';
const root=process.env.E, books=process.env.B;
const load=(f)=>eval(fs.readFileSync(f,'utf8'));
globalThis.window=globalThis;
globalThis.document={title:'',getElementById:()=>({insertAdjacentHTML(){},innerHTML:''})};
load(path.join(root,'tests/unit/framework/host.js')); load(path.join(root,'tests/unit/framework/shims.js'));
load(path.join(root,'tests/unit/dist/bundle.js')); load(path.join(root,'tests/unit/framework/scenario.js'));
const S=globalThis.__scenario;
const js=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?w(p):e.name.endsWith('.js')&&js.push(p);}})(path.join(books,'stories','babel','src'));
js.sort(); for(const f of js) eval(`(function (RPG, $) {\n${fs.readFileSync(f,'utf8')}\n})(setup.RPG, jQuery);`);
eval(`(function (RPG) {\n${fs.readFileSync(path.join(books,'stories','babel/scenarios/fixtures.js'),'utf8')}\n})(setup.RPG);`);
let 日志=[];
const d=Object.getOwnPropertyDescriptor(Object.prototype,'perform');
Object.defineProperty(Object.prototype,'perform',{value:function(m,...r){日志.push(String(m));return d.value.call(this,m,...r);},enumerable:false,configurable:true,writable:true});
const V=()=>State.variables;
const 层=['L1','L5','L11','L17'], N=6;
for (const [名, inv] of [['空手',[]],['持械(club)',[{id:'club',charges:null,equipped:true}]]]) {
  const kills=[], deaths=[], rounds=[];
  for (const L of 层) for (let i=0;i<N;i++) {
    State.set(S.resolveFixture('起手态'));
    V().inventory = JSON.parse(JSON.stringify(inv));
    V().mapCurrent_babel = L; 日志=[];
    await setup.BABEL.fight({interactive:false});
    const n=日志.map(m=>Number((m.match(/【第 (\\d+) 回合】/)||[])[1])).filter(Number.isFinite);
    rounds.push(n.length?Math.max(...n):0);
    kills.push(V().babelRun.kills); deaths.push(V().babelRun.deaths);
  }
  console.log(`  ${名}: 击杀场次 ${kills.filter(k=>k>0).length}/${kills.length} ｜ 死亡场次 ${deaths.filter(x=>x>0).length}/${deaths.length} ｜ 回合 ${Math.min(...rounds)}–${Math.max(...rounds)}`);
}
const 空手文案 = (()=>{ State.set(S.resolveFixture('起手态')); V().mapCurrent_babel='L5'; 日志=[];
  return 'X'; })();
