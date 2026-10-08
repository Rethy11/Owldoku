/* Core game state for one puzzle */

/* ---------- core game state — one puzzle's worth, replaced wholesale by
   newGame()/startPuzzle() rather than being reset field-by-field ---------- */
let N = 6;
let regionOf = [];
let solutionPerm = [];
let given = []; // boolean grid
let mark = [];  // 'empty' | 'x' | 'owl'
let markGlyph = []; // per-cell glyph for 'x' marks: 'x' | 'q' — fixed at placement time, doesn't change on mode switch
let hearts = 3;
let seconds = 0;
let timerInterval = null;
let gameOver = false;
let solved = false;
let selectedCell = null;
let mode = 'x'; // 'owl' | 'x'
let xGlyph = 'x'; // 'x' | 'q' — cosmetic skin for x-mode marks, toggled by re-tapping the mode button
let dragging = false;
let dragAction = null; // 'add' | 'remove'
let dragGlyph = null; // glyph ('x'|'q') a 'remove' drag stroke is restricted to
let hintUsed = false;
let currentPuzzleCode = '';
let currentDifficulty = 'easy';
let hasInteracted = false; // true once the player has placed/removed an owl, X, or used a hint on the current board
let conflictCell = null;     // {r,c} of the owl currently showing conflict feedback
let conflictTimeoutA = null; // timer: start the fade
let conflictTimeoutB = null; // timer: remove the owl / clear feedback

function boardEl(){ return document.getElementById('grid'); }
