#!/usr/bin/env node
/* `books#280` · **操作者试玩批的真浏览器臂**（L1 面 ＋ 深浅两层）。
 *
 * ## 判谁（**九臂**：①×2 ② ③ ④ ⑤×3 ⑦ —— ★臂名跳号无 ⑥；判据面已由 `verify.mjs` 各格判过，本档只判**玩家真看得到／点得到**那面）
 *   ★★汇总**三列**（`books#614`）：无明账时＝`通过 N｜失败 M`（与旧形逐字节同）；有明账／缺席闸时
 *   **尾列**追加＝`通过 N｜失败 M｜待判/明账 K` —— 明账 ✗ 不得计进「通过」（`workflow.md ## 九`）。
 *   ★★两件事分开：**列位**只决定读的人看不看得到；「明账不得计入通过」靠 `通过` 只数真通过
 *     （`档` 里不再有明账行）＋ `待` 独立成列，**与列位无关**。
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
 *   0 = 九臂全过；1 = 有红（逐条具名）；2 = 环境错（引擎根／产物／jsdom／浏览器，具名 ✔ ✗ 不当判据红）
 */
import fs from 'node:fs'; import path from 'node:path';
import {createRequire} from 'node:module';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const arg = (f, d) => { const i = argv.indexOf(f); return i>=0 ? argv[i+1] : d; };
/* ★相对路径一律先 `path.resolve`（`#287`／`#290` 同源）：否则报错里的路径是相对的，读的人
 *   在别的 cwd 下找不到那个档 —— ★故下面凡"找不到"一律**点名绝对路径**。 */
const B = path.resolve(arg('--books', process.cwd()));
const 产物 = path.resolve(arg('--art', path.join(B,'stories/babel/babel-trial.html')));
const PW = process.env.PW_DIR || path.join(process.env.HOME,'bots/home/sagitrs-tester-4/tmp/pw');
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME,'.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

const 档 = [], 红 = [], 待 = [];
/* ★★汇总行（`books#614`）抽成**纯函数**，使「真通过态」与「明账态」可区分能被自检直打（K5／K6），
 *   而不必跑一次 12 分钟的真浏览器。
 *   ★形（✗ 不改 `e2e-window.yml` —— 它被 `check-ci.mjs:77` 的 `legacy-isolation` 冻结在基座字节上）：
 *     · **无明账**（待＝0）⇒ `⇒ 通过 N｜失败 M`（与旧形**逐字节相同**）；
 *     · **有明账／缺席闸**（待＞0）⇒ **尾列**追加：`⇒ 通过 N｜失败 M｜待判/明账 K`。
 *   ★★两件事分开（✗ 不可混）：**列位**只决定读的人看不看得到这一列；
 *     「**明账不得计入通过**」靠的是 `通过` 只数真通过（`档` 里不再有明账行）＋ `待` 独立成列 —— 与列位无关。
 *   ★故守护串 `通过 10｜失败 0` 的含义是「**`通过` 数达全数**」（判定行恰 10 条），
 *     **不是**「无明账」：全判过但有明账（如低层的**合法缺席**）仍命中 ⇒ ✗ 不制造**步级假红**；
 *     「无明账」那一面由 T 席的 `✓` 行数判据兜底，守护串证不了。 */
const 汇总行 = (通过, 失败, 待判) => 待判 === 0 ? `⇒ 通过 ${通过}｜失败 ${失败}` : `⇒ 通过 ${通过}｜失败 ${失败}｜待判/明账 ${待判}`;
const ok = (名, 条件, 读='') => { (条件?档:红).push(条件?`  ✓ ${名}${读?'  ｜'+读:''}`:`  ✗ ${名}${读?'  ｜'+读:''}`); };

let chromium;
try { chromium = createRequire(path.join(PW,'noop.js'))('playwright').chromium; }
catch (e) { console.error(`✗ 环境错（取不到 playwright：${PW}）：${e.message}`); process.exit(2); }
/* ============ `--selftest`（★判据的牙齿；✗ 不碰真产物 ✓）============ */
if (process.argv.includes('--selftest')) {
  const 红S = [];
  const 检查 = (n, c, 读) => { if (!c) 红S.push(`  ✗ ${n}  ｜${读}`); else console.log(`  ✓ ${n}  ｜${读}`); };
  const 段内样本 = ['拾起', '用已装备长剑攻击', '空手打击', '（跳过本回合）', '采集'];
  const 壳样本 = ['SAVES', 'RESTART', '查看存档', '通知：全部（3）'];
  检查('K1 段内含「攻击」⇒ 要点为真', 要点(段内样本, { 含: '攻击' }) === true, JSON.stringify(要点(段内样本, { 含: '攻击' })));
  // K2 ★★测**主流程实际走的那一步**（`取段内`）：混合给「段内项 ＋ 壳项」⇒ 壳项须被排除 ✓
  const 混合 = [{ 文: '攻击', 在段内: true }, { 文: '查看存档', 在段内: false }, { 文: 'SAVES', 在段内: false }, { 文: '（跳过本回合）', 在段内: true }];
  const 取后 = 取段内(混合);
  检查('K2 混合项 ⇒ `取段内` 排除壳（查看存档／SAVES 不得入集）', !取后.includes('查看存档') && !取后.includes('SAVES') && 取后.includes('攻击'),
       JSON.stringify(取后));
  const 全壳 = 壳样本.map((t) => ({ 文: t, 在段内: false }));
  检查('K2b 全壳项 ⇒ `取段内` 得空集（⇒ 壳里的「查看」进不了可点集 ✓）', 取段内(全壳).length === 0, JSON.stringify(取段内(全壳)));
  检查('K3 前缀形：《采集》真、《不采了，继续向上》假（✗ 子串混淆）', 要点(段内样本, { 前缀: '采集' }) === true && 要点(['不采了，继续向上'], { 前缀: '采集' }) === false,
       `采集=${要点(段内样本, { 前缀: '采集' })}｜不采了=${要点(['不采了，继续向上'], { 前缀: '采集' })}`);
  const 自文 = fs.readFileSync(new URL(import.meta.url), 'utf8');
  const 段内取法数 = (自文.match(/段内链接\(p\)/g) || []).length;
  const 活代码回退 = /const ls=await 链接\(p\)/.test(自文);
  检查('K4 ★四处取法皆为**段内链接**（✗ 不许回退成全文档）', 段内取法数 >= 4 && !活代码回退, `段内取法 ${段内取法数} 处｜活代码回退=${活代码回退}`);
  /* ★★K5／K6／K7（`books#614`）：汇总**三列** —— 明账／缺席闸单列，✗ 不计进通过；
   *   ★并**机械对接门（`e2e-window.yml`）的守护串**：它钉的是「**`通过` 数达全数**」这条因果 ——
   *     全判过（含低层**合法缺席**的明账态）须命中 ⇒ ✗ 不制造步级假红；通过数不足或有红须不命中。 */
  const 判定行数 = (自文.match(/ok\('/g) || []).length;
  const 全绿态 = 汇总行(判定行数, 0, 0), 满数明账态 = 汇总行(判定行数, 0, 2), 缺数明账态 = 汇总行(判定行数 - 3, 0, 2), 有红态 = 汇总行(判定行数 - 3, 3, 0);
  const 门文 = fs.readFileSync(new URL('../.github/workflows/e2e-window.yml', import.meta.url), 'utf8');
  const 守护串 = (门文.match(/run_one tools\/e2e-280-playtest\.mjs\s+'([^']+)'/) || [])[1] || '';
  检查('K5 汇总三列：真通过态与明账态可区分', 满数明账态 !== 全绿态 && /待判\/明账 2/.test(满数明账态) && !/待判\/明账/.test(全绿态), `全绿态=${全绿态}｜满数明账态=${满数明账态}`);
  检查('K6 门守护串只证「通过数达全数」：全判过（含有明账）命中，通过数不足与有红不命中',
       守护串 !== '' && 全绿态.includes(守护串) && 满数明账态.includes(守护串) && !缺数明账态.includes(守护串) && !有红态.includes(守护串),
       `守护串=${JSON.stringify(守护串)}｜全绿含=${全绿态.includes(守护串)}｜满数明账含=${满数明账态.includes(守护串)}｜缺数含=${缺数明账态.includes(守护串)}｜有红含=${有红态.includes(守护串)}`);
  /* ★K7 刀口＝**任何 `· ` 形明账行入 `档`**（✗ 不限于被搬走的那四行字样）—— 下次新增一条明账也抓得到。
   *   ★★契约（K7 以**契约**为覆盖面，✗ 不是「只这四行」）：**本档的明账一律走 `待`，✗ 不走 `档`**。
   *     故将来谁要在 `档` 里放 `·` 行，须先改这条契约（有意识的决定），✗ 不得悄悄回归。
   *   （实证：基座 `5e3a535` 上此形命中 **4** 行、现头 **0** 行；窄形同值 —— 差别在**下次**新增明账。）
   *   ★边界（照实）：只认 `'  · ` 前缀这一形；若明账将来改写成不带 `· ` 的文案，本刀抓不到 ⇒
   *     那一面靠人眼与上面那条契约，✗ 无机械判据。 */
  const 明账入档 = /档\.push\('  · /.test(自文);
  检查('K7 明账／缺席闸不得计进 `档`（机械防回退；刀口＝任何 `· ` 形明账行）', !明账入档, `明账行入档命中=${明账入档}`);
    /* ★②-3 择器（`books#613` 定因）：纯函数直打 —— 出手必须是**武器槽件**，✗ 取菜单首项。
   *   ★本档实测：首项是「用已装备**重木盾**攻击」⇒ 产品具名拒（得穿在身上挡刀）⇒ 回合白过 ⇒ 战斗永不结束。 */
  const 菜单 = ['用已装备重木盾攻击', '用已装备淬火长剑攻击', '空手打击', '（跳过本回合）'];
  const 候 = 菜单.filter(x => /攻击|打击/.test(x));
  检查('K8 ★首项是盾 ⇒ 择器须选**武器槽件**（✗ 取首项）', 择武器槽件(菜单, 候, '淬火长剑') === '用已装备淬火长剑攻击',
       `被选=${JSON.stringify(择武器槽件(菜单, 候, '淬火长剑'))}｜首项=${JSON.stringify(候[0])}`);
  检查('K9 ★刀形：把择器改回"取首项" ⇒ 被选＝盾（非武器槽件）✗ 本格须红', 择武器槽件(菜单, 候, '淬火长剑') !== 候[0],
       `被选=${JSON.stringify(择武器槽件(菜单, 候, '淬火长剑'))}`);
  检查('K10 槽件读不到（空名）⇒ 返回 null（✗ 静默兜底）', 择武器槽件(菜单, 候, '') === null, `实得=${JSON.stringify(择武器槽件(菜单, 候, ''))}`);
  console.log(红S.length ? `\n  ⇒ 自检失败 ${红S.length} 条\n${红S.join('\n')}` : '\n  ⇒ 自检：11/11 如期（K1／K3 判 `要点()`；★K2／K2b 判 `取段内` 的**排除壳**；K4 机械防"取法回退" ✓；★K5／K6／K7 判汇总三列、守护串与明账不回退 —— `books#614` ✓；★K8／K9／K10 判择器只挑武器槽件 —— `books#613` ✓）');
  process.exit(红S.length ? 1 : 0);
}

if (!fs.existsSync(产物)) { console.error(
  `✗ 环境错（产物不在）\n    解析出的**绝对路径**：${产物}\n    （--books 解析为：${B}）\n` +
  `  ⇒ 先 python3 <引擎检出>/build.py ${B}/stories/babel --out babel-trial.html`); process.exit(2); }
if (!fs.existsSync(path.join(B,'.github/engine-ref.json'))) console.error(
  `  ⚠ 提示：--books 解析出的绝对路径 ${B} 里没有 .github/engine-ref.json —— 它可能不是 books 检出`);

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
/* ★**段内可点集**（`books#323` 族体例：本席在 `e2e-280-encounter-stop.mjs` 上先证过 ✓）：
 *   全文档会把 SugarCube 的 **UI 壳**（`SAVES`／`RESTART`／通知条／对话框按钮）也算进"可点项"
 *   ⇒ 「点哪一项」可能点到壳上（壳文案日后含「查看」／「攻击」一类词 ⇒ 子串判**假绿** ✗；或脚本顺手点第一项却点到壳 ⇒ 行为不可解释 ✗）。
 *   ⇒ 判"该点哪一项"一律只取 **`#passages` 段内**；段外的壳另有 `链接()` 供"页脚/壳"面单独判 ✓。 */
const 读链接项 = (p) => p.evaluate(() => [...document.querySelectorAll('a,button')].map((e) => ({ 文: e.innerText.trim(), 在段内: !!e.closest('#passages') })).filter((x) => x.文));
/** ★纯判据：**排除壳**（段外项）⇒ 只留段内文案。★这一步就是"壳标签✗再入可点集"的实现点（可纯测 ✓）。 */
export function 取段内(项) { return (项 || []).filter((x) => x.在段内 === true).map((x) => x.文); }
/** ★段内可点集（＝读＋筛两步；✗ 不再直接用 `#passages` 选择器 —— 否则"排除壳"不可纯测 ✓）。 */
const 段内链接 = async (p) => 取段内(await 读链接项(p));
/** ★纯判据：段内项里"要不要点某一项"（主流程与 `--selftest` 共用 ✓ ⇒ 判据的期望不与被测物同源）。 */
export function 要点(段内文, 形) { return (段内文 || []).some((x) => (形.前缀 ? String(x).startsWith(形.前缀) : String(x).includes(形.含))); }
/* ★②-3 **择器**（纯函数，可自检直打 · `books#606`／`#607` 同形 · `books#613` 定因）：
 *   出手只点**持在武器槽的那一件**；✗ 取列表首项、✗ 名字黑名单；读不到 ⇒ `null`（交回调用方明账）。 */
export function 择武器槽件(链接, 候选, 武器槽名) {
  const L = (链接 || []).map((x) => String(x));
  const 在表 = (候选 || []).filter((x) => L.includes(x));
  if (!在表.length) return null;
  const 槽名 = String(武器槽名 ?? '').trim();
  if (!槽名) return null;
  return 在表.find((x) => x.includes(槽名)) ?? null;
}
const 正文 = (p) => p.evaluate(()=>document.body.innerText);
const run  = (p) => p.evaluate(()=>{try{return JSON.parse(JSON.stringify(SugarCube.State.variables.babelRun))}catch(e){return null}});
/* ★★`点段内`：★**在 `#passages` 段内点**（✗ 不用全文档 `点`）。
 *   ★理由（本席实测）：★`点(p,t)` 是 `p.locator('a,button').filter({hasText:t}).first()` ——
 *   ★**全文档取第一个** ⇒ 光把"看"改成 `段内链接` 只修了一半 ✗：★**点到的仍可能是 SugarCube UI 壳里的那一项**
 *   （★壳里有「快存/查看存档/重开」等；★本席在 `books#323` 认过的正是这一族假绿）。
 *   ★故：★**判"点哪一项"的场合一律用 `点段内`**；★只有确实要看全文档的（如臂④ 页脚）才用 `点`。 */
const 点段内 = async (p,t) => { const l=p.locator('#passages a,#passages button').filter({hasText:t}).first();
  if (await l.count()===0) return false; await l.click({timeout:5000}).catch(()=>{}); await p.waitForTimeout(900); return true; };
const 点 = async (p,t) => { const l=p.locator('a,button').filter({hasText:t}).first();
  if (await l.count()===0) return false; await l.click({timeout:5000}).catch(()=>{}); await p.waitForTimeout(900); return true; };
/* ★②-1 **到达拍**：`books#351` 起由 `onEnter` 的一次性 `choice` 承担 ⇒ **每次进层先停一拍**。
 *   ✗ 先点过它，后面的「拾起／遭遇」一个都取不到 ⇒ 本档会**静默停在拍上**
 *   （★实测：本档因此在当前 main 上「deaths=0 kills=0、gathered=0、已跳过=undefined」全零）。
 *   ★CI ✗ 跑本族 ⇒ 无人照见。取法照 `tools/e2e-drive.mjs` 的 `清到达拍`（同一语义）。 */
const 清到达拍 = async p => { const l=p.locator('.choice-box button').filter({hasText:/^（到达）/});
  if (await l.count()===0) return false; await l.first().click({timeout:4000}).catch(()=>{}); await p.waitForTimeout(700); return true; };
const 上行在 = async p => (await 链接(p)).some(x=>x.startsWith('向上，去第'));
const 采集在 = async p => (await 链接(p)).some(x=>x.startsWith('采集'));
/* ★★`prepL1`：**一处源**的 L1 起手 —— 战斗教学 ⇒ 站起来 ⇒ **拾起** ⇒ 遭遇 ⇒ 等战斗 UI 起来。
 * ★★★`books#280` ⑭ 实测（A/B 隔离 · 变量唯一）：**「拾起」就已经把剑装备上了**（`equipped: true`）；
 *   ★再点一下背包里的「长剑」＝**把它卸下来**（`equipped: false`）。⑩（`itemsInBag`）上线后菜单**只留在手上的武器**
 *   ⇒ 卸掉之后菜单只剩「空手打击」⇒ 打不死 ⇒ `kills` 恒 0。★本席为此把**两处** prep 各踩过一次
 *   （`#328` 修了一处；★`:149` 那处是 ★**`tester-3`** 在 `#328` 合后核出的潜伏）⇒ ★故抽成**一处源**，口径只写一次。
 * ★并把**前件**钉在这里：拾起后**武器须在手上** —— ✗ 成立不了就明印"后续读数不可用"。 */
const prepL1 = async (p) => {
  await 点(p,'战斗教学'); await 点(p,'站起来'); await p.waitForTimeout(700);
  await 清到达拍(p);   // ★②-1：✗ 漏这一步 ⇒ 下面的「拾起／遭遇」全落空
  await 点(p,'拾起'); await p.waitForTimeout(400);
  const 在手上 = await p.evaluate(()=>{try{return (SugarCube.State.variables.inventory||[]).some((x)=>x?.equipped===true)}catch(e){return null}});
  if (在手上 !== true) 待.push('  · 前置：拾起后**武器须在手上**（否则菜单只剩空手 ⇒ 后续战斗读数不可用） —— ★未成立（equipped='+JSON.stringify(在手上)+'）');
  await 点(p,'遭遇'); await p.waitForTimeout(1500);
  /* ★★`books#365`：`:: 遭遇战` 段的「迎战／查看」是 `<<link>>` ⇒ 落成 `#passages` 内的
   *   `<a class="link-internal macro-link">`（**不在 `.choice-box`**）⇒ ★**必须点「迎战」战斗才起** ——
   *   ✗ 漏这一步 ⇒ 下面的「攻击」永远取不到 ⇒ `kills` 恒 0、`gathered` 恒 0 ★**已由 #613 证伪：真根因是择器取到盾**）。 */
  await 点段内(p,'迎战'); await p.waitForTimeout(1200);
};
/* ★②-3 **择器**（`books#606`／`#607` 同形 · `books#613` 定因）：出手必须点**持在武器槽的那一件**。
 *  ★为何要它（单变量 A/B 实测 ✓）：本档菜单首项是「用已装备**重木盾**攻击」⇒ 产品当场具名拒
 *    （「重木盾」得穿在身上挡刀 —— 用「装备」把它带上。→ 本回合白过）⇒ A 臂 12 轮仍【第 1 回合】、`kills` 恒 0
 *    ⇒ 走不到结算门与事件屏 ⇒ **臂②/⑤ 三红 ＋ 臂⑦ 未覆盖，同一根因**。改点武器槽件（B 臂）⇒ 2 回合打赢、链路全通。
 *  ★数据源＝页内 `RPG.equippedIn('weapon')`（返回槽件的**显示名**）—— ✗ 名字黑名单（会腐烂）、✗ 取首项。
 *  ★读不到槽件 ⇒ 返回 `null`（交回调用方**具名明账** ＋ 回退旧形，✗ 静默兜底）。 */
/* ★读**槽件的显示名**（`equippedIn` 返回的是**条目对象** ⇒ 取 `.name`；实测见 `books#613` 的首轮跑）。
 *   与 `tools/e2e-280-kills-easy.mjs:209` 同一取法（两档同源，✗ 各写一套）。 */
const 武器槽名 = (p) => p.evaluate(() => { try { const R = globalThis.RPG ?? globalThis.window?.RPG; return R?.equippedIn?.('weapon')?.name ?? ''; } catch (e) { return ''; } });
let 择器明账已报 = false;
/* 一次出手：只点武器槽件攻击。返回 `点了`／`缺槽件`／`无攻击项`（后两者由调用方回退＋明账）。 */
const 一次出手 = async (p, ls) => {
  const 名 = await 武器槽名(p);
  const 候选 = ls.filter((x) => /攻击|打击/.test(x));
  const 选 = 择武器槽件(ls, 候选, 名);
  if (!选) {
    if (!择器明账已报) {
      择器明账已报 = true;
      待.push('  · 择器：读不到武器槽件（槽名=' + JSON.stringify(名) + '）⇒ 回退取首项（✗ 静默；`books#613`）');
    }
    return { r: 名 ? '无匹配' : '缺槽件', 名, 候选 };
  }
  await 点段内(p, 选);
  return { r: '点了', 名, 选, 候选 };
};
const 到L1事件屏 = async p => {
  /* ★★`books#365`：**一处源** —— 起手整套（战斗教学 ⇒ 站起来 ⇒ 清到达拍 ⇒ 拾起 ＋装备前件 ⇒ 遭遇 ⇒ **迎战**）
   *   全在 `prepL1` 里；本函数**只负责**后半：打完 ⇒ 过 ②-4 结算门（「收下」）⇒ 等事件屏（采集／不采了）。
   *   ✗ 先前本函数自写了一份起手并**又调一次** `prepL1`（两处起手）；且两处都**漏了「迎战」** ⇒ 战斗永不起 ⇒ 下面全零。 */
  await prepL1(p);
  /* ★外层已完成同一起手（含「迎战」）⇒ ✗ 不再重复调 `prepL1`（✗ 两处起手＝两处真值） */
  for (let i=0;i<40;i++){ if((await run(p))?.kills>0) break; const ls=await 段内链接(p)   // ★四处：点哪一项＝段内（#323 族体例）;
    if (ls.some(x=>x.includes('迎战'))){ await 点段内(p,'迎战'); await p.waitForTimeout(1200); }
    else if (ls.some(x=>/攻击|打击/.test(x))){
      const o = await 一次出手(p, ls);
      if (o.r !== '点了') await 点段内(p, o.候选[0] ?? '空手打击');   // 回退旧形（已具名明账）
      await 点(p,'幼獾'); }
    else if (ls.some(x=>x.includes('跳过本回合'))) await 点段内(p,'（跳过本回合）'); }
  /* ★★`books#365`：②-4 **结算门**（`books#351` 起）—— 胜后停在一屏，**须点「收下」**才走到事件屏；
   *   ✗ 漏这一步 ⇒ 事件屏的「采集／不采了」永不出现（第二条同根因）。 */
  for (let k=0;k<30;k++){ const ls=await 段内链接(p)   // ★四处：点哪一项＝段内（#323 族体例）;
    if (ls.some(x=>x.startsWith('采集'))||ls.some(x=>x.includes('不采了'))) break;
    if (ls.some(x=>x==='收下')){ await 点段内(p,'收下'); await p.waitForTimeout(1300); continue; }
    if (ls.some(x=>x.includes('继续探索'))){ await 点段内(p,'继续探索'); continue; }
    if (ls.some(x=>/攻击|打击/.test(x))){ const o = await 一次出手(p, ls); if (o.r !== '点了') await 点段内(p, o.候选[0] ?? '空手打击'); await 点(p,'幼獾'); }
    else if (ls.some(x=>x.includes('迎战'))){ await 点段内(p,'迎战'); await p.waitForTimeout(1200); }
    else await p.waitForTimeout(500); } };




console.log(`◆ 候选钉死：books HEAD=${HEAD} ｜ pin=${PIN} ｜ 产物 sha1=${SHA.slice(0,40)}`);

try {
  // ── 臂① 遭遇＝每层一次（两向）──
  let p = await 新页(); await 到L1事件屏(p); let r = await run(p);
  ok('臂① 胜后「遭遇」已消耗', !(await 段内链接(p)).some(x=>x.includes('遭遇')), `kills=${r.kills}`);
  await p.close();
  p = await 新页(); await 点(p,'战斗教学'); await 点(p,'站起来'); await p.waitForTimeout(700);
  await 清到达拍(p);   // ★②-1：✗ 漏这一步 ⇒ 下面的 prepL1 全落空
  await prepL1(p);   // ★一处源（✗ 不再各写一份 prep）
  for (let i=0;i<40;i++){ const rr=await run(p); if(rr?.deaths>0) break; const ls=await 段内链接(p)   // ★四处：点哪一项＝段内（#323 族体例）;
    if (ls.some(x=>x.includes('跳过本回合'))) await 点(p,'（跳过本回合）'); else await p.waitForTimeout(400); }
  for (let k=0;k<25;k++){ const ls=await 段内链接(p)   // ★四处：点哪一项＝段内（#323 族体例）;
    if (ls.some(x=>x.startsWith('采集'))||ls.some(x=>x.includes('不采了'))) break;
    if (ls.some(x=>x.includes('继续探索'))){ await 点(p,'继续探索'); continue; }
    if (ls.some(x=>x.includes('跳过本回合'))) await 点(p,'（跳过本回合）'); else await p.waitForTimeout(500); }
  r = await run(p);
  ok('臂① 未胜/僵持后回屏「遭遇」可重试', (await 段内链接(p)).some(x=>x.includes('遭遇')), `deaths=${r?.deaths} kills=${r?.kills}`);
  await p.close();

  // ── 臂③ 宝箱三臂（`books#616`）：★L5+ 的抽签事件 ⇒ **L1 本就不存在** —— 走**缺席闸**
  /* ★须**有一行**落在 `待`：✗ 落 `档`（那会被当通过）· ✗ 无行（读者分不清「按设计缺席」与「忘了判」）。
   *   本行**不进** `ok()` ⇒ 判定行数仍 10 ⇒ `通过` 仍 10、守护串命中语义不变。 */
  待.push('  · 臂③ 宝箱三臂 —— ★**低层缺席闸**（`books#284`：L5+ 才有抽签事件 ⇒ L1 本就不存在）⇒ 记声明、✗ 判红（`books#616`）');

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

  // ── 臂⑦ 奖励结算停确认（`books#280` ②-4）★缺席闸形 ──
  /* ★三处踩过的坑：①★prep 走 `prepL1`（★只拾起，✗ 再点武器名＝卸装）②★战斗要点**两次**（动作 ＋ 目标）
   * ③★遇「继续探索」**即停**（✗ 再点它 —— 那正是本臂要测的那一屏）。★点一律用 `点段内`（✗ 全文档）。 */
  {
    const p7 = await 新页();
    await prepL1(p7);
    for (let i=0;i<60;i++){
      if ((await run(p7))?.终局) break;
      const ls = await 段内链接(p7);
      if (ls.some(x=>x.includes('继续探索'))) break;
      const 攻 = ls.filter(x=>/攻击|打击/.test(x)).length > 0;
      if (攻) {
        const o = await 一次出手(p7, ls);
        if (o.r !== '点了') await 点段内(p7, o.候选[0] ?? '空手打击');   // 回退旧形（已具名明账）
        const 目标 = (await 段内链接(p7)).find(x=>/幼獾|獾/.test(x) && !/攻击|打击/.test(x));
        if (目标) await 点段内(p7, 目标);
      } else if (ls.some(x=>x.includes('（跳过本回合）'))) { await 点段内(p7,'（跳过本回合）'); }
      else break;
    }
    const r7 = await run(p7), 链7 = await 段内链接(p7), 正7 = await 正文(p7);
    const 有收下 = 链7.some(x=>x==='收下'), 有继续 = 链7.some(x=>x.includes('继续探索'));
    if ((r7?.kills ?? 0) <= 0) {
      待.push('  · 臂⑦ 奖励结算停确认 —— ★**本跑未覆盖**（未取得胜利 ⇒ 走不到结算屏；记声明 ✗ 判红）');
      待.push('     诊断：kills='+r7?.kills+' deaths='+r7?.deaths+' 终局='+r7?.终局+'｜段内='+JSON.stringify(链7.slice(0,8)));
    } else if (!有收下 && !有继续) {
      待.push('  · 臂⑦ 奖励结算停确认 —— ★**缺席闸：功能未在**（结算屏既无「收下」也无「继续探索」）⇒ 记声明、✗ 判红');
    } else if (!有收下 && 有继续) {
      /* ★★「功能未在」那一类（领队裁：**记声明、✗ 判红** —— 体例同臂③ 宝箱的缺席闸）：
       *   结算屏**在**（结算读数在位），但**没有「收下」这道门**，直接给了「继续探索」⇒ ★②-4 的确认门**尚未落地**。 */
      待.push('  · 臂⑦ 奖励结算停确认 —— ★**缺席闸：确认门未在**（结算屏无「收下」，直接给「继续探索」）⇒ 记声明、✗ 判红');
      待.push('     读数：结算读数在位='+/战利品|翻出了/.test(正7)+'｜链接='+JSON.stringify(链7.slice(0,6)));
    } else {
      ok('臂⑦① 结算读数在位（正文含战果/掉落）', /战利品|翻出了/.test(正7), 正7.replace(/\n+/g,' ').slice(0,90));
      ok('臂⑦② 未确认不进下一步（「继续探索」不在）', !有继续, '链接='+JSON.stringify(链7.slice(0,6)));
      await 点段内(p7,'收下'); await p7.waitForTimeout(1300);
      const 后 = await 段内链接(p7);
      ok('臂⑦③ 确认后入口换（「继续探索」在）', 后.some(x=>x.includes('继续探索')), '链接='+JSON.stringify(后.slice(0,6)));
    }
  }

  console.log([...档, ...待, ...红].join('\n'));
  console.log(`\n  ${汇总行(档.length, 红.length, 待.length)}`);
  for (const l of 红) console.log(l);
} catch (e) { console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`); process.exit(2); }
await b.close();
process.exit(红.length ? 1 : 0);
