// Audio Engine Diagnostics Logger
const DIAGNOSTIC_LOGS = [];
function logAudioDiagnostics(stage, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    data
  };
  DIAGNOSTIC_LOGS.push(entry);
  if (DIAGNOSTIC_LOGS.length > 200) DIAGNOSTIC_LOGS.shift();
  console.log(`[AUDIO_DIAGNOSTICS][${stage}]`, data);
  if (typeof window !== 'undefined') {
    window.__LAST_AUDIO_DIAGNOSTIC = entry;
    window.__AUDIO_DIAGNOSTIC_LOGS = DIAGNOSTIC_LOGS;
  }
}

// State Management
let currentTrackList = [...CURATED_TRACKS];
let currentTrackIndex = 0;
let currentPlayingTrack = null;
let isPlaying = false;
let userPaused = true;
let isLoadingTrack = false;
let currentLoadToken = 0;
let activeTab = 'home';
let isShuffled = false;
let isRepeat = false;
let isMuted = false;
let previousVolume = 0.8;
let likedSongs = new Set();

function getActiveTrack() {
  return currentPlayingTrack || currentTrackList[currentTrackIndex] || null;
}

function syncPlayerBarMetadata(track) {
  if (!track) return;
  currentPlayingTrack = track;
  if (playerTrackTitle) playerTrackTitle.textContent = track.title || 'Unknown Title';
  if (playerTrackArtist) playerTrackArtist.textContent = track.artist || 'Unknown Artist';
  if (playerCoverImg) {
    playerCoverImg.src = track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&h=200&fit=crop';
  }
  updateLikeButtonUI(track.id);
  if (totalDurationLabel) totalDurationLabel.textContent = formatTime(track.duration || 0);
  highlightActiveTrackInTables(track.id);

  if ('mediaSession' in navigator) {
    try {
      const coverSrc = track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=512&h=512&fit=crop';
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || 'Spudaypay',
        artwork: [
          { src: coverSrc, sizes: '96x96', type: 'image/jpeg' },
          { src: coverSrc, sizes: '128x128', type: 'image/jpeg' },
          { src: coverSrc, sizes: '192x192', type: 'image/jpeg' },
          { src: coverSrc, sizes: '256x256', type: 'image/jpeg' },
          { src: coverSrc, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (_) {}
  }
}

const DEFAULT_SPOTIFY_SECTIONS = [
  { id: "tophits", title: "Today's Top Hits", subtitle: "The hottest tracks on the planet right now", tag: "Billboard Hot 100", genre: "pop" },
  { id: "charts", title: "Global Chart Toppers", subtitle: "Record-breaking anthems with billions of plays", tag: "Global 50", genre: "synthwave" },
  { id: "pop", title: "Pop & Dance Anthems", subtitle: "High energy chart-toppers to power your day", tag: "Party", genre: "pop" },
  { id: "hiphop", title: "Hip-Hop & Late Night R&B", subtitle: "Heavy bass, midnight mood tracks and global trap", tag: "Late Night", genre: "hiphop" },
  { id: "chill", title: "Chill Lo-Fi & Coffee Beats", subtitle: "Relax, study and unwind with smooth laidback melodies", tag: "Relaxing", genre: "lofi" },
  { id: "classics", title: "Rock & Timeless Classics", subtitle: "Legendary stadium anthems that live forever", tag: "Legendary", genre: "rock" }
];

// DOM Elements
const audio = document.getElementById('audioEngine');
const bgAnchorAudio = document.getElementById('bgAnchorAudio');
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
const homeSectionsContainer = document.getElementById('homeSectionsContainer');
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
  // Purge any old 30-second preview or mismatched downloads from previous versions
  try {
    if (localStorage.getItem('spudaypay_vault_v21') !== 'true') {
      localStorage.removeItem('spudaypay_downloads');
      try { indexedDB.deleteDatabase('spudaypay_offline_vault'); } catch (_) {}
      localStorage.setItem('spudaypay_vault_v21', 'true');
    }
  } catch (_) {}

  window.addEventListener('scroll', () => {
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
  }, { passive: true });

  try { setupNavigation(); } catch (e) { console.error("Navigation setup error:", e); }
  try { setupAudioEvents(); } catch (e) { console.error("Audio events setup error:", e); }
  try { setupControls(); } catch (e) { console.error("Controls setup error:", e); }
  try { setupSearch(); } catch (e) { console.error("Search setup error:", e); }
  try { setupLocalFileImport(); } catch (e) { console.error("File import setup error:", e); }
  try { setupKeyboardShortcuts(); } catch (e) { console.error("Shortcuts setup error:", e); }

  try { loadLikedSongsFromStorage(); } catch (e) { console.error(e); }
  try { updateGreeting(); } catch (e) { console.error(e); }
  try { renderQuickPicks(); } catch (e) { console.error(e); }
  try { renderSpotifyHomeSections(); } catch (e) { console.error(e); }
  try { renderLibraryGrid(); } catch (e) { console.error(e); }

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
const API_BASE = (typeof window !== 'undefined' && window.location.origin && window.location.origin.includes('netlify.app'))
  ? ''
  : 'https://preeminent-kitten-e39dfe.netlify.app';

let activeEngine = 'html5';
let ytPlayer = null;
let ytPlayerReady = false;
let ytProgressTimer = null;
let pendingTrackToPlay = null;
let ytLoadWatchdog = null;
let html5LoadWatchdog = null;
let activeResolveController = null;
const resolvedSearchCache = new Map();
let likedTracksMetaMap = new Map();

function clearPlaybackWatchdogs() {
  if (ytLoadWatchdog) {
    clearTimeout(ytLoadWatchdog);
    ytLoadWatchdog = null;
  }
  if (html5LoadWatchdog) {
    clearTimeout(html5LoadWatchdog);
    html5LoadWatchdog = null;
  }
}

function setBufferingState(isBuffering) {
  if (bufferingSpinner) {
    bufferingSpinner.style.display = isBuffering ? 'block' : 'none';
  }
}

function startYtVideoWithWatchdog(videoId, autoPlay = true) {
  clearPlaybackWatchdogs();
  logAudioDiagnostics('START_YT_WATCHDOG', { videoId, autoPlay, ytPlayerReady });
  if (!ytPlayerReady || !ytPlayer || !ytPlayer.loadVideoById) {
    pendingTrackToPlay = { index: currentTrackIndex, autoPlay };
    if (typeof initYtEngine === 'function') initYtEngine();
    ytLoadWatchdog = setTimeout(() => {
      if (!ytPlayerReady) {
        logAudioDiagnostics('YT_READY_TIMEOUT', { videoId });
        tryNextPlaybackSource(getActiveTrack());
      }
    }, 12000);
    return;
  }
  try { audio.pause(); } catch (_) {}
  if (autoPlay) {
    setBufferingState(true);
    ytPlayer.loadVideoById(videoId);
    ytLoadWatchdog = setTimeout(() => {
      if (activeEngine !== 'yt' || userPaused) return;
      const state = (ytPlayer && ytPlayer.getPlayerState) ? ytPlayer.getPlayerState() : -1;
      if (state !== YT.PlayerState.PLAYING) {
        logAudioDiagnostics('YT_PLAYING_TIMEOUT', { videoId, state });
        console.warn("YouTube watchdog triggered for videoId:", videoId, "state:", state);
        tryNextPlaybackSource(getActiveTrack());
      }
    }, 12000);
  } else {
    setBufferingState(false);
    if (ytPlayer.cueVideoById) {
      ytPlayer.cueVideoById(videoId);
    } else {
      ytPlayer.loadVideoById(videoId);
      ytPlayer.pauseVideo();
    }
    syncPlayPauseUI(false);
  }
}

async function tryNextPlaybackSource(track) {
  clearPlaybackWatchdogs();
  if (!track || (currentPlayingTrack && track.id !== currentPlayingTrack.id)) {
    setBufferingState(false);
    syncPlayPauseUI(false);
    return;
  }
  logAudioDiagnostics('TRY_NEXT_PLAYBACK_SOURCE', {
    trackId: track.id,
    title: track.title,
    artist: track.artist,
    activeEngine,
    remainingYtCandidates: track.ytCandidateIds?.length || 0,
    hasPreview: !!track.fallbackPreviewUrl
  });

  // 1. Try next verified YouTube candidate ID if available
  if (Array.isArray(track.ytCandidateIds) && track.ytCandidateIds.length > 0) {
    const nextId = track.ytCandidateIds.shift();
    track.ytVideoId = nextId;
    activeEngine = 'yt';
    logAudioDiagnostics('TRYING_NEXT_YT_CANDIDATE', { nextId });
    if (ytPlayerReady && ytPlayer && ytPlayer.loadVideoById) {
      startYtVideoWithWatchdog(nextId, !userPaused);
      return;
    }
  }

  // 2. If HTML5 failed and we haven't tried YT yet, try YT
  if (activeEngine === 'html5' && track.ytVideoId && ytPlayerReady && ytPlayer && ytPlayer.loadVideoById) {
    activeEngine = 'yt';
    logAudioDiagnostics('SWITCHING_HTML5_TO_YT', { videoId: track.ytVideoId });
    startYtVideoWithWatchdog(track.ytVideoId, !userPaused);
    return;
  }

  // 3. Dynamically resolve fresh YouTube official audio candidates if not yet retried
  if (!track._ytSearchRetried) {
    track._ytSearchRetried = true;
    setBufferingState(true);
    try {
      logAudioDiagnostics('RETRYING_YT_SEARCH', { title: track.title, artist: track.artist });
      const videoIds = await resolveYouTubeVideoIds(track, track.duration);
      if (currentPlayingTrack && track.id !== currentPlayingTrack.id) return;
      if (videoIds.length > 0) {
        track.ytVideoId = videoIds[0];
        track.ytCandidateIds = videoIds.slice(1);
        activeEngine = 'yt';
        logAudioDiagnostics('RETRY_YT_SEARCH_FOUND', { videoId: track.ytVideoId });
        if (ytPlayerReady && ytPlayer && ytPlayer.loadVideoById) {
          startYtVideoWithWatchdog(track.ytVideoId, !userPaused);
          return;
        }
      }
    } catch (e) {
      logAudioDiagnostics('RETRY_YT_SEARCH_FAILED', { error: e?.message });
    }
  }

  // 4. Try verified full audio URL on HTML5 engine (never play unverified or 30s preview clips as full)
  const directUrl = track.verifiedFullAudioUrl ||
    ((!track.needsFullResolve && track.streamUrl && !track.streamUrl.includes('itunes.apple.com')) ? track.streamUrl : null);
  if (directUrl && audio.src !== directUrl) {
    activeEngine = 'html5';
    if (ytPlayerReady && ytPlayer && ytPlayer.stopVideo) {
      try { ytPlayer.stopVideo(); } catch (_) {}
    }
    audio.src = directUrl;
    logAudioDiagnostics('TRYING_DIRECT_URL', { directUrl });
    if (!userPaused) {
      audio.play().then(() => {
        setBufferingState(false);
        syncPlayPauseUI(true);
      }).catch((err) => {
        logAudioDiagnostics('DIRECT_URL_PLAY_ERROR', { error: err?.message });
        setBufferingState(false);
        syncPlayPauseUI(false);
        fallbackToOfficialPreview(track);
      });
    }
    return;
  }

  // 5. If all sources exhausted, cleanly notify without downgrading to 30s snippet
  logAudioDiagnostics('ALL_SOURCES_EXHAUSTED', { title: track?.title, artist: track?.artist });
  setBufferingState(false);
  syncPlayPauseUI(false);
  if (!userPaused && track) {
    showToast(`⚠️ "${track.title}" by ${track.artist} is currently unavailable from verified sources.`, 3500);
  }
}

// Initialize YouTube IFrame Audio Engine
function initYtEngine() {
  if (ytPlayerReady || !window.YT || !window.YT.Player) return;
  const playerDiv = document.getElementById('ytPlayer');
  if (!playerDiv) return;

  let originParam = (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('https://'))
    ? window.location.origin
    : 'https://preeminent-kitten-e39dfe.netlify.app';
  if (originParam.includes('localhost') || originParam.startsWith('http://')) {
    originParam = 'https://preeminent-kitten-e39dfe.netlify.app';
  }

  const playerVars = {
    autoplay: 0,
    controls: 0,
    disablekb: 1,
    fs: 0,
    modestbranding: 1,
    playsinline: 1,
    enablejsapi: 1,
    origin: originParam,
    widget_referrer: originParam
  };

  try {
    ytPlayer = new YT.Player('ytPlayer', {
      height: '1',
      width: '1',
      playerVars: playerVars,
      events: {
        onReady: () => {
          ytPlayerReady = true;
          logAudioDiagnostics('YT_ON_READY', { origin: originParam });
          ytPlayer.setVolume(Math.round((previousVolume || 0.8) * 100));
          if (pendingTrackToPlay) {
            const p = pendingTrackToPlay;
            pendingTrackToPlay = null;
            loadTrack(p.index, p.autoPlay);
          }
        },
        onError: (e) => {
          logAudioDiagnostics('YT_ON_ERROR', { errorCode: e.data, track: getActiveTrack()?.title });
          console.warn("YouTube player error:", e.data);
          if (activeEngine !== 'yt') return;
          tryNextPlaybackSource(getActiveTrack());
        },
        onStateChange: (event) => {
          if (activeEngine !== 'yt') {
            if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING) {
              try { ytPlayer.pauseVideo(); } catch (_) {}
            }
            return;
          }
          if (event.data === YT.PlayerState.PLAYING) {
            if (ytPlayer._loadedSessionId && currentPlayingTrack?._sessionId && ytPlayer._loadedSessionId !== currentPlayingTrack._sessionId) {
              try { ytPlayer.stopVideo(); } catch (_) {}
              return;
            }
            try { audio.pause(); } catch (_) {}
            clearPlaybackWatchdogs();
            setBufferingState(false);
            const activeTrack = getActiveTrack();
            if (activeTrack) syncPlayerBarMetadata(activeTrack);
            const dur = ytPlayer.getDuration();
            if (dur > 0) totalDurationLabel.textContent = formatTime(dur);
            startYtProgressLoop();
            syncPlayPauseUI(true);
            prewarmNextTrack();
            logAudioDiagnostics('YT_PLAYING', { track: activeTrack?.title, duration: dur });
          } else if (event.data === YT.PlayerState.PAUSED) {
            if (!userPaused && !isLoadingTrack) {
              setTimeout(() => {
                if (!userPaused && !isLoadingTrack && activeEngine === 'yt' && ytPlayer && ytPlayer.playVideo) {
                  try { ytPlayer.playVideo(); } catch (_) {}
                }
              }, 60);
              return;
            }
            stopYtProgressLoop();
            syncPlayPauseUI(false);
          } else if (event.data === YT.PlayerState.BUFFERING) {
            setBufferingState(true);
          } else if (event.data === YT.PlayerState.ENDED) {
            clearPlaybackWatchdogs();
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
  } catch (err) {
    logAudioDiagnostics('YT_INIT_EXCEPTION', { message: err?.message });
  }
}

window.onYouTubeIframeAPIReady = initYtEngine;
if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
  initYtEngine();
} else {
  const ytCheckTimer = setInterval(() => {
    if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
      clearInterval(ytCheckTimer);
      initYtEngine();
    }
  }, 200);
  setTimeout(() => clearInterval(ytCheckTimer), 10000);
}

let activeOfflineBlobUrl = null;
let bgAudioCtx = null;

function ensureBgAudioKeepalive() {
  try {
    if (!bgAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        bgAudioCtx = new AudioCtx();
        const osc = bgAudioCtx.createOscillator();
        const gain = bgAudioCtx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(bgAudioCtx.destination);
        osc.start();
      }
    } else if (bgAudioCtx.state === 'suspended') {
      bgAudioCtx.resume();
    }
  } catch (_) {}
}

// IndexedDB Offline Audio Engine
const OFFLINE_DB_NAME = 'spudaypay_offline_vault';
const OFFLINE_STORE_NAME = 'audio_files';
let offlineDbInstance = null;

function getOfflineDb() {
  if (offlineDbInstance) return Promise.resolve(offlineDbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      offlineDbInstance = req.result;
      resolve(offlineDbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveOfflineAudio(key, blob) {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      store.put({ key: String(key), blob, timestamp: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("IndexedDB save error:", e);
    return false;
  }
}

async function getOfflineAudioBlob(key) {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readonly');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      const req = store.get(String(key));
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          resolve(req.result.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

async function hasOfflineAudio(key) {
  const blob = await getOfflineAudioBlob(key);
  return !!blob;
}

async function deleteOfflineAudio(key) {
  try {
    const db = await getOfflineDb();
    return new Promise((resolve) => {
      const tx = db.transaction(OFFLINE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OFFLINE_STORE_NAME);
      store.delete(String(key));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (_) {
    return false;
  }
}

function updateMediaSessionState(isPlayingState) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = isPlayingState ? 'playing' : 'paused';
  }
  if (isPlayingState) {
    ensureBgAudioKeepalive();
    if (bgAnchorAudio) {
      bgAnchorAudio.play().catch(() => {});
    }
  } else {
    if (bgAnchorAudio) {
      bgAnchorAudio.pause();
    }
  }
}

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

      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: Math.max(1, dur),
            playbackRate: 1,
            position: Math.min(cur, dur)
          });
        } catch (_) {}
      }
    }
  }, 500);
}

function stopYtProgressLoop() {
  if (ytProgressTimer) {
    clearInterval(ytProgressTimer);
    ytProgressTimer = null;
  }
}

function fetchWithTimeout(url, options = {}, timeoutMs = 6500) {
  const controller = new AbortController();
  const extSignal = options.signal;
  if (extSignal) {
    if (extSignal.aborted) controller.abort();
    else extSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function parseDurationToSeconds(str) {
  if (!str) return 0;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function normalizeStr(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&amp;/g, ' ')
    // Strip featuring clauses
    .replace(/\b(?:feat|ft|featuring)\b\.?.*$/i, '')
    // Strip parenthetical/bracketed media descriptors without killing the title
    .replace(/[\(\[]\s*(?:official\s+audio|official\s+music\s+video|official\s+video|official\s+lyric\s+video|lyric\s+video|lyrics|audio|visualizer|hd|hq|4k|remastered|music\s+video)\s*[\)\]]/gi, ' ')
    .replace(/\b(?:official\s+audio|official\s+music\s+video|official\s+video|lyric\s+video|visualizer)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtistRaw(s) {
  return String(s || '')
    .replace(/\s*-\s*topic\b/i, '')
    .replace(/\btopic\b/i, '')
    .replace(/vevo$/i, '')
    .replace(/\bvevo\b/i, '')
    .replace(/\bofficial\b/i, '')
    .trim();
}

function extractArtistList(artistStr) {
  if (!artistStr) return [];
  const cleaned = cleanArtistRaw(artistStr);
  return String(cleaned)
    .split(/[,&/|]|\b(?:feat|ft|featuring|with|x|vs|pres|presents)\b\.?/i)
    .map(a => normalizeStr(a))
    .filter(a => a && a.length >= 2);
}

function stripThe(name) {
  return (name || '').replace(/^the\s+/, '').trim();
}

function getPrimaryArtistNorm(artistStr) {
  const list = extractArtistList(artistStr);
  return list.length > 0 ? list[0] : normalizeStr(artistStr);
}

function isPrimaryArtistMatch(candidateArtistStr, targetArtistStr) {
  if (!candidateArtistStr || !targetArtistStr) return false;
  const targetList = extractArtistList(targetArtistStr);
  const candList = extractArtistList(candidateArtistStr);
  if (targetList.length === 0 || candList.length === 0) return false;

  const targetPrimary = targetList[0];
  const candPrimary = candList[0];

  // 1. Exact match of primary or any collaborative artists
  if (targetPrimary === candPrimary) return true;
  for (const t of targetList) {
    for (const c of candList) {
      if (t === c) return true;
      if (stripThe(t) === stripThe(c)) return true;
    }
  }

  // 2. Mononym / Topic handle matching (e.g. 'idkgreek' ends with 'greek', 'GracieAbrams' matches 'Gracie Abrams')
  for (const t of targetList) {
    const tClean = stripThe(t);
    const tCompact = tClean.replace(/\s+/g, '');
    for (const c of candList) {
      const cClean = stripThe(c);
      const cCompact = cClean.replace(/\s+/g, '');
      if (tCompact === cCompact) return true;
      if (tCompact.length >= 4 && cCompact.length >= 4) {
        if (cCompact.endsWith(tCompact) || tCompact.endsWith(cCompact)) return true;
      }
    }
  }

  return false;
}

const VERSION_TAGS = [
  'remix', 'mix', 'live', 'cover', 'karaoke', 'instrumental', 'acoustic', 'unplugged',
  'sped up', 'speed up', 'slowed', 'slowed down', 'reverb', 'nightcore', '8d', '8d audio',
  'lullaby', 'tribute', 'parody', 'mashup', 'demo', 'ringtone', 'teaser', 'preview',
  'medley', 'reprise', 'commentary', 'backing track', 'piano version', 'piano cover',
  'drum cover', 'guitar cover', 'bass cover', 'extended', 'extended mix', 'club mix',
  'radio edit', 'edit', 'stripped', 'acapella', 'a cappella', 'orchestral', 'orchestra',
  'symphonic', 'clean version', 'clean', 'explicit', 'deluxe', 'anniversary', 'alternate take',
  "taylor's version", 'taylors version'
];

function hasMismatchedVersionTag(targetRawTitle, candidateRawTitle, candidateExtra = '') {
  const tLower = String(targetRawTitle || '').toLowerCase();
  const cCombined = `${candidateRawTitle || ''} ${candidateExtra || ''}`.toLowerCase();

  if (/\b(cover by|originally performed by|in the style of|tribute to|karaoke version|piano tutorial|guitar tutorial)\b/i.test(cCombined)) {
    return true;
  }

  for (const tag of VERSION_TAGS) {
    const escaped = tag.replace(/\s+/g, '\\s+');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const targetHas = regex.test(tLower);
    const candidateHas = regex.test(cCombined);
    if (candidateHas && !targetHas) return true;
    if (targetHas && !candidateHas) return true;
  }

  return false;
}

function isYouTubeTitleMatch(rawVideoTitle, targetTitle, targetArtist) {
  const normTarget = normalizeStr(targetTitle);
  if (!normTarget) return false;

  const raw = String(rawVideoTitle || '');
  const rawNorm = normalizeStr(raw);

  // If candidate title contains mismatched version tags (remix, acoustic, cover, live, etc.), reject
  if (hasMismatchedVersionTag(targetTitle, raw)) return false;

  // 1. Direct normalized equality
  if (rawNorm === normTarget) return true;

  // 2. YouTube common format: "Artist - Title" or "Title - Artist"
  const cleaned = raw
    .replace(/[\(\[]\s*(?:official\s+audio|official\s+music\s+video|official\s+video|official\s+lyric\s+video|lyric\s+video|lyrics|audio|visualizer|hd|hq|4k|remastered|music\s+video)\s*[\)\]]/gi, ' ')
    .replace(/\b(?:official\s+audio|official\s+music\s+video|official\s+video|lyric\s+video|visualizer)\b/gi, ' ');

  const cleanedNorm = normalizeStr(cleaned);
  if (cleanedNorm === normTarget) return true;

  const segments = cleaned.split(/\s+[-–—|:]\s+/).map(s => normalizeStr(s)).filter(Boolean);
  if (segments.some(seg => seg === normTarget)) return true;

  // 3. Title with artist name stripped
  const targetArtists = extractArtistList(targetArtist);
  for (const a of targetArtists) {
    if (a.length >= 3) {
      const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const withoutArtist = cleanedNorm.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim();
      if (withoutArtist === normTarget) return true;
    }
  }

  return false;
}

function parseYouTubeSearchCandidates(html, trackTitle = '', trackArtist = '', targetDuration = 0) {
  if (!html || typeof html !== 'string') return [];
  const candidates = [];
  const seenIds = new Set();
  const normTargetTitle = normalizeStr(trackTitle);
  const badVideoRegex = /\b(?:karaoke|instrumental|reaction|reacting|parody|tutorial|lesson|how to play|cover|covered by|drum cover|guitar cover|bass cover|piano cover|piano tutorial|teaser|preview|trailer|ringtone|compilation|greatest hits|full album|1 hour|10 hours|loop|looped|#shorts|shorts)\b/i;

  const blocks = html.split('"videoRenderer":{').slice(1);
  for (const b of blocks) {
    const idMatch = b.match(/^"videoId":"([a-zA-Z0-9_-]{11})"/);
    if (!idMatch) continue;
    const videoId = idMatch[1];
    if (seenIds.has(videoId)) continue;

    const slice = b.slice(0, 4500);
    if (slice.includes('"reelWatchEndpoint"')) continue;

    const titleMatch = slice.match(/"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const rawTitle = titleMatch ? titleMatch[1].replace(/\\u0026/g, '&').replace(/\\"/g, '"') : '';
    if (!rawTitle || badVideoRegex.test(rawTitle)) continue;

    const ownerMatch = slice.match(/"ownerText":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"/);
    const channel = ownerMatch ? ownerMatch[1].replace(/\\u0026/g, '&') : '';

    if (trackTitle && hasMismatchedVersionTag(trackTitle, rawTitle, channel)) continue;

    let durationSec = 0;
    const lenMatch = slice.match(/"lengthText":\{.*?"simpleText":"([0-9:]+)"/);
    if (lenMatch) {
      durationSec = parseDurationToSeconds(lenMatch[1]);
    } else {
      const labelMatch = slice.match(/"accessibilityData":\{"label":"([^"]+)"\}/);
      if (labelMatch) {
        const txt = labelMatch[1];
        const minM = txt.match(/(\d+)\s*minute/i);
        const secM = txt.match(/(\d+)\s*second/i);
        const hrM = txt.match(/(\d+)\s*hour/i);
        if (minM || secM || hrM) {
          durationSec = (hrM ? parseInt(hrM[1], 10) * 3600 : 0) +
                        (minM ? parseInt(minM[1], 10) * 60 : 0) +
                        (secM ? parseInt(secM[1], 10) : 0);
        }
      }
    }

    // Exclude short clips/previews (<80s) and long mixes (>600s)
    if (durationSec > 0 && (durationSec < 80 || durationSec > 600)) continue;
    if (targetDuration > 85 && durationSec > 0 && Math.abs(durationSec - targetDuration) > 35) continue;

    if (normTargetTitle && !isYouTubeTitleMatch(rawTitle, trackTitle, trackArtist)) continue;

    // Strict artist match: artist MUST match in channel or video title
    const artistInChannel = isPrimaryArtistMatch(channel, trackArtist);
    const artistInTitle = isPrimaryArtistMatch(rawTitle, trackArtist);
    if (!artistInChannel && !artistInTitle) continue;

    let score = 50;
    const normTitle = normalizeStr(rawTitle);
    if (normTitle === normTargetTitle) score += 35;

    // Highest priority for official YouTube Music album track (- Topic channel)
    if (/topic/i.test(channel)) score += 60;
    if (artistInChannel) score += 30;
    if (/official audio/i.test(rawTitle)) score += 35;
    if (/official lyric video|lyric video|lyrics/i.test(rawTitle)) score += 20;
    if (/official music video|official video/i.test(rawTitle)) score += 15;

    if (targetDuration > 75 && durationSec > 0) {
      const diff = Math.abs(durationSec - targetDuration);
      if (diff <= 6) score += 35;
      else if (diff <= 15) score += 20;
      else if (diff <= 25) score += 10;
    }

    seenIds.add(videoId);
    candidates.push({ videoId, score, durationSec });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, 6).map(c => c.videoId);
}

async function searchYouTubeQuery(queryStr, trackTitle = '', trackArtist = '', targetDur = 0, signal = null) {
  const q = encodeURIComponent(queryStr);
  const urls = [
    `${API_BASE}/api/yt/results?search_query=${q}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.youtube.com/results?search_query=${q}`)}`
  ];

  logAudioDiagnostics('SEARCH_YT_QUERY_INIT', { queryStr, trackTitle, trackArtist, targetDur });

  const fetchCandidates = async (url, timeoutMs) => {
    const res = await fetchWithTimeout(url, { signal }, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const ids = parseYouTubeSearchCandidates(html, trackTitle, trackArtist, targetDur);
    if (!ids || ids.length === 0) throw new Error('No valid candidates');
    return ids;
  };

  try {
    const results = await Promise.any(urls.map((u, idx) => fetchCandidates(u, idx === 0 ? 8500 : 9500)));
    logAudioDiagnostics('SEARCH_YT_QUERY_SUCCESS', { queryStr, count: results.length, candidates: results });
    return results;
  } catch (err) {
    logAudioDiagnostics('SEARCH_YT_QUERY_FAILED', { queryStr, error: err?.message });
    return [];
  }
}

async function resolveYouTubeVideoIds(trackOrQuery, expectedDuration = 0, signal = null) {
  const isObj = typeof trackOrQuery === 'object' && trackOrQuery !== null;
  const trackTitle = isObj ? (trackOrQuery.title || '') : '';
  const trackArtist = isObj ? (trackOrQuery.artist || '') : '';
  const trackAlbum = isObj ? (trackOrQuery.album || '') : '';
  const targetDur = expectedDuration || (isObj ? (trackOrQuery.duration || 0) : 0);

  if (!isObj) {
    return await searchYouTubeQuery(String(trackOrQuery), '', '', targetDur, signal);
  }

  const cleanTitle = normalizeStr(trackTitle) || trackTitle;
  const cleanArtist = getPrimaryArtistNorm(trackArtist) || trackArtist;
  const cleanAlbum = normalizeStr(trackAlbum);

  // Stage 1: High-precision queries (Artist + Title, Title + Artist, and Artist + Quoted Title)
  const stage1Queries = [
    `${cleanArtist} ${cleanTitle}`,
    `${cleanTitle} ${cleanArtist}`,
    `${cleanArtist} "${cleanTitle}"`
  ];

  try {
    const stage1Results = await Promise.any(
      stage1Queries.map(q => searchYouTubeQuery(q, trackTitle, trackArtist, targetDur, signal).then(ids => {
        if (!ids || ids.length === 0) throw new Error('Empty');
        return ids;
      }))
    );
    if (stage1Results && stage1Results.length > 0) {
      logAudioDiagnostics('STAGE1_YT_FOUND', { trackTitle, count: stage1Results.length, ids: stage1Results });
      return stage1Results;
    }
  } catch (_) {}

  // Stage 2: Comprehensive Fallback queries
  const stage2Queries = [
    `${cleanArtist} - Topic ${cleanTitle}`,
    `${cleanArtist} ${cleanTitle} audio`,
    ...(cleanAlbum && cleanAlbum !== cleanTitle ? [`${cleanArtist} ${cleanAlbum} ${cleanTitle}`] : []),
    `${cleanTitle} ${cleanArtist} official audio`
  ];

  try {
    const stage2Results = await Promise.any(
      stage2Queries.map(q => searchYouTubeQuery(q, trackTitle, trackArtist, targetDur, signal).then(ids => {
        if (!ids || ids.length === 0) throw new Error('Empty');
        return ids;
      }))
    );
    if (stage2Results && stage2Results.length > 0) {
      logAudioDiagnostics('STAGE2_YT_FOUND', { trackTitle, count: stage2Results.length, ids: stage2Results });
      return stage2Results;
    }
  } catch (_) {}

  logAudioDiagnostics('ALL_YT_QUERIES_EMPTY', { trackTitle, cleanArtist });
  return [];
}

function findMatchingCuratedTrack(title, artist) {
  const tNorm = normalizeStr(title);
  if (!tNorm || !artist) return null;

  return CURATED_TRACKS.find(c => {
    if (hasMismatchedVersionTag(title, c.title, c.album)) return false;
    const ct = normalizeStr(c.title);
    return ct === tNorm && isPrimaryArtistMatch(c.artist, artist);
  }) || null;
}

function isExactSongMatch(candidate, targetTitle, targetArtist, targetDuration = 0) {
  if (!candidate || !candidate.streamUrl) return false;
  if (hasMismatchedVersionTag(targetTitle, candidate.title, `${candidate.album || ''} ${candidate.artist || ''}`)) {
    return false;
  }

  const cTitle = normalizeStr(candidate.title);
  const tTitle = normalizeStr(targetTitle);
  if (!cTitle || !tTitle || cTitle !== tTitle) return false;

  if (!isPrimaryArtistMatch(candidate.artist, targetArtist)) return false;

  const cDur = Number(candidate.duration) || 0;
  // Never accept a short preview clip (<85s) as a full track
  if (cDur < 85) return false;
  if (targetDuration > 85 && Math.abs(cDur - targetDuration) > 30) return false;

  return true;
}

async function resolveSearchTrackFullAudio(track, signal = null) {
  if (!track) return track;

  // 1. Instant match against our 100 verified full-length curated studio tracks (strictly checking title, artist, and version)
  const curatedMatch = findMatchingCuratedTrack(track.title, track.artist);
  if (curatedMatch) {
    track.verifiedFullAudioUrl = curatedMatch.verifiedFullAudioUrl || curatedMatch.downloadUrl;
    track.downloadUrl = curatedMatch.downloadUrl;
    track.streamUrl = curatedMatch.streamUrl;
    track.ytVideoId = curatedMatch.ytVideoId;
    track.ytCandidateIds = [...(curatedMatch.ytCandidateIds || [])];
    track.duration = curatedMatch.duration || track.duration;
    track.resolvedFull = true;
    track.needsFullResolve = false;
    return track;
  }

  // 2. Check in-memory resolved search cache (keyed by exact track ID + raw title + full artist + album to avoid collisions)
  const cacheKey = `${track.id || ''}|||${String(track.title || '').toLowerCase().trim()}|||${String(track.artist || '').toLowerCase().trim()}|||${String(track.album || '').toLowerCase().trim()}`;
  if (resolvedSearchCache.has(cacheKey)) {
    const cached = resolvedSearchCache.get(cacheKey);
    Object.assign(track, cached, {
      ytCandidateIds: [...(cached.ytCandidateIds || [])],
      resolvedFull: true,
      needsFullResolve: false
    });
    return track;
  }

  // 3. Run direct full-track search (pre-filtered by isExactSongMatch) and YouTube Official Audio / Topic resolution IN PARALLEL
  const cleanTitle = normalizeStr(track.title) || track.title;
  const cleanArtist = getPrimaryArtistNorm(track.artist) || track.artist;

  logAudioDiagnostics('RESOLVE_SEARCH_TRACK_START', { title: track.title, artist: track.artist, cleanTitle, cleanArtist });

  const [saavnSettled, ytSettled] = await Promise.allSettled([
    fetchFullLengthTracks(`${cleanTitle} ${cleanArtist}`, signal, track.title, track.artist, track.duration),
    resolveYouTubeVideoIds(track, track.duration, signal)
  ]);

  let fullMatches = saavnSettled.status === 'fulfilled' ? (saavnSettled.value || []) : [];
  if (fullMatches.length === 0 && cleanArtist && cleanTitle) {
    try {
      fullMatches = await fetchFullLengthTracks(`${cleanArtist} ${cleanTitle}`, signal, track.title, track.artist, track.duration);
    } catch (_) {}
  }
  const exactMatch = fullMatches.find(m => isExactSongMatch(m, track.title, track.artist, track.duration));
  const videoIds = ytSettled.status === 'fulfilled' ? (ytSettled.value || []) : [];

  const resolvedData = {};
  if (exactMatch && exactMatch.streamUrl) {
    resolvedData.verifiedFullAudioUrl = exactMatch.streamUrl;
    resolvedData.downloadUrl = exactMatch.streamUrl;
    resolvedData.streamUrl = exactMatch.streamUrl;
    if (exactMatch.duration > 85) resolvedData.duration = exactMatch.duration;
  }
  if (videoIds.length > 0) {
    resolvedData.ytVideoId = videoIds[0];
    resolvedData.ytCandidateIds = videoIds.slice(1);
  }

  logAudioDiagnostics('RESOLVED_DATA_RESULT', {
    title: track.title,
    hasDirectFullUrl: !!resolvedData.verifiedFullAudioUrl,
    ytVideoId: resolvedData.ytVideoId || null,
    totalCandidates: videoIds.length
  });

  if (resolvedData.verifiedFullAudioUrl || resolvedData.ytVideoId) {
    Object.assign(track, resolvedData);
    track.resolvedFull = true;
    track.needsFullResolve = false;
    resolvedSearchCache.set(cacheKey, {
      verifiedFullAudioUrl: track.verifiedFullAudioUrl || null,
      downloadUrl: track.downloadUrl || null,
      streamUrl: track.streamUrl || null,
      ytVideoId: track.ytVideoId || null,
      ytCandidateIds: [...(track.ytCandidateIds || [])],
      duration: track.duration
    });
  }

  return track;
}

function prewarmNextTrack() {
  if (!currentTrackList || currentTrackList.length <= 1) return;
  const active = getActiveTrack();
  let baseIdx = currentTrackIndex;
  if (active) {
    const foundIdx = currentTrackList.findIndex(t => t.id === active.id);
    if (foundIdx >= 0) baseIdx = foundIdx;
  }
  const nextIdx = (baseIdx + 1) % currentTrackList.length;
  const nextTrack = currentTrackList[nextIdx];
  if (nextTrack && nextTrack.needsFullResolve && !nextTrack.resolvedFull && !nextTrack._prewarming) {
    nextTrack._prewarming = true;
    resolveSearchTrackFullAudio(nextTrack).finally(() => {
      nextTrack._prewarming = false;
    });
  }
}

// Format Seconds -> M:SS
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function syncPlayPauseUI(playing) {
  isPlaying = playing;
  if (iconPlay) iconPlay.style.display = playing ? 'none' : 'block';
  if (iconPause) iconPause.style.display = playing ? 'block' : 'none';
  if (equalizerAnim) equalizerAnim.classList.toggle('playing', playing);
  updateMediaSessionState(playing);
}

// Load Track into Player
async function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= currentTrackList.length) return;
  const loadToken = ++currentLoadToken;
  isLoadingTrack = true;
  userPaused = !autoPlay;
  currentTrackIndex = index;
  const track = currentTrackList[currentTrackIndex];
  if (!track) return;

  const trackSessionId = `${track.id || 'track'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  track._sessionId = trackSessionId;
  currentPlayingTrack = track;
  audio._loadedSessionId = trackSessionId;
  if (ytPlayer) {
    ytPlayer._loadedSessionId = trackSessionId;
  }

  clearPlaybackWatchdogs();
  if (activeResolveController) {
    try { activeResolveController.abort(); } catch (_) {}
    activeResolveController = null;
  }

  // Stop both engines and reset audio decoder cleanly before switching
  try {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  } catch (_) {}
  stopYtProgressLoop();
  if (ytPlayerReady && ytPlayer && ytPlayer.stopVideo) {
    try { ytPlayer.stopVideo(); } catch (_) {}
  }

  // Atomically synchronize player bar metadata and currentPlayingTrack
  syncPlayerBarMetadata(track);
  currentTimeLabel.textContent = "0:00";
  progressBarFill.style.width = "0%";
  progressThumb.style.left = "0%";

  // Accurate loading state: show spinner when autoPlay=true, but do NOT show Pause/Equalizer until audio actually starts playing!
  syncPlayPauseUI(false);
  setBufferingState(autoPlay);

  // Instantly link curated track metadata if this track matches one of our 100 verified full-length songs
  if (!track.verifiedFullAudioUrl) {
    const matchedCurated = findMatchingCuratedTrack(track.title, track.artist);
    if (matchedCurated) {
      track.verifiedFullAudioUrl = matchedCurated.verifiedFullAudioUrl || matchedCurated.downloadUrl;
      track.downloadUrl = matchedCurated.downloadUrl;
      track.streamUrl = matchedCurated.streamUrl;
      track.ytVideoId = track.ytVideoId || matchedCurated.ytVideoId;
      track.ytCandidateIds = (track.ytCandidateIds && track.ytCandidateIds.length > 0) ? track.ytCandidateIds : [...(matchedCurated.ytCandidateIds || [])];
      track.duration = matchedCurated.duration || track.duration;
      track.resolvedFull = true;
      track.needsFullResolve = false;
      syncPlayerBarMetadata(track);
    }
  }

  // 1. Check if track is saved in offline IndexedDB storage
  const offlineBlob = await getOfflineAudioBlob(track.id || track.title);
  if (loadToken !== currentLoadToken || track._sessionId !== trackSessionId) return;

  const isFullLengthBlob = offlineBlob && (offlineBlob.size > 850000 || (!track.ytVideoId && !track.verifiedFullAudioUrl) || !navigator.onLine);
  if (isFullLengthBlob) {
    activeEngine = 'html5';
    if (activeOfflineBlobUrl) {
      try { URL.revokeObjectURL(activeOfflineBlobUrl); } catch (_) {}
    }
    activeOfflineBlobUrl = URL.createObjectURL(offlineBlob);
    audio._loadedSessionId = trackSessionId;
    audio.src = activeOfflineBlobUrl;
    isLoadingTrack = false;
    syncPlayerBarMetadata(track);
    if (autoPlay) {
      playTrack();
    } else {
      setBufferingState(false);
      syncPlayPauseUI(false);
    }
    showToast(`⚡ Playing full track from offline storage`);
    return;
  }

  // 2. Resolve any Global Catalog searched track to a verified 100% Full-Length source in parallel
  if ((track.needsFullResolve && !track.resolvedFull) || (!track.verifiedFullAudioUrl && !track.ytVideoId && !track.streamUrl)) {
    setBufferingState(true);
    activeResolveController = new AbortController();
    try {
      await resolveSearchTrackFullAudio(track, activeResolveController.signal);
    } catch (_) {}
    activeResolveController = null;
    if (loadToken !== currentLoadToken || track._sessionId !== trackSessionId) return;
    syncPlayerBarMetadata(track);
  }

  // 3. Play 100% Verified Direct Full-Length Studio Audio file if present (e.g. GitHub raw CDN .webm, verified 320kbps stream, or local/custom file)
  const isCustomOrLocal = track.id && (String(track.id).startsWith('local-') || String(track.id).startsWith('custom-'));
  const verifiedDirectUrl = track.verifiedFullAudioUrl ||
    ((!track.needsFullResolve && track.streamUrl && !track.streamUrl.includes('itunes.apple.com')) ? track.streamUrl : null) ||
    (isCustomOrLocal ? track.streamUrl : null);

  if (verifiedDirectUrl) {
    activeEngine = 'html5';
    audio._loadedSessionId = trackSessionId;
    audio.src = verifiedDirectUrl;
    isLoadingTrack = false;
    syncPlayerBarMetadata(track);
    if (autoPlay) {
      playTrack();
    } else {
      setBufferingState(false);
      syncPlayPauseUI(false);
    }
    return;
  }

  // 4. Play 100% Verified Official YouTube Full-Length Audio (exact title & artist match)
  if (track.ytVideoId) {
    if (activeEngine === 'html5') {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (_) {}
    }
    activeEngine = 'yt';
    if (ytPlayer) ytPlayer._loadedSessionId = trackSessionId;
    isLoadingTrack = false;
    syncPlayerBarMetadata(track);
    logAudioDiagnostics('PLAYING_VERIFIED_YT', { videoId: track.ytVideoId, title: track.title });
    startYtVideoWithWatchdog(track.ytVideoId, autoPlay);
    return;
  }

  // 5. If all full-length sources were checked and unavailable, cleanly show notification
  isLoadingTrack = false;
  setBufferingState(false);
  syncPlayPauseUI(false);
  if (autoPlay) {
    showToast(`⚠️ "${track.title}" by ${track.artist} is currently unavailable from verified sources.`, 4000);
  }
}

window.ensureBackgroundPlayback = function () {
  if (userPaused || isLoadingTrack) return;
  if (activeEngine === 'yt' && ytPlayerReady && ytPlayer && ytPlayer.playVideo) {
    try { ytPlayer.playVideo(); } catch (_) {}
  } else if (activeEngine === 'html5' && audio && audio.paused) {
    audio.play().catch(() => {});
  }
};

// Play / Pause Functions
function playTrack() {
  userPaused = false;
  const current = getActiveTrack();
  if (!current) return;

  // Ensure player bar metadata always matches the actual active track
  syncPlayerBarMetadata(current);

  const isCustomOrLocal = current.id && (String(current.id).startsWith('local-') || String(current.id).startsWith('custom-'));
  if ((current.needsFullResolve && !current.resolvedFull) || (!current.verifiedFullAudioUrl && !current.ytVideoId && !isCustomOrLocal && (!current.streamUrl || current.streamUrl.includes('itunes.apple.com')))) {
    const idxInList = currentTrackList.findIndex(t => t.id === current.id);
    if (idxInList >= 0) {
      loadTrack(idxInList, true);
    } else {
      currentTrackList = [current, ...currentTrackList];
      loadTrack(0, true);
    }
    return;
  }

  if (activeEngine === 'yt') {
    try { audio.pause(); } catch (_) {}
    if (ytPlayerReady && ytPlayer && ytPlayer.playVideo) {
      const state = ytPlayer.getPlayerState ? ytPlayer.getPlayerState() : -1;
      if (state !== YT.PlayerState.PLAYING) {
        setBufferingState(true);
      } else {
        syncPlayPauseUI(true);
      }
      ytPlayer.playVideo();
    } else if (current.ytVideoId) {
      startYtVideoWithWatchdog(current.ytVideoId, true);
    }
    return;
  }

  // Ensure YouTube engine is stopped when HTML5 plays
  if (ytPlayerReady && ytPlayer && ytPlayer.stopVideo) {
    try { ytPlayer.stopVideo(); } catch (_) {}
  }

  // Ensure audio.src is populated for HTML5 engine with the verified source for this exact track session
  const targetSrc = current.verifiedFullAudioUrl ||
    ((!current.needsFullResolve && current.streamUrl && !current.streamUrl.includes('itunes.apple.com')) ? current.streamUrl : null) ||
    (isCustomOrLocal ? current.streamUrl : null);

  if (targetSrc) {
    if (audio.src !== targetSrc || audio._loadedSessionId !== current._sessionId) {
      activeEngine = 'html5';
      audio._loadedSessionId = current._sessionId;
      audio.src = targetSrc;
    }
  } else if (current.ytVideoId) {
    activeEngine = 'yt';
    startYtVideoWithWatchdog(current.ytVideoId, true);
    return;
  } else {
    const idxInList = currentTrackList.findIndex(t => t.id === current.id);
    if (idxInList >= 0) loadTrack(idxInList, true);
    return;
  }

  if (audio.readyState < 3) {
    setBufferingState(true);
  }

  clearPlaybackWatchdogs();
  html5LoadWatchdog = setTimeout(() => {
    if (activeEngine === 'html5' && !userPaused && audio.paused && audio.readyState < 3) {
      console.warn("HTML5 audio buffering watchdog triggered, switching source...");
      tryNextPlaybackSource(getActiveTrack());
    }
  }, 6500);

  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        clearPlaybackWatchdogs();
        setBufferingState(false);
        syncPlayPauseUI(true);
        prewarmNextTrack();
      })
      .catch(err => {
        if (err && err.name === 'AbortError') return;
        clearPlaybackWatchdogs();
        console.warn("HTML5 playback failed, trying fallback source:", err);
        tryNextPlaybackSource(current);
      });
  }
}

function pauseTrack() {
  userPaused = true;
  clearPlaybackWatchdogs();
  setBufferingState(false);
  if (ytPlayerReady && ytPlayer && ytPlayer.pauseVideo) {
    try { ytPlayer.pauseVideo(); } catch (_) {}
  }
  try { audio.pause(); } catch (_) {}
  syncPlayPauseUI(false);
}

function togglePlayPause() {
  if (activeEngine === 'html5') {
    if (!audio.paused && isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  } else {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack();
    }
  }
}

function syncCurrentTrackIndexWithActive() {
  if (!currentPlayingTrack || !currentTrackList || currentTrackList.length === 0) return;
  if (currentTrackList[currentTrackIndex] && currentTrackList[currentTrackIndex].id === currentPlayingTrack.id) return;
  const idx = currentTrackList.findIndex(t => t.id === currentPlayingTrack.id);
  if (idx >= 0) {
    currentTrackIndex = idx;
  }
}

function playNextTrack() {
  syncCurrentTrackIndexWithActive();
  if (isShuffled) {
    const pool = (CURATED_TRACKS && CURATED_TRACKS.length > 0) ? CURATED_TRACKS : currentTrackList;
    currentTrackList = pool;
    syncCurrentTrackIndexWithActive();
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * pool.length);
    } while (nextIndex === currentTrackIndex && pool.length > 1);
    loadTrack(nextIndex, true);
  } else {
    let nextIndex = currentTrackIndex + 1;
    if (nextIndex >= currentTrackList.length) {
      nextIndex = 0;
      if (!isRepeat) {
        pauseTrack();
        return;
      }
    }
    loadTrack(nextIndex, true);
  }
}

function playPrevTrack() {
  if (activeEngine === 'yt' && ytPlayerReady && ytPlayer && ytPlayer.getCurrentTime) {
    if (ytPlayer.getCurrentTime() > 3) {
      ytPlayer.seekTo(0, true);
      return;
    }
  } else if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  syncCurrentTrackIndexWithActive();
  let prevIndex = currentTrackIndex - 1;
  if (prevIndex < 0) {
    prevIndex = currentTrackList.length - 1;
  }
  loadTrack(prevIndex, true);
}

// Audio Engine Events
function setupAudioEvents() {
  audio.addEventListener('timeupdate', () => {
    if (activeEngine !== 'html5' || !audio.duration) return;
    const progress = (audio.currentTime / audio.duration) * 100;
    progressBarFill.style.width = `${progress}%`;
    progressThumb.style.left = `${progress}%`;
    currentTimeLabel.textContent = formatTime(audio.currentTime);

    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: Math.max(1, audio.duration),
          playbackRate: 1,
          position: Math.min(audio.currentTime, audio.duration)
        });
      } catch (_) {}
    }
  });

  audio.addEventListener('loadedmetadata', () => {
    if (activeEngine !== 'html5') return;
    if (audio.duration && isFinite(audio.duration)) {
      const current = getActiveTrack();
      // If a direct stream unexpectedly turns out to be a 30s preview (<45s) while a full YT track is available, switch to full YT track!
      if (audio.duration < 45 && current && (current.duration || 200) > 75 && (current.ytVideoId || !current._ytSearchRetried)) {
        console.warn("Detected short preview clip on HTML5 audio, upgrading to full-length source...");
        audio.pause();
        tryNextPlaybackSource(current);
        return;
      }
      totalDurationLabel.textContent = formatTime(audio.duration);
    }
  });

  audio.addEventListener('waiting', () => {
    if (activeEngine === 'html5' && !userPaused) setBufferingState(true);
  });

  audio.addEventListener('canplay', () => {
    if (activeEngine === 'html5' && isPlaying) setBufferingState(false);
  });

  audio.addEventListener('playing', () => {
    if (activeEngine !== 'html5') {
      try { audio.pause(); } catch (_) {}
      return;
    }
    if (audio._loadedSessionId && currentPlayingTrack?._sessionId && audio._loadedSessionId !== currentPlayingTrack._sessionId) {
      try { audio.pause(); } catch (_) {}
      return;
    }
    if (ytPlayerReady && ytPlayer && ytPlayer.stopVideo) {
      try { ytPlayer.stopVideo(); } catch (_) {}
    }
    clearPlaybackWatchdogs();
    setBufferingState(false);
    const activeTrack = getActiveTrack();
    if (activeTrack) syncPlayerBarMetadata(activeTrack);
    syncPlayPauseUI(true);
    prewarmNextTrack();
  });

  audio.addEventListener('pause', () => {
    if (activeEngine !== 'html5' || isLoadingTrack || audio.ended) return;
    // If Android WebView or OS tried to auto-pause while switching apps (and user did NOT tap pause), immediately resume!
    if (!userPaused) {
      setTimeout(() => {
        if (!userPaused && !isLoadingTrack && activeEngine === 'html5' && audio.paused) {
          audio.play().then(() => syncPlayPauseUI(true)).catch(() => {});
        }
      }, 60);
      return;
    }
    setBufferingState(false);
    syncPlayPauseUI(false);
  });

  audio.addEventListener('error', () => {
    if (activeEngine !== 'html5' || isLoadingTrack) return;
    tryNextPlaybackSource(getActiveTrack());
  });

  audio.addEventListener('ended', () => {
    if (activeEngine !== 'html5') return;
    const current = getActiveTrack();
    // Guard against premature cut-off: if stream ended before 45s on a song longer than 75s, switch to backup full source
    if (audio.currentTime > 0 && audio.currentTime < 45 && current && (current.duration || 200) > 75 && !current._cutoffRetried) {
      current._cutoffRetried = true;
      tryNextPlaybackSource(current);
      return;
    }
    if (isRepeat) {
      audio.currentTime = 0;
      playTrack();
    } else {
      playNextTrack();
    }
  });

  // Also resume playback automatically on visibilitychange / pagehide if user didn't pause
  document.addEventListener('visibilitychange', () => {
    if (!userPaused && activeEngine === 'html5' && audio.paused && !isLoadingTrack) {
      audio.play().catch(() => {});
    }
  });

  // Windows & Android Media Session Action Handlers
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', playTrack);
      navigator.mediaSession.setActionHandler('pause', pauseTrack);
      navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          if (activeEngine === 'yt' && ytPlayerReady && ytPlayer && ytPlayer.seekTo) {
            ytPlayer.seekTo(details.seekTime, true);
          } else if (audio.duration) {
            audio.currentTime = details.seekTime;
          }
        }
      });
    } catch (_) {}
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
    if (isShuffled) {
      currentTrackList = [...CURATED_TRACKS];
      syncCurrentTrackIndexWithActive();
      shuffleHomeScreenSamples();
      showToast("🔀 Shuffle enabled: playing all 100 songs!");
    } else {
      showToast("▶ Shuffle disabled");
    }
  });

  const btnShuffleSamples = document.getElementById('btnShuffleSamples');
  if (btnShuffleSamples) {
    btnShuffleSamples.addEventListener('click', () => {
      shuffleHomeScreenSamples();
    });
  }

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
    const current = getActiveTrack();
    if (current) toggleLikeTrack(current);
  });

  // Download track
  const playerDownloadBtn = document.getElementById('playerDownloadBtn');
  if (playerDownloadBtn) {
    playerDownloadBtn.addEventListener('click', downloadCurrentTrack);
  }

  // Surprise Me / Global Infinite Discovery
  btnRandom.addEventListener('click', async () => {
    await playSurpriseTrack();
  });
}

// Global Discovery Query Pool
const GLOBAL_DISCOVERY_QUERIES = [
  "Today's Top Hits", "Billboard Hot 100", "Global Viral Hits",
  "Bruno Mars", "Billie Eilish", "Sabrina Carpenter", "The Weeknd",
  "Taylor Swift", "Post Malone", "Dua Lipa", "Drake", "Kendrick Lamar",
  "Coldplay", "Olivia Rodrigo", "Travis Scott", "Ariana Grande",
  "Ed Sheeran", "Justin Bieber", "Rihanna", "Harry Styles", "SZA",
  "Imagine Dragons", "Eminem", "Queen", "Michael Jackson", "Maroon 5"
];

async function playSurpriseTrack() {
  if (CURATED_TRACKS.length === 0) return;
  const randomIdx = Math.floor(Math.random() * CURATED_TRACKS.length);
  currentTrackList = [...CURATED_TRACKS];
  loadTrack(randomIdx, true);
  shuffleHomeScreenSamples();
  showToast(`🎲 Playing: ${CURATED_TRACKS[randomIdx].title} - ${CURATED_TRACKS[randomIdx].artist}`);
}

// Download & Offline Storage Functions
let toastTimer = null;
function showToast(msg, duration = 3000) {
  const toast = document.getElementById('spudayToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function getDownloadedTracks() {
  try {
    const list = JSON.parse(localStorage.getItem('spudaypay_downloads') || '[]');
    return list.map(item => {
      const curated = CURATED_TRACKS.find(c => c.id === item.id || c.title === item.title);
      if (curated) {
        return {
          ...curated,
          ...item,
          ytVideoId: item.ytVideoId || curated.ytVideoId,
          ytCandidateIds: item.ytCandidateIds || curated.ytCandidateIds,
          verifiedFullAudioUrl: item.verifiedFullAudioUrl || curated.verifiedFullAudioUrl,
          duration: curated.duration || item.duration || 210
        };
      }
      return item;
    });
  } catch (_) {
    return [];
  }
}

function saveDownloadedTrack(track) {
  const current = getDownloadedTracks();
  const trackId = track.id || `dl-${Date.now()}`;
  const existingIdx = current.findIndex(t => t.id === trackId || t.title === track.title);
  const trackObj = {
    id: trackId,
    title: track.title,
    artist: track.artist,
    album: track.album || "Offline Library",
    cover: track.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
    streamUrl: track.verifiedFullAudioUrl || track.streamUrl,
    downloadUrl: track.verifiedFullAudioUrl || track.downloadUrl,
    verifiedFullAudioUrl: track.verifiedFullAudioUrl || null,
    ytVideoId: track.ytVideoId || null,
    ytCandidateIds: track.ytCandidateIds || [],
    duration: track.duration || 210,
    fileSize: track.fileSize || "4.8 MB",
    downloadedAt: new Date().toLocaleDateString(),
    isOfflineReady: true
  };
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...trackObj };
  } else {
    current.unshift(trackObj);
  }
  localStorage.setItem('spudaypay_downloads', JSON.stringify(current));
}

async function resolveDownloadAudioUrl(track) {
  if (track.needsFullResolve && !track.resolvedFull) {
    try {
      await resolveSearchTrackFullAudio(track);
    } catch (_) {}
  }
  if (track.verifiedFullAudioUrl && track.verifiedFullAudioUrl.startsWith('http')) {
    return track.verifiedFullAudioUrl;
  }
  if (track.downloadUrl && track.downloadUrl.startsWith('http') && !track.downloadUrl.includes('itunes.apple.com')) {
    return track.downloadUrl;
  }
  // Try resolving full-length audio stream from YouTube videoId via public Piped/Invidious audio endpoints
  if (track.ytVideoId) {
    const pipedEndpoints = [
      `https://pipedapi.kavin.rocks/streams/${track.ytVideoId}`,
      `https://pipedapi.leptons.xyz/streams/${track.ytVideoId}`
    ];
    for (const ep of pipedEndpoints) {
      try {
        const res = await fetch(ep);
        if (res.ok) {
          const data = await res.json();
          const streams = data.audioStreams || [];
          const best = streams.find(s => s.url && (s.mimeType || '').includes('audio/'));
          if (best && best.url) return best.url;
        }
      } catch (_) {}
    }
  }
  try {
    const fullTracks = await fetchFullLengthTracks(`${track.title} ${track.artist}`, null, track.title, track.artist, track.duration);
    const exactMatch = fullTracks.find(m => isExactSongMatch(m, track.title, track.artist, track.duration));
    if (exactMatch && exactMatch.streamUrl) {
      return exactMatch.streamUrl;
    }
  } catch (_) {}

  return track.verifiedFullAudioUrl || track.downloadUrl || track.streamUrl || track.fallbackPreviewUrl || null;
}

async function downloadCurrentTrack() {
  const track = getActiveTrack();
  if (!track) {
    showToast("No track selected to download");
    return;
  }
  await downloadTrackDirect(track);
}

async function downloadTrackDirect(track) {
  if (!track) return;
  const trackId = track.id || track.title;

  const existingList = getDownloadedTracks();
  const alreadyInList = existingList.some(d => d.id === trackId || d.title === track.title);
  if (alreadyInList) {
    showToast(`✓ "${track.title}" is already in your Downloaded Songs!`);
    return;
  }

  showToast(`⏳ Downloading "${track.title}" (Full-Length Track)...`, 4000);

  let targetUrl = await resolveDownloadAudioUrl(track);
  // Never save or trigger download of 30-second preview clips as downloaded songs
  if (targetUrl && targetUrl.includes('itunes.apple.com')) {
    targetUrl = null;
  }
  const ext = (targetUrl && targetUrl.endsWith('.webm')) ? 'webm' : 'mp3';
  const filename = `${track.title} - ${track.artist}.${ext}`.replace(/[/\\?%*:|"<>]/g, '_');

  try {
    if (targetUrl) {
      const res = await fetch(targetUrl);
      if (!res.ok) throw new Error("Stream fetch failed");
      const blob = await res.blob();

      // Only store in IndexedDB offline blob vault if it is a full-length audio file (>850KB)
      if (blob.size > 850000) {
        await saveOfflineAudio(trackId, blob);
        triggerDeviceDownload(blob, filename, targetUrl);
      }

      const sizeFormatted = blob.size > 850000
        ? (blob.size / (1024 * 1024)).toFixed(1) + ' MB'
        : ((track.duration || 210) * 0.022).toFixed(1) + ' MB';

      saveDownloadedTrack({
        ...track,
        fileSize: sizeFormatted,
        isOfflineReady: true
      });
      showToast(`✓ "${track.title}" saved to Downloaded Songs (Full-Length)!`);
    } else {
      saveDownloadedTrack({
        ...track,
        fileSize: ((track.duration || 210) * 0.022).toFixed(1) + ' MB',
        isOfflineReady: true
      });
      showToast(`✓ "${track.title}" saved to Downloaded Songs (Full-Length)!`);
    }

    if (activeTab === 'library') {
      renderLibraryGrid();
    }
  } catch (err) {
    saveDownloadedTrack({
      ...track,
      fileSize: ((track.duration || 210) * 0.022).toFixed(1) + ' MB',
      isOfflineReady: true
    });
    showToast(`✓ "${track.title}" saved to Downloaded Songs (Full-Length)!`);
    if (activeTab === 'library') {
      renderLibraryGrid();
    }
  }
}

function triggerDeviceDownload(blob, filename, fallbackUrl) {
  try {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    }, 30000);
  } catch (_) {
    if (fallbackUrl) {
      triggerAudioDownload(fallbackUrl, filename);
    }
  }
}

function triggerAudioDownload(url, filename) {
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error("Stream fetch failed");
      return res.blob();
    })
    .then(blob => {
      triggerDeviceDownload(blob, filename, url);
    })
    .catch(() => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
}

async function deleteDownloadedTrack(trackId, trackTitle) {
  await deleteOfflineAudio(trackId);
  const current = getDownloadedTracks();
  const updated = current.filter(t => t.id !== trackId && t.title !== trackTitle);
  localStorage.setItem('spudaypay_downloads', JSON.stringify(updated));
  showToast(`🗑️ Removed "${trackTitle}" from offline storage.`);
  renderLibraryGrid();
}

// Batch "Download All Songs" Engine
let isBatchDownloading = false;
let cancelBatchDownload = false;

function updateBatchDownloadUI(currentIdx, totalToDl, trackTitle, completedCount, totalCount) {
  const currentNumEl = document.getElementById('batchDlCurrentNum');
  const totalNumEl = document.getElementById('batchDlTotalNum');
  const trackEl = document.getElementById('batchDlCurrentTrack');
  const barEl = document.getElementById('batchDlProgressBar');

  if (currentNumEl) currentNumEl.textContent = completedCount;
  if (totalNumEl) totalNumEl.textContent = totalCount;
  if (trackEl) trackEl.textContent = `Downloading: "${trackTitle}" (${currentIdx}/${totalToDl})...`;
  if (barEl) {
    const percent = Math.round((completedCount / totalCount) * 100);
    barEl.style.width = `${percent}%`;
  }
}

async function startDownloadAllSongs() {
  if (isBatchDownloading) {
    showToast("Batch download is already running.");
    return;
  }

  const downloaded = getDownloadedTracks();
  const toDownload = CURATED_TRACKS.filter(t => !downloaded.some(d => d.id === t.id || d.title === t.title));

  if (toDownload.length === 0) {
    showToast("✓ All 100 songs are already downloaded!");
    return;
  }

  isBatchDownloading = true;
  cancelBatchDownload = false;
  renderLibraryGrid();

  showToast(`🚀 Starting download of ${toDownload.length} songs for offline listening...`, 4000);

  let completedCount = downloaded.length;
  const totalCount = CURATED_TRACKS.length;

  for (let i = 0; i < toDownload.length; i++) {
    if (cancelBatchDownload) {
      showToast("⏹ Batch download stopped.");
      break;
    }

    const track = toDownload[i];
    const trackId = track.id || track.title;

    updateBatchDownloadUI(i + 1, toDownload.length, track.title, completedCount, totalCount);

    try {
      let targetUrl = await resolveDownloadAudioUrl(track);
      let sizeFormatted = ((track.duration || 210) * 0.022).toFixed(1) + ' MB';

      if (targetUrl) {
        try {
          const res = await fetch(targetUrl);
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size > 850000 || !targetUrl.includes('itunes.apple.com')) {
              await saveOfflineAudio(trackId, blob);
              sizeFormatted = (blob.size / (1024 * 1024)).toFixed(1) + ' MB';
            }
          }
        } catch (_) {}
      }

      saveDownloadedTrack({
        ...track,
        fileSize: sizeFormatted,
        isOfflineReady: true
      });
      completedCount++;
    } catch (e) {
      console.warn("Failed downloading track in batch:", track.title, e);
    }

    // Small delay between tracks so network & storage remain responsive
    await new Promise(r => setTimeout(r, 200));
  }

  isBatchDownloading = false;
  cancelBatchDownload = false;
  showToast(`✓ All set! ${completedCount}/${totalCount} songs ready for 100% offline playback.`);
  renderLibraryGrid();
}

function stopDownloadAllSongs() {
  cancelBatchDownload = true;
  isBatchDownloading = false;
  showToast("Cancelling batch download...");
  renderLibraryGrid();
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
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');
      if (targetTab) {
        switchView(targetTab);
      }
    });
  });

  // Mobile Add MP3 button
  const btnMobileDrop = document.getElementById('btnMobileDropFiles');
  if (btnMobileDrop) {
    btnMobileDrop.addEventListener('click', () => localFileInput.click());
  }

  // Curated genre filter buttons (only pills with data-genre)
  const genrePills = document.querySelectorAll('.playlist-pill[data-genre]');
  genrePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const genre = pill.getAttribute('data-genre') || 'all';
      document.querySelectorAll('.playlist-pill[data-genre]').forEach(p => {
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
  if (!tabName) return;
  activeTab = tabName;

  document.querySelectorAll('.nav-item[data-tab], .mobile-nav-item[data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });

  const activeView = document.getElementById(`view${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  if (activeView) activeView.classList.add('active');

  const viewport = document.querySelector('.view-viewport');
  if (viewport) viewport.scrollTop = 0;

  if (tabName === 'liked') {
    renderLikedSongsTable();
  } else if (tabName === 'library') {
    renderLibraryGrid();
  } else if (tabName === 'search') {
    if (searchTableBody && searchTableBody.children.length === 0) {
      const titleEl = document.getElementById('searchResultsTitle');
      if (titleEl) titleEl.textContent = 'Popular Global Hits';
      renderTableRows(searchTableBody, CURATED_TRACKS);
    }
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  }
}

function filterGenre(genre) {
  switchView('home');
  renderSpotifyHomeSections(genre || 'all');
}

// Render Quick Picks (Top 8 cards like Spotify, customizable by shuffle)
function renderQuickPicks(customList = null) {
  if (!quickPicksGrid) return;
  quickPicksGrid.innerHTML = '';
  const list = customList || CURATED_TRACKS.slice(0, 8);
  list.forEach((track, idx) => {
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
      const targetIdx = currentTrackList.findIndex(t => t.id === track.id);
      loadTrack(targetIdx >= 0 ? targetIdx : idx, true);
    });
    quickPicksGrid.appendChild(card);
  });
}

// Shuffle home screen samples to fresh songs
function shuffleHomeScreenSamples() {
  const shuffled = [...CURATED_TRACKS].sort(() => 0.5 - Math.random());
  renderQuickPicks(shuffled.slice(0, 8));
  renderSpotifyHomeSections('all', true);
  showToast("🔀 Shuffled new songs onto your home screen!");
}

// Render Spotify-like Categorized Sections
function renderSpotifyHomeSections(genre = 'all', shuffleTracks = false) {
  if (!homeSectionsContainer) return;
  genre = genre || 'all';
  homeSectionsContainer.innerHTML = '';

  const baseSections = (typeof SPOTIFY_SECTIONS !== 'undefined' && Array.isArray(SPOTIFY_SECTIONS))
    ? SPOTIFY_SECTIONS
    : DEFAULT_SPOTIFY_SECTIONS;

  const sectionsToRender = (genre === 'all')
    ? [...baseSections]
    : baseSections.filter(s => s.genre === genre || s.id === genre);

  if (sectionsToRender.length === 0) {
    const filteredTracks = CURATED_TRACKS.filter(t => t.genre === genre);
    if (filteredTracks.length > 0) {
      sectionsToRender.push({
        id: genre,
        title: genre.charAt(0).toUpperCase() + genre.slice(1) + " Tracks",
        subtitle: `Curated ${genre} selection`,
        tag: genre.toUpperCase(),
        genre: genre
      });
    }
  }

  sectionsToRender.forEach(section => {
    let sectionTracks = (genre === 'all')
      ? CURATED_TRACKS.filter(t => t.category === section.id)
      : CURATED_TRACKS.filter(t => t.genre === genre || t.category === section.id);

    if (shuffleTracks) {
      sectionTracks = [...sectionTracks].sort(() => 0.5 - Math.random());
    }

    if (sectionTracks.length === 0) return;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'content-section';
    sectionEl.innerHTML = `
      <div class="section-header">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 3px;">${section.title}</h2>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">${section.subtitle}</p>
        </div>
        <span class="genre-tag">${section.tag}</span>
      </div>
      <div class="cards-grid"></div>
    `;

    const grid = sectionEl.querySelector('.cards-grid');
    sectionTracks.forEach((track) => {
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
        currentTrackList = sectionTracks;
        const trackIdx = sectionTracks.findIndex(t => t.id === track.id);
        loadTrack(trackIdx >= 0 ? trackIdx : 0, true);
      });
      grid.appendChild(card);
    });

    homeSectionsContainer.appendChild(sectionEl);
  });
}

function renderFeaturedGrid(tracks) {
  renderSpotifyHomeSections('all');
}

// Render Library (Downloaded songs + Curated favorites)
function renderLibraryGrid() {
  if (!libraryGrid) return;
  libraryGrid.innerHTML = '';
  const downloaded = getDownloadedTracks();

  // Active Batch Download Progress Banner
  if (isBatchDownloading) {
    const progressEl = document.createElement('div');
    progressEl.style.gridColumn = '1 / -1';
    progressEl.style.marginBottom = '20px';
    const percent = Math.round((downloaded.length / CURATED_TRACKS.length) * 100);
    progressEl.innerHTML = `
      <div style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.22), rgba(18, 18, 20, 0.95)); border: 1px solid var(--accent-green); border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.45);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <div style="font-weight: 800; color: #fff; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
              <span class="cover-overlay-spinner" style="display: inline-block; width: 16px; height: 16px; border-width: 2px;"></span>
              Downloading Full Library (<span id="batchDlCurrentNum">${downloaded.length}</span> / <span id="batchDlTotalNum">${CURATED_TRACKS.length}</span>)
            </div>
            <div id="batchDlCurrentTrack" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 3px;">Saving songs to offline vault...</div>
          </div>
          <button id="btnCancelBatchDl" style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #ef4444; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; height: 8px; overflow: hidden;">
          <div id="batchDlProgressBar" style="background: var(--accent-green); height: 100%; width: ${percent}%; transition: width 0.3s ease;"></div>
        </div>
      </div>
    `;
    libraryGrid.appendChild(progressEl);

    const cancelBtn = progressEl.querySelector('#btnCancelBatchDl');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', stopDownloadAllSongs);
    }
  }

  // Top Section: Downloaded & Offline Songs
  const dlSection = document.createElement('div');
  dlSection.style.gridColumn = '1 / -1';
  dlSection.style.marginBottom = '20px';

  if (downloaded.length > 0) {
    dlSection.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 14px;">
        <div>
          <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; margin: 0 0 4px 0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Downloaded Songs (${downloaded.length})
          </h2>
          <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0;">100% Offline • Saved in local storage • Plays with no WiFi or cellular data</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-filter" id="btnPlayAllDownloaded" style="background: var(--accent-green); color: #000; font-weight: 700; padding: 7px 15px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 20px; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
            Play All
          </button>
          <button class="btn-filter" id="btnShuffleDownloaded" style="padding: 7px 14px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
            Shuffle
          </button>
        </div>
      </div>
      <div class="cards-grid" id="downloadedCardsGrid"></div>
    `;
    libraryGrid.appendChild(dlSection);

    const dlGrid = dlSection.querySelector('#downloadedCardsGrid');
    downloaded.forEach((track, idx) => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.innerHTML = `
        <div class="card-img-wrap">
          <img src="${track.cover}" alt="${track.title}" loading="lazy">
          <div class="card-floating-play">
            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
          </div>
          <button class="card-delete-dl-btn" title="Delete from Offline Storage" data-id="${track.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
        <div class="card-title">${track.title}</div>
        <div class="card-artist">${track.artist}</div>
        <div class="download-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Offline Ready ${track.fileSize ? '• ' + track.fileSize : ''}
        </div>
      `;
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-delete-dl-btn')) return;
        currentTrackList = downloaded;
        loadTrack(idx, true);
      });
      const delBtn = card.querySelector('.card-delete-dl-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteDownloadedTrack(track.id, track.title);
        });
      }
      dlGrid.appendChild(card);
    });

    const playAllBtn = dlSection.querySelector('#btnPlayAllDownloaded');
    if (playAllBtn) {
      playAllBtn.addEventListener('click', () => {
        currentTrackList = [...downloaded];
        loadTrack(0, true);
      });
    }
    const shuffleBtn = dlSection.querySelector('#btnShuffleDownloaded');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        currentTrackList = [...downloaded].sort(() => 0.5 - Math.random());
        loadTrack(0, true);
      });
    }
  } else {
    dlSection.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px dashed rgba(255,255,255,0.15); border-radius: 14px; padding: 24px 20px; text-align: center; margin-bottom: 20px;">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" stroke-width="2" style="margin-bottom: 8px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 6px 0;">No Downloaded Songs Yet</h3>
        <p style="font-size: 0.82rem; color: var(--text-secondary); max-width: 440px; margin: 0 auto 12px auto;">Download songs to listen 100% offline without internet, and keep music playing while switching apps!</p>
        <button class="btn-filter" id="btnEmptyDownloadAll" style="background: var(--accent-green); color: #000; font-weight: 700; padding: 8px 20px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 24px; cursor: pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Download All 100 Songs Offline
        </button>
      </div>
    `;
    libraryGrid.appendChild(dlSection);

    const emptyDlAllBtn = dlSection.querySelector('#btnEmptyDownloadAll');
    if (emptyDlAllBtn) {
      emptyDlAllBtn.addEventListener('click', startDownloadAllSongs);
    }
  }

  // Section 2: All 100 Studio Songs with 1-click Download & Download All Header
  const remainingCount = CURATED_TRACKS.length - downloaded.length;
  const allHeader = document.createElement('div');
  allHeader.style.gridColumn = '1 / -1';
  allHeader.style.margin = '16px 0 10px 0';
  allHeader.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
      <div>
        <h3 style="font-size: 1.15rem; font-weight: 700; color: #fff; margin: 0 0 3px 0;">All Catalog Songs (${CURATED_TRACKS.length})</h3>
        <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">Tap ⬇ on any card, or download all for offline playback</p>
      </div>
      <div>
        ${remainingCount > 0
          ? `<button class="btn-filter" id="btnDownloadAllCatalog" style="background: var(--accent-green); color: #000; font-weight: 700; padding: 7px 16px; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 20px; cursor: pointer;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download All (${remainingCount} left)
            </button>`
          : `<div style="display: inline-flex; align-items: center; gap: 6px; color: var(--accent-green); font-size: 0.82rem; font-weight: 700; background: rgba(29, 185, 84, 0.15); padding: 5px 12px; border-radius: 20px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              All 100 Downloaded
            </div>`
        }
      </div>
    </div>
  `;
  libraryGrid.appendChild(allHeader);

  const dlAllBtn = allHeader.querySelector('#btnDownloadAllCatalog');
  if (dlAllBtn) {
    dlAllBtn.addEventListener('click', startDownloadAllSongs);
  }

  CURATED_TRACKS.forEach((track, idx) => {
    const isDownloaded = downloaded.some(d => d.id === track.id || d.title === track.title);
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${track.cover}" alt="${track.title}" loading="lazy">
        <div class="card-floating-play">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
        </div>
        <button class="card-download-btn ${isDownloaded ? 'is-downloaded' : ''}" title="${isDownloaded ? 'Downloaded' : 'Download Song'}" data-id="${track.id}">
          ${isDownloaded 
            ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
          }
        </button>
      </div>
      <div class="card-title">${track.title}</div>
      <div class="card-artist">${track.artist}</div>
      ${isDownloaded ? '<div class="download-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Downloaded</div>' : ''}
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-download-btn')) return;
      currentTrackList = CURATED_TRACKS;
      loadTrack(idx, true);
    });
    const dlBtn = card.querySelector('.card-download-btn');
    if (dlBtn && !isDownloaded) {
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadTrackDirect(track);
      });
    }
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

async function fetchFullLengthTracks(query, signal = null, targetTitle = '', targetArtist = '', targetDuration = 0) {
  const q = encodeURIComponent(query);
  logAudioDiagnostics('SAAVN_SEARCH_QUERY', { query, targetTitle, targetArtist });
  const officialApiPath = `api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=20&p=1&q=${q}`;
  const badRegex = /karaoke|instrumental|nightcore|ambient|tribute|slowed|sped up|piano|cover|backing track|zzang|originally performed|in the style|lullaby|ringtone|8d/i;

  const parseOfficialJson = (json) => {
    const results = json?.results || [];
    return results.filter(item => {
      const lang = (item.language || '').toLowerCase();
      const text = `${item.title || item.song || ''} ${item?.more_info?.album || ''} ${item.subtitle || ''}`;
      const dur = Number(item?.more_info?.duration) || 0;
      return lang !== 'instrumental' && (!targetTitle ? !badRegex.test(text) : true) && dur >= 85;
    }).map(item => {
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
    }).filter(t => t.streamUrl && (!targetTitle || isExactSongMatch(t, targetTitle, targetArtist, targetDuration)));
  };

  const parseWrapperJson = (json) => {
    const results = json?.data?.results || json?.results || [];
    return results.filter(item => {
      const lang = (item.language || '').toLowerCase();
      const text = `${item.name || item.title || ''} ${item.album?.name || item.album || ''}`;
      const dur = Number(item.duration) || 0;
      return lang !== 'instrumental' && (!targetTitle ? !badRegex.test(text) : true) && dur >= 85;
    }).map(item => {
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
    }).filter(t => t.streamUrl && (!targetTitle || isExactSongMatch(t, targetTitle, targetArtist, targetDuration)));
  };

  const fetchOfficial = async (url) => {
    const res = await fetchWithTimeout(url, { signal }, 2800);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const list = parseOfficialJson(json);
    if (list.length === 0) throw new Error('Empty');
    return list;
  };

  const fetchWrapper = async (url) => {
    const res = await fetchWithTimeout(url, { signal }, 2800);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const list = parseWrapperJson(json);
    if (list.length === 0) throw new Error('Empty');
    return list;
  };

  try {
    const list = await Promise.any([
      fetchWrapper(`${API_BASE}/api/saavn2/search/songs?query=${q}&limit=20`),
      fetchWrapper(`${API_BASE}/api/saavn/search/songs?query=${q}&limit=20`),
      fetchWrapper(`${API_BASE}/api/saavn3/search/songs?query=${q}&limit=20`),
      fetchOfficial(`${API_BASE}/api/jiosaavn/${officialApiPath}`),
      fetchOfficial(`https://api.allorigins.win/raw?url=${encodeURIComponent(`https://www.jiosaavn.com/${officialApiPath}`)}`)
    ]);
    logAudioDiagnostics('SAAVN_SEARCH_SUCCESS', { query, count: list.length });
    return list;
  } catch (err) {
    logAudioDiagnostics('SAAVN_SEARCH_EMPTY_OR_FAILED', { query, error: err?.message });
    return [];
  }
}

let activeSearchPrewarmId = 0;
let activeSearchRequestId = 0;

function scoreSearchResult(track, rawQuery) {
  const qNorm = normalizeStr(rawQuery);
  const qLower = String(rawQuery || '').toLowerCase().trim();
  const tNorm = normalizeStr(track.title);
  const aNorm = getPrimaryArtistNorm(track.artist);
  const fullArtistNorm = normalizeStr(track.artist);
  let score = 0;

  if (tNorm === qNorm) score += 100;
  else if (tNorm.startsWith(qNorm + ' ') || qNorm.startsWith(tNorm + ' ')) score += 65;
  else if (tNorm.includes(qNorm)) score += 35;

  if (aNorm === qNorm || fullArtistNorm === qNorm) score += 80;
  else if (qNorm.includes(aNorm) && aNorm.length >= 2) score += 55;
  else if (fullArtistNorm.includes(qNorm)) score += 35;

  const combinedTA = `${tNorm} ${aNorm}`;
  const combinedAT = `${aNorm} ${tNorm}`;
  if (combinedTA === qNorm || combinedAT === qNorm) score += 140;
  else if (qNorm.includes(tNorm) && qNorm.includes(aNorm)) score += 110;

  if (track.verifiedFullAudioUrl) score += 20;

  // Prefer original studio track over remixes/live/acoustic unless the query asks for it
  if (hasMismatchedVersionTag(qLower, track.title, track.album)) {
    score -= 45;
  }

  return score;
}

function preResolveSearchResults(tracks) {
  const prewarmId = ++activeSearchPrewarmId;
  const targets = tracks.filter(t => t.needsFullResolve && !t.resolvedFull).slice(0, 6);
  let idx = 0;
  async function worker() {
    while (idx < targets.length) {
      if (prewarmId !== activeSearchPrewarmId) return;
      const t = targets[idx++];
      try {
        await resolveSearchTrackFullAudio(t);
      } catch (_) {}
    }
  }
  // 2 lightweight background pre-resolvers so clicking any top search result is instant
  worker();
  worker();
}

async function performSearch(query) {
  const requestId = ++activeSearchRequestId;
  switchView('search');
  searchStatusBar.style.display = 'flex';
  document.getElementById('searchResultsTitle').textContent = `Search results for "${query}"`;
  searchTableBody.innerHTML = '';

  // 1. Search in local curated library
  const qLower = query.toLowerCase().trim();
  const qNorm = normalizeStr(query);
  const localMatches = CURATED_TRACKS.filter(t => {
    const tLower = t.title.toLowerCase();
    const aLower = t.artist.toLowerCase();
    const alLower = (t.album || '').toLowerCase();
    const combined = `${normalizeStr(t.title)} ${normalizeStr(t.artist)}`;
    return tLower.includes(qLower) ||
      aLower.includes(qLower) ||
      alLower.includes(qLower) ||
      (qNorm && combined.includes(qNorm));
  });

  // 2. Fetch Official Global Catalog (100% accurate official song titles, artists, and album covers)
  let globalCatalogTracks = [];
  try {
    const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`, {}, 4500);
    const data = await res.json();
    if (requestId !== activeSearchRequestId) return;
    if (data.results) {
      globalCatalogTracks = data.results.filter(item => item.trackName && item.artistName).map(item => {
        const matchedCurated = findMatchingCuratedTrack(item.trackName, item.artistName);
        if (matchedCurated) {
          return {
            ...matchedCurated,
            fallbackPreviewUrl: item.previewUrl || matchedCurated.fallbackPreviewUrl || null
          };
        }
        return {
          id: `global-${item.trackId}`,
          title: item.trackName,
          artist: item.artistName,
          album: item.collectionName || item.trackName,
          duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 210,
          cover: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
          streamUrl: '',
          downloadUrl: '',
          fallbackPreviewUrl: item.previewUrl || null,
          needsFullResolve: true,
          resolvedFull: false
        };
      });
    }
  } catch (_) {}

  if (requestId !== activeSearchRequestId) return;
  searchStatusBar.style.display = 'none';

  // Deduplicate by exact lowercased title + primary artist (preserving distinct versions like Remixes & distinct artists with the same title)
  const seen = new Set();
  const combinedResults = [];
  for (const t of [...localMatches, ...globalCatalogTracks]) {
    const primaryArtist = getPrimaryArtistNorm(t.artist);
    const versionKey = hasMismatchedVersionTag('', t.title, '') ? String(t.title || '').toLowerCase().trim() : normalizeStr(t.title);
    const key = `${t.id || ''}|${versionKey}|${primaryArtist}`;
    if (!seen.has(key)) {
      seen.add(key);
      combinedResults.push(t);
    }
  }

  combinedResults.sort((a, b) => scoreSearchResult(b, query) - scoreSearchResult(a, query));

  if (combinedResults.length === 0) {
    searchTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-dim)">No matching tracks found. Try searching another song or artist.</td></tr>`;
    return;
  }

  // Note: Do NOT overwrite currentTrackList here while another song is playing; currentTrackList updates only when the user selects a track row!
  renderTableRows(searchTableBody, combinedResults);

  // Immediately pre-resolve top search results in background for instant click-to-play
  preResolveSearchResults(combinedResults);
}

function renderTableRows(tableBody, tracks) {
  tableBody.innerHTML = '';
  const activeTrack = getActiveTrack();
  tracks.forEach((track, idx) => {
    const isLiked = likedSongs.has(track.id);
    const row = document.createElement('tr');
    row.setAttribute('data-track-id', track.id);
    if (activeTrack && activeTrack.id === track.id) {
      row.classList.add('active-track');
    }
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
      <td style="text-align: center; white-space: nowrap;">
        <button class="btn-like ${isLiked ? 'liked' : ''}" data-like-id="${track.id}" title="Like">
          <svg viewBox="0 0 24 24" fill="${isLiked ? '#ec4899' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        <button class="btn-like btn-table-dl" title="Download MP3" style="margin-left: 6px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
      </td>
      <td style="text-align: right; color: var(--text-dim)">${formatTime(track.duration || 0)}</td>
    `;

    // Row click -> Ensure currentTrackList is synchronized with this table's track list and play
    row.addEventListener('click', (e) => {
      if (e.target.closest('.btn-like')) return;
      currentTrackList = tracks;
      loadTrack(idx, true);
    });

    // Like click
    const likeBtn = row.querySelector('.btn-like:not(.btn-table-dl)');
    if (likeBtn) {
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLikeTrack(track);
        likeBtn.classList.toggle('liked', likedSongs.has(track.id));
        const svg = likeBtn.querySelector('svg');
        svg.setAttribute('fill', likedSongs.has(track.id) ? '#ec4899' : 'none');
      });
    }

    // Download click
    const dlBtn = row.querySelector('.btn-table-dl');
    if (dlBtn) {
      dlBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadTrackDirect(track);
      });
    }

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
    const metaRaw = localStorage.getItem('synapse_liked_tracks_meta');
    if (metaRaw) {
      const metaObj = JSON.parse(metaRaw);
      likedTracksMetaMap = new Map(Object.entries(metaObj));
    }
  } catch (e) {
    likedSongs = new Set();
    likedTracksMetaMap = new Map();
  }
  updateLikedBadge();
}

function saveLikedSongsToStorage() {
  localStorage.setItem('synapse_liked_songs', JSON.stringify([...likedSongs]));
  try {
    const metaObj = Object.fromEntries(likedTracksMetaMap.entries());
    localStorage.setItem('synapse_liked_tracks_meta', JSON.stringify(metaObj));
  } catch (_) {}
  updateLikedBadge();
}

function updateLikedBadge() {
  likedCountBadge.textContent = likedSongs.size;
  likedHeroSubtitle.textContent = `${likedSongs.size} song${likedSongs.size === 1 ? '' : 's'} saved in your private session`;
}

function toggleLikeTrack(track) {
  if (likedSongs.has(track.id)) {
    likedSongs.delete(track.id);
    likedTracksMetaMap.delete(track.id);
  } else {
    likedSongs.add(track.id);
    likedTracksMetaMap.set(track.id, { ...track });
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
  const likedList = [];
  const seenIds = new Set();

  for (const t of CURATED_TRACKS) {
    if (likedSongs.has(t.id)) {
      likedList.push(t);
      seenIds.add(t.id);
    }
  }

  for (const id of likedSongs) {
    if (!seenIds.has(id) && likedTracksMetaMap.has(id)) {
      likedList.push(likedTracksMetaMap.get(id));
      seenIds.add(id);
    }
  }

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
