/* Game lifecycle: win/lose, timer, hints, new game, load from URL */

function checkWin(){
  const owls = allOwls();
  if(owls.length !== N) return;
  for(const [r,c] of owls){
    if(owlConflicts(r,c,owls).length>0) return;
  }
  solved = true;
  clearInterval(timerInterval);
  Sound.win();
  const isNewBest = maybeSaveBestTime(N, currentDifficulty, seconds);
  updateBestTimeDisplay();
  document.getElementById('winStats').textContent = `Solved in ${formatTime(seconds)} with ${hearts} heart${hearts===1?'':'s'} left.`;
  document.getElementById('newBestBadge').classList.toggle('show', isNewBest);
  document.getElementById('winOverlay').classList.add('show');
  startWinOwlCycle();
  launchConfetti();
}

function endGame(won){
  gameOver = true;
  clearInterval(timerInterval);
  if(!won){
    Sound.lose();
    document.getElementById('loseOverlay').classList.add('show');
  }
}

function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,'0');
  const sec = (s%60).toString().padStart(2,'0');
  return `${m}:${sec}`;
}

function startTimer(){
  clearInterval(timerInterval);
  seconds = 0;
  document.getElementById('timer').textContent = '00:00';
  timerInterval = setInterval(()=>{
    seconds++;
    document.getElementById('timer').textContent = formatTime(seconds);
  },1000);
}

function resetMarksOnly(){
  clearConflictTimers();
  conflictCell = null;
  hideTip();
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!given[r][c]) mark[r][c]='empty';
  }
  hearts = 3;
  gameOver = false;
  solved = false;
  selectedCell = null;
  hintUsed = false;
  hasInteracted = false;
  updateHintButton();
  document.getElementById('winOverlay').classList.remove('show');
  document.getElementById('loseOverlay').classList.remove('show');
  stopWinOwlCycle();
  render();
  startTimer();
}

function updateHintButton(){
  const btn = document.getElementById('hintBtn');
  btn.disabled = hintUsed;
  btn.textContent = hintUsed ? 'Hint used' : 'Hint';
}

function updateImpossibleLocks(){
  const locked = isImpossible();
  document.getElementById('hintBtn').classList.toggle('locked', locked);
}

// Reveals the first not-yet-correct cell (in reading order) from the true
// solution and locks it in as a given — same as if it had always been a
// starting clue. Only usable once per puzzle (see hintUsed) and disabled
// entirely on impossible/no-lines difficulties, where the 0-clue premise
// means giving away even one cell trivializes the rest.
function hint(){
  if(isImpossible()){ flashTip(`You can't use hints on ${currentDifficulty==='nolines'?'no lines':'impossible'} mode!`); return; }
  if(gameOver || solved || hintUsed) return;
  hasInteracted = true;
  let target = null;
  outer:
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(!given[r][c] && solutionPerm[r]===c && mark[r][c]!=='owl'){ target={r,c}; break outer; }
  }
  if(!target) return;
  given[target.r][target.c] = true;
  mark[target.r][target.c] = 'owl';
  selectedCell = target;
  hintUsed = true;
  updateHintButton();
  Sound.hint();
  render();
  checkWin();
}

// Takes a freshly generated puzzle (from generatePuzzle) and makes it the
// live board: resets all per-puzzle state, rebuilds the grid DOM, encodes
// it into the shareable URL, and starts the timer. This is the single path
// both newGame() and loadPuzzleFromURL() funnel through.
function startPuzzle(result){
  clearConflictTimers();
  conflictCell = null;
  hideTip();
  N = result.N;
  regionOf = result.regionOf;
  solutionPerm = result.perm;
  given = Array.from({length:N},()=>Array(N).fill(false));
  mark = Array.from({length:N},()=>Array(N).fill('empty'));
  markGlyph = Array.from({length:N},()=>Array(N).fill('x'));
  for(const rowStr in result.clues){
    const r = parseInt(rowStr,10);
    const c = result.clues[rowStr];
    given[r][c] = true;
    mark[r][c] = 'owl';
  }
  hearts = 3;
  gameOver = false;
  solved = false;
  selectedCell = null;
  hintUsed = false;
  hasInteracted = false;
  updateHintButton();
  // Use the difficulty this puzzle was actually generated for, not whatever
  // the <select> currently shows — those can disagree if a newer generation
  // request overlapped with this one (see the generationToken guard in
  // newGame()). Falls back to the live select for puzzles built before this
  // field existed (e.g. an older shared URL).
  currentDifficulty = result.difficulty || document.getElementById('difficultySelect').value;
  document.getElementById('difficultySelect').value = currentDifficulty;
  updateImpossibleLocks();
  updateBestTimeDisplay();
  document.getElementById('winOverlay').classList.remove('show');
  document.getElementById('loseOverlay').classList.remove('show');
  document.getElementById('newBestBadge').classList.remove('show');
  stopWinOwlCycle();
  currentPuzzleCode = packPuzzle(N, regionOf, result.clues, solutionPerm, currentDifficulty);
  try{
    const url = new URL(location.href);
    url.searchParams.set('p', currentPuzzleCode);
    history.replaceState(null, '', url);
  }catch(e){ /* sandboxed environments may block history API — ignore */ }
  buildGridDOM();
  render();
  startTimer();
}

// Bumped on every newGame() call so a slower, older generation can tell it's
// been superseded and bail out instead of clobbering a newer, correct result
// with a stale one (this is what let 'no lines' puzzles occasionally get a
// puzzle actually generated under a different difficulty — see newGame()).
let generationToken = 0;

async function newGame(){
  const myToken = ++generationToken;
  const requestedN = parseInt(document.getElementById('sizeSelect').value, 10);
  const requestedDifficulty = document.getElementById('difficultySelect').value;
  document.getElementById('boardWrap').classList.add('generating');
  await new Promise(res=>setTimeout(res, 10));
  const result = generatePuzzle(requestedN, requestedDifficulty);
  if(!result){
    // Only reachable if even the no-lines-preserving last resort couldn't
    // find a valid layout for this size — keep the current board rather than
    // crashing on a null result, and let the player know.
    document.getElementById('boardWrap').classList.remove('generating');
    flashTip("Couldn't generate that puzzle — try again");
    return;
  }
  if(myToken !== generationToken){
    // A newer newGame() call started (size/difficulty change, another click,
    // etc.) while this one was still generating. Whatever it produced is for
    // stale settings — discard it and let the newer call apply its own
    // result. Don't touch the DOM/'generating' class here; that's the newer
    // call's responsibility.
    return;
  }
  N = requestedN;
  startPuzzle(result);
  document.getElementById('boardWrap').classList.remove('generating');
  Sound.newPuzzle();
}

// Called once at boot (see bottom of file): if the page URL has a `p=`
// puzzle code — from a shared link, or from our own history.replaceState in
// startPuzzle() — load that exact board instead of generating a new one.
// Returns false (and generates normally) if there's no code, or it's
// invalid/corrupt.
function loadPuzzleFromURL(){
  try{
    const code = new URLSearchParams(location.search).get('p');
    if(!code) return false;
    const result = unpackPuzzle(code);
    if(!result) return false;
    document.getElementById('sizeSelect').value = String(result.N);
    if(result.difficulty) document.getElementById('difficultySelect').value = result.difficulty;
    startPuzzle(result);
    return true;
  }catch(e){
    console.warn('Could not load shared puzzle', e);
    return false;
  }
}
