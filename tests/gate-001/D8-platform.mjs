/* D8 平台适配判据 · release 0.0.1 · tester-4
 * 判据（#104 D8）：①375px 窄屏默认布局**可用** ②桌面主流宽度可用
 * ★★关键顺序（本席立的判据）：**先切视口，后加载** —— 引擎的「侧栏收起」判定在 init 时执行一次
 *    （`Config.ui.stowBarInitially='device-size'` ⇒ init 读 `window.width()`）⇒ 反过来（先加载后切）**测的是错的状态**。
 * 用法：ENGINE=<引擎检出> [PW=<playwright 模块目录>] node D8-platform.mjs
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import {createRequire} from 'node:module';
const E=process.env.ENGINE, books=process.cwd();
const PW=process.env.PW||`${process.env.HOME}/bots/home/sagitrs-tester-3/pw`;
const req=createRequire(path.join(PW,'noop.js'));
const {chromium}=req('playwright');
const art=path.join(books,'stories','babel','babel-trial.html');
const html=fs.readFileSync(art);
const srv=http.createServer((q,r)=>{r.writeHead(200,{'content-type':'text/html; charset=utf-8'});r.end(html);});
await new Promise(res=>srv.listen(0,'127.0.0.1',res));
const url=`http://127.0.0.1:${srv.address().port}/`;
const out=[]; const 判=(n,ok,note)=>out.push(`${ok?'✓':'✗'} ${n}${note?'   ← '+note:''}`);
const browser=await chromium.launch({
  executablePath:`${process.env.HOME}/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`,
  args:['--no-sandbox','--disable-dev-shm-usage'],
  env:{...process.env, LD_LIBRARY_PATH:`${process.env.HOME}/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`},
});
for (const [名,w,h] of [['375px 窄屏',375,667],['1200×800 桌面',1200,800]]) {
  const ctx=await browser.newContext({viewport:{width:w,height:h}});   // ★先切视口
  const pg=await ctx.newPage();
  const errs=[];
  pg.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await pg.goto(url,{waitUntil:'load'});                                // ★后加载
  await pg.waitForTimeout(1200);
  /* 可用性：正文有字、有可点链接、无横向溢出 */
  const body=await pg.locator('#passages').innerText();
  const links=await pg.locator('#passages a, #passages [data-passage]').count();
  const 溢出=await pg.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  const 侧栏收起=await pg.evaluate(()=>{const b=document.body; return b.classList.contains('stowed')||document.querySelector('#ui-bar')?.classList.contains('stowed')||false;});
  判(`D8 ${名}：正文非空`, body.trim().length>20, `${body.trim().length} 字`);
  判(`D8 ${名}：有可点入口`, links>0, `${links} 个`);
  判(`D8 ${名}：无横向溢出`, !溢出, 溢出?'scrollWidth > viewport':'ok');
  判(`D8 ${名}：零 console 错误`, errs.length===0, errs.slice(0,2).join(' ｜ ')||'0');
  if (w===375) 判('D8 375px：侧栏按 device-size 收起（init 时判定）', 侧栏收起, `body.stowed=${侧栏收起}`);
  await ctx.close();
}
/* ★★反向臂：**先加载后切视口**（顺序颠倒）⇒ 须与正臂**结果不同**（证明「顺序」是判据的一部分） */
{
  const ctx=await browser.newContext({viewport:{width:1200,height:800}});   // 先大
  const pg=await ctx.newPage(); await pg.goto(url,{waitUntil:'load'}); await pg.waitForTimeout(900);
  await pg.setViewportSize({width:375,height:667});                          // 后切小
  await pg.waitForTimeout(600);
  const 反=await pg.evaluate(()=>document.body.classList.contains('stowed')||document.querySelector('#ui-bar')?.classList.contains('stowed')||false);
  判('D8 反向臂：先加载后切 375 ⇒ 侧栏**未**按 device-size 收起（顺序确有意义）', 反===false, `body.stowed=${反}`);
  await ctx.close();
}
await browser.close(); srv.close();
console.log(out.join('\n'));
const n=out.filter(l=>l.startsWith('✗')).length;
console.log(`\n  ⇒ 失败 ${n} 条`);
process.exit(n?1:0);
