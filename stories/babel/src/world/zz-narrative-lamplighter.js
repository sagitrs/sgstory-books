/* books#599：现有普通塔旁支的一条因果链；不改教程、主路门或城市价格。
 * 数学、库存原语、身份、战果和保存全部复用引擎；此处只有故事编排。
 * 范围是本局本图固定的 L11 伤者／L12 守路人，不宣称通用跨世界或跨局记忆。
 */
(() => {
	const R = setup.RPG, D = setup.DND3, B = setup.BABEL, C = setup.BABEL_CONTENT.搬运队;
	const key = 'babelLamplighter', tokenId = 'lamplighter-clasp', origin = 'babel:lamplighter:L11:v1';
	const places = Object.freeze({ wounded: 'L11-lamplighter', guard: 'L12-lamplighter-guard', room: 'L12-lamplighter-room', city: 'L10-camp' });
	// house rule（非 SRD）：旁支固定一人、8 回合预算、粮 1／储备绷带 1；候选内容参数。
	const roundLimit = 8;
	const vars = () => State.variables;
	const read = () => vars()[key] ?? null; // 所有读面均不建域、不发号、不抽骰。
	const initial = () => ({ version: 1, stage: 'unseen', guard: 'unmet', token: null, foes: null, claimed: false, reported: null, revision: 0 });
	const alive = () => D.Player.hp > 0 && !D.Player.isDown && !D.Player.contains('death') && !vars().babelRun?.终局;
	const at = (place) => alive() && !B.战中 && B.map.current === place && B.运行?.取?.()?.场次id == null;
	const say = (text) => R.perform(text, { channel: 'map-scene' });
	const reject = (code, text) => { R.perform(text, { channel: 'travel-refuse' }); return { ok: false, code }; };
	const copy = (x) => JSON.parse(JSON.stringify(x));

	R.defItem({ id: tokenId, name: C.扣环名, desc: C.扣环说明, charges: null, stackable: false,
		stats: { noBattleUse: true },
		used() { throw R.refuse('LAMPLIGHTER_NO_BATTLE_USE', C.不能使用); },
	}); // 不在城市收购目录，无虚假的 noSell 字段；无被动属性或装备加成。
	R.save.declareDomain(key, 'byPack');

	/* commitBoundary 要活事实，不能传一个普通副本后谎称提交了。
	 * 这里的窄适配器是有访问器的纯对象：每次读取都取当前 State，写入直达真实库存／故事域。
	 * preview/commit 传同一个适配器；并无第二份库存或保存接口。
	 * 计划里的扣粮／投递仅用共享 withdraw/deposit；事实与库存统一交给引擎边界提交、回滚。
	 * toJSON 兼容已有测试/旧路径里暂时还原成 Item 的条目；正式库存本来就是纯快照。
	 */
	const change = (step, apply) => {
		const live = {};
		Object.defineProperties(live, {
			inventory: { enumerable: true,
				get: () => D.Player.items.map((s) => copy(s.toJSON ? s.toJSON() : s)),
				set: (v) => { D.Player.items = v; } },
			story: { enumerable: true, get: read,
				set: (v) => { if (v == null) delete vars()[key]; else vars()[key] = v; } },
		});
		const beforeBag = live.inventory;
		const preview = R.commitBoundary.preview({
			request: `${origin}:${step}:${read()?.revision ?? 0}`, facts: live,
			apply: (draft) => {
				draft.story ??= initial();
				apply(draft.story, draft.inventory);
				draft.story.revision += 1;
			},
		});
		if (preview.status !== 'previewed') return reject(preview.code, preview.code === 'LAMPLIGHTER_NO_RATION' ? C.补给不足 : C.交付失败);
		const result = R.commitBoundary.commit(preview.ticket, { facts: live });
		if (result.status !== 'applied') return reject(result.code ?? 'LAMPLIGHTER_COMMIT_FAILED', C.交付失败);
		// 通知只能在真提交后发；不把库存写入放进只负责演出的 publish 回调。
		const afterBag = live.inventory;
		for (const id of new Set([...beforeBag, ...afterBag].map((x) => x.id))) {
			if (JSON.stringify(beforeBag.filter((x) => x.id === id)) !== JSON.stringify(afterBag.filter((x) => x.id === id)))
				R.events.emit('inventory:changed', { id, actor: D.Player });
		}
		R.refreshPanels?.();
		return { ok: true };
	};
	const discover = () => {
		if (!at(places.wounded)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read() && read().stage !== 'unseen') return { ok: true, reused: true };
		return change('discover', (s) => { s.stage = 'seen'; });
	};
	const feed = (supply = 'ration') => {
		if (!['ration', 'herb-poultice'].includes(supply)) return reject('LAMPLIGHTER_BAD_SUPPLY', C.阶段拒绝);
		if (!at(places.wounded)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read()?.stage !== 'seen') return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		const r = change('feed', (s, bag) => {
			if (!R.withdraw(bag, supply, 1)) throw R.refuse('LAMPLIGHTER_NO_RATION', C.补给不足);
			s.stage = 'fed';
			s.suppliedWith = supply;
		});
		if (r.ok) say(C.已递粮);
		return r;
	};
	const rescue = () => {
		if (!at(places.wounded)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read()?.stage !== 'fed') return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		const r = change('rescue', (s, bag) => {
			const n = bag.length;
			if (R.deposit(bag, tokenId, 1) !== 1 || bag.length !== n + 1 || !bag[n].entityId)
				throw R.refuse('LAMPLIGHTER_DELIVERY', C.交付失败);
			bag[n].state = { ...bag[n].state, origin };
			s.token = bag[n].entityId;
			s.stage = 'rescued';
		});
		if (r.ok) { say(C.救出); say(C.交环); }
		return r;
	};
	const decline = () => {
		if (!at(places.wounded)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read()?.stage !== 'seen') return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		const r = change('decline', (s) => { s.stage = 'declined'; });
		if (r.ok) say(C.已拒绝);
		return r;
	};
	const hasProof = () => {
		const s = read();
		return s?.stage === 'rescued' && typeof s.token === 'string' && D.Player.items.some((x) =>
			x.id === tokenId && x.entityId === s.token && x.state?.origin === origin);
	};
	const pass = () => {
		if (!at(places.guard)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read() && read().guard !== 'unmet') return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		if (!hasProof()) return reject('LAMPLIGHTER_NO_PROOF', C.信物拒绝);
		const r = change('pass', (s) => { s.guard = 'passed'; });
		if (r.ok) say(C.和平通过);
		return r;
	};
	const open = () => ['passed', 'defeated'].includes(read()?.guard);
	const claim = () => {
		if (!at(places.room) || !open()) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (read()?.claimed) return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		const r = change('claim', (s, bag) => {
			if (!(R.deposit(bag, 'bandage', 1) > 0)) throw R.refuse('LAMPLIGHTER_DELIVERY', C.交付失败);
			s.claimed = true;
		});
		if (r.ok) say(C.取后);
		return r;
	};
	const reply = () => {
		const s = read();
		if (s?.stage === 'rescued') return s.guard === 'defeated' ? C.共炉冲突 : s.guard === 'passed' ? C.共炉和平 : C.共炉救助;
		if (s?.guard === 'defeated') return C.共炉未救冲突;
		return s?.stage === 'fed' ? C.共炉只递粮 : s?.stage === 'declined' ? C.共炉拒绝 : s?.stage === 'unseen' ? C.共炉未见 : C.共炉无救助;
	};
	const report = () => {
		if (!at(places.city) || !read()) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		const s = read(), news = { stage: s.stage, guard: s.guard };
		if (JSON.stringify(s.reported) === JSON.stringify(news)) { say(reply()); return { ok: true, reused: true }; }
		const r = change('report', (draft) => { draft.reported = news; });
		if (r.ok) say(reply());
		return r;
	};

	// 单一固定敌人：复用普通塔成军、引擎 Battle 与故事既有战果投影；不改 goblin 注册定义。
	// 对手的快照留在本旁支里。僵持后续战恢复同一实体和伤势，不重抽/不复活；非胜不开放储备。
	const fight = async ({ interactive = true } = {}) => {
		if (!at(places.guard)) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		if (open()) return reject('LAMPLIGHTER_STAGE', C.阶段拒绝);
		if (!read()?.foes) {
			const f = B.成军([{ ref: 'goblin', elite: false }])[0];
			f.name = C.守路人;
			delete f.entityId; R.unitId.of(f); // 为这个现场实例发号，不复制模板/别场对手身份。
			f.items = f.items.filter((x) => x.equipped === true); // 储备在屋内一次取；无随机散货或币。
			const r = change('fight-start', (s) => { s.guard = 'fighting'; s.foes = [f.toJSON()]; });
			if (!r.ok) return r;
		}
		const anchor = read(), state = vars(), foes = anchor.foes.map((x) => R.Character.revive(copy(x)));
		B.战中 = true;
		globalThis.document?.body?.classList?.add('战中');
		R.refreshPanels?.();
		let battle;
		try {
			battle = new R.Battle(roundLimit, [D.Player], foes, interactive);
			await battle.execute();
		} catch (error) {
			// 已执行的伤害不能因后续异常而被“换满血对手”抹去；旧场次不能写进新状态。
			if (vars() === state && read() === anchor && B.map.current === places.guard) {
				anchor.foes = foes.map((x) => x.toJSON()); anchor.revision += 1;
				B.记血?.();
			}
			throw error; // 真实异常仍响亮上抛，不伪造胜利或发奖。
		} finally {
			B.战中 = false;
			globalThis.document?.body?.classList?.remove('战中');
			R.refreshPanels?.();
		}
		if (vars() !== state || read() !== anchor || B.map.current !== places.guard)
			return { ok: false, code: 'LAMPLIGHTER_STALE_BATTLE' };
		const outcome = B.战果({ foes, player: D.Player, 战斗: battle });
		if (outcome === 'down') { B.结算战败({ 源: '搬运旧道', 层: 'L12' }); return { ok: true, outcome }; }
		// 战斗已在引擎中产生伤势；不能因后续记账失败把对手的血量回滚。
		// 这里只保存执行后的角色快照和战果（无收费、发奖或随机层进度）。
		anchor.foes = foes.map((x) => x.toJSON());
		anchor.revision += 1;
		if (outcome === 'victory') {
			anchor.guard = 'defeated';
			B.本局账().kills += foes.length;
		}
		say(outcome === 'victory' ? C.战斗胜 : C.战斗未胜);
		B.记血?.(); R.refreshPanels?.();
		return { ok: true, outcome };
	};
	// MapScene 不等 async 动作：确认与战斗须离开地图，所有选择在真实 choice 内等待。
	const guardMenu = async () => {
		if (!at(places.guard) || open()) return reject('LAMPLIGHTER_WRONG_PLACE', C.地点拒绝);
		const passage = State.passage, state = vars();
		say(C.开战确认);
		const value = await R.choice([{ text: read()?.foes ? C.续战 : C.开战, value: 'fight' }, { text: C.退旧道, value: 'leave' }]);
		if (State.passage !== passage || vars() !== state || !at(places.guard)) return false;
		if (value === 'leave') { SugarCube.Engine.play('探索'); return true; }
		if (value !== 'fight') return false;
		await fight();
		if (State.passage === passage && vars() === state && alive()) {
			await R.choice([{ text: C.退旧道, value: 'leave' }]);
			if (State.passage === passage && vars() === state && alive()) SugarCube.Engine.play('探索');
		}
	};
	const woundedDesc = () => {
		const s = read();
		return s?.stage === 'rescued' ? C.已救 : s?.stage === 'fed' ? C.已递粮 : s?.stage === 'declined' ? C.已拒绝 : `${C.发现}\n${C.请求}\n${C.成本}`;
	};
	const guardDesc = () => read()?.guard === 'passed' ? C.通过摘要 : read()?.guard === 'defeated' ? C.战胜摘要 : `${C.守路正文}\n${C.守路说明}`;
	const add = (id, name, desc, actions, onEnter = null) => B.map.addLocation(new R.Location({ id, name, desc, actions, onEnter }));
	const action = (text, place, fn, when = () => true) => ({ text, when: () => at(place) && when(), action: fn });
	const path = (from, to, text, condition = () => true) => B.map.addPath({ from, to, text, when: () => at(from) && condition() });
	add(places.wounded, C.伤者名, woundedDesc, [
		action(C.递粮, places.wounded, () => feed('ration'), () => read()?.stage === 'seen'),
		action(C.敷料, places.wounded, () => feed('herb-poultice'), () => read()?.stage === 'seen'),
		action(C.扶离, places.wounded, rescue, () => read()?.stage === 'fed'),
		action(C.拒绝, places.wounded, decline, () => read()?.stage === 'seen'),
	], discover);
	add(places.guard, C.守路名, guardDesc, [
		action(C.出示, places.guard, pass, () => !read() || read().guard === 'unmet'),
		action(C.开战入口, places.guard, () => SugarCube.Engine.play('搬运旧道应战'), () => !open()),
	]);
	add(places.room, C.旧室名, () => read()?.claimed ? C.储备已取 : C.旧室, [
		action(C.取绷带, places.room, claim, () => open() && !read()?.claimed),
	]);
	path('L11', places.wounded, C.发现入口);
	path(places.wounded, 'L11', C.回矿道);
	path('L12', places.guard, C.守路入口);
	path(places.guard, 'L12', C.回虫巢);
	path(places.guard, places.room, C.进入旧室, open);
	path(places.room, places.guard, C.回旧道);
	B.map.locations.get(places.city).actions.push(action(C.共炉入口, places.city, report, () => !!read()));
	B.map.validate();
	B.搬运队 = Object.freeze({ key, tokenId, origin, places, roundLimit, read, at, discover, feed, rescue, decline, hasProof, pass, open, claim, reply, report, fight, guardMenu, woundedDesc, guardDesc });
})();
