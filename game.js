import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const state = {
  coins: Number(localStorage.getItem('catCoins') || 150),
  owned: JSON.parse(localStorage.getItem('catOwned') || '["rug"]')
};
const catalog = [
  {id:'plant',name:'Комнатное растение',emoji:'🪴',price:35,description:'Зелёный уголок для комнаты'},
  {id:'sofa',name:'Мягкий диван',emoji:'🛋️',price:55,description:'Место для кошачьего отдыха'},
  {id:'lamp',name:'Тёплая лампа',emoji:'💡',price:40,description:'Уютный вечерний свет'},
  {id:'ball',name:'Игрушечный мяч',emoji:'🧶',price:25,description:'Любимая игрушка Мурки'},
  {id:'bed',name:'Кошачья лежанка',emoji:'🧺',price:70,description:'Мягкая кроватка для сна'}
];

let scene, camera, renderer, controls, cat, clock;
const catParts = {};
let catAction = { type: 'idle', start: 0, duration: 0, from: new THREE.Vector3(), to: new THREE.Vector3() };
init3D();
renderShop();
renderWallet();
renderFurniture();
setupTabs();

function mat(color, roughness=.82, metalness=0) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness});
}
function mesh(parent, geometry, material, x=0,y=0,z=0) {
  const m=new THREE.Mesh(geometry,material);
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function box(parent,w,h,d,color,x,y,z, bevel=0) {
  return mesh(parent,new THREE.BoxGeometry(w,h,d),mat(color),x,y,z);
}
function ball(parent,r,color,x,y,z,sx=1,sy=1,sz=1) {
  const m=mesh(parent,new THREE.SphereGeometry(r,32,24),mat(color),x,y,z);
  m.scale.set(sx,sy,sz);return m;
}
function capsule(parent,r,len,color,x,y,z,rotZ=0) {
  const m=mesh(parent,new THREE.CapsuleGeometry(r,len,6,12),mat(color),x,y,z);
  m.rotation.z=rotZ;return m;
}

function init3D(){
  const host=$('scene');
  scene=new THREE.Scene();scene.background=new THREE.Color('#d9eafa');
  scene.fog=new THREE.Fog('#d9eafa',13,28);
  camera=new THREE.PerspectiveCamera(38,host.clientWidth/host.clientHeight,.1,100);
  camera.position.set(6.8,5.2,8.5);
  renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.setSize(host.clientWidth,host.clientHeight);host.appendChild(renderer.domElement);
  controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,1.15,0);controls.enableDamping=true;
  controls.maxPolarAngle=Math.PI/2.03;controls.minDistance=5;controls.maxDistance=13;
  clock=new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0xffffff,0x9b8aab,1.9));
  const sun=new THREE.DirectionalLight(0xfff2df,2.7);
  sun.position.set(-4,8,5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;
  sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;scene.add(sun);
  buildRoom();
  cat=buildCat();scene.add(cat);
  window.addEventListener('resize',resize);
  animate();
}

function buildRoom(){
  box(scene,9,.25,8,'#c99770',0,-.15,0);
  box(scene,9,5,.18,'#f7dce5',0,2.35,-4);
  box(scene,.18,5,8,'#f3cbdc',-4.5,2.35,0);
  for(let z=-3.5;z<4;z+=.65)box(scene,8.9,.025,.025,'#ad795b',0,-.005,z);
  box(scene,2.1,1.8,.08,'#8ac8e8',-1.8,2.65,-3.88);
  box(scene,2.2,.09,.1,'#fff8ef',-1.8,2.65,-3.78);
  box(scene,.09,1.9,.1,'#fff8ef',-1.8,2.65,-3.78);
  box(scene,.09,1.9,.1,'#fff8ef',-.75,2.65,-3.78);
  box(scene,2.2,.09,.1,'#fff8ef',-1.8,3.55,-3.78);
  const rug=mesh(scene,new THREE.CylinderGeometry(1.65,1.65,.06,64),mat('#e98eaa'),.5,.02,.7);
  rug.receiveShadow=true;
  mesh(scene,new THREE.CylinderGeometry(1.35,1.35,.065,64),mat('#f6c5d3'),.5,.035,.7);
  box(scene,9,.16,.12,'#fff4e9',0,.02,-3.86);
  box(scene,1.3,.75,.55,'#c88f6b',2.8,.38,-3.25);
  box(scene,1.38,.1,.62,'#f0c9a9',2.8,.8,-3.25);
}

function buildCat(){
  const root=new THREE.Group();
  const orange=mat('#d9914d'), orangeLight=mat('#efb66f'), cream=mat('#fff0d8');
  const pink=mat('#e88e9d'), dark=mat('#493b43'), green=mat('#78b879');
  // Body: rounded pear-shaped torso, bib and haunches
  ball(root,.62,'#df9a55',0,.83,0,1.05,.88,1.34);
  ball(root,.43,'#fff0d8',0,.79,.43,.92,.92,.46);
  ball(root,.36,'#d9914d',-.38,.57,-.12,.95,1.05,1.05);
  ball(root,.36,'#d9914d',.38,.57,-.12,.95,1.05,1.05);

  // Neck and head
  ball(root,.28,'#efb66f',0,1.31,.17,1,1,.9);
  const head=new THREE.Group();head.position.set(0,1.73,.23);root.add(head);catParts.head=head;
  ball(head,.55,'#efb66f',0,0,0,1.08,1,.94);

  // Ears with inset pink triangles and soft tufts
  for(const s of [-1,1]){
    const ear=mesh(head,new THREE.ConeGeometry(.245,.58,5),orangeLight,s*.36,.39,-.015);
    ear.rotation.z=s*-.18;ear.rotation.x=-.12;
    const inner=mesh(head,new THREE.ConeGeometry(.135,.36,5),pink,s*.36,.40,.115);
    inner.rotation.z=s*-.18;inner.rotation.x=-.12;
    ball(head,.07,'#f8d3a0',s*.27,.29,.13,.8,1,.8);
  }

  // Eyes, iris highlights, eyelids
  for(const s of [-1,1]){
    ball(head,.105,'#fffdf7',s*.205,.015,.455,.95,1.15,.45);
    ball(head,.066,'#6aa477',s*.205,.015,.49,.85,1.1,.4);
    ball(head,.034,'#24252a',s*.205,.015,.51,.8,1.2,.45);
    ball(head,.018,'#ffffff',s*.225,.052,.526,.8,1,.5);
    // eyebrows and freckles
    const brow=mesh(head,new THREE.TorusGeometry(.12,.012,8,24,Math.PI*.72),dark,s*.205,.16,.46);
    brow.rotation.z=s*.12;
    for(let j=0;j<3;j++)ball(head,.012,'#a97852',s*(.31+j*.035),-.12-(j%2)*.035,.46,.8,.8,.5);
  }

  // Muzzle cheeks, nose and mouth
  ball(head,.19,'#fff4e6',-.115,-.17,.43,1,.72,.65);
  ball(head,.19,'#fff4e6',.115,-.17,.43,1,.72,.65);
  ball(head,.065,'#e88798',0,-.115,.565,1,.72,.55);
  const mouthL=mesh(head,new THREE.TorusGeometry(.065,.012,8,20,Math.PI),dark,-.045,-.22,.55);
  const mouthR=mesh(head,new THREE.TorusGeometry(.065,.012,8,20,Math.PI),dark,.045,-.22,.55);
  mouthL.rotation.z=Math.PI;mouthR.rotation.z=Math.PI;
  // Whisker dots and thin whiskers
  for(const s of [-1,1]){
    for(let j=0;j<3;j++)ball(head,.014,'#9d765d',s*(.18+(j%2)*.04),-.19-j*.045,.55,.8,.8,.6);
    for(let j=0;j<3;j++){
      const whisk=mesh(head,new THREE.CylinderGeometry(.006,.006,.43,7),cream,s*.37,-.18-j*.055,.46);
      whisk.rotation.z=s*(Math.PI/2 + (j-1)*.13);
    }
  }

  // Paws: four articulated little legs with toes
  const legs=[];
  for(const x of [-.39,.39]){
    for(const z of [-.42,.43]){
      const leg=new THREE.Group();leg.position.set(x,.48,z);root.add(leg);
      capsule(leg,.13,.27,'#e6a35f',0,-.08,0);
      ball(leg,.15,'#f0b978',0,-.22,.04,1.05,.62,1.2);
      for(let t=-1;t<=1;t++)ball(leg,.014,'#bd8050',t*.055,-.275,.15,.8,.7,.7);
      legs.push(leg);
    }
  }
  catParts.legs=legs;

  // Stripes on forehead and back; curved tail with darker rings
  for(let i=0;i<3;i++){
    const stripe=mesh(head,new THREE.TorusGeometry(.16,.018,7,24,Math.PI*.65),orange,-.13+i*.13,.34,.40);
    stripe.rotation.z=Math.PI;
  }
  const tailPivot=new THREE.Group();tailPivot.position.set(0,.93,-.61);root.add(tailPivot);catParts.tail=tailPivot;
  const tailPoints=[
    new THREE.Vector3(0,0,0),new THREE.Vector3(.05,.12,-.16),
    new THREE.Vector3(.18,.25,-.29),new THREE.Vector3(.29,.42,-.36),
    new THREE.Vector3(.27,.61,-.35),new THREE.Vector3(.13,.72,-.31)
  ];
  const curve=new THREE.CatmullRomCurve3(tailPoints);
  const tail=mesh(tailPivot,new THREE.TubeGeometry(curve,40,.105,12,false),orangeLight);
  // ring bands along tail
  for(let i=1;i<=3;i++){
    const p=curve.getPoint(i/4);
    const ring=mesh(tailPivot,new THREE.TorusGeometry(.105-i*.006,.018,7,18),orange,p.x,p.y,p.z);
    ring.lookAt(p.clone().add(curve.getTangent(i/4)));
  }
  ball(tailPivot,.11,'#efb66f',.13,.72,-.31);
  root.position.set(.1,.05,.35);
  return root;
}

function addFurniture(id){
  const group=new THREE.Group();
  if(id==='plant'){
    box(group,.55,.35,.55,'#bd8061',0,.18,0);
    box(group,.07,.65,.07,'#57966d',0,.62,0);
    for(let i=0;i<5;i++)ball(group,.22,'#65b982',Math.sin(i*1.25)*.28,.75+(i%2)*.2,Math.cos(i*1.25)*.2,.7,1.2,.65);
    group.position.set(-2.8,0,-2.7);
  } else if(id==='sofa'){
    box(group,1.9,.48,.8,'#b78bd5',0,.35,0);box(group,1.9,.75,.25,'#9f72c2',0,.82,-.28);
    box(group,.25,.65,.85,'#a77bc9',-.85,.62,0);box(group,.25,.65,.85,'#a77bc9',.85,.62,0);
    group.position.set(2.1,0,1.5);
  } else if(id==='lamp'){
    box(group,.5,.12,.5,'#9b806e',0,.06,0);box(group,.07,1.35,.07,'#9b806e',0,.77,0);
    const shade=mesh(group,new THREE.ConeGeometry(.42,.5,32),mat('#ffe39a'),0,1.65,0);
    const glow=new THREE.PointLight('#ffd98a',1.2,4);glow.position.set(0,1.5,0);group.add(glow);
    group.position.set(3.25,0,-2.3);
  } else if(id==='ball'){
    ball(group,.23,'#f18bad',0,.24,0);ball(group,.08,'#fff2ce',.1,.38,.08);
    group.position.set(-1.3,0,.5);
  } else if(id==='bed'){
    box(group,1.15,.22,.9,'#c68c68',0,.13,0);box(group,.95,.18,.7,'#f3b6c8',0,.32,0);
    box(group,.35,.18,.28,'#fff4e9',-.25,.44,-.12);group.position.set(2.7,0,2.5);
  }
  scene.add(group);return group;
}
function renderFurniture(){
  const list=$('furnitureList');list.innerHTML='';
  state.owned.forEach(id=>{const item=catalog.find(x=>x.id===id);if(!item)return;const chip=document.createElement('span');chip.className='furniture-chip';chip.textContent=item.emoji+' '+item.name;list.append(chip);});
  scene.children.filter(o=>o.userData.shopItem).forEach(o=>scene.remove(o));
  state.owned.forEach(id=>{const obj=addFurniture(id);obj.userData.shopItem=true;});
}
function renderWallet(){$('coins').textContent=state.coins;localStorage.setItem('catCoins',state.coins);}
function renderShop(){
  $('shopItems').innerHTML='';
  catalog.forEach(item=>{
    const owned=state.owned.includes(item.id);
    const card=document.createElement('article');card.className='shop-item';
    card.innerHTML=`<div class="shop-emoji">${item.emoji}</div><h3>${item.name}</h3><p>${item.description}</p><button class="primary" ${owned?'disabled':''}>${owned?'Уже куплено':'🪙 '+item.price+' — Купить'}</button>`;
    card.querySelector('button').addEventListener('click',()=>{
      if(state.coins<item.price){alert('Пока не хватает монет. Сыграй в мини-игру!');return;}
      state.coins-=item.price;state.owned.push(item.id);
      localStorage.setItem('catOwned',JSON.stringify(state.owned));renderWallet();renderShop();renderFurniture();
    });
    $('shopItems').append(card);
  });
}
function setupTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));
}
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===name));
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));
  if(name==='home')resize();
}
function resize(){
  if(!renderer)return;const host=$('scene');const w=host.clientWidth,h=host.clientHeight;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
}
function setCatAction(type){
  if(!cat)return;
  const now=clock.getElapsedTime();
  const from=cat.position.clone();
  let to=from.clone(), duration=2.2;
  if(type==='walk'||type==='run'){
    const angle=Math.random()*Math.PI*2;
    const distance=type==='run'?2.15:1.35;
    to.x=THREE.MathUtils.clamp(from.x+Math.cos(angle)*distance,-2.9,2.9);
    to.z=THREE.MathUtils.clamp(from.z+Math.sin(angle)*distance,-2.5,2.8);
    duration=type==='run'?1.05:2.1;
  } else if(type==='jump'){duration=1.05;}
  else if(type==='sleep'){duration=4.5;}
  else if(type==='wash'){duration=3.2;}
  else if(type==='play'){duration=3.6;}
  catAction={type,start:now,duration,from,to};
  document.querySelectorAll('[data-cat-action]').forEach(b=>b.classList.toggle('active',b.dataset.catAction===type));
  const labels={walk:'🚶 Мурка прогуливается по комнате',run:'💨 Мурка весело бегает!',jump:'🐾 Прыг-скок! Отличный прыжок!',sleep:'💤 Мурка сладко спит…',wash:'🧼 Мурка умывается',play:'🧶 Мурка играет с воображаемым клубочком'};
  $('mood').textContent=labels[type]||'😺 Кошка счастлива';
}
function animate(){
  requestAnimationFrame(animate);
  const t=clock.getElapsedTime();
  controls.update();
  if(cat){
    const a=catAction, elapsed=t-a.start, p=THREE.MathUtils.clamp(elapsed/Math.max(a.duration,.01),0,1);
    const moving=(a.type==='walk'||a.type==='run');
    if(moving){
      const eased=p*p*(3-2*p);
      cat.position.x=THREE.MathUtils.lerp(a.from.x,a.to.x,eased);
      cat.position.z=THREE.MathUtils.lerp(a.from.z,a.to.z,eased);
      const dx=a.to.x-a.from.x,dz=a.to.z-a.from.z;
      if(Math.hypot(dx,dz)>.01)cat.rotation.y=Math.atan2(dx,dz);
    }
    if(p>=1 && a.type!=='idle'){
      catAction={type:'idle',start:t,duration:0,from:cat.position.clone(),to:cat.position.clone()};
      document.querySelectorAll('[data-cat-action]').forEach(b=>b.classList.remove('active'));
      $('mood').textContent='😺 Мурка довольна';
    }
    const active=catAction.type;
    const phase=t*(active==='run'?13:active==='walk'?7:5);
    cat.position.y=.05+Math.sin(t*2.1)*.018;
    cat.rotation.z=0;
    catParts.head.rotation.set(0,Math.sin(t*1.2)*.025,0);
    catParts.legs.forEach((leg,i)=>{
      let swing=moving?Math.sin(phase+i*Math.PI/2)*(active==='run'?.48:.25):Math.sin(t*2+i*Math.PI/2)*.018;
      if(active==='jump')swing=Math.sin(p*Math.PI)*.2*(i<2?1:-1);
      if(active==='sleep')swing=0;
      if(active==='play')swing=Math.sin(t*15+i*Math.PI/2)*.34;
      leg.rotation.x=swing;
    });
    catParts.tail.rotation.x=Math.sin(t*(active==='play'?6:2.8))*(active==='sleep'?.04:.18);
    catParts.tail.rotation.z=Math.sin(t*1.7)*.16;
    if(active==='jump'){
      cat.position.y+=Math.sin(p*Math.PI)*1.05;
      cat.rotation.z=Math.sin(p*Math.PI)*-.12;
    } else if(active==='sleep'){
      cat.position.y-=.035;
      catParts.head.rotation.z=.18;
      catParts.tail.rotation.z=.04;
    } else if(active==='wash'){
      catParts.head.rotation.z=Math.sin(t*8)*.12;
      catParts.legs[0].rotation.x=-.75+Math.sin(t*9)*.12;
    } else if(active==='play'){
      catParts.head.rotation.x=Math.sin(t*8)*.12;
      catParts.head.rotation.y=Math.sin(t*5)*.18;
      catParts.tail.rotation.z=Math.sin(t*8)*.35;
    }
  }
  renderer.render(scene,camera);
}document.querySelectorAll('[data-cat-action]').forEach(button=>{
  button.addEventListener('click',()=>setCatAction(button.dataset.catAction));
});

$('petBtn').addEventListener('click',()=>{
  $('mood').textContent='😻 Мурка мурлычет от счастья!';
  if(cat){catAction={type:'idle',start:clock.getElapsedTime(),duration:0,from:cat.position.clone(),to:cat.position.clone()};cat.rotation.y+=Math.PI/8;catParts.head.rotation.x=-.12;setTimeout(()=>{if(catParts.head)catParts.head.rotation.x=0;},450);}
  setTimeout(()=>$('mood').textContent='😺 Кошка счастлива',1800);
});

// Игра на поиск пар
$('memoryStart').addEventListener('click',startMemory);
function startMemory(){
  const host=$('miniGame');host.classList.remove('hidden');
  const icons=['🍓','🍋','🍇','🍒','🍉','🥝','🍑','🍍'];
  const deck=[...icons,...icons].sort(()=>Math.random()-.5);
  let opened=[],matched=0,locked=false,paid=false;
  host.innerHTML='<h2>Фруктовый пазл</h2><p>Открой одинаковые пары!</p><div class="memory-grid"></div><p id="memoryStatus">Найдено пар: 0 из 8</p><button class="primary" id="closeMemory">Закрыть игру</button>';
  const grid=host.querySelector('.memory-grid');
  deck.forEach(icon=>{
    const btn=document.createElement('button');btn.className='memory-card';btn.textContent='?';
    btn.addEventListener('click',()=>{
      if(locked||btn.classList.contains('revealed')||btn.dataset.done)return;
      btn.textContent=icon;btn.classList.add('revealed');opened.push({btn,icon});
      if(opened.length===2){
        locked=true;
        if(opened[0].icon===opened[1].icon){
          opened.forEach(x=>x.btn.dataset.done='1');matched++;opened=[];locked=false;
          host.querySelector('#memoryStatus').textContent=`Найдено пар: ${matched} из 8`;
          if(matched===8&&!paid){paid=true;state.coins+=25;renderWallet();host.querySelector('#memoryStatus').textContent='Победа! +25 монет 🪙';}
        }else{
          setTimeout(()=>{opened.forEach(x=>{x.btn.textContent='?';x.btn.classList.remove('revealed');});opened=[];locked=false;},750);
        }
      }
    });
    grid.append(btn);
  });
  host.querySelector('#closeMemory').addEventListener('click',()=>host.classList.add('hidden'));
}
