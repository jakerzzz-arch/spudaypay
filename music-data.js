// Comprehensive Global Music Catalog - Styled like Spotify Home
const CURATED_TRACKS = [
  // Section 1: Today's Top Hits
  {
    id: "hit-1",
    title: "Die With A Smile",
    artist: "Lady Gaga, Bruno Mars",
    album: "Die With A Smile",
    genre: "pop",
    duration: 251,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-2",
    title: "Espresso",
    artist: "Sabrina Carpenter",
    album: "Short n' Sweet",
    genre: "pop",
    duration: 175,
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-3",
    title: "BIRDS OF A FEATHER",
    artist: "Billie Eilish",
    album: "HIT ME HARD AND SOFT",
    genre: "pop",
    duration: 210,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-4",
    title: "Taste",
    artist: "Sabrina Carpenter",
    album: "Short n' Sweet",
    genre: "pop",
    duration: 157,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-5",
    title: "Beautiful Things",
    artist: "Benson Boone",
    album: "Fireworks & Rollerblades",
    genre: "pop",
    duration: 180,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-6",
    title: "Lose Control",
    artist: "Teddy Swims",
    album: "I've Tried Everything But Therapy",
    genre: "pop",
    duration: 210,
    cover: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-7",
    title: "Good Luck, Babe!",
    artist: "Chappell Roan",
    album: "Good Luck, Babe! - Single",
    genre: "pop",
    duration: 218,
    cover: "https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },
  {
    id: "hit-8",
    title: "Cruel Summer",
    artist: "Taylor Swift",
    album: "Lover",
    genre: "pop",
    duration: 178,
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop",
    category: "tophits",
    needsFullResolve: true
  },

  // Section 2: Global Chart Toppers
  {
    id: "global-1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    genre: "synthwave",
    duration: 200,
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-2",
    title: "Starboy",
    artist: "The Weeknd, Daft Punk",
    album: "Starboy",
    genre: "synthwave",
    duration: 230,
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-3",
    title: "As It Was",
    artist: "Harry Styles",
    album: "Harry's House",
    genre: "pop",
    duration: 167,
    cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-4",
    title: "Stay",
    artist: "The Kid LAROI, Justin Bieber",
    album: "F*CK LOVE 3: OVER YOU",
    genre: "pop",
    duration: 141,
    cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-5",
    title: "Heat Waves",
    artist: "Glass Animals",
    album: "Dreamland",
    genre: "synthwave",
    duration: 238,
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-6",
    title: "Save Your Tears",
    artist: "The Weeknd",
    album: "After Hours",
    genre: "synthwave",
    duration: 215,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-7",
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    genre: "pop",
    duration: 203,
    cover: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },
  {
    id: "global-8",
    title: "Someone You Loved",
    artist: "Lewis Capaldi",
    album: "Divinely Uninspired",
    genre: "pop",
    duration: 182,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop",
    category: "charts",
    needsFullResolve: true
  },

  // Section 3: Chill & Lo-Fi Beats
  {
    id: "chill-1",
    title: "Sunflower",
    artist: "Post Malone, Swae Lee",
    album: "Spider-Man: Into the Spider-Verse",
    genre: "lofi",
    duration: 158,
    cover: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },
  {
    id: "chill-2",
    title: "Golden Hour",
    artist: "JVKE",
    album: "this is what ____ feels like",
    genre: "lofi",
    duration: 209,
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },
  {
    id: "chill-3",
    title: "death bed (coffee for your head)",
    artist: "Powfu, beabadoobee",
    album: "poems of the past",
    genre: "lofi",
    duration: 173,
    cover: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },
  {
    id: "chill-4",
    title: "Sunday Best",
    artist: "Surfaces",
    album: "Where the Light Is",
    genre: "lofi",
    duration: 158,
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },
  {
    id: "chill-5",
    title: "Snooze",
    artist: "SZA",
    album: "SOS",
    genre: "lofi",
    duration: 201,
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },
  {
    id: "chill-6",
    title: "Location",
    artist: "Khalid",
    album: "American Teen",
    genre: "lofi",
    duration: 219,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop",
    category: "chill",
    needsFullResolve: true
  },

  // Section 4: Rock & Timeless Classics
  {
    id: "rock-1",
    title: "Yellow",
    artist: "Coldplay",
    album: "Parachutes",
    genre: "rock",
    duration: 266,
    cover: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },
  {
    id: "rock-2",
    title: "Viva La Vida",
    artist: "Coldplay",
    album: "Viva La Vida",
    genre: "rock",
    duration: 242,
    cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },
  {
    id: "rock-3",
    title: "Bohemian Rhapsody",
    artist: "Queen",
    album: "A Night at the Opera",
    genre: "rock",
    duration: 354,
    cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },
  {
    id: "rock-4",
    title: "Believer",
    artist: "Imagine Dragons",
    album: "Evolve",
    genre: "rock",
    duration: 204,
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },
  {
    id: "rock-5",
    title: "Counting Stars",
    artist: "OneRepublic",
    album: "Native",
    genre: "rock",
    duration: 257,
    cover: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },
  {
    id: "rock-6",
    title: "Demons",
    artist: "Imagine Dragons",
    album: "Night Visions",
    genre: "rock",
    duration: 177,
    cover: "https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?w=500&h=500&fit=crop",
    category: "classics",
    needsFullResolve: true
  },

  // Section 5: Hip-Hop & Late Night Vibes
  {
    id: "hiphop-1",
    title: "The Hills",
    artist: "The Weeknd",
    album: "Beauty Behind the Madness",
    genre: "hiphop",
    duration: 242,
    cover: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  },
  {
    id: "hiphop-2",
    title: "Creepin'",
    artist: "Metro Boomin, The Weeknd, 21 Savage",
    album: "HEROES & VILLAINS",
    genre: "hiphop",
    duration: 221,
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  },
  {
    id: "hiphop-3",
    title: "God's Plan",
    artist: "Drake",
    album: "Scorpion",
    genre: "hiphop",
    duration: 198,
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  },
  {
    id: "hiphop-4",
    title: "Kill Bill",
    artist: "SZA",
    album: "SOS",
    genre: "hiphop",
    duration: 153,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  },
  {
    id: "hiphop-5",
    title: "Heartless",
    artist: "The Weeknd",
    album: "After Hours",
    genre: "hiphop",
    duration: 198,
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  },
  {
    id: "hiphop-6",
    title: "Die For You",
    artist: "The Weeknd",
    album: "Starboy",
    genre: "hiphop",
    duration: 260,
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&h=500&fit=crop",
    category: "hiphop",
    needsFullResolve: true
  }
];

// Spotify-style Categories Definition
const SPOTIFY_SECTIONS = [
  {
    id: "tophits",
    title: "Today's Top Hits",
    subtitle: "The most played songs in the world right now",
    tag: "Trending",
    genre: "pop"
  },
  {
    id: "charts",
    title: "Global Chart Toppers",
    subtitle: "Record-breaking anthems with billions of streams",
    tag: "Billboard Top 50",
    genre: "synthwave"
  },
  {
    id: "chill",
    title: "Chill & Lo-Fi Beats",
    subtitle: "Relax, study, and unwind with smooth laidback tracks",
    tag: "Relaxing",
    genre: "lofi"
  },
  {
    id: "classics",
    title: "Rock & Timeless Classics",
    subtitle: "Legendary hits and stadium anthems that live forever",
    tag: "Anthems",
    genre: "rock"
  },
  {
    id: "hiphop",
    title: "Late Night & R&B Vibes",
    subtitle: "Smooth hip-hop, deep bass, and midnight mood tracks",
    tag: "Late Night",
    genre: "hiphop"
  }
];
