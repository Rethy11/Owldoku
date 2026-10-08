/* Region colors, owl sprites, win-owl animation cycle */

/* ---------- game state ---------- */
const REGION_COLORS_CACHE = {};
// Evenly-spaced hues around the color wheel, one per region — deterministic
// and stable for a given N, so the same puzzle always looks the same.
// Cached since N (and therefore this palette) doesn't change mid-puzzle.
function regionColors(N){
  if(REGION_COLORS_CACHE[N]) return REGION_COLORS_CACHE[N];
  const cols = [];
  for(let i=0;i<N;i++){
    const hue = Math.round((360/N)*i);
    cols.push(`hsl(${hue} 42% 34%)`);
  }
  REGION_COLORS_CACHE[N] = cols;
  return cols;
}

/* ---------- owl sprites (neutral / happy / dazed) ---------- */
// Owl artwork lives in individual, fully self-contained .svg files under
// /sprites (owl.svg, owl-happy1..4.svg, owl-sad.svg) — each one bundles its
// own gradients/filters (or, for the raster ones, its own embedded image
// data) and depends on nothing else on the page. They're rendered as plain
// <img> elements, so each is a fully isolated resource: swapping any of
// these for a different image (any size, any style) just works, with
// nothing else in the code or page to break.
//
// 'happy' has four frames (owl-happy1..4.svg). Most call sites just want a
// single static happy face, so owlIconHTML('happy') below returns frame 1.
// The win overlay is the one place that animates through all four — see
// startWinOwlCycle()/stopWinOwlCycle() further down, which drive
// #winOwlIcon's <img src> directly rather than going through this helper.
function owlIconHTML(kind, extraClass){
  const src = kind === 'happy' ? 'sprites/owl-happy1.svg'
            : kind === 'sad'   ? 'sprites/owl-sad.svg'
            : 'sprites/owl.svg';
  const cls = 'owl-icon' + (extraClass ? ' ' + extraClass : '');
  return `<img class="${cls}" src="${src}" alt="" draggable="false" onerror="this.style.visibility='hidden'">`;
}

// Win-overlay happy-owl animation: cycles frames 1,2,3,4,3,1,2,3,4,3,...
// (a little bounce back through 3 before restarting) for as long as the
// win overlay is open.
const WIN_OWL_CYCLE = ['owl-happy1','owl-happy2','owl-happy3','owl-happy4','owl-happy3'];
const WIN_OWL_FRAME_MS = 450;
let winOwlCycleInterval = null;
let winOwlCycleIndex = 0;

function startWinOwlCycle(){
  stopWinOwlCycle();
  const holder = document.getElementById('winOwlIcon');
  if(!holder) return;
  let img = holder.querySelector('img');
  if(!img){
    holder.innerHTML = owlIconHTML('happy');
    img = holder.querySelector('img');
  }
  winOwlCycleIndex = 0;
  img.src = `sprites/${WIN_OWL_CYCLE[winOwlCycleIndex]}.svg`;
  winOwlCycleInterval = setInterval(()=>{
    winOwlCycleIndex = (winOwlCycleIndex + 1) % WIN_OWL_CYCLE.length;
    const frame = WIN_OWL_CYCLE[winOwlCycleIndex];
    img.src = `sprites/${frame}.svg`;
    if(frame === 'owl-happy3') launchHandConfetti(holder);
  }, WIN_OWL_FRAME_MS);
}

function stopWinOwlCycle(){
  if(winOwlCycleInterval !== null){
    clearInterval(winOwlCycleInterval);
    winOwlCycleInterval = null;
  }
  handConfettiPieces.forEach(p => p.remove());
  handConfettiPieces = [];
}
