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
# ★共 7 刀：5 刀改**该格自己的期望值**（B2-4／B3-5／B5-5／B6-2／E2-5），
#   第 6 刀是**语法闸**（`#629` 验收③）：临时造一个**不在 `CASES`** 的坏档 ⇒ 本器须
#   `exit 2` ＋ 汇总印「语法坏档 N 个」＋ 该档具名；删掉后六档字节仍同。
#   第 7 刀是**在 `CASES` 里的坏档**（`#629` 增补④ · N2 ＋ N1 两条预存问题的验收）：
#   一个坏档只算**一个**红旗（✗ 双计），且红旗路径下 stderr **无** `command not found`、
#   提示行里 `B*-0`／`ENGINE` **逐字在位**（反引号不得做命令替换）。
#
# ★★第 8 节是**逐格正控**（`#632`）：改判据＝改期望值 ⇒ 每格须自证「**该格原本漏抓的破法**」⇒
#   改动后**该格变红且具名**。做法：把破法**写进被测档**（锚点＝各档 `const SC = s.SC, …` 那一行之后）
#   ⇒ 跑 **`run-all.sh`**（汇总 ＋ `.run.*.log` ＋ stdout 三面都走到）⇒ 按 `sha256` 复原。
#   ★红必须是**判据红（具名）**，✗ 不接受靠崩溃／零出声变红（那是装置错）⇒ 本节每刀都断「**红旗 0 个**」。
#
# ★★第 9 节是**逐格 stub 正控**（`#634`）：每一格配一次「把该格承诺的面做成**空壳／坏值**」的注入，
#   **两头各跑**：
#     甲 **修前**（`$KZ_BASE` 的该档）＋ 同一注入 ⇒ 该格**仍绿**（证这次真补上了那个洞）
#     乙 **现头**（工作树）＋ 同一注入 ⇒ 该格**红且具名**（判据红：`rc=1` ＋ **红旗 0 个**）
#   ★`KZ_BASE` 默讁 `origin/main`（**须指向本笔之前的 main**）；运行时印出它的 SHA 作锚。
#
# ★★第 8 节是**逐格正控**（`#632`）：改判据＝改期望值 ⇒ 每格须自证「**该格原本漏抓的破法**」⇒
#   改动后**该格变红且具名**。做法：把破法**写进被测档**（锚点＝各档 `const SC = s.SC, …` 那一行之后）
#   ⇒ 跑 **`run-all.sh`**（汇总 ＋ `.run.*.log` ＋ stdout 三面都走到）⇒ 按 `sha256` 复原。
#   ★红必须是**判据红（具名）**，✗ 不接受靠崩溃／零出声变红（那是装置错）⇒ 本节每刀都断「**红旗 0 个**」。
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
  "B3-l5-l8-pool.mjs|温泉.恢复工具耐久 === false|温泉.恢复工具耐久 === true|B3-5"
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

# ── 刀 7（**在 `CASES` 里的坏档** · `#629` 增补④）：一个坏档只算**一个**红旗（N2）＋
#   红旗路径下反引号不做命令替换（N1）。两条都是 `tester-3` 探出的**预存**问题。──
CASES_MEMBER="B3-l5-l8-pool.mjs"
echo
echo "── 刀 $((PASS+FAIL+DEVICE+1))：在 CASES 里的坏档（$CASES_MEMBER）—— 验「不双计」＋「反引号不做命令替换」──"
printf '\nconst 探针 = ;\n' >> "$G/$CASES_MEMBER"
OUT="$WORK/run-cases-broken.out"
ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
SUM="$(grep -E '语法坏档 [0-9]+ ｜' "$OUT" | tail -1)"
NAMED_C="$(grep -E "语法坏档：${CASES_MEMBER}" "$OUT" | head -1)"
SKIPPED="$(grep -E "跳过（语法坏档）" "$OUT" | head -1)"
CMDNF="$(grep -cE 'command not found' "$OUT")"
HINT_B="$(grep -cF '`B*-0`' "$OUT")"
HINT_E="$(grep -cF '`ENGINE`' "$OUT")"
echo "     runner rc=$rc（须 2）"
echo "     汇总：${SUM:-（无）}"
echo "     §① 具名：${NAMED_C:0:110}"
echo "     §② 跳过提示：${SKIPPED:0:90}"
echo "     N1：stderr/输出里 'command not found' ＝ $CMDNF（须 0）｜提示行 \`B*-0\` 在位=$HINT_B｜\`ENGINE\` 在位=$HINT_E（皆须 ≥1）"
cp -p "$BAK/$CASES_MEMBER" "$G/$CASES_MEMBER"
T1=0; T2=0; T3=0; T4=0; T5=0
[ "$rc" -eq 2 ] && T1=1
echo "$SUM" | grep -qE '语法坏档 1 ｜ .*红旗 1 个' && T2=1
[ -n "$NAMED_C" ] && T3=1
{ [ "$CMDNF" -eq 0 ] && [ "$HINT_B" -ge 1 ] && [ "$HINT_E" -ge 1 ]; } && T4=1
[ "$(sha_before "$CASES_MEMBER")" = "$(sha256sum "$BAK/$CASES_MEMBER" | awk '{print $1}')" ] && T5=1
if [ "$T1$T2$T3$T4$T5" = "11111" ]; then
  PASS=$((PASS+1)); REPORT+=("✓ 在 CASES 里的坏档（$CASES_MEMBER）  rc=2｜红旗 1 个（✗ 双计）｜§① 具名｜N1 无反引号命令替换｜复原字节同")
else
  FAIL=$((FAIL+1)); REPORT+=("✗ 在 CASES 里的坏档  rc=$rc（须 2）｜红旗恰 1=$T2｜§① 具名=$T3｜N1=$T4｜复原=$T5")
fi

# ══════════════════════════════════════════════════════════════════════════
# ── 第 8 节：逐格正控（`#632`）—— 注入「该格原本漏抓的产品态破法」⇒ 该格须回红且具名 ──
#   表：档名｜锚点（插在它之后）｜破法（一行）｜期望回红的格｜人读描述
#   ★红须是**判据红（具名）**：每刀都断 ①`rc=1` ②汇总「红旗 **0** 个」③目标格在 **stdout** 具名
#     ④目标格在 `.run.<档>.log` 具名 ⑤复原后字节同。
# ══════════════════════════════════════════════════════════════════════════
A_B3='const SC = s.SC, B = SC.setup.BABEL, R = SC.setup.RPG, V = () => SC.State.variables;'
A_E2="$A_B3"
A_B4="$A_B3"
A_B5='const SC = s.SC, B = SC.setup.BABEL, V = () => SC.State.variables;'
A_B6="$A_B5"
KZ=(
  "B3-l5-l8-pool.mjs|$A_B3|B.受控池 = { ...B.受控池, 允许: false, 禁: false };|B3-2|允许／禁两面都是 false —— 旧形「!= null」收 false 即绿"
  "B3-l5-l8-pool.mjs|$A_B3|B.温泉 = { ...B.温泉, 固定: true, 入池: true };|B3-4|温泉入池成真（固定仍 true）—— 旧形 OR 一翼撑绿"
  "B3-l5-l8-pool.mjs|$A_B3|B.温泉 = { ...B.温泉 }; delete B.温泉.恢复工具耐久;|B3-5|温泉未声明恢复工具耐久（B.温泉 **是冻结对象** ⇒ 必须先复制再删）—— 旧形缺键即绿"
  "E2-return-city.mjs|$A_E2|B.返程 = { ...B.返程, 旧损毁先: false };|E2-4|顺序声明仍在、旧损毁先=false —— 旧形 OR 一翼撑绿"
  "B4-l9-boss-gate.mjs|$A_B4|B.准备区 = { id: 'L9-nowhere', name: '（正控）声明在但地图上无此地点' };|B4-1|准备区声明在但不可达 —— 旧形 OR 一翼撑绿（翼乙本就恒假）"
  "B5-foreknowledge-retire.mjs|$A_B5|delete V().babelRun;|B5-1|删 babelRun（初始化坏）—— 旧形缺面即绿"
  "B5-foreknowledge-retire.mjs|$A_B5|delete V().babelRun;|B5-3|删 babelRun（权威面读不到）—— 旧形缺面即绿"
  "B5-foreknowledge-retire.mjs|$A_B5|V().map = { deepest: 'L9' };|B5-3|给别的状态面加 deepest 同义账 —— 旧形也咬，证仍咬"
  "B5-foreknowledge-retire.mjs|$A_B5|delete V().babelRun;|B5-4|删 babelRun（初始化坏）—— 旧形缺面即绿"
  "B5-foreknowledge-retire.mjs|$A_B5|V().babelRun.已领 = { L1: true, 备注: '正控' };|B5-4|混键的每层已领账 —— 旧形 every 放过去"
  "B5-foreknowledge-retire.mjs|$A_B5|delete V().span1Events;|B5-5|删 span1Events 键 —— 改名后仍须咬"
  "B6-newrun-to-l10.mjs|$A_B6|{ const 旧moveTo = B.map.moveTo; B.map.moveTo = (L) => { if (L === 'L4') throw new Error('正控：moveTo 抛'); return 旧moveTo.call(B.map, L); }; }|B6-2|让 moveTo('L4') 抛 —— 收紧后仍须咬"
)
for k in "${KZ[@]}"; do
  IFS='|' read -r FILE ANCHOR BREAK CELL DESC <<<"$k"
  echo
  echo "── 正控：$CELL（$FILE）—— $DESC ──"
  if ! python3 - "$G/$FILE" "$ANCHOR" "$BREAK" <<'PY'
import sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
c = s.count(a)
if c != 1:
    print(f"  ✗★ 装置错：锚点命中 {c} 次（须 1）⇒ 本刀前提不成立，✗ 不动档")
    sys.exit(3)
open(p, 'w', encoding='utf-8').write(s.replace(a, a + "\n/* ★`#632` 逐格正控注入 */\n" + b, 1))
PY
  then echo "  ⇒ 装置错（注入未生效）"; DEVICE=$((DEVICE+1)); continue; fi
  OUT="$WORK/kz-$(echo "$CELL" | tr -d ' ')-$(date +%s%N | tail -c 6).out"
  ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
  LOG="$G/.run.$FILE.log"
  SUM="$(grep -E '语法坏档 [0-9]+ ｜' "$OUT" | tail -1)"
  STDOUT_NAMED="$(grep -E "✗ ${CELL} " "$OUT" | head -1)"
  LOG_NAMED="$(grep -cE "^✗ ${CELL} " "$LOG")"
  REDFLAG="$(echo "$SUM" | grep -oE '红旗 [0-9]+ 个' | grep -oE '[0-9]+' | head -1)"
  echo "     runner rc=$rc（须 1）｜汇总：${SUM:-（无）}"
  echo "     stdout 具名：${STDOUT_NAMED:0:120}"
  echo "     log 具名 $LOG_NAMED 条"
  cp -p "$BAK/$FILE" "$G/$FILE"
  K1=0; K2=0; K3=0; K4=0; K5=0
  [ "$rc" -eq 1 ] && K1=1
  [ "${REDFLAG:-x}" = "0" ] && K2=1
  [ -n "$STDOUT_NAMED" ] && K3=1
  [ "$LOG_NAMED" -ge 1 ] && K4=1
  [ "$(sha_before "$FILE")" = "$(sha256sum "$BAK/$FILE" | awk '{print $1}')" ] && K5=1
  if [ "$K1$K2$K3$K4$K5" = "11111" ]; then
    PASS=$((PASS+1)); REPORT+=("✓ 正控 $CELL（$DESC）  rc=1｜红旗 0｜stdout＋log 具名｜复原字节同")
  else
    FAIL=$((FAIL+1)); REPORT+=("✗ 正控 $CELL（$DESC）  rc=$rc（须 1）｜红旗 0=$K2｜stdout 具名=$K3｜log 具名=$K4｜复原=$K5")
  fi
done

# ══════════════════════════════════════════════════════════════════════════
# ── 第 9 节：第二批判据的「逐格 stub 正控」（`#634`）—— 空壳／坏值注入 · 两头各跑 ──
#   表：档名｜锚点（插在它之后）｜注入（一行）｜期望回红的格｜人读描述｜注入面（arm 或 doc:<路径>）
# ══════════════════════════════════════════════════════════════════════════
A_B2='const SC = s.SC, R = SC.setup.RPG, B = SC.setup.BABEL, V = () => SC.State.variables;'
KZ_BASE="${KZ_BASE:-origin/main}"
if ! git -C "$B" rev-parse --verify -q "$KZ_BASE" >/dev/null; then
  echo; echo "  ✗★ 装置错：修前基准 '$KZ_BASE' 取不到（✗ 本节能空跑）"; DEVICE=$((DEVICE+1))
else
echo
echo "── 第 9 节：逐格 stub 正控（11 格 · 两头各跑）｜修前基准 $KZ_BASE = $(git -C "$B" rev-parse --short "$KZ_BASE")"
ST=(
  # ★`B2-5` 的旗是 `Object.defineProperty(..., {get, configurable:false})` 的**非可配置访问器**
  #   ⇒ 内存里改不了（实测 `TypeError: has only a getter`）⇒ 注入必须打在**它的生产者**上（改 getter 体 ＋ 补烘）。
  "B2-l1-l4-curriculum.mjs|$A_B2|#srcstub|B2-5|值面：把运行旗的 getter 换成返回文案串（改产品源 ＋ 补烘）|src:stories/babel/src/world/babel.js"
  "B2-l1-l4-curriculum.mjs|$A_B2|#docstub|B2-3|灵敏度：课程档换成九个裸 token（✗ 无逐层行）|doc:docs/plans/babel/l1-9-curriculum.md"
  "B3-l5-l8-pool.mjs|$A_B3|B.受控池 = { x: 1 };|B3-1|空壳：受控池换成无形状对象|arm"
  "B3-l5-l8-pool.mjs|$A_B3|B.放弃 = { x: 1 };|B3-3|空壳：放弃换成无动作无声明的对象|arm"
  "B3-l5-l8-pool.mjs|$A_B3|B.第二战 = { x: 1 };|B3-6|空壳：第二战账换成无分开声明的对象|arm"
  "B4-l9-boss-gate.mjs|$A_B4|B.胜利 = { x: 1 };|B4-3|空壳：胜利面换成无结算口的对象|arm"
  "B5-foreknowledge-retire.mjs|$A_B5|B.预知退役 = { x: 1 };|B5-6|空壳：退役面换成不可调用的对象|arm"
  "E2-return-city.mjs|$A_E2|B.居民证 = { x: 1 };|E2-1|空壳：居民证换成无独立声明的对象|arm"
  "E2-return-city.mjs|$A_E2|B.脆弱 = { x: 1 };|E2-2|空壳：脆弱面换成无可调用谓词的对象|arm"
  "E2-return-city.mjs|$A_E2|B.收购 = { x: 1 }; B.服务 = { x: 1 };|E2-3|空壳：两面皆换成无入口的对象|arm"
  "E2-return-city.mjs|$A_E2|B.卷轴 = { x: 1 }; B.旧卷轴 = { x: 1 };|E2-6|空壳：两面皆换成无串值的对象|arm"
)
DOC_STUB='# L1 L2 L3 L4 L5 L6 L7 L8 L9\n\nL1 L2 L3 L4 L5 L6 L7 L8 L9\n'
# ★`B2-5` 的源码锚（getter 体）——旧形返回 boolean；stub 让它返回**非布尔**（＝坏值）
SRC_OLD='get: () => setup.BABEL?.战中 === true || setup.RPG?.Battle?.current != null,'
SRC_NEW="get: () => '文案里说禁用',"
注入() { # $1=档 $2=锚点 $3=注入 $4=注入面
  if [ "$4" = "arm" ]; then
    python3 - "$G/$1" "$2" "$3" <<'PY'
import sys
p, a, b = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
if s.count(a) != 1:
    print(f"  ✗★ 装置错：锚点命中 {s.count(a)} 次（须 1）"); sys.exit(3)
open(p, 'w', encoding='utf-8').write(s.replace(a, a + "\n/* ★`#634` stub 注入 */\n" + b, 1))
PY
  elif [ "${4#src:}" != "$4" ]; then
    python3 - "$B/${4#src:}" "$SRC_OLD" "$SRC_NEW" <<'PY'
import sys
p, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(p, encoding='utf-8').read()
if s.count(old) != 1:
    print(f"  ✗★ 装置错：源码锚命中 {s.count(old)} 次（须 1）"); sys.exit(3)
open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
PY
    [ $? -eq 0 ] || return 1
    重新烘 || return 1
  else
    printf '%b' "$DOC_STUB" > "$B/${4#doc:}"
  fi
}
重新烘() { python3 "$ENGINE/build.py" "$B/stories/babel" --out "$B/stories/babel/babel-trial.html" --version 'v0.0.3·fb20f2a2' >/dev/null 2>&1 || { echo "  ✗★ 烘产物失败"; return 1; }; }
for k in "${ST[@]}"; do
  IFS='|' read -r FILE ANCHOR STUB CELL DESC FACE <<<"$k"
  echo
  echo "── stub 正控：$CELL（$FILE）—— $DESC ──"
  OKA=0; OKB=0
  # ★非 ASCII 标识符：本机 bash **不接受**（`OK甲=0` 会被当命令 ⇒ command not found）——
  #   与 `run-all.sh` 头注记的同一坑；本节的变量名一律 ASCII。
  for DUAN in A B; do
    # ★每一端开跑前先把**注入面**还原（✗ 否则乙 端会看到甲 端留下的 stub ⇒ 源码锚 0 命中 ⇒ 装置错）
    case "$FACE" in
      arm) ;;
      src:*) git -C "$B" checkout -- "${FACE#src:}"; 重新烘 || DEVICE=$((DEVICE+1)) ;;
      *) git -C "$B" checkout -- "${FACE#doc:}" ;;
    esac
    if [ "$DUAN" = "A" ]; then git -C "$B" show "$KZ_BASE:tests/b-series/$FILE" > "$G/$FILE"; else cp -p "$BAK/$FILE" "$G/$FILE"; fi
    注入 "$FILE" "$ANCHOR" "$STUB" "$FACE" || { DEVICE=$((DEVICE+1)); break; }
    OUT="$WORK/st-$DUAN-$CELL-$(date +%s%N | tail -c 6).out"
    ENGINE="$ENGINE" timeout 1800 bash "$G/run-all.sh" >"$OUT" 2>&1; rc=$?
    LOG="$G/.run.$FILE.log"
    SUM="$(grep -E '语法坏档 [0-9]+ ｜' "$OUT" | tail -1)"
    RF="$(echo "$SUM" | grep -oE '红旗 [0-9]+ 个' | grep -oE '[0-9]+' | head -1)"
    NAMED_S="$(grep -E "✗ ${CELL} " "$OUT" | head -1)"
    NAMED_L="$(grep -cE "^✗ ${CELL} " "$LOG")"
    echo "     [$DUAN] rc=$rc｜红旗=${RF:-?}｜stdout 具名=${NAMED_S:0:70}｜log 具名 $NAMED_L 条"
    if [ "$DUAN" = "A" ]; then
      # ★甲 只断「**目标格**在修前不出红」＋ 无红旗 —— ✗ 不断 rc=0：同一个 stub 可能连带红**别的**格
      #   （例：`B3-1` 的 stub 也红 `B3-2`；`B4-3` 的 stub 也红 `B4-4`）—— 那是同一破法的必然，✗ 不是装置错。
      [ "${RF:-x}" = "0" ] && [ -z "$NAMED_S" ] && OKA=1
    else
      [ "$rc" -eq 1 ] && [ "${RF:-x}" = "0" ] && [ -n "$NAMED_S" ] && [ "$NAMED_L" -ge 1 ] && OKB=1
    fi
  done
  cp -p "$BAK/$FILE" "$G/$FILE"
  case "$FACE" in
    arm) ;;
    src:*) git -C "$B" checkout -- "${FACE#src:}"; 重新烘 || DEVICE=$((DEVICE+1)) ;;
    *) git -C "$B" checkout -- "${FACE#doc:}" ;;
  esac
  DZ=1
  [ "$(sha_before "$FILE")" = "$(sha256sum "$BAK/$FILE" | awk '{print $1}')" ] || DZ=0
  if [ "$FACE" != "arm" ] && ! git -C "$B" diff --quiet -- "${FACE#doc:}${FACE#src:}"; then
    DZ=0; echo "     ✗★ 注入面未复原：$FACE"
  fi
  if [ "$OKA$OKB$DZ" = "111" ]; then
    PASS=$((PASS+1)); REPORT+=("✓ stub 正控 $CELL（$DESC）  修前仍绿｜现头红且具名（红旗 0）｜复原字节同")
  else
    FAIL=$((FAIL+1)); REPORT+=("✗ stub 正控 $CELL（$DESC）  修前仍绿=$OKA｜现头红且具名=$OKB｜复原=$DZ")
  fi
done
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
echo "  ⇒ ★五格抽样（改坏期望值）＋ 两种语法闸坏档 ＋ **10 格逐格正控（#632）** ＋ **11 格 stub 正控（#634，两头各跑）**（注入「该格原本漏抓的产品态破法」）：皆如期回红／回红旗，且红是**判据红（具名）**（红旗 0）、stdout 与 log 双具名、一个坏档只算**一个**红旗、反引号**不做命令替换**、复原字节同；复原后复跑 rc=0 ⇒ 这些格**判得了**（✗ 恒真／硬编码）"
exit 0
