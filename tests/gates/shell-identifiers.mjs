// 门：工作流 `run:` 块里，**标识符位置**出现非常规（非 ASCII）字符 ⇒ 红且具名。
//
// 为什么要有这道门（books#603）：`e2e-window.yml` 的步 25 里曾有 `local 守护="$2"` ——
// 非 ASCII 变量名。它能跑，但在别的 shell/工具链/字体环境下极易踩坑，且人读时看不出它是个变量。
// ✗ 一次性改名不成门 ⇒ 本门把"这一类"钉住：**任何**工作流里、**任何**非 ASCII 标识符都会被点名。
//
// 判据（范围写死在此，✗ 无未写下的默认）：
//   · 扫的面：`--dir`（默认本仓根）下 `.github/workflows/*.yml` 的 `run:` 块。
//   · 标识符位置（只有这两处）：
//       ①参数展开  `$名` / `${名}`    ②函数定义  `名() {`
//   · 名的字符集：`A-Za-z0-9_` ＋ 汉字。★中文标点（（）「」，。⇒ 一类）**不属于**名
//     ⇒ `$CH（版本…` 这种"变量紧接中文散文"不会误报 ✓（首版扫器正因此误报 7 处，已收紧 ✓）。
//   · ✗ 单引号串内一律不算（其中无展开 ✓）；✗ 注释/双引号里的散文不算（名形不匹配即不命中 ✓）。
//   · ★赋值形（`名=…`）**不单独判** —— 由它的展开处兜住 ✓；★若某变量"只赋值、从不展开" ⇒ 本门看不见它 ✗（明文边界 ✓）。
// 单向声明：本门只管"标识符里的非常规字符" ✓；✗ 不管命名风格/长度/是否被使用 ✓。
// 自证面活着：输出里带「扫到 N 个 run 块」✓（N=0 ⇒ 本门**报红**，避免"什么都没扫也算绿"✗）。
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const dirArg = argv.indexOf('--dir');
const root = dirArg >= 0 ? argv[dirArg + 1] : '.';
const WF = path.join(root, '.github', 'workflows');

// 名＝ASCII 字母数字下划线 ＋ 汉字；✗ 不含中文标点
const NAME = '[A-Za-z0-9_\\u4e00-\\u9fff]+';
const NON_ASCII = /[^\x00-\x7f]/;

function runBlocks(text) {
  const lines = text.split('\n'); const out = []; let i = 0;
  while (i < lines.length) {
    const m = /^(\s*)run:\s*\|/.exec(lines[i]);
    if (!m) { i++; continue; }
    const ind = m[1].length; const body = []; let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || (lines[j].length - lines[j].trimStart().length) > ind)) { body.push([j + 1, lines[j]]); j++; }
    out.push(body); i = j;
  }
  return out;
}

function scan(text) {
  const hits = [];
  for (const body of runBlocks(text)) {
    for (const [ln, raw] of body) {
      const t = raw.replace(/'[^']*'/g, "''");                       // ✗ 单引号串内不算
      for (const m of t.matchAll(new RegExp('\\$\\{?(' + NAME + ')\\}?', 'g'))) {
        if (NON_ASCII.test(m[1])) hits.push([ln, '参数展开', m[1], raw.trim().slice(0, 96)]);
      }
      for (const m of t.matchAll(new RegExp('(?:^|[\\s;|&(])(' + NAME + ')\\s*\\(\\)\\s*\\{', 'g'))) {
        if (NON_ASCII.test(m[1])) hits.push([ln, '函数定义', m[1], raw.trim().slice(0, 96)]);
      }
    }
  }
  return hits;
}

if (!fs.existsSync(WF)) { console.error(`ROOT: FAIL ⇒ 扫不到 ${WF}（✗ 面不在 ⇒ 不得当绿）`); process.exit(1); }
const files = fs.readdirSync(WF).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).sort();
let blocks = 0; const all = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(WF, f), 'utf8');
  blocks += runBlocks(text).length;
  for (const h of scan(text)) all.push([f, ...h]);
}
console.log(`扫 ${files.length} 档 · run 块 ${blocks} 个 · 命中 ${all.length} 处`);
if (blocks === 0) { console.error('ROOT: FAIL ⇒ 一个 run 块都没扫到（✗ 面死了 ⇒ 不得当绿）'); process.exit(1); }
for (const [f, ln, pos, name, text] of all) console.error(`::error title=shell-identifiers::${f}:${ln} 标识符位置的非常规字符（${pos}）名「${name}」⇒ ${text}`);
if (all.length) { console.error(`RESULT: FAIL ⇒ ${all.length} 处`); process.exit(1); }
console.log('RESULT: PASS ⇒ 工作流的标识符里无非常规字符 ✓');
