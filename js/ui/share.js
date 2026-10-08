/* Share link / result-image capture */

function shareFeedback(btn, msg){
  const original = btn.textContent;
  btn.textContent = msg;
  btn.disabled = true;
  setTimeout(()=>{ btn.textContent = original; btn.disabled = false; }, 1700);
}

async function captureResultImage(won){
  if(!window.html2canvas) return null;
  const cardEl = document.querySelector(won ? '#winOverlay .card' : '#loseOverlay .card');
  if(!cardEl) return null;

  // Work on a detached clone, off-screen, so nothing about the live card
  // or page is ever touched by the capture process.
  const clone = cardEl.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
  clone.removeAttribute('id');

  // The owl glyph everywhere else on the page is sized purely by CSS: the
  // container (.cell .glyph, .mode-btn .ic, .card .paw, etc.) sets an
  // explicit box, and .owl-icon just fills it at width/height:100% with
  // object-fit:contain. html2canvas doesn't reliably size an <img> that
  // points at an external SVG down to that box though — it tends to draw
  // the SVG at its own intrinsic size regardless of CSS width/height or
  // object-fit, and the box's overflow:hidden just clips the oversized
  // result, which is why the owl showed up cropped and huge in the
  // captured PNG. Swap the <img> for a background-image div sized to the
  // paw's exact on-screen pixel box instead — html2canvas handles
  // background-size:contain correctly even where it fumbles img sizing.
  const livePaw = cardEl.querySelector('.paw');
  const clonePaw = clone.querySelector('.paw');
  if(livePaw && clonePaw){
    const pawRect = livePaw.getBoundingClientRect();
    const liveImg = livePaw.querySelector('img');
    clonePaw.style.width = pawRect.width + 'px';
    clonePaw.style.height = pawRect.height + 'px';
    clonePaw.style.flexShrink = '0';
    clonePaw.style.overflow = 'hidden';
    clonePaw.style.position = 'relative';
    if(liveImg){
      clonePaw.innerHTML = '';
      const bgIcon = document.createElement('div');
      bgIcon.style.width = '100%';
      bgIcon.style.height = '100%';
      bgIcon.style.backgroundImage = `url("${liveImg.src}")`;
      bgIcon.style.backgroundSize = 'contain';
      bgIcon.style.backgroundRepeat = 'no-repeat';
      bgIcon.style.backgroundPosition = 'center';
      clonePaw.appendChild(bgIcon);
    }
  }

  const rect = cardEl.getBoundingClientRect();
  clone.style.position = 'fixed';
  clone.style.left = '-10000px';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.width = rect.width + 'px';
  document.body.appendChild(clone);

  try{
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#2c2440';
    const canvas = await html2canvas(clone, { backgroundColor: bg, scale: 2 });
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if(!blob) return null;
    return new File([blob], won ? 'owldoku-win.png' : 'owldoku-lose.png', { type: 'image/png' });
  }catch(e){
    console.warn('Screenshot capture failed, sharing link only', e);
    return null;
  }finally{
    clone.remove();
  }
}

// Three-tier fallback: try the native share sheet with a captured result
// image attached, then without the image if that combination gets
// rejected, then finally just copy the puzzle link to the clipboard on
// platforms with no native share at all.
async function sharePuzzle(btn, won){
  if(!currentPuzzleCode) return;
  Sound.button();
  let shareUrl;
  try{
    const url = new URL(SITE_URL);
    url.searchParams.set('p', currentPuzzleCode);
    shareUrl = url.toString();
  }catch(e){
    shareUrl = SITE_URL + '?p=' + encodeURIComponent(currentPuzzleCode);
  }
  const shareText = won
    ? `Can you solve this ${N}\u00d7${N} Owldoku faster than me? I solved it in ${formatTime(seconds)}.`
    : `Can you beat this ${N}\u00d7${N} Owldoku? It got the best of me...`;

  const imageFile = await captureResultImage(won);
  const shareData = { title: 'Owldoku', text: shareText, url: shareUrl };
  const canShareFile = imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] });
  if(canShareFile) shareData.files = [imageFile];

  if(navigator.share){
    try{
      await navigator.share(shareData);
      return;
    }catch(e){
      if(e && e.name==='AbortError') return; // user cancelled the native sheet
      if(canShareFile){
        // some browsers reject the file+url combo; retry with just text/url
        try{
          await navigator.share({ title: 'Owldoku', text: shareText, url: shareUrl });
          return;
        }catch(e2){
          if(e2 && e2.name==='AbortError') return;
        }
      }
    }
  }
  try{
    await navigator.clipboard.writeText(shareUrl);
    shareFeedback(btn, 'Link copied!');
  }catch(e){
    shareFeedback(btn, 'Copy failed');
  }
}
