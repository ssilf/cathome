import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const rand = (n) => Math.floor(Math.random()*n);
const shuffle = (arr) => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];} return a; };
const STORAGE_KEY = 'murkin-world-save-v1';

const DEFAULT_STATE = {
  coins:180, xp:0, level:1, coat:'cream', hat:'none',
  owned:['rug','bed','plant','sofa'], seeds:5,
  cat:{hunger:74,happy:82,energy:76,clean:88},
  garden:Array.from({length:6},()=>null),
  stats:{feeds:0,harvests:0,miniGames:0,furnitureBought:0},
  claimed:[], sound:true
};
function freshState(){ return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
function loadState(){
  const state=freshState();
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved=JSON.parse(raw);
      Object.assign(state,saved);
      state.cat={...DEFAULT_STATE.cat,...(saved.cat||{})};
      state.stats={...DEFAULT_STATE.stats,...(saved.stats||{})};
      state.garden=Array.isArray(saved.garden)?saved.garden:DEFAULT_STATE.garden;
      state.owned=Array.isArray(saved.owned)?saved.owned:DEFAULT_STATE.owned;
      state.claimed=Array.isArray(saved.claimed)?saved.claimed:[];
    } else {
      const old=JSON.parse(localStorage.getItem('puzzlehome')||'null');
      if(old){
        state.coins=Math.max(state.coins,Number(old.coins)||0);
        const legacy={rug:'rug',plant:'plant',lamp:'lamp',pic:'picture',sofa:'sofa',bed:'bed',tv:'bookshelf'};
        for(const id of (old.own||[])){ if(legacy[id]&&!state.owned.includes(legacy[id]))state.owned.push(legacy[id]); }
      }
    }
  }catch(err){ console.warn('Не удалось прочитать сохранение — начнём новую игру.',err); }
  state.coins=Math.max(0,Number(state.coins)||0);
  state.xp=Math.max(0,Number(state.xp)||0);
  state.level=Math.max(1,Number(state.level)||1);
  return state;
}
let S=loadState();
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}catch(e){notify('Браузер не разрешил сохранить прогресс.');}}
function notify(message){const stack=$('#toastStack');if(!stack)return;const el=document.createElement('div');el.className='toast';el.textContent=message;stack.append(el);setTimeout(()=>el.remove(),2800);}
function gainXP(amount){
  S.xp+=amount;
  let needed=S.level*100;
  while(S.xp>=needed){S.xp-=needed;S.level++;S.coins+=50;notify(`Новый уровень ${S.level}! Бонус: 50 монет ⭐`);needed=S.level*100;}
}
function updateHeader(){
  $('#coinCount').textContent=S.coins;
  $('#levelCount').textContent=`${S.level} уровень`;
  $('#xpText').textContent=`${S.xp} / ${S.level*100}`;
  $('#xpFill').style.width=`${S.xp/(S.level*100)*100}%`;
}
function addCoins(amount){S.coins=Math.max(0,S.coins+amount);updateHeader();save();}
function progress(key,amount=1){S.stats[key]=(S.stats[key]||0)+amount;save();}

const FURNITURE=[
  {id:'rug',name:'Пушистый ковёр',emoji:'🧶',price:0,desc:'Мягкое место для отдыха'},
  {id:'bed',name:'Кроватка Мурки',emoji:'🛏️',price:0,desc:'Сладкие кошачьи сны'},
  {id:'plant',name:'Комнатный цветок',emoji:'🪴',price:0,desc:'Немного зелени дома'},
  {id:'sofa',name:'Персиковый диван',emoji:'🛋️',price:0,desc:'Место для всей семьи'},
  {id:'lamp',name:'Тёплый торшер',emoji:'💡',price:45,desc:'Мягкий вечерний свет'},
  {id:'bookshelf',name:'Книжный шкаф',emoji:'📚',price:65,desc:'Книги и маленькие секреты'},
  {id:'piano',name:'Мини-пианино',emoji:'🎹',price:90,desc:'Музыка для уютных вечеров'},
  {id:'aquarium',name:'Аквариум',emoji:'🐠',price:110,desc:'Рыбки для наблюдения'},
  {id:'catTree',name:'Кошачий комплекс',emoji:'🌳',price:130,desc:'Лестницы и площадки'},
  {id:'tv',name:'Телевизор',emoji:'📺',price:150,desc:'Мультики после игр'},
  {id:'windowSeat',name:'Подоконник-мечта',emoji:'🪟',price:175,desc:'Лучшее место смотреть на сад'}
];
const COATS=[
  {id:'cream',name:'Сливочная',color:'#e7c79d',price:0,emoji:'🐈'},
  {id:'orange',name:'Рыжая',color:'#d98b4b',price:70,emoji:'🐈'},
  {id:'gray',name:'Серебристая',color:'#9da8b6',price:80,emoji:'🐈‍⬛'},
  {id:'snow',name:'Снежная',color:'#f4eee4',price:100,emoji:'🐈'},
  {id:'calico',name:'Трёхцветная',color:'#d49b6b',price:130,emoji:'🐈'}
];
const HATS=[
  {id:'none',name:'Без аксессуара',emoji:'—',price:0},
  {id:'flower',name:'Веночек',emoji:'🌼',price:60},
  {id:'crown',name:'Корона',emoji:'👑',price:140},
  {id:'witch',name:'Шляпа волшебницы',emoji:'🧙',price:100},
  {id:'bow',name:'Розовый бантик',emoji:'🎀',price:55}
];
const QUESTS=[
  {id:'feed',title:'Позаботься о Мурке',desc:'Покорми кошечку один раз',goal:1,key:'feeds',reward:35,emoji:'🥣'},
  {id:'garden',title:'Первый урожай',desc:'Собери урожай в саду',goal:1,key:'harvests',reward:45,emoji:'🌻'},
  {id:'games',title:'Игровое настроение',desc:'Сыграй в мини-игры два раза',goal:2,key:'miniGames',reward:50,emoji:'🎮'},
  {id:'decor',title:'Уютный дом',desc:'Купи новый предмет мебели',goal:1,key:'furnitureBought',reward:40,emoji:'🛋️'}
];
const coatById=id=>COATS.find(x=>x.id===id)||COATS[0];
const furnitureById=id=>FURNITURE.find(x=>x.id===id);

let activeView='home', worldMode='home', activeGameCleanup=null, world=null;
function showView(view){
  activeView=view;
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#worldLayout').classList.toggle('hidden',view==='games');
  $('#gameView').classList.toggle('hidden',view!=='games');
  if(view==='games'){renderGames();return;}
  if(activeGameCleanup){activeGameCleanup();activeGameCleanup=null;}
  renderPanel(view);
  if(view==='garden'){worldMode='garden';world?.setMode('garden');updateSceneLabels();}
  else {worldMode='home';world?.setMode('home');updateSceneLabels();}
}
function updateSceneLabels(){
  const garden=worldMode==='garden';
  $('#sceneEyebrow').textContent=garden?'ЗЕЛЁНЫЙ УГОЛОК ПРИКЛЮЧЕНИЙ':'ТВОЙ УЮТНЫЙ УГОЛОК';
  $('#sceneTitle').textContent=garden?'Сад Мурки':'Домик Мурки';
  $('#sceneCaption').innerHTML=garden?'<span>🌷</span> Посади цветы и вырасти урожай':'<span>☀️</span> Уютный день в домике';
  $$('.scene-tab').forEach(b=>b.classList.toggle('active',b.dataset.world===worldMode));
}
function statBar(label,icon,value,type){
  return `<div class="stat-row"><span>${icon} ${label}</span><div class="stat-track"><i class="stat-fill ${type}" style="width:${clamp(value,0,100)}%"></i></div><b>${Math.round(value)}%</b></div>`;
}
function catPanel(){
  const c=S.cat;
  return `<div class="panel-heading"><div><h2>Мурка дома 🐾</h2><p>Ей нравится, когда о ней заботятся</p></div><span class="soft-tag">твой питомец</span></div>
    <div class="cat-profile"><div class="cat-avatar">${coatById(S.coat).emoji}</div><div><strong>Мурка</strong><small>${coatById(S.coat).name} кошечка · уровень дружбы ${Math.floor((c.happy+c.clean)/20)}</small></div></div>
    <div class="stat-list">${statBar('Сытость','🥣',c.hunger,'hunger')}${statBar('Радость','💗',c.happy,'happy')}${statBar('Энергия','⚡',c.energy,'energy')}${statBar('Чистота','🫧',c.clean,'clean')}</div>
    <div class="section-label">Что сделать вместе?</div>
    <div class="action-grid">
      <button class="action-btn" data-action="feed"><span>🥣</span>Покормить</button>
      <button class="action-btn" data-action="pet"><span>💗</span>Погладить</button>
      <button class="action-btn" data-action="play"><span>🧶</span>Поиграть</button>
      <button class="action-btn" data-action="sleep"><span>💤</span>Уложить спать</button>
      <button class="action-btn" data-action="wash"><span>🛁</span>Искупать</button>
      <button class="action-btn" data-action="walk"><span>🐾</span>Прогуляться</button>
    </div>
    <div class="note-box">Мурка умеет ходить, бегать, прыгать, спать, умываться и играть. Её настроение меняется от твоих действий.</div>`;
}
function renderPanel(view){
  const panel=$('#panel');
  if(view==='home'){
    panel.innerHTML=catPanel()+`<div class="section-label">Твой дом</div><div class="feature-grid">
      <div class="feature-card"><div class="big-emoji">🛋️</div><strong>Обустраивай комнаты</strong><small>Покупай мебель и создавай уют</small></div>
      <div class="feature-card"><div class="big-emoji">🧸</div><strong>Играй с Муркой</strong><small>Погладь, покорми или позови играть</small></div>
    </div>`;
  }else if(view==='cat'){
    panel.innerHTML=catPanel()+`<div class="section-label">Прогулки и настроение</div>
      <div class="action-grid">
        <button class="action-btn" data-action="run"><span>💨</span>Побегать</button>
        <button class="action-btn" data-action="jump"><span>🐈</span>Прыгнуть</button>
        <button class="action-btn" data-action="wash"><span>🧼</span>Умыться</button>
      </div><div class="note-box">Совет: игра повышает радость, но тратит энергию. Сон помогает восстановить силы.</div>`;
  }else if(view==='garden'){
    panel.innerHTML=`<div class="panel-heading"><div><h2>Сад Мурки 🌷</h2><p>Посади семена, поливай и собирай урожай</p></div><span class="soft-tag">🌱 ${S.seeds} семян</span></div>
      <div class="feature-card"><strong>Как выращивать?</strong><small>Нажми «Посадить», затем трижды полей растение. Когда оно зацветёт, можно собирать урожай и монеты.</small></div>
      <div class="garden-grid">${S.garden.map((plot,i)=>gardenPlotHTML(plot,i)).join('')}</div>
      <button class="secondary-btn full-btn" id="buySeeds">🌱 Купить 3 семечка · 20 🪙</button>
      <div class="note-box">За собранный урожай ты получаешь монеты, опыт и иногда дополнительные семена.</div>`;
  }else if(view==='shop'){
    panel.innerHTML=`<div class="panel-heading"><div><h2>Магазин уюта 🛍️</h2><p>Покупки появятся в твоём мире</p></div><span class="soft-tag">🪙 ${S.coins}</span></div>
      <div class="section-label">Мебель и украшения</div><div class="shop-list">${FURNITURE.map(item=>shopItemHTML(item,S.owned.includes(item.id),'furniture')).join('')}</div>
      <div class="section-label">Окрасы Мурки</div><div class="shop-list">${COATS.map(item=>shopItemHTML({...item,emoji:'🐱',desc:'Новый красивый окрас'},S.coat===item.id||item.price===0&&item.id==='cream','coat')).join('')}</div>
      <div class="section-label">Аксессуары</div><div class="shop-list">${HATS.map(item=>shopItemHTML({...item,desc:'Украшение для Мурки'},S.hat===item.id,'hat')).join('')}</div>`;
  }else if(view==='quests'){
    panel.innerHTML=`<div class="panel-heading"><div><h2>Задания и награды 📜</h2><p>Маленькие дела ведут к большим приключениям</p></div><span class="soft-tag">⭐ ${S.level} уровень</span></div>
      <div class="quest-list">${QUESTS.map(q=>questHTML(q)).join('')}</div>
      <div class="note-box">За повышение уровня ты получаешь 50 монет. Прогресс сохраняется в этом браузере.</div>`;
  }
}
function gardenPlotHTML(plot,i){
  const plant=plot?['🌱','🌿','🌼','🌻'][clamp(plot.stage,0,3)]:'🟤';
  const title=plot?(plot.stage>=3?'Урожай готов!':'Растение растёт'):'Свободная грядка';
  const action= !plot?`<button data-plot="plant" data-index="${i}" ${S.seeds<1?'disabled':''}>Посадить</button>`:
    plot.stage>=3?`<button data-plot="harvest" data-index="${i}">Собрать урожай</button>`:
    `<button data-plot="water" data-index="${i}">💧 Полить (${plot.stage}/3)</button>`;
  return `<div class="plot-card"><div class="plot-emoji">${plant}</div><strong>${title}</strong><small>${plot?`Полив: ${plot.stage} из 3`:'Нужны семена'}</small>${action}</div>`;
}
function shopItemHTML(item,owned,type){
  const equipped=(type==='coat'&&S.coat===item.id)||(type==='hat'&&S.hat===item.id);
  let button;
  if(type==='furniture')button=owned?'<button class="owned" disabled>Куплено</button>':`<button data-buy="${type}:${item.id}">🪙 ${item.price}</button>`;
  else button=equipped?'<button class="owned" disabled>Надето</button>':owned?`<button class="owned" data-equip="${type}:${item.id}">Выбрать</button>`:`<button data-buy="${type}:${item.id}">🪙 ${item.price}</button>`;
  return `<div class="shop-item"><div class="shop-icon">${item.emoji||'✨'}</div><div><strong>${item.name}</strong><small>${item.desc||''}</small></div>${button}</div>`;
}
function questProgress(q){return Math.min(S.stats[q.key]||0,q.goal);}
function questHTML(q){
  const value=questProgress(q),done=value>=q.goal,claimed=S.claimed.includes(q.id);
  return `<div class="quest-card"><div class="quest-top"><strong>${q.emoji} ${q.title}</strong><span class="quest-reward">+${q.reward} 🪙</span></div><p>${q.desc}</p><div class="quest-progress"><i style="width:${value/q.goal*100}%"></i></div><div class="quest-bottom"><span>${value}/${q.goal}</span>${claimed?'<span>✓ Получено</span>':done?`<button class="small-btn" data-claim="${q.id}">Забрать награду</button>`:'<span>В процессе</span>'}</div></div>`;
}

function doCatAction(action){
  const c=S.cat;
  const actions={
    feed:()=>{if(S.coins<8){notify('Нужно 8 монет на вкусный корм.');return false;}S.coins-=8;c.hunger=clamp(c.hunger+28,0,100);S.stats.feeds++;world?.doAction('eat');notify('Мурка с аппетитом похрустела кормом! 🥣');gainXP(5);},
    pet:()=>{c.happy=clamp(c.happy+15,0,100);c.clean=clamp(c.clean-1,0,100);world?.doAction('pet');notify('Мурка довольно мурлычет 💗');gainXP(3);},
    play:()=>{c.happy=clamp(c.happy+22,0,100);c.energy=clamp(c.energy-13,0,100);world?.doAction('play');notify('Как весело! Мурка ловит игрушку 🧶');gainXP(6);},
    sleep:()=>{c.energy=clamp(c.energy+30,0,100);c.hunger=clamp(c.hunger-5,0,100);world?.doAction('sleep');notify('Тихих снов, Мурка… 💤');gainXP(3);},
    wash:()=>{c.clean=clamp(c.clean+35,0,100);c.happy=clamp(c.happy+4,0,100);world?.doAction('wash');notify('Теперь Мурка чистенькая! 🫧');gainXP(4);},
    walk:()=>{c.happy=clamp(c.happy+10,0,100);c.energy=clamp(c.energy-7,0,100);world?.doAction('walk');notify('Мурка вышла на прогулку 🐾');gainXP(4);},
    run:()=>{c.happy=clamp(c.happy+12,0,100);c.energy=clamp(c.energy-14,0,100);world?.doAction('run');notify('Мурка весело носится по комнате!');gainXP(5);},
    jump:()=>{c.energy=clamp(c.energy-5,0,100);world?.doAction('jump');notify('Прыг-скок! Вот это прыжок!');gainXP(2);}
  };
  if(actions[action]&&actions[action]()!==false){save();updateHeader();if(activeView==='home'||activeView==='cat')renderPanel(activeView);}
}
function handleBuy(type,id){
  const collection=type==='furniture'?FURNITURE:type==='coat'?COATS:HATS;
  const item=collection.find(x=>x.id===id);if(!item)return;
  if(type==='furniture'&&S.owned.includes(id)){notify('Уже куплено!');return;}
  if(type!=='furniture'&&((type==='coat'&&S.coat===id)||(type==='hat'&&S.hat===id)))return;
  if(S.coins<item.price){notify('Пока не хватает монет. Сыграй в мини-игру!');return;}
  S.coins-=item.price;
  if(type==='furniture'){S.owned.push(id);S.stats.furnitureBought++;world?.syncFurniture();}
  if(type==='coat'){S.coat=id;world?.setCoat(item.color);}
  if(type==='hat'){S.hat=id;world?.setHat(id);}
  gainXP(4);save();updateHeader();renderPanel('shop');notify(`${item.name}: покупка готова!`);
}
function handlePlot(action,index){
  const i=Number(index);if(!Number.isInteger(i)||i<0||i>=S.garden.length)return;
  const plot=S.garden[i];
  if(action==='plant'){
    if(plot||S.seeds<1)return;S.seeds--;S.garden[i]={stage:0};notify('Семечко посажено. Пора поливать! 🌱');
  }else if(action==='water'){
    if(!plot||plot.stage>=3)return;plot.stage++;notify(plot.stage===3?'Цветок расцвёл! Можно собирать! 🌻':'Грядка полита 💧');gainXP(2);
  }else if(action==='harvest'){
    if(!plot||plot.stage<3)return;S.garden[i]=null;S.coins+=22;S.seeds+=Math.random()<.35?1:0;S.stats.harvests++;gainXP(12);notify('Урожай собран! +22 монеты 🪙');
  }
  save();updateHeader();if(worldMode==='garden')world?.syncGarden();renderPanel('garden');
}

function renderGames(){
  $('#gameView').innerHTML=`<div class="game-header"><div><span class="eyebrow">ВРЕМЯ ИГРАТЬ</span><h2>Мини-игры Мурки 🎮</h2><p>Собирай монеты, получай опыт и открывай новые украшения для дома.</p></div><div class="game-stats"><span class="game-stat">🪙 ${S.coins} монет</span><span class="game-stat">⭐ ${S.level} уровень</span></div></div>
    <div class="games-grid">
      ${gameCard('match3','💎','Садовые самоцветы','Собирай цепочки из трёх и более плиток','От 30 🪙')}
      ${gameCard('memory','🃏','Найди пары','Открывай карточки и запоминай картинки','До 28 🪙')}
      ${gameCard('lights','💡','Лампочки','Погаси все огоньки на поле','25 🪙')}
      ${gameCard('simon','🎵','Запомни цвета','Повтори световую последовательность','25 🪙')}
      ${gameCard('slide','🔢','Пятнашки','Собери числа по порядку','30 🪙')}
      ${gameCard('race','🏎️','Кошачьи гонки','Собирай монеты и объезжай коробки','До 45 🪙')}
      ${gameCard('fishing','🎣','Рыбалка','Лови рыбок в нужный момент','До 40 🪙')}
      ${gameCard('hunt','🔎','Поиск сокровищ','Отыщи предметы под таинственными карточками','До 35 🪙')}
    </div>`;
}
function gameCard(id,emoji,title,desc,reward){
  return `<article class="game-card"><div class="game-card-art">${emoji}</div><div class="game-card-body"><h3>${title}</h3><p>${desc}</p><div class="game-card-footer"><span>${reward}</span><button class="primary-btn" data-game="${id}">Играть</button></div></div></article>`;
}
function gameShell(title,desc,stats,board){
  $('#gameView').innerHTML=`<div class="game-header"><div><span class="eyebrow">МИНИ-ИГРА</span><h2>${title}</h2><p>${desc}</p></div><div class="game-stats">${stats||''}<button class="secondary-btn" id="backGames">← К играм</button></div></div><div id="gameInner">${board}</div>`;
  $('#backGames').addEventListener('click',()=>showView('games'));
}
function endGame(success,reward,message){
  if(activeGameCleanup){activeGameCleanup();activeGameCleanup=null;}
  if(success){
    S.coins+=reward;gainXP(12);S.stats.miniGames++;save();updateHeader();
    $('#gameInner').innerHTML=`<div class="result-card"><div class="result-emoji">🏆</div><h3>Ура, получилось!</h3><p>${message||'Отличная игра!'} Ты получила ${reward} монет и опыт.</p><button class="primary-btn" id="againBtn">Ещё раз</button> <button class="secondary-btn" id="gamesBtn">К списку игр</button></div>`;
  }else{
    $('#gameInner').innerHTML=`<div class="result-card"><div class="result-emoji">🐾</div><h3>Попробуем ещё?</h3><p>${message||'В этот раз не получилось, но Мурка верит в тебя!'} Небольшая тренировка — и всё выйдет.</p><button class="primary-btn" id="againBtn">Повторить</button> <button class="secondary-btn" id="gamesBtn">К списку игр</button></div>`;
  }
  $('#againBtn').addEventListener('click',()=>launchGame(currentGame));
  $('#gamesBtn').addEventListener('click',()=>showView('games'));
}
let currentGame='';

function launchGame(id){
  currentGame=id;
  if(activeGameCleanup){activeGameCleanup();activeGameCleanup=null;}
  const names={match3:'Садовые самоцветы',memory:'Найди пары',lights:'Лампочки',simon:'Запомни цвета',slide:'Пятнашки',race:'Кошачьи гонки',fishing:'Рыбалка',hunt:'Поиск сокровищ'};
  if(id==='match3')return gameMatch3();
  if(id==='memory')return gameMemory();
  if(id==='lights')return gameLights();
  if(id==='simon')return gameSimon();
  if(id==='slide')return gameSlide();
  if(id==='race')return gameRace();
  if(id==='fishing')return gameFishing();
  if(id==='hunt')return gameHunt();
}

function gameMatch3(){
  const icons=['🍓','💎','🌸','🍋','🍇','⭐'];
  const N=7;let board=Array.from({length:N*N},()=>rand(icons.length)),selected=-1,moves=20,score=0,locked=false,ended=false;
  function matches(){
    const set=new Set();
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const i=y*N+x,v=board[i];if(v<0)continue;
      let run=[i];for(let xx=x+1;xx<N&&board[y*N+xx]===v;xx++)run.push(y*N+xx);
      if(run.length>=3)run.forEach(k=>set.add(k));
      run=[i];for(let yy=y+1;yy<N&&board[yy*N+x]===v;yy++)run.push(yy*N+x);
      if(run.length>=3)run.forEach(k=>set.add(k));
    }
    return [...set];
  }
  for(let k=0;k<20;k++){const m=matches();if(!m.length)break;m.forEach(i=>board[i]=rand(icons.length));}
  gameShell('Садовые самоцветы','Меняй местами соседние плитки. Собирай линии из трёх или больше!',`<span class="game-stat">💎 <b id="mScore">0</b> / 220</span><span class="game-stat">Ходы: <b id="mMoves">20</b></span>`,`<div class="game-board-wrap"><div class="match-grid" id="matchGrid">${board.map((v,i)=>`<button class="match-cell" data-i="${i}">${icons[v]}</button>`).join('')}</div></div><div class="game-message" id="mMsg">Найди первую комбинацию!</div>`);
  const grid=$('#matchGrid');
  function draw(){grid.innerHTML=board.map((v,i)=>`<button class="match-cell ${selected===i?'selected':''}" data-i="${i}">${icons[v]||''}</button>`).join('');}
  function resolve(){
    if(ended)return;
    const m=matches();
    if(!m.length){locked=false;if(score>=220||moves<=0)finish();return;}
    score+=m.length*10;$('#mScore').textContent=score;
    m.forEach(i=>board[i]=-1);
    setTimeout(()=>{
      for(let x=0;x<N;x++){
        const vals=[];for(let y=N-1;y>=0;y--)if(board[y*N+x]>=0)vals.push(board[y*N+x]);
        for(let y=N-1;y>=0;y--)board[y*N+x]=vals[N-1-y]??rand(icons.length);
      }
      draw();setTimeout(resolve,120);
    },150);
  }
  function finish(){if(ended)return;ended=true;endGame(score>=220,30+Math.min(20,Math.floor(score/30)),score>=220?'Ты собрала чудесную комбинацию!':'Попробуй собрать больше цепочек.');}
  grid.addEventListener('click',e=>{
    const b=e.target.closest('[data-i]');if(!b||locked||ended)return;const i=Number(b.dataset.i);
    if(selected<0){selected=i;draw();return;}
    if(selected===i){selected=-1;draw();return;}
    const a=selected,adj=Math.abs((a%N)-(i%N))+Math.abs(Math.floor(a/N)-Math.floor(i/N))===1;
    if(!adj){selected=i;draw();return;}
    [board[a],board[i]]=[board[i],board[a]];
    if(!matches().length){[board[a],board[i]]=[board[i],board[a]];selected=-1;draw();$('#mMsg').textContent='Нужна комбинация из трёх плиток.';return;}
    moves--;$('#mMoves').textContent=moves;selected=-1;locked=true;draw();resolve();
  });
  const observer=()=>{if(!ended&&moves<=0&&!locked)finish();};
  const oldResolve=resolve;
  function finishCheck(){if(score>=220||moves<=0)finish();}
  // Wrap completion check after cascade without relying on DOM polling.
  const baseResolve=resolve;
  const originalMatches=matches;
  // The state is completed when the cascade settles and there are no pending matches.
  const timer=setInterval(()=>{if(!ended&&moves<=0&&!locked)finishCheck();},250);
  activeGameCleanup=()=>{clearInterval(timer);ended=true;};
}

function gameMemory(){
  const faces=['🍎','🍐','🍓','🍇','🍋','🍒','🥝','🌼'];
  const cards=shuffle([...faces,...faces]);let open=[],found=new Set(),moves=0,lock=false;
  gameShell('Найди пары','Открывай по две карточки и запоминай, где спрятаны одинаковые картинки.',`<span class="game-stat">Ходы: <b id="memMoves">0</b></span><span class="game-stat">Пары: <b id="memPairs">0</b> / 8</span>`,`<div class="game-board-wrap"><div class="memory-grid" id="memoryGrid">${cards.map((_,i)=>`<button class="memory-cell" data-i="${i}">?</button>`).join('')}</div></div><div class="game-message" id="memMsg">Найди все восемь пар!</div>`);
  const grid=$('#memoryGrid');
  function draw(){grid.innerHTML=cards.map((v,i)=>`<button class="memory-cell ${found.has(i)?'matched':''} ${open.includes(i)?'open':''}" data-i="${i}">${found.has(i)||open.includes(i)?v:'?'}</button>`).join('');}
  grid.addEventListener('click',e=>{
    const b=e.target.closest('[data-i]');if(!b||lock)return;const i=Number(b.dataset.i);if(found.has(i)||open.includes(i))return;
    open.push(i);draw();
    if(open.length===2){moves++;$('#memMoves').textContent=moves;const [a,c]=open;
      if(cards[a]===cards[c]){found.add(a);found.add(c);open=[];draw();$('#memPairs').textContent=found.size/2;if(found.size===16)endGame(true,Math.max(12,36-Math.floor(moves/2)),'Память у тебя отличная!');}
      else{lock=true;setTimeout(()=>{open=[];lock=false;draw();},750);}
    }
  });
}
function gameLights(){
  const N=5;let board=Array(25).fill(false),moves=0,ended=false;
  function toggle(arr,i){const x=i%N,y=Math.floor(i/N);[[0,0],[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const xx=x+dx,yy=y+dy;if(xx>=0&&xx<N&&yy>=0&&yy<N)arr[yy*N+xx]=!arr[yy*N+xx];});}
  for(let k=0;k<18;k++)toggle(board,rand(25));
  if(!board.some(Boolean))toggle(board,12);
  gameShell('Лампочки','Погаси все огоньки. Нажатие меняет выбранную лампочку и соседей крестом.',`<span class="game-stat">Ходы: <b id="lightMoves">0</b></span>`,`<div class="game-board-wrap"><div class="lights-grid" id="lightsGrid">${board.map((on,i)=>`<button class="light-cell ${on?'on':''}" data-i="${i}">${on?'✦':'·'}</button>`).join('')}</div></div><div class="game-message" id="lightMsg">Погаси все 25 огоньков!</div>`);
  const grid=$('#lightsGrid');
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b||ended)return;toggle(board,Number(b.dataset.i));moves++;$('#lightMoves').textContent=moves;grid.innerHTML=board.map((on,i)=>`<button class="light-cell ${on?'on':''}" data-i="${i}">${on?'✦':'·'}</button>`).join('');if(!board.some(Boolean)){ended=true;endGame(true,25,'Все огоньки погасли. Отличная работа!');}});
}
function gameSimon(){
  const colors=['#e98b9a','#86c9a3','#8daee4','#f0c66d'];let sequence=[],pos=0,busy=true,round=0,ended=false;
  gameShell('Запомни цвета','Смотри на последовательность вспышек и повторяй её в том же порядке.',`<span class="game-stat">Раунд: <b id="simonRound">0</b> / 6</span>`,`<div class="game-board-wrap"><div class="simon-grid" id="simonGrid">${colors.map((c,i)=>`<button class="simon-cell" data-i="${i}" aria-label="Цвет ${i+1}"></button>`).join('')}</div></div><div class="game-message" id="simonMsg">Смотри внимательно…</div>`);
  const grid=$('#simonGrid');
  function flash(i){const b=$(`[data-i="${i}"]`,grid);b.classList.add('lit');setTimeout(()=>b.classList.remove('lit'),360);}
  function next(){
    if(ended)return;round++;sequence.push(rand(4));pos=0;busy=true;$('#simonRound').textContent=round;$('#simonMsg').textContent='Запоминай последовательность…';
    sequence.forEach((n,i)=>setTimeout(()=>flash(n),500+i*620));
    setTimeout(()=>{busy=false;$('#simonMsg').textContent='Теперь повтори её!';},650+sequence.length*620);
  }
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b||busy||ended)return;const i=Number(b.dataset.i);flash(i);
    if(sequence[pos]!==i){ended=true;$('#simonMsg').textContent='Почти! В следующий раз получится.';endGame(false,0,'Последовательность оказалась сложной. Попробуй ещё раз.');return;}
    pos++;if(pos===sequence.length){if(round>=6){ended=true;endGame(true,25,'Ты запомнила шесть раундов!');}else{busy=true;setTimeout(next,700);}}
  });
  const timer=setTimeout(next,450);activeGameCleanup=()=>{clearTimeout(timer);ended=true;};
}
function gameSlide(){
  const board=[1,2,3,4,5,6,7,8,0];let moves=0,ended=false;
  let blank=8;
  for(let i=0;i<100;i++){const x=blank%3,y=Math.floor(blank/3),opts=[];if(x>0)opts.push(blank-1);if(x<2)opts.push(blank+1);if(y>0)opts.push(blank-3);if(y<2)opts.push(blank+3);const n=opts[rand(opts.length)];[board[blank],board[n]]=[board[n],board[blank]];blank=n;}
  if(board.every((v,i)=>v===((i+1)%9))) { [board[0],board[1]]=[board[1],board[0]]; }
  gameShell('Пятнашки','Передвигай плитки в пустую клетку, чтобы числа шли от 1 до 8.',`<span class="game-stat">Ходы: <b id="slideMoves">0</b></span>`,`<div class="game-board-wrap"><div class="slide-grid" id="slideGrid"></div></div><div class="game-message">Собери числа по порядку!</div>`);
  const grid=$('#slideGrid');
  function draw(){grid.innerHTML=board.map((v,i)=>`<button class="slide-cell ${v===0?'empty':''}" data-i="${i}" ${v===0?'disabled':''}>${v||''}</button>`).join('');}
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b||ended)return;const i=Number(b.dataset.i),z=board.indexOf(0);if(Math.abs(i%3-z%3)+Math.abs(Math.floor(i/3)-Math.floor(z/3))!==1)return;
    [board[i],board[z]]=[board[z],board[i]];moves++;$('#slideMoves').textContent=moves;draw();if(board.every((v,k)=>v===((k+1)%9))){ended=true;endGame(true,30,'Пятнашки собраны!');}
  });
  draw();
}

function gameRace(){
  let canvas,ctx,raf=0,active=true,last=0,elapsed=0,score=0,lane=1,objects=[],spawn=0;
  gameShell('Кошачьи гонки','Управляй машинкой Мурки: собирай монетки и объезжай ящики.',`<span class="game-stat">🪙 <b id="raceScore">0</b></span><span class="game-stat">⏱ <b id="raceTime">30</b> сек</span>`,`<div class="game-board-wrap"><canvas id="raceCanvas" class="race-canvas" width="420" height="560"></canvas></div><div class="race-controls"><button id="raceLeft" aria-label="Влево">◀</button><button id="raceRight" aria-label="Вправо">▶</button></div><div class="game-message" id="raceMsg">Старт! Собери побольше монет.</div>`);
  canvas=$('#raceCanvas');ctx=canvas.getContext('2d');
  const laneX=[105,210,315],playerY=465;
  function move(d){if(active)lane=clamp(lane+d,0,2);}
  const key=e=>{if(e.key==='ArrowLeft'||e.key==='a')move(-1);if(e.key==='ArrowRight'||e.key==='d')move(1);};
  window.addEventListener('keydown',key);
  $('#raceLeft').addEventListener('pointerdown',()=>move(-1));
  $('#raceRight').addEventListener('pointerdown',()=>move(1));
  function draw(){
    ctx.clearRect(0,0,420,560);
    ctx.fillStyle='#a8d7b5';ctx.fillRect(0,0,420,560);
    ctx.fillStyle='#555463';ctx.beginPath();ctx.roundRect(40,-8,340,580,22);ctx.fill();
    ctx.strokeStyle='#fff2d1';ctx.lineWidth=5;ctx.setLineDash([25,23]);
    [153,267].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,560);ctx.stroke();});ctx.setLineDash([]);
    for(let y=-20+(elapsed*230)%80;y<560;y+=80){ctx.fillStyle='#fff';ctx.fillRect(13,y,17,38);ctx.fillRect(390,y,17,38);ctx.fillStyle='#e98da7';ctx.fillRect(13,y+6,17,22);ctx.fillRect(390,y+6,17,22);}
    objects.forEach(o=>{const x=laneX[o.lane];if(o.type==='coin'){ctx.beginPath();ctx.fillStyle='#ffd66b';ctx.arc(x,o.y,14,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff0b0';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#a27835';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('★',x,o.y+5);}else{ctx.fillStyle='#ad7654';ctx.fillRect(x-22,o.y-22,44,44);ctx.fillStyle='#dba47d';ctx.fillRect(x-15,o.y-15,30,9);ctx.font='26px sans-serif';ctx.textAlign='center';ctx.fillText('📦',x,o.y+8);}});
    const x=laneX[lane];ctx.fillStyle='#25242c';ctx.fillRect(x-29,playerY-25,8,20);ctx.fillRect(x+21,playerY-25,8,20);ctx.fillRect(x-29,playerY+13,8,20);ctx.fillRect(x+21,playerY+13,8,20);
    ctx.fillStyle='#ed8fb0';ctx.beginPath();ctx.roundRect(x-25,playerY-40,50,80,14);ctx.fill();ctx.fillStyle='#bfe7ee';ctx.beginPath();ctx.roundRect(x-18,playerY-29,36,20,8);ctx.fill();ctx.font='30px sans-serif';ctx.textAlign='center';ctx.fillText('🐱',x,playerY+8);
    ctx.fillStyle='#fff';ctx.font='bold 14px sans-serif';ctx.fillText('MURKA RACE',210,26);
  }
  function finish(success){
    if(!active)return;active=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',key);
    endGame(success,Math.min(45,18+score*2),success?`Ты собрала ${score} монеток на трассе!`:`Столкновение! На трассе удалось собрать ${score} монеток.`);
  }
  function tick(now){
    if(!active)return;if(!last)last=now;const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;spawn+=dt;
    if(spawn>.75){spawn=0;objects.push({type:Math.random()<.66?'coin':'box',lane:rand(3),y:-20});}
    objects.forEach(o=>o.y+=260*dt);objects=objects.filter(o=>o.y<600);
    for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(o.lane===lane&&Math.abs(o.y-playerY)<42){if(o.type==='coin'){score++;objects.splice(i,1);$('#raceScore').textContent=score;}else{draw();finish(false);return;}}}
    $('#raceTime').textContent=Math.max(0,Math.ceil(30-elapsed));draw();
    if(elapsed>=30){finish(true);return;}raf=requestAnimationFrame(tick);
  }
  raf=requestAnimationFrame(tick);
  activeGameCleanup=()=>{active=false;cancelAnimationFrame(raf);window.removeEventListener('keydown',key);};
}
function gameFishing(){
  let pos=0,dir=1,raf=0,active=true,catches=0,attempts=0,last=0;
  gameShell('Рыбалка','Нажми «Ловить», когда розовый маркер находится в зелёной зоне.',`<span class="game-stat">🐟 <b id="fishCount">0</b> / 3</span><span class="game-stat">Попытки: <b id="fishAttempts">0</b> / 6</span>`,`<div class="game-board-wrap" style="width:100%"><div style="font-size:54px;text-align:center">🎣 🌊 🐟</div><div class="fishing-track"><div class="fishing-zone"></div><div class="fishing-marker" id="fishMarker"></div></div><button class="primary-btn" id="fishCatch">Подсечь!</button><div class="game-message" id="fishMsg">Следи за маркером — лови момент!</div></div>`);
  const marker=$('#fishMarker');
  function tick(t){if(!active)return;if(!last)last=t;const dt=Math.min((t-last)/1000,.05);last=t;pos+=dir*dt*76;if(pos>=100){pos=100;dir=-1;}if(pos<=0){pos=0;dir=1;}marker.style.left=`calc(${pos}% - 6px)`;raf=requestAnimationFrame(tick);}
  function catchFish(){if(!active)return;attempts++;$('#fishAttempts').textContent=attempts;
    if(pos>=43&&pos<=63){catches++;$('#fishCount').textContent=catches;$('#fishMsg').textContent='Есть поклёвка! Отличный улов 🐟';}
    else $('#fishMsg').textContent='Рыбка уплыла… попробуй ещё раз!';
    if(catches>=3){active=false;cancelAnimationFrame(raf);endGame(true,20+catches*7,'Ты поймала три рыбки!');}
    else if(attempts>=6){active=false;cancelAnimationFrame(raf);endGame(false,0,'На этот раз рыбки были проворнее.');}
  }
  $('#fishCatch').addEventListener('click',catchFish);raf=requestAnimationFrame(tick);
  activeGameCleanup=()=>{active=false;cancelAnimationFrame(raf);};
}
function gameHunt(){
  const targets=['🧶','🐟','🌼','💎','🦋'];
  const board=shuffle([...targets,...targets,...Array.from({length:20},()=>['🍄','🍎','🪶','🐚','🍀'][rand(5)])]);
  const found=new Set();let busy=false;
  gameShell('Поиск сокровищ','Ищи предметы из списка. Открывай коробочки по одной и запоминай, где что спрятано.',`<span class="game-stat">Найдено: <b id="huntCount">0</b> / 5</span>`,`<div class="target-row" id="huntTargets">${targets.map(x=>`<span class="target-chip" data-target="${x}">${x}</span>`).join('')}</div><div class="game-board-wrap"><div class="hunt-grid" id="huntGrid">${board.map((_,i)=>`<button class="hunt-cell" data-i="${i}">?</button>`).join('')}</div></div><div class="game-message" id="huntMsg">Найди клубок, рыбку, цветок, самоцвет и бабочку!</div>`);
  const grid=$('#huntGrid'),opened=new Set();
  grid.addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(!b||busy)return;const i=Number(b.dataset.i);if(opened.has(i))return;opened.add(i);b.textContent=board[i];b.disabled=true;
    if(targets.includes(board[i])&&!found.has(board[i])){found.add(board[i]);$(`[data-target="${board[i]}"]`).classList.add('done');$('#huntCount').textContent=found.size;$('#huntMsg').textContent='Нашла! Ищи следующий предмет 🔎';}
    else $('#huntMsg').textContent='Здесь ничего из списка…';
    if(found.size===targets.length)endGame(true,35,'Все сокровища найдены!');
    else if(opened.size>=board.length)endGame(false,0,'Ты открыла все коробочки. Попробуем ещё раз?');
  });
}

function createWorld(){
  const canvas=$('#worldCanvas');
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
  }catch(e){
    $('#sceneLoading').classList.add('hidden');$('#sceneFallback').classList.remove('hidden');
    return {setMode(){},doAction(){},syncFurniture(){},syncGarden(){},setCoat(){},setHat(){},resetCamera(){}};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d8ebef');scene.fog=new THREE.Fog('#d8ebef',18,38);
  const camera=new THREE.PerspectiveCamera(37,1,.1,100);camera.position.set(9,7.4,11);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.25,0);controls.enableDamping=true;controls.dampingFactor=.055;controls.minDistance=7;controls.maxDistance=20;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.18;controls.enablePan=false;
  scene.add(new THREE.HemisphereLight('#fff3e6','#8c9c83',2.0));
  const sun=new THREE.DirectionalLight('#fff1d7',3.2);sun.position.set(-5,10,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;scene.add(sun);
  const fill=new THREE.DirectionalLight('#d9e9ff',1.25);fill.position.set(7,5,-6);scene.add(fill);
  const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const box=(w,h,d,material,x,y,z,parent=scene)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const sphere=(r,material,x,y,z,sx=1,sy=1,sz=1,parent=scene)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,32,24),material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const cylinder=(rt,rb,h,material,x,y,z,parent=scene,segments=24)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const wood=mat('#c99a72'),woodDark=mat('#916b59'),cream=mat('#f5e8d6'),wall=mat('#f0ded8'),pink=mat('#e8a8b7'),mint=mat('#9cbea7'),green=mat('#679b70'),leaf=mat('#79aa7a'),gold=mat('#e4bb70',.35,.45),glass=new THREE.MeshPhysicalMaterial({color:'#b9e0ed',roughness:.12,metalness:.05,transparent:true,opacity:.55});
  const homeGroup=new THREE.Group();scene.add(homeGroup);
  const gardenGroup=new THREE.Group();scene.add(gardenGroup);gardenGroup.visible=false;
  // Cozy room shell
  box(14,.35,12,mat('#bb906c'),0,-.2,0,homeGroup);
  const floorTop=box(13.9,.08,11.9,mat('#d9b58e'),0,.015,0,homeGroup);
  for(let z=-5.2;z<5.3;z+=.7)box(13.8,.014,.018,mat('#bb916f'),0,.07,z,homeGroup);
  box(14,5.5,.25,wall,0,2.55,-5.95,homeGroup);
  box(.25,5.5,12,wall,-6.95,2.55,0,homeGroup);
  box(14,.22,.25,woodDark,0,.3,-5.78,homeGroup);
  // wall panel trims
  for(let x=-6;x<=6;x+=2){box(.035,4.8,.03,mat('#e5c9be'),x,2.6,-5.78,homeGroup);}
  // Big window with frame and curtains
  box(4.25,2.65,.12,woodDark,-1.1,3.15,-5.77,homeGroup);
  box(4.02,2.42,.08,glass,-1.1,3.15,-5.68,homeGroup);
  box(.07,2.4,.08,cream,-1.1,3.15,-5.59,homeGroup);box(4.0,.07,.08,cream,-1.1,3.15,-5.59,homeGroup);
  box(.055,2.4,.08,cream,-2.43,3.15,-5.59,homeGroup);
  for(const x of [-3.3,1.1]){const c=box(.42,2.95,.16,pink,x,3.12,-5.48,homeGroup);c.rotation.z=x<0?-.04:.04;}
  box(4.6,.18,.42,wood,-1.1,1.78,-5.5,homeGroup);
  // Wall art
  const frame=box(1.15,1.1,.12,gold,4.5,3.65,-5.72,homeGroup);box(.92,.86,.06,mat('#b8d9d1'),4.5,3.65,-5.63,homeGroup);
  sphere(.27,mat('#f4d17b'),4.5,3.75,-5.55,.95,1, .08,homeGroup);
  // ceiling beams, open front keeps scene visible
  for(let x=-6;x<=6;x+=4)box(.16,.2,11.6,cream,x,5.18,0,homeGroup);
  // base decor: rug
  const rugGroup=new THREE.Group();homeGroup.add(rugGroup);
  const rugMesh=new THREE.Mesh(new THREE.CylinderGeometry(2.35,2.35,.08,64),mat('#d8a0b0'));rugMesh.scale.z=.67;rugMesh.position.set(0,.12,.2);rugMesh.receiveShadow=true;rugGroup.add(rugMesh);
  const rugRing=new THREE.Mesh(new THREE.TorusGeometry(1.8,.035,10,64),mat('#f5d9d7'));rugRing.rotation.x=Math.PI/2;rugRing.position.set(0,.17,.2);rugGroup.add(rugRing);
  // furniture groups
  const decor={};
  function sofa(){
    const g=new THREE.Group();homeGroup.add(g);g.position.set(-4,.1,1.1);
    box(2.7,.55,1.15,mat('#d98e9e'),0,.52,0,g);box(2.7,1.15,.42,mat('#c9788e'),0,1.05,-.39,g);
    for(const x of [-1.35,1.35])box(.35,.82,1.1,mat('#c9788e'),x,.64,0,g);
    for(const x of [-.72,0,.72]){const p=box(.63,.48,.34,mat(x===0?'#f2d8df':'#e8b4bf'),x,.83,.16,g);p.rotation.x=-.13;}
    for(const x of [-.92,.92])cylinder(.09,.12,.35,woodDark,x,.2,.32,g);
    return g;
  }
  function bed(){
    const g=new THREE.Group();homeGroup.add(g);g.position.set(4,.1,1.6);
    box(2.55,.34,2.15,woodDark,0,.27,0,g);box(2.45,.28,1.95,mat('#8db3ca'),0,.51,.05,g);
    box(2.45,.28,.62,mat('#e8c5d0'),0,.68,-.62,g);
    for(const x of [-.78,.78]){const p=box(.75,.23,.45,cream,x,.72,-.68,g);p.rotation.z=x*.04;}
    box(2.6,.65,.15,woodDark,0,.58,-1.08,g);
    return g;
  }
  function plantPot(x,z){
    const g=new THREE.Group();homeGroup.add(g);g.position.set(x,.1,z);
    cylinder(.38,.29,.55,mat('#ca927d'),0,.28,0,g);cylinder(.41,.41,.1,mat('#e5b6a0'),0,.56,0,g);
    cylinder(.035,.05,.85,woodDark,0,1.05,0,g);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const l=sphere(.22,leaf,Math.cos(a)*.28,1.13+Math.sin(i*2)*.12,Math.sin(a)*.28,1.2,.48,.65,g);l.rotation.z=-a*.3;}
    sphere(.2,mat('#e8a6b5'),0,1.58,0,.8,.8,.8,g);
    return g;
  }
  function floorLamp(){
    const g=new THREE.Group();homeGroup.add(g);g.position.set(5,.1,-2);
    cylinder(.28,.33,.12,woodDark,0,.06,0,g);cylinder(.045,.06,2.1,gold,0,1.1,0,g);
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.55,.75,32,1,true),mat('#f0d39d'));shade.position.y=2.3;shade.rotation.x=Math.PI;shade.castShadow=true;g.add(shade);
    sphere(.12,mat('#ffe7a9',.25),0,1.92,0,.9,1,.9,g);
    return g;
  }
  function bookshelf(){
    const g=new THREE.Group();homeGroup.add(g);g.position.set(5,.1,-4.4);
    box(1.5,2.4,.5,woodDark,0,1.2,0,g);
    for(const y of [.45,1.15,1.85]){box(1.35,.07,.48,wood,0,y,0,g);for(let i=0;i<4;i++)box(.18,.42,.25,[mat('#d8a0ae'),mat('#8fb6a5'),mat('#d9bd7a'),mat('#a6a2cf')][i],-.48+i*.31,y+.22,0,g);}
    return g;
  }
  function piano(){const g=new THREE.Group();homeGroup.add(g);g.position.set(-4.4,.1,-3.5);box(1.65,.95,.7,woodDark,0,.48,0,g);box(1.55,.13,.5,cream,0,.98,.02,g);for(let i=0;i<12;i++)box(.1,.035,.48,mat('#fffaf1'),-.68+i*.12,1.06,.02,g);for(let i=0;i<7;i++)box(.065,.035,.25,mat('#38333c'),-.62+i*.18,1.09,-.08,g);return g;}
  function aquarium(){const g=new THREE.Group();homeGroup.add(g);g.position.set(0,.1,-4.7);box(1.65,1.1,.65,woodDark,0,.55,0,g);const water=box(1.48,.83,.05,glass,0,.58,.32,g);for(let i=0;i<3;i++)sphere(.13,mat(['#e6a16b','#e4c86a','#9fc6d4'][i]),-.48+i*.45,.62+Math.sin(i)*.18,.4,.85,.65,.6,g);return g;}
  function catTree(){const g=new THREE.Group();homeGroup.add(g);g.position.set(-5.2,.1,-3.6);box(1.15,.2,1,woodDark,0,.1,0,g);cylinder(.15,.2,1.2,wood,0,.8,0,g);box(1.1,.18,.85,mat('#d79aaa'),0,1.45,0,g);cylinder(.13,.16,1.1,wood,0,2.0,0,g);box(.9,.15,.8,mat('#d79aaa'),0,2.55,0,g);return g;}
  function aquariumDecor(){return aquarium();}
  decor.rug=rugGroup;decor.bed=bed();decor.sofa=sofa();decor.plant=plantPot(-5.35,-1.25);decor.lamp=floorLamp();decor.bookshelf=bookshelf();decor.piano=piano();decor.aquarium=aquariumDecor();decor.catTree=catTree();decor.tv=(()=>{const g=new THREE.Group();homeGroup.add(g);g.position.set(0,.1,-5.35);box(1.85,1.25,.22,woodDark,0,1.55,0,g);box(1.62,.98,.06,mat('#9fc7d4'),0,1.57,.15,g);return g;})();decor.windowSeat=(()=>{const g=new THREE.Group();homeGroup.add(g);box(3.9,.22,.72,mat('#d5a7b5'),-1.1,1.85,-5.15,g);for(let x of [-2.6,.4])box(.15,.45,.72,woodDark,x,1.55,-5.15,g);return g;})();
  decor.rug.visible=true;
  // Cat model
  const catRoot=new THREE.Group();homeGroup.add(catRoot);catRoot.position.set(0,.08,1.1);
  const catParts={legs:[],head:new THREE.Group(),tail:new THREE.Group(),body:null,coatMats:[]};
  const coatMat=mat(coatById(S.coat).color,.72),lightCoat=mat('#f7e8d7'),pinkInner=mat('#d88998'),dark=mat('#55404a'),eyeMat=mat('#69a9a0',.25),black=mat('#29252d',.2),whiskerMat=mat('#f1e6db');
  catParts.coatMats.push(coatMat);
  sphere(.68,coatMat,0,.98,-.1,.92,.7,1.22,catRoot);catParts.body=catRoot.children[catRoot.children.length-1];
  sphere(.48,lightCoat,0,.93,.75,.72,.72,.55,catRoot);
  const head=catParts.head;catRoot.add(head);head.position.set(0,1.73,.78);
  sphere(.63,coatMat,0,0,0,1,.88,.88,head);
  // ears, inner ears and tufts
  const earShape=new THREE.Shape();earShape.moveTo(-.26,0);earShape.lineTo(0,.66);earShape.lineTo(.26,0);earShape.closePath();
  const earGeo=new THREE.ShapeGeometry(earShape);
  for(const side of [-1,1]){
    const outer=new THREE.Mesh(earGeo,coatMat);outer.position.set(side*.39,.38,.02);outer.rotation.z=-side*.12;outer.castShadow=true;head.add(outer);
    const inner=new THREE.Mesh(new THREE.ShapeGeometry((()=>{const s=new THREE.Shape();s.moveTo(-.15,.04);s.lineTo(0,.43);s.lineTo(.15,.04);s.closePath();return s;})()),pinkInner);
    inner.position.set(side*.39,.4,.045);inner.rotation.z=-side*.12;head.add(inner);
  }
  // eyes with pupils, iris and catchlights
  for(const side of [-1,1]){
    sphere(.12,cream,side*.24,.08,.49,.92,1,.42,head);
    sphere(.082,eyeMat,side*.24,.08,.535,1,.96,.48,head);
    sphere(.05,black,side*.24,.075,.57,1,.95,.5,head);
    sphere(.021,mat('#fff'),side*.21,.115,.596,1,1,1,head);
    sphere(.17,lightCoat,side*.15,-.2,.49,.8,.55,.45,head);
  }
  sphere(.09,pinkInner,0,-.13,.61,.95,.65,.55,head);
  // mouth curves
  const smileMat=mat('#89656c');
  const mouthA=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,-.2,.63),new THREE.Vector3(-.06,-.29,.66),new THREE.Vector3(-.15,-.23,.62));
  const mouthB=new THREE.QuadraticBezierCurve3(new THREE.Vector3(0,-.2,.63),new THREE.Vector3(.06,-.29,.66),new THREE.Vector3(.15,-.23,.62));
  head.add(new THREE.Mesh(new THREE.TubeGeometry(mouthA,12,.012,6,false),smileMat),new THREE.Mesh(new THREE.TubeGeometry(mouthB,12,.012,6,false),smileMat));
  // whiskers
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const start=new THREE.Vector3(side*.26,-.18-i*.035,.53),end=new THREE.Vector3(side*(.72+i*.04),-.12-i*.12,.49);
    const curve=new THREE.QuadraticBezierCurve3(start,new THREE.Vector3(side*.48,-.15-i*.06,.62),end);
    head.add(new THREE.Mesh(new THREE.TubeGeometry(curve,10,.008,5,false),whiskerMat));
  }
  // forehead stripes
  for(let i=-1;i<=1;i++){const stripe=sphere(.075,dark,i*.14,.42,.49,.45,.18,.12,head);stripe.rotation.z=i*.25;}
  // Body stripes
  for(let side of [-1,1])for(let i=0;i<2;i++){const st=sphere(.12,dark,side*.55,1.2,-.18-i*.35,.28,.18,.12,catRoot);st.rotation.z=side*.3;}
  // legs
  for(const x of [-.4,.4])for(const z of [-.56,.56]){
    const leg=new THREE.Group();leg.position.set(x,.62,z);catRoot.add(leg);
    const upper=cylinder(.15,.18,.58,coatMat,0,-.16,0,leg);
    sphere(.17,lightCoat,0,-.45,.08,1.15,.7,1.25,leg);
    catParts.legs.push(leg);
  }
  // tail: curved segmented tube
  const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.18,.18,-.35),new THREE.Vector3(.28,.53,-.6),new THREE.Vector3(.08,.88,-.72),new THREE.Vector3(-.2,1.02,-.68)]);
  const tailMesh=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,36,.105,12,false),coatMat);tailMesh.castShadow=true;catParts.tail.position.set(0,1.05,-.9);catParts.tail.add(tailMesh);catRoot.add(catParts.tail);
  // Collar and bell
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.28,.045,10,36),mat('#bd7993'));collar.position.set(0,1.38,.72);collar.rotation.x=Math.PI/2;catRoot.add(collar);
  sphere(.09,gold,0,1.27,1.02,.8,1,.8,catRoot);
  const hatGroup=new THREE.Group();head.add(hatGroup);
  const hatMat=mat('#b08ac9');
  const flower=sphere(.13,mat('#f6c96d'),-.23,.56,.06,.8,.8,.8,hatGroup);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;sphere(.085,mat('#f5a9bf'),-.23+Math.cos(a)*.13,.56+Math.sin(a)*.13,.06,.8,.8,.8,hatGroup);}
  const crown=cylinder(.26,.33,.19,gold,0,.57,.02,hatGroup,5);
  const witch=new THREE.Mesh(new THREE.ConeGeometry(.31,.65,7),hatMat);witch.position.set(0,.83,.02);hatGroup.add(witch);
  const bow1=sphere(.16,pink, -.14,.55,.03,1,.6,.35,hatGroup),bow2=sphere(.16,pink,.14,.55,.03,1,.6,.35,hatGroup);sphere(.07,gold,0,.55,.08,1,1,.5,hatGroup);
  function setHat(id){hatGroup.visible=id!=='none';flower.visible=id==='flower';crown.visible=id==='crown';witch.visible=id==='witch';bow1.visible=bow2.visible=id==='bow';hatGroup.position.y=id==='witch'?.02:0;}
  function setCoat(color){coatMat.color.set(color);}
  function syncFurniture(){for(const [id,g] of Object.entries(decor))g.visible=S.owned.includes(id);}
  function syncGarden(){
    gardenBeds.forEach((bed,i)=>{
      while(bed.children.length>1)bed.remove(bed.children[bed.children.length-1]);
      const plot=S.garden[i];if(!plot)return;
      const stages=plot.stage;
      for(let n=0;n<stages;n++){
        const x=(n-1)*.17;
        cylinder(.035,.04,.38,green,x,.45,.0,bed);
        sphere(.16,leaf,x-.1,.51,.02,1.2,.5,.7,bed);
        sphere(.16,leaf,x+.1,.6,.02,1.2,.5,.7,bed);
        if(stages>=3){sphere(.19,mat('#e9a0b7'),x,.78,.02,.9,.9,.9,bed);sphere(.075,gold,x,.78,.18,1,1,.5,bed);}
      }
    });
  }
  // Garden world
  const grass=mat('#8fbd8d');box(18,.28,17,grass,0,-.22,0,gardenGroup);
  const pathMat=mat('#d9c9aa');
  for(let z=3.8;z>-4;z-=1.15){const stone=new THREE.Mesh(new THREE.CylinderGeometry(.55,.62,.12,32),pathMat);stone.position.set(0,.01,z);gardenGroup.add(stone);}
  // Fence around three sides
  for(let side of [-1,1]){for(let z=-7;z<=7;z+=.8){box(.12,1.2,.12,mat('#e9dfcf'),side*8,.48,z,gardenGroup);}box(.16,.12,16,wood,side*8,1.0,0,gardenGroup);}
  for(let x=-8;x<=8;x+=.8){box(.12,1.2,.12,mat('#e9dfcf'),x,.48,-7.8,gardenGroup);}
  box(16,.12,.16,wood,0,1,-7.8,gardenGroup);
  // Tree trunk and crowns
  cylinder(.42,.58,3.2,woodDark,-5.3,1.5,-4.5,gardenGroup);
  for(const [x,y,z,r] of [[-5.6,3.2,-4.5,1.45],[-4.5,3.5,-4.7,1.2],[-6.2,4,-4.3,1.05]])sphere(r,leaf,x,y,z,1,.9,1,gardenGroup);
  // Flower patches and stepping garden decor
  for(let i=0;i<26;i++){
    const x=-7+Math.random()*14,z=-6.6+Math.random()*12;
    if(Math.abs(x)<1&&z>0)continue;
    const col=['#e99ab1','#f2c96e','#9d9bd6','#f3eee1'][i%4];
    cylinder(.018,.024,.28,green,x,.16,z,gardenGroup);
    sphere(.12,mat(col),x,.32,z,.9,.9,.9,gardenGroup);
    sphere(.045,gold,x,.34,z+.1,.9,.9,.6,gardenGroup);
  }
  // Small pond
  const pond=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.8,.12,64),mat('#6dabb8',.22,.18));pond.position.set(4,.01,-4);gardenGroup.add(pond);
  const pondRim=new THREE.Mesh(new THREE.TorusGeometry(1.72,.12,12,64),mat('#d0c0a2'));pondRim.rotation.x=Math.PI/2;pondRim.position.set(4,.12,-4);gardenGroup.add(pondRim);
  // Raised flower beds with plant containers
  const gardenBeds=[];
  for(let i=0;i<6;i++){
    const x=-4.9+(i%3)*2.1,z=2.6-Math.floor(i/3)*2.2;
    const bed=new THREE.Group();bed.position.set(x,.08,z);gardenGroup.add(bed);
    box(1.5,.32,1.35,woodDark,0,0,0,bed);box(1.34,.13,1.18,mat('#6a4b3a'),0,.2,0,bed);
    gardenBeds.push(bed);
  }
  syncGarden();
  // Ambient fireflies / pollen dots
  const particles=new THREE.Group();gardenGroup.add(particles);
  for(let i=0;i<45;i++){const p=sphere(.025,mat('#f9eab2',.35),-7+Math.random()*14,1+Math.random()*3,-6+Math.random()*12,1,1,1,particles);p.userData.phase=Math.random()*8;}
  syncFurniture();setCoat(coatById(S.coat).color);setHat(S.hat);
  function setMode(mode){
    const isGarden=mode==='garden';homeGroup.visible=!isGarden;gardenGroup.visible=isGarden;
    scene.background=new THREE.Color(isGarden?'#cfe7e5':'#d8ebef');scene.fog.color.set(isGarden?'#cfe7e5':'#d8ebef');
    camera.position.set(...(isGarden?[10,8,12]:[9,7.4,11]));controls.target.set(0,1.2,0);controls.update();
  }
  let catAction='idle',actionAt=0,moveFrom=null,moveTo=null,moveDuration=0;
  function doAction(action){
    catAction=action;actionAt=performance.now()/1000;
    const now=catRoot.position.clone();
    if(action==='walk'||action==='run'){
      moveFrom=now;const a=Math.random()*Math.PI*2,d=action==='run'?2.6:1.6;
      moveTo=new THREE.Vector3(clamp(now.x+Math.cos(a)*d,-3,3),now.y,clamp(now.z+Math.sin(a)*d,-2.6,3));
      moveDuration=action==='run'?1.1:2.0;catRoot.rotation.y=Math.atan2(moveTo.x-now.x,moveTo.z-now.z);
    }else if(action==='jump'){moveFrom=now;moveTo=now.clone();moveDuration=1;}
    else moveDuration=action==='sleep'?4:action==='wash'?3:2;
  }
  const clock=new THREE.Clock();
  function resize(){
    const w=canvas.clientWidth||800,h=canvas.clientHeight||500;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  window.addEventListener('resize',resize);resize();
  function animate(){
    const id=requestAnimationFrame(animate);controls.update();const t=clock.getElapsedTime();
    // light idle bob and action animation
    const p=moveDuration?clamp((t-actionAt)/moveDuration,0,1):1;
    if((catAction==='walk'||catAction==='run')&&moveFrom&&moveTo){
      const e=p*p*(3-2*p);catRoot.position.lerpVectors(moveFrom,moveTo,e);
    }
    if(catAction==='jump')catRoot.position.y=.08+Math.sin(p*Math.PI)*1.25;
    else if(catAction!=='sleep')catRoot.position.y=.08+Math.sin(t*2.2)*.035;
    catParts.body.scale.y=catAction==='sleep'?.82:1+Math.sin(t*3)*.015;
    catParts.head.rotation.z=catAction==='wash'?Math.sin(t*9)*.12:catAction==='sleep'?.16:Math.sin(t*1.5)*.025;
    catParts.head.rotation.x=catAction==='play'?Math.sin(t*8)*.09:0;
    catParts.legs.forEach((leg,i)=>{leg.rotation.x=(catAction==='walk'||catAction==='run')?Math.sin(t*(catAction==='run'?14:7)+i*Math.PI/2)*(catAction==='run'?.45:.24):catAction==='play'?Math.sin(t*13+i*Math.PI/2)*.28:catAction==='wash'&&i===0?-.65+Math.sin(t*8)*.1:0;});
    catParts.tail.rotation.x=Math.sin(t*(catAction==='play'?7:2.6))*(catAction==='sleep'?.03:.15);
    catParts.tail.rotation.z=Math.sin(t*1.6)*.17;
    if(catAction==='sleep')catRoot.position.y=.04;
    if((catAction==='walk'||catAction==='run'||catAction==='jump'||catAction==='sleep'||catAction==='wash'||catAction==='play')&&p>=1){catAction='idle';moveDuration=0;}
    particles.children.forEach((p,i)=>{p.position.y+=Math.sin(t*1.5+i)*.0015;p.material.opacity=.55+.35*Math.sin(t*2+i);});
    renderer.render(scene,camera);
  }
  animate();$('#sceneLoading').classList.add('hidden');
  return {
    setMode,doAction,syncFurniture,syncGarden,setCoat,setHat,
    resetCamera(){camera.position.set(9,7.4,11);controls.target.set(0,1.2,0);controls.update();}
  };
}

function bindUI(){
  $$('.nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
  $$('.scene-tab').forEach(b=>b.addEventListener('click',()=>{worldMode=b.dataset.world;world?.setMode(worldMode);updateSceneLabels();}));
  $('#cameraReset').addEventListener('click',()=>world?.resetCamera());
  $('#panel').addEventListener('click',e=>{
    const action=e.target.closest('[data-action]');if(action){doCatAction(action.dataset.action);return;}
    const buy=e.target.closest('[data-buy]');if(buy){const [type,id]=buy.dataset.buy.split(':');handleBuy(type,id);return;}
    const equip=e.target.closest('[data-equip]');if(equip){const [type,id]=equip.dataset.equip.split(':');if(type==='coat'){S.coat=id;world?.setCoat(coatById(id).color);}else{S.hat=id;world?.setHat(id);}save();renderPanel('shop');return;}
    const plot=e.target.closest('[data-plot]');if(plot){handlePlot(plot.dataset.plot,plot.dataset.index);return;}
    const claim=e.target.closest('[data-claim]');if(claim){
      const q=QUESTS.find(x=>x.id===claim.dataset.claim);if(!q||S.claimed.includes(q.id)||questProgress(q)<q.goal)return;
      S.claimed.push(q.id);S.coins+=q.reward;gainXP(15);save();updateHeader();renderPanel('quests');notify(`Задание выполнено! +${q.reward} монет 🎉`);return;
    }
    if(e.target.closest('#buySeeds')){
      if(S.coins<20){notify('Не хватает 20 монет на семена.');return;}
      S.coins-=20;S.seeds+=3;save();updateHeader();renderPanel('garden');notify('Ты купила три семечка 🌱');
    }
  });
  $('#gameView').addEventListener('click',e=>{const b=e.target.closest('[data-game]');if(b)launchGame(b.dataset.game);});
}
function init(){
  updateHeader();bindUI();
  try{world=createWorld();world?.setMode('home');}catch(e){console.error(e);$('#sceneLoading').classList.add('hidden');$('#sceneFallback').classList.remove('hidden');}
  setHatOnStart();
  renderPanel('home');updateSceneLabels();
  // Gently lower needs over time, without making the game punishing.
  setInterval(()=>{
    S.cat.hunger=clamp(S.cat.hunger-.35,0,100);
    S.cat.energy=clamp(S.cat.energy-.18,0,100);
    save();
    if(activeView==='home'||activeView==='cat')renderPanel(activeView);
  },60000);
}
function setHatOnStart(){world?.setHat(S.hat);}
init();
