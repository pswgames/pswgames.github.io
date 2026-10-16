/* Original 8 × 8 puzzle rules. No DOM, network, or platform dependencies. */
((root, factory) => {
  const api=factory();
  if(typeof module === "object" && module.exports) module.exports=api;
  else root.SeowooBlockEngine=api;
})(typeof window === "undefined" ? globalThis : window, () => {
  "use strict";
  const SIZE=8;
  const bases=[[[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[2,0],[3,0],[4,0]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1]],[[0,0],[0,1],[0,2],[1,2]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[0,1],[1,1],[1,2]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]],[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]];
  const shapes=[];const seen=new Set();
  for(const base of bases) {
    let cells=base;
    for(let i=0;i<4;i++) {
      const minX=Math.min(...cells.map(c=>c[0])),minY=Math.min(...cells.map(c=>c[1]));
      cells=cells.map(([x,y])=>[x-minX,y-minY]).sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
      const key=JSON.stringify(cells);
      if(!seen.has(key)){seen.add(key);shapes.push(cells);}
      cells=cells.map(([x,y])=>[-y,x]);
    }
  }
  const makePiece=(rng=Math.random)=>({shape:Math.min(shapes.length-1,Math.floor(rng()*shapes.length)),color:1+Math.min(5,Math.floor(rng()*6))});
  const fits=(board,piece,x,y)=>!!piece && Number.isInteger(x) && Number.isInteger(y) && shapes[piece.shape]?.every(([dx,dy])=>x+dx>=0&&x+dx<SIZE&&y+dy>=0&&y+dy<SIZE&&!board[(y+dy)*SIZE+x+dx]);
  const canFit=(board,piece)=>!!piece && board.some((_,i)=>fits(board,piece,i%SIZE,Math.floor(i/SIZE)));
  const gameOver=(board,tray)=>!tray.some(p=>canFit(board,p));
  const create=(rng=Math.random)=>({board:Array(64).fill(0),tray:Array.from({length:3},()=>makePiece(rng)),score:0,combo:0,over:false,moves:0});
  function place(state,index,x,y,rng=Math.random) {
    const piece=state.tray[index];
    if(state.over||!fits(state.board,piece,x,y))return null;
    const board=state.board.slice(),cells=shapes[piece.shape].map(([dx,dy])=>(y+dy)*SIZE+x+dx);
    cells.forEach(i=>board[i]=piece.color);
    const rows=[],columns=[];
    for(let n=0;n<SIZE;n++) {
      if(Array.from({length:SIZE},(_,i)=>board[n*SIZE+i]).every(Boolean))rows.push(n);
      if(Array.from({length:SIZE},(_,i)=>board[i*SIZE+n]).every(Boolean))columns.push(n);
    }
    const cleared=[...new Set([...rows.flatMap(y=>Array.from({length:SIZE},(_,x)=>y*SIZE+x)),...columns.flatMap(x=>Array.from({length:SIZE},(_,y)=>y*SIZE+x))])];
    const lines=rows.length+columns.length,combo=lines?state.combo+1:0;
    // Each placed square: 10. Each line: 100. Multi-line and streak bonuses.
    const points=cells.length*10+lines*100+Math.max(0,lines-1)*50+(lines?Math.max(0,combo-1)*50:0);
    const beforeClear=board.slice();
    cleared.forEach(i=>board[i]=0);
    let tray=state.tray.map((p,i)=>i===index?null:p);
    const refill=tray.every(p=>!p);
    if(refill)tray=Array.from({length:3},()=>makePiece(rng));
    return {state:{board,tray,score:state.score+points,combo,over:gameOver(board,tray),moves:state.moves+1},effect:{cells,rows,columns,cleared,points,beforeClear,refill}};
  }
  function restore(value) {
    if(!value || !Array.isArray(value.board) || value.board.length!==64 || !value.board.every(x=>Number.isInteger(x)&&x>=0&&x<=6))return null;
    if(!Array.isArray(value.tray)||value.tray.length!==3||!value.tray.some(Boolean)||!value.tray.every(p=>p===null||(p&&Number.isInteger(p.shape)&&p.shape>=0&&p.shape<shapes.length&&Number.isInteger(p.color)&&p.color>=1&&p.color<=6)))return null;
    if(![value.score,value.combo,value.moves].every(n=>Number.isSafeInteger(n)&&n>=0))return null;
    const state={board:value.board.slice(),tray:value.tray.map(p=>p?{shape:p.shape,color:p.color}:null),score:value.score,combo:value.combo,moves:value.moves};
    state.over=gameOver(state.board,state.tray);return state;
  }
  return {SIZE,shapes,create,place,fits,canFit,gameOver,restore};
});
