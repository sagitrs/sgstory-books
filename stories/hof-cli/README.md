# 灰港送灯：可完成一局的原创 CLI 原型

GNU/Linux、Node22、git，无新增npm包。正式规则/试作参数见 [spec.md](spec.md)，#572/#597 剧情决策增量见 [event-spec.md](event-spec.md)，文字与数据见 [content.mjs](content.mjs)，行为见 [game.mjs](game.mjs)。不复制引擎，不使用网页pin，不自动发布。数值仍需试玩，不宣称已经平衡。

## 一组启动与测试命令

从本仓根运行。以下克隆目录必须是新的；已有目录请核自己的检出，不覆盖别人或用浮动main。

```bash
mkdir -p "$HOME/tmp"
REF=$(node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --print-ref)
git clone https://github.com/sagitrs/sgstory.git "$HOME/tmp/grayharbor-engine"
git -C "$HOME/tmp/grayharbor-engine" checkout --detach "$REF"
ENGINE="$HOME/tmp/grayharbor-engine"
node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --engine "$ENGINE"
node stories/hof-cli/play.mjs --engine "$ENGINE" --seed 42 --save-dir "$HOME/tmp/grayharbor-v2-saves"
```

阶段一和二由同一个既有pin门读取声明；没有另一段JSON ref解析。声明ref是合法合入的完整引擎 SHA，接口2，依据见 [engine-ref.json](engine-ref.json)。游戏入口也先通过该门才启动；不支持的CLI接口具名拒绝，不回落网页引擎。工具的正式判据只认已提交的pin，未提交声明会rc2。

```bash
node tools/cli/check-ci.mjs
node tools/cli/test.mjs --engine "$ENGINE" --suite unit
node tools/cli/test.mjs --engine "$ENGINE" --suite e2e
node tools/cli/test.mjs --engine "$ENGINE" --suite unit --selftest
node tools/cli/test.mjs --engine "$ENGINE" --suite e2e --selftest
```

unit73个具名用例、正常玩家e2e19个；H1/H2各4项自证另计，CI契约反控也另计，不相加成产品用例数。固定登记与实际非空名称逐项对账。退出码0判据绿、1产品/判据红、2装置错或超时；没有“缺测试但通过”形。详见 [工具说明](../../tools/cli/README.md)。

## 正常玩家可重现的胜局与下一局

数字选择当前可见选项。查询 `help/status/bag/map` 不耗随机或资源；`save 名字`、`load 名字`、`quit` 是引擎命令，EOF/退出不自动保存。商店的价格、不可选理由、武器/护甲、粮食、胜败和解锁都在终端可见。正数选普通行动，负数选防呆行动（如「放弃送灯，合法撤退」），`0` 返回上一级。

此脚本是固定游戏版本2/seed42的普通输入：崖道取矿、买长刀/护胸/粮/药、用药、整场伏击、分粮给守林人、中间存档、继续判定、到塔门兑现协助、点灯并手动保存。不造状态、不改档、不替换RNG。新用v2目录，避免覆盖原型旧档。

```bash
printf '1\n2\n1\n2\n3\n5\n6\n10\n7\n1\n1\n2\nsave pending\n1\n3\n1\n1\nsave journey\nquit\n' |
  node stories/hof-cli/play.mjs --engine "$ENGINE" --seed 42 --save-dir "$HOME/tmp/grayharbor-v2-saves"
printf 'load journey\n1\n3\nstatus\nmap\nquit\n' |
  node stories/hof-cli/play.mjs --engine "$ENGINE" --seed 7 --save-dir "$HOME/tmp/grayharbor-v2-saves"
# 从已经支付口粮、尚未判定的中间阶段恢复，而非重交口粮
printf 'load pending\nstatus\n1\n3\n1\n1\nquit\n' |
  node stories/hof-cli/play.mjs --engine "$ENGINE" --seed 999 --save-dir "$HOME/tmp/grayharbor-v2-saves"
```

第一段应出现“送灯成功”、胜1/败0和潮渠解锁；第二段实际从保存的胜局开始下一局、经解锁潮渠到商店，本局2/生命20/金币10/粮食7。恢复后消费的是档内随机状态，不是新启动seed7。脚本数字只对应本规则版本；自动测试解析实际选项标签，不把失效数字静默换成其他动作。

另有真实败局、粮尽合法撤退、沼泽/沙地分支、失败读取不改会话与存读后下一场随机等价的正常玩家用例。它们不是直调API的合成关卡，也不替代全参数平衡或模型试玩。

## 玩家细节视图（inspect）

`inspect` 打开「玩家细节」根页，四类恒列出：主动道具、被动道具（含装备）、状态（正面＋负面）、情报；每类带该类**可见**条目数。页内正数进入下一级，`0` 返回上一级（行动页按 `0` 具名拒 `NAV_NO_PARENT`）。**只有玩家已知的条目才出现**：没遇到的守林人、没买的装备、没得的祝福根本不生成——空类显示「暂无」。条目 id 来自内容定义（`knife`、`blessing`…），换局、存读后不变。

浏览与返回都不耗随机、不改资源、不动动作数；导航是瞬时的，不入档（成功动作或 `load` 都会回到行动页）。`--debug` 启动时，在详情页输入负数把该条目的结构化 JSON 打到 stderr（默认关闭；关闭时具名拒 `DEBUG_DISABLED`，该页没有数据时 `DEBUG_NO_DATA`，超 64 KiB 时截断并在 stderr 首行给 `DEBUG_TRUNCATED`）。

```bash
printf 'inspect\n4\n1\n-1\n0\n0\n0\nquit\n' |
  node stories/hof-cli/play.mjs --engine "$ENGINE" --debug --seed 42 --save-dir "$HOME/tmp/grayharbor-v2-saves"
```

## 保存与跨局的准确含义

`profile` 保存胜/败/撤退计数及解锁；`run` 保存本局资源/地图节点/装备/战果及当前林地阶段、实际救助和待兑现的塔门后果。两者随一次原子引擎动作提交，保存也是同一个信封。通关解锁潮渠；死亡解锁护符，下局可带护胸并享商店折价。本局金币/装备不跨局叠加。继续新局不重置随机流。

游戏版本2不迁移原型version1档，读取旧版具名 `SAVE_GAME` 拒绝并保留当前会话，旧档文件不覆写。林地给粮/取粮之后不会立即离开，需继续判定；可在待判定、待应战和塔门前手动保存再恢复。叙事给线索，不在选项预报隐藏收益或精确概率；`bag`按需解释已识别装备。

必须手动保存才跨进程保留新进度；不另写隐藏账户档。不保存退出、恢复更早的旧档会丢/回退较新的长期进度，这是本原型明确的离线语义。加载失败完整保留当前会话，成功加载才替换。档案不是防篡改账户，不保证fsync/断电耐久或多进程冲突。

## 阅读与隔离

阅读地图和需求—实现—测试表见 [完整原型审查地图](../../docs/plans/hof-cli/prototype-review.md)，测试/双检出许可见 [接入契约](../../docs/plans/hof-cli/test-contract.md)。`stories/hof-cli/` 不纳入Babel内容舱单；没有网页/Pages产物，不改网页 `.github/engine-ref.json` 与既有三份workflow。CLI材料不代表正式商业游戏的内容/名称授权。

未覆盖：视觉/DOM、Windows/macOS、账户自动保存、防作弊、旧游戏档迁移、逐回合/实时战斗、完整商业平衡、模型试玩或费用/资源收益裁定。
