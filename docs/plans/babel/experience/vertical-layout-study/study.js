'use strict';
// Presentation-only state. Never connects to a game, storage, RNG or business APIs.
const $ = (id) => document.getElementById(id);
const dialog = $('panel-dialog');
const labels = {state: '旅人状态', identity: '当前交互对象', map: '河岸路图', bag: '背包'};
let activePanel = null;
let opener = null;
const compact = matchMedia('(max-width: 1040px)');

function restorePanel() {
  if (activePanel) {
    $(activePanel + '-slot').append($(activePanel + '-panel'));
    activePanel = null;
  }
  document.body.classList.remove('modal-open');
  // Resizing back to desktop hides the dock; do not focus its now-hidden button.
  const target = opener && opener.getClientRects().length ? opener : $('reading');
  target.focus({preventScroll: true});
  opener = null;
}
dialog.addEventListener('close', restorePanel);
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.disabled && element.getClientRects().length);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault(); last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
    event.preventDefault(); first.focus();
  }
});
for (const button of document.querySelectorAll('[data-panel]')) {
  button.addEventListener('click', () => {
    if (dialog.open) return;
    opener = button;
    activePanel = button.dataset.panel;
    $('dialog-title').textContent = labels[activePanel];
    $('dialog-content').append($(activePanel + '-panel'));
    document.body.classList.add('modal-open');
    dialog.showModal();
  });
}
compact.addEventListener('change', () => {
  if (!compact.matches && dialog.open) dialog.close();
});

$('art-toggle').addEventListener('change', (event) => {
  document.documentElement.classList.toggle('no-art', !event.target.checked);
});
$('size-toggle').addEventListener('click', (event) => {
  const large = document.body.classList.toggle('large-text');
  event.currentTarget.setAttribute('aria-pressed', String(large));
});
for (const image of document.querySelectorAll('img')) {
  image.addEventListener('error', () => image.classList.add('is-missing'));
  image.addEventListener('load', () => image.classList.remove('is-missing'));
  if (image.complete && image.naturalWidth === 0) image.classList.add('is-missing');
}

const samples = {
  E1: {
    title: '岸边系绳', kicker: '渡舟 · 浅色绳 · 木桩',
    description: '舟绳与河岸劳动的事件意象', image: 'assets/e1-mooring.svg',
    alt: '浅滩上的渡舟、松开的浅色绳、木桩与石上两包干粮',
    caption: '浅滩、渡舟、浅色绳与木桩。画中干粮不表示已经领取。',
    identity: '旧渡口渡工', portrait: 'assets/portrait-ferry-worker.svg',
    portraitAlt: '旧渡口渡工的候选造型：靛青衣布，手持绳圈',
    identityDescription: '用绳圈与靛青衣布辨认职能。默认只显示唯一身份，不再叠姓名。',
    intro: ['一条小渡舟停在浅滩，松开的绳结让船头不断撞岸。渡工一边扶船，一边向你招手。他把两包干粮放在石上，想请你帮忙。', '他指向上游：中间的浅湾没有鳄巢，那里还有备用补给；左侧芦丛却常有鳄兽出没。'],
    choices: ['重新系稳舟绳', '观察船头水势', '告辞，继续上路']
  },
  E2: {
    title: '失落水图', kicker: '石台 · 流图片 · 河岸线',
    description: '散落流图与测水工作的事件意象', image: 'assets/e2-water-chart.svg',
    alt: '河岸石台上散落的流图片与绷带，图纹仅为装饰',
    caption: '石台、流图片与绷带。纸上图纹不是新的出口，绷带不是已领取奖励。',
    identity: '岸台测水者', portrait: 'assets/portrait-water-reader.svg',
    portraitAlt: '岸台测水者的候选造型：赭红肩布，手持流图片',
    identityDescription: '用流图片与赭红肩布辨认职能。候选称谓不新增阵营、关系或法术。',
    intro: ['一位测水者正在石台上拼接被风吹散的流图。同一条河在纸上有几个名字，他却并不争论哪个才正确，只想找出今天仍能通舟的水路。', '他备了绷带作报酬。上游左侧通往有补给的浅湾；右侧沙洲有两头护巢鳄兽。'],
    choices: ['按岸形拼回流图', '找出尚通的水路', '不接委托']
  }
};
$('sample').addEventListener('change', (event) => {
  const sample = samples[event.target.value];
  $('event-title').textContent = sample.title;
  $('event-kicker').textContent = sample.kicker;
  $('event-description').textContent = sample.description;
  $('event-caption').textContent = sample.caption;
  $('event-image').alt = sample.alt;
  $('event-image').src = sample.image;
  $('identity-title').textContent = sample.identity;
  $('identity-description').textContent = sample.identityDescription;
  $('portrait').alt = sample.portraitAlt;
  $('portrait').src = sample.portrait;
  $('narrative').replaceChildren(...sample.intro.map((text) => {
    const paragraph = document.createElement('p'); paragraph.textContent = text; return paragraph;
  }));
  $('choice-list').replaceChildren(...sample.choices.map((text) => {
    const item = document.createElement('li');
    const label = document.createElement('span'); label.textContent = text;
    const note = document.createElement('small'); note.textContent = '行动占位 · 不执行检定或路线';
    item.append(label, note); return item;
  }));
});
// Reveal controls only after handlers are installed. E1 remains readable without JS.
document.documentElement.classList.add('js-ready');
for (const control of document.querySelectorAll('[data-demo-control]')) control.hidden = false;
