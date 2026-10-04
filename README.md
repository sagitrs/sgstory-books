# sgstory-books

0.0.1-alpha 主线已整体归档至分支 `0.0.1-alpha`，这是 2026-09-29 的收官成果，其中含全部历史与 Issue 上下文。master 与 main 自本提交起重启为空干线。

---

## 游戏测试指导

[游戏测试指南](docs/playtest/game-testing-guide.md)说明如何准备、操作、观察并提交报告。人类读[手工试玩章](docs/playtest/game-testing-guide.md#人类测试人员)，bot 读[浏览器实测章](docs/playtest/game-testing-guide.md#bot-测试人员)；两者共用版本与存档约定、报告模板，不必阅读对方的技术步骤。故事玩法仍以本次测试版本的说明为准，试玩不等于发布验收。

## 测试工具

测试工具根：tools/

明细见 [`tools/README.md`](tools/README.md)，其中九件工具逐件载明四项内容，分别是清单、固定命令、期望读数与设立理由。
<!-- test-tool-root: tools/ -->

**根外具名例外。** 本仓的测试工具根是 `tools/`，但反向搜索证实存在竞争根，共五处，因此本声明的口径是逐处具名，而不是声称唯一根。这五处分别如下。第一处是 [`tests/scenario/run.mjs`](tests/scenario/run.mjs)，它是场景链 runner，NOT_JUDGED 基线也放在那里。第二处是 [`stories/babel/verify.mjs`](stories/babel/verify.mjs)，它是故事侧装配自检。第三处是 [`stories/babel/scenarios/validate.mjs`](stories/babel/scenarios/validate.mjs)，它是清单自检。第四处是 [`stories/babel/scenarios/knives.sh`](stories/babel/scenarios/knives.sh)，它是清单自检的刀，共十五条，用来断哪一条红。第五处是 [`stories/babel/scenarios/render-table.mjs`](stories/babel/scenarios/render-table.mjs)，它是清单表渲染，票面表就是它的输出。

声明口径是逐处具名，而不是「唯一根」这样的全称。声明由根行与例外行组成。根外工具增删改时，须在同一处具名。

**与票面启发式的对账。** `declare-root.mjs` 的「工具类」名单按文件名特征判定，特征是 `*.test.js`、`*.knives.sh`、`run.mjs`、`validate.mjs`、`verify.mjs`、`e2e-harness.mjs`、`rehearse-workflow.py` 与 `check-refs.mjs`。它的反向读数是根外三处。本清单具名五处，等于那三处，再加上同目录同族的 `knives.sh`（刀）与 `render-table.mjs`（表渲染）。后两者不在该启发式名单内，按「同目录同族一并具名」列出。这样宁可多列，也不漏列。

工具退役或移动时，须同步本声明。条款出处是 `gsvector-process#300`，以及 `tester.md` 的「测试工具落盘与复用」一节。

### 明细

以下明细按 `#300` 条款⑤的「两次法则」入册。用法逐件见各档文件头。

- [`check-refs-recheck.mjs`](tools/check-refs-recheck.mjs) 是引用核的独立复算器，既是同名判据的第二实现，也做独立清点。它枚举整份清单，而不使用被核对象的字段白名单，因此对账差集就是覆盖缺口。命令是 `node tools/check-refs-recheck.mjs --engine <引擎检出@pin> --compare`。
- [`e2e-drive.mjs`](tools/e2e-drive.mjs) 是真产物驾驶层，通过 `import` 上一件的 `boot()` 工作。它读档往返，涉及 `Save.slots` 与 `Engine.show`，也做自环就地重绘与正文行读数。命令是 `node tools/e2e-drive.mjs --engine <引擎检出@pin>`。加上 `--require <面>` 可以把明账面升为硬判。
