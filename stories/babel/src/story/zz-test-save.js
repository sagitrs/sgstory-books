/* 巴别之井 · **测试档**（命名空间 `babelTest/`）—— `books#413`（A2）S3
 *
 * ## 依据
 *   · A1 裁 2／3／6：测试档走**独立命名空间**与**真实读写路由**；✗ 写正式 `Save.slots`；
 *     正式档 UI／导入**不得**误收；**活动控制面 ✗ 入档**，**历史复现记录可入档**。
 *   · A2 裁 3：前缀取 **`babelTest/`**；「实际键、索引、模式类型和版本需**一致检查**」。
 *
 * ## 通道为什么是独立存储键（✗ 正式槽）
 *   宿主正式档＝SugarCube 的槽（`Save.slots`）＋ `State.variables` 载荷。若把测试档写进**同一载荷**
 *   ⇒ 正式存档里就混进了测试事实（裁 6 明文禁）；若占用 `Save.slots` 的槽号 ⇒ 正式档面板／导入**必看得到**。
 *   故本档用**另一条存储键**：`localStorage`（键前缀 `babelTest/`）——
 *   ⇒ 正式档 UI／导入**天然**看不到它（那两处只读 `Save.slots`）✓，而它仍是**真实**序列化通路（JSON 往返）✓。
 *   ⚠ 这是**新增的宿主触点**（故事侧首次使用 `localStorage`）：须在 D/T 面如实登记 ✓。
 *
 * ## 键形与值形（候选 schema，**候裁**）
 *   `babelTest/<模式>/<版本>/<场次 id>`   例：`babelTest/测试局/1/s-0001`
 *   值：`{ 模式: '测试局', 版本: 1, 场次: { id, 建立 }, 事实: {...}, 历史: [...] }`
 *   · **模式**：字面量 `'测试局'`（✗ 与正式局同形）——读取时**逐字校验**；
 *   · **版本**：整数，现为 `1`——不认的版本 ⇒ **具名拒**（✗ 静默当旧档）；
 *   · **场次 id**：由故事侧**消费者层**给稳定身份（裁 4；✗ 自增／✗ 时间戳／✗ DOM）。
 *
 * ## 白名单（裁 3 的落实手段）
 *   `保存` **✗ 全量 dump**：只取白名单里的字段（`事实`／`历史`）。故「未消费骰面／额度／指定事件指令／
 *   入口标记／输入队列／订阅」这些**活动控制面**即使被塞进场次对象，也**进不了档** ✓（判据按此钉）。
 *
 * ## ✗ 本档不做什么
 *   ✗ 不裁决正式档的读写（那是引擎 `80-save.js` 与宿主的事）；✗ 不建会话（那是 `zz-test-mode.js`）；
 *   ✗ 不猜场次内容（白名单外的键直接丢弃并**计数上报**，✗ 静默吞）。
 */
(function () {
	'use strict';

	const 前缀 = 'babelTest/';
	const 模式 = '测试局';
	const 版本 = 1;
	/** 入档**白名单**（裁 3：只有「事实」与「历史记录」可入档；其余一律丢弃）。 */
	const 白名单 = ['事实', '历史'];
	/** 活动控制面**点名**（丢弃时计数上报用；✗ 入档）。 */
	const 活动面 = ['骰面', '额度', '指令', '入口标记', '输入队列', '订阅', '活动控制'];

	/** ★存储句柄**惰性**解析（✗ 装载期冻结）：宿主可能在装载后才给出（无头装置先装桩 ⇒ 也看得见 ✓）；
	 *  取值本身可能抛（隐私模式）⇒ 包 try。只探**能力**，✗ 写探针（写探针会在正式库里留垃圾）。 */
	const 库 = () => {
		try {
			const L = globalThis.localStorage;
			return L && typeof L.getItem === 'function' && typeof L.setItem === 'function' ? L : null;
		} catch { return null; }
	};

	/** 键形：`babelTest/<模式>/<版本>/<场次 id>`（唯一处，✗ 调用方各拼一份）。 */
	const 键形 = (场次id) => `${前缀}${模式}/${版本}/${String(场次id)}`;
	/** 本命名空间下的**全部**键（列出用；✗ 碰其它前缀）。 */
	const 全部键 = () => {
		const 出 = [];
		const L = 库();
		if (!L) return [];
		for (let i = 0; i < L.length; i++) {
			const k = L.key(i);
			if (typeof k === 'string' && k.startsWith(前缀)) 出.push(k);
		}
		return 出.sort();
	};

	/** 具名拒（与全仓同形：带 `code` 的 Error，✗ 静默回退）。 */
	const 拒 = (code, msg, extra) => Object.assign(new Error(msg), { code }, extra ? { detail: extra } : {});
	/** 可用性：无宿主存储 ⇒ `false`（✗ 假装有档 —— 调用方须据此显示「不可用」）。 */
	const 可用 = () => !!库();

	/**
	 * 保存一个场次（**白名单**取字段）。
	 * @param {{id: string, 事实?: object, 历史?: object[]}} 场次
	 * @returns {{ok: boolean, 键?: string, 丢弃?: string[], reason?: string}}
	 */
	function 保存(场次) {
		const L = 库();
		if (!L) return { ok: false, reason: '无宿主存储（localStorage 不可用）⇒ 测试档不可用' };
		if (!场次 || typeof 场次.id !== 'string' || 场次.id === '') {
			throw 拒('TEST_SAVE_BAD_SESSION', '测试档：保存需要**非空字符串**的场次 `id`（稳定身份由消费者层给）');
		}
		const 丢 = Object.keys(场次).filter((k) => !白名单.includes(k) && k !== 'id');
		const 值 = { 模式, 版本, 场次: { id: 场次.id } };
		for (const k of 白名单) if (场次[k] !== undefined) 值[k] = 场次[k];
		const 键 = 键形(场次.id);
		try {
			L.setItem(键, JSON.stringify(值));
		} catch (e) {
			return { ok: false, reason: `写入失败：${e?.message ?? e}` };
		}
		return { ok: true, 键, 丢弃: 丢.sort() };
	}

	/**
	 * 读取一个场次（**模式／版本逐字校验**；✗ 坏档静默当正式档）。
	 * @returns {{ok: boolean, 事实?: object, 历史?: object[], 键?: string, reason?: string, code?: string}}
	 */
	function 读取(场次id) {
		const L = 库();
		if (!L) return { ok: false, reason: '无宿主存储 ⇒ 测试档不可用', code: 'TEST_SAVE_UNAVAILABLE' };
		const 键 = 键形(场次id);
		let 原;
		try { 原 = L.getItem(键); } catch (e) { return { ok: false, reason: `读取失败：${e?.message ?? e}`, code: 'TEST_SAVE_READ_FAIL' }; }
		if (原 == null) return { ok: false, reason: `无此测试档：${String(场次id)}`, code: 'TEST_SAVE_MISSING' };
		let 值;
		try { 值 = JSON.parse(原); } catch { return { ok: false, reason: '档案不是合法 JSON（坏档）', code: 'TEST_SAVE_CORRUPT' }; }
		if (!值 || 值.模式 !== 模式) return { ok: false, reason: `档案模式不是「${模式}」（读到 ${JSON.stringify(值?.模式)}）⇒ ✗ 当正式档恢复`, code: 'TEST_SAVE_WRONG_MODE' };
		if (值.版本 !== 版本) return { ok: false, reason: `档案版本 ${JSON.stringify(值.版本)} ✗ 现版 ${版本}（✗ 静默按旧档读）`, code: 'TEST_SAVE_WRONG_VERSION' };
		/* ★只在**通过校验后**取白名单字段（✗ 把整包递出去 —— 那等于把控制面还给调用方）。 */
		const 出 = { ok: true, 键 };
		for (const k of 白名单) if (值[k] !== undefined) 出[k] = 值[k];
		return 出;
	}

	/** 列出本命名空间下的场次 id（按键序；✗ 读别的前缀）。 */
	function 列出() {
		return 全部键().map((k) => k.slice(键形('').length)).sort();
	}

	/** 删除（✗ 存在也算成功；返回是否真删）。 */
	function 删除(场次id) {
		const L = 库();
		if (!L) return false;
		const 键 = 键形(场次id);
		if (L.getItem(键) == null) return false;
		L.removeItem(键);
		return true;
	}

	setup.BABEL = setup.BABEL ?? {};
	setup.BABEL.测试档 = { 前缀, 模式, 版本, 白名单, 活动面, 键形, 保存, 读取, 列出, 删除, 可用 };
})();
