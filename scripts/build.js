// Regenerates assets/data.json from scripts/videos.json + scripts/master.js (the
// Fandom Wiki skin list). Run after re-scraping videos.json for a fresh channel snapshot.
//
//   node scripts/build.js
//
const fs = require('fs');
const path = require('path');
const { allRows } = require('./match.js');
const { STORE, BATTLEPASS, LIMITED_COLLECTIONS } = require('./master.js');
const { classifyWeaponType, colorTagsOf, eventTagOf } = require('./tags.js');

// match.js builds allRows as [...process(STORE), ...process(BATTLEPASS)], so this zip
// stays index-aligned with the original wiki entries (which still carry `n`/`variants`).
const sourceEntries = [...STORE, ...BATTLEPASS];

const slim = allRows.map((r, i) => {
  const entry = sourceEntries[i];
  const tags = [
    r.section === 'Store' ? 'ストア' : 'バトルパス',
    classifyWeaponType(entry.n),
    eventTagOf(entry, LIMITED_COLLECTIONS),
    ...colorTagsOf(entry),
  ].filter(Boolean);
  const results = r.results.map(x => ({
    label: x.label,
    matched: x.matched,
    t: x.matchedTitle,
    id: x.videoId,
    views: x.viewCount != null ? Number(x.viewCount) : null,
  }));
  const views = results.reduce((a, x) => a + (x.views || 0), 0);
  return {
    section: r.section,
    collection: r.collection,
    name: r.name,
    act: r.act || null,
    total: r.total,
    matchedCount: r.matchedCount,
    allDone: r.allDone,
    noneDone: r.noneDone,
    tags,
    views,
    results,
  };
});

const outPath = path.join(__dirname, '..', 'assets', 'data.json');
fs.writeFileSync(outPath, JSON.stringify(slim));
console.log('Wrote', outPath, `(${slim.length} rows)`);
