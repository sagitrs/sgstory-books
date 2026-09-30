# sgstory-books

SC RPG 引擎的故事集。每个故事对应 `stories/` 目录下的一个子目录。

## 目录约定

```
stories/<故事名>/
├── README.md         故事说明（概要/玩法/结构/结局）
├── src/              故事源码
│   ├── meta/           元数据（storydata.twee / init.twee）
│   ├── world/          世界定义（map.js / monsters.js / items.js）
│   ├── story/          剧情内容（opening.twee / battles.twee / ending.twee）
│   └── ui/             界面（样式 / 状态栏 / 宏）
└── test/             故事专属单元测试
    └── <故事名>.test.js
```

## 开发新故事

1. 复制 `stories/goblin-gully/` 为模板
2. 修改 `src/meta/storydata.twee`（标题 / IFID）和 `init.twee`（初始状态）
3. 在 `src/world/map.js` 定义你的世界
4. 在 `src/story/` 写剧情
5. 在 `test/` 写测试
6. 构建并测试：

```bash
python build.py stories/<故事名>
# 浏览器打开 stories/<故事名>/game.html
# 单元测试打开 tests/unit/unit.html
```

## 已有故事

| 故事 | 规则包 | 来源 | 状态 |
|---|---|---|---|
| [哥布林溪谷](stories/goblin-gully/) | D&D 3.5E | Dyson Logos (2009) | ✅ 可玩 |
