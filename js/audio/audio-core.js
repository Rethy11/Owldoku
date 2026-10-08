/* Shared AudioContext lifecycle (AudioCore) */

/* ---------- shared audio core ---------- */
const AudioCore = (function(){
  let ctx = null;
  let bus = null; // shared compressor bus -> destination
  function ensure(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);
      bus = comp;
    }
    return ctx;
  }
  // Returns a promise that resolves once the context is actually running.
  // Starting audio nodes before this resolves can silently drop sound on
  // some mobile browsers (notably iOS Safari) — always await this first.
  function ready(){
    ensure();
    if(!ctx) return Promise.reject(new Error('no audio context'));
    if(ctx.state === 'running') return Promise.resolve(ctx);
    return ctx.resume().then(()=>ctx);
  }
  // Leaving the page for a while (switching apps, locking the screen, just
  // backgrounding the tab) can do more than pause playback on mobile —
  // browsers may fully close the shared AudioContext to save power rather
  // than merely suspending it. Every node any module built on top of it
  // (Sound's gain node, Music's whole graph, the sample player's source/gain
  // nodes...) belongs to that now-dead context and is unusable — calling
  // resume() on a closed context does nothing. Modules register a rebuild
  // callback here so, on return, this one recovery path can throw away the
  // dead context and let everyone rebuild on the fresh one, instead of each
  // module needing its own visibility-change handling (and instead of the
  // game silently losing audio, or throwing, until a manual reload).
  const rebuildCallbacks = [];
  function onRebuild(fn){ rebuildCallbacks.push(fn); }
  function recoverFromBackground(){
    if(!ctx) return; // audio never started this session — nothing to recover
    if(ctx.state === 'closed'){
      ctx = null; bus = null;
      rebuildCallbacks.forEach(fn=>{ try{ fn(); }catch(e){} });
    } else {
      // 'suspended' normally, but Safari can also leave a context reporting
      // 'running' while backgrounded and just not actually produce sound —
      // resume() is a harmless no-op on an already-running context, so
      // always call it rather than trying to trust the reported state.
      ctx.resume().catch(()=>{});
    }
  }
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) recoverFromBackground(); });
  window.addEventListener('pageshow', recoverFromBackground);
  return {
    ensure,
    ready,
    getBus(){ ensure(); return bus; },
    onRebuild
  };
})();
