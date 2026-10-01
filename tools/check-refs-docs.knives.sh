#!/usr/bin/env bash
# docs 报告态的**负向刀**（`#1842` writer 强建议：没负向验过的扫描器读数应读作"未验"）
# 报告态**不使 rc≠0** ⇒ 刀必须断**报告内容**（计数／条目），✗ 只看 rc。
# 用法：ENGINE=<引擎检出> bash tools/check-refs-docs.knives.sh
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")/.." || { echo "✗ 推不出仓根"; exit 2; }
[ -n "${ENGINE:-}" ] || { echo "✗ 缺 ENGINE"; exit 2; }
D=docs/plans/babel/outline.md
[ -f "$D" ] || { echo "✗ 缺靶件：$D"; exit 2; }
B=$(mktemp -t docs-knives-XXXXXX.md); cp "$D" "$B"
pass=0; fail=0
knife() { # $1=名 $2=注入串 $3=期望出现的报告特征
  cp "$B" "$D"; printf '\n\n%s\n' "$2" >> "$D"
  out=$(node tools/check-refs.mjs --docs --engine "$ENGINE" 2>&1)
  if echo "$out" | grep -qF "$3"; then printf "  ✓ %-28s 报告现「%s」\n" "$1" "$3"; pass=$((pass+1));
  else printf "  ✗ %-28s 报告未见「%s」\n" "$1" "$3"; fail=$((fail+1)); fi
}
echo "=== 负向刀（须现于报告）==="
knife "K1 不存在的文件" '`src/core/no-such-file.js:1`' "no-such-file.js"
knife "K2 行号越界"     '`src/core/70-ui.js:99999`' "行号越界"
knife "K3 外来形归类"   '`gates/canon.mjs:1`'       "外来形"
echo "=== 复原（靶件须回原样）==="
cp "$B" "$D"; out=$(node tools/check-refs.mjs --docs --engine "$ENGINE" 2>&1)
if echo "$out" | grep -qF "不符 0"; then echo "  ✓ 复原后不符 0"; pass=$((pass+1)); else echo "  ✗ 复原后仍不符"; echo "$out" | head -3; fail=$((fail+1)); fi
rm -f "$B"; echo "  ── 通过 $pass｜失败 $fail"; exit $((fail>0))
