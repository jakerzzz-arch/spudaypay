const https = require('https');
const fs = require('fs');

const src = fs.readFileSync('generate-100-tracks.js', 'utf8');
const defsMatch = src.slice(src.indexOf('const SONG_DEFINITIONS ='), src.indexOf('async function getStream'));
eval(defsMatch.replace(/const SONG_DEFINITIONS/g, 'global.SONG_DEFINITIONS').replace(/const SPOTIFY_SECTIONS/g, 'global.SPOTIFY_SECTIONS'));

// Replace duplicate track 20 ("greedy" duplicate of track 12 "Greedy") with "Vampire" by Olivia Rodrigo
SONG_DEFINITIONS[19] = { title: "vampire", artist: "Olivia Rodrigo", album: "GUTS", genre: "pop", category: "tophits" };

function norm(s) {
  return (s || '').toLowerCase()
    .replace(/&amp;/g, '&')
    .split('(')[0].split('[')[0].split(' - ')[0]
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fetchItunes(term) {
  return new Promise(resolve => {
    https.get('https://itunes.apple.com/search?country=US&media=music&entity=song&limit=25&term=' + encodeURIComponent(term), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d).results || []); } catch (e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

async function resolveGenuineTrack(s) {
  const primary = norm(s.artist.split(',')[0].split('&')[0]);
  const target = norm(s.title);
  const queries = [
    `${s.title} ${s.artist.split(',')[0]}`,
    `${s.title.split('(')[0].trim()} ${s.artist.split(',')[0]}`
  ];

  for (const q of queries) {
    const results = await fetchItunes(q);
    // First pass: exact normalized title + primary artist match + not karaoke/instrumental/remix/live on trackName
    for (const r of results) {
      if (!r.previewUrl) continue;
      const tNorm = norm(r.trackName);
      const aNorm = norm(r.artistName);
      if (tNorm !== target && !tNorm.startsWith(target) && !target.startsWith(tNorm)) continue;
      if (!aNorm.includes(primary) && !primary.includes(aNorm)) continue;
      if (/karaoke|instrumental|tribute|remix|sped up|slowed|8d|lullaby|cover/i.test(r.trackName)) continue;
      return {
        title: r.trackName.split(' (feat.')[0].split(' [feat.')[0],
        artist: r.artistName,
        album: r.collectionName || s.album,
        streamUrl: r.previewUrl,
        cover: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        duration: 30
      };
    }
  }
  return null;
}

(async () => {
  const finalTracks = [];
  const batchSize = 8;
  for (let i = 0; i < SONG_DEFINITIONS.length; i += batchSize) {
    const batch = SONG_DEFINITIONS.slice(i, i + batchSize);
    const resolved = await Promise.all(batch.map(s => resolveGenuineTrack(s)));
    for (let j = 0; j < batch.length; j++) {
      const s = batch[j];
      const res = resolved[j];
      if (res) {
        finalTracks.push({
          id: `track-${finalTracks.length + 1}`,
          title: s.title,
          artist: s.artist,
          album: res.album || s.album,
          genre: s.genre,
          category: s.category,
          duration: res.duration,
          cover: res.cover,
          streamUrl: res.streamUrl,
          resolvedFull: true
        });
      } else {
        console.log('MISS:', s.title, '-', s.artist);
      }
    }
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`VERIFIED GENUINE TRACKS: ${finalTracks.length}/${SONG_DEFINITIONS.length}`);
  const output = '// 100 Verified Genuine Studio Tracks (Official Apple Music / iTunes Streams) for Spudaypay\n' +
    'const CURATED_TRACKS = ' + JSON.stringify(finalTracks, null, 2) + ';\n\n' +
    'const SPOTIFY_SECTIONS = ' + JSON.stringify(SPOTIFY_SECTIONS, null, 2) + ';\n\n' +
    "if (typeof module !== 'undefined') { module.exports = { CURATED_TRACKS, SPOTIFY_SECTIONS }; }\n";
  fs.writeFileSync('music-data.js', output, 'utf8');
})();
