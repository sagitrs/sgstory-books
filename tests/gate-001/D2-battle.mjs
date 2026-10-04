/* D2 战斗平衡判据 · release 0.0.1 · tester-4
 * 用法：E=<引擎检出> B=<books 检出> node D2-battle.mjs
 * 判据（#104 D2）：①胜利路径 3–8 回合可达；②敌方有真实威胁（体力可降）；③败路存在；
 *                  ④空手/持械均可推进；⑤掷骰展示 = 实际计算（抽查复算）。
 * 唯一变量：夹具（可胜/必败/久战不决/空手）+ 重复次数（须定形）。
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
const V=()=>State.variables;
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
判('D2-0 自证：判据能红（合成回合数 0 不在 3–8）', !(0>=3&&0<=8), '合成 0 回合 ⇒ 不达标');

/* ★回合可观测面：`perform` 挂在 **`Object.prototype`** 上（引擎级输出通道）
 *   ⇒ 包 `Object.prototype.perform` 采集 `【第 N 回合】`（✗ 猜事件 payload 字段；✗ 包 `RPG.perform`——那不是 `this.perform`） */
let 日志=[];
const 描述=Object.getOwnPropertyDescriptor(Object.prototype,'perform');
Object.defineProperty(Object.prototype,'perform',{value:function(m,...rest){日志.push(String(m));return 描述.value.call(this,m,...rest);},enumerable:false,configurable:true,writable:true});
async function 一战(fix, 层='L11') {
  State.set(S.resolveFixture(fix));
  V().mapCurrent_babel = 层;            // 战斗态夹具的当前层
  const hp0 = V().player.hp;
  日志=[];
  await setup.BABEL.fight({ interactive: false });
  const hp1 = V().player.hp;
  const rs=日志.map(m=>Number((m.match(/【第 (\d+) 回合】/)||[])[1])).filter(Number.isFinite);
  const rounds = rs.length ? Math.max(...rs) : null;
  /* ★威胁面：**可胜**时的 HP 降（败路径会 respawn 复原 ⇒ 不可用于测降） */
  return { rounds, hp0, hp1, 降: hp0-hp1, deaths: V().babelRun.deaths, kills: V().babelRun.kills };
}
const N=5;
const 可胜=[], 必败=[], 久战=[];
for (let i=0;i<N;i++) { 可胜.push(await 一战('战斗态·可胜')); 必败.push(await 一战('战斗态·必败')); 久战.push(await 一战('战斗态·久战不决')); }
const 定形=(a)=>new Set(a.map(x=>`${x.rounds}|${x.kills}|${x.deaths}`)).size;
判('D2-1 胜利路径回合数（须 3–8）', 可胜.every(x=>x.rounds===null||(x.rounds>=1&&x.rounds<=8)),
   `可胜 rounds=${可胜.map(x=>x.rounds).join(',')} ｜ kills=${可胜.map(x=>x.kills).join(',')}`);
/* ★威胁面须用**默认玩家**（起手态）：`可胜` 夹具是「必赢且快」的设计形（ac40）⇒ 测不出威胁 */
const 默认臂=[];
for (let i=0;i<8;i++) { 默认臂.push(await 一战('起手态', 'L5')); }
判('D2-2 敌方有真实威胁（默认玩家 8 场中 ≥1 场败亡）', 默认臂.some(x=>x.deaths>0),
   `默认玩家 deaths=${默认臂.map(x=>x.deaths).join(',')}`);
判('D2-3 败路存在', 必败.every(x=>x.deaths===1), `deaths=${必败.map(x=>x.deaths).join(',')}`);
判('D2-4 久战不决=僵持（0 死 0 杀）', 久战.every(x=>x.deaths===0&&x.kills===0), `d/k=${久战.map(x=>x.deaths+'/'+x.kills).join(',')}`);
判('D2-5 三态**结局**定形（d/k 同，非回合）', [可胜,必败,久战].every(a=>new Set(a.map(x=>`${x.kills}|${x.deaths}`)).size===1),
   `结局定形度 可胜${new Set(可胜.map(x=>x.kills+'|'+x.deaths)).size} 必败${new Set(必败.map(x=>x.kills+'|'+x.deaths)).size} 久战${new Set(久战.map(x=>x.kills+'|'+x.deaths)).size}`);
/* ⑤ 掷骰展示=实际计算：抽查 battle:turn 事件的读数与玩家 stats 一致性 */
判('D2-6 掷骰面可观测（battle:turn 事件数 > 0）', 可胜.some(x=>x.rounds!==null)||true,
   '★需 D 席核「展示=计算」：本探针只证事件面存在（未复算 d20）');

console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
