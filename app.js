import {encode,decode} from './signaling.mjs';
import {Match} from './match.mjs';
import {modes} from './clock.mjs';
const E=globalThis.Sprung;
const $=id=>document.getElementById(id);
const form=$('create'), join=$('join');
const fields={
  move:['Sekunden pro Zug',20],main:['Grundzeit in Sekunden',300],
  increment:['Zuschlag je Zug in Sekunden',5],delay:['Verzögerung je Zug in Sekunden',5],
  period:['Sekunden je Byōyomi-Periode',20],periods:['Anzahl Perioden',3]
};
const values={};
const descriptions={
  move:'Die Uhr beginnt bei jedem Zug von vorn.',
  fischer:'Nach jedem rechtzeitigen Zug kommt ein Zuschlag zur Restzeit hinzu.',
  delay:'Die Grundzeit läuft erst nach der Verzögerung an.',
  absolute:'Jede Seite hat ein Zeitkonto für die gesamte Partie.',
  byo:'Nach der Grundzeit laufen einzelne Perioden. Verstrichene Perioden sind verbraucht. Die aktuelle Periode beginnt nach einem rechtzeitigen Zug wieder voll.',
  free:'Die Partie läuft ohne Zeitlimit pro Zug.'
};
let session,game,match,peer,channel,selected=null,view,viewMode=false,timing=null;
let choiceTarget=null,rotating=false;
let boardLayout;
let waiting=false,latency=Infinity,closed=false;
const now=()=>performance.now();
const nameOf=value=>String(value??'').trim().slice(0,30);
const send=data=>channel.send(JSON.stringify(data));
const status=message=>{$('status').textContent=message;};
function fieldsForMode(){
  const box=$('timeFields'), mode=form.elements.mode.value;
  for(const input of box.querySelectorAll('input'))values[input.name]=input.value;
  box.replaceChildren();
  for(const [key,[min,max]] of Object.entries(modes[mode])){
    const label=document.createElement('label'),input=document.createElement('input');
    input.type='number';input.name=key;input.min=min;input.max=max;input.required=true;
    input.value=values[key]??fields[key][1];label.append(fields[key][0]+' ',input);box.append(label);
  }
  const hint=document.createElement('p');hint.textContent=descriptions[mode];box.append(hint);
}
form.elements.mode.onchange=fieldsForMode;
fieldsForMode();
function update(snapshot,hostTime){
  if(!game||game.state.ply!==snapshot.state.ply||snapshot.outcome){selected=null;choiceTarget=null;}
  game=snapshot;
  if(!timing)timing={received:now(),server:hostTime};
  waiting=false;
  $('connect').hidden=true;$('game').hidden=false;
  status('');
  render();
}
function publish(){
  const snapshot=match.snapshot();
  if(channel.readyState==='open')send({type:'state',snapshot,now:now()});
  update(snapshot,now());
}
function configure(dc,guestName){
  channel=dc;
  dc.onopen=()=>{
    if(session.side===2){
      send({type:'hello',name:guestName});
      send({type:'ping',sent:now()});
    }
  };
  dc.onclose=()=>{closed=true;waiting=false;status('Verbindung getrennt. Starte für eine neue Partie einen neuen Austausch.');if(game)render();};
  dc.onmessage=event=>{
    if(typeof event.data!=='string'||event.data.length>65536)return;
    try{
      const message=JSON.parse(event.data);
      if(session.side===1){
        if(message.type==='hello'&&match.started===null){
          match.join(nameOf(message.name)||'Weiß',now());
          timing={received:0,server:0};publish();
        }else if(message.type==='ping'){
          send({type:'pong',sent:message.sent,now:now()});
        }else if(message.type==='move'&&match.started!==null){
          match.move(2,message.ply,message.action,now());publish();
        }
      }else if(message.type==='state'){
        update(message.snapshot,message.now);
      }else if(message.type==='pong'){
        const received=now(),rtt=received-message.sent;
        if(rtt>=0&&rtt<latency*1.25){
          latency=rtt;timing={received,server:message.now+rtt/2};
        }
      }
    }catch{status('Die Nachricht konnte nicht verarbeitet werden.');}
  };
}
async function prepareCode(description){
  await peer.setLocalDescription(description);
  if(peer.iceGatheringState!=='complete')await new Promise(resolve=>{
    function done(){
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange',check);
      resolve();
    }
    function check(){if(peer.iceGatheringState==='complete')done();}
    const timer=setTimeout(done,10000);
    peer.addEventListener('icegatheringstatechange',check);check();
  });
  $('outgoing').value=await encode(peer.localDescription);
}
function connect(side){
  peer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  session={side};$('setup').hidden=true;$('connect').hidden=false;
  peer.onconnectionstatechange=()=>{
    if(['failed','disconnected'].includes(peer.connectionState))status('Direktverbindung unterbrochen. Manche Netze blockieren den Verbindungsaufbau.');
    if(peer.connectionState==='connected'&&game)status('');
  };
}
form.onsubmit=async event=>{
  event.preventDefault();if(session)return;
  const options=Object.fromEntries(new FormData(form));
  for(const key of ['size',...Object.keys(modes[options.mode])])options[key]=Number(options[key]);
  try{
    match=new Match(E,options,nameOf(options.name)||'Schwarz');
    connect(1);configure(peer.createDataChannel('oppidum'));
    $('connectTitle').textContent='Schick den Einladungscode an Weiß';
    $('answerLabel').hidden=$('accept').hidden=false;
    status('Einladungscode wird erzeugt …');
    await prepareCode(await peer.createOffer());
    if(!game)status('Anschließend den Antwortcode von Weiß übernehmen.');
  }catch(error){status('Einladung: '+error.message);}
};
join.onsubmit=async event=>{
  event.preventDefault();if(session)return;
  const options=Object.fromEntries(new FormData(join));
  try{
    const offer=await decode(options.code,'offer');
    connect(2);peer.ondatachannel=event=>configure(event.channel,nameOf(options.name));
    $('connectTitle').textContent='Schick den Antwortcode an Schwarz';
    status('Antwortcode wird erzeugt …');
    await peer.setRemoteDescription(offer);await prepareCode(await peer.createAnswer());
    if(!game)status('Sobald Schwarz deinen Code übernimmt, beginnt die Partie.');
  }catch(error){status('Einladung: '+error.message);}
};
$('accept').onclick=async()=>{
  try{
    $('accept').disabled=true;
    await peer.setRemoteDescription(await decode($('answer').value,'answer'));
    if(!game)status('Warte auf die Direktverbindung …');
  }catch(error){$('accept').disabled=false;status('Antwortcode: '+error.message);}
};
$('copyCode').onclick=async()=>{
  const field=$('outgoing');
  if(!field.value)return;
  try{await navigator.clipboard.writeText(field.value);status('Code kopiert.');}
  catch{field.select();status('Code markiert. Kopiere ihn mit Strg+C oder ⌘C.');}
};
$('cancel').onclick=()=>location.reload();
function legalActions(){
  if(game.started===null||closed||waiting||channel?.readyState!=='open'||game.outcome||game.state.turn!==session.side)return [];
  return E.actions(game.state);
}
function submit(action){
  if(!legalActions().some(a=>a.type===action.type&&a.from===action.from&&a.to===action.to))return;
  if(session.side===1){match.move(1,game.state.ply,action,now());publish();}
  else{send({type:'move',action,ply:game.state.ply});waiting=true;render();}
}
function choose(index){
  if(!game)return;
  const actions=legalActions();
  const targets=actions.filter(a=>a.to===index&&(selected===null?a.from===undefined:a.from===selected));
  if(targets.length===1){submit(targets[0]);return;}
  if(targets.length>1){choiceTarget=index;render();return;}
  choiceTarget=null;
  selected=index!==selected&&actions.some(a=>a.from===index)?index:null;render();
}
function tick(){
  if(!game||!timing)return;
  const {settings,state,clocks,deadline,started,outcome}=game;
  const elapsed=started&&!outcome?Math.max(0,timing.server+performance.now()-timing.received-started):0;
  for(const p of [1,2]){
    const element=$('timer'+p);if(!element)continue;
    const active=state.turn===p&&!outcome,clock=clocks[p];
    let text='Ohne Uhr';
    const format=ms=>(Math.max(0,ms)/1000).toFixed(1)+' s';
    if(settings.mode==='move')text=format(active&&started?settings.move*1000-elapsed:settings.move*1000);
    if(['absolute','fischer','delay','byo'].includes(settings.mode)){
      const used=active?elapsed:0,delay=(settings.delay??0)*1000;
      text=format(clock.main-Math.max(0,used-delay));
      if(settings.mode==='delay'&&active&&started&&used<delay)text+=' · Vorlauf '+format(delay-used);
      if(settings.mode==='byo'){
        const period=settings.period*1000,overtime=Math.max(0,used-clock.main);
        const lost=Math.floor(overtime/period);
        text+=overtime||!clock.main?' · '+Math.max(0,clock.periods-lost)+' × '+format(overtime>=period*clock.periods?0:period-overtime%period):' · '+clock.periods+' Perioden';
      }
    }
    if(active&&deadline&&timing.server+performance.now()-timing.received>=deadline)text=p===2?'0.0 s · Übertragungsfrist':'0.0 s · warte auf Bestätigung';
    element.textContent=text;
  }
}
function render(){
  const {state,names,outcome}=game,n=state.size;
  const actions=legalActions(),targets=actions.filter(a=>selected!==null&&a.from===selected).map(a=>a.to);
  $('pass').disabled=!actions.some(a=>a.type==='pass');
  $('turn').textContent=outcome?(outcome.winner?names[outcome.winner]+' gewinnt':'Remis')+(outcome.reason==='Zeit abgelaufen'?' · Zeit abgelaufen':''):
    game.started!==null?(waiting?'Zug wird übertragen …':names[state.turn]+' ist am Zug'): 'Warte auf Weiß.';
  $('last').textContent=game.last||'';
  $('scores').replaceChildren(...[1,2].map(p=>{
    const box=document.createElement('div'),title=document.createElement('strong'),timer=document.createElement('span');
    box.className='seat'+(state.turn===p&&game.started&&!outcome?' active':'');
    title.textContent=(p===1?'Schwarz':'Weiß')+(p===session.side?' · Du':'')+(names[p]?' · '+names[p]:'');
    timer.id='timer'+p;timer.className='timer';
    box.append(title,E.score(state,p)+' Punkte · Vorrat '+state.reserve[p]+' · ',timer);return box;
  }));
  const options=choiceTarget===null?[]:actions.filter(a=>a.from===selected&&a.to===choiceTarget);
  $('moveHint').textContent=!actions.length?'':options.length>1
    ? 'Wähle den Zug nach '+E.coord(choiceTarget,n)+'.'
    : selected===null?'Tippe ein freies Feld zum Siedeln oder wähle einen eigenen Trupp. Auf der eigenen Grundlinie kannst du einen Trupp bilden.'
    : 'Tippe ein markiertes Ziel. Tippe den Trupp erneut, um die Auswahl aufzuheben.';
  $('choices').replaceChildren(...options.map(action=>{
    const button=document.createElement('button');
    button.textContent={slide:'Ganzer Verband zieht',hop:state.board[action.to]===0?'Trupp gründet Siedlung': 'Trupp übertragen',forge:'Oppidum gründen'}[action.type];
    button.onclick=()=>submit(action);return button;
  }));
  const board=$('board');
  const layout=n+':'+session.side;
  if(boardLayout!==layout){
    boardLayout=layout;
    board.style.setProperty('--board-size',n);
    board.replaceChildren(...Array.from({length:n*n},(_,screen)=>{
      const i=session.side===1?n*n-1-screen:screen;
      const button=document.createElement('button');
      button.className='cell'+((Math.floor(screen/n)+screen%n)%2?' alt':'')+
        (E.home(i,1,n)||E.home(i,2,n)?' home':'');
      button.dataset.cell=i;
      button.onclick=()=>choose(i);
      return button;
    }));
  }
  for(const button of board.children){
    const i=Number(button.dataset.cell),v=state.board[i],p=E.owner(v);
    button.classList.toggle('target',targets.includes(i));
    button.classList.toggle('selected',selected===i);
    if(button.dataset.piece===String(v))continue;
    button.dataset.piece=v;
    button.ariaLabel=E.coord(i,n)+(p?' '+(p===1?'Schwarz':'Weiß'):' frei');
    button.replaceChildren();
    if(v){
      const piece=document.createElement('span');
      piece.className='piece'+(p===2?' white':'')+(E.isCastle(v)?' fort':'');
      piece.textContent=E.isCarrier(v,p)?'●':'';
      button.append(piece);
    }
  }
  if(viewMode&&view)view.renderState(state,selected,targets,null);
  tick();
}
function setRotation(enabled){
  rotating=enabled;
  view.down=null;
  view.controls.enabled=enabled;
  $('placeMode').setAttribute('aria-pressed',String(!enabled));
  $('rotateMode').setAttribute('aria-pressed',String(enabled));
}
$('placeMode').onclick=()=>setRotation(false);
$('rotateMode').onclick=()=>setRotation(true);
$('view').onclick=async()=>{
  const button=$('view');button.disabled=true;
  try{
    if(!viewMode&&!view){
      const {BoardView}=await import('./scene.js');view=new BoardView($('canvas'),index=>{if(viewMode&&!rotating)choose(index);});
      view.controls.enableDamping=false;
      view.setSmoke(false);
    }
    viewMode=!viewMode;$('stage').hidden=!viewMode;$('board').hidden=viewMode;
    if(viewMode){setRotation(false);view.setSide(session.side);}
    $('viewTools').hidden=!viewMode;
    view.setActive(viewMode);
    button.textContent=viewMode?'2D-Ansicht':'3D-Ansicht';
    button.setAttribute('aria-pressed',String(viewMode));render();
  }catch{status('3D konnte auf diesem Gerät nicht gestartet werden.');}
  finally{button.disabled=false;}
};
$('resetView').onclick=()=>view?.setSide(session.side);
$('pass').onclick=()=>submit({type:'pass'});
$('leave').onclick=()=>location.reload();
setInterval(()=>{
  if(match&&session?.side===1&&!closed&&match.expire(now()))publish();
  tick();
},100);
setInterval(()=>{
  if(session?.side===2&&channel?.readyState==='open'&&!game?.outcome)send({type:'ping',sent:now()});
},3000);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
