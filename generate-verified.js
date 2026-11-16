const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

function decryptSaavn(enc) {
  if (!enc) return null;
  try {
    const key = Buffer.from('38346591', 'utf8');
    const decipher = crypto.createDecipheriv('des-ecb', key, null);
    decipher.setAutoPadding(true);
    let dec = decipher.update(enc, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return dec.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4').replace(/^http:/, 'https:');
  } catch(e) { return null; }
}

const SONG_DEFINITIONS = [
  // Today's Top Hits (1-20)
  { title: "Die With A Smile", artist: "Lady Gaga, Bruno Mars", album: "Die With A Smile", genre: "pop", category: "tophits" },
  { title: "Espresso", artist: "Sabrina Carpenter", album: "Short n' Sweet", genre: "pop", category: "tophits" },
  { title: "BIRDS OF A FEATHER", artist: "Billie Eilish", album: "HIT ME HARD AND SOFT", genre: "pop", category: "tophits" },
  { title: "Taste", artist: "Sabrina Carpenter", album: "Short n' Sweet", genre: "pop", category: "tophits" },
  { title: "Beautiful Things", artist: "Benson Boone", album: "Fireworks & Rollerblades", genre: "pop", category: "tophits" },
  { title: "Lose Control", artist: "Teddy Swims", album: "I've Tried Everything But Therapy", genre: "pop", category: "tophits" },
  { title: "Good Luck, Babe!", artist: "Chappell Roan", album: "Good Luck, Babe!", genre: "pop", category: "tophits" },
  { title: "Please Please Please", artist: "Sabrina Carpenter", album: "Short n' Sweet", genre: "pop", category: "tophits" },
  { title: "Too Sweet", artist: "Hozier", album: "Unheard", genre: "pop", category: "tophits" },
  { title: "I Had Some Help", artist: "Post Malone, Morgan Wallen", album: "F-1 Trillion", genre: "pop", category: "tophits" },
  { title: "we can't be friends", artist: "Ariana Grande", album: "eternal sunshine", genre: "pop", category: "tophits" },
  { title: "Greedy", artist: "Tate McRae", album: "THINK LATER", genre: "pop", category: "tophits" },
  { title: "Houdini", artist: "Dua Lipa", album: "Radical Optimism", genre: "pop", category: "tophits" },
  { title: "Lovin On Me", artist: "Jack Harlow", album: "Lovin On Me", genre: "hiphop", category: "tophits" },
  { title: "Cruel Summer", artist: "Taylor Swift", album: "Lover", genre: "pop", category: "tophits" },
  { title: "Paint The Town Red", artist: "Doja Cat", album: "Scarlet", genre: "hiphop", category: "tophits" },
  { title: "Water", artist: "Tyla", album: "TYLA", genre: "pop", category: "tophits" },
  { title: "Strangers", artist: "Kenya Grace", album: "The After Thought", genre: "pop", category: "tophits" },
  { title: "Seven", artist: "Jung Kook, Latto", album: "GOLDEN", genre: "pop", category: "tophits" },
  { title: "greedy", artist: "Tate McRae", album: "THINK LATER", genre: "pop", category: "tophits" },

  // Global Chart Toppers & All-Time Streaming Giants (21-40)
  { title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", genre: "synthwave", category: "charts" },
  { title: "Shape of You", artist: "Ed Sheeran", album: "Divide", genre: "pop", category: "charts" },
  { title: "Someone You Loved", artist: "Lewis Capaldi", album: "Divinely Uninspired", genre: "pop", category: "charts" },
  { title: "Sunflower", artist: "Post Malone, Swae Lee", album: "Spider-Man: Into the Spider-Verse", genre: "lofi", category: "charts" },
  { title: "Starboy", artist: "The Weeknd, Daft Punk", album: "Starboy", genre: "synthwave", category: "charts" },
  { title: "As It Was", artist: "Harry Styles", album: "Harry's House", genre: "pop", category: "charts" },
  { title: "Stay", artist: "The Kid LAROI, Justin Bieber", album: "F*CK LOVE 3", genre: "pop", category: "charts" },
  { title: "Heat Waves", artist: "Glass Animals", album: "Dreamland", genre: "synthwave", category: "charts" },
  { title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", genre: "pop", category: "charts" },
  { title: "Believer", artist: "Imagine Dragons", album: "Evolve", genre: "rock", category: "charts" },
  { title: "Closer", artist: "The Chainsmokers, Halsey", album: "Collage", genre: "pop", category: "charts" },
  { title: "Dance Monkey", artist: "Tones And I", album: "The Kids Are Coming", genre: "pop", category: "charts" },
  { title: "bad guy", artist: "Billie Eilish", album: "WHEN WE ALL FALL ASLEEP", genre: "pop", category: "charts" },
  { title: "Perfect", artist: "Ed Sheeran", album: "Divide", genre: "pop", category: "charts" },
  { title: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", genre: "pop", category: "charts" },
  { title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", genre: "synthwave", category: "charts" },
  { title: "Shivers", artist: "Ed Sheeran", album: "Equals", genre: "pop", category: "charts" },
  { title: "Lovely", artist: "Billie Eilish, Khalid", album: "13 Reasons Why", genre: "pop", category: "charts" },
  { title: "Circles", artist: "Post Malone", album: "Hollywood's Bleeding", genre: "pop", category: "charts" },
  { title: "Lucid Dreams", artist: "Juice WRLD", album: "Goodbye & Good Riddance", genre: "hiphop", category: "charts" },

  // Pop & Dance Party Anthems (41-55)
  { title: "Don't Start Now", artist: "Dua Lipa", album: "Future Nostalgia", genre: "pop", category: "pop" },
  { title: "Calm Down", artist: "Rema, Selena Gomez", album: "Rave & Closes", genre: "pop", category: "pop" },
  { title: "Anti-Hero", artist: "Taylor Swift", album: "Midnights", genre: "pop", category: "pop" },
  { title: "Flowers", artist: "Miley Cyrus", album: "Endless Summer Vacation", genre: "pop", category: "pop" },
  { title: "One Kiss", artist: "Calvin Harris, Dua Lipa", album: "One Kiss", genre: "pop", category: "pop" },
  { title: "Cold Heart", artist: "Elton John, Dua Lipa, PNAU", album: "The Lockdown Sessions", genre: "pop", category: "pop" },
  { title: "Titanium", artist: "David Guetta, Sia", album: "Nothing but the Beat", genre: "pop", category: "pop" },
  { title: "Wake Me Up", artist: "Avicii", album: "True", genre: "pop", category: "pop" },
  { title: "Lean On", artist: "Major Lazer, DJ Snake, MO", album: "Peace Is The Mission", genre: "pop", category: "pop" },
  { title: "Can't Stop The Feeling!", artist: "Justin Timberlake", album: "Trolls", genre: "pop", category: "pop" },
  { title: "Uptown Funk", artist: "Mark Ronson, Bruno Mars", album: "Uptown Special", genre: "pop", category: "pop" },
  { title: "Roar", artist: "Katy Perry", album: "PRISM", genre: "pop", category: "pop" },
  { title: "Shake It Off", artist: "Taylor Swift", album: "1989", genre: "pop", category: "pop" },
  { title: "Cheap Thrills", artist: "Sia", album: "This Is Acting", genre: "pop", category: "pop" },
  { title: "Sugar", artist: "Maroon 5", album: "V", genre: "pop", category: "pop" },

  // Hip-Hop, Rap & Late Night Bass (56-70)
  { title: "The Hills", artist: "The Weeknd", album: "Beauty Behind the Madness", genre: "hiphop", category: "hiphop" },
  { title: "God's Plan", artist: "Drake", album: "Scorpion", genre: "hiphop", category: "hiphop" },
  { title: "SICKO MODE", artist: "Travis Scott", album: "ASTROWORLD", genre: "hiphop", category: "hiphop" },
  { title: "goosebumps", artist: "Travis Scott", album: "Birds in the Trap", genre: "hiphop", category: "hiphop" },
  { title: "rockstar", artist: "Post Malone, 21 Savage", album: "beerbongs & bentleys", genre: "hiphop", category: "hiphop" },
  { title: "Congratulations", artist: "Post Malone, Quavo", album: "Stoney", genre: "hiphop", category: "hiphop" },
  { title: "INDUSTRY BABY", artist: "Lil Nas X, Jack Harlow", album: "MONTERO", genre: "hiphop", category: "hiphop" },
  { title: "XO Tour Llif3", artist: "Lil Uzi Vert", album: "Luv Is Rage 2", genre: "hiphop", category: "hiphop" },
  { title: "HUMBLE.", artist: "Kendrick Lamar", album: "DAMN.", genre: "hiphop", category: "hiphop" },
  { title: "Money Trees", artist: "Kendrick Lamar, Jay Rock", album: "good kid, m.A.A.d city", genre: "hiphop", category: "hiphop" },
  { title: "Mask Off", artist: "Future", album: "FUTURE", genre: "hiphop", category: "hiphop" },
  { title: "Creepin'", artist: "Metro Boomin, The Weeknd, 21 Savage", album: "HEROES & VILLAINS", genre: "hiphop", category: "hiphop" },
  { title: "Heartless", artist: "The Weeknd", album: "After Hours", genre: "hiphop", category: "hiphop" },
  { title: "Kill Bill", artist: "SZA", album: "SOS", genre: "hiphop", category: "hiphop" },
  { title: "Die For You", artist: "The Weeknd", album: "Starboy", genre: "hiphop", category: "hiphop" },

  // Chill Lo-Fi, Acoustic & Coffee House (71-85)
  { title: "Golden Hour", artist: "JVKE", album: "this is what ____ feels like", genre: "lofi", category: "chill" },
  { title: "death bed (coffee for your head)", artist: "Powfu, beabadoobee", album: "poems of the past", genre: "lofi", category: "chill" },
  { title: "Sunday Best", artist: "Surfaces", album: "Where the Light Is", genre: "lofi", category: "chill" },
  { title: "Snooze", artist: "SZA", album: "SOS", genre: "lofi", category: "chill" },
  { title: "Location", artist: "Khalid", album: "American Teen", genre: "lofi", category: "chill" },
  { title: "Riptide", artist: "Vance Joy", album: "Dream Your Life Away", genre: "lofi", category: "chill" },
  { title: "Let Her Go", artist: "Passenger", album: "All the Little Lights", genre: "lofi", category: "chill" },
  { title: "I'm Yours", artist: "Jason Mraz", album: "We Sing. We Dance. We Steal Things.", genre: "lofi", category: "chill" },
  { title: "Photograph", artist: "Ed Sheeran", album: "x", genre: "lofi", category: "chill" },
  { title: "Thinking Out Loud", artist: "Ed Sheeran", album: "x", genre: "lofi", category: "chill" },
  { title: "Heather", artist: "Conan Gray", album: "Kid Krow", genre: "lofi", category: "chill" },
  { title: "Until I Found You", artist: "Stephen Sanchez", album: "Easy On My Eyes", genre: "lofi", category: "chill" },
  { title: "Romantic Homicide", artist: "d4vd", album: "Petals to Thorns", genre: "lofi", category: "chill" },
  { title: "Here With Me", artist: "d4vd", album: "Petals to Thorns", genre: "lofi", category: "chill" },
  { title: "Glimpse of Us", artist: "Joji", album: "SMITHEREENS", genre: "lofi", category: "chill" },

  // Rock, Legends & Timeless Classics (86-100)
  { title: "Yellow", artist: "Coldplay", album: "Parachutes", genre: "rock", category: "classics" },
  { title: "Viva La Vida", artist: "Coldplay", album: "Viva La Vida", genre: "rock", category: "classics" },
  { title: "Bohemian Rhapsody", artist: "Queen", album: "A Night at the Opera", genre: "rock", category: "classics" },
  { title: "Counting Stars", artist: "OneRepublic", album: "Native", genre: "rock", category: "classics" },
  { title: "Demons", artist: "Imagine Dragons", album: "Night Visions", genre: "rock", category: "classics" },
  { title: "Radioactive", artist: "Imagine Dragons", album: "Night Visions", genre: "rock", category: "classics" },
  { title: "In The End", artist: "Linkin Park", album: "Hybrid Theory", genre: "rock", category: "classics" },
  { title: "Numb", artist: "Linkin Park", album: "Meteora", genre: "rock", category: "classics" },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", album: "Nevermind", genre: "rock", category: "classics" },
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", album: "Appetite for Destruction", genre: "rock", category: "classics" },
  { title: "Hotel California", artist: "Eagles", album: "Hotel California", genre: "rock", category: "classics" },
  { title: "Wonderwall", artist: "Oasis", album: "(What's the Story) Morning Glory?", genre: "rock", category: "classics" },
  { title: "Don't Stop Believin'", artist: "Journey", album: "Escape", genre: "rock", category: "classics" },
  { title: "The Scientist", artist: "Coldplay", album: "A Rush of Blood to the Head", genre: "rock", category: "classics" },
  { title: "Something Just Like This", artist: "The Chainsmokers, Coldplay", album: "Memories...Do Not Open", genre: "rock", category: "classics" }
];

const SPOTIFY_SECTIONS = [
  { id: "tophits", title: "Today's Top Hits", subtitle: "The hottest tracks on the planet right now", tag: "Billboard Hot 100", genre: "pop" },
  { id: "charts", title: "Global Chart Toppers", subtitle: "Record-breaking anthems with billions of plays", tag: "Global 50", genre: "synthwave" },
  { id: "pop", title: "Pop & Dance Anthems", subtitle: "High energy chart-toppers to power your day", tag: "Party", genre: "pop" },
  { id: "hiphop", title: "Hip-Hop & Late Night R&B", subtitle: "Heavy bass, midnight mood tracks and global trap", tag: "Late Night", genre: "hiphop" },
  { id: "chill", title: "Chill Lo-Fi & Coffee Beats", subtitle: "Relax, study and unwind with smooth laidback melodies", tag: "Relaxing", genre: "lofi" },
  { id: "classics", title: "Rock & Timeless Classics", subtitle: "Legendary stadium anthems that live forever", tag: "Legendary", genre: "rock" }
];

function norm(s) {
  return (s || '').toLowerCase().replace(/&amp;/g, '&').split('(')[0].split('[')[0].replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}
const BAD = ['karaoke','instrumental','nightcore','ambient','tribute','slowed','sped up','speed up','piano','cover','backing','zzang','originally','in the style','remix','techno','lofi version','8d','reverb','acoustic version','cappella','mashup','parody','lullaby','version'];

function search(q) {
  return new Promise(resolve => {
    https.get('https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=15&p=1&q=' + encodeURIComponent(q), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d).results || []); } catch(e) { resolve([]); } });
    }).on('error', () => resolve([]));
  });
}

function artistNames(item) {
  const m = item.more_info?.artistMap || {};
  const list = [...(m.primary_artists || []), ...(m.featured_artists || [])].map(a => norm(a.name));
  const sub = norm((item.subtitle || '').split(' - ')[0]);
  return list.join(' | ') + ' | ' + sub;
}

async function getStream(s) {
  const primary = norm(s.artist.split(',')[0].split('&')[0]);
  const target = norm(s.title);
  const queries = [s.title + ' ' + s.artist.split(',')[0], s.title + ' ' + s.artist];
  for (const q of queries) {
    const results = await search(q);
    for (const item of results) {
      const t = (item.title || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const lower = (t + ' ' + (item.more_info?.album || '')).toLowerCase();
      if (BAD.some(w => lower.includes(w))) continue;
      if ((item.language || '').toLowerCase() === 'instrumental') continue;
      if (norm(t) !== target) continue;
      if (!artistNames(item).includes(primary)) continue;
      const url = decryptSaavn(item?.more_info?.encrypted_media_url);
      if (!url) continue;
      const cover = (item.image || '').replace('150x150', '500x500').replace(/^http:/, 'https:');
      return { streamUrl: url, cover, duration: Number(item?.more_info?.duration) || 210, matched: t + ' / ' + (item.subtitle || '') };
    }
  }
  return null;
}

function itunes(s) {
  const primary = norm(s.artist.split(',')[0].split('&')[0]);
  const target = norm(s.title);
  return new Promise(resolve => {
    https.get('https://itunes.apple.com/search?entity=song&limit=15&term=' + encodeURIComponent(s.title + ' ' + s.artist.split(',')[0]), { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => {
        try {
          for (const r of JSON.parse(d).results || []) {
            if (norm(r.trackName) !== target) continue;
            if (!norm(r.artistName).includes(primary)) continue;
            if (/karaoke|instrumental|tribute|live|remix|version/i.test(r.trackName + ' ' + r.collectionName)) continue;
            if (!r.previewUrl) continue;
            return resolve({ streamUrl: r.previewUrl, cover: (r.artworkUrl100 || '').replace('100x100bb', '600x600bb'), duration: 30, matched: r.trackName + ' / ' + r.artistName + ' (30s preview)', preview: true, album: r.collectionName });
          }
        } catch (e) {}
        resolve(null);
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const good = [], bad = [];
  for (let i = 0; i < SONG_DEFINITIONS.length; i++) {
    const s = SONG_DEFINITIONS[i];
    const res = (await getStream(s)) || (await itunes(s));
    if (res) good.push({ s, res }); else bad.push(s.title + ' - ' + s.artist);
  }
  const seen = new Set();
  const finalTracks = [];
  good.forEach(({ s, res }) => {
    const key = norm(s.title) + norm(s.artist);
    if (seen.has(key)) return;
    seen.add(key);
    finalTracks.push({
      id: 'track-' + (finalTracks.length + 1), title: s.title, artist: s.artist, album: s.album,
      genre: s.genre, category: s.category, duration: res.duration, cover: res.cover,
      streamUrl: res.streamUrl, resolvedFull: true, ...(res.preview ? { preview: true } : {})
    });
    console.log('OK  ', s.title, '|', s.artist, '=>', res.matched);
  });
  console.log('\nUNMATCHED (' + bad.length + '):\n' + bad.join('\n'));
  const output = '// Verified genuine studio tracks (title + artist matched) for Spudaypay\n' +
    'const CURATED_TRACKS = ' + JSON.stringify(finalTracks, null, 2) + ';\n\n' +
    'const SPOTIFY_SECTIONS = ' + JSON.stringify(SPOTIFY_SECTIONS, null, 2) + ';\n\n' +
    "if (typeof module !== 'undefined') { module.exports = { CURATED_TRACKS, SPOTIFY_SECTIONS }; }\n";
  fs.writeFileSync(process.argv[2] || 'music-data.new.js', output, 'utf8');
  console.log('\nVERIFIED:', finalTracks.length);
})();

