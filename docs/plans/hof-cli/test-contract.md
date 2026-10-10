# 独立CLI游戏接入与测试契约

References [#569](https://github.com/sagitrs/sgstory-books/issues/569)、[#570](https://github.com/sagitrs/sgstory-books/issues/570)。本实施PR的Tester许可：原前置评论6094384336/6094400878，明确五步 [6097116483](https://github.com/sagitrs/sgstory-books/issues/570#issuecomment-6097116483)，两细化及补强 [6097449641](https://github.com/sagitrs/sgstory-books/issues/570#issuecomment-6097449641)。许可合入即止，不免独立现头技术票和平台CI。

只新增hof-cli-tests；不改网页pin和既有babel-tests/trial/e2e-window。双checkout、Node22/Linux、5步、只读权限、180秒job；只读pin的同一门阶段一输出驱动checkout.ref，阶段二核HEAD相等。不内联读JSON ref、用浮动main或硬写SHA替代声明。books全历史供当前PR基座隔离核，engine只需固定SHA；不存在第二份ref真值。

步骤③独立赋值保命令失败码，非空守卫失败rc2，成功才输出。步骤⑤先核pin后判据，EXIT trap先存原rc，无论前者成功失败都核两树；readonly不可用/脏是装置2，日志另保原rc，不洗掉判据1。runner.temp只用在step env。私有目录仅在TMPDIR或HOME/tmp，不用共享/tmp。

## 精确workflow（两份正文必须同值）

```yaml
name: hof-cli-tests

# 单个CLI进程10秒；具名case25秒；unit族30秒/e2e族75秒；整个job180秒。
# books#569/570 Tester许可仅本实施PR合入前有效；原网页三档workflow不改。
on:
  pull_request:
    paths:
      - '.github/workflows/hof-cli-tests.yml'
      - 'stories/hof-cli/**'
      - 'tools/**'
      - 'tests/hof-cli/**'
      - 'README.md'
      - 'docs/plans/hof-cli/**'
  schedule:
    - cron: '17 7 * * *'
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: hof-cli-tests-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
jobs:
  hof-cli:
    runs-on: ubuntu-latest
    timeout-minutes: 3
    steps:
      - name: 检出books（全历史供当前PR旧面隔离核）
        uses: actions/checkout@v4
        with:
          path: books
          fetch-depth: 0
          persist-credentials: false
      - name: Node22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: 同一门导出独立pin
        id: pin
        working-directory: books
        shell: bash
        run: |
          set -euo pipefail
          ref="$(node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --print-ref)"
          [ -n "$ref" ] || { printf 'APPARATUS HOF_PIN empty ref\n' >&2; exit 2; }
          printf 'ref=%s\n' "$ref" >> "$GITHUB_OUTPUT"
      - name: 检出固定引擎（ref直接来自pin步）
        uses: actions/checkout@v4
        with:
          repository: sagitrs/sgstory
          ref: ${{ steps.pin.outputs.ref }}
          path: engine
          persist-credentials: false
      - name: 核pin、登记、族、两刀及必经readonly
        working-directory: books
        shell: bash
        env:
          TMPDIR: ${{ runner.temp }}
        run: |
          set -euo pipefail
          readonly_() {
            local bad=0
            for tree in books engine; do
              if ! git -C "$GITHUB_WORKSPACE/$tree" status --porcelain=v1 --untracked-files=all > "$RUNNER_TEMP/hof-$tree-status"; then
                printf 'APPARATUS READONLY unavailable: %s\n' "$tree" >&2
                bad=2
              elif [ -s "$RUNNER_TEMP/hof-$tree-status" ]; then
                printf 'APPARATUS READONLY dirty: %s\n' "$tree" >&2
                bad=2
              fi
            done
            printf 'READONLY books+engine: prior=%s apparatus=%s\n' "$rc" "$bad"
            return "$bad"
          }
          trap 'rc=$?; trap - EXIT; readonly_ || rc=2; exit "$rc"' EXIT
          node tools/check-engine-pin.mjs --ref-file stories/hof-cli/engine-ref.json --engine "$GITHUB_WORKSPACE/engine"
          node tools/cli/check-ci.mjs
          node tools/check-tool-registry.mjs
          node tools/check-readme-tables.mjs tools/README.md tools/cli/README.md
          node tools/cli/test.mjs --engine "$GITHUB_WORKSPACE/engine" --suite unit
          node tools/cli/test.mjs --engine "$GITHUB_WORKSPACE/engine" --suite e2e
          node tools/cli/test.mjs --engine "$GITHUB_WORKSPACE/engine" --suite unit --selftest
          node tools/cli/test.mjs --engine "$GITHUB_WORKSPACE/engine" --suite e2e --selftest
```

## 可判账与装置自证

产品unit42、e2e8，计划/名字/实际文件非空对账，失败/环境作废/未覆盖分别报告；H1/H2各四项另计。CLI10秒、Node具名25秒、unit族30秒/e2e族75秒、job180秒；超时杀自己创建的组并作装置2，不复试洗绿。源码SHA/Git状态前后同值、临时槽与组收尾；正式引擎不植刀。unit --selftest还跑4个正式装置控制，各具名rc2，与H1四项及unit42均分账。

新静态门实际对账3个嵌套工具、根/嵌套两表、CI直接调用和player实际import，不借旧平面scanner漏扫冒覆盖。精确正文和许可形另做12个配对内存反控；9个控制真实执行提取的两个bash块以假node/私有Git双树自证空输出、子命令失败、判据1、装置2、两树脏与缺Git的失败传播。这些是CI装置控制，不是产品用例或实际GitHub job。

旧面隔离比较当前受检树与声明基座：PR事件base.sha优先，本地共同基/非PR为origin/main；不永久冻结历史网页hash，以免将未来合法网页抬pin错误耦合到CLI。books checkout全历史保证可读基座；缺来源装置2，既有四文件差异判据1。没有自动更新基线。

本地静态门不是通用YAML/GitHub上下文解析器。已知shape绿仍须发布PR后读现头Actions实际加载/执行；旧babel-tests与主线nightly按各自账记，不把#584红涂绿。完整覆盖/未覆盖见审查地图及游戏README。
