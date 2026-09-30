/* 哥布林溪谷 —— 故事专属单元测试
 * 验证故事的角色数值、地图完整性、特殊机制。
 */
(() => {
	const R = () => setup.RPG;
	const D = () => setup.DND3;

	test('goblin-gully：地图完整性（12 位置 / 22 出口 / 无孤立点）', () => {
		const map = setup.GG_MAP;
		assert.ok(map, '地图已定义');
		assert.eq(map.locations.size, 12, `位置数（期望 12，实际 ${map.locations.size}）`);
		assert.ok(map.exits.length >= 20, `出口数（期望 ≥20，实际 ${map.exits.length}）`);
		assert.eq(map.validate().length, 0, '无孤立点/悬空边');
	});

	test('goblin-gully：从入口可达全部位置', () => {
		const problems = setup.GG_MAP.validateConnectivity('entrance');
		assert.eq(problems.length, 0, `不可达位置：${problems.join('; ')}`);
	});

	test('goblin-gully：哥布林数值（B/X → 3E 化）', () => {
		const g = D().GG_Goblin;
		assert.ok(g.hp > 0 && g.hp <= 7, `HP 在 B/X 范围（${g.hp}）`);
		assert.ok(g.stats.ac >= 14 && g.stats.ac <= 16, `AC 合理（${g.stats.ac}）`);
	});

	test('goblin-gully：首领比普通哥布林更强', () => {
		assert.ok(D().GG_Boss.maxHp > D().GG_Goblin.maxHp, 'HP 更高');
		assert.ok(D().GG_Boss.stats.bab > D().GG_Goblin.stats.bab, 'BAB 更高');
		assert.ok(D().GG_Boss.stats.ac > D().GG_Goblin.stats.ac, 'AC 更高');
	});

	test('goblin-gully：水晶雕像数值对齐 B/X（AC 4 → 3E AC 16, 3HD → HP 18）', () => {
		const s = D().GG_CrystalStatue;
		assert.eq(s.stats.ac, 16, 'AC 16');
		assert.ok(s.maxHp >= 15, `HP ≥15（${s.maxHp}）`);
	});

	test('goblin-gully：肉团是最终 BOSS（HP 远超其他怪物）', () => {
		const m = D().GG_Mass;
		assert.ok(m.maxHp >= 30, `HP ≥30（${m.maxHp}）`);
		assert.ok(m.maxHp > D().GG_Boss.maxHp * 2, '是首领的 2 倍以上');
		assert.ok(m.properties.includes('fear-aura'), '有恐惧光环');
	});

	test('goblin-gully：特殊道具已注册', () => {
		// 光耀双手剑
		const sword = new (D().GG_LightSword)();
		assert.eq(sword.slot, 'weapon', '光耀剑是武器');
		assert.ok(sword.stats.light, '有光耀属性');
		// 抗火药水
		const potion = new (D().GG_PotionFire)();
		assert.eq(potion.charges, 1, '抗火药水一次性');
	});

	test('goblin-gully：恐惧豁免机制', () => {
		// 高豁免角色应成功
		const brave = new (R().Character)({ name: '勇士', stats: { save_spells: 20 } });
		const ok = D().save(brave, 'spells', 12);
		assert.ok(ok.success, '高豁免成功');
		// 低豁免角色大概率失败
		const coward = new (R().Character)({ name: '懦夫', stats: { save_spells: -20 } });
		const fail = D().save(coward, 'spells', 12);
		assert.ok(!fail.success, '低豁免失败');
	});

	test('goblin-gully：短弓是远程武器（用灵巧）', () => {
		const bow = new (D().ShortBow)();
		assert.ok(bow.stats.ranged, '是远程武器');
		assert.ok(bow.weapon, '是武器');
	});
})();
