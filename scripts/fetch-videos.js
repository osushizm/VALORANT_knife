// Refreshes scripts/videos.json from the YouTube Data API v3 (real view counts, not scraped
// text). Requires a YOUTUBE_API_KEY env var. Used by .github/workflows/update-data.yml, and
// safe to run locally:
//
//   YOUTUBE_API_KEY=xxxx node scripts/fetch-videos.js
//
const fs = require('fs');
const path = require('path');

const CHANNEL_ID = 'UCyxHeebXxOfkK3pkkmu846A'; // @osushizm
// YouTube gives every channel an "uploads" playlist whose id is the channel id with the
// leading "UC" swapped for "UU" — this avoids a channels.list call just to look it up.
const UPLOADS_PLAYLIST_ID = 'UU' + CHANNEL_ID.slice(2);

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('YOUTUBE_API_KEY is not set.');
  process.exit(1);
}

async function getJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`YouTube API error ${resp.status}: ${body.slice(0, 500)}`);
  }
  return resp.json();
}

async function fetchAllVideoIds() {
  const ids = [];
  let pageToken = '';
  do {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.searchParams.set('part', 'contentDetails');
    url.searchParams.set('playlistId', UPLOADS_PLAYLIST_ID);
    url.searchParams.set('maxResults', '50');
    url.searchParams.set('key', API_KEY);
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const json = await getJson(url);
    (json.items || []).forEach(it => ids.push(it.contentDetails.videoId));
    pageToken = json.nextPageToken || '';
  } while (pageToken);
  return ids;
}

async function fetchVideoDetails(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('id', batch.join(','));
    url.searchParams.set('key', API_KEY);
    const json = await getJson(url);
    (json.items || []).forEach(it => {
      out.push({
        contentId: it.id,
        title: it.snippet.title,
        viewCount: it.statistics && it.statistics.viewCount != null ? Number(it.statistics.viewCount) : null,
        publishedAt: it.snippet.publishedAt,
      });
    });
  }
  return out;
}

(async () => {
  console.log('Fetching upload playlist item ids…');
  const ids = await fetchAllVideoIds();
  console.log(`Found ${ids.length} videos. Fetching details…`);
  const fetched = await fetchVideoDetails(ids);

  // Merge into the existing file rather than overwrite it. The "uploads" playlist can lag
  // a freshly-published video by minutes to hours before it's indexed, so a plain overwrite
  // would silently drop videos this script (or a manual edit) already knew about — this bit
  // us once already. Fetched data wins for anything it does have (fresher view counts,
  // corrected titles); anything only the old file knows about is kept as-is.
  const outPath = path.join(__dirname, 'videos.json');
  let existing = [];
  try { existing = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch (e) { /* first run */ }

  const byId = new Map(existing.map(v => [v.contentId, v]));
  fetched.forEach(v => byId.set(v.contentId, v));
  const merged = Array.from(byId.values());
  // Newest first, matching the channel's default "videos" tab ordering.
  merged.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  fs.writeFileSync(outPath, JSON.stringify(merged));
  const added = merged.length - existing.length;
  console.log('Wrote', outPath, `(${merged.length} videos, ${added >= 0 ? '+' + added : added} vs previous)`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
