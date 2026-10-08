/* Title screen and intro animation */

const titleScreen = document.getElementById('titleScreen');
const gameWrap = document.getElementById('gameWrap');
// Called once the tap-intro finishes (see playTitleIntro below): unlocks
// audio (must happen on a user gesture), starts music, reveals the game
// underneath, and shows the first-run tutorial if this browser hasn't seen
// it before.
function dismissTitleScreen(){
  AudioCore.ensure();
  Music.autoStart();
  sizeBoard();
  if(!hasTutorialBeenSeen()) showTutorial();
  titleScreen.classList.add('hide');
  gameWrap.classList.add('revealed');
  AdBanner.start();
  titleScreen.addEventListener('transitionend', ()=>{
    titleScreen.style.display = 'none';
  }, { once:true });
}
// Tap-intro sequence: the eyes float from their title-screen position down to
// just above center (achieved for free by letting the flex column re-center
// once the rest of the title content is removed — a small FLIP animation
// carries the eyes smoothly into that spot instead of jumping there), then
// "PLASTICINE GAMES" fades in below them, they blink once, and both glitch-fade
// out before the normal title dismissal reveals the game.
function playTitleIntro(){
  const eyes = document.getElementById('titleEyes');
  const credit = document.getElementById('studioCredit');
  const titleMain = titleScreen.querySelector('.title-main');

  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    dismissTitleScreen();
    return;
  }

  titleScreen.classList.add('intro');

  // FLIP: capture the eyes' position before removing the rest of the title
  // content, then let layout re-center around just eyes + credit, then
  // animate from the old position to the new one.
  const firstRect = eyes.getBoundingClientRect();
  titleMain.style.display = 'none';
  credit.style.visibility = 'visible';
  const lastRect = eyes.getBoundingClientRect();
  const dy = firstRect.top - lastRect.top;

  eyes.style.transition = 'none';
  eyes.style.transform = `translateY(${dy}px)`;
  void eyes.offsetHeight; // force reflow so the jump above isn't animated
  eyes.style.transition = 'transform 0.9s cubic-bezier(.22,.61,.36,1)';
  requestAnimationFrame(()=>{ eyes.style.transform = 'translateY(0)'; });

  const hum = Sound.bulbHumStart();

  setTimeout(()=>{ credit.classList.add('show'); }, 950);
  setTimeout(()=>{
    eyes.classList.add('blink-once');
    setTimeout(()=> Sound.blink(), 390);       // first eye closes at ~78% of its 0.5s animation
    setTimeout(()=> Sound.blink(), 150 + 390);  // second eye, offset by its 0.15s CSS delay
  }, 1400);
  setTimeout(()=>{
    if(hum) hum.stop(0.15);
    eyes.classList.add('glitch-out');
    credit.classList.add('glitch-out');
    Sound.glitchZap();
  }, 2200);
  setTimeout(dismissTitleScreen, 2950);
}
titleScreen.addEventListener('click', playTitleIntro, { once:true });
