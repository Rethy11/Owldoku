/* Focus management / trapping for every .overlay dialog */

/* ---------- accessibility: focus management for every .overlay dialog ----------
   None of the many open/close call sites elsewhere in this file (checkWin,
   endGame, showTutorial, openMusicPanel, etc.) need to change for this to
   work — it watches every .overlay for its 'show' class being toggled and
   handles the rest: moving focus into the dialog, trapping Tab inside it,
   making the rest of the page inert (unreachable by Tab or a screen reader's
   virtual cursor) while it's open, closing on Escape, and returning focus to
   whatever opened it once it's closed. */
(function(){
  const overlays = Array.from(document.querySelectorAll('.overlay'));
  const outsideTargets = [
    document.querySelector('#gameWrap > header'),
    document.querySelector('.statbar'),
    document.querySelector('.selectbar'),
    document.getElementById('boardWrap'),
    document.querySelector('.modebar'),
    document.querySelector('.toolbar'),
    document.querySelector('#gameWrap > footer'),
    document.querySelector('#gameWrap > .ad-banner'),
  ].filter(Boolean);
  let lastFocused = null;
  let activeOverlay = null;

  function focusablesIn(container){
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }

  function setInertOutside(overlay, on){
    outsideTargets.forEach(el=>{ if(on) el.setAttribute('inert',''); else el.removeAttribute('inert'); });
    overlays.forEach(o=>{
      if(o===overlay) return;
      if(on) o.setAttribute('inert','');
      else if(!o.classList.contains('show')) o.removeAttribute('inert');
    });
  }

  function activate(overlay){
    if(activeOverlay === overlay) return;
    activeOverlay = overlay;
    lastFocused = document.activeElement;
    setInertOutside(overlay, true);
    const dialogBox = overlay.querySelector('[role="dialog"]') || overlay;
    const focusables = focusablesIn(overlay);
    (focusables[0] || dialogBox).focus({ preventScroll:true });
  }

  function deactivate(overlay){
    if(activeOverlay !== overlay) return;
    activeOverlay = null;
    setInertOutside(overlay, false);
    if(lastFocused && document.contains(lastFocused) && typeof lastFocused.focus === 'function'){
      lastFocused.focus({ preventScroll:true });
    }
    lastFocused = null;
  }

  overlays.forEach(overlay=>{
    const mo = new MutationObserver(()=>{
      if(overlay.classList.contains('show')) activate(overlay);
      else deactivate(overlay);
    });
    mo.observe(overlay, { attributes:true, attributeFilter:['class'] });
  });

  document.addEventListener('keydown', function(e){
    if(!activeOverlay) return;
    if(e.key === 'Escape'){
      const dismissBtn = activeOverlay.querySelector('[data-modal-dismiss]');
      if(dismissBtn){ e.preventDefault(); dismissBtn.click(); }
      return;
    }
    if(e.key === 'Tab'){
      const focusables = focusablesIn(activeOverlay);
      if(focusables.length === 0) return;
      const first = focusables[0], last = focusables[focusables.length-1];
      if(e.shiftKey && document.activeElement === first){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && document.activeElement === last){
        e.preventDefault(); first.focus();
      }
    }
  });
})();

// Skip link: jump straight to the puzzle board's current focus position,
