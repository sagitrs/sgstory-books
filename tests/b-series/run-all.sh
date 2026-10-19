#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# B 族**判据运行器**（**已转正** `#624`：红应为 0）· sagitrs-tester-3
#
# ★本器存在的唯一理由（沿 `tests/gate-001/run-all.sh` 的同一条教训）：
#   **语法错／装置错会把「全红」伪装成「判据有效」** —— 一刀没跑成、档一 parse 就死，
#   读到的 `rc≠0` 与「真有缺陷」**同形**。⇒ 须 `node --check` 前置 ＋ **三者同读**
#   （`rc` ＋ 出声面 ＋ 格数下限）；★**`rc≠0` 但零条 `✗` ⇒ 红旗（装置坏，✗ 缺陷）**。
#
# ★★本族的**口径（读的人必须先看这条）**：**已转正**（2026-10-19 · 承 `#624`）
#   ★本族原为**候实现红测**（`#416`-`#420`／`#425` 的实现尚未落 `main`）⇒ 那时「红＝预期」。
#   ⇒ **现已转正**：`#619` 修好步 26 后该步首次真正执行（run `39050789368`），六档 36 格
#     **`red=0`** ⇒ 判据与实现状态已经不匹配 ⇒ 口径改为「**红应为 0**」。
#     · **判据红（应为 0）**：逐条具名 ⇒ 计「判据红 N 条」；**N>0 ⇒ 本器 `exit 1`**（步 26 遂红）
#     · **红旗（✗ 容忍）**：坏档／崩／零出声／早退 ⇒ 计「装置问题 N 个」⇒ `exit 2`
#   ★转正**不改变今天的任何读数**（36 格 `red=0` 在两种口径下都判绿）；它打开的是
#     「**将来某格变红 ⇒ 步 26 会被看见**」这一道。逐格对账表与抽样刀**另笔**（`#624` 裁定 ③）。
#   ★步 26 的注释自转正起**陈旧**（它写「红旗 0 ⇒ rc 0、判据红允许非零」）—— 以本档为准。
#
# ★**本档用 ASCII 变量名**（`fail_n`／`redflag_n`／`crash_n`）：★实测本机 bash **不接受非 ASCII 标识符**
#   （`红=0` 会被当**命令**执行 ⇒ `command not found`，且 `$崩` **不展开** ⇒ 我首版即栽此）✓
# 用法：cd <books 检出> && ENGINE=<引擎检出> bash tests/b-series/run-all.sh
#       语法闸形态（✗ 不需 ENGINE/产物）：bash tests/b-series/run-all.sh --syntax-only
#       （CI PR 门用此形态；判据闸仍归 nightly —— 见下 `--syntax-only` 分支）
# ══════════════════════════════════════════════════════════════════════
set -u
G="$(cd "$(dirname "$0")" && pwd)"

# ── `--syntax-only` 形态（`gsvector-ci#18` · Leader `temp-guest-1` 04:40Z 四条落法①）──
#   逻辑留本档（单一来源）：CI 与本地跑**同一段代码**（① 段原样）·跳过 ENGINE 要求与产物前置。
#   只跑 ① 语法闸；坏档 ⇒ `exit 2`（＝族里「红旗/装置坏」语义，✗ 不是「判据红」）。
#   判据闸（②）不在本形态内 —— 判据在 nightly（e2e-window.yml 步 26）✓
if [ "${1:-}" = "--syntax-only" ]; then
  echo "◆ 形态：--syntax-only（**只查语法** · 判据在 nightly ✗ 本输出不代表判据通过）"
  bad=0
  for f in "$G"/*.mjs; do
    if timeout 60 node --check "$f" >/dev/null 2>&1; then echo "  ✓ $(basename "$f")"
    else echo "  ✗★ 语法坏档：$(basename "$f")"; timeout 60 node --check "$f" 2>&1 | head -4 | sed 's/^/        /'; bad=$((bad+1)); fi
  done
  if [ "$bad" -gt 0 ]; then
    echo "  ⇒ ★语法坏档 $bad 个 ⇒ exit 2（红旗/装置坏语义）"
    exit 2
  fi
  echo "  ⇒ 语法坏档 0（**仅语法过** · 判据闸在 nightly，✗ 由本输出宣称）"
  exit 0
fi

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
echo "◆ 口径：★已转正（2026-10-19 · 承 #624）⇒ 判据红**应为 0**（红>0 ⇒ exit 1）；红旗（坏档/崩/零出声/早退）✗ 容忍 ⇒ exit 2"

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
# ★语法坏档**进红旗计数**（`#629` 增补② · 预存缺陷）：① 段算出的 `bad` 原先**只印不计数** ⇒
#   目录内某个**不在 `CASES`** 的 `.mjs` 语法坏时，本器仍 `exit 0` ✗。⇒ 把既有的 `bad` 接进红旗 ⇒ `exit 2` ✓
#   （★只接计数，✗ 不改 ① 段本身的判定）
[ "$bad" -gt 0 ] && redflag_n=$((redflag_n+bad))
for c in "${CASES[@]}"; do
  f="${c%%:*}"; need="${c##*:}"
  if [ ! -f "$G/$f" ]; then echo "  ✗★ 档缺失：$f ⇒ 红旗"; redflag_n=$((redflag_n+1)); continue; fi
  if ! timeout 60 node --check "$G/$f" >/dev/null 2>&1; then
    # ★**不在这里加红旗数**（`#629` 增补④ · N2 · `tester-3` 探出、领队复现）：
    #   ① 段的 glob 是**目录下全部 `.mjs`** ⇒ 任何 `CASES` 成员都已被 `bad` 计过 ⇒ 此处再加一**必然是双计** ✗
    #   （实测：改坏一个在 `CASES` 里的档 ⇒ 旧形报「语法坏档 1 ｜ 红旗 **2** 个」）。
    #   ★仍保留提示行（读的人要知道本档被跳过了）；★「档缺失」分支**不动** —— 缺失档不在 glob 里，只被 ② 计一次 ✓
    echo "  —  $f 跳过（语法坏档）"; continue; fi
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
  # ★判据红**具名到 stdout**（`#629` 增补③ · 领队 01:10Z 裁）：判据红原先**只累加 `fail_n`、不印具名行** ✗ ⇒
  #   到了步 26（CI 那一步）只剩 `red=N` ⇒ **违反本族头注自己写的「红须具名」** ✗
  #   （`.run.*.log` 在 evidence 目录里，CI 读者通常看不到）。⇒ 与**红旗分支同形**，把该档的 `✗` 行印到 stdout。
  #   ⚠ 限 5 行（✗ 不刷屏）；完整逐条仍在 `.run.<档>.log` ✓
  if [ "$n" -gt 0 ]; then grep -nE '^✗' "$log" | head -5 | sed 's/^/        /'; fi
done

echo; echo "════ 汇总（★已转正口径：红应为 0）════"
echo "  语法坏档 $bad ｜ **判据红 $fail_n 条（应为 0）**｜ ★红旗 $redflag_n 个（✗ 容忍 ⇒ exit 2）"
if [ "$redflag_n" -gt 0 ]; then
  echo "  ⇒ ★**装置/前置有问题**（✗ 判据红、✗ 产品缺陷）：逐档红旗见上（坏档／崩／零出声／早退）"
  # ★双引号里的反引号会做**命令替换**（`#629` 增补④ · N1 · `tester-3` 探出、领队复现）：走到**红旗路径**时
  #   stderr 会多出 `B*-0: command not found`／`ENGINE: command not found`，且提示行里那两处**丢字** ✗
  #   （实测：`③ `ENGINE` 指对树` ⇒ 印成 `③  指对树`）⇒ 反引号一律**转义** ✓
  echo "      ★零出声多半＝**产物不在位**或**产物陈旧**（★本器已在前置断「在位」；陈旧由各档 \`B*-0\` 前置格自报 ✓）"
  echo "      ★故请**先**核：① 产物在否 ② 是否新于源码 ③ \`ENGINE\` 指对树 ⇒ 再谈判据红 ✓"
  exit 2
fi
# ★转正后的判力：判据红 > 0 ⇒ exit 1 ⇒ 步 26 走现成的 rc≠0 分支遂红（✗ 不必解冻 workflow）
if [ "$fail_n" -gt 0 ]; then
  echo "  ⇒ ★**判据红 $fail_n 条（转正后应为 0）** ⇒ 本器 **exit 1**，步 26 遂红；逐条具名见上文与 .run.*.log"
  exit 1
fi
echo "  ⇒ ★读数可用（红旗 0）· **判据红 0 条（转正后应为 0）** ⇒ 本族当前状态：**全绿** ✓"
exit 0
