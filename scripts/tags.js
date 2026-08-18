// Weapon-shape classification + color/event tag derivation, used by build.js to attach
// filterable tags to each row in the site's data.json.
const { COLOR_JP } = require('./master.js');

function classifyWeaponType(name){
  const n = name.toLowerCase();
  const has = kw => n.includes(kw);
  const word = kw => new RegExp('\\b' + kw + '\\b', 'i').test(n);

  if (has('karambit')) return 'カラムビット';
  if (has('butterfly') || word('balisong')) return 'バタフライナイフ';
  if (has('fanblade') || word('fan')) return '扇';
  if (has('battleaxe') || word('axe')) return 'アックス';
  if (word('dagger') || word('daggers') || word('kunai') || word('stiletto')) return 'ダガー・クナイ';
  if (word('gauntlet') || word('gauntlets') || word('knuckle') || word('knuckles') || word('glove') || word('gloves') || word('fist')) return '拳・グローブ';
  if (word('hammer') || word('mace')) return 'ハンマー・メイス';
  if (word('scythe')) return '鎌';
  if (word('staff') || word('wand') || word('scepter') || word('baton')) return '杖・ロッド';
  if (word('claw')) return '爪';
  if (has('crescent blade') || word('sword') || word('blade') || word('blades') || word('saber') || word('foil')) return 'ソード・ブレード';
  if (has('baseball bat') || word('bat') || word('crowbar')) return 'バット・棒';
  if (word('knife')) return 'ナイフ';
  return 'その他';
}

function colorLabel(part){
  return (COLOR_JP[part] && COLOR_JP[part][0]) || part;
}

// entry.variants holds wiki color names, possibly compound ("Red/Green" -> ['Red','Green']).
function colorTagsOf(entry){
  const set = new Set();
  (entry.variants || []).forEach(v => {
    v.split('/').forEach(part => set.add(colorLabel(part.trim())));
  });
  return Array.from(set);
}

function eventTagOf(entry, limitedSet){
  if (/^Champions \d{4}$/.test(entry.c)) return 'Champions';
  if (/^VCT/.test(entry.c)) return 'VCT';
  if (limitedSet.has(entry.c)) return '期間限定';
  return null;
}

module.exports = { classifyWeaponType, colorTagsOf, eventTagOf };
