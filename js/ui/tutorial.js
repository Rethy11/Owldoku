/* Paginated rules tutorial */

/* ---------- tutorial: paginated, illustrated rule pages ---------- */
const XMARK_SVG_MINI = `<svg viewBox="0 0 24 24" fill="none" stroke="#f4eee0" stroke-width="3" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
const QMARK_SVG_MINI = `<svg viewBox="0 0 24 24" fill="none" stroke="#f4eee0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(12 12) scale(1.18) translate(-12 -12)"><path d="M8.5 9a3.5 3.5 0 1 1 4.9 3.2c-1.05.46-1.4 1.08-1.4 2.05v.45"/><circle cx="12" cy="18.4" r="1.6" fill="#f4eee0" stroke="none"/></g></svg>`;

// shared 5x5 region layout used to illustrate every tutorial page
const TUT_REGIONS = [
  [0,0,1,1,2],
  [0,0,1,2,2],
  [0,3,3,2,2],
  [3,3,3,4,4],
  [3,4,4,4,4]
];

// Renders the small illustrative 5x5 board shown on tutorial pages, driven
// by a plain spec object rather than real game state: { owls, xs, qs,
// errors, selected, lines } are all arrays of [r,c] pairs (or similar) that
// each tutorial page fills in differently to highlight whatever rule it's
// explaining.
function tutBoardHTML(spec){
  const n = 5;
  const colors = regionColors(n);
  const owls = spec.owls || [];
  const xs = spec.xs || [];
  const qs = spec.qs || [];
  const errors = spec.errors || [];
  const selected = spec.selected || null;
  let html = `<div class="tut-grid" style="grid-template-columns:repeat(${n},1fr); grid-template-rows:repeat(${n},1fr);">`;
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      const isOwl = owls.some(([or,oc])=>or===r&&oc===c);
      const isX = xs.some(([or,oc])=>or===r&&oc===c);
      const isQ = qs.some(([or,oc])=>or===r&&oc===c);
      const isError = errors.some(([or,oc])=>or===r&&oc===c);
      const isSelected = selected && selected[0]===r && selected[1]===c;
      let cls = 'cell';
      if(isError) cls += ' error';
      if(isSelected) cls += ' selected';
      html += `<div class="${cls}"><div class="fill" style="background:${colors[TUT_REGIONS[r][c]]}"></div>`;
      if(isOwl) html += `<div class="glyph">${owlIconHTML()}</div>`;
      if(isX) html += `<div class="xmark">${XMARK_SVG_MINI}</div>`;
      if(isQ) html += `<div class="xmark">${QMARK_SVG_MINI}</div>`;
      html += `</div>`;
    }
  }
  html += `</div>`;
  // optional dashed line drawn cell-center-to-cell-center, used to call out
  // a full diagonal (no-lines mode illustration) rather than just the two
  // endpoint cells
  if(spec.line){
    const [[r1,c1],[r2,c2]] = spec.line;
    const x1 = (c1+0.5)/n*100, y1 = (r1+0.5)/n*100;
    const x2 = (c2+0.5)/n*100, y2 = (r2+0.5)/n*100;
    html += `<svg class="tut-line-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--miss)" stroke-width="2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }
  if(spec.gameOver){
    let heartsHtml = '';
    if(typeof spec.hearts === 'number'){
      heartsHtml = `<div class="tgo-hearts">${heartsMarkup(spec.hearts, 3)}</div>`;
    }
    html += `<div class="tut-gameover-overlay"><div class="tgo-owl">${owlIconHTML('sad')}</div><div class="tgo-title">Out of hearts</div><div class="tgo-sub">Game over</div>${heartsHtml}</div>`;
  }
  return html;
}

const TUTORIAL_PAGES = [
  {
    title: 'One owl per row, column & color',
    text: 'Each colored territory, each row, and each column must end up with exactly one owl.',
    board: { owls: [[0,0],[1,2],[2,4],[3,1],[4,3]] }
  },
  {
    title: "Owls can't touch",
    text: 'Not even diagonally — leave at least one empty cell between any two owls.',
    board: { owls: [[1,1],[2,2]], errors: [[1,1],[2,2]] }
  },
  {
    title: 'Mark X to track empty cells',
    text: "Switch to Mark X mode and tap or drag to cross out spots you know are empty. Tap the button again to swap to ? Mode.",
    board: { owls: [[2,2]], xs: [[0,2],[1,2],[3,2],[4,2],[2,0],[2,1],[2,3],[2,4]] }
  },
  {
    title: 'Switch back to place an owl',
    text: 'In Place owls mode, tap a cell to place an owl there — tap again to remove it.',
    board: { owls: [[2,2]], selected: [2,2] }
  },
  {
    title: 'Three hearts',
    text: 'A wrong owl placement costs a heart. Lose all three and it\u2019s game over.',
    board: { owls: [[1,1],[1,3]], errors: [[1,1],[1,3]] },
    hearts: 2,
    icon: 'sad'
  }
];

const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialCard = document.getElementById('tutorialCard');
const helpBtn = document.getElementById('helpBtn');
const tutBoardBox = document.getElementById('tutBoardBox');
const tutHearts = document.getElementById('tutHearts');
const tutTitle = document.getElementById('tutTitle');
const tutText = document.getElementById('tutText');
const tutDots = document.getElementById('tutDots');
const tutPrevBtn = document.getElementById('tutPrevBtn');
const tutNextBtn = document.getElementById('tutNextBtn');
document.getElementById('tutOwlIcon').innerHTML = owlIconHTML();

let tutPage = 0;

function renderTutorialPage(){
  const page = TUTORIAL_PAGES[tutPage];
  tutTitle.textContent = page.title;
  tutText.textContent = page.text;
  tutBoardBox.innerHTML = tutBoardHTML(page.board);
  document.getElementById('tutOwlIcon').innerHTML = page.icon === 'sad' ? owlIconHTML('sad') : owlIconHTML();
  if(typeof page.hearts === 'number'){
    tutHearts.innerHTML = heartsMarkup(page.hearts, 3);
    tutHearts.style.display = '';
  } else {
    tutHearts.style.display = 'none';
  }
  tutDots.innerHTML = TUTORIAL_PAGES.map((_,i)=>
    `<button type="button" class="dot${i===tutPage?' active':''}" data-i="${i}" aria-label="Go to page ${i+1}"></button>`
  ).join('');
  tutPrevBtn.classList.toggle('ghost', tutPage===0);
  tutNextBtn.textContent = tutPage === TUTORIAL_PAGES.length-1 ? 'Got it' : 'Next';
  // spotlight the real mode button the current page is talking about
  const highlightBtn = tutPage===2 ? xModeBtn : (tutPage===3 ? owlModeBtn : null);
  xModeBtn.classList.toggle('tut-glow', tutPage===2);
  owlModeBtn.classList.toggle('tut-glow', tutPage===3);
  positionTutorialOverlay(highlightBtn);
}

// Nudges the tutorial card by the smallest amount needed to clear whichever
// real button it's currently spotlighting — measured live, since the
// modebar's on-screen position can shift with viewport size/orientation.
// tutCardOffset tracks the translateY we last applied, so on every call we
// can back out the card's true, un-nudged position algebraically instead of
// resetting the transform on the live element first (which used to cause a
// visible snap-back-then-re-nudge when moving between two highlighted pages).
let tutCardOffset = 0;
function positionTutorialOverlay(highlightBtn){
  const margin = 14;
  const edgePad = 12;
  const rect = tutorialCard.getBoundingClientRect();
  const naturalTop = rect.top - tutCardOffset;
  const naturalBottom = rect.bottom - tutCardOffset;
  let offset = 0;
  if(highlightBtn){
    const btnRect = highlightBtn.getBoundingClientRect();
    const overlaps = naturalBottom + margin > btnRect.top && naturalTop - margin < btnRect.bottom;
    if(overlaps){
      const naturalMid = naturalTop + (naturalBottom - naturalTop)/2;
      const btnMid = btnRect.top + btnRect.height/2;
      offset = naturalMid <= btnMid
        ? -((naturalBottom + margin) - btnRect.top)   // card is above the button — nudge up just enough
        : (btnRect.bottom + margin) - naturalTop;       // card is below the button — nudge down just enough
      const newTop = naturalTop + offset;
      const newBottom = naturalBottom + offset;
      if(newTop < edgePad) offset += (edgePad - newTop);
      if(newBottom > window.innerHeight - edgePad) offset -= (newBottom - (window.innerHeight - edgePad));
    }
  }
  tutCardOffset = offset;
  tutorialCard.style.transform = offset ? `translateY(${offset}px)` : '';
}

function goTutorialPage(i){
  tutPage = Math.max(0, Math.min(TUTORIAL_PAGES.length-1, i));
  renderTutorialPage();
}

function showTutorial(){ tutPage = 0; tutorialOverlay.classList.add('show'); renderTutorialPage(); }
function hideTutorial(){
  tutorialOverlay.classList.remove('show');
  tutorialCard.style.transform = '';
  tutCardOffset = 0;
  xModeBtn.classList.remove('tut-glow');
  owlModeBtn.classList.remove('tut-glow');
  markTutorialSeen();
}

helpBtn.addEventListener('click', ()=>{ Sound.button(); showTutorial(); });
document.getElementById('tutCloseBtn').addEventListener('click', ()=>{ Sound.button(); hideTutorial(); });
tutDots.addEventListener('click', (e)=>{
  const dot = e.target.closest('.dot');
  if(!dot) return;
  Sound.button();
  goTutorialPage(parseInt(dot.dataset.i, 10));
});
tutPrevBtn.addEventListener('click', ()=>{
  if(tutPage===0) return;
  Sound.button();
  goTutorialPage(tutPage-1);
});
tutNextBtn.addEventListener('click', ()=>{
  Sound.button();
  if(tutPage === TUTORIAL_PAGES.length-1){ hideTutorial(); }
  else { goTutorialPage(tutPage+1); }
});
