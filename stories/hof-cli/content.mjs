// 原创文字与试作数据；行为在 game.mjs，数值依据在 spec.md。
function deepFreeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}
export const GEAR = deepFreeze({
  knife: { name: '短刃', price: 3, slot: 'weapon', value: 1 },
  sabre: { name: '长刀', price: 6, slot: 'weapon', value: 3 },
  coat: { name: '护胸', price: 3, slot: 'armor', value: 1 },
  mail: { name: '鳞甲', price: 6, slot: 'armor', value: 3 },
  bread: { name: '行粮', price: 3, slot: 'food', value: 5 },
  tonic: { name: '回春药', price: 2, slot: 'medicine', value: 6 },
});
export const ENEMIES = deepFreeze({
  rats: { name: '灰沟鼠群', count: 2, endurance: 2, sides: 6, probability: 70 },
  birds: { name: '崖道掠鸟', count: 3, endurance: 1, sides: 4, probability: 65 },
  dogs: { name: '食砂犬', count: 2, endurance: 2, sides: 6, probability: 70 },
  keeper: { name: '失灯守卫', count: 2, endurance: 4, sides: 8, probability: 75 },
});
export const NODES = deepFreeze({
  harbor: { name: '灰港营地', text: '灯塔熄灭了。带上一枚新灯芯，沿山路送到旧塔；在岔路、补给和风险之间自己取舍。', next: ['fork'] },
  fork: { name: '雾中岔路', text: '撑船人指向沼泽，旧矿工指向崖道。潮渠的暗门只有送回过灯芯的人认得。', next: ['marsh', 'cliff', 'canal'] },
  marsh: { name: '芦苇渡口', text: '漂来的粮袋卡在芦苇间。撑船人愿意用铜钱换你的口粮。', next: ['shop'] },
  cliff: { name: '断绳崖道', text: '铜矿就在落石下。取矿伤身；扶绳过崖也免不了擦伤，但能收下引路钱。', next: ['shop'] },
  canal: { name: '潮渠暗门', text: '你认出水线下的旧门，沿无人的潮渠直抵商店。没有额外奖励。', next: ['shop'] },
  shop: { name: '旧桥商店', text: '店主把刀、护甲、行粮和药摆上木桌。护符老客每件少付一枚金币。买下装备就会穿戴，也可换回背包里的旧件。', next: ['ambush'] },
  ambush: { name: '桥下伏击', text: '挡路的群影逼近。此处需打一整场，战后才知道能否继续。', next: ['forktwo'] },
  forktwo: { name: '第二道岔路', text: '林间可以补给或救人；沙地多耗一份粮，但食砂犬旁有遗落的行粮。', next: ['grove', 'dunes'] },
  grove: { name: '倒木林地', text: '干粮挂在倒木边。受伤的守林人请求两份粮，回赠药草与灯祝福。', next: ['shrine'] },
  dunes: { name: '食砂坡', text: '两只食砂犬守着废车。打赢可取回粮袋；花钱绕路不会得到战利品。', next: ['shrine'] },
  shrine: { name: '空灯祠堂', text: '献钱可点起灯祝福。铜像脚下的钱可以拿走，但会引来诅咒。你也可以什么都不取。', next: ['elite'] },
  elite: { name: '失灯守卫', text: '最后的守卫拦在塔门前。这是一整场精英战，不能逐回合换装或用药。', next: ['beacon'] },
  beacon: { name: '旧灯塔', text: '灯芯送到了。点亮塔灯才算通关；离开仍只是撤退。', next: [] },
});
export const UNLOCKS = deepFreeze({ canal: '潮渠捷径', watch: '守夜护符' });
