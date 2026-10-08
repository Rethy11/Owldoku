/* Sandboxed ad banner with retry/backoff (AdBanner) */

/* =========================================================
   AD BANNER
   The network's tag uses document.write, which browsers ignore in scripts
   added after page load, so it runs inside a small srcdoc iframe (where it
   is parsed normally). That iframe is sandboxed so the ad can only run its
   script and paint inside its own box.
   Nothing is requested until the title screen is dismissed, and requests
   (including retries) are held back while a dialog overlay is open, the tab
   is hidden, or the device is offline, so no impression is counted while the
   banner can't be seen.
   If the ad fails to load (tag script blocked/errored, nothing visible
   painted, or no response) it is detected and re-requested with backoff,
   then abandoned so a permanently blocked ad can't hammer the network.
   Regaining connectivity restarts the cycle.
========================================================= */
const AdBanner = (function(){
  const AD_KEY = '6c2d06e331521800da109fa255c92561';
  const AD_W = 320, AD_H = 50;
  const AD_SRC = 'https://www.highrevenueformat.com/' + AD_KEY + '/invoke.js';
  const AD_SETTLE_MS = 5000;            // in-frame: how long to wait for a visible creative
  const AD_LOAD_TIMEOUT_MS = 8000;      // parent backstop if the frame never reports
  const AD_RETRY_DELAYS_MS = [2000, 5000, 15000, 30000, 60000];

  const slotEl = document.getElementById('adSlot');
  let started = false;
  let frame = null;          // iframe for the current attempt
  let token = '';            // per-attempt nonce the frame must echo back
  let attempt = 0;           // requests made in the current cycle
  let filled = false;        // current attempt confirmed a visible creative
  let retryPending = false;  // a (re)request is due, waiting for a good moment
  let timeoutTimer = null, retryTimer = null;

  function setFilled(v){
    filled = v;
    slotEl.classList.toggle('ready', v);
  }

  function canRequest(){
    return started && !document.hidden && navigator.onLine !== false &&
           !document.querySelector('.overlay.show');
  }

  function runPending(){
    if(retryPending && canRequest()) request();
  }

  function teardown(){
    clearTimeout(timeoutTimer);
    if(frame){ frame.remove(); frame = null; }
    setFilled(false);
  }

  function onFailed(reason){
    if(!started) return;
    teardown();
    const delay = AD_RETRY_DELAYS_MS[attempt - 1];
    if(delay === undefined) return;      // retries exhausted
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function(){
      retryPending = true;
      runPending();
    }, delay);
  }

  // Runs INSIDE the sandboxed ad frame (serialized into srcdoc below). It
  // only inspects the frame's own document, so no allow-same-origin is
  // needed; the verdict travels back via postMessage. Must not contain a
  // closing script tag, since it is embedded in an inline <script>.
  function frameProbe(tok){
    var reported = false;
    function report(status){
      if(reported) return;
      reported = true;
      try{ parent.postMessage({ adProbe:tok, status:status }, '*'); }catch(e){}
    }
    function hasVisibleCreative(){
      var els = document.body ? document.body.querySelectorAll('*') : [];
      for(var i = 0; i < els.length; i++){
        var el = els[i], t = el.tagName;
        if(t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT') continue;
        var r = el.getBoundingClientRect();
        if(r.width < 2 || r.height < 2) continue;
        var cs = getComputedStyle(el);
        if(cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        return true;
      }
      return false;
    }
    window.__adTagError = function(){ report('error'); };   // called by the tag's onerror
    var t0 = Date.now();
    var poll = setInterval(function(){
      if(reported){ clearInterval(poll); return; }
      if(hasVisibleCreative()){ clearInterval(poll); report('filled'); }
      else if(Date.now() - t0 > __SETTLE__){ clearInterval(poll); report('empty'); }
    }, 250);
  }

  function request(){
    retryPending = false;
    clearTimeout(retryTimer);
    teardown();
    attempt++;
    token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    const f = document.createElement('iframe');
    f.width = AD_W;
    f.height = AD_H;
    f.setAttribute('scrolling', 'no');
    f.setAttribute('frameborder', '0');
    f.title = 'Advertisement';
    // Lock the ad down to "run its script and paint pixels inside its own
    // box" — nothing else:
    //  - no allow-top-navigation*: the ad (or a nested creative) cannot
    //    redirect the whole tab.
    //  - no allow-popups: popups/popunders are blocked outright.
    //  - no allow-modals: no fake alert/confirm dialogs.
    //  - no allow-same-origin: the frame gets an opaque origin, so the ad
    //    can't read/write this page's storage or DOM.
    // Nested creative iframes can never be granted more than this.
    // Trade-off: click-through to the advertiser stops working too, since
    // that's also a form of popup/navigation.
    // Load detection deliberately does NOT peek into the frame from here
    // (that would need allow-same-origin). A probe script inside the frame
    // checks its own document and postMessages the verdict; the parent only
    // trusts messages from this frame's window that echo the per-attempt token.
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('referrerpolicy', 'no-referrer');
    const probeSrc = '(' + frameProbe.toString().replace('__SETTLE__', String(AD_SETTLE_MS)) +
                     ')(' + JSON.stringify(token) + ');';
    f.srcdoc =
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style>' +
      '</head><body>' +
      '<script>atOptions={"key":"' + AD_KEY + '","format":"iframe","height":' + AD_H +
        ',"width":' + AD_W + ',"params":{}};<\/script>' +
      '<script>' + probeSrc + '<\/script>' +
      '<script src="' + AD_SRC + '" onerror="window.__adTagError&&window.__adTagError()"><\/script>' +
      '</body></html>';
    frame = f;
    slotEl.appendChild(f);

    // Backstop: the frame never reported at all (e.g. srcdoc/scripts blocked).
    timeoutTimer = setTimeout(function(){ onFailed('timeout'); }, AD_LOAD_TIMEOUT_MS);
  }

  window.addEventListener('message', function(e){
    const d = e.data;
    if(!frame || e.source !== frame.contentWindow) return;   // only our current ad frame
    if(!d || d.adProbe !== token) return;                     // and only with this attempt's nonce
    clearTimeout(timeoutTimer);
    if(d.status === 'filled'){
      attempt = 0;                 // fresh retry budget if it ever fails later
      setFilled(true);
    } else {
      onFailed(d.status);
    }
  });

  // Dialogs open/close by toggling .show on each overlay; a request that came
  // due while one was open goes out as soon as it closes.
  if(window.MutationObserver){
    const mo = new MutationObserver(runPending);
    document.querySelectorAll('.overlay').forEach(function(o){
      mo.observe(o, { attributes:true, attributeFilter:['class'] });
    });
  }
  // Returning to the tab picks up any request that came due while hidden.
  document.addEventListener('visibilitychange', runPending);
  // Back online after a failed/abandoned cycle: start over with a full budget.
  window.addEventListener('online', function(){
    if(!started || filled) return;
    attempt = 0;
    retryPending = true;
    runPending();
  });

  return {
    start: function(){
      if(started) return;
      started = true;
      retryPending = true;
      runPending();
    }
  };
})();
