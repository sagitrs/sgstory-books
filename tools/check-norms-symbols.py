#!/usr/bin/env python3
"""正文文风符号复核器（books 版 · 两仓共用 · 判定面／行文面分类）

来历：`gsvector-developer` 的 `check1899v2.py`（六修版）为底，本席（`sagitrs-tester-4`）取**只读**
 并入 books 仓 `tools/`，加两件它没有的：**`--body` 单篇正文模式**（本仓的清扫对象是**票面正文**，
  ✗ 文件树）与 **`--selftest` 判别力自证**（每类各一条正例与反例，任一不符即非零退出）。

口径（Admin 18:16 令 ＋ 领队 18:22 勘误 ＋ `#325` 增补两规）：
  · **勾叉**（`✓` `✗`）在**判定位置**保留：表格格里内容本身即记号｜清单条目正文以记号开头｜行首即记号且整行短。
  · **连接与强调符**（`⇒` `⭐` `★` `｜`）**任何位置都须清零**——含表格行、清单条目、判定行（勘误段所定）。
  · **例外第五类不动**：围栏代码块｜行内反引号｜`>` 引用行｜行内「」『』引号。
  · 机读 token（`[verified]` / `References #N` / 裸 `#N`）在别处**逐字保留**，本器不判它们，只提示票号变化。

用法（★本器只做**单篇正文**一路）：
    python3 tools/check-norms-symbols.py --body <正文档>   # 单篇正文读数
    python3 tools/check-norms-symbols.py --selftest        # 判别力自证（本席加）
退出码：0 全过；1 有残余须人核；2 用法错（含「传了两树」）。
★两树比对请用底版（`gsvector` 仓开发者席的 `check1899v2.py`）。本器**不声称**支持那一
  路：本席首版曾照底版写了一行两树用法的说法，而实现只读新树、基座树从未读入 ⇒ 那是一句
  **可证伪的声明**（评审实测：把基座换成两棵内容截然不同的树，读数不变）。撤掉该路并让它
  **如实报错**，比留着一句做不到的用法更诚实。
"""
import re
import sys
import pathlib

JUDGE = '✗✓'
CONN = '⇒⭐★｜'
SYM = JUDGE + CONN
LIST = re.compile(r'^\s*(?:[-*+]|\d+[.)、])\s')
QUOTED = re.compile(r'`[^`]*`|「[^」]*」|『[^』]*』')


def _strip_quoted(line):
    """NORMS §四：代码片段与引用原话豁免 ⇒ 先摘除反引号与「」/『』内的内容再计数。"""
    return QUOTED.sub(lambda m: ' ' * len(m.group(0)), line)


def classify(line):
    """记号级判据：逐**记号**判定，✗ 「一行即一面」。

    判定位置（勾叉保留）＝ ①表格行里某格内容本身就是记号 ②清单条目正文以记号开头
                        ③行首即记号且整行很短的独立判定行。
    **连接与强调符在任何位置都不保留**（勘误段）。
    """
    q = _strip_quoted(line)
    conn = sum(q.count(c) for c in CONN)
    if q.count(JUDGE[0]) + q.count(JUDGE[1]) == 0:
        return 0, conn
    keep = 0
    st = q.strip()
    if st.startswith('|'):
        for cell in st.strip('|').split('|'):
            if re.fullmatch(r'[\s`*_]*[✗✓][\s`*_]*', cell):
                keep += 1
    m = re.match(r'^\s*(?:[-*+]\s*(?:\[[ xX]\]\s*)?|\d+[.)、]\s*)(.*)$', q)
    if m and re.match(r'^[\s`*_]*[✗✓]', m.group(1)):
        keep += 1
    body = re.sub(r'[✗✓⇒⭐★｜\s`*_]', '', q)
    if st[:1] in JUDGE and len(body) <= 24:
        keep = max(keep, 1)
    total = q.count(JUDGE[0]) + q.count(JUDGE[1])
    return keep, conn + max(total - keep, 0)


def fence_mask(lines):
    """NORMS §四：围栏代码块属「代码片段」⇒ 豁免（不计数、不要求清零）。"""
    m, inf = [], False
    for l in lines:
        if l.lstrip().startswith('```'):
            m.append(True)
            inf = not inf
            continue
        m.append(inf)
    return m


def html_mask(lines):
    """NORMS §三：HTML 注释块属「不得动的面」⇒ 豁免（块内符号不计数、也不须清零）。

    块以 `<!--` 起、`-->` 止，可跨多行；同一行内起止亦按块处理。
    ★来历：`#148` 的 T 席评审记下本器原不摘注释块，于是带注释的正文会得到虚高读数（`books#162` 第一条）。
    """
    m, inf = [], False
    for l in lines:
        if inf:
            m.append(True)
            if '-->' in l:
                inf = False
            continue
        if '<!--' in l:
            m.append(True)
            if '-->' not in l.split('<!--', 1)[1]:
                inf = True
            continue
        m.append(False)
    return m


def body_counts(text):
    """单篇正文读数 ⇒ (判定面保留数, 行文面须清零数, 逐处定位列表)。"""
    lines = text.split('\n')
    mask = fence_mask(lines)
    cmask = html_mask(lines)
    keep = clear = 0
    hits = []
    for idx, l in enumerate(lines):
        if mask[idx] or cmask[idx]:
            continue
        if l.lstrip().startswith('>'):
            continue
        k, p = classify(l)
        keep += k
        clear += p
        if p:
            hits.append((idx + 1, l.strip()[:110]))
    return keep, clear, hits


# ── 判别力自证（每类一条正例与反例；任一不符即非零退出）──────────────────────
CASES = [
    ('表格格里内容即记号 ⇒ 保留', '| 门 | ✓ |', (1, 0)),
    ('表格格里的 ⇒ ⇒ 清零（勘误段：连接符不豁免）', '| 面 | 甲 ⇒ 乙 |', (0, 1)),
    ('清单条目以勾叉开头 ⇒ 保留', '- ✗ 不在范围内（逐条声明）', (1, 0)),
    ('清单条目正文里的 ｜ ⇒ 清零', '- 甲｜乙｜丙', (0, 2)),
    ('行首即记号且整行短 ⇒ 独立判定行保留', '✓ 通过', (1, 0)),
    ('行文句里的 ✗ ⇒ 清零', '本席实测读数，✗ 采信其转述。', (0, 1)),
    ('反引号内 ⇒ 例外不动', '见 `甲 ⇒ 乙` 的形', (0, 0)),
    ('行内「」内 ⇒ 例外不动', '其自陈「修毕 ⇒ 重跑」已核', (0, 0)),
    ('围栏代码块内 ⇒ 例外不动', '```\n甲 ⇒ 乙\n```', (0, 0)),
    ('`>` 引用行内 ⇒ 例外不动', '> 原文：甲 ⇒ 乙', (0, 0)),
    ('强调符 ★ 行文 ⇒ 清零', '★本件只加一行', (0, 1)),
    ('判定行的勾叉保留而同行 ⇒ 清零', '| 甲 | ✓ | 乙 ⇒ 丙 |', (1, 1)),
    ('实心星 ⭐ 行文 ⇒ 清零（与 ★ 同族）', '⭐本项优先', (0, 1)),
    ('勾叉在句子中间 ⇒ 清零（非判定面）', '实测 3/5 ✓ 而其后仍红', (0, 1)),
    ('HTML 注释块内 ⇒ 例外不动（不得动的面）', '前句。\n<!-- 注释：甲 ⇒ 乙 ⭐ ｜ -->\n后句。', (0, 0)),
]


def selftest():
    bad = 0
    for name, text, want in CASES:
        got = body_counts(text)[:2]
        ok = got == want
        if not ok:
            bad += 1
        print(('  ✓ ' if ok else '  ✗ ') + f'{name}：期望 {want}，实得 {got}')
    print(f'\n  判别力自证：{len(CASES) - bad}/{len(CASES)} 如期' + ('' if not bad else '  ★有不符项'))
    return 1 if bad else 0


def main():
    args = [a for a in sys.argv[1:]]
    if '--selftest' in args:
        return selftest()
    if '--body' in args:
        i = args.index('--body')
        if i + 1 >= len(args):
            print(__doc__)
            return 2
        p = pathlib.Path(args[i + 1])
        if not p.exists():
            print(f'✗ 档不存在：{p}')
            return 2
        keep, clear, hits = body_counts(p.read_text(encoding='utf-8'))
        print(f'── {p}')
        print(f'   判定面勾叉 {keep}（保留）｜ 须清零符号 {clear}（⇒⭐★｜＋行文面勾叉）')
        for n, l in hits:
            print(f'     :{n} {l}')
        print('\n' + '=' * 62)
        print(f'【读数】须清零 {clear}（应为 0）')
        return 1 if clear else 0
    if len(args) >= 2:
        print('✗ 本器不支持「两树比对」这一路（只做单篇正文读数）。')
        print('  两树比对请用底版：gsvector 仓开发者席的 check1899v2.py。')
        print('  本席首版曾照底版写下一行两树用法的说法，而实现从未读入基座树 ⇒ 那是一句可证伪的声明。')
        print('  本器现按「做不到就如实报错」处理，退出码为 2。')
        return 2
    print(__doc__)
    return 2


if __name__ == '__main__':
    sys.exit(main())
