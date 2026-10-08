/* App-shell guards: double-tap zoom, context menu, text selection, keyboard */

/* ---------- lock accidental page drag/scroll — but never block zoom ----------
   This block used to also intercept Safari's pinch gesture events, multi-touch
   touchmove, ctrl/cmd+wheel, and keyboard zoom shortcuts, and even forcibly
   snapped the viewport back to 1x if a user's OS/browser zoom slipped through
   anyway. All of that actively defeated pinch-zoom and OS/browser accessibility
   zoom, which fails WCAG 1.4.4 (Resize Text) / 1.4.10 (Reflow) — it's been
   removed. Only the parts that don't interfere with zoom remain below. */

// Prevent double-tap-to-zoom on a stray double-tap while still allowing normal
// single taps/clicks. This does not block pinch-zoom, ctrl/cmd + scroll or
// +/-/0, or OS-level accessibility zoom — all of those remain fully available.
let lastTouchEnd = 0;
document.addEventListener('touchend', function(e){
  const now = Date.now();
  if(now - lastTouchEnd <= 350){
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// Belt-and-suspenders: block context menu (long-press selection menu) and text selection events
document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
document.addEventListener('selectstart', function(e){ e.preventDefault(); });

// Prevent Arrow/Space/Page/Home/End from scrolling the page when focus is
// somewhere non-interactive — but never when focus is on a button, link,
// form field, an open dialog, or the puzzle grid, all of which need their
// native key behavior (e.g. Space activating a focused button, arrow keys
// moving between grid cells or through a <select>).
document.addEventListener('keydown', function(e){
  const onInteractive = !!e.target.closest(
    'button, a[href], select, input, textarea, [role="gridcell"], [role="dialog"], [contenteditable="true"], [tabindex]'
  );
  if(!onInteractive && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)){
    e.preventDefault();
  }
}, { passive: false });
