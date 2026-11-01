'use strict';
(function(){
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ================= Audio ================= */
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  const master = ctx.createGain(); master.gain.value = 0.6; // volume plafonné
  master.connect(comp); comp.connect(ctx.destination);
  function wake(){ if(ctx.state !== 'running') ctx.resume().catch(()=>{}); }
  document.addEventListener('pointerdown', wake, true);
  document.addEventListener('keydown', wake, true);

  let noiseBuf;
  const hz = n => 440*Math.pow(2,(n-69)/12);
  function env(g,t,a,peak,d){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(0.0001,t+a+d); }
  function tone(type,f,t,d,peak){
    const o=ctx.createOscillator(), g=ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t); env(g,t,0.005,peak,d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+d+0.05);
  }
  function noise(){
    if(!noiseBuf){ noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const s=ctx.createBufferSource(); s.buffer=noiseBuf; return s;
  }
  function noiseHit(t,type,freq,q,peak,d){
    const s=noise(), f=ctx.createBiquadFilter(), g=ctx.createGain();
    f.type=type; f.frequency.value=freq; if(q) f.Q.value=q; env(g,t,0.002,peak,d);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+d+0.05);
  }
  // oscillateur + filtre avec courbes de hauteur (f) et de filtre (ff) : [[temps, Hz], ...]
  function voc(t,o){
    const s=ctx.createOscillator(), f=ctx.createBiquadFilter(), g=ctx.createGain(), a=o.a||0.01, d=o.d||0.3;
    s.type=o.type||'sawtooth';
    o.f.forEach(([dt,v],i)=> i ? s.frequency.linearRampToValueAtTime(v,t+dt) : s.frequency.setValueAtTime(v,t+dt));
    f.type=o.ft||'bandpass'; f.Q.value=o.q||2;
    (o.ff||[[0,1500]]).forEach(([dt,v],i)=> i ? f.frequency.linearRampToValueAtTime(v,t+dt) : f.frequency.setValueAtTime(v,t+dt));
    env(g,t,a,o.p||0.4,d); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+a+d+0.05);
  }

  const SYN = {
    /* percussions */
    kick(t){ const o=ctx.createOscillator(), g=ctx.createGain(); o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(45,t+0.25); env(g,t,0.003,0.9,0.35); o.connect(g); g.connect(master); o.start(t); o.stop(t+0.45); },
    snare(t){ noiseHit(t,'highpass',1200,0,0.4,0.16); tone('triangle',190,t,0.08,0.22); },
    hat(t){ noiseHit(t,'highpass',7000,0,0.22,0.04); },
    maracas(t){ noiseHit(t,'bandpass',6000,1.2,0.3,0.06); },
    tom(t){ voc(t,{type:'sine',f:[[0,220],[0.25,90]],ft:'lowpass',ff:[[0,3000]],a:0.003,d:0.3,p:0.7}); },
    bongo(t){ voc(t,{type:'sine',f:[[0,430],[0.1,310]],ft:'lowpass',ff:[[0,3000]],a:0.002,d:0.12,p:0.6}); },
    triangle(t){ tone('sine',2650,t,1.0,0.12); tone('sine',5300,t,0.5,0.04); },
    cymbal(t){ noiseHit(t,'highpass',5000,0,0.22,0.9); },
    /* notes */
    piano(t,n){ tone('triangle',hz(n),t,0.9,0.35); tone('sine',hz(n+12),t,0.35,0.08); },
    xylo(t,n){ tone('sine',hz(n),t,0.35,0.4); tone('sine',hz(n)*3.93,t,0.07,0.08); },
    guitar(t,n){ const o=ctx.createOscillator(), f=ctx.createBiquadFilter(), g=ctx.createGain(); o.type='sawtooth'; o.frequency.value=hz(n); f.type='lowpass'; f.frequency.setValueAtTime(3000,t); f.frequency.exponentialRampToValueAtTime(350,t+0.4); env(g,t,0.003,0.28,0.6); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+0.7); },
    bass(t,n){ const o=ctx.createOscillator(), f=ctx.createBiquadFilter(), g=ctx.createGain(); o.type='sawtooth'; o.frequency.value=hz(n); f.type='lowpass'; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(200,t+0.3); env(g,t,0.01,0.35,0.35); o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+0.45); },
    flute(t,n){ const o=ctx.createOscillator(), l=ctx.createOscillator(), lg=ctx.createGain(), g=ctx.createGain(); o.type='sine'; o.frequency.value=hz(n); l.frequency.value=5.5; lg.gain.value=hz(n)*0.012; l.connect(lg); lg.connect(o.frequency); env(g,t,0.06,0.25,0.35); o.connect(g); g.connect(master); o.start(t); l.start(t); o.stop(t+0.5); l.stop(t+0.5); },
    bell(t,n){ tone('sine',hz(n),t,1.4,0.22); tone('sine',hz(n)*2.76,t,0.5,0.07); },
    organ(t,n){ [1,2,3].forEach((m,i)=>tone('sine',hz(n)*m,t,0.45,[0.18,0.08,0.05][i])); },
    musicbox(t,n){ tone('sine',hz(n),t,0.6,0.25); tone('sine',hz(n)*4,t,0.15,0.06); },
    /* animaux */
    cat(t){ voc(t,{f:[[0,500],[0.15,800],[0.5,450]],ff:[[0,800],[0.2,2000],[0.5,700]],q:3,a:0.05,d:0.45,p:0.5}); },
    dog(t){ voc(t,{f:[[0,330],[0.12,170]],ff:[[0,1000],[0.12,500]],q:1.5,a:0.005,d:0.14,p:0.75}); },
    duck(t){ voc(t,{f:[[0,480],[0.15,410]],ff:[[0,1300]],q:8,a:0.005,d:0.15,p:0.9}); },
    frog(t){ for(let i=0;i<4;i++) voc(t+i*0.05,{type:'square',f:[[0,130],[0.04,100]],ft:'lowpass',ff:[[0,700]],q:1,a:0.003,d:0.04,p:0.4}); },
    bird(t){ [0,0.12].forEach(dt=>voc(t+dt,{type:'sine',f:[[0,2200],[0.08,3600]],ft:'highpass',ff:[[0,500]],a:0.005,d:0.08,p:0.3})); },
    cow(t){ voc(t,{f:[[0,150],[0.2,170],[0.9,120]],ft:'lowpass',ff:[[0,300],[0.3,900],[0.9,400]],q:3,a:0.08,d:0.8,p:0.6}); },
    owl(t){ [0,0.32].forEach(dt=>voc(t+dt,{type:'sine',f:[[0,420],[0.25,385]],ft:'lowpass',ff:[[0,2000]],a:0.04,d:0.22,p:0.45})); },
    bee(t){ voc(t,{f:[[0,210],[0.25,240],[0.5,200]],ff:[[0,700]],q:2,a:0.03,d:0.5,p:0.35}); },
    /* rigolo */
    boing(t){ voc(t,{type:'sine',f:[[0,120],[0.08,520],[0.4,300]],ft:'lowpass',ff:[[0,3000]],a:0.005,d:0.4,p:0.45}); },
    laser(t){ voc(t,{type:'square',f:[[0,1800],[0.25,150]],ft:'lowpass',ff:[[0,4000]],a:0.003,d:0.25,p:0.22}); },
    pop(t){ voc(t,{type:'sine',f:[[0,900],[0.05,200]],ft:'lowpass',ff:[[0,5000]],a:0.002,d:0.06,p:0.6}); },
    drop(t){ voc(t,{type:'sine',f:[[0,900],[0.07,2200]],ft:'lowpass',ff:[[0,5000]],a:0.002,d:0.09,p:0.4}); },
    horn(t){ [370,466].forEach(f=>voc(t,{type:'square',f:[[0,f]],ft:'lowpass',ff:[[0,1500]],a:0.01,d:0.3,p:0.18})); },
    train(t){ voc(t,{type:'sine',f:[[0,1900],[0.1,2300],[0.2,1900],[0.3,2300]],ft:'highpass',ff:[[0,300]],a:0.02,d:0.35,p:0.25}); },
    rocket(t){ const s=noise(), f=ctx.createBiquadFilter(), g=ctx.createGain(); f.type='bandpass'; f.Q.value=3; f.frequency.setValueAtTime(300,t); f.frequency.exponentialRampToValueAtTime(4000,t+0.8); env(g,t,0.05,0.5,0.75); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+0.9); },
    tick(t){ voc(t,{type:'square',f:[[0,1500]],ff:[[0,2000]],q:5,a:0.001,d:0.03,p:0.5}); }
  };

  const buffers = {}; // sons enregistrés : id -> AudioBuffer
  function playBuf(sid,t){
    const b=buffers[sid]; if(!b) return;
    const s=ctx.createBufferSource(); s.buffer=b; s.connect(master); s.start(t);
  }

  /* ================= Données ================= */
  // notes : mélodie sur 8 temps (gamme pentatonique) ; absent = son fixe
  const CATS = [
    {id:'percu', name:'Percus', ico:'🥁', c:'#7048e8', items:[
      {id:'kick',    name:'Tambour',  ico:'🥁', c:'#7048e8', mask:[1,0,0,0,1,0,0,0]},
      {id:'snare',   name:'Clap',     ico:'👏', c:'#f06595', mask:[0,0,1,0,0,0,1,0]},
      {id:'hat',     name:'Charley',  ico:'✨', c:'#f59f00', mask:[1,1,1,1,1,1,1,1]},
      {id:'maracas', name:'Maracas',  ico:'🎉', c:'#20c997', mask:[0,1,0,1,0,1,0,1]},
      {id:'tom',     name:'Tom',      ico:'🛢️', c:'#e8590c', mask:[0,0,0,0,0,0,1,1]},
      {id:'bongo',   name:'Bongo',    ico:'🌴', c:'#a6612d', mask:[0,0,0,1,0,0,1,0]},
      {id:'triangle',name:'Triangle', ico:'🔺', c:'#15aabf', mask:[1,0,0,0,0,0,0,0]},
      {id:'cymbal',  name:'Cymbale',  ico:'💫', c:'#e64980', mask:[1,0,0,0,0,0,0,0]}]},
    {id:'notes', name:'Notes', ico:'🎹', c:'#e03131', items:[
      {id:'piano',   name:'Piano',    ico:'🎹', c:'#ff6b6b', notes:[60,62,64,67,67,64,62,60], mask:[1,0,1,0,1,0,1,0]},
      {id:'xylo',    name:'Xylo',     ico:'🌈', c:'#ffa94d', notes:[72,74,76,79,81,79,76,74], mask:[0,1,0,1,0,1,0,1]},
      {id:'guitar',  name:'Guitare',  ico:'🎸', c:'#e8590c', notes:[55,59,62,67,62,59,55,59], mask:[1,0,0,1,0,0,1,0]},
      {id:'bass',    name:'Basse',    ico:'🎻', c:'#4c6ef5', notes:[36,36,36,36,43,43,41,41], mask:[1,0,0,1,1,0,0,0]},
      {id:'flute',   name:'Flûte',    ico:'🎶', c:'#15aabf', notes:[76,79,81,79,76,74,72,74], mask:[1,0,1,1,1,0,0,0]},
      {id:'bell',    name:'Cloche',   ico:'🔔', c:'#f59f00', notes:[84,84,79,79,81,81,79,79], mask:[1,0,0,0,0,0,1,0]},
      {id:'organ',   name:'Orgue',    ico:'🎼', c:'#9c36b5', notes:[48,48,52,52,55,55,52,52], mask:[1,0,0,0,1,0,0,0]},
      {id:'musicbox',name:'Boîte',    ico:'🎁', c:'#d6336c', notes:[84,88,91,96,91,88,84,79], mask:[1,0,1,0,1,0,1,1]}]},
    {id:'animaux', name:'Animaux', ico:'🐾', c:'#2f9e44', items:[
      {id:'cat',  name:'Chat',       ico:'🐱', c:'#f76707', mask:[1,0,0,0,0,0,0,0]},
      {id:'dog',  name:'Chien',      ico:'🐶', c:'#a6612d', mask:[0,0,1,0,0,0,1,0]},
      {id:'duck', name:'Canard',     ico:'🦆', c:'#2f9e44', mask:[0,0,0,1,0,0,0,1]},
      {id:'frog', name:'Grenouille', ico:'🐸', c:'#66a80f', mask:[1,0,0,0,1,0,0,0]},
      {id:'bird', name:'Oiseau',     ico:'🐦', c:'#1c7ed6', mask:[0,1,0,0,0,1,0,0]},
      {id:'cow',  name:'Vache',      ico:'🐮', c:'#495057', mask:[1,0,0,0,0,0,0,0]},
      {id:'owl',  name:'Hibou',      ico:'🦉', c:'#7048e8', mask:[1,0,0,0,0,0,0,0]},
      {id:'bee',  name:'Abeille',    ico:'🐝', c:'#f59f00', mask:[0,0,0,0,1,0,0,0]}]},
    {id:'rigolo', name:'Rigolo', ico:'💥', c:'#1c7ed6', items:[
      {id:'boing', name:'Boing',  ico:'🌀', c:'#1c7ed6', mask:[1,0,0,0,0,0,0,0]},
      {id:'laser', name:'Laser',  ico:'⚡', c:'#f59f00', mask:[0,0,1,0,0,0,1,0]},
      {id:'pop',   name:'Pop',    ico:'🎈', c:'#e64980', mask:[0,1,0,1,0,1,0,1]},
      {id:'drop',  name:'Goutte', ico:'💧', c:'#15aabf', mask:[1,0,0,1,0,0,1,0]},
      {id:'horn',  name:'Klaxon', ico:'📯', c:'#e03131', mask:[1,0,0,0,0,0,0,0]},
      {id:'train', name:'Train',  ico:'🚂', c:'#495057', mask:[1,0,0,0,0,0,0,0]},
      {id:'rocket',name:'Fusée',  ico:'🚀', c:'#7048e8', mask:[1,0,0,0,0,0,0,0]},
      {id:'tick',  name:'Tic',    ico:'⏰', c:'#2f9e44', mask:[1,1,1,1,1,1,1,1]}]}
  ];
  const Z = [0,0,0,0,0,0,0,0];
  const find = id => CATS.flatMap(c=>c.items).find(i=>i.id===id);
  const SLOT_COLORS = ['#e8590c','#9c36b5','#2b8a3e','#1971c2','#c2255c'];
  const SLOT_ICONS = ['🐱','🐸','🦁','🐵','🐶'];
  const SONG_LOOK = [{ico:'🌞',c:'#f59f00'},{ico:'🌙',c:'#5c7cfa'},{ico:'⭐',c:'#e64980'}];
  const MAX_LANES = 6;

  /* ================= État ================= */
  let cat = CATS[0], lanes = [], bpm = 110, playing = false, step = 0, nextT = 0, timer = null, choosing = false, wakeLock = null;
  let slots = [null,null,null,null,null]; // id du son enregistré dans chaque rond
  let songs = [null,null,null];
  const tapIdx = {};

  function voiceInst(sid,i){ return {id:'voice', name:'Mon son', ico:SLOT_ICONS[i], c:SLOT_COLORS[i], sid, slot:i, mask:[1,0,0,0,0,0,1,0]}; }
  function mkLane(inst){ return {inst, mask:inst.mask.slice(), notes:(inst.notes||Z).slice()}; }
  function trig(inst,t,n){
    if(inst.id==='voice') return playBuf(inst.sid,t);
    SYN[inst.id](t, n || (inst.notes||Z).find(x=>x) || 60);
  }

  /* ================= Stockage (IndexedDB, sur la tablette) ================= */
  const DB = (()=>{
    let p;
    function open(){
      return p || (p = new Promise((res,rej)=>{
        const r = indexedDB.open('petit-studio',1);
        r.onupgradeneeded = ()=>{ r.result.createObjectStore('sounds'); r.result.createObjectStore('kv'); };
        r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error);
      }));
    }
    async function op(store,mode,fn){
      const db = await open();
      return new Promise((res,rej)=>{
        const tx = db.transaction(store,mode), req = fn(tx.objectStore(store));
        tx.oncomplete = ()=>res(req && req.result); tx.onerror = ()=>rej(tx.error);
      });
    }
    return {
      get:(s,k)=>op(s,'readonly',st=>st.get(k)),
      put:(s,k,v)=>op(s,'readwrite',st=>st.put(v,k)),
      del:(s,k)=>op(s,'readwrite',st=>st.delete(k)),
      keys:s=>op(s,'readonly',st=>st.getAllKeys())
    };
  })();

  const laneData = l => ({id:l.inst.id, sid:l.inst.sid, slot:l.inst.slot, mask:l.mask.slice(), notes:l.notes.slice()});
  function laneFrom(d){
    const inst = d.id==='voice' ? (buffers[d.sid] ? voiceInst(d.sid,d.slot) : null) : find(d.id);
    return inst && {inst, mask:d.mask.slice(), notes:(d.notes||Z).slice()};
  }
  const snapshot = () => ({bpm, slots:slots.slice(), lanes:lanes.map(laneData)});

  let saveTimer;
  function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(()=>DB.put('kv','current',snapshot()).catch(()=>{}), 400); }
  const saveSongs = () => DB.put('kv','songs',songs).catch(()=>{});

  function toBuffer(pcm,rate){ const b=ctx.createBuffer(1,pcm.length,rate); b.getChannelData(0).set(pcm); return b; }
  async function loadSound(sid){
    if(buffers[sid]) return;
    try{ const d = await DB.get('sounds',sid); if(d) buffers[sid] = toBuffer(d.pcm,d.rate); }catch(e){}
  }
  // supprime les sons qui ne servent plus ni dans « Mes sons » ni dans une musique gardée
  async function gc(){
    const used = new Set(slots.filter(Boolean));
    songs.forEach(s=>s && s.slots.forEach(id=>id && used.add(id)));
    try{
      for(const k of await DB.keys('sounds')) if(!used.has(k)){ await DB.del('sounds',k); delete buffers[k]; }
    }catch(e){}
  }

  async function apply(s, autoplay){
    bpm = s.bpm || 110;
    const ids = [0,1,2,3,4].map(i=>(s.slots||[])[i] || null);
    await Promise.all(ids.filter(Boolean).map(loadSound));
    slots = ids.map(id => id && buffers[id] ? id : null);
    lanes = (s.lanes||[]).map(laneFrom).filter(Boolean);
    setTempoUI(); renderSlots(); renderLanes();
    if(autoplay && !playing) togglePlay();
  }

  /* ================= Rendu ================= */
  const padsEl=$('pads'), catsEl=$('cats'), lanesEl=$('lanes'), slotsEl=$('slots'), songsEl=$('songs'), app=$('app');

  function flash(el){ el.classList.add('hit'); setTimeout(()=>el.classList.remove('hit'),120); }
  let toastTimer;
  function toast(msg){ const t=$('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,3800); }

  // croix d'effacement : un premier appui la rend rouge, un second efface
  function eraser(label,onConfirm){
    const d=document.createElement('button'); d.className='x'; d.textContent='✕'; d.setAttribute('aria-label',label);
    d.addEventListener('click',e=>{
      e.stopPropagation();
      if(d.classList.contains('arm')) return onConfirm();
      d.classList.add('arm'); d.textContent='?';
      setTimeout(()=>{ if(d.isConnected){ d.classList.remove('arm'); d.textContent='✕'; } },2500);
    });
    return d;
  }

  function renderCats(){
    catsEl.innerHTML='';
    CATS.forEach(c=>{
      const b=document.createElement('button'); b.className='cat'+(c===cat?' sel':''); b.style.setProperty('--cc',c.c);
      b.setAttribute('role','tab'); b.setAttribute('aria-selected',c===cat);
      b.innerHTML='<span class="ico">'+c.ico+'</span>'+c.name;
      b.addEventListener('click',()=>{ cat=c; renderCats(); renderPads(); });
      catsEl.appendChild(b);
    });
  }

  function renderPads(){
    padsEl.innerHTML='';
    cat.items.forEach(inst=>{
      const b=document.createElement('button'); b.className='pad'; b.style.background=inst.c;
      b.innerHTML='<span class="ico">'+inst.ico+'</span>'+inst.name; b.setAttribute('aria-label',inst.name);
      b.addEventListener('pointerdown',e=>{ e.preventDefault(); onPick(inst,b); });
      b.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onPick(inst,b); } });
      padsEl.appendChild(b);
    });
  }

  function onPick(inst,el){
    wake(); flash(el);
    const melodic=(inst.notes||Z).filter(Boolean);
    let n;
    if(melodic.length){ tapIdx[inst.id]=((tapIdx[inst.id]||0)+1)%melodic.length; n=melodic[tapIdx[inst.id]]; }
    trig(inst,ctx.currentTime+0.005,n);
    if(choosing){ addLane(inst); setChoosing(false); }
  }

  function addLane(inst){
    if(lanes.length>=MAX_LANES) return loopFull(); // on ne supprime jamais une piste à la place de l'enfant
    lanes.push(mkLane(inst)); renderLanes(); saveSoon();
    if(!playing) togglePlay();
  }

  // boucle pleine : le panneau se secoue et les croix clignotent, sans texte à lire
  function loopFull(){
    const lp=document.querySelector('.loop');
    lp.classList.remove('nope'); void lp.offsetWidth; lp.classList.add('nope');
    clearTimeout(loopFull.t); loopFull.t=setTimeout(()=>lp.classList.remove('nope'),1700);
    voc(ctx.currentTime+0.01,{type:'sine',f:[[0,330],[0.18,180]],ft:'lowpass',ff:[[0,1500]],a:0.01,d:0.2,p:0.35});
  }

  function updateAdd(){
    const add=$('add'), full=lanes.length>=MAX_LANES && !choosing;
    add.classList.toggle('full',full);
    add.textContent = choosing ? 'Annuler' : (full ? '✋' : '＋ Ajouter');
    add.setAttribute('aria-label', full ? 'Boucle pleine : enlève une piste' : add.textContent);
  }

  function renderLanes(){
    updateAdd();
    lanesEl.innerHTML='';
    if(!lanes.length){ lanesEl.innerHTML='<div class="empty">Ta boucle est vide. Touche « ＋ Ajouter » puis un son.</div>'; return; }
    lanes.forEach((l,li)=>{
      const row=document.createElement('div'); row.className='lane'; row.style.setProperty('--c',l.inst.c);
      row.innerHTML='<div class="li" style="background:'+l.inst.c+'">'+l.inst.ico+'</div>';
      const st=document.createElement('div'); st.className='steps';
      l.mask.forEach((on,i)=>{
        const s=document.createElement('button'); s.className='step'+(on?' on':''); s.dataset.i=i;
        s.setAttribute('aria-label',l.inst.name+' temps '+(i+1));
        s.addEventListener('click',()=>{
          l.mask[i]=l.mask[i]?0:1; s.classList.toggle('on'); saveSoon();
          if(l.mask[i]){ wake(); trig(l.inst,ctx.currentTime+0.005,l.notes[i]); }
        });
        st.appendChild(s);
      });
      const d=document.createElement('button'); d.className='del'; d.textContent='✕'; d.setAttribute('aria-label','Retirer '+l.inst.name);
      d.addEventListener('click',()=>{ lanes.splice(li,1); renderLanes(); saveSoon(); });
      row.appendChild(st); row.appendChild(d); lanesEl.appendChild(row);
    });
  }

  function renderSlots(){
    slotsEl.innerHTML='';
    slots.forEach((sid,i)=>{
      const h=document.createElement('div'); h.className='holder';
      const b=document.createElement('button'); b.className='slot'+(sid?' full':''); b.style.setProperty('--sc',SLOT_COLORS[i]);
      if(sid){ b.textContent=SLOT_ICONS[i]; b.setAttribute('aria-label','Mon son '+(i+1)); }
      else { b.textContent='🎤'; b.setAttribute('aria-label','Enregistrer un son'); }
      b.addEventListener('click',()=>{
        wake();
        if(!sid){ if(!choosing) record(i); return; }
        flash(b); playBuf(sid,ctx.currentTime+0.005);
        if(choosing){ addLane(voiceInst(sid,i)); setChoosing(false); }
      });
      h.appendChild(b);
      if(sid) h.appendChild(eraser('Effacer mon son '+(i+1),()=>{
        slots[i]=null; lanes=lanes.filter(l=>l.inst.sid!==sid);
        renderSlots(); renderLanes(); saveSoon(); gc();
      }));
      slotsEl.appendChild(h);
    });
  }

  const laneIco = d => d.id==='voice' ? SLOT_ICONS[d.slot] : ((find(d.id)||{}).ico||'');
  function renderSongs(){
    songsEl.innerHTML='';
    songs.forEach((s,i)=>{
      const h=document.createElement('div'); h.className='holder';
      const b=document.createElement('button'); b.className='sbtn'+(s?' full':''); b.style.setProperty('--sc',SONG_LOOK[i].c);
      if(s){ b.innerHTML=SONG_LOOK[i].ico+'<span class="mini">'+s.lanes.slice(0,4).map(laneIco).join('')+'</span>'; b.setAttribute('aria-label','Rejouer ma musique '+(i+1)); }
      else { b.textContent='＋'; b.setAttribute('aria-label','Garder ma musique ici'); }
      b.addEventListener('click',async ()=>{
        wake();
        if(s){ flash(b); await apply(s,true); saveSoon(); return; }
        if(!lanes.length){ toast('Ajoute d’abord des sons dans ta boucle !'); return; }
        songs[i]=snapshot(); saveSongs(); renderSongs();
        songsEl.children[i].firstChild.classList.add('saved');
        const mb=find('musicbox'), t=ctx.currentTime;
        trig(mb,t+0.01,79); trig(mb,t+0.12,84); trig(mb,t+0.24,91);
      });
      h.appendChild(b);
      if(s) h.appendChild(eraser('Effacer ma musique '+(i+1),()=>{ songs[i]=null; saveSongs(); renderSongs(); gc(); }));
      songsEl.appendChild(h);
    });
  }

  function setChoosing(v){
    choosing=v; app.classList.toggle('choosing',v); $('banner').hidden=!v;
    $('add').classList.toggle('on',v); updateAdd();
  }

  function setTempoUI(){ document.querySelectorAll('.tempo button').forEach(x=>x.classList.toggle('sel',+x.dataset.bpm===bpm)); }

  /* ================= Enregistrement au micro ================= */
  let recording=false;

  // garde la partie où l'on entend quelque chose, 2 s maximum, volume égalisé
  function clean(buf){
    const d=buf.getChannelData(0), r=buf.sampleRate;
    let peak=0; for(let i=0;i<d.length;i++){ const a=Math.abs(d[i]); if(a>peak) peak=a; }
    if(peak<0.015) return null;
    const th=peak*0.08; let s=0, e=d.length-1;
    while(s<d.length && Math.abs(d[s])<th) s++;
    while(e>s && Math.abs(d[e])<th) e--;
    s=Math.max(0,s-Math.floor(r*0.03)); e=Math.min(d.length,e+Math.floor(r*0.12));
    const len=Math.min(e-s,Math.floor(r*2)), out=new Float32Array(len), g=0.9/peak, f=Math.floor(r*0.005);
    for(let i=0;i<len;i++){ let v=d[s+i]*g; if(i<f) v*=i/f; if(i>len-f) v*=(len-i)/f; out[i]=v; }
    return out;
  }

  async function record(i){
    if(recording) return;
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
      toast('Cette tablette ne permet pas d’enregistrer ici.'); return;
    }
    recording=true;
    let stream;
    try{ stream=await navigator.mediaDevices.getUserMedia({audio:true}); }
    catch(e){ recording=false; toast('🎤 Le micro est bloqué. Un adulte peut l’autoriser dans les réglages.'); return; }

    const wasPlaying=playing; if(playing) togglePlay(); // la boucle ne doit pas se retrouver dans l'enregistrement
    const ov=$('rec'), num=$('recnum'), msg=$('recmsg');
    ov.classList.remove('live'); ov.hidden=false; msg.textContent='Prépare-toi…';
    for(const n of [3,2,1]){ num.textContent=n; tone('sine',880,ctx.currentTime+0.01,0.12,0.3); await sleep(800); }

    const chunks=[], mr=new MediaRecorder(stream);
    mr.ondataavailable=e=>{ if(e.data && e.data.size) chunks.push(e.data); };
    const stopped=new Promise(r=>{ mr.onstop=r; });
    mr.start(); ov.classList.add('live'); num.textContent='🎤'; msg.textContent='Parle !';
    await sleep(2200);
    mr.stop(); await stopped;
    stream.getTracks().forEach(t=>t.stop());
    ov.classList.remove('live'); num.textContent='…'; msg.textContent='';

    try{
      const ab=await new Blob(chunks,{type:mr.mimeType||(chunks[0]&&chunks[0].type)||''}).arrayBuffer();
      const buf=await new Promise((res,rej)=>ctx.decodeAudioData(ab,res,rej));
      const pcm=clean(buf);
      if(!pcm) toast('Je n’ai rien entendu. Réessaie en parlant plus fort !');
      else{
        const sid='s'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
        await DB.put('sounds',sid,{pcm,rate:buf.sampleRate}).catch(()=>{});
        buffers[sid]=toBuffer(pcm,buf.sampleRate); slots[i]=sid;
        renderSlots(); saveSoon();
        playBuf(sid,ctx.currentTime+0.05);
      }
    }catch(e){ toast('L’enregistrement n’a pas marché. Réessaie !'); }
    ov.hidden=true; recording=false;
    if(wasPlaying) togglePlay();
  }

  /* ================= Séquenceur ================= */
  function showStep(s){
    lanesEl.querySelectorAll('.step.now').forEach(e=>e.classList.remove('now'));
    if(playing) lanesEl.querySelectorAll('.step[data-i="'+s+'"]').forEach(e=>e.classList.add('now'));
  }
  function tick(){
    const sd=60/bpm/2;
    while(nextT < ctx.currentTime+0.12){
      const s=step;
      lanes.forEach(l=>{ if(l.mask[s]) trig(l.inst,nextT,l.notes[s]); });
      setTimeout(()=>showStep(s),Math.max(0,(nextT-ctx.currentTime)*1000));
      nextT+=sd; step=(step+1)%8;
    }
  }
  function togglePlay(){
    wake(); playing=!playing;
    const p=$('play'); p.classList.toggle('on',playing); p.textContent=playing?'■':'▶';
    p.setAttribute('aria-label',playing?'Arrêter':'Lancer la boucle');
    if(playing){
      step=0; nextT=ctx.currentTime+0.06; timer=setInterval(tick,25); tick();
      if('wakeLock' in navigator) navigator.wakeLock.request('screen').then(l=>{ wakeLock=l; }).catch(()=>{});
    } else {
      clearInterval(timer); showStep(-1);
      if(wakeLock){ wakeLock.release().catch(()=>{}); wakeLock=null; }
    }
  }

  /* ================= Démarrage ================= */
  $('play').addEventListener('click',togglePlay);
  $('add').addEventListener('click',()=>{
    if(!choosing && lanes.length>=MAX_LANES) return loopFull();
    setChoosing(!choosing);
  });
  document.querySelectorAll('.tempo button').forEach(b=>b.addEventListener('click',()=>{ bpm=+b.dataset.bpm; setTempoUI(); saveSoon(); }));
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && playing) togglePlay(); });

  async function init(){
    renderCats(); renderPads(); setTempoUI();
    let cur=null;
    try{
      const sg=await DB.get('kv','songs');
      if(Array.isArray(sg)) songs=[0,1,2].map(i=>sg[i]||null);
      cur=await DB.get('kv','current');
    }catch(e){}
    if(cur) await apply(cur,false);
    else { lanes=[mkLane(find('kick')), mkLane(find('piano'))]; renderLanes(); renderSlots(); } // exemple au premier lancement
    renderSongs();
    if(navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(()=>{});
  }
  init();
})();
