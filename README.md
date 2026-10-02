# sgstory-books

0.0.1-alpha 主线已整体归档至分支 `0.0.1-alpha`（2026-09-29 收官，含全部历史与 Issue 上下文）。
master/main 自本提交起重启为空干线。

---

## 测试工具

测试工具根：tools/
（明细见 [`tools/README.md`](tools/README.md)：6 件工具**逐件载四项**（清单／固定命令／期望读数／设立理由））。
**根外具名例外**（✗ 假全称：反向搜索证实存在竞争根，共 **5** 处）：
· [`tests/scenario/run.mjs`](tests/scenario/run.mjs) —— 场景链 runner（NOT_JUDGED 基线同处）；
· [`stories/babel/verify.mjs`](stories/babel/verify.mjs) —— 故事侧装配自检；
· [`stories/babel/scenarios/validate.mjs`](stories/babel/scenarios/validate.mjs) —— 清单自检；
· [`stories/babel/scenarios/knives.sh`](stories/babel/scenarios/knives.sh) —— 清单自检的**刀**（15 条，断「哪条红」）；
· [`stories/babel/scenarios/render-table.mjs`](stories/babel/scenarios/render-table.mjs) —— 清单**表渲染**（票面表＝其输出）。
★声明口径＝**逐处具名**（✗ 「唯一根」全称）：根行 ＋ 例外行；根外工具**增删改**时须**同处具名**。
★**与票面启发式的对账**（✗ 让计数含糊）：`declare-root.mjs` 的「工具类」名单按**文件名特征**（`*.test.js`／`*.knives.sh`／`run.mjs`／`validate.mjs`／`verify.mjs`／`e2e-harness.mjs`／`rehearse-workflow.py`／`check-refs.mjs`）⇒ 其反向读数＝根外 **3** 处；
本清单具名 **5** 处＝那 3 处 ＋ **同目录同族**的 `knives.sh`（刀）与 `render-table.mjs`（表渲染）—— 二者**不在该启发式名单内**，按「同目录同族一并具名」列出（★宁多列 ✗ 漏列）。
工具退役或移动时须**同步本声明**（条款：gsvector-process#300 · tester.md「测试工具落盘与复用」）。
