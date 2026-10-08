/* localStorage: tutorial-seen flag and best times */

/* ---------- tutorial (first-run help), via localStorage ---------- */
const TUTORIAL_SEEN_KEY = 'owldoku_tutorial_seen';

function hasTutorialBeenSeen(){
  try{ return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'; }catch(e){ return true; }
}
function markTutorialSeen(){
  try{ localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); }catch(e){ /* storage unavailable — ignore */ }
}

/* ---------- best-time tracking (per size + difficulty), via localStorage ---------- */
const BEST_TIMES_KEY = 'owldoku_best_times';

function difficultyKey(n, diff){ return `${n}x${n}-${diff}`; }

function loadBestTimes(){
  try{
    return JSON.parse(localStorage.getItem(BEST_TIMES_KEY)) || {};
  }catch(e){ return {}; }
}

function saveBestTimes(times){
  try{ localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(times)); }catch(e){ /* storage unavailable — ignore */ }
}

function getBestTime(n, diff){
  const times = loadBestTimes();
  const v = times[difficultyKey(n, diff)];
  return typeof v === 'number' ? v : null;
}

// Returns true if this run set a new best.
function maybeSaveBestTime(n, diff, secs){
  const times = loadBestTimes();
  const key = difficultyKey(n, diff);
  const prev = times[key];
  if(prev == null || secs < prev){
    times[key] = secs;
    saveBestTimes(times);
    return true;
  }
  return false;
}

function updateBestTimeDisplay(){
  const best = getBestTime(N, currentDifficulty);
  const el = document.getElementById('bestTime');
  if(el) el.textContent = best != null ? formatTime(best) : '--:--';
}
