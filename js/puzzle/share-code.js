/* Encode/decode a puzzle into a URL-safe share code */

/* ---------- puzzle sharing (encode exact board into a URL-safe code) ---------- */
const SITE_URL = 'https://www.owldoku.com/';

function b64urlEncode(str){
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecode(str){
  str = str.replace(/-/g,'+').replace(/_/g,'/');
  while(str.length % 4) str += '=';
  return atob(str);
}

const DIFF_CODE = { easy:'e', medium:'m', hard:'h', impossible:'i', nolines:'x' };
const DIFF_FROM_CODE = { e:'easy', m:'medium', h:'hard', i:'impossible', x:'nolines' };

// Encodes an exact board into a compact, URL-safe string: every field is
// base36 (so single digits/letters cover 0-35, enough for any board size
// this game supports) and packed as `N|regions|clues|solution|difficulty`
// before base64url-encoding the whole thing. This is what lets a shared
// link reproduce the exact same puzzle rather than just the same settings.
function packPuzzle(N, regionOf, clues, perm, difficulty){
  let regionStr = '';
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) regionStr += regionOf[r][c].toString(36);
  let clueStr = '';
  for(let r=0;r<N;r++) clueStr += (clues[r]!==undefined) ? clues[r].toString(36) : '.';
  let permStr = '';
  for(let r=0;r<N;r++) permStr += perm[r].toString(36);
  const diffCode = DIFF_CODE[difficulty] || 'm';
  return b64urlEncode(`${N}|${regionStr}|${clueStr}|${permStr}|${diffCode}`);
}

function unpackPuzzle(code){
  const raw = b64urlDecode(code);
  const parts = raw.split('|');
  if(parts.length !== 4 && parts.length !== 5) return null;
  const [nStr, regionStr, clueStr, permStr, diffCode] = parts;
  const N = parseInt(nStr, 10);
  if(!N || regionStr.length !== N*N || clueStr.length !== N || permStr.length !== N) return null;
  const regionOf = Array.from({length:N},()=>Array(N).fill(0));
  for(let i=0;i<N*N;i++){
    regionOf[Math.floor(i/N)][i%N] = parseInt(regionStr[i], 36);
  }
  const clues = {};
  for(let r=0;r<N;r++){
    const ch = clueStr[r];
    if(ch !== '.') clues[r] = parseInt(ch, 36);
  }
  const perm = [];
  for(let r=0;r<N;r++) perm.push(parseInt(permStr[r], 36));
  // older shared links (before difficulty was encoded) omit the 5th field
  const difficulty = DIFF_FROM_CODE[diffCode] || null;
  return {N, regionOf, clues, perm, difficulty};
}
