# sgstory-books

**故事仓**：以 sgstory 的新格式（md ＋ json，**零代码零 twee**）写故事与用例。
引擎住在 [`sagitrs/sgstory`](https://github.com/sagitrs/sgstory)；本仓**不含** `.twee`／`.mjs`。

## 目录

```
stories/<slug>/          故事（与引擎仓同形；换仓不换形）
  00-story.json          清单：slug / title / entry / audience / contractVersion / files
  passages/*.md          散文（纯 Markdown ＋ front-matter）
  data/*.json            数据面（契约项 / 条件表 / 声明面表）
cases/<slug>/<case>.json 用例（对故事的期望；不属故事）
```

## 怎么跑

前置：引擎仓与本仓为**同级目录**（`../sgstory`）。

```bash
cd ../sgstory

# 1) 编译本仓的故事（产物落在故事目录里，见 .gitignore）
SG_STORIES_DIR=../sgstory-books/stories node build.mjs

# 2) 跑门
SG_STORIES_DIR=../sgstory-books/stories node scripts/audit.mjs --check

# 3) 跑用例（执行器已在引擎仓落地：scripts/case-run.mjs）
#    先建产物（**清掉本故事的旧生成物再 build**，否则会跳过重编、读到旧产物）
SG_STORIES_DIR=../sgstory-books/stories node scripts/case-run.mjs --cases=../sgstory-books/cases
```

> **命令的权威以引擎仓实现为准**：`SG_STORIES_DIR` 是引擎的"故事根"口（环境变量，单一口名）；
> 本 README 的命令**在引擎侧落地后逐条实跑过**才定稿 —— 不写"想象中的命令"。

## 本地复算前先清生成物（**必做**）

本地复算/跑用例前，先清掉**本故事**的生成物与 `dist/`：

```bash
rm -f stories/*/1[5678]-*.twee stories/*/00-meta.twee && rm -rf dist
```

**为什么**：`build.mjs` 的"按需重编"只看**件在不在** —— 生成物还在就直接用旧编译产物 ⇒
改过 `data/*.json`／`passages/*.md` 后**不复算**，读到的却是旧故事（**`git status` 脏 0 也照样发生**，
因为它们是被 `.gitignore` 忽略的件）。今天这条坑让一次复算得出"故事缺行/缺表"的假结论。

## 生成物不入仓

跑编译会在故事目录里生成 `1[5678]-*.twee` 与 `00-meta.twee`（源是 `data/*.json`），
以及产物面 `dist/`、`build/`。它们**都不入仓**（见 `.gitignore`）：名单来源＝引擎的生成物家族谓词
（`editor/lib/core/generated-family.mjs`），**以引擎为权威**，避免两处漂移。

**验收**：跑完 `git status` 干净。

## 格式事实（写故事前必读 · **引擎契约事实**，不是本仓偏好）

四条都是**实测**出来的（写 `north-room` 时被引擎的门逐条抓过），按此写可一次过：

1. **`00-story.json` 的 `files` 不列 `data/*.json`** —— 数据面由引擎的 `data/` 面自动发现（`allSourceFiles()` 的 `withStoryData` 只在显式要求时收）。列了会报 `missing-manifest-file`。
2. **`files` 必列"生成物"名**（`00-meta.twee`／`15-tables.twee`／`17-rules.twee`）—— 它们由 `data/*.json` 编译产出，**不入仓但必须登记**；否则报 `unclaimed-file`。
3. **必须写 `audit.json`（空表也要显式写）** —— 门侧的故事判据数据（`text.topicWords`／`text.styleBlacklist`／`readBaseline`）**必须由故事自己声明**（`#602`）；缺文件 ⇒ 门直接点名报错。
4. **段落的 `payload` 标注只认三个值：`信息`／`张力`／`选择`**（可组合，如 `张力|信息`）—— 写别的值（例：`结局`）会被判"缺 payload 标注"。

> 另（预期项，不是缺口）：`lint-story` 的"**无冻结基线 ⇒ 未查等价**"降级 —— 建基线不是 M1 的要求，**按需在 `#1163`／后续**再做。

## 用例形态

```json
{
  "id": "north-room/open-room",
  "story": "north-room",
  "why": "指向既有能力或引擎缺口（必填）",
  "drive": { "clicks": ["推门进去"], "state": {}, "seed": 12345 },
  "expect": { "visible": [], "absent": [], "state": [], "edges": [] }
}
```

- **驱动按"可见文案"点**（不按段名/键名）⇒ 改名不误报；
- **期望分四类** ⇒ 红能直接归因到面；
- **`why` 必填** ⇒ 防"为绿而写用例"；
- **三态**：① 绿 ｜ ② 红-有归因票（`ticket: N`，转绿时补 `closed-by`）｜ **③ 红-无归因＝失败**。

### 用例读数（分母）

**报「全过」必须带分母**，且**各桶之和 ＝ 用例总数**（判决桶：绿／预期缺口／未归因／归因无效／陈旧归因；
「未核实」是**另一根轴**，不参与这个和）：

```
用例 10 条：绿 9 ｜ 预期缺口 1（1236）｜ 未归因 0 ｜ 归因无效 0 ｜ 陈旧归因 0 ｜ 未核实 0 ⇒ rc=0
```

- **读数时点**：2026-09-24（引擎主干 `0ef8420`；`cases/` 10 件）——**本行是历史读数，不是常设断言**；
- **重取**：按上面第 3 条命令跑一次（汇总行即权威）；
- **为什么写在这里**：用例是故事仓自己的交付面，**分母应当随手可见** ——
  「用例跑得出结果」这句话没有分母就等于没有内容，而分母**随用例数增长**，所以新增用例时**同笔更新这一行**。
