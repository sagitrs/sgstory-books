#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════
# B 族**抽样刀** —— `books#629`（`#624` 的另笔）
#
# ★本件存在的唯一理由：B 族转正（`#624`／PR `#630`）之后，六档 36 格 `red=0` 有**两种解释** ——
#   ①「实现全落」✓ ②「**判据失效／恒真**」✗。后者按 `tests/b-series/README.md` 原话「**比红更坏**」。
#   本件排掉第②种：**任选若干格，改坏该格自己的期望值** ⇒ 该格**必须**回红、必须被点名。
#
# ★判据（五样，缺一即该刀不成立）：
#   ① 脚本 `rc=1`（转正口径：判据红 > 0 ⇒ exit 1）
#   ② 汇总**计入**该格（汇总行 `判据红 1 条`）
#   ③ 该格在 `.run.<档>.log` **逐条具名**（`^✗ <格名> `）
#   ④ **runner 的 stdout** 上也出现该格具名的 `✗` 行（`#629` 增补③ · 验收④ —— 步 26 的 CI 读者看的是 stdout，✗ 不是 evidence 里的 log）
#   ⑤ **复原后字节同**（`sha256`）⇒ 复跑 `rc=0` 且 `判据红 0 条`
#
# ★共 6 刀：5 刀改**该格自己的期望值**（B2-4／B3-5／B5-5／B6-2／E2-5），
#   第 6 刀是**语法闸**（`#629` 验收③）：临时造一个**不在 `CASES`** 的坏档 ⇒ 本器须
#   `exit 2` ＋ 汇总印「语法坏档 N 个」＋ 该档具名；删掉后六档字节仍同。
#
# ★★两处如实声明（✗ 不假装满足）：
#   ㈠ runner 的**汇总行**只报条数（`判据红 N 条`），但**判据红分支已把具名 `✗` 行印到 stdout**
#      （`#629` 增补③，每档限 5 行；完整逐条在 `.run.<档>.log`）⇒ 本刀核的是
#      「**汇总计入** ＋ **stdout 具名** ＋ **log 逐条具名** ＋ **刀自己点名**」。
#   ㈡ `rc=1` 依赖转正载体：旧口径的 runner 在判据红 > 0 时仍 `exit 0`。⇒ 若跑到的仍是旧口径，
#      本刀**具名报「runner 仍是旧口径（rc=0）」并判该刀不成立**，✗ 不静默放过、✗ 不假报。
#
# ★用法：cd <books 检出> && ENGINE=<引擎检出> bash tests/b-series/knife-cells.sh
# ★退出码：0＝全部刀成立；1＝有刀没咬住（逐条具名）；2＝装置错（ENGINE／产物／工具／python3 缺）
# ★刀只改**被测档的期望值**，且**先备份、后复原**（`trap` 保证被打断也复原）——
#   ✗ 不碰 `run-all.sh`、`README.md`、`stories/**`、`src/**`、引擎树。
# ══════════════════════════════════════════════════════════════════════════
set -u

G="$(cd "$(dirname "$0")" && pwd)"          # …/tests/b-series
B="$(cd "$G/../.." && pwd)"                 # books 仓根
: "${ENGINE:?须给 ENGINE=<引擎检出>}"

command -v python3 >/dev/null 2>&1 || { echo "  ✗★ 装置错：缺 python3（本件用它做**逐字**替换与命中数断言）"; exit 2; }
[ -f "$G/run-all.sh" ] || { echo "  ✗★ 装置错：找不到 $G/run-all.sh"; exit 2; }
[ -f "$B/stories/babel/babel-trial.html" ] || { echo "  ✗★ 装置错：产物不在位（先构建：python3 ${ENGINE}/build.py \"$B/stories/babel\" --out \"$B/stories/babel/babel-trial.html\"）"; exit 2; }

WORK="$(mktemp -d "${HOME}/tmp/knife-cells-$(date +%Y%m%dT%H%M%SZ)-XXXX")"
BAK="$WORK/bak"; mkdir -p "$BAK"
FILES=(B2-l1-l4-curriculum.mjs B3-l5-l8-pool.mjs B4-l9-boss-gate.mjs B5-foreknowledge-retire.mjs B6-newrun-to-l10.mjs E2-return-city.mjs)

restore_all() {
  for f in "${FILES[@]}"; do [ -f "$BAK/$f" ] && cp -p "$BAK/$f" "$G/$f"; done
}
trap 'restore_all; echo "  （刀结束：已复原全部被测档 ⇒ $WORK 留作证据）"' EXIT

echo "◆ 装置面：ENGINE=$ENGINE ｜ books=$B"
echo "◆ 证据目录：$WORK"
for f in "${FILES[@]}"; do cp -p "$G/$f" "$BAK/$f"; done
sha_before() { sha256sum "$G/$1" | awk '{print $1}'; }

# ── 刀表：档名 ｜ 该格**自己的期望值**（原文本）｜ 改坏后 ｜ 期望回红的格名 ──
#   ★每条的「原文本」在其档里须**恰好命中 1 次**（下面用 python 断，✗ 不靠肉眼）。
KNIVES=(
  "B2-l1-l4-curriculum.mjs|inv.length > 0|inv.length > 100000|B2-4"
  "B3-l5-l8-pool.mjs|温泉.恢复工具耐久 !== true|温泉.恢复工具耐久 === true|B3-5"
  "B5-foreknowledge-retire.mjs|hasOwnProperty.call(V(), |hasOwnProperty.call({}, |B5-5"
  "B6-newrun-to-l10.mjs|通.length === 层.length|通.length === 层.length + 1|B6-2"
  "E2-return-city.mjs|门.前进 !== 门.返城|门.前进 === 门.返城|E2-5"
)

PASS=0; FAIL=0; DEVICE=0
declare -a REPORT=()

for k in "${KNIVES[@]}"; do
  IFS='|' read -r FILE OLD NEW CELL <<<"$k"
  n=$((PASS+FAIL+DEVICE+1))
  echo
  echo "── 刀 $n：$CELL（$FILE）——改坏该格期望值 ──"
  echo "     旧：$OLD"
  echo "     新：$NEW"

  # ① 逐字替换（命中数须恰 1）
  if ! python3 - "$G/$FILE" "$OLD" "$NEW" <<'PY'
import sys
p, old, new = sys.argv[1], sys.argv[2].encode(), sys.argv[3].encode()
b = open(p, 'rb').read()
c = b.count(old)
if c != 1:
    print(f"  ✗★ 装置错：该旧文本在档里命中 {c} 次（须恰 1）⇒ 本刀前提不成立，✗ 不动档")
    sys.exit(3)
open(p, 'wb').write(b.replace(old, new, 1))
PY
  then echo "  ⇒ 装置错（替换未生效）"; DEVICE=$((DEVICE+1)); continue; fi
  if [ "$(sha_before "$FILE")" = "$(sha256sum "$BAK/$FILE" | awk '{print $1}')" ]; then
    echo "  ✗★ 装置错：替换后字节未变（旧文本＝新文本？）"; DEVICE=$((DEVICE+1)); continue
  fi

  # ② 跑 runner（这一跑就是被测的判力）
  OUT="$WORK/run-$n.out"
  ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
  LOG="$G/.run.$FILE.log"
  SUMMARY="$(grep -E '判据红 [0-9]+ 条' "$OUT" | tail -1)"
  NAMED="$(grep -E "^✗ ${CELL} " "$LOG" | head -1)"
  CNT="$(grep -cE "^✗ ${CELL} " "$LOG")"

  echo "     runner rc=$rc"
  echo "     汇总：${SUMMARY:-（无判据红行）}"
  echo "     log 点名（${CNT} 条）：${NAMED:0:160}"
  echo "     ★本刀点名：被改坏的格＝$CELL"

  OK1=0; OK2=0; OK3=0; OK4=0
  [ "$rc" -eq 1 ] && OK1=1
  echo "$SUMMARY" | grep -qE '判据红 1 条' && OK2=1
  [ "$CNT" -ge 1 ] && OK3=1
  # ④ stdout 上也须具名（`#629` 增补③ · 验收④）：CI 步 26 的读者看的是 stdout，✗ 不是 evidence 里的 log
  STDOUT_NAMED="$(grep -E "✗ ${CELL} " "$OUT" | head -1)"
  [ -n "$STDOUT_NAMED" ] && OK4=1
  echo "     ★stdout 具名：${STDOUT_NAMED:0:140}"
  if [ "$OK1" -eq 0 ] && [ "$rc" -eq 0 ] && [ "$OK2" -eq 1 ]; then
    echo "     ★具名差额：runner **仍是旧口径**（判据红 > 0 却 exit 0）⇒ 本刀要求 rc=1，故不成立（承 #624／PR #630）"
  fi

  # ⑤ 复原 ＋ 字节同
  cp -p "$BAK/$FILE" "$G/$FILE"
  if [ "$(sha_before "$FILE")" = "$(sha256sum "$BAK/$FILE" | awk '{print $1}')" ]; then OK5=1; else OK5=0; echo "     ✗★ 复原后字节**不同**"; fi

  if [ "$OK1$OK2$OK3$OK4$OK5" = "11111" ]; then
    PASS=$((PASS+1)); REPORT+=("✓ $CELL  rc=1｜汇总计入｜log 具名 $CNT 条｜**stdout 具名**｜复原字节同")
  else
    FAIL=$((FAIL+1)); REPORT+=("✗ $CELL  rc=$rc（须 1）｜汇总计入=$OK2｜log 具名=$OK3｜stdout 具名=$OK4｜复原=$OK5")
  fi
done

# ── 刀 6（**语法闸** · `#629` 验收③）：临时造一个**不在 `CASES`** 的坏档 ⇒
#   本器须 `exit 2` ＋ 汇总印「语法坏档 N 个」＋ 该档**具名**；删掉后六档字节仍同 ⇒ 复跑 `rc=0`。──
PROBE="$G/knife-syntax-probe.mjs"
echo
echo "── 刀 $((PASS+FAIL+DEVICE+1))：语法闸（不在 CASES 的坏档）—— 造一个坏档，验本器**不静默放过** ──"
if [ -e "$PROBE" ]; then
  echo "  ✗★ 装置错：$PROBE 已存在（✗ 不覆盖非本刀所建的文件）"; DEVICE=$((DEVICE+1))
else
  printf 'const 探针 = ;\n' > "$PROBE"
  OUT="$WORK/run-syntax.out"
  ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
  SUM="$(grep -E '语法坏档 [0-9]+ ｜' "$OUT" | tail -1)"
  NAMED_S="$(grep -E '语法坏档：knife-syntax-probe.mjs' "$OUT" | head -1)"
  echo "     runner rc=$rc（须 2）"
  echo "     汇总：${SUM:-（无）}"
  echo "     ★本刀点名（§①）：${NAMED_S:0:120}"
  S1=0; S2=0; S3=0
  [ "$rc" -eq 2 ] && S1=1
  echo "$SUM" | grep -qE '语法坏档 1 ｜' && S2=1
  [ -n "$NAMED_S" ] && S3=1
  rm -f "$PROBE"
  S4=1; [ -e "$PROBE" ] && S4=0
  for f in "${FILES[@]}"; do
    [ "$(sha_before "$f")" = "$(sha256sum "$BAK/$f" | awk '{print $1}')" ] || { S4=0; echo "     ✗★ $f 字节被改动"; }
  done
  if [ "$S1$S2$S3$S4" = "1111" ]; then
    PASS=$((PASS+1)); REPORT+=("✓ 语法闸（knife-syntax-probe.mjs）  rc=2｜汇总「语法坏档 1 个」｜§① 具名｜探针已删、六档字节同")
  else
    FAIL=$((FAIL+1)); REPORT+=("✗ 语法闸  rc=$rc（须 2）｜汇总=$S2｜§① 具名=$S3｜复原=$S4")
  fi
fi

# ── 收尾：全部复原后复跑（★这一跑是「复原真有效」的机器判据，✗ 不靠 sha 一条）──
echo
echo "── 收尾：复原后复跑（须 rc=0 且判据红 0 条）──"
restore_all
OUT="$WORK/run-final.out"
ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
FIN="$(grep -E '判据红 [0-9]+ 条' "$OUT" | tail -1)"
echo "     runner rc=$rc｜汇总：${FIN:-（无）}"
FINALOK=0
[ "$rc" -eq 0 ] && echo "$FIN" | grep -qE '判据红 0 条' && FINALOK=1

echo
echo "════ 抽样刀汇总（★逐格点名）════"
for l in "${REPORT[@]}"; do echo "  $l"; done
echo "  刀成立 $PASS 条｜未咬住 $FAIL 条｜装置错 $DEVICE 条｜复原后复跑 rc=0 且红 0：$([ "$FINALOK" -eq 1 ] && echo ✓ || echo ✗)"
echo "  证据：$WORK（runner 全文 run-*.out ＋ 各档 .run.*.log）"

[ "$DEVICE" -gt 0 ] && exit 2
[ "$FAIL" -gt 0 ] && exit 1
[ "$FINALOK" -eq 1 ] || { echo "  ✗★ 复原后复跑未回到 rc=0／红 0 ⇒ 本刀不成立"; exit 1; }
echo "  ⇒ ★五格抽样（改坏期望值）＋ 一格语法闸：皆如期回红／回红旗，且**stdout 与 log 双具名**、复原字节同；复原后复跑 rc=0 ⇒ 这几格**判得了**（✗ 恒真／硬编码），且语法坏档**不再静默放过**"
exit 0
