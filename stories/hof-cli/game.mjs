import { GEAR, ENEMIES, NODES, UNLOCKS } from './content.mjs';
const MAX_HP = 20, MAX_RUNS = 1000000;
const integer = (n, max = 999) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const keys = (x, names) => x && !Array.isArray(x) && typeof x === 'object' && Object.keys(x).sort().join(',') === [...names].sort().join(',');
const total = p => p.wins + p.deaths + p.retreats;
const has = (s, id) => s.profile.unlocks.includes(id);
const freshRun = (id = 0, watch = false) => ({ id, phase: id ? 'journey' : 'camp', node: id ? 'fork' : 'harbor', hp: MAX_HP, gold: 10, food: 8, bag: watch ? ['coat'] : [], weapon: 'none', armor: watch ? 'coat' : 'none', blessing: false, curse: false, visited: [], battles: 0, last: '准备好后选择出发；查询不消耗资源。' });
export function initial() { return { profile: { wins: 0, deaths: 0, retreats: 0, unlocks: [] }, run: freshRun() }; }
export function validate(s) {
  if (!keys(s, ['profile', 'run']) || !keys(s.profile, ['wins', 'deaths', 'retreats', 'unlocks']) || !keys(s.run, ['id', 'phase', 'node', 'hp', 'gold', 'food', 'bag', 'weapon', 'armor', 'blessing', 'curse', 'visited', 'battles', 'last'])) return false;
  const p = s.profile, r = s.run;
  if (!['wins', 'deaths', 'retreats'].every(k => integer(p[k], MAX_RUNS)) || total(p) > MAX_RUNS || !Array.isArray(p.unlocks) || new Set(p.unlocks).size !== p.unlocks.length || p.unlocks.some(k => !Object.hasOwn(UNLOCKS, k))) return false;
  if (has(s, 'canal') !== (p.wins > 0) || has(s, 'watch') !== (p.deaths > 0)) return false;
  if (!integer(r.id, MAX_RUNS) || !['camp', 'journey', 'victory', 'death', 'withdrawn'].includes(r.phase) || !Object.hasOwn(NODES, r.node) || !integer(r.hp, MAX_HP) || !integer(r.gold) || !integer(r.food) || !integer(r.battles, 3) || typeof r.blessing !== 'boolean' || typeof r.curse !== 'boolean' || typeof r.last !== 'string' || !r.last.trim() || r.last.length > 400) return false;
  if (!Array.isArray(r.bag) || r.bag.length > 7 || r.bag.some(k => !Object.hasOwn(GEAR, k) || k === 'bread') || r.bag.filter(k => k === 'tonic').length > 3 || Object.keys(GEAR).some(k => k !== 'tonic' && r.bag.filter(x => x === k).length > 1)) return false;
  if (!['none', 'knife', 'sabre'].includes(r.weapon) || !['none', 'coat', 'mail'].includes(r.armor) || [r.weapon, r.armor].some(k => k !== 'none' && !r.bag.includes(k))) return false;
  if (!Array.isArray(r.visited) || r.visited.length > 11 || new Set(r.visited).size !== r.visited.length || r.visited.some(k => !Object.hasOwn(NODES, k) || k === 'harbor')) return false;
  if (r.phase === 'camp') return r.id === 0 && total(p) === 0 && r.node === 'harbor' && r.visited.length === 0 && r.hp === MAX_HP && r.battles === 0 && r.bag.length === 0 && r.weapon === 'none' && r.armor === 'none' && !r.blessing && !r.curse;
  if (r.id === 0 || r.node === 'harbor' || (r.hp === 0) !== (r.phase === 'death')) return false;
  if (r.visited.length && r.visited[0] !== 'fork') return false;
  for (let i = 1; i < r.visited.length; i++) if (!NODES[r.visited[i - 1]].next.includes(r.visited[i])) return false;
  const ended = r.phase !== 'journey';
  if (r.id !== total(p) + (ended ? 0 : 1)) return false;
  if (ended) { if (r.visited.at(-1) !== r.node) return false; }
  else if (r.visited.includes(r.node) || (r.visited.length ? !NODES[r.visited.at(-1)].next.includes(r.node) : r.node !== 'fork')) return false;
  if (r.phase === 'victory' && (r.node !== 'beacon' || !r.visited.includes('elite') || r.battles < 2)) return false;
  if (r.phase === 'death' && (r.gold > 499 || r.food !== 0 || r.bag.length || r.weapon !== 'none' || r.armor !== 'none')) return false;
  if (r.visited.includes('canal') && !has(s, 'canal')) return false;
  return true;
}
export function counterChance(base, weapon, blessing, curse) { return Math.max(5, Math.min(95, base - weapon * 15 - (blessing ? 15 : 0) + (curse ? 15 : 0))); }
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
const price = (s, item) => Math.max(1, item.price - (has(s, 'watch') ? 1 : 0));
function options(s) {
  const r = s.run, out = [];
  const add = (id, label, reason = '') => out.push({ id, label, enabled: !reason, reason });
  const food = (cost = 1) => r.food < cost ? `需要${cost}份粮食` : '';
  if (r.phase !== 'journey') {
    const limit = total(s.profile) >= MAX_RUNS ? '长期记录已达100万局上限' : '';
    add('begin', r.phase === 'camp' ? '普通出发' : '再走一局（普通出发）', limit);
    add('begin-watch', '带守夜护符出发', limit || (has(s, 'watch') ? '' : '先经历一次死亡解锁守夜护符'));
    return out;
  }
  if (!r.food) { add('retreat', '粮食耗尽，结束旅程'); return out; }
  switch (r.node) {
    case 'fork':
      add('marsh', '走沼泽（耗2粮）', food(2)); add('cliff', '走崖道（耗1粮）', food());
      add('canal', '走潮渠捷径（耗1粮）', has(s, 'canal') ? food() : '先点亮灯塔解锁潮渠捷径'); break;
    case 'marsh': add('fish', '捞漂粮（随机1至3粮）', food()); add('trade', '用2粮换4金币', food(3)); break;
    case 'cliff': add('ore', '取铜矿（失4生命，得6金币）', food()); add('rope', '扶绳通过（失2生命，得3金币）', food()); break;
    case 'shop':
      for (const [id, item] of Object.entries(GEAR)) {
        const cost = price(s, item);
        const reason = r.gold < cost ? `需要${cost}金币` : ['weapon', 'armor'].includes(item.slot) && r.bag.includes(id) ? '已经拥有这件装备' : id === 'tonic' && r.bag.filter(x => x === id).length >= 3 ? '最多携带3瓶药' : id === 'bread' && r.food + item.value > 999 ? '粮食达到上限' : '';
        add(`buy-${id}`, `购买${item.name}（${cost}金币）`, reason);
      }
      add('leave', '离开商店（耗1粮）', food()); break;
    case 'ambush': add('fight', '应战，结算整场伏击', food()); break;
    case 'forktwo': add('grove', '走林地（耗1粮）', food()); add('dunes', '走沙地（耗2粮）', food(2)); break;
    case 'grove': add('forage', '拾3份干粮', food()); add('aid', '用2粮救守林人（恢复7生命，得祝福）', food(3)); break;
    case 'dunes': add('fight', '驱逐食砂犬（胜后得粮食和金币）', food()); add('bribe', '付2金币绕过食砂犬', r.gold < 2 ? '需要2金币' : food()); break;
    case 'shrine':
      add('bless', '献2金币点灯（祝福）', r.blessing ? '已有灯祝福，不能叠加' : r.gold < 2 ? '需要2金币' : food());
      add('curse', '取5金币，承受诅咒', food()); add('pass', '不取供品，继续前行', food()); break;
    case 'elite': add('fight', '挑战失灯守卫，结算整场精英战', food()); break;
    case 'beacon': add('light', '点亮灯塔，完成挑战'); break;
    default: throw new Error('旅程节点无规则');
  }
  for (const id of r.bag.filter((x, i, a) => x !== 'tonic' && a.indexOf(x) === i)) {
    const item = GEAR[id]; add(`equip-${id}`, `装备${item.name}`, r[item.slot] === id ? '已经装备' : '');
  }
  add('tonic', '使用回春药（恢复6生命）', !r.bag.includes('tonic') ? '背包没有回春药' : r.hp === MAX_HP ? '生命已满' : '');
  add('retreat', '放弃送灯，合法撤退');
  return out;
}
function advance(s, node, cost = 1) {
  const r = s.run;
  if (r.food < cost || r.visited.includes(r.node) || r.visited.includes(node)) throw new Error('路线前置或一次性边界不符');
  r.food -= cost; r.visited.push(r.node); r.node = node;
}
function unlock(s, id) { if (!has(s, id)) s.profile.unlocks.push(id); }
function finish(s, kind) {
  const r = s.run;
  if (r.phase !== 'journey') throw new Error('本局已经结算');
  r.visited.push(r.node); r.phase = kind;
  if (kind === 'death') {
    r.hp = 0; r.gold = Math.floor(r.gold / 2); r.food = 0; r.bag = []; r.weapon = 'none'; r.armor = 'none';
    s.profile.deaths++; unlock(s, 'watch');
  } else if (kind === 'victory') {
    r.gold += 8; s.profile.wins++;
    unlock(s, 'canal'); // H2: victory unlock commits with the run settlement.
  } else s.profile.retreats++;
}
function fight(s, random) {
  const r = s.run;
  const foe = r.node === 'elite' ? ENEMIES.keeper : r.node === 'dunes' ? ENEMIES.dogs : r.visited.includes('marsh') ? ENEMIES.rats : ENEMIES.birds;
  const result = battle(foe, r.hp, GEAR[r.weapon]?.value || 0, GEAR[r.armor]?.value || 0, r.blessing, r.curse, random);
  r.hp = result.hp; r.battles++;
  const message = `${foe.name}：潜在反击${result.potential}，实际判定${result.checked}，有效${result.hits}，损失${result.damage}生命，概率${result.chance}%。`;
  if (!result.won) { finish(s, 'death'); return message + '你倒在送灯路上；死亡结算，守夜护符已解锁。'; }
  if (r.node === 'elite') { r.gold += 6; advance(s, 'beacon'); }
  else if (r.node === 'dunes') { r.gold += 3; r.food += 4; advance(s, 'shrine'); }
  else { r.gold += 4; advance(s, 'forktwo'); }
  return message + '战胜；奖励和前进已结算。';
}
export function apply(s, id, random) {
  if (!validate(s)) throw new Error('游戏状态不符');
  const choice = options(s).find(x => x.id === id);
  if (!choice?.enabled) return { kind: 'refused', reason: choice?.reason || '当前没有这个选项' };
  let r = s.run, message;
  if (id === 'begin' || id === 'begin-watch') { s.run = freshRun(total(s.profile) + 1, id === 'begin-watch'); message = id === 'begin-watch' ? '带着护胸与新灯芯出发。' : '带着新灯芯出发。'; }
  else if (id === 'retreat') { finish(s, 'withdrawn'); message = r.food ? '你带回未点亮的灯芯；本局撤退，没有通关奖励。' : '粮食耗尽；本局合法撤退，没有通关奖励。'; }
  else if (id.startsWith('buy-')) {
    const key = id.slice(4), item = GEAR[key]; r.gold -= price(s, item);
    if (item.slot === 'food') r.food += item.value;
    else { r.bag.push(key); if (['weapon', 'armor'].includes(item.slot)) r[item.slot] = key; }
    message = `买下${item.name}${['weapon', 'armor'].includes(item.slot) ? '并装备' : ''}；金币${r.gold}。`;
  } else if (id.startsWith('equip-')) { const key = id.slice(6); r[GEAR[key].slot] = key; message = `已装备${GEAR[key].name}，不叠加旧件。`; }
  else if (id === 'tonic') { r.bag.splice(r.bag.indexOf('tonic'), 1); const old = r.hp; r.hp = Math.min(MAX_HP, r.hp + 6); message = `回春药：生命${old}变为${r.hp}，扣除1瓶。`; }
  else if (r.node === 'fork') {
    if (id === 'canal') { advance(s, 'canal'); advance(s, 'shop', 0); message = '穿过已解锁的潮渠捷径，直接到商店；耗1粮，没有额外奖励。'; }
    else { advance(s, id, id === 'marsh' ? 2 : 1); message = `选择${NODES[id].name}，资源代价已提交。`; }
  } else if (r.node === 'marsh') {
    if (id === 'fish') { const found = random.integer(1, 3, '芦苇渡口漂粮数量'); r.food += found; message = `捞起${found}份漂粮。`; }
    else { r.food -= 2; r.gold += 4; message = '付出2粮，收下4金币。'; }
    advance(s, 'shop');
  } else if (r.node === 'cliff') {
    r.hp = Math.max(0, r.hp - (id === 'ore' ? 4 : 2));
    if (!r.hp) { finish(s, 'death'); message = '你倒在崖道；没有取得铜矿收益，守夜护符已解锁。'; }
    else { r.gold += id === 'ore' ? 6 : 3; advance(s, 'shop'); message = id === 'ore' ? '受伤取回铜矿，得6金币。' : '扶绳过崖，得3金币。'; }
  } else if (id === 'fight') message = fight(s, random);
  else if (r.node === 'shop') { advance(s, 'ambush'); message = '离开商店；装备将参与下一场战斗。'; }
  else if (r.node === 'forktwo') { advance(s, id, id === 'dunes' ? 2 : 1); message = `选择${NODES[id].name}，路线代价已提交。`; }
  else if (r.node === 'grove') {
    if (id === 'forage') { r.food += 3; message = '拾得3份干粮。'; }
    else { r.food -= 2; r.hp = Math.min(MAX_HP, r.hp + 7); r.blessing = true; message = '救下守林人，恢复生命并得到不叠加的灯祝福。'; }
    advance(s, 'shrine');
  } else if (r.node === 'dunes') { r.gold -= 2; advance(s, 'shrine'); message = '付钱绕过食砂犬；没有战利品。'; }
  else if (r.node === 'shrine') {
    if (id === 'bless') { r.gold -= 2; r.blessing = true; message = '献钱点起灯祝福。'; }
    else if (id === 'curse') { r.gold += 5; r.curse = true; message = '取走供钱，诅咒增加反击概率。'; }
    else message = '未取供品，走向精英守卫。';
    advance(s, 'elite');
  } else { finish(s, 'victory'); message = '灯塔重新亮起。胜利；获得8金币，潮渠捷径已解锁。'; }
  s.run.last = message;
  if (!validate(s)) throw new Error('结算结果不符合游戏状态');
  return { kind: 'accepted', outcome: message };
}
export function view(s) {
  const r = s.run, p = s.profile;
  const unlocked = p.unlocks.map(k => UNLOCKS[k]).join('、') || '无';
  const status = `生命${r.hp}/20；金币${r.gold}；粮食${r.food}；本局${r.id}；整场战斗${r.battles}。\n长期：胜${p.wins}，败${p.deaths}，撤退${p.retreats}；已解锁：${unlocked}。`;
  const bag = `武器：${GEAR[r.weapon]?.name || '无'}；护甲：${GEAR[r.armor]?.name || '无'}；祝福：${r.blessing ? '灯祝福' : '无'}；诅咒：${r.curse ? '有' : '无'}。\n背包：${r.bag.map(k => GEAR[k].name).join('、') || '空'}。`;
  const map = `当前：${NODES[r.node].name}。已过：${r.visited.map(k => NODES[k].name).join(' → ') || '无'}。\n可走路线：沼泽/崖道 → 商店 → 伏击 → 林地/沙地 → 祠堂 → 精英 → 灯塔；潮渠捷径${has(s, 'canal') ? '已解锁' : '未解锁'}。`;
  const ending = { victory: '送灯成功', death: '送灯失败', withdrawn: '旅程撤退' }[r.phase];
  return { title: ending || NODES[r.node].name, text: `${NODES[r.node].text}\n${r.last}\n${status}`, phase: ending ? 'ended' : 'playing', choices: options(s), status, bag, map };
}
export default { id: 'grayharbor-lamp', version: 1, initial, validate, view, apply };
