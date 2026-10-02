# sgstory-books

0.0.1-alpha 主线已整体归档至分支 `0.0.1-alpha`（2026-09-29 收官，含全部历史与 Issue 上下文）。
master/main 自本提交起重启为空干线。

---

## 测试工具

**测试工具根**：[`tools/`](tools/)（引用核 `check-refs.mjs` · 浏览器 e2e `e2e-harness.mjs` · 工作流演练 `rehearse-workflow.py` 及配套刀与豁免）；
场景 runner 与 NOT_JUDGED 基线在 [`tests/scenario/`](tests/scenario/)。
装配自检 [`stories/babel/verify.mjs`](stories/babel/verify.mjs) **随故事走**（故不在上面两个根内；CI 由 `babel-tests.yml` 调用）。
工具退役或移动时须**同步本声明**（条款：gsvector-process#300 · tester.md「测试工具落盘与复用」）。
