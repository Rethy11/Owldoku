/* Owl placement rules, conflict detection and feedback */

/* ---------- owl placement rules & conflict feedback ---------- */
// The core Owldoku rule set: no two owls may share a row, column, or region,
// or sit in touching cells (including diagonally adjacent) — regardless of
// difficulty. 'nolines' mode adds one more rule on top: owls also can't
// share any full diagonal line across the board, not just be diagonally
// touching.
function owlConflicts(r,c, owls){
  const conflicts = [];
  const noLines = currentDifficulty === 'nolines';
  for(const [or,oc] of owls){
    if(or===r && oc===c) continue;
    const sameRow = or===r;
    const sameCol = oc===c;
    const sameRegion = regionOf[or][oc]===regionOf[r][c];
    const touching = Math.abs(or-r)<=1 && Math.abs(oc-c)<=1;
    const onDiagonal = noLines && Math.abs(or-r)===Math.abs(oc-c);
    if(sameRow || sameCol || sameRegion || touching || onDiagonal) conflicts.push([or,oc]);
  }
  return conflicts;
}

function conflictMessage(r, c, conflicts){
  const noLines = currentDifficulty === 'nolines';
  let touch=false, col=false, row=false, region=false, diagonal=false;
  for(const [or,oc] of conflicts){
    if(Math.abs(or-r)<=1 && Math.abs(oc-c)<=1) touch = true;
    else if(noLines && Math.abs(or-r)===Math.abs(oc-c)) diagonal = true;
    if(oc===c) col = true;
    if(or===r) row = true;
    if(regionOf[or][oc]===regionOf[r][c]) region = true;
  }
  if(touch) return "Owls can't touch!";
  if(diagonal) return "No straight lines — owls can't share a diagonal!";
  if(col) return "Owls can't share a column!";
  if(row) return "Owls can't share a row!";
  if(region) return "Owls can't share a color!";
  return "Owls can't do that!";
}

function showTip(msg){
  const tip = document.getElementById('tipPopup');
  if(!tip) return;
  tip.textContent = msg;
  // force reflow so re-adding 'show' after a quick repeat retriggers the transition
  void tip.offsetWidth;
  tip.classList.add('show');
}

function hideTip(){
  const tip = document.getElementById('tipPopup');
  if(tip) tip.classList.remove('show');
}

let tipFlashTimeout = null;
function flashTip(msg, duration=1800){
  clearTimeout(tipFlashTimeout);
  showTip(msg);
  tipFlashTimeout = setTimeout(hideTip, duration);
}

function isImpossible(){
  return currentDifficulty === 'impossible' || currentDifficulty === 'nolines';
}

function clearConflictTimers(){
  if(conflictTimeoutA){ clearTimeout(conflictTimeoutA); conflictTimeoutA = null; }
  if(conflictTimeoutB){ clearTimeout(conflictTimeoutB); conflictTimeoutB = null; }
}

// Runs the full "you placed an owl somewhere illegal" sequence: show the
// reason as a tooltip, briefly leave the offending owl in place so the
// conflict is visible, fade it out, then actually remove it — losing a
// heart in the process. If that heart was the last one, end the game only
// once the owl has finished being removed, not the instant it hits zero.
function showConflictFeedback(r, c, conflicts){
  clearConflictTimers();
  conflictCell = {r, c};
  showTip(conflictMessage(r, c, conflicts));
  render();
  conflictTimeoutA = setTimeout(()=>{
    if(conflictCell && conflictCell.r===r && conflictCell.c===c){
      document.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`)?.classList.add('conflict-fading');
    }
    hideTip();
    conflictTimeoutB = setTimeout(()=>{
      if(mark[r][c]==='owl') mark[r][c] = 'empty';
      const wasFatal = hearts===0;
      conflictCell = null;
      render();
      if(wasFatal) endGame(false);
    }, 420);
  }, 900);
}

function toggleOwl(r,c){
  if(given[r][c]){ selectedCell={r,c}; render(); return; }
  selectedCell = {r,c};
  hasInteracted = true;
  if(mark[r][c]==='owl'){
    mark[r][c]='empty';
    Sound.owlRemove();
  } else {
    mark[r][c]='owl';
    const owls = allOwls();
    const conflicts = owlConflicts(r,c,owls);
    if(conflicts.length>0){
      Sound.conflict();
      hearts = Math.max(0, hearts-1);
      Sound.heartLost();
      showConflictFeedback(r,c,conflicts);
      render();
      return;
    } else {
      Sound.owlPlace();
    }
  }
  render();
  checkWin();
}
