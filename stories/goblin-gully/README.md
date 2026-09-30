# 哥布林溪谷（Goblin Gully）

基于 Dyson Logos 的同名 one-page dungeon 模组改编的文字冒险游戏。
使用 SC RPG 引擎（D&D 3.5E 规则包）驱动。

## 概要

Erhurr 农场被洗劫一空，全家失踪。有人重建了峡谷两侧的旧桥。
你——一名冒险者——前往调查旧 Kale 帝国奴隶坑中发生了什么。

## 玩法

```bash
cd sgstory-books
python build.py stories/goblin-gully
# 浏览器打开 stories/goblin-gully/game.html
```

## 结构

```
stories/goblin-gully/
├── src/
│   ├── meta/               元数据与初始化
│   │   ├── storydata.twee    IFID / 标题 / 起始段落
│   │   └── init.twee         初始变量（玩家数值 / 开局装备）
│   ├── world/              世界定义
│   │   ├── map.js            12 位置 + 22 出口的有向图
│   │   ├── monsters.js       5 种怪物（B/X 数值 → 3E 化）
│   │   └── items.js          战利品（币/卷轴/药水/光耀剑）
│   ├── story/              剧情内容
│   │   ├── opening.twee      开场 + 传闻表 → 进入探索
│   │   └── battles.twee      6 场战斗 + 4 种结局
│   └── ui/                 界面
│       └── ui.twee           暗绿色峡谷主题 + 状态栏
└── test/
    └── goblin-gully.test.js  故事专属单元测试
```

## 地图（12 区域）

```
入口(1) → 前厅(2) → 大厅(3) ←→ 桥室(4) ←→ 绳桥(5) ←→ 空室(7) → 首领房(8)
                                                    ↕                ↕
                                                谷底(6)    秘密房(9) → 储藏室(10)
                                                                    首领房 → 兵营(11) → 深坑(12)
```

## 结局

| 结局 | 触发条件 |
|---|---|
| 完美 | 打败腐烂变异肉团 |
| 生存 | 恐惧逃跑后回去闩上铁门 |
| 坏 | 恐惧逃跑但不闩门 → 肉团毁灭镇子 |
| 死亡 | 任何战斗中 HP 归零 |

## 原作信息

- 模组：[Goblin Gully](https://dysonlogos.blog/2009/08/21/friday-map-goblin-gully-a-deadly-one-page-dungeon/)
- 作者：Dyson Logos (2009)
- 系统：B/X D&D（本改编使用 3.5E 规则包）
