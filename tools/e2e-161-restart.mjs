#!/usr/bin/env node
/* `#161` · **`:enginerestart` 处理器族**的真浏览器臂（判据面对：**无人触发过该事件**）
 *
 * ## 为什么需要它（票面读数）
 * 本仓故事侧 `world/boss.js` 绑了一个 `:enginerestart` 处理器（重开 ⇒ 头目复位）：
 *   · **源码面**：命中五处（注释×3 ＋ 判据正则 ＋ 绑定那一行），**没有一处触发它**；
 *   · **驾驶层**：`tools/e2e-drive.mjs` 命中 **0**；
 *   · **引擎侧**：`tests/unit/**` **无触发用例**，且 `tests/unit/dnd3/characters.test.js:34` **明文绕开**
 *     （「jQuery shim 无法触发 `:enginerestart`」）。
 *   ⇒ 于是「头目重开复位」这条链**只被静态核过绑定文本**，✗ 没有任何一面证明**事件真到时它会被调用**。
 *   ★本臂补的正是那一步：在**真 DOM ＋ 真 jQuery** 下**真触发**该事件，再看**后果**。
 *
 * ## 判据（两向 ＋ 缺席闸）
 *   ① **前置**：把引擎里的头目实例**打成「已打过」**（`hp = 0` ＋ 挂一个 `effects`）⇒ 记录读数；
 *   ② **真触发**：`jQuery(document).trigger(':enginerestart')`（★✗ 不调 `Engine.restart()` —— 它**整页重载**，
 *      重载后状态本就全新 ⇒ 会**恒真假绿**；理由见下第 53 行）；
 *   ③ **后果**：重开后头目实例须 `hp === maxHp` **且** `effects === []`；
 *   ④ **两向**：*不打成「已打过」* 而直接触发 ⇒ 段①的读数**分辨不出来** ⇒ 先断「① 与 ③ 不同」才说明本臂**判得了**；
 *   ⑤ **缺席闸**：拿不到头目面（`setup.BABEL.头目.不眠者` 不在）⇒ 印 ⏳ 待判，**✗ 不计红 ✗ 不计绿**。
 *
 * ## 用法与退出码
 *   LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu \
 *     node tools/e2e-161-restart.mjs --books <books 检出> [--art <产物>] [--knife]
 *   0 = 通过（或待判）；1 = 有红（逐条具名）；2 = 环境错（装置，✗ 不当判据红）
 *   `--knife`：把绑定的处理器**换成空函数**再跑 ⇒ 必须红（证明本臂判得了 ⇒ 刀）
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

const 刀 = has('--knife');
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const 错 = (m) => { console.error(`✗ 装置错（✗ 不当判据红）：${m}`); process.exit(2); };
if (!fs.existsSync(产物)) 错(`缺产物：${产物}（先 build.py 重烘）`);

const require_ = createRequire(path.join(PW, 'noop.js'));
let chromium; try { ({ chromium } = require_('playwright')); } catch (e) { 错(`取不到 playwright（PW_DIR=${PW}）：${e.message}`); }

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const p = await (await b.newContext()).newPage();
const 页错 = []; p.on('pageerror', (e) => 页错.push(String(e.message).slice(0, 100)));
await p.goto('file://' + 产物 + '?cb=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
await p.waitForTimeout(3000);
const 点 = async (t) => { const l = p.locator('#passages a,#passages button').filter({ hasText: t }).first();
  if (await l.count()) { await l.click({ timeout: 6000 }).catch(() => {}); await p.waitForTimeout(1800); return true; } return false; };
await 点('战斗教学');

/* ★为何**直接触发事件**、✗ 不调 `Engine.restart()`：
 *   `Engine.restart()` 会**整页重载**（实测：evaluate 里调它 ⇒ `Execution context was destroyed` ✗），
 *   而重载之后**状态本就全新** ⇒ 「头目复位了」会变成**恒真**（✗ 就算没有处理器也会过）＝假绿 ✓。
 *   ⇒ 本臂触发的是**同一个事件**（处理器听的就是它）；这样状态**不重载** ⇒ 读得到**处理器造成的**差 ✓。 */
const r = await p.evaluate(async (刀) => {
  const S = window.SugarCube;
  const H = S?.setup?.BABEL?.头目;
  const 敌 = H?.不眠者;
  if (!敌) return { 待判: '拿不到头目面（`setup.BABEL.头目.不眠者` 不在）⇒ 本探不成立' };
  const JQ = window.jQuery || window.$;
  if (typeof JQ !== 'function') return { 待判: '拿不到 jQuery（真浏览器里也没有）⇒ 触发面不成立' };
  const 读 = () => ({ hp: Number(敌.hp), maxHp: Number(敌.maxHp), effects: JSON.parse(JSON.stringify(敌.effects ?? [])) });
  敌.hp = 0; 敌.effects = ['探针-上一局残留'];                  // ★打成「已打过」
  const 前 = 读();
  /* ★刀：换**事件名**（处理器听的是 `:enginerestart`）⇒ 它**不该**跑 ⇒ 断言必须红 ✓ */
  const 事 = 刀 ? ':enginerestart-刀' : ':enginerestart';
  try { JQ(document).trigger(事); } catch (e) { return { 错: 'trigger 抛：' + e.message, 前 }; }
  await new Promise((r) => setTimeout(r, 300));
  const 后 = 读();
  return { 前, 后, 事, 两向可分辨: 前.hp !== 后.hp || JSON.stringify(前.effects) !== JSON.stringify(后.effects) };
}, 刀);

console.log('  ── `#161` `:enginerestart` 处理器族（真浏览器 · 真触发）');
if (r.待判) { console.log(`  ⏳ 待判：${r.待判}`); await b.close(); process.exit(0); }
if (r.错) { console.log(`  ✗ ${r.错}`); await b.close(); process.exit(1); }
const 合格 = r.后.hp === r.后.maxHp && (r.后.effects ?? []).length === 0;
console.log(`  ① 前置（打成「已打过」）：hp ${r.前.hp}/${r.前.maxHp}｜effects ${JSON.stringify(r.前.effects)}`);
console.log(`  ③ 真触发后：hp ${r.后.hp}/${r.后.maxHp}｜effects ${JSON.stringify(r.后.effects)}`);
console.log(`  ${合格 ? '✓' : '✗'} 重开后头目须复位（hp === maxHp 且 effects 清空）`);
console.log(`  ${r.两向可分辨 ? '✓' : '✗'} 两向可分辨（①与③读数不同 ⇒ 本臂判得了，✗ 恒真）`);
if (页错.length) console.log(`  ⚠ 页面错误：${JSON.stringify(页错.slice(0, 2))}`);
const 通过 = 合格 && r.两向可分辨 && 页错.length === 0;
console.log(`\n  ⇒ ${通过 ? '通过 1｜失败 0' : '通过 0｜失败 ' + [合格, r.两向可分辨].filter((x) => !x).length}`);
await b.close();
process.exit(通过 ? 0 : 1);
