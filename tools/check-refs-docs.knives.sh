#!/usr/bin/env bash
# docs 报告态的**负向刀**（`#1842` writer 强建议：没负向验过的扫描器读数应读作"未验"）
# 报告态**不使 rc≠0** ⇒ 刀必须断**报告内容**；★另有一把「该守」的刀：`--docs` 下**清单面红仍须 rc≠0**。
# 用法：ENGINE=<引擎检出> bash tools/check-refs-docs.knives.sh
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")/.." || { echo "✗ 推不出仓根"; exit 2; }
[ -n "${ENGINE:-}" ] || { echo "✗ 缺 ENGINE"; exit 2; }
D=docs/plans/babel/outline.md
J=stories/babel/scenarios/scenarios.json
[ -f "$D" ] && [ -f "$J" ] || { echo "✗ 缺靶件"; exit 2; }
DB=$(mktemp -t docs-knives-XXXXXX.md); cp "$D" "$DB"
JB=$(mktemp -t cl-knives-XXXXXX.json); cp "$J" "$JB"
INJ=/tmp/inject-doc.py; INJC=/tmp/inject-cl.py
cat > "$INJ" <<'PY'
import sys, pathlib
pathlib.Path(sys.argv[1]).open('a', encoding='utf-8').write('\n\n' + sys.argv[2] + '\n')
PY
cat > "$INJC" <<'PY'
import json, sys, pathlib
p = pathlib.Path(sys.argv[1]); d = json.loads(p.read_text(encoding='utf-8'))
d['场景'][0]['备注'] += '　' + sys.argv[2]
p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
PY
pass=0; fail=0
doc_knife() { # 名 注入串 期望特征
  cp "$DB" "$D"; python3 "$INJ" "$D" "$2"
  out=$(node tools/check-refs.mjs --docs --engine "$ENGINE" 2>&1)
  if echo "$out" | grep -qF "$3"; then printf "  ✓ %-24s 报告现「%s」\n" "$1" "$3"; pass=$((pass+1));
  else printf "  ✗ %-24s 报告未见「%s」\n" "$1" "$3"; fail=$((fail+1)); fi
}
echo "=== docs 报告内容刀（须现于报告）==="
doc_knife "K1 不存在的文件" '`src/core/no-such-file.js:1`' "no-such-file.js"
doc_knife "K2 行号越界"     '`src/core/70-ui.js:99999`' "行号越界"
doc_knife "K3 外来形归类"   '`gates/canon.mjs:1`'       "外来形"
doc_knife "K4 豁免逐条打印" '`src/core/no-such-file.js:1`' "豁免面"
echo "=== ★该守那把：--docs 下**清单面红仍须 rc≠0**（dev-10 阻断 RC）==="
cp "$JB" "$J"; python3 "$INJC" "$J" '`src/core/no-such-in-cl.js:1`（`x`）'
out=$(node tools/check-refs.mjs --docs --engine "$ENGINE" 2>&1); rc=$?
if [ $rc -ne 0 ] && echo "$out" | grep -qF "no-such-in-cl"; then echo "  ✓ 清单面坏引 ⇒ rc=$rc（✗ 被吞）"; pass=$((pass+1));
else echo "  ✗ 被吞：rc=$rc"; echo "$out" | head -3; fail=$((fail+1)); fi
cp "$JB" "$J"
echo "=== 复原（两靶件回原样）==="
cp "$DB" "$D"
out=$(node tools/check-refs.mjs --docs --engine "$ENGINE" 2>&1); rc=$?
if [ $rc -eq 0 ] && echo "$out" | grep -qF "不符 0"; then echo "  ✓ docs 复原 rc=0 不符 0"; pass=$((pass+1)); else echo "  ✗ docs 复原异常 rc=$rc"; fail=$((fail+1)); fi
node tools/check-refs.mjs --engine "$ENGINE" >/dev/null 2>&1 && { echo "  ✓ 清单面复原 rc=0"; pass=$((pass+1)); } || { echo "  ✗ 清单面复原异常"; fail=$((fail+1)); }
rm -f "$DB" "$JB" "$INJ" "$INJC"
echo "  ── 通过 $pass｜失败 $fail"; exit $((fail>0))
