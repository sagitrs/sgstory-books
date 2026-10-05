/* Babel visual slice (books#311): optional decorative assets, never game actions.
 * Identity maps are presentation-only: items use existing IDs; enemies use their
 * already-visible names (Character snapshots have no template ID). Unknowns stay text.
 */
const B = setup.BABEL ??= {};
const itemAssets = new Map([
	['sword', 'babel-item-sword'], ['coin', 'babel-item-coin'], ['rock', 'babel-item-stone'],
]);
const enemyAssets = new Map([
	['幼獾', 'babel-enemy-cub'], ['獾', 'babel-enemy-badger'], ['精英·獾', 'babel-enemy-badger'],
]);
const sceneAssets = new Map([['L1', 'babel-scene-l1'], ['L2', 'babel-scene-l2']]);

const image = (id, className = '') => {
	if (typeof id !== 'string') return '';
	const asset = setup.storyAssets?.[id];
	if (!asset || !/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+=*$/.test(asset.src ?? '')
		|| !Number.isInteger(asset.width) || asset.width <= 0
		|| !Number.isInteger(asset.height) || asset.height <= 0) return '';
	// Decorative alongside authoritative text; no links, buttons, statistics or event handlers.
	return `<img class="babel-art ${className}" data-babel-asset="${id}" src="${asset.src}" width="${asset.width}" height="${asset.height}" alt="" aria-hidden="true" decoding="async">`;
};
B.visual = Object.freeze({
	itemHTML: (id) => image(itemAssets.get(id), 'babel-item-art'),
	enemyHTML: (actor) => image(enemyAssets.get(actor?.name), 'babel-enemy-art'),
	playerHTML: () => image('babel-player', 'babel-player-art'),
	sceneHTML: () => image(sceneAssets.get(B.map?.current), 'babel-scene-art'),
});

// PassageHeader precedes asynchronous map entry. Use the existing pure panel
// refresh (including Map.moveTo) rather than snapshotting a previous floor there.
setup.RPG.registerPanel('babel-scene-art', {
	name: '环境样张', host: '[data-panel="babel-scene-art"]', render: () => B.visual.sceneHTML(),
});

// Capture image errors (they do not bubble). Only remove the failed decoration;
// text/actions remain, and no domain method is called by loading or failure.
if (typeof document.addEventListener === 'function') {
	document.addEventListener('error', (event) => {
		if (event.target?.matches?.('img.babel-art')) event.target.hidden = true;
	}, true);
}
