/* Music panel UI */

/* ---------- music panel: DOM refs, transport icons, and UI wiring
   (playback logic itself lives in the Music module above) ---------- */
const musicToggleBtn = document.getElementById('musicToggle');
const musicOverlay = document.getElementById('musicOverlay');
const musicNowName = document.getElementById('musicNowName');
const musicPrevBtn = document.getElementById('musicPrevBtn');
const musicNextBtn = document.getElementById('musicNextBtn');
const musicLoopBtn = document.getElementById('musicLoopBtn');
const musicMuteBtn = document.getElementById('musicMuteBtn');
const musicVolume = document.getElementById('musicVolume');
const musicSongList = document.getElementById('musicSongList');
const musicSongFade = document.getElementById('musicSongFade');
const musicCloseBtn = document.getElementById('musicCloseBtn');

const ICON_SKIP_PREV = `<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="currentColor"><rect x="5" y="5" width="2.6" height="14" rx="0.6"/><polygon points="18,5 18,19 8,12"/></svg>`;
const ICON_SKIP_NEXT = `<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="currentColor"><polygon points="6,5 6,19 16,12"/><rect x="16.4" y="5" width="2.6" height="14" rx="0.6"/></svg>`;
const ICON_REPEAT = `<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h13a2.5 2.5 0 0 1 2.5 2.5v2"/><path d="M9 4.5 4 7.5l5 3"/><path d="M20 16.5H7A2.5 2.5 0 0 1 4.5 14v-2"/><path d="M15 19.5l5-3-5-3"/></svg>`;
musicPrevBtn.innerHTML = ICON_SKIP_PREV;
musicNextBtn.innerHTML = ICON_SKIP_NEXT;
musicLoopBtn.innerHTML = ICON_REPEAT;

function renderMusicPanel(smoothScroll){
  const state = Music.getState();
  musicNowName.textContent = state.songName;
  musicMuteBtn.textContent = state.muted ? '🔇' : '🔊';
  musicMuteBtn.classList.toggle('muted', state.muted);
  musicMuteBtn.title = state.muted ? 'Unmute music' : 'Mute music';
  musicMuteBtn.setAttribute('aria-label', state.muted ? 'Unmute music' : 'Mute music');
  musicLoopBtn.classList.toggle('active', state.loop);
  musicLoopBtn.title = state.loop ? 'Looping current song' : 'Loop current song';
  musicVolume.value = Math.round(state.volume*100);
  musicToggleBtn.textContent = state.muted ? '🔇' : '🔊';
  musicToggleBtn.classList.toggle('on', !state.muted);
  // Music failed to load (or every song was unavailable) — disable the
  // controls instead of leaving a panel full of dead buttons and an empty
  // song list, and don't offer a toggle icon for a feature that can't work.
  [musicPrevBtn, musicNextBtn, musicLoopBtn, musicMuteBtn, musicVolume].forEach(el=>{
    el.disabled = !state.available;
  });
  musicToggleBtn.style.display = state.available ? '' : 'none';
  if(!state.available){
    musicSongList.innerHTML = `<div class="music-unavailable">Music couldn't be loaded this session — the game works fine without it.</div>`;
    return;
  }
  musicSongList.innerHTML = Music.getSongs().map((s,i)=>
    `<button type="button" class="music-song-btn${i===state.songIndex?' playing':''}" data-i="${i}"${i===state.songIndex?' aria-current="true"':''}>
       <span><span class="music-song-num">${String(i+1).padStart(2,'0')}</span>${s.name}</span>
       ${i===state.songIndex ? '<span class="music-song-note" aria-hidden="true">♪</span>' : ''}
     </button>`
  ).join('');
  capSongListHeight();
  // Rebuilding innerHTML above resets scrollTop to 0 every time, so put the
  // list back on whichever song is actually playing (also covers the "just
  // opened the panel" and "song auto-advanced" cases, since both end up
  // calling this same render function) and then re-check the fade.
  scrollToPlayingSong(smoothScroll);
  updateSongFade();
}

// Sizes the song list so exactly 5 rows are visible and any further songs
// require scrolling, regardless of font size/zoom — measured from the
// actual rendered row rather than an estimated pixel height.
const VISIBLE_SONG_ROWS = 5;
function capSongListHeight(){
  const first = musicSongList.querySelector('.music-song-btn');
  if(!first){ musicSongList.style.maxHeight = ''; return; }
  const rowH = first.getBoundingClientRect().height;
  const gap = parseFloat(getComputedStyle(musicSongList).rowGap) || 0;
  musicSongList.style.maxHeight = (rowH*VISIBLE_SONG_ROWS + gap*(VISIBLE_SONG_ROWS-1)) + 'px';
}

// Keeps the currently-playing song scrolled into view — the whole point of
// capping the list to 5 rows above is that the rest are reachable by
// scrolling, so whichever one is actually playing shouldn't ever be hidden
// off-screen without the player realizing it's there.
function scrollToPlayingSong(smooth){
  const el = musicSongList.querySelector('.music-song-btn.playing');
  if(el) el.scrollIntoView({ block:'nearest', behavior: smooth ? 'smooth' : 'auto' });
}

// Shows the bottom fade only while there's more list below the current
// scroll position — no fade once you've scrolled (or the list is short
// enough) to reveal the last song.
function updateSongFade(){
  const hasMore = musicSongList.scrollHeight - musicSongList.scrollTop - musicSongList.clientHeight > 2;
  musicSongFade.classList.toggle('show', hasMore);
}
musicSongList.addEventListener('scroll', updateSongFade);

function openMusicPanel(){
  if(!Music.isAvailable()) return; // toggle icon is hidden in this case, but guard anyway
  AudioCore.ensure();
  Music.autoStart();
  renderMusicPanel();
  musicOverlay.classList.add('show');
}
function closeMusicPanel(){ musicOverlay.classList.remove('show'); }

musicToggleBtn.addEventListener('click', ()=>{ Sound.button(); openMusicPanel(); });
musicCloseBtn.addEventListener('click', ()=>{ Sound.button(); closeMusicPanel(); });
musicPrevBtn.addEventListener('click', ()=>{ Sound.button(); Music.prev(); renderMusicPanel(true); });
musicNextBtn.addEventListener('click', ()=>{ Sound.button(); Music.next(); renderMusicPanel(true); });
musicLoopBtn.addEventListener('click', ()=>{ Sound.button(); Music.toggleLoop(); renderMusicPanel(); });
musicMuteBtn.addEventListener('click', ()=>{ Music.toggleMute(); renderMusicPanel(); });
musicVolume.addEventListener('input', ()=>{ Music.setVolume(musicVolume.value/100); });
musicSongList.addEventListener('click', (e)=>{
  const btn = e.target.closest('.music-song-btn');
  if(!btn) return;
  Sound.button();
  Music.selectSong(parseInt(btn.dataset.i, 10));
  renderMusicPanel(true);
});
// Covers auto-advance (a track finishing on its own, or an mp3 sample's
// natural end) — renderMusicPanel() is cheap to re-run even while the panel
// is closed, and it's what keeps "now playing" and the auto-scroll correct
// the next time the panel opens.
Music.onSongChange(()=>{ renderMusicPanel(true); });
