/* Grid rendering (render, SVG/hearts helpers) */

// Full re-render of every cell from current state. Simple over incremental
// (rebuilds each cell's inner HTML wholesale rather than patching just what
// changed) — board sizes here are small enough (up to ~10x10) that this is
// cheap, and it avoids an entire class of stale-DOM bugs.
// Per-cell signature cache used by render() to skip cells whose visible
// state hasn't changed since the last call. Without this, every tap
// rewrote all N*N cells' innerHTML (see buildGridDOM's full rebuild for
// comparison) even though a move only ever changes a handful of cells
// (the tapped cell, plus any cells whose conflict state flips as a
// result). That full-board rewrite is what was causing the redraw jank
// on slower devices. Invalidated (set to null) whenever buildGridDOM()
// throws away the old DOM nodes and creates new ones, since the cache
// is only meaningful for the DOM nodes it was computed against.
let prevCellSig = null;

function render(){
  const el = boardEl();
  const cells = el.children;
  const owls = allOwls();
  if(!prevCellSig || prevCellSig.length !== N){
    prevCellSig = Array.from({length:N}, ()=> new Array(N).fill(null));
  }
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const isGiven = !!given[r][c];
      const isFocusTarget = selectedCell ? (selectedCell.r===r && selectedCell.c===c) : (r===0 && c===0);
      const isSelected = !!selectedCell && selectedCell.r===r && selectedCell.c===c;
      const isOwl = isGiven || mark[r][c]==='owl';
      const hasConflict = isOwl && owlConflicts(r,c,owls).length>0;
      const isErrorClass = hasConflict && !isGiven;
      const markState = isOwl ? 'owl' : (mark[r][c]==='x' ? ('x:'+markGlyph[r][c]) : '');
      const isConflictCell = !!(conflictCell && conflictCell.r===r && conflictCell.c===c);
      const ariaLabel = cellAriaLabel(r,c);

      const sig = isGiven+'|'+isFocusTarget+'|'+isSelected+'|'+isErrorClass+'|'+markState+'|'+isConflictCell+'|'+ariaLabel;
      if(prevCellSig[r][c] === sig) continue;
      prevCellSig[r][c] = sig;

      const cell = cells[r*N+c];
      cell.classList.toggle('given', isGiven);
      cell.classList.toggle('selected', isSelected);
      cell.tabIndex = isFocusTarget ? 0 : -1;
      cell.classList.toggle('error', isErrorClass);
      cell.setAttribute('aria-label', ariaLabel);

      let inner = '';
      if(isOwl){
        inner = `<div class="glyph">${owlIconHTML()}</div>`;
      } else if(mark[r][c]==='x'){
        inner = xSvg(markGlyph[r][c]);
      }
      if(isConflictCell) inner += conflictXSvg();
      cell.classList.toggle('conflict-fading', false);
      const fill = cell.querySelector('.fill');
      cell.innerHTML = '';
      cell.appendChild(fill);
      cell.insertAdjacentHTML('beforeend', inner);
    }
  }
  document.getElementById('hearts').innerHTML = heartsHTML();
}

function conflictXSvg(){
  return `<div class="conflict-x"><svg viewBox="0 0 24 24" fill="none" stroke="var(--miss)" stroke-width="4" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></div>`;
}

function xSvg(glyph){
  if(glyph==='q'){
    return `<div class="xmark"><svg viewBox="0 0 24 24" fill="none" stroke="#f4eee0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12 12) scale(1.18) translate(-12 -12)"><path d="M8.5 9a3.5 3.5 0 1 1 4.9 3.2c-1.05.46-1.4 1.08-1.4 2.05v.45"/><circle cx="12" cy="18.4" r="1.6" fill="#f4eee0" stroke="none"/></g></svg></div>`;
  }
  return `<div class="xmark"><svg viewBox="0 0 24 24" fill="none" stroke="#f4eee0" stroke-width="3" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg></div>`;
}

// Shared by the live statbar hearts, the tutorial pages, and the mini
// "game over" board preview: the ♥ glyphs alone don't tell a screen reader
// how many lives remain (or are lost) — this adds a visually-hidden text
// equivalent alongside the same visible glyphs, unchanged.
function heartsMarkup(count, total=3){
  let glyphs = '';
  for(let i=0;i<total;i++) glyphs += i < count ? '♥' : '<span class="lost">♥</span>';
  return `<span class="sr-only">${count} of ${total} lives remaining</span><span aria-hidden="true">${glyphs}</span>`;
}

function heartsHTML(){
  return heartsMarkup(hearts, 3);
}
