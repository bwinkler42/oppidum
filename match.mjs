import {validateSettings,initialClock,deadline,spend} from './clock.mjs';

const whiteGraceMs=2000;

export class Match {
  constructor(engine,settings,name){
    this.engine=engine;
    this.settings=validateSettings(settings);
    this.names=['',name,''];
    this.state=engine.initial(settings.size);
    this.clocks=[null,initialClock(settings),initialClock(settings)];
    this.started=null;
    this.outcome=null;
    this.last=null;
  }
  join(name,now){
    if(this.started!==null)throw Error('Die Partie läuft bereits.');
    this.names[2]=name;
    this.started=now;
  }
  turnDeadline(){
    return deadline(this.settings,this.clocks[this.state.turn],this.started);
  }
  expiresAt(){
    const end=this.turnDeadline();
    return end===null?null:end+(this.state.turn===2?whiteGraceMs:0);
  }
  expire(now){
    const end=this.expiresAt();
    if(this.outcome||end===null||now<end)return false;
    this.outcome={winner:3-this.state.turn,reason:'Zeit abgelaufen'};
    return true;
  }
  move(side,ply,action,now){
    if(this.expire(now)||this.outcome||this.started===null||side!==this.state.turn||ply!==this.state.ply)return false;
    if(!this.engine.legal(this.state,action))return false;
    const next=this.engine.apply(this.state,action);
    this.clocks[side]=spend(this.settings,this.clocks[side],Math.min(now,(this.turnDeadline()??(now+1))-1)-this.started);
    this.state=next.state;
    this.last=this.engine.describe(action,next.effect,this.state.size);
    this.started=now;
    this.outcome=this.state.result;
    return true;
  }
  snapshot(){
    const {seen,...state}=this.state;
    return {state,settings:this.settings,clocks:this.clocks,names:this.names,started:this.started,
      outcome:this.outcome,last:this.last,deadline:this.outcome?null:this.turnDeadline()};
  }
}
