/* 灰港送灯 · 收入与成长节奏采样（`books#537` ①）
 *
 * ## 本件回答哪一问
 *   一趟远征的**净收支**与**成长**落到哪：分策略、分节点、分分母各出读数。
 *   ✗ 它不判「某面通不通」（那是 `tools/cli/test.mjs` 的 unit/e2e 族）。
 *
 * ## 三条纪律
 *   ① **只走黑盒**：经 `tools/cli/player.mjs` 的 stdin/stdout 驱动 `stories/hof-cli/play.mjs`；
 *      ✗ 不 import 游戏规则、✗ 不读存档格式、✗ 不造状态。
 *   ② **seed 只是正常启动配置**（`--seed N`）；✗ 不中途改 RNG、✗ 不改档。
 *   ③ **策略是完整决策规则**（六字段见 `策略表`），✗ 只登记策略名字。
 *
 * ## 分母四列
 *   跑了几局 ／ 正常结束（胜利） ／ 失败（死亡） ／ 无效（撤退＋未完成＋装置错）。
 *   ✗ 合成一个「通过率」——撤退是**合法结局**，不是失败，也不是通过。
 *
 * ## 用法与退出码
 *   node tools/hof-income-sample.mjs --engine <pin 检出> [--json <输出档>]
 *   node tools/hof-income-sample.mjs --engine <pin 检出> --selftest     # 判别力自证（见 §自证）
 *   exit 0 全部局有效；1 有无效局（装置错／未完成）；2 用法或环境错。
 *
 * ## 引擎 pin
 *   由**既有门**裁定：`stories/hof-cli/engine-ref.json`。本件不自读该 JSON、不自造真值；
 *   调用方按 `tools/check-engine-pin.mjs --engine` 先核过再传进来（同 `tools/cli/test.mjs` 的形）。
 */
import * as fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = path.resolve(import.meta.dirname, '..');
const argOf = (名, 缺 = null) => { const i = process.argv.indexOf(名); return i >= 0 ? process.argv[i + 1] : 缺; };

/* ══════════════════════════════════════════════════════════════════════════
 * 三策略（`#578` 票面的三条）。每策略六个字段：路线／购买顺序／预算／治疗／
 *   资源不足／退出／同分。✗ 只写名字。
 * 预算＝该件在 `stories/hof-cli/content.mjs` 的 `price`；本件只用它说明该件买不买得起，
 *   ✗ 不替游戏做判断 —— 买不起时游戏自己回「需要 N 金币」的具名拒，本件按「不可选」跳过。
 * ══════════════════════════════════════════════════════════════════════════ */
export const 策略表 = Object.freeze({
  '武器优先': {
    路线: [['走崖道', '取铜矿']],
    购买顺序: ['购买长刀', '购买行粮', '购买回春药', '购买护胸'],
    预算: Object.freeze({ '购买长刀': 6, '购买行粮': 3, '购买回春药': 2, '购买护胸': 3 }),
    治疗: 'HP≤15 且背包有药就喝，最多 3 瓶',
    资源不足: '该件不可选 ⇒ 跳过，看下一件',
    退出: '不主动撤退；粮尽才走「粮食耗尽」',
    同分: '多件可买时按 购买顺序 取靠前者',
  },
  '防护优先': {
    路线: [['走崖道', '取铜矿']],
    购买顺序: ['购买鳞甲', '购买长刀', '购买行粮', '购买回春药'],
    预算: Object.freeze({ '购买鳞甲': 6, '购买长刀': 6, '购买行粮': 3, '购买回春药': 2 }),
    治疗: '同上',
    资源不足: '同上',
    退出: '同上',
    同分: '同上；✗ 不买护胸 —— 与鳞甲同槽，会替换成低档',
  },
  '资源保守': {
    路线: [['走崖道', '扶绳通过']],
    购买顺序: ['购买行粮', '购买回春药', '购买短刃'],
    预算: Object.freeze({ '购买行粮': 3, '购买回春药': 2, '购买短刃': 3 }),
    治疗: '同上（保命优先于攒钱）',
    资源不足: '同上',
    退出: '同上',
    同分: '同上；装备只买最便宜的档 1',
  },
});

const 可点 = f => [...f.matchAll(/^(-?\d+)\. (.+)$/gm)].filter(m => !m[2].includes('不可选')).map(m => ({ n: m[1], l: m[2] }));
const 找 = (f, p) => 可点(f).find(o => o.l.startsWith(p));
const 读数 = f => { const m = f.match(/生命(\d+)\/(\d+)；金币(\d+)；粮食(\d+)/); return m ? { hp: +m[1], max: +m[2], gold: +m[3], food: +m[4] } : null; };
const 终局 = f => /送灯成功/.test(f) ? '胜利' : /送灯失败/.test(f) ? '死亡' : /旅程撤退/.test(f) ? '撤退' : null;

export async function 跑一局(make, seed, 名) {
  const S = 策略表[名];
  const p = make(seed);
  let f = await p.frame();
  const 起 = 读数(f);
  const 路 = [], 轨 = [];
  let prev = 起, 喝药 = 0;
  const 记 = 标 => { const now = 读数(f); if (now && prev) 轨.push({ 步: 标, hp: now.hp, dGold: now.gold - prev.gold, dFood: now.food - prev.food, dHp: now.hp - prev.hp }); prev = now; };
  const 点 = async (pre, 标) => { const o = 找(f, pre); if (!o) return false; f = await p.command(o.n); 路.push(标 ?? pre); 记(标 ?? pre); return true; };
  let 结局;
  try {
    await 点('普通出发');
    for (const [route, ...ev] of S.路线) { if (!(await 点(route))) break; for (const e of ev) if (!(await 点(e))) break; }
    for (const w of S.购买顺序) if (找(f, w)) await 点(w);
    { const now = 读数(f); if (now && now.hp <= 15) while (找(f, '使用回春药') && 喝药 < 3) { await 点('使用回春药', '喝药'); 喝药++; } }
    await 点('离开商店');
    await 点('应战');
    if (await 点('走林地')) {
      if (找(f, '分给他两份口粮')) { await 点('分给他两份口粮'); await 点('循着声音辨认', '林地判定'); }
      else if (找(f, '带上倒木边')) { await 点('带上倒木边'); await 点('循着声音辨认', '林地判定'); }
      if (找(f, '迎击倒木后的鼠群')) await 点('迎击倒木后的鼠群', '林地战斗');
    } else if (找(f, '走沙地')) {
      await 点('走沙地');
      if (找(f, '驱逐食砂犬')) await 点('驱逐食砂犬', '沙地战斗');
    }
    if (找(f, '粮食耗尽')) await 点('粮食耗尽', '粮尽');
    结局 = 终局(f);
    if (!结局) {
      if (找(f, '不取供品')) await 点('不取供品');
      else if (找(f, '献2金币点灯')) await 点('献2金币点灯');
      if (找(f, '挑战失灯守卫')) await 点('挑战失灯守卫', '精英战');
      if (找(f, '点亮灯塔')) await 点('点亮灯塔', '点灯');
      else if (找(f, '放弃送灯，合法撤退')) await 点('放弃送灯，合法撤退', '撤退');
      结局 = 终局(f);
    }
  } catch (e) { 结局 = '装置错'; 轨.push({ 步: 'ERR', hp: null, 因: String(e.message).split('\n')[0].slice(0, 80) }); }
  const 终 = 读数(f);
  const bag = await p.command('bag').catch(() => '');
  await p.quit().catch(() => {});
  const 装 = bag.match(/武器：([^；]+)；护甲：([^；]+)；/) || [];
  return { 策略: 名, seed, 结局: 结局 ?? '未完成', 起, 终, 终装: `${装[1] ?? '?'}/${装[2] ?? '?'}`, 喝药, 路: 路.join('>'), 轨 };
}

/* ══════════════════════════════════════════════════════════════════════════
 * §受控对照（--controlled）：把「资源保守策略 HP 掉得多」拆成**两个因子**。
 *
 *   为什么要有这一节：60 局样本里「资源保守」净粮食少但 HP 掉 19，看着像「省粮＝拿命垫」。
 *   但那 60 局里**装备与消耗品同时变了**（保守策略既少买装备、也少买药）⇒ 归因不明。
 *   本节只变一个因子：同 seed、同路线、同事件，只动【武器档】与【是否真的把药喝掉】。
 *
 *   四臂（全部走 崖道→取铜矿→商店→应战→林地→分粮→判定→不取供品→精英战→点灯）：
 *     A 长刀(档3)·无药   B 长刀(档3)·喝药   C 短刃(档1)·无药   D 短刃(档1)·喝药
 *   ★v1 的教训（✗ 重犯）：v1 的 B/D 臂**买了药却从不服用** ⇒ 与 A/C 逐字节相同，
 *     等于用两对相同的臂做「消耗品无效」的结论。本节按「真的喝到满血」重做，并把
 *     平均喝药瓶数印出来 —— 那个数若是 0，本节就没有证明力。
 * ══════════════════════════════════════════════════════════════════════════ */
export const 受控臂表 = Object.freeze({
  'A 长刀·无药': { 买: ['购买长刀', '购买行粮', '购买行粮'], 喝药: false },
  'B 长刀·喝药': { 买: ['购买长刀', '购买行粮', '购买行粮', '购买回春药', '购买回春药'], 喝药: true },
  'C 短刃·无药': { 买: ['购买短刃', '购买行粮', '购买行粮'], 喝药: false },
  'D 短刃·喝药': { 买: ['购买短刃', '购买行粮', '购买行粮', '购买回春药', '购买回春药'], 喝药: true },
});

export async function 跑受控一局(make, seed, 臂) {
  const S = 受控臂表[臂];
  const p = make(seed); let f = await p.frame();
  const 轨 = []; let 喝药 = 0;
  const 点 = async (pre, 标) => { const o = 找(f, pre); if (!o) return false; f = await p.command(o.n); 轨.push({ 步: 标 ?? pre, hp: 读数(f)?.hp }); return true; };
  let 结局;
  try {
    await 点('普通出发'); await 点('走崖道'); await 点('取铜矿');
    for (const w of S.买) await 点(w);
    if (S.喝药) while (找(f, '使用回春药') && 喝药 < 2) { await 点('使用回春药', '喝药'); 喝药++; }
    await 点('离开商店'); await 点('应战'); await 点('走林地');
    if (找(f, '分给他两份口粮')) { await 点('分给他两份口粮'); await 点('循着声音辨认', '林地判定'); }
    if (找(f, '迎击倒木后的鼠群')) await 点('迎击倒木后的鼠群', '林地战斗');
    if (找(f, '不取供品')) await 点('不取供品');
    if (S.喝药) while (找(f, '使用回春药') && 喝药 < 2) { await 点('使用回春药', '战前喝药'); 喝药++; }
    await 点('挑战失灯守卫', '精英战');
    await 点('点亮灯塔', '点灯');
    结局 = 终局(f);
  } catch (e) { 结局 = '装置错'; }
  const 终 = 读数(f); await p.quit().catch(() => {});
  const i = 轨.findIndex(a => a.步 === '精英战');
  return { 臂, seed, 喝药, 精英前: i > 0 ? 轨[i - 1].hp : null, 精英后: i >= 0 ? 轨[i].hp : null,
           Δ精英: (i > 0 && 轨[i].hp != null && 轨[i - 1].hp != null) ? 轨[i].hp - 轨[i - 1].hp : null,
           终HP: 终?.hp, 终金: 终?.gold, 结局: 结局 ?? '未完成', 轨 };
}

export function 汇总受控(局) {
  const 按 = {}; for (const r of 局) (按[r.臂] ??= []).push(r);
  return Object.entries(按).map(([k, v]) => {
    const d = v.map(x => x.Δ精英).filter(x => x != null);
    return {
      臂: k,
      平均喝药瓶数: f2(v.reduce((a, b) => a + b.喝药, 0) / v.length),
      死亡: `${v.filter(x => x.结局 !== '胜利').length}/${v.length}`,
      精英战前HP中位: 中位(v.map(x => x.精英前).filter(x => x != null)),
      精英战ΔHP中位: 中位(d),
      精英战ΔHP均值: f2(d.reduce((a, b) => a + b, 0) / (d.length || 1)),
      终HP中位: 中位(v.map(x => x.终HP).filter(x => x != null)),
      终金币中位: 中位(v.map(x => x.终金).filter(x => x != null)),
    };
  });
}

/* ── 汇总（纯函数，✗ 不 I/O ⇒ 可被 --selftest 直打）────────────────────── */
const f2 = n => Number(n).toFixed(2);
const 中位 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
export function 汇总(局) {
  const 按 = {}; for (const r of 局) (按[r.策略] ??= []).push(r);
  const 分母 = Object.entries(按).map(([k, v]) => ({
    策略: k, 局数: v.length,
    正常结束: v.filter(r => r.结局 === '胜利').length,
    失败: v.filter(r => r.结局 === '死亡').length,
    无效: v.length - v.filter(r => r.结局 === '胜利').length - v.filter(r => r.结局 === '死亡').length,
  }));
  const 收支 = Object.entries(按).map(([k, v]) => {
    const rng = a => `${Math.min(...a)}／${中位(a)}／${Math.max(...a)}`;
    return { 策略: k, 净金币: rng(v.map(r => r.终.gold - r.起.gold)), 净粮食: rng(v.map(r => r.终.food - r.起.food)), 净HP: rng(v.map(r => r.终.hp - r.起.hp)), 终局装备: v[0].终装 };
  });
  const ev = {};
  for (const r of 局) for (const e of r.轨) { if (e.步 === 'ERR') continue; (ev[e.步] ??= { n: 0, g: 0, f: 0, h: 0 }); ev[e.步].n++; ev[e.步].g += e.dGold; ev[e.步].f += e.dFood; ev[e.步].h += e.dHp; }
  const 逐节点 = Object.entries(ev).sort((a, b) => b[1].n - a[1].n).map(([k, o]) => ({ 阶段: k, 次数: o.n, Δ金币: f2(o.g / o.n), Δ粮食: f2(o.f / o.n), ΔHP: f2(o.h / o.n) }));
  const 敏感 = Object.entries(按).map(([k, v]) => {
    const 路 = {}; for (const r of v) 路[r.路] = (路[r.路] || 0) + 1;
    const hp = v.map(r => r.终.hp);
    return { 策略: k, 结局取值: [...new Set(v.map(r => r.结局))], 路径种类: Object.keys(路).length, 各路径局数: Object.values(路), 终HP极差: `${Math.min(...hp)}–${Math.max(...hp)}` };
  });
  return { 分母, 收支, 逐节点, 敏感 };
}

/* ══════════════════════════════════════════════════════════════════════════
 * §自证（--selftest）：证明本器**能不能红**。两条，都是纯函数直打，✗ 不跑真局。
 *   S1 汇总对「装置错」的局**不**算进正常结束 —— 否则「跑挂了」会伪装成「跑了」。
 *   S2 汇总理会**撤退**与**失败**分开 —— 把撤退并进失败会让分母说谎。
 * ══════════════════════════════════════════════════════════════════════════ */
if (process.argv.includes('--selftest')) {
  const 造 = (结局) => ({ 策略: '合成', seed: 0, 结局, 起: { hp: 20, max: 20, gold: 10, food: 8 }, 终: { hp: 10, max: 20, gold: 5, food: 3 }, 终装: '长刀/护胸', 喝药: 0, 路: 'a>b', 轨: [{ 步: 'a', hp: 20, dGold: 0, dFood: 0, dHp: 0 }] });
  const 红 = []; const 检查 = (名, 条件, 读) => { if (!条件) 红.push(`  ✗ ${名}｜${读}`); else console.log(`  ✓ ${名}｜${读}`); };
  const r1 = 汇总([造('胜利'), 造('装置错'), 造('装置错')]).分母[0];
  检查('S1 装置错不入「正常结束」', r1.正常结束 === 1 && r1.无效 === 2, JSON.stringify(r1));
  const r2 = 汇总([造('死亡'), 造('撤退'), 造('未完成')]).分母[0];
  检查('S2 撤退/未完成≠失败', r2.失败 === 1 && r2.无效 === 2, JSON.stringify(r2));
  console.log(红.length ? `\n  ⇒ 自检失败 ${红.length} 条\n${红.join('\n')}` : '\n  ⇒ 自检：2/2 如期（S1 判「跑挂了不伪装成跑了」；S2 判「分母不合并」）');
  process.exit(红.length ? 1 : 0);
}

/* ── 主流程 ─────────────────────────────────────────────────────── */
const engine = argOf('--engine');
const json出 = argOf('--json');
if (!engine) { console.error('用法：node tools/hof-income-sample.mjs --engine <pin 检出> [--json <输出档>] [--selftest]'); process.exit(2); }
if (!fs.existsSync(path.join(engine, 'src/cli/main.mjs'))) { console.error(`APPARATUS 引擎根不对：${engine}（缺 src/cli/main.mjs）`); process.exit(2); }
process.env.HOF_ENGINE = engine;

const { playCase } = await import(path.join(ROOT, 'tools/cli/player.mjs'));

/* --controlled：只跑受控四臂，✗ 不跑 60 局样本（两件事，✗ 混在一张表里）。 */
if (process.argv.includes('--controlled')) {
  const 局 = [];
  await playCase(async make => {
    for (const 臂 of Object.keys(受控臂表)) for (const seed of [...Array(20).keys()]) 局.push(await 跑受控一局(make, seed, 臂));
  });
  if (json出) fs.writeFileSync(json出, JSON.stringify({ 受控臂表, 局 }, null, 1));
  const R = 汇总受控(局);
  console.log('\n## 受控对照：只变【武器档】与【是否真的喝药】\n');
  const 表 = (表头, 行) => { console.log('| ' + 表头.join(' | ') + ' |'); console.log('|' + 表头.map(() => '---').join('|') + '|'); for (const r of 行) console.log('| ' + Object.values(r).join(' | ') + ' |'); };
  表(['臂', '平均喝药瓶数', '死亡', '精英战前HP中位', '精英战ΔHP中位', '精英战ΔHP均值', '终HP中位', '终金币中位'], R);
  const 未喝 = R.filter(r => Number(r.平均喝药瓶数) === 0).length;
  console.log(未喝 === 2 ? '\n✓ 喝药臂确实喝了药（平均瓶数 > 0）—— 本表有证明力' : `\n✗ ${未喝} 臂平均喝药瓶数为 0 ⇒ 该臂与「无药」臂等价，本表证明力不足`);
  process.exit(未喝 === 2 ? 0 : 1);
}

const 局 = [];
await playCase(async make => {
  for (const 名 of Object.keys(策略表)) for (const seed of [...Array(20).keys()]) 局.push(await 跑一局(make, seed, 名));
});
if (json出) fs.writeFileSync(json出, JSON.stringify({ 策略表, 局 }, null, 1));

const R = 汇总(局);
const 表 = (表头, 行) => { console.log('| ' + 表头.join(' | ') + ' |'); console.log('|' + 表头.map(() => '---').join('|') + '|'); for (const r of 行) console.log('| ' + Object.values(r).join(' | ') + ' |'); };
console.log('\n## 分母（四列分开，✗ 合成一个通过率）\n'); 表(['策略', '局数', '正常结束', '失败', '无效'], R.分母);
console.log('\n## 净收支（min／中位／max）\n'); 表(['策略', '净金币', '净粮食', '净HP', '终局装备'], R.收支);
console.log('\n## 逐节点收支（三策略合并，每局均 Δ）\n'); 表(['阶段', '次数', 'Δ金币', 'Δ粮食', 'ΔHP'], R.逐节点);
console.log('\n## seed 敏感性\n'); 表(['策略', '结局取值', '路径种类', '各路径局数', '终HP极差'], R.敏感.map(x => ({ ...x, 结局取值: x.结局取值.join('／'), 各路径局数: x.各路径局数.join('／') })));
const 坏 = 局.filter(r => r.结局 === '装置错' || r.结局 === '未完成').length;
console.log(`\n${坏 === 0 ? '✓' : '✗'} 无效局 ${坏}／${局.length}`);
process.exit(坏 === 0 ? 0 : 1);
