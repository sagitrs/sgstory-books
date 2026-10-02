#!/usr/bin/env bash
# 刀：每条必须红 **且红在该红的那一支**（✗ 只看 rc≠0 —— 那会把「红错支」读成通过）
set -uo pipefail
# ★便携形（tester-4 RC：v4 曾**硬编回落本席工作区** ⇒ 他人一跑就是「越界 ＋ 测错树」）：
#   仓根**只从脚本自身位置推**（`$0` ⇒ `stories/babel/scenarios/` 上三级），✗ 任何绝对路径回落；
#   推不出来（不在仓里／符号链接怪）⇒ **显式报错退出**（✗ 悄悄 cd 到某个 home 目录）。
cd "$(dirname "$(readlink -f "$0")")/../../.." || { echo "✗ 推不出仓根（脚本位置异常）"; exit 2; }
[ -f stories/babel/scenarios/scenarios.json ] || {
	echo "✗ 当前目录不是本仓根（缺 stories/babel/scenarios/scenarios.json）：$(pwd)"; exit 2; }
V=stories/babel/scenarios/validate.mjs; S=stories/babel/scenarios/scenarios.json
# ★临时件用 `mktemp`（✗ 固定 `/tmp/k.json`：并发跑会互踩 —— 与行尾门/触点门同族的固定名坑）
K=$(mktemp "${TMPDIR:-/tmp}/babel-knife-XXXXXX.json") || { echo "✗ mktemp 失败"; exit 2; }
pass=0; fail=0
knife() { # $1=名  $2=变异(python)  $3=期望出现的支标
  python3 -c "
import json;d=json.load(open('$S'));$2;json.dump(d,open('$K','w'),ensure_ascii=False)"
  out=$(node $V $K 2>&1); rc=$?
  hit=0; echo "$out" | grep -qF "$3" && hit=1
  # 死支不得再出现（恒绿门已删）
  dead=0; echo "$out" | grep -qF "恒绿门" && dead=1
  if [ $rc -eq 1 ] && [ $hit -eq 1 ] && [ $dead -eq 0 ]; then printf "  ✓ %-34s rc=1 且红在「%s」\n" "$1" "$3"; pass=$((pass+1));
  else printf "  ✗ %-34s rc=%s 期望支命中=%s 死支出现=%s\n" "$1" "$rc" "$hit" "$dead"; fail=$((fail+1)); fi
}
echo "=== 刀（须红，且红在对的支）==="
knife "K1 去锚"            "d['场景'][0].pop('锚')"                        "「锚」空"
knife "K2 both 缺渲染断言"  "d['场景'][0]['断言'].pop('渲染')"              "层含 render 但缺"
knife "K3 id 重复"          "d['场景'][1]['id']=d['场景'][0]['id']"         "id 重复"
# ★`#1814` (a) 拆字段後：判据＝**两者皆空** ⇒ 刀改为「撤空 `动作` **与** `步骤`」（✗ 只撤 `动作` —— 纯流程行合法 ✓）
knife "K4 动作与步骤皆空"   "d['场景'][2]['动作']=[];d['场景'][2]['步骤']=[]" "皆空"
knife "K5 空清单"           "d['场景']=[]"                                  "★未捕获异常：读不到「场景」数组"
knife "K6 fixture 形非法"   "d['场景'][0]['入口态']['形']='存档形'"          "入口态.形 非法"
knife "K7 主锚缺失"          "d['场景'][0].pop('主锚')"                          "缺「主锚」"
knife "K8 主锚不在锚里"      "d['场景'][0]['主锚']='#9999'"                      "不在「锚」里"
knife "K9 同主锚无分案"      "d['场景'][0].pop('同锚分案')"                      "但缺「同锚分案」"
knife "K10 分案面逐字相同"   "[r for r in d['场景'] if r['id']=='cross-span-boundary-seal'][0]['同锚分案']['面']=[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['同锚分案']['面']" "逐字相同"
knife "K11 分案指错锚"       "[r for r in d['场景'] if r['id']=='cross-pkg-same-name-shadow'][0]['同锚分案']={'同锚':'#1743-WRONG','面':'x'}" "≠ 主锚"
knife "K12 信封形 fixture"   "[r for r in d['场景'] if r['id']=='span1-herb-poultice-house-rule-use'][0]['入口态']['数据']={'state':{}}" "存档信封键"
knife "K13 渲染缺实指"      "[r for r in d['场景'] if r['id']=='cross-gather-state-machine'][0]['断言']['渲染']='活行随状态变'" "缺**实指**"
# ★信封键面（`#106` dev-9 MINOR 折单）：权威四键 ＋ `rpgSave` —— **每个键一把刀**
#   （✗ 只一刀——那样删掉表中某个键时，只测别的键的刀仍绿 ⇒ 静默不跟）
#   入口态侧（`validate.mjs` 的「入口态.数据」支）：K12 已盖 `state`，下列盖其余四键：
knife "K14 信封 pack"        "[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['入口态']['数据']={'pack':'x'}" "存档信封键"
knife "K15 信封 domains"     "[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['入口态']['数据']={'domains':{}}" "存档信封键"
knife "K16 信封 at"          "[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['入口态']['数据']={'at':1}" "存档信封键"
knife "K17 信封 rpgSave"     "[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['入口态']['数据']={'rpgSave':{}}" "存档信封键"
#   ★K19：`saveVersion` —— dev-9 逐键撤验发现**它漏了刀**（撤该键 ⇒ 20/0 全绿 ✗）⇒ 补上（照 K14 形）：
knife "K19 信封 saveVersion"  "[r for r in d['场景'] if r['id']=='span2-l20-gate-chain'][0]['入口态']['数据']={'saveVersion':3}" "存档信封键"
#   逻辑侧（`断言.逻辑.存档` 支）—— ★此形即 MINOR 里「刀 E 实证判绿」的那条（`存档:{pack:'x'}` ⇒ 旧表未盖 `pack` ⇒ 假绿）：
knife "K18 逻辑.存档 信封 pack" "[r for r in d['场景'] if r['id']=='cross-battle-end-victory'][0]['断言']['逻辑']={'步骤':['loadFixture','Battle.execute({interactive:false})'],'存档':{'pack':'x'}}" "存档**信封**键"
echo "=== 路径不存在（同一具名支）==="
out=$(node $V /tmp/does-not-exist.json 2>&1); rc=$?
echo "$out" | grep -qF "★未捕获异常" && { echo "  ✓ 路径错 ⇒ rc=$rc，红在 uncaughtException 具名支"; pass=$((pass+1)); } || { echo "  ✗ 路径错未具名"; fail=$((fail+1)); }
echo "=== 复原（原件须绿，且不得出现任何红标）==="
out=$(node $V 2>&1); rc=$?
echo "$out" | grep -q "✗" && { echo "  ✗ 复原后仍有红"; fail=$((fail+1)); } || { echo "  ✓ 复原 rc=$rc 零红标"; pass=$((pass+1)); }
echo "  ── 通过 $pass｜失败 $fail"; rm -f "$K"; exit $((fail>0))
