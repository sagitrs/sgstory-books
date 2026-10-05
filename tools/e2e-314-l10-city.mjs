/* books#314：真实 Chromium 的 L10 菜单、交易、Save.slots、卷轴重绘与两终局。
 * 明确注入资源／工具夹具，不是 2–3 远征收益或平衡验收。Node 22，无新增依赖。
 * 用法：node tools/e2e-314-l10-city.mjs --engine <检出> --evidence <目录>
 * CHROME／CHROME_DEPS 与 e2e-280-firstload 相同。0=全过，1=断言失败，2=前置错误。
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
const arg = (key) => { const i = process.argv.indexOf(key); return i < 0 ? null : process.argv[i + 1]; };
const books = path.resolve(import.meta.dirname, '..');
const engine = arg('--engine') && path.resolve(arg('--engine'));
const product = path.join(books, 'stories/babel/babel-trial.html');
const evidence = path.resolve(arg('--evidence') ?? path.join(process.env.HOME, 'tmp', `e2e-314-${Date.now()}`));
const chrome = process.env.CHROME ?? path.join(process.env.HOME, '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const deps = process.env.CHROME_DEPS ?? path.join(process.env.HOME, '.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((x) =>
	x.isDirectory() ? walk(path.join(dir, x.name)) : [path.join(dir, x.name)]);
let snapshot;
try {
	if (!engine || !fs.existsSync(product) || !fs.existsSync(chrome)) throw Error('须提供 --engine、当前故事产物与 Chrome');
	if (typeof fetch !== 'function' || typeof WebSocket !== 'function') throw Error('需要带原生 fetch／WebSocket 的 Node 22');
	fs.accessSync(chrome, fs.constants.X_OK);
	const pin = spawnSync(process.execPath, [path.join(books, 'tools/check-engine-pin.mjs'), '--engine', engine], { cwd: books, encoding: 'utf8' });
	if (pin.status !== 0) throw Error(`引擎 pin 前置失败：${pin.stderr || pin.stdout || pin.error?.message}`);
	const sources = [...walk(path.join(engine, 'src')), ...walk(path.join(books, 'stories/babel/src')), path.join(engine, 'build.py'), path.join(books, 'stories/babel/story.json')];
	const old = sources.find((p) => fs.statSync(p).mtimeMs > fs.statSync(product).mtimeMs);
	if (old) throw Error(`产物早于源码：${old}；先重新构建`);
	const revision = (dir) => { const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
	const status = spawnSync('git', ['-C', books, 'status', '--porcelain'], { encoding: 'utf8' });
	snapshot = { booksHead: revision(books), engineHead: revision(engine),
		artifactSha256: createHash('sha256').update(fs.readFileSync(product)).digest('hex'),
		booksStatus: status.status === 0 ? status.stdout.trim() : 'not available (archive/non-git source)' };
} catch (e) { console.error(`前置错误：${e.message}`); process.exit(2); }
fs.mkdirSync(evidence, { recursive: true });
const profile = fs.mkdtempSync(path.join(evidence, 'profile-'));
const browser = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
	'--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1440,1000', '--no-first-run', 'about:blank'],
	{ env: { ...process.env, LD_LIBRARY_PATH: deps }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', ws, seq = 0, session, exitCode = 0, loads = 0;
const total = 24, rows = [], errors = [], pageChecks = [], pending = new Map(), start = Date.now();
browser.stdout.on('data', (x) => { log += x; }); browser.stderr.on('data', (x) => { log += x; });
browser.on('error', (e) => errors.push(e.message));
const wait = async (fn, name, timeout = 15000) => {
	const end = Date.now() + timeout; let last;
	while (Date.now() < end) {
		try { const v = await fn(); if (v) return v; } catch (e) { last = e; }
		await new Promise((r) => setTimeout(r, 60));
	}
	throw Error(`${name} 超时${last ? `：${last.message}` : ''}`);
};
const send = (method, params = {}, target = session) => new Promise((resolve, reject) => {
	const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP ${method} 超时`)); }, 15000);
	pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params, ...(target ? { sessionId: target } : {}) }));
});
const evaluate = async (body) => {
	const r = await send('Runtime.evaluate', { expression: `(() => { const S=SugarCube, V=S.State.variables,
		B=S.setup.BABEL, R=S.setup.RPG, P=S.setup.DND3.Player; ${body} })()`, returnByValue: true, awaitPromise: true });
	if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
	return r.result.value;
};
// SugarCube 的宏错误可以只渲成 DOM 而不抛 JS 异常；必须查实际错误节点。
// 只声明本工具访问过的当前段落，不据此推断未访问段落无错。
const readPageErrors = () => evaluate(`const host=document.querySelector('#passages .passage:last-of-type');
	if(!host) throw Error('页面错误检查缺当前段落');
	return {passage:host.dataset.passage,issues:[...new Set([...host.querySelectorAll('.error,.error-view')].map(x=>x.textContent.trim()))]};`);
const assertPageHealthy = async (where) => {
	const result = await readPageErrors(); pageChecks.push({ where, ...result });
	if (result.issues.length) {
		const error = Error(`页面渲染错误（${where}／${result.passage}）：${result.issues.join('\n')}`);
		error.code = 'STORY_RENDER_ERROR'; throw error;
	}
};
const check = async (name, body) => {
	const value = await evaluate(body), row = { name, passed: value === true }; rows.push(row);
	try { await assertPageHealthy(name); } catch (e) { row.passed = false; throw e; }
	if (value !== true) throw Error(`${name} 失败（${JSON.stringify(value)}）`);
};
const click = async (text) => {
	const box = await wait(async () => evaluate(`const host=document.querySelector('#passages .passage:last-of-type');
		const el=[...(host?.querySelectorAll('a,button')??[])].find((x)=>x.textContent.trim().startsWith(${JSON.stringify(text)}));
		if(!el || Number(getComputedStyle(host).opacity)<1 || Number(getComputedStyle(el).opacity)<1) return null;
		el.scrollIntoView({block:'center'}); const b=el.getBoundingClientRect();
		return b.width&&b.height ? {x:b.left+b.width/2,y:b.top+b.height/2}:null;`), `按钮「${text}」`);
	await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
	await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
};
const atPassage = async (name) => {
	await wait(() => evaluate(`const host=document.querySelector('#passages .passage:last-of-type');
		return S.State.passage===${JSON.stringify(name)}&&host?.dataset.passage===${JSON.stringify(name)}
			&&Number(getComputedStyle(host).opacity)===1&&host.getBoundingClientRect().height>0;`), `可见段落 ${name}`);
	await assertPageHealthy(`可见段落 ${name}`);
};
const screenshot = async (name) => {
	// 点击背包可能把视口留在正文下面；DOM 有文字不等于截图看得到。
	// 先回页首、等字体与两次绘制，再核当前段落实际进入视口。
	await atPassage(await evaluate('return S.State.passage;'));
	await evaluate('return (async()=>{ await document.fonts.ready; window.scrollTo(0,0); await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); return true; })();');
	await wait(() => evaluate('const h=document.querySelector("#passages .passage:last-of-type"),b=h?.getBoundingClientRect(); return b?.height>0&&b.bottom>0&&b.top<innerHeight&&Number(getComputedStyle(h).opacity)===1;'), '截图段落进入视口');
	await assertPageHealthy(`截图 ${name}`);
	fs.writeFileSync(path.join(evidence, `${name}.json`), JSON.stringify(await evaluate('const h=document.querySelector("#passages .passage:last-of-type"),b=h.getBoundingClientRect(); return {passage:S.State.passage,location:B.map.current,scrollY,top:b.top,bottom:b.bottom,body:h.innerText};'), null, 2));
	const r = await send('Page.captureScreenshot', { format: 'png' });
	fs.writeFileSync(path.join(evidence, `${name}.png`), Buffer.from(r.data, 'base64'));
};
try {
	const portFile = path.join(profile, 'DevToolsActivePort');
	await wait(() => fs.existsSync(portFile), 'Chrome 启动');
	const port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
	const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
	ws = new WebSocket(version.webSocketDebuggerUrl); await once(ws, 'open');
	ws.addEventListener('message', (e) => {
		const msg = JSON.parse(e.data), p = pending.get(msg.id);
		if (p) { clearTimeout(p.timer); pending.delete(msg.id); msg.error ? p.reject(Error(msg.error.message)) : p.resolve(msg.result); }
		else if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
		else if (msg.method === 'Page.loadEventFired') loads += 1;
	});
	const target = await send('Target.createTarget', { url: 'about:blank' }, null);
	session = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, null)).sessionId;
	await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: `file://${product}` });
	await atPassage('开始');
	// 真 wiki 渲染两态，复用同一错误取数器；探针不改 State，finally 移除。
	let rejected, accepted;
	try {
		await evaluate(`if(typeof jQuery.fn.wiki!=='function') throw Error('缺 SugarCube wiki 入口，无法自证渲染判据');
			const probe=document.createElement('div'); probe.id='l10-render-probe';
			document.querySelector('#passages .passage:last-of-type').append(probe); jQuery(probe).wiki('<</if>>');`);
		rejected = await readPageErrors();
		await evaluate(`const probe=document.getElementById('l10-render-probe'); probe.replaceChildren(); jQuery(probe).wiki('<<if true>>合法分支<</if>>');`);
		accepted = await readPageErrors();
	} finally { await evaluate(`document.getElementById('l10-render-probe')?.remove();`); }
	fs.writeFileSync(path.join(evidence, 'render-sensor-selftest.json'), JSON.stringify({ rejected, accepted }, null, 2));
	await check('真实孤立宏须检出、合法 if 渲染须放过', `return ${JSON.stringify(!!rejected?.issues.some(x=>x.includes('/if')) && accepted?.issues.length===0)};`);
	await click('战斗教学'); await atPassage('L1 苏醒'); await click('站起来'); await atPassage('探索');
	await check('StoryInit 两项进度及寄存初态', 'return V.babelL10.sold===0&&!V.babelL10.resident&&V.babelL10Storage.length===0&&typeof R.exchange==="function";');
	// 起始资源／工具夹具在此注入；堆叠原件和旧形存档夹具在各自组内明示。
	// 后续交易、领证、修理、寄存、终局均按真实按钮。
	await evaluate('R.deposit(P.items,"wood",10); R.deposit(P.items,"pick",2); const picks=P.items.filter(s=>s.id==="pick"); picks[0].charges=2; picks[1].charges=4; B.map.moveTo("L10-camp"); S.Engine.play("探索");');
	await click('前往第 10 层 · Ration House'); await click('出售资源'); await atPassage('L10 出售');
	await check('真实槽保存交易前菜单', 'S.Save.slots.save(4,"L10 交易夹具"); return S.Save.slots.has(4);');
	await click('出售手上全部木材'); await atPassage('探索');
	await check('成交原子、贡献累计', 'return V.babelL10.sold===80&&B.手上有("wood")===0&&B.手上有("coin")===80;');
	await evaluate('return (async()=>{ await S.Save.slots.load(4); S.Engine.show(); })();'); await atPassage('L10 出售');
	await check('读档回滚库存及贡献、菜单可重建', 'return V.babelL10.sold===0&&B.手上有("wood")===10&&!V.babelL10.resident;');
	await click('出售手上全部木材'); await atPassage('探索'); await screenshot('01-sale-loaded');
	await click('回共炉'); await click("前往第 10 层 · Newcomers' Registry"); await click('申请居民证');
	await wait(() => evaluate('return V.babelL10.resident;'), '居民证');
	await check('免费领证、持证不自动留居', 'return B.手上有("coin")===80&&V.babelL10.sold===80&&!V.babelRun.终局;');
	await click('申请居民证'); await check('领证幂等', 'return B.手上有("coin")===80&&V.babelL10.sold===80;');
	await click('回共炉'); await click('前往第 10 层 · Ration House'); await click('购买补给'); await atPassage('L10 补给');
	await click('回城卷轴：'); await atPassage('探索');
	await check('购买同笔提交、消费不减贡献', 'return B.手上有("coin")===50&&B.手上有("return-scroll")===1&&V.babelL10.sold===80;');
	await click('购买补给'); await atPassage('L10 补给'); await click('绷带：'); await atPassage('探索');
	await check('新品批数沿用两次绷带', 'return B.手上有("coin")===42&&B.手上有("bandage")===2;');
	await click('回共炉'); await click('前往第 10 层 · Ember Workshop'); await click('修理单件工具'); await atPassage('L10 修理');
	await click('修理矿镐'); await atPassage('探索');
	await check('真实修理仅改选中一件', 'const a=P.items.filter(s=>s.id==="pick"); return a[0].charges===6&&a[1].charges===4&&B.手上有("coin")===37;');
	await click('回共炉'); await click('个人寄存'); await atPassage('L10 寄存'); await click('寄存：矿镐'); await atPassage('探索');
	await check('个人寄存不赠物、不改身份／耐久', 'return V.babelL10Storage.length===1&&V.babelL10Storage[0].charges===6&&P.items.filter(s=>s.id==="pick").length===1;');
	const stackFixture = await evaluate('const moved={...P.items.find(s=>s.id==="bandage")}; const existing={...R.createItem("bandage").toJSON(),charges:1,equipped:false}; V.babelL10Storage.push(existing); return {moved,existing};');
	await click('个人寄存'); await atPassage('L10 寄存'); await click('寄存：绷带'); await atPassage('探索');
	await check('同类堆叠原件寄存不并号、不改原有次数', `const x=${JSON.stringify(stackFixture)}; return V.babelL10Storage.filter(s=>s.id==="bandage").length===2&&V.babelL10Storage.some(s=>s.entityId===x.moved.entityId&&s.charges===x.moved.charges)&&JSON.stringify(V.babelL10Storage.find(s=>s.entityId===x.existing.entityId))===JSON.stringify(x.existing);`);
	const receiver = await evaluate('R.deposit(P.items,"bandage"); return {...P.items.find(s=>s.id==="bandage")};');
	await click('个人寄存'); await atPassage('L10 寄存'); await click(`取回：绷带［${stackFixture.moved.entityId}］`); await atPassage('探索');
	await check('同类堆叠原件取回也保双份身份／次数', `const x=${JSON.stringify(stackFixture)},y=${JSON.stringify(receiver)}; return P.items.filter(s=>s.id==="bandage").length===2&&P.items.some(s=>s.entityId===x.moved.entityId&&s.charges===x.moved.charges)&&JSON.stringify(P.items.find(s=>s.entityId===y.entityId))===JSON.stringify(y)&&JSON.stringify(V.babelL10Storage.find(s=>s.entityId===x.existing.entityId))===JSON.stringify(x.existing)&&V.babelL10.sold===80;`);
	await check('真实槽保存资格和双袋', 'S.Save.slots.save(5,"L10 寄存夹具"); return S.Save.slots.has(5);');
	const beforeReload = loads; await send('Page.reload'); await wait(() => loads > beforeReload, '实际页面刷新'); await atPassage('探索');
	await check('页面刷新恢复城市域与原件寄存', 'return V.babelL10.sold===80&&V.babelL10.resident&&V.babelL10Storage[0].charges===6&&P.items.filter(s=>s.id==="pick").length===1;');
	await click('走向上行门'); await click('穿过单向门');
	await wait(() => evaluate('return B.map.current==="L11";'), '证后正常上行');
	const beforeReturn = await evaluate('return JSON.stringify({sold:V.babelL10.sold,storage:V.babelL10Storage,events:V.span1Events,arc:V.span1Arc});');
	await click('回城卷轴'); await wait(() => evaluate('return B.map.current==="L10-camp"&&B.手上有("return-scroll")===0;'), '付费卷轴返程与扣次');
	await check('卷轴无资源／事件／寄存重置', `return ${JSON.stringify(beforeReturn)}===JSON.stringify({sold:V.babelL10.sold,storage:V.babelL10Storage,events:V.span1Events,arc:V.span1Arc});`);
	await wait(() => evaluate('const text=document.querySelector("#passages .passage:last-of-type").innerText; return text.includes("【第 10 层 · Common Hearth")&&!text.includes("【第 11 层");'), '返程地图正文重绘');
	await screenshot('02-return');
	await click('听听受役契约'); await atPassage('L10 契约'); await click('暂不签署'); await atPassage('探索');
	await check('契约初次取消无终局', 'return !V.babelRun.终局&&!P.contains("death");');
	await click('听听受役契约'); await atPassage('L10 契约'); await click('仍考虑接受'); await atPassage('L10 契约确认');
	await click('拒绝，保留自由'); await atPassage('探索'); await check('最终确认也可取消', 'return !V.babelRun.终局;');
	await click('听听受役契约'); await atPassage('L10 契约'); await click('仍考虑接受'); await atPassage('L10 契约确认');
	await click('最终确认：失去自由'); await atPassage('失去自由');
	await check('自由终局不伪装死亡、关闭道具操作', 'return V.babelRun.终局类型==="enslaved"&&P.hp>0&&!P.contains("death")&&V.babelRun.deaths===0&&document.querySelectorAll("#passages .passage:last-of-type .rpg-item-link").length===0;');
	await screenshot('03-freedom'); await evaluate('return (async()=>{ await S.Save.slots.load(5); S.Engine.show(); })();'); await atPassage('探索');
	await check('真实读档恢复资格、双袋和活人', 'return V.babelL10.resident&&V.babelL10.sold===80&&V.babelL10Storage[0].charges===6&&!V.babelRun.终局;');
	// 旧形夹具仍走真实槽：不以合成 save:ready 冒充宿主往返。
	const legacyInventory = await evaluate('return JSON.stringify(P.items);');
	await check('真实槽写入缺新域的旧形夹具', 'delete V.babelL10; delete V.babelL10Storage; V.span1Farms=1; S.Save.slots.save(6,"L10 缺域旧形夹具"); return S.Save.slots.has(6);');
	await evaluate('return (async()=>{ await S.Save.slots.load(6); S.Engine.show(); })();'); await atPassage('探索');
	await check('真实旧形往返只补缺，不追贡献／清农田／改原背包', `return V.babelL10.sold===0&&V.babelL10.resident===false&&Array.isArray(V.babelL10Storage)&&V.babelL10Storage.length===0&&V.span1Farms===1&&JSON.stringify(P.items)===${JSON.stringify(legacyInventory)};`);
	await evaluate('return (async()=>{ await S.Save.slots.load(5); S.Engine.show(); })();'); await atPassage('探索');
	await click('谈论正式留居'); await atPassage('L10 留居'); await click('考虑正式留居'); await atPassage('L10 留居确认');
	await click('最终确认：留在共炉'); await atPassage('留在共炉');
	await check('正常留居不同于死亡与奴役', 'return V.babelRun.终局类型==="settled"&&P.hp>0&&!P.contains("death")&&V.babelRun.deaths===0;');
	await screenshot('04-residence'); await click('重开'); await atPassage('开始');
	await check('真重开不继承本局资格、寄存或终局', 'return V.babelL10.sold===0&&!V.babelL10.resident&&V.babelL10Storage.length===0&&!V.babelRun.终局&&V.inventory.length===0;');
	if (rows.length !== total) throw Error(`浏览器断言组数不符：${rows.length}/${total}`);
	if (errors.length) throw Error(`浏览器脚本异常：${errors.join('\n')}`);
} catch (e) {
	exitCode = e.code === 'STORY_RENDER_ERROR' || rows.length ? 1 : 2; errors.push(e.stack ?? e.message); console.error(e.stack ?? e);
	if (session) {
		try { fs.writeFileSync(path.join(evidence, 'failure.json'), JSON.stringify(await evaluate('return {passage:S.State.passage,location:B.map.current,body:document.body.innerText,city:V.babelL10,inventory:P.items};'), null, 2)); }
		catch (detail) { errors.push(`诊断读取失败：${detail.message}`); }
	}
}
finally {
	for (const p of pending.values()) { clearTimeout(p.timer); p.reject(Error('CDP 已关闭')); } pending.clear();
	if (ws?.readyState === 1) {
		try { await send('Browser.close', {}, null); }
		catch (e) { console.error(`关闭本次 Chrome：${e.message}`); }
	}
	ws?.close();
	if (browser.exitCode === null && browser.signalCode === null) {
		browser.kill('SIGTERM');
		await Promise.race([once(browser, 'exit'), new Promise((r) => setTimeout(r, 3000))]);
	}
	if (browser.exitCode === null && browser.signalCode === null) { browser.kill('SIGKILL'); await once(browser, 'exit'); }
	fs.writeFileSync(path.join(evidence, 'chrome.log'), log);
	try {
		// Linux 下独立进程组只属于这次 spawn；主进程退出不代表其子进程已停止写 profile。
		// 不按进程名杀 Chrome，不触及其他测试或会话。已退出的组（ESRCH）是正常关闭。
		if (process.platform !== 'win32' && Number.isInteger(browser.pid)) {
			try { process.kill(-browser.pid, 'SIGKILL'); }
			catch (e) { if (e.code !== 'ESRCH') throw e; }
		}
		await fs.promises.rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 100 });
	}
	catch (e) { const message = `本次浏览器 profile 清理失败：${e.message}`; console.error(message); errors.push(message); exitCode ||= 2; }
	fs.writeFileSync(path.join(evidence, 'result.json'), JSON.stringify({ scope: 'Local Chromium, injected resource/tool fixture; NOT balance acceptance', snapshot, exitCode, total, skipped: Math.max(0, total-rows.length), rows, errors, pageChecks, seconds: (Date.now()-start)/1000 }, null, 2));
}
console.log(`环境: Local Chromium | 通过: ${rows.filter((r)=>r.passed).length}/${rows.length} | 跳过: ${Math.max(0,total-rows.length)}${rows.length<total?'（未到达）':''} | 耗时: ${(Date.now()-start)/1000}s`);
console.log(`证据: ${evidence}`); process.exit(exitCode);
