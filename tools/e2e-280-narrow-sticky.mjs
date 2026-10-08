/* `books#280` ⑩（乙）· **窄屏（390×844）吸顶验收**的真浏览器臂（CDP/Playwright，复用 `#280-playtest` 的装置）
 *
 * 票面要求：**HP 与道具余量在 390×844 上不落首屏外**。
 * 病灶（勘察）：页脚（`.statusbar`／`.bagbar`）排在**段落内容之后** ⇒ 小屏上地图场景一长，状态条被推到首屏**以外**。
 * 修法（故事侧 CSS，`ui/ui.twee` 的 `@media (max-width: 600px)`）：窄屏把状态条 `position: sticky; top: 0`
 *   ＋ 不透明底色 ＋ 收紧行距。
 *
 * ## 断什么（四臂）
 *   ① **初始首屏**：390×844 下 `.statusbar` 的 `getBoundingClientRect()` 完全在视口内（`top ≥ 0` 且 `bottom ≤ 844`），
 *      且 HP 与背包两格**文本非空**（✗ 只断「元素在」—— 空面板也在）；
 *   ② **滚动后仍可见**：`scrollTo(0, 1200)` 之后再量 ⇒ `top` 仍在视口内（吸顶的**效果**，✗ 只断 CSS 属性）；
 *   ③ **装置自查**：窄屏下 `getComputedStyle(...).position === 'sticky'`（本笔的机制面）；
 *   ④ **正控（宽屏 1280×900）**：`position !== 'sticky'` —— 吸顶只该在小屏开（✗ 桌面端也跟着吸＝改错面）。
 *
 * ## 用法与退出码
 *   （先构建产物：`python3 <引擎>/build.py "$PWD/stories/babel" --out "$PWD/stories/babel/babel-trial.html"`）
 *     PW_DIR=<含 node_modules/playwright 的目录> node tools/e2e-280-narrow-sticky.mjs --books "$PWD"
 *     … --selftest        # 刀：把产物里的窄屏规则拆掉 ⇒ ②③ 须红
 *     … --engine <引擎检出>  # 可选：连带核「产物 × 引擎树」一致（同 `#280-heal-feedback` 的口径，不符 ⇒ rc=2）
 *   退出码：0 全过；1 有红（具名）；2 环境错（playwright／浏览器／产物，✗ 不当判据红）。
 *
 * ## 与「装置 vs 判据」的分界
 *   playwright 取不到、浏览器起不来、产物缺 ⇒ **rc=2 环境错**（✗ 记成红的判据）；
 *   「窄屏不吸顶」是**产品面**的红（rc=1）—— 两者在读数里逐条具名。
 */
import fs from 'node:fs';
import process from 'node:process';
import path from 'node:path';
import { createRequire } from 'node:module';

const argv = process.argv.slice(2);
const arg = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const B = path.resolve(arg('--books', process.cwd()));
const 产物 = path.resolve(arg('--art', path.join(B, 'stories/babel/babel-trial.html')));
/* ★产物新鲜度守卫（`tools/bundle-fresh.mjs` 共享件）：本臂只认预构建产物 ⇒
 *   陈旧 ⇒ 读的是上一版源码（读数看着对、量的不是当前树）⇒ 具名红退出。 */
{ const { 断产物新鲜 } = await import('./bundle-fresh.mjs');
  try { 断产物新鲜({ 产物: 产物, 引擎根: process.env.ENGINE ?? process.env.E, 仓根: process.cwd() }); }
  catch (e) { console.error(String(e?.message ?? e)); process.exit(2); } }

const 自检 = argv.includes('--selftest');
const 引擎 = arg('--engine', null);
const PW = process.env.PW_DIR || path.join(process.env.HOME, 'tmp/sgstory-books-retest-readiness-20261004T093102Z/tooldeps');
const CHROME = process.env.CHROME_BIN
	|| path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const 窄 = { w: 390, h: 844 }, 宽 = { w: 1280, h: 900 };

const 档 = [], 红 = [];
const ok = (名, 条件, 读 = '') => (条件 ? 档 : 红).push(条件 ? `  ✓ ${名}${读 ? '  ｜' + 读 : ''}` : `  ✗ ${名}${读 ? '  ｜' + 读 : ''}`);

/* 环境（✗ 一律具名 + 绝对路径；rc=2 ⇒ 不当判据红） */
if (!fs.existsSync(产物)) {
	console.error(`✗ 环境错（产物不在）\n    绝对路径：${产物}\n  ⇒ 先 python3 <引擎检出>/build.py ${B}/stories/babel --out babel-trial.html`);
	process.exit(2);
}
/* 可选：产物 × 引擎树 一致（同 `e2e-280-heal-feedback.mjs` 的口径：版本戳与树不符 ⇒ rc=2） */
if (引擎) {
	const 戳 = (fs.readFileSync(产物, 'utf8').match(/\$buildVersion to "([^"]*)"/) ?? [])[1] ?? null;
	let 树sha = null;
	try { 树sha = createRequire(path.join(PW, 'noop.js'))('node:child_process').execFileSync('git', ['-C', path.resolve(引擎), 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { 树sha = null; }
	console.log(`产物：${产物}\n  版本戳：${戳 ?? '（读不到）'}｜引擎树 ${path.resolve(引擎)}${树sha ? `（HEAD ${树sha}）` : '（HEAD 读不到）'}`);
	if (戳 && 树sha && /^[0-9a-f]{7,40}$/.test(戳) && !(树sha.startsWith(戳) || 戳.startsWith(树sha))) {
		console.error(`✗ 装置错（rc=2）：产物是 ${戳} 那棵树建的，而给了 ${树sha} ⇒ 先按本树重烘`);
		process.exit(2);
	}
}
let chromium;
try { chromium = createRequire(path.join(PW, 'noop.js'))('playwright').chromium; }
catch (e) { console.error(`✗ 环境错（取不到 playwright：${PW}）：${e.message}\n  ⇒ 用 PW_DIR=<含 node_modules/playwright 的目录>`); process.exit(2); }

/** 在给定视口下量状态条：位置、是否吸顶、两格文本。 */
const 量 = (p, vp) => p.evaluate(({ w, h }) => {
	const st = document.querySelector('.statusbar');
	const r = st?.getBoundingClientRect();
	const 文 = (id) => (document.querySelector(`.statusbar [data-panel="${id}"]`)?.textContent ?? '').trim();
	return {
		视口: { w: window.innerWidth, h: window.innerHeight },
		在: !!st,
		top: r ? Math.round(r.top) : null, bottom: r ? Math.round(r.bottom) : null,
		位置: st ? getComputedStyle(st).position : null,
		hp: 文('hp'), 包: 文('inventory'),
		滚过: window.scrollY,
	};
}, vp);

const 跑 = async (b, vp) => {
	const c = await b.newContext({ viewport: { width: vp.w, height: vp.h } });
	const p = await c.newPage();
	await p.goto('file://' + 产物);
	await p.waitForTimeout(2600);                       // 同 `#280-playtest` 的 boot 等待
	/* 走到会渲染页脚的段（开始 ⇒ 战斗教学 ⇒ …）—— 用现成的故事链接推进两步即可（✗ 不硬造段落）。 */
	for (const 步 of ['战斗教学', '站起来，活动一下手脚']) {
		const 链 = p.locator(`a:has-text("${步}")`).first();
		if (await 链.count() > 0) { await 链.click(); await p.waitForTimeout(400); }
	}
	const 初 = await 量(p, vp);
	/* ★**装置**：当前段落不够长 ⇒ 页面本来滚不动（本席首跑：`滚到 0` ⇒ ② 红得像「没吸顶」）。
	 *   吸顶要断的是「**滚动**时贴不贴顶」，与内容长度无关 ⇒ 垫一块高块把页面撑开（✗ 改故事内容）。 */
	await p.evaluate(() => {
		const 垫 = document.createElement('div');
		垫.id = 'e2e-spacer';
		垫.style.height = '2500px';
		document.body.appendChild(垫);
		window.scrollTo(0, 1200);
	});
	await p.waitForTimeout(150);
	const 滚 = await 量(p, vp);
	await c.close();
	return { 初, 滚 };
};

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
	.catch((e) => {
		console.error(`✗ 环境错（浏览器起不来：${CHROME}）：${e.message}\n  ★试 LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`);
		process.exit(2);
	});

try {
	const 窄读 = await 跑(b, 窄);
	ok('① 390×844 初始首屏内有状态条', 窄读.初.在 && 窄读.初.top >= 0 && 窄读.初.bottom <= 844,
		`实得 top=${窄读.初.top} bottom=${窄读.初.bottom}`);
	ok('① HP 与背包两格**有内容**', 窄读.初.hp.length > 0 && 窄读.初.包.length > 0,
		`HP="${窄读.初.hp}"｜背包="${窄读.初.包}"`);
	ok('② 滚过一屏后**仍在视口内**（吸顶的效果）',
		窄读.滚.top !== null && 窄读.滚.top >= 0 && 窄读.滚.top <= 844 && 窄读.滚.滚过 > 0,
		`滚到 ${窄读.滚.滚过} 后 top=${窄读.滚.top}`);
	ok('③ 窄屏下**恒贴顶**（机制面：sticky 或 fixed 都算，✗ 断具体属性名）', ['sticky', 'fixed'].includes(窄读.初.位置), `实得 ${窄读.初.位置}`);
	const 宽读 = await 跑(b, 宽);
	ok('④ 正控：宽屏**不**贴顶（贴顶只该在小屏开）', !['sticky', 'fixed'].includes(宽读.初.位置), `实得 ${宽读.初.位置}`);
} finally { await b.close(); }

console.log('── 窄屏吸顶（390×844）──');
for (const l of 档) console.log(l);
for (const l of 红) console.error(l);
console.log(红.length === 0 ? '✓ 四臂全过' : `✗ 有红：${红.length} 条`);

/* ── 刀：把**产物里**的窄屏吸顶规则拆掉 ⇒ ②③ 须红（✗ 改源码：改了不重建＝刀没落在被测物上）── */
if (自检) {
	const 原 = fs.readFileSync(产物, 'utf8');
	const 刀 = { 找: 'position: fixed; top: 0; left: 0; right: 0; z-index: 5;', 换: 'position: static;' };
	if (!原.includes(刀.找)) {
		console.error(`✗ 刀**未命中**（产物里找不到靶：${JSON.stringify(刀.找)}）⇒ 产物形变了就同步改刀`);
		process.exit(1);
	}
	const 刀本 = 产物.replace(/\.html$/, `.__knife-${process.pid}.html`);
	fs.writeFileSync(刀本, 原.replace(刀.找, 刀.换));
	try {
		const { execFileSync } = await import('node:child_process');
		/* ⚠ 刀本**本该**以 rc=1 结束（判据红了）⇒ 非零退出要当**读数**收下（✗ 让它抛成装置错）。 */
		let out = '';
		try { out = execFileSync(process.execPath, [process.argv[1], '--books', B, '--art', 刀本], { encoding: 'utf8', env: process.env }); }
		catch (e) { out = String(e.stdout ?? '') + String(e.stderr ?? ''); }
		console.log('（刀本读数）\n' + out.trim().split('\n').slice(-6).join('\n'));
		const 命中 = /✗ (② 滚过一屏后|③ 窄屏下)/.test(out);
		if (!命中) { console.error('✗ 刀未咬住 ②／③ 两臂 —— 判据没牙'); process.exit(1); }
		console.log('✓ 刀：拆掉窄屏贴顶 ⇒ ②／③ 如期红');
	} finally { try { fs.unlinkSync(刀本); } catch { /* 清不掉不掩盖结论 */ } }
}
process.exit(红.length === 0 ? 0 : 1);
