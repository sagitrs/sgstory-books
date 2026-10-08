#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# B 族**候实现红测**运行器 · sagitrs-tester-3
#
# ★本器存在的唯一理由（沿 `tests/gate-001/run-all.sh` 的同一条教训）：
#   **语法错／装置错会把「全红」伪装成「判据有效」** —— 一刀没跑成、档一 parse 就死，
#   读到的 `rc≠0` 与「真有缺陷」**同形**。⇒ 须 `node --check` 前置 ＋ **三者同读**
#   （`rc` ＋ 出声面 ＋ 格数下限）；★**`rc≠0` 但零条 `✗` ⇒ 红旗（装置坏，✗ 缺陷）**。
#
# ★★本族的**特殊口径（与 gate-001 不同，读的人必须先看这条）**：
#   ★本族是**候实现红测**（`#416`-`#420`／`#425` 的实现尚未落 `main`）。
#   ⇒ ★**预期就是红的** ✓ —— ★判据＝「**红且具名**」（每条红都指出**哪一面的什么事实**不成立）
#     ✗ **不是**「绿」✗ **也不是**「崩」✓
#   ⇒ ★故本器把两类分开报：
#       · **判据红（预期）**：逐条具名 ⇒ 计「候实现红 N 条」✓
#       · **红旗（✗ 预期）**：坏档／崩／零出声／早退 ⇒ 计「装置问题 N 个」✗
#   ★**实现落 `main` 之后**，本器应转为「红应为 0」——★到那时**改判读口径**（见 README「转正条件」）✓
#
# ★**本档用 ASCII 变量名**（`fail_n`／`redflag_n`／`crash_n`）：★实测本机 bash **不接受非 ASCII 标识符**
#   （`红=0` 会被当**命令**执行 ⇒ `command not found`，且 `$崩` **不展开** ⇒ 我首版即栽此）✓
# 用法：cd <books 检出> && ENGINE=<引擎检出> bash tests/b-series/run-all.sh
# ══════════════════════════════════════════════════════════════════════
set -u
G="$(cd "$(dirname "$0")" && pwd)"
: "${ENGINE:?须给 ENGINE=<引擎检出>}"
export E="$ENGINE" ENGINE="$ENGINE" B="$(pwd)"
echo "◆ 装置面：E/ENGINE=$ENGINE ｜ B=$(pwd)"

# ── ★★前置：**产物在位**（NIT · `dev-9` 提）────────────────────────────────
#   ★他第一次跑（未建产物）得到「6 档全红旗·零出声」，而 runner 汇总写「★装置有问题」✗
#     ⇒ ★该措辞把人**指向产品/臂**（他一度以为判据有问题）✗ —— **真因是缺产物** ✓
#   ⇒ ★故本器**开跑前**先断产物在位，并**具名**给出补救命令 ⇒ 后来者一眼归因 ✓
ART="${B}/stories/babel/babel-trial.html"
if [ ! -f "$ART" ]; then
  echo "  ✗★ 装置错（★✗ 判据红 · ✗ 产品缺陷）：**产物不在位** —— ${ART}"
  echo "      ⇒ ★先建产物：python3 ${ENGINE}/build.py \"\$PWD/stories/babel\" --out \"\$PWD/stories/babel/babel-trial.html\" --version 'v0.0.3·<pin前8>'"
  echo "      ★（本族的臂都要**读产物** ⇒ 缺产物时六档会**全数零出声** ⇒ 那是**装置红旗**、✗ 缺陷 ✓）"
  exit 2
fi
echo "◆ 产物在位：${ART}（$(stat -c%s "$ART") 字节）✓"
echo "◆ 口径：★候实现红测 ⇒ 预期「红且具名」；红旗（坏档/崩/零出声/早退）✗ 预期"

# ── ① 语法闸（★先于一切：坏档不得进判据统计）──
echo; echo "── ① node --check（语法闸）──"
bad=0
for f in "$G"/*.mjs; do
  if timeout 60 node --check "$f" >/dev/null 2>&1; then echo "  ✓ $(basename "$f")"
  else echo "  ✗★ 语法坏档：$(basename "$f") ⇒ **本档结果一律作废**"; timeout 60 node --check "$f" 2>&1 | head -4 | sed 's/^/        /'; bad=$((bad+1)); fi
done
[ "$bad" -gt 0 ] && echo "  ⇒ ★语法坏档 $bad 个：以下判据统计**不可信**"

# ── ② 判据闸 ──
# 档名:最小出声条数（★＝各档 `判()` 的**格数**；低于它 ⇒ 档被截断/早退 ⇒ 红旗）
declare -a CASES=(
  "B2-l1-l4-curriculum.mjs:6" "B3-l5-l8-pool.mjs:6" "B4-l9-boss-gate.mjs:6"
  "B5-foreknowledge-retire.mjs:6" "B6-newrun-to-l10.mjs:5" "E2-return-city.mjs:6"
)
echo; echo "── ② 判据闸（★三者同读：rc ＋ ✓/✗ 出声 ＋ 格数下限）──"
fail_n=0; redflag_n=0
for c in "${CASES[@]}"; do
  f="${c%%:*}"; need="${c##*:}"
  if [ ! -f "$G/$f" ]; then echo "  ✗★ 档缺失：$f ⇒ 红旗"; redflag_n=$((redflag_n+1)); continue; fi
  if ! timeout 60 node --check "$G/$f" >/dev/null 2>&1; then echo "  —  $f 跳过（语法坏档）"; redflag_n=$((redflag_n+1)); continue; fi
  log="$G/.run.$f.log"
  timeout 1800 node "$G/$f" >"$log" 2>&1; rc=$?
  y=$(grep -cE '^✓' "$log"); n=$(grep -cE '^✗' "$log")
  crash_n=$(grep -cE '未捕获异常|TypeError|ReferenceError|is not a function' "$log")
  printf '  %-30s rc=%-3s ok=%-3s red=%-3s crash=%-3s (格数下限 %s)\n' "$f" "$rc" "$y" "$n" "$crash_n" "$need"
  if [ "$crash_n" -gt 0 ]; then
    echo "      ★红旗：疑崩溃（★崩溃不算判据红）"; grep -nE '未捕获异常|TypeError|ReferenceError|is not a function' "$log" | head -2 | sed 's/^/        /'; redflag_n=$((redflag_n+1))
  elif [ "$((y+n))" -eq 0 ]; then
    echo "      ★红旗：零出声（装置/装载坏，✗ 得计为判据红）"; redflag_n=$((redflag_n+1))
  elif [ "$((y+n))" -lt "$need" ]; then
    echo "      ★红旗：出声 $((y+n)) < 下限 $need ⇒ 档被**截断/早退**"; redflag_n=$((redflag_n+1))
  fi
  fail_n=$((fail_n+n))
done

echo; echo "════ 汇总（★候实现红测口径）════"
echo "  语法坏档 $bad ｜ ★候实现**判据红 $fail_n 条**（预期）｜ ★红旗 $redflag_n 个（✗ 预期）"
if [ "$redflag_n" -gt 0 ]; then
  echo "  ⇒ ★**装置/前置有问题**（✗ 判据红、✗ 产品缺陷）：逐档红旗见上（坏档／崩／零出声／早退）"
  echo "      ★零出声多半＝**产物不在位**或**产物陈旧**（★本器已在前置断「在位」；陈旧由各档 `B*-0` 前置格自报 ✓）"
  echo "      ★故请**先**核：① 产物在否 ② 是否新于源码 ③ `ENGINE` 指对树 ⇒ 再谈候实现红 ✓"
  exit 2
fi
echo "  ⇒ ★读数可用（红旗 0）· 候实现红 $fail_n 条 ⇒ **本族当前状态：红且具名** ✓（实现落 main 后应转为 0，见 README）"
exit 0
