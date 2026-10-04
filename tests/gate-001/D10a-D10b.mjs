/* D10a／D10b 判据（release 0.0.1 · tester-4 自选维度）
 * 用法：E=<引擎检出> B=<books 检出> node D10a-D10b.mjs
 * 落盘：正例档 ＋ 反例档 ＋ 唯一变量声明
 */
import fs from 'node:fs'; import path from 'node:path';
const root=process.env.E, books=process.env.B;
const load=(f)=>eval(fs.readFileSync(f,'utf8'));
globalThis.window=globalThis;
globalThis.document={title:'',getElementById:()=>({insertAdjacentHTML(){},innerHTML:''})};
load(path.join(root,'tests/unit/framework/host.js'));
load(path.join(root,'tests/unit/framework/shims.js'));
load(path.join(root,'tests/unit/dist/bundle.js'));
load(path.join(root,'tests/unit/framework/scenario.js'));
const S=globalThis.__scenario, R=setup.RPG, Save=globalThis.Save;
const js=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?w(p):e.name.endsWith('.js')&&js.push(p);}})(path.join(books,'stories','babel','src'));
js.sort(); for(const f of js) eval(`(function (RPG, $) {\n${fs.readFileSync(f,'utf8')}\n})(setup.RPG, jQuery);`);
eval(`(function (RPG) {\n${fs.readFileSync(path.join(books,'stories','babel/scenarios/fixtures.js'),'utf8')}\n})(setup.RPG);`);
const V=()=>State.variables;
const out=[];
const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
const J=(x)=>JSON.stringify(x);

/* ================= D10a：存档往返后身份/装备一致性 =================
 * 唯一变量：往返**之后**施加破坏性扰动（hp→1／加 coin／移位），再读档。
 * 正例臂：读档后须回到存档时态；反例臂：不读档则保持被扰动态（证明扰动真生效）。 */
State.set(S.resolveFixture('起手态+装备1'));
V().mapCurrent_babel='L1'; V().babelRun.gathered=3;
const before={player:J(V().player), inv:J(V().inventory), map:V().mapCurrent_babel, run:J(V().babelRun)};
const slot=Save.make();                      // 存档
V().player.hp=1; V().inventory.push({id:'coin',charges:5,equipped:false}); V().mapCurrent_babel='L5';
const 扰动后={hp:V().player.hp, map:V().mapCurrent_babel, n:V().inventory.length};
判('D10a-0 反例臂：扰动真生效', 扰动后.hp===1 && 扰动后.map==='L5', `hp=${扰动后.hp} map=${扰动后.map}`);
Save.load(slot);                              // 读档
const after={player:J(V().player), inv:J(V().inventory), map:V().mapCurrent_babel, run:J(V().babelRun)};
判('D10a-1 身份 player 逐字段', before.player===after.player);
判('D10a-2 装备 inventory 逐字段（含 equipped）', before.inv===after.inv, `${before.inv.slice(0,80)}`);
判('D10a-3 位置 mapCurrent_babel', before.map===after.map, `${before.map} → ${after.map}`);
判('D10a-4 进度 babelRun', before.run===after.run, `gathered=${V().babelRun.gathered}`);

/* ================= D10b：跨层单向门不可逆 =================
 * 机械判据：枚举地图**有向边**，取「有去无回」的边集 ⇒
 *   ①须**恰为**段界（10→11）那一条；②段内边须**双向**（有回边）；③不存在任何跨段**向下**边。 */
const M=setup.BABEL.map;
const edges=M.exits.map(e=>[String(e.from),String(e.to)]);   // ★真 API：map.exits (Exit{from,to})
const has=(a,b)=>edges.some(([x,y])=>x===a&&y===b);
const 单向=edges.filter(([a,b])=>!has(b,a));
判('D10b-1 单向边集', true, `共 ${单向.length} 条：${单向.map(e=>e.join('→')).join(' , ')}`);
/* ★真模型：段界门是 **L10-gate→L11**（✗ L10-camp）—— 我首版写错节点名 */
判('D10b-2 ★段界 10→11 有去无回', has('L10-gate','L11') && !has('L11','L10-gate'),
   `L10-gate→L11=${has('L10-gate','L11')} 回边=${has('L11','L10-gate')}`);
/* ★`books#259` 裁 1（单向向上）：段内边**有去无回** —— 原格断「双向」，与裁冲突 ⇒ 按裁改断。
 *   依据：`#259` comment 5980218866 二·1「五条 `D10b-3 段内 … 双向`，原文均 `去=true 回=false`：
 *   与本次单向裁定相冲突，**须对齐判据**，不能要求产品恢复逆行来取绿」。 */
const 段内单向=[['L1','L2'],['L2','L3'],['L9','L10-camp'],['L11','L12'],['L19','L20-forge']];
/* ★「出口」的直接量＝结构出边 ∪ action（#126 的教训：✗ 只数 exitsFrom） */
const actsOf=(id)=>(M.locations.get(id)?.actions||[]).length;
for (const [a,b] of 段内单向) 判(`D10b-3 段内 ${a}→${b} 单向（有去无回）`, (has(a,b)&&!has(b,a))||null, `去=${has(a,b)} 回=${has(b,a)}（须 去=true 回=false）`);
const 跨段向下=edges.filter(([a,b])=>{const na=parseInt(String(a).replace(/\D/g,''),10),nb=parseInt(String(b).replace(/\D/g,''),10);
  return Number.isFinite(na)&&Number.isFinite(nb)&&nb<na&&(na>=11&&nb<=10);});
判('D10b-4 ★无跨段向下边（11+ ⇒ 10-）', 跨段向下.length===0, 跨段向下.map(e=>e.join('→')).join(',')||'无');

console.log(out.join('\n'));
const bad=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败/不可判 ${bad} 条`);
process.exit(bad?1:0);
