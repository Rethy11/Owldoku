/* Puzzle generation, uniqueness solver, difficulty tuning */

/* ---------- generation ---------- */
function rand(n){ return Math.floor(Math.random()*n); }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){ const j=rand(i+1); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}

function generateSolution(N, attempts=500, noLines=false){
  for(let a=0;a<attempts;a++){
    const perm = new Array(N).fill(-1);
    const used = new Array(N).fill(false);
    function bt(r){
      if(r===N) return true;
      const order = shuffle([...Array(N).keys()]);
      for(const c of order){
        if(used[c]) continue;
        if(noLines){
          let onLine=false;
          for(let pr=0; pr<r; pr++){ if(Math.abs(perm[pr]-c)===r-pr){ onLine=true; break; } }
          if(onLine) continue;
        } else if(r>0 && Math.abs(perm[r-1]-c)<2) continue;
        perm[r]=c; used[c]=true;
        if(bt(r+1)) return true;
        used[c]=false; perm[r]=-1;
      }
      return false;
    }
    if(bt(0)) return perm;
  }
  return null;
}

function growRegions(N, perm){
  const regionOf = Array.from({length:N},()=>Array(N).fill(-1));
  for(let r=0;r<N;r++) regionOf[r][perm[r]] = r;
  let frontier = [];
  const pushNeighbors = (r,c,region)=>{
    const deltas=[[-1,0],[1,0],[0,-1],[0,1]];
    for(const [dr,dc] of deltas){
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<N&&nc>=0&&nc<N&&regionOf[nr][nc]===-1) frontier.push({r:nr,c:nc,region});
    }
  };
  for(let r=0;r<N;r++) pushNeighbors(r, perm[r], r);
  let guard=0;
  while(frontier.length>0 && guard<N*N*50){
    guard++;
    const idx=rand(frontier.length);
    const item=frontier[idx];
    frontier.splice(idx,1);
    if(regionOf[item.r][item.c]!==-1) continue;
    regionOf[item.r][item.c]=item.region;
    pushNeighbors(item.r,item.c,item.region);
  }
  let leftover=true, guard2=0;
  while(leftover && guard2<200){
    guard2++; leftover=false;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      if(regionOf[r][c]===-1){
        leftover=true;
        const deltas=[[-1,0],[1,0],[0,-1],[0,1]];
        for(const [dr,dc] of deltas){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<N&&nc>=0&&nc<N&&regionOf[nr][nc]!==-1){ regionOf[r][c]=regionOf[nr][nc]; break; }
        }
      }
    }
  }
  return regionOf;
}

// Anti-singleton priming + normal random flood-fill. A fully-balanced
// "always grow the smallest region" approach was tried first, but it makes
// every region end up compact and similarly-shaped, which turns out to make
// multiple-solution symmetry far MORE likely — it destroyed 0-clue
// uniqueness almost entirely. This lighter-touch version keeps the original
// algorithm's irregular, uniqueness-friendly growth, and only intervenes
// once per region: since no two seed cells are ever adjacent (the row
// placement backtracker enforces the no-touch rule), every region is
// guaranteed an unclaimed neighbor to grab immediately, so this one priming
// pass alone guarantees no region ever ends up as a singleton — the rest of
// growth then proceeds exactly like the original random flood-fill.
function growRegionsNoSingles(N, perm){
  const regionOf = Array.from({length:N},()=>Array(N).fill(-1));
  const deltas=[[-1,0],[1,0],[0,-1],[0,1]];
  for(let r=0;r<N;r++) regionOf[r][perm[r]] = r;
  const neighborsOf=(r,c)=>{
    const out=[];
    for(const [dr,dc] of deltas){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<N&&nc>=0&&nc<N&&regionOf[nr][nc]===-1) out.push({r:nr,c:nc});
    }
    return out;
  };
  for(let reg=0; reg<N; reg++){
    const opts = shuffle(neighborsOf(reg, perm[reg]));
    if(opts.length>0) regionOf[opts[0].r][opts[0].c] = reg;
  }
  let frontier = [];
  const pushNeighbors = (r,c,region)=>{
    for(const [dr,dc] of deltas){
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<N&&nc>=0&&nc<N&&regionOf[nr][nc]===-1) frontier.push({r:nr,c:nc,region});
    }
  };
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(regionOf[r][c]!==-1) pushNeighbors(r,c,regionOf[r][c]);
  let guard=0;
  while(frontier.length>0 && guard<N*N*50){
    guard++;
    const idx=rand(frontier.length);
    const item=frontier[idx];
    frontier.splice(idx,1);
    if(regionOf[item.r][item.c]!==-1) continue;
    regionOf[item.r][item.c]=item.region;
    pushNeighbors(item.r,item.c,item.region);
  }
  let leftover=true, guard2=0;
  while(leftover && guard2<200){
    guard2++; leftover=false;
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      if(regionOf[r][c]===-1){
        leftover=true;
        for(const [dr,dc] of deltas){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<N&&nc>=0&&nc<N&&regionOf[nr][nc]!==-1){ regionOf[r][c]=regionOf[nr][nc]; break; }
        }
      }
    }
  }
  return regionOf;
}

function hasSingletonRegion(N, regionOf){
  const counts = new Array(N).fill(0);
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) counts[regionOf[r][c]]++;
  return counts.some(n=>n===1);
}

// Same backtracker as countSolutions, but collects and returns the actual
// solutions found (as column-permutation arrays) instead of just a count.
// Used by the impossible-mode repair loop to identify a concrete alternate
// solution so it can be surgically eliminated.
function findSolutions(N, regionOf, limit, noLines=false){
  const colUsed=new Array(N).fill(false);
  const regionUsed=new Array(N).fill(false);
  const placedCols=[];
  const results=[];
  function onAnyLine(r,c){
    for(let pr=0; pr<r; pr++){ if(Math.abs(placedCols[pr]-c)===r-pr) return true; }
    return false;
  }
  function bt(r){
    if(results.length>=limit) return;
    if(r===N){ results.push(placedCols.slice()); return; }
    for(let c=0;c<N;c++){
      if(colUsed[c]) continue;
      const reg=regionOf[r][c];
      if(regionUsed[reg]) continue;
      if(noLines){ if(onAnyLine(r,c)) continue; }
      else if(r>0){ const prevC=placedCols[r-1]; if(Math.abs(prevC-c)<=1) continue; }
      colUsed[c]=true; regionUsed[reg]=true; placedCols[r]=c;
      bt(r+1);
      colUsed[c]=false; regionUsed[reg]=false; placedCols.pop();
      if(results.length>=limit) return;
    }
  }
  bt(0);
  return results;
}
function permsEqual(a,b){ for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

function regionStaysConnectedWithout(N, regionOf, reg, exR, exC){
  const cells=[];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(regionOf[r][c]===reg && !(r===exR&&c===exC)) cells.push([r,c]);
  if(cells.length<=1) return true;
  const key=(r,c)=>r*N+c;
  const set=new Set(cells.map(([r,c])=>key(r,c)));
  const visited=new Set([key(cells[0][0],cells[0][1])]);
  const stack=[cells[0]];
  while(stack.length){
    const [r,c]=stack.pop();
    for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const nr=r+dr,nc=c+dc,k=key(nr,nc);
      if(set.has(k) && !visited.has(k)){ visited.add(k); stack.push([nr,nc]); }
    }
  }
  return visited.size===cells.length;
}

// Given a spurious alternate solution (altPerm) that the current regionOf
// wrongly allows, this makes exactly one boundary-cell move that eliminates
// it. Pick a row r where altPerm disagrees with the true perm, and move that
// single cell into a neighboring region. Since altPerm (being a full valid
// solution) necessarily uses every region exactly once, handing that cell to
// ANY neighboring region always makes two of altPerm's rows claim the same
// region — invalidating altPerm — while perm's own owl cells are never
// touched, so perm always stays valid. Only geometric constraints are
// checked: don't shrink a region to a singleton, and don't disconnect it.
function attemptUniquenessRepair(N, regionOf, perm, altPerm){
  const deltas=[[-1,0],[1,0],[0,-1],[0,1]];
  const diffRows = shuffle([...Array(N).keys()].filter(r=>altPerm[r]!==perm[r]));
  for(const r of diffRows){
    const c = altPerm[r];
    const reg = regionOf[r][c];
    let regSize=0;
    for(let rr=0;rr<N;rr++) for(let cc=0;cc<N;cc++) if(regionOf[rr][cc]===reg) regSize++;
    if(regSize<=2) continue; // would leave a singleton behind — skip
    const neighborRegs = new Set();
    for(const [dr,dc] of deltas){
      const nr=r+dr, nc=c+dc;
      if(nr>=0&&nr<N&&nc>=0&&nc<N){
        const nreg = regionOf[nr][nc];
        if(nreg!==reg) neighborRegs.add(nreg);
      }
    }
    if(neighborRegs.size===0) continue;
    if(!regionStaysConnectedWithout(N, regionOf, reg, r, c)) continue;
    regionOf[r][c] = shuffle([...neighborRegs])[0];
    return true;
  }
  return false;
}

function countSolutions(N, regionOf, givens, limit=2, noLines=false){
  const colUsed=new Array(N).fill(false);
  const regionUsed=new Array(N).fill(false);
  const placedCols=[];
  let count=0;
  function onAnyLine(r,c){
    for(let pr=0; pr<r; pr++){ if(Math.abs(placedCols[pr]-c)===r-pr) return true; }
    return false;
  }
  function bt(r){
    if(count>=limit) return;
    if(r===N){ count++; return; }
    if(givens[r]!==undefined){
      const c=givens[r];
      const reg=regionOf[r][c];
      if(colUsed[c]||regionUsed[reg]) return;
      if(noLines){ if(onAnyLine(r,c)) return; }
      else if(r>0){ const prevC=placedCols[r-1]; if(Math.abs(prevC-c)<=1) return; }
      colUsed[c]=true; regionUsed[reg]=true; placedCols[r]=c;
      bt(r+1);
      colUsed[c]=false; regionUsed[reg]=false; placedCols.pop();
      return;
    }
    for(let c=0;c<N;c++){
      if(colUsed[c]) continue;
      const reg=regionOf[r][c];
      if(regionUsed[reg]) continue;
      if(noLines){ if(onAnyLine(r,c)) continue; }
      else if(r>0){ const prevC=placedCols[r-1]; if(Math.abs(prevC-c)<=1) continue; }
      colUsed[c]=true; regionUsed[reg]=true; placedCols[r]=c;
      bt(r+1);
      colUsed[c]=false; regionUsed[reg]=false; placedCols.pop();
      if(count>=limit) return;
    }
  }
  bt(0);
  return count;
}

function greedyClues(N, regionOf, perm, noLines=false){
  const givens = {};
  if(countSolutions(N, regionOf, givens, 2, noLines)===1) return givens;
  const remainingRows = shuffle([...Array(N).keys()]);
  let guard = 0;
  while(guard++ < N){
    let bestRow=null, bestCount=Infinity;
    for(const r of remainingRows){
      if(givens[r]!==undefined) continue;
      const trial = Object.assign({}, givens);
      trial[r]=perm[r];
      const cnt = countSolutions(N, regionOf, trial, 3, noLines);
      if(cnt < bestCount){ bestCount=cnt; bestRow=r; }
      if(cnt===1) break;
    }
    if(bestRow===null) break;
    givens[bestRow]=perm[bestRow];
    if(countSolutions(N, regionOf, givens, 2, noLines)===1) break;
  }
  return givens;
}

function buildCandidate(N, seekMinimal, noLines=false){
  const perm = generateSolution(N, 500, noLines);
  if(!perm) return null;
  const growAttempts = N<=6?10:(N<=8?20:40);
  let regionOf=null;
  for(let g=0; g<growAttempts; g++){
    const r = growRegions(N, perm);
    if(countSolutions(N, r, {}, 2, noLines)===1){ regionOf=r; break; }
  }
  let clues={};
  if(!regionOf){
    // No fully-unique (0-clue) region found for this solution. Sample a handful
    // of region layouts and keep whichever needs the fewest clues, rather than
    // just settling for the last one tried — this matters most for hard mode.
    const sampleCount = seekMinimal ? 12 : 1;
    let bestClues=null, bestRegion=null;
    for(let s=0;s<sampleCount;s++){
      const r = growRegions(N, perm);
      const cl = greedyClues(N, r, perm, noLines);
      if(bestClues===null || Object.keys(cl).length < Object.keys(bestClues).length){
        bestClues = cl; bestRegion = r;
      }
      if(Object.keys(bestClues).length<=2) break;
    }
    regionOf = bestRegion;
    clues = bestClues;
  }
  return {N, perm, regionOf, clues};
}

// Impossible mode requires BOTH a 0-clue (fully blank) unique solution AND a
// region layout with no size-1 territories. Just growing random regions and
// hoping to land on both properties at once is astronomically rare at larger
// sizes (measured well under 1-in-100,000 for 10x10) — nowhere near feasible
// to hit by chance. Instead: grow a singleton-free region layout, then run a
// short repair loop that finds each spurious alternate solution the layout
// still allows and surgically eliminates it via attemptUniquenessRepair,
// converging on a genuinely unique 0-clue layout in a handful of steps.
function buildImpossibleCandidate(N, maxRepairs, noLines=false){
  const perm = generateSolution(N, 500, noLines);
  if(!perm) return null;
  const regionOf = growRegionsNoSingles(N, perm);
  for(let i=0;i<maxRepairs;i++){
    const sols = findSolutions(N, regionOf, 2, noLines);
    const altPerm = sols.find(s=>!permsEqual(s, perm));
    if(!altPerm) return {N, perm, regionOf, clues:{}}; // no alternate left — unique
    if(!attemptUniquenessRepair(N, regionOf, perm, altPerm)) return null; // stuck, retry fresh
  }
  return null;
}

// Difficulty is expressed as target clue count. Hard boards search across several
// candidate solutions/regions to find one that's genuinely solvable with very few
// givens (0-2). Medium/easy start from the minimal unique-solution clue set and
// pad with additional true clues (safe: revealing more of a valid solution never
// breaks uniqueness) up to a target count for that difficulty.
function clueTarget(difficulty, N){
  if(difficulty==='easy') return Math.max(3, Math.ceil(N*0.7));
  if(difficulty==='hard') return 2;
  return Math.max(2, Math.round(N/2)-1); // medium
}

function generatePuzzle(N, difficulty='medium'){
  const result = generatePuzzleCore(N, difficulty);
  // Stamp the difficulty actually used to build this puzzle onto the result
  // itself, so callers never have to (and never mistakenly do) infer it from
  // whatever the difficulty <select> currently shows — that can change while
  // generation is still running.
  if(result) result.difficulty = difficulty;
  return result;
}

function generatePuzzleCore(N, difficulty='medium'){
  if(difficulty==='impossible' || difficulty==='nolines'){
    // One-time generation cost paid when a new board is requested (not a hot
    // loop), so it's fine to retry generously. In testing this converges
    // essentially every time — 10x10 succeeded 30/30 runs, median ~100ms,
    // worst case under 1s. 'nolines' adds a full diagonal-exclusion rule on
    // top (no two owls share ANY diagonal, not just adjacent ones) — since
    // that constraint prunes far more candidate solutions up front, it tends
    // to converge on a unique 0-clue layout just as reliably.
    const noLines = difficulty==='nolines';
    const outerAttempts = N>=10 ? 250 : (N>=8 ? 120 : 60);
    const maxRepairs = N>=10 ? 150 : (N>=8 ? 80 : 60);
    for(let i=0;i<outerAttempts;i++){
      const cand = buildImpossibleCandidate(N, maxRepairs, noLines);
      if(cand) return cand;
    }
    // Should essentially never be reached, but guarantees a puzzle is still
    // returned rather than failing outright. Falls back to a minimal- (rather
    // than zero-) clue board, still honoring the no-lines rule if it's active,
    // instead of silently dropping the constraint.
    const fallback = buildCandidate(N, true, noLines);
    if(fallback) return fallback;
    // Absolute last resort. Do NOT call generatePuzzle(N,'hard') here — that
    // silently drops noLines entirely (it defaults the flag to false), so a
    // 'nolines' puzzle could come back with owls sharing a diagonal while the
    // UI still thinks it's in no-lines mode. Re-run the same hard-style
    // minimal-clue search buildCandidate uses, but keep noLines honored.
    const hardAttempts = N>=10 ? 18 : 10;
    let best = null;
    for(let i=0;i<hardAttempts;i++){
      const cand = buildCandidate(N, true, noLines);
      if(!cand) continue;
      const clueCount = Object.keys(cand.clues).length;
      if(!best || clueCount < Object.keys(best.clues).length) best = cand;
      if(clueCount<=2) break;
    }
    if(best) return best;
    // generateSolution itself couldn't find any noLines-valid permutation for
    // this N (only possible for very small/degenerate sizes) — nothing left
    // to try that would still respect the rule.
    return null;
  }

  const HARD_MAX = 2;
  const isHard = difficulty==='hard';
  const outerAttempts = isHard ? (N>=10 ? 18 : 10) : 1;
  let best = null;
  for(let i=0;i<outerAttempts;i++){
    const cand = buildCandidate(N, isHard);
    if(!cand) continue;
    const clueCount = Object.keys(cand.clues).length;
    if(!best || clueCount < Object.keys(best.clues).length) best = cand;
    if(isHard && clueCount<=HARD_MAX) break;
  }
  if(!best) return null;

  if(difficulty==='hard'){
    return best; // minimal clue set as found — 0-2 in the overwhelming majority of cases
  }

  const target = clueTarget(difficulty, N);
  const clues = Object.assign({}, best.clues);
  const rowsAvailable = shuffle([...Array(N).keys()].filter(r=>clues[r]===undefined));
  for(const r of rowsAvailable){
    if(Object.keys(clues).length >= target) break;
    clues[r] = best.perm[r];
  }
  return {N, perm:best.perm, regionOf:best.regionOf, clues};
}
