#!/usr/bin/env bash
# 引用核（`tools/check-refs.mjs`）的**刀**：每条须红且**红在对的支**（✗ 只看 rc≠0）
# 用法：ENGINE=<引擎检出> bash tools/check-refs.knives.sh
set -uo pipefail
cd "$(dirname "$(readlink -f "$0")")/.." || { echo "✗ 推不出仓根"; exit 2; }
J=stories/babel/scenarios/scenarios.json
[ -n "${ENGINE:-}" ] || { echo "✗ 缺 ENGINE"; exit 2; }
[ -f "$J" ] || { echo "✗ 缺清单：$J"; exit 2; }
B=$(mktemp -t refs-knives-XXXXXX.json); cp "$J" "$B"
pass=0; fail=0
knife() { # $1=名 $2=python 变异 $3=期望支标
  cp "$B" "$J"
  python3 -c "
import json;d=json.load(open('$J'));$2;json.dump(d,open('$J','w'),ensure_ascii=False)"
  out=$(node tools/check-refs.mjs --engine "$ENGINE" 2>&1); rc=$?
  if [ $rc -eq 1 ] && echo "$out" | grep -qF "$3"; then printf "  ✓ %-26s rc=1 且红在「%s」\n" "$1" "$3"; pass=$((pass+1));
  else printf "  ✗ %-26s rc=%s 期望支未命中\n" "$1" "$rc"; fail=$((fail+1)); fi
}
echo "=== 刀（须红且红在对的支）==="
knife "K1 行号越界"  "d['场景'][0]['备注']+='　\`src/core/70-ui.js:99999\`（\`esc\`）'" "行号越界"
knife "K2 符号不符"  "d['场景'][0]['备注']+='　\`src/core/70-ui.js:69\`（\`绝无此符号xyz\`）'" "不含**其声明的符号"
knife "K3 路径不存在" "d['场景'][0]['备注']+='　\`src/core/no-such-file.js:1\`（\`x\`）'" "文件不存在"
echo "=== 引擎缺失（须 rc=2 具名，✗ 静默跳过）==="
out=$(node tools/check-refs.mjs --engine /tmp/__nope__ 2>&1); rc=$?
echo "$out" | grep -qF "引擎检出不存在" && { echo "  ✓ rc=$rc 具名"; pass=$((pass+1)); } || { echo "  ✗ 未具名 rc=$rc"; fail=$((fail+1)); }
echo "=== 复原（原件须绿）==="
cp "$B" "$J"; out=$(node tools/check-refs.mjs --engine "$ENGINE" 2>&1); rc=$?
[ $rc -eq 0 ] && { echo "  ✓ 复原 rc=0"; pass=$((pass+1)); } || { echo "  ✗ 复原 rc=$rc"; echo "$out" | tail -3; fail=$((fail+1)); }
rm -f "$B"; echo "  ── 通过 $pass｜失败 $fail"; exit $((fail>0))
