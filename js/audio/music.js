/* Generative + recorded music playlist (Music) */

/* ---------- music: a small playlist of generative lofi ambience ---------- */
/* Each song is generative & endless — a 4-chord loop with slow filter
   sweeps, a sparse melody, an optional lofi beat, optional rain wash,
   occasional window-drip pings, and a whisper of vinyl crackle. All five
   songs are treated as equivalent-length tracks (2:30 each) so "loop"
   and "skip" behave like a real playlist even though the underlying
   music is procedurally generated rather than a fixed-length recording. */
const Music = (function(){
  let ctx = null;
  let master = null, padBus = null, melodyBus = null, drumBus = null, rainBus = null;
  let reverb = null, reverbSend = null;
  let delay = null, delayFeedback = null, delaySend = null;
  let rainSrc = null, rainLfoOsc = null;
  let running = false, muted = false, started = false, starting = false;
  // Background tabs throttle (or fully suspend) setInterval on the main
  // thread, but the lookahead scheduler needs a reliable ~30ms tick to keep
  // feeding the Web Audio clock — otherwise it silently runs dry and the
  // generated songs go quiet, even though the AudioContext itself is still
  // "running" (this is why the mp3 samples, which don't depend on JS timer
  // ticks at all, kept playing fine in the background while these didn't).
  // A Worker's timers aren't subject to that same page-visibility
  // throttling, so the actual interval lives there and just posts ticks back.
  let schedulerRunning = false;
  let tickWorker = null;
  function ensureTickWorker(){
    if(tickWorker) return;
    const code = "let id=null; onmessage=function(e){ if(e.data==='start'){ if(id) return; id=setInterval(function(){ postMessage('tick'); }, " + LOOKAHEAD_MS + "); } else if(e.data==='stop'){ clearInterval(id); id=null; } };";
    const blob = new Blob([code], { type:'application/javascript' });
    tickWorker = new Worker(URL.createObjectURL(blob));
    tickWorker.onmessage = (e)=>{ if(e.data==='tick' && schedulerRunning) schedulerLoop(); };
  }
  function startScheduler(){
    ensureTickWorker();
    schedulerRunning = true;
    tickWorker.postMessage('start');
  }
  function stopScheduler(){
    schedulerRunning = false;
    if(tickWorker) tickWorker.postMessage('stop');
  }
  // Lets the UI stay in sync (now-playing name, highlighted row, auto-scroll)
  // even when the song changes on its own — natural end of a track, an mp3
  // sample's 'ended' event, etc — not just from a button click in the panel.
  let songChangeListeners = [];
  function fireSongChange(){
    songChangeListeners.forEach(fn=>{ try{ fn(); }catch(e){} });
  }
  let songIndex = 0, loopSong = false, volume = 0.1;
  const MAX_GAIN = 0.85;
  const SONG_LENGTH_MS = 150000; // 2:30 — same "length" for every song
  let autoAdvanceId = null;
  const BEATS_PER_BAR = 4;
  const BARS_PER_CHORD = 2;
  const SCHEDULE_AHEAD = 0.15;
  const LOOKAHEAD_MS = 30;
  let nextNoteTime = 0, beatCount = 0, chordIdx = 0, chordStep = -1;

  // Song data now lives one-file-per-song in /music (loaded via <script>
  // tags above); this array just references them in playlist order.
  //
  // SAFETY NET: if any of those <script> tags fails to load (network
  // hiccup, blocked request, bad deploy, etc.), its SONG_* global is never
  // declared. Referencing an undeclared identifier directly in this array
  // would throw a ReferenceError right here at top-level script execution,
  // which would abort the rest of this <script> block — including game
  // setup code far below that has nothing to do with music. So instead we
  // look each one up defensively and drop any that didn't load, rather than
  // letting a missing song file take the whole game down with it.
  // `typeof` is the one safe way to test whether an identifier exists
  // without throwing — it works no matter whether the song file declared
  // its export with const/let (which, unlike var, doesn't attach to
  // `window`) or wasn't loaded at all.
  // Real recordings (mp3/wav) played back as-is rather than generated note-by-note.
  // `type:'sample'` is how start()/stop()/switchSong() tell these apart from the
  // procedural songs above and route them to playSample() instead of the scheduler.
  const SAMPLE_SONGS = [
    { type:'sample', name:'The River — Issac Haines',   src:'music/river.mp3' },
    { type:'sample', name:'Evana Sorel — Issac Haines', src:'music/evana-sorel.mp3' },
    { type:'sample', name:'Only You — Issac Haines',    src:'music/only-you.mp3' }
  ];

  const SONGS = [
    (typeof SONG_MIDNIGHT_IN_TOKYO_RAIN !== 'undefined' ? SONG_MIDNIGHT_IN_TOKYO_RAIN : null),
    (typeof SONG_AMBER_HUSH !== 'undefined' ? SONG_AMBER_HUSH : null),
    (typeof SONG_PAPER_LANTERN_DRIFT !== 'undefined' ? SONG_PAPER_LANTERN_DRIFT : null),
    (typeof SONG_LATE_BUS_HOME !== 'undefined' ? SONG_LATE_BUS_HOME : null)
  ].filter(Boolean).concat(SAMPLE_SONGS);
  const musicAvailable = SONGS.length > 0;
  if(!musicAvailable){
    console.warn('Music: no song data loaded — music disabled, game continues without it.');
  }

  const MUSIC_PREFS_KEY = 'owldoku_music_prefs';
  (function restoreMusicPrefs(){
    try{
      const raw = localStorage.getItem(MUSIC_PREFS_KEY);
      if(!raw) return;
      const prefs = JSON.parse(raw);
      if(typeof prefs.songIndex === 'number' && SONGS.length > 0){
        const n = SONGS.length;
        songIndex = ((prefs.songIndex % n) + n) % n;
      }
      if(typeof prefs.loopSong === 'boolean') loopSong = prefs.loopSong;
      if(typeof prefs.muted === 'boolean') muted = prefs.muted;
      if(typeof prefs.volume === 'number') volume = Math.max(0, Math.min(1, prefs.volume));
    }catch(e){ /* storage unavailable or corrupt — ignore */ }
  })();
  function saveMusicPrefs(){
    try{
      localStorage.setItem(MUSIC_PREFS_KEY, JSON.stringify({ songIndex, loopSong, muted, volume }));
    }catch(e){ /* storage unavailable — ignore */ }
  }

  function currentSong(){ return SONGS[songIndex] || null; }
  function spb(){
    const song = currentSong();
    return 60/((song && song.bpm) ? song.bpm : 80);
  }
  function effectiveGain(){ return muted ? 0.0001 : Math.max(0.0001, volume*MAX_GAIN); }

  function clearAutoAdvance(){
    if(autoAdvanceId){ clearTimeout(autoAdvanceId); autoAdvanceId = null; }
  }
  function armAutoAdvance(){
    clearAutoAdvance();
    // Sample tracks advance off their own 'ended' event (see playSample), not
    // this timer — real recordings know their own length, generated ones don't.
    if(currentSong() && currentSong().type === 'sample') return;
    if(loopSong || !running || muted) return;
    autoAdvanceId = setTimeout(()=>{ next(); }, SONG_LENGTH_MS);
  }

  /* ---------- real-audio (mp3/wav) playback ----------
     Each sample is fully fetched and decoded into an in-memory AudioBuffer
     up front, then played with an AudioBufferSourceNode on the same
     `master` bus as the generated songs. This used to stream through an
     <audio> element via createMediaElementSource instead — simpler, but
     that pipeline has to keep pulling decoded audio off the main thread in
     real time, and this game occasionally does real work on that same
     thread (puzzle generation, the impossible-mode repair loop). A brief
     stall there could starve the media pipeline and produce an audible
     stutter that isn't in the source file at all. A fully-decoded buffer,
     once started, is scheduled entirely by the audio thread, so it can't
     be touched by main-thread jank — same idea as the Worker-based
     scheduler above, applied to the sample engine. */
  let sampleBufferCache = {}; // src -> AudioBuffer, or a Promise<AudioBuffer> while loading
  let sampleSourceNode = null;
  let sampleGainNode = null;
  let sampleManualStop = false; // set right before we stop/replace the current
                                 // source, so onended doesn't mistake it for a
                                 // natural end and auto-advance on top of it.
  let sampleRequestId = 0; // guards against a slow load finishing after a newer switch superseded it

  function loadSampleBuffer(song){
    const cached = sampleBufferCache[song.src];
    if(cached) return Promise.resolve(cached);
    const p = fetch(song.src)
      .then(r => r.arrayBuffer())
      .then(data => ctx.decodeAudioData(data))
      .then(buf => { sampleBufferCache[song.src] = buf; return buf; })
      .catch(e => {
        console.warn('Music: failed to load/decode sample, skipping.', e);
        delete sampleBufferCache[song.src];
        throw e;
      });
    sampleBufferCache[song.src] = p; // cache the in-flight promise too, so a rapid
    return p;                        // double-switch doesn't kick off a second fetch
  }

  function ensureSampleGain(){
    if(sampleGainNode) return;
    sampleGainNode = ctx.createGain();
    sampleGainNode.gain.value = 1;
    sampleGainNode.connect(master);
  }

  function stopSampleSource(){
    if(!sampleSourceNode) return;
    sampleManualStop = true;
    sampleSourceNode.onended = null;
    try{ sampleSourceNode.stop(); }catch(e){}
    try{ sampleSourceNode.disconnect(); }catch(e){}
    sampleSourceNode = null;
  }

  function playSample(song){
    ensureSampleGain();
    const requestId = ++sampleRequestId;
    loadSampleBuffer(song).then(buffer=>{
      // Bail out if another switch/stop happened while this was loading.
      if(requestId !== sampleRequestId || !running) return;
      stopSampleSource();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loopSong; // loop toggle repeats this one track instead of advancing
      src.connect(sampleGainNode);
      src.onended = ()=>{
        if(sampleManualStop){ sampleManualStop = false; return; }
        // Natural end (not a manual stop/switch) — clear the stale reference
        // before advancing, so if the next song is also a sample, its own
        // stopSampleSource() call doesn't try to stop/disconnect a node
        // that already finished playing on its own.
        if(sampleSourceNode === src) sampleSourceNode = null;
        next(); // advance the playlist — switchSong()/next() already wrap
                // the index via modulo, so this loops back to song 0 when
                // it fires on the last track in SONGS.
      };
      sampleSourceNode = src;
      src.start(0);
    }).catch(()=>{ /* already warned in loadSampleBuffer */ });
  }

  function stopSample(){
    stopSampleSource();
  }

  function applyRainTarget(){
    if(!ctx || !rainBus) return;
    const target = currentSong().rain ? 0.22 : 0.0001;
    rainBus.gain.cancelScheduledValues(ctx.currentTime);
    rainBus.gain.setValueAtTime(rainBus.gain.value, ctx.currentTime);
    rainBus.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.0);
  }

  function makeImpulse(c, duration, decay){
    const rate = c.sampleRate, len = Math.floor(rate*duration);
    const buf = c.createBuffer(2, len, rate);
    for(let ch=0; ch<2; ch++){
      const d = buf.getChannelData(ch);
      for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1-i/len, decay);
    }
    return buf;
  }

  function makeRainBuffer(c, duration){
    const rate = c.sampleRate, len = Math.floor(rate*duration);
    const buf = c.createBuffer(2, len, rate);
    for(let ch=0; ch<2; ch++){
      const d = buf.getChannelData(ch);
      let lastOut = 0;
      for(let i=0;i<len;i++){
        const white = Math.random()*2-1;
        lastOut = (lastOut + 0.018*white) / 1.018;
        d[i] = lastOut * 4.2;
      }
      // crossfade loop point so it repeats seamlessly
      const overlap = Math.floor(rate*0.6);
      for(let i=0;i<overlap;i++){
        const t = i/overlap;
        d[len-overlap+i] = d[len-overlap+i]*(1-t) + d[i]*t;
      }
    }
    return buf;
  }

  function build(){
    if(!musicAvailable) return;
    ctx = AudioCore.ensure();
    if(!ctx || master) return;
    const bus = AudioCore.getBus();

    master = ctx.createGain(); master.gain.value = 0.0001;
    master.connect(bus);

    // reverb send (soft room, rain-outside-the-window ambience)
    reverb = ctx.createConvolver();
    // Impulse length drives the cost of every sample the convolver
    // processes for as long as music plays (real-time convolution is one of
    // the heaviest things Web Audio can do on a phone) — 1.6s/2.0 decay
    // still reads as a soft room tail, at roughly half the sustained CPU
    // cost of the original 3.2s/2.6 impulse.
    reverb.buffer = makeImpulse(ctx, 1.6, 2.0);
    reverbSend = ctx.createGain(); reverbSend.gain.value = 0.55;
    reverbSend.connect(reverb); reverb.connect(master);

    // soft echo for melody (dreamy lofi delay)
    delay = ctx.createDelay(2.0); delay.delayTime.value = spb()*0.75;
    delayFeedback = ctx.createGain(); delayFeedback.gain.value = 0.32;
    const delayFilter = ctx.createBiquadFilter(); delayFilter.type='lowpass'; delayFilter.frequency.value = 2200;
    delay.connect(delayFilter); delayFilter.connect(delayFeedback); delayFeedback.connect(delay);
    delaySend = ctx.createGain(); delaySend.gain.value = 0.4;
    delaySend.connect(delay); delay.connect(master);

    padBus = ctx.createGain(); padBus.gain.value = 0.5; padBus.connect(master); padBus.connect(reverbSend);
    melodyBus = ctx.createGain(); melodyBus.gain.value = 0.34; melodyBus.connect(master); melodyBus.connect(reverbSend); melodyBus.connect(delaySend);
    drumBus = ctx.createGain(); drumBus.gain.value = 0.5; drumBus.connect(master);
    rainBus = ctx.createGain(); rainBus.gain.value = 0.0001; rainBus.connect(master);

    // rain wash, looping, with a slow breathing swell
    const rainBuf = makeRainBuffer(ctx, 6);
    rainSrc = ctx.createBufferSource();
    rainSrc.buffer = rainBuf; rainSrc.loop = true;
    const rainFilter = ctx.createBiquadFilter(); rainFilter.type='lowpass'; rainFilter.frequency.value = 2600;
    const rainHP = ctx.createBiquadFilter(); rainHP.type='highpass'; rainHP.frequency.value = 220;
    const rainSwell = ctx.createGain(); rainSwell.gain.value = 1;
    rainLfoOsc = ctx.createOscillator(); rainLfoOsc.frequency.value = 0.045;
    const rainLfoGain = ctx.createGain(); rainLfoGain.gain.value = 0.28;
    rainLfoOsc.connect(rainLfoGain); rainLfoGain.connect(rainSwell.gain);
    rainSrc.connect(rainHP); rainHP.connect(rainFilter); rainFilter.connect(rainSwell); rainSwell.connect(rainBus);
  }

  function padVoice(freq, t0, dur, bus, padFilter, gainMult){
    const [fBase, fPeak, fEnd] = padFilter;
    [-4, 0, 4].forEach((detune, i)=>{
      const osc = ctx.createOscillator();
      osc.type = i===1 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(fBase, t0);
      filt.frequency.linearRampToValueAtTime(fPeak, t0 + dur*0.5);
      filt.frequency.linearRampToValueAtTime(fEnd, t0 + dur);
      filt.Q.value = 0.6;
      const g = ctx.createGain();
      const peak = 0.11 * (gainMult||1);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + dur*0.22);
      g.gain.setValueAtTime(peak, t0 + dur*0.7);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(filt); filt.connect(g); g.connect(bus);
      osc.start(t0); osc.stop(t0+dur+0.05);
    });
  }

  function playChord(chord, t0, dur, song){
    chord.notes.forEach(f => padVoice(f, t0, dur, padBus, song.padFilter, song.padGainMult));
  }

  // "bell": a small music-box chime — two clean sine partials, fast pluck-like decay
  function playBell(freq, t0){
    [1, 2.76].forEach((mult, i)=>{
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq*mult;
      const g = ctx.createGain();
      const peak = i===0 ? 0.16 : 0.055;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i===0 ? 1.4 : 0.9));
      osc.connect(g); g.connect(reverbSend); g.connect(master);
      osc.start(t0); osc.stop(t0 + 1.5);
    });
  }

  // "keys": a warm two-operator electric-piano tone — a sine carrier with a
  // faint higher sine layered in, softer attack than the pluck/bell voices
  function playKeys(freq, t0){
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = freq*4.02;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.05, t0);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.15, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7);
    osc2.connect(g2); g2.connect(filt);
    osc.connect(filt); filt.connect(g); g.connect(melodyBus); g.connect(reverbSend);
    osc.start(t0); osc.stop(t0+1.8);
    osc2.start(t0); osc2.stop(t0+0.4);
  }

  function playMelodyNote(scale, t0, song){
    const freq = scale[Math.floor(Math.random()*scale.length)] * (Math.random()<0.5?1:2);
    const pluck = song.melodyStyle === 'pluck';
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq;
    osc2.detune.value = pluck ? 4 : 6;
    const filt = ctx.createBiquadFilter();
    filt.type='lowpass'; filt.frequency.value = song.melodyFilter;
    const dur = pluck ? (0.35 + Math.random()*0.35) : (1.1 + Math.random()*0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(pluck ? 0.19 : 0.16, t0 + (pluck ? 0.006 : 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    osc.connect(filt); osc2.connect(filt); filt.connect(g); g.connect(melodyBus);
    osc.start(t0); osc.stop(t0+dur+0.1);
    osc2.start(t0); osc2.stop(t0+dur+0.1);
  }

  function playKick(t0){
    const osc = ctx.createOscillator(); osc.type='sine';
    osc.frequency.setValueAtTime(130, t0);
    osc.frequency.exponentialRampToValueAtTime(42, t0+0.14);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.24, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+0.24);
    const filt = ctx.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=300;
    osc.connect(filt); filt.connect(g); g.connect(drumBus);
    osc.start(t0); osc.stop(t0+0.3);
  }

  function noiseBurst(t0, dur, gainPeak, bandLow, bandHigh, bus){
    const len = Math.floor(ctx.sampleRate*dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1-i/len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value = (bandLow+bandHigh)/2; bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gainPeak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    src.connect(bp); bp.connect(g); g.connect(bus);
    src.start(t0); src.stop(t0+dur+0.02);
  }

  function playSnare(t0){ noiseBurst(t0, 0.16, 0.1, 1400, 3200, drumBus); }
  function playHat(t0, level){ noiseBurst(t0, 0.05, 0.05*level, 5000, 9000, drumBus); }
  function playDrip(t0){
    const osc = ctx.createOscillator(); osc.type='sine';
    const freq = 1200 + Math.random()*900;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(freq*0.6, t0+0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+0.55);
    osc.connect(g); g.connect(reverbSend);
    osc.start(t0); osc.stop(t0+0.6);
  }
  function playCrackle(t0){ noiseBurst(t0, 0.02, 0.035, 2000, 6000, master); }

  function scheduleBeat(beatNumber, t){
    const song = currentSong();
    const s = spb();
    const chordLenBeats = BEATS_PER_BAR*(song.barsPerChord||BARS_PER_CHORD);
    const beatInBar = beatNumber % BEATS_PER_BAR;
    if(beatNumber % chordLenBeats === 0){
      chordStep++;
      chordIdx = song.chordOrder ? song.chordOrder[chordStep % song.chordOrder.length] : (chordStep % song.chords.length);
      playChord(song.chords[chordIdx], t, s*chordLenBeats + 0.3, song);
    }
    if(song.instrument && Math.random() < (song.instrumentChance||0)){
      const scale = song.chords[chordIdx].scale;
      const freq = scale[Math.floor(Math.random()*scale.length)];
      const at = t + Math.random()*s*0.6;
      if(song.instrument==='bell') playBell(freq*2, at);
      else if(song.instrument==='keys') playKeys(freq, at);
    }
    if(song.drums === 'full'){
      if(beatInBar===0) playKick(t);
      if(beatInBar===2){ playKick(t); playSnare(t+0.02); }
      playHat(t, 0.55);
      playHat(t + s*0.5*1.12, 0.3);
    } else if(song.drums === 'light'){
      playHat(t, 0.35);
      if(beatInBar===0 && beatNumber % 8 === 0) playKick(t);
    } else if(song.drums === 'sparse'){
      if(beatInBar===0) playKick(t);
    }
    if(Math.random() < song.melodyChance) playMelodyNote(song.chords[chordIdx].scale, t + Math.random()*s*0.4, song);
    if(Math.random() < song.dripChance) playDrip(t + Math.random()*s*2);
    if(Math.random() < song.crackleChance) playCrackle(t + Math.random()*s);
  }

  function schedulerLoop(){
    try{
      const s = spb();
      while(nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD){
        scheduleBeat(beatCount, nextNoteTime);
        nextNoteTime += s;
        beatCount++;
      }
    }catch(e){
      // Never let a scheduling glitch keep throwing every 30ms — stop music
      // cleanly and let the rest of the game carry on.
      console.warn('Music: scheduler error, stopping music.', e);
      stop();
    }
  }

  function start(){
    if(!musicAvailable || running || starting) return;
    starting = true;
    try{
      build();
    }catch(e){
      // Any failure setting up the audio graph shouldn't take the rest of
      // the game down with it — just give up on music for this session.
      console.warn('Music: failed to build audio engine, disabling music.', e);
      starting = false;
      return;
    }
    if(!ctx){ starting = false; return; }
    // On iOS/Safari, starting nodes before resume() has actually taken
    // effect can silently drop that first attempt's audio — wait for the
    // context to truly be running before touching any source nodes.
    AudioCore.ready().then(()=>{
      starting = false;
      if(running) return; // already started by another call while waiting
      const song = currentSong();
      try{
        started = true; running = true;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(effectiveGain(), ctx.currentTime + 1.2);
        // Rain is a shared ambience layer, independent of whichever song
        // starts first — always start its source nodes and set its target
        // gain here, even if the very first song is an mp3 sample. Gating
        // this on "not a sample" meant a session that started on an mp3
        // would never start these nodes at all (and a node can only be
        // started once), leaving rain permanently silent for the rest of
        // the session even after switching to a rain-enabled song later.
        try{ rainSrc.start(); rainLfoOsc.start(); }catch(e){}
        applyRainTarget();
        if(song && song.type === 'sample'){
          playSample(song);
          armAutoAdvance();
          return;
        }
        nextNoteTime = ctx.currentTime + 0.05;
        beatCount = 0; chordIdx = 0; chordStep = -1;
        delay.delayTime.value = spb()*0.75;
        startScheduler();
        armAutoAdvance();
      }catch(e){
        console.warn('Music: failed to start playback, disabling music.', e);
        running = false;
        stopScheduler();
      }
    }).catch(()=>{ starting = false; });
  }

  function stop(){
    clearAutoAdvance();
    if(!running) return;
    running = false;
    if(ctx && master){
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    }
    stopSample();
    stopScheduler();
  }

  // Called by AudioCore once it's replaced a dead (closed) context with a
  // fresh one. Every node this module built — master/pad/melody/drum/rain
  // buses, the reverb/delay sends, the sample gain/source nodes — belonged
  // to the old context and is now unusable, so throw all of it away and, if
  // something was actually playing, start it again from scratch on the new
  // context. (Decoded sample AudioBuffers in sampleBufferCache are fine to
  // keep — an AudioBuffer isn't tied to the context that decoded it, only
  // AudioNodes are, so there's no need to re-fetch/re-decode the mp3s.)
  AudioCore.onRebuild(function(){
    const wasRunning = running, wasMuted = muted;
    stopScheduler();
    clearAutoAdvance();
    ctx = null;
    master = null; padBus = null; melodyBus = null; drumBus = null; rainBus = null;
    reverb = null; reverbSend = null;
    delay = null; delayFeedback = null; delaySend = null;
    rainSrc = null; rainLfoOsc = null;
    sampleGainNode = null; sampleSourceNode = null; sampleManualStop = false;
    running = false; started = false; starting = false;
    if(wasRunning && !wasMuted) start();
  });

  function switchSong(idx){
    const n = SONGS.length;
    songIndex = ((idx % n) + n) % n;
    beatCount = 0; chordIdx = 0; chordStep = -1;
    const song = currentSong();
    if(ctx && master){
      const now = ctx.currentTime;
      if(running){
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.linearRampToValueAtTime(0.0001, now + 0.3);
        master.gain.linearRampToValueAtTime(effectiveGain(), now + 0.85);
        nextNoteTime = ctx.currentTime + 0.35;
      }
      if(song.type !== 'sample'){
        delay.delayTime.value = spb()*0.75;
      }
      applyRainTarget();
      if(running){
        // Whichever engine was playing the old track needs to stop before
        // the other one starts, so procedural and sample tracks never overlap.
        if(song.type === 'sample'){
          stopScheduler();
          setTimeout(()=>{ if(running) playSample(song); }, 320); // wait out the fade-down above
        } else {
          stopSample();
          stopScheduler();
          setTimeout(()=>{ if(running) startScheduler(); }, 320);
        }
      }
    }
    armAutoAdvance();
    saveMusicPrefs();
    fireSongChange();
  }

  function next(){ switchSong(songIndex + 1); }
  function prev(){ switchSong(songIndex - 1); }

  return {
    autoStart(){ if(musicAvailable && !muted && !started) start(); },
    toggleMute(){
      if(!musicAvailable) return muted; // stays "muted"/inert, nothing to toggle
      muted = !muted;
      if(muted) stop(); else start();
      saveMusicPrefs();
      return muted;
    },
    isOn(){ return musicAvailable && !muted; },
    setVolume(v){
      if(!musicAvailable) return;
      volume = Math.max(0, Math.min(1, v));
      if(ctx && master && running && !muted){
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
        master.gain.linearRampToValueAtTime(effectiveGain(), ctx.currentTime + 0.05);
      }
      saveMusicPrefs();
    },
    toggleLoop(){
      if(!musicAvailable) return loopSong;
      loopSong = !loopSong;
      if(sampleSourceNode && currentSong() && currentSong().type === 'sample') sampleSourceNode.loop = loopSong;
      armAutoAdvance();
      saveMusicPrefs();
      return loopSong;
    },
    next(){ if(musicAvailable) next(); },
    prev(){ if(musicAvailable) prev(); },
    selectSong(i){ if(musicAvailable) switchSong(i); },
    getSongs(){ return musicAvailable ? SONGS.map(s => ({ name: s.name })) : []; },
    isAvailable(){ return musicAvailable; },
    onSongChange(fn){ songChangeListeners.push(fn); },
    getState(){
      const song = currentSong();
      return {
        available: musicAvailable,
        songIndex, songName: song ? song.name : 'Music unavailable',
        muted: musicAvailable ? muted : true, loop: loopSong, volume
      };
    }
  };
})();
