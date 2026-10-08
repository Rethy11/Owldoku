/* Toolbar, confirm dialog, selects, owl/X mode buttons */

document.getElementById('clearBtn').addEventListener('click', ()=>{
  Sound.button();
  if(hasInteracted){ openConfirm('reset'); } else { resetMarksOnly(); }
});
document.getElementById('hintBtn').addEventListener('click', hint);
document.getElementById('newBtn').addEventListener('click', ()=>{
  Sound.button();
  if(hasInteracted){ openConfirm('new'); } else { newGame(); }
});
document.getElementById('playAgainBtn').addEventListener('click', newGame);
document.getElementById('retryBtn').addEventListener('click', ()=>{ Sound.button(); resetMarksOnly(); });
document.getElementById('freshBtn').addEventListener('click', newGame);
// Just dismiss the overlay — the puzzle stays exactly as it is (solved or
// game-over) underneath, so this never restarts a puzzle or generates a
// new one. Timer/board/hearts state is untouched; checkWin()/endGame()
// already stopped the timer before this overlay ever appeared.
function closeResultOverlay(overlayId){
  Sound.button();
  document.getElementById(overlayId).classList.remove('show');
  if(overlayId === 'winOverlay') stopWinOwlCycle();
}
document.getElementById('winCloseBtn').addEventListener('click', ()=> closeResultOverlay('winOverlay'));
document.getElementById('loseCloseBtn').addEventListener('click', ()=> closeResultOverlay('loseOverlay'));
document.getElementById('sizeSelect').addEventListener('change', newGame);
document.getElementById('difficultySelect').addEventListener('change', (e)=>{
  if(e.target.value === 'nolines') showNolinesTutorial();
  newGame();
});
let confirmAction = null; // 'reset' | 'new'
const confirmOverlay = document.getElementById('confirmOverlay');
const confirmText = document.getElementById('confirmText');

function openConfirm(action){
  confirmAction = action;
  confirmText.textContent = action === 'reset'
    ? "This will clear your progress on the current board."
    : "This will start a fresh board and your current progress will be lost.";
  confirmOverlay.classList.add('show');
}
function closeConfirm(){
  confirmOverlay.classList.remove('show');
  confirmAction = null;
}
document.getElementById('confirmYesBtn').addEventListener('click', ()=>{
  Sound.button();
  const action = confirmAction;
  closeConfirm();
  if(action==='reset') resetMarksOnly();
  else if(action==='new') newGame();
});
document.getElementById('confirmNoBtn').addEventListener('click', ()=>{ Sound.button(); closeConfirm(); });

document.getElementById('shareWinBtn').addEventListener('click', (e)=> sharePuzzle(e.currentTarget, true));
document.getElementById('shareLoseBtn').addEventListener('click', (e)=> sharePuzzle(e.currentTarget, false));

/* ---------- owl / X mode buttons ---------- */
const owlModeBtn = document.getElementById('owlModeBtn');
const xModeBtn = document.getElementById('xModeBtn');
const xModeIcon = document.getElementById('xModeIcon');
const xModeLabel = document.getElementById('xModeLabel');
function updateXModeBtn(){
  xModeIcon.textContent = xGlyph==='q' ? '?' : '✕';
  xModeLabel.textContent = xGlyph==='q' ? 'Mark ?' : 'Mark X';
}
function setMode(m){
  if(m==='x' && mode==='x'){
    // already in x-mode: tapping again swaps the mark's icon between ✕ and ?
    xGlyph = xGlyph==='x' ? 'q' : 'x';
    Sound.modeSwitch();
    updateXModeBtn();
    render();
    return;
  }
  if(mode !== m) Sound.modeSwitch();
  mode = m;
  owlModeBtn.classList.toggle('active', m==='owl');
  xModeBtn.classList.toggle('active', m==='x');
  owlModeBtn.setAttribute('aria-pressed', m==='owl' ? 'true' : 'false');
  xModeBtn.setAttribute('aria-pressed', m==='x' ? 'true' : 'false');
}
owlModeBtn.addEventListener('click', ()=>setMode('owl'));
xModeBtn.addEventListener('click', ()=>setMode('x'));
