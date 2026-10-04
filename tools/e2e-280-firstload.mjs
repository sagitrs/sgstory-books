/* 巴别 · **首载变体** 端到端（`books#280` ⑥）—— 真浏览器 · Chrome DevTools Protocol · 零新依赖
 *
 * 它回答一个问题：**全新 profile、零存档、首载**时，`开始` 段落显示的是哪一个变体？
 *   裁定（`books#280` ⑥）：那句「刷新（重载页面）之后，请从存档继续」只对**已经有档的人**成立；
 *   无档应走**初态句**（本作不会自动保存 ⇒ 去哪存）。本工具断的正是这两向。
 *
 * ## 前置（★本工具**不在 CI 里**：要机器上有浏览器与它缺的那几个 so）
 *   · **浏览器**：Chrome for Testing／Chromium 可执行文件。缺省取
 *     `~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`；用 `CHROME=<路径>` 覆盖。
 *   · **浏览器缺的系统库**：`~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu`（本机以
 *     `LD_LIBRARY_PATH` 注入；`CHROME_DEPS=<目录>` 覆盖）。★零安装：用既有 user-space 缓存。
 *   · **Node ≥ 22**（自带 `fetch` 与 `WebSocket` —— 这正是「零新依赖」的来源）。
 *   · **一个已构建的产物**（★故事目录写**绝对**路径 —— `build.py` 对相对形会先拼到**引擎仓根**，见 `tools/README.md` 末节）：
 *     `python3 <引擎检出>/build.py <本仓绝对路径>/stories/babel --out babel-trial.html`
 *     （产物默认在 `stories/babel/babel-trial.html`，该路径已被 `.gitignore` 忽略）。
 *
 * ## 用法
 *   node tools/e2e-280-firstload.mjs --product stories/babel/babel-trial.html [--tag 修后] [--keep-profile]
 *   退出码：`0`＝三臂全过；`1`＝有一臂不成立（具名到臂）；`2`＝前置缺失（缺产物／缺浏览器／连不上 CDP）。
 *
 * ## 三臂（判据 · 两向都活）
 *   · **A／B**：两个**独立 profile**（各自新 `--user-data-dir`）⇒ 零存档、首载 ⇒ ★**不得**出现
 *     「请从存档继续」，且**应**出现初态句（`头一回下来`）。
 *   · **C（正控 · 落在 A 那个 profile 上）**：真点页脚「快存」⇒ 槽 3 落档 ⇒ 重载 ⇒ ★**应**出现该句。
 *     —— 没有 C，本判据可以被「永远不显示那句话」满足（**假绿**）。
 *
 * ## 装置坑（本席实测 · 留痕）
 *   按**文本**「快存」找元素会先命中外层 `div.footersave`（宽 640）⇒ 落点取它的**中心**（x≈860），
 *   而真锚 `.footersave a` 只有 19×19 且贴**左缘**（x≈540）⇒ 事件落在锚外 ⇒ 读数恒「存档 0」，
 *   看起来像**产品没存**。⇒ 本工具用**选择器**点真锚。
 *   ★一般化：**「点了没反应」先怀疑装置**，别先记成产品缺陷。
 *
 * ## 输入纪律（照 `books#278` 那轮 E2E 报告的同一套）
 *   · 输入一律**真鼠标/键盘事件**（`Input.dispatchMouseEvent`）；✗ 不用 DOM `.click()`。
 *   · 等待一律**语义等待**（轮询 DOM 判据）；✗ 不用固定睡眠当异步结束。
 *   · 观察**只读**（读 DOM 与 `Save.slots.has`）；✗ 不写 `State.variables`、✗ 不调推进/领奖类函数。
 *
 * ## 出处
 *   CDP 驱动（本文件内的 `连接CDP`）**逐字**取自 `books#278` 那轮独立 E2E 的自写驱动
 *   （原作者：该轮执行席；本席只把它搬进仓并加断言层，✗ 未改其行为）。
 */
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const argOf = (k, d = null) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

const 产物 = path.resolve(argOf("--product", path.join("stories", "babel", "babel-trial.html")));
const 标签 = argOf("--tag", "运行");
const 留档 = argv.includes("--keep-profile");
const CHROME = process.env.CHROME ?? path.join(process.env.HOME, ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome");
const CHROME_DEPS = process.env.CHROME_DEPS ?? path.join(process.env.HOME, ".cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu");
const 证据 = path.resolve(argOf("--evidence", path.join(process.env.HOME, `tmp/e2e-280-firstload-${标签}`)));

/* ---------- 前置检查（缺 ⇒ rc=2，具名） ---------- */
if (!existsSync(产物)) {
	console.error(`✗ 缺产物：${产物}\n  先烘：python3 <引擎检出>/build.py <本仓>/stories/babel --out babel-trial.html`);
	process.exit(2);
}
if (!existsSync(CHROME)) { console.error(`✗ 缺浏览器：${CHROME}（用 CHROME=<路径> 覆盖）`); process.exit(2); }
if (!existsSync(CHROME_DEPS)) console.warn(`⚠ 缺 Chrome 依赖目录 ${CHROME_DEPS}（若浏览器本来就跑得起来可忽略）`);

/* ---------- CDP 驱动（取自 `books#278` 那轮的自写驱动；本席只加断言层） ---------- */
async function 连接CDP(端口 = 9317) {
	const v = await (await fetch(`http://127.0.0.1:${端口}/json/version`)).json();
	const ws = new WebSocket(v.webSocketDebuggerUrl);
	let id = 0; const 待 = new Map(); const 事件 = [];
	const 事件监听 = {};
	const send = (方法, 参数 = {}, 会话 = null) => new Promise((ok, no) => {
		const i = ++id; 待.set(i, { ok, no });
		ws.send(JSON.stringify(会话 ? { id: i, method: 方法, params: 参数, sessionId: 会话 } : { id: i, method: 方法, params: 参数 }));
		setTimeout(() => { if (待.has(i)) { 待.delete(i); no(new Error(`CDP 超时 ${方法}`)); } }, 60000);
	});
	ws.onmessage = (e) => {
		const d = JSON.parse(e.data);
		if (d.id && 待.has(d.id)) { const { ok, no } = 待.get(d.id); 待.delete(d.id); d.error ? no(new Error(JSON.stringify(d.error))) : ok(d.result); return; }
		if (d.method) { 事件.push({ 方法: d.method, 参数: d.params, 会话: d.sessionId });
			for (const f of (事件监听[d.method] || [])) try { f(d.params, d.sessionId); } catch {} }
	};
	await new Promise((ok) => (ws.onopen = ok));
	return {
		版本: v.Browser, 协议: v["Protocol-Version"], 事件,
		在: (方法, f) => { (事件监听[方法] ||= []).push(f); },
		关: () => ws.close(),
		送: send,
		async 开页(url) {
			const t = await send("Target.createTarget", { url });
			const s = await send("Target.attachToTarget", { targetId: t.targetId, flatten: true });
			const 会话 = s.sessionId;
			await send("Page.enable", {}, 会话); await send("Runtime.enable", {}, 会话); await send("Log.enable", {}, 会话).catch(() => {});
			return { targetId: t.targetId, 会话 };
		},
		关页: (t) => send("Target.closeTarget", { targetId: t }),
		async 求值(会话, 表达式) {
			const r = await send("Runtime.evaluate", { expression: 表达式, returnByValue: true, awaitPromise: true }, 会话);
			if (r.exceptionDetails) throw new Error("求值异常：" + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
			return r.result.value;
		},
		// ★真实点击：先取目标元素中心（页面坐标 ⇒ 视口坐标），再发按下/抬起
		async 真点(会话, 选择器或文本) {
			const 匣 = await this.求值(会话, `(() => {
				const 找 = ${JSON.stringify(选择器或文本)};
				let el = null;
				try { el = document.querySelector(找); } catch {}
				if (!el) { const 全=[...document.querySelectorAll('a,button,tr,td,div,span,[role=button]')];
					el = 全.find(e => (e.innerText||'').trim() === 找)
						|| 全.find(e => ((e.getAttribute('aria-label')||'')+' '+(e.title||'')).trim() === 找)
						|| 全.find(e => (e.innerText||'').trim().replace(/\s+/g,' ').replace(/\s*（系统）\s*/,'') === 找)
						|| 全.find(e => e.matches('.save,.load,.saveslot,[data-passage]') && (e.innerText||'').trim() === 找); }
				if (!el) return null;
				const b = el.getBoundingClientRect();
				if (b.width === 0 || b.height === 0) return { 零尺寸: true, 文: (el.innerText||'').trim(), 类: el.className };
				return { x: Math.round(b.left + b.width/2), y: Math.round(b.top + b.height/2),
						 文: (el.innerText||'').trim().slice(0,60), 类: String(el.className).slice(0,60),
						 可见: !!(el.offsetParent !== null || el.getClientRects().length) };
			})()`);
			if (!匣) return { 成: false, 因: "找不到目标" };
			if (匣.零尺寸) return { 成: false, 因: "目标零尺寸（布局问题）", 匣 };
			// ★靶须真在视口内 ⇒ 先用**真滚轮事件**滚进来（✗ 不用 .click()／✗ 不用 scrollIntoView 代点）
			let 滚 = 0, 匣2 = 匣;
			const 视 = await this.求值(会话, "({h: innerHeight, w: innerWidth, y0: scrollY})");
			while ((匣2.y < 30 || 匣2.y > 视.h - 30) && 滚 < 8) {
				const 量 = 匣2.y < 30 ? -Math.min(400, 30 - 匣2.y + 100) : Math.min(400, 匣2.y - 视.h + 130);
				await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: Math.round(视.w / 2), y: Math.round(视.h / 2), deltaX: 0, deltaY: 量 }, 会话);
				await new Promise((r) => setTimeout(r, 220));
				滚++;
				匣2 = await this.求值(会话, `(() => { const 找=${JSON.stringify(选择器或文本)}; let el=null; try{el=document.querySelector(找)}catch{}
					if(!el){ const 全=[...document.querySelectorAll('a,button,tr,td,div,span,[role=button]')];
						el = 全.find(e=>(e.innerText||'').trim()===找) || 全.find(e=>(e.innerText||'').trim().replace(/\s+/g,' ').replace(/\s*（系统）\s*/,'')===找); }
					if(!el) return null; const b=el.getBoundingClientRect(); return {x:Math.round(b.left+b.width/2), y:Math.round(b.top+b.height/2)}; })()`);
				if (!匣2) break;
			}
			const 视2 = await this.求值(会话, "scrollY");
			if (!匣2 || 匣2.y < 10 || 匣2.y > 视.h - 10) return { 成: false, 因: `滚不进视口（滚了 ${滚} 次，y=${匣2 ? 匣2.y : "?"}，视口高 ${视.h}）`, 匣: 匣2 || 匣 };
			const 底 = { x: 匣2.x, y: 匣2.y, button: "left", clickCount: 1, buttons: 1 };
			await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...底, buttons: 0 }, 会话);
			await send("Input.dispatchMouseEvent", { type: "mousePressed", ...底 }, 会话);
			await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...底, buttons: 0 }, 会话);
			return { 成: true, 匣: 匣2, 滚动次数: 滚, 滚动前y: 匣.y, 滚动后y: 匣2.y, scrollY前后: [视.y0, 视2] };
		},
		// ★语义等待：轮询判据（✗ 不用固定睡眠当结果）
		async 等(会话, 判据表达式, { 超时 = 15000, 间隔 = 250, 名 = "判据" } = {}) {
			const t0 = Date.now();
			while (Date.now() - t0 < 超时) {
				let v; try { v = await this.求值(会话, 判据表达式); } catch { v = false; }
				if (v) return { 成: true, 值: v, 耗时: Date.now() - t0 };
				await new Promise((r) => setTimeout(r, 间隔));
			}
			return { 成: false, 名, 耗时: Date.now() - t0 };
		},
		async 截图(会话, 路径, 全页 = false) {
			const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: 全页 }, 会话);
			writeFileSync(路径, Buffer.from(r.data, "base64"));
			return 路径;
		},
	};
}

/* ---------- 本轮判据（`books#280` ⑥） ---------- */
const 文案锚 = "请从存档继续";
const 初态锚 = "头一回下来";
const 就绪 = `(() => { const p=document.querySelector('#passages .passage'); return !!(p && (p.innerText||'').trim().length>20); })()`;
const 读正文 = `(() => {
	const p = document.querySelector('#passages .passage');
	const 正文 = (p?.innerText ?? '').replace(/\\s+/g,' ').trim();
	let 存 = null;
	try {
		const S = (window.SugarCube ?? window).Save?.slots;
		if (S) { const 键 = Object.keys(S).filter((k) => /^\\d+$/.test(k));
			存 = { 键数: 键.length, has: typeof S.has === 'function' ? 键.map((k) => !!S.has(Number(k))) : null }; }
	} catch (e) { 存 = { 错: String(e) }; }
	return { 段落: p?.id ?? null, 正文长: 正文.length, 全文: 正文, 存 };
})()`;

const 等CDP = async (端口, 超时 = 30000) => {
	const t0 = Date.now();
	while (Date.now() - t0 < 超时) {
		try { const v = await (await fetch(`http://127.0.0.1:${端口}/json/version`)).json(); if (v?.webSocketDebuggerUrl) return v; } catch {}
		await new Promise((r) => setTimeout(r, 300));
	}
	throw new Error(`CDP 未就绪（端口 ${端口}）`);
};

const 一轮 = async ({ 名, 端口, 正控 }) => {
	const profile = path.join(证据, `prof-${名}`);
	rmSync(profile, { recursive: true, force: true }); mkdirSync(profile, { recursive: true });
	const log = path.join(证据, `chrome-${名}.log`);
	const 子 = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
		`--remote-debugging-port=${端口}`, `--user-data-dir=${profile}`, "--window-size=1440,1000",
		"--no-first-run", "--no-default-browser-check", "about:blank"],
		{ env: { ...process.env, LD_LIBRARY_PATH: CHROME_DEPS }, stdio: ["ignore", "pipe", "pipe"] });
	let 屏 = ""; 子.stdout.on("data", (d) => { 屏 += d; }); 子.stderr.on("data", (d) => { 屏 += d; });
	try {
		const 版 = await 等CDP(端口);
		const D = await 连接CDP(端口);
		const 页 = await D.开页("about:blank");
		await D.送("Page.navigate", { url: `file://${产物}` }, 页.会话);
		const 起 = await D.等(页.会话, 就绪, { 超时: 30000, 名: "开场正文出现" });
		await new Promise((r) => setTimeout(r, 600));
		const 初 = await D.求值(页.会话, 读正文);
		await D.截图(页.会话, path.join(证据, `${名}-初态.png`));
		let 控 = null;
		if (正控) {
			const 点 = await D.真点(页.会话, ".footersave a");      // ★点真锚（见头注「装置坑」）
			const 落 = await D.等(页.会话,
				`(() => { try { const S=(window.SugarCube??window).Save?.slots; return !!(S && S.has && S.has(3)); } catch { return false; } })()`,
				{ 超时: 12000, 名: "槽 3 落档" });
			await D.送("Page.navigate", { url: `file://${产物}` }, 页.会话);
			await D.等(页.会话, 就绪, { 超时: 30000, 名: "重载后正文出现" });
			await new Promise((r) => setTimeout(r, 600));
			const 后 = await D.求值(页.会话, 读正文);
			await D.截图(页.会话, path.join(证据, `${名}-存后.png`));
			控 = { 点成: 点.成, 点因: 点.因 ?? null, 落档: 落.成, 落档耗时: 落.耗时, 含文案锚: 后.全文.includes(文案锚) };
		}
		await D.关页(页.targetId); D.关();
		return { 名, 端口, 浏览器: 版.Browser, 起段: 起.成, 起段耗时: 起.耗时,
			段落: 初.段落, 正文长: 初.正文长, 存: 初.存,
			含文案锚: 初.全文.includes(文案锚), 含初态锚: 初.全文.includes(初态锚), 正文首: 初.全文.slice(0, 160), 控 };
	} finally {
		子.kill("SIGKILL");
		writeFileSync(log, 屏);
		if (!留档) rmSync(profile, { recursive: true, force: true });
	}
};

mkdirSync(证据, { recursive: true });
const 结果 = [];
for (const { 名, 端口, 正控 } of [{ 名: "A", 端口: 9321, 正控: true }, { 名: "B", 端口: 9322, 正控: false }]) {
	try { 结果.push(await 一轮({ 名, 端口, 正控 })); }
	catch (e) { console.error(`✗ 实例 ${名} 起不来：${e.message}`); process.exit(2); }
}
writeFileSync(path.join(证据, "读数.json"), JSON.stringify(结果, null, 2));

const 初态两向 = 结果.length === 2
	&& 结果.every((r) => r.含文案锚 === false && r.含初态锚 === true);
const 正控向 = 结果.find((r) => r.控)?.控?.含文案锚 === true;
for (const r of 结果) {
	console.log(`实例 ${r.名}（端口 ${r.端口}）：起段 ${r.起段 ? `✓${r.起段耗时}ms` : "✗超时"}｜段落 ${r.段落}｜正文长 ${r.正文长}｜存档读数 ${JSON.stringify(r.存)}`
		+ `\n  初态：含「${文案锚}」=${r.含文案锚 ? "★是" : "否"}｜含「${初态锚}」=${r.含初态锚 ? "是" : "否"}`
		+ (r.控 ? `\n  ★正控（真点 .footersave a ⇒ 槽 3 ⇒ 重载）：点成 ${r.控.点成 ? "✓" : "✗ " + r.控.点因}｜落档 ${r.控.落档 ? `✓${r.控.落档耗时}ms` : "✗"}｜含「${文案锚}」=${r.控.含文案锚 ? "★是" : "否"}` : ""));
}
console.log(`两 profile 初态（无档）⇒ **不出**「${文案锚}」且**出**初态句：${初态两向 ? "★是" : "✗ 否"}`);
console.log(`正控（有档 ⇒ 重载）⇒ **出**「${文案锚}」：${正控向 ? "★是" : "✗ 否"}`);
console.log(初态两向 && 正控向 ? "✓ 首载变体 e2e 通过" : "✗ 首载变体 e2e 失败（见上）");
console.log(`读数与截图：${证据}/`);
process.exit(初态两向 && 正控向 ? 0 : 1);
