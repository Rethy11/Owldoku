/* Boot: global listeners, skip link, icons, first puzzle */

/* ---------- boot: wire up remaining listeners and start the first puzzle ---------- */
if('ResizeObserver' in window){
  new ResizeObserver(()=> sizeBoard()).observe(document.getElementById('gameWrap'));
} else {
  window.addEventListener('resize', sizeBoard);
  window.addEventListener('orientationchange', sizeBoard);
}
// header/footer heights depend on web fonts, so re-measure once they're in
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=> sizeBoard());
window.addEventListener('load', ()=> sizeBoard());

boardEl().addEventListener('pointerdown', onGridPointerDown);
boardEl().addEventListener('keydown', onGridKeyDown);
document.addEventListener('pointermove', onDocPointerMove);
document.addEventListener('pointerup', onDocPointerUp);
document.addEventListener('pointercancel', onDocPointerUp);

/* Safari-specific: double-tapping a board cell — especially one that already
   holds an owl or X — can trigger Safari's "smart zoom to element" gesture
   even with the document-wide double-tap guard above in place. The likely
   reason it slips through here but not elsewhere on the page: render()
   rebuilds every cell's innerHTML on each tap, so the second tap of a
   double-tap lands on a freshly-created DOM node rather than the one the
   first tap touched, which seems to be enough for Safari's gesture tracking
   to treat it as "double-tap this new thing" instead of recognizing it as
   part of the same repeated tap it would otherwise ignore. The document-level
   fix depends on tap timing and target continuity; this one doesn't — it
   unconditionally blocks the browser's default touch handling on the board
   itself, so the zoom gesture never gets a chance to start there. Game input
   is driven entirely by the pointerdown listener above, so this doesn't
   affect normal tapping or X-dragging. */
(function(){
  const gridEl = boardEl();
  // Only guard single-finger taps here — a second finger touching down means
  // this is a pinch gesture, not a double-tap, and must be left alone so
  // pinch-zoom still works over the board (the one place a low-vision player
  // most needs to be able to zoom in).
  gridEl.addEventListener('touchstart', function(e){
    if(e.touches.length > 1) return;
    e.preventDefault();
  }, { passive:false });
  gridEl.addEventListener('touchend', function(e){
    if(e.touches.length > 0) return;
    e.preventDefault();
  }, { passive:false });
})();

// rather than relying on hash-fragment scrolling (this app never scrolls).
document.getElementById('skipToBoard').addEventListener('click', function(e){
  e.preventDefault();
  const target = boardEl().querySelector('.cell[tabindex="0"]') || boardEl().querySelector('.cell');
  if(target) target.focus();
});

document.getElementById('owlModeIcon').innerHTML = owlIconHTML();
document.getElementById('winOwlIcon').innerHTML = owlIconHTML('happy');
document.getElementById('loseOwlIcon').innerHTML = owlIconHTML('sad');

// reflect any restored music preference (mute state) on the header icon right away,
// without needing to open the music panel first
renderMusicPanel();

if(!loadPuzzleFromURL()){
  newGame();
}
