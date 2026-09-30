/* 哥布林溪谷 —— 世界地图（12 个区域，模组原文翻译为引擎数据）
 * 模组：Dyson Logos "Goblin Gully" (2009)
 * 布局：峡谷剖面图，从入口(1)到深坑(12)，
 *        桥(5)连接东西两侧，秘密房间(9/10)需条件解锁。
 */

const DND3 = setup.DND3;
const R = setup.RPG;

const map = new R.WorldMap({ id: 'goblin-gully' });

/* ---------- 位置 ---------- */

map.addLocation(new R.Location({
	id: 'entrance', name: '溪谷入口',
	desc: () => `一棵巨大的老树盘根错节地堵住了峡谷入口，树冠遮天蔽日。` +
		`${DND3.GG_Goblin.hp > 0 ? '你隐约看到树上有两个矮小的身影在张望。' : '树上的哨位已经空了。'}`,
	actions: [
		{
			text: '进入峡谷',
			action: () => R.perform('你拨开藤蔓，从树根间的缝隙钻入峡谷。'),
		},
	],
}));

map.addLocation(new R.Location({
	id: 'antechamber', name: '前厅',
	desc: '一个空荡荡的岩石洞穴，壁上有火把烧过的痕迹。哥布林显然用它做通道。',
}));

map.addLocation(new R.Location({
	id: 'grand-hall', name: '大厅',
	desc: () => `四十英尺宽的大厅，两侧立着粗石柱。` +
		`${DND3.GG_Goblin.hp > 0 ? '四只哥布林正在里面巡逻！' : '战斗的痕迹还在，但哥布林已经不在了。'}`,
	actions: [
		{
			text: '与哥布林战斗',
			when: () => DND3.GG_Goblin.hp > 0,
			action: () => SugarCube.Engine.play('大厅战斗'),
		},
	],
}));

map.addLocation(new R.Location({
	id: 'bridge-room', name: '西侧桥室',
	desc: () => `从这里可以俯瞰大厅。${DND3.GG_Archer.hp > 0 ? '两只哥布林弓手正搭箭瞄准！' : '弓手的哨位空了，地上散落着箭矢。'}`,
	actions: [
		{
			text: '与弓手战斗',
			when: () => DND3.GG_Archer.hp > 0,
			action: () => SugarCube.Engine.play('弓手战斗'),
		},
	],
}));

map.addLocation(new R.Location({
	id: 'bridge', name: '绳桥',
	desc: '哥布林用绳索和木板搭的桥横跨峡谷，支撑是古老的雕石刻柱。桥面窄得只能单人通行。',
}));

map.addLocation(new R.Location({
	id: 'gully-floor', name: '谷底',
	desc: () => `溪水潺潺流过谷底，芦苇丛中隐约可见一具少年男性的骸骨——` +
		`失踪两年的镇上男孩，被朋友从这里推了下去。`,
	actions: [
		{
			text: '搜索骸骨',
			when: () => !State.variables.searchedBody,
			action: () => {
				State.variables.searchedBody = true;
				R.perform('骸骨上没有什么值钱的东西，但你找到了一枚刻着名字的铜戒指——可以还给镇上的家人。');
			},
		},
	],
}));

map.addLocation(new R.Location({
	id: 'empty-chamber', name: '空室',
	desc: () => `表面空无一物的房间。${DND3.GG_Boss.hp > 0 ? '你隐约听到隔壁有动静——有哥布林在监视这里。' : ''}`,
}));

map.addLocation(new R.Location({
	id: 'boss-room', name: '首领房间',
	desc: () => `${DND3.GG_Boss.hp > 0
		? '四只哥布林和它们的首领——一只格外壮硕、满身伤疤的大家伙——正在里面！'
		: '哥布林首领的房间已经安静了。隔壁的私室里有Erhurr家的衣物和一堆财宝。'}`,
	actions: [
		{
			text: '挑战哥布林首领',
			when: () => DND3.GG_Boss.hp > 0,
			action: () => SugarCube.Engine.play('首领战斗'),
		},
		{
			text: '搜刮首领私室',
			when: () => DND3.GG_Boss.isDown && !State.variables.lootedBoss,
			action: () => {
				State.variables.lootedBoss = true;
				R.give('gg-electrum');
				R.give('gg-scroll-bless');
				R.give('gg-potion-fire');
				R.perform('你在私室里找到了：琥珀金币、祝福卷轴、抗火药水，以及Erhurr家的衣物。');
			},
		},
	],
}));

map.addLocation(new R.Location({
	id: 'secret-chamber', name: '秘密房间',
	desc: () => `尘封的秘密房间。两具精灵骷髅靠墙而坐，身穿生锈链甲，` +
		`手中的双手剑仍然散发着柔和的持续光芒。`,
	actions: [
		{
			text: '取走光耀双手剑',
			when: () => !State.variables.tookSwords,
			action: () => {
				State.variables.tookSwords = true;
				R.give('gg-light-sword');
				R.perform('你从骷髅手中取出了光耀双手剑。剑刃的光芒足以照亮整个房间。');
			},
		},
	],
}));

map.addLocation(new R.Location({
	id: 'secret-storage', name: '秘密储藏室',
	desc: () => `架子上摆满桶装的古旧箭矢（早已朽坏），墙上挂着残破的弓和剑。` +
		`${DND3.GG_CrystalStatue.hp > 0 ? '房间深处，一座水晶精灵雕像正注视着你。' : '水晶雕像的碎片散落一地。'}`,
	actions: [
		{
			text: '翻找储藏架',
			when: () => DND3.GG_CrystalStatue.hp > 0,
			action: () => {
				R.perform('你刚碰了一下储藏架，水晶雕像突然动了——它活了！');
				SugarCube.Engine.play('雕像战斗');
			},
		},
	],
}));

map.addLocation(new R.Location({
	id: 'barracks', name: '兵营',
	desc: () => `螺旋楼梯底部的兵营，六只哥布林住在这里。` +
		`${DND3.GG_Goblin.hp > 0 ? '它们随时可能冲上来！' : '哥布林已经被清剿了。'}`,
	actions: [
		{
			text: '与兵营哥布林战斗',
			when: () => DND3.GG_Goblin.hp > 0,
			action: () => SugarCube.Engine.play('兵营战斗'),
		},
	],
}));

map.addLocation(new R.Location({
	id: 'the-pit', name: '深坑',
	desc: () => `螺旋楼梯通往深坑底部，五十英尺下方是浑浊的死水。` +
		`一扇粗重的铁门${State.variables.pitDoorBarred ? '从这一侧闩着' : '已经打开'}。` +
		`${State.variables.massReleased ? '门后传来令人作呕的咕噜声……' : ''}`,
	actions: [
		{
			text: '打开铁门（冒险）',
			when: () => State.variables.pitDoorBarred,
			action: () => SugarCube.Engine.play('深坑遭遇'),
		},
	],
}));

/* ---------- 出口 ---------- */

// 入口 → 前厅
map.addPath({ from: 'entrance', to: 'antechamber', text: '进入前厅' });
map.addPath({ from: 'antechamber', to: 'entrance', text: '退回入口' });

// 前厅 → 大厅
map.addPath({ from: 'antechamber', to: 'grand-hall', text: '进入大厅' });
map.addPath({ from: 'grand-hall', to: 'antechamber', text: '退回前厅' });

// 大厅 → 西侧桥室（需爬过恶魔浮雕嘴）
map.addPath({
	from: 'grand-hall', to: 'bridge-room',
	text: '爬过恶魔浮雕嘴进入桥室',
});
map.addPath({ from: 'bridge-room', to: 'grand-hall', text: '爬回大厅' });

// 桥室 → 桥
map.addPath({ from: 'bridge-room', to: 'bridge', text: '走上绳桥' });
map.addPath({ from: 'bridge', to: 'bridge-room', text: '退回桥室' });

// 桥 → 空室（东侧）
map.addPath({ from: 'bridge', to: 'empty-chamber', text: '走过桥到东侧' });
map.addPath({ from: 'empty-chamber', to: 'bridge', text: '退回桥上' });

// 桥 → 谷底（需要攀爬或绳索）
map.addPath({
	from: 'bridge', to: 'gully-floor',
	text: '从桥上爬下谷底',
	action: () => R.perform('你抓住石柱上的雕花缝隙，小心地爬下谷底。'),
});
map.addPath({
	from: 'gully-floor', to: 'bridge',
	text: '爬回桥上',
	action: () => R.perform('你费力地爬回桥面。'),
});

// 空室 → 首领房间
map.addPath({ from: 'empty-chamber', to: 'boss-room', text: '进入首领房间' });
map.addPath({ from: 'boss-room', to: 'empty-chamber', text: '退回空室' });

// 首领房间 → 秘密房间（需发现秘密门 + 陷阱豁免）
map.addPath({
	from: 'boss-room', to: 'secret-chamber',
	text: '推开秘密门',
	when: () => !State.variables.secretDoorFound,
	action: () => {
		State.variables.secretDoorFound = true;
		// 陷阱：推开数秒后巨石落下，豁免石化或受 1d10
		const ok = DND3.checkSave(DND3.Player, 'petrification', 13, '巨石陷阱');
		if (!ok) {
			const dmg = R.roll('1d10');
			DND3.Player.damage(dmg);
			R.perform(`巨石砸落！你没有及时跳开——受到 ${dmg} 点伤害！`);
		} else {
			R.perform('巨石砸落！你及时跳进了房间。');
		}
	},
});
map.addPath({ from: 'secret-chamber', to: 'boss-room', text: '回到首领房间' });

// 秘密房间 → 秘密储藏室
map.addPath({ from: 'secret-chamber', to: 'secret-storage', text: '进入储藏室' });
map.addPath({ from: 'secret-storage', to: 'secret-chamber', text: '回到秘密房间' });

// 首领房间 → 兵营（螺旋楼梯）
map.addPath({ from: 'boss-room', to: 'barracks', text: '走下螺旋楼梯' });
map.addPath({ from: 'barracks', to: 'boss-room', text: '爬上楼梯' });

// 兵营 → 深坑（铁门可视但需打开才能进入）
map.addPath({ from: 'barracks', to: 'the-pit', text: '走向深坑铁门' });
map.addPath({ from: 'the-pit', to: 'barracks', text: '退回兵营' });

/* ---------- 校验 ---------- */

const problems = [...map.validate(), ...map.validateConnectivity('entrance')];
if (problems.length > 0) {
	console.error('[goblin-gully] 地图校验问题：', problems);
}

/* ---------- 注册 ---------- */

setup.GG_MAP = map;
R.registerScene(new R.MapScene({ id: 'explore', title: '哥布林溪谷', map, start: 'entrance' }));
