# sgstory-books

0.0.1-alpha 主线已整体归档至分支 `0.0.1-alpha`，这是 2026-09-29 的收官成果，其中含全部历史与 Issue 上下文。master 与 main 自本提交起重启为空干线。

---

## 原创CLI原型：灰港送灯

[启动、正常胜局/下一局与测试](stories/hof-cli/README.md)使用独立完整引擎pin、Node22/Linux，标准库即可跑。含真实分支、资源事件、商店/装备/消耗品、整场战斗、精英、胜败/合法撤退、下一局解锁及手动跨进程存读；不改变Babel网页pin或发布路径。产品unit42/e2e8与H1/H2自证各4项分账，未覆盖/限制见游戏README；[审查地图](docs/plans/hof-cli/prototype-review.md)给出需求—实现—测试对应。CLI工具仍在根内的`tools/cli/`，由它的门实际对账，不声称旧平面scanner已递归覆盖。

## 游戏测试指导

[游戏测试指南](docs/playtest/game-testing-guide.md)说明如何准备、操作、观察并提交报告。人类读[手工试玩章](docs/playtest/game-testing-guide.md#人类测试人员)，bot 读[浏览器实测章](docs/playtest/game-testing-guide.md#bot-测试人员)；两者共用版本与存档约定、报告模板，不必阅读对方的技术步骤。故事玩法仍以本次测试版本的说明为准，试玩不等于发布验收。

## 测试工具

测试工具根：tools/

明细见 [`tools/README.md`](tools/README.md)，其中每一件工具都逐件载明四项内容，分别是清单、固定命令、期望读数与设立理由。
<!-- test-tool-root: tools/ -->

**根外具名例外。** 本仓的工具根是 `tools/`，但反向搜索证实存在竞争根，共五处，因此本声明的口径是逐处具名，而不是声称唯一根。这五处分别如下。第一处是 [`tests/scenario/run.mjs`](tests/scenario/run.mjs)，它是场景链 runner，NOT_JUDGED 基线也放在那里。第二处是 [`stories/babel/verify.mjs`](stories/babel/verify.mjs)，它是故事侧装配自检。第三处是 [`stories/babel/scenarios/validate.mjs`](stories/babel/scenarios/validate.mjs)，它是清单自检。第四处是 [`stories/babel/scenarios/knives.sh`](stories/babel/scenarios/knives.sh)，它是清单自检的刀，共十五条，用来断哪一条红。第五处是 [`stories/babel/scenarios/render-table.mjs`](stories/babel/scenarios/render-table.mjs)，它是清单表渲染，票面表就是它的输出。

视觉专项的独立入口为 [`e2e-311-visual.mjs`](tools/e2e-311-visual.mjs)（素材字节与 jsdom 装饰 DOM）和 [`e2e-311-layout.mjs`](tools/e2e-311-layout.mjs)（原生 Chromium 两视口几何、具名战期 CSS 夹具与四刀）；前置、命令与限制见索引第24／25节。两者目前不由 CI 自动调用，CI 仍以故事自检第62格检查纯渲染映射。

声明口径是逐处具名，而不是「唯一根」这样的全称。声明由根行与例外行组成。根外工具增删改时，须在同一处具名。

**与票面启发式的对账。** `declare-root.mjs` 的「工具类」名单按文件名特征判定，特征是 `*.test.js`、`*.knives.sh`、`run.mjs`、`validate.mjs`、`verify.mjs`、`e2e-harness.mjs`、`rehearse-workflow.py` 与 `check-refs.mjs`。它的反向读数是根外三处。本清单具名五处，等于那三处，再加上同目录同族的 `knives.sh`（刀）与 `render-table.mjs`（表渲染）。后两者不在该启发式名单内，按「同目录同族一并具名」列出。这样宁可多列，也不漏列。

工具退役或移动时，须同步本声明。条款出处是 `gsvector-process#300`，以及 `tester.md` 的「测试工具落盘与复用」一节。

### 明细

以下明细按 `gsvector-process#300` 条款⑤「**落盘判准与准入**」（条文落点 `rules/tester.md`）入册。用法逐件见各档文件头。

- [`cli/check-ci.mjs`](tools/cli/check-ci.mjs) 实核新CLI workflow、三件嵌套工具/两张README名单、非空登记和网页隔离；配对反控另计。[工具参数/计数/预算](tools/cli/README.md)给出完整固定命令。
- [`cli/test.mjs`](tools/cli/test.mjs) 是Linux游戏族/自证入口，命令 `node tools/cli/test.mjs --engine <独立固定引擎> --suite unit`或`--suite e2e`，可加`--selftest`；`cli/player.mjs`是其e2e实际import的普通终端驾驶库。

- [`run-l10-checks.py`](tools/run-l10-checks.py) 从本仓复现本地 17 步检查并保存逐步日志；固定命令见工具索引 §22，不是 Actions run，也不代浏览器或平衡验收。
- [`verify-l10-city.mjs`](tools/verify-l10-city.mjs) 是 L10 无头装配模块，随 `node stories/babel/verify.mjs --engine <精确 pin 检出>` 执行；不是独立 CLI，不把合成 `save:ready` 当宿主往返。
- [`e2e-314-l10-city.mjs`](tools/e2e-314-l10-city.mjs) 用真实 Chromium 点击，核服务、存档／刷新、付费返程及独立终局。命令为 `node tools/e2e-314-l10-city.mjs --engine <精确 pin 检出> --evidence "$HOME/tmp/l10-evidence"`；资源／工具注入只证明接线，不证明自然远征或平衡。

- [`check-refs-recheck.mjs`](tools/check-refs-recheck.mjs) 是引用核的独立复算器，既是同名判据的第二实现，也做独立清点。它枚举整份清单，而不使用被核对象的字段白名单，因此对账差集就是覆盖缺口。命令是 `node tools/check-refs-recheck.mjs --engine <引擎检出@pin> --compare`。
- [`e2e-drive.mjs`](tools/e2e-drive.mjs) 是真产物驾驶层，通过 `import` 上一件的 `boot()` 工作。它读档往返，涉及 `Save.slots` 与 `Engine.show`，也做自环就地重绘与正文行读数。命令是 `node tools/e2e-drive.mjs --engine <引擎检出@pin>`。加上 `--require <面>` 可以把明账面升为硬判。
- [`e2e-280-heal-feedback.mjs`](tools/e2e-280-heal-feedback.mjs) 是 `books#280` ⑨（治疗反馈 ＋ 页脚 HP 随用刷新）的**真浏览器臂**：
  三路（战中页脚背包／背包战外／背包战中提交）各断【文本 `HP X → Y`】与【页脚 DOM 真变】，`--selftest` 双刀。
  ★ ① 那一路的形曾随 `books#280` ⑩（道具收敛到页脚背包）**变过** ⇒ 老形恒红；`#517` 定因后改点 `ui/bag.js` 的 `.rpg-bag-submit`（见 `tools/README.md` §11）。
  命令形 `LD_LIBRARY_PATH=~/.cache/sgstory-chrome-deps/usr/lib/x86_64-linux-gnu node tools/e2e-280-heal-feedback.mjs --engine <引擎检出>`；
  退出码 `0` 过／`1` 红／`2` **装置错**（缺浏览器或产物 ⇒ ✗ 不当判据红）。★本件**暂未接 CI**（仓内工具，体例同 `rehearse-workflow.py`）。
- [`e2e-471-w09-settle-redraw.mjs`](tools/e2e-471-w09-settle-redraw.mjs) 是 `books#471` 第 2 项（**结账后重绘**）的**自然路**真浏览器臂：由正常 UI 走到 W09-E4 点「请教两处水灵」⇒ 断**同一屏**出现「结算行 → 摘要行」（＝`desc()` 新分支真被重绘 ✓），并核桌面 1440×1000 与 390×844 的换行/不截断；`--selftest` 一刀（拆「结账后重进段落」⇒ 该面必红）。命令形 `PW_DIR=<含 playwright 的目录> CHROME_BIN=<exe> node tools/e2e-471-w09-settle-redraw.mjs --books "$PWD" --engine <精确 pin 检出>`；退出码 `0` 过／`1` 红／`2` **装置错**。★本件**暂未接 CI**（与 `e2e-280-*` 真浏览器族同批候接线）。

- [`check-premerge.mjs`](tools/check-premerge.mjs) 是**合前检查器**（把 `tools/README.md` 附三从文字变成可跑件）：
  ① 基座同尖（`merge-base(声明基, 票头) === 声明基`；★声明基＝`--base`／CI 的 `GITHUB_BASE_REF`／缺省 `origin/main`）② 回退行 0（对**声明基**的 3-dot `--numstat` 无「只删不加」的档）
  ③ 给了 `--prior` 再算 `patch-id`（逐字同 ⇒ 纯 rebase ⇒ 先前读数沿用）。命令形 `node tools/check-premerge.mjs --head <票头> [--base <声明基>] [--prior <旧头>]`；
  `--selftest` 合成例 15 例（真 `git init` 仓；含 K10 声明基解析／K11 同一头换判基 ⇒ 绿红分野两刀）；退出码 `0` 全绿（**打印两条读数**）／`1` 判据红（具名）／`2` 装置错。
  ★明账：patch-id 只证「同一改动集」✗ 不证语义等价；同尖 ✗ 不证内容对；**纯改名／二进制**档请人眼看。
