// Derives a Japanese display name for a skin from its own posted video title(s), so the site
// can show the name the channel actually uses instead of only the English Wiki name.
const WS = '[\\s\\u3000]*';

// Leading tag the channel prefixes almost every video with, e.g. "【VALORANT ナイフ動画】".
const LEADING_TAG = /^【[^】]*】\s*/;

// Trailing tokens that identify *which* upgrade/variant the video shows, stripped so what's
// left is just the skin's own name. Order matters: strip from the end repeatedly since some
// titles stack more than one (e.g. "... LEVEL 1 ベース").
const TRAILING_PATTERNS = [
  new RegExp(WS + 'LEVEL' + WS + '\\d+' + WS + '$', 'i'),
  new RegExp(WS + 'ベース' + WS + '$'),
  new RegExp(WS + 'VFX' + WS + '$', 'i'),
  new RegExp(WS + 'アニメーション' + WS + '$'),
  new RegExp(WS + '変化\\/?Transformation' + WS + '$', 'i'),
  new RegExp(WS + '変化' + WS + '$'),
  new RegExp(WS + 'チャンピオンオーラ' + WS + '$'),
  new RegExp(WS + 'サウンドエフェクト' + WS + '$'),
  new RegExp(WS + 'ソングシャッフル' + WS + '$'),
  new RegExp(WS + 'ランダマイザー' + WS + '$'),
  // "... バトルパスLv.50" and everything after it (episode/act tags trail the skin name).
  new RegExp(WS + 'バトルパスLv\\.?\\d*' + WS + '.*$', 'i'),
  new RegExp('【[^】]*】\\s*$'), // trailing bracket tags like 【EP9 ACT1】
  // A trailing "ヴァリアント N 色" (or just "N 色") — last-resort, only used on fallback titles.
  new RegExp(WS + 'ヴァリアント' + WS + '\\d*' + WS + '\\S*' + WS + '$'),
];

// "LEVEL1 ベース" / "LEVEL 2 VFX" / "LEVEL 2 アニメーション" read as one unambiguous unit even
// when something else (an artist credit, a bracket tag) trails after them mid-title.
const MID_LEVEL_STATE = new RegExp('LEVEL' + WS + '\\d+' + WS + '(ベース|VFX|アニメーション)?', 'gi');

function cleanTitle(raw){
  let s = raw.replace(LEADING_TAG, '').replace(MID_LEVEL_STATE, '').trim();
  let changed = true;
  let guard = 0;
  while (changed && guard < 10) {
    changed = false;
    guard++;
    for (const pat of TRAILING_PATTERNS) {
      const next = s.replace(pat, '').trim();
      if (next !== s && next.length > 0) { s = next; changed = true; }
    }
  }
  return s.replace(/[\s　]+/g, ' ').trim();
}

// results: the row's [{label, matched, t, id, ...}] array. Prefers the base video's title
// (usually the cleanest), then falls back to any other matched item.
function jpNameOf(results){
  const base = results.find(x => x.matched && x.label === 'ベース/無印');
  const anyMatched = results.find(x => x.matched);
  const source = base || anyMatched;
  if (!source) return null;
  const cleaned = cleanTitle(source.matchedTitle);
  return cleaned || null;
}

module.exports = { jpNameOf, cleanTitle };
