#!/usr/bin/env node
/* `books#280` ⑫ · **存档栏位可用性**（保留槽守卫在重渲染后是否仍有效 ＋ 连删后栏位是否仍可用）
 *   的真浏览器臂（CDP · 同 `e2e-280-playtest.mjs` 族形）。
 *
 * ## 判谁（两臂 ＋ 一闸）
 *   **臂① 保留槽守卫须**对重渲染幂等**（`books#280` ⑫ 的确定性复现）**：
 *     开 `UI.saves()` ⇒ 取保留槽行 ⇒ 经故事侧写口（`setup.BABEL.快存(<保留码>)`）写它 ⇒
 *     对话框**重渲染后**，该行**仍**须：有系统标记（行类 `rpg-reserved-row` 或文含「（系统）」）
 *     **且**其行内控件不可用（`disabled`）✓。
 *     ★**现况＝红**：重渲染把标记/禁用整片抹掉 ⇒ 保留槽重新对玩家可删/可载（确定性复现 ✓）。
 *   **臂② 连删 N≥10 后，栏位仍可用**（行为级，✗ 不看类名）：
 *     每轮删一个可用槽 ⇒ 再对**非保留码**逐个做**行为探测**（清掉该码 ⇒ 点该行 `save` 钮 ⇒ 读
 *     `Save.slots.has(码)`)⇒ 全须为真 ✓。★这是唯一抓得住「被克隆掉监听器」的探法：
 *     克隆**保留类名与 id**、只丢监听器 ⇒ 只有行为探测能分辨 ✓。
 *
 * ## ★缺席闸（✗ 假红 ✗ 假绿）
 *   若该面**本就不在**（没有 `SugarCube.UI.saves`／`#saves-list` 渲染不出／没有 `RPG.reservedSlots`
 *   ⇒ 例如更旧的引擎树）⇒ 印 **⏳ 待判** 并写明据以判定的事实，**✗ 计红 ✗ 计绿**。
 *
 * ## 用法与退出码
 *   LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu \
 *     node tools/e2e-280-save-delete.mjs --books <books 检出> [--art <产物>] [--rounds N]
 *   node tools/e2e-280-save-delete.mjs --selftest      # ★双刀的牙齿自证（合成样本，✗ 不碰真盘）
 *   0 = 两臂过（或待判）；1 = 有红（逐条具名）；2 = 环境错（装置，✗ 不当判据红）
 *   ★`PW_DIR`（缺省 `~/tmp/pw`）须是含 `playwright` 的目录。
 */
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { createRequire } from 'node:module';
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const B = path.resolve(arg('--books', process.cwd()));
const 产物 = path.resolve(arg('--art', path.join(B, 'stories/babel/babel-trial.html')));
/* ★产物新鲜度守卫（`tools/bundle-fresh.mjs` 共享件）：本臂只认预构建产物 ⇒
 *   陈旧 ⇒ 读的是上一版源码（读数看着对、量的不是当前树）⇒ 具名红退出。 */
{ const { 断产物新鲜 } = await import('./bundle-fresh.mjs');
  try { 断产物新鲜({ 产物: 产物, 引擎根: process.env.ENGINE ?? process.env.E, 仓根: process.cwd() }); }
  catch (e) { console.error(String(e?.message ?? e)); process.exit(2); } }

const 轮数 = Number(arg('--rounds', '10'));
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

/* ============ 判据本体（★主流程与 --selftest 共用；✗ 不写两套 ✓）============ */
/** 行是否被标成保留槽（两类证据取其一 ✓）。行形：{行类, 文, 钮:[{id,dis,cls}]} */
export function 判保留行(行) {
  const 有标记 = /rpg-reserved-row/.test(行?.行类 || '') || /（系统）/.test(行?.文 || '');
  const 控件 = (行?.钮 || []).filter((b) => /save|delete/.test(b.id || ''));
  const 全禁 = 控件.length > 0 && 控件.every((b) => b.dis === true);
  return { 有标记, 控件数: 控件.length, 全禁, 合格: 有标记 && 全禁 };
}
/** 臂② 行为探测汇总：各码的 has 结果 ⇒ 不合格的码。 */
export function 判栏位可用(各码结果) {
  return Object.entries(各码结果 || {}).filter(([, v]) => v !== true).map(([k]) => k);
}
/** 臂① 的**中间态**读数（★`books#280` ⑫ 的诊断面 —— 分「没叫醒」vs「没锁上」，✗ 不只印 `有标记=false`）。
 *  入形 ｛观察者醒, 取到行, 锁上｝（引擎侧将来给的机读面 `setup.RPG.reservedSlots.lastRun`）⇒ 出三态判定。
 *  ★写它的理由：`#2015` 作者自陈「**凭推断改了六轮**，唯一直击真因的是**把中间态打出来**」——
 *    本函数把那句教训**固化进读数** ✓。★面不在（引擎未给）⇒ `不成立:true`（✗ 计红 ✗ 假绿 ✓）。 */
export function 判处理回({ 观察者醒, 取到行, 锁上 } = {}, 有标记 = null) {
  const n = (x) => (Number.isFinite(x) ? x : null);
  const 醒 = n(观察者醒), 取 = n(取到行), 锁 = n(锁上);
  if (醒 === null) return { 不成立: true, 态: '待判', 说明: `未见机读面（观察者醒=${JSON.stringify(观察者醒)}）⇒ 本探不成立` };
  if (醒 === 0) return { 不成立: false, 态: '没叫醒', 说明: `观察者根本没被叫醒（醒=0）⇒ 守卫 ✗ 未重跑` };
  /* ★★这一句是**被真读数校正过**的（`2026-10-05` 首次接通）：`锁一行` 遇 `已有标记(行)` 即 return false
   *   ⇒ **重渲染那趟的行早被上趟标好了** ⇒ 「本趟新锁=0」是**正常** ✗ 不是「没锁上」。
   *   ⇒ 判据须**结合「行此刻是否在保护中」**（`有标记=true`）⇒ 才分得出「**已锁（幂等）**」与「真没锁上」✓。 */
  if (锁 === 0) {
    if (有标记 === true) return { 不成立: false, 态: '已锁（幂等）', 说明: `醒了（醒=${醒}、取到行=${JSON.stringify(取)}）本趟**没有新锁**（锁上=0）但行**已在保护中**（有标记=true）⇒ ★这是**幂等**的正常形 ✓` };
    return { 不成立: false, 态: '没锁上', 说明: `醒了（醒=${醒}、取到行=${JSON.stringify(取)}）本趟无新锁（锁上=0）**且行不在保护中**（有标记=${JSON.stringify(有标记)}）⇒ 取行/选中/标记环节坏了` };
  }
  return { 不成立: false, 态: '正常', 说明: `醒=${醒}｜取到行=${JSON.stringify(取)}｜锁上=${锁}` };
}

/* ============ --selftest：双刀（★合成样本 ⇒ 判据的期望不与被测物同源 ✓）============ */
if (has('--selftest')) {
  const 红 = [];
  const 检查 = (n, c, 读) => { if (!c) 红.push(`  ✗ ${n}  ｜${读}`); else console.log(`  ✓ ${n}  ｜${读}`); };
  // 刀 1：**拿掉「重跑」后的形**（标记丢）⇒ 臂① 须判不合格（这正是「摘守卫重跑 ⇒ 具名红」的形）
  const 坏 = { 行类: '', 文: '未入层 槽位 4 • 10/5/2026, 12:48:43 AM', 钮: [{ id: 'saves-load-3', dis: false, cls: 'load' }, { id: 'saves-delete-3', dis: false, cls: 'delete' }] };
  检查('K1 刀1：守卫重跑缺失的形（标记丢）⇒ 臂① 不合格', 判保留行(坏).合格 === false, JSON.stringify(判保留行(坏)));
  // 好形：标记在 ＋ 控件禁
  const 好 = { 行类: 'rpg-reserved-row', 文: '槽位 4 （系统）', 钮: [{ id: 'saves-save-3', dis: true, cls: 'save rpg-reserved' }, { id: 'saves-delete-3', dis: true, cls: 'delete rpg-reserved' }] };
  检查('K2 正例：标记在且控件禁 ⇒ 臂① 合格', 判保留行(好).合格 === true, JSON.stringify(判保留行(好)));
  // 半吊子：标记在但控件没禁 ⇒ ✗ 不算合格（防「只加文案」蒙过）
  const 半 = { 行类: 'rpg-reserved-row', 文: '槽位 4 （系统）', 钮: [{ id: 'saves-save-3', dis: false, cls: 'save' }] };
  检查('K3 只加标记不禁控件 ⇒ 臂① 不合格', 判保留行(半).合格 === false, JSON.stringify(判保留行(半)));
  // 刀 2：**克隆掉 handler 的形**＝看着正常但点了不落档 ⇒ 臂② 须报出该码
  const 失效 = 判栏位可用({ 0: true, 1: true, 5: false, 6: true });
  检查('K4 刀2：某码点了不落档 ⇒ 臂② 报出该码', JSON.stringify(失效) === '["5"]', JSON.stringify(失效));
  检查('K5 正例：全部落档 ⇒ 臂② 无不合格', 判栏位可用({ 0: true, 5: true }).length === 0, '[]');
  // K6 缺控件/空行 ⇒ ✗ 不留死角
  检查('K6 无控件的行 ⇒ 臂① 不合格', 判保留行({ 行类: 'rpg-reserved-row', 文: '槽位 4 （系统）', 钮: [] }).合格 === false, '控件数 0');
  // K7/K8/K9：臂① 的**中间态**三态（★分「没叫醒」vs「没锁上」）＋ K10 面不在 ⇒ 不成立
  检查('K7 醒=0 ⇒ 「没叫醒」', 判处理回({ 观察者醒: 0, 取到行: 0, 锁上: 0 }).态 === '没叫醒', 判处理回({ 观察者醒: 0, 取到行: 0, 锁上: 0 }).说明);
  检查('K8 醒>0 但锁上=0 ⇒ 「没锁上」', 判处理回({ 观察者醒: 3, 取到行: 2, 锁上: 0 }).态 === '没锁上', 判处理回({ 观察者醒: 3, 取到行: 2, 锁上: 0 }).说明);
  检查('K9 醒>0 且锁上>0 ⇒ 「正常」', 判处理回({ 观察者醒: 3, 取到行: 3, 锁上: 3 }).态 === '正常', 判处理回({ 观察者醒: 3, 取到行: 3, 锁上: 3 }).说明);
  检查('K9b ★锁上=0 但行已在保护中 ⇒ 「已锁（幂等）」（✗ 不误报「没锁上」）', 判处理回({ 观察者醒: 1, 取到行: 2, 锁上: 0 }, true).态 === '已锁（幂等）', 判处理回({ 观察者醒: 1, 取到行: 2, 锁上: 0 }, true).说明);
  检查('K9c ★锁上=0 且行不在保护中 ⇒ 「没锁上」（真缺陷）', 判处理回({ 观察者醒: 1, 取到行: 2, 锁上: 0 }, false).态 === '没锁上', 判处理回({ 观察者醒: 1, 取到行: 2, 锁上: 0 }, false).说明);
  检查('K10 ★面不在（引擎未给机读面）⇒ **不成立**（✗ 不当红 ✗ 假绿）', 判处理回({}).不成立 === true, 判处理回({}).说明);
  console.log(红.length ? `\n  ⇒ 自检失败 ${红.length} 条\n${红.join('\n')}` : '\n  ⇒ 自检：**12/12** 如期（K1–K6 证臂①/②/③ 的函数 ✓；★K7–K10 证臂① 的**中间态三态**：K7 没叫醒／K8 没锁上／K9 正常／K10 面不在⇒不成立 ✓）');
  process.exit(红.length ? 1 : 0);
}

/* ============ 主流程（真浏览器，照本席探针形 ✓）============ */
if (!fs.existsSync(产物)) {
  console.error(`✗ 环境错（产物不在）：${产物}\n  ★先构建：python3 <引擎>/build.py "<books>/stories/babel" --out "<该绝对路径>" --version v0.0.3·<短sha>`);
  process.exit(2);
}
const { chromium } = createRequire(path.join(PW, 'noop.js'))('playwright');
let b;
try { b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
catch (e) { console.error(`✗ 环境错（浏览器起不来：${CHROME}）：${e?.message ?? e}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`); process.exit(2); }

const 档 = [], 红 = [], 待 = [];
const ok = (n, c, 读 = '') => { (c ? 档 : 红).push(`${c ? '  ✓' : '  ✗'} ${n}${读 ? '  ｜' + 读 : ''}`); };
const 新页 = async () => { const c = await b.newContext(); const p = await c.newPage(); await p.goto('file://' + 产物); await p.waitForTimeout(2600); return p; };
const 求 = (p, e) => p.evaluate(e);
const 点 = async (p, t) => { const l = p.locator('a,button').filter({ hasText: t }).first(); if (!await l.count()) return false; await l.click({ timeout: 5000 }).catch(() => {}); await p.waitForTimeout(700); return true; };
const 开弹 = async (p) => { await 求(p, `(function(){try{SugarCube.UI.saves()}catch(e){try{UI.saves()}catch(e2){}}})()`); await p.waitForTimeout(900); };
const 保留码 = (p) => 求(p, `(function(){try{const r=SugarCube.RPG?.reservedSlots?.()??window.RPG?.reservedSlots?.();
  if(Array.isArray(r)&&r.length) return r; const B=SugarCube.setup?.BABEL; return B?.槽位? Object.values(B.槽位).filter(Number.isInteger):null;}catch(e){return null}})()`);
/** 逐行取形（★与判据函数的输入形一致 ✓） */
const 行形 = (p) => 求(p, `(()=>{const l=document.getElementById('saves-list'); if(!l) return null;
  return [...l.querySelectorAll('tr')].map(tr=>{const bs=[...tr.querySelectorAll('button,a')];
    return {行类:(tr.className||''), 文:(tr.innerText||'').replace(/\\s+/g,' ').trim(),
      码:(bs.map(b=>/saves-(?:save|load|delete)-(\\d+)/.exec(b.id||'')).find(Boolean)||[])[1] ?? null,
      钮:bs.map(b=>({id:b.id||'', dis:!!b.disabled, cls:(b.className||'')}))};});})()`);
const 有档 = (p, 码) => 求(p, `(function(){try{return SugarCube.Save.slots.has(${码})}catch(e){return 'ERR'}})()`);
const 造 = (p, 码) => 求(p, `(function(){try{SugarCube.Save.slots.save(${码});return 'ok'}catch(e){return 'ERR'}})()`);
const 清 = (p, 码) => 求(p, `(function(){try{SugarCube.Save.slots.delete(${码});return 'ok'}catch(e){return 'ERR'}})()`);

try {
  const p = await 新页(); await 点(p, '战斗教学'); await p.waitForTimeout(600);
  await 开弹(p);
  /* ── 缺席闸：该面在不在 ── */
  const 面在 = await 行形(p);
  const 保 = await 保留码(p);
  if (!面在 || !面在.length || !Array.isArray(保) || !保.length) {
    待.push(`  ⏳ 待判（该面缺席）：#saves-list 行数=${面在 ? 面在.length : 'null'}｜保留码=${JSON.stringify(保)}`);
    待.push('     据以判定：存档弹窗未能渲染，或引擎/故事未暴露保留槽号 ⇒ ✗ 计红 ✗ 计绿');
  } else {
    /* ── 臂① 保留槽守卫须对重渲染幂等 ── */
    const 码 = 保[0];
    const 前 = (await 行形(p)).find((r) => String(r.码) === String(码));
    const 写 = await 求(p, `(function(){try{const f=SugarCube.setup?.BABEL?.['快存']; if(typeof f!=='function') return 'no-fn';
      f(${码}); return 'ok'}catch(e){return 'ERR:'+String(e).slice(0,50)}})()`);
    await p.waitForTimeout(1200); await 开弹(p);
    const 后 = (await 行形(p)).find((r) => String(r.码) === String(码));
    /* ★中间态读数（本笔加）：引擎侧若给了机读面 `setup.RPG.reservedSlots.lastRun` ⇒ 印「处理回」（分三态 ✓）；
     *   ★面不在 ⇒ 本条**不成立**（✗ 不假绿），并明印「引擎未给机读面」⇒ 待引擎侧那一笔落下后自动真判 ✓。 */
    const 面 = await 求(p, `(function(){try{const r=SugarCube.RPG?.reservedSlots?.lastRun ?? window.RPG?.reservedSlots?.lastRun; return r?JSON.stringify(r):null}catch(e){return null}})()`);
    let 回 = '';
    if (面) { let o = null; try { o = JSON.parse(面); } catch (e) {} const w = 判处理回(o || {}, 判保留行(后).有标记); 回 = `｜★处理回：${w.态}（${w.说明}）`; }
    else 待.push('  ⏳ 待判（臂① 中间态）：★引擎未给机读面（`setup.RPG.reservedSlots.lastRun` 不在）⇒ 本探不成立（✗ 不假绿）');
    const v = 判保留行(后);
    ok('臂① 保留槽（码 ' + 码 + '）写入并**重渲染后**仍受保护（系统标记 ＋ 控件不可用）',
       v.合格 === true, `写口=${写}｜写前合格=${判保留行(前).合格}｜写后 有标记=${v.有标记} 全禁=${v.全禁}｜行文="${(后?.文||'').slice(0,40)}"${回}`);;
    /* ── 臂② 连删 N 轮后栏位仍可用（行为级）── */
    const 码池 = (await 行形(p)).map((r) => Number(r.码)).filter((n) => Number.isInteger(n) && !保.includes(n));
    let 首坏 = null, 装置可疑 = null;
    for (let i = 1; i <= 轮数; i++) {
      await 开弹(p);
      await 求(p, `(function(){const l=document.getElementById('saves-list'); if(!l) return 0;
        const b=[...l.querySelectorAll('button, a')].find(x=>/saves-delete-/.test(x.id||'')&&!x.disabled); if(b)b.click(); return 1})()`);
      await p.waitForTimeout(200);
      await 求(p, `(function(){const b=[...document.querySelectorAll('button,a')].find(x=>/^(确定|确认|删除|是)/.test((x.innerText||'').trim())); if(b)b.click()})()`);
      await p.waitForTimeout(250);
      await 开弹(p);
      const 结果 = {}; let 未找到钮 = 0;
      for (const c of 码池.slice(0, 4)) {   // ★抽样 4 个非保留码（够快且能抓「整片失效」）
        await 清(p, c);
        /* ★**前置等待**：删/清后对话框是**异步重渲染**的 —— 必须轮询到该行回到**空槽形**
           （`#saves-save-<码>` 重新出现）再点；✗ 在 60ms 内就点会点到「已占形」（只有 `load` 钮）
           ⇒ 找不到钮 ⇒ 不落档 ⇒ **伪红**（本席实踩一次，见 PR 说明 ✓）。 */
        let 就绪 = false;
        for (let k = 0; k < 12; k++) {
          就绪 = await 求(p, `(function(){const b=document.getElementById('saves-save-${c}'); return !!(b && !b.disabled)})()`);
          if (就绪) break; await p.waitForTimeout(150);
        }
        if (!就绪) { 未找到钮++; 结果[c] = 'NO-BTN'; continue; }
        await 求(p, `(function(){const b=document.getElementById('saves-save-${c}'); if(b)b.click()})()`);
        for (let k = 0; k < 10; k++) { if (await 有档(p, c) === true) break; await p.waitForTimeout(150); }
        结果[c] = await 有档(p, c);
      }
      /* ★装置症状单列：**全部**探测都找不到钮 ⇒ 装置可疑 ⇒ 记为装置错（✗ 不当判据红 ✓） */
      if (未找到钮 === 码池.slice(0, 4).length) 装置可疑 = `轮 ${i}：全部探测都找不到可用 save 钮（未就绪 ${未找到钮}）`;
      const 坏码 = 判栏位可用(结果).filter((c) => 结果[c] !== 'NO-BTN');
      if (坏码.length && !首坏) 首坏 = { 轮: i, 坏码, 结果 };
    }
    if (装置可疑) 待.push(`  ⏳ 装置可疑（臂② 不作判据红）：${装置可疑}`);
    ok(`臂② 连删 ${轮数} 轮后**逐行行为探测**仍可用（点 save 真落档）`, 首坏 === null && !装置可疑,
       首坏 ? `首次失败在轮 ${首坏.轮}｜坏码=${JSON.stringify(首坏.坏码)}｜结果=${JSON.stringify(首坏.结果)}` : `探测码=${JSON.stringify(码池.slice(0,4))}`);
    /* ★两臂之外如实记：臂① 用的是**故事侧写口**（✗ 不走手动按钮 ✓），与引擎判据档同源 ✓ */
  }
  await p.close();
  console.log([...档, ...红, ...待].join('\n'));
  console.log(`\n  ⇒ 通过 ${档.length}｜失败 ${红.length}｜待判 ${待.length ? 1 : 0}`);
  for (const l of 红) console.log(l);
} catch (e) { console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`); await b?.close(); process.exit(2); }
await b.close();
process.exit(红.length ? 1 : 0);
