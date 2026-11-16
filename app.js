// State Management
let currentTrackList = [...CURATED_TRACKS];
let currentTrackIndex = 0;
let isPlaying = false;
let isShuffled = false;
let isRepeat = false;
let isMuted = false;
let previousVolume = 0.8;
let likedSongs = new Set();

// DOM Elements
const audio = document.getElementById('audioEngine');
const btnPlayPause = document.getElementById('btnPlayPause');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnShuffle = document.getElementById('btnShuffle');
const btnRepeat = document.getElementById('btnRepeat');
const btnMute = document.getElementById('btnMute');
const iconVolHigh = document.getElementById('iconVolHigh');
const iconVolMuted = document.getElementById('iconVolMuted');
const volumeBarContainer = document.getElementById('volumeBarContainer');
const volumeBarFill = document.getElementById('volumeBarFill');

const progressBarContainer = document.getElementById('progressBarContainer');
const progressBarFill = document.getElementById('progressBarFill');
const progressThumb = document.getElementById('progressThumb');
const currentTimeLabel = document.getElementById('currentTimeLabel');
const totalDurationLabel = document.getElementById('totalDurationLabel');

const playerCoverImg = document.getElementById('playerCoverImg');
const playerTrackTitle = document.getElementById('playerTrackTitle');
const playerTrackArtist = document.getElementById('playerTrackArtist');
const playerLikeBtn = document.getElementById('playerLikeBtn');
const bufferingSpinner = document.getElementById('bufferingSpinner');
const equalizerAnim = document.getElementById('equalizerAnim');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchStatusBar = document.getElementById('searchStatusBar');
const searchTableBody = document.getElementById('searchTableBody');
const likedTableBody = document.getElementById('likedTableBody');
const quickPicksGrid = document.getElementById('quickPicksGrid');
const featuredGrid = document.getElementById('featuredGrid');
const libraryGrid = document.getElementById('libraryGrid');
const likedCountBadge = document.getElementById('likedCountBadge');
const likedHeroSubtitle = document.getElementById('likedHeroSubtitle');
const greetingText = document.getElementById('greetingText');
const currentGenreLabel = document.getElementById('currentGenreLabel');
const btnRandom = document.getElementById('btnRandom');
const btnDropFiles = document.getElementById('btnDropFiles');
const localFileInput = document.getElementById('localFileInput');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  loadLikedSongsFromStorage();
  updateGreeting();
  renderQuickPicks();
  renderFeaturedGrid(currentTrackList);
  setupNavigation();
  setupAudioEvents();
  setupControls();
  setupSearch();
  setupLocalFileImport();
  setupKeyboardShortcuts();

  // Load first track into player ready to play
  if (currentTrackList.length > 0) {
    loadTrack(0, false);
  }
});

// Dynamic Greeting
function updateGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) greetingText.textContent = "Good morning";
  else if (hour < 18) greetingText.textContent = "Good afternoon";
  else greetingText.textContent = "Good evening";
}

// Dual Audio Engine State ('html5' or 'yt')
const API_BASE = (window.location.hostname === 'localhost' || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:')
  ? 'https://preeminent-kitten-e39dfe.netlify.app'
  : '';

let activeEngine = 'html5';
let ytPlayer = null;
let ytPlayerReady = false;
let ytProgressTimer = null;

// Initialize YouTube IFrame Audio Engine
window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player('ytPlayer', {
    height: '200',
    width: '200',
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: window.location.origin
    },
    events: {
      onReady: () => {
        ytPlayerReady = true;
        ytPlayer.setVolume(Math.round((previousVolume || 0.8) * 100));
      },
      onError: () => {
        // If a VEVO video blocks embedding (error 101/150), automatically try the next matching videoId
        const track = currentTrackList[currentTrackIndex];
        if (track && Array.isArray(track.ytCandidateIds) && track.ytCandidateIds.length > 0) {
          const nextId = track.ytCandidateIds.shift();
          track.ytVideoId = nextId;
          ytPlayer.loadVideoById(nextId);
        } else if (track && track.streamUrl) {
          // Fallback to direct HTML5 audio stream
          activeEngine = 'html5';
          audio.src = track.streamUrl;
          audio.load();
          playTrack();
        }
      },
      onStateChange: (event) => {
        if (activeEngine !== 'yt') return;
        if (event.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          iconPlay.style.display = 'none';
          iconPause.style.display = 'block';
          equalizerAnim.classList.add('playing');
          bufferingSpinner.style.display = 'none';
          const dur = ytPlayer.getDuration();
          if (dur > 0) totalDurationLabel.textContent = formatTime(dur);
          startYtProgressLoop();
        } else if (event.data === YT.PlayerState.PAUSED) {
          isPlaying = false;
          iconPlay.style.display = 'block';
          iconPause.style.display = 'none';
          equalizerAnim.classList.remove('playing');
          stopYtProgressLoop();
        } else if (event.data === YT.PlayerState.BUFFERING) {
          bufferingSpinner.style.display = 'block';
        } else if (event.data === YT.PlayerState.ENDED) {
          stopYtProgressLoop();
          if (isRepeat) {
            ytPlayer.seekTo(0, true);
            ytPlayer.playVideo();
          } else {
            playNextTrack();
          }
        }
      }
    }
  });
};

function startYtProgressLoop() {
  stopYtProgressLoop();
  ytProgressTimer = setInterval(() => {
    if (activeEngine !== 'yt' || !ytPlayerReady || !ytPlayer.getCurrentTime) return;
    const cur = ytPlayer.getCurrentTime() || 0;
    const dur = ytPlayer.getDuration() || 0;
    if (dur > 0) {
      const progress = (cur / dur) * 100;
      progressBarFill.style.width = `${progress}%`;
      progressThumb.style.left = `${progress}%`;
      currentTimeLabel.textContent = formatTime(cur);
      totalDurationLabel.textContent = formatTime(dur);
    }
  }, 250);
}

function stopYtProgressLoop() {
  if (ytProgressTimer) {
    clearInterval(ytProgressTimer);
    ytProgressTimer = null;
  }
}

async function resolveYouTubeVideoIds(searchQuery) {
  const q = encodeURIComponent(searchQuery);
  const ytSearchUrls = [
    `${API_BASE}/api/yt/results?search_query=${q}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}`)}`
  ];

  for (const url of ytSearchUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const html = await res.text();
      // Match strictly actual search result videoRenderers first (never sidebar/ad promos)
      let matches = [...html.matchAll(/"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"/g)];
      if (matches.length === 0) {
        matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)];
      }
      const uniqueIds = [...new Set(matches.map(m => m[1]))];
      if (uniqueIds.length > 0) {
        return uniqueIds.slice(0, 6);
      }
    } catch (_) {}
  }
  return [];
}

function normalizeStr(s) {
  return (s || '').toLowerCase().split('(')[0].split('[')[0].split('-')[0].replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isExactSongMatch(candidate, targetTitle, targetArtist) {
  const cTitle = normalizeStr(candidate.title);
  const tTitle = normalizeStr(targetTitle);
  if (!cTitle || !tTitle || cTitle !== tTitle) return false;

  const primaryTargetArtist = normalizeStr((targetArtist || '').split(',')[0].split('&')[0]);
  const cArtist = normalizeStr(candidate.artist);
  if (!primaryTargetArtist || primaryTargetArtist.length < 2 || !cArtist) return false;

  return cArtist === primaryTargetArtist || cArtist.startsWith(primaryTargetArtist + ' ') || cArtist.endsWith(' ' + primaryTargetArtist);
}

// Format Seconds -> M:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Load Track into Player
async function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= currentTrackList.length) return;
  currentTrackIndex = index;
  const track = currentTrackList[currentTrackIndex];

  // Stop both engines cleanly before switching
  audio.pause();
  stopYtProgressLoop();
  if (ytPlayerReady && ytPlayer && ytPlayer.stopVideo) {
    try { ytPlayer.stopVideo(); } catch (_) {}
  }

  playerTrackTitle.textContent = track.title;
  playerTrackArtist.textContent = track.artist;
  playerCoverImg.src = track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
  
  updateLikeButtonUI(track.id);
  currentTimeLabel.textContent = "0:00";
  totalDurationLabel.textContent = formatTime(track.duration || 0);
  progressBarFill.style.width = "0%";
  progressThumb.style.left = "0%";
  highlightActiveTrackInTables(track.id);

  // Upgrade any Global Catalog track to a verified 100% Full-Length stream when playing
  if (autoPlay && track.needsFullResolve && !track.resolvedFull) {
    bufferingSpinner.style.display = 'block';
    try {
      // 1. Try Exact Title === Title AND Artist === Artist on official 320kbps server
      const fullMatches = await fetchFullLengthTracks(`${track.title} ${track.artist}`);
      const exactMatch = fullMatches.find(m => isExactSongMatch(m, track.title, track.artist));
      if (exactMatch && exactMatch.streamUrl) {
        track.streamUrl = exactMatch.streamUrl;
        track.duration = exactMatch.duration || track.duration;
        if (exactMatch.cover) {
          track.cover = exactMatch.cover;
          playerCoverImg.src = exactMatch.cover;
        }
        track.resolvedFull = true;
      } else if (ytPlayerReady) {
        // 2. Otherwise use Official YouTube Audio Engine (strictly matching videoRenderer results)
        const videoIds = await resolveYouTubeVideoIds(`${track.title} ${track.artist} official audio lyrics`);
        if (videoIds.length > 0) {
          track.ytVideoId = videoIds[0];
          track.ytCandidateIds = videoIds.slice(1);
          track.resolvedFull = true;
        }
      }
    } catch (_) {}
    bufferingSpinner.style.display = 'none';
  }

  // Setup Windows & Android Media Session
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      album: track.album || "Spudaypay Hybrid",
      artwork: [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }]
    });
  }

  if (track.ytVideoId && ytPlayerReady) {
    activeEngine = 'yt';
    ytPlayer.loadVideoById(track.ytVideoId);
    if (!autoPlay) {
      ytPlayer.pauseVideo();
    }
  } else if (track.streamUrl) {
    activeEngine = 'html5';
    audio.src = track.streamUrl;
    audio.load();
    if (autoPlay) {
      playTrack();
    }
  }
}

// Play / Pause Functions
function playTrack() {
  const current = currentTrackList[currentTrackIndex];
  if (current && current.needsFullResolve && !current.resolvedFull) {
    loadTrack(currentTrackIndex, true);
    return;
  }
  if (activeEngine === 'yt' && ytPlayerReady) {
    ytPlayer.playVideo();
    return;
  }
  bufferingSpinner.style.display = 'block';
  audio.play()
    .then(() => {
      isPlaying = true;
      iconPlay.style.display = 'none';
      iconPause.style.display = 'block';
      equalizerAnim.classList.add('playing');
      bufferingSpinner.style.display = 'none';
    })
    .catch(err => {
      bufferingSpinner.style.display = 'none';
      console.warn("Playback prevented or stream error:", err);
    });
}

function pauseTrack() {
  if (activeEngine === 'yt' && ytPlayerReady) {
    ytPlayer.pauseVideo();
  } else {
    audio.pause();
  }
  isPlaying = false;
  iconPlay.style.display = 'block';
  iconPause.style.display = 'none';
  equalizerAnim.classList.remove('playing');
}

function togglePlayPause() {
  if (isPlaying) {
    pauseTrack();
  } else {
    playTrack();
  }
}

function playNextTrack() {
  if (isShuffled) {
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * currentTrackList.length);
    } while (nextIndex === currentTrackIndex && currentTrackList.length > 1);
    loadTrack(nextIndex, true);
  } else {
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= currentTrackList.length) {
      nextIndex = isRepeat ? 0 : 0;
    }
    loadTrack(nextIndex, true);
  }
}

function playPrevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    prevIndex = currentTrackList.length - 1;
  }
  loadTrack(prevIndex, true);
}

// Audio Engine Events
function setupAudioEvents() {
  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBarFill.style.width = `${progress}%`;
    progressThumb.style.left = `${progress}%`;
    currentTimeLabel.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('loadedmetadata', () => {
    totalDurationLabel.textContent = formatTime(audio.duration);
    bufferingSpinner.style.display = 'none';
  });

  audio.addEventListener('waiting', () => {
    bufferingSpinner.style.display = 'block';
  });

  audio.addEventListener('playing', () => {
    bufferingSpinner.style.display = 'none';
  });

  audio.addEventListener('ended', () => {
    if (isRepeat) {
      audio.currentTime = 0;
      playTrack();
    } else {
      playNextTrack();
    }
  });

  // Windows Media Session Action Handlers
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', playTrack);
    navigator.mediaSession.setActionHandler('pause', pauseTrack);
    navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime && audio.duration) {
        audio.currentTime = details.seekTime;
      }
    });
  }
}

// Control Buttons & Scrubber Handlers
function setupControls() {
  btnPlayPause.addEventListener('click', togglePlayPause);
  btnNext.addEventListener('click', playNextTrack);
  btnPrev.addEventListener('click', playPrevTrack);

  btnShuffle.addEventListener('click', () => {
    isShuffled = !isShuffled;
    btnShuffle.classList.toggle('active', isShuffled);
  });

  btnRepeat.addEventListener('click', () => {
    isRepeat = !isRepeat;
    btnRepeat.classList.toggle('active', isRepeat);
  });

  // Seek bar scrub
  progressBarContainer.addEventListener('click', (e) => {
    const rect = progressBarContainer.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (activeEngine === 'yt' && ytPlayerReady && ytPlayer.getDuration) {
      const dur = ytPlayer.getDuration();
      if (dur > 0) ytPlayer.seekTo(clickRatio * dur, true);
    } else if (audio.duration) {
      audio.currentTime = clickRatio * audio.duration;
    }
  });

  // Volume slider scrub
  volumeBarContainer.addEventListener('click', (e) => {
    const rect = volumeBarContainer.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(ratio);
  });

  btnMute.addEventListener('click', toggleMute);

  // Like track
  playerLikeBtn.addEventListener('click', () => {
    const current = currentTrackList[currentTrackIndex];
    if (current) toggleLikeTrack(current);
  });

  // Surprise Me / Random
  btnRandom.addEventListener('click', () => {
    const randomIdx = Math.floor(Math.random() * currentTrackList.length);
    loadTrack(randomIdx, true);
  });
}

function setVolume(val) {
  audio.volume = val;
  if (ytPlayerReady && ytPlayer && ytPlayer.setVolume) {
    try { ytPlayer.setVolume(Math.round(val * 100)); } catch (_) {}
  }
  volumeBarFill.style.width = `${val * 100}%`;
  if (val === 0) {
    isMuted = true;
    iconVolHigh.style.display = 'none';
    iconVolMuted.style.display = 'block';
  } else {
    isMuted = false;
    previousVolume = val;
    iconVolHigh.style.display = 'block';
    iconVolMuted.style.display = 'none';
  }
}

function toggleMute() {
  if (isMuted) {
    setVolume(previousVolume || 0.8);
  } else {
    previousVolume = audio.volume;
    setVolume(0);
  }
}

// Navigation Tabs
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item[data-tab], .mobile-nav-item[data-tab]');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      switchView(targetTab);
    });
  });

  // Mobile Add MP3 button
  const btnMobileDrop = document.getElementById('btnMobileDropFiles');
  if (btnMobileDrop) {
    btnMobileDrop.addEventListener('click', () => localFileInput.click());
  }

  // Curated genre filter buttons
  const genrePills = document.querySelectorAll('.playlist-pill');
  genrePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const genre = pill.getAttribute('data-genre');
      document.querySelectorAll(`.playlist-pill`).forEach(p => {
        p.classList.toggle('active', p.getAttribute('data-genre') === genre);
      });
      filterGenre(genre);
    });
  });

  // Register Service Worker & PWA Install Handler
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  let deferredPrompt = null;
  const btnInstallApp = document.getElementById('btnInstallApp');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstallApp) btnInstallApp.style.display = 'flex';
  });

  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btnInstallApp.style.display = 'none';
    });
  }
}

function switchView(tabName) {
  document.querySelectorAll('.nav-item[data-tab], .mobile-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  const activeView = document.getElementById(`view${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (activeView) activeView.classList.add('active');

  if (tabName === 'liked') renderLikedSongsTable();
  if (tabName === 'library') renderLibraryGrid();
}

function filterGenre(genre) {
  switchView('home');
  if (genre === 'all') {
    currentTrackList = [...CURATED_TRACKS];
    currentGenreLabel.textContent = "All Tracks";
  } else {
    currentTrackList = CURATED_TRACKS.filter(t => t.genre === genre);
    currentGenreLabel.textContent = genre.toUpperCase();
  }
  renderFeaturedGrid(currentTrackList);
}

// Render Quick Picks (Top 6 cards)
function renderQuickPicks() {
  quickPicksGrid.innerHTML = '';
  CURATED_TRACKS.slice(0, 6).forEach((track, idx) => {
    const card = document.createElement('div');
    card.className = 'quick-pick-card';
    card.innerHTML = `
      <img src="${track.cover}" alt="${track.title}">
      <div class="quick-pick-info">${track.title}</div>
      <div class="quick-pick-play-btn">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
      </div>
    `;
    card.addEventListener('click', () => {
      currentTrackList = [...CURATED_TRACKS];
      loadTrack(idx, true);
    });
    quickPicksGrid.appendChild(card);
  });
}

// Render Featured Grid
function renderFeaturedGrid(tracks) {
  featuredGrid.innerHTML = '';
  tracks.forEach((track, idx) => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${track.cover}" alt="${track.title}" loading="lazy">
        <div class="card-floating-play">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        </div>
      </div>
      <div class="card-title">${track.title}</div>
      <div class="card-artist">${track.artist}</div>
    `;
    card.addEventListener('click', () => {
      currentTrackList = tracks;
      loadTrack(idx, true);
    });
    featuredGrid.appendChild(card);
  });
}

// Render Library
function renderLibraryGrid() {
  libraryGrid.innerHTML = '';
  const allTracks = [...CURATED_TRACKS];
  allTracks.forEach((track, idx) => {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${track.cover}" alt="${track.title}" loading="lazy">
        <div class="card-floating-play">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        </div>
      </div>
      <div class="card-title">${track.title}</div>
      <div class="card-artist">${track.artist}</div>
    `;
    card.addEventListener('click', () => {
      currentTrackList = allTracks;
      loadTrack(idx, true);
    });
    libraryGrid.appendChild(card);
  });
}

// Online Live Search (Hybrid Search Engine)
function setupSearch() {
  let searchDebounce;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearSearchBtn.style.display = query ? 'block' : 'none';

    clearTimeout(searchDebounce);
    if (!query) return;

    searchDebounce = setTimeout(() => {
      performSearch(query);
    }, 350);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    switchView('home');
  });

  // Handle direct audio URL pasted into search
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = searchInput.value.trim();
      if (val.startsWith('http') && (val.includes('.mp3') || val.includes('.m4a') || val.includes('audio'))) {
        const customTrack = {
          id: `custom-${Date.now()}`,
          title: "Direct Stream Audio",
          artist: "Online Stream",
          album: "Custom URL",
          duration: 0,
          cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop",
          streamUrl: val
        };
        currentTrackList = [customTrack, ...currentTrackList];
        loadTrack(0, true);
      }
    }
  });
}

function decodeHtmlEntities(str) {
  if (!str) return "";
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function decryptJioSaavnUrl(encryptedMediaUrl) {
  if (!encryptedMediaUrl || typeof CryptoJS === 'undefined') return null;
  try {
    const key = CryptoJS.enc.Utf8.parse("38346591");
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedMediaUrl);
    const decrypted = CryptoJS.DES.decrypt(
      { ciphertext: ciphertext },
      key,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    let url = decrypted.toString(CryptoJS.enc.Utf8);
    if (!url || !url.startsWith('http')) return null;
    if (url.includes('_96.mp4')) {
      url = url.replace('_96.mp4', '_320.mp4');
    } else if (url.includes('_160.mp4')) {
      url = url.replace('_160.mp4', '_320.mp4');
    }
    return url.replace(/^http:\/\//i, 'https://');
  } catch (e) {
    return null;
  }
}

async function fetchFullLengthTracks(query) {
  const q = encodeURIComponent(query);
  const officialApiPath = `api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=20&p=1&q=${q}`;

  // 1. Official JioSaavn Production API (with direct in-browser DES decryption)
  const officialUrls = [
    `${API_BASE}/api/jiosaavn/${officialApiPath}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.jiosaavn.com/${officialApiPath}`)}`,
    `https://corsproxy.io/?${encodeURIComponent(`https://www.jiosaavn.com/${officialApiPath}`)}`
  ];

  for (const url of officialUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const results = json?.results || [];
      if (results.length > 0) {
        const mapped = results.map(item => {
          const encUrl = item?.more_info?.encrypted_media_url;
          const streamUrl = decryptJioSaavnUrl(encUrl);
          const artistMap = item?.more_info?.artistMap?.primary_artists || [];
          const artistStr = artistMap.length > 0
            ? artistMap.map(a => a.name).join(', ')
            : (item.subtitle || "Artist");
          const coverUrl = (item.image || '').replace('150x150', '500x500').replace(/^http:\/\//i, 'https://');

          return {
            id: `saavn-${item.id}`,
            title: decodeHtmlEntities(item.title || item.song),
            artist: decodeHtmlEntities(artistStr),
            album: decodeHtmlEntities(item?.more_info?.album || item.title || "Single"),
            duration: Number(item?.more_info?.duration) || 210,
            cover: coverUrl,
            streamUrl: streamUrl
          };
        }).filter(t => t.streamUrl);

        if (mapped.length > 0) return mapped;
      }
    } catch (_) {}
  }

  // 2. Fallback Wrapper Mirrors
  const wrapperUrls = [
    `${API_BASE}/api/saavn/search/songs?query=${q}&limit=20`,
    `${API_BASE}/api/saavn2/search/songs?query=${q}&limit=20`,
    `${API_BASE}/api/saavn3/search/songs?query=${q}&limit=20`
  ];

  for (const url of wrapperUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      const results = json?.data?.results || json?.results || [];
      if (results.length > 0) {
        const mapped = results.map(item => {
          const dlList = item.downloadUrl || item.download_url || [];
          const bestAudio = Array.isArray(dlList) && dlList.length > 0
            ? (dlList[dlList.length - 1].url || dlList[dlList.length - 1].link)
            : (typeof dlList === 'string' ? dlList : null);
          const imgList = item.image || [];
          const bestImg = Array.isArray(imgList) && imgList.length > 0
            ? (imgList[imgList.length - 1].url || imgList[imgList.length - 1].link)
            : (typeof imgList === 'string' ? imgList : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop');
          const artistStr = item.artists?.primary
            ? item.artists.primary.map(a => a.name).join(', ')
            : (item.primaryArtists || item.artist || item.subtitle || "Artist");

          return {
            id: `full-${item.id}`,
            title: decodeHtmlEntities(item.name || item.title),
            artist: decodeHtmlEntities(artistStr),
            album: decodeHtmlEntities(item.album?.name || item.album || item.name || "Full Track"),
            duration: Number(item.duration) || 210,
            cover: bestImg.replace(/^http:\/\//i, 'https://'),
            streamUrl: bestAudio ? bestAudio.replace(/^http:\/\//i, 'https://') : null
          };
        }).filter(t => t.streamUrl);

        if (mapped.length > 0) return mapped;
      }
    } catch (_) {}
  }

  return [];
}

async function performSearch(query) {
  switchView('search');
  searchStatusBar.style.display = 'flex';
  document.getElementById('searchResultsTitle').textContent = `Search results for "${query}"`;
  searchTableBody.innerHTML = '';

  // 1. Search in local curated library
  const localMatches = CURATED_TRACKS.filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) || 
    t.artist.toLowerCase().includes(query.toLowerCase()) ||
    t.album.toLowerCase().includes(query.toLowerCase())
  );

  // 2. Fetch Official Global Catalog (100% accurate official song titles, artists, and album covers)
  let globalCatalogTracks = [];
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`);
    const data = await res.json();
    if (data.results) {
      globalCatalogTracks = data.results.map(item => ({
        id: `global-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        album: item.collectionName || item.trackName,
        duration: Math.round(item.trackTimeMillis / 1000) || 180,
        cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '400x400bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
        streamUrl: item.previewUrl,
        needsFullResolve: true
      }));
    }
  } catch (_) {}

  searchStatusBar.style.display = 'none';

  // Deduplicate by title + artist
  const seen = new Set();
  const combinedResults = [];
  for (const t of [...localMatches, ...globalCatalogTracks]) {
    const key = `${normalizeStr(t.title)}|${normalizeStr(t.artist)}`;
    if (!seen.has(key)) {
      seen.add(key);
      combinedResults.push(t);
    }
  }

  if (combinedResults.length === 0) {
    searchTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-dim)">No matching tracks found. Try searching another song or artist.</td></tr>`;
    return;
  }

  currentTrackList = combinedResults;
  renderTableRows(searchTableBody, combinedResults);
}

function renderTableRows(tableBody, tracks) {
  tableBody.innerHTML = '';
  tracks.forEach((track, idx) => {
    const isLiked = likedSongs.has(track.id);
    const row = document.createElement('tr');
    row.setAttribute('data-track-id', track.id);
    row.innerHTML = `
      <td class="table-index">${idx + 1}</td>
      <td>
        <div class="table-track-cell">
          <img src="${track.cover}" alt="${track.title}">
          <div>
            <div class="table-title">${track.title}</div>
            <div class="table-artist-sub">${track.artist}</div>
          </div>
        </div>
      </td>
      <td class="table-meta-text">${track.album || track.artist}</td>
      <td style="text-align: center">
        <button class="btn-like ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" title="Like">
          <svg viewBox="0 0 24 24" fill="${isLiked ? '#ec4899' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
      </td>
      <td style="text-align: right; color: var(--text-dim)">${formatTime(track.duration || 0)}</td>
    `;

    // Row click -> Play
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-like')) return;
      loadTrack(idx, true);
    });

    // Like click
    const likeBtn = row.querySelector('.btn-like');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLikeTrack(track);
      likeBtn.classList.toggle('liked', likedSongs.has(track.id));
      const svg = likeBtn.querySelector('svg');
      svg.setAttribute('fill', likedSongs.has(track.id) ? '#ec4899' : 'none');
    });

    tableBody.appendChild(row);
  });
}

function highlightActiveTrackInTables(trackId) {
  document.querySelectorAll('.track-table tr').forEach(r => {
    r.classList.toggle('active-track', r.getAttribute('data-track-id') === trackId);
  });
}

// Liked Songs Management (Saved in localStorage)
function loadLikedSongsFromStorage() {
  try {
    const raw = localStorage.getItem('synapse_liked_songs');
    if (raw) {
      const arr = JSON.parse(raw);
      likedSongs = new Set(arr);
    }
  } catch (e) {
    likedSongs = new Set();
  }
  updateLikedBadge();
}

function saveLikedSongsToStorage() {
  localStorage.setItem('synapse_liked_songs', JSON.stringify([...likedSongs]));
  updateLikedBadge();
}

function updateLikedBadge() {
  likedCountBadge.textContent = likedSongs.size;
  likedHeroSubtitle.textContent = `${likedSongs.size} song${likedSongs.size === 1 ? '' : 's'} saved in your private session`;
}

function toggleLikeTrack(track) {
  if (likedSongs.has(track.id)) {
    likedSongs.delete(track.id);
  } else {
    likedSongs.add(track.id);
  }
  saveLikedSongsToStorage();
  updateLikeButtonUI(track.id);
}

function updateLikeButtonUI(trackId) {
  const isLiked = likedSongs.has(trackId);
  playerLikeBtn.classList.toggle('liked', isLiked);
  const svg = playerLikeBtn.querySelector('svg');
  svg.setAttribute('fill', isLiked ? '#ec4899' : 'none');
}

function renderLikedSongsTable() {
  const likedList = CURATED_TRACKS.filter(t => likedSongs.has(t.id));
  if (likedList.length === 0) {
    likedTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-dim)">You haven't liked any songs yet. Click the heart icon on any song to save it here!</td></tr>`;
    return;
  }
  renderTableRows(likedTableBody, likedList);
}

// Local File Upload / Drag & Drop
function setupLocalFileImport() {
  btnDropFiles.addEventListener('click', () => {
    localFileInput.click();
  });

  localFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const importedTracks = files.map((file, idx) => ({
      id: `local-${Date.now()}-${idx}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Audio File",
      album: "Local Storage",
      duration: 0,
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop",
      streamUrl: URL.createObjectURL(file)
    }));

    currentTrackList = [...importedTracks, ...currentTrackList];
    switchView('library');
    loadTrack(0, true);
  });
}

// Keyboard Shortcuts
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // If typing in search input, don't hijack keys
    if (document.activeElement === searchInput) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'ArrowRight') {
      if (audio.duration) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
      }
    } else if (e.code === 'ArrowLeft') {
      if (audio.duration) {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
    } else if (e.key.toLowerCase() === 'm') {
      toggleMute();
    } else if (e.key.toLowerCase() === 's') {
      isShuffled = !isShuffled;
      btnShuffle.classList.toggle('active', isShuffled);
    } else if (e.key.toLowerCase() === 'r') {
      isRepeat = !isRepeat;
      btnRepeat.classList.toggle('active', isRepeat);
    }
  });
}
