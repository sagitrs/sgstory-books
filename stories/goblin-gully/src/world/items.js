/* 哥布林溪谷 —— 战利品与特殊物品 */

const DND3 = setup.DND3;
const R = setup.RPG;

/* ---------- 货币 ---------- */
DND3.GG_Copper = R.defItem({
	id: 'gg-copper', name: '铜币堆',
	desc: '一堆生锈的铜币。',
	stats: { value: 'cp' }, charges: null, stackable: true,
	used() { this.perform('铜币可以拿去镇上花。'); },
});

DND3.GG_Electrum = R.defItem({
	id: 'gg-electrum', name: '琥珀金币堆',
	desc: '一堆泛着淡金色光泽的琥珀金。',
	stats: { value: 'ep' }, charges: null, stackable: true,
	used() { this.perform('琥珀金在旧帝国时代流通，如今仍然值钱。'); },
});

/* ---------- 魔法物品 ---------- */
DND3.GG_ScrollBless = R.defItem({
	id: 'gg-scroll-bless', name: '祝福卷轴',
	desc: '羊皮纸上的神圣符文微微发光。',
	stats: { spell: 'bless', level: 1 }, charges: 1,
	used(that, from) {
		// 简化：+1 攻击加值，持续一场战斗（临时）
		if (from && from.stats) from.stats.bab = (from.stats.bab ?? 0) + 1;
		this.perform(`${from?.name ?? '使用者'}感受到了神圣的祝福——攻击加值 +1！`);
	},
});

DND3.GG_PotionFire = R.defItem({
	id: 'gg-potion-fire', name: '抗火药水',
	desc: '瓶中的液体像熔岩一样翻滚。',
	stats: { resist: 'fire' }, charges: 1,
	used(that) {
		if (that && that.stats) that.stats.fire_resist = true;
		this.perform(`${that.name}喝下药水，皮肤泛起淡淡的红光——对火焰免疫！`);
	},
});

/* ---------- 魔法武器（区域 9 秘密房间） ---------- */
DND3.GG_LightSword = R.defItem({
	id: 'gg-light-sword', name: '光耀双手剑',
	desc: '剑刃持续发出柔和的白光，非魔法但永不熄灭。',
	stats: { dmg: '1d10', type: 'slashing', crit: 2, weight: 8, cost: 0, light: true },
	weapon: true, slot: 'weapon', charges: null, stackable: false,
	actions: { equip: R.slotEquip, unequip: R.slotUnequip },
	used(that, from) {
		DND3.meleeAttack(this, that, from);
	},
});

/* ---------- 天生武器（Boss 专用，不掉落不可卸） ---------- */
DND3.GG_CrystalArm = R.defItem({
	id: 'gg-crystal-arm', name: '水晶臂',
	desc: '雕像自身生长的锐利晶体手臂。',
	stats: { dmg: '1d6+4', type: 'slashing', crit: 2 },
	weapon: true, slot: 'weapon', charges: null, stackable: false,
	used(that, from) { DND3.meleeAttack(this, that, from); },
});

DND3.GG_Tentacle = R.defItem({
	id: 'gg-tentacle', name: '腐烂触手',
	desc: '肉团伸出的、不断蠕动的触手。',
	stats: { dmg: '1d8+6', type: 'bludgeoning', crit: 2 },
	weapon: true, slot: 'weapon', charges: null, stackable: false,
	used(that, from) { DND3.meleeAttack(this, that, from); },
});

/* ---------- 护甲（Erhurr 家遗物 / 生锈链甲） ---------- */
DND3.GG_RustedMail = R.defItem({
	id: 'gg-rusted-mail', name: '生锈链甲',
	desc: '已经锈蚀不堪，几乎没有防护价值。',
	stats: { ac_bonus: 0, weight: 30, cost: 0, rusted: true },
	slot: 'body', charges: null, stackable: false,
	actions: { equip: R.slotEquip, unequip: R.slotUnequip },
	used() { this.perform('这副链甲已经锈透了，穿上反而碍事。'); },
});
