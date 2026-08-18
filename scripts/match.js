const { STORE, BATTLEPASS, jpColor } = require('./master.js');
const videosRaw = require('./videos.json');

// Collapse runs of whitespace (incl. full-width spaces) to a single space, and lowercase,
// so latin-letter keywords (CN/Pacific/EMEA/...) match regardless of the channel's
// inconsistent capitalization ("PACIFIC" vs "Pacific") and spacing ("PRO  2" vs "PRO 2").
function normalize(s){ return s.replace(/[\s　]+/g,' ').toLowerCase(); }

const videos = videosRaw.map(v => ({ id: v.contentId, orig: v.title, norm: normalize(v.title) }));

function collectionMatches(norm, entry){
  if (entry.jpOr) return entry.jpOr.some(k => norm.includes(normalize(k)));
  return entry.jp.every(k => norm.includes(normalize(k)));
}
function collectionKeywordsForResidual(entry){
  return (entry.jpOr || entry.jp).map(normalize);
}

// Broad acceptance: the channel doesn't consistently use the wiki's exact upgrade-type name
// (e.g. a "Transformation" skin's level-2 video might just say "アニメーション", and some
// "Animation" skins' level-2 video says "VFX" or just "LEVEL2"). Any of these substrings is
// treated as evidence that *a* level-2 upgrade video was posted for that skin.
const LEVEL2_BROAD = ['アニメーション','vfx','level2','level 2','変化','transformation','ランダマイザー','サウンドエフェクト'];

function level2Label(entry){
  if (entry.vfx) return 'VFX';
  if (entry.anim === true) return 'アニメーション';
  return entry.anim; // 'Randomizer' | 'Transformation' | 'Sound Effects'
}

function hasLevel2(entry){ return !!(entry.vfx || entry.anim); }

function buildItems(entry){
  const items = [];
  items.push({ key: 'base', label: 'ベース/無印' });
  if (hasLevel2(entry)) items.push({ key: 'level2', label: level2Label(entry), kw: LEVEL2_BROAD });
  if (entry.aura) items.push({ key: 'aura', label: 'チャンピオンオーラ', kw: ['チャンピオンオーラ'] });
  if (entry.vo) items.push({ key: 'vo', label: 'VO(日本語音声)', kw: ['日本音声','vo(ローカライズ'] });
  if (entry.songShuffle) items.push({ key: 'songShuffle', label: 'ソングシャッフル', kw: ['ソングシャッフル'] });
  (entry.variants || []).forEach(v => {
    items.push({ key: 'variant:' + v, label: 'ヴァリアント: ' + v, kw: jpColor(v) });
  });
  return items;
}

function allSpecialKeywordsNorm(entry){
  const set = new Set();
  if (hasLevel2(entry)) LEVEL2_BROAD.forEach(k=>set.add(normalize(k)));
  if (entry.aura) set.add(normalize('チャンピオンオーラ'));
  if (entry.vo) set.add(normalize('日本音声'));
  if (entry.songShuffle) set.add(normalize('ソングシャッフル'));
  (entry.variants||[]).forEach(v => jpColor(v).forEach(k=>set.add(normalize(k))));
  return Array.from(set);
}

// Remove the entry's own collection/name keywords from a (normalized) title before searching
// for level2/variant keywords, so a collision like "ミストブルーム" containing "ブルー" doesn't
// falsely match the "Blue" variant or falsely exclude the base video.
function residual(norm, entry){
  let r = norm;
  collectionKeywordsForResidual(entry).forEach(k => { r = r.split(k).join(' '); });
  return r;
}

function findMatch(entry, item){
  const candidates = videos.filter(v => collectionMatches(v.norm, entry));
  if (item.key === 'base') {
    const special = allSpecialKeywordsNorm(entry);
    return candidates.find(v => !special.some(k => residual(v.norm, entry).includes(k)));
  }
  return candidates.find(v => item.kw.some(k => residual(v.norm, entry).includes(normalize(k))));
}

function process(list, sectionName){
  const rows = [];
  list.forEach(entry => {
    const items = buildItems(entry);
    const results = items.map(item => {
      const m = findMatch(entry, item);
      return { ...item, matched: !!m, matchedTitle: m ? m.orig : null, videoId: m ? m.id : null };
    });
    const missing = results.filter(r => !r.matched);
    rows.push({
      section: sectionName,
      collection: entry.c,
      name: entry.n,
      act: entry.act,
      total: results.length,
      matchedCount: results.length - missing.length,
      missing: missing.map(m => m.label),
      allDone: missing.length === 0,
      noneDone: missing.length === results.length,
      results,
    });
  });
  return rows;
}

const storeRows = process(STORE, 'Store');
const bpRows = process(BATTLEPASS, 'Battle Pass');
const allRows = [...storeRows, ...bpRows];

const totalItems = allRows.reduce((a,r)=>a+r.total,0);
const totalMatched = allRows.reduce((a,r)=>a+r.matchedCount,0);

console.log('=== SUMMARY ===');
console.log('Total collections (rows):', allRows.length);
console.log('Total required items (base+levels+variants):', totalItems);
console.log('Matched items:', totalMatched);
console.log('Missing items:', totalItems - totalMatched);
console.log('Collections with 0 posted (completely missing):', allRows.filter(r=>r.noneDone).length);
console.log('Collections fully complete:', allRows.filter(r=>r.allDone).length);
console.log('Collections partially missing:', allRows.filter(r=>!r.allDone && !r.noneDone).length);

require('fs').writeFileSync(__dirname + '/result.json', JSON.stringify(allRows, null, 2));
console.log('\nWrote result.json');

module.exports = { allRows };
