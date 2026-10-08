/* "No lines" mode tutorial */

/* ---------- "no lines" mode: one rule page + four pages of the designer
   quietly trying to talk you out of it ---------- */
const NOLINES_TUTORIAL_PAGES = [
  {
    title: 'New rule: No Lines',
    text: "On top of the normal rules, no two owls may share ANY diagonal — not just adjacent ones. If a line can be drawn corner to corner through two owls, that's a violation, no matter how far apart they are.",
    board: { owls: [[0,0],[4,4]], errors: [[0,0],[4,4]], line: [[0,0],[4,4]] }
  },
  {
    title: 'Hey.',
    text: "Are you okay? You really don't have to do this. Impossible mode is hard enough on its own.",
    board: { owls: [[0,4],[1,1],[2,3],[3,0],[4,2]] },
    hearts: 2,
    icon: 'sad',
    caption: '(unrelated gameplay photo)'
  },
  {
    title: 'For what it\u2019s worth',
    text: "Designing this algorithm was a technical feat. It took millions of generated puzzles to get right, and it broke a couple of AIs that tried to comprehend it.",
    board: { qs: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4],[4,0],[4,1],[4,2],[4,3],[4,4]] }
  },
  {
    title: 'No shame in it',
    text: "No one will be disappointed in you for turning back now. You're good at this game \u2014 we get it.",
    board: { owls: [[0,2],[2,4],[4,1]], errors: [[0,2]] },
    hearts: 1,
    icon: 'sad'
  },
  {
    title: 'One more thing',
    text: "I designed this game, and even on 6\u00d76, No Lines is too much for me. It gave me a migraine in 20 minutes. Please don\u2019t do this.",
    board: { gameOver: true, hearts: 0 },
    icon: 'sad'
  }
];

const nolinesOverlay = document.getElementById('nolinesOverlay');
const nolinesBoardBox = document.getElementById('nolinesBoardBox');
const nolinesHearts = document.getElementById('nolinesHearts');
const nolinesOwlIcon = document.getElementById('nolinesOwlIcon');
const nolinesTitle = document.getElementById('nolinesTitle');
const nolinesCaption = document.getElementById('nolinesCaption');
const nolinesText = document.getElementById('nolinesText');
const nolinesDots = document.getElementById('nolinesDots');
const nolinesPrevBtn = document.getElementById('nolinesPrevBtn');
const nolinesNextBtn = document.getElementById('nolinesNextBtn');

let nolinesPage = 0;

function renderNolinesPage(){
  const page = NOLINES_TUTORIAL_PAGES[nolinesPage];
  nolinesTitle.textContent = page.title;
  nolinesText.textContent = page.text;
  nolinesBoardBox.innerHTML = tutBoardHTML(page.board);
  if(nolinesPage === 0){
    nolinesOwlIcon.innerHTML = page.icon === 'sad' ? owlIconHTML('sad') : (page.icon === 'happy' ? owlIconHTML('happy') : owlIconHTML());
    nolinesOwlIcon.style.display = '';
  } else {
    nolinesOwlIcon.innerHTML = '';
    nolinesOwlIcon.style.display = 'none';
  }
  if(typeof page.hearts === 'number'){
    nolinesHearts.innerHTML = heartsMarkup(page.hearts, 3);
    nolinesHearts.style.display = '';
  } else {
    nolinesHearts.style.display = 'none';
  }
  if(page.caption){
    nolinesCaption.textContent = page.caption;
    nolinesCaption.style.display = '';
  } else {
    nolinesCaption.style.display = 'none';
  }
  nolinesDots.innerHTML = NOLINES_TUTORIAL_PAGES.map((_,i)=>
    `<button type="button" class="dot${i===nolinesPage?' active':''}" data-i="${i}" aria-label="Go to page ${i+1}"></button>`
  ).join('');
  nolinesPrevBtn.classList.toggle('ghost', nolinesPage===0);
  nolinesNextBtn.textContent = nolinesPage === NOLINES_TUTORIAL_PAGES.length-1 ? 'Fine, I understand' : 'Next';
}

function goNolinesPage(i){
  nolinesPage = Math.max(0, Math.min(NOLINES_TUTORIAL_PAGES.length-1, i));
  renderNolinesPage();
}

function showNolinesTutorial(){ nolinesPage = 0; nolinesOverlay.classList.add('show'); renderNolinesPage(); }
function hideNolinesTutorial(){ nolinesOverlay.classList.remove('show'); }

document.getElementById('nolinesCloseBtn').addEventListener('click', ()=>{ Sound.button(); hideNolinesTutorial(); });
nolinesDots.addEventListener('click', (e)=>{
  const dot = e.target.closest('.dot');
  if(!dot) return;
  Sound.button();
  goNolinesPage(parseInt(dot.dataset.i, 10));
});
nolinesPrevBtn.addEventListener('click', ()=>{
  if(nolinesPage===0) return;
  Sound.button();
  goNolinesPage(nolinesPage-1);
});
nolinesNextBtn.addEventListener('click', ()=>{
  Sound.button();
  if(nolinesPage === NOLINES_TUTORIAL_PAGES.length-1){ hideNolinesTutorial(); }
  else { goNolinesPage(nolinesPage+1); }
});
