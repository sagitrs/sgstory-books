import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import game, { initial, validate, apply, view, inspect, battle, counterChance, encounterOutcome, enemyFor, 组合效果 } from '../../../stories/hof-cli/game.mjs';
import { ENEMIES, ITEMS } from '../../../stories/hof-cli/content.mjs';
const { Session } = await import(pathToFileURL(path.join(process.env.HOF_ENGINE, 'src/cli/session.mjs')).href);
const { Store } = await import(pathToFileURL(path.join(process.env.HOF_ENGINE, 'src/cli/storage.mjs')).href);
const quiet = { integer: (_min, max) => max };
const deadly = { integer: (min, max) => max === 100 ? min : max };
// 派生背包（#609 §2）：非资源且数量大于0的条目；顺序＝定义表顺序。
const bag = r => Object.keys(ITEMS).filter(k => ITEMS[k].class !== 'resource' && r.counts[k] > 0);
// Legacy fixtures complete the new forest stages explicitly; stage tests below use apply one action at a time.
const walk = (s, ids, random = quiet) => {
  const act = id => { const r = apply(s, id, random); assert.equal(r.kind, 'accepted', `${id}: ${r.reason}`); };
  for (const id of ids) { act(id); if (['aid', 'forage'].includes(id)) { act('listen'); if (s.run.forester.stage === 'fight') act('forest-fight'); } }
  return s;
};
const shop = () => walk(initial(), ['begin', 'cliff', 'ore']);
const elite = () => walk(shop(), ['leave', 'fight', 'grove', 'forage', 'curse']);
const victory = () => walk(shop(), ['buy-sabre', 'buy-coat', 'buy-bread', 'leave', 'fight', 'grove', 'forage', 'bless', 'fight', 'light']);
const death = () => { const s = elite(); walk(s, ['fight'], deadly); return s; };
const choose = (s, ids) => { for (const id of ids) assert.equal(s.choose(id).kind, 'accepted', id); };
const committed = (session, before, boundary, id) => {
  const after = session.snapshot(); assert.notDeepEqual(after.state, before.state); assert.ok(after.rng.draws > before.rng.draws);
  assert.notDeepEqual(after.log, before.log); assert.equal(after.log.at(-1).choice, id); assert.equal(after.revision, before.revision + 1);
  assert.equal(session.frame().boundary, boundary + 1);
  const tag = id === 'listen' ? 'U57' : before.state.run.node === 'elite' ? 'U58' : 'U41';
  console.log(`HOF_ATOMIC ${tag} success: state=changed rng=${before.rng.draws}->${after.rng.draws} log=${before.log.length}->${after.log.length} revision=${before.revision}->${after.revision} boundary=${boundary}->${session.frame().boundary}`);
};
const failedReadout = (session, before, boundary, tag) => {
  const after = session.snapshot(); assert.deepEqual(after, before); assert.equal(session.frame().boundary, boundary);
  console.log(`HOF_ATOMIC ${tag} throw: state=unchanged rng=${before.rng.draws}->${after.rng.draws} log=${before.log.length}->${after.log.length} revision=${before.revision}->${after.revision} boundary=${boundary}->${session.frame().boundary}`);
};
test('HOF-U01 initial state and actual pinned Session are compatible', () => { assert.equal(validate(initial()), true); assert.match(new Session(game, 42).query('status'), /生命20\/20/); });
test('HOF-U02 counter probability has a nonzero five percent floor', () => assert.equal(counterChance(65, 3, true, false), 5));
test('HOF-U03 counter probability has a ninety-five percent ceiling', () => assert.equal(counterChance(100, 0, false, true), 95));
test('HOF-U04 counter threshold is inclusive and only hits roll damage', () => {
  const calls = []; const rng = { integer(min, max, purpose) { calls.push({ min, max, purpose }); return max === 100 ? 65 : 2; } };
  const r = battle(ENEMIES.birds, 20, 0, 0, false, false, rng); assert.equal(r.hits, 3); assert.equal(r.hp, 14); assert.equal(calls.length, 6); assert.match(calls[1].purpose, /有效伤害/);
});
test('HOF-U05 roll above threshold causes no counter or damage draw', () => { const calls = []; const r = battle(ENEMIES.birds, 20, 0, 0, false, false, { integer: (a, b) => { calls.push(b); return 66; } }); assert.equal(r.damage, 0); assert.deepEqual(calls, [100, 100, 100]); });
test('HOF-U06 weapon reduces probability but never potential attack count', () => { const a = battle(ENEMIES.keeper, 20, 0, 0, false, false, quiet), b = battle(ENEMIES.keeper, 20, 3, 0, false, false, quiet); assert.equal(a.potential, 8); assert.equal(b.potential, 8); assert.equal(a.chance - b.chance, 45); });
test('HOF-U07 whole battle can naturally be damage free', () => { const r = battle(ENEMIES.rats, 20, 0, 0, false, false, quiet); assert.equal(r.won, true); assert.equal(r.hp, 20); assert.equal(r.hits, 0); });
test('HOF-U08 armor reduces actual effective damage', () => { const r = battle(ENEMIES.birds, 20, 0, 1, false, false, deadly); assert.equal(r.damage, 9); assert.equal(r.hp, 11); assert.equal(r.hits, 3); });
test('HOF-U09 armor may absorb an effective hit without forced damage', () => { const r = battle(ENEMIES.birds, 20, 0, 3, false, false, { integer: () => 1 }); assert.equal(r.hits, 3); assert.equal(r.damage, 0); assert.equal(r.hp, 20); });
test('HOF-U10 death stops remaining attack and damage draws', () => { let n = 0; const r = battle(ENEMIES.keeper, 3, 0, 0, false, false, { integer(a, b) { n++; return b === 100 ? 1 : b; } }); assert.equal(r.potential, 8); assert.equal(r.checked, 1); assert.equal(r.damage, 3); assert.equal(n, 2); assert.equal(r.won, false); });
test('HOF-U11 blessing and curse change only counter probability', () => { assert.equal(counterChance(75, 1, true, false), 45); assert.equal(counterChance(75, 1, true, true), 60); });
test('HOF-U12 first departure separates fresh run from profile', () => { const s = initial(); walk(s, ['begin']); assert.equal(s.run.id, 1); assert.equal(s.run.node, 'fork'); assert.deepEqual(s.profile, { wins: 0, deaths: 0, retreats: 0, unlocks: [] }); });
test('HOF-U13 first routes have different real food costs', () => { const a = walk(initial(), ['begin', 'marsh']), b = walk(initial(), ['begin', 'cliff']); assert.equal(a.run.counts.food, 6); assert.equal(b.run.counts.food, 7); assert.notEqual(a.run.node, b.run.node); });
test('HOF-U14 zero food permits only one legal retreat settlement', () => { const s = shop(); s.run.counts.food = 0; assert.deepEqual(view(s).choices.map(x => x.id), ['retreat']); walk(s, ['retreat']); assert.equal(s.profile.retreats, 1); assert.equal(s.profile.wins, 0); const before = structuredClone(s); assert.equal(apply(s, 'retreat', quiet).kind, 'refused'); assert.deepEqual(s, before); });
test('HOF-U15 insufficient branch cost refuses without mutation or RNG', () => { const s = walk(initial(), ['begin']); s.run.counts.food = 1; const before = structuredClone(s); assert.equal(apply(s, 'marsh', { integer() { throw new Error('must not draw'); } }).kind, 'refused'); assert.deepEqual(s, before); });
test('HOF-U16 marsh event uses real Session RNG and named consumption', () => { const s = new Session(game, 42); choose(s, ['begin', 'marsh', 'fish']); const snap = s.snapshot(); assert.equal(snap.rng.draws, 1); assert.equal(snap.log.at(-1).random[0].purpose, '芦苇渡口漂粮数量'); assert.equal(snap.state.run.node, 'shop'); });
test('HOF-U17 food trade checks event and travel costs before rewards', () => { const s = walk(initial(), ['begin', 'marsh']); s.run.counts.food = 2; const before = structuredClone(s); assert.equal(apply(s, 'trade', quiet).kind, 'refused'); assert.deepEqual(s, before); s.run.counts.food = 3; walk(s, ['trade']); assert.equal(s.run.counts.food, 0); assert.equal(s.run.counts.gold, 14); });
test('HOF-U18 cliff ore consumes health and awards gold once', () => { const s = shop(); assert.equal(s.run.counts.hp, 16); assert.equal(s.run.counts.gold, 16); assert.equal(s.run.counts.food, 6); const before = structuredClone(s); assert.equal(apply(s, 'ore', quiet).kind, 'refused'); assert.deepEqual(s, before); });
test('HOF-U19 buying weapon pays once and actually equips it', () => { const s = shop(); walk(s, ['buy-sabre']); assert.equal(s.run.counts.gold, 10); assert.equal(s.run.equipped.weapon, 'sabre'); assert.deepEqual(bag(s.run), ['sabre']); });
test('HOF-U20 rejected purchase leaves fee and inventory untouched', () => { const s = shop(); s.run.counts.gold = 1; const before = structuredClone(s); assert.equal(apply(s, 'buy-sabre', quiet).kind, 'refused'); assert.deepEqual(s, before); });
test('HOF-U21 duplicate equipment is a named refusal not another charge', () => { const s = shop(); walk(s, ['buy-coat']); const before = structuredClone(s); assert.equal(apply(s, 'buy-coat', quiet).reason, '已经拥有这件装备'); assert.deepEqual(s, before); });
test('HOF-U22 changing equipped weapon never stacks both ratings', () => {
  const s = shop(); walk(s, ['buy-knife', 'buy-sabre', 'equip-knife', 'leave']);
  assert.equal(s.run.equipped.weapon, 'knife'); const calls = [];
  walk(s, ['fight'], { integer(a, b) { calls.push(b); return b === 100 ? 50 : 1; } });
  assert.equal(s.run.counts.hp, 13); assert.deepEqual(calls, [100, 4, 100, 4, 100, 4]); // Actual threshold 50%, not leaked UI metadata.
  assert.doesNotMatch(s.run.last, /概率\d+%/);
});
test('HOF-U23 tonic heals to cap and consumes exactly one bottle', () => { const s = shop(); walk(s, ['buy-tonic', 'tonic']); assert.equal(s.run.counts.hp, 20); assert.deepEqual(bag(s.run), []); });
test('HOF-U24 full health rejects tonic without consuming bottle', () => { const s = shop(); walk(s, ['buy-tonic']); s.run.counts.hp = 20; const before = structuredClone(s); assert.equal(apply(s, 'tonic', quiet).reason, '生命已满'); assert.deepEqual(s, before); });
test('HOF-U25 shop enforces three tonic carry limit without charge', () => { const s = shop(); walk(s, ['buy-tonic', 'buy-tonic', 'buy-tonic']); const before = structuredClone(s); assert.equal(apply(s, 'buy-tonic', quiet).reason, '最多携带3瓶药'); assert.deepEqual(s, before); });
test('HOF-U26 death unlock changes real next-run shop prices', () => { const s = death(); walk(s, ['begin-watch', 'cliff', 'rope']); assert.match(view(s).choices.find(x => x.id === 'buy-sabre').label, /5金币/); const old = s.run.counts.gold; walk(s, ['buy-sabre']); assert.equal(old - s.run.counts.gold, 5); });
test('HOF-U27 bread has a real five-food resource effect', () => { const s = shop(), old = s.run.counts.food; walk(s, ['buy-bread']); assert.equal(s.run.counts.food, old + 5); assert.equal(s.run.counts.gold, 13); assert.equal(bag(s.run).includes('bread'), false); });
test('HOF-U28 rescue checks three-food cost and gives nonstacking blessing', () => { const s = walk(shop(), ['leave', 'fight', 'grove']); s.run.counts.food = 2; const before = structuredClone(s); assert.equal(apply(s, 'aid', quiet).kind, 'refused'); assert.deepEqual(s, before); s.run.counts.food = 3; walk(s, ['aid']); assert.equal(s.run.counts.food, 0); assert.equal(s.run.counts.hp, 20); assert.equal(s.run.blessing, true); });
test('HOF-U29 shrine does not sell a duplicate blessing', () => { const s = walk(shop(), ['buy-bread', 'leave', 'fight', 'grove', 'aid']); const before = structuredClone(s); assert.equal(apply(s, 'bless', quiet).reason, '已有灯祝福，不能叠加'); assert.deepEqual(s, before); });
test('HOF-U30 curse money increases next battle counter risk', () => { const s = elite(); assert.equal(s.run.curse, true); assert.equal(s.run.counts.gold, 25); const r = battle(ENEMIES.keeper, 20, 0, 0, false, s.run.curse, quiet); assert.equal(r.chance, 90); });
test('HOF-U31 victory commits reward and first canal unlock together', () => { const s = victory(); assert.equal(s.run.phase, 'victory'); assert.equal(s.profile.wins, 1); assert.deepEqual(s.profile.unlocks, ['canal']); assert.equal(s.run.counts.gold, 20); assert.equal(validate(s), true); });
test('HOF-U32 finished node cannot award victory twice', () => { const s = victory(), before = structuredClone(s); assert.equal(apply(s, 'light', quiet).kind, 'refused'); assert.deepEqual(s, before); });
test('HOF-U33 death loses run resources without victory reward', () => { const s = shop(); walk(s, ['buy-sabre', 'buy-coat', 'buy-tonic', 'leave', 'fight', 'grove', 'forage', 'curse']); const gold = s.run.counts.gold; walk(s, ['fight'], deadly); assert.equal(s.run.phase, 'death'); assert.equal(s.run.counts.gold, Math.floor(gold / 2)); assert.equal(s.run.counts.hp, 0); assert.equal(s.run.counts.food, 0); assert.deepEqual(bag(s.run), []); assert.equal(s.run.equipped.weapon, 'none'); assert.equal(s.run.equipped.armor, 'none'); assert.equal(s.profile.wins, 0); assert.equal(s.profile.deaths, 1); });
test('HOF-U34 next victory run resets resources but preserves progress', () => { const s = victory(); walk(s, ['begin']); assert.equal(s.profile.wins, 1); assert.equal(s.run.id, 2); assert.equal(s.run.counts.gold, 10); assert.equal(s.run.battles, 0); assert.deepEqual(s.run.visited, []); assert.equal(view(s).choices.find(x => x.id === 'canal').enabled, true); });
test('HOF-U35 natural rule death unlocks equipped watch departure once', () => { const s = death(); assert.deepEqual(s.profile.unlocks, ['watch']); walk(s, ['begin-watch']); assert.equal(s.run.equipped.armor, 'coat'); assert.deepEqual(bag(s.run), ['coat']); assert.equal(s.profile.deaths, 1); });
test('HOF-U36 unlocked canal is a working shortcut not text only', () => { const s = victory(); walk(s, ['begin', 'canal']); assert.equal(s.run.node, 'shop'); assert.equal(s.run.counts.food, 7); assert.equal(s.run.counts.hp, 20); assert.deepEqual(s.run.visited, ['fork', 'canal']); });
test('HOF-U37 state rejects unknown fields and impossible health', () => { const s = shop(); s.run.counts.hp = -1; assert.equal(validate(s), false); s.run.counts.hp = 20; s.run.hidden = true; assert.equal(validate(s), false); });
test('HOF-U38 state rejects duplicate or impossible route history', () => { const s = shop(); s.run.visited.push('fork'); assert.equal(validate(s), false); s.run.visited = ['fork', 'elite']; assert.equal(validate(s), false); });
test('HOF-U39 profile unlock claims must agree with outcomes', () => { const s = shop(); s.profile.unlocks.push('canal'); assert.equal(validate(s), false); });
test('HOF-U40 real random snapshot restore resumes identical battle', () => { const a = new Session(game, 42); choose(a, ['begin', 'cliff', 'ore', 'buy-sabre', 'leave']); const saved = a.snapshot(); choose(a, ['fight']); const b = new Session(game, 999); b.restore(saved); choose(b, ['fight']); assert.deepEqual(b.snapshot(), a.snapshot()); });
test('HOF-U41 failure after real battle leaves state RNG log revision atomic', () => {
  const fragile = { ...game, apply(s, id, random) { const r = apply(s, id, random); if (id === 'fight') throw new Error('after settlement'); return r; } };
  const s = new Session(fragile, 42); choose(s, ['begin', 'cliff', 'ore', 'leave']); const before = s.snapshot(), boundary = s.frame().boundary;
  const normal = new Session(game, 42); normal.restore(before); const liveBoundary = normal.frame().boundary;
  assert.equal(normal.choose('fight').kind, 'accepted'); committed(normal, before, liveBoundary, 'fight');
  assert.equal(s.choose('fight').kind, 'failed'); failedReadout(s, before, boundary, 'U41');
});
test('HOF-U42 failed stored JSON or game version load preserves live session', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'store-'));
  try {
    const s = new Session(game, 42); choose(s, ['begin', 'cliff']); const before = s.snapshot(); const store = new Store(dir);
    await fs.writeFile(path.join(dir, 'bad.json'), '{broken'); await assert.rejects(store.load(s, 'bad'), e => e.code === 'SAVE_JSON'); assert.deepEqual(s.snapshot(), before);
    const bad = structuredClone(before); bad.game.version = 1; await fs.writeFile(path.join(dir, 'wrong.json'), JSON.stringify(bad)); await assert.rejects(store.load(s, 'wrong'), e => e.code === 'SAVE_GAME'); assert.deepEqual(s.snapshot(), before);
    await store.save(s, 'good'); choose(s, ['ore']); await store.load(s, 'good'); assert.deepEqual(s.snapshot(), before);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

const grove = () => walk(shop(), ['buy-bread', 'leave', 'fight', 'grove']);
const pending = fed => { const s = grove(); assert.equal(apply(s, fed ? 'aid' : 'forage', quiet).kind, 'accepted'); return s; };
const slot = n => ({ integer(a, b) { assert.equal(a, 1); assert.equal(b, 4); return n; } });
const rescuedElite = () => { const s = pending(true); assert.equal(apply(s, 'listen', slot(2)).kind, 'accepted'); return walk(s, ['pass']); };
test('HOF-U43 event and travel cost labels match total committed deltas', () => {
  const s = walk(initial(), ['begin', 'marsh']); const old = s.run.counts.food;
  assert.match(view(s).choices.find(c => c.id === 'trade').label, /另付前进1粮，共3粮/);
  walk(s, ['trade']); assert.equal(old - s.run.counts.food, 3); assert.match(s.run.last, new RegExp(`粮食${old}→${s.run.counts.food}`));
  const g = pending(true); assert.equal(g.run.counts.food, 6); assert.match(view(g).text, /分给守林人的2粮另计/);
});
test('HOF-U44 shop and optional bag explain existing gear without new rules', () => {
  const s = shop(); assert.match(view(s).choices.find(c => c.id === 'buy-mail').label, /每次有效反击伤害减3/);
  assert.match(view(s).choices.find(c => c.id === 'buy-mail').label, /护甲0→3/);
  walk(s, ['buy-sabre', 'buy-coat']); assert.match(view(s).bag, /降低45个百分点/); assert.match(view(s).bag, /伤害减1/);
  assert.match(view(s).choices.find(c => c.id === 'buy-knife').label, /较当前长刀更弱/);
  assert.match(view(s).choices.find(c => c.id === 'buy-sabre').label, /买下即换装/); assert.equal(counterChance(65, 3, false, false), 20);
});
test('HOF-U45 prebattle clues match the foe without revealing exact chances', () => {
  const a = walk(shop(), ['leave']), b = walk(initial(), ['begin', 'marsh', 'fish', 'leave']);
  assert.equal(enemyFor(a).name, ENEMIES.birds.name); assert.match(view(a).text, /三只崖道掠鸟/);
  assert.equal(enemyFor(b).name, ENEMIES.rats.name); assert.match(view(b).text, /两侧泥沟/);
  for (const s of [a, b, pending(true), pending(false)]) assert.doesNotMatch(view(s).text + view(s).choices.map(c => c.label).join(''), /\d+%|1\/4|2\/4|3\/4|大成功|keeper-assisted|binding/);
});
test('HOF-U46 forest queries preserve state RNG log and boundary', () => {
  const s = new Session(game, 42); choose(s, ['begin', 'cliff', 'ore', 'buy-bread', 'leave', 'fight', 'grove', 'aid']);
  const before = s.snapshot(), frame = s.frame(), boundary = frame.boundary;
  for (const name of ['status', 'bag', 'map']) s.query(name);
  assert.deepEqual(s.frame(), frame); assert.deepEqual(s.frame(), frame);
  assert.deepEqual(s.snapshot(), before); assert.equal(s.frame().boundary, boundary);
});
test('HOF-U47 food changes all four encounter slots with exact distributions', () => {
  assert.deepEqual([1, 2, 3, 4].map(n => encounterOutcome(true, n)), ['great', 'success', 'success', 'failure']);
  assert.deepEqual([1, 2, 3, 4].map(n => encounterOutcome(false, n)), ['success', 'failure', 'failure', 'failure']);
  assert.throws(() => encounterOutcome(true, 0)); assert.throws(() => encounterOutcome(false, 5));
});
test('HOF-U48 both forest decisions commit once and stay at the pending stage', () => {
  for (const fed of [true, false]) {
    const s = grove(), old = structuredClone(s.run); assert.equal(apply(s, fed ? 'aid' : 'forage', quiet).kind, 'accepted');
    assert.equal(s.run.node, 'grove'); assert.equal(s.run.forester.stage, 'check'); assert.equal(s.run.forester.fed, fed);
    assert.equal(s.run.counts.food - old.counts.food, fed ? -2 : 3); assert.equal(s.run.counts.hp, old.counts.hp); assert.equal(s.run.blessing, false);
    assert.deepEqual(s.run.visited, old.visited); const before = structuredClone(s);
    assert.equal(apply(s, fed ? 'aid' : 'forage', quiet).kind, 'refused'); assert.deepEqual(s, before);
  }
});
test('HOF-U49 aid reserves event completion food and rejects without a draw', () => {
  const s = grove(); s.run.counts.food = 2; const before = structuredClone(s);
  assert.equal(apply(s, 'aid', { integer() { throw new Error('must not draw'); } }).kind, 'refused'); assert.deepEqual(s, before);
  s.run.counts.food = 3; assert.equal(apply(s, 'aid', quiet).kind, 'accepted'); assert.equal(s.run.counts.food, 1); assert.equal(s.run.forester.stage, 'check');
});
test('HOF-U50 fed great outcome grants actual rescue and future map binding', () => {
  const s = pending(true), gold = s.run.counts.gold; assert.equal(apply(s, 'listen', slot(1)).kind, 'accepted');
  assert.equal(s.run.node, 'shrine'); assert.equal(s.run.forester.result, 'great'); assert.equal(s.run.forester.rescued, true); assert.equal(s.run.forester.pledged, true);
  assert.equal(s.run.counts.gold, gold + 2); assert.equal(s.run.counts.hp, 20); assert.equal(s.run.blessing, true);
  assert.deepEqual(s.run.bindings, [{ id: 'tower-pledge', state: 'pending' }, { id: 'shrine-return', state: 'pending' }]);
});
test('HOF-U51 unrescued shrine blessing never impersonates NPC assistance', () => {
  const s = pending(false); assert.equal(apply(s, 'listen', slot(1)).kind, 'accepted'); walk(s, ['bless']);
  assert.equal(s.run.blessing, true); assert.equal(s.run.forester.rescued, false); assert.deepEqual(s.run.bindings, []);
  assert.equal(enemyFor(s).endurance, 4); assert.doesNotMatch(view(s).text, /守林人从墙后/);
});
test('HOF-U52 forest decisions are mutually exclusive and impossible memory is rejected', () => {
  const s = pending(false), before = structuredClone(s); assert.equal(apply(s, 'aid', quiet).kind, 'refused'); assert.deepEqual(s, before);
  s.run.forester.rescued = true; s.run.forester.pledged = true; assert.equal(validate(s), false);
  const t = pending(true); t.run.forester.result = 'success'; assert.equal(validate(t), false);
  const u = pending(true); u.run.battles = 0; assert.equal(validate(u), false);
});
test('HOF-U53 map targets consumption and bindings are strictly validated', () => {
  // 表外值与不可能状态都进不了档；表化后判据是「逐项与 BINDINGS 表行相等」，不是「表内任一成员」。
  for (const [label, mutate] of [
    ['table-external id', s => s.run.bindings.push({ id: 'not-in-table', state: 'pending' })],
    ['duplicate id', s => s.run.bindings.push({ id: 'tower-pledge', state: 'used' })],
    ['unknown state', s => { s.run.bindings[0].state = 'consumed'; }],
    ['pending on a visited target', s => { s.run.visited.push('elite'); }],
    ['bindings without rescue', s => { s.run.forester.rescued = false; s.run.forester.pledged = false; }]
  ]) {
    const s = rescuedElite(); mutate(s); assert.equal(validate(s), false, label);
  }
  // 冲突规则（最小规则）：同一目标点位不得同时有两条未兑现的绑定。
  const clash = rescuedElite(); clash.run.bindings = [{ id: 'tower-pledge', state: 'pending' }, { id: 'tower-pledge', state: 'pending' }];
  assert.equal(validate(clash), false, 'same pending target');
  const s = pending(false); s.run.bindings = [{ id: 'tower-pledge', state: 'pending' }]; assert.equal(validate(s), false);
});
test('HOF-U54 cooperative boss uses local parameters and consumes the binding once', () => {
  const s = rescuedElite(), base = structuredClone(ENEMIES.keeper), foe = enemyFor(s);
  assert.equal(foe.count * foe.endurance, 4); assert.equal(ENEMIES.keeper.count * ENEMIES.keeper.endurance, 8);
  assert.equal(foe.sides, base.sides); assert.equal(foe.probability, base.probability); assert.match(view(s).text, /守林人从墙后/);
  walk(s, ['fight']); assert.equal(s.run.bindings.find(b => b.id === 'tower-pledge').state, 'used'); assert.equal(s.run.node, 'beacon'); assert.deepEqual(ENEMIES.keeper, base);
  const before = structuredClone(s); assert.equal(apply(s, 'fight', quiet).kind, 'refused'); assert.deepEqual(s, before);
});
test('HOF-U55 failed encounter stays for a real battle before rescue can complete', () => {
  for (const fed of [true, false]) {
    const s = pending(fed); assert.equal(apply(s, 'listen', slot(4)).kind, 'accepted');
    assert.equal(s.run.node, 'grove'); assert.equal(s.run.forester.stage, 'fight'); assert.equal(s.run.forester.rescued, false); assert.deepEqual(s.run.bindings, []);
    walk(s, ['forest-fight']); assert.equal(s.run.node, 'shrine'); assert.equal(s.run.forester.rescued, fed); assert.equal(s.run.forester.pledged, fed);
  }
});
test('HOF-U56 forest death never grants NPC rewards or a future binding', () => {
  const s = pending(true); assert.equal(apply(s, 'listen', slot(4)).kind, 'accepted'); s.run.counts.hp = 1;
  walk(s, ['forest-fight'], deadly); assert.equal(s.run.phase, 'death'); assert.equal(s.run.forester.rescued, false);
  assert.deepEqual(s.run.bindings, []); assert.equal(s.profile.wins, 0); assert.equal(s.profile.deaths, 1);
});
test('HOF-U57 failed encounter handler commits no partial stage or RNG', () => {
  const fragile = { ...game, apply(s, id, random) { const r = apply(s, id, random); if (id === 'listen') throw new Error('after encounter'); return r; } };
  const s = new Session(fragile, 42); choose(s, ['begin', 'cliff', 'ore', 'buy-bread', 'leave', 'fight', 'grove', 'aid']);
  const before = s.snapshot(), boundary = s.frame().boundary;
  const normal = new Session(game, 42); normal.restore(before); const liveBoundary = normal.frame().boundary;
  assert.equal(normal.choose('listen').kind, 'accepted'); committed(normal, before, liveBoundary, 'listen'); assert.equal(normal.snapshot().rng.draws, before.rng.draws + 1);
  assert.equal(s.choose('listen').kind, 'failed'); failedReadout(s, before, boundary, 'U57');
});
test('HOF-U58 failed cooperative battle commits no binding or reward', () => {
  const fragile = { ...game, apply(s, id, random) { const cooperative = s.run.node === 'elite' && s.run.bindings.some(b => b.id === 'tower-pledge' && b.state === 'pending'); const r = apply(s, id, random); if (id === 'fight' && cooperative) throw new Error('after cooperation'); return r; } };
  const s = new Session(fragile, 42); choose(s, ['begin', 'cliff', 'ore', 'buy-sabre', 'buy-coat', 'buy-bread', 'leave', 'fight', 'grove', 'aid', 'listen', 'pass']);
  assert.equal(s.snapshot().state.run.bindings.find(b => b.id === 'tower-pledge').state, 'pending'); const before = s.snapshot(), boundary = s.frame().boundary;
  const normal = new Session(game, 42); normal.restore(before); const liveBoundary = normal.frame().boundary;
  assert.equal(normal.choose('fight').kind, 'accepted'); committed(normal, before, liveBoundary, 'fight'); assert.equal(normal.snapshot().state.run.bindings.find(b => b.id === 'tower-pledge').state, 'used');
  assert.equal(s.choose('fight').kind, 'failed'); failedReadout(s, before, boundary, 'U58');
});
test('HOF-U59 real saved pending stage restores paid food and next outcome', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'stage-'));
  try {
    const a = new Session(game, 42); choose(a, ['begin', 'cliff', 'ore', 'buy-sabre', 'buy-coat', 'buy-bread', 'leave', 'fight', 'grove', 'aid']);
    const store = new Store(dir), saved = a.snapshot(); await store.save(a, 'pending'); choose(a, ['listen']); const expected = a.snapshot();
    const b = new Session(game, 999); await store.load(b, 'pending'); assert.deepEqual(b.snapshot(), saved); assert.equal(b.snapshot().state.run.forester.stage, 'check');
    choose(b, ['listen']); assert.deepEqual(b.snapshot(), expected);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('HOF-U60 a new run resets local stages bindings and NPC memory', () => {
  const s = rescuedElite(); walk(s, ['fight', 'light']); assert.equal(s.run.bindings.find(b => b.id === 'tower-pledge').state, 'used'); assert.equal(s.profile.wins, 1);
  walk(s, ['begin']); assert.deepEqual(s.run.bindings, []); assert.deepEqual(s.run.forester, { stage: 'unmet', fed: false, result: 'none', rescued: false, pledged: false });
  assert.equal(s.profile.wins, 1); assert.deepEqual(s.profile.unlocks, ['canal']);
});
test('HOF-U61 retreat cancels pending events without inventing rescue', () => {
  for (const fed of [true, false]) {
    const s = pending(fed); walk(s, ['retreat']); assert.equal(s.run.forester.stage, 'abandoned'); assert.deepEqual(s.run.bindings, []);
    assert.equal(s.profile.retreats, 1); assert.equal(s.profile.wins, 0); assert.equal(validate(s), true);
  }
});
test('HOF-U62 consumed binding cannot be replayed at a visited target', () => {
  const s = rescuedElite(); walk(s, ['fight']); const before = structuredClone(s);
  s.run.bindings.find(b => b.id === 'tower-pledge').state = 'pending'; assert.equal(validate(s), false);
  s.run.bindings.find(b => b.id === 'tower-pledge').state = 'used';
  assert.equal(apply(s, 'forest-fight', quiet).kind, 'refused'); assert.deepEqual(s, before);
});
test('HOF-U63 retreat at the bound target expires unused help without blocking exit', () => {
  for (const food of [4, 0]) {
    const s = rescuedElite(); s.run.counts.food = food; walk(s, ['retreat']);
    assert.equal(s.run.phase, 'withdrawn'); assert.equal(s.run.bindings.find(b => b.id === 'tower-pledge').state, 'pending'); assert.equal(s.profile.retreats, 1); assert.equal(validate(s), true);
    walk(s, ['begin']); assert.deepEqual(s.run.bindings, []); assert.equal(s.run.forester.stage, 'unmet');
  }
});
test('HOF-U64 saved promised encounter keeps its local boss parameters', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'binding-'));
  try {
    const a = new Session(game, 42); choose(a, ['begin', 'cliff', 'ore', 'buy-sabre', 'buy-coat', 'buy-bread', 'leave', 'fight', 'grove', 'aid', 'listen', 'pass']);
    const saved = a.snapshot(); assert.equal(saved.state.run.bindings.find(b => b.id === 'tower-pledge').state, 'pending'); const store = new Store(dir); await store.save(a, 'promised');
    choose(a, ['fight']); const expected = a.snapshot(); const b = new Session(game, 999); await store.load(b, 'promised');
    assert.deepEqual(b.snapshot(), saved); assert.equal(enemyFor(b.snapshot().state).endurance, 2); choose(b, ['fight']); assert.deepEqual(b.snapshot(), expected);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

// 玩家细节视图（#608）：四类枚举、可见性判据、稳定 id、文本同源、纯读。
const page = (s, target) => inspect(target, s);
test('HOF-U69 inspect lists four categories and counts only visible entries', () => {
  const fresh = initial();
  const root = page(fresh, null);
  assert.deepEqual(root.entries.map(e => e.id), ['cat-active', 'cat-passive', 'cat-status', 'cat-intel']);
  assert.ok(root.entries.every(e => e.kind === 'category'));
  assert.deepEqual(root.entries.map(e => e.count), [0, 0, 0, 1]);
  for (const id of ['cat-active', 'cat-passive', 'cat-status']) {
    const empty = page(fresh, id); assert.deepEqual(empty.entries, []); assert.match(empty.text, /暂无/);
  }
  const s = walk(initial(), ['begin', 'cliff', 'ore', 'buy-knife', 'buy-tonic', 'leave', 'fight', 'dunes', 'bribe', 'bless']);
  assert.deepEqual(page(s, null).entries.map(e => e.count), [1, 1, 1, 1]);
  assert.deepEqual(page(s, 'cat-active').entries.map(e => e.id), ['tonic']);
  assert.deepEqual(page(s, 'cat-passive').entries.map(e => e.id), ['knife']);
  assert.deepEqual(page(s, 'cat-status').entries.map(e => e.id), ['blessing']);
  assert.deepEqual(page(s, 'cat-intel').entries.map(e => e.id), ['intel-map']);
});
test('HOF-U70 inspect hides the unmet forester and unknown or invisible targets', () => {
  const shopOnly = () => walk(initial(), ['begin', 'cliff', 'ore']);
  assert.equal(page(shopOnly(), 'forester-aid'), null);
  assert.equal(page(shopOnly(), 'intel-forester'), null);
  assert.equal(page(shopOnly(), 'binding'), null);
  assert.equal(page(shopOnly(), 'no-such-entry'), null);
  assert.deepEqual(page(shopOnly(), 'cat-status').entries, []);
  const grove = walk(shopOnly(), ['leave', 'fight', 'grove']);
  assert.equal(grove.run.forester.stage, 'decision');
  assert.deepEqual(page(grove, 'cat-status').entries.map(e => e.id), ['forester-aid']);
  assert.deepEqual(page(grove, 'cat-intel').entries.map(e => e.id), ['intel-map', 'intel-forester']);
  const rescued = walk(shopOnly(), ['leave', 'fight', 'grove', 'aid']);
  assert.equal(rescued.run.forester.rescued, true);
  assert.deepEqual(page(rescued, 'cat-status').entries.map(e => e.id), ['blessing', 'forester-aid', 'binding']);
});
test('HOF-U71 inspect entry ids stay stable across runs and save restore', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'inspect-'));
  try {
    const s = walk(initial(), ['begin', 'cliff', 'ore', 'buy-knife', 'buy-sabre', 'buy-coat']);
    const ids = state => page(state, 'cat-passive').entries.map(e => e.id);
    assert.deepEqual(ids(s), ['knife', 'sabre', 'coat']);
    s.run.counts.tonic = 2;   // 新模型：顺序由定义表派生 ⇒ 换成「持有量变化不改 id 与顺序」这一臂
    s.run.counts.mail = 1; assert.deepEqual(ids(s), ['knife', 'sabre', 'coat', 'mail']); s.run.counts.mail = 0;
    assert.deepEqual(ids(s), ['knife', 'sabre', 'coat']);
    assert.deepEqual(ids(walk(initial(), ['begin', 'cliff', 'ore', 'buy-sabre', 'buy-knife'])), ['knife', 'sabre']);
    const store = new Store(dir), a = new Session(game, 42);
    choose(a, ['begin', 'cliff', 'ore', 'buy-knife', 'buy-sabre', 'buy-coat']); await store.save(a, 'inspect');
    const b = new Session(game, 999); await store.load(b, 'inspect');
    assert.deepEqual(ids(b.snapshot().state), ['knife', 'sabre', 'coat']);
    assert.equal(page(b.snapshot().state, 'knife').data.id, 'knife');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
// #625 ②：补回 U71 的「唯一之失」——旧 schema 的「打乱 bag 数组」在新模型下不可表达（顺序源自定义表），
// 但「整体替换容器 ⇒ 视图跟新」仍可表达。判据取自 #625 票面 tester-4 的三条（①整体替换 ②与原地改可区分 ③负控见 PR 记录）。
test('HOF-U82 inspect entries follow a whole counts replacement, not only in-place edits', () => {
  const s = walk(initial(), ['begin', 'cliff', 'ore', 'buy-knife', 'buy-sabre', 'buy-coat']);
  const ids = state => page(state, 'cat-passive').entries.map(e => e.id);
  const 背包串 = state => view(state).bag;
  assert.deepEqual(ids(s), ['knife', 'sabre', 'coat']);
  // ①「原地改」这一形：容器本身不变，只改其中的数（U71 已覆盖）
  s.run.counts.mail = 1; assert.deepEqual(ids(s), ['knife', 'sabre', 'coat', 'mail']);
  s.run.counts.mail = 0; assert.deepEqual(ids(s), ['knife', 'sabre', 'coat']);
  // ②「整体替换容器」这一形：换掉 counts 对象本身 —— 持旧引用的实现只在这一形上暴露
  const 甲 = structuredClone(s.run.counts); 甲.mail = 1; s.run.counts = 甲;
  assert.deepEqual(ids(s), ['knife', 'sabre', 'coat', 'mail']);
  assert.match(背包串(s), /鳞甲/);
  assert.equal(validate(s), true);
  const 乙 = structuredClone(s.run.counts); 乙.mail = 0; s.run.counts = 乙;
  assert.deepEqual(ids(s), ['knife', 'sabre', 'coat']);
  assert.doesNotMatch(背包串(s), /鳞甲/);
  assert.equal(validate(s), true);
});
test('HOF-U72 inspect detail text reuses the bag and map sources', () => {
  const s = walk(initial(), ['begin', 'cliff', 'ore', 'buy-sabre', 'buy-mail', 'buy-tonic', 'leave', 'fight', 'dunes', 'bribe', 'bless']);
  const shown = view(s);
  assert.ok(shown.bag.includes(`长刀：${page(s, 'sabre').text}`));
  assert.ok(shown.bag.includes(`回春药：${page(s, 'tonic').text}`));
  assert.equal(page(s, 'intel-map').text, shown.map);
  assert.match(shown.bag, /祝福：灯祝福/); assert.equal(page(s, 'blessing').title, '灯祝福');
  assert.equal(page(s, 'curse'), null);
});
test('HOF-U73 inspect pages are pure read and keep data out of normal views', () => {
  const s = walk(initial(), ['begin', 'cliff', 'ore', 'buy-knife', 'buy-bread', 'leave', 'fight', 'grove', 'aid', 'pass']);
  const before = structuredClone(s);
  for (const target of [null, 'cat-active', 'cat-passive', 'cat-status', 'cat-intel', 'knife', 'blessing', 'forester-aid', 'binding', 'intel-map']) page(s, target);
  assert.deepEqual(s, before);
  const root = page(s, null), category = page(s, 'cat-passive'), detail = page(s, 'knife');
  assert.equal('data' in root, false); assert.equal('data' in category, false);
  assert.equal(detail.data.id, 'knife'); assert.equal(detail.data.equipped, true); assert.equal(detail.data.count, 1);
  const normal = JSON.stringify(view(s));
  for (const leak of ['counterChanceDelta', 'canalUnlocked', 'equipped', 'rescued']) assert.equal(normal.includes(leak), false, leak);
});

test('HOF-U74 death settlement keeps half the gold for odd and even purses', () => {
  for (const [purse, expected] of [[7, 3], [8, 4], [1, 0], [0, 0]]) {
    const s = elite(); s.run.counts.gold = purse;
    walk(s, ['fight'], deadly);
    assert.equal(s.run.phase, 'death'); assert.equal(s.run.counts.gold, expected, `purse=${purse}`);
    assert.equal(s.run.counts.food, 0); assert.deepEqual(bag(s.run), []); assert.equal(s.run.equipped.weapon, 'none');
  }
});
test('HOF-U75 full health refuses tonic while eighteen health heals exactly two', () => {
  const full = shop(); walk(full, ['buy-tonic']); full.run.counts.hp = 20;
  const refused = apply(full, 'tonic', quiet); assert.equal(refused.kind, 'refused'); assert.match(refused.reason, /生命已满/);
  assert.equal(full.run.counts.tonic, 1); assert.equal(full.run.counts.hp, 20);
  const hurt = shop(); walk(hurt, ['buy-tonic']); hurt.run.counts.hp = 18; const bottles = hurt.run.counts.tonic;
  assert.equal(apply(hurt, 'tonic', quiet).kind, 'accepted');
  assert.equal(hurt.run.counts.hp, 20); assert.equal(hurt.run.counts.tonic, bottles - 1);
});
test('HOF-U76 bread over the food cap refuses without spending gold', () => {
  const s = shop(); const cost = 3; s.run.counts.food = 995; const gold = s.run.counts.gold;
  const refused = apply(s, 'buy-bread', quiet); assert.equal(refused.kind, 'refused'); assert.match(refused.reason, /粮食达到上限/);
  assert.equal(s.run.counts.food, 995); assert.equal(s.run.counts.gold, gold);
  s.run.counts.food = 994; assert.equal(apply(s, 'buy-bread', quiet).kind, 'accepted');
  assert.equal(s.run.counts.food, 999); assert.equal(s.run.counts.gold, gold - cost);
});
test('HOF-U77 watch departure initial state pairs the camp baseline', () => {
  const camp = initial();
  assert.deepEqual(camp.run.counts, { hp: 20, gold: 10, food: 8, tonic: 0, knife: 0, sabre: 0, coat: 0, mail: 0 });
  assert.deepEqual(camp.run.equipped, { weapon: 'none', armor: 'none' }); assert.deepEqual(bag(camp.run), []);
  const watch = elite(); walk(watch, ['fight'], deadly); walk(watch, ['begin-watch']);
  assert.equal(watch.run.counts.coat, 1); assert.equal(watch.run.equipped.armor, 'coat');
  assert.equal(watch.run.counts.hp, 20); assert.equal(watch.run.counts.food, 8); assert.deepEqual(bag(watch.run), ['coat']);
});
test('HOF-U78 equipped slot without its item is rejected', () => {
  const s = shop(); s.run.counts.sabre = 0; s.run.equipped.weapon = 'sabre';
  assert.equal(validate(s), false);
  s.run.counts.sabre = 1; assert.equal(validate(s), true);
  s.run.equipped.armor = 'coat'; assert.equal(validate(s), false);
});
test('HOF-U79 run state carries no legacy dual writes and resources stay out of the bag', () => {
  const s = shop(); walk(s, ['buy-sabre', 'buy-bread']); const r = structuredClone(s.run);   // 序列化后的形状（进档的就是它）
  for (const legacy of ['hp', 'gold', 'food', 'bag', 'weapon', 'armor']) assert.equal(legacy in r, false, legacy);
  assert.deepEqual(Object.keys(r.counts).sort(), ['coat', 'food', 'gold', 'hp', 'knife', 'mail', 'sabre', 'tonic']);
  for (const resource of ['hp', 'gold', 'food']) assert.equal(bag(r).includes(resource), false, resource);
  assert.equal(r.equipped.weapon, 'sabre'); assert.equal(r.counts.sabre, 1);
});
test('HOF-U80 death gold bound is rejected above the halving ceiling', () => {
  const s = elite(); walk(s, ['fight'], deadly); assert.equal(s.run.phase, 'death');
  s.run.counts.gold = 499; assert.equal(validate(s), true);
  s.run.counts.gold = 500; assert.equal(validate(s), false);
  s.run.counts.gold = 250; assert.equal(validate(s), true);
});
test('HOF-U81 stored interface version mismatch is named without showing the old save', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'version-'));
  try {
    const s = new Session(game, 42); choose(s, ['begin', 'cliff']); const before = s.snapshot(); const store = new Store(dir);
    const stale = structuredClone(before); stale.interfaceVersion = 1; stale.state.run.counts.gold = 7777; // 哨兵只可能来自档内
    const text = JSON.stringify(stale); await fs.writeFile(path.join(dir, 'old.json'), text);
    const failure = await store.load(s, 'old').then(() => null, e => e);   // 档名不带扩展名（与既有 U42 同形）
    assert.ok(failure, '接口不符的档必须被拒绝');
    assert.equal(failure.code, 'SAVE_VERSION');
    assert.match(failure.message, /档为接口 v1/); assert.match(failure.message, /本版为接口 v2/);
    assert.equal(failure.message.includes('7777'), false, '提示里不得带出档内内容');
    // 另一条路径（游戏版本不符）须与上一条可区分：码不同，且文案说游戏版本而不是接口版本。
    const older = structuredClone(before); older.game.version = 2;
    await fs.writeFile(path.join(dir, 'older.json'), JSON.stringify(older));
    const gameFailure = await store.load(s, 'older').then(() => null, e => e);
    assert.equal(gameFailure.code, 'SAVE_GAME');
    assert.match(gameFailure.message, /v2/); assert.equal(/接口/.test(gameFailure.message), false, 'SAVE_GAME 的文案不得说接口版本');
    assert.deepEqual(s.snapshot(), before);
    assert.deepEqual(s.snapshot(), before);
    assert.equal(await fs.readFile(path.join(dir, 'old.json'), 'utf8'), text, '档文件不得被改写');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

// 组合与规则表（#576）：顺序／叠加／互斥／消耗／清除；单一实现＝组合效果()。
const 武装 = ids => walk(initial(), ['begin', 'cliff', 'ore', ...ids]);
test('HOF-U83 combo table: weapon shifts counter odds once and no combo is active alone', () => {
  const s = 武装(['buy-sabre']);
  const e = 组合效果(s);
  assert.deepEqual(e.生效, []);
  assert.equal(e.武器减, 45); assert.equal(e.祝福减, 0); assert.equal(e.诅咒增, 0); assert.equal(e.净额, -45);
  assert.equal(counterChance(50, 3, false, false), 50 + e.净额);   // 与 counterChance 同源：只减一次
  assert.doesNotMatch(view(s).bag, /组合：/);
});
test('HOF-U84 combo table: sabre and blessing stack once per class and match counterChance', () => {
  const s = 武装(['buy-sabre']); s.run.blessing = true; assert.equal(validate(s), true);
  const e = 组合效果(s);
  assert.deepEqual(e.生效, ['assault']);
  assert.equal(e.净额, -(45 + 15));
  assert.equal(counterChance(80, 3, true, false), 80 + e.净额);
  assert.match(view(s).bag, /组合：破甲突击（进攻/);
});
test('HOF-U85 combo table: blessing and curse count as a net figure, floor clamps, armor applies once', () => {
  const s = 武装(['buy-sabre', 'buy-mail']); s.run.blessing = true; s.run.curse = true; assert.equal(validate(s), true);
  const e = 组合效果(s);
  assert.equal(e.祝福减, 15); assert.equal(e.诅咒增, 15); assert.equal(e.净额, -45);        // 互斥：只按净额
  assert.equal(e.减伤, 3);                                                              // 护甲取在装那件
  assert.equal(counterChance(10, 3, true, false), 5);                                   // 极端：夹到下限
  assert.equal(counterChance(100, 3, true, true), 100 - 45 - 15 + 15);                  // 极端：上限侧可复算
  assert.deepEqual(组合效果(s).生效, ['assault', 'reckless']);   // 两组合可同存；净额仍只按一次计
});
test('HOF-U86 combo table: swapping a slot clears only that slot and drops its combo', () => {
  const s = 武装(['buy-knife', 'buy-sabre']); s.run.blessing = true;
  assert.deepEqual(组合效果(s).生效, ['assault']);
  assert.equal(apply(s, 'equip-knife', quiet).kind, 'accepted');
  assert.equal(s.run.equipped.weapon, 'knife');
  assert.equal(s.run.blessing, true);                       // 另一面保留
  assert.deepEqual(组合效果(s).生效, []);
});
test('HOF-U87 combo table: the tower pledge assists once and is consumed', () => {
  const base = initial();
  const st = { run: { ...base.run, node: 'elite', equipped: { weapon: 'none', armor: 'mail' },
    bindings: [{ id: 'tower-pledge', state: 'pending' }] } };
  assert.deepEqual(组合效果(st).生效, ['bulwark']);
  st.run.bindings[0].state = 'used';
  assert.deepEqual(组合效果(st).生效, []);                   // 消耗后 ✗ 二次协助
});
test('HOF-U88 combo table: save and restore keep the equipped combo', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'combo-'));
  try {
    const a = new Session(game, 42); choose(a, ['begin', 'cliff', 'ore', 'buy-sabre']);
    const saved = a.snapshot();
    const store = new Store(dir); await store.save(a, 'combo');
    const b = new Session(game, 999); await store.load(b, 'combo');
    assert.deepEqual(b.snapshot().state, saved.state);
    assert.deepEqual(组合效果(b.snapshot().state), 组合效果(saved.state));
    assert.equal(组合效果(saved.state).净额, -45);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('HOF-U89 combo table: equip changes are explained in the CLI bag line', () => {
  const s = 武装(['buy-sabre']); s.run.blessing = true;
  assert.match(view(s).bag, /武器：长刀/); assert.match(view(s).bag, /组合：破甲突击（进攻/);
  const t = 武装(['buy-knife', 'buy-sabre']); t.run.blessing = true;
  apply(t, 'equip-knife', quiet);
  assert.match(view(t).bag, /武器：短刃/); assert.doesNotMatch(view(t).bag, /组合：/);
});

// ── books#572 绑定表化（`bindings[]` 具名表）与非战斗回收报形 ───────────────────────
const { BINDINGS } = await import('../../../stories/hof-cli/content.mjs');
const rescuedShrine = () => { const s = pending(true); assert.equal(apply(s, 'listen', slot(2)).kind, 'accepted'); return s; };
test('HOF-U90 bindings are a named table and every stored row is checked against it', () => {
  const s = rescuedShrine();
  assert.deepEqual(s.run.bindings.map(b => b.id), ['tower-pledge', 'shrine-return']);
  // 表行本身承载票面要求的六项：前置标记／目标地图／目标点位／原事件／替换事件／兑现形与有效期。
  for (const row of BINDINGS) {
    assert.ok(row.mark && row.mapId === 'grayharbor' && row.targetNode && row.original && row.replacement && row.effect, row.id);
    assert.ok(!('expires' in row) || row.expires === 'current-map-run', '有效期恒为本局当前地图，不设跨局字段');
  }
  // 每一条都在表里，且目标点位与原/替换事件逐字相等（表化不是「表内任一成员」的松判据）。
  for (const b of s.run.bindings) {
    const row = BINDINGS.find(x => x.id === b.id);
    assert.ok(row, b.id); assert.equal(row.mapId, s.run.mapId);
    assert.notEqual(row.original, undefined); assert.notEqual(row.replacement, undefined);
  }
});
test('HOF-U91 non-battle return event is a real action at the bound point, not text', () => {
  const s = rescuedShrine();
  assert.equal(s.run.node, 'shrine');
  const claim = view(s).choices.find(c => c.id === 'claim-shrine-return');
  assert.ok(claim, '被绑定的点位必须多出一个具名的回收报选项');
  assert.match(claim.label, /粮食3/);                     // 已知收益写在选项上（玩家可知信息）
  const before = s.run.counts.food;
  assert.equal(apply(s, 'claim-shrine-return', quiet).kind, 'accepted');
  assert.equal(s.run.counts.food, before - 1 + 3);        // 收 3 粮，再付前进 1 粮
  assert.equal(s.run.node, 'elite');
  assert.equal(s.run.bindings.find(b => b.id === 'shrine-return').state, 'used');
});
test('HOF-U92 the return event changes what the run can do: one food decides the tower step', () => {
  // 无回报：粮食恰 1 ⇒ 祠堂付得起前进，到塔门后付不起「战后前进 1 粮」。
  const bare = pending(false); assert.equal(apply(bare, 'listen', slot(1)).kind, 'accepted');
  bare.run.counts.food = 1;
  assert.equal(apply(bare, 'pass', quiet).kind, 'accepted'); assert.equal(bare.run.node, 'elite');
  assert.equal(bare.run.counts.food, 0);
  assert.equal(view(bare).choices.some(c => c.id === 'fight'), false);   // 同一入口、不同合法结果：无力应战
  assert.deepEqual(view(bare).choices.map(c => c.id), ['retreat']);
  // 有回报：同样起手，收 3 粮后仍付得起那一粮。
  const paid = rescuedShrine(); paid.run.counts.food = 1;
  assert.equal(apply(paid, 'claim-shrine-return', quiet).kind, 'accepted');
  assert.equal(paid.run.counts.food, 3);
  assert.equal(view(paid).choices.find(c => c.id === 'fight').enabled, true);
});
test('HOF-U93 bindings honour a minimal conflict rule and reject competing pending targets', () => {
  // 最小规则：同一目标点位不得同时有两条未兑现；已兑现的可与新的未兑现共存（表内目前无此形状）。
  const s = rescuedShrine();
  s.run.bindings.push({ id: 'tower-pledge', state: 'used' });
  assert.equal(validate(s), false, 'duplicate id must be rejected regardless of state');
  const t = rescuedShrine();
  t.run.bindings = [{ id: 'shrine-return', state: 'pending' }];
  t.run.forester.pledged = true;                          // pledged 必然伴随 tower-pledge 一项
  assert.equal(validate(t), false, 'pledged without its own binding row');
});
test('HOF-U94 leaving the bound point without claiming records a verifiable miss', () => {
  const s = rescuedShrine();
  assert.equal(apply(s, 'pass', quiet).kind, 'accepted');
  assert.equal(s.run.node, 'elite');
  assert.equal(s.run.bindings.find(b => b.id === 'shrine-return').state, 'missed');
  assert.equal(s.run.bindings.find(b => b.id === 'tower-pledge').state, 'pending');
  assert.equal(validate(s), true);
  // 负例：已到访却仍 pending 是不可达状态。
  const bad = structuredClone(s); bad.run.bindings.find(b => b.id === 'shrine-return').state = 'pending';
  assert.equal(validate(bad), false);
});
test('HOF-U95 promising a stale game version is named, not silently migrated', async () => {
  const dir = await fs.mkdtemp(path.join(process.env.HOF_TEST_ROOT, 'bindver-'));
  try {
    const s = new Session(game, 42); choose(s, ['begin', 'cliff']); const before = s.snapshot(); const store = new Store(dir);
    assert.equal(game.version, 4, '本笔把游戏版本抬到 4（绑定由单条键改为具名集合）');
    const stale = structuredClone(before); stale.game.version = 3;
    const text = JSON.stringify(stale); await fs.writeFile(path.join(dir, 'v3.json'), text);
    const failure = await store.load(s, 'v3').then(() => null, e => e);
    assert.ok(failure, 'v3 档必须被具名拒绝');
    assert.equal(failure.code, 'SAVE_GAME');
    assert.match(failure.message, /v3/); assert.match(failure.message, /v4/);   // 两侧版本号都在
    assert.equal(/接口/.test(failure.message), false, '这是游戏版本不符，不是接口版本');
    assert.deepEqual(s.snapshot(), before);                                     // 会话不变
    assert.equal(await fs.readFile(path.join(dir, 'v3.json'), 'utf8'), text);   // 档文件不被改写
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
