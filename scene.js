import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createCastleGeometry,CASTLE_HEIGHT} from './castle-geometry.js';
const SURFACE=.16,LENS=.16;
function texture(){const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.fillStyle='#b78c5b';x.fillRect(0,0,512,512);for(let y=0;y<512;y++){const v=Math.sin(y*.13)*6+Math.sin(y*.92)*2;x.strokeStyle=v>0?'rgba(255,233,184,.10)':'rgba(69,38,16,.08)';x.beginPath();for(let a=0;a<=512;a+=8)x.lineTo(a,y+Math.sin(a*.017+y*.09)*2);x.stroke();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
function smokeTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,2,64,64,64);g.addColorStop(0,'rgba(255,255,255,.65)');g.addColorStop(.35,'rgba(255,255,255,.38)');g.addColorStop(.7,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
function label(text){const c=document.createElement('canvas');c.width=128;c.height=64;const x=c.getContext('2d');x.font='35px Georgia';x.fillStyle='#604829';x.textAlign='center';x.textBaseline='middle';x.fillText(text,64,32);const m=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false});const s=new THREE.Sprite(m);s.scale.set(.27,.135,1);return s;}
export class BoardView{
 constructor(canvas,onCell){
  this.canvas=canvas;this.onCell=onCell;this.active=true;this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog('#17261f',18,35);
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.camera=new THREE.PerspectiveCamera(36,1,.1,60);this.controls=new OrbitControls(this.camera,canvas);this.controls.target.set(0,.1,0);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=7;this.controls.maxDistance=17;this.controls.maxPolarAngle=Math.PI*.43;this.controls.addEventListener('change',()=>this.dirty=true);
  this.scene.add(new THREE.HemisphereLight('#fff5de','#3d4e44',2.4));const sun=new THREE.DirectionalLight('#ffe7c8',3.1);sun.position.set(-4,10,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=sun.shadow.camera.bottom=-5;sun.shadow.camera.right=sun.shadow.camera.top=5;sun.shadow.normalBias=.015;sun.shadow.bias=-.0001;this.scene.add(sun);const fill=new THREE.DirectionalLight('#ccdff0',1.3);fill.position.set(6,5,-6);this.scene.add(fill);
  const wood=texture();const body=new THREE.Mesh(new THREE.BoxGeometry(7.15,.4,7.15),new THREE.MeshStandardMaterial({map:wood,color:'#5c4027',roughness:.72}));body.position.y=-.075;body.castShadow=true;body.receiveShadow=true;this.scene.add(body);
  const top=new THREE.Mesh(new THREE.BoxGeometry(6.94,.06,6.94),new THREE.MeshStandardMaterial({map:wood,color:'#e0bc89',roughness:.63}));top.position.y=.125;top.receiveShadow=true;this.scene.add(top);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:'#192820',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-.29;floor.receiveShadow=true;this.scene.add(floor);
  this.board=new THREE.Group();this.tokens=new THREE.Group();this.markers=new THREE.Group();this.smoke=new THREE.Group();this.scene.add(this.board,this.tokens,this.markers,this.smoke);
  const points=[[0,0],[.20,0],[.29,.014],[.35,.045],[.37,.08],[.35,.116],[.29,.146],[.20,.16],[0,.16]].map(([x,y])=>new THREE.Vector2(x,y));
  this.lens=new THREE.LatheGeometry(points,48);this.castle=createCastleGeometry();
  this.materials={black:new THREE.MeshStandardMaterial({color:'#121619',roughness:.32,metalness:.10}),white:new THREE.MeshStandardMaterial({color:'#f4f1e8',roughness:.36,metalness:.03}),blackP:new THREE.MeshStandardMaterial({color:'#101418',roughness:.45,metalness:.13,flatShading:true}),whiteP:new THREE.MeshStandardMaterial({color:'#faf8f0',roughness:.46,metalness:.02,flatShading:true})};
  this.ring=new THREE.RingGeometry(1,1.055,48);this.markerMaterials={selected:new THREE.MeshBasicMaterial({color:'#ffe1a3',side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false}),target:new THREE.MeshBasicMaterial({color:'#ebf3b0',side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false})};
  this.markerMaterials.attack=new THREE.MeshBasicMaterial({color:'#fa9c7b',side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false});this.markerMaterials.forge=new THREE.MeshBasicMaterial({color:'#c6afe7',side:THREE.DoubleSide,transparent:true,opacity:.95,depthWrite:false});
  this.smokeMap=smokeTexture();this.particles=[];this.smokeEnabled=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.pickables=[];this.tiles=[];this.dirty=true;
  canvas.addEventListener('pointerdown',e=>this.down={x:e.clientX,y:e.clientY,button:e.button});canvas.addEventListener('pointerup',e=>{if(!this.down||this.down.button!==0||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>6)return;const b=canvas.getBoundingClientRect();this.pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects([...this.pickables,...this.tiles],false)[0];if(hit)this.onCell(hit.object.userData.cell);});
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.setSide(1);this.resize();
  let last=0;const frame=t=>{requestAnimationFrame(frame);if(!this.active)return;this.controls.update();if(document.hidden||t-last<30)return;last=t;if(this.smokeEnabled&&this.particles.length){this.animateSmoke(t/1000);this.dirty=true;}if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}};requestAnimationFrame(frame);
 }
 setActive(enabled){this.active=enabled;if(enabled)this.resize();}
 resize(){const b=this.canvas.parentElement.getBoundingClientRect();if(b.width<=0||b.height<=0)return;this.renderer.setSize(b.width,b.height,false);this.camera.aspect=b.width/b.height;this.camera.updateProjectionMatrix();this.dirty=true;}
 setSide(p){const sign=p===1?-1:1;this.camera.position.set(0,8.3,sign*8.2);this.controls.target.set(0,.15,0);this.controls.update();this.dirty=true;}
 point(i){return new THREE.Vector3((i%this.n+.5)*this.cell-3,SURFACE,(Math.floor(i/this.n)+.5)*this.cell-3);}
 clearBoard(){this.board.traverse(o=>{o.geometry?.dispose();if(o.material){if(o.material.map)o.material.map.dispose();o.material.dispose();}});this.board.clear();}
 makeBoard(n){
  this.clearBoard();this.n=n;this.cell=6/n;this.tiles=[];
  const line=[];for(let i=0;i<=n;i++){const p=-3+i*this.cell;line.push(-3,SURFACE+.003,p,3,SURFACE+.003,p,p,SURFACE+.003,-3,p,SURFACE+.003,3);}
  this.board.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(line,3)),new THREE.LineBasicMaterial({color:'#715236',transparent:true,opacity:.7})));
  const geometry=new THREE.PlaneGeometry(this.cell*.99,this.cell*.99);const mat=new THREE.MeshBasicMaterial({visible:false});
  for(let i=0;i<n*n;i++){const tile=new THREE.Mesh(geometry,mat);tile.rotation.x=-Math.PI/2;tile.position.copy(this.point(i));tile.position.y+=.003;tile.userData.cell=i;this.tiles.push(tile);this.board.add(tile);}
  for(let i=0;i<n;i++){
   const p=-3+(i+.5)*this.cell;
   for(const z of [-3.19,3.19]){const l=label(String.fromCharCode(65+i));l.position.set(p,.19,z);l.scale.multiplyScalar(Math.min(1,this.cell/.65));this.board.add(l);}
   for(const x of [-3.22,3.22]){const l=label(String(n-i));l.position.set(x,.19,p);l.scale.multiplyScalar(Math.min(1,this.cell/.65));this.board.add(l);}
  }
  // Feine geometrische Randintarsien, korrekt an der jeweiligen Grundlinie.
  for(const [side,color] of [[-1,'#202827'],[1,'#fff3d9']]){
   const pts=[],z=side*3.39;pts.push(-3,.163,z,3,.163,z);
   for(let i=0;i<n;i++){const c=-3+(i+.5)*this.cell,w=Math.min(.12,this.cell*.17),d=.052;
    pts.push(c-w,.164,z,c,.164,z+d,c,.164,z+d,c+w,.164,z,c+w,.164,z,c,.164,z-d,c,.164,z-d,c-w,.164,z);
   }
   this.board.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pts,3)),new THREE.LineBasicMaterial({color,transparent:true,opacity:side===-1?.50:.78})));
  }
 }
 setSmoke(enabled){this.smokeEnabled=enabled;this.smoke.visible=enabled;this.dirty=true;}
 clearSmoke(state=null){const keep=[];for(const p of this.particles){if(state&&p.burst&&[p.color+4,p.color+6].includes(state.board[p.index]))keep.push(p);else{this.smoke.remove(p.sprite);p.sprite.material.dispose();}}this.particles=keep;}
 addSmoke(index,color,burst=false){
  const origin=this.point(index);for(let i=0;i<(burst?(color===1?44:18):5);i++){
   const mat=new THREE.SpriteMaterial({map:this.smokeMap,color:color===1?'#080b0c':'#fffdf7',transparent:true,opacity:0,depthWrite:false,blending:burst&&color===2?THREE.AdditiveBlending:THREE.NormalBlending});const sprite=new THREE.Sprite(mat);this.smoke.add(sprite);
   this.particles.push({sprite,index,origin,burst,born:performance.now()/1000,duration:burst?1.8+Math.random()*.9:2.5+Math.random()*2,phase:Math.random()*6.28,seed:Math.random(),color});
  }
 }
 animateSmoke(time){
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];let age=time-p.born;if(p.burst&&age>p.duration){this.smoke.remove(p.sprite);p.sprite.material.dispose();this.particles.splice(i,1);continue;}
   if(p.burst&&p.color===2){const t=age/p.duration,fade=Math.sin(Math.PI*t),angle=p.phase;
    p.sprite.position.set(p.origin.x+Math.cos(angle)*this.cell*.27,SURFACE+this.cell*(.4+t*.8),p.origin.z+Math.sin(angle)*this.cell*.27);
    p.sprite.scale.set(this.cell*(.055+.035*p.seed),this.cell*(.7+t*1.5),1);p.sprite.material.opacity=fade*.85;continue;}
   const t=p.burst?age/p.duration:(age/p.duration+p.seed)%1,angle=p.phase+time*(p.burst?.4:.25),radius=this.cell*(p.burst?.07+t*.45:.29+.10*Math.sin(t*3.14));
   p.sprite.position.set(p.origin.x+Math.cos(angle)*radius,SURFACE+this.cell*(p.burst?.06+t*.9:.025+t*.12),p.origin.z+Math.sin(angle)*radius);
   const scale=this.cell*(p.burst?.25+t*.62:.18+.24*t);p.sprite.scale.setScalar(scale*(p.burst&&p.color===1?1.35:1));
   p.sprite.material.opacity=Math.sin(Math.PI*t)*(p.burst?(p.color===1?.67:.59):(p.color===1?.28:.22));
  }
 }
 renderState(s,selected=null,targets=[],last=null,targetKinds={}){
  const boardKey=s.size+':'+s.board.join('');
  if(this.n!==s.size){this.clearSmoke();this.makeBoard(s.size);this.boardKey=null;}
  if(this.boardKey!==boardKey){
   this.tokens.clear();this.pickables=[];this.clearSmoke(s);
   const add=(geometry,material,i,height=0)=>{const m=new THREE.Mesh(geometry,material);m.scale.setScalar(this.cell);m.position.copy(this.point(i));m.position.y+=height*this.cell+.005;m.castShadow=true;m.receiveShadow=true;m.userData.cell=i;this.tokens.add(m);this.pickables.push(m);};
   s.board.forEach((v,i)=>{
    if(v===1||v===2)add(this.lens,v===1?this.materials.black:this.materials.white,i);
    if(v===3||v===4){const m=v===3?this.materials.black:this.materials.white;add(this.lens,m,i);add(this.lens,m,i,LENS);}
    if(v>=5){const black=v%2===1;add(this.castle,black?this.materials.blackP:this.materials.whiteP,i);if(v>=7)add(this.lens,black?this.materials.black:this.materials.white,i,CASTLE_HEIGHT);this.addSmoke(i,black?1:2);}
   });this.boardKey=boardKey;
  }
  this.markers.clear();
  const ring=(i,kind,radius)=>{const m=new THREE.Mesh(this.ring,this.markerMaterials[kind]);m.rotation.x=-Math.PI/2;m.scale.setScalar(radius*this.cell);m.position.copy(this.point(i));m.position.y+=.009;this.markers.add(m);};
  if(selected!==null)ring(selected,'selected',.43);for(const i of new Set(targets))ring(i,targetKinds[i]||'target',s.board[i]?.45:.12);
  if(last!==null&&last!==selected)ring(last,'selected',.48);
  this.smoke.visible=this.smokeEnabled;this.dirty=true;
 }
 burst(i,color){if(this.smokeEnabled)this.addSmoke(i,color,true);}
}
