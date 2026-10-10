# 独立 CLI 游戏测试工具

只认游戏独立pin；不复用网页声明。均从books根运行；`--engine` 必须是完整SHA、净树的引擎检出。Node22/Linux/git，无额外npm依赖。临时目录来自step的TMPDIR或`$HOME/tmp`，应在两个Git树外，不写共享`/tmp`。

| 文件 | 身份/实际调用 | 必需参数与用途 |
|---|---|---|
| `tools/cli/check-ci.mjs` | hof-cli-tests直接调用的静态门 | 无参数；workflow/契约、嵌套工具与README名单、实际登记、当前基座网页隔离；自带12配对内存反控与9真实bash装置控制 |
| `tools/cli/test.mjs` | hof-cli-tests直接调用的族/自证入口 | `--engine <引擎>`、`--suite unit`或`--suite e2e`；可另加`--selftest` |
| `tools/cli/player.mjs` | e2e测试实际import的共用库，不单独node启动 | 启动普通CLI，读等待边界，按当前标签选择；没有runtime import或存档读写 |

这三档由新静态门实际扫描`tools/cli/*.mjs`，分别与本表、根tools表和workflow调用核账；player的库身份由e2e import核实。旧平面工具门只管`tools/*`直接子档，不冒称它能看见嵌套目录。游戏入口`stories/hof-cli/play.mjs`是产品，不是另一份测试runner。

## 族判据

`tests/hof-cli/registry.json`登记unit42、e2e8个独立名称；实际测试文件、TAP非空计划、名字、pass/fail/skipped/cancelled/todo及子进程码都要对账。缺文件、空登记、非Git树或数量/退出码不相符是装置rc2，不是“0用例通过”。正常红是rc1。正文输出通过、产品失败、环境作废、未覆盖、问题总数与计划总数，满足：

```text
问题总数 = 产品失败 + 环境作废 + 未覆盖
套件计划总数 = 通过 + 问题总数
```

登记不可读时明确报计划未知，不捏造0/0。没有skip绿、EOF当一次完整游玩、超时复试洗绿。unit可构造规则边界和故障，e2e仅启动seed与正常终端输入；不造游戏状态、不改/读档、不在旅程中换随机源。具体名称和断言可从登记直达源文件。

Linux族进程组有上限：unit30秒、e2e75秒；Node具名用例25秒，普通CLI进程10秒且输出256KiB，族输出4MiB。超时具名，杀自己创建的组，不碰别人进程。每个玩家case结束杀/收自己CLI、删私有槽目录；族结束核临时目录无残留并删除族目录。两树Git状态与产品/判据源码SHA前后同值，CLI引擎必须从一开始就净。

## 两把故障自证，不混产品分母

H1在临时books副本把真实战斗伤害中的护甲减免改为0，必须使 `HOF-U08 armor reduces actual effective damage` 具名rc1。H2在临时副本关闭已解锁潮渠的真实选项前置，必须使 `HOF-E02 saved victory exposes usable next-run canal` 具名rc1；只打印“已解锁”仍过不了真正选捷径/到商店的判据。

两族均：基线0 → 植刀且字节读回 → 目标具名1（装置2不能替代）→ 源字节复原 → 再跑0。unit --selftest还在该同一私有副本跑4个装置反控：缺文件/空登记/非Git books/挂CLI，必须各具名2并复原字节；挂CLI只注册1个临时装置臂，不缩正式e2e8项。各族自证4/4另计。副本的pin单独Git提交以满足既有pin门；正式books/engine从未被植刀，引擎仍只读。没有test文件伪造FAIL，也没有只检查刀marker就算捕获。

`check-ci.mjs` 的12个配对反控是内存文字/数据副本；另9个装置控制实跑提取的bash块，使用假node和私有双Git树核空ref/错误码/失败必经readonly。它们不起GitHub runner，也不解析所有GitHub YAML语义。它只防本许可形的明确已知约束；平台是否实际加载并执行仍须读当前头Actions，不能拿本地对账代替。

## 常用整组

```bash
node tools/cli/check-ci.mjs
node tools/cli/test.mjs --engine "$ENGINE" --suite unit
node tools/cli/test.mjs --engine "$ENGINE" --suite e2e
node tools/cli/test.mjs --engine "$ENGINE" --suite unit --selftest
node tools/cli/test.mjs --engine "$ENGINE" --suite e2e --selftest
```

这是新job的判据面；不会启动网页、修改网页pin或把网页断言相加进CLI分母。旧门和平台babel-tests仍独立必查，nightly已知红见books#584，不作“全仓已绿”声称。
