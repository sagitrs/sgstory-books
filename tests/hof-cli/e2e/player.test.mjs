import test from 'node:test';
import assert from 'node:assert/strict';
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
