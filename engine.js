(function(root){
'use strict';
const N=6,neighbors=(i,n=N)=>[i%n?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(i=>i>=0);
const home=(i,p,n=N)=>Math.floor(i/n)===(p===1?0:n-1),coord=(i,n=N)=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i%n]+(n-Math.floor(i/n));
const owner=v=>v?((v%2)?1:2):0,isCastle=v=>v>=5,isCarrier=(v,p)=>v===p+2||v===p+6;
const key=s=>s.board.join('')+':'+s.turn+':'+s.reserve[1]+','+s.reserve[2];
function initial(size=6){if(!Number.isInteger(size)||size<4||size>12)throw Error('Brettgröße muss zwischen 4 und 12 liegen');const s={size,limit:300,stoneLimit:size*size,reserve:[0,size*size,size*size],removed:[0,0,0],board:Array(size*size).fill(0),turn:1,passes:0,result:null,ply:0,seen:{}};s.seen[key(s)]=1;return s;}
function score(s,p){return s.board.reduce((sum,v)=>sum+(owner(v)===p?(isCastle(v)?2:1):0),p===2?1:0);}
function winner(s){const d=score(s,1)-score(s,2);return d===0?0:d>0?1:2;}
function slideTargets(s,i){if(s.board[i]!==s.turn+2)return [];const out=[],n=s.size,r=Math.floor(i/n),c=i%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]])for(let y=r+dr,x=c+dc;y>=0&&y<n&&x>=0&&x<n;y+=dr,x+=dc){const j=y*n+x;if(s.board[j])break;out.push(j);}return out;}
function transferTargets(s,i){const p=s.turn,n=s.size;if(!isCarrier(s.board[i],p))return [];const out=[],r=Math.floor(i/n),c=i%n;for(const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]])for(let y=r+dr,x=c+dc;y>=0&&y<n&&x>=0&&x<n;y+=dr,x+=dc){const j=y*n+x;if(![p,p+4].includes(s.board[j]))break;out.push(j);}return out;}
function hopTargets(s,i){const p=s.turn;if(!isCarrier(s.board[i],p))return [];const adjacent=s.board[i]===p+6?[0]:[0,3-p,5-p];return [...new Set([...transferTargets(s,i),...neighbors(i,s.size).filter(j=>adjacent.includes(s.board[j]))])];}
function forgeTargets(s,i){return isCarrier(s.board[i],s.turn)?neighbors(i,s.size).filter(j=>s.board[j]===s.turn+2):[];}
function liveStones(s,p){return s.board.reduce((n,v)=>n+(owner(v)===p?(v===p?1:v===p+2?2:v===p+6?1:0):0),0);}
function boardActions(s){if(s.result)return [];const out=[],p=s.turn;for(let i=0;i<s.board.length;i++){const v=s.board[i];if(!v&&s.reserve[p]>0)out.push({type:'place',to:i});if(v===p&&s.reserve[p]>0&&home(i,p,s.size))out.push({type:'build',to:i});if(isCarrier(v,p))for(const to of forgeTargets(s,i))out.push({type:'forge',from:i,to});if(isCarrier(v,p)){for(const to of slideTargets(s,i))out.push({type:'slide',from:i,to});for(const to of hopTargets(s,i))out.push({type:'hop',from:i,to});}}return out;}
function canPass(s){return !s.result;}
function actions(s){if(s.result)return [];const list=boardActions(s);return canPass(s,list)?[...list,{type:'pass'}]:list;}
function legal(s,a){if(s.result||!a)return false;if(a.type==='pass')return canPass(s);if(!Number.isInteger(a.to)||a.to<0||a.to>=s.board.length)return false;if(a.type==='place')return s.reserve[s.turn]>0&&s.board[a.to]===0;if(a.type==='build')return s.reserve[s.turn]>0&&s.board[a.to]===s.turn&&home(a.to,s.turn,s.size);if(!Number.isInteger(a.from)||a.from<0||a.from>=s.board.length)return false;if(a.type==='forge')return forgeTargets(s,a.from).includes(a.to);if(a.type==='slide')return slideTargets(s,a.from).includes(a.to);if(a.type==='hop')return hopTargets(s,a.from).includes(a.to);return false;}
function apply(s,a,validate=true){
 if(validate&&!legal(s,a))throw Error('Ungültiger Zug');const b=s.board.slice(),p=s.turn,reserve=s.reserve.slice(),removed=s.removed.slice();let effect=a.type;
 if(a.type==='place'){b[a.to]=p;reserve[p]--;}else if(a.type==='build'){b[a.to]=p+2;reserve[p]--;}else if(a.type==='forge'){b[a.from]-=2;b[a.to]=p+4;removed[p]+=3;}else if(a.type==='slide'){b[a.from]=0;b[a.to]=p+2;}
 else if(a.type==='hop'){const v=b[a.to];b[a.from]-=2;if(v===0){b[a.to]=p;effect='split';}else if(v===p){b[a.to]=p+2;effect='transfer';}else if(v===p+4){b[a.to]=p+6;effect='castle-transfer';}else if(v===3-p){b[a.to]=p+4;removed[p]++;removed[3-p]++;effect='capture';}else if(v===5-p){b[a.to]-=2;removed[p]++;removed[3-p]++;effect='dismantle';}else throw Error('Ungültiges Sprungziel');}
 const n={size:s.size,limit:s.limit||300,stoneLimit:s.stoneLimit,reserve,removed,board:b,turn:3-p,passes:a.type==='pass'?(s.passes||0)+1:0,ply:s.ply+1,result:null,seen:{...s.seen}};
 const forcedPass=a.type==='pass'&&boardActions(s).length===0,k=key(n);n.seen[k]=(n.seen[k]||0)+1;
 if(n.passes===2)n.result={reason:'passes',winner:winner(n)};else if(n.seen[k]>=3)n.result={reason:'repetition-score',winner:winner(n)};else if(n.ply>=n.limit)n.result={reason:'horizon',winner:winner(n)};
 return {state:n,effect:forcedPass?'forced-pass':effect,forcedPass};
}
function stats(s){const list=boardActions(s);return {legalActions:actions(s).length,legalBoardActions:list.length,freeCells:s.board.filter(v=>!v).length,scores:[score(s,1),score(s,2)],captureActions:list.filter(a=>a.type==='hop'&&s.board[a.to]===3-s.turn).length,canPass:canPass(s),reserve:s.reserve.slice(),removed:s.removed.slice()};}
function describe(a,effect,size=N){if(a.type==='pass')return effect==='forced-pass'?'passt (keine Brettaktion möglich)':'passt';if(a.type==='place')return 'gründet Siedlung auf '+coord(a.to,size);if(a.type==='build')return 'bildet Trupp auf '+coord(a.to,size);if(a.type==='slide')return coord(a.from,size)+' → '+coord(a.to,size);if(a.type==='forge')return coord(a.from,size)+' ⇢ '+coord(a.to,size)+' · Oppidum gebaut · 3 Steine entfernt';return coord(a.from,size)+' ⇢ '+coord(a.to,size)+' · '+({split:'teilt',transfer:'überträgt','castle-transfer':'landet auf Oppidum',capture:'Oppidum entsteht · 2 Punkte',dismantle:'beide Trupps entfernt'}[effect]||'springt');}
root.Sprung={N,neighbors,home,coord,owner,isCastle,isCarrier,key,initial,score,winner,slideTargets,transferTargets,hopTargets,forgeTargets,liveStones,boardActions,canPass,actions,legal,apply,stats,describe};
})(globalThis);
