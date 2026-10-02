#!/usr/bin/env bash
# rehearse-workflow.py 的**正向刀**（`#111` 同族修复：演练器提供 `$GITHUB_ENV` ＋ 跨步回读）
#
# 每刀须**红在对的支**（✗ 红在对的支以外的任何地方 ⇒ 刀无效）。用法：
#   bash tools/rehearse-workflow.knives.sh          # 全跑，末行给 通过 N｜失败 M
#
# ★刀法：**变异工具本身／最小工作流**，再断言「哪一步红」—— ✗ 只看 rc。
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1
TOOL=tools/rehearse-workflow.py
ENGINE=${ENGINE:-}
[ -n "$ENGINE" ] || { echo "✗ 缺 ENGINE：用法 \`ENGINE=<引擎检出@pin> bash tools/rehearse-workflow.knives.sh\`"; exit 2; }
TMP=$(mktemp -d) || exit 2
trap 'rm -rf "$TMP"' EXIT

np=0; nf=0
check() { # check <刀号> <期望:红在哪步|绿> <实读输出>
  local k="$1" want="$2" got="$3" rc="$4"
  if [ "$want" = "绿" ]; then
    if [ "$rc" = "0" ]; then echo "  ✓ $k（如期 绿）"; np=$((np+1)); else echo "  ✗ $k（期望绿，实 rc=$rc）"; nf=$((nf+1)); fi
  else
    if [ "$rc" != "0" ] && grep -q "✗ $want" <<<"$got"; then echo "  ✓ $k（如期红在「$want」）"; np=$((np+1));
    else echo "  ✗ $k（期望红在「$want」，实 rc=$rc）"; echo "$got" | tail -4 | sed 's/^/      /'; nf=$((nf+1)); fi
  fi
}

# ── 最小工作流：步1 写 `$GITHUB_ENV`，步2 读它（真 GH 语义：跨步可见）──
cat > "$TMP/wf-env.yml" <<'YML'
jobs:
  t:
    steps:
      - name: 写 ENV 的步
        run: |
          echo "PROBE=v1" >> "$GITHUB_ENV"
      - name: 读 ENV 的步
        run: |
          echo "读到 PROBE=$PROBE"
YML

# ── K1：撤「提供 GITHUB_ENV」⇒ 写它的那步须红（unbound）──
sed "/env\['GITHUB_ENV'\] = /d" "$TOOL" > "$TMP/k1.py"
out=$(ENGINE="$ENGINE" WF="$TMP/wf-env.yml" python3 "$TMP/k1.py" 2>&1); rc=$?
check "K1 撤 GITHUB_ENV 提供 ⇒ 写它的步红" "写 ENV 的步" "$out" "$rc"

# ── K2：撤「跨步回读」⇒ 读它的那步须红（VER/PROBE unbound）──
sed 's/^    absorb_gh_env()/    pass  # 撤回读/' "$TOOL" > "$TMP/k2.py"
out=$(ENGINE="$ENGINE" WF="$TMP/wf-env.yml" python3 "$TMP/k2.py" 2>&1); rc=$?
check "K2 撤跨步回读 ⇒ 读它的步红" "读 ENV 的步" "$out" "$rc"

# ── K3：缺 `WF` 档 ⇒ **具名 rc=2**（✗ 栈回溯／✗ 静默回落默认档）──
out=$(ENGINE="$ENGINE" WF="$TMP/不存在.yml" python3 "$TOOL" 2>&1); rc=$?
if [ "$rc" = "2" ] && grep -q "✗ 缺工作流档" <<<"$out"; then
  echo "  ✓ K3 缺 WF 档 ⇒ 具名 rc=2"; np=$((np+1))
else
  echo "  ✗ K3 缺 WF 档（期望 rc=2 且具名，实 rc=$rc）"; nf=$((nf+1))
fi

echo "  ── 通过 $np｜失败 $nf"
exit $(( nf > 0 ))
