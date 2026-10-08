/* Sound effects engine (Sound) */

/* ---------- sound engine ---------- */
const Sound = (function(){
  let ctx = null;
  let masterGain = null;
  let slideStep = 0;
  let slideDir = 1;
  // pentatonic run — sounds pleasant ascending or descending in any order
  const PENTA = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

  function ensureCtx(){
    ctx = AudioCore.ensure();
    if(ctx && !masterGain){
      masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(AudioCore.getBus());
    }
    return ctx;
  }
  // Sound effects are all fire-and-forget (button clicks, cell taps, etc) —
  // nothing to actively restart after a dead context, just drop the stale
  // references so the next effect lazily rebuilds them on the new context.
  AudioCore.onRebuild(()=>{ ctx = null; masterGain = null; });

  // unlock audio on first user gesture (mobile requirement)
  function unlock(){
    ensureCtx();
    Music.autoStart();
    document.removeEventListener('pointerdown', unlock);
    document.removeEventListener('touchstart', unlock);
  }
  document.addEventListener('pointerdown', unlock, { once:true, passive:true });
  document.addEventListener('touchstart', unlock, { once:true, passive:true });

  // a soft, rounded "marble keyboard" style thock: filtered sine/triangle body
  // with a very brief noise-click transient on top for tactility.
  function thock({freq=220, dur=0.1, gain=0.22, type='sine', filterFreq=1800, click=true, glide=0}){
    const c = ensureCtx();
    if(!c) return;
    const now = c.currentTime;

    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if(glide) osc.frequency.exponentialRampToValueAtTime(Math.max(40,freq+glide), now+dur*0.9);

    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 0.7;

    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filt); filt.connect(g); g.connect(masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.02);

    if(click){
      // tiny high-passed noise tick for a crisp marble-like attack
      const bufSize = Math.floor(c.sampleRate * 0.012);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<bufSize;i++){ data[i] = (Math.random()*2-1) * (1 - i/bufSize); }
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const nf = c.createBiquadFilter();
      nf.type = 'highpass';
      nf.frequency.value = 3200;
      const ng = c.createGain();
      ng.gain.setValueAtTime(gain*0.5, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      noise.connect(nf); nf.connect(ng); ng.connect(masterGain);
      noise.start(now);
      noise.stop(now + 0.025);
    }
  }

  function chord(freqs, {dur=0.35, gain=0.15, stagger=0.05, type='sine', filterFreq=2400}={}){
    freqs.forEach((f,i)=>{
      setTimeout(()=> thock({freq:f, dur, gain, type, filterFreq, click:false}), i*stagger*1000);
    });
  }

  return {
    resetSlide(dir=1){ slideStep = 0; slideDir = dir; },
    owlPlace(){ thock({freq:196, dur:0.14, gain:0.24, type:'triangle', filterFreq:1400, glide:24}); },
    owlRemove(){ thock({freq:164, dur:0.1, gain:0.16, type:'triangle', filterFreq:1100, glide:-18, click:false}); },
    // single X tap
    xTap(){ thock({freq:520, dur:0.07, gain:0.14, type:'sine', filterFreq:2600}); },
    // sliding row of X marks — glides up a pentatonic scale, very satisfying
    xSlideAdd(){
      const f = PENTA[slideStep % PENTA.length];
      thock({freq:f, dur:0.09, gain:0.15, type:'sine', filterFreq:3000});
      slideStep++;
    },
    xSlideRemove(){
      const idx = (PENTA.length - 1) - (slideStep % PENTA.length);
      const f = PENTA[Math.max(0, idx)];
      thock({freq:f, dur:0.08, gain:0.12, type:'sine', filterFreq:2400});
      slideStep++;
    },
    conflict(){
      thock({freq:180, dur:0.12, gain:0.2, type:'sawtooth', filterFreq:900, glide:-40, click:false});
      setTimeout(()=> thock({freq:140, dur:0.14, gain:0.18, type:'sawtooth', filterFreq:700, glide:-30, click:false}), 70);
    },
    heartLost(){
      thock({freq:110, dur:0.22, gain:0.22, type:'sine', filterFreq:500, glide:-30, click:false});
    },
    hint(){
      chord([523.25, 659.25, 783.99], {dur:0.4, gain:0.16, stagger:0.07, filterFreq:3200});
    },
    win(){
      chord([392.00, 493.88, 587.33, 783.99], {dur:0.5, gain:0.18, stagger:0.11, filterFreq:3500});
      setTimeout(()=> chord([659.25, 783.99, 987.77, 1174.66], {dur:0.45, gain:0.14, stagger:0.06, filterFreq:4200}), 460);
    },
    lose(){
      chord([220.00, 196.00, 164.81], {dur:0.5, gain:0.18, stagger:0.14, filterFreq:900, type:'triangle'});
    },
    button(){ thock({freq:340, dur:0.06, gain:0.13, type:'sine', filterFreq:2200, click:true}); },
    modeSwitch(){ thock({freq:420, dur:0.08, gain:0.14, type:'sine', filterFreq:2600, glide:60}); },
    newPuzzle(){ chord([293.66, 392.00], {dur:0.28, gain:0.16, stagger:0.06, filterFreq:2800}); },
    // soft eyelid dip for the title-intro blink — a low, round thock rather
    // than a bright click, so it reads as a gentle blink not a UI tap
    blink(){ thock({freq:300, dur:0.09, gain:0.12, type:'sine', filterFreq:1400, glide:-45, click:false}); },
    // low, warm bulb-filament hum for the title-intro float — two detuned
    // low oscillators with a slow gain wobble, like a bulb warming up.
    // Returns a handle with .stop() to fade it out on cue (e.g. when the
    // glitch-out begins).
    bulbHumStart(){
      const c = ensureCtx();
      if(!c) return null;
      const now = c.currentTime;

      const osc1 = c.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.value = 88;
      const osc2 = c.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 88 * 1.5;

      const filt = c.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 480;
      filt.Q.value = 0.4;

      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.045, now + 0.5);

      // gentle filament-style wobble
      const lfo = c.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.5;
      const lfoGain = c.createGain();
      lfoGain.gain.value = 0.01;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);

      osc1.connect(filt); osc2.connect(filt); filt.connect(g); g.connect(masterGain);
      osc1.start(now); osc2.start(now); lfo.start(now);

      let stopped = false;
      return {
        stop(fadeDur=0.25){
          if(stopped) return;
          stopped = true;
          const t = c.currentTime;
          g.gain.cancelScheduledValues(t);
          g.gain.setValueAtTime(g.gain.value, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + fadeDur);
          osc1.stop(t + fadeDur + 0.05);
          osc2.stop(t + fadeDur + 0.05);
          lfo.stop(t + fadeDur + 0.05);
        }
      };
    },
    // staticky, bug-zapper style burst for the title-intro glitch-out: a
    // stuttering noise bed plus a square-wave tone that jumps between
    // erratic frequencies
    glitchZap(){
      const c = ensureCtx();
      if(!c) return;
      const now = c.currentTime;
      const dur = 0.7;

      const bufSize = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, bufSize, c.sampleRate);
      const data = buf.getChannelData(0);
      for(let i=0;i<bufSize;i++){ data[i] = Math.random()*2-1; }
      const noise = c.createBufferSource();
      noise.buffer = buf;
      const nf = c.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 3200;
      nf.Q.value = 0.7;
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.0001, now);
      const steps = 14;
      for(let i=0;i<steps;i++){
        const t = now + (i/steps)*dur;
        const on = Math.random() > 0.3;
        ng.gain.setValueAtTime(on ? (0.06 + Math.random()*0.09) : 0.0001, t);
      }
      ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      noise.connect(nf); nf.connect(ng); ng.connect(masterGain);
      noise.start(now);
      noise.stop(now + dur + 0.02);

      const osc = c.createOscillator();
      osc.type = 'square';
      const of = c.createBiquadFilter();
      of.type = 'lowpass';
      of.frequency.value = 2400;
      const og = c.createGain();
      og.gain.setValueAtTime(0.0001, now);
      const freqs = [160, 950, 210, 1300, 120, 700, 90, 480];
      freqs.forEach((f,i)=>{
        const t = now + (i/freqs.length)*dur;
        osc.frequency.setValueAtTime(f, t);
        og.gain.setValueAtTime(0.08, t);
        og.gain.exponentialRampToValueAtTime(0.015, t + (dur/freqs.length)*0.8);
      });
      og.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      osc.connect(of); of.connect(og); og.connect(masterGain);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    }
  };
})();
