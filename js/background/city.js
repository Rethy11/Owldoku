/* Procedural Tokyo-rain skyline backdrop (runs once at load) */

/* ---------------------------------------------------------------------------
   Procedural Tokyo-rain skyline for the main-screen backdrop.
   Runs once at load: builds SVG geometry (crisp at any resolution/aspect
   ratio, since it's all vector + viewBox scaling), then hands off entirely
   to CSS keyframe animation for the actual motion (parallax drift, window
   flicker, neon pulse, rain, train pass). No per-frame JS after this runs,
   so it's essentially free at runtime regardless of screen size.
--------------------------------------------------------------------------- */
(function(){
  const SVGNS = 'http://www.w3.org/2000/svg';
  const VBW = 1600, VBH = 900;
  function rnd(a,b){ return Math.random()*(b-a)+a; }
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function make(tag, attrs){
    const e = document.createElementNS(SVGNS, tag);
    for(const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* ---------- far layer: distant jagged skyline silhouette ---------- */
  (function buildFar(){
    const svg = document.getElementById('cityFarTileA');
    if(!svg) return;
    const pts = [`0,${VBH}`];
    let x = 0;
    while(x < VBW){
      const w = rnd(35,95);
      const h = rnd(70,230);
      const topY = VBH - 130 - h*0.5;
      pts.push(`${x.toFixed(1)},${topY.toFixed(1)}`);
      pts.push(`${(x+w).toFixed(1)},${topY.toFixed(1)}`);
      x += w + rnd(1,8);
    }
    pts.push(`${VBW},${VBH}`);
    svg.appendChild(make('polygon', { points: pts.join(' '), fill:'#2b2448' }));
  })();

  /* ---------- mid layer: lit-window buildings ---------- */
  (function buildMid(){
    const svg = document.getElementById('cityMidTileA');
    if(!svg) return;
    const litColors = ['#ffdca0','#cfe8ff','#ffe9c2','#ffd9ec'];
    const bodyColors = ['#332a52','#3a3160','#2e2748'];
    let x = 0;
    while(x < VBW){
      const w = rnd(65,155);
      const h = rnd(170,540);
      const y = VBH - h;
      svg.appendChild(make('rect', { x, y, width:w, height:h, fill: pick(bodyColors) }));
      if(Math.random() < 0.35){
        svg.appendChild(make('rect', { x, y: y-14, width:w, height:14, fill:'#241d3d' }));
      }
      const cols = Math.max(2, Math.floor(w/22));
      const rows = Math.max(3, Math.floor(h/26));
      const cellW = w/cols, cellH = h/rows;
      for(let r=0;r<rows;r++){
        for(let c=0;c<cols;c++){
          if(Math.random() < 0.34) continue;
          const wx = x + c*cellW + cellW*0.25;
          const wy = y + r*cellH + cellH*0.22;
          const lit = Math.random() < 0.72;
          const baseOpacity = lit ? rnd(0.45,0.95) : 0.1;
          const rect = make('rect', {
            x:wx, y:wy, width:cellW*0.5, height:cellH*0.56, rx:1,
            fill: pick(litColors), opacity:baseOpacity
          });
          if(lit && Math.random() < 0.04){
            rect.setAttribute('class','win');
            rect.style.setProperty('--d', rnd(0,10).toFixed(2)+'s');
            rect.style.setProperty('--fdur', rnd(4,9).toFixed(2)+'s');
            rect.style.setProperty('--wo', baseOpacity.toFixed(2));
          }
          svg.appendChild(rect);
        }
      }
      x += w + rnd(3,12);
    }
  })();

  /* ---------- near layer: closer dark silhouettes + rooftop life ---------- */
  (function buildNear(){
    const svg = document.getElementById('cityNearTileA');
    if(!svg) return;
    let x = -60;
    while(x < VBW+60){
      const w = rnd(140,340);
      const h = rnd(240,540);
      const y = VBH - h;
      svg.appendChild(make('rect', { x, y, width:w, height:h, fill:'#140f24' }));
      if(Math.random() < 0.55){
        const cols = Math.floor(w/42);
        for(let c=0;c<cols;c++){
          if(Math.random() < 0.55) continue;
          svg.appendChild(make('rect', {
            x: x+18+c*42, y: y+rnd(18,h-40), width:13, height:17,
            fill:'#4a3a24', opacity: rnd(0.35,0.7)
          }));
        }
      }
      x += w + rnd(-30,12);
    }

    /* rooftop props sit in their own group, appended last so they render on
       top of the buildings without needing an id (this tile gets cloned
       whole into tile B, and duplicate ids in the DOM are best avoided). */
    const props = make('g', {});
    svg.appendChild(props);

    /* water tower */
    const towerX = rnd(180, VBW-180);
    const towerY = VBH - rnd(300,460);
    const wt = make('g', {});
    wt.innerHTML = `
      <rect x="${towerX-34}" y="${towerY}" width="68" height="52" rx="6" fill="#1b1530"/>
      <polygon points="${towerX-40},${towerY} ${towerX+40},${towerY} ${towerX+24},${towerY-26} ${towerX-24},${towerY-26}" fill="#241c3c"/>
      <rect x="${towerX-6}" y="${towerY+52}" width="4" height="30" fill="#1b1530"/>
      <rect x="${towerX+18}" y="${towerY+52}" width="4" height="30" fill="#1b1530"/>
      <rect x="${towerX-24}" y="${towerY+52}" width="4" height="30" fill="#1b1530"/>`;
    props.appendChild(wt);

    /* antenna with blinking beacon */
    const antX = rnd(220, VBW-220);
    const antY = VBH - rnd(360,520);
    const ant = make('g', {});
    ant.innerHTML = `
      <line x1="${antX}" y1="${antY}" x2="${antX}" y2="${antY-70}" stroke="#1b1530" stroke-width="3"/>
      <line x1="${antX-14}" y1="${antY-40}" x2="${antX+14}" y2="${antY-40}" stroke="#1b1530" stroke-width="2"/>
      <circle class="beacon" cx="${antX}" cy="${antY-70}" r="4" fill="#ff5566"/>`;
    props.appendChild(ant);

    /* steam vents rising from a rooftop */
    for(let i=0;i<3;i++){
      const sx = rnd(260, VBW-260);
      const sy = VBH - rnd(230,380);
      const steam = make('ellipse', {
        cx: sx, cy: sy, rx:10, ry:16, fill:'rgba(220,220,235,0.4)'
      });
      steam.setAttribute('class','steam');
      steam.style.animationDelay = rnd(0,7).toFixed(2)+'s';
      props.appendChild(steam);
    }

    /* elevated train that occasionally slides across */
    const trainY = VBH - rnd(120,220);
    const train = make('g', { class:'train' });
    let cars = '';
    for(let i=0;i<4;i++){
      const cx = i*120;
      cars += `<rect x="${cx}" y="${trainY}" width="100" height="30" rx="4" fill="#241c3c"/>
        <rect x="${cx+8}" y="${trainY+6}" width="14" height="12" fill="#ffdca0" opacity="0.8"/>
        <rect x="${cx+30}" y="${trainY+6}" width="14" height="12" fill="#cfe8ff" opacity="0.7"/>
        <rect x="${cx+52}" y="${trainY+6}" width="14" height="12" fill="#ffdca0" opacity="0.75"/>
        <rect x="${cx+74}" y="${trainY+6}" width="14" height="12" fill="#cfe8ff" opacity="0.6"/>`;
    }
    train.innerHTML = `<line x1="-40" y1="${trainY+32}" x2="1640" y2="${trainY+32}" stroke="#1b1530" stroke-width="4"/>${cars}`;
    props.appendChild(train);

    /* a couple of birds drifting past */
    for(let i=0;i<2;i++){
      const by = rnd(120,320);
      const bird = make('path', {
        class:'bird', d:'M0,0 q8,-10 16,0 q8,-10 16,0',
        fill:'none', stroke:'#c9c2df', 'stroke-width':2, 'stroke-linecap':'round'
      });
      bird.style.transformOrigin = `0px ${by}px`;
      bird.setAttribute('transform', `translate(0,${by})`);
      bird.style.animationDelay = rnd(0,20).toFixed(2)+'s';
      props.appendChild(bird);
    }
  })();

  /* ---------- mirror each generated tile into its scroll partner ---------- */
  ['cityFar','cityMid','cityNeon','cityNear'].forEach(function(base){
    const a = document.getElementById(base+'TileA');
    const b = document.getElementById(base+'TileB');
    if(a && b) b.innerHTML = a.innerHTML;
  });

  /* ---------- rain: individual falling streaks, not a tiled pattern ----------
     Drawn on canvas from a single rAF loop rather than ~30 separately CSS-
     animated SVG <line>s (the earlier approach) — each of those was its own
     gradient-stroked node the browser had to keep rasterizing, which added
     up to a real sustained compositing cost on lower-end mobile. Same look
     (per-streak length/speed/opacity, comet-tail gradient, never-repeating
     randomized fall), cheaper engine underneath. */
  function initCanvasRain(canvas, count, o){
    if(!canvas) return null;
    const c2d = canvas.getContext('2d');
    if(!c2d) return null;
    const angleRad = o.angleDeg * Math.PI/180;
    const totalDx = Math.sin(angleRad) * o.travel;
    const drops = [];
    for(let i=0;i<count;i++){
      const len = rnd(o.lenMin, o.lenMax);
      const x1 = rnd(-100, VBW+100);
      const y1 = rnd(-320, -10);
      const dx = Math.sin(angleRad) * len;
      const dy = Math.cos(angleRad) * len;
      const dur = rnd(o.durMin, o.durMax) * 1000; // ms
      // Gradient is built once here, in the drop's own local (untranslated)
      // coordinate space, instead of every frame. Canvas gradients paint
      // through whatever transform is active when the shape is stroked, so
      // as long as we apply the same tx/ty translation at draw time that we
      // used here, the gradient tracks the moving drop correctly without
      // ever being recreated.
      const grad = c2d.createLinearGradient(x1, y1, x1+dx, y1+dy);
      grad.addColorStop(0, `rgba(${o.rgbTop},0)`);
      grad.addColorStop(o.midStop, `rgba(${o.rgbMid},${o.midAlpha})`);
      grad.addColorStop(1, `rgba(${o.rgbBottom},0)`);
      drops.push({
        x1, y1, x2: x1+dx, y2: y1+dy,
        width: rnd(o.wMin, o.wMax),
        opacity: rnd(o.opMin, o.opMax),
        dur,
        phase: rnd(0, dur), // random start offset — same job as the old negative animation-delay
        grad
      });
    }
    let dpr = 1, cw = 0, ch = 0, coverScale = 1, offsetX = 0, offsetY = 0;
    function resize(){
      dpr = Math.max(1, window.devicePixelRatio || 1);
      cw = window.innerWidth; ch = window.innerHeight;
      canvas.width = Math.round(cw*dpr);
      canvas.height = Math.round(ch*dpr);
      // "cover, anchored bottom-center" — the same fit the old viewBox
      // preserveAspectRatio="xMidYMax slice" gave the SVG version for free.
      coverScale = Math.max(cw/VBW, ch/VBH);
      offsetX = (cw - VBW*coverScale)/2;
      offsetY = ch - VBH*coverScale;
    }
    resize();
    function draw(now){
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      c2d.clearRect(0, 0, cw, ch);
      c2d.translate(offsetX, offsetY);
      c2d.scale(coverScale, coverScale);
      c2d.lineCap = 'round';
      for(const d of drops){
        const t = ((now + d.phase) % d.dur) / d.dur;
        const tx = totalDx * t, ty = o.travel * t;
        c2d.translate(tx, ty);
        c2d.globalAlpha = d.opacity;
        c2d.strokeStyle = d.grad;
        c2d.lineWidth = d.width;
        c2d.beginPath();
        c2d.moveTo(d.x1, d.y1);
        c2d.lineTo(d.x2, d.y2);
        c2d.stroke();
        c2d.translate(-tx, -ty);
      }
    }
    return { resize, draw };
  }
  // Particle counts unchanged from the SVG version (halved from their
  // original 35/22 a while back) — still tuned for how much rain reads as
  // "weather" vs. clutter, independent of which engine draws it.
  const rainLayers = [
    initCanvasRain(document.getElementById('cityRainBack'), 18, {
      lenMin:34, lenMax:68, wMin:1, wMax:1.6, opMin:0.16, opMax:0.34,
      angleDeg:9, durMin:1.3, durMax:2.1, travel:1150,
      rgbTop:'188,216,255', rgbMid:'188,216,255', rgbBottom:'234,244,255', midStop:0.7, midAlpha:0.55
    }),
    initCanvasRain(document.getElementById('cityRainFront'), 12, {
      lenMin:58, lenMax:118, wMin:1.6, wMax:2.8, opMin:0.26, opMax:0.5,
      angleDeg:14, durMin:0.7, durMax:1.25, travel:1150,
      rgbTop:'215,236,255', rgbMid:'215,236,255', rgbBottom:'242,249,255', midStop:0.65, midAlpha:0.65
    })
  ].filter(Boolean);
  let rainRafId = null;
  let rainLastDraw = 0;
  const RAIN_FRAME_MS = 1000/30; // rain reads fine at 30fps; no need to redraw every 60fps tick
  function rainTick(now){
    if(now - rainLastDraw >= RAIN_FRAME_MS){
      rainLastDraw = now;
      rainLayers.forEach(layer => layer.draw(now));
    }
    rainRafId = requestAnimationFrame(rainTick);
  }
  function startRain(){
    if(rainRafId || rainLayers.length === 0) return;
    rainRafId = requestAnimationFrame(rainTick);
  }
  function stopRain(){
    if(rainRafId){ cancelAnimationFrame(rainRafId); rainRafId = null; }
  }
  window.addEventListener('resize', ()=> rainLayers.forEach(l => l.resize()));
  window.addEventListener('orientationchange', ()=> rainLayers.forEach(l => l.resize()));
  if(!document.hidden) startRain();

  /* Pause every cityBg animation while the tab/app is backgrounded (screen
     locked, app switched away, etc). Most browsers already throttle rAF and
     timers in that state, but CSS animations keep ticking, so this saves
     real battery/CPU on top of that once the user comes back. */
  document.addEventListener('visibilitychange', function(){
    const cityBg = document.getElementById('cityBg');
    if(cityBg){
      cityBg.getAnimations({subtree:true}).forEach(function(a){
        if(document.hidden) a.pause(); else a.play();
      });
    }
    if(document.hidden) stopRain(); else startRain();
  });
})();
