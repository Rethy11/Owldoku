/* Board sizing and grid DOM construction */

/* ---------- keep the visible board box a square that hugs the grid, ---------- */
/* rather than stretching to fill the whole rectangular wrapper           */
function sizeBoard(){
  const gw = document.getElementById('gameWrap');
  const wrap = document.getElementById('boardWrap');
  const box = document.getElementById('boardBox');
  const grid = document.getElementById('grid');
  if(!gw || !wrap || !box || !grid) return;
  // The board wrapper no longer stretches to fill leftover space (that left a
  // big gap above and below the board). Instead: available height = the
  // shell's inner height minus every other row, and the wrapper is then set
  // to exactly the board's height so the controls sit right against it.
  const gcs = getComputedStyle(gw);
  const innerW = gw.clientWidth  - parseFloat(gcs.paddingLeft) - parseFloat(gcs.paddingRight);
  const innerH = gw.clientHeight - parseFloat(gcs.paddingTop)  - parseFloat(gcs.paddingBottom);
  let others = 0;
  Array.from(gw.children).forEach(ch=>{
    if(ch === wrap) return;
    const cs = getComputedStyle(ch);
    if(cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') return;
    others += ch.offsetHeight + parseFloat(cs.marginTop) + parseFloat(cs.marginBottom);
  });
  const wcs = getComputedStyle(wrap);
  const wrapMarginY = parseFloat(wcs.marginTop) + parseFloat(wcs.marginBottom);
  const availW = innerW;
  const availH = innerH - others - wrapMarginY;
  const boxCs = getComputedStyle(box);
  const boxPadX = parseFloat(boxCs.paddingLeft) + parseFloat(boxCs.paddingRight);
  const boxPadY = parseFloat(boxCs.paddingTop) + parseFloat(boxCs.paddingBottom);
  const outerSize = Math.max(0, Math.floor(Math.min(availW, availH)));
  const gridSize = Math.max(0, outerSize - Math.max(boxPadX, boxPadY));
  box.style.width = (gridSize + boxPadX) + 'px';
  box.style.height = (gridSize + boxPadY) + 'px';
  grid.style.width = gridSize + 'px';
  grid.style.height = gridSize + 'px';
  wrap.style.height = (gridSize + boxPadY) + 'px';
}

function buildGridDOM(){
  const el = boardEl();
  el.innerHTML = '';
  // New DOM nodes are about to be created, so any cached per-cell render
  // signatures (see render()) refer to nodes that no longer exist — clear
  // the cache so the next render() repaints every cell instead of wrongly
  // skipping cells that "look" unchanged on the new nodes.
  prevCellSig = null;
  el.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
  el.style.gridTemplateRows = `repeat(${N}, 1fr)`;
  el.setAttribute('aria-label', `Owldoku puzzle board, ${N} by ${N}`);
  el.setAttribute('aria-rowcount', N);
  el.setAttribute('aria-colcount', N);
  const colors = regionColors(N);
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.r = r; cell.dataset.c = c;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-rowindex', r+1);
      cell.setAttribute('aria-colindex', c+1);
      // Roving tabindex: only one cell sits in the Tab order at a time (the
      // current position); arrow keys move it. Starts at the top-left cell.
      cell.tabIndex = (r===0 && c===0) ? 0 : -1;
      const fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.background = colors[regionOf[r][c]];
      cell.appendChild(fill);
      el.appendChild(cell);
    }
  }
  applyRegionBorders();
  sizeBoard();
}

// Draws a thicker border only on edges where the neighboring cell belongs to
// a different region (plus the outer edge of the whole board), so region
// boundaries read clearly against the plain 2px grid gap everywhere else.
function applyRegionBorders(){
  const el = boardEl();
  const cells = el.children;
  for(let r=0;r<N;r++){
    for(let c=0;c<N;c++){
      const cell = cells[r*N+c];
      const reg = regionOf[r][c];
      const rightDiff = c<N-1 && regionOf[r][c+1]!==reg;
      const bottomDiff = r<N-1 && regionOf[r+1][c]!==reg;
      const leftDiff = c>0 && regionOf[r][c-1]!==reg;
      const topDiff = r>0 && regionOf[r-1][c]!==reg;
      cell.style.borderRight = rightDiff ? '2px solid var(--bg-deep)' : 'none';
      cell.style.borderBottom = bottomDiff ? '2px solid var(--bg-deep)' : 'none';
      cell.style.borderLeft = (leftDiff || c===0) ? '2px solid var(--bg-deep)' : 'none';
      cell.style.borderTop = (topDiff || r===0) ? '2px solid var(--bg-deep)' : 'none';
    }
  }
}

function allOwls(){
  const out = [];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    if(given[r][c] || mark[r][c]==='owl') out.push([r,c]);
  }
  return out;
}
