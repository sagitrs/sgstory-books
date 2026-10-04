const H=await import('file://'+process.cwd()+'/tools/e2e-harness.mjs');
const s=await H.boot(H.resolveEnv());
const SC=s.SC, B=SC.setup.BABEL, V=()=>SC.State.variables;
console.log('  EVENT_LAYERS =', JSON.stringify(B.EVENT_LAYERS));
// 清干净账，然后只 moveTo 一个**白名单之外**的层
V().span1Events = {};
B.map.moveTo('L1');
const bag=V().span1Events ?? {};
console.log('  ① moveTo L1（白名单外）后账键:', JSON.stringify(Object.keys(bag)), bag.L1?('⇒ L1 被抽: '+JSON.stringify(bag.L1.抽中)):'');
V().span1Events = {};
B.map.moveTo('L9');
const bag9=V().span1Events ?? {};
console.log('  ② moveTo L9（白名单外）后账键:', JSON.stringify(Object.keys(bag9)), bag9.L9?('⇒ L9 被抽: '+JSON.stringify(bag9.L9.抽中)):'');
V().span1Events = {};
B.map.moveTo('L5');
const bag5=V().span1Events ?? {};
console.log('  ③ moveTo L5（白名单内）后账键:', JSON.stringify(Object.keys(bag5)), bag5.L5?'⇒ L5 被抽 ✓':'✗ 未抽');

/* ── 判据与退出码（★`#259` comment 5980218866 三·另一入口范围缺口 · 领队准 A8 补 exit 同笔）─────
 *   ★此前**缺显式退出** ⇒ 事件循环不空 ⇒ 跑完**挂住**（实测 `rc=124`）⇒ 装进 `run-all.sh` 的
 *   `CASES` 后会让 runner **空等整整一小时**（`timeout 3600`）—— ★「缺 exit ＝ 装置错」，
 *   与 `#248` 同族（那次的教训是："零红"与"跑不完"必须能分开）。
 *   ★判据两条（白名单**外**不开账／白名单**内**该开账）：任一条不成立 ⇒ 红。 */
const 问题 = [];
if (Object.keys(bag).length !== 0)  问题.push(`① moveTo L1（白名单外）竟开账: ${JSON.stringify(Object.keys(bag))}`);
if (Object.keys(bag9).length !== 0) 问题.push(`② moveTo L9（白名单外）竟开账: ${JSON.stringify(Object.keys(bag9))}`);
if (!bag5.L5)                        问题.push('③ moveTo L5（白名单内）**未**开账');
console.log(`\n  ⇒ 判据：白名单外不开账（①②）／白名单内该开账（③） ⇒ ${问题.length?('失败 '+问题.length+' 条'):'全过 ✓'}`);
for (const q of 问题) console.log('  ✗ ' + q);
process.exit(问题.length ? 1 : 0);          // ★显式退出：success 路径也须 exit（事件循环不自己空）

