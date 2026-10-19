import { ITEMS, BREAD, SHOP_STOCK, CATEGORIES, ENTRIES, ENEMIES, NODES, UNLOCKS, COMBO_RULES, COMBOS } from './content.mjs';
const MAX_HP = ITEMS.hp.max, MAX_RUNS = 1000000, MAP = 'grayharbor', WEAPON_STEP = 15, COUNTER_BLESSING = 15, COUNTER_CURSE = 15;
// 在身条目＝非资源条目（消耗品与装备）；资源不占背包格（#609 §2）。
const CARRY_IDS = Object.keys(ITEMS).filter(id => ITEMS[id].class !== 'resource');
const CARRY_LIMIT = 7;
const integer = (n, max = 999) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const keys = (x, names) => x && !Array.isArray(x) && typeof x === 'object' && Object.keys(x).sort().join(',') === [...names].sort().join(',');
const total = p => p.wins + p.deaths + p.retreats;
const has = (s, id) => s.profile.unlocks.includes(id);
const freshForester = () => ({ stage: 'unmet', fed: false, result: 'none', rescued: false, pledged: false });
const freshCounts = watch => ({ hp: MAX_HP, gold: 10, food: 8, tonic: 0, knife: 0, sabre: 0, coat: watch ? 1 : 0, mail: 0 });
const freshRun = (id = 0, watch = false) => ({ id, phase: id ? 'journey' : 'camp', node: id ? 'fork' : 'harbor', mapId: MAP, forester: freshForester(), binding: null, counts: freshCounts(watch), equipped: { weapon: 'none', armor: watch ? 'coat' : 'none' }, blessing: false, curse: false, visited: [], battles: 0, last: '准备好后选择出发；查询不消耗资源。' });
// 增删的单一入口（#609 §3）：grant 永不截顶，超上限即具名拒绝。
// 截顶是调用点的行动规则，不是 grant 的语义（§3.1 裁定甲案）。
const capReason = id => `${ITEMS[id].name}达到上限`;
const needReason = (id, n) => id === 'food' ? `需要${n}份粮食` : `需要${n}${ITEMS[id].name}`;
function grant(counts, id, n) {
  if (!Object.hasOwn(ITEMS, id) || !Number.isSafeInteger(n) || n < 0) throw new Error('道具增减参数无效');
  if (counts[id] + n > ITEMS[id].max) return { ok: false, reason: capReason(id) };
  counts[id] += n; return { ok: true };
}
function spend(counts, id, n) {
  if (!Object.hasOwn(ITEMS, id) || !Number.isSafeInteger(n) || n < 0) throw new Error('道具增减参数无效');
  if (counts[id] < n) return { ok: false, reason: needReason(id, n) };
  counts[id] -= n; return { ok: true };
}
const mustGrant = (counts, id, n) => { const r = grant(counts, id, n); if (!r.ok) throw new Error(r.reason); };
const mustSpend = (counts, id, n) => { const r = spend(counts, id, n); if (!r.ok) throw new Error(r.reason); };
const held = counts => CARRY_IDS.filter(id => counts[id] > 0);
const carryTotal = counts => CARRY_IDS.reduce((n, id) => n + counts[id], 0);
const stockItem = id => id === 'bread' ? BREAD : ITEMS[id];
export function initial() { return { profile: { wins: 0, deaths: 0, retreats: 0, unlocks: [] }, run: freshRun() }; }
function validForester(r) {
  const f = r.forester, b = r.binding;
  if (r.mapId !== MAP || !keys(f, ['stage', 'fed', 'result', 'rescued', 'pledged']) || !['unmet', 'decision', 'check', 'fight', 'done', 'abandoned'].includes(f.stage) || !['none', 'great', 'success', 'failure'].includes(f.result) || !['fed', 'rescued', 'pledged'].every(k => typeof f[k] === 'boolean')) return false;
  if (f.pledged !== f.rescued || (f.rescued && (!f.fed || f.stage !== 'done' || !r.blessing)) || (f.result === 'great' && !f.fed)) return false;
  if (f.stage === 'unmet' && (f.fed || f.result !== 'none' || f.rescued || r.node === 'grove' || r.visited.includes('grove'))) return false;
  if (['decision', 'check', 'fight'].includes(f.stage) && (r.node !== 'grove' || r.phase !== 'journey' || f.rescued)) return false;
  if (f.stage === 'decision' && (f.fed || f.result !== 'none')) return false;
  if (f.stage === 'check' && f.result !== 'none') return false;
  if (f.stage === 'fight' && f.result !== 'failure') return false;
  if (f.stage === 'done' && (f.result === 'none' || !r.visited.includes('grove') || (f.fed && !f.rescued && !(r.phase === 'death' && r.node === 'grove')))) return false;
  if (f.stage === 'abandoned' && (r.phase !== 'withdrawn' || r.node !== 'grove' || f.rescued || !r.visited.includes('grove') || !['none', 'failure'].includes(f.result))) return false;
  if (r.node !== 'grove' && ['decision', 'check', 'fight', 'abandoned'].includes(f.stage)) return false;
  if (r.node === 'grove' && r.phase === 'journey' && !['decision', 'check', 'fight'].includes(f.stage)) return false;
  if (r.visited.includes('grove') && !['done', 'abandoned'].includes(f.stage)) return false;
  if (r.phase === 'death' && r.node === 'grove' && (f.result !== 'failure' || f.rescued)) return false;
  if (f.pledged !== (b !== null)) return false;
  const targetResolved = r.visited.includes('elite') && !(r.phase === 'withdrawn' && r.node === 'elite');
  const forestBattled = f.stage === 'done' && f.result === 'failure';
  if (f.stage !== 'unmet' && r.battles !== 1 + Number(forestBattled) + Number(targetResolved)) return false;
  if (b !== null && (!keys(b, ['mapId', 'nodeId', 'original', 'replacement', 'consumed']) || b.mapId !== MAP || b.nodeId !== 'elite' || b.original !== 'keeper' || b.replacement !== 'keeper-assisted' || typeof b.consumed !== 'boolean' || b.consumed !== targetResolved)) return false;
  return true;
}
export function validate(s) {
  if (!keys(s, ['profile', 'run']) || !keys(s.profile, ['wins', 'deaths', 'retreats', 'unlocks']) || !keys(s.run, ['id', 'phase', 'node', 'mapId', 'forester', 'binding', 'counts', 'equipped', 'blessing', 'curse', 'visited', 'battles', 'last'])) return false;
  const p = s.profile, r = s.run;
  if (!['wins', 'deaths', 'retreats'].every(k => integer(p[k], MAX_RUNS)) || total(p) > MAX_RUNS || !Array.isArray(p.unlocks) || new Set(p.unlocks).size !== p.unlocks.length || p.unlocks.some(k => !Object.hasOwn(UNLOCKS, k))) return false;
  if (has(s, 'canal') !== (p.wins > 0) || has(s, 'watch') !== (p.deaths > 0)) return false;
  if (!integer(r.id, MAX_RUNS) || !['camp', 'journey', 'victory', 'death', 'withdrawn'].includes(r.phase) || !Object.hasOwn(NODES, r.node) || !integer(r.battles, 3) || typeof r.blessing !== 'boolean' || typeof r.curse !== 'boolean' || typeof r.last !== 'string' || !r.last.trim() || r.last.length > 400) return false;
  // 单一数量源（§2）：键集恰为 ITEMS，每个值非负且不超过该条目的上限。
  if (!keys(r.counts, Object.keys(ITEMS)) || Object.keys(ITEMS).some(id => !integer(r.counts[id], ITEMS[id].max))) return false;
  // 非资源条目的数量合计 ≤ 7（药按瓶计，与现版 bag.length ≤ 7 等价口径）。
  if (carryTotal(r.counts) > CARRY_LIMIT) return false;
  if (!keys(r.equipped, ['weapon', 'armor'])) return false;
  for (const slot of ['weapon', 'armor']) {
    const id = r.equipped[slot];
    if (id === 'none') continue;
    if (!Object.hasOwn(ITEMS, id) || ITEMS[id].slot !== slot || r.counts[id] < 1) return false;
  }
  if (!Array.isArray(r.visited) || r.visited.length > 11 || new Set(r.visited).size !== r.visited.length || r.visited.some(k => !Object.hasOwn(NODES, k) || k === 'harbor') || !validForester(r)) return false;
  const camp = { hp: MAX_HP, gold: 10, food: 8, tonic: 0, knife: 0, sabre: 0, coat: 0, mail: 0 };
  if (r.phase === 'camp') return r.id === 0 && total(p) === 0 && r.node === 'harbor' && r.visited.length === 0 && r.battles === 0 && !r.blessing && !r.curse && r.equipped.weapon === 'none' && r.equipped.armor === 'none' && Object.keys(ITEMS).every(id => r.counts[id] === camp[id]);
  if (r.id === 0 || r.node === 'harbor' || (r.counts.hp === 0) !== (r.phase === 'death')) return false;
  if (r.visited.length && r.visited[0] !== 'fork') return false;
  for (let i = 1; i < r.visited.length; i++) if (!NODES[r.visited[i - 1]].next.includes(r.visited[i])) return false;
  const ended = r.phase !== 'journey';
  if (r.id !== total(p) + (ended ? 0 : 1)) return false;
  if (ended) { if (r.visited.at(-1) !== r.node) return false; }
  else if (r.visited.includes(r.node) || (r.visited.length ? !NODES[r.visited.at(-1)].next.includes(r.node) : r.node !== 'fork')) return false;
  if (r.phase === 'victory' && (r.node !== 'beacon' || !r.visited.includes('elite') || r.battles < 2)) return false;
  // 死亡清算的形态（§4）：半数金币保留（故上界 499）、粮食清零、在身条目与装备清空。
  if (r.phase === 'death' && (r.counts.gold > 499 || r.counts.food !== 0 || carryTotal(r.counts) !== 0 || r.equipped.weapon !== 'none' || r.equipped.armor !== 'none')) return false;
  if (r.visited.includes('canal') && !has(s, 'canal')) return false;
  return true;
}
/* `books#576`：**组合与规则表的唯一实现** —— 顺序／叠加／互斥／消耗／清除都在这里，
 *   ✗ 不在 `view()`/`battle()` 里另写一份（数值与 `counterChance()` 同源：WEAPON_STEP／
 *   COUNTER_BLESSING／COUNTER_CURSE ⇒ 同一优势不会同时改「概率」与「次数」）。 */
export function 组合效果(s) {
  const r = s.run;
  const weapon = r.equipped.weapon === 'none' ? 0 : ITEMS[r.equipped.weapon].tier;
  const armor = r.equipped.armor === 'none' ? 0 : ITEMS[r.equipped.armor].armor;
  const 武器减 = weapon * WEAPON_STEP;
  const 祝福减 = r.blessing ? COUNTER_BLESSING : 0;
  const 诅咒增 = r.curse ? COUNTER_CURSE : 0;
  const 净额 = -武器减 - 祝福减 + 诅咒增;   // 同类各计一次；祝福/诅咒按净额（互斥面不另算一份）
  const 生效 = COMBOS.filter((c) => {
    const q = c.requires;
    if (q.weapon && r.equipped.weapon !== q.weapon) return false;
    if (q.armor && r.equipped.armor !== q.armor) return false;
    if (q.blessed && !r.blessing) return false;
    if (q.cursed && !r.curse) return false;
    if (q.assist && !assisted(r)) return false;
    return true;
  }).map((c) => c.id);
  return { 武器减, 祝福减, 诅咒增, 净额, 减伤: armor, 生效,
    说明: `武器-${武器减}｜祝福-${祝福减}｜诅咒+${诅咒增}｜护甲减${armor}` };
}
export function counterChance(base, weapon, blessing, curse) { return Math.max(5, Math.min(95, base - weapon * WEAPON_STEP - (blessing ? COUNTER_BLESSING : 0) + (curse ? COUNTER_CURSE : 0))); }
export function battle(enemy, hp, weapon, armor, blessing, curse, random) {
  const potential = enemy.count * enemy.endurance;
  const chance = counterChance(enemy.probability, weapon, blessing, curse);
  let checked = 0, hits = 0, damage = 0;
  for (let i = 0; i < potential && hp > 0; i++) {
    checked++;
    if (random.integer(1, 100, `${enemy.name}第${i + 1}次反击判定`) <= chance) {
      hits++;
      const loss = Math.max(0, random.integer(1, enemy.sides, `${enemy.name}第${i + 1}次有效伤害`) - armor); // H1: armor only affects effective damage.
      damage += Math.min(hp, loss); hp = Math.max(0, hp - loss);
    }
  }
  return { hp, potential, checked, hits, damage, chance, won: hp > 0 };
}
export function encounterOutcome(fed, slot) {
  if (typeof fed !== 'boolean' || !Number.isInteger(slot) || slot < 1 || slot > 4) throw new Error('遭遇判定槽无效');
  return fed ? ['great', 'success', 'success', 'failure'][slot - 1] : ['success', 'failure', 'failure', 'failure'][slot - 1];
}
function assisted(r) { return r.node === 'elite' && r.binding?.mapId === r.mapId && r.binding?.nodeId === r.node && !r.binding.consumed; }
export function enemyFor(s) {
  const r = s.run;
  if (r.node === 'elite') return assisted(r) ? { ...ENEMIES.keeper, endurance: 2 } : ENEMIES.keeper;
  if (r.node === 'grove' && r.forester.stage === 'fight') return ENEMIES.rats;
  if (r.node === 'dunes') return ENEMIES.dogs;
  if (r.node === 'ambush') return r.visited.includes('marsh') ? ENEMIES.rats : ENEMIES.birds;
  return null;
}
function describe(id, detail = false) {
  if (id === 'bread') return `补充${BREAD.food}粮`;
  const item = ITEMS[id];
  if (item.slot === 'weapon') return detail ? `敌方反击概率降低${item.tier * WEAPON_STEP}个百分点，受概率边界限制；不减少敌人数` : item.tier === 3 ? '更能压制反击，买下即换装' : '便于压制反击，买下即换装';
  if (item.slot === 'armor') return `每次有效反击伤害减${item.armor}，最低为0；买下即换装`;
  return `最多恢复${item.use.hp}生命，不超过${MAX_HP}；最多携带3瓶`;
}
function rating(item) { return item.slot === 'weapon' ? item.tier : item.armor; }
function gearComparison(r, id) {
  const item = id === 'bread' ? null : ITEMS[id];   // 行粮不是在身条目（§1），没有档位可比较
  if (!item || !['weapon', 'armor'].includes(item.slot)) return '';
  const current = r.equipped[item.slot] === 'none' ? null : ITEMS[r.equipped[item.slot]];
  const old = current ? rating(current) : 0, mine = rating(item);
  return `；${item.slot === 'weapon' ? '武器档' : '护甲'}${old}→${mine}（较当前${current?.name || '无装备'}${mine > old ? '更强' : mine < old ? '更弱' : '相同'}）`;
}
const price = (s, item) => Math.max(1, item.price - (has(s, 'watch') ? 1 : 0));
function options(s) {
  const r = s.run, counts = r.counts, out = [];
  const add = (id, label, reason = '', intent = 'normal') => out.push({ id, label, enabled: !reason, reason, intent });
  const food = (cost = 1) => counts.food < cost ? `需要${cost}份粮食` : '';
  if (r.phase !== 'journey') {
    const limit = total(s.profile) >= MAX_RUNS ? '长期记录已达100万局上限' : '';
    add('begin', r.phase === 'camp' ? '普通出发' : '再走一局（普通出发）', limit);
    add('begin-watch', '带守夜护符出发', limit || (has(s, 'watch') ? '' : '先经历一次死亡解锁守夜护符'));
    return out;
  }
  if (!counts.food) { add('retreat', '粮食耗尽，结束旅程', '', 'guarded'); return out; }
  if (r.node === 'grove' && r.forester.stage === 'check') {
    add('listen', '循着声音辨认林间动静'); add('retreat', '放弃送灯，合法撤退', '', 'guarded'); return out;
  }
  switch (r.node) {
    case 'fork':
      add('marsh', '走沼泽（耗2粮）', food(2)); add('cliff', '走崖道（耗1粮）', food());
      add('canal', '走潮渠捷径（耗1粮）', has(s, 'canal') ? food() : '先点亮灯塔解锁潮渠捷径'); break;
    case 'marsh': add('fish', '捞漂粮（漂粮数量未知；前进耗1粮）', food()); add('trade', '用2粮换4金币（另付前进1粮，共3粮）', food(3)); break;
    case 'cliff': add('ore', '取铜矿（失4生命，得6金币；前进耗1粮）', food()); add('rope', '扶绳通过（失2生命，得3金币；前进耗1粮）', food()); break;
    case 'shop':
      for (const id of SHOP_STOCK) {
        const item = stockItem(id), cost = price(s, item), owned = id === 'bread' ? 0 : counts[id];
        const reason = counts.gold < cost ? `需要${cost}金币` : ['weapon', 'armor'].includes(item.slot) && owned >= 1 ? '已经拥有这件装备' : id === 'tonic' && owned >= ITEMS.tonic.max ? '最多携带3瓶药' : id === 'bread' && counts.food + BREAD.food > ITEMS.food.max ? '粮食达到上限' : '';
        add(`buy-${id}`, `购买${item.name}（${cost}金币）—${describe(id)}${gearComparison(r, id)}`, reason);
      }
      add('leave', '离开商店（耗1粮）', food()); break;
    case 'ambush': add('fight', '应战，结算整场伏击（胜后前进耗1粮）', food()); break;
    case 'forktwo': add('grove', '走林地（耗1粮）', food()); add('dunes', '走沙地（耗2粮）', food(2)); break;
    case 'grove':
      if (r.forester.stage === 'fight') add('forest-fight', '迎击倒木后的鼠群（胜后前进耗1粮）', food());
      else {
        add('forage', '带上倒木边的三份干粮', counts.food + 3 > ITEMS.food.max ? '粮食达到上限' : food());
        add('aid', '分给他两份口粮（另留前进1粮）', food(3));
      }
      break;
    case 'dunes': add('fight', '驱逐食砂犬（胜后前进耗1粮）', food()); add('bribe', '付2金币绕过食砂犬（前进耗1粮）', counts.gold < 2 ? '需要2金币' : food()); break;
    case 'shrine':
      add('bless', '献2金币点灯（前进耗1粮）', r.blessing ? '已有灯祝福，不能叠加' : counts.gold < 2 ? '需要2金币' : food());
      add('curse', '取走供品旁的5金币（前进耗1粮）', food(), 'guarded'); add('pass', '不取供品，继续前行（耗1粮）', food()); break;
    case 'elite': add('fight', '挑战失灯守卫，结算整场精英战（胜后前进耗1粮）', food()); break;
    case 'beacon': add('light', '点亮灯塔，完成挑战'); break;
    default: throw new Error('旅程节点无规则');
  }
  for (const id of held(counts).filter(x => ITEMS[x].class === 'gear')) {
    const item = ITEMS[id];
    add(`equip-${id}`, `装备${item.name}（替换旧件，不叠加）`, r.equipped[item.slot] === id ? '已经装备' : '');
  }
  add('tonic', '使用回春药（恢复至多6生命）', !counts.tonic ? '背包没有回春药' : counts.hp === MAX_HP ? '生命已满' : '');
  add('retreat', '放弃送灯，合法撤退', '', 'guarded');
  return out;
}
function advance(s, node, cost = 1) {
  const r = s.run;
  if (r.counts.food < cost || r.visited.includes(r.node) || r.visited.includes(node)) throw new Error('路线前置或一次性边界不符');
  mustSpend(r.counts, 'food', cost); r.visited.push(r.node); r.node = node;
  if (node === 'grove') r.forester.stage = 'decision';
}
function unlock(s, id) { if (!has(s, id)) s.profile.unlocks.push(id); }
function finish(s, kind) {
  const r = s.run, counts = r.counts;
  if (r.phase !== 'journey') throw new Error('本局已经结算');
  if (kind === 'withdrawn' && r.node === 'grove') r.forester.stage = 'abandoned';
  r.visited.push(r.node); r.phase = kind;
  if (kind === 'death') {
    // §4 死亡清算：逐条按表，不用统一的「清空背包」（那会连应保留的半数金币一起清掉）。
    counts.hp = 0; counts.gold = Math.floor(counts.gold / 2); counts.food = 0;
    for (const id of CARRY_IDS) counts[id] = 0;
    r.equipped = { weapon: 'none', armor: 'none' };
    s.profile.deaths++; unlock(s, 'watch');
  } else if (kind === 'victory') {
    mustGrant(counts, 'gold', 8); s.profile.wins++;
    unlock(s, 'canal'); // H2: victory unlock commits with the run settlement.
  } else s.profile.retreats++;
}
function completeForester(s) {
  const r = s.run, f = r.forester;
  f.stage = 'done';
  let message = '你辨清了林间的踪迹，绕过倒木，走向祠堂。';
  if (f.fed) {
    f.rescued = true; f.pledged = true;
    mustGrant(r.counts, 'hp', Math.min(7, MAX_HP - r.counts.hp)); r.blessing = true;   // §3.1 甲案：截顶在调用点
    r.binding = { mapId: r.mapId, nodeId: 'elite', original: 'keeper', replacement: 'keeper-assisted', consumed: false };
    message = '守林人站稳了。他打开药囊为你敷药，把小灯递到你掌边。“这条路我认得。塔门前，我会再找你。”';
    // 不可达分支（§3.1 D2）：单局金币上界 42 ⇒ 超上限的礼物永远取不到；按严格 grant 的形态写成「触顶则不给」。
    if (f.result === 'great') { const gift = grant(r.counts, 'gold', 2).ok ? 2 : 0; message += `他又取出${gift}枚金币，谢你没有丢下他。`; }
  }
  advance(s, 'shrine');
  return message;
}
function fight(s, random) {
  const r = s.run, counts = r.counts, foe = enemyFor(s), cooperative = assisted(r);
  if (!foe) throw new Error('当前没有战斗');
  const weapon = r.equipped.weapon === 'none' ? 0 : ITEMS[r.equipped.weapon].tier;
  const armor = r.equipped.armor === 'none' ? 0 : ITEMS[r.equipped.armor].armor;
  const result = battle(foe, counts.hp, weapon, armor, r.blessing, r.curse, random);
  mustSpend(counts, 'hp', counts.hp - result.hp); r.battles++;
  if (cooperative) r.binding.consumed = true;
  const message = (cooperative ? '守林人投下松脂火把，牵制了守卫。' : '') + `${foe.name}：有效反击${result.hits}次，损失${result.damage}生命。`;
  if (!result.won) {
    if (r.node === 'grove') r.forester.stage = 'done';
    finish(s, 'death'); return message + '你倒在送灯路上；死亡结算，守夜护符已解锁。';
  }
  if (r.node === 'grove') return message + '战胜。' + completeForester(s);
  if (r.node === 'elite') { mustGrant(counts, 'gold', 6); advance(s, 'beacon'); }
  else if (r.node === 'dunes') { mustGrant(counts, 'gold', 3); mustGrant(counts, 'food', 4); advance(s, 'shrine'); }
  else { mustGrant(counts, 'gold', 4); advance(s, 'forktwo'); }
  return message + '战胜；奖励和前进已结算。';
}
function resourceChange(before, counts) {
  return `变化：生命${before.hp}→${counts.hp}；金币${before.gold}→${counts.gold}；粮食${before.food}→${counts.food}。`;
}
export function apply(s, id, random) {
  if (!validate(s)) throw new Error('游戏状态不符');
  const choice = options(s).find(x => x.id === id);
  if (!choice?.enabled) return { kind: 'refused', reason: choice?.reason || '当前没有这个选项' };
  let r = s.run;
  const counts = r.counts;
  let message;
  const before = { hp: counts.hp, gold: counts.gold, food: counts.food };
  if (id === 'begin' || id === 'begin-watch') { s.run = freshRun(total(s.profile) + 1, id === 'begin-watch'); message = id === 'begin-watch' ? '带着护胸与新灯芯出发。' : '带着新灯芯出发。'; }
  else if (id === 'retreat') { finish(s, 'withdrawn'); message = counts.food ? '你带回未点亮的灯芯；本局撤退，没有通关奖励。' : '粮食耗尽；本局合法撤退，没有通关奖励。'; }
  else if (id.startsWith('buy-')) {
    const key = id.slice(4), item = stockItem(key);
    mustSpend(counts, 'gold', price(s, item));
    if (key === 'bread') mustGrant(counts, 'food', BREAD.food);
    else { mustGrant(counts, key, 1); if (['weapon', 'armor'].includes(item.slot)) r.equipped[item.slot] = key; }
    message = `买下${item.name}${['weapon', 'armor'].includes(item.slot) ? '并装备，替换旧件' : ''}；购买不消耗旅行粮食。`;
  } else if (id.startsWith('equip-')) { const key = id.slice(6); r.equipped[ITEMS[key].slot] = key; message = `已装备${ITEMS[key].name}，不叠加旧件。`; }
  else if (id === 'tonic') { mustSpend(counts, 'tonic', 1); mustGrant(counts, 'hp', Math.min(ITEMS.tonic.use.hp, MAX_HP - counts.hp)); message = '饮下回春药，扣除1瓶。'; }
  else if (r.node === 'fork') {
    if (id === 'canal') { advance(s, 'canal'); advance(s, 'shop', 0); message = '穿过已解锁的潮渠捷径，直接到商店；耗1粮，没有额外奖励。'; }
    else { advance(s, id, id === 'marsh' ? 2 : 1); message = `选择${NODES[id].name}，旅行代价已提交。`; }
  } else if (r.node === 'marsh') {
    if (id === 'fish') { const found = random.integer(1, 3, '芦苇渡口漂粮数量'); mustGrant(counts, 'food', found); message = `捞起${found}份漂粮，再付1粮前进。`; }
    else { mustSpend(counts, 'food', 2); mustGrant(counts, 'gold', 4); message = '交付2粮，收下4金币，再付1粮前进，共耗3粮。'; }
    advance(s, 'shop');
  } else if (r.node === 'cliff') {
    mustSpend(counts, 'hp', Math.min(id === 'ore' ? 4 : 2, counts.hp));
    if (!counts.hp) { finish(s, 'death'); message = '你倒在崖道；没有取得铜矿收益，守夜护符已解锁。'; }
    else { mustGrant(counts, 'gold', id === 'ore' ? 6 : 3); advance(s, 'shop'); message = (id === 'ore' ? '受伤取回铜矿，得6金币。' : '扶绳过崖，得3金币。') + '付1粮前进。'; }
  } else if (id === 'fight' || id === 'forest-fight') message = fight(s, random);
  else if (r.node === 'shop') { advance(s, 'ambush'); message = '离开商店，耗1粮；装备将参与下一场战斗。'; }
  else if (r.node === 'forktwo') { advance(s, id, id === 'dunes' ? 2 : 1); message = `选择${NODES[id].name}，旅行代价已提交。`; }
  else if (r.node === 'grove') {
    const f = r.forester;
    if (id === 'listen') {
      f.result = encounterOutcome(f.fed, random.integer(1, 4, '守林人遭遇判定'));
      if (f.result === 'failure') { f.stage = 'fight'; message = '倒木后的灰沟鼠群骤然蹿出。你还没有离开林地。'; }
      else message = completeForester(s);
    } else {
      if (id === 'aid') { mustSpend(counts, 'food', 2); f.fed = true; message = '你分给他两份口粮。他喘匀了气，指向树后的阴影。林间的响动还未平息。'; }
      else { mustGrant(counts, 'food', 3); message = '你带上倒木边的三份干粮。守林人仍靠着树干，远处传来折枝声。'; }
      f.stage = 'check';
    }
  } else if (r.node === 'dunes') { mustSpend(counts, 'gold', 2); advance(s, 'shrine'); message = '付2金币绕过食砂犬，另耗1粮前进；没有战利品。'; }
  else if (r.node === 'shrine') {
    if (id === 'bless') { mustSpend(counts, 'gold', 2); r.blessing = true; message = '献钱点起灯祝福。'; }
    else if (id === 'curse') { mustGrant(counts, 'gold', 5); r.curse = true; message = '取走供钱，灯影歪斜，寒意附在你的背后。'; }
    else message = '未取供品，走向塔门。';
    advance(s, 'elite'); message += '付1粮前进。';
  } else { finish(s, 'victory'); message = '灯塔重新亮起。胜利；获得8金币，潮渠捷径已解锁。'; }
  r = s.run;
  r.last = message + '\n' + (id.startsWith('begin') ? `新局资源：生命${r.counts.hp}/${MAX_HP}；金币${r.counts.gold}；粮食${r.counts.food}。` : resourceChange(before, r.counts));
  if (!validate(s)) throw new Error('结算结果不符合游戏状态');
  return { kind: 'accepted', outcome: r.last };
}
function sceneText(r) {
  if (r.node === 'grove') {
    if (r.forester.stage === 'check') return r.forester.fed ? '守林人扶住药囊，侧耳听了一会儿。“先别踩那片枯叶。”小灯在他掌心微微摇晃。' : '你背起干粮，守林人没有跟上来。折枝声忽近忽远，来路渐渐被雾遮住。';
    if (r.forester.stage === 'fight') return '低矮的影子从倒木后逼近，尖牙贴着你的脚边。应战后整场一次结算；可先换装或用药。';
  }
  if (r.node === 'elite' && r.binding) return '塔门前，守林人从墙后探出头来，手里握着松脂火把。“我牵住它们，你找机会过去。”守卫仍堵着门。';
  return NODES[r.node].text;
}
function enemyClue(s) {
  const foe = enemyFor(s);
  if (!foe || s.run.phase !== 'journey') return '';
  const count = ['零', '一', '两', '三'][foe.count] || String(foe.count);
  if (s.run.node === 'elite') return `现场：${count}名失灯守卫压低长柄兵器，护住塔门。`;
  if (foe.name === ENEMIES.birds.name) return `现场：${count}只崖道掠鸟绕着绳桥盘旋，俯冲时露出利爪。`;
  if (foe.name === ENEMIES.dogs.name) return `现场：${count}只食砂犬守着废车，盯着你身上的行粮。`;
  return `现场：灰沟鼠群从两侧泥沟围来，${count}道鼠影夹着尖牙和水声一起逼近。`;
}
// bag 首行与 map 查询的正文：详情页与它们共用这两个函数（接口 v2 的「同源」判据，不是两份文案）。
function blessingText(r) { return `祝福：${r.blessing ? '灯祝福' : '无'}；诅咒：${r.curse ? '有' : '无'}`; }
function mapText(s) { const r = s.run; return `当前：${NODES[r.node].name}。已过：${r.visited.map(k => NODES[k].name).join(' → ') || '无'}。\n可走路线：沼泽/崖道 → 商店 → 伏击 → 林地/沙地 → 祠堂 → 精英 → 灯塔；潮渠捷径${has(s, 'canal') ? '已解锁' : '未解锁'}。`; }
export function view(s) {
  const r = s.run, p = s.profile, counts = r.counts;
  const unlocked = p.unlocks.map(k => UNLOCKS[k]).join('、') || '无';
  const stage = r.node === 'grove' && r.phase === 'journey' ? { decision: '林地选择', check: '林间动静·待判定', fight: '林间遭遇·待应战' }[r.forester.stage] : { camp: '营地', journey: '旅程中', victory: '胜利', death: '死亡', withdrawn: '撤退' }[r.phase];
  const status = `生命${counts.hp}/20；金币${counts.gold}；粮食${counts.food}；本局${r.id}；整场战斗${r.battles}。\n阶段：${stage}。长期：胜${p.wins}，败${p.deaths}，撤退${p.retreats}；已解锁：${unlocked}。`;
  // 背包是派生视图（§2）：条目来自 counts 且按条目的数量重复列出（与现版逐字一致）。
  const carried = held(counts);
  const detail = carried.map(k => `${ITEMS[k].name}：${describe(k, true)}`).join('\n');
  const bagNames = carried.flatMap(k => Array(counts[k]).fill(ITEMS[k].name)).join('、') || '空';
  const gearName = id => id === 'none' ? '无' : ITEMS[id].name;
  const 组合 = 组合效果(s);
  const 组合行 = 组合.生效.length ? `\n组合：${组合.生效.map((id) => { const c = COMBOS.find((x) => x.id === id); return `${c.name}（${c.purpose}）`; }).join('；')}` : '';
  const bag = `武器：${gearName(r.equipped.weapon)}；护甲：${gearName(r.equipped.armor)}；${blessingText(r)}。\n背包：${bagNames}。${detail ? '\n' + detail : ''}${组合行}`;
  const map = mapText(s);
  const ending = { victory: '送灯成功', death: '送灯失败', withdrawn: '旅程撤退' }[r.phase];
  const travel = r.node === 'grove' && r.phase === 'journey' ? '旅程规则：本事件完成后前进耗1粮；分给守林人的2粮另计。' : '';
  return { title: ending || NODES[r.node].name, text: [sceneText(r), enemyClue(s), travel, r.last, status].filter(Boolean).join('\n'), phase: ending ? 'ended' : 'playing', choices: options(s), status, bag, map };
}

// 诊断视图（引擎接口 v2 的可选 inspect 钩子）。纯读：只用传入的副本，不碰任何字段，也不读随机。
const entryOf = id => ENTRIES.find(e => e.id === id);
function foresterDetail(r) {
  const f = r.forester;
  if (f.rescued) return `你分给他两份口粮，他为你敷药并把小灯递到你手里，约定在塔门前相助。${f.result === 'great' ? '他还取出金币谢你。' : ''}`;
  if (f.stage === 'abandoned') return '你放弃送灯撤退，没有把他带出来。';
  if (f.result === 'failure') return '林间遭遇失败，你没能把他带出来。';
  if (f.stage === 'done') return '你带上倒木边的干粮离开，没有分给他口粮。';
  if (f.stage === 'decision') return '他的腿仍在渗血，正等你决定分不分口粮。';
  if (f.stage === 'check') return '你已经作出选择，林间的响动还没有平息。';
  return '倒木后的鼠群已经扑上来，你还没有离开林地。';
}
function detailText(id, s) {
  if (ITEMS[id]) return describe(id, true); // 与 bag 的逐条详情是同一函数
  if (id === 'blessing') return '在空灯祠堂献 2 金币点灯所得。受祝福时敌方反击更难命中（受概率边界限制）；已有祝福不能叠加。';
  if (id === 'curse') return '取走空灯祠堂供钱所得。受诅咒时敌方反击更易命中（受概率边界限制）。';
  if (id === 'forester-aid' || id === 'intel-forester') return foresterDetail(s.run);
  if (id === 'binding' || id === 'intel-binding') return '守林人答应在塔门前牵制失灯守卫；只助一次，用过即失效。';
  if (id === 'intel-map') return mapText(s); // 与 map 查询是同一函数
  throw new Error('未定义的诊断条目');
}
// data 只在详情页返回，且只在条目可见时可达（不可见条目 inspect 直接返回 null）。
function entryData(id, s) {
  const r = s.run, row = entryOf(id);
  if (ITEMS[id]) {
    const g = ITEMS[id], rating = g.slot === 'weapon' ? { tier: g.tier } : g.slot === 'armor' ? { armor: g.armor } : { use: { ...g.use } };
    return { id, name: g.name, slot: g.slot, price: g.price, count: r.counts[id], ...rating, ...(['weapon', 'armor'].includes(g.slot) ? { equipped: r.equipped[g.slot] === id } : {}) };
  }
  if (id === 'blessing') return { id, name: row.name, active: true, counterChanceDelta: -COUNTER_BLESSING };
  if (id === 'curse') return { id, name: row.name, active: true, counterChanceDelta: COUNTER_CURSE };
  if (id === 'forester-aid') return { id, name: row.name, ...r.forester };
  if (id === 'binding') return { id, name: row.name, binding: { ...r.binding } };
  if (id === 'intel-map') return { id, name: row.name, node: r.node, visited: [...r.visited], canalUnlocked: has(s, 'canal'), nodes: NODES };
  if (id === 'intel-forester') return { id, name: row.name, stage: r.forester.stage, fed: r.forester.fed, result: r.forester.result, rescued: r.forester.rescued };
  if (id === 'intel-binding') return { id, name: row.name, pledged: r.forester.pledged, binding: r.binding ? { ...r.binding } : null };
  throw new Error('未定义的诊断条目');
}
export function inspect(target, state) {
  const r = state.run;
  const visible = ENTRIES.filter(e => e.visible(r));
  if (target === null) {
    return { title: '玩家细节', text: '选择一类查看当前条目；输入 0 返回上一级。',
      entries: CATEGORIES.map(c => ({ id: c.id, label: c.name, kind: 'category', count: visible.filter(e => e.category === c.id).length })) };
  }
  const category = CATEGORIES.find(c => c.id === target);
  if (category) {
    const rows = visible.filter(e => e.category === category.id);
    return { title: category.name, text: rows.length ? category.text : `${category.text}暂无。`,
      entries: rows.map(e => ({ id: e.id, label: e.name, kind: e.kind })) };
  }
  const found = entryOf(target);
  // 未定义或不可见 ⇒ null（引擎转 INSPECT_NO_TARGET）：隐藏条目根本不可达，其字段自然也进不了 data。
  if (!found || !found.visible(r)) return null;
  return { title: found.name, text: detailText(found.id, state), entries: [], data: entryData(found.id, state) };
}
export default { id: 'grayharbor-lamp', version: 3, initial, validate, view, apply, inspect };
