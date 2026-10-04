# `tests/gates/` —— 本仓的门（结构面与装置面）

这一目录放的是**门**：不测游戏逻辑，测「仓库自身有没有坏」——workflow 的步骤键形、故事清单的声明面等。
每个门都带自己的**可假刀自检**（`--selftest`：改被测物，门必须红；按字节复原，门必须绿）；
门要能**红得了**，只印绿的门是装饰。

## 一条规则：**谁跑门，谁把 `tests/gates/**` 纳入触发面**

加一个门（或改一个门）时，**顺手**把 `.github/workflows/` 里**跑这些门**的那条 workflow 的
`paths` 触发面加上 `tests/gates/**`（`pull_request` 与 `push` 是**两份清单**，都要加）。

理由（`books#295` 装置缺口 · tester-3 核出）：门跑在 CI 里，但在那之前 `paths` 只列了
`stories/**` / `tests/scenario/**` / `tools/**` / `engine-ref.json` / 自己 —— **不含 `tests/gates/**`**，于是一笔**只改门档**的笔**一个 run 都不起**：门自己的改动（调判据、改自检刀）反而**测不到**。

## 现有门

| 门 | 判什么 |
|---|---|
| [`workflow-steps.mjs`](workflow-steps.mjs) | 本仓 `.github/workflows/**` 的**结构**：每步须有 `run` 或 `uses`、一个步块里 `run` 至多一次、每个 workflow 须有非空顶层 `name`（据 `sgstory#1994` 的一次真事机械化） |
| [`pack-manifest.mjs`](pack-manifest.mjs) | `stories/babel/story.json` 的 `packs` 声明面：清单合法、声明的包 id 在引擎检出里真有；**能力门**（引擎有 `packs` 口时真构建并断「产物只装已声明包」，没有时**明印「待判」**，不当作绿） |
