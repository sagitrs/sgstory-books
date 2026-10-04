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
