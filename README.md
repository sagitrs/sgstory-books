# sgstory-books

0.0.1-alpha 主线已整体归档至分支 `0.0.1-alpha`（2026-09-29 收官，含全部历史与 Issue 上下文）。
master/main 自本提交起重启为空干线。

---

## 测试工具

**测试工具根**：[`tools/`](tools/)（引用核 `check-refs.mjs` · 浏览器 e2e `e2e-harness.mjs` · 工作流演练 `rehearse-workflow.py` 及配套刀与豁免）。
**根外具名例外**（✗ 假全称：反向搜索证实存在竞争根，共 **3** 处）：
· [`tests/scenario/run.mjs`](tests/scenario/run.mjs) —— 场景链 runner（NOT_JUDGED 基线同处）；
· [`stories/babel/verify.mjs`](stories/babel/verify.mjs) —— 故事侧装配自检；
· [`stories/babel/scenarios/validate.mjs`](stories/babel/scenarios/validate.mjs) —— 清单自检。
★声明口径＝**逐处具名**（✗ 「唯一根」全称）：根行 ＋ 例外行；根外工具**增删改**时须**同处具名**。
工具退役或移动时须**同步本声明**（条款：gsvector-process#300 · tester.md「测试工具落盘与复用」）。
