// Regenerates assets/data.json from scripts/videos.json + scripts/master.js (the
// Fandom Wiki skin list). Run after re-scraping videos.json for a fresh channel snapshot.
//
//   node scripts/build.js
//
const fs = require('fs');
const path = require('path');
const { allRows } = require('./match.js');

const slim = allRows.map(r => ({
  section: r.section,
  collection: r.collection,
  name: r.name,
  act: r.act || null,
  total: r.total,
  matchedCount: r.matchedCount,
  allDone: r.allDone,
  noneDone: r.noneDone,
  results: r.results.map(x => ({ label: x.label, matched: x.matched, t: x.matchedTitle, id: x.videoId })),
}));

const outPath = path.join(__dirname, '..', 'assets', 'data.json');
fs.writeFileSync(outPath, JSON.stringify(slim));
console.log('Wrote', outPath, `(${slim.length} rows)`);
