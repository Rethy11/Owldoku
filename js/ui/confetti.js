/* Win confetti effects */

function launchConfetti(){
  const layer = document.getElementById('confettiLayer');
  if(!layer) return;
  layer.innerHTML = '';
  const colors = CONFETTI_COLORS;
  const count = 30;
  for(let i=0;i<count;i++){
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = (Math.random()*100) + '%';
    piece.style.background = colors[Math.floor(Math.random()*colors.length)];
    piece.style.animationDelay = (Math.random()*0.35) + 's';
    piece.style.animationDuration = (1.3 + Math.random()*0.9) + 's';
    piece.style.setProperty('--rotate', Math.floor(Math.random()*360) + 'deg');
    piece.style.setProperty('--drift', Math.floor((Math.random()*2-1)*70) + 'px');
    if(Math.random() < 0.4) piece.style.borderRadius = '50%';
    layer.appendChild(piece);
  }
  setTimeout(()=>{ layer.innerHTML = ''; }, 2600);
}

const CONFETTI_COLORS = ['#e8a33d','#7fb59e','#e0685a','#f4eee0','#b7aecb'];
let handConfettiPieces = [];

// Lazily-created, fixed, full-viewport layer for the hand-toss bursts.
// Kept separate from #confettiLayer (which sits behind .card) and appended
// straight to <body> with a high z-index so the burst is always visible
// on top of the win card, wherever on the page that card happens to be.
function getHandConfettiLayer(){
  let layer = document.getElementById('handConfettiLayer');
  if(!layer){
    layer = document.createElement('div');
    layer.id = 'handConfettiLayer';
    layer.style.cssText = 'position:fixed; inset:0; pointer-events:none; z-index:9999; overflow:hidden;';
    document.body.appendChild(layer);
  }
  return layer;
}

// One handful of confetti tossed from a single (x,y) viewport point.
// direction is -1 (toss left/out) or 1 (toss right/out); the pieces arc up
// and outward before falling and fading, rather than just raining down.
function spawnConfettiBurst(x, y, direction){
  const layer = getHandConfettiLayer();
  const count = 9;
  for(let i=0;i<count;i++){
    const piece = document.createElement('div');
    piece.className = 'hand-confetti-piece';
    piece.style.left = x + 'px';
    piece.style.top = y + 'px';
    piece.style.background = CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)];
    if(Math.random() < 0.4) piece.style.borderRadius = '50%';
    const spread = (Math.random()*40 + 20) * direction;
    const midX = spread + (Math.random()*20 - 10);
    const upY = -(Math.random()*45 + 35);
    const endX = midX + direction*(Math.random()*30 + 10);
    const endY = upY + (Math.random()*90 + 70);
    const rotMid = Math.floor(Math.random()*360);
    const rotEnd = rotMid + Math.floor(Math.random()*360 + 180);
    piece.style.setProperty('--tx-mid', midX + 'px');
    piece.style.setProperty('--ty-mid', upY + 'px');
    piece.style.setProperty('--tx-end', endX + 'px');
    piece.style.setProperty('--ty-end', endY + 'px');
    piece.style.setProperty('--rot-mid', rotMid + 'deg');
    piece.style.setProperty('--rot-end', rotEnd + 'deg');
    const duration = 0.85 + Math.random()*0.35;
    piece.style.animationDuration = duration + 's';
    layer.appendChild(piece);
    handConfettiPieces.push(piece);
    setTimeout(()=>{
      piece.remove();
      handConfettiPieces = handConfettiPieces.filter(p => p !== piece);
    }, duration*1000 + 80);
  }
}

// Owl-happy3's pose rests both wings down at its sides — this fires a
// burst from each wing tip (measured from the sprite: ~6%/47% from the
// left, ~93%/45% from the right of the icon box) so it reads as the owl
// tossing confetti with its hands, timed to whenever that frame is shown.
function launchHandConfetti(iconEl){
  const rect = iconEl.getBoundingClientRect();
  if(rect.width === 0) return;
  const leftHand = { x: rect.left + rect.width*0.06, y: rect.top + rect.height*0.47 };
  const rightHand = { x: rect.left + rect.width*0.93, y: rect.top + rect.height*0.45 };
  spawnConfettiBurst(leftHand.x, leftHand.y, -1);
  spawnConfettiBurst(rightHand.x, rightHand.y, 1);
}
