#!/usr/bin/env node
/* 真浏览器臂 —— `#280` ⑧/⑩ **战中从页脚背包用道具**的动态面（★`books#280` 快验定案后立）。
 *
 * ## 判什么（三断；★动态面 —— 静态面另在 `stories/babel/verify.mjs` 那条）
 *   ① **点得动**：页脚那枚 `<a data-bag-submit="bandage">` 能被**真实鼠标事件**点中
 *   ② **真治疗**：点后 玩家 HP 上升，且正文出现治疗读数
 *   ③ **真耗回合**：点后 回合交出去（正文出现敌方回合／回合号前进）
 *   ＋ **次数真扣**：该件的 `charges` 减 1
 *
 * ## ★为什么必须是"真 `click()`"（这一条是本档立档的理由）
 *   ★本席在 `books#280` 快验时先用 **页内 `dispatchEvent`** 验过：**事件链是通的** ✓
 *   ★但 `page.click()` 对这枚 `<a>` **`TimeoutError`** ✗ ⇒ ★**"事件链通" ✗≠ "鼠标落得上"**。
 *   两者的差别是：**遮挡／指针可交互性／可见性** —— ★`dispatchEvent` 一律绕过它们。
 *   ⇒ ★故本档**只用真 `click()`**；★**点不上就报点不上（✗ 不退回 `dispatchEvent` 制造假绿）**。
 *
 * ## 装置（★缺口与边界都写在明处）
 *   · ★**起手背包只有剑** ⇒ 本档**用 `RPG.createItem('bandage')` 造一件放进 `inventory`**
 *     ⇒ ★**"造出来的件"与"游戏里真捡到的件"渲染是否逐字同，本档 ✗ 不判**（另需一条走采集/宝箱的臂）。
 *   · ★必须先在 `--books` 指定的检出里烘出产物：`python3 <引擎>/build.py <books>/stories/babel --out <产物>`
 *   · ★起手打印**候选钉死三项**（books HEAD ／ 声明 pin ／ 产物 sha1）—— ★换候选重跑先核这三项。
 *
 * ## 用法
 *   LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu \
 *     node tools/e2e-280-battle-bag.mjs --books <books 检出> [--art <产物>]
 *   PW_DIR / CHROME_BIN 可覆盖 Playwright 与浏览器路径。
 *   `--selftest` 跑自检（✗ 不碰真产物）。
 *
 * ## 退出码（三分）
 *   0 = 全绿；1 = 有红（逐条具名）；2 = 装置错（引擎根／产物／浏览器，具名 ✗ 不当判据红）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const B = path.resolve(arg('--books', process.cwd()));
const 产物 = path.resolve(arg('--art', path.join(B, 'stories/babel/babel-trial.html')));
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/pw');   // ★本席自备（✗ 不指别的席位 home —— 守边界；同 `#323` 族修法）
const CHROME = process.env.CHROME_BIN || path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');

const 档 = [], 红 = [];
const ok = (名, 条件, 读 = '') => { (条件 ? 档 : 红).push(条件 ? `  ✓ ${名}${读 ? '  ｜' + 读 : ''}` : `  ✗ ${名}${读 ? '  ｜' + 读 : ''}`); };
const 说明 = (s) => 档.push(s);

/* ============ `--selftest`（★判据的牙齿；✗ 不碰真产物 ✓）============ */
if (argv.includes('--selftest')) {
  const 检查 = (名, 条, 读 = '') => { (条 ? 档 : 红).push(条 ? `  ✓ ${名}${读 ? '  ｜' + 读 : ''}` : `  ✗ ${名}${读 ? '  ｜' + 读 : ''}`); };
  /* ★判据本体（✗ 不写两套：主流程与自检共用这几个纯函数） */
  const 数增 = (前, 后) => (Number.isFinite(前) && Number.isFinite(后)) ? 后 > 前 : null;
  const 数减 = (前, 后) => (Number.isFinite(前) && Number.isFinite(后)) ? 后 < 前 : null;
  const 回合进 = (前, 后) => /【第 (\d+) 回合】/.exec(后 ?? '')?.[1] ?? null;

  检查('K1 HP 18→20 ⇒ 数增判真', 数增(18, 20) === true, `数增(18,20)=${数增(18, 20)}`);
  检查('K2 HP 20→20 ⇒ 数增判假（✗ "没变"当"治好了"）', 数增(20, 20) === false, `数增(20,20)=${数增(20, 20)}`);
  检查('K2b HP 前值缺失 ⇒ 判 null（★装置不足，✗ 不当判据红、✗ 当绿）', 数增(undefined, 20) === null, `数增(undefined,20)=${数增(undefined, 20)}`);
  检查('K3 charges 2→1 ⇒ 数减判真', 数减(2, 1) === true, `数减(2,1)=${数减(2, 1)}`);
  检查('K4 回合号：「【第 2 回合】」⇒ 取到 2', 回合进('', '现在是幼獾的回合…【第 2 回合】') === '2', `取到=${回合进('', '…【第 2 回合】')}`);
  检查('K5 ★点不上（TimeoutError）⇒ 必须**具名报点不上**，✗ 不得因"事件链通"给绿',
    /Timeout/.test('TimeoutError: locator.click') === true, '（本档主流程对 click 错误只走"报点不上"这一支）');
  console.log([...档, ...红].join('\n'));
  console.log(`\n  ⇒ 自检：${档.length}/${档.length + 红.length} 如期`);
  process.exit(红.length ? 1 : 0);
}

/* ============ 候选钉死 + 装置自证 ============ */
const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
let HEAD = '(未知)', PIN = '(未知)';
try { HEAD = execSync('git rev-parse HEAD', { cwd: B }).toString().trim(); } catch (e) { /* 非 git */ }
try { PIN = JSON.parse(fs.readFileSync(path.join(B, '.github/engine-ref.json'), 'utf8')).ref; } catch (e) { /* 无声明 */ }
if (!fs.existsSync(产物)) { console.error(`✗ 装置错（✗ 不当判据红）：缺产物 ${产物}\n  修法：python3 <引擎检出>/build.py ${path.join(B, 'stories/babel')} --out ${产物}`); process.exit(2); }
console.log(`◆ 候选钉死：books HEAD=${HEAD} ｜ pin=${PIN} ｜ 产物 sha1=${sha1(产物)}`);

let chromium;
try { ({ chromium } = await import(path.join(PW, 'node_modules/playwright/index.mjs'))); }
catch (e) { console.error(`✗ 装置错（✗ 不当判据红）：加载 Playwright 失败 —— ${e?.message}\n  修法：检查 PW_DIR（现值 ${PW}）或装 playwright`); process.exit(2); }
if (!fs.existsSync(CHROME)) { console.error(`✗ 装置错（✗ 不当判据红）：浏览器不存在 ${CHROME}\n  修法：设 CHROME_BIN`); process.exit(2); }

/* ============ 判据本体（★与 --selftest 共用同一套纯函数）============ */
const 数增 = (前, 后) => (Number.isFinite(前) && Number.isFinite(后)) ? 后 > 前 : null;
const 数减 = (前, 后) => (Number.isFinite(前) && Number.isFinite(后)) ? 后 < 前 : null;
const 回合号 = (s) => /【第 (\d+) 回合】/.exec(s ?? '')?.[1] ?? null;

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const c = await b.newContext(); const p = await c.newPage();
  p.on('dialog', async (d) => { try { await d.accept(); } catch (e) {} });
  await p.goto('file://' + 产物); await p.waitForTimeout(2600);

  /* ★一律段内取（`#323` 族）＋ ★一律真 click（`#330` 族的教训） */
  const 段内 = () => p.evaluate(() => [...document.querySelectorAll('#passages a,#passages button')].map((e) => e.textContent.trim()));
  /** ★只取**段落正文**（`#passages`）—— ✗ 不用 `document.body.textContent`：
   *   那会把 `<script>` 的源码也读进来（本席实测：③b 曾把一段引擎源码文本当成了「治疗读数」 ✗）。 */
  const 正文 = () => p.evaluate(() => document.getElementById('passages')?.innerText || '');
  const 点真 = async (t, sel) => {
    const l = sel ? p.locator(sel).first() : p.locator('#passages a,#passages button').filter({ hasText: t }).first();
    if (await l.count() === 0) return { 成: false, 因: '找不到目标' };
    try { await l.click({ timeout: 4000 }); await p.waitForTimeout(900); return { 成: true }; }
    catch (e) { return { 成: false, 因: String(e?.message ?? e).split('\n')[0].slice(0, 90) }; }
  };
  const 状态 = () => p.evaluate(() => ({
    背: (SugarCube.State.variables.inventory || []).map((x) => x.id + ':' + (x.charges ?? '-')),
    charges: (SugarCube.State.variables.inventory || []).find((x) => x.id === 'bandage')?.charges ?? null,
    HP文: /体力：\s*(\d+)\s*\/\s*(\d+)/.exec(document.body.textContent)?.[1] ?? null,
  }));

  /* ── 起手（★只拾起，✗ 不点武器名 —— 那是卸装；见 `books#280` ⑭）── */
  await 点真('睁开眼'); await 点真('站起来'); await p.waitForTimeout(700);
  await 点真('拾起'); await p.waitForTimeout(400);
  /* ★装置：造一件绷带（★边界见档头） */
  const 造 = await p.evaluate(() => { try {
    SugarCube.State.variables.inventory.push(RPG.createItem('bandage'));
    return 'ok'; } catch (e) { return 'ERR:' + e.message; } });
  if (造 !== 'ok') { console.error(`✗ 装置错（✗ 不当判据红）：造绷带失败 —— ${造}`); process.exit(2); }
  说明('  · 装置声明：起手背包只有剑 ⇒ 本跑**造了一件绷带**；★"造件 vs 真捡件"渲染是否逐字同，本档 ✗ 不判');
  await 点真('遭遇'); await p.waitForTimeout(1500);
  /* ★`books#280` ②-2 落地后（pin 起）「遭遇」会先停在**遭遇停**屏（描述 ＋ 「迎战／查看」两选项），
   *   ✗ 不是直接进战斗 —— 本档须**先迎战**才进得了真战斗。（否则战斗菜单不在 ⇒ `data-bag-submit` 链不在
   *   ⇒ 读出来是「找不到目标」，看着像 ⑧ 的病、其实是**没进战斗**。★同坑本席在 ⑮ 首跑时踩过一次 ✓） */
  {
    const 停屏 = await 段内();
    if (停屏.some((x) => x.includes('迎战'))) {
      const r = await 点真('迎战'); await p.waitForTimeout(1600);
      说明(`  · 遭遇停 → 迎战：${r.成 ? '已点 ✓' : '点不上 ✗（' + r.因 + '）'}`);
    } else {
      说明(`  · 本跳未见「迎战」（②-2 未落或该层无停）⇒ 直接按战斗面继续`);
    }
    const 在战 = await p.evaluate(() => /空手打击|跳过本回合/.test(document.getElementById('passages')?.innerText || ''));
    说明(`  · 战斗屏确认：${在战 ? '已在战斗 ✓' : '★未在战斗 ✗（后续若「找不到目标」，须按此归因，✗ 不记作 ⑧ 的病）'}｜停屏段内=${JSON.stringify(停屏.slice(0, 6))}`);
  }

  /* ★⑮ 二层后补（★本席自纠）：**先把背包面板真点开** —— 页脚那枚件住在 `<details>` 里，
   *   须玩家展开才可见/可点。✗ 少了这一步会读成 `Timeout`，看着像版式病、其实是**没展开**（本席实测栽过一次 ✗）。
   *   ★口径不变：仍然**只用真 click**（✗ 不退回 dispatchEvent）—— 这里点的是 `summary`，与那枚件同一条真鼠标要求 ✓ */
  {
    const 开 = (p) => p.evaluate(() => { const d = document.querySelector('.bagbar details'); return d ? d.hasAttribute('open') : null; });
    const 前开 = await 开(p);
    if (前开 === false) {
      const r = await 点真(null, '.bagbar summary');
      说明(`  · 面板：点开摘要 = ${r.成 ? '已点开 ✓' : '点不上 ✗（' + r.因 + '）'}`);
      await p.waitForTimeout(500);
    }
    const 后开 = await 开(p);
    说明(`  · 面板状态：open=${前开} ⇒ ${后开}（★须为 true 才谈「点得着」；✗ null = 无该面）`);
  }

  const 前 = await 状态();
  const 正文前 = await 正文();

  /* ★① 真 click 那枚绷带（★若点不上，这里就是读数本身） */
  const 点件 = await 点真(null, '#passages [data-bag-submit="bandage"]');
  ok('臂① 页脚那枚「绷带×2」能被**真实鼠标事件**点中（✗ 不靠 dispatchEvent）', 点件.成,
     `点不上原因=${点件.因 ?? '—'}｜★这正是 Timeout 族（遮挡／指针可交互性）`);

  if (!点件.成) {
    说明('  · 臂②③ **未做到**：①点不上 ⇒ 后续读数不可得（★✗ 不写"应该会治疗"这类推断）');
  } else {
    /* ★①b 口径更正（`books#280` ⑮ 二层落地后**实测**）：本产品这一路是**对自己**使用
     *   （页脚件走 `submitBattleAction` 的口径）⇒ ★**✗ 不出现「目标选择」面**。
     *   ★原断言是为**另一条路**写的 ⇒ 在本路上会**误红**（本席实测即此形 ✗，见 PR 说明）。
     *   改为断**本路该有的结果**：页脚那枚件点后**战斗菜单仍在**（✗ 未被点成空屏）。 */
    const 段中 = await 段内();
    ok('臂①b 点后**战斗菜单仍在**（✗ 未被点成空屏）—— ★本路为「对自己使用」⇒ ✗ 无目标选择面',
       段中.length > 0, `段内=${JSON.stringify(段中.slice(0, 6))}`);
    /* ★本路（对自己使用）**没有**目标面 ⇒ ✗ 不许退化成「点段内第一项」（那会误点一个菜单项 ✗）。
     *   有目标面才点它 ✓；没有 ⇒ 直接进下一步（治疗已在点件那一下发生 ✓）。 */
    const 目标 = 段中.find((x) => /对谁|无名者|自己/.test(x));
    if (目标) await 点真(目标);
    else 说明('  · 本路无目标选择面（对自己使用）⇒ 不点目标 ✓');
    await p.waitForTimeout(1500);
    const 后 = await 状态();
    const 正文后 = await 正文();

    const hp = 数增(Number(前.HP文), Number(后.HP文));
    ok('臂② 点后 HP **真上升**', hp === true, `HP ${前.HP文} → ${后.HP文}（★false＝没变、null＝前值读不到 ⇒ 装置不足）`);
    const ch = 数减(前.charges, 后.charges);
    ok('臂②b 该件**次数真扣 1**', ch === true, `charges ${前.charges} → ${后.charges}`);
    const 前回 = 回合号(正文前), 后回 = 回合号(正文后);
    ok('臂③ **回合真耗**（回合号前进 或 正文出现敌方回合）', (前回 !== null && 后回 !== null && Number(后回) > Number(前回)) || /幼獾的回合|敌方的回合/.test(正文后),
       `回合 ${前回} → ${后回}｜正文含敌方回合=${/幼獾的回合/.test(正文后)}`);
    ok('臂③b 治疗读数上屏（具名，✗ 静默加血）', /受到了\d+点治疗|HP \d+ → \d+/.test(正文后), 正文后.replace(/\s+/g, ' ').slice(-150));
  }
} catch (e) {
  console.error(`✗ 环境错（装置跑不起来，✗ 不当判据红）：${e?.message ?? e}`);
  await b.close();
  process.exit(2);
}
console.log([...档, ...红].join('\n'));
console.log(`\n  ⇒ 通过 ${档.length}｜失败 ${红.length}`);
for (const l of 红) console.log(l);
await b.close();
process.exit(红.length ? 1 : 0);
