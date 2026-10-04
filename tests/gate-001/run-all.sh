#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# gate-001 全电池运行器 · release 0.0.1 门测（tester-4）
#
# ★本器存在的唯一理由（writer 教训，`books#132` 转达）：
#   **语法错／装置错会把「全红」伪装成「判据有效」** —— 一刀没跑成、档一 parse 就死，
#   读到的 `rc≠0` 与「真有缺陷」**同形**。⇒ 跑刀前必须 `node --check`，
#   且跑完须**同读出声面**：`rc≠0` 但 **零条 `✗`** ⇒ **红旗（装置坏，✗ 缺陷）**，
#   ✗ 不得计入「失败 N 条」。
#
# 用法：cd <books 检出> && ENGINE=<引擎检出> bash tests/gate-001/run-all.sh
# ══════════════════════════════════════════════════════════════════════════════
set -u
G="$(cd "$(dirname "$0")" && pwd)"
: "${ENGINE:?须给 ENGINE=<引擎检出>}"
# ★各档 env 契约不同（实测）：有的读 `ENGINE`、有的读 `E`；多数还要 `B=<books 检出>`
#   ⇒ 本器**统一置齐**（首版我只置 `ENGINE` ⇒ 6 档装载失败 ⇒ 被守卫误报红旗 ＝ 我的守卫构造错）
export E="$ENGINE" ENGINE="$ENGINE" B="$(pwd)"
echo "◆ 装置面：E/ENGINE=$ENGINE ｜ B=$(pwd)"
echo "◆ cwd=$(pwd)"

# ── ① 语法闸（★先于一切：坏档不得进判据统计）──
echo; echo "── ① node --check（语法闸）──"
bad_syntax=0
for f in "$G"/*.mjs; do
  if timeout 60 node --check "$f" >/dev/null 2>&1; then
    echo "  ✓ $(basename "$f")"
  else
    echo "  ✗★ 语法坏档：$(basename "$f")  ⇒ **本档结果一律作废**（✗ 计入判据红）"
    timeout 60 node --check "$f" 2>&1 | head -4 | sed 's/^/        /'
    bad_syntax=$((bad_syntax+1))
  fi
done
[ "$bad_syntax" -gt 0 ] && echo "  ⇒ ★语法坏档 $bad_syntax 个：以下判据统计**不可信**"

# ── ② 判据闸 ──
# 档名:最小出声条数（低于它 ⇒ 档被截断/早退 ⇒ 红旗）
# ★注：档的出声**顶格**（`✓ …`／`✗ …`／`· …`）—— ✗ 带缩进（那是我显示时的 sed 加的）
# ★下限＝**实测值**（2026-10-02 全电池绿读）：截断/早退 ⇒ 掉到线下 ⇒ 红旗
declare -a CASES=(
  "D1-D3.mjs:14" "D2-battle.mjs:7" "D2-unarmed-vs-armed.mjs:2" "D2-club-loop.mjs:11"
  "D4-D7.mjs:6" "D5-D6.mjs:7" "D8-platform.mjs:10" "D9-release.mjs:5"
  "D10a-D10b.mjs:13" "D10b-deadend.mjs:29" "A7-arc.mjs:7"
)
# ★★ 具名跳过表（**过时/候重写**的档；✗ 静默消失 —— 每轮都要打印理由）
#   `books#132`：L1 club 提交已随操作者令丢弃 ⇒ `D2-club-loop` 整臂口径作废（待新弧重写）
declare -A SKIP=(
  ["D2-club-loop.mjs"]="候 books#132 新弧重写（L1 改『空手可胜＋捡剑』；旧臂断言已丢弃的 club 提交）"
)
echo; echo "── ② 判据闸（rc ＋ 出声面 ＋ 条数下限 三者同读）──"
# ── ★每轮**独占**的临时目录（✗ 不写进 $G）——
#   `books#347` 搬迁入仓后实测：旧形 `log="$G/.run.$f.log"` 会把每轮日志**留在仓里** ⇒
#   一次搬迁提交就裹进 10 个 `.run.*.log` ✗（真事）。日志仍完整保留，只是落在**仓外**。
#   ★要留档调试：`KEEP_LOGS=<目录>` ⇒ 跑完把本轮日志复制过去。
RUN_TMP="$(mktemp -d -t gate-001-XXXXXX)"
trap '[ -n "${KEEP_LOGS:-}" ] && cp -f "$RUN_TMP"/*.log "$KEEP_LOGS"/ 2>/dev/null; rm -rf "$RUN_TMP"' EXIT

tot_fail=0; tot_redflag=0; tot_skip=0
for c in "${CASES[@]}"; do
  f="${c%%:*}"; need="${c##*:}"
  [ -f "$G/$f" ] || { echo "  ✗★ 档缺失：$f ⇒ 红旗"; tot_redflag=$((tot_redflag+1)); continue; }
  if [ -n "${SKIP[$f]:-}" ]; then
    printf '  %-26s —  **具名跳过**：%s\n' "$f" "${SKIP[$f]}"
    tot_skip=$((tot_skip+1)); continue
  fi
  if ! timeout 60 node --check "$G/$f" >/dev/null 2>&1; then
    echo "  —  $f 跳过（语法坏档）"; tot_skip=$((tot_skip+1)); continue
  fi
  log="$RUN_TMP/$f.log"   # ★仓外（写在 $G 里会让每次跑都脏仓）
  timeout 3600 node "$G/$f" >"$log" 2>&1; rc=$?
  # ★判据档的出声标记**不统一**（多数 `✓/✗/·`；`D2-unarmed`/`D10b-deadend` 用 `○` 逐地点）
  #   ⇒ 统一计「凡出声标记」，✗ 只认一套（首版只认 ✓/✗ ⇒ 两档被误报「截断」＝我的守卫构造错）
  # ★第三类：**报告型档**（`D2-unarmed`／`D10b-deadend`）**不用** ✓/✗ 标记，而是缩进报告行 ＋ 尾行结论
  #   ⇒ 判据＝「顶格标记 ∪ 缩进报告行」（`[RPG] 重复注册` 等噪声顶格且无标记 ⇒ 天然被排除）
  y=$(grep -cE '^[✓✗·○]|^ {2,}[^ ]' "$log"); n=$(grep -cE '^✗' "$log"); u=$(grep -cE '^·' "$log")
  printf '  %-26s rc=%-3s ✓%-3s ✗%-3s ·未判%-3s (下限 %s)\n' "$f" "$rc" "$y" "$n" "$u" "$need"
  # ①rc≠0 且零条 ✗ ⇒ 红旗（装置坏，✗ 缺陷）
  if [ "$rc" -ne 0 ] && [ "$((y+u))" -eq 0 ] && [ "$n" -eq 0 ]; then
    echo "      ★红旗：rc≠0 却**零出声** ⇒ 装置/装载/语法坏，✗ 得计为「有缺陷」"; tot_redflag=$((tot_redflag+1))
    grep -vE '^\s*$' "$log" | tail -3 | sed 's/^/        /'
  # ②判据条数 < 下限 ⇒ 红旗（档被截断/早退）
  elif [ $((y+n+u)) -lt "$need" ]; then
    echo "      ★红旗：出声条数 $((y+n+u)) < 下限 $need ⇒ 档被**截断/早退**（✗ 可当「全过」）"; tot_redflag=$((tot_redflag+1))
  fi
  [ "$n" -gt 0 ] && tot_fail=$((tot_fail+n))
  # ③未判须具名（✗ 静默）
  [ "$u" -gt 0 ] && grep -E '^·' "$log" | sed 's/^/      /'
done

echo
echo "════ 汇总（★三者同读；✗ 只看 rc）════"
echo "  语法坏档 $bad_syntax ｜ 判据红 $tot_fail 条 ｜ ★红旗 $tot_redflag 个 ｜ 跳过 $tot_skip 档"
# ── ★语法坏档**也是**红旗（`books#347` 搬迁自证时实测抓到：本器档头**声称**「坏档 ⇒ 判据统计不可信」，
#    但代码从未把它计进红旗 ⇒ 坏档 1 个 + 判据红 1 条时，汇总仍印「读数可用（红旗 0）」✗。
#    ⇒ 现让实现兑现那句声称；★退出码约定**不变**（0＝读数可用／2＝本轮读数不可用），只是把这一类补进 2。）──
if [ "$bad_syntax" -gt 0 ]; then
  echo "  ⇒ ★语法坏档 $bad_syntax 个：**判据统计不可信**（坏档在场时，即便判据全绿也不得当读数用）"
fi
if [ "$tot_redflag" -gt 0 ] || [ "$bad_syntax" -gt 0 ]; then
  echo "  ⇒ ★**本轮读数不可用**：先消红旗（坏档/早退/装置），再谈判据红"
  exit 2
fi
echo "  ⇒ 读数可用（红旗 0）$( [ "$tot_fail" -gt 0 ] && echo "· 判据红 $tot_fail 条（见上，逐条具名）" || echo "· 判据红 0" )"
