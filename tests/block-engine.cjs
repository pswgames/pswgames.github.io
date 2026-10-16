const assert=require('assert/strict'),E=require('../js/block-engine.js');
const one=E.shapes.findIndex(p=>p.length===1),square=E.shapes.findIndex(p=>p.length===4&&p.every(([x,y])=>x<2&&y<2));
const piece={shape:one,color:1};
const base=()=>({...E.create(),tray:[piece,piece,piece]});
let s=base();assert.equal(s.board.length,64);assert.equal(s.tray.length,3);
assert(!E.place(s,0,-1,0));assert(!E.place(s,0,8,0));assert(!E.place(s,0,.5,0));
let r=E.place(s,0,0,0);assert.equal(r.state.score,10);assert.equal(r.state.tray[0],null);assert(!E.place(r.state,0,2,2));assert(!E.place(r.state,1,0,0));assert.equal(s.board[0],0,'no state mutation');
r=E.place(r.state,1,1,0);assert.equal(r.state.tray.filter(Boolean).length,1);r=E.place(r.state,2,2,0);assert(r.effect.refill);assert.equal(r.state.tray.filter(Boolean).length,3);
s=base();for(let i=0;i<8;i++){s.board[i]=2;s.board[i*8]=3;}s.board[0]=0;
r=E.place(s,0,0,0);assert.equal(r.effect.rows.length,1);assert.equal(r.effect.columns.length,1);assert.equal(r.effect.cleared.length,15,'cross intersection clears once');assert.equal(r.state.board.filter(Boolean).length,0);assert.equal(r.state.score,260);assert.equal(r.state.combo,1);
s={...r.state,board:Array(64).fill(0),tray:[piece,piece,piece]};for(let x=1;x<8;x++)s.board[x]=2;
r=E.place(s,0,0,0);assert.equal(r.state.combo,2);assert.equal(r.effect.points,160);r=E.place(r.state,1,3,3);assert.equal(r.state.combo,0);
s=base();s.board.fill(2);assert(E.gameOver(s.board,s.tray));s.board[0]=0;assert(!E.gameOver(s.board,s.tray));assert(E.gameOver(s.board,[{shape:square,color:1},null,null]));
s=base();for(let x=1;x<8;x++)s.board[x]=1;for(let i=8;i<64;i++)s.board[i]=1;r=E.place(s,0,0,0);assert(!r.state.over,'game over evaluated after simultaneous clears');
assert(!E.restore({board:[]}));assert(!E.restore({...base(),score:NaN}));assert(!E.restore({...base(),tray:[{shape:999,color:1},null,null]}));assert.deepEqual(E.restore(base()).board,Array(64).fill(0));
// Repeated complete games exercise refill/dead-end boundaries and score invariants.
let seed=761, rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),placements=0,clears=0;
for(let game=0;game<100;game++){
 s=E.create(rng);
 for(let turn=0;!s.over&&turn<500;turn++){
  const moves=[];
  for(let i=0;i<3;i++)for(let y=0;y<8;y++)for(let x=0;x<8;x++)if(E.fits(s.board,s.tray[i],x,y))moves.push([i,x,y]);
  assert(moves.length);const m=moves[Math.floor(rng()*moves.length)];r=E.place(s,...m,rng);assert(r);assert(r.state.score>s.score);assert.equal(r.state.score-s.score,r.effect.points);assert(r.state.board.every(x=>Number.isInteger(x)&&x>=0&&x<=6));assert.equal(r.state.over,E.gameOver(r.state.board,r.state.tray));assert(!r.state.tray.every(x=>!x));placements++;clears+=r.effect.rows.length+r.effect.columns.length;s=r.state;
 }
 assert(s.over);assert(!s.tray.some(p=>E.canFit(s.board,p)));
}
console.log(`PASS block rules: boundaries, overlap, 3-piece refill, simultaneous rows/columns, combos, scores, restoration, 100 complete games (${placements} placements, ${clears} clears)`);
