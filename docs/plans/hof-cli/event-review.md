# 剧情决策试玩版审查地图

References [#572](https://github.com/sagitrs/sgstory-books/issues/572)、[#597](https://github.com/sagitrs/sgstory-books/issues/597)。本轮交付一个可玩版本，两票分别对账，不变更已关闭#570/#585的原验收。本文不是非作者技术票、已合入或发布声明。

先读 [增量规格](../../../stories/hof-cli/event-spec.md)，再读 [行为](../../../stories/hof-cli/game.mjs) 的阶段/校验/选择/整场战斗/纯视图，最后按 [正式登记](../../../tests/hof-cli/registry.json) 查具名断言。依旧使用接口2与CLI正式pin，不改引擎、workflow或工具逻辑。

## 需求—实现—判据

| 票与面 | 实现位置 | 具名用例 |
|---|---|---|
| #597 已知事件/旅行总成本、实际增量 | options、view旅程提示、resourceChange | U17/U28/U43/U49、E06/E09/E10 |
| #597 已识别装备用途/替换/比较 | gearDescription、商店labels、可选bag明细 | U19–U27/U44、E01/E09 |
| #597 同一敌情选择、可观察战前线索 | enemyFor、enemyClue；fight共用enemyFor | U45/U46/U54、E05/E09 |
| #597 不提前泄露隐藏收益/精确权重 | sceneText与阶段选项，私有字段不进bag/map | U45、E09/E10 |
| #572 两个决定都留待判定；一次给粮 | options/forester.stage、apply(aid/forage) | U48/U49/U52、E10/E11 |
| #572 两分布八槽与结果语义 | encounterOutcome、apply(listen)、completeForester | U47/U50/U55/U56、E10/E11 |
| #572 发生/未发生前置 | 独立fed/result/rescued/pledged，不以祝福冒救助 | U50/U51/U55/U56、E10/E11 |
| #572 互斥条件/严格状态 | validForester；决定后旧选项消失 | U48/U52/U53、E10/E12 |
| #572 同地图未来未访点位替换 | mapId/binding、enemyFor本场副本 | U50/U53/U54/U63、E10/E11/E13 |
| #572 非重复奖/非全局修改 | once stages、consumed、frozen基础敌参 | U32/U48/U54/U62、E10/E12 |
| #572 整场协同而非伙伴AI | keeper耐战本场2；既有battle() | U54/U58、E10/E13 |
| #572 失败不提交（阶段/绑定两族） | 实际pin Session；抛错在真实事件/战斗之后 | U41/U57/U58 |
| #572 中间存读/绑定存读 | 严格游戏状态与同一个RNG信封 | U59/U64、E10/E12/E13 |
| #572 版本边界/新局/结束失效 | game.version=2、freshRun、finish | U37/U42/U60/U61/U63、E02/E03/E10 |

U41/U57/U58 分账：断言面是正常成功/末段抛错的五件观测对照（state、RNG、log、revision、boundary），判定实际pin下故事处理器失败路径的后果；失效对照面**未判其刀面**（game刀不可达，rollback判决点在pin Session），不冒作引擎失效刀。裁定见 [tester-4](https://github.com/sagitrs/sgstory-books/issues/572#issuecomment-6110723525)。正式用例输出HOF_ATOMIC两侧读数，PR同时贴具名构造/抛错步/原始输出。

当前unit81、e2e19，共100个产品用例；原为42+8，增量22+5，#608 增量9+6，本笔（#609）再增量8+0。问题总数、套件计划总数分别报告。H1/H2各4项、4个装置反控及静态门控制不进100分母。新增面的同机制临时刀配置/原始证据随PR公开，正式registry仍只有原H1/H2；许可不是技术票。

## 必须调整的旧断言：理由与替代面

不删既有42+8名称，以下调整不是减少覆盖：

- 单元旧walk夹具的aid/forage现在显式执行listen、必要时forest-fight，才得到过去“事件完成后”的状态。新阶段本身用U48/U55逐动作断言，不能让夹具代替新阶段验收。U28仍核不足3粮拒绝、总3粮、真实治疗/非叠加祝福。
- U22不再从玩家日志偷读“概率50%”。改用实际阈值50的随机输入，断言三次真实反击/伤害骰及最终生命13，仍判武器单计；并断言UI无概率泄露。概率公式端点仍由U02–U11核。
- U42的错游戏版本从2改为1：当前已升级2，必须真实拒绝旧版而非把有效版当坏档；仍核坏JSON/版本失败保全会话。
- E01/E02/E04共用胜局改走给粮→判定→塔门协助；仍精确两场战斗、真实祝福/装备、通关、下一局捷径和跨进程随机等价，不宽泛改成“若赢就算过”。
- E03同seed0不给粮自然死于新增林地伏击，而非原精英；仍核真实死亡、清袋、护符实际再出发和商店折价。
- E05把泄露潜在次数的字符串断言改为战前真实敌组/现场数量与战后真实反击反馈，仍完整走沼泽/沙地并验正常终局。潜在次数4由U06/U54等规则断言核。
- E05/E06的旧选项前缀随行动式文案改名，仍核curse路径、零粮只退不补救；不把不存在的旧标签当一个测试。

## 许可、评审与边界

开发著测试许可：[tester-4](https://github.com/sagitrs/sgstory-books/issues/572#issuecomment-6110395588)、[tester-3同形](https://github.com/sagitrs/sgstory-books/issues/572#issuecomment-6110410241)。沿用同机制多配置刀位确认：[tester-4](https://github.com/sagitrs/sgstory-books/issues/572#issuecomment-6110467035)。另经 [追加许可](https://github.com/sagitrs/sgstory-books/issues/572#issuecomment-6110897201)，test.mjs只改一行报告字串stays 8→unchanged，不改runner逻辑；其余工具逻辑/workflow/引擎不动。报告字串如未来需要报正式大小，应从登记派生，不手动换13，此结构化报告建议留后续清单、不借本笔扩装置。只能改批准清单，正式H1护甲/H2潮渠保持原目标。PR必须有当前头独立D/T、实际CI和非作者执合；作者不能自合。

未覆盖：#572全事件包、跨地图/跨run故事链、同目标多来源优先级框架、#578的60局平衡采样、模型试玩/费用、旧游戏档迁移、自动账户/防回滚、Windows/macOS、视觉/DOM、实时/逐回合战斗。Steam原作继续暂停，没用其战斗结果给本CLI背书。
