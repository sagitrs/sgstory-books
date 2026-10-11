import { GEAR, ENEMIES, NODES, UNLOCKS } from './content.mjs';
const MAX_HP = 20, MAX_RUNS = 1000000, MAP = 'grayharbor', WEAPON_STEP = 15;
const integer = (n, max = 999) => Number.isSafeInteger(n) && n >= 0 && n <= max;
const keys = (x, names) => x && !Array.isArray(x) && typeof x === 'object' && Object.keys(x).sort().join(',') === [...names].sort().join(',');
const total = p => p.wins + p.deaths + p.retreats;
const has = (s, id) => s.profile.unlocks.includes(id);
const freshForester = () => ({ stage: 'unmet', fed: false, result: 'none', rescued: false, pledged: false });
const freshRun = (id = 0, watch = false) => ({ id, phase: id ? 'journey' : 'camp', node: id ? 'fork' : 'harbor', mapId: MAP, forester: freshForester(), binding: null, hp: MAX_HP, gold: 10, food: 8, bag: watch ? ['coat'] : [], weapon: 'none', armor: watch ? 'coat' : 'none', blessing: false, curse: false, visited: [], battles: 0, last: '准备好后选择出发；查询不消耗资源。' });
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
  if (!keys(s, ['profile', 'run']) || !keys(s.profile, ['wins', 'deaths', 'retreats', 'unlocks']) || !keys(s.run, ['id', 'phase', 'node', 'mapId', 'forester', 'binding', 'hp', 'gold', 'food', 'bag', 'weapon', 'armor', 'blessing', 'curse', 'visited', 'battles', 'last'])) return false;
  const p = s.profile, r = s.run;
  if (!['wins', 'deaths', 'retreats'].every(k => integer(p[k], MAX_RUNS)) || total(p) > MAX_RUNS || !Array.isArray(p.unlocks) || new Set(p.unlocks).size !== p.unlocks.length || p.unlocks.some(k => !Object.hasOwn(UNLOCKS, k))) return false;
  if (has(s, 'canal') !== (p.wins > 0) || has(s, 'watch') !== (p.deaths > 0)) return false;
  if (!integer(r.id, MAX_RUNS) || !['camp', 'journey', 'victory', 'death', 'withdrawn'].includes(r.phase) || !Object.hasOwn(NODES, r.node) || !integer(r.hp, MAX_HP) || !integer(r.gold) || !integer(r.food) || !integer(r.battles, 3) || typeof r.blessing !== 'boolean' || typeof r.curse !== 'boolean' || typeof r.last !== 'string' || !r.last.trim() || r.last.length > 400) return false;
  if (!Array.isArray(r.bag) || r.bag.length > 7 || r.bag.some(k => !Object.hasOwn(GEAR, k) || k === 'bread') || r.bag.filter(k => k === 'tonic').length > 3 || Object.keys(GEAR).some(k => k !== 'tonic' && r.bag.filter(x => x === k).length > 1)) return false;
  if (!['none', 'knife', 'sabre'].includes(r.weapon) || !['none', 'coat', 'mail'].includes(r.armor) || [r.weapon, r.armor].some(k => k !== 'none' && !r.bag.includes(k))) return false;
  if (!Array.isArray(r.visited) || r.visited.length > 11 || new Set(r.visited).size !== r.visited.length || r.visited.some(k => !Object.hasOwn(NODES, k) || k === 'harbor') || !validForester(r)) return false;
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
export function counterChance(base, weapon, blessing, curse) { return Math.max(5, Math.min(95, base - weapon * WEAPON_STEP - (blessing ? 15 : 0) + (curse ? 15 : 0))); }
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
function gearDescription(id, detail = false) {
  const item = GEAR[id];
  if (item.slot === 'weapon') return detail ? `敌方反击概率降低${item.value * WEAPON_STEP}个百分点，受概率边界限制；不减少敌人数` : item.value === 3 ? '更能压制反击，买下即换装' : '便于压制反击，买下即换装';
  if (item.slot === 'armor') return `每次有效反击伤害减${item.value}，最低为0；买下即换装`;
  if (item.slot === 'food') return `补充${item.value}粮`;
  return `最多恢复${item.value}生命，不超过${MAX_HP}；最多携带3瓶`;
}
function gearComparison(r, id) {
  const item = GEAR[id]; if (!['weapon', 'armor'].includes(item.slot)) return '';
  const current = GEAR[r[item.slot]], old = current?.value || 0;
  return `；${item.slot === 'weapon' ? '武器档' : '护甲'}${old}→${item.value}（较当前${current?.name || '无装备'}${item.value > old ? '更强' : item.value < old ? '更弱' : '相同'}）`;
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
  if (r.node === 'grove' && r.forester.stage === 'check') {
    add('listen', '循着声音辨认林间动静'); add('retreat', '放弃送灯，合法撤退'); return out;
  }
  switch (r.node) {
    case 'fork':
      add('marsh', '走沼泽（耗2粮）', food(2)); add('cliff', '走崖道（耗1粮）', food());
      add('canal', '走潮渠捷径（耗1粮）', has(s, 'canal') ? food() : '先点亮灯塔解锁潮渠捷径'); break;
    case 'marsh': add('fish', '捞漂粮（漂粮数量未知；前进耗1粮）', food()); add('trade', '用2粮换4金币（另付前进1粮，共3粮）', food(3)); break;
    case 'cliff': add('ore', '取铜矿（失4生命，得6金币；前进耗1粮）', food()); add('rope', '扶绳通过（失2生命，得3金币；前进耗1粮）', food()); break;
    case 'shop':
      for (const [id, item] of Object.entries(GEAR)) {
        const cost = price(s, item);
        const reason = r.gold < cost ? `需要${cost}金币` : ['weapon', 'armor'].includes(item.slot) && r.bag.includes(id) ? '已经拥有这件装备' : id === 'tonic' && r.bag.filter(x => x === id).length >= 3 ? '最多携带3瓶药' : id === 'bread' && r.food + item.value > 999 ? '粮食达到上限' : '';
        add(`buy-${id}`, `购买${item.name}（${cost}金币）—${gearDescription(id)}${gearComparison(r, id)}`, reason);
      }
      add('leave', '离开商店（耗1粮）', food()); break;
    case 'ambush': add('fight', '应战，结算整场伏击（胜后前进耗1粮）', food()); break;
    case 'forktwo': add('grove', '走林地（耗1粮）', food()); add('dunes', '走沙地（耗2粮）', food(2)); break;
    case 'grove':
      if (r.forester.stage === 'fight') add('forest-fight', '迎击倒木后的鼠群（胜后前进耗1粮）', food());
      else {
        add('forage', '带上倒木边的三份干粮', r.food + 3 > 999 ? '粮食达到上限' : food());
        add('aid', '分给他两份口粮（另留前进1粮）', food(3));
      }
      break;
    case 'dunes': add('fight', '驱逐食砂犬（胜后前进耗1粮）', food()); add('bribe', '付2金币绕过食砂犬（前进耗1粮）', r.gold < 2 ? '需要2金币' : food()); break;
    case 'shrine':
      add('bless', '献2金币点灯（前进耗1粮）', r.blessing ? '已有灯祝福，不能叠加' : r.gold < 2 ? '需要2金币' : food());
      add('curse', '取走供品旁的5金币（前进耗1粮）', food()); add('pass', '不取供品，继续前行（耗1粮）', food()); break;
    case 'elite': add('fight', '挑战失灯守卫，结算整场精英战（胜后前进耗1粮）', food()); break;
    case 'beacon': add('light', '点亮灯塔，完成挑战'); break;
    default: throw new Error('旅程节点无规则');
  }
  for (const id of r.bag.filter((x, i, a) => x !== 'tonic' && a.indexOf(x) === i)) {
    const item = GEAR[id]; add(`equip-${id}`, `装备${item.name}（替换旧件，不叠加）`, r[item.slot] === id ? '已经装备' : '');
  }
  add('tonic', '使用回春药（恢复至多6生命）', !r.bag.includes('tonic') ? '背包没有回春药' : r.hp === MAX_HP ? '生命已满' : '');
  add('retreat', '放弃送灯，合法撤退');
  return out;
}
function advance(s, node, cost = 1) {
  const r = s.run;
  if (r.food < cost || r.visited.includes(r.node) || r.visited.includes(node)) throw new Error('路线前置或一次性边界不符');
  r.food -= cost; r.visited.push(r.node); r.node = node;
  if (node === 'grove') r.forester.stage = 'decision';
}
function unlock(s, id) { if (!has(s, id)) s.profile.unlocks.push(id); }
function finish(s, kind) {
  const r = s.run;
  if (r.phase !== 'journey') throw new Error('本局已经结算');
  if (kind === 'withdrawn' && r.node === 'grove') r.forester.stage = 'abandoned';
  r.visited.push(r.node); r.phase = kind;
  if (kind === 'death') {
    r.hp = 0; r.gold = Math.floor(r.gold / 2); r.food = 0; r.bag = []; r.weapon = 'none'; r.armor = 'none';
    s.profile.deaths++; unlock(s, 'watch');
  } else if (kind === 'victory') {
    r.gold += 8; s.profile.wins++;
    unlock(s, 'canal'); // H2: victory unlock commits with the run settlement.
  } else s.profile.retreats++;
}
function completeForester(s) {
  const r = s.run, f = r.forester;
  f.stage = 'done';
  let message = '你辨清了林间的踪迹，绕过倒木，走向祠堂。';
  if (f.fed) {
    f.rescued = true; f.pledged = true;
    r.hp = Math.min(MAX_HP, r.hp + 7); r.blessing = true;
    r.binding = { mapId: r.mapId, nodeId: 'elite', original: 'keeper', replacement: 'keeper-assisted', consumed: false };
    message = '守林人站稳了。他打开药囊为你敷药，把小灯递到你掌边。“这条路我认得。塔门前，我会再找你。”';
    if (f.result === 'great') { const gift = Math.min(2, 999 - r.gold); r.gold += gift; message += `他又取出${gift}枚金币，谢你没有丢下他。`; }
  }
  advance(s, 'shrine');
  return message;
}
function fight(s, random) {
  const r = s.run, foe = enemyFor(s), cooperative = assisted(r);
  if (!foe) throw new Error('当前没有战斗');
  const result = battle(foe, r.hp, GEAR[r.weapon]?.value || 0, GEAR[r.armor]?.value || 0, r.blessing, r.curse, random);
  r.hp = result.hp; r.battles++;
  if (cooperative) r.binding.consumed = true;
  const message = (cooperative ? '守林人投下松脂火把，牵制了守卫。' : '') + `${foe.name}：有效反击${result.hits}次，损失${result.damage}生命。`;
  if (!result.won) {
    if (r.node === 'grove') r.forester.stage = 'done';
    finish(s, 'death'); return message + '你倒在送灯路上；死亡结算，守夜护符已解锁。';
  }
  if (r.node === 'grove') return message + '战胜。' + completeForester(s);
  if (r.node === 'elite') { r.gold += 6; advance(s, 'beacon'); }
  else if (r.node === 'dunes') { r.gold += 3; r.food += 4; advance(s, 'shrine'); }
  else { r.gold += 4; advance(s, 'forktwo'); }
  return message + '战胜；奖励和前进已结算。';
}
function resourceChange(before, r) {
  return `变化：生命${before.hp}→${r.hp}；金币${before.gold}→${r.gold}；粮食${before.food}→${r.food}。`;
}
export function apply(s, id, random) {
  if (!validate(s)) throw new Error('游戏状态不符');
  const choice = options(s).find(x => x.id === id);
  if (!choice?.enabled) return { kind: 'refused', reason: choice?.reason || '当前没有这个选项' };
  let r = s.run, message;
  const before = { hp: r.hp, gold: r.gold, food: r.food };
  if (id === 'begin' || id === 'begin-watch') { s.run = freshRun(total(s.profile) + 1, id === 'begin-watch'); message = id === 'begin-watch' ? '带着护胸与新灯芯出发。' : '带着新灯芯出发。'; }
  else if (id === 'retreat') { finish(s, 'withdrawn'); message = r.food ? '你带回未点亮的灯芯；本局撤退，没有通关奖励。' : '粮食耗尽；本局合法撤退，没有通关奖励。'; }
  else if (id.startsWith('buy-')) {
    const key = id.slice(4), item = GEAR[key]; r.gold -= price(s, item);
    if (item.slot === 'food') r.food += item.value;
    else { r.bag.push(key); if (['weapon', 'armor'].includes(item.slot)) r[item.slot] = key; }
    message = `买下${item.name}${['weapon', 'armor'].includes(item.slot) ? '并装备，替换旧件' : ''}；购买不消耗旅行粮食。`;
  } else if (id.startsWith('equip-')) { const key = id.slice(6); r[GEAR[key].slot] = key; message = `已装备${GEAR[key].name}，不叠加旧件。`; }
  else if (id === 'tonic') { r.bag.splice(r.bag.indexOf('tonic'), 1); r.hp = Math.min(MAX_HP, r.hp + GEAR.tonic.value); message = '饮下回春药，扣除1瓶。'; }
  else if (r.node === 'fork') {
    if (id === 'canal') { advance(s, 'canal'); advance(s, 'shop', 0); message = '穿过已解锁的潮渠捷径，直接到商店；耗1粮，没有额外奖励。'; }
    else { advance(s, id, id === 'marsh' ? 2 : 1); message = `选择${NODES[id].name}，旅行代价已提交。`; }
  } else if (r.node === 'marsh') {
    if (id === 'fish') { const found = random.integer(1, 3, '芦苇渡口漂粮数量'); r.food += found; message = `捞起${found}份漂粮，再付1粮前进。`; }
    else { r.food -= 2; r.gold += 4; message = '交付2粮，收下4金币，再付1粮前进，共耗3粮。'; }
    advance(s, 'shop');
  } else if (r.node === 'cliff') {
    r.hp = Math.max(0, r.hp - (id === 'ore' ? 4 : 2));
    if (!r.hp) { finish(s, 'death'); message = '你倒在崖道；没有取得铜矿收益，守夜护符已解锁。'; }
    else { r.gold += id === 'ore' ? 6 : 3; advance(s, 'shop'); message = (id === 'ore' ? '受伤取回铜矿，得6金币。' : '扶绳过崖，得3金币。') + '付1粮前进。'; }
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
      if (id === 'aid') { r.food -= 2; f.fed = true; message = '你分给他两份口粮。他喘匀了气，指向树后的阴影。林间的响动还未平息。'; }
      else { r.food += 3; message = '你带上倒木边的三份干粮。守林人仍靠着树干，远处传来折枝声。'; }
      f.stage = 'check';
    }
  } else if (r.node === 'dunes') { r.gold -= 2; advance(s, 'shrine'); message = '付2金币绕过食砂犬，另耗1粮前进；没有战利品。'; }
  else if (r.node === 'shrine') {
    if (id === 'bless') { r.gold -= 2; r.blessing = true; message = '献钱点起灯祝福。'; }
    else if (id === 'curse') { r.gold += 5; r.curse = true; message = '取走供钱，灯影歪斜，寒意附在你的背后。'; }
    else message = '未取供品，走向塔门。';
    advance(s, 'elite'); message += '付1粮前进。';
  } else { finish(s, 'victory'); message = '灯塔重新亮起。胜利；获得8金币，潮渠捷径已解锁。'; }
  r = s.run;
  r.last = message + '\n' + (id.startsWith('begin') ? `新局资源：生命${r.hp}/${MAX_HP}；金币${r.gold}；粮食${r.food}。` : resourceChange(before, r));
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
export function view(s) {
  const r = s.run, p = s.profile;
  const unlocked = p.unlocks.map(k => UNLOCKS[k]).join('、') || '无';
  const stage = r.node === 'grove' && r.phase === 'journey' ? { decision: '林地选择', check: '林间动静·待判定', fight: '林间遭遇·待应战' }[r.forester.stage] : { camp: '营地', journey: '旅程中', victory: '胜利', death: '死亡', withdrawn: '撤退' }[r.phase];
  const status = `生命${r.hp}/20；金币${r.gold}；粮食${r.food}；本局${r.id}；整场战斗${r.battles}。\n阶段：${stage}。长期：胜${p.wins}，败${p.deaths}，撤退${p.retreats}；已解锁：${unlocked}。`;
  const detail = r.bag.filter((x, i, a) => a.indexOf(x) === i).map(k => `${GEAR[k].name}：${gearDescription(k, true)}`).join('\n');
  const bag = `武器：${GEAR[r.weapon]?.name || '无'}；护甲：${GEAR[r.armor]?.name || '无'}；祝福：${r.blessing ? '灯祝福' : '无'}；诅咒：${r.curse ? '有' : '无'}。\n背包：${r.bag.map(k => GEAR[k].name).join('、') || '空'}。${detail ? '\n' + detail : ''}`;
  const map = `当前：${NODES[r.node].name}。已过：${r.visited.map(k => NODES[k].name).join(' → ') || '无'}。\n可走路线：沼泽/崖道 → 商店 → 伏击 → 林地/沙地 → 祠堂 → 精英 → 灯塔；潮渠捷径${has(s, 'canal') ? '已解锁' : '未解锁'}。`;
  const ending = { victory: '送灯成功', death: '送灯失败', withdrawn: '旅程撤退' }[r.phase];
  const travel = r.node === 'grove' && r.phase === 'journey' ? '旅程规则：本事件完成后前进耗1粮；分给守林人的2粮另计。' : '';
  return { title: ending || NODES[r.node].name, text: [sceneText(r), enemyClue(s), travel, r.last, status].filter(Boolean).join('\n'), phase: ending ? 'ended' : 'playing', choices: options(s), status, bag, map };
}
export default { id: 'grayharbor-lamp', version: 2, initial, validate, view, apply };
