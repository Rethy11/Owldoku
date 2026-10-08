/* Pointer drag-painting and keyboard access for the grid */

/* ---------- X-mark placement: click-drag paints/erases across multiple
   cells in one stroke ---------- */
// Whether the stroke adds or removes X marks is decided once, from the
// very first cell touched (onGridPointerDown), then held for the rest of
// the drag — so dragging across a mix of marked/unmarked cells doesn't
// flip back and forth. An erase stroke is further restricted to only the
// glyph (✕ or ?) it started on, so it can't accidentally erase the other
// kind of mark it happens to cross over.
function paintX(r,c,action){
  if(given[r][c]) return;
  if(action==='add' && mark[r][c]!=='x'){
    const wasOwl = mark[r][c]==='owl';
    mark[r][c]='x';
    markGlyph[r][c] = xGlyph;
    hasInteracted = true;
    render();
    wasOwl ? Sound.owlRemove() : Sound.xSlideAdd();
  }
  else if(action==='remove' && mark[r][c]==='x'){ mark[r][c]='empty'; hasInteracted = true; render(); Sound.xSlideRemove(); }
}

function cellFromPoint(x,y){
  const el = document.elementFromPoint(x,y);
  if(!el) return null;
  const cellEl = el.closest ? el.closest('.cell') : null;
  if(!cellEl) return null;
  return { r: +cellEl.dataset.r, c: +cellEl.dataset.c };
}

let lastCellTap = { r:null, c:null, time:0 };
function onGridPointerDown(e){
  if(gameOver || solved || conflictCell) return;
  const cellEl = e.target.closest('.cell');
  if(!cellEl) return;
  e.preventDefault();
  const r = +cellEl.dataset.r, c = +cellEl.dataset.c;

  // A fast repeat tap on the SAME cell (i.e. a double-tap) is treated as a
  // no-op rather than toggling the mark a second time. This isn't really
  // about debouncing input — it's what keeps Safari's smart-zoom-to-element
  // gesture from getting triggered in the first place: toggleOwl()/paintX()
  // both call render(), which rebuilds the cell's innerHTML, so without this
  // guard the second tap of a double-tap lands on a DOM node that's
  // different from the one the first tap touched. That mismatch seems to be
  // what convinces Safari it should zoom to the "new" element instead of
  // recognizing this as an ordinary repeated tap it can ignore.
  const now = Date.now();
  if(lastCellTap.r===r && lastCellTap.c===c && (now - lastCellTap.time) < 400){
    lastCellTap.time = now;
    return;
  }
  lastCellTap = { r, c, time: now };

  selectedCell = {r,c};

  if(mode==='owl'){
    toggleOwl(r,c);
    return;
  }
  // x mode
  if(given[r][c]){ render(); return; }
  const action = mark[r][c]==='x' ? 'remove' : 'add';
  dragAction = action;
  dragGlyph = action==='remove' ? markGlyph[r][c] : xGlyph;
  dragging = true;
  Sound.resetSlide();
  paintX(r,c,action);
}

function onDocPointerMove(e){
  if(!dragging || mode!=='x') return;
  e.preventDefault();
  const cell = cellFromPoint(e.clientX, e.clientY);
  if(!cell) return;
  if(mark[cell.r][cell.c]==='owl') return;
  if(dragAction==='remove' && mark[cell.r][cell.c]==='x' && markGlyph[cell.r][cell.c]!==dragGlyph) return;
  paintX(cell.r, cell.c, dragAction);
}

function onDocPointerUp(){
  dragging = false;
  dragAction = null;
  dragGlyph = null;
}

/* ---------- keyboard access for the puzzle grid ----------
   Arrow keys move a roving tabindex from cell to cell (Home/End jump to the
   start/end of the current row); Enter or Space acts on the focused cell
   exactly as a single tap would, using whichever mode — owl or X — is
   currently active. Click-drag painting across multiple cells at once is a
   pointer-only convenience; a keyboard user just presses Enter/Space once
   per cell, which is equivalent to a single tap on that cell. */
function focusCell(r,c){
  selectedCell = {r,c};
  render();
  const target = boardEl().children[r*N+c];
  if(target) target.focus();
}

function activateFocusedCell(r,c){
  if(gameOver || solved || conflictCell) return;
  if(given[r][c]){ selectedCell = {r,c}; render(); return; }
  selectedCell = {r,c};
  if(mode==='owl'){
    toggleOwl(r,c);
    return;
  }
  const action = mark[r][c]==='x' ? 'remove' : 'add';
  paintX(r,c,action);
}

function onGridKeyDown(e){
  const cellEl = e.target.closest('.cell');
  if(!cellEl) return;
  const r = +cellEl.dataset.r, c = +cellEl.dataset.c;
  switch(e.key){
    case 'ArrowUp':    e.preventDefault(); if(r>0) focusCell(r-1,c); break;
    case 'ArrowDown':  e.preventDefault(); if(r<N-1) focusCell(r+1,c); break;
    case 'ArrowLeft':  e.preventDefault(); if(c>0) focusCell(r,c-1); break;
    case 'ArrowRight': e.preventDefault(); if(c<N-1) focusCell(r,c+1); break;
    case 'Home':       e.preventDefault(); focusCell(r,0); break;
    case 'End':        e.preventDefault(); focusCell(r,N-1); break;
    case 'Enter':
    case ' ':
      e.preventDefault();
      activateFocusedCell(r,c);
      break;
  }
}

// Plain-language description of one cell's state, for the accessible name
// screen readers announce as focus moves around the board. Sighted players
// get all of this from color/glyph at a glance; this is that same
// information in words.
function cellAriaLabel(r,c){
  const isOwl = given[r][c] || mark[r][c]==='owl';
  const isX = !isOwl && mark[r][c]==='x';
  let state;
  if(isOwl){
    state = given[r][c] ? 'given owl, fixed clue' : 'owl';
  } else if(isX){
    state = markGlyph[r][c]==='q' ? 'marked with a question mark' : 'marked with an X';
  } else {
    state = 'empty';
  }
  const conflictNote = (isOwl && !given[r][c] && owlConflicts(r,c,allOwls()).length>0)
    ? ', conflicts with another owl' : '';
  return `Row ${r+1}, column ${c+1}, region ${regionOf[r][c]+1}: ${state}${conflictNote}`;
}
