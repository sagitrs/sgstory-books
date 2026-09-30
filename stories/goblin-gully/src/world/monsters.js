/* 哥布林溪谷 —— 怪物定义（数值基于 B/X D&D + 3.5 调整）
 * 模组来源：Dyson Logos "Goblin Gully" (2009)
 */

const DND3 = setup.DND3;
const R = setup.RPG;

/* ---------- 哥布林（普通） ---------- */
DND3.GG_Goblin = R.defCharacter({
	id: 'gg-goblin', name: '哥布林',
	hp: 5, maxHp: 5,
	stats: DND3.stats({ str_mod: -1, dex_mod: 2, ac: 15, bab: -1, cr: '1/3' }),
	items: [{ id: 'club', equipped: true }, { id: 'gg-copper', charges: 10 }],
});

/* ---------- 哥布林弓手（区域 4，短弓） ---------- */
DND3.GG_Archer = R.defCharacter({
	id: 'gg-archer', name: '哥布林弓手',
	hp: 4, maxHp: 4,
	stats: DND3.stats({ str_mod: -1, dex_mod: 3, ac: 14, bab: 0, cr: '1/3' }),
	items: [{ id: 'short-bow', equipped: true }, { id: 'gg-copper', charges: 20 }],
});

/* ---------- 哥布林首领（区域 8，满 HP +1 命中/伤害） ---------- */
DND3.GG_Boss = R.defCharacter({
	id: 'gg-boss', name: '哥布林首领',
	hp: 11, maxHp: 11, // 满 HP
	stats: DND3.stats({ str_mod: 2, dex_mod: 2, con_mod: 1, ac: 17, bab: 1, cr: '1/2' }),
	items: [
		{ id: 'club', equipped: true },
		{ id: 'gg-electrum', charges: 50 },
		{ id: 'gg-potion-fire', charges: 1 },
	],
});

/* ---------- 水晶活雕像（区域 10 守卫） ---------- */
/* B/X：AC 4, 3 HD, 2 attacks 1d6/1d6 → 3E 化：AC 16, HP 18, 双击 */
DND3.GG_CrystalStatue = R.defCharacter({
	id: 'gg-statue', name: '水晶活雕像',
	hp: 18, maxHp: 18,
	stats: DND3.stats({ str_mod: 4, dex_mod: -1, con_mod: 4, ac: 16, bab: 3, cr: '3' }),
	items: [], // 雕像不掉落
	properties: ['no-fear'], // 构造体免疫恐惧
});

/* ---------- 腐烂变异肉团（区域 12 最终 BOSS） ---------- */
/* 黑布丁属性：AC 8（低但难杀），大量 HP，恐惧光环 */
DND3.GG_Mass = R.defCharacter({
	id: 'gg-mass', name: '腐烂变异肉团',
	hp: 40, maxHp: 40,
	stats: DND3.stats({ str_mod: 6, dex_mod: -4, con_mod: 8, ac: 8, bab: 4, cr: '5' }),
	items: [
		{ id: 'gg-electrum', charges: 100 }, // 宝库里的财宝
		{ id: 'gg-scroll-bless', charges: 1 },
	],
	properties: ['fear-aura', 'no-fear'], // 散发恐惧，自身免疫
});

// 重置钩子
jQuery(document).on(':enginerestart', () => {
	DND3.GG_Goblin.hp = 5; DND3.GG_Goblin.effects = [];
	DND3.GG_Archer.hp = 4; DND3.GG_Archer.effects = [];
	DND3.GG_Boss.hp = 11; DND3.GG_Boss.effects = [];
	DND3.GG_CrystalStatue.hp = 18; DND3.GG_CrystalStatue.effects = [];
	DND3.GG_Mass.hp = 40; DND3.GG_Mass.effects = [];
});
