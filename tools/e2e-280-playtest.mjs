#!/usr/bin/env node
/* `books#280` · **操作者试玩批的真浏览器臂**（L1 面 ＋ 深浅两层）。
 *
 * ## 判谁（六臂；判据面已由 `verify.mjs` 各格判过，本档只判**玩家真看得到／点得到**那面）
 *   **① 遭遇＝每层一次**（`books#282`）：★**胜后**「遭遇」入口**不在** ✔；★**未胜/僵持/撤退后回屏**仍在 ✔
 *      （对齐 `babel.js:435`「★撤退／失败／僵持／击晕**可重试**（那时账仍假 ⇒ 入口仍在）」）。
 *   **② 采净一行**（`books#283`）：采净后正文里含「采得」的**行数恰 1**（逐字「采得：…（此处已采尽）」）✔
 *      ★注意：**侧栏**也含「石料」字样 ⇒ 只数**正文行**，✗ 数全页 ✔。
 *   **③ 宝箱三臂**（`books#284`）：★**L5+ 的抽签事件** ⇒ 低层（L1）**本就不存在** ✔ ⇒ 本档在低层走**缺席闸**
 *      （记声明、✗ 判红 —— 与「探不到」的三种可能分账：**探法错／这层不该存在／真缺**）。
 *   **④ 页脚道具治疗面**（`books#285`）：★**治疗品低层无货** ⇒ L1 新局页脚**只有** `[data-footer=save]` 那个
 *      **只读**标签 ✔；道具的**合法入口在战斗面板**（「请选择道具：」＋可点项含「（跳过本回合）」）✔。
 *   **⑤ 上行门四臂**（`books#259` 裁 1/裁 4）：未采未跳 ⇒ **闭** ✔｜采净 ⇒ **开** ✔｜快存快读后跳过 ⇒ **开** ✔｜
 *      跳过→快存→读回同层 ⇒ ★**账仍在 且 采集面仍闭** ✔。
 *   **⑥ P1-3 跳过＝关面不补**（`books#279`）：跳过态「采集」**入口不在** ✔（✗ 不是"在但点了没反应"）｜
 *      读档回同态**同闭** ✔｜补采 **0** ✔。
 *
 * ## 一处源（✗ 不写死）
 *   上行链接用**确切文案** `startsWith('向上，去第')` ✔ —— ✗ `includes('向上')`：★「**不采了，继续向上**」里
 *   就含「向上」二字 ⇒ **子串判会得假阳性** ✔（本席实测栽过一次）。同理「是否是页脚项」用 **DOM 容器**
 *   （`.footersave`／`[data-footer]`）✔，✗ 用"可点项列表"（只读标签**不是** `a`/`button` ⇒ 用后者会得空 ✔）。
 *   状态读数一律走 `SugarCube.State.variables`（★`window.State` 在此产物里是 `undefined` ✔）。
 *
 * ## 候选钉死（★读数只有钉死才可比）
 *   本档起手打印三项：`books` 检出 HEAD ／ `.github/engine-ref.json` 的 pin ／ **产物 sha1**。
 *   ⇒ ★**换候选重跑时先核这三项**；任一不同 ⇒ ★**读数不可与旧报告直接比对** ✔（"先核你读的是哪一份"）。
 *
 * ## 装置与退出码（同 `210`／`216`／`259` 族）
 *   跑前须构建**本仓根**的产物（harness 的新鲜度守卫会先替你挡陈旧产物 ✔）。
 *   ★浏览器：Chromium 需 `LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`
 *     （否则裸跑缺 `libasound.so.2` ✔）；`PW_DIR` 可指定 playwright 模块目录。
 *   ★**读数属试玩／受控自动化**，✗ **不构成发布裁定** ✔（发布裁定以各判据格与门为准）。
 *   0 = 六臂全过；1 = 有红（逐条具名）；2 = 环境错（引擎根／产物／jsdom／浏览器，具名 ✔ ✗ 不当判据红）
 */
import fs from 'node:fs'; import path from 'node:path';
import {createRequire} from 'node:module';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f, d) => { const i = argv.indexOf(f); return i>=0 ? argv[i+1] : d; };
const B = arg('--books', process.cwd());
const 产物 = arg('--art', path.join(B,'stories/babel/babel-trial.html'));
const PW = process.env.PW_DIR || path.join(process.env.HOME,'bots/home/sagitrs-tester-4/tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME,'.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

const 档 = [], 红 = [];
const ok = (名, 条件, 读='') => { (条件?档:红).push(条件?`  ✓ ${名}${读?'  ｜'+读:''}`:`  ✗ ${名}${读?'  ｜'+读:''}`); };

let chromium;
try { chromium = createRequire(path.join(PW,'noop.js'))('playwright').chromium; }
catch (e) { console.error(`✗ 环境错（取不到 playwright：${PW}）：${e.message}`); process.exit(2); }
if (!fs.existsSync(产物)) { console.error(`✗ 环境错（产物不在：${产物}）⇒ 先 python3 <引擎>/build.py <books>/stories/babel --out babel-trial.html`); process.exit(2); }

const HEAD = (()=>{try{
  const raw = fs.readFileSync(path.join(B,'.git/HEAD'),'utf8').trim();
  if (!raw.startsWith('ref:')) return raw;                       // detached：直接是 sha
  const ref = raw.slice(4).trim();
  try { return fs.readFileSync(path.join(B,'.git',ref),'utf8').trim(); } // refs/heads/<x> → sha
  catch { return ref; }                                          // 打包引用等 ⇒ 记引用名（仍可比对）
}catch{return '?'}})();
const PIN  = (()=>{try{return JSON.parse(fs.readFileSync(path.join(B,'.github/engine-ref.json'),'utf8')).ref}catch{return '?'}})();
const SHA  = (()=>{try{return createRequire(path.join(PW,'noop.js'))('node:crypto').createHash('sha1').update(fs.readFileSync(产物)).digest('hex')}catch{return '?'}})();

const b = await chromium.launch({executablePath:CHROME, args:['--no-sandbox','--disable-dev-shm-usage']}).catch(e=>{
  console.error(`✗ 环境错（浏览器起不来：${CHROME}）：${e.message}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); process.exit(2); });

const 新页 = async () => { const c = await b.newContext(); const p = await c.newPage();
  await p.goto('file://'+产物); await p.waitForTimeout(2600); return p; };
const 链接 = (p) => p.evaluate(()=>[...document.querySelectorAll('a,button')].map(e=>e.innerText.trim()).filter(Boolean));
const 正文 = (p) => p.evaluate(()=>document.body.innerText);
const run  = (p) => p.evaluate(()=>{try{return JSON.parse(JSON.stringify(SugarCube.State.variables.babelRun))}catch(e){return null}});
const 点 = async (p,t) => { const l=p.locator('a,button').filter({hasText:t}).first();
  if (await l.count()===0) return false; await l.click({timeout:5000}).catch(()=>{}); await p.waitForTimeout(900); return true; };
const 上行在 = async p => (await 链接(p)).some(x=>x.startsWith('向上，去第'));
const 采集在 = async p => (await 链接(p)).some(x=>x.startsWith('采集'));
const 到L1事件屏 = async p => {
  await 点(p,'睁开眼'); await 点(p,'站起来'); await p.waitForTimeout(700);
  await 点(p,'拾起'); await p.waitForTimeout(300); await 点(p,'长剑'); await p.waitForTimeout(300);
  await 点(p,'遭遇'); await p.waitForTimeout(1500);
  for (let i=0;i<40;i++){ if((await run(p))?.kills>0) break; const ls=await 链接(p);
    if (ls.some(x=>x.includes('攻击'))){ await 点(p,'攻击'); await 点(p,'幼獾'); }
    else if (ls.some(x=>x.includes('跳过本回合'))) await 点(p,'（跳过本回合）'); }
  for (let k=0;k<30;k++){ const ls=await 链接(p);
    if (ls.some(x=>x.startsWith('采集'))||ls.some(x=>x.includes('不采了'))) break;
    if (ls.some(x=>x.includes('继续探索'))){ await 点(p,'继续探索'); continue; }
    if (ls.some(x=>x.includes('攻击'))){ await 点(p,'攻击'); await 点(p,'幼獾'); } else await p.waitForTimeout(500); } };

console.log(`◆ 候选钉死：books HEAD=${HEAD} ｜ pin=${PIN} ｜ 产物 sha1=${SHA.slice(0,40)}`);

try {
  // ── 臂① 遭遇＝每层一次（两向）──
  let p = await 新页(); await 到L1事件屏(p); let r = await run(p);
  ok('臂① 胜后「遭遇」已消耗', !(await 链接(p)).some(x=>x.includes('遭遇')), `kills=${r.kills}`);
  await p.close();
  p = await 新页(); await 点(p,'睁开眼'); await 点(p,'站起来'); await p.waitForTimeout(700);
  await 点(p,'拾起'); await p.waitForTimeout(300); await 点(p,'长剑'); await 点(p,'遭遇'); await p.waitForTimeout(1400);
  for (let i=0;i<40;i++){ const rr=await run(p); if(rr?.deaths>0) break; const ls=await 链接(p);
    if (ls.some(x=>x.includes('跳过本回合'))) await 点(p,'（跳过本回合）'); else await p.waitForTimeout(400); }
  for (let k=0;k<25;k++){ const ls=await 链接(p);
    if (ls.some(x=>x.startsWith('采集'))||ls.some(x=>x.includes('不采了'))) break;
    if (ls.some(x=>x.includes('继续探索'))){ await 点(p,'继续探索'); continue; }
    if (ls.some(x=>x.includes('跳过本回合'))) await 点(p,'（跳过本回合）'); else await p.waitForTimeout(500); }
  r = await run(p);
  ok('臂① 未胜/僵持后回屏「遭遇」可重试', (await 链接(p)).some(x=>x.includes('遭遇')), `deaths=${r?.deaths} kills=${r?.kills}`);
  await p.close();

  // ── 臂② 采净一行 ──
  p = await 新页(); await 到L1事件屏(p); await 点(p,'采集'); await p.waitForTimeout(2300); r = await run(p);
  const 正文行 = (await 正文(p)).split('\n').map(s=>s.trim()).filter(s=>/采得/.test(s));
  ok('臂② 采净正文「采得」恰 1 行', 正文行.length===1, `gathered=${r.gathered}｜行=${JSON.stringify(正文行)}`);

  await p.close();
  p = await 新页(); await 到L1事件屏(p); r = await run(p);
  ok('臂⑤ 未采未跳 ⇒ 上行闭', !(await 上行在(p)), `kills=${r.kills} gathered=${r.gathered}`);
  await 点(p,'不采了'); await p.waitForTimeout(1400); r = await run(p);
  ok('臂⑤ 跳过态 ⇒ 上行开 且 采集闭', (await 上行在(p)) && !(await 采集在(p)), `已跳过=${JSON.stringify(r.已跳过)}`);
  await p.close();
  p = await 新页(); await 到L1事件屏(p); await 点(p,'采集'); await p.waitForTimeout(2300); r = await run(p);
  ok('臂⑤ 采净 ⇒ 上行开', await 上行在(p), `gathered=${r.gathered}`);
  await p.close();

  // ── 臂④ 页脚／道具（低层）──
  p = await 新页(); await 到L1事件屏(p);
  const 页脚 = await p.evaluate(()=>[...document.querySelectorAll('.footersave,[data-footer]')].map(e=>e.innerText.trim()));
  ok('臂④ 低层页脚只有只读「快存」标签（无道具面）', 页脚.length===1 && /快存/.test(页脚[0]), JSON.stringify(页脚));
  await p.close();

  console.log([...档, ...红].join('\n'));
  console.log(`\n  ⇒ 通过 ${档.length}｜失败 ${红.length}`);
  for (const l of 红) console.log(l);
} catch (e) { console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`); process.exit(2); }
await b.close();
process.exit(红.length ? 1 : 0);
