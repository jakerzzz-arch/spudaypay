const https = require('https');
const fs = require('fs');

const { CURATED_TRACKS } = require('./music-data.js');
const src = fs.readFileSync('generate-100-tracks.js', 'utf8');
const defsMatch = src.slice(src.indexOf('const SONG_DEFINITIONS ='), src.indexOf('async function getStream'));
eval(defsMatch.replace(/const SONG_DEFINITIONS/g, 'global.SONG_DEFINITIONS').replace(/const SPOTIFY_SECTIONS/g, 'global.SPOTIFY_SECTIONS'));

// Replace duplicate track 20 ("greedy" duplicate of track 12 "Greedy") with "vampire" by Olivia Rodrigo
SONG_DEFINITIONS[19] = { title: "vampire", artist: "Olivia Rodrigo", album: "GUTS", genre: "pop", category: "tophits" };

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/&amp;/g, '&')
    .split('(')[0].split('[')[0].split(' - ')[0]
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Keep all already-verified iTunes tracks (exclude any saavncdn Haryanvi/instrumental track)
const existingMap = new Map();
for (const t of CURATED_TRACKS) {
  if (t.streamUrl && t.streamUrl.includes('itunes.apple.com')) {
    existingMap.set(norm(t.title) + '|' + norm(t.artist.split(',')[0]), t);
  }
}
console.log('Already cached verified iTunes tracks:', existingMap.size);

function fetchItunes(term) {
  return new Promise(resolve => {
    https.get('https://itunes.apple.com/search?country=US&media=music&entity=song&limit=15&term=' + encodeURIComponent(term), {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    }, res => {
      if (res.statusCode === 403 || res.statusCode === 429) {
        return resolve({ rateLimited: true, status: res.statusCode });
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ results: JSON.parse(d).results || [] }); } catch (e) { resolve({ results: [] }); }
      });
    }).on('error', () => resolve({ results: [] }));
  });
}

async function resolveTrack(s) {
  const key = norm(s.title) + '|' + norm(s.artist.split(',')[0]);
  if (existingMap.has(key)) {
    return existingMap.get(key);
  }

  const primary = norm(s.artist.split(',')[0].split('&')[0]);
  const target = norm(s.title);
  const q = `${s.title.split('(')[0].trim()} ${s.artist.split(',')[0]}`;

  const resp = await fetchItunes(q);
  if (resp.rateLimited) {
    console.log(`Rate limited (${resp.status}) on ${s.title}`);
    return null;
  }
  const results = resp.results || [];
  for (const r of results) {
    if (!r.previewUrl) continue;
    const tNorm = norm(r.trackName);
    const aNorm = norm(r.artistName);
    if (tNorm !== target && !tNorm.startsWith(target) && !target.startsWith(tNorm)) continue;
    if (!aNorm.includes(primary) && !primary.includes(aNorm)) continue;
    if (/karaoke|instrumental|tribute|sped up|slowed|8d|lullaby|cover/i.test(r.trackName)) continue;
    await new Promise(r => setTimeout(r, 350));
    return {
      title: s.title,
      artist: s.artist,
      album: r.collectionName || s.album,
      genre: s.genre,
      category: s.category,
      duration: 30,
      cover: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      streamUrl: r.previewUrl,
      resolvedFull: true,
      preview: true
    };
  }
  await new Promise(r => setTimeout(r, 350));
  return null;
}

(async () => {
  const finalTracks = [];
  for (let i = 0; i < SONG_DEFINITIONS.length; i++) {
    const s = SONG_DEFINITIONS[i];
    const resolved = await resolveTrack(s);
    if (resolved) {
      finalTracks.push({
        id: `track-${finalTracks.length + 1}`,
        title: s.title,
        artist: s.artist,
        album: resolved.album || s.album,
        genre: s.genre,
        category: s.category,
        duration: resolved.duration || 30,
        cover: resolved.cover,
        streamUrl: resolved.streamUrl,
        resolvedFull: true,
        preview: true
      });
    } else {
      console.log('UNMATCHED:', s.title, '-', s.artist);
    }
  }

  console.log(`TOTAL GENUINE TRACKS: ${finalTracks.length}/${SONG_DEFINITIONS.length}`);
  const output = '// Verified Genuine Studio Tracks (Official Apple Music / iTunes Streams) for Spudaypay\n' +
    'const CURATED_TRACKS = ' + JSON.stringify(finalTracks, null, 2) + ';\n\n' +
    'const SPOTIFY_SECTIONS = ' + JSON.stringify(SPOTIFY_SECTIONS, null, 2) + ';\n\n' +
    "if (typeof module !== 'undefined') { module.exports = { CURATED_TRACKS, SPOTIFY_SECTIONS }; }\n";
  fs.writeFileSync('music-data.js', output, 'utf8');
})();
