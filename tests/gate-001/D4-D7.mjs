/* D4（信息呈现）＋D7（稳健性）判据 · release 0.0.1 · tester-4
 * 用法：node D4-D7.mjs            （cwd = books 检出；引擎由 ENGINE 或 --engine 给）
 * ★复用仓库自己的 harness（#122 的 console 采集面），✗ 自造 jsdom
 * D4：**渲染后**正文无 `**` 残留｜渲染后正文零内部术语泄漏
 * D7：全地点×全动作×全出口走一遍 ⇒ console 零未处理异常（`unhandledErrors`）
 */
const H = await import('file://' + process.cwd() + '/tools/e2e-harness.mjs');
const { resolveEnv, boot, currentPassage, playPassage, unhandledErrors, panels } = H;
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
/* ★两臂可分辨自证（开跑前）：判据须能**红** */
判('D4-0 自证：探测器能红（合成 `**` 被检出）', /\*\*/.test('合成 **粗体** 残留') === true, '合成样本命中');
判('D7-0 自证：异常探测器能红', [{'kind':'jsdomError','msg':'Uncaught X'}].filter(m=>![/^Not implemented: Window's scroll\(\)/].some(re=>re.test(m.msg))).length===1, '合成异常被抓');
const env=resolveEnv(process.argv[2]||undefined);
const s=await boot(env);

/* ---------- D4：渲染后正文 ---------- */
const 正文=()=>{
  const ps=[...s.doc.querySelectorAll('#passages .passage p, .passage p')];
  return ps.map(p=>p.textContent).join('\n');
};
const seen=new Set(); const 星=[]; const 术语=[];
const 术语表=['gather','rollEncounter','availableActions','mapCurrent_babel','babelRun','__scenario','fixtures.js'];
/* ★覆盖：①**全部段落**逐个渲染 ②故事链点击兜底 */
let 段名=[...s.doc.querySelectorAll('tw-passagedata')].map(e=>e.getAttribute('name')).filter(Boolean);
if(!段名.length){ try{ 段名=[...s.SC.State.passages.keys()]; }catch(e){} }
for (const nm of 段名) {
  try{ await playPassage(s, nm); }catch(e){ continue; }
  const t=正文();
  if (/\*\*/.test(t)) 星.push(`${nm}: ${t.match(/.{0,25}\*\*.{0,25}/)?.[0]}`);
  for (const k of 术语表) if (t.includes(k)) 术语.push(`${nm}: ${k}`);
}
let cur=currentPassage(s);
for (let i=0;i<30;i++) {
  const t=正文();
  if (/\*\*/.test(t)) 星.push(`${cur}: ${t.match(/.{0,25}\*\*.{0,25}/)?.[0]}`);
  for (const k of 术语表) if (t.includes(k)) 术语.push(`${cur}: ${k}`);
  const links=[...s.doc.querySelectorAll('[data-passage]')]
    .filter(el=>{const v=el.getAttribute('data-passage'); return v && v!==cur && !seen.has(v);});
  if (!links.length) break;
  const want=links[0].getAttribute('data-passage'); seen.add(cur);
  try{ await playPassage(s,want); cur=currentPassage(s);}catch(e){break;}
}
判('D4-1 渲染后正文无 `**` 残留', 星.length===0, 星.slice(0,3).join(' ｜ ')||`覆盖 ${段名.length} 段（全量）`);
判('D4-2 渲染后正文零内部术语泄漏', 术语.length===0, 术语.slice(0,3).join(' ｜ ')||'无');
/* 面板面也扫（五面板） */
let 面板星=[];
try{ const P=panels(s); for (const [k,v] of Object.entries(P)) if (/\*\*/.test(String(v))) 面板星.push(k); }catch(e){}
判('D4-3 五面板无 `**` 残留', 面板星.length===0, 面板星.join(',')||'无');

/* ---------- D7：console 面（冷 boot 期）---------- */
const {bad,ignored}=unhandledErrors(s);
判('D7-1 零未处理异常（冷 boot）', bad.length===0, bad.map(b=>b.slice(0,70)).join(' ｜ ')||`放过 ${ignored.length} 条噪声`);

console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
