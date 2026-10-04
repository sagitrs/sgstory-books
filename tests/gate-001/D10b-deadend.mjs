/* D10b 判据 · 死路检测（**升级版**：＋action 型出口）· release 0.0.1 · tester-4
 * ★升级缘由（books#126 的假阳性）：首版只数 `map.exitsFrom`（**结构出边**）⇒ 漏 **action 型出口**
 *   （`action: () => Engine.play(<段落>)`，如 L20-gate → 「试玩终点」）⇒ 误报软锁。
 *   —— 属「**间接量代直接量**」族：出口＝「玩家能离开的**任一**通道」，✗ 只是结构边。
 * 判据（直接量口径）：地点须满足**任一**：① 有结构出边（`exitsFrom`）② 有 action（可导航或可执行）
 *   ③ 在**显式登记的终点白名单**里（须给理由）。三者皆无 ⇒ **死路** ⇒ 红。
 * 用法：E=<引擎检出> B=<books 检出> [ALLOW_SINK=a,b] node D10b-deadend.mjs
 */
import fs from 'node:fs'; import path from 'node:path';
const root=process.env.E, books=process.env.B;
const load=(f)=>eval(fs.readFileSync(f,'utf8'));
globalThis.window=globalThis;
globalThis.document={title:'',getElementById:()=>({insertAdjacentHTML(){},innerHTML:''})};
load(path.join(root,'tests/unit/framework/host.js')); load(path.join(root,'tests/unit/framework/shims.js'));
load(path.join(root,'tests/unit/dist/bundle.js')); load(path.join(root,'tests/unit/framework/scenario.js'));
const js=[];
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?w(p):e.name.endsWith('.js')&&js.push(p);}})(path.join(books,'stories','babel','src'));
js.sort(); for(const f of js) eval(`(function (RPG, $) {\n${fs.readFileSync(f,'utf8')}\n}\n)(setup.RPG, jQuery);`);
const M=setup.BABEL.map;
/* ★终点白名单（显式登记，须给理由）—— 本版为空：L20-gate 有 action ⇒ 不属终点 */
const ALLOW = new Map(Object.entries(JSON.parse(process.env.ALLOW_SINK||'{}')));
/* ★反例臂（可分辨自证）：撤销 L20-gate 的 action ⇒ 判据**须**报死路 */
if (process.env.NEG_ARM==='1') { M.locations.get('L20-gate').actions.length=0; }
const 死路=[]; const 行=[];
for (const [id,loc] of M.locations) {
  const ex=M.exitsFrom(id).length;
  const ac=(loc.actions||[]).length;
  const 白名单=ALLOW.has(String(id));
  const 活=ex>0||ac>0||白名单;
  if(!活) 死路.push(String(id));
  行.push(`  ${活?'○':'✗'} ${String(id).padEnd(18)} 出边=${ex} action=${ac}${白名单?' ［白名单：'+(ALLOW.get(String(id)))+'］':''}`);
}
console.log('  ★逐地点（直接量：出边 ＋ action ＋ 白名单）');
console.log(行.join('\n'));
console.log(`\n  ⇒ 死路（三者皆无）＝ **${死路.length}** 个${死路.length?`：${死路.join(',')}`:''}`);
/* 对照臂：L10-gate 须有出边 */
const g=M.exitsFrom('L10-gate').length;
console.log(`  ○ 对照 L10-gate 出边=${g} ⇒ ${g?'✓':'✗'}`);
process.exit(死路.length||!g ? 1 : 0);
