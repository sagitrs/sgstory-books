/* 00-seven-names-content.js —— W09「七名河」**固定内容**（`books#397`；S3 片 1）
 *
 * ★本档是**生成物**：正文逐字取自设计 `docs/plans/babel/optional/tutorial-seven-names/events.json`
 *   （票面 sha `56829d8c` ✓；设计自称 `design-candidate-not-runtime-schema` ⇒ 本档把它转成**运行时形**）。
 *   ⇒ ✗ 不要手改正文：改文本请回设计再重生成 ✓；本档只做两件事：
 *     ①候选 id ⇒ **真 id** 映射（下方 `物品映射` ✓，✗ 不改名字面）
 *     ②把 `portals`＋`events` 合成**一张节点表**（节点 id 全局唯一 ✓，门也是节点 ✓）
 * ⚠ 设计明写它「**不是运行时 schema**」⇒ 逻辑与运行时常量住 `00-seven-names.js`（逻辑侧）✓；
 *   本档另带 `enemy`／`reference_cr_per_creature`／`victory_loot` 等**注释性数据**（片 2 才接真怪物 ✓，
 *   ✗ 本片不据它召唤任何东西 ✓）。
 */
const BC = (setup.BABEL_CONTENT ??= {});

/** 候选 id ⇒ **真 id**（左＝设计用名、右＝本仓在册 id；未列者 ✗ 一律不许直接交付）。
 *  依据：`stories/babel/src/world/00-l10-city.js:9-11` 的买卖表已含 `ration`／`bandage`／`copper-ore` ✓；
 *  `rain-diadem` 由 `00-seven-names.js` **注册**（本片唯一新物品 ✓）。 */
const 物品映射 = Object.freeze({
	"ration": "ration",
	"bandage": "bandage",
	"copper-ore": "copper-ore",
	"tutorial.rain-diadem": "rain-diadem"
});

/** 入口／出口（设计 `entry`／`exit`）与主干（设计 `main_route`；★它是**一条推荐**，✗ 不是强制）。 */
const 入口 = "E0", 出口 = "E9";
const 主干 = Object.freeze([
	"E0",
	"E1",
	"E4",
	"E6",
	"E8",
	"E9"
]);

/** 邻接表：**13 条有向边**（★形是「对象映射」—— 键＝节点、值＝可达列表 ⇒ 迭代取 **value** ✓）。 */
const 边表 = Object.freeze({
	"E0": [
		"E1",
		"E2"
	],
	"E1": [
		"E3",
		"E4"
	],
	"E2": [
		"E4",
		"E5"
	],
	"E3": [
		"E6"
	],
	"E4": [
		"E6",
		"E7"
	],
	"E5": [
		"E7"
	],
	"E6": [
		"E8"
	],
	"E7": [
		"E8"
	],
	"E8": [
		"E9"
	],
	"E9": []
});

/** 定点（审稿坐标；只读地图用 ⇒ ✗ 不参与任何规则判定）。 */
const 定点表 = Object.freeze({
	"E0": [
		384,
		940
	],
	"E1": [
		256,
		770
	],
	"E2": [
		512,
		770
	],
	"E3": [
		120,
		580
	],
	"E4": [
		384,
		580
	],
	"E5": [
		648,
		580
	],
	"E6": [
		256,
		390
	],
	"E7": [
		512,
		390
	],
	"E8": [
		384,
		230
	],
	"E9": [
		384,
		85
	]
});

/** 固定内容：门 2 枚（E0／E9）＋ 事件 8 则（E1–E8）—— 每则字段：
 *  `id`／`title`／`type`（`portal`／`reward`／`battle`）／`intro[]`／`options[]`／`navigation[]`；
 *  `options[i]`＝`{label, check|null, success{text,loot}, failure{text,loot}}`（`check` 形：
 *  `{ability, dc, modifier?}` ⇒ 「本次修正」**住在 check 里** ✓ 就是设计所称「高歌猛进」的落点 ✓）。 */
const 节点表 = Object.freeze({
	"E0": {
		"id": "E0",
		"title": "陌生河岸",
		"type": "portal",
		"intro": [
			"你第一次踏出L10，落在七名河的旧渡口。当地渡工递来一张路图：先走系着浅色绳的左岸，再去中间的浅湾；那里有人愿意给旅人补给。",
			"位面回声带来“高歌猛进”：逃脱类检定－6，应战侦察检定＋3。这里死亡按通常规则处理。回城会使携带的普通道具和装备变得脆弱，城里带来的也不例外；原已脆弱者会在结算时消失。"
		]
	},
	"E9": {
		"id": "E9",
		"title": "归城门",
		"type": "portal",
		"intro": [
			"出口的水光映出了L10。你已走过这片河岸；这次教程只通向回城，不开放下一层。",
			"回城前，你可以检查背包和脆弱结算预览。确认后使用本层的一次传送机会，带着本次成果返回。"
		],
		"options": [
			{
				"label": "返回L10",
				"check": null,
				"result": "执行一次回城与脆弱结算，教程完成"
			}
		]
	},
	"E1": {
		"id": "E1",
		"title": "岸边系绳",
		"type": "reward",
		"image": "assets/events/e1.png",
		"intro": [
			"一条小渡舟停在浅滩，松开的绳结让船头不断撞岸。渡工一边扶船，一边向你招手。他把两包干粮放在石上，想请你帮忙。",
			"他指向上游：中间的浅湾没有鳄巢，那里还有备用补给；左侧芦丛却常有鳄兽出没。"
		],
		"options": [
			{
				"label": "重新系稳舟绳",
				"check": {
					"ability": "DEX",
					"dc": 8,
					"tag": "reward"
				},
				"success": {
					"text": "渡舟稳住，渡工交付约定的两包干粮。",
					"loot": {
						"ration": 2
					}
				},
				"failure": {
					"text": "绳结仍不可靠，渡工接手处理；你没有取得这份报酬。",
					"loot": {}
				}
			},
			{
				"label": "观察船头水势",
				"check": {
					"ability": "WIS",
					"dc": 8,
					"tag": "reward"
				},
				"success": {
					"text": "你指出绳该系在另一根桩上。渡工给你一包干粮。",
					"loot": {
						"ration": 1
					}
				},
				"failure": {
					"text": "你还看不清水势，渡工自行调整；没有额外报酬。",
					"loot": {}
				}
			},
			{
				"label": "告辞，继续上路",
				"check": null,
				"success": {
					"text": "渡工仍提醒你优先走浅湾。",
					"loot": {}
				}
			}
		],
		"navigation": [
			{
				"direction": "left",
				"to": "E3",
				"label": "左：战斗·浅滩鳄影（较险）"
			},
			{
				"direction": "right",
				"to": "E4",
				"label": "右：奖励·借道浅湾（推荐）"
			}
		]
	},
	"E2": {
		"id": "E2",
		"title": "失落水图",
		"type": "reward",
		"image": "assets/events/e2.png",
		"intro": [
			"一位测水者正在石台上拼接被风吹散的流图。同一条河在纸上有几个名字，他却并不争论哪个才正确，只想找出今天仍能通舟的水路。",
			"他备了绷带作报酬。上游左侧通往有补给的浅湾；右侧沙洲有两头护巢鳄兽。"
		],
		"options": [
			{
				"label": "按岸形拼回流图",
				"check": {
					"ability": "INT",
					"dc": 12,
					"tag": "reward"
				},
				"success": {
					"text": "你接上两段真实岸线，取得两份绷带。",
					"loot": {
						"bandage": 2
					}
				},
				"failure": {
					"text": "岸线仍对不上，测水者收回散片；没有报酬。",
					"loot": {}
				}
			},
			{
				"label": "找出尚通的水路",
				"check": {
					"ability": "WIS",
					"dc": 12,
					"tag": "reward"
				},
				"success": {
					"text": "你辨出可用河汊，取得一份绷带。",
					"loot": {
						"bandage": 1
					}
				},
				"failure": {
					"text": "水光掩住流向，你没有确认可用路线；没有报酬。",
					"loot": {}
				}
			},
			{
				"label": "不接委托",
				"check": null,
				"success": {
					"text": "测水者不阻拦你，也不隐瞒前路危险。",
					"loot": {}
				}
			}
		],
		"navigation": [
			{
				"direction": "left",
				"to": "E4",
				"label": "左：奖励·借道浅湾（推荐）"
			},
			{
				"direction": "right",
				"to": "E5",
				"label": "右：战斗·双鳄护巢（较险）"
			}
		]
	},
	"E3": {
		"id": "E3",
		"title": "浅滩鳄影",
		"type": "battle",
		"image": "assets/events/e3.png",
		"intro": [
			"芦叶下浮出一双眼睛。一头鳄兽横在你与上游之间，浅水中的尾巴已经转向岸边。渡工提过，这条支路比浅湾危险。",
			"河边居民曾允许旅人打捞旧运矿船的散货；一块铜矿就卡在鳄兽旁的石缝中。想继续前进，你需要应对这次遭遇。"
		],
		"enemy": {
			"srd_base": "Crocodile",
			"count": 1,
			"reference_cr_per_creature": 2,
			"relative_risk": "较险支路",
			"combat_ground": "岸边干地与浅水，不强制玩家下水"
		},
		"options": [
			{
				"label": "应战，观察对手",
				"check": {
					"ability": "WIS",
					"dc": 10,
					"modifier": 3,
					"tag": "engage-scout"
				},
				"success": {
					"text": "确认一头鳄兽，威胁高于浅湾后的离群水灵；随后进入战斗。",
					"loot": {}
				},
				"failure": {
					"text": "你未能判断其力量；敌人不会因侦察失败改变，随后进入战斗。",
					"loot": {}
				}
			},
			{
				"label": "沿岸避开鳄兽",
				"check": {
					"ability": "DEX",
					"dc": 15,
					"modifier": -6,
					"tag": "escape"
				},
				"success": {
					"text": "你绕过浅滩，不拿危险处的散货。",
					"loot": {}
				},
				"failure": {
					"text": "鳄兽发现你的移动，立即进入战斗。",
					"loot": {}
				}
			}
		],
		"victory_loot": {
			"copper-ore": 1
		},
		"victory_loot_source": "战斗结束后拾取居民已授权打捞的旧船散货，不是鳄兽必然产矿",
		"navigation": [
			{
				"direction": "forward",
				"to": "E6",
				"label": "继续：战斗·逆流水灵"
			}
		]
	},
	"E4": {
		"id": "E4",
		"title": "借道浅湾",
		"type": "reward",
		"image": "assets/events/e4.png",
		"intro": [
			"几根木桩围住平静的浅湾，水位线仍清楚可见。渡工把备用干粮和绷带递给你：他不要求你先救整条河，只盼你记住这段安全岸线。",
			"左侧的离群水灵较弱，而且岸边有干地可以站稳；右侧的交汇口水更急，守在那里的水灵也更强。"
		],
		"options": [
			{
				"label": "接下补给",
				"check": null,
				"success": {
					"text": "你接过渡工的补给包，先在战斗外把装备检查了一遍。",
					"loot": {
						"ration": 1,
						"bandage": 1
					}
				}
			},
			{
				"label": "请教两处水灵",
				"check": {
					"ability": "WIS",
					"dc": 8,
					"tag": "reward"
				},
				"success": {
					"text": "左岸的水灵较弱，岸边有干地可以站稳；右侧水急，守在那里的那一只更强。建议先走左岸。",
					"loot": {
						"ration": 1,
						"bandage": 1
					}
				},
				"failure": {
					"text": "你没听懂水势的细节。渡工仍提醒你：先走左侧，那边更容易站稳。",
					"loot": {
						"ration": 1,
						"bandage": 1
					}
				}
			},
			{
				"label": "谢绝补给",
				"check": null,
				"success": {
					"text": "你选择轻装前进。渡工说明两条路的危险差别：左侧水灵较弱、有干地；右侧水急，守着一只更强的。",
					"loot": {}
				}
			}
		],
		"navigation": [
			{
				"direction": "left",
				"to": "E6",
				"label": "左：战斗·逆流水灵（推荐）"
			},
			{
				"direction": "right",
				"to": "E7",
				"label": "右：战斗·分流怒潮（较险）"
			}
		]
	},
	"E5": {
		"id": "E5",
		"title": "双鳄护巢",
		"type": "battle",
		"image": "assets/events/e5.png",
		"intro": [
			"沙洲上有一窝鳄卵，两头鳄兽一前一后挡住通路。它们不是等待旅人讨伐的恶物，但你已走入它们守护的范围。",
			"两块旧船散落的铜矿在岸边闪光。这里比浅湾绕路更险，继续前进不能只靠一场轻松的奖励。"
		],
		"enemy": {
			"srd_base": "Crocodile",
			"count": 2,
			"reference_cr_per_creature": 2,
			"relative_risk": "较险支路，双敌",
			"combat_ground": "沙洲干地与浅水，不强制玩家下水"
		},
		"options": [
			{
				"label": "应战，观察两侧",
				"check": {
					"ability": "WIS",
					"dc": 10,
					"modifier": 3,
					"tag": "engage-scout"
				},
				"success": {
					"text": "确认两头鳄兽；数量和威胁都高于左侧主干，随后进入战斗。",
					"loot": {}
				},
				"failure": {
					"text": "你未能判断夹击风险；实际敌人仍固定为两头，随后进入战斗。",
					"loot": {}
				}
			},
			{
				"label": "攀上岸坡脱离",
				"check": {
					"ability": "STR",
					"dc": 15,
					"modifier": -6,
					"tag": "escape"
				},
				"success": {
					"text": "你离开护巢范围，不取岸边散货。",
					"loot": {}
				},
				"failure": {
					"text": "脚下砂石滑落，鳄兽截住退路，立即进入战斗。",
					"loot": {}
				}
			}
		],
		"victory_loot": {
			"copper-ore": 2
		},
		"victory_loot_source": "居民已授权打捞的旧船散货",
		"navigation": [
			{
				"direction": "forward",
				"to": "E7",
				"label": "继续：战斗·分流怒潮"
			}
		]
	},
	"E6": {
		"id": "E6",
		"title": "逆流水灵",
		"type": "battle",
		"image": "assets/events/e6.png",
		"intro": [
			"一道逆行的水流在浅石旁站起，化成离群水灵。它不断重复着一段陌生的呼水节拍，拦住前往出口的岸路。",
			"你仍站在干地上，身后是刚经过的浅湾。记住渡工的提醒：应战前可以判断对手，但不要把高歌猛进带来的勇气当作不死之身。"
		],
		"enemy": {
			"srd_base": "Small Water Elemental",
			"count": 1,
			"reference_cr_per_creature": 1,
			"relative_risk": "最低难度主干",
			"combat_ground": "玩家可留在干地，依原生Water Mastery应用环境修正；不安排深水Vortex教学"
		},
		"options": [
			{
				"label": "应战，辨清水灵",
				"check": {
					"ability": "WIS",
					"dc": 10,
					"modifier": 3,
					"tag": "engage-scout"
				},
				"success": {
					"text": "确认一名小型水元素；本图战斗中它较弱，留在干地有利，随后进入战斗。",
					"loot": {}
				},
				"failure": {
					"text": "你没有确认它的强弱；水灵的实际配置不变，随后进入战斗。",
					"loot": {}
				}
			},
			{
				"label": "绕过逆流退开",
				"check": {
					"ability": "DEX",
					"dc": 15,
					"modifier": -6,
					"tag": "escape"
				},
				"success": {
					"text": "你绕过水灵，没有打捞它所在处的矿块。",
					"loot": {}
				},
				"failure": {
					"text": "逆流追上你的脚步，立即进入战斗。",
					"loot": {}
				}
			}
		],
		"victory_loot": {
			"copper-ore": 1
		},
		"victory_loot_source": "水灵原本阻挡的旧船散货；SRD水元素本身Treasure为None",
		"navigation": [
			{
				"direction": "forward",
				"to": "E8",
				"label": "继续：稀有奖励·听雨之冠"
			}
		]
	},
	"E7": {
		"id": "E7",
		"title": "分流怒潮",
		"type": "battle",
		"image": "assets/events/e7.png",
		"intro": [
			"两股水势撞在交汇口，一个比离群水灵更高大的身影从浪中站起。附近聚落用不同名字呼唤河流，水灵却把两种回应挤成了同一次冲击。",
			"渡工标过这里的危险。你选择了较险支路，出口仍在前方，但守路者的力量不会因教程而自动减弱。"
		],
		"enemy": {
			"srd_base": "Medium Water Elemental",
			"count": 1,
			"reference_cr_per_creature": 3,
			"relative_risk": "较险支路，较强单敌",
			"combat_ground": "交汇口岸石与水流；是否入水由战斗规则处理，不把画面浪花算作自动浸水"
		},
		"options": [
			{
				"label": "应战，判断怒潮",
				"check": {
					"ability": "WIS",
					"dc": 10,
					"modifier": 3,
					"tag": "engage-scout"
				},
				"success": {
					"text": "确认一名中型水元素，其力量高于左侧小型水元素，随后进入战斗。",
					"loot": {}
				},
				"failure": {
					"text": "你未能判断其力量；敌人仍固定为一名，随后进入战斗。",
					"loot": {}
				}
			},
			{
				"label": "攀岸离开交汇口",
				"check": {
					"ability": "STR",
					"dc": 15,
					"modifier": -6,
					"tag": "escape"
				},
				"success": {
					"text": "你避过冲流，没有取得交汇口散货。",
					"loot": {}
				},
				"failure": {
					"text": "浪势截住退路，立即进入战斗。",
					"loot": {}
				}
			}
		],
		"victory_loot": {
			"copper-ore": 2
		},
		"victory_loot_source": "旧运矿船散货，不改变SRD水元素Treasure为None",
		"navigation": [
			{
				"direction": "forward",
				"to": "E8",
				"label": "继续：稀有奖励·听雨之冠"
			}
		]
	},
	"E8": {
		"id": "E8",
		"title": "听雨之冠",
		"type": "reward",
		"rarity": "rare",
		"image": "assets/events/e8.png",
		"intro": [
			"出口前的石台摆着一顶铜冠，冠缘刻着七道水纹。它来自旧测雨家族，能帮助佩戴者分辨不同聚落的呼水节拍，却不宣布哪个名字唯一正确。",
			"这是渡工们为走通河岸的旅人备下的一次报酬。它属于稀有装备，但稀有不等于能稳定跨越位面；第一次回城后，它同样会变得脆弱。"
		],
		"options": [
			{
				"label": "收下并戴上Rain Diadem",
				"check": null,
				"success": {
					"text": "领取同一顶铜冠，沿正常装备流程佩戴；已有头部装备转入背包，容量不足则先处理，不吞物品。",
					"loot": {
						"tutorial.rain-diadem": 1
					},
					"equip_if_possible": true
				}
			},
			{
				"label": "收进背包，留待回城",
				"check": null,
				"success": {
					"text": "领取同一顶铜冠，保留当前装备。",
					"loot": {
						"tutorial.rain-diadem": 1
					}
				}
			},
			{
				"label": "谢绝这份报酬",
				"check": null,
				"success": {
					"text": "铜冠仍留在渡工的石台上，本次报酬记录为自愿放弃，不重新发放。",
					"loot": {}
				}
			}
		],
		"navigation": [
			{
				"direction": "forward",
				"to": "E9",
				"label": "继续：传送门·返回L10"
			}
		]
	}
});

BC.七名河内容 = { 物品映射, 入口, 出口, 主干, 边表, 定点表, 节点表,
  设计来源: 'docs/plans/babel/optional/tutorial-seven-names/events.json@56829d8c' };
