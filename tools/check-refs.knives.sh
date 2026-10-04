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
knife "K6 ★对象形内引用须被扫到" "d['场景'][0]['断言']['逻辑']={'说明':'　\`src/core/70-ui.js:99999\`（\`esc\`）'}" "行号越界"
knife "K4 引用有歧义" "d['场景'][0]['备注']+='　\`README.md:1\`（\`x\`）'" "引用有歧义"
knife "K5 散文形引用" "d['场景'][0]['备注']+='　\`src/core/70-ui.js\` 第 69 行'" "散文形"
echo "=== ★--require-symbols（books#271 余项裁：明账 → 机械判据 · 默认关）==="
# 造一处**无符号**引用（行号有效、内容非空 ⇒ 只能是「无显式符号」这一类）：
cp "$B" "$J"
python3 -c "
import json;d=json.load(open('$J'));d['场景'][0]['备注']+='　\`src/core/70-ui.js:69\`';json.dump(d,open('$J','w'),ensure_ascii=False)"
# ① 默认关：须 rc=0，且明账出声（这是本件**默认语义不变**的证据）
out=$(node tools/check-refs.mjs --engine "$ENGINE" 2>&1); rc=$?
if [ $rc -eq 0 ] && echo "$out" | grep -q "仅范围核"; then
  printf "  ✓ %-26s rc=0 且明账仍出声\n" "无符引用·默认关"; pass=$((pass+1));
else printf "  ✗ %-26s rc=%s（应 0）\n" "无符引用·默认关" "$rc"; fail=$((fail+1)); fi
# ② 打开开关：须 rc=1，且**具名到那一处**（✗ 只报个数）
out=$(node tools/check-refs.mjs --engine "$ENGINE" --require-symbols 2>&1); rc=$?
if [ $rc -eq 1 ] && echo "$out" | grep -qF "没有显式符号" && echo "$out" | grep -qF "src/core/70-ui.js:69"; then
  printf "  ✓ %-26s rc=1 且具名到该处\n" "无符引用·开关打开"; pass=$((pass+1));
else printf "  ✗ %-26s rc=%s 未具名\n" "无符引用·开关打开" "$rc"; fail=$((fail+1)); fi
# ③ 环境变量同效（供 CI／本地复跑，✗ 不必改命令行）
out=$(REFS_REQUIRE_SYMBOLS=1 node tools/check-refs.mjs --engine "$ENGINE" 2>&1); rc=$?
if [ $rc -eq 1 ] && echo "$out" | grep -qF "没有显式符号"; then
  printf "  ✓ %-26s rc=1\n" "无符引用·环境变量"; pass=$((pass+1));
else printf "  ✗ %-26s rc=%s\n" "无符引用·环境变量" "$rc"; fail=$((fail+1)); fi
# ④ 反面对照：清单**本来就全带符号**时，开关打开也不该红（✗ 别做成「开了就红」）
cp "$B" "$J"
out=$(node tools/check-refs.mjs --engine "$ENGINE" --require-symbols 2>&1); rc=$?
n=$(echo "$out" | grep -o "仅范围核 [0-9]*" | grep -o "[0-9]*" | head -1)
if [ "${n:-x}" = "0" ]; then
  [ $rc -eq 0 ] && { printf "  ✓ %-26s 明账 0 ⇒ rc=0\n" "开关·清单已全带符号"; pass=$((pass+1)); } \
    || { printf "  ✗ %-26s 明账 0 但仍 rc=%s\n" "开关·清单已全带符号" "$rc"; fail=$((fail+1)); }
else
  printf "  · %-26s 明账今为 %s（≠0）⇒ 本支暂不可判（清单未刷完）\n" "开关·清单已全带符号" "${n:-?}"
fi

echo "=== 引擎缺失（须 rc=2 具名，✗ 静默跳过）==="
out=$(node tools/check-refs.mjs --engine /tmp/__nope__ 2>&1); rc=$?
echo "$out" | grep -qF "引擎检出不存在" && { echo "  ✓ rc=$rc 具名"; pass=$((pass+1)); } || { echo "  ✗ 未具名 rc=$rc"; fail=$((fail+1)); }
echo "=== 复原（原件须绿）==="
cp "$B" "$J"; out=$(node tools/check-refs.mjs --engine "$ENGINE" 2>&1); rc=$?
[ $rc -eq 0 ] && { echo "  ✓ 复原 rc=0"; pass=$((pass+1)); } || { echo "  ✗ 复原 rc=$rc"; echo "$out" | tail -3; fail=$((fail+1)); }
echo "=== ★独立复算器对账（`#117` 折单：本笔此面须 rc=0）==="
# ★为何在本脚本里守它：`check-refs.mjs` 的抽取面（`rawOf`）与复算器**各自实现** ⇒
#   两者一旦分叉就是「判据面覆盖差」（`dev-10` 铁证：`断言.逻辑` 转对象形后 门 43 ／ 复算器 46）。
#   ⚠ 该复算器**不在 CI**（`trial.yml` 无它）⇒ 本地刀是它唯一常跑的看护面；
#     纳入 CI 须 T 席批准改 workflow ⇒ ✗ 本笔擅自加。
out=$(node tools/check-refs-recheck.mjs --engine "$ENGINE" --compare 2>&1); rc=$?
if [ $rc -eq 0 ] && echo "$out" | grep -qF "复算：与 check-refs.mjs 一致"; then
  echo "  ✓ --compare rc=0（抽取面与复算器一致）"; pass=$((pass+1));
else
  echo "  ✗ --compare rc=$rc（抽取面分叉 ⇒ 判据面覆盖差）"; echo "$out" | tail -4; fail=$((fail+1));
fi
rm -f "$B"; echo "  ── 通过 $pass｜失败 $fail"; exit $((fail>0))
