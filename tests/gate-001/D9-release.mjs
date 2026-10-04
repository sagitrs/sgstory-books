/* D9 发布工程判据 · release 0.0.1 · tester-4
 * 判据（#104 D9）：①版本标识可见（版本号进 UI）②线上＝pin 构建**逐字节可复现**③变更日志在册
 * 用法：ENGINE=<引擎检出> [STORY=<产物路径>] node D9-release.mjs   （cwd = books 检出）
 */
import fs from 'node:fs'; import path from 'node:path'; import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const E=process.env.ENGINE, books=process.cwd();
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
const pin=JSON.parse(fs.readFileSync(path.join(books,'.github/engine-ref.json'),'utf8')).ref;
const VER=`v0.0.1·${pin.slice(0,8)}`;
const storyDir=path.join(books,'stories','babel');
/* ★★本件**自建**产物（✗ 读磁盘上遗留的 `babel-trial.html`）——它以 pin 派生的 `VER` 为参，
 *   故旧产物必与**新 pin** 不符 ⇒ 会得**假红**（我 2026-10-02 在 `#142` pin 升版上踩此：
 *   读到的产物是旧 pin 构建的 ⇒ D9-1/D9-2 双红，而真因是**我的装置**，✗ 产品）。 */
const art=path.join(storyDir,'d9-pin.html');
try{
  execFileSync('python3',[path.join(E,'build.py'),storyDir,'--out','d9-pin.html','--version',VER],{stdio:'ignore'});
}catch(e){ console.error('  ★构建失败（D9-1/D9-2 将据空产物判）:', e.message.slice(0,90)); }
/* ① 版本标识可见 */
const html=fs.existsSync(art)?fs.readFileSync(art,'utf8'):'';
判('D9-1 产物注入串恰 1 次', (html.match(new RegExp(`buildVersion to "${VER.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`,'g'))||[]).length===1, VER);
/* 真渲染位 */
const req=createRequire(path.join(E,'noop.js')); const {JSDOM}=req('jsdom');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
const w=dom.window; await new Promise(r=>setTimeout(r,1200));
try{w.SugarCube.Engine.runUserInit()}catch(e){}; try{w.SugarCube.Engine.start()}catch(e){}
try{w.SugarCube.Engine.play(w.SugarCube.Config.passages.start)}catch(e){}; try{w.SugarCube.UIBar.start()}catch(e){}
await new Promise(r=>setTimeout(r,600));
const cap=w.document.querySelector('#story-caption')?.textContent?.trim()||'';
判('D9-2 版本标识**真渲染**（#story-caption 含版本）', cap.includes(VER)||/版本\s*v0\.0\.1/.test(cap), JSON.stringify(cap));
/* ② 逐字节可复现（同 pin 同参两次构建） */
/* ★`--out` 是**相对 story 目录**（实测）⇒ 两次构建写两个名，再比 sha1 */
const sha=(f)=>execFileSync('sha1sum',[f],{encoding:'utf8'}).split(' ')[0];
try{
  execFileSync('python3',[path.join(E,'build.py'),storyDir,'--out','d9-a.html','--version',VER],{stdio:'ignore'});
  execFileSync('python3',[path.join(E,'build.py'),storyDir,'--out','d9-b.html','--version',VER],{stdio:'ignore'});
  const a=path.join(storyDir,'d9-a.html'), b=path.join(storyDir,'d9-b.html');
  const sa=sha(a), sb=sha(b);
  判('D9-3 同 pin 同参两次构建 sha1 相同', sa===sb, `${sa.slice(0,12)} vs ${sb.slice(0,12)}`);
  fs.unlinkSync(a); fs.unlinkSync(b);
}catch(e){ 判('D9-3 同 pin 同参两次构建 sha1 相同', false, e.message.slice(0,80)); }
/* ③ 变更日志在册 */
const cands=['CHANGELOG.md','CHANGELOG','docs/CHANGELOG.md','stories/babel/CHANGELOG.md'];
const found=cands.filter(p=>fs.existsSync(path.join(books,p)));
判('D9-4 变更日志在册', found.length>0, found.join(',')||`候补：${cands.join('/')}`);
try{ fs.unlinkSync(art); }catch(e){}   // 清本件自建产物（✗ 污染工作区）
console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
