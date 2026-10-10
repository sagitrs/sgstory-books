import test from 'node:test';
import assert from 'node:assert/strict';
import { playCase } from '../../../tools/cli/player.mjs';
// These seeds are ordinary launch configuration, never a live RNG override.
const steps = async (p, frame, labels) => { for (const label of labels) frame = await p.select(frame, label); return frame; };
async function ready(p) {
  let f = await p.frame(); assert.match(f, /灰港营地/);
  return steps(p, f, ['普通出发', '走崖道', '取铜矿', '购买长刀', '购买护胸', '购买行粮', '购买回春药', '使用回春药', '离开商店']);
}
async function win(p) {
  let f = await ready(p);
  f = await steps(p, f, ['应战', '走林地', '拾3份干粮', '献2金币点灯', '挑战失灯守卫', '点亮灯塔']);
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
  f = await steps(p, f, ['普通出发', '走崖道', '取铜矿', '离开商店', '应战', '走林地', '拾3份干粮', '取5金币', '挑战失灯守卫']);
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
  f = await steps(p, f, ['普通出发', '走沼泽', '捞漂粮', '购买长刀', '购买护胸', '离开商店', '应战']);
  assert.match(f, /灰沟鼠群/); f = await steps(p, f, ['走沙地', '驱逐食砂犬']);
  assert.match(f, /食砂犬：潜在反击4/); assert.match(f, /空灯祠堂/); f = await steps(p, f, ['取5金币', '挑战失灯守卫']);
  if (f.includes('送灯失败')) assert.match(f, /长期：胜0，败1/);
  else { f = await p.select(f, '点亮灯塔'); assert.match(f, /送灯成功/); }
  await p.quit();
}));
test('HOF-E06 natural food exhaustion has a legal nonvictory exit', async () => playCase(async make => {
  const p = make(); let f = await p.frame();
  f = await steps(p, f, ['普通出发', '走沼泽', '用2粮换4金币', '购买长刀', '购买鳞甲', '离开商店', '应战', '走林地']);
  assert.match(f, /粮食0/); assert.doesNotMatch(f, /^\d+\. 拾3份干粮/m); f = await p.select(f, '粮食耗尽');
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
