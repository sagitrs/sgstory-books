import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { playCase } from '../../../tools/cli/player.mjs';
// These seeds are ordinary launch configuration, never a live RNG override.
const steps = async (p, frame, labels) => { for (const label of labels) frame = await p.select(frame, label); return frame; };
const counters = text => { const m = text.match(/动作数: (\d+)；随机消费: (\d+)/); assert.ok(m, text); return m.slice(1).map(Number); };
async function ready(p) {
  let f = await p.frame(); assert.match(f, /灰港营地/);
  return steps(p, f, ['普通出发', '走崖道', '取铜矿', '购买长刀', '购买护胸', '购买行粮', '购买回春药', '使用回春药', '离开商店']);
}
const grove = async p => steps(p, await ready(p), ['应战', '走林地']);
async function win(p) {
  let f = await grove(p);
  f = await steps(p, f, ['分给他两份口粮', '循着声音辨认', '不取供品', '挑战失灯守卫', '点亮灯塔']);
  assert.match(f, /送灯成功/); assert.match(f, /长期：胜1，败0/); return f;
}
test('HOF-E01 normal player completes equipped blessed victory', async () => playCase(async make => {
  const p = make(); const f = await win(p);
  assert.match(f, /整场战斗2/); assert.match(await p.command('bag'), /武器：长刀；护甲：护胸；祝福：灯祝福/);
  assert.match(await p.command('map'), /断绳崖道.*旧桥商店.*桥下伏击.*第二道岔路.*倒木林地.*空灯祠堂.*失灯守卫.*旧灯塔/s);
  await p.quit();
}));
test('HOF-E02 saved victory exposes usable next-run canal', async () => playCase(async make => {
  const p = make(); await win(p); assert.match(await p.command('save journey'), /已保存：journey/); await p.quit();
  const q = make(7); await q.frame(); let f = await q.command('load journey');
  assert.match(f, /送灯成功/); assert.match(f, /已解锁：潮渠捷径/);
  f = await q.select(f, '再走一局');
  f = await q.select(f, '走潮渠捷径'); assert.match(f, /旧桥商店/); assert.match(f, /耗1粮，没有额外奖励/);
  assert.match(await q.command('status'), /生命20\/20；金币10；粮食7；本局2/); assert.match(await q.command('map'), /已过：雾中岔路 → 潮渠暗门/);
  await q.quit();
}));
test('HOF-E03 natural seeded defeat enables real watch departure', async () => playCase(async make => {
  const p = make(0); let f = await p.frame();
  f = await steps(p, f, ['普通出发', '走崖道', '取铜矿', '离开商店', '应战', '走林地', '带上倒木边', '循着声音辨认', '迎击倒木后的鼠群']);
  assert.match(f, /送灯失败/); assert.match(f, /长期：胜0，败1/); assert.match(await p.command('bag'), /背包：空/);
  f = await p.select(f, '带守夜护符出发'); assert.match(f, /带着护胸/); assert.match(await p.command('bag'), /护甲：护胸/);
  f = await steps(p, f, ['走崖道', '扶绳通过']); assert.match(f, /购买长刀（5金币）/); await p.quit();
}));
test('HOF-E04 cross-process save restores actual next battle and RNG', async () => playCase(async make => {
  const p = make(); let f = await ready(p); assert.match(await p.command('save split'), /已保存：split/);
  f = await p.select(f, '应战'); const expectedFrame = f, expectedStatus = await p.command('status'); await p.quit();
  const q = make(999); await q.frame(); f = await q.command('load split'); assert.match(f, /桥下伏击/);
  f = await q.select(f, '应战'); assert.equal(f, expectedFrame); assert.equal(await q.command('status'), expectedStatus);
  await q.quit();
}));
test('HOF-E05 marsh and dunes are real playable resource branches', async () => playCase(async make => {
  const p = make(42); let f = await p.frame();
  f = await steps(p, f, ['普通出发', '走沼泽', '捞漂粮', '购买长刀', '购买护胸', '离开商店']);
  assert.match(f, /灰沟鼠群从两侧/); f = await p.select(f, '应战'); assert.match(f, /灰沟鼠群：有效反击/);
  f = await p.select(f, '走沙地'); assert.match(f, /两只食砂犬/); f = await p.select(f, '驱逐食砂犬');
  assert.match(f, /食砂犬：有效反击/); assert.match(f, /空灯祠堂/); f = await steps(p, f, ['取走供品', '挑战失灯守卫']);
  if (f.includes('送灯失败')) assert.match(f, /长期：胜0，败1/);
  else { f = await p.select(f, '点亮灯塔'); assert.match(f, /送灯成功/); }
  await p.quit();
}));
test('HOF-E06 natural food exhaustion has a legal nonvictory exit', async () => playCase(async make => {
  const p = make(); let f = await p.frame();
  f = await steps(p, f, ['普通出发', '走沼泽', '用2粮换4金币', '购买长刀', '购买鳞甲', '离开商店', '应战', '走林地']);
  assert.match(f, /粮食0/); assert.doesNotMatch(f, /^\d+\. 带上倒木边/m); f = await p.select(f, '粮食耗尽');
  assert.match(f, /旅程撤退/); assert.match(f, /长期：胜0，败0，撤退1/); assert.match(f, /已解锁：无/); await p.quit();
}));
test('HOF-E07 queries and invalid commands leave visible counters unchanged', async () => playCase(async make => {
  const p = make(); let f = await p.frame(); f = await steps(p, f, ['普通出发', '走崖道', '取铜矿', '购买长刀', '购买鳞甲']);
  const before = await p.command('status'); assert.match(await p.command('buy something'), /拒绝：未知命令/);
  assert.match(await p.command('999'), /拒绝 \[UNKNOWN_CHOICE\]/); await p.command('bag'); await p.command('map'); await p.command('help');
  assert.equal(await p.command('status'), before); await p.quit();
}));
test('HOF-E08 failed normal load preserves the live game', async () => playCase(async make => {
  const p = make(); await ready(p); const before = await p.command('status');
  assert.match(await p.command('load missing'), /读取失败.*会话未改变/); assert.equal(await p.command('status'), before); await p.quit();
}));
test('HOF-E09 normal cost and equipment information is visible before acting', async () => playCase(async make => {
  const a = make(); let f = await steps(a, await a.frame(), ['普通出发', '走沼泽']);
  assert.match(f, /用2粮换4金币（另付前进1粮，共3粮）/);
  f = await a.select(f, '用2粮换4金币'); assert.match(f, /金币10→14；粮食6→3/); await a.quit();
  const b = make(); f = await ready(b); assert.match(f, /三只崖道掠鸟/); assert.doesNotMatch(f, /概率\d+%|伤害骰|潜在反击/);
  const bag = await b.command('bag'); assert.match(bag, /降低45个百分点/); assert.match(bag, /伤害减1/); await b.quit();
}));
test('HOF-E10 paid pending event survives restart and delivers cooperative boss', async () => playCase(async make => {
  const a = make(); let f = await a.select(await grove(a), '分给他两份口粮');
  assert.match(f, /阶段：林间动静·待判定/); assert.match(f, /粮食8→6/);
  assert.doesNotMatch(f, /大成功|1\/4|2\/4|3\/4|耐力|keeper-assisted/); assert.doesNotMatch(f, /^\d+\. 分给他/m);
  const paid = await a.command('status'); await a.command('save pending');
  f = await a.select(f, '循着声音辨认'); assert.match(f, /塔门前，我会再找你/); const outcome = await a.command('status');
  assert.deepEqual(counters(outcome), [counters(paid)[0] + 1, counters(paid)[1] + 1]);
  f = await a.select(f, '不取供品'); assert.match(f, /守林人从墙后/); assert.match(f, /两名失灯守卫/);
  f = await a.select(f, '挑战失灯守卫'); assert.match(f, /松脂火把/); const battle = await a.command('status'); await a.quit();
  const b = make(999); await b.frame(); f = await b.command('load pending'); assert.match(f, /阶段：林间动静·待判定/);
  assert.equal(await b.command('status'), paid); await b.command('99'); assert.equal(await b.command('status'), paid);
  f = await b.select(f, '循着声音辨认'); assert.equal(await b.command('status'), outcome);
  f = await steps(b, f, ['不取供品', '挑战失灯守卫']); assert.equal(await b.command('status'), battle);
  f = await steps(b, f, ['点亮灯塔', '再走一局']); assert.match(f, /本局2；整场战斗0/); assert.match(f, /生命20\/20；金币10；粮食8/); assert.doesNotMatch(f, /守林人从墙后/);
  await b.quit();
}));
test('HOF-E11 refusing aid still checks and reaches a noncooperative boss', async () => playCase(async make => {
  const p = make(); let f = await p.select(await grove(p), '带上倒木边');
  assert.match(f, /阶段：林间动静·待判定/); assert.match(f, /粮食8→11/);
  f = await p.select(f, '循着声音辨认'); assert.match(f, /阶段：林间遭遇·待应战/); assert.match(f, /倒木后的灰沟鼠群/);
  f = await steps(p, f, ['迎击倒木后的鼠群', '献2金币']); assert.match(await p.command('bag'), /祝福：灯祝福/);
  assert.match(f, /两名失灯守卫/); assert.doesNotMatch(f, /守林人从墙后/);
  f = await p.select(f, '挑战失灯守卫'); assert.doesNotMatch(f, /松脂火把/); assert.match(f, /整场战斗3/); await p.quit();
}));
test('HOF-E12 pending forest fight resumes without repeating decision or draw', async () => playCase(async make => {
  const a = make(); let f = await steps(a, await grove(a), ['带上倒木边', '循着声音辨认']);
  assert.match(f, /阶段：林间遭遇·待应战/); const saved = await a.command('status'); await a.command('save ambush');
  f = await a.select(f, '迎击倒木后的鼠群'); const expected = await a.command('status'); await a.quit();
  const b = make(123); await b.frame(); f = await b.command('load ambush'); assert.match(f, /阶段：林间遭遇·待应战/);
  assert.equal(await b.command('status'), saved); assert.doesNotMatch(f, /^\d+\. (带上倒木|循着声音|分给他)/m);
  f = await b.select(f, '迎击倒木后的鼠群'); assert.equal(await b.command('status'), expected); assert.match(f, /空灯祠堂/); await b.quit();
}));
test('HOF-E13 promised boss binding survives a real cross-process save', async () => playCase(async make => {
  const a = make(); let f = await steps(a, await grove(a), ['分给他两份口粮', '循着声音辨认', '不取供品']);
  assert.match(f, /守林人从墙后/); const saved = await a.command('status'); await a.command('save promised');
  f = await a.select(f, '挑战失灯守卫'); const expectedFrame = f, expected = await a.command('status'); await a.quit();
  const b = make(314); await b.frame(); f = await b.command('load promised'); assert.match(f, /守林人从墙后/); assert.equal(await b.command('status'), saved);
  f = await b.select(f, '挑战失灯守卫'); assert.equal(f, expectedFrame); assert.equal(await b.command('status'), expected); await b.quit();
}));
test('HOF-E14 inspect browses four categories and returns to the action page', async () => playCase(async make => {
  const p = make(); await p.frame(); let f = await p.command('inspect');
  assert.match(f, /玩家细节/); assert.match(f, /1\. 主动道具（共 0 项）/); assert.match(f, /4\. 情报（共 1 项）/);
  f = await p.select(f, '情报'); assert.match(f, /1\. 地图/);
  f = await p.select(f, '地图'); assert.match(f, /当前：灰港营地/);
  f = await p.command('0'); assert.match(f, /已知线索与解锁/);
  f = await p.command('0'); assert.match(f, /玩家细节/);
  f = await p.command('0'); assert.match(f, /灰港营地/);
  assert.match(await p.command('0'), /拒绝 \[NAV_NO_PARENT\]/);
  await p.quit();
}));
test('HOF-E15 inspect navigation does not consume actions or random', async () => playCase(async make => {
  const p = make(); let f = await steps(p, await p.frame(), ['普通出发', '走崖道']);
  const before = await p.command('status');
  f = await p.command('inspect'); f = await p.select(f, '情报'); f = await p.select(f, '地图');
  f = await p.command('0'); f = await p.command('0'); f = await p.command('0');
  assert.match(f, /断绳崖道/); const after = await p.command('status');
  assert.equal(after, before); assert.deepEqual(counters(after), [2, 0]);
  await p.quit();
}));
test('HOF-E16 inspect hides the unmet forester until the encounter', async () => playCase(async make => {
  const p = make(); await p.frame(); let f = await p.command('inspect');
  assert.match(f, /3\. 状态（正面＋负面）（共 0 项）/);
  f = await p.select(f, '状态'); assert.match(f, /暂无/); assert.doesNotMatch(f, /守林人/);
  f = await p.command('0'); f = await p.command('0');
  assert.match(f, /灰港营地/);
  f = await steps(p, f, ['普通出发', '走崖道', '取铜矿', '离开商店', '应战', '走林地']);
  assert.match(f, /守林人的腿仍在渗血/);
  f = await p.command('inspect'); assert.match(f, /3\. 状态（正面＋负面）（共 1 项）/);
  f = await p.select(f, '状态'); assert.match(f, /1\. 守林人/);
  f = await p.select(f, '守林人'); assert.match(f, /正等你决定分不分口粮/);
  await p.quit();
}));
test('HOF-E17 inspect debug prints entry json on stderr only', async () => playCase(async make => {
  const p = make(); let f = await steps(p, await p.frame(), ['普通出发', '走崖道', '取铜矿']);
  const before = await p.command('status');
  f = await p.command('inspect'); f = await p.select(f, '情报'); f = await p.select(f, '地图');
  assert.match(await p.command('-1'), /拒绝 \[DEBUG_DISABLED\]/); assert.equal(p.stderr, '');
  await p.quit();
  const q = make(7, { debug: true }); let g = await steps(q, await q.frame(), ['普通出发', '走崖道', '取铜矿']);
  const qBefore = await q.command('status');
  g = await q.command('inspect'); g = await q.select(g, '情报'); g = await q.select(g, '地图');
  assert.equal(await q.command('-1'), ''); assert.match(q.stderr, /"canalUnlocked":false/); assert.match(q.stderr, /"nodes":\{/);
  assert.equal(await q.command('status'), qBefore);
  await q.quit();
}));
test('HOF-E18 guarded choices print as negatives and are selected by number', async () => playCase(async make => {
  const p = make(); const f = await steps(p, await p.frame(), ['普通出发', '走崖道', '取铜矿']);
  assert.match(f, /^-1\. 放弃送灯，合法撤退$/m);
  assert.match(await p.select(f, '放弃送灯'), /旅程撤退/);
  assert.match(await p.command('status'), /撤退1/);
  await p.quit();
}));
test('HOF-E19 the player harness refuses a missing or ambiguous label', async () => playCase(async make => {
  const p = make(); const f = await steps(p, await p.frame(), ['普通出发', '走崖道', '取铜矿']);
  await assert.rejects(() => p.select(f, '这个标签不存在'), /PLAYER_CHOICE/);
  await assert.rejects(() => p.select(f, '购买'), /PLAYER_CHOICE/);
  assert.match(await p.select(f, '购买长刀'), /已受理/);
  assert.match(await p.command('bag'), /长刀/);
  await p.quit();
}));

// HOF-E20（#581 R1+R3）：旧版拒绝在 **CLI 会话层**的四条判据，一条用例同时断言、**三条轴**各测一次。
//
// 为何不能由 HOF-U81 顶替：U81 走 `new Store(dir)` ＋ `store.load()`，**不经 CLI 进程**，
// 它证明的是「组件拒绝、且不动它自己造的档」，到不了「真实玩家档 ＋ 真会话」这一层。
// 四断言为何必须分开：「会话未变」与「盘上的东西没变」判据不同、失败形态也不同——
// 会话变了但档没变 ⇒ 玩家下次还能玩；档被改了 ⇒ 玩家进度真丢了。二者不能互相顶替。
// 三轴各测一次（interfaceVersion 先检／SAVE_VERSION 后检／versionLegalState 专测「版本检查独立承重」），
// ✗ 不以一条代另一条。
//
// ★为何必须有第三条轴 versionLegalState（承 PR#641 第二轮）：
//   前两条轴篡改时都同时把 state 写坏（gold=7777）。实测发现：把引擎的 version 检查注入去掉后，
//   旧档**并不是**被专用短路门拦下，而是 restore 一路走通（game.version／revision 均过），
//   最后落到 checkedState() 抛 GAME_STATE —— 也就是说前两条轴的红形**依赖「档状态恰好被篡坏」**，
//   ✗ 不依赖版本检查本身。若档状态合法，注入后**旧档会被静默接受并替换会话**。
//   ⇒ 只测前两轴，「版本变化后的恢复」这条需求最痛的形（拿旧档、不报错、直接载入、中途炸）没被覆盖。
//   本轴只改 version、**state 保持原值**，故任何一种拒绝都只能来自版本检查本身。
const sha256 = text => crypto.createHash('sha256').update(text).digest('hex');
test('HOF-E20 stale save is refused at the CLI layer without touching session or file', async () => playCase(async (make, dir) => {
  const slotPath = path.join(dir, 'slots', 'keep.json');
  // 先造一份**真实玩家档**：走真 CLI 玩到有真 profile／run 值，再 save。
  const p = make(); let f = await p.frame();
  f = await steps(p, f, ['普通出发', '走崖道', '取铜矿']);
  assert.match(await p.command('save keep'), /已保存：keep/);
  await p.quit();
  const pristine = await fs.readFile(slotPath, 'utf8');
  assert.ok(pristine.includes('"wins"'), '真实档必须含 profile 真值');

  // 三轴：前两条篡改**同时**写坏 state（沿用 U81 的 7777 哨兵招）；第三条只错 version。
  // 每条声明 { 轴名, 改哪个字段, 是否同时污染 state }，✗ 不把三条塞进同一个 for 的隐式约定。
  // ★轴顺序是有讲究的，✗ 随便排：三条轴在**同一条用例**里顺序执行，前面的先失败就再走不到后面。
  //   control1（去掉引擎的 version 检查）注入后，「version（含污染）」轴会先在 GAME_STATE 上倒下，
  //   若把 versionLegalState 排在它**之后**，那条轴就永远执行不到 ⇒ 加了等于装饰。
  //   故把**最承重的那条**排在前面：它先证明「版本检查独立承重」，后面两条再证各自的分支。
  const axes = [
    { name: 'versionLegalState', field: 'version', corruptState: false },
    { name: 'interfaceVersion', corruptState: true },
    { name: 'version', corruptState: true },
  ];
  for (const { name: axis, field = axis, corruptState } of axes) {
    const env = JSON.parse(pristine);
    env[field] = field === 'interfaceVersion' ? env[field] + 1 : env[field] + 98;
    // 只错 version 的轴**不污染 state**：这样任何拒绝都只能来自版本检查本身，
    // ⇒ 该轴才能证明「版本检查独立承重」（前一条轴证明不了，它依赖状态恰好被篡坏）。
    if (corruptState) env.state.run.counts.gold = 7777;
    const tampered = JSON.stringify(env) + '\n';
    await fs.writeFile(slotPath, tampered, 'utf8');
    assert.notEqual(sha256(tampered), sha256(pristine), `${axis}: 篡改必须真的改了字节`);

    const q = make(7); await q.frame();
    // ② 的前像必须取**该进程自己的**现局，✗ 不拿另一进程保存时的 status 比——
    //    新进程是空会话，它的 status 本来就与保存时不同，那样比会误报（本用例初版即踩此坑）。
    const beforeLoad = await q.command('status');
    const refusal = await q.command('load keep');
    // ① 具名拒：旧存档不可用（本版不支持迁移），且指明是哪一轴不符。
    // ★message 必须带**断言身份**（「拒因须具名旧存档不可用」）而不只是实得文案：
    //   e2e.controls 的 expectAssertion 靠它判「红在哪条断言」。若 message 只写实际输出，
    //   当实现改成别的拒绝路径（如 GAME_STATE）时，失败消息里就没有身份锚，
    //   装置会把「红在 ①」误判成「红在别处」。
    assert.match(refusal, /旧存档不可用（本版不支持迁移）/, `${axis}: 拒因须具名旧存档不可用；实得：${refusal}`);
    assert.match(refusal, axis === 'interfaceVersion' ? /档为接口 v\d+/ : /档为存档格式 v\d+/, `${axis}: ${refusal}`);
    // ①b 拒因必须是**版本**这一支，✗ 不是 GAME_STATE／SAVE_GAME。
    //     ★实测诚实说明：这条**不单独承重**。上面 ① 已经覆盖同一种失败形
    //     （静默接受时 refusal 是「已读取：keep」，不含「旧存档不可用」⇒ ① 先红）。
    //     我做过的元负控：单独去掉 ①b ⇒ controls 仍 3/3；单独去掉 ① ⇒ 2/3。
    //     ⇒ 它是一条**诊断性断言**（若将来 ① 的文案被改宽、或 ① 被误删，仍能指出「落到了状态校验」），
    //     ✗ 不是独立判据。登记在案，免后来人当它承重。
    assert.doesNotMatch(refusal, /\[GAME_STATE\]|\[SAVE_GAME\]/, `${axis}: 拒因须为版本支，不得落到状态/游戏版本校验；实得：${refusal}`);
    // ② 会话未变：拒绝后 status 与该进程读档前逐字相等
    assert.equal(await q.command('status'), beforeLoad, `${axis}: 会话必须未变`);
    // ③ 盘上的东西没变：sha256 前后比（✗ 只比长度）
    assert.equal(sha256(await fs.readFile(slotPath, 'utf8')), sha256(tampered), `${axis}: 档文件不得被改写`);
    // ④ 不泄漏档内内容：输出与 stderr 都不得出现哨兵
    assert.equal(refusal.includes('7777'), false, `${axis}: 提示不得带出档内内容`);
    assert.equal(q.stderr.includes('7777'), false, `${axis}: stderr 不得带出档内内容`);
    await q.quit();
  }
}));
